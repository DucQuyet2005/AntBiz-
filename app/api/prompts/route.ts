import { NextRequest, NextResponse } from 'next/server';
import { requireUserWithRole } from '@/lib/api/auth';
import { formatZodError } from '@/lib/api/zod-error';
import { createPromptSchema, promptListQuerySchema } from '@/lib/validations/prompt';

// GET /api/prompts?platform=facebook&tag=ban-hang&search=tet&page=1&pageSize=20
// Theo SPEC.md: tìm theo tên, lọc theo Nền tảng và Thẻ phân loại
export async function GET(request: NextRequest) {
  const { user, role, supabase, unauthorized } = await requireUserWithRole(['admin', 'marketer_full', 'marketer_content']);
  if (unauthorized) return unauthorized;

  const searchParams = request.nextUrl.searchParams;
  const parsed = promptListQuerySchema.safeParse({
    platform: searchParams.get('platform') ?? undefined,
    tags: searchParams.get('tags') ?? undefined,
    search: searchParams.get('search') ?? undefined,
    page: searchParams.get('page') ?? undefined,
    pageSize: searchParams.get('pageSize') ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Query không hợp lệ', details: formatZodError(parsed.error) },
      { status: 400 }
    );
  }

  const { platform, tags, search, page, pageSize } = parsed.data;

  let query = supabase
    .from('prompts')
    .select('*', { count: 'exact' })
    .eq('is_deleted', false)
    .order('created_at', { ascending: false });

  if (role !== 'admin' && user) {
    query = query.eq('created_by', user.id);
  }

  if (platform) query = query.eq('platform', platform);
  if (tags) {
    const tagList = tags.split(',').map((t) => t.trim()).filter(Boolean);
    if (tagList.length > 0) {
      query = query.contains('tags', tagList);
    }
  }
  if (search) query = query.ilike('name', `%${search}%`);

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    console.error('[GET /api/prompts] supabase error:', error);
    return NextResponse.json({ error: 'Không thể tải danh sách prompt' }, { status: 500 });
  }

  return NextResponse.json({
    data,
    pagination: { page, pageSize, total: count ?? 0 },
  });
}

// POST /api/prompts — tạo Prompt mới, owner = user đang đăng nhập
export async function POST(request: NextRequest) {
  const { user, supabase, unauthorized } = await requireUserWithRole(['admin', 'marketer_full', 'marketer_content']);
  if (unauthorized) return unauthorized;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body không phải JSON hợp lệ' }, { status: 400 });
  }

  const parsed = createPromptSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dữ liệu không hợp lệ', details: formatZodError(parsed.error) },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('prompts')
    .insert({ ...parsed.data, created_by: user.id })
    .select()
    .single();

  if (error) {
    console.error('[POST /api/prompts] supabase error:', error);
    return NextResponse.json({ error: 'Không thể tạo prompt' }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}