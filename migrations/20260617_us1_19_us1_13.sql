-- ============================================================
-- Migration: US-1.19 – Thêm cột category_confidence cho articles
-- Chạy trong Supabase Dashboard > SQL Editor
-- ============================================================

-- Thêm cột lưu confidence score của AI classification.
-- Không ảnh hưởng đến cột `category` đã có sẵn.
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS category_confidence DOUBLE PRECISION;

-- Index để sort/filter nhanh theo confidence (optional nhưng hữu ích)
CREATE INDEX IF NOT EXISTS articles_category_confidence_idx
  ON public.articles (category_confidence DESC NULLS LAST);

-- ============================================================
-- Migration: US-1.19 – Thêm cột usage_count cho prompts
-- Theo dõi số lần prompt được sử dụng để dùng làm fallback ranking.
-- ============================================================

ALTER TABLE public.prompts
  ADD COLUMN IF NOT EXISTS usage_count INTEGER NOT NULL DEFAULT 0;

-- Index để sort prompts theo usage_count nhanh (dùng trong fallback)
CREATE INDEX IF NOT EXISTS prompts_usage_count_idx
  ON public.prompts (usage_count DESC);

-- ============================================================
-- Ghi chú: Bảng `captions` đã có đủ các cột cần thiết theo schema:
--   - ai_content       TEXT NOT NULL  ← bản AI gốc (= original_content)
--   - edited_content   TEXT           ← bản đã sửa
--   - article_id       UUID
--   - platform         platform_type
--   - created_by       UUID           ← user_id
-- KHÔNG cần thêm migration cho captions.
-- ============================================================
