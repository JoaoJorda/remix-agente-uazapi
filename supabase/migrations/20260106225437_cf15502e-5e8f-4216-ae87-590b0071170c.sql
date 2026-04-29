-- Reset imediato: itens travados em processing por mais de 2 minutos voltam para pending
UPDATE public.nina_processing_queue 
SET status = 'pending', 
    updated_at = now(),
    scheduled_for = now(),
    retry_count = retry_count + 1
WHERE status = 'processing' 
  AND updated_at < now() - interval '2 minutes';

-- Reset específico para o lead 555196638931 (conversation 05954296-9fbd-4997-8e7e-b83eb6daca14)
UPDATE public.nina_processing_queue 
SET status = 'pending', 
    updated_at = now(),
    scheduled_for = now()
WHERE conversation_id = '05954296-9fbd-4997-8e7e-b83eb6daca14'
  AND status = 'processing';

-- Atualizar função para ser mais agressiva na recuperação (2 min em vez de 5)
CREATE OR REPLACE FUNCTION public.claim_nina_processing_batch(p_limit integer DEFAULT 50)
 RETURNS SETOF nina_processing_queue
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
    -- Recuperar itens órfãos que estão em "processing" há mais de 2 minutos
    UPDATE public.nina_processing_queue
    SET status = 'pending', 
        updated_at = now(),
        scheduled_for = now(),
        retry_count = retry_count + 1
    WHERE status = 'processing'
      AND updated_at < now() - interval '2 minutes';

    -- Claim batch de itens pendentes
    RETURN QUERY
    WITH cte AS (
        SELECT id
        FROM public.nina_processing_queue
        WHERE status = 'pending'
          AND (scheduled_for IS NULL OR scheduled_for <= now())
        ORDER BY priority DESC, scheduled_for ASC NULLS FIRST, created_at ASC
        FOR UPDATE SKIP LOCKED
        LIMIT p_limit
    )
    UPDATE public.nina_processing_queue n
    SET status = 'processing', updated_at = now()
    WHERE n.id IN (SELECT id FROM cte)
    RETURNING n.*;
END;
$function$;