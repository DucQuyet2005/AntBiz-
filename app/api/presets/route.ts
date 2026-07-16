import { NextRequest, NextResponse } from 'next/server';
import { requireUserWithRole } from '@/lib/api/auth';
import { formatZodError } from '@/lib/api/zod-error';
import { createPromptSchema, promptListQuerySchema } from '@/lib/validations/prompt';
import { createNotification } from '@/lib/services/notificationService';

// Alias route to existing /api/prompts but filtering for __preset__
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
    .filter('content', 'ilike', '%"__preset__": true%') // Only get presets
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
    console.error('[GET /api/presets] supabase error:', error);
    return NextResponse.json({ error: 'Không thể tải danh sách preset' }, { status: 500 });
  }

  return NextResponse.json({ data, count, page, pageSize });
}

export async function POST(request: NextRequest) {
  const { user, supabase, unauthorized } = await requireUserWithRole(['admin', 'marketer_full', 'marketer_content']);
  if (unauthorized) return unauthorized;

  try {
    const json = await request.json();
    const parsed = createPromptSchema.safeParse(json);
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dữ liệu không hợp lệ', details: formatZodError(parsed.error) },
        { status: 400 }
      );
    }

    const { name, platform, content, tags, is_default } = parsed.data;

    // Ensure content contains __preset__ flag
    let finalContent = content;
    try {
      const parsedContent = JSON.parse(content);
      if (!parsedContent.__preset__) {
        parsedContent.__preset__ = true;
        finalContent = JSON.stringify(parsedContent);
      }
    } catch {
      // Ignore parse error, assuming it's valid if coming from PresetsView
    }

    const { data, error } = await supabase
      .from('prompts')
      .insert({
        name,
        platform,
        content: finalContent,
        tags: tags || ['preset'],
        is_default: is_default ?? false,
        created_by: user!.id,
      })
      .select()
      .single();

    if (error) {
      console.error('[POST /api/presets] supabase error:', error);
      return NextResponse.json({ error: 'Không thể tạo preset mới' }, { status: 500 });
    }

    await createNotification({
      userId: user!.id,
      type: 'info',
      title: 'Tạo preset mới',
      message: `Preset "${name}" đã được tạo thành công`,
      metadata: { link: '/presets' },
    });

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error('[POST /api/presets] Error parsing body:', err);
    return NextResponse.json({ error: 'Body JSON không hợp lệ' }, { status: 400 });
  }
}
