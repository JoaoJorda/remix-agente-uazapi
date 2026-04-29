
-- 1. Renomear colunas em nina_settings
ALTER TABLE public.nina_settings RENAME COLUMN evolution_api_url TO uazapi_base_url;
ALTER TABLE public.nina_settings RENAME COLUMN evolution_api_key TO uazapi_token;

-- 2. Renomear colunas em whatsapp_instance_secrets
ALTER TABLE public.whatsapp_instance_secrets RENAME COLUMN api_url TO base_url;
ALTER TABLE public.whatsapp_instance_secrets RENAME COLUMN api_key TO token;

-- 3. Alterar enum whatsapp_provider_type
-- 3a. Adicionar novo valor
ALTER TYPE public.whatsapp_provider_type ADD VALUE IF NOT EXISTS 'uazapi';

-- 3b. Converter registros existentes (precisa ser feito após o ADD VALUE ter sido committed,
-- mas dentro da mesma migration o Supabase executa tudo em uma transação implícita.
-- Para contornar, usamos uma abordagem com coluna temporária.)

-- Criar coluna temporária de texto
ALTER TABLE public.whatsapp_instances ADD COLUMN provider_type_new text;

-- Copiar valores convertendo evolution_* para uazapi
UPDATE public.whatsapp_instances SET provider_type_new = CASE
  WHEN provider_type::text IN ('evolution_self_hosted', 'evolution_cloud') THEN 'uazapi'
  ELSE provider_type::text
END;

-- Dropar a coluna antiga e o enum antigo, recriar
ALTER TABLE public.whatsapp_instances DROP COLUMN provider_type;

-- Dropar e recriar o enum sem os valores antigos
DROP TYPE public.whatsapp_provider_type;
CREATE TYPE public.whatsapp_provider_type AS ENUM ('official', 'uazapi');

-- Adicionar a coluna de volta com o novo tipo
ALTER TABLE public.whatsapp_instances ADD COLUMN provider_type public.whatsapp_provider_type NOT NULL DEFAULT 'official';

-- Converter os valores da coluna temporária
UPDATE public.whatsapp_instances SET provider_type = provider_type_new::public.whatsapp_provider_type;

-- Remover coluna temporária
ALTER TABLE public.whatsapp_instances DROP COLUMN provider_type_new;
