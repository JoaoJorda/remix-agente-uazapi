import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🧪 Test WhatsApp Message function invoked (Evolution API)');

    const { phone, phone_number, message } = await req.json();
    const rawPhone = phone || phone_number;

    if (!rawPhone || !message) {
      return new Response(
        JSON.stringify({ success: false, error: 'Número de telefone e mensagem são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cleanPhone = rawPhone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 10) {
      return new Response(
        JSON.stringify({ success: false, error: 'Formato de número inválido. Use o formato internacional (ex: 5511999999999)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Auth
    let userId: string | null = null;
    const authHeader = req.headers.get('authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Usuário não autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find default connected instance
    console.log('🔍 Finding default connected instance...');
    const { data: instance } = await supabase
      .from('whatsapp_instances')
      .select('id, instance_name, status, is_default')
      .eq('is_active', true)
      .eq('status', 'connected')
      .order('is_default', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!instance) {
      return new Response(
        JSON.stringify({ success: false, error: 'Nenhuma instância WhatsApp conectada. Conecte uma instância primeiro.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📱 Using instance:', instance.instance_name, '(id:', instance.id, ')');

    // Get or create contact
    console.log('📇 Getting or creating contact...');
    const { data: existingContact } = await supabase
      .from('contacts')
      .select('id')
      .eq('phone_number', cleanPhone)
      .maybeSingle();

    let contactId: string;
    if (existingContact) {
      contactId = existingContact.id;
    } else {
      const { data: newContact, error: contactError } = await supabase
        .from('contacts')
        .insert({ phone_number: cleanPhone, whatsapp_id: cleanPhone, user_id: null })
        .select('id')
        .single();
      if (contactError) throw new Error('Erro ao criar contato: ' + contactError.message);
      contactId = newContact.id;
    }

    // Get or create conversation
    const { data: existingConv } = await supabase
      .from('conversations')
      .select('id')
      .eq('contact_id', contactId)
      .eq('is_active', true)
      .maybeSingle();

    let conversationId: string;
    if (existingConv) {
      conversationId = existingConv.id;
    } else {
      const { data: newConv, error: convError } = await supabase
        .from('conversations')
        .insert({ contact_id: contactId, status: 'nina', is_active: true, user_id: null })
        .select('id')
        .single();
      if (convError) throw new Error('Erro ao criar conversa: ' + convError.message);
      conversationId = newConv.id;
    }

    // Create message record
    const { data: newMessage, error: messageError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        from_type: 'nina',
        type: 'text',
        content: message,
        status: 'processing',
      })
      .select('id')
      .single();

    if (messageError) throw new Error('Erro ao criar mensagem: ' + messageError.message);

    // Send via send-uazapi-message edge function
    console.log('📤 Sending via uazapi...');
    const sendResponse = await fetch(`${supabaseUrl}/functions/v1/send-uazapi-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        instance_id: instance.id,
        phone_number: cleanPhone,
        content: message,
        message_type: 'text',
      }),
    });

    const sendData = await sendResponse.json();

    if (!sendResponse.ok || !sendData.success) {
      // Update message status to failed
      await supabase.from('messages').update({ status: 'failed' }).eq('id', newMessage.id);
      
      return new Response(
        JSON.stringify({ success: false, error: sendData.error || 'Erro ao enviar mensagem via uazapi' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update message with ID and status
    const whatsappMessageId = sendData.messageId;
    await supabase
      .from('messages')
      .update({ whatsapp_message_id: whatsappMessageId, status: 'sent' })
      .eq('id', newMessage.id);

    await supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversationId);

    console.log('✅ Test message sent successfully via uazapi');

    return new Response(
      JSON.stringify({
        success: true,
        message_id: whatsappMessageId,
        contact_id: contactId,
        conversation_id: conversationId,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro inesperado';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
