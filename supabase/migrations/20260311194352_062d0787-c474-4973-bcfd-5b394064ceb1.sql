
DROP POLICY IF EXISTS "Admins can insert system_settings" ON public.system_settings;
DROP POLICY IF EXISTS "Admins can update system_settings" ON public.system_settings;

CREATE POLICY "Authenticated can insert system_settings"
ON public.system_settings
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated can update system_settings"
ON public.system_settings
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);
