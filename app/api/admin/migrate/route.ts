import { NextRequest, NextResponse } from 'next/server';
import { requireUserWithRole } from '@/lib/api/auth';
import { createClient } from '@supabase/supabase-js';

function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const MIGRATIONS = [
  {
    id: 'us2_09_author_profiles',
    description: 'Tạo bảng author_profiles và thêm cột author_profile_id vào captions',
    checkSql: `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'author_profiles') as exists`,
    migrationSql: `
      CREATE TABLE IF NOT EXISTS public.author_profiles (
        id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id         UUID            NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        name            TEXT            NOT NULL,
        source_url      TEXT,
        sample_posts    TEXT[]          NOT NULL DEFAULT '{}',
        tuned_model_id  TEXT,
        tuning_status   TEXT            NOT NULL DEFAULT 'pending',
        created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
        updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_author_profiles_user_id ON public.author_profiles(user_id);
      ALTER TABLE public.author_profiles ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS "author_profiles: owner read" ON public.author_profiles;
      CREATE POLICY "author_profiles: owner read" ON public.author_profiles FOR SELECT USING (user_id = auth.uid() OR public.is_admin());
      DROP POLICY IF EXISTS "author_profiles: owner insert" ON public.author_profiles;
      CREATE POLICY "author_profiles: owner insert" ON public.author_profiles FOR INSERT WITH CHECK (auth.role() = 'authenticated');
      DROP POLICY IF EXISTS "author_profiles: owner update" ON public.author_profiles;
      CREATE POLICY "author_profiles: owner update" ON public.author_profiles FOR UPDATE USING (user_id = auth.uid() OR public.is_admin());
      DROP POLICY IF EXISTS "author_profiles: owner delete" ON public.author_profiles;
      CREATE POLICY "author_profiles: owner delete" ON public.author_profiles FOR DELETE USING (user_id = auth.uid() OR public.is_admin());
      ALTER TABLE public.captions ADD COLUMN IF NOT EXISTS author_profile_id UUID REFERENCES public.author_profiles(id) ON DELETE SET NULL;
      CREATE INDEX IF NOT EXISTS idx_captions_author_profile_id ON public.captions(author_profile_id);
    `,
  },
  {
    id: 'platform_presets',
    description: 'Tạo bảng platform_presets và các chỉ mục liên quan',
    checkSql: `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'platform_presets') as exists`,
    migrationSql: `
      CREATE TABLE IF NOT EXISTS public.platform_presets (
        id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
        platform    platform_type NOT NULL,
        rules       TEXT          NOT NULL,
        user_id     UUID          REFERENCES public.users(id) ON DELETE CASCADE,
        name        TEXT          NOT NULL DEFAULT 'Mặc định',
        is_default  BOOLEAN       NOT NULL DEFAULT FALSE,
        created_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
        updated_at  TIMESTAMPTZ   NOT NULL DEFAULT now()
      );
      ALTER TABLE public.platform_presets ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS "platform_presets: authenticated read" ON public.platform_presets;
      CREATE POLICY "platform_presets: authenticated read" ON public.platform_presets FOR SELECT USING (auth.role() = 'authenticated');
      DROP POLICY IF EXISTS "platform_presets: service role write" ON public.platform_presets;
      CREATE POLICY "platform_presets: service role write" ON public.platform_presets FOR ALL USING (auth.role() = 'service_role');
      DROP POLICY IF EXISTS "platform_presets: authenticated modify own" ON public.platform_presets;
      CREATE POLICY "platform_presets: authenticated modify own" ON public.platform_presets FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
      CREATE UNIQUE INDEX IF NOT EXISTS unique_user_platform_preset_name ON public.platform_presets (user_id, platform, name);
      CREATE UNIQUE INDEX IF NOT EXISTS unique_system_platform_preset_name ON public.platform_presets (platform, name) WHERE user_id IS NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS unique_user_default_platform_preset ON public.platform_presets (user_id, platform) WHERE (is_default = TRUE AND user_id IS NOT NULL);
      CREATE UNIQUE INDEX IF NOT EXISTS unique_system_default_platform_preset ON public.platform_presets (platform) WHERE (is_default = TRUE AND user_id IS NULL);
      INSERT INTO public.platform_presets (platform, rules, is_default) VALUES
      ('facebook', 'Bài viết cung cấp đầy đủ thông tin, có lời dẫn dắt, chia đoạn rõ ràng để dễ đọc. Kết thúc bằng lời kêu gọi hành động (Call to Action) và 3-5 hashtag.', true),
      ('instagram', 'Bài viết ngắn gọn, tập trung chủ yếu vào hình ảnh. Dùng nhiều emoji biểu cảm. Cuối bài phải có 5-10 hashtag liên quan đến chủ đề.', true),
      ('thread', 'Nội dung cực kỳ ngắn gọn (giới hạn dưới 280 ký tự), đi thẳng vào vấn đề chính. Hành văn mang tính trò chuyện, tranh luận mở. Hạn chế dùng quá nhiều hashtag.', true)
      ON CONFLICT DO NOTHING;
    `,
  },
  {
    id: 'post_interactions',
    description: 'Tạo bảng post_interactions và seed dữ liệu ngẫu nhiên cho các bài đã đăng',
    checkSql: `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'post_interactions') as exists`,
    migrationSql: `
      CREATE TABLE IF NOT EXISTS public.post_interactions (
        id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
        post_id         UUID            NOT NULL UNIQUE REFERENCES public.scheduled_posts(id) ON DELETE CASCADE,
        likes           INTEGER         NOT NULL DEFAULT 0,
        comments        INTEGER         NOT NULL DEFAULT 0,
        shares          INTEGER         NOT NULL DEFAULT 0,
        clicks          INTEGER         NOT NULL DEFAULT 0,
        reach           INTEGER         NOT NULL DEFAULT 0,
        impressions     INTEGER         NOT NULL DEFAULT 0,
        updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_post_interactions_post_id ON public.post_interactions(post_id);
      ALTER TABLE public.post_interactions ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS "post_interactions: authenticated read" ON public.post_interactions;
      CREATE POLICY "post_interactions: authenticated read" ON public.post_interactions FOR SELECT USING (auth.role() = 'authenticated');
      DROP POLICY IF EXISTS "post_interactions: service role write" ON public.post_interactions;
      CREATE POLICY "post_interactions: service role write" ON public.post_interactions FOR ALL USING (auth.role() = 'service_role');
      
      INSERT INTO public.post_interactions (post_id, likes, comments, shares, clicks, reach, impressions)
      SELECT 
        id, 
        floor(random() * 491 + 10)::int as likes,
        floor(random() * 99 + 2)::int as comments,
        floor(random() * 46 + 5)::int as shares,
        floor(random() * 191 + 10)::int as clicks,
        floor(random() * 951 + 50)::int as reach,
        floor(random() * 1901 + 100)::int as impressions
      FROM public.scheduled_posts
      WHERE status = 'posted'
      ON CONFLICT (post_id) DO NOTHING;
    `,
  },
  {
    id: 'add_trigger_source_to_scheduled_posts',
    description: 'Bổ sung cột trigger_source vào bảng scheduled_posts',
    checkSql: `SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'scheduled_posts' AND column_name = 'trigger_source') as exists`,
    migrationSql: `
      ALTER TABLE public.scheduled_posts ADD COLUMN IF NOT EXISTS trigger_source TEXT;
    `,
  },
  {
    id: 'add_notification_settings',
    description: 'Thêm cài đặt thông báo và email cho người dùng (email_on_success, email_sent)',
    checkSql: `SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'email_on_success') as exists`,
    migrationSql: `
      ALTER TABLE public.users 
        ADD COLUMN IF NOT EXISTS email_on_success BOOLEAN NOT NULL DEFAULT TRUE,
        ADD COLUMN IF NOT EXISTS email_on_failure BOOLEAN NOT NULL DEFAULT TRUE,
        ADD COLUMN IF NOT EXISTS email_digest_enabled BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS email_digest_time VARCHAR(5) NOT NULL DEFAULT '18:00',
        ADD COLUMN IF NOT EXISTS last_digest_sent_at TIMESTAMPTZ DEFAULT NULL;

      ALTER TABLE public.notifications 
        ADD COLUMN IF NOT EXISTS email_sent BOOLEAN NOT NULL DEFAULT FALSE;

      CREATE INDEX IF NOT EXISTS idx_notifications_email_sent 
        ON public.notifications(user_id, email_sent) 
        WHERE email_sent = FALSE;
    `,
  },
];

