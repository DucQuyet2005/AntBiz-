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
      ('facebook', 'Phát triển câu chuyện chi tiết, phân tích sâu sắc các khía cạnh. Cấu trúc rõ ràng: Hook -> Body -> CTA -> 3-5 hashtag. LƯU Ý ĐỘ DÀI: Khoảng 400 - 500 từ (Nếu có Yêu cầu bổ sung quy định số từ cụ thể, hãy BẮT BUỘC tuân thủ theo Yêu cầu bổ sung).', true),
      ('instagram', 'Phát triển câu chuyện súc tích, hình ảnh hóa hoặc cảm xúc hóa nội dung. Cấu trúc: Hook -> Body -> CTA -> 5-10 hashtag. LƯU Ý ĐỘ DÀI: Ngắn gọn, khoảng 100 từ (Nếu có Yêu cầu bổ sung quy định số từ cụ thể, hãy BẮT BUỘC tuân thủ, nhưng TUYỆT ĐỐI KHÔNG vượt quá 2200 ký tự).', true),
      ('thread', 'Đưa ra quan điểm nhanh, đi thẳng vào vấn đề. Hành văn mang tính trò chuyện, tranh luận mở. Hạn chế dùng hashtag. LƯU Ý ĐỘ DÀI: Khoảng 30 từ, tối đa 2 câu (Nếu có Yêu cầu bổ sung quy định số từ cụ thể, hãy BẮT BUỘC tuân thủ, nhưng TUYỆT ĐỐI KHÔNG vượt quá 500 ký tự).', true)
      ON CONFLICT DO NOTHING;
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
      const tableName = migration.id === 'us2_09_author_profiles' ? 'author_profiles' : 'platform_presets';
      const { data } = await supabase
        .from('information_schema.tables' as any)
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_name', tableName)
        .maybeSingle();

      status.push({
        id: migration.id,
        description: migration.description,
        exists: !!data,
      });
    }

    return NextResponse.json({ status });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}
