
-- Tabela para tokens OAuth do Google Calendar por usuário
CREATE TABLE public.google_calendar_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  expires_at timestamptz NOT NULL,
  calendar_id text DEFAULT 'primary',
  sync_channel_id text,
  sync_resource_id text,
  sync_expiration timestamptz,
  sync_token text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.google_calendar_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own google_calendar_tokens"
  ON public.google_calendar_tokens FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Coluna para vincular appointments ao Google Calendar
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS google_event_id text;

-- Trigger para updated_at
CREATE TRIGGER update_google_calendar_tokens_updated_at
  BEFORE UPDATE ON public.google_calendar_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
