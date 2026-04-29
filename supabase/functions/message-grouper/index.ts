import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

console.log('[MessageGrouper] Edge function booted successfully');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log('[MessageGrouper] Starting message grouping...');

    // Fetch messages ready to process (timer expired and not processed)
    const { data: readyMessages, error: fetchError } = await supabase
      .from('message_grouping_queue')
      .select('*')
      .eq('processed', false)
      .lte('process_after', new Date().toISOString())
      .order('created_at', { ascending: true });

    if (fetchError) {
      console.error('[MessageGrouper] Error fetching messages:', fetchError);
      throw fetchError;
    }

    if (!readyMessages || readyMessages.length === 0) {
      console.log('[MessageGrouper] No messages ready to process');
      
      // Check if there are pending messages with future process_after and schedule re-invocation
      await scheduleNextProcessing(supabase, supabaseUrl, supabaseServiceKey);
      
      return new Response(JSON.stringify({ processed: 0, groups: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`[MessageGrouper] Found ${readyMessages.length} messages ready to process`);

    // IMMEDIATELY mark all ready messages as processed to prevent duplicates
    const readyIds = readyMessages.map(m => m.id);
    await supabase
      .from('message_grouping_queue')
      .update({ processed: true })
      .in('id', readyIds);

    console.log(`[MessageGrouper] Marked ${readyIds.length} messages as processed`);

    // Group messages by phone number
    const grouped: Record<string, typeof readyMessages> = {};
    for (const msg of readyMessages) {
      const phone = msg.message_data?.from;
      if (!phone) continue;
      if (!grouped[phone]) grouped[phone] = [];
      grouped[phone].push(msg);
    }

    const groupCount = Object.keys(grouped).length;
    console.log(`[MessageGrouper] Grouped into ${groupCount} phone numbers`);

    let processedCount = 0;

    // Process each group
    for (const [phoneNumber, messages] of Object.entries(grouped)) {
      try {
        console.log(`[MessageGrouper] Processing group for ${phoneNumber} with ${messages.length} messages`);

        // Get the phone_number_id from the first message
        const phoneNumberId = messages[0].phone_number_id;

        // Get owner settings for this phone_number_id
        const { data: ownerSettings } = await supabase
          .from('nina_settings')
          .select('user_id, whatsapp_access_token')
          .eq('whatsapp_phone_number_id', phoneNumberId)
          .maybeSingle();

        // Get all message_ids from the queue entries
        const messageIds = messages.map(m => m.message_id).filter(Boolean);
        
        if (messageIds.length === 0) {
          console.log(`[MessageGrouper] No message_ids found for group ${phoneNumber}, skipping`);
          continue;
        }

        // Fetch the actual messages from the database
        const { data: dbMessages, error: dbMsgError } = await supabase
          .from('messages')
          .select('*')
          .in('id', messageIds)
          .order('sent_at', { ascending: true });

        if (dbMsgError || !dbMessages || dbMessages.length === 0) {
          console.error('[MessageGrouper] Error fetching messages from DB:', dbMsgError);
          continue;
        }

        // Get the last message's conversation for context
        const lastDbMessage = dbMessages[dbMessages.length - 1];
        const conversationId = lastDbMessage.conversation_id;

        // Get conversation details
        const { data: conversation } = await supabase
          .from('conversations')
          .select('*, contacts(*)')
          .eq('id', conversationId)
          .single();

        if (!conversation) {
          console.error('[MessageGrouper] Conversation not found:', conversationId);
          continue;
        }

        // Combine content and handle audio transcription
        const combinedContent = await combineAndTranscribeMessages(
          supabase,
          messages,
          dbMessages,
          ownerSettings,
          lovableApiKey
        );

        console.log(`[MessageGrouper] Combined content for ${phoneNumber}:`, combinedContent.substring(0, 200));

        // Update the last message with combined content if multiple messages
        if (dbMessages.length > 1) {
          await supabase
            .from('messages')
            .update({
              content: combinedContent,
              metadata: {
                ...lastDbMessage.metadata,
                grouped_messages: messageIds,
                message_count: messageIds.length
              }
            })
            .eq('id', lastDbMessage.id);
          
          console.log(`[MessageGrouper] Updated last message with combined content`);
        } else if (dbMessages[0].type === 'audio' && combinedContent !== dbMessages[0].content) {
          // Update single audio message with transcription
          await supabase
            .from('messages')
            .update({ content: combinedContent })
            .eq('id', dbMessages[0].id);
          
          console.log(`[MessageGrouper] Updated audio message with transcription`);
        }

        // If conversation is handled by Nina, queue for AI processing
        if (conversation.status === 'nina') {
          // Check if agent is globally enabled before queuing
          const { data: systemSettings } = await supabase
            .from('system_settings')
            .select('agent_enabled')
            .limit(1)
            .maybeSingle();

          const agentEnabled = systemSettings?.agent_enabled ?? true;

          if (!agentEnabled) {
            console.log('[MessageGrouper] Agent is disabled globally, skipping Nina queue for', phoneNumber);
            processedCount += messages.length;
            continue;
          }

          // Usar upsert com ignoreDuplicates para evitar race condition
          const { data: queueResult, error: ninaQueueError } = await supabase
            .from('nina_processing_queue')
            .upsert({
              message_id: lastDbMessage.id,
              conversation_id: conversationId,
              contact_id: conversation.contact_id,
              priority: 1,
              status: 'pending',
              context_data: {
                phone_number_id: phoneNumberId,
                contact_name: conversation.contacts?.name || conversation.contacts?.call_name,
                message_type: lastDbMessage.type,
                grouped_count: messageIds.length,
                combined_content: combinedContent
              }
            }, {
              onConflict: 'message_id',
              ignoreDuplicates: true
            })
            .select();

          if (ninaQueueError) {
            console.error('[MessageGrouper] Error queuing for Nina:', ninaQueueError);
          } else if (queueResult && queueResult.length > 0) {
            console.log('[MessageGrouper] Message queued for Nina processing');
            
            // Trigger nina-orchestrator
            fetch(`${supabaseUrl}/functions/v1/nina-orchestrator`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseServiceKey}`
              },
              body: JSON.stringify({ triggered_by: 'message-grouper' })
            }).catch(err => console.error('[MessageGrouper] Error triggering nina-orchestrator:', err));
          } else {
            console.log('[MessageGrouper] Duplicate message detected via upsert, skipping');
          }
        }

        processedCount += messages.length;
        console.log(`[MessageGrouper] Group ${phoneNumber} processed successfully`);

      } catch (groupError) {
        console.error(`[MessageGrouper] Error processing group ${phoneNumber}:`, groupError);
      }
    }

    console.log(`[MessageGrouper] Completed. Processed ${processedCount} messages in ${groupCount} groups`);

    // Check if there are more pending messages and schedule re-invocation
    await scheduleNextProcessing(supabase, supabaseUrl, supabaseServiceKey);

    return new Response(JSON.stringify({ 
      processed: processedCount, 
      groups: groupCount 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[MessageGrouper] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Combine content from multiple messages and transcribe audio
async function combineAndTranscribeMessages(
  supabase: any,
  queueMessages: any[],
  dbMessages: any[],
  settings: any,
  lovableApiKey: string
): Promise<string> {
  const contentParts: string[] = [];

  for (let i = 0; i < queueMessages.length; i++) {
    const queueMsg = queueMessages[i];
    const dbMsg = dbMessages.find(m => m.id === queueMsg.message_id);
    const messageData = queueMsg.message_data;
    
    if (!dbMsg) continue;

    let content = dbMsg.content || '';

    // Handle image download and storage
    if (messageData.type === 'image' || messageData.messageType === 'image' || messageData.messageType === 'imageMessage' || messageData.messageType === 'ImageMessage') {
      const imageMediaId = messageData.image?.id || messageData.key?.id;
      const instanceId = queueMsg.instance_id;
      
      if (imageMediaId && instanceId) {
        console.log('[MessageGrouper] Downloading image via Evolution API:', imageMediaId);
        const mediaResult = await downloadEvolutionMedia(supabase, instanceId, imageMediaId, messageData);
        if (mediaResult) {
          const imageUrl = await uploadImageToStorage(supabase, mediaResult.buffer, dbMsg.id, mediaResult.mimetype);
          if (imageUrl) {
            // Update message with public playable URL
            await supabase
              .from('messages')
              .update({ media_url: imageUrl })
              .eq('id', dbMsg.id);
            console.log('[MessageGrouper] Image uploaded and media_url updated:', imageUrl);
          }
        }
      }
      // Keep original content (caption or [Imagem])
      if (content) contentParts.push(content);
      continue;
    }

    // Handle document download, storage, and text extraction
    if (messageData.type === 'document' || messageData.messageType === 'document' || messageData.messageType === 'documentMessage' || messageData.messageType === 'DocumentMessage') {
      const docMediaId = messageData.document?.id || messageData.key?.id;
      const instanceId = queueMsg.instance_id;
      
      if (docMediaId && instanceId) {
        console.log('[MessageGrouper] Downloading document via Evolution API:', docMediaId);
        const mediaResult = await downloadEvolutionMedia(supabase, instanceId, docMediaId, messageData);
        if (mediaResult) {
          // Upload document to storage
          const docUrl = await uploadDocumentToStorage(supabase, mediaResult.buffer, dbMsg.id, mediaResult.mimetype);
          if (docUrl) {
            await supabase
              .from('messages')
              .update({ media_url: docUrl })
              .eq('id', dbMsg.id);
            console.log('[MessageGrouper] Document uploaded and media_url updated:', docUrl);
          }
          
          // Extract text from document using AI (for PDF/text docs)
          if (lovableApiKey && (mediaResult.mimetype.includes('pdf') || mediaResult.mimetype.includes('text'))) {
            const extractedText = await extractDocumentText(mediaResult.buffer, mediaResult.mimetype, lovableApiKey);
            if (extractedText) {
              content = `[Documento enviado] Conteúdo: ${extractedText}`;
              await supabase
                .from('messages')
                .update({ content })
                .eq('id', dbMsg.id);
              console.log('[MessageGrouper] Document text extracted, length:', extractedText.length);
            }
          }
        }
      }
      if (content) contentParts.push(content);
      continue;
    }

    // Handle video download and storage
    if (messageData.type === 'video' || messageData.messageType === 'video' || messageData.messageType === 'videoMessage' || messageData.messageType === 'VideoMessage') {
      const videoMediaId = messageData.video?.id || messageData.key?.id;
      const instanceId = queueMsg.instance_id;
      
      if (videoMediaId && instanceId) {
        console.log('[MessageGrouper] Downloading video via Evolution API:', videoMediaId);
        const mediaResult = await downloadEvolutionMedia(supabase, instanceId, videoMediaId, messageData);
        if (mediaResult) {
          const videoUrl = await uploadVideoToStorage(supabase, mediaResult.buffer, dbMsg.id, mediaResult.mimetype);
          if (videoUrl) {
            await supabase
              .from('messages')
              .update({ media_url: videoUrl })
              .eq('id', dbMsg.id);
            console.log('[MessageGrouper] Video uploaded and media_url updated:', videoUrl);
          }
        }
      }
      if (content) contentParts.push(content);
      continue;
    }

    // Handle audio transcription
    if (messageData.type === 'audio' || messageData.messageType === 'audio' || messageData.messageType === 'audioMessage' || messageData.messageType === 'AudioMessage') {
      const audioMediaId = messageData.audio?.id || messageData.key?.id;
      const instanceId = queueMsg.instance_id;
      
      // Try Evolution API first if instance_id is present
      if (audioMediaId && instanceId && lovableApiKey) {
        console.log('[MessageGrouper] Transcribing audio via Evolution API:', audioMediaId);
        const mediaResult = await downloadEvolutionMedia(supabase, instanceId, audioMediaId, messageData);
        if (mediaResult) {
          // Upload audio to storage for playback
          const audioPlaybackUrl = await uploadAudioToStorage(supabase, mediaResult.buffer, dbMsg.id);
          
          const transcription = await transcribeAudio(mediaResult.buffer, lovableApiKey);
          if (transcription) {
            content = transcription;
            // Update the message in database with transcription and playable URL
            await supabase
              .from('messages')
              .update({ 
                content: transcription,
                ...(audioPlaybackUrl ? { media_url: audioPlaybackUrl } : {})
              })
              .eq('id', dbMsg.id);
          } else if (audioPlaybackUrl) {
            // Even if transcription fails, update the playable URL
            await supabase
              .from('messages')
              .update({ media_url: audioPlaybackUrl })
              .eq('id', dbMsg.id);
          }
        }
      }
      // Fall back to WhatsApp Official API if Evolution API failed or no instance_id
      else if (audioMediaId && settings?.whatsapp_access_token && lovableApiKey) {
        console.log('[MessageGrouper] Transcribing audio via WhatsApp Official API:', audioMediaId);
        const audioBuffer = await downloadWhatsAppMedia(settings, audioMediaId);
        if (audioBuffer) {
          const transcription = await transcribeAudio(audioBuffer, lovableApiKey);
          if (transcription) {
            content = transcription;
            // Update the message in database with transcription
            await supabase
              .from('messages')
              .update({ content: transcription })
              .eq('id', dbMsg.id);
          }
        }
      }
    }

    if (content && content !== '[áudio - processando transcrição...]' && content !== '[Áudio]') {
      contentParts.push(content);
    }
  }

  return contentParts.join('\n');
}

// Download media from WhatsApp API
async function downloadWhatsAppMedia(settings: any, mediaId: string): Promise<ArrayBuffer | null> {
  if (!settings?.whatsapp_access_token) {
    console.error('[MessageGrouper] No WhatsApp access token configured');
    return null;
  }

  try {
    const mediaInfoResponse = await fetch(
      `https://graph.facebook.com/v18.0/${mediaId}`,
      {
        headers: {
          'Authorization': `Bearer ${settings.whatsapp_access_token}`
        }
      }
    );

    if (!mediaInfoResponse.ok) {
      console.error('[MessageGrouper] Failed to get media info:', await mediaInfoResponse.text());
      return null;
    }

    const mediaInfo = await mediaInfoResponse.json();
    const mediaUrl = mediaInfo.url;

    if (!mediaUrl) {
      console.error('[MessageGrouper] No media URL in response');
      return null;
    }

    const mediaResponse = await fetch(mediaUrl, {
      headers: {
        'Authorization': `Bearer ${settings.whatsapp_access_token}`
      }
    });

    if (!mediaResponse.ok) {
      console.error('[MessageGrouper] Failed to download media:', await mediaResponse.text());
      return null;
    }

    return await mediaResponse.arrayBuffer();
  } catch (error) {
    console.error('[MessageGrouper] Error downloading media:', error);
    return null;
  }
}

// Download media from uazapi instance
async function downloadEvolutionMedia(
  supabase: any, 
  instanceId: string, 
  mediaId: string,
  messageData: any
): Promise<{ buffer: ArrayBuffer; mimetype: string } | null> {
  try {
    console.log(`[MessageGrouper] Downloading uazapi media for instance ${instanceId}, mediaId: ${mediaId}`);
    
    // Get instance secrets
    const { data: secrets } = await supabase
      .from('whatsapp_instance_secrets')
      .select('base_url, token, instance_token')
      .eq('instance_id', instanceId)
      .single();

    if (!secrets) {
      console.error('[MessageGrouper] uazapi secrets not found for instance:', instanceId);
      return null;
    }

    const baseUrl = secrets.base_url.replace(/\/$/, '');
    const instanceToken = secrets.instance_token || secrets.token;

    // Try multiple uazapi endpoints for media download
    // Endpoint correto da uazapi: POST /message/download com { id: messageId }
    const endpoints = [
      {
        url: `${baseUrl}/message/download`,
        body: JSON.stringify({ id: mediaId }),
      },
      {
        url: `${baseUrl}/chat/downloadMediaMessage`,
        body: JSON.stringify({ messageid: mediaId }),
      },
    ];

    for (const endpoint of endpoints) {
      try {
        console.log(`[MessageGrouper] Trying endpoint: ${endpoint.url} with payload: ${endpoint.body}`);
        const response = await fetch(endpoint.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'token': instanceToken,
          },
          body: endpoint.body
        });

        console.log(`[MessageGrouper] Endpoint ${endpoint.url} responded: status=${response.status}, content-type=${response.headers.get('content-type')}`);

        if (!response.ok) {
          const errText = await response.text();
          console.log(`[MessageGrouper] Endpoint ${endpoint.url} failed: ${response.status} body=${errText.substring(0, 500)}`);
          continue;
        }

        const contentType = response.headers.get('content-type') || '';
        
        // If response is binary (not JSON), use it directly
        if (!contentType.includes('application/json')) {
          const buffer = await response.arrayBuffer();
          if (buffer.byteLength > 0) {
            const mimetype = contentType || guessMimeType(messageData);
            console.log('[MessageGrouper] uazapi media downloaded as binary, size:', buffer.byteLength, 'mimetype:', mimetype);
            return { buffer, mimetype };
          }
          continue;
        }

        // JSON response - expect base64
        const resultRaw = await response.text();
        let result: any;
        let base64Data = '';
        
        // Handle case where response is a raw base64 string (not JSON)
        try {
          result = JSON.parse(resultRaw);
        } catch {
          // Not JSON — treat entire response as base64 if long enough
          if (resultRaw.length > 100) {
            console.log('[MessageGrouper] Response is raw string, treating as base64, length:', resultRaw.length);
            base64Data = resultRaw;
          }
        }

        if (!base64Data && result) {
          console.log('[MessageGrouper] Response keys:', Object.keys(result));
          
          // Handle fileURL response — uazapi returns { cached, fileURL, mimetype }
          if (result.fileURL && typeof result.fileURL === 'string') {
            console.log('[MessageGrouper] Found fileURL, downloading from:', result.fileURL.substring(0, 100));
            try {
              const fileResponse = await fetch(result.fileURL);
              if (fileResponse.ok) {
                const buffer = await fileResponse.arrayBuffer();
                const mimetype = result.mimetype || result.mimeType || fileResponse.headers.get('content-type') || guessMimeType(messageData);
                const normalizedMime = mimetype.split(';')[0].trim();
                console.log('[MessageGrouper] Downloaded from fileURL, size:', buffer.byteLength, 'mimetype:', normalizedMime);
                return { buffer, mimetype: normalizedMime };
              } else {
                console.log('[MessageGrouper] fileURL download failed:', fileResponse.status);
              }
            } catch (fileErr) {
              console.log('[MessageGrouper] fileURL download error:', fileErr);
            }
          }
          
          // Try all known field names from different uazapi versions
          const base64Raw = result.base64 
            || result.base64Data 
            || result.data 
            || result.media 
            || result.mediaData 
            || result.file 
            || result.content 
            || result.result
            || result.body;
          
          if (base64Raw && typeof base64Raw === 'string') {
            base64Data = base64Raw;
          }
          
          // Fallback: pick first string value longer than 500 chars that looks like base64
          if (!base64Data) {
            const possibleField = Object.values(result).find(
              (v: any) => typeof v === 'string' && (v as string).length > 500 && !/^https?:\/\//.test(v as string)
            ) as string | undefined;
            if (possibleField) {
              console.log('[MessageGrouper] Found base64 in unknown field via fallback');
              base64Data = possibleField;
            }
          }
        }

        if (!base64Data) {
          console.log('[MessageGrouper] No base64 found in response, trying next endpoint');
          continue;
        }

        let resultObj = result || {};
        let mimetype = resultObj.mimetype || resultObj.mimeType || resultObj.contentType || guessMimeType(messageData);
        
        let base64DataClean = base64Data.replace(/\s/g, '');
        
        if (base64DataClean.startsWith('data:')) {
          const match = base64DataClean.match(/^data:([^;]+);base64,(.+)$/);
          if (match) {
            mimetype = match[1];
            base64DataClean = match[2];
          }
        }

        if (!base64DataClean) continue;

        const binaryString = atob(base64DataClean);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        console.log('[MessageGrouper] uazapi media downloaded via base64, size:', bytes.length, 'bytes, mimetype:', mimetype);
        return { buffer: bytes.buffer, mimetype };
      } catch (endpointError) {
        console.log(`[MessageGrouper] Endpoint error:`, endpointError);
        continue;
      }
    }

    console.error('[MessageGrouper] All uazapi media download endpoints failed for mediaId:', mediaId);
    return null;
  } catch (error) {
    console.error('[MessageGrouper] Error downloading uazapi media:', error);
    return null;
  }
}

// Guess mimetype from message data
function guessMimeType(messageData: any): string {
  const type = messageData.type || messageData.messageType || '';
  if (type.includes('image')) return 'image/jpeg';
  if (type.includes('audio')) return 'audio/ogg';
  if (type.includes('video')) return 'video/mp4';
  if (type.includes('document')) return messageData.document?.mimetype || 'application/pdf';
  return 'application/octet-stream';
}

// Transcribe audio using Lovable AI Gateway (Gemini with audio input)
async function transcribeAudio(audioBuffer: ArrayBuffer, lovableApiKey: string): Promise<string | null> {
  try {
    console.log('[MessageGrouper] Transcribing audio via Gemini, size:', audioBuffer.byteLength, 'bytes');

    // Convert audio to base64
    const uint8Array = new Uint8Array(audioBuffer);
    let binaryStr = '';
    for (let i = 0; i < uint8Array.length; i++) {
      binaryStr += String.fromCharCode(uint8Array[i]);
    }
    const base64Audio = btoa(binaryStr);

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
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Transcreva este áudio em português brasileiro. Retorne APENAS o texto transcrito, sem nenhum comentário, formatação ou explicação adicional.'
              },
              {
                type: 'input_audio',
                input_audio: {
                  data: base64Audio,
                  format: 'ogg'
                }
              }
            ]
          }
        ],
        max_tokens: 2000,
        temperature: 0
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[MessageGrouper] Transcription error:', response.status, errorText);
      return null;
    }

    const result = await response.json();
    const transcription = result.choices?.[0]?.message?.content?.trim();
    
    console.log('[MessageGrouper] Transcription result:', transcription);
    return transcription || null;
  } catch (error) {
    console.error('[MessageGrouper] Error transcribing audio:', error);
    return null;
  }
}

