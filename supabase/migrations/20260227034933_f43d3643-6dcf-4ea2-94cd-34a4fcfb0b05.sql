
-- Create storage bucket for media uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('content-media', 'content-media', true);

-- Storage policies for content-media bucket
CREATE POLICY "Authenticated users can upload media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'content-media' AND auth.role() = 'authenticated');

CREATE POLICY "Anyone can view media"
ON storage.objects FOR SELECT
USING (bucket_id = 'content-media');

CREATE POLICY "Authenticated users can update their media"
ON storage.objects FOR UPDATE
USING (bucket_id = 'content-media' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete their media"
ON storage.objects FOR DELETE
USING (bucket_id = 'content-media' AND auth.role() = 'authenticated');

-- Create content_drafts table for the approval flow
CREATE TABLE public.content_drafts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  connection_id UUID REFERENCES public.social_connections(id),
  client_id UUID REFERENCES public.clients(id),
  script_id UUID REFERENCES public.scripts(id),
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video', 'carousel')),
  content_type TEXT NOT NULL CHECK (content_type IN ('post', 'reel')),
  generated_copy TEXT,
  approved_copy TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'generating', 'pending_approval', 'approved', 'publishing', 'published', 'failed')),
  ig_media_id TEXT,
  ig_permalink TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.content_drafts ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own drafts"
ON public.content_drafts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own drafts"
ON public.content_drafts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own drafts"
ON public.content_drafts FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own drafts"
ON public.content_drafts FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all drafts"
ON public.content_drafts FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_content_drafts_updated_at
BEFORE UPDATE ON public.content_drafts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add instagram_content_publish scope support
-- Update OAuth scopes in the edge function (done in code)
