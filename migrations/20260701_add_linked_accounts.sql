-- ────────────────────────────────────────────────────────────
-- MIGRATION: 20260701_add_linked_accounts.sql
-- Tạo bảng lưu trữ thông tin liên kết tài khoản mạng xã hội của user
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.linked_accounts (
  id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID            NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  platform        platform_type   NOT NULL,
  account_id      TEXT            NOT NULL, -- Facebook Page ID, Threads User ID, Instagram Account ID
  account_name    TEXT,           -- Tên hiển thị của trang/tài khoản
  access_token    TEXT            NOT NULL, -- Access token dài hạn
  refresh_token   TEXT,           -- Refresh token (dành cho Threads nếu có)
  expires_at      TIMESTAMPTZ,    -- Hạn dùng của token
  created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
  UNIQUE (user_id, platform, account_id)
);

-- Bật RLS
ALTER TABLE public.linked_accounts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "linked_accounts: select own" ON public.linked_accounts 
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "linked_accounts: insert own" ON public.linked_accounts 
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "linked_accounts: update own" ON public.linked_accounts 
  FOR UPDATE USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "linked_accounts: delete own" ON public.linked_accounts 
  FOR DELETE USING (user_id = auth.uid() OR public.is_admin());

-- Index để tìm kiếm nhanh
CREATE INDEX IF NOT EXISTS idx_linked_accounts_user_platform ON public.linked_accounts(user_id, platform);
