-- Migration: Add trigger_source column to scheduled_posts table
-- Apply this migration to support tracking posts generated via Extension.

BEGIN;

ALTER TABLE public.scheduled_posts
  ADD COLUMN IF NOT EXISTS trigger_source TEXT;

COMMIT;
