
-- Drop restrictive policies and recreate as permissive
DROP POLICY IF EXISTS "Admins can insert system_settings" ON public.system_settings;
DROP POLICY IF EXISTS "Authenticated can read system_settings" ON public.system_settings;
DROP POLICY IF EXISTS "Authenticated can update system_settings" ON public.system_settings;
DROP POLICY IF EXISTS "Public can read system_settings" ON public.system_settings;

-- Recreate as PERMISSIVE policies
CREATE POLICY "Admins can insert system_settings"
ON public.system_settings
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update system_settings"
ON public.system_settings
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can read system_settings"
ON public.system_settings
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Public can read system_settings"
ON public.system_settings
FOR SELECT
TO anon
USING (true);
