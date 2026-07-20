-- ============================================================
-- AUTO-POST PIPELINE â€” Supabase Migration
-- Cháº¡y trong Supabase Dashboard > SQL Editor
-- ============================================================

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- ENUMS
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

CREATE TYPE user_role               AS ENUM ('admin', 'marketer_full', 'marketer_content');
CREATE TYPE user_status             AS ENUM ('pending', 'active', 'locked');
CREATE TYPE platform_type           AS ENUM ('facebook', 'thread', 'instagram');
CREATE TYPE caption_status          AS ENUM ('draft', 'edited', 'approved', 'scheduled', 'posted');
CREATE TYPE caption_version_source  AS ENUM ('ai', 'human');
CREATE TYPE post_status             AS ENUM ('pending', 'posted', 'failed', 'cancelled');
CREATE TYPE ab_test_status          AS ENUM ('running', 'completed', 'cancelled');


-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- 1. USERS
-- NOTE: Supabase cĂ³ báº£ng auth.users riĂªng cho authentication.
--       Báº£ng nĂ y lĂ  "profile" má»Ÿ rá»™ng, liĂªn káº¿t qua id = auth.users.id
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

-- Tá»± Ä‘á»™ng táº¡o profile khi user Ä‘Äƒng kĂ½ qua Supabase Auth
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


-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- 2. AUDIT LOGS
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

CREATE TABLE public.audit_logs (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id        UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  target_user_id  UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  action          TEXT        NOT NULL,
  before_value    JSONB,
  after_value     JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- 3. PROMPTS
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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


-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- 4. ARTICLES (káº¿t quáº£ crawl)
-- images lÆ°u [{url, caption}] â€” dĂ¹ng link gá»‘c, khĂ´ng download
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

CREATE TABLE public.articles (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  url             TEXT        NOT NULL UNIQUE,
  title           TEXT,
  category        TEXT,
  category_confidence FLOAT,
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


-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- 5. UTM CONFIGS
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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


-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- 6. CAPTIONS
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

CREATE TABLE public.captions (
  id                    UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id            UUID            NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  prompt_id             UUID            REFERENCES public.prompts(id) ON DELETE SET NULL,
  created_by            UUID            NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
  utm_config_id         UUID            REFERENCES public.utm_configs(id) ON DELETE SET NULL,
  platform              platform_type   NOT NULL,
  ai_content            TEXT            NOT NULL,   -- báº£n AI gá»‘c, khĂ´ng bao giá» ghi Ä‘Ă¨
  edited_content        TEXT,                       -- báº£n Ä‘Ă£ sá»­a
  status                caption_status  NOT NULL DEFAULT 'draft',
  is_favorite_template  BOOLEAN         NOT NULL DEFAULT FALSE,
  content_hash          TEXT,                       -- Ä‘á»ƒ check duplicate nhanh
  utm_url               TEXT,
  created_at            TIMESTAMPTZ     NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ     NOT NULL DEFAULT now()
);


-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- 7. CAPTION VERSIONS
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

CREATE TABLE public.caption_versions (
  id              UUID                    PRIMARY KEY DEFAULT gen_random_uuid(),
  caption_id      UUID                    NOT NULL REFERENCES public.captions(id) ON DELETE CASCADE,
  version_number  INTEGER                 NOT NULL,
  content         TEXT                    NOT NULL,
  source          caption_version_source  NOT NULL,
  created_at      TIMESTAMPTZ             NOT NULL DEFAULT now(),
  UNIQUE (caption_id, version_number)
);


-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- 8. SCHEDULED POSTS
-- image_urls: link áº£nh gá»‘c tá»« bĂ i bĂ¡o, FB Graph API nháº­n url trá»±c tiáº¿p
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
  image_urls      TEXT[]          NOT NULL DEFAULT '{}',   -- link áº£nh gá»‘c, khĂ´ng upload trÆ°á»›c
  created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);


-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- 9. A/B TESTS
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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


-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- 10. PIPELINE RUNS
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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


-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- INDEXES
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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


-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- HELPER: láº¥y role cá»§a user Ä‘ang Ä‘Äƒng nháº­p
-- DĂ¹ng trong RLS policies Ä‘á»ƒ check phĂ¢n quyá»n
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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


-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- ROW LEVEL SECURITY (RLS)
-- Supabase báº¯t buá»™c cáº§n RLS, khĂ´ng cĂ³ policy = khĂ´ng ai Ä‘á»c Ä‘Æ°á»£c
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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


-- USERS: xem profile mĂ¬nh, admin xem táº¥t cáº£
CREATE POLICY "users: view own profile"
  ON public.users FOR SELECT
  USING (id = auth.uid() OR public.is_admin());

CREATE POLICY "users: admin update any"
  ON public.users FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "users: insert via trigger only"
  ON public.users FOR INSERT
  WITH CHECK (id = auth.uid());


-- AUDIT LOGS: chá»‰ admin Ä‘á»c
CREATE POLICY "audit_logs: admin only"
  ON public.audit_logs FOR ALL
  USING (public.is_admin());


-- PROMPTS: má»i marketer Ä‘á»c, táº¡o/sá»­a/xĂ³a
CREATE POLICY "prompts: authenticated read"
  ON public.prompts FOR SELECT
  USING ((created_by = auth.uid() OR public.is_admin()) AND is_deleted = FALSE);

CREATE POLICY "prompts: authenticated write"
  ON public.prompts FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "prompts: owner or admin update"
  ON public.prompts FOR UPDATE
  USING (created_by = auth.uid() OR public.is_admin());

CREATE POLICY "prompts: owner or admin delete"
  ON public.prompts FOR DELETE
  USING (created_by = auth.uid() OR public.is_admin());


-- ARTICLES: má»i ngÆ°á»i Ä‘á»c, chá»‰ pipeline (service role) ghi
CREATE POLICY "articles: authenticated read"
  ON public.articles FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "articles: service role write"
  ON public.articles FOR INSERT
  WITH CHECK (auth.role() = 'service_role');


-- UTM CONFIGS: authenticated Ä‘á»c/ghi
CREATE POLICY "utm_configs: authenticated read"
  ON public.utm_configs FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "utm_configs: authenticated write"
  ON public.utm_configs FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "utm_configs: owner or admin modify"
  ON public.utm_configs FOR UPDATE
  USING (created_by = auth.uid() OR public.is_admin());


-- CAPTIONS: má»i ngÆ°á»i Ä‘á»c, owner sá»­a
CREATE POLICY "captions: authenticated read"
  ON public.captions FOR SELECT
  USING (
    created_by = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() AND users.role IN ('admin', 'marketer_full')
    )
  );

