
-- Tabela de design settings
CREATE TABLE public.design_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  logo_url text,
  primary_color text DEFAULT '37 30% 57%',
  sidebar_bg_color text DEFAULT '0 0% 10%',
  sidebar_primary_color text DEFAULT '37 30% 57%',
  accent_color text DEFAULT '40 33% 96%',
  company_display_name text,
  company_subtitle text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.design_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can modify design_settings" ON public.design_settings
  FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can read design_settings" ON public.design_settings
  FOR SELECT USING (true);

-- Storage bucket para logos
INSERT INTO storage.buckets (id, name, public) VALUES ('logos', 'logos', true);

CREATE POLICY "Admins can upload logos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'logos' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view logos" ON storage.objects
  FOR SELECT USING (bucket_id = 'logos');

CREATE POLICY "Admins can delete logos" ON storage.objects
  FOR DELETE USING (bucket_id = 'logos' AND has_role(auth.uid(), 'admin'));

-- Trigger para updated_at
CREATE TRIGGER update_design_settings_updated_at
  BEFORE UPDATE ON public.design_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
