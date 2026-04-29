-- Migration 3: Update RLS policies for single-tenant model

-- Drop existing restrictive policy for deals
DROP POLICY IF EXISTS "Users can manage own deals" ON public.deals;

-- Create new policy allowing all authenticated users to access all deals
CREATE POLICY "Authenticated users can access all deals" 
ON public.deals 
FOR ALL 
TO authenticated 
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Drop existing restrictive policy for appointments
DROP POLICY IF EXISTS "Users can manage own appointments" ON public.appointments;

-- Create new policy allowing all authenticated users to access all appointments
CREATE POLICY "Authenticated users can access all appointments" 
ON public.appointments 
FOR ALL 
TO authenticated 
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');