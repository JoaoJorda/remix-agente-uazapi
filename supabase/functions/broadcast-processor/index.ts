import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Safety margin – edge functions time out at 25s
const MAX_EXECUTION_MS = 20000;

serve(async (req) => {
  console.log(`[broadcast-processor] Received ${req.method} request`);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { campaign_id } = await req.json();

    if (!campaign_id) {
      throw new Error('campaign_id is required');
    }

    console.log(`[broadcast-processor] Processing campaign: ${campaign_id}`);

    // Fetch campaign
    const { data: campaign, error: campaignError } = await supabase
      .from('broadcast_campaigns')
      .select('*')
      .eq('id', campaign_id)
      .single();

    if (campaignError || !campaign) {
      throw new Error(`Campaign not found: ${campaignError?.message}`);
    }

    // Check if campaign should be processed
    if (campaign.status === 'paused' || campaign.status === 'completed' || campaign.status === 'failed') {
      console.log(`[broadcast-processor] Campaign status is ${campaign.status}, skipping`);
      return new Response(JSON.stringify({
        success: true,
        message: `Campaign is ${campaign.status}`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ── Batch scheduling: check if we're in a between-batch pause ──
    if (campaign.next_batch_at) {
      const nextBatchAt = new Date(campaign.next_batch_at).getTime();
      const now = Date.now();

      if (nextBatchAt > now) {
        const waitMs = nextBatchAt - now;
        console.log(`[broadcast-processor] Batch pause – waiting ${Math.round(waitMs / 1000)}s until next batch`);

        // Re-invoke after the remaining wait time (cap at 23s so we stay within limits)
        const invokeDelayMs = Math.min(waitMs, 23000);
        await sleep(invokeDelayMs);

        // After sleeping, re-invoke self to actually process the next batch
        supabase.functions.invoke('broadcast-processor', {
          body: { campaign_id }
        }).catch(err => console.error('[broadcast-processor] Re-invoke error:', err));

        return new Response(JSON.stringify({
          success: true,
          message: 'Waiting for next batch',
          next_batch_at: campaign.next_batch_at,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Clear next_batch_at since it's now time to proceed
      await supabase
        .from('broadcast_campaigns')
        .update({ next_batch_at: null })
        .eq('id', campaign_id);
    }

    // Update status to processing if still draft
    if (campaign.status === 'draft') {
      await supabase
        .from('broadcast_campaigns')
        .update({ status: 'processing', started_at: new Date().toISOString() })
        .eq('id', campaign_id);
    }

    // ── Extract batch configuration (with defaults) ──
    const batchSize: number = campaign.batch_size || 10;
    const delayMinMs: number = campaign.delay_min_ms || 5000;
    const delayMaxMs: number = campaign.delay_max_ms || 15000;
    const delayBetweenBatchesMs: number = (campaign.delay_between_batches || 300) * 1000;

    console.log(`[broadcast-processor] Config – batchSize: ${batchSize}, delay: ${delayMinMs}-${delayMaxMs}ms, batchPause: ${delayBetweenBatchesMs}ms`);

    // Fetch ONE batch of pending recipients
    const { data: recipients, error: recipientsError } = await supabase
      .from('broadcast_recipients')
      .select('*')
      .eq('campaign_id', campaign_id)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(batchSize);

    if (recipientsError) {
      throw new Error(`Failed to fetch recipients: ${recipientsError.message}`);
    }

    if (!recipients || recipients.length === 0) {
      // No more pending recipients – mark campaign as completed
      await supabase
        .from('broadcast_campaigns')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', campaign_id);

      console.log(`[broadcast-processor] Campaign ${campaign_id} completed!`);
      return new Response(JSON.stringify({
        success: true,
        message: 'Campaign completed',
        processed: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`[broadcast-processor] Processing batch of ${recipients.length} recipients`);

    const startTime = Date.now();
    let processedCount = 0;
    let sentCount = 0;
    let failedCount = 0;

    for (const recipient of recipients) {
      // Safety: stop if approaching edge function timeout
      if (Date.now() - startTime > MAX_EXECUTION_MS) {
        console.log(`[broadcast-processor] Time limit approaching, processed ${processedCount}/${recipients.length} in this batch`);
        break;
      }

      // Check if campaign was paused externally every 5 messages
      if (processedCount > 0 && processedCount % 5 === 0) {
        const { data: currentCampaign } = await supabase
          .from('broadcast_campaigns')
          .select('status')
          .eq('id', campaign_id)
          .single();

        if (currentCampaign?.status === 'paused') {
          console.log(`[broadcast-processor] Campaign paused externally, stopping batch`);
          break;
        }
      }

      try {
        // Apply template variables
        const messageContent = applyTemplate(campaign.message_template, recipient.variables || {});

        // Send via uazapi (normalize phone before sending as safety net)
        const normalizedPhone = normalizeBrazilianPhone(recipient.phone_number) ?? recipient.phone_number.replace(/\D/g, '');
        const { data: sendResult, error: sendError } = await supabase.functions.invoke('send-uazapi-message', {
          body: {
            instance_id: campaign.instance_id,
            phone_number: normalizedPhone,
            content: messageContent,
            message_type: campaign.message_type || 'text',
            media_url: campaign.media_url || undefined,
          }
        });

        if (sendError) throw new Error(sendError.message || 'Send function error');
        if (!sendResult?.success) throw new Error(sendResult?.error || 'Send failed');

        await supabase
          .from('broadcast_recipients')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('id', recipient.id);

        sentCount++;
        console.log(`[broadcast-processor] ✓ Sent to ${recipient.phone_number}`);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[broadcast-processor] ✗ Failed for ${recipient.phone_number}: ${errorMessage}`);

        await supabase
          .from('broadcast_recipients')
          .update({ status: 'failed', error_message: errorMessage })
          .eq('id', recipient.id);

        failedCount++;
      }

      processedCount++;

      // ── Random delay between messages (within a batch) ──
      if (processedCount < recipients.length) {
        const delayMs = getRandomDelay(delayMinMs, delayMaxMs);
        console.log(`[broadcast-processor] Waiting ${delayMs}ms before next message`);
        await sleep(delayMs);
      }
    }

    // Update campaign counters
    await supabase
      .from('broadcast_campaigns')
      .update({
        sent_count: (campaign.sent_count || 0) + sentCount,
        failed_count: (campaign.failed_count || 0) + failedCount,
      })
      .eq('id', campaign_id);

    // Check if there are more pending recipients after this batch
    const { count: remainingCount } = await supabase
      .from('broadcast_recipients')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', campaign_id)
      .eq('status', 'pending');

    const hasMore = (remainingCount || 0) > 0;

    if (hasMore) {
      // Re-check status before scheduling next batch
      const { data: latestCampaign } = await supabase
        .from('broadcast_campaigns')
        .select('status')
        .eq('id', campaign_id)
        .single();

      if (latestCampaign?.status === 'processing') {
        // ── Schedule next batch after the configured pause ──
        const nextBatchAt = new Date(Date.now() + delayBetweenBatchesMs).toISOString();

        await supabase
          .from('broadcast_campaigns')
          .update({ next_batch_at: nextBatchAt })
          .eq('id', campaign_id);

        console.log(`[broadcast-processor] Batch done. Next batch scheduled at ${nextBatchAt} (pause: ${delayBetweenBatchesMs / 1000}s, remaining: ${remainingCount})`);

        // Fire re-invoke – it will sleep until next_batch_at
        supabase.functions.invoke('broadcast-processor', {
          body: { campaign_id }
        }).catch(err => console.error('[broadcast-processor] Re-invoke error:', err));
      }
    } else {
      // All done!
      await supabase
        .from('broadcast_campaigns')
        .update({ status: 'completed', completed_at: new Date().toISOString(), next_batch_at: null })
        .eq('id', campaign_id);

      console.log(`[broadcast-processor] Campaign ${campaign_id} fully completed!`);
    }

    return new Response(JSON.stringify({
      success: true,
      processed: processedCount,
      sent: sentCount,
      failed: failedCount,
      remaining: remainingCount || 0,
      hasMore,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[broadcast-processor] Fatal error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';

    return new Response(JSON.stringify({
      success: false,
      error: message,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

/** Normalizes Brazilian phone numbers to E.164 without '+' (e.g. "5511999998888") */
function normalizeBrazilianPhone(raw: string): string | null {
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('55') && digits.length > 11) {
    digits = digits.slice(2);
  }
  if (digits.length < 10 || digits.length > 11) return null;
  if (digits.length === 10) {
    const firstDigit = parseInt(digits[2], 10);
    if (firstDigit >= 6) digits = digits.slice(0, 2) + '9' + digits.slice(2);
  }
  return '55' + digits;
}

/** Replace {{variable}} placeholders with actual values */
function applyTemplate(template: string, variables: Record<string, any>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = variables[key];
    return value !== undefined && value !== null ? String(value) : match;
  });
}

/** Get a random delay between min and max ms */
function getRandomDelay(minMs: number, maxMs: number): number {
  return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
}

/** Sleep helper */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
