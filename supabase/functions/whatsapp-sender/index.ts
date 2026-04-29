import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const WHATSAPP_API_URL = "https://graph.facebook.com/v18.0";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log('[Sender] Starting send process...');

    const MAX_EXECUTION_TIME = 25000; // 25 seconds
    const startTime = Date.now();
    let totalSent = 0;
    let iterations = 0;

    console.log('[Sender] Starting polling loop');

    // Cache de settings por user_id para evitar múltiplas queries
    const settingsCache: Record<string, any> = {};
    // Cache de instance secrets
    const instanceSecretsCache: Record<string, any> = {};

    while (Date.now() - startTime < MAX_EXECUTION_TIME) {
      iterations++;
      console.log(`[Sender] Iteration ${iterations}, elapsed: ${Date.now() - startTime}ms`);

      // Claim batch of messages to send
      const { data: queueItems, error: claimError } = await supabase
        .rpc('claim_send_queue_batch', { p_limit: 10 });

      if (claimError) {
        console.error('[Sender] Error claiming batch:', claimError);
        throw claimError;
      }

      if (!queueItems || queueItems.length === 0) {
        console.log('[Sender] No messages ready to send, checking for scheduled messages...');
        
        // Check for messages scheduled in the next 5 seconds
        const { data: upcoming, error: upcomingError } = await supabase
          .from('send_queue')
          .select('id, scheduled_at')
          .eq('status', 'pending')
          .gte('scheduled_at', new Date().toISOString())
          .lte('scheduled_at', new Date(Date.now() + 5000).toISOString())
          .order('scheduled_at', { ascending: true })
          .limit(1);

        if (upcomingError) {
          console.error('[Sender] Error checking upcoming messages:', upcomingError);
        }

        if (upcoming && upcoming.length > 0) {
          const scheduledAt = new Date(upcoming[0].scheduled_at).getTime();
          const now = Date.now();
          const waitTime = Math.min(
            Math.max(scheduledAt - now + 100, 0),
            5000
          );
          
          if (waitTime > 0 && (Date.now() - startTime + waitTime) < MAX_EXECUTION_TIME) {
            console.log(`[Sender] Waiting ${waitTime}ms for scheduled message at ${upcoming[0].scheduled_at}`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }
        }
        
        // No more messages to process
        console.log('[Sender] No more messages to process, exiting loop');
        break;
      }

      console.log(`[Sender] Processing batch of ${queueItems.length} messages`);

      for (const item of queueItems) {
        try {
          // Verificar se tem instance_id (uazapi) ou usar nina_settings (API Oficial)
          if (item.instance_id) {
            await sendViaUazapi(supabase, item, instanceSecretsCache);
          } else {
            await sendViaOfficial(supabase, item, settingsCache);
          }
          
          // Mark as completed
          await supabase
            .from('send_queue')
            .update({ 
              status: 'completed', 
              sent_at: new Date().toISOString() 
            })
            .eq('id', item.id);
          
          totalSent++;
          console.log(`[Sender] Successfully sent message ${item.id} (${totalSent} total)`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error(`[Sender] Error sending item ${item.id}:`, error);
          
          // Mark as failed with retry
          const newRetryCount = (item.retry_count || 0) + 1;
          const shouldRetry = newRetryCount < 3;
          
          await supabase
            .from('send_queue')
            .update({ 
              status: shouldRetry ? 'pending' : 'failed',
              retry_count: newRetryCount,
              error_message: errorMessage,
              scheduled_at: shouldRetry 
                ? new Date(Date.now() + newRetryCount * 60000).toISOString() 
                : null
            })
            .eq('id', item.id);
        }
      }
    }

    const executionTime = Date.now() - startTime;
    console.log(`[Sender] Completed: sent ${totalSent} messages in ${iterations} iterations (${executionTime}ms)`);

    return new Response(JSON.stringify({ 
      sent: totalSent, 
      iterations,
      executionTime 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[Sender] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// ========================================
// UAZAPI SENDER
// ========================================
async function sendViaUazapi(supabase: any, queueItem: any, secretsCache: Record<string, any>) {
  console.log(`[Sender] Sending via uazapi: ${queueItem.id}`);

  // Buscar instância
  const { data: instance, error: instanceError } = await supabase
    .from('whatsapp_instances')
    .select('id, instance_name, provider_type, status')
    .eq('id', queueItem.instance_id)
    .single();

  if (instanceError || !instance) {
    throw new Error(`Instance not found: ${queueItem.instance_id}`);
  }

  if (instance.status !== 'connected') {
    throw new Error(`Instance ${instance.instance_name} is not connected (status: ${instance.status})`);
  }

  // Buscar secrets (com cache)
  let secrets = secretsCache[instance.id];
  if (!secrets) {
    const { data: secretsData, error: secretsError } = await supabase
      .from('whatsapp_instance_secrets')
      .select('base_url, token, instance_token')
      .eq('instance_id', instance.id)
      .single();

    if (secretsError || !secretsData) {
      throw new Error('Instance secrets not found');
    }
    secrets = secretsData;
    secretsCache[instance.id] = secrets;
  }

  // Buscar contato
  const { data: contact } = await supabase
    .from('contacts')
    .select('phone_number, whatsapp_id')
    .eq('id', queueItem.contact_id)
    .maybeSingle();

  if (!contact) {
    throw new Error('Contact not found');
  }

  const whatsappId = contact.whatsapp_id || contact.phone_number;
  const targetNumber = whatsappId.replace(/[^\d]/g, '');

  console.log(`[Sender] Contact whatsapp_id: ${whatsappId}, targetNumber: ${targetNumber}`);

  const baseUrl = secrets.base_url.replace(/\/$/, '');
  const uazapiToken = secrets.instance_token || secrets.token;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'token': uazapiToken,
  };

  let endpoint: string;
  let payload: any;
  let presenceType: string;

  switch (queueItem.message_type) {
    case 'text':
      endpoint = `${baseUrl}/send/text`;
      payload = { number: targetNumber, text: queueItem.content };
      presenceType = 'composing';
      break;

    case 'audio':
      endpoint = `${baseUrl}/send/media`;
      payload = { number: targetNumber, type: 'audio', file: queueItem.media_url };
      presenceType = 'recording';
      break;

    case 'image':
      endpoint = `${baseUrl}/send/media`;
      payload = { number: targetNumber, type: 'image', file: queueItem.media_url };
      presenceType = 'composing';
      break;

    case 'document':
      endpoint = `${baseUrl}/send/media`;
      payload = {
        number: targetNumber,
        type: 'document',
        file: queueItem.media_url,
        docName: queueItem.metadata?.fileName || 'document',
      };
      presenceType = 'composing';
      break;

    default:
      endpoint = `${baseUrl}/send/text`;
      payload = { number: targetNumber, text: queueItem.content };
      presenceType = 'composing';
  }

  // Enviar presence antes da mensagem
  try {
    console.log(`[Sender] Sending presence '${presenceType}' to ${targetNumber}`);
    await fetch(`${baseUrl}/send/presence`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ number: targetNumber, presence: presenceType }),
    });
    await new Promise(resolve => setTimeout(resolve, 2000));
  } catch (presenceErr) {
    console.log('[Sender] Presence error (non-fatal):', presenceErr);
  }

  console.log(`[Sender] uazapi endpoint: ${endpoint}`);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  const responseText = await response.text();
  console.log(`[Sender] uazapi response: ${response.status} - ${responseText.substring(0, 300)}`);

  if (!response.ok) {
    throw new Error(`uazapi error: ${responseText}`);
  }

  let responseData;
  try {
    responseData = JSON.parse(responseText);
  } catch {
    responseData = { raw: responseText };
  }

  const whatsappMessageId = responseData?.messageid || responseData?.key?.id || responseData?.messageId || responseData?.id;
  console.log('[Sender] uazapi message sent, ID:', whatsappMessageId);

  // Atualizar ou criar registro da mensagem
  await updateMessageRecord(supabase, queueItem, whatsappMessageId);
}

// ========================================
// OFFICIAL API SENDER (WhatsApp Cloud API)
// ========================================
async function sendViaOfficial(supabase: any, queueItem: any, settingsCache: Record<string, any>) {
  console.log(`[Sender] Sending via Official API: ${queueItem.id}`);

  // Buscar user_id da conversation para multi-tenancy
  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .select('user_id')
    .eq('id', queueItem.conversation_id)
    .single();

  if (convError || !conversation) {
    console.error(`[Sender] Error fetching conversation ${queueItem.conversation_id}:`, convError);
    throw new Error('Conversation not found');
  }

  const userId = conversation.user_id;
  
  // Buscar settings do cache ou do banco com fallback triplo
  const cacheKey = userId || 'global';
  let settings = settingsCache[cacheKey];
  if (!settings) {
    let settingsData = null;

    // 1. Tentar por user_id da conversa
    if (userId) {
      const { data } = await supabase
        .from('nina_settings')
        .select('whatsapp_access_token, whatsapp_phone_number_id')
        .eq('user_id', userId)
        .maybeSingle();
      settingsData = data;
    }

    // 2. Fallback: buscar global (user_id IS NULL)
    if (!settingsData) {
      console.log('[Sender] No user-specific settings, trying global...');
      const { data } = await supabase
        .from('nina_settings')
        .select('whatsapp_access_token, whatsapp_phone_number_id')
        .is('user_id', null)
        .maybeSingle();
      settingsData = data;
    }

    // 3. Último fallback: qualquer settings com WhatsApp configurado
    if (!settingsData) {
      console.log('[Sender] No global settings, fetching any with WhatsApp...');
      const { data } = await supabase
        .from('nina_settings')
        .select('whatsapp_access_token, whatsapp_phone_number_id')
        .not('whatsapp_phone_number_id', 'is', null)
        .limit(1)
        .maybeSingle();
      settingsData = data;
    }

    if (!settingsData) {
      console.error('[Sender] No settings found with any fallback');
      throw new Error('Settings not found');
    }

    if (!settingsData.whatsapp_access_token || !settingsData.whatsapp_phone_number_id) {
      console.error('[Sender] WhatsApp not configured in settings');
      throw new Error('WhatsApp not configured');
    }

    settings = settingsData;
    settingsCache[cacheKey] = settings;
  }

  // Get contact phone number
  const { data: contact } = await supabase
    .from('contacts')
    .select('phone_number, whatsapp_id')
    .eq('id', queueItem.contact_id)
    .maybeSingle();

  if (!contact) {
    throw new Error('Contact not found');
  }

  const recipient = contact.whatsapp_id || contact.phone_number;

  // Build WhatsApp API payload
  let payload: any = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: recipient
  };

  switch (queueItem.message_type) {
    case 'text':
      payload.type = 'text';
      payload.text = { body: queueItem.content };
      break;
    
    case 'image':
      payload.type = 'image';
      payload.image = { 
        link: queueItem.media_url,
        caption: queueItem.content || undefined
      };
      break;
    
    case 'audio':
      payload.type = 'audio';
      payload.audio = { link: queueItem.media_url };
      break;
    
    case 'document':
      payload.type = 'document';
      payload.document = { 
        link: queueItem.media_url,
        filename: queueItem.content || 'document'
      };
      break;
    
    default:
      payload.type = 'text';
      payload.text = { body: queueItem.content };
  }

  console.log('[Sender] WhatsApp API payload:', JSON.stringify(payload, null, 2));

  // Send via WhatsApp Cloud API
  const response = await fetch(
    `${WHATSAPP_API_URL}/${settings.whatsapp_phone_number_id}/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${settings.whatsapp_access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    }
  );

  const responseData = await response.json();

  if (!response.ok) {
    console.error('[Sender] WhatsApp API error:', responseData);
    throw new Error(responseData.error?.message || 'WhatsApp API error');
  }

  const whatsappMessageId = responseData.messages?.[0]?.id;
  console.log('[Sender] Message sent, WA ID:', whatsappMessageId);

  // Atualizar ou criar registro da mensagem
  await updateMessageRecord(supabase, queueItem, whatsappMessageId);
}

// ========================================
// HELPER: Atualizar registro da mensagem
// ========================================
async function updateMessageRecord(supabase: any, queueItem: any, whatsappMessageId: string | undefined) {
  if (queueItem.message_id) {
    // UPDATE existing message (for human messages)
    console.log('[Sender] Updating existing message:', queueItem.message_id);
    const { error: msgError } = await supabase
      .from('messages')
      .update({
        whatsapp_message_id: whatsappMessageId,
        status: 'sent',
        sent_at: new Date().toISOString()
      })
      .eq('id', queueItem.message_id);

    if (msgError) {
      console.error('[Sender] Error updating message record:', msgError);
    }
  } else {
    // INSERT new message (for Nina messages)
    console.log('[Sender] Creating new message record');
    const { error: msgError } = await supabase
      .from('messages')
      .insert({
        conversation_id: queueItem.conversation_id,
        whatsapp_message_id: whatsappMessageId,
        content: queueItem.content,
        type: queueItem.message_type,
        from_type: queueItem.from_type,
        status: 'sent',
        media_url: queueItem.media_url || null,
        sent_at: new Date().toISOString(),
        metadata: queueItem.metadata || {}
      });

    if (msgError) {
      console.error('[Sender] Error creating message record:', msgError);
    }
  }

  // Update conversation last_message_at
  await supabase
    .from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', queueItem.conversation_id);
}
