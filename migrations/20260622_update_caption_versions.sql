-- ============================================================
-- Migration: Cho phép lưu bản nháp AI vào caption_versions khi chưa tạo captions
-- Chạy trong Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. Cho phép caption_id trong bảng caption_versions nhận giá trị NULL
ALTER TABLE public.caption_versions
  ALTER COLUMN caption_id DROP NOT NULL;

-- 2. Thêm cột article_id và platform vào caption_versions để lưu thông tin phân loại
ALTER TABLE public.caption_versions
  ADD COLUMN IF NOT EXISTS article_id UUID REFERENCES public.articles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS platform platform_type;

-- 3. Tạo unique index để đảm bảo mỗi phiên bản của một bài viết + nền tảng là duy nhất khi chưa đăng (chưa có caption_id)
CREATE UNIQUE INDEX IF NOT EXISTS caption_versions_article_platform_version_idx
  ON public.caption_versions(article_id, platform, version_number)
  WHERE caption_id IS NULL;

-- 4. Tạo index thông thường để tối ưu truy vấn theo article_id
CREATE INDEX IF NOT EXISTS caption_versions_article_id_idx
  ON public.caption_versions(article_id);
