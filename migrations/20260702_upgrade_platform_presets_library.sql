-- ============================================================
-- Migration: Nang cap platform_presets thanh thu vien da quy chuan
-- ============================================================

-- 1. Xoa rang buoc UNIQUE cu tren cot platform (chi xoa rang buoc, khong xoa cot/du lieu)
ALTER TABLE public.platform_presets DROP CONSTRAINT IF EXISTS platform_presets_platform_key;

-- 2. Them cac cot moi voi gia tri mac dinh an toan
ALTER TABLE public.platform_presets 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT 'Mặc định',
ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. Dat cac quy chuan co san lam mac dinh cua he thong
UPDATE public.platform_presets 
SET is_default = TRUE 
WHERE user_id IS NULL AND is_default = FALSE;

-- 4. Tao index UNIQUE cho quy chuan nguoi dung theo ten
CREATE UNIQUE INDEX IF NOT EXISTS unique_user_platform_preset_name 
ON public.platform_presets (user_id, platform, name) 
WHERE user_id IS NOT NULL;

-- 5. Tao index UNIQUE cho quy chuan he thong theo ten
CREATE UNIQUE INDEX IF NOT EXISTS unique_system_platform_preset_name 
ON public.platform_presets (platform, name) 
WHERE user_id IS NULL;

-- 6. Tao index UNIQUE de gioi han moi user/he thong chi co 1 ban ghi mac dinh tren moi platform
CREATE UNIQUE INDEX IF NOT EXISTS unique_user_default_platform_preset 
ON public.platform_presets (user_id, platform) 
WHERE (is_default = TRUE AND user_id IS NOT NULL);

CREATE UNIQUE INDEX IF NOT EXISTS unique_system_default_platform_preset 
ON public.platform_presets (platform) 
WHERE (is_default = TRUE AND user_id IS NULL);

-- 7. Cap nhat Policy bao mat: Cho phep nguoi dung dang nhap quan ly quy chuan rieng cua ho
DROP POLICY IF EXISTS "platform_presets: authenticated modify own" ON public.platform_presets;
CREATE POLICY "platform_presets: authenticated modify own"
  ON public.platform_presets FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
