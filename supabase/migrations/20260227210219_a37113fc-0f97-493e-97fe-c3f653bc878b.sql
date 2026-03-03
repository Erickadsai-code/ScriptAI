
-- Create knowledge_files table for GPT knowledge base file uploads
CREATE TABLE public.knowledge_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text NOT NULL,
  file_size integer DEFAULT 0,
  extracted_text text,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.knowledge_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage knowledge files"
ON public.knowledge_files FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can read knowledge files"
ON public.knowledge_files FOR SELECT
TO authenticated
USING (true);

-- Storage bucket for knowledge files
INSERT INTO storage.buckets (id, name, public) VALUES ('knowledge-files', 'knowledge-files', true);

CREATE POLICY "Admins can upload knowledge files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'knowledge-files' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can read knowledge files"
ON storage.objects FOR SELECT
USING (bucket_id = 'knowledge-files');

CREATE POLICY "Admins can delete knowledge files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'knowledge-files' AND has_role(auth.uid(), 'admin'::app_role));
