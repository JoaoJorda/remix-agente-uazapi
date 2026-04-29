-- 1. Habilitar Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.broadcast_campaigns;

-- 2. Remover políticas antigas
DROP POLICY IF EXISTS "Authenticated users can access broadcast_campaigns" ON public.broadcast_campaigns;
DROP POLICY IF EXISTS "Authenticated users can access broadcast_recipients" ON public.broadcast_recipients;

-- 3. Novas políticas para broadcast_campaigns (por user_id)
CREATE POLICY "Users can select own campaigns"
  ON public.broadcast_campaigns FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own campaigns"
  ON public.broadcast_campaigns FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own campaigns"
  ON public.broadcast_campaigns FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own campaigns"
  ON public.broadcast_campaigns FOR DELETE
  USING (auth.uid() = user_id);

-- 4. Novas políticas para broadcast_recipients (via campaign ownership)
CREATE POLICY "Users can select own recipients"
  ON public.broadcast_recipients FOR SELECT
  USING (campaign_id IN (SELECT id FROM public.broadcast_campaigns WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own recipients"
  ON public.broadcast_recipients FOR INSERT
  WITH CHECK (campaign_id IN (SELECT id FROM public.broadcast_campaigns WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own recipients"
  ON public.broadcast_recipients FOR UPDATE
  USING (campaign_id IN (SELECT id FROM public.broadcast_campaigns WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own recipients"
  ON public.broadcast_recipients FOR DELETE
  USING (campaign_id IN (SELECT id FROM public.broadcast_campaigns WHERE user_id = auth.uid()));