CREATE POLICY "captions: authenticated insert"
  ON public.captions FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "captions: owner or admin update"
  ON public.captions FOR UPDATE
  USING (created_by = auth.uid() OR public.is_admin());


-- CAPTION_VERSIONS: authenticated Ä‘á»c
CREATE POLICY "caption_versions: authenticated read"
  ON public.caption_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.captions c
      WHERE c.id = caption_versions.caption_id 
        AND (c.created_by = auth.uid() OR 
             EXISTS (
               SELECT 1 FROM public.users u 
               WHERE u.id = auth.uid() AND u.role IN ('admin', 'marketer_full')
             ))
    )
  );

CREATE POLICY "caption_versions: authenticated insert"
  ON public.caption_versions FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');


-- SCHEDULED_POSTS: authenticated Ä‘á»c, owner/admin sá»­a
CREATE POLICY "scheduled_posts: authenticated read"
  ON public.scheduled_posts FOR SELECT
  USING (
    created_by = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() AND users.role IN ('admin', 'marketer_full')
    )
  );

CREATE POLICY "scheduled_posts: authenticated insert"
  ON public.scheduled_posts FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "scheduled_posts: owner or admin update"
  ON public.scheduled_posts FOR UPDATE
  USING (created_by = auth.uid() OR public.is_admin());


-- AB_TESTS + VARIANTS: authenticated Ä‘á»c/ghi
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


-- PIPELINE_RUNS: authenticated Ä‘á»c, service role ghi (pipeline cháº¡y server-side)
CREATE POLICY "pipeline_runs: authenticated read"
  ON public.pipeline_runs FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "pipeline_runs: service role write"
  ON public.pipeline_runs FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "users: update own avatars"
  ON public.users FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- LANDING PAGE CONFIGURATION & HISTORY (EPIC-07)
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

CREATE TABLE public.landing_page_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(255) NOT NULL,
    value JSONB NOT NULL,
    section VARCHAR(255) NOT NULL,
    updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_landing_page_config_key ON public.landing_page_config(key);
CREATE INDEX idx_landing_page_config_section ON public.landing_page_config(section);

