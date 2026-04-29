import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

// Helper function to format phone number to +55 (XX) XXXXX-XXXX format
function formatPhoneNumber(phone: string): string {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 13) {
    return `+${cleaned.slice(0,2)} (${cleaned.slice(2,4)}) ${cleaned.slice(4,9)}-${cleaned.slice(9)}`;
  } else if (cleaned.length === 12) {
    return `+${cleaned.slice(0,2)} (${cleaned.slice(2,4)}) ${cleaned.slice(4,8)}-${cleaned.slice(8)}`;
  } else if (cleaned.length === 11) {
    return `+55 (${cleaned.slice(0,2)}) ${cleaned.slice(2,7)}-${cleaned.slice(7)}`;
  } else if (cleaned.length === 10) {
    return `+55 (${cleaned.slice(0,2)}) ${cleaned.slice(2,6)}-${cleaned.slice(6)}`;
  }
  return phone;
}

// Format date in ISO 8601 with timezone -03:00
function formatWithTimezone(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}-03:00`;
}

// Format date for display (DD/MM/YYYY)
function formatDateDisplay(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

// Format time for display (HH:MM)
function formatTimeDisplay(timeStr: string): string {
  return timeStr.substring(0, 5);
}

// Generate conversation summary using Lovable AI
async function generateConversationSummary(
  messages: { content: string | null; from_type: string }[],
  lovableApiKey: string
): Promise<string> {
  if (!messages || messages.length === 0) {
    return 'Sem histórico de conversa disponível.';
  }

  const conversationText = messages
    .reverse()
    .map(m => `${m.from_type === 'user' ? 'Lead' : 'SDR'}: ${m.content || ''}`)
    .filter(line => line.length > 10)
    .join('\n');

  if (!conversationText.trim()) {
    return 'Sem histórico de conversa disponível.';
  }

  try {
    const response = await fetch(LOVABLE_AI_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { 
            role: 'system', 
            content: 'Você é um assistente que gera resumos breves de conversas de vendas. Gere um resumo de no máximo 3 frases, focando no interesse do lead, o produto/serviço discutido e o motivo da reunião. Seja direto e objetivo.' 
          },
          { role: 'user', content: `Resuma esta conversa:\n\n${conversationText}` }
        ],
        max_tokens: 200
      })
    });

    if (!response.ok) {
      console.error('[Test Webhook] AI summary error:', response.status);
      return 'Não foi possível gerar resumo da conversa.';
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || 'Não foi possível gerar resumo da conversa.';
  } catch (error) {
    console.error('[Test Webhook] Error generating summary:', error);
    return 'Erro ao gerar resumo da conversa.';
  }
}

// Send WhatsApp message to closer
async function sendCloserNotification(
  supabase: any,
  closerPhone: string,
  appointmentDate: string,
  appointmentTime: string,
  contactName: string,
  contactPhone: string,
  contactEmail: string,
  meetLink: string | null,
  summary: string
): Promise<boolean> {
  if (!closerPhone) {
    console.log('[Test Webhook] No closer phone available, skipping notification');
    return false;
  }

  try {
    // Get default WhatsApp instance
    const { data: defaultInstance } = await supabase
      .from('whatsapp_instances')
      .select('id')
      .eq('is_default', true)
      .eq('is_active', true)
      .single();

    if (!defaultInstance) {
      console.log('[Test Webhook] No default WhatsApp instance found');
      return false;
    }

    const formattedDate = formatDateDisplay(appointmentDate);
    const formattedTime = formatTimeDisplay(appointmentTime);
    const formattedContactPhone = formatPhoneNumber(contactPhone);
    
    // Build message
    let message = `🗓️ *Nova Reunião Agendada!*\n\n`;
    message += `📅 *Data:* ${formattedDate}\n`;
    message += `⏰ *Horário:* ${formattedTime}\n\n`;
    message += `👤 *Lead:* ${contactName}\n`;
    message += `📱 *Telefone:* ${formattedContactPhone}\n`;
    message += `📧 *E-mail:* ${contactEmail || 'Não informado'}\n\n`;
    
    if (meetLink) {
      message += `🔗 *Link da Reunião:* ${meetLink}\n\n`;
    }
    
    message += `📝 *Resumo:* ${summary}`;

    console.log('[Test Webhook] Sending notification to closer:', closerPhone);

    // Send via uazapi
    const { error } = await supabase.functions.invoke('send-uazapi-message', {
      body: {
        instance_id: defaultInstance.id,
        phone_number: closerPhone,
        content: message,
        message_type: 'text'
      }
    });

    if (error) {
      console.error('[Test Webhook] Error sending closer notification:', error);
      return false;
    }

    console.log('[Test Webhook] Closer notification sent successfully');
    return true;
  } catch (error) {
    console.error('[Test Webhook] Error in sendCloserNotification:', error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { appointmentId } = await req.json();
    
    if (!appointmentId) {
      return new Response(
        JSON.stringify({ error: 'appointmentId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Test Webhook] Processing appointment:', appointmentId);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch appointment with contact data
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select(`
        *,
        contacts:contact_id (
          id,
          name,
          email,
          phone_number,
          call_name
        )
      `)
      .eq('id', appointmentId)
      .single();

    if (appointmentError || !appointment) {
      console.error('[Test Webhook] Appointment not found:', appointmentError);
      return new Response(
        JSON.stringify({ error: 'Appointment not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Test Webhook] Appointment data:', JSON.stringify(appointment));

    // Get closer email and phone
    let closerEmail = appointment.assigned_closer_email || '';
    let closerPhone = appointment.assigned_closer_phone || '';
    
    // If no assigned_closer info, try to get from team_members
    if ((!closerEmail || !closerPhone) && appointment.assigned_closer_id) {
      const { data: closer } = await supabase
        .from('team_members')
        .select('email, phone')
        .eq('id', appointment.assigned_closer_id)
        .single();
      
      if (closer) {
        closerEmail = closerEmail || closer.email;
        closerPhone = closerPhone || closer.phone;
      }
    }

    // Build start and end datetime (time already includes seconds like "16:00:00")
    const startDateTime = new Date(`${appointment.date}T${appointment.time}`);
    const duration = appointment.duration || 60;
    const endDateTime = new Date(startDateTime.getTime() + duration * 60000);

    // Get contact data
    const contact = appointment.contacts as { id: string; name: string; email: string; phone_number: string; call_name: string } | null;
    const contactName = contact?.name || contact?.call_name || 'Lead';
    const contactEmail = contact?.email || '';
    const contactPhone = contact?.phone_number || '';
    const formattedPhone = formatPhoneNumber(contactPhone);

    // Build webhook payload
    const payload = [
      {
        query: {
          nome_lead: contactName,
          email_lead: contactEmail,
          produto: appointment.description || appointment.title || 'Agendamento',
          email_closer: closerEmail,
          start: formatWithTimezone(startDateTime),
          end: formatWithTimezone(endDateTime)
        },
        Evento: 'agendamento',
        remoteid: formattedPhone,
        phone: formattedPhone
      }
    ];

    console.log('[Test Webhook] Sending payload:', JSON.stringify(payload));

    // Send to n8n webhook
    const webhookUrl = 'https://criadordigital-n8n-webhook.dk5sps.easypanel.host/webhook/agendamentorafa';
    
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const webhookStatus = webhookResponse.status;
    let webhookBody: any = null;
    let meetLink: string | null = null;
    
    try {
      webhookBody = await webhookResponse.json();
      console.log('[Test Webhook] Webhook response:', JSON.stringify(webhookBody));
      
      // Extract meeting link from response
      meetLink = webhookBody?.link || webhookBody?.meeting_url || webhookBody?.hangoutLink || null;
      
      if (meetLink) {
        console.log('[Test Webhook] Meet link extracted:', meetLink);
        
        // Update appointment with meeting_url
        const { error: updateError } = await supabase
          .from('appointments')
          .update({ meeting_url: meetLink })
          .eq('id', appointmentId);
        
        if (updateError) {
          console.error('[Test Webhook] Error updating meeting_url:', updateError);
        } else {
          console.log('[Test Webhook] Appointment updated with meeting_url');
        }
      }
    } catch (e) {
      console.log('[Test Webhook] Could not parse webhook response as JSON');
    }

    // Generate conversation summary and notify closer
    if (contact?.id) {
      // Get conversation for this contact
      const { data: conversation } = await supabase
        .from('conversations')
        .select('id')
        .eq('contact_id', contact.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (conversation) {
        // Get last 20 messages
        const { data: messages } = await supabase
          .from('messages')
          .select('content, from_type')
          .eq('conversation_id', conversation.id)
          .order('sent_at', { ascending: false })
          .limit(20);

        // Generate summary
        const summary = await generateConversationSummary(messages || [], lovableApiKey);
        console.log('[Test Webhook] Generated summary:', summary);

        // Send notification to closer
        if (closerPhone) {
          await sendCloserNotification(
            supabase,
            closerPhone,
            appointment.date,
            appointment.time,
            contactName,
            contactPhone,
            contactEmail,
            meetLink,
            summary
          );
        }
      }
    }

    if (!webhookResponse.ok) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Webhook failed',
          webhookStatus,
          webhookBody,
          meetLink,
          payloadSent: payload
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Webhook sent successfully',
        webhookStatus,
        meetLink,
        closerNotified: !!closerPhone,
        payloadSent: payload
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Test Webhook] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
