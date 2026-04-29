-- 1. Resetar itens travados em processing por mais de 5 minutos
UPDATE public.nina_processing_queue 
SET status = 'pending', 
    updated_at = now(),
    scheduled_for = now(),
    retry_count = retry_count + 1
WHERE status = 'processing' 
  AND updated_at < now() - interval '5 minutes';

-- 2. Atualizar função claim_nina_processing_batch para incluir recuperação automática
CREATE OR REPLACE FUNCTION public.claim_nina_processing_batch(p_limit integer DEFAULT 50)
 RETURNS SETOF nina_processing_queue
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
    -- Recuperar itens órfãos que estão em "processing" há mais de 5 minutos
    UPDATE public.nina_processing_queue
    SET status = 'pending', 
        updated_at = now(),
        scheduled_for = now(),
        retry_count = retry_count + 1
    WHERE status = 'processing'
      AND updated_at < now() - interval '5 minutes';

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