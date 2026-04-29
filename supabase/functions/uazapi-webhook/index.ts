import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface UazapiWebhookPayload {
  BaseUrl?: string;
  EventType: string;
  instanceName?: string;
  owner?: string;
  token?: string;
  chatSource?: string;
  message?: {
    messageid: string;
    chatid: string;
    chatlid?: string;
    sender?: string;
    sender_pn?: string;
    sender_lid?: string;
    senderName?: string;
    fromMe: boolean;
    isGroup: boolean;
    messageType: string;
    mediaType?: string;
    text: string;
    messageTimestamp: number;
    wasSentByApi: boolean;
    content?: any;
  };
  chat?: {
    wa_chatid?: string;
    wa_chatlid?: string;
    wa_name?: string;
    wa_isGroup?: boolean;
    phone?: string;
    owner?: string;
  };
}

serve(async (req) => {
  console.log(`[uazapi-webhook] Received ${req.method} request`);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const payload: UazapiWebhookPayload = await req.json();
    console.log(`[uazapi-webhook] EventType: ${payload.EventType}, Instance: ${payload.instanceName || payload.owner}`);

    // Filtrar eventos que não são mensagens
    if (payload.EventType !== 'messages') {
      console.log(`[uazapi-webhook] Ignoring non-message event: ${payload.EventType}`);
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const msg = payload.message;
    if (!msg) {
      console.log('[uazapi-webhook] No message data');
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Filtrar mensagens próprias e enviadas pela API
    if (msg.fromMe) {
      console.log('[uazapi-webhook] Outgoing message (fromMe=true) - saving to chat');
      await saveOutgoingMessage(payload, supabase);
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (msg.wasSentByApi) {
      console.log('[uazapi-webhook] Message sent by API - skipping');
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Ignorar grupos
    if (msg.isGroup) {
      console.log('[uazapi-webhook] Ignoring group message');
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Buscar instância por instanceName ou owner
    const instanceIdentifier = payload.instanceName || payload.owner;
    let { data: instanceData } = await supabase
      .from('whatsapp_instances')
      .select('id, instance_name, provider_type, status, user_id')
      .eq('instance_name', instanceIdentifier)
      .eq('is_active', true)
      .maybeSingle();

    if (!instanceData && payload.owner) {
      // Fallback: buscar por phone_number que contenha o owner
      const { data: ownerInstance } = await supabase
        .from('whatsapp_instances')
        .select('id, instance_name, provider_type, status, user_id')
        .eq('is_active', true)
        .maybeSingle();
      instanceData = ownerInstance;
    }

    if (!instanceData) {
      console.log(`[uazapi-webhook] Instance not found: ${instanceIdentifier}`);
      return new Response(JSON.stringify({ error: 'Instance not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`[uazapi-webhook] Found instance: ${instanceData.id}`);

    // Resolução do número: prioridade sender_pn > chatid > chat.wa_chatid
    let whatsappId = msg.sender_pn || msg.chatid || payload.chat?.wa_chatid || '';
    const phoneNumber = whatsappId.replace('@s.whatsapp.net', '').replace('@lid', '');
    const contactName = msg.senderName || payload.chat?.wa_name || phoneNumber;

    console.log(`[uazapi-webhook] Phone: ${phoneNumber}, WhatsApp ID: ${whatsappId}, Name: ${contactName}`);

    // Verificar se contato já existe
    let { data: contact } = await supabase
      .from('contacts')
      .select('*')
      .eq('phone_number', phoneNumber)
      .maybeSingle();

    if (!contact) {
      const { data: newContact, error: contactError } = await supabase
        .from('contacts')
        .insert({
          phone_number: phoneNumber,
          whatsapp_id: whatsappId,
          name: contactName,
          call_name: contactName,
          instance_id: instanceData.id,
          user_id: instanceData.user_id,
          last_activity: new Date().toISOString(),
        })
        .select()
        .single();

      if (contactError) {
        console.error('[uazapi-webhook] Error creating contact:', contactError);
        return new Response(JSON.stringify({ error: 'Failed to create contact' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      contact = newContact;
      console.log('[uazapi-webhook] Created NEW contact:', contact.id);
    } else {
      const updates: Record<string, any> = {
        last_activity: new Date().toISOString(),
        instance_id: instanceData.id,
      };
      if (contactName && !contact.name) {
        updates.name = contactName;
        updates.call_name = contactName;
      }
      await supabase.from('contacts').update(updates).eq('id', contact.id);
      console.log('[uazapi-webhook] Updated existing contact:', contact.id);
    }

    // Buscar ou criar conversa
    let { data: conversation } = await supabase
      .from('conversations')
      .select('*')
      .eq('contact_id', contact.id)
      .eq('is_active', true)
      .maybeSingle();

    if (!conversation) {
      const { data: newConversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          contact_id: contact.id,
          instance_id: instanceData.id,
          user_id: instanceData.user_id,
          status: 'nina',
          is_active: true,
          last_message_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (convError) {
        console.error('[uazapi-webhook] Error creating conversation:', convError);
        return new Response(JSON.stringify({ error: 'Failed to create conversation' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      conversation = newConversation;
    } else if (conversation.instance_id !== instanceData.id) {
      await supabase.from('conversations').update({ instance_id: instanceData.id }).eq('id', conversation.id);
    }

    // Extrair conteúdo da mensagem
    const { content, messageType, mediaUrl } = extractMessageContent(msg);

    // Criar mensagem no banco
    const { data: message, error: msgError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversation.id,
        whatsapp_message_id: msg.messageid,
        content,
        type: messageType,
        from_type: 'user',
        status: 'delivered',
        media_url: mediaUrl,
        sent_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (msgError) {
      console.error('[uazapi-webhook] Error creating message:', msgError);
      return new Response(JSON.stringify({ error: 'Failed to create message' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Atualizar last_message_at
    await supabase.from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversation.id);

    // Agrupamento de mensagens
    const GROUPING_DELAY_MS = 20000;
    const processAfter = new Date(Date.now() + GROUPING_DELAY_MS).toISOString();

    // Atualizar process_after de mensagens pendentes do mesmo telefone
    await supabase
      .from('message_grouping_queue')
      .update({ process_after: processAfter })
      .eq('phone_number_id', instanceData.instance_name)
      .eq('processed', false);

    // Inserir na fila de agrupamento
    await supabase
      .from('message_grouping_queue')
      .insert({
        phone_number_id: instanceData.instance_name,
        whatsapp_message_id: msg.messageid,
        message_id: message.id,
        instance_id: instanceData.id,
        message_data: {
          content,
          type: messageType,
          messageType,
          mediaUrl,
          from: phoneNumber,
          contactName,
          key: { remoteJid: whatsappId, fromMe: false, id: msg.messageid },
          audio: messageType === 'audio' ? { id: msg.messageid } : undefined,
          image: messageType === 'image' ? { id: msg.messageid, caption: msg.text || '' } : undefined,
          document: messageType === 'document' ? { id: msg.messageid, fileName: msg.content?.fileName || msg.text || '' } : undefined,
          video: messageType === 'video' ? { id: msg.messageid, caption: msg.text || msg.content?.caption || '' } : undefined,
        },
        process_after: processAfter,
      });

    console.log(`[uazapi-webhook] Message queued for processing: ${message.id}`);

    // Trigger message-grouper
    try {
      fetch(`${supabaseUrl}/functions/v1/message-grouper`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({ trigger: 'uazapi-webhook' }),
      }).catch(err => console.log('[uazapi-webhook] message-grouper trigger error:', err));
    } catch (e) {
      console.log('[uazapi-webhook] Could not trigger message-grouper:', e);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    console.error('[uazapi-webhook] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function saveOutgoingMessage(payload: UazapiWebhookPayload, supabase: any) {
  const msg = payload.message!;

  if (msg.isGroup) return;

  // Resolver número do destinatário
  const whatsappId = msg.sender_pn || msg.chatid || payload.chat?.wa_chatid || '';
  const phoneNumber = whatsappId.replace('@s.whatsapp.net', '').replace('@lid', '');

  const { data: contact } = await supabase
    .from('contacts')
    .select('id')
    .eq('phone_number', phoneNumber)
    .maybeSingle();

  if (!contact) {
    console.log(`[uazapi-webhook] No contact found for outgoing message to ${phoneNumber}`);
    return;
  }

  const { data: conversation } = await supabase
    .from('conversations')
    .select('id')
    .eq('contact_id', contact.id)
    .eq('is_active', true)
    .maybeSingle();

  if (!conversation) return;

  // Verificar duplicata
  const { data: existingMsg } = await supabase
    .from('messages')
    .select('id')
    .eq('whatsapp_message_id', msg.messageid)
    .maybeSingle();

  if (existingMsg) return;

  const { content, messageType, mediaUrl } = extractMessageContent(msg);

  await supabase.from('messages').insert({
    conversation_id: conversation.id,
    whatsapp_message_id: msg.messageid,
    content,
    type: messageType,
    from_type: 'human',
    status: 'sent',
    media_url: mediaUrl,
    sent_at: new Date().toISOString(),
  });

  await supabase.from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', conversation.id);

  console.log(`[uazapi-webhook] Saved outgoing message to conversation ${conversation.id}`);
}

function extractMessageContent(msg: UazapiWebhookPayload['message']): { content: string; messageType: string; mediaUrl: string | null } {
  if (!msg) {
    return { content: '', messageType: 'text', mediaUrl: null };
  }

  const type = msg.messageType;

  // IMPORTANT: Do NOT store WhatsApp's directPath or encrypted URLs as media_url.
  // These are NOT valid public URLs. The message-grouper will download media
  // from the instance API, upload to storage, and set the proper public URL.

  switch (type) {
    case 'conversation':
    case 'extendedTextMessage':
      return { content: msg.text || '', messageType: 'text', mediaUrl: null };

    case 'AudioMessage':
    case 'audioMessage':
      return {
        content: msg.text || '[Áudio]',
        messageType: 'audio',
        mediaUrl: null, // Will be set by message-grouper after download
      };

    case 'ImageMessage':
    case 'imageMessage':
      return {
        content: msg.text || msg.content?.caption || '[Imagem]',
        messageType: 'image',
        mediaUrl: null, // Will be set by message-grouper after download
      };

    case 'DocumentMessage':
    case 'documentMessage':
      return {
        content: msg.text || msg.content?.fileName || '[Documento]',
        messageType: 'document',
        mediaUrl: null, // Will be set by message-grouper after download
      };

    case 'VideoMessage':
    case 'videoMessage':
      return {
        content: msg.text || msg.content?.caption || '[Vídeo]',
        messageType: 'video',
        mediaUrl: null, // Will be set by message-grouper after download
      };

    default:
      return { content: msg.text || type || '', messageType: 'text', mediaUrl: null };
  }
}
