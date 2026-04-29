import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')!;
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  // Google sends POST notifications
  if (req.method !== 'POST') {
    return new Response('OK', { status: 200 });
  }

  const channelId = req.headers.get('X-Goog-Channel-ID');
  const resourceState = req.headers.get('X-Goog-Resource-State');

  console.log(`[google-calendar-webhook] Received: state=${resourceState}, channel=${channelId}`);

  // Ignore sync messages (initial handshake)
  if (resourceState === 'sync') {
    return new Response('OK', { status: 200 });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Find the user associated with this channel
    const { data: tokenData, error } = await supabase
      .from('google_calendar_tokens')
      .select('*')
      .eq('sync_channel_id', channelId)
      .maybeSingle();

    if (error || !tokenData) {
      console.error('[google-calendar-webhook] No token found for channel:', channelId);
      return new Response('OK', { status: 200 });
    }

    // Get a valid access token
    let accessToken = tokenData.access_token;
    if (new Date(tokenData.expires_at) <= new Date(Date.now() + 5 * 60 * 1000)) {
      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          refresh_token: tokenData.refresh_token,
          grant_type: 'refresh_token',
        }),
      });

      const newTokens = await refreshResponse.json();
      if (newTokens.error) {
        console.error('[google-calendar-webhook] Token refresh failed:', newTokens);
        return new Response('OK', { status: 200 });
      }

      accessToken = newTokens.access_token;
      await supabase
        .from('google_calendar_tokens')
        .update({
          access_token: newTokens.access_token,
          expires_at: new Date(Date.now() + newTokens.expires_in * 1000).toISOString(),
        })
        .eq('user_id', tokenData.user_id);
    }

    // Fetch changed events using syncToken for incremental sync
    let fetchUrl = `https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=50&singleEvents=true`;
    if (tokenData.sync_token) {
      fetchUrl += `&syncToken=${tokenData.sync_token}`;
    } else {
      // Fallback: get recent events
      const timeMin = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      fetchUrl += `&timeMin=${timeMin}&orderBy=updated`;
    }

    const eventsResponse = await fetch(fetchUrl, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    if (eventsResponse.status === 410) {
      // Sync token expired, need full sync
      console.log('[google-calendar-webhook] Sync token expired, clearing...');
      await supabase
        .from('google_calendar_tokens')
        .update({ sync_token: null })
        .eq('user_id', tokenData.user_id);
      return new Response('OK', { status: 200 });
    }

    if (!eventsResponse.ok) {
      console.error('[google-calendar-webhook] Events fetch failed:', await eventsResponse.text());
      return new Response('OK', { status: 200 });
    }

    const eventsData = await eventsResponse.json();
    const events = eventsData.items || [];

    console.log(`[google-calendar-webhook] Processing ${events.length} changed events`);

    for (const event of events) {
      try {
        // Check if we have this event
        const { data: existing } = await supabase
          .from('appointments')
          .select('id, google_event_id')
          .eq('google_event_id', event.id)
          .maybeSingle();

        if (event.status === 'cancelled') {
          // Delete if exists
          if (existing) {
            await supabase.from('appointments').delete().eq('id', existing.id);
            console.log(`[google-calendar-webhook] Deleted appointment for event ${event.id}`);
          }
          continue;
        }

        if (!event.start?.dateTime) continue; // Skip all-day events

        const startDate = new Date(event.start.dateTime);
        const endDate = event.end?.dateTime ? new Date(event.end.dateTime) : new Date(startDate.getTime() + 60 * 60 * 1000);
        const duration = Math.round((endDate.getTime() - startDate.getTime()) / 60000);

        const date = startDate.toISOString().split('T')[0];
        const time = `${String(startDate.getHours()).padStart(2, '0')}:${String(startDate.getMinutes()).padStart(2, '0')}`;

        const appointmentData = {
          title: event.summary || 'Evento Google Calendar',
          description: event.description || null,
          date,
          time,
          duration: Math.max(15, Math.min(480, duration)),
          meeting_url: event.hangoutLink || event.location || null,
          attendees: (event.attendees || []).map((a: any) => a.email).filter(Boolean),
        };

        if (existing) {
          // Update
          await supabase
            .from('appointments')
            .update(appointmentData)
            .eq('id', existing.id);
          console.log(`[google-calendar-webhook] Updated appointment ${existing.id}`);
        } else {
          // Create new
          await supabase
            .from('appointments')
            .insert({
              ...appointmentData,
              type: 'meeting',
              google_event_id: event.id,
              user_id: tokenData.user_id,
              metadata: { source: 'google_calendar' },
            });
          console.log(`[google-calendar-webhook] Created appointment for event ${event.id}`);
        }
      } catch (eventError) {
        console.error(`[google-calendar-webhook] Error processing event ${event.id}:`, eventError);
      }
    }

    // Save new sync token
    if (eventsData.nextSyncToken) {
      await supabase
        .from('google_calendar_tokens')
        .update({ sync_token: eventsData.nextSyncToken })
        .eq('user_id', tokenData.user_id);
    }

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('[google-calendar-webhook] Error:', error);
    return new Response('OK', { status: 200 }); // Always return 200 to Google
  }
});
