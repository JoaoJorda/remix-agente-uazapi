
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS has_logged_in boolean NOT NULL DEFAULT false;
