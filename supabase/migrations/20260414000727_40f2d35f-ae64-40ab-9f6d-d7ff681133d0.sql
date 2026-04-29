ALTER TABLE public.nina_settings
  ADD COLUMN IF NOT EXISTS business_hours_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS out_of_hours_message text DEFAULT 'Olá! No momento estamos fora do horário de atendimento. Retornaremos em breve!',
  ADD COLUMN IF NOT EXISTS custom_ai_provider text DEFAULT 'lovable',
  ADD COLUMN IF NOT EXISTS custom_ai_api_key text DEFAULT NULL;