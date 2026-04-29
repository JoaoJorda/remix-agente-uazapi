-- =============================================
-- FASE 1: Tabelas para Instâncias WhatsApp
-- =============================================

-- Criar enum para provider_type
CREATE TYPE whatsapp_provider_type AS ENUM ('official', 'evolution_self_hosted', 'evolution_cloud');

-- Criar enum para status da instância
CREATE TYPE whatsapp_instance_status AS ENUM ('connected', 'connecting', 'disconnected', 'qr_required');

-- Tabela principal de instâncias WhatsApp
CREATE TABLE public.whatsapp_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  instance_name TEXT NOT NULL,
  provider_type whatsapp_provider_type NOT NULL DEFAULT 'official',
  instance_id_external TEXT,
  phone_number TEXT,
  status whatsapp_instance_status DEFAULT 'disconnected',
  qr_code TEXT,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(instance_name)
);

-- Tabela de secrets das instâncias (separada por segurança)
CREATE TABLE public.whatsapp_instance_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE,
  api_key TEXT NOT NULL,
  api_url TEXT NOT NULL,
  verify_token TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(instance_id)
);

-- Trigger para updated_at em whatsapp_instances
CREATE TRIGGER update_whatsapp_instances_updated_at
  BEFORE UPDATE ON public.whatsapp_instances
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para updated_at em whatsapp_instance_secrets
CREATE TRIGGER update_whatsapp_instance_secrets_updated_at
  BEFORE UPDATE ON public.whatsapp_instance_secrets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Função para garantir apenas uma instância padrão por usuário
CREATE OR REPLACE FUNCTION ensure_single_default_instance()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE public.whatsapp_instances 
    SET is_default = false 
    WHERE user_id = NEW.user_id 
      AND id != NEW.id 
      AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER ensure_single_default_instance_trigger
  BEFORE INSERT OR UPDATE ON public.whatsapp_instances
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_default_instance();

-- Enable RLS
ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_instance_secrets ENABLE ROW LEVEL SECURITY;

-- RLS Policies para whatsapp_instances
CREATE POLICY "Admins can manage all whatsapp_instances"
  ON public.whatsapp_instances
  FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can read whatsapp_instances"
  ON public.whatsapp_instances
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- RLS Policies para whatsapp_instance_secrets (apenas admins)
CREATE POLICY "Admins can manage whatsapp_instance_secrets"
  ON public.whatsapp_instance_secrets
  FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- =============================================
-- FASE 2: Adicionar instance_id nas tabelas existentes
-- =============================================

-- Adicionar coluna instance_id em contacts
ALTER TABLE public.contacts 
ADD COLUMN instance_id UUID REFERENCES public.whatsapp_instances(id) ON DELETE SET NULL;

-- Adicionar coluna instance_id em conversations
ALTER TABLE public.conversations 
ADD COLUMN instance_id UUID REFERENCES public.whatsapp_instances(id) ON DELETE SET NULL;

-- Adicionar coluna instance_id em send_queue
ALTER TABLE public.send_queue 
ADD COLUMN instance_id UUID REFERENCES public.whatsapp_instances(id) ON DELETE SET NULL;

-- Adicionar coluna instance_id em message_grouping_queue
ALTER TABLE public.message_grouping_queue 
ADD COLUMN instance_id UUID REFERENCES public.whatsapp_instances(id) ON DELETE SET NULL;

-- Índices para performance
CREATE INDEX idx_contacts_instance_id ON public.contacts(instance_id);
CREATE INDEX idx_conversations_instance_id ON public.conversations(instance_id);
CREATE INDEX idx_send_queue_instance_id ON public.send_queue(instance_id);
CREATE INDEX idx_message_grouping_queue_instance_id ON public.message_grouping_queue(instance_id);
CREATE INDEX idx_whatsapp_instances_status ON public.whatsapp_instances(status);
CREATE INDEX idx_whatsapp_instances_provider_type ON public.whatsapp_instances(provider_type);
CREATE INDEX idx_whatsapp_instances_is_default ON public.whatsapp_instances(is_default) WHERE is_default = true;