/**
 * POST /api/admin/migrate
 * Tự động chạy các migration SQL còn thiếu (chỉ dành cho admin).
 * Sử dụng Supabase Management API với SUPABASE_ACCESS_TOKEN.
 */
export async function POST(request: NextRequest) {
  try {
    const { user, unauthorized } = await requireUserWithRole(['admin']);
    if (unauthorized) return unauthorized;

    const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
    if (!accessToken) {
      return NextResponse.json(
        {
          error: 'Thiếu SUPABASE_ACCESS_TOKEN trong .env.local. Bạn cần lấy token tại: https://supabase.com/dashboard/account/tokens và thêm vào file .env.local',
          hint: 'Thêm dòng: SUPABASE_ACCESS_TOKEN=your_token_here',
        },
        { status: 501 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
    if (!projectRef) {
      return NextResponse.json({ error: 'Không thể xác định project ref từ SUPABASE_URL' }, { status: 500 });
    }

    const results: Array<{ id: string; description: string; status: string; error?: string }> = [];

    for (const migration of MIGRATIONS) {
      try {
        // Chạy SQL qua Supabase Management API
        const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query: migration.migrationSql }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ message: res.statusText }));
          results.push({ id: migration.id, description: migration.description, status: 'error', error: JSON.stringify(err) });
        } else {
          results.push({ id: migration.id, description: migration.description, status: 'success' });
        }
      } catch (err: any) {
        results.push({ id: migration.id, description: migration.description, status: 'error', error: err.message });
      }
    }

    const allSuccess = results.every((r) => r.status === 'success');
    return NextResponse.json({ results, allSuccess }, { status: allSuccess ? 200 : 207 });
  } catch (error: any) {
    console.error('[POST Admin Migrate Error]:', error);
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}

