-- Migration: Add notification settings and tracking fields
-- Date: 2026-07-17

-- 1. Add preference columns to public.users
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS email_on_success BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS email_on_failure BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS email_digest_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS email_digest_time VARCHAR(5) NOT NULL DEFAULT '18:00',
  ADD COLUMN IF NOT EXISTS last_digest_sent_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Add email delivery status tracking to public.notifications
ALTER TABLE public.notifications 
  ADD COLUMN IF NOT EXISTS email_sent BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. Create index to speed up unsent notification queries
CREATE INDEX IF NOT EXISTS idx_notifications_email_sent 
  ON public.notifications(user_id, email_sent) 
  WHERE email_sent = FALSE;
