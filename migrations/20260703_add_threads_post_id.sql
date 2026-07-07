-- ============================================================
-- Add threads_post_id to scheduled_posts table
-- ============================================================

ALTER TABLE public.scheduled_posts ADD COLUMN IF NOT EXISTS threads_post_id TEXT;
