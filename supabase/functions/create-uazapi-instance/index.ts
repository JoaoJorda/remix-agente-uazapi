import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  console.log(`[create-uazapi-instance] Received ${req.method} request`);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { base_url, token, instance_name, name, is_default } = await req.json();

    if (!base_url || !token || !instance_name || !name) {
      return new Response(JSON.stringify({ success: false, error: 'Campos obrigatórios: base_url, token, instance_name, name' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const baseUrl = base_url.replace(/\/$/, '');
    const adminHeaders = {
      'Content-Type': 'application/json',
      'admintoken': token,
    };

    // 1. Create instance via uazapi admin endpoint: POST /instance/create
    console.log(`[create-uazapi-instance] Creating instance at ${baseUrl}/instance/create`);
    const initRes = await fetch(`${baseUrl}/instance/create`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ name: instance_name }),
    });

    const initText = await initRes.text();
    console.log(`[create-uazapi-instance] Create response (${initRes.status}): ${initText.substring(0, 500)}`);

    let initData: any = {};
    try { initData = JSON.parse(initText); } catch {}

    if (!initRes.ok) {
      return new Response(JSON.stringify({
        success: false,
        error: `Erro ao criar instância na uazapi: ${initRes.status}`,
        details: initText,
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract instance token from response
    const instanceToken = initData?.instance?.token || initData?.token || null;
    const instanceId = initData?.instance?.id || initData?.id || null;
    console.log(`[create-uazapi-instance] Instance token: ${instanceToken ? 'received' : 'NOT received'}, ID: ${instanceId}`);

    // 2. Get QR Code
    let qrCode: string | null = null;

    // Try to extract QR from the create response
    qrCode = initData?.instance?.qrcode || initData?.qrcode || null;

    if (!qrCode && instanceToken) {
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Use instance token with Bearer auth for POST /instance/connect
      console.log(`[create-uazapi-instance] Fetching QR via POST /instance/connect`);
      const qrRes = await fetch(`${baseUrl}/instance/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'token': instanceToken,
        },
        body: JSON.stringify({}),
      });

      if (qrRes.ok) {
        const qrText = await qrRes.text();
        console.log(`[create-uazapi-instance] QR response: ${qrText.substring(0, 200)}`);
        try {
          const qrData = JSON.parse(qrText);
          qrCode = qrData?.instance?.qrcode || qrData?.qrcode || null;
        } catch {}
      }
    }

    // 3. Save to database
    const { data: instance, error: insertError } = await supabase
      .from('whatsapp_instances')
      .insert({
        name,
        instance_name,
        instance_id_external: instanceId,
        provider_type: 'uazapi',
        status: qrCode ? 'qr_required' : 'disconnected',
        qr_code: qrCode,
        is_default: is_default ?? false,
        is_active: true,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[create-uazapi-instance] DB insert error:', insertError);
      return new Response(JSON.stringify({ success: false, error: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4. Save secrets (admin token + instance token)
    const { error: secretsError } = await supabase
      .from('whatsapp_instance_secrets')
      .insert({
        instance_id: instance.id,
        base_url,
        token, // admin token
        instance_token: instanceToken, // instance-specific token
      });

    if (secretsError) {
      await supabase.from('whatsapp_instances').delete().eq('id', instance.id);
      return new Response(JSON.stringify({ success: false, error: secretsError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 5. Configure webhook automatically (uses instance token)
    if (instanceToken) {
      const webhookUrl = `${supabaseUrl}/functions/v1/uazapi-webhook`;
      try {
        const webhookRes = await fetch(`${baseUrl}/webhook`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'token': instanceToken,
          },
          body: JSON.stringify({
            url: webhookUrl,
            enabled: true,
            events: ['messages', 'connection', 'qrcode'],
          }),
        });
        const webhookText = await webhookRes.text();
        console.log(`[create-uazapi-instance] Webhook response (${webhookRes.status}): ${webhookText.substring(0, 300)}`);
      } catch (webhookErr) {
        console.warn('[create-uazapi-instance] Failed to set webhook (non-fatal):', webhookErr);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      instance_id: instance.id,
      qr_code: qrCode,
      status: instance.status,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('[create-uazapi-instance] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
