
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'collaborator');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS for user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Clients table
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view clients" ON public.clients
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage clients" ON public.clients
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Scripts table
CREATE TABLE public.scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  social_network TEXT NOT NULL CHECK (social_network IN ('instagram_reels', 'instagram_story', 'facebook_post', 'facebook_ad', 'tiktok')),
  objective TEXT NOT NULL CHECK (objective IN ('awareness', 'engagement', 'conversion')),
  tone TEXT NOT NULL CHECK (tone IN ('professional', 'casual', 'emotional', 'humorous')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'published', 'with_metrics')),
  collaborator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  performance_score INTEGER CHECK (performance_score >= 0 AND performance_score <= 100),
  ai_score INTEGER CHECK (ai_score >= 0 AND ai_score <= 100),
  ai_score_explanation TEXT,
  format_tags TEXT[] DEFAULT '{}',
  reach INTEGER DEFAULT 0,
  interactions INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  ctr NUMERIC(5,2) DEFAULT 0,
  version_history JSONB DEFAULT '[]',
  topic TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.scripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view scripts" ON public.scripts
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert scripts" ON public.scripts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = collaborator_id);
CREATE POLICY "Users can update own scripts" ON public.scripts
  FOR UPDATE TO authenticated USING (auth.uid() = collaborator_id);
CREATE POLICY "Admins can manage all scripts" ON public.scripts
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Activity log
CREATE TABLE public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own activity" ON public.activity_log
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all activity" ON public.activity_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated users can insert activity" ON public.activity_log
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Auto-create profile + default role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'collaborator');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_scripts_updated_at BEFORE UPDATE ON public.scripts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
