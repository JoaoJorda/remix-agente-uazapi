
-- =============================================
-- TABELA: broadcast_campaigns
-- =============================================
CREATE TABLE public.broadcast_campaigns (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  message_template text NOT NULL,
  message_type text NOT NULL DEFAULT 'text',
  media_url text,
  instance_id uuid REFERENCES public.whatsapp_instances(id),
  delay_min_ms integer NOT NULL DEFAULT 5000,
  delay_max_ms integer NOT NULL DEFAULT 15000,
  column_mapping jsonb NOT NULL DEFAULT '{}',
  custom_fields text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'draft',
  total_recipients integer NOT NULL DEFAULT 0,
  sent_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- =============================================
-- TABELA: broadcast_recipients
-- =============================================
CREATE TABLE public.broadcast_recipients (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id uuid NOT NULL REFERENCES public.broadcast_campaigns(id) ON DELETE CASCADE,
  phone_number text NOT NULL,
  variables jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  sent_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX idx_broadcast_campaigns_user_id ON public.broadcast_campaigns(user_id);
CREATE INDEX idx_broadcast_campaigns_status ON public.broadcast_campaigns(status);
CREATE INDEX idx_broadcast_recipients_campaign_id ON public.broadcast_recipients(campaign_id);
CREATE INDEX idx_broadcast_recipients_status ON public.broadcast_recipients(status);
CREATE INDEX idx_broadcast_recipients_campaign_status ON public.broadcast_recipients(campaign_id, status);

-- =============================================
-- RLS: broadcast_campaigns
-- =============================================
ALTER TABLE public.broadcast_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can access broadcast_campaigns"
  ON public.broadcast_campaigns
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- =============================================
-- RLS: broadcast_recipients
-- =============================================
ALTER TABLE public.broadcast_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can access broadcast_recipients"
  ON public.broadcast_recipients
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- =============================================
-- TRIGGER: updated_at automático
-- =============================================
CREATE TRIGGER update_broadcast_campaigns_updated_at
  BEFORE UPDATE ON public.broadcast_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- REALTIME: habilitar para acompanhar progresso
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.broadcast_campaigns;
