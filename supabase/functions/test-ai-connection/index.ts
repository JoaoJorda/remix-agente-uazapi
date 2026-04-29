import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { provider, api_key } = await req.json();

    if (!provider || !api_key) {
      return new Response(JSON.stringify({ success: false, error: "Provider e API key são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let url: string;
    let body: any;

    if (provider === "gemini") {
      url = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
      body = {
        model: "gemini-2.0-flash",
        messages: [{ role: "user", content: "Say hello in one word" }],
        max_tokens: 10,
      };
    } else if (provider === "openai") {
      url = "https://api.openai.com/v1/chat/completions";
      body = {
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: "Say hello in one word" }],
        max_tokens: 10,
      };
    } else {
      return new Response(JSON.stringify({ success: false, error: "Provedor inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${api_key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI connection test failed:", response.status, errorText);
      
      let errorMessage = "Falha na conexão";
      if (response.status === 401 || response.status === 403) {
        errorMessage = "API Key inválida ou sem permissão";
      } else if (response.status === 429) {
        errorMessage = "Limite de requisições excedido";
      } else if (response.status === 404) {
        errorMessage = "Modelo não encontrado. Verifique sua conta.";
      }
      
      return new Response(JSON.stringify({ success: false, error: errorMessage }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ success: true, message: `Conexão OK! Resposta: "${content}"` }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("test-ai-connection error:", e);
    return new Response(JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
