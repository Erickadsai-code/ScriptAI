
-- Drop restrictive check constraints that don't match the app's Spanish values
ALTER TABLE public.scripts DROP CONSTRAINT IF EXISTS scripts_objective_check;
ALTER TABLE public.scripts DROP CONSTRAINT IF EXISTS scripts_tone_check;
