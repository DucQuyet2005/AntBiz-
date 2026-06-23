-- Migration: Add notifications table
-- Date: 2026-06-23

-- 1. Create notification_type enum if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
    CREATE TYPE public.notification_type AS ENUM ('post_success', 'post_failed', 'ab_test_complete', 'info');
  END IF;
END $$;

-- 2. Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id          UUID                    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID                    NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type        public.notification_type NOT NULL,
  title       TEXT                    NOT NULL,
  message     TEXT                    NOT NULL,
  is_read     BOOLEAN                 NOT NULL DEFAULT FALSE,
  metadata    JSONB                   NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ             NOT NULL DEFAULT now()
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies
-- Users can read their own notifications
CREATE POLICY "notifications: select own" ON public.notifications
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can update their own notifications (e.g. mark as read)
CREATE POLICY "notifications: update own" ON public.notifications
  FOR UPDATE
  USING (user_id = auth.uid());

-- Allow authenticated users or service_role to insert notifications
CREATE POLICY "notifications: insert authenticated" ON public.notifications
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- 5. Create indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);

-- 6. Add table to Supabase Realtime publication (supabase_realtime)
-- We check if it is already in publication to prevent duplicate key errors,
-- though in Supabase it is safe to try to add it.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'notifications'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    END IF;
  END IF;
END $$;
