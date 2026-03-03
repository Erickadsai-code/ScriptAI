
-- Table to store social media account connections per client
CREATE TABLE public.social_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  platform TEXT NOT NULL, -- 'instagram', 'tiktok'
  account_id TEXT NOT NULL, -- Instagram Business Account ID or TikTok user ID
  account_name TEXT, -- Display name
  access_token TEXT, -- Per-account token if needed
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.social_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view social connections"
  ON public.social_connections FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage social connections"
  ON public.social_connections FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_social_connections_updated_at
  BEFORE UPDATE ON public.social_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Table to store fetched metrics per script publication
CREATE TABLE public.social_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  script_id UUID NOT NULL REFERENCES public.scripts(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES public.social_connections(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  post_id TEXT NOT NULL, -- Instagram media ID or TikTok video ID
  post_url TEXT,
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  engagement_rate NUMERIC DEFAULT 0,
  fetched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  raw_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.social_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view social metrics"
  ON public.social_metrics FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage social metrics"
  ON public.social_metrics FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert metrics"
  ON public.social_metrics FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update metrics"
  ON public.social_metrics FOR UPDATE
  USING (true);

CREATE TRIGGER update_social_metrics_updated_at
  BEFORE UPDATE ON public.social_metrics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
