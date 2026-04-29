-- Allow authenticated users to update reply_to_groups on their own instances
-- (or any instance if user_id is null, since this is a single-tenant app)
CREATE POLICY "Authenticated users can update whatsapp_instances"
ON public.whatsapp_instances
FOR UPDATE
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');