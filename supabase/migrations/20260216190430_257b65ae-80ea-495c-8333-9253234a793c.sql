ALTER TABLE public.design_settings
  ADD COLUMN sidebar_identity_font text DEFAULT 'Playfair Display',
  ADD COLUMN sidebar_identity_enabled boolean DEFAULT true;