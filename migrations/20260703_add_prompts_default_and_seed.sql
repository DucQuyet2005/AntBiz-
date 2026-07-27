-- ────────────────────────────────────────────────────────────
-- MIGRATION: 20260703_add_prompts_default_and_seed.sql
-- Thêm cột is_default và seed 3 prompt mẫu cho Threads
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.prompts ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT FALSE;

-- Tạo index unique có điều kiện để đảm bảo chỉ có tối đa 1 prompt mặc định trên mỗi platform của mỗi user
DROP INDEX IF EXISTS idx_prompts_user_platform_default;
CREATE UNIQUE INDEX idx_prompts_user_platform_default 
ON public.prompts(created_by, platform) 
WHERE (is_default = TRUE AND is_deleted = FALSE);

-- Khởi chạy khối code để seed 3 prompt mẫu cho Threads
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Lấy user đầu tiên trong bảng public.users
  SELECT id INTO v_user_id FROM public.users LIMIT 1;
  
  IF v_user_id IS NOT NULL THEN
    -- 1. Prompt Vui vẻ (mặc định)
    INSERT INTO public.prompts (created_by, name, platform, content, tags, is_default)
    VALUES (
      v_user_id, 
      'Vui vẻ', 
      'thread', 
      'Hãy viết bài đăng Threads ngắn với văn phong vui vẻ, trẻ trung, hài hước, phong cách Gen Z. Đừng quên đưa ra một câu hỏi thảo luận ngắn ở cuối bài đăng để tăng tương tác.', 
      ARRAY['vui-ve', 'genz'], 
      TRUE
    )
    ON CONFLICT DO NOTHING;

    -- 2. Prompt Tranh luận
    INSERT INTO public.prompts (created_by, name, platform, content, tags, is_default)
    VALUES (
      v_user_id, 
      'Tranh luận', 
      'thread', 
      'Hãy viết bài đăng Threads ngắn mang phong cách tranh luận thú vị, đặt câu hỏi gợi mở, mang phong cách trẻ trung Gen Z. Kết thúc bằng một câu hỏi thảo luận chính ở cuối.', 
      ARRAY['tranh-luan', 'tu-duy'], 
      FALSE
    )
    ON CONFLICT DO NOTHING;

    -- 3. Prompt Insight nhanh
    INSERT INTO public.prompts (created_by, name, platform, content, tags, is_default)
    VALUES (
      v_user_id, 
      'Insight nhanh', 
      'thread', 
      'Tóm tắt một insight nhanh, súc tích, mang phong cách trẻ trung và thực tế cho Gen Z. Kết thúc bài đăng bằng một câu hỏi thảo luận ngắn gọn.', 
      ARRAY['insight', 'nhanh'], 
      FALSE
    )
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
