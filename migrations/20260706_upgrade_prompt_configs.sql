-- ============================================================
-- Migration: Nâng cấp Văn phong thương hiệu (prompt_configs)
-- Chạy trong Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. Bổ sung cột rules vào bảng prompt_configs
ALTER TABLE public.prompt_configs
  ADD COLUMN IF NOT EXISTS rules TEXT;

-- 2. Di chuyển dữ liệu cũ (nếu có): chuyển đổi từ params (tone, custom_rules) sang cột rules dạng Markdown
UPDATE public.prompt_configs
SET rules = 
  '# HƯỚNG DẪN HÀNH VĂN THƯƠNG HIỆU' || chr(10) ||
  '- **Tone giọng:** ' || COALESCE(params->>'tone', 'Tự do') || chr(10) ||
  '- **Độ dài:** ' || COALESCE(params->>'length', 'Vừa') || chr(10) ||
  CASE 
    WHEN params->>'custom_rules' IS NOT NULL AND params->>'custom_rules' <> '' 
    THEN '- **Nguyên tắc bổ sung:** ' || (params->>'custom_rules')
    WHEN params->>'emphasis' IS NOT NULL AND params->>'emphasis' <> '' 
    THEN '- **Nguyên tắc bổ sung:** ' || (params->>'emphasis')
    ELSE ''
  END
WHERE rules IS NULL;

-- 3. Đặt giá trị mặc định cho các bản ghi mới (tránh lỗi NULL)
ALTER TABLE public.prompt_configs
  ALTER COLUMN rules SET DEFAULT '';
