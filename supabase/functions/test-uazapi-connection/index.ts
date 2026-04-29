import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  console.log(`[test-uazapi-connection] Received ${req.method} request`);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { base_url, token } = body;

    if (!base_url || !token) {
      return new Response(JSON.stringify({ success: false, error: 'base_url and token are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const baseUrl = base_url.replace(/\/$/, '');

    // Test with admin endpoint: GET /instance/all (requires 'admintoken' header)
    const fetchUrl = `${baseUrl}/instance/all`;
    console.log(`[test-uazapi-connection] Testing admin endpoint: ${fetchUrl}`);

    const response = await fetch(fetchUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'admintoken': token,
      },
    });

    const responseText = await response.text();
    console.log(`[test-uazapi-connection] Status: ${response.status}`);
    console.log(`[test-uazapi-connection] Response: ${responseText.substring(0, 300)}`);

    if (response.status === 401 || response.status === 403) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Admin Token inválido ou sem permissão. Verifique suas credenciais.',
        status: response.status,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (response.ok) {
      let instances: any[] = [];
      try { instances = JSON.parse(responseText); } catch {}

      const connectedCount = Array.isArray(instances)
        ? instances.filter((i: any) => i.status === 'connected' || i.state === 'connected').length
        : 0;

      return new Response(JSON.stringify({
        success: true,
        connected: true,
        instances_count: Array.isArray(instances) ? instances.length : 0,
        connected_count: connectedCount,
        message: 'uazapi acessível e credenciais válidas!',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: false,
      error: `Servidor retornou status ${response.status}. Verifique a URL da uazapi.`,
      status: response.status,
      details: responseText.substring(0, 300),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    console.error('[test-uazapi-connection] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({
      success: false,
      error: `Não foi possível alcançar o servidor: ${message}`,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