/**
 * GET /api/admin/migrate
 * Kiểm tra trạng thái các migration (chỉ dành cho admin).
 */
export async function GET() {
  try {
    const { unauthorized } = await requireUserWithRole(['admin']);
    if (unauthorized) return unauthorized;

    const supabase = createServiceClient();
    const status: Array<{ id: string; description: string; exists: boolean }> = [];

    for (const migration of MIGRATIONS) {
      let exists = false;
      if (migration.id === 'add_notification_settings') {
        const { data } = await supabase
          .from('information_schema.columns' as any)
          .select('column_name')
          .eq('table_schema', 'public')
          .eq('table_name', 'users')
          .eq('column_name', 'email_on_success')
          .maybeSingle();
        exists = !!data;
      } else {
        let tableName = '';
        if (migration.id === 'us2_09_author_profiles') tableName = 'author_profiles';
        else if (migration.id === 'platform_presets') tableName = 'platform_presets';
        else if (migration.id === 'post_interactions') tableName = 'post_interactions';

        const { data } = await supabase
          .from('information_schema.tables' as any)
          .select('table_name')
          .eq('table_schema', 'public')
          .eq('table_name', tableName)
          .maybeSingle();
        exists = !!data;
      }

      status.push({
        id: migration.id,
        description: migration.description,
        exists,
      });
    }

    return NextResponse.json({ status });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}
