import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { instance_id, groups_ignore, reject_call, msg_call, always_online, read_messages, webhook_enabled } = await req.json();

    if (!instance_id) {
      return new Response(JSON.stringify({ success: false, error: 'instance_id é obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Buscar instância
    const { data: instance, error: instanceError } = await supabase
      .from('whatsapp_instances')
      .select('instance_name, provider_type')
      .eq('id', instance_id)
      .single();

    if (instanceError || !instance) {
      return new Response(JSON.stringify({ success: false, error: 'Instância não encontrada' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Buscar secrets
    const { data: secrets, error: secretsError } = await supabase
      .from('whatsapp_instance_secrets')
      .select('base_url, token, instance_token')
      .eq('instance_id', instance_id)
      .single();

    if (secretsError || !secrets) {
      return new Response(JSON.stringify({ success: false, error: 'Credenciais da instância não encontradas' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const baseUrl = secrets.base_url.replace(/\/$/, '');
    // Use instance token for instance-level settings
    const instanceToken = secrets.instance_token || secrets.token;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'token': instanceToken,
    };

    // Chamar uazapi: POST /instance/settings
    const payload: any = {};
    if (groups_ignore !== undefined) payload.groupsIgnore = groups_ignore;
    if (reject_call !== undefined) payload.rejectCall = reject_call;
    if (msg_call !== undefined) payload.msgCall = msg_call;
    if (always_online !== undefined) payload.alwaysOnline = always_online;
    if (read_messages !== undefined) payload.readMessages = read_messages;

    console.log(`[update-uazapi-settings] Updating settings for ${instance.instance_name}:`, payload);

    const res = await fetch(`${baseUrl}/instance/settings`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const resText = await res.text();
    console.log(`[update-uazapi-settings] Response (${res.status}): ${resText.substring(0, 300)}`);

    if (!res.ok) {
      return new Response(JSON.stringify({
        success: false,
        error: `uazapi respondeu ${res.status}: ${resText.substring(0, 200)}`,
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Atualizar webhook se solicitado
    if (webhook_enabled !== undefined) {
      const webhookUrl = `${supabaseUrl}/functions/v1/uazapi-webhook`;

      console.log(`[update-uazapi-settings] Updating webhook: enabled=${webhook_enabled}`);

      const webhookRes = await fetch(`${baseUrl}/webhook`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          url: webhookUrl,
          enabled: webhook_enabled,
          events: ['messages', 'connection', 'qrcode'],
        }),
      });

      const webhookText = await webhookRes.text();
      console.log(`[update-uazapi-settings] Webhook response (${webhookRes.status}): ${webhookText.substring(0, 300)}`);

      if (!webhookRes.ok) {
        console.warn(`[update-uazapi-settings] Webhook update failed: ${webhookText.substring(0, 200)}`);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('[update-uazapi-settings] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
