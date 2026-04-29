ALTER TABLE public.nina_settings 
  ADD COLUMN IF NOT EXISTS evolution_api_url text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS evolution_api_key text DEFAULT NULL;