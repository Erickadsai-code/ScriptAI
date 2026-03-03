
-- Drop all existing restrictive policies on scripts
DROP POLICY IF EXISTS "Admins can manage all scripts" ON public.scripts;
DROP POLICY IF EXISTS "Authenticated users can view scripts" ON public.scripts;
DROP POLICY IF EXISTS "Users can insert scripts" ON public.scripts;
DROP POLICY IF EXISTS "Users can update own scripts" ON public.scripts;

-- Recreate as PERMISSIVE policies
CREATE POLICY "Admins can manage all scripts"
ON public.scripts FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view scripts"
ON public.scripts FOR SELECT
USING (true);

CREATE POLICY "Users can insert scripts"
ON public.scripts FOR INSERT
WITH CHECK (auth.uid() = collaborator_id);

CREATE POLICY "Users can update own scripts"
ON public.scripts FOR UPDATE
USING (auth.uid() = collaborator_id);
