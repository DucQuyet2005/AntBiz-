-- Migration: Add export_jobs table and viewer role
-- Date: 2026-06-18

-- 1. Add 'viewer' to user_role enum
-- Note: PostgreSQL does not allow adding values to enums inside a transaction easily in some versions,
-- but for Supabase it usually works with ALTER TYPE.
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'viewer';

-- 2. Create export_jobs table
CREATE TABLE IF NOT EXISTS public.export_jobs (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by      UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status          TEXT        NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  download_url    TEXT,
  error_message   TEXT,
  filters         JSONB       NOT NULL DEFAULT '{}',
  row_count       INTEGER,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Enable RLS
ALTER TABLE public.export_jobs ENABLE ROW LEVEL SECURITY;

-- 4. Policies
CREATE POLICY "export_jobs: authenticated read"
  ON public.export_jobs FOR SELECT
  USING (created_by = auth.uid() OR public.is_admin());

CREATE POLICY "export_jobs: authenticated insert"
  ON public.export_jobs FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- 5. Index
CREATE INDEX ON public.export_jobs(created_by);
CREATE INDEX ON public.export_jobs(status);
