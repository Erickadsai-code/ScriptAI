
-- 1. Drop the social_network check constraint causing the error
ALTER TABLE public.scripts DROP CONSTRAINT IF EXISTS scripts_social_network_check;

-- 2. Drop status check constraint to allow new values
ALTER TABLE public.scripts DROP CONSTRAINT IF EXISTS scripts_status_check;

-- 3. Add user_id to clients for per-user isolation
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS user_id uuid;

-- 4. Add user_rating (1-5 stars) column to scripts
ALTER TABLE public.scripts ADD COLUMN IF NOT EXISTS user_rating integer;

-- 5. Update RLS on clients: users see only their own clients
DROP POLICY IF EXISTS "Authenticated users can view clients" ON public.clients;
CREATE POLICY "Users can view own clients"
  ON public.clients FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Admins can manage clients" ON public.clients;
CREATE POLICY "Admins can manage all clients"
  ON public.clients FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert own clients"
  ON public.clients FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own clients"
  ON public.clients FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own clients"
  ON public.clients FOR DELETE
  USING (auth.uid() = user_id);
