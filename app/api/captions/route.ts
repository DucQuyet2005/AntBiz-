import { NextRequest, NextResponse } from 'next/server';
import { requireUserWithRole } from '@/lib/api/auth';
import { z } from 'zod';

const createCaptionSchema = z.object({
  article_id: z.string().uuid('article_id phải là UUID hợp lệ'),
  platform: z
    .enum(['facebook', 'thread', 'threads', 'instagram'])
    .transform((platform) => (platform === 'threads' ? 'thread' : platform)),
  ai_content: z.string().min(1, 'ai_content không được rỗng'),
  prompt_id: z.string().uuid().optional(),
  utm_config_id: z.string().uuid().optional(),
});

/**
 * POST /api/captions
 *
 * T-1.13.3 – Tạo caption mới.
 * Lưu: ai_content (bản gốc, không bao giờ ghi đè), article_id, platform, user_id.
 * ai_content = original_content (dùng cột ai_content theo schema DB).
 */
export async function POST(request: NextRequest) {
  const { user, supabase, unauthorized } = await requireUserWithRole([
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

  const parsed = createCaptionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dữ liệu không hợp lệ', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { article_id, platform, ai_content, prompt_id, utm_config_id } = parsed.data;

  const { data, error } = await supabase
    .from('captions')
    .insert({
      article_id,
      platform,
      ai_content,         // bản AI gốc – không bao giờ ghi đè
      edited_content: null,
      created_by: user.id,
      ...(prompt_id && { prompt_id }),
      ...(utm_config_id && { utm_config_id }),
      status: 'draft',
    })
    .select()
    .single();

  if (error) {
    console.error('[POST /api/captions] supabase error:', error);
    return NextResponse.json({ error: 'Không thể tạo caption' }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
