-- ============================================================
-- AUTO-POST PIPELINE — Supabase Migration
-- Chạy trong Supabase Dashboard > SQL Editor
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- ENUMS
-- ────────────────────────────────────────────────────────────

CREATE TYPE user_role               AS ENUM ('admin', 'marketer_full', 'marketer_content');
CREATE TYPE user_status             AS ENUM ('pending', 'active', 'locked');
CREATE TYPE platform_type           AS ENUM ('facebook', 'thread', 'instagram');
CREATE TYPE caption_status          AS ENUM ('draft', 'edited', 'approved', 'scheduled', 'posted');
CREATE TYPE caption_version_source  AS ENUM ('ai', 'human');
CREATE TYPE post_status             AS ENUM ('pending', 'posted', 'failed', 'cancelled');
CREATE TYPE ab_test_status          AS ENUM ('running', 'completed', 'cancelled');


-- ────────────────────────────────────────────────────────────
-- 1. USERS
-- NOTE: Supabase có bảng auth.users riêng cho authentication.
--       Bảng này là "profile" mở rộng, liên kết qua id = auth.users.id
-- ────────────────────────────────────────────────────────────

CREATE TABLE public.users (
  id              UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           TEXT        NOT NULL UNIQUE,
  role            user_role   NOT NULL DEFAULT 'marketer_content',
  status          user_status NOT NULL DEFAULT 'pending',
  locked_reason   TEXT,
  locked_at       TIMESTAMPTZ,
  locked_by       UUID        REFERENCES public.users(id),
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tự động tạo profile khi user đăng ký qua Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.users (id, email, role)
  VALUES (NEW.id, NEW.email, 'marketer_content'::user_role);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ────────────────────────────────────────────────────────────
-- 2. AUDIT LOGS
-- ────────────────────────────────────────────────────────────

CREATE TABLE public.audit_logs (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id        UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  target_user_id  UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  action          TEXT        NOT NULL,
  before_value    JSONB,
  after_value     JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ────────────────────────────────────────────────────────────
-- 3. PROMPTS
-- ────────────────────────────────────────────────────────────

CREATE TABLE public.prompts (
  id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by      UUID            NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
  cloned_from     UUID            REFERENCES public.prompts(id) ON DELETE SET NULL,
  name            TEXT            NOT NULL,
  platform        platform_type   NOT NULL,
  content         TEXT            NOT NULL,
  tags            TEXT[]          NOT NULL DEFAULT '{}',
  is_deleted      BOOLEAN         NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);


-- ────────────────────────────────────────────────────────────
-- 4. ARTICLES (kết quả crawl)
-- images lưu [{url, caption}] — dùng link gốc, không download
-- ────────────────────────────────────────────────────────────

CREATE TABLE public.articles (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  url             TEXT        NOT NULL UNIQUE,
  title           TEXT,
  category        TEXT,
  description     TEXT,
  author          TEXT,
  published_at    TEXT,
  views           TEXT,
  images          JSONB       NOT NULL DEFAULT '[]',   -- [{url, caption}]
  body            JSONB       NOT NULL DEFAULT '[]',   -- [{type, text, url, caption}]
  full_text       TEXT,
  tags            TEXT[]      NOT NULL DEFAULT '{}',
  crawled_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ────────────────────────────────────────────────────────────
-- 5. UTM CONFIGS
-- ────────────────────────────────────────────────────────────

CREATE TABLE public.utm_configs (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by      UUID        NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
  campaign_name   TEXT        NOT NULL,
  utm_source      TEXT        NOT NULL DEFAULT 'facebook',
  utm_medium      TEXT        NOT NULL DEFAULT 'social',
  utm_campaign    TEXT        NOT NULL,
  utm_content     TEXT,
  utm_term        TEXT,
  is_default      BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ────────────────────────────────────────────────────────────
-- 6. CAPTIONS
-- ────────────────────────────────────────────────────────────

CREATE TABLE public.captions (
  id                    UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id            UUID            NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  prompt_id             UUID            REFERENCES public.prompts(id) ON DELETE SET NULL,
  created_by            UUID            NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
  utm_config_id         UUID            REFERENCES public.utm_configs(id) ON DELETE SET NULL,
  platform              platform_type   NOT NULL,
  ai_content            TEXT            NOT NULL,   -- bản AI gốc, không bao giờ ghi đè
  edited_content        TEXT,                       -- bản đã sửa
  status                caption_status  NOT NULL DEFAULT 'draft',
  is_favorite_template  BOOLEAN         NOT NULL DEFAULT FALSE,
  content_hash          TEXT,                       -- để check duplicate nhanh
  utm_url               TEXT,
  created_at            TIMESTAMPTZ     NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ     NOT NULL DEFAULT now()
);


-- ────────────────────────────────────────────────────────────
-- 7. CAPTION VERSIONS
-- ────────────────────────────────────────────────────────────

CREATE TABLE public.caption_versions (
  id              UUID                    PRIMARY KEY DEFAULT gen_random_uuid(),
  caption_id      UUID                    NOT NULL REFERENCES public.captions(id) ON DELETE CASCADE,
  version_number  INTEGER                 NOT NULL,
  content         TEXT                    NOT NULL,
  source          caption_version_source  NOT NULL,
  created_at      TIMESTAMPTZ             NOT NULL DEFAULT now(),
  UNIQUE (caption_id, version_number)
);


-- ────────────────────────────────────────────────────────────
-- 8. SCHEDULED POSTS
-- image_urls: link ảnh gốc từ bài báo, FB Graph API nhận url trực tiếp
-- ────────────────────────────────────────────────────────────

CREATE TABLE public.scheduled_posts (
  id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  caption_id      UUID            NOT NULL REFERENCES public.captions(id) ON DELETE CASCADE,
  created_by      UUID            NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
  platform        platform_type   NOT NULL,
  status          post_status     NOT NULL DEFAULT 'pending',
  scheduled_at    TIMESTAMPTZ     NOT NULL,
  posted_at       TIMESTAMPTZ,
  failed_at       TIMESTAMPTZ,
  failure_reason  TEXT,
  fb_post_id      TEXT,
  post_result     JSONB,
  image_urls      TEXT[]          NOT NULL DEFAULT '{}',   -- link ảnh gốc, không upload trước
  created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);


-- ────────────────────────────────────────────────────────────
-- 9. A/B TESTS
-- ────────────────────────────────────────────────────────────

CREATE TABLE public.ab_tests (
  id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id          UUID            NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  created_by          UUID            NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
  platform            platform_type   NOT NULL,
  status              ab_test_status  NOT NULL DEFAULT 'running',
  auto_select_at      TIMESTAMPTZ,
  winner_selected_at  TIMESTAMPTZ,
  winner_caption_id   UUID            REFERENCES public.captions(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE public.ab_test_variants (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ab_test_id      UUID        NOT NULL REFERENCES public.ab_tests(id) ON DELETE CASCADE,
  caption_id      UUID        NOT NULL REFERENCES public.captions(id) ON DELETE CASCADE,
  impressions     INTEGER     NOT NULL DEFAULT 0,
  clicks          INTEGER     NOT NULL DEFAULT 0,
  ctr             FLOAT       GENERATED ALWAYS AS (
                    CASE WHEN impressions > 0
                    THEN ROUND((clicks::FLOAT / impressions * 100)::NUMERIC, 2)
                    ELSE 0 END
                  ) STORED,
  is_winner       BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (ab_test_id, caption_id)
);


-- ────────────────────────────────────────────────────────────
-- 10. PIPELINE RUNS
-- ────────────────────────────────────────────────────────────

CREATE TABLE public.pipeline_runs (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  url             TEXT        NOT NULL,
  article_id      UUID        REFERENCES public.articles(id) ON DELETE SET NULL,
  triggered_by    UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  trigger_source  TEXT,       -- 'web' | 'extension' | 'api'
  status          TEXT        NOT NULL DEFAULT 'running',
  error_message   TEXT,
  steps           JSONB       NOT NULL DEFAULT '{}',
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at     TIMESTAMPTZ
);


-- ────────────────────────────────────────────────────────────
-- INDEXES
-- ────────────────────────────────────────────────────────────

CREATE INDEX ON public.prompts(platform);
CREATE INDEX ON public.prompts USING GIN(tags);
CREATE INDEX ON public.prompts(is_deleted);

CREATE INDEX ON public.articles(created_at DESC);
CREATE INDEX ON public.articles USING GIN(tags);

CREATE INDEX ON public.captions(article_id);
CREATE INDEX ON public.captions(platform);
CREATE INDEX ON public.captions(status);
CREATE INDEX ON public.captions(created_at DESC);
CREATE INDEX ON public.captions USING GIN(
  to_tsvector('simple', COALESCE(edited_content, ai_content))
);

CREATE INDEX ON public.scheduled_posts(status);
CREATE INDEX ON public.scheduled_posts(scheduled_at);

CREATE INDEX ON public.ab_tests(status);
CREATE INDEX ON public.ab_tests(article_id);

CREATE INDEX ON public.pipeline_runs(status);
CREATE INDEX ON public.pipeline_runs(started_at DESC);


-- ────────────────────────────────────────────────────────────
-- HELPER: lấy role của user đang đăng nhập
-- Dùng trong RLS policies để check phân quyền
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;


-- ────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY (RLS)
-- Supabase bắt buộc cần RLS, không có policy = không ai đọc được
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.users           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.utm_configs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.captions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caption_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ab_tests        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ab_test_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_runs   ENABLE ROW LEVEL SECURITY;


-- USERS: xem profile mình, admin xem tất cả
CREATE POLICY "users: view own profile"
  ON public.users FOR SELECT
  USING (id = auth.uid() OR public.is_admin());

CREATE POLICY "users: admin update any"
  ON public.users FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "users: insert via trigger only"
  ON public.users FOR INSERT
  WITH CHECK (id = auth.uid());


-- AUDIT LOGS: chỉ admin đọc
CREATE POLICY "audit_logs: admin only"
  ON public.audit_logs FOR ALL
  USING (public.is_admin());


-- PROMPTS: mọi marketer đọc, tạo/sửa/xóa
CREATE POLICY "prompts: authenticated read"
  ON public.prompts FOR SELECT
  USING (auth.role() = 'authenticated' AND is_deleted = FALSE);

CREATE POLICY "prompts: authenticated write"
  ON public.prompts FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "prompts: owner or admin update"
  ON public.prompts FOR UPDATE
  USING (created_by = auth.uid() OR public.is_admin());

CREATE POLICY "prompts: owner or admin delete"
  ON public.prompts FOR DELETE
  USING (created_by = auth.uid() OR public.is_admin());


-- ARTICLES: mọi người đọc, chỉ pipeline (service role) ghi
CREATE POLICY "articles: authenticated read"
  ON public.articles FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "articles: service role write"
  ON public.articles FOR INSERT
  WITH CHECK (auth.role() = 'service_role');


-- UTM CONFIGS: authenticated đọc/ghi
CREATE POLICY "utm_configs: authenticated read"
  ON public.utm_configs FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "utm_configs: authenticated write"
  ON public.utm_configs FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "utm_configs: owner or admin modify"
  ON public.utm_configs FOR UPDATE
  USING (created_by = auth.uid() OR public.is_admin());


-- CAPTIONS: mọi người đọc, owner sửa
CREATE POLICY "captions: authenticated read"
  ON public.captions FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "captions: authenticated insert"
  ON public.captions FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "captions: owner or admin update"
  ON public.captions FOR UPDATE
  USING (created_by = auth.uid() OR public.is_admin());


-- CAPTION_VERSIONS: authenticated đọc
CREATE POLICY "caption_versions: authenticated read"
  ON public.caption_versions FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "caption_versions: authenticated insert"
  ON public.caption_versions FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');


-- SCHEDULED_POSTS: authenticated đọc, owner/admin sửa
CREATE POLICY "scheduled_posts: authenticated read"
  ON public.scheduled_posts FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "scheduled_posts: authenticated insert"
  ON public.scheduled_posts FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "scheduled_posts: owner or admin update"
  ON public.scheduled_posts FOR UPDATE
  USING (created_by = auth.uid() OR public.is_admin());


-- AB_TESTS + VARIANTS: authenticated đọc/ghi
CREATE POLICY "ab_tests: authenticated read"
  ON public.ab_tests FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "ab_tests: authenticated write"
  ON public.ab_tests FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "ab_test_variants: authenticated read"
  ON public.ab_test_variants FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "ab_test_variants: authenticated write"
  ON public.ab_test_variants FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "ab_test_variants: service role update"
  ON public.ab_test_variants FOR UPDATE
  USING (auth.role() = 'service_role');


-- PIPELINE_RUNS: authenticated đọc, service role ghi (pipeline chạy server-side)
CREATE POLICY "pipeline_runs: authenticated read"
  ON public.pipeline_runs FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "pipeline_runs: service role write"
  ON public.pipeline_runs FOR ALL
  USING (auth.role() = 'service_role');


-- ────────────────────────────────────────────────────────────
-- SEED: tạo admin đầu tiên
-- Cách dùng: Tạo user qua Supabase Auth trước, lấy UUID, rồi chạy lệnh này
-- UPDATE public.users SET role = 'admin', status = 'active' WHERE email = 'your@email.com';
-- ────────────────────────────────────────────────────────────