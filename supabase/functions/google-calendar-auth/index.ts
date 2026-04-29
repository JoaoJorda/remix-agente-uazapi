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

const SCOPES = 'https://www.googleapis.com/auth/calendar';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get('action');

  try {
    if (action === 'authorize') {
      // Extract user token from Authorization header
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) throw new Error('Missing authorization header');

      const token = authHeader.replace('Bearer ', '');
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      if (userError || !user) throw new Error('Invalid user token');

      const redirectUri = `${SUPABASE_URL}/functions/v1/google-calendar-auth?action=callback`;
      const state = JSON.stringify({ user_id: user.id });

      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', SCOPES);
      authUrl.searchParams.set('access_type', 'offline');
      authUrl.searchParams.set('prompt', 'consent');
      authUrl.searchParams.set('state', btoa(state));

      return new Response(JSON.stringify({ url: authUrl.toString() }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'callback') {
      const code = url.searchParams.get('code');
      const stateParam = url.searchParams.get('state');
      if (!code || !stateParam) throw new Error('Missing code or state');

      const state = JSON.parse(atob(stateParam));
      const userId = state.user_id;

      const redirectUri = `${SUPABASE_URL}/functions/v1/google-calendar-auth?action=callback`;

      // Exchange code for tokens
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      const tokens = await tokenResponse.json();
      if (tokens.error) {
        console.error('[google-calendar-auth] Token exchange error:', tokens);
        throw new Error(`Token exchange failed: ${tokens.error_description || tokens.error}`);
      }

      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      // Upsert tokens
      const { error: upsertError } = await supabase
        .from('google_calendar_tokens')
        .upsert({
          user_id: userId,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: expiresAt,
          calendar_id: 'primary',
        }, { onConflict: 'user_id' });

      if (upsertError) {
        console.error('[google-calendar-auth] Upsert error:', upsertError);
        throw upsertError;
      }

      // Set up Google Calendar webhook for push notifications
      try {
        await setupCalendarWebhook(supabase, userId, tokens.access_token);
      } catch (webhookError) {
        console.error('[google-calendar-auth] Webhook setup error (non-fatal):', webhookError);
      }

      // Redirect back to the app
      const appUrl = url.origin.replace('yffcqfopsbuguotsxqwq.supabase.co/functions/v1/google-calendar-auth', '');
      return new Response(`
        <html><body><script>
          window.opener?.postMessage({ type: 'google-calendar-connected' }, '*');
          window.close();
        </script><p>Conectado! Você pode fechar esta janela.</p></body></html>
      `, {
        headers: { 'Content-Type': 'text/html' },
      });
    }

    if (action === 'status') {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) throw new Error('Missing authorization header');

      const token = authHeader.replace('Bearer ', '');
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      if (userError || !user) throw new Error('Invalid user token');

      const { data: tokenData } = await supabase
        .from('google_calendar_tokens')
        .select('id, calendar_id, created_at')
        .eq('user_id', user.id)
        .maybeSingle();

      return new Response(JSON.stringify({
        connected: !!tokenData,
        calendar_id: tokenData?.calendar_id || null,
        connected_at: tokenData?.created_at || null,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'disconnect') {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) throw new Error('Missing authorization header');

      const token = authHeader.replace('Bearer ', '');
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      if (userError || !user) throw new Error('Invalid user token');

      // Get tokens to revoke
      const { data: tokenData } = await supabase
        .from('google_calendar_tokens')
        .select('access_token, sync_channel_id, sync_resource_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (tokenData) {
        // Stop Google Calendar webhook
        if (tokenData.sync_channel_id && tokenData.sync_resource_id) {
          try {
            await fetch('https://www.googleapis.com/calendar/v3/channels/stop', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${tokenData.access_token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                id: tokenData.sync_channel_id,
                resourceId: tokenData.sync_resource_id,
              }),
            });
          } catch (e) {
            console.error('[google-calendar-auth] Error stopping channel:', e);
          }
        }

        // Revoke Google token
        try {
          await fetch(`https://oauth2.googleapis.com/revoke?token=${tokenData.access_token}`, {
            method: 'POST',
          });
        } catch (e) {
          console.error('[google-calendar-auth] Error revoking token:', e);
        }
      }

      // Delete from DB
      await supabase
        .from('google_calendar_tokens')
        .delete()
        .eq('user_id', user.id);

      return new Response(JSON.stringify({ disconnected: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('[google-calendar-auth] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function setupCalendarWebhook(supabase: any, userId: string, accessToken: string) {
  const channelId = crypto.randomUUID();
  const webhookUrl = `${SUPABASE_URL}/functions/v1/google-calendar-webhook`;
  const expiration = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days

  const response = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events/watch',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: channelId,
        type: 'web_hook',
        address: webhookUrl,
        expiration: expiration,
        params: { userId },
      }),
    }
  );

  const result = await response.json();
  if (!response.ok) {
    console.error('[google-calendar-auth] Watch setup failed:', result);
    return;
  }

  await supabase
    .from('google_calendar_tokens')
    .update({
      sync_channel_id: channelId,
      sync_resource_id: result.resourceId,
      sync_expiration: new Date(parseInt(result.expiration)).toISOString(),
    })
    .eq('user_id', userId);

  console.log('[google-calendar-auth] Webhook setup complete, channel:', channelId);
}
