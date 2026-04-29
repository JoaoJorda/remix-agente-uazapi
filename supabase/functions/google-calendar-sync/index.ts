import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')!;
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');

    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error('Invalid user token');

    const body = await req.json();
    const { action, appointment_id } = body;

    // Get user's Google Calendar tokens
    const accessToken = await getValidAccessToken(supabase, user.id);
    if (!accessToken) {
      return new Response(JSON.stringify({ error: 'Google Calendar not connected' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let result: any;

    switch (action) {
      case 'create':
        result = await createGoogleEvent(supabase, accessToken, appointment_id);
        break;
      case 'update':
        result = await updateGoogleEvent(supabase, accessToken, appointment_id);
        break;
      case 'delete':
        result = await deleteGoogleEvent(supabase, accessToken, appointment_id);
        break;
      case 'full-sync':
        result = await fullSync(supabase, accessToken, user.id);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify({ success: true, ...result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('[google-calendar-sync] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function getValidAccessToken(supabase: any, userId: string): Promise<string | null> {
  const { data: tokenData } = await supabase
    .from('google_calendar_tokens')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (!tokenData) return null;

  // Check if token is expired (with 5 min buffer)
  if (new Date(tokenData.expires_at) <= new Date(Date.now() + 5 * 60 * 1000)) {
    // Refresh token
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: tokenData.refresh_token,
        grant_type: 'refresh_token',
      }),
    });

    const newTokens = await response.json();
    if (newTokens.error) {
      console.error('[google-calendar-sync] Token refresh failed:', newTokens);
      return null;
    }

    const expiresAt = new Date(Date.now() + newTokens.expires_in * 1000).toISOString();
    await supabase
      .from('google_calendar_tokens')
      .update({
        access_token: newTokens.access_token,
        expires_at: expiresAt,
      })
      .eq('user_id', userId);

    return newTokens.access_token;
  }

  return tokenData.access_token;
}

function addMinutesToLocal(date: string, time: string, minutes: number): string {
  // date: "YYYY-MM-DD", time: "HH:MM" — compute end as local string without timezone
  const [y, mo, d] = date.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  // Use UTC math purely for arithmetic, then format components back as local strings
  const totalMinutes = h * 60 + mi + minutes;
  const dayOffset = Math.floor(totalMinutes / (24 * 60));
  const remaining = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const endH = Math.floor(remaining / 60);
  const endMi = remaining % 60;
  // Adjust date by dayOffset using UTC to avoid TZ drift
  const baseUtc = Date.UTC(y, mo - 1, d);
  const adjusted = new Date(baseUtc + dayOffset * 24 * 60 * 60 * 1000);
  const ny = adjusted.getUTCFullYear();
  const nmo = String(adjusted.getUTCMonth() + 1).padStart(2, '0');
  const nd = String(adjusted.getUTCDate()).padStart(2, '0');
  return `${ny}-${nmo}-${nd}T${String(endH).padStart(2, '0')}:${String(endMi).padStart(2, '0')}:00`;
}

function appointmentToGoogleEvent(appointment: any): any {
  const endMinutes = appointment.duration || 60;
  // Send local time strings (no Z) so Google interprets them in the provided timeZone
  const startLocal = `${appointment.date}T${appointment.time}:00`;
  const endLocal = addMinutesToLocal(appointment.date, appointment.time, endMinutes);

  const event: any = {
    summary: appointment.title,
    description: appointment.description || '',
    start: {
      dateTime: startLocal,
      timeZone: 'America/Sao_Paulo',
    },
    end: {
      dateTime: endLocal,
      timeZone: 'America/Sao_Paulo',
    },
  };

  if (appointment.meeting_url) {
    event.location = appointment.meeting_url;
  }

  if (appointment.attendees?.length) {
    event.attendees = appointment.attendees
      .filter((a: string) => a.includes('@'))
      .map((email: string) => ({ email }));
  }

  return event;
}

async function createGoogleEvent(supabase: any, accessToken: string, appointmentId: string) {
  const { data: appointment, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('id', appointmentId)
    .single();

  if (error || !appointment) throw new Error('Appointment not found');
  if (appointment.google_event_id) {
    console.log('[google-calendar-sync] Appointment already has google_event_id, updating instead');
    return updateGoogleEvent(supabase, accessToken, appointmentId);
  }

  const event = appointmentToGoogleEvent(appointment);

  const response = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    }
  );

  const result = await response.json();
  if (!response.ok) {
    console.error('[google-calendar-sync] Create event failed:', result);
    throw new Error(`Google Calendar API error: ${result.error?.message || 'Unknown'}`);
  }

  // Save google_event_id
  await supabase
    .from('appointments')
    .update({ google_event_id: result.id })
    .eq('id', appointmentId);

  console.log('[google-calendar-sync] Created event:', result.id);
  return { google_event_id: result.id };
}

async function updateGoogleEvent(supabase: any, accessToken: string, appointmentId: string) {
  const { data: appointment, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('id', appointmentId)
    .single();

  if (error || !appointment) throw new Error('Appointment not found');
  if (!appointment.google_event_id) {
    console.log('[google-calendar-sync] No google_event_id, creating instead');
    return createGoogleEvent(supabase, accessToken, appointmentId);
  }

  const event = appointmentToGoogleEvent(appointment);

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${appointment.google_event_id}`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    }
  );

  const result = await response.json();
  if (!response.ok) {
    console.error('[google-calendar-sync] Update event failed:', result);
    throw new Error(`Google Calendar API error: ${result.error?.message || 'Unknown'}`);
  }

  console.log('[google-calendar-sync] Updated event:', appointment.google_event_id);
  return { google_event_id: appointment.google_event_id };
}

async function deleteGoogleEvent(supabase: any, accessToken: string, appointmentId: string) {
  const { data: appointment, error } = await supabase
    .from('appointments')
    .select('google_event_id')
    .eq('id', appointmentId)
    .single();

  if (error || !appointment) throw new Error('Appointment not found');
  if (!appointment.google_event_id) {
    console.log('[google-calendar-sync] No google_event_id to delete');
    return { deleted: false };
  }

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${appointment.google_event_id}`,
    {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${accessToken}` },
    }
  );

  if (!response.ok && response.status !== 404 && response.status !== 410) {
    const result = await response.json();
    console.error('[google-calendar-sync] Delete event failed:', result);
    throw new Error(`Google Calendar API error: ${result.error?.message || 'Unknown'}`);
  }

  // Clear google_event_id
  await supabase
    .from('appointments')
    .update({ google_event_id: null })
    .eq('id', appointmentId);

  console.log('[google-calendar-sync] Deleted event for appointment:', appointmentId);
  return { deleted: true };
}

async function fullSync(supabase: any, accessToken: string, userId: string) {
  // Get all appointments without google_event_id
  const { data: appointments, error } = await supabase
    .from('appointments')
    .select('*')
    .is('google_event_id', null)
    .order('date', { ascending: true });

  if (error) throw error;

  let synced = 0;
  let failed = 0;

  for (const appointment of (appointments || [])) {
    try {
      await createGoogleEvent(supabase, accessToken, appointment.id);
      synced++;
    } catch (e) {
      console.error(`[google-calendar-sync] Failed to sync appointment ${appointment.id}:`, e);
      failed++;
    }
  }

  // Also import events from Google Calendar
  let imported = 0;
  try {
    imported = await importFromGoogle(supabase, accessToken, userId);
  } catch (e) {
    console.error('[google-calendar-sync] Import from Google failed:', e);
  }

  console.log(`[google-calendar-sync] Full sync complete: ${synced} exported, ${imported} imported, ${failed} failed`);
  return { synced, imported, failed };
}

async function importFromGoogle(supabase: any, accessToken: string, userId: string): Promise<number> {
  const now = new Date();
  const timeMin = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const timeMax = new Date(now.getFullYear(), now.getMonth() + 3, 0).toISOString();

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&maxResults=250`,
    {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    }
  );

  if (!response.ok) return 0;

  const data = await response.json();
  const events = data.items || [];

  // Get existing google_event_ids
  const { data: existing } = await supabase
    .from('appointments')
    .select('google_event_id')
    .not('google_event_id', 'is', null);

  const existingIds = new Set((existing || []).map((e: any) => e.google_event_id));

  let imported = 0;
  for (const event of events) {
    if (existingIds.has(event.id)) continue;
    if (!event.start?.dateTime) continue; // Skip all-day events

    const startDate = new Date(event.start.dateTime);
    const endDate = event.end?.dateTime ? new Date(event.end.dateTime) : new Date(startDate.getTime() + 60 * 60 * 1000);
    const duration = Math.round((endDate.getTime() - startDate.getTime()) / 60000);

    // Extract date/time in America/Sao_Paulo regardless of server TZ
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
    });
    const parts = Object.fromEntries(fmt.formatToParts(startDate).map(p => [p.type, p.value]));
    const date = `${parts.year}-${parts.month}-${parts.day}`;
    const time = `${parts.hour}:${parts.minute}`;

    const { error: insertError } = await supabase
      .from('appointments')
      .insert({
        title: event.summary || 'Evento Google Calendar',
        description: event.description || null,
        date,
        time,
        duration: Math.max(15, Math.min(480, duration)),
        type: 'meeting',
        google_event_id: event.id,
        user_id: userId,
        meeting_url: event.hangoutLink || event.location || null,
        attendees: (event.attendees || []).map((a: any) => a.email).filter(Boolean),
        metadata: { source: 'google_calendar' },
      });

    if (!insertError) imported++;
  }

  // Save syncToken for incremental sync
  if (data.nextSyncToken) {
    await supabase
      .from('google_calendar_tokens')
      .update({ sync_token: data.nextSyncToken })
      .eq('user_id', userId);
  }

  return imported;
}
