import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ContactInput {
  phone: string;
  csv_name: string;
}

interface ContactResult {
  phone: string;
  csv_name: string;
  whatsapp_name: string | null;
  profile_picture: string | null;
  match: "confirmed" | "divergent" | "not_found";
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function compareNames(csvName: string, whatsappName: string): "confirmed" | "divergent" {
  const a = normalizeName(csvName);
  const b = normalizeName(whatsappName);

  if (a === b) return "confirmed";
  if (a.includes(b) || b.includes(a)) return "confirmed";

  // Check if first name matches
  const aFirst = a.split(/\s+/)[0];
  const bFirst = b.split(/\s+/)[0];
  if (aFirst.length > 2 && bFirst.length > 2 && aFirst === bFirst) return "confirmed";

  return "divergent";
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { instance_id, contacts } = (await req.json()) as {
      instance_id: string;
      contacts: ContactInput[];
    };

    if (!instance_id || !contacts?.length) {
      return new Response(
        JSON.stringify({ error: "instance_id and contacts are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Limit to 100 contacts
    const limitedContacts = contacts.slice(0, 100);

    // Get instance credentials
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

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
    const results: ContactResult[] = [];

    for (let i = 0; i < limitedContacts.length; i++) {
      const contact = limitedContacts[i];
      
      try {
        const profileUrl = `${api_url}/chat/fetchProfile/${instanceName}`;
        const response = await fetch(profileUrl, {
          method: "POST",
          headers: {
            apikey: api_key,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ number: contact.phone.replace(/\D/g, "") }),
        });

        if (response.ok) {
          const profile = await response.json();
          const whatsappName = profile?.name || profile?.pushName || null;
          const profilePicture = profile?.picture || profile?.imgUrl || null;

          if (whatsappName) {
            results.push({
              phone: contact.phone,
              csv_name: contact.csv_name,
              whatsapp_name: whatsappName,
              profile_picture: profilePicture,
              match: compareNames(contact.csv_name, whatsappName),
            });
          } else {
            results.push({
              phone: contact.phone,
              csv_name: contact.csv_name,
              whatsapp_name: null,
              profile_picture: profilePicture,
              match: "not_found",
            });
          }
        } else {
          results.push({
            phone: contact.phone,
            csv_name: contact.csv_name,
            whatsapp_name: null,
            profile_picture: null,
            match: "not_found",
          });
        }
      } catch (err) {
        console.error(`Error fetching profile for ${contact.phone}:`, err);
        results.push({
          phone: contact.phone,
          csv_name: contact.csv_name,
          whatsapp_name: null,
          profile_picture: null,
          match: "not_found",
        });
      }

      // Rate limiting: 500ms delay between calls
      if (i < limitedContacts.length - 1) {
        await delay(500);
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("validate-contacts error:", err);
    return new Response(
      JSON.stringify({ error: err?.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
