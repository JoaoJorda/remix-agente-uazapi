ALTER TABLE public.design_settings
  ADD COLUMN IF NOT EXISTS body_font text DEFAULT 'Inter',
  ADD COLUMN IF NOT EXISTS heading_font text DEFAULT 'Inter';

NOTIFY pgrst, 'reload schema';