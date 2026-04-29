import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Chunk text into segments of ~500 chars with 30 char overlap
function chunkText(text: string, chunkSize = 500, overlap = 30): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = start + chunkSize;

    if (end < text.length) {
      const lastNewline = text.lastIndexOf('\n', end);
      const lastPeriod = text.lastIndexOf('. ', end);
      
      if (lastNewline > start + chunkSize * 0.5) {
        end = lastNewline + 1;
      } else if (lastPeriod > start + chunkSize * 0.5) {
        end = lastPeriod + 2;
      }
    }

    const chunk = text.slice(start, end).trim();
    if (chunk.length > 0) {
      chunks.push(chunk);
    }

    start = end - overlap;
    if (start >= text.length) break;
  }

  return chunks;
}

const BATCH_SIZE = 1; // Process only 1 chunk per invocation to avoid CPU limits

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { file_id, content, batch_start = 0 } = await req.json();

    if (!file_id || !content) {
      return new Response(JSON.stringify({ error: 'file_id and content are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Chunk the content
    const chunks = chunkText(content);
    const totalChunks = chunks.length;
    const batchEnd = Math.min(batch_start + BATCH_SIZE, totalChunks);
    const batchChunks = chunks.slice(batch_start, batchEnd);

    console.log(`[Embeddings] File ${file_id}: processing chunks ${batch_start}-${batchEnd - 1} of ${totalChunks}`);

    // On first batch, update status and clear old chunks
    if (batch_start === 0) {
      await supabase
        .from('knowledge_files')
        .update({ status: 'processing' })
        .eq('id', file_id);

      await supabase
        .from('knowledge_chunks')
        .delete()
        .eq('file_id', file_id);
    }

    // Generate embeddings
    const session = new Supabase.ai.Session("gte-small");
    let successCount = 0;

    for (let i = 0; i < batchChunks.length; i++) {
      try {
        const embedding = await session.run(batchChunks[i], { mean_pool: true, normalize: true });
        const embeddingArray = Array.from(embedding as Float32Array);

        const { error } = await supabase
          .from('knowledge_chunks')
          .insert({
            file_id,
            content: batchChunks[i],
            embedding: embeddingArray,
            chunk_index: batch_start + i,
            metadata: { char_count: batchChunks[i].length }
          });

        if (error) {
          console.error(`[Embeddings] Error inserting chunk ${batch_start + i}:`, error);
        } else {
          successCount++;
        }
      } catch (chunkError) {
        console.error(`[Embeddings] Error processing chunk ${batch_start + i}:`, chunkError);
      }
    }

    const hasMore = batchEnd < totalChunks;

    // If no more batches, finalize
    if (!hasMore) {
      // Count total chunks stored
      const { count } = await supabase
        .from('knowledge_chunks')
        .select('*', { count: 'exact', head: true })
        .eq('file_id', file_id);

      const totalStored = count || 0;
      const finalStatus = totalStored > 0 ? 'ready' : 'error';

      await supabase
        .from('knowledge_files')
        .update({
          status: finalStatus,
          chunk_count: totalStored,
          error_message: totalStored === 0 ? 'Failed to generate embeddings' : null
        })
        .eq('id', file_id);

      console.log(`[Embeddings] Done. ${totalStored}/${totalChunks} chunks stored`);
    } else {
      console.log(`[Embeddings] Batch done. ${successCount} chunks processed this batch. More batches needed.`);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      chunks_total: totalChunks,
      chunks_processed_this_batch: successCount,
      next_batch_start: hasMore ? batchEnd : null,
      has_more: hasMore
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[Embeddings] Error:', error);
    
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
