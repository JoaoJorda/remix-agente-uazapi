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
    const { instance_id } = await req.json();

    if (!instance_id) {
      return new Response(JSON.stringify({ success: false, error: 'instance_id obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: instance, error: instErr } = await supabase
      .from('whatsapp_instances')
      .select('*, whatsapp_instance_secrets(*)')
      .eq('id', instance_id)
      .single();

    if (instErr || !instance) {
      return new Response(JSON.stringify({ success: false, error: 'Instância não encontrada' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const secrets = (instance as any).whatsapp_instance_secrets;
    if (!secrets || !secrets.base_url || !secrets.token) {
      return new Response(JSON.stringify({ success: false, error: 'Credenciais da instância não encontradas' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const baseUrl = secrets.base_url.replace(/\/$/, '');
    // Use instance token for instance-level endpoints, fallback to admin token
    const instanceToken = secrets.instance_token || secrets.token;
    const instanceHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'token': instanceToken,
    };

    // Check connection status
    const statusRes = await fetch(`${baseUrl}/instance/status`, {
      method: 'GET',
      headers: instanceHeaders,
    });

    let currentState = 'disconnected';
    if (statusRes.ok) {
      try {
        const statusData = await statusRes.json();
        const state = statusData?.state || statusData?.status || statusData?.connection || 'disconnected';
        if (state === 'open' || state === 'connected') {
          currentState = 'connected';
        }
      } catch {}
    }

    console.log(`[get-uazapi-qrcode] Instance status: ${currentState}`);

    // If already connected, update and return
    if (currentState === 'connected') {
      await supabase
        .from('whatsapp_instances')
        .update({ status: 'connected', qr_code: null, updated_at: new Date().toISOString() })
        .eq('id', instance_id);

      return new Response(JSON.stringify({
        success: true,
        connected: true,
        status: 'connected',
        qr_code: null,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch QR Code via POST /instance/connect (no phone = QR code)
    console.log(`[get-uazapi-qrcode] Fetching QR via POST /instance/connect`);
    const qrRes = await fetch(`${baseUrl}/instance/connect`, {
      method: 'POST',
      headers: instanceHeaders,
      body: JSON.stringify({}),
    });

    const qrText = await qrRes.text();
    console.log(`[get-uazapi-qrcode] QR response (${qrRes.status}): ${qrText.substring(0, 300)}`);

    let qrCode: string | null = null;
    let connected = false;

    try {
      const qrData = JSON.parse(qrText);
      qrCode = qrData?.instance?.qrcode || qrData?.qrcode || qrData?.base64 || qrData?.qr_code || null;
      connected = qrData?.connected === true || qrData?.instance?.status === 'connected';
    } catch {}

    // Update in database
    if (qrCode || connected) {
      await supabase
        .from('whatsapp_instances')
        .update({
          status: connected ? 'connected' : 'qr_required',
          qr_code: connected ? null : qrCode,
          updated_at: new Date().toISOString(),
        })
        .eq('id', instance_id);
    }

    return new Response(JSON.stringify({
      success: true,
      connected,
      status: connected ? 'connected' : (qrCode ? 'qr_required' : 'disconnected'),
      qr_code: qrCode,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('[get-uazapi-qrcode] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
