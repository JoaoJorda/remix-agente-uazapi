-- Adicionar campo para controle de participação no round-robin
ALTER TABLE public.team_members 
ADD COLUMN IF NOT EXISTS receives_meetings boolean DEFAULT false;

-- Adicionar campo de telefone do membro
ALTER TABLE public.team_members 
ADD COLUMN IF NOT EXISTS phone text;

-- Criar tabela de controle do estado do round-robin
CREATE TABLE IF NOT EXISTS public.round_robin_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  function_id uuid NOT NULL REFERENCES team_functions(id) ON DELETE CASCADE,
  last_assigned_member_id uuid REFERENCES team_members(id) ON DELETE SET NULL,
  last_assigned_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(function_id)
);

-- Trigger para updated_at
CREATE TRIGGER update_round_robin_state_updated_at
BEFORE UPDATE ON public.round_robin_state
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- RLS para a nova tabela
ALTER TABLE public.round_robin_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on round_robin_state" 
ON public.round_robin_state FOR ALL 
USING (true) WITH CHECK (true);

-- Adicionar campos no appointments para o closer atribuído
ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS assigned_closer_id uuid REFERENCES team_members(id),
ADD COLUMN IF NOT EXISTS assigned_closer_name text,
ADD COLUMN IF NOT EXISTS assigned_closer_email text,
ADD COLUMN IF NOT EXISTS assigned_closer_phone text;

-- Função de round-robin para buscar próximo closer
CREATE OR REPLACE FUNCTION public.get_next_closer()
RETURNS TABLE(
  member_id uuid,
  member_name text,
  member_email text,
  member_phone text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  closer_function_id uuid;
  last_member_id uuid;
  next_member RECORD;
BEGIN
  -- Buscar ID da função "Closer" (case insensitive)
  SELECT id INTO closer_function_id 
  FROM team_functions 
  WHERE LOWER(name) = 'closer' AND is_active = true 
  LIMIT 1;
  
  IF closer_function_id IS NULL THEN
    RAISE NOTICE 'No Closer function found';
    RETURN;
  END IF;
  
  -- Buscar último membro atribuído
  SELECT last_assigned_member_id INTO last_member_id
  FROM round_robin_state
  WHERE function_id = closer_function_id;
  
  -- Buscar próximo membro elegível (round-robin por ordem de criação)
  SELECT tm.id, tm.name, tm.email, tm.phone INTO next_member
  FROM team_members tm
  WHERE tm.function_id = closer_function_id
    AND tm.status = 'active'
    AND tm.receives_meetings = true
    AND (last_member_id IS NULL OR tm.created_at > (
      SELECT created_at FROM team_members WHERE id = last_member_id
    ))
  ORDER BY tm.created_at ASC
  LIMIT 1;
  
  -- Se não encontrou (fim da lista), voltar ao início
  IF next_member.id IS NULL THEN
    SELECT tm.id, tm.name, tm.email, tm.phone INTO next_member
    FROM team_members tm
    WHERE tm.function_id = closer_function_id
      AND tm.status = 'active'
      AND tm.receives_meetings = true
    ORDER BY tm.created_at ASC
    LIMIT 1;
  END IF;
  
  -- Se ainda não encontrou nenhum, retornar vazio
  IF next_member.id IS NULL THEN
    RAISE NOTICE 'No eligible closers found for round-robin';
    RETURN;
  END IF;
  
  -- Atualizar estado do round-robin
  INSERT INTO round_robin_state (function_id, last_assigned_member_id, last_assigned_at)
  VALUES (closer_function_id, next_member.id, now())
  ON CONFLICT (function_id) 
  DO UPDATE SET 
    last_assigned_member_id = next_member.id,
    last_assigned_at = now(),
    updated_at = now();
  
  member_id := next_member.id;
  member_name := next_member.name;
  member_email := next_member.email;
  member_phone := next_member.phone;
  RETURN NEXT;
END;
$$;