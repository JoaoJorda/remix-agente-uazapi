import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log('[reprocess-media] Starting reprocessing of stuck media messages...');

    // Find messages with media type but no valid media_url
    const { data: stuckMessages, error } = await supabase
      .from('messages')
      .select('id, type, conversation_id, whatsapp_message_id, media_url')
      .in('type', ['image', 'audio', 'video', 'document'])
      .or('media_url.is.null,media_url.like./o1/%,media_url.like./v/%')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('[reprocess-media] Error fetching stuck messages:', error);
      throw error;
    }

    console.log(`[reprocess-media] Found ${stuckMessages?.length || 0} stuck media messages`);

    if (!stuckMessages || stuckMessages.length === 0) {
      return new Response(JSON.stringify({ requeued: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Reset their queue entries to unprocessed
    const messageIds = stuckMessages.map(m => m.id);
    
    const { data: queueEntries, error: queueError } = await supabase
      .from('message_grouping_queue')
      .update({ 
        processed: false, 
        process_after: new Date().toISOString() 
      })
      .in('message_id', messageIds)
      .select('id');

    const requeuedCount = queueEntries?.length || 0;
    console.log(`[reprocess-media] Requeued ${requeuedCount} queue entries`);

    // Trigger message-grouper
    if (requeuedCount > 0) {
      await fetch(`${supabaseUrl}/functions/v1/message-grouper`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({ trigger: 'reprocess-media' }),
      });
      console.log('[reprocess-media] Triggered message-grouper');
    }

    return new Response(JSON.stringify({ 
      stuck: stuckMessages.length,
      requeued: requeuedCount,
      messageIds 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    console.error('[reprocess-media] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
