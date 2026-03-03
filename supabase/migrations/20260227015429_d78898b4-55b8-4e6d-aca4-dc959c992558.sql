
-- Fix overly permissive policies on social_metrics
DROP POLICY "System can insert metrics" ON public.social_metrics;
DROP POLICY "System can update metrics" ON public.social_metrics;

-- Only allow inserts/updates from authenticated users or service role
CREATE POLICY "Authenticated users can insert metrics"
  ON public.social_metrics FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Authenticated users can update metrics"
  ON public.social_metrics FOR UPDATE
  USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');
