-- Add batch configuration columns to broadcast_campaigns
ALTER TABLE public.broadcast_campaigns
  ADD COLUMN IF NOT EXISTS batch_size integer NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS delay_between_batches integer NOT NULL DEFAULT 300,
  ADD COLUMN IF NOT EXISTS next_batch_at timestamp with time zone;

COMMENT ON COLUMN public.broadcast_campaigns.batch_size IS 'Number of messages per batch';
COMMENT ON COLUMN public.broadcast_campaigns.delay_between_batches IS 'Delay between batches in seconds';
COMMENT ON COLUMN public.broadcast_campaigns.next_batch_at IS 'Timestamp when next batch should be processed';