// Upload audio to Supabase Storage for playback
async function uploadAudioToStorage(
  supabase: any,
  audioBuffer: ArrayBuffer,
  messageId: string
): Promise<string | null> {
  try {
    const fileName = `audio/${messageId}-${Date.now()}.ogg`;
    
    const { data, error } = await supabase.storage
      .from('whatsapp-media')
      .upload(fileName, audioBuffer, {
        contentType: 'audio/ogg',
        upsert: true
      });

    if (error) {
      console.error('[MessageGrouper] Error uploading audio:', JSON.stringify(error));
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('whatsapp-media')
      .getPublicUrl(fileName);

    console.log('[MessageGrouper] Audio uploaded for playback:', urlData.publicUrl);
    return urlData.publicUrl;
  } catch (error) {
    console.error('[MessageGrouper] Error uploading audio to storage:', error);
    return null;
  }
}

// Upload image to Supabase Storage for display and AI vision
async function uploadImageToStorage(
  supabase: any,
  imageBuffer: ArrayBuffer,
  messageId: string,
  mimeType: string = 'image/jpeg'
): Promise<string | null> {
  try {
    const normalizedMime = mimeType.split(';')[0].trim();
    const ext = normalizedMime.includes('png') ? 'png' : normalizedMime.includes('webp') ? 'webp' : 'jpg';
    const fileName = `images/${messageId}-${Date.now()}.${ext}`;
    
    const { data, error } = await supabase.storage
      .from('whatsapp-media')
      .upload(fileName, imageBuffer, {
        contentType: normalizedMime,
        upsert: true
      });

    if (error) {
      console.error('[MessageGrouper] Error uploading image:', JSON.stringify(error));
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('whatsapp-media')
      .getPublicUrl(fileName);

    console.log('[MessageGrouper] Image uploaded:', urlData.publicUrl);
    return urlData.publicUrl;
  } catch (error) {
    console.error('[MessageGrouper] Error uploading image to storage:', error);
    return null;
  }
}

// Upload document to Supabase Storage
async function uploadDocumentToStorage(
  supabase: any,
  docBuffer: ArrayBuffer,
  messageId: string,
  mimeType: string = 'application/pdf'
): Promise<string | null> {
  try {
    const normalizedMime = mimeType.split(';')[0].trim();
    const ext = normalizedMime.includes('pdf') ? 'pdf' 
      : normalizedMime.includes('word') || normalizedMime.includes('docx') ? 'docx'
      : normalizedMime.includes('spreadsheet') || normalizedMime.includes('xlsx') ? 'xlsx'
      : normalizedMime.includes('text') ? 'txt'
      : 'bin';
    const fileName = `documents/${messageId}-${Date.now()}.${ext}`;
    
    const { data, error } = await supabase.storage
      .from('whatsapp-media')
      .upload(fileName, docBuffer, {
        contentType: normalizedMime,
        upsert: true
      });

    if (error) {
      console.error('[MessageGrouper] Error uploading document:', JSON.stringify(error));
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('whatsapp-media')
      .getPublicUrl(fileName);

    console.log('[MessageGrouper] Document uploaded:', urlData.publicUrl);
    return urlData.publicUrl;
  } catch (error) {
    console.error('[MessageGrouper] Error uploading document to storage:', error);
    return null;
  }
}

// Upload video to Supabase Storage
async function uploadVideoToStorage(
  supabase: any,
  videoBuffer: ArrayBuffer,
  messageId: string,
  mimeType: string = 'video/mp4'
): Promise<string | null> {
  try {
    const normalizedMime = mimeType.split(';')[0].trim();
    const ext = normalizedMime.includes('mp4') ? 'mp4' : normalizedMime.includes('webm') ? 'webm' : 'mp4';
    const fileName = `videos/${messageId}-${Date.now()}.${ext}`;
    
    const { data, error } = await supabase.storage
      .from('whatsapp-media')
      .upload(fileName, videoBuffer, {
        contentType: normalizedMime,
        upsert: true
      });

    if (error) {
      console.error('[MessageGrouper] Error uploading video:', JSON.stringify(error));
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('whatsapp-media')
      .getPublicUrl(fileName);

    console.log('[MessageGrouper] Video uploaded:', urlData.publicUrl);
    return urlData.publicUrl;
  } catch (error) {
    console.error('[MessageGrouper] Error uploading video to storage:', error);
    return null;
  }
}

// Extract text from document using Lovable AI (Gemini)
async function extractDocumentText(
  docBuffer: ArrayBuffer,
  mimeType: string,
  lovableApiKey: string
): Promise<string | null> {
  try {
    console.log('[MessageGrouper] Extracting text from document, type:', mimeType, 'size:', docBuffer.byteLength);

    // Convert to base64
    const uint8Array = new Uint8Array(docBuffer);
    let binaryStr = '';
    for (let i = 0; i < uint8Array.length; i++) {
      binaryStr += String.fromCharCode(uint8Array[i]);
    }
    const base64Doc = btoa(binaryStr);

    // Use Gemini's document understanding via inline_data
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
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extraia e resuma o conteúdo deste documento em português brasileiro. Retorne um resumo conciso do conteúdo principal, máximo 500 palavras. Se for uma imagem dentro do PDF, descreva o que vê.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${base64Doc}`
                }
              }
            ]
          }
        ],
        max_tokens: 1000,
        temperature: 0.1
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[MessageGrouper] Document extraction error:', response.status, errorText);
      return null;
    }

    const result = await response.json();
    const extractedText = result.choices?.[0]?.message?.content?.trim();
    
    console.log('[MessageGrouper] Document text extracted:', extractedText?.substring(0, 200));
    return extractedText || null;
  } catch (error) {
    console.error('[MessageGrouper] Error extracting document text:', error);
    return null;
  }
}

// Schedule next processing if there are pending messages with future process_after
async function scheduleNextProcessing(
  supabase: any,
  supabaseUrl: string,
  supabaseServiceKey: string
): Promise<void> {
  try {
    // Check for pending messages with future process_after
    const { data: pendingMessages, error } = await supabase
      .from('message_grouping_queue')
      .select('id, process_after')
      .eq('processed', false)
      .gt('process_after', new Date().toISOString())
      .order('process_after', { ascending: true })
      .limit(1);

    if (error) {
      console.error('[MessageGrouper] Error checking pending messages:', error);
      return;
    }

    if (!pendingMessages || pendingMessages.length === 0) {
      console.log('[MessageGrouper] No pending messages to schedule');
      return;
    }

    const nextProcessAt = new Date(pendingMessages[0].process_after);
    const now = Date.now();
    const delayMs = Math.max(nextProcessAt.getTime() - now + 500, 1000); // +500ms buffer, min 1s
    
    // Cap delay at 30 seconds to prevent edge function timeout issues
    const cappedDelayMs = Math.min(delayMs, 30000);

    console.log(`[MessageGrouper] Scheduling self-invocation in ${cappedDelayMs}ms for pending message ${pendingMessages[0].id}`);

    // Use EdgeRuntime.waitUntil for background task
    (globalThis as any).EdgeRuntime?.waitUntil?.(
      new Promise<void>((resolve) => {
        setTimeout(async () => {
          try {
            console.log('[MessageGrouper] Self-invoking after scheduled delay');
            await fetch(`${supabaseUrl}/functions/v1/message-grouper`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseServiceKey}`
              },
              body: JSON.stringify({ triggered_by: 'self-reschedule' })
            });
            console.log('[MessageGrouper] Self-invocation completed');
          } catch (err) {
            console.error('[MessageGrouper] Self-reschedule error:', err);
          }
          resolve();
        }, cappedDelayMs);
      })
    );
  } catch (error) {
    console.error('[MessageGrouper] Error scheduling next processing:', error);
  }
}
