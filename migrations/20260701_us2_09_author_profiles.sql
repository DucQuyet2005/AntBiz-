-- ============================================================
-- Migration: US-2.09 – Tạo bảng author_profiles và cột trong captions
-- Chạy trong Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. Tạo bảng author_profiles
CREATE TABLE IF NOT EXISTS public.author_profiles (
  id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID            NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name            TEXT            NOT NULL,                   -- Tên tác giả hoặc Fanpage đối thủ (VD: "Style Kênh 14")
  source_url      TEXT,                                       -- URL Fanpage/Báo chí đối thủ để cào bài mẫu
  sample_posts    TEXT[]          NOT NULL DEFAULT '{}',      -- Mảng lưu các bài viết mẫu cào được phục vụ Few-shot
  tuned_model_id  TEXT,                                       -- ID của tuned model từ Google AI Studio
  tuning_status   TEXT            NOT NULL DEFAULT 'pending', -- 'pending' (chưa học), 'training' (đang cào/học), 'ready' (sẵn sàng), 'failed' (lỗi)
  created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- Index tối ưu hoá truy vấn theo user_id
CREATE INDEX IF NOT EXISTS idx_author_profiles_user_id ON public.author_profiles(user_id);

-- Bật RLS
ALTER TABLE public.author_profiles ENABLE ROW LEVEL SECURITY;

-- Tạo các RLS Policies
CREATE POLICY "author_profiles: owner read"
  ON public.author_profiles FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "author_profiles: owner insert"
  ON public.author_profiles FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "author_profiles: owner update"
  ON public.author_profiles FOR UPDATE
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "author_profiles: owner delete"
  ON public.author_profiles FOR DELETE
  USING (user_id = auth.uid() OR public.is_admin());

-- 2. Thêm cột author_profile_id vào bảng captions
ALTER TABLE public.captions
  ADD COLUMN IF NOT EXISTS author_profile_id UUID REFERENCES public.author_profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_captions_author_profile_id ON public.captions(author_profile_id);
