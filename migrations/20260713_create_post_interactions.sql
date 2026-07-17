-- ============================================================
-- Migration: Create post_interactions table and seed mock data
-- ============================================================

CREATE TABLE IF NOT EXISTS public.post_interactions (
  id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id         UUID            NOT NULL UNIQUE REFERENCES public.scheduled_posts(id) ON DELETE CASCADE,
  likes           INTEGER         NOT NULL DEFAULT 0,
  comments        INTEGER         NOT NULL DEFAULT 0,
  shares          INTEGER         NOT NULL DEFAULT 0,
  clicks          INTEGER         NOT NULL DEFAULT 0,
  reach           INTEGER         NOT NULL DEFAULT 0,
  impressions     INTEGER         NOT NULL DEFAULT 0,
  updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- Index for optimization
CREATE INDEX IF NOT EXISTS idx_post_interactions_post_id ON public.post_interactions(post_id);

-- Enable RLS
ALTER TABLE public.post_interactions ENABLE ROW LEVEL SECURITY;

-- Read policy for authenticated users
DROP POLICY IF EXISTS "post_interactions: authenticated read" ON public.post_interactions;
CREATE POLICY "post_interactions: authenticated read"
  ON public.post_interactions FOR SELECT
  USING (auth.role() = 'authenticated');

-- Write policy for service role
DROP POLICY IF EXISTS "post_interactions: service role write" ON public.post_interactions;
CREATE POLICY "post_interactions: service role write"
  ON public.post_interactions FOR ALL
  USING (auth.role() = 'service_role');

-- Seed mock interaction stats for existing posted scheduled posts
INSERT INTO public.post_interactions (post_id, likes, comments, shares, clicks, reach, impressions)
SELECT 
  id, 
  floor(random() * 491 + 10)::int as likes,
  floor(random() * 99 + 2)::int as comments,
  floor(random() * 46 + 5)::int as shares,
  floor(random() * 191 + 10)::int as clicks,
  floor(random() * 951 + 50)::int as reach,
  floor(random() * 1901 + 100)::int as impressions
FROM public.scheduled_posts
WHERE status = 'posted'
ON CONFLICT (post_id) DO NOTHING;
