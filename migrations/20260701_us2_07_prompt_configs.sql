-- ============================================================
-- US-2.07 Migration: Tạo bảng prompt_configs lưu cấu hình prompt
-- Chạy trong Supabase Dashboard > SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.prompt_configs (
  id          UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID            NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name        TEXT            NOT NULL,
  platform    platform_type   NOT NULL,
  params      JSONB           NOT NULL DEFAULT '{}',
  is_default  BOOLEAN         NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ     NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- Index tối ưu hóa truy vấn
CREATE INDEX IF NOT EXISTS idx_prompt_configs_user_platform ON public.prompt_configs(user_id, platform);
CREATE INDEX IF NOT EXISTS idx_prompt_configs_is_default ON public.prompt_configs(is_default) WHERE is_default = TRUE;

-- Bật Row Level Security (RLS)
ALTER TABLE public.prompt_configs ENABLE ROW LEVEL SECURITY;

-- Các RLS Policies cho bảng prompt_configs
CREATE POLICY "prompt_configs: owners read"
  ON public.prompt_configs FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "prompt_configs: owners insert"
  ON public.prompt_configs FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "prompt_configs: owners update"
  ON public.prompt_configs FOR UPDATE
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "prompt_configs: owners delete"
  ON public.prompt_configs FOR DELETE
  USING (user_id = auth.uid() OR public.is_admin());