CREATE TABLE public.landing_page_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_snapshot JSONB NOT NULL,
    note VARCHAR(500),
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.landing_page_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landing_page_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone" ON public.landing_page_config
    FOR SELECT USING (true);

CREATE POLICY "Admins have full access to config" ON public.landing_page_config
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.role = 'admin'
        )
    );

CREATE POLICY "Admins have full access to history" ON public.landing_page_history
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.role = 'admin'
        )
    );

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- SEED: táº¡o admin Ä‘áº§u tiĂªn
-- CĂ¡ch dĂ¹ng: Táº¡o user qua Supabase Auth trÆ°á»›c, láº¥y UUID, rá»“i cháº¡y lá»‡nh nĂ y
-- UPDATE public.users SET role = 'admin', status = 'active' WHERE email = 'your@email.com';
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€-- ============================================================
-- Migration: T?o b?ng platform_presets (L?p 1: Quy chu?n kênh)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.platform_presets (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  platform    platform_type NOT NULL UNIQUE,
  rules       TEXT          NOT NULL,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- B?t RLS
ALTER TABLE public.platform_presets ENABLE ROW LEVEL SECURITY;

-- M?i ngư?i dùng đ?u đ?c đư?c (Read-only)
CREATE POLICY "platform_presets: authenticated read"
  ON public.platform_presets FOR SELECT
  USING (auth.role() = 'authenticated');

-- Ch? Service Role (Backend) m?i đư?c ghi/s?a
CREATE POLICY "platform_presets: service role write"
  ON public.platform_presets FOR ALL
  USING (auth.role() = 'service_role');

-- Chèn d? li?u m?c đ?nh ban đ?u
INSERT INTO public.platform_presets (platform, rules) VALUES
('facebook', 'Bài vi?t cung c?p đ?y đ? thông tin, có l?i d?n d?t, chia đo?n r? ràng đ? d? đ?c. K?t thúc b?ng l?i kêu g?i hành đ?ng (Call to Action) và 3-5 hashtag.'),
('instagram', 'Bài vi?t ng?n g?n, t?p trung ch? y?u vào h?nh ?nh. Dùng nhi?u emoji bi?u c?m. Cu?i bài ph?i có 5-10 hashtag liên quan đ?n ch? đ?.'),
('thread', 'N?i dung c?c k? ng?n g?n (gi?i h?n dư?i 280 k? t?), đi th?ng vào v?n đ? chính. Hành văn mang tính tr? chuy?n, tranh lu?n m?. H?n ch? dùng quá nhi?u hashtag.')
ON CONFLICT (platform) DO UPDATE SET rules = EXCLUDED.rules;

-- ============================================================
-- Migration: Nang cap platform_presets thanh thu vien da quy chuan
-- ============================================================

-- 1. Xoa rang buoc UNIQUE cu tren cot platform (chi xoa rang buoc, khong xoa cot/du lieu)
ALTER TABLE public.platform_presets DROP CONSTRAINT IF EXISTS platform_presets_platform_key;

-- 2. Them cac cot moi voi gia tri mac dinh an toan
ALTER TABLE public.platform_presets 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT 'Máº·c Ä‘á»‹nh',
ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. Dat cac quy chuan co san lam mac dinh cua he thong
UPDATE public.platform_presets 
SET is_default = TRUE 
WHERE user_id IS NULL AND is_default = FALSE;

-- 4. Tao index UNIQUE cho quy chuan nguoi dung theo ten
CREATE UNIQUE INDEX IF NOT EXISTS unique_user_platform_preset_name 
ON public.platform_presets (user_id, platform, name);

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

-- ============================================================
-- Migration: Create gemini_api_keys table for rotation
-- ============================================================

CREATE TABLE IF NOT EXISTS public.gemini_api_keys (
  id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  key_value           TEXT            NOT NULL UNIQUE,
  label               TEXT            NOT NULL,
  status              TEXT            NOT NULL DEFAULT 'active', -- 'active' | 'rate_limited' | 'invalid'
  rate_limited_until  TIMESTAMPTZ,
  error_count         INTEGER         NOT NULL DEFAULT 0,
  last_used_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gemini_api_keys ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to SELECT (read) keys for server-side generation
CREATE POLICY "gemini_api_keys: authenticated read"
  ON public.gemini_api_keys FOR SELECT
  USING (auth.role() = 'authenticated');

-- Allow admins to perform all operations
CREATE POLICY "gemini_api_keys: admin manage"
  ON public.gemini_api_keys FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

