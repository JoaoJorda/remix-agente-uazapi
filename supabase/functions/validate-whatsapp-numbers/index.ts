import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface NumberResult {
  phone: string;
  exists: boolean;
  jid: string | null;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Normalizes Brazilian phone numbers to the format expected by Evolution API.
 * Handles: +55 prefix, missing 9th digit, separators (-, space, parentheses, dot).
 *
 * Examples:
 *   "11999998888"        → "5511999998888"
 *   "+55 (11) 9 9999-8888" → "5511999998888"
 *   "5511999998888"      → "5511999998888"
 *   "1199998888"         → "5511999998888"  (adds mandatory 9th digit)
 *   "551199998888"       → "5511999998888"  (adds mandatory 9th digit)
 */
function normalizeBrazilianPhone(raw: string): string | null {
  // Strip everything except digits
  let digits = raw.replace(/\D/g, "");

  // Remove leading country code 55 to work with local number
  if (digits.startsWith("55") && digits.length > 11) {
    digits = digits.slice(2);
  }

  // Expect 10 or 11 local digits (DDD + 8 or 9 digit number)
  if (digits.length < 10 || digits.length > 11) {
    return null;
  }

  // If 10 digits → DDD (2) + 8-digit number (missing mandatory 9th digit for mobiles)
  if (digits.length === 10) {
    const ddd = digits.slice(0, 2);
    const number = digits.slice(2);
    const firstDigit = parseInt(number[0], 10);
    // Mobile ranges start with 6-9; add 9th digit. Landlines (2-5) stay as is.
    if (firstDigit >= 6) {
      digits = ddd + "9" + number;
    }
  }

  return "55" + digits;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { instance_id, numbers } = (await req.json()) as {
      instance_id: string;
      numbers: string[];
    };

    if (!instance_id || !numbers?.length) {
      return new Response(
        JSON.stringify({ error: "instance_id and numbers are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get instance info
    const { data: instance, error: instanceError } = await supabase
      .from("whatsapp_instances")
      .select("instance_name")
      .eq("id", instance_id)
      .single();

    if (instanceError || !instance) {
      return new Response(
        JSON.stringify({ error: "Instance not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get instance secrets
    const { data: secrets, error: secretsError } = await supabase
      .from("whatsapp_instance_secrets")
      .select("api_url, api_key")
      .eq("instance_id", instance_id)
      .single();

    if (secretsError || !secrets) {
      return new Response(
        JSON.stringify({ error: "Instance secrets not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { api_url, api_key } = secrets;
    const instanceName = instance.instance_name;

    // Process in chunks of 50 to avoid large payloads
    const CHUNK_SIZE = 50;
    const results: NumberResult[] = [];

    // Normalize numbers: strip formatting, add country code, fix missing 9th digit
    const normalizedNumbers: Array<{ original: string; normalized: string }> = [];
    for (const raw of numbers) {
      const normalized = normalizeBrazilianPhone(raw);
      if (normalized) {
        normalizedNumbers.push({ original: raw, normalized });
      }
    }

    for (let i = 0; i < normalizedNumbers.length; i += CHUNK_SIZE) {
      const chunk = normalizedNumbers.slice(i, i + CHUNK_SIZE);
      const chunkNormalized = chunk.map(n => n.normalized);

      try {
        const url = `${api_url}/chat/whatsappNumbers/${instanceName}`;
        const response = await fetch(url, {
          method: "POST",
          headers: {
            apikey: api_key,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ numbers: chunkNormalized }),
        });

        if (!response.ok) {
          console.error(`whatsappNumbers endpoint returned ${response.status}`);
          for (const entry of chunk) {
            results.push({ phone: entry.normalized, exists: false, jid: null });
          }
          continue;
        }

        const data = await response.json();
        const apiResults: Array<{ number?: string; numberExists?: boolean; exists?: boolean; jid?: string }> = Array.isArray(data) ? data : [];

        for (let j = 0; j < chunk.length; j++) {
          const entry = chunk[j];
          const apiResult = apiResults[j];

          if (apiResult) {
            const exists = apiResult.exists ?? apiResult.numberExists ?? false;
            const jid = apiResult.jid || null;
            results.push({ phone: entry.normalized, exists, jid });
          } else {
            results.push({ phone: entry.normalized, exists: false, jid: null });
          }
        }
      } catch (err) {
        console.error(`Error processing chunk starting at ${i}:`, err);
        for (const entry of chunk) {
          results.push({ phone: entry.normalized, exists: false, jid: null });
        }
      }

      if (i + CHUNK_SIZE < normalizedNumbers.length) {
        await delay(500);
      }
    }

    const validCount = results.filter(r => r.exists).length;
    const invalidCount = results.filter(r => !r.exists).length;

    return new Response(
      JSON.stringify({ results, validCount, invalidCount, total: results.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("validate-whatsapp-numbers error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
