CREATE POLICY "Admins can insert system_settings"
ON public.system_settings
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));