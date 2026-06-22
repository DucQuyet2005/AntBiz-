import { NextRequest, NextResponse } from 'next/server';
import { requireUserWithRole } from '@/lib/api/auth';
import { z } from 'zod';

const createVersionSchema = z.object({
  article_id: z.string().uuid('article_id phải là UUID hợp lệ'),
  platform: z
    .enum(['facebook', 'thread', 'threads', 'instagram'])
    .transform((platform) => (platform === 'threads' ? 'thread' : platform)),
  content: z.string().min(1, 'content không được rỗng'),
  source: z.enum(['ai', 'human']),
});

/**
 * POST /api/captions/versions
 *
 * Lưu một phiên bản caption mới vào caption_versions khi chưa đăng bài.
 */
export async function POST(request: NextRequest) {
  const { supabase, unauthorized } = await requireUserWithRole([
    'admin',
    'marketer_full',
    'marketer_content',
  ]);
  if (unauthorized) return unauthorized;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body không phải JSON hợp lệ' }, { status: 400 });
  }

  const parsed = createVersionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dữ liệu không hợp lệ', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { article_id, platform, content, source } = parsed.data;

  // Tìm version_number lớn nhất hiện tại cho article + platform này (nơi caption_id IS NULL)
  const { data: existingVersions, error: readError } = await supabase
    .from('caption_versions')
    .select('version_number')
    .eq('article_id', article_id)
    .eq('platform', platform)
    .is('caption_id', null)
    .order('version_number', { ascending: false })
    .limit(1);

  if (readError) {
    console.error('[POST /api/captions/versions] read error:', readError);
    return NextResponse.json({ error: 'Không thể đọc phiên bản hiện tại' }, { status: 500 });
  }

  const nextVersionNumber = existingVersions && existingVersions.length > 0
    ? (existingVersions[0].version_number || 0) + 1
    : 1;

  // Ghi vào bảng caption_versions
  const { data, error } = await supabase
    .from('caption_versions')
    .insert({
      article_id,
      platform,
      version_number: nextVersionNumber,
      content,
      source,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('[POST /api/captions/versions] insert error:', error);
    return NextResponse.json({ error: 'Không thể lưu phiên bản caption' }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
