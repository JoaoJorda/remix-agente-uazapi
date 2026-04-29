
CREATE OR REPLACE FUNCTION public.match_knowledge_chunks(
  query_embedding vector(384),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  file_id UUID,
  content TEXT,
  chunk_index INT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public, extensions'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kc.id,
    kc.file_id,
    kc.content,
    kc.chunk_index,
    kc.metadata,
    (1 - (kc.embedding <=> query_embedding))::FLOAT AS similarity
  FROM public.knowledge_chunks kc
  WHERE (1 - (kc.embedding <=> query_embedding))::FLOAT > match_threshold
  ORDER BY kc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
