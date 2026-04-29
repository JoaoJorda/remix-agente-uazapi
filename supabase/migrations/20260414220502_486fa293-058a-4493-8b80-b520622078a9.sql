INSERT INTO public.system_settings (registration_enabled, agent_enabled)
SELECT true, true
WHERE NOT EXISTS (SELECT 1 FROM public.system_settings);