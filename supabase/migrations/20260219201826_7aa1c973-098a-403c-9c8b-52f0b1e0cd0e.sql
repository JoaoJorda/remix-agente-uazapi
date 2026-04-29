
ALTER TABLE public.whatsapp_instances 
ADD COLUMN IF NOT EXISTS reply_to_groups boolean NOT NULL DEFAULT false;
