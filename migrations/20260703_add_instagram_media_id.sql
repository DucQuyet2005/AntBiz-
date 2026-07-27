-- ============================================================
-- Add instagram_media_id to scheduled_posts table
-- ============================================================

ALTER TABLE public.scheduled_posts ADD COLUMN IF NOT EXISTS instagram_media_id TEXT;
