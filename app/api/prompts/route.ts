import { NextRequest, NextResponse } from 'next/server';
import { createPromptSchema, promptListQuerySchema } from '@/backend/modules/prompts/prompt-schemas';
import { requireUserWithRole } from '@/lib/api/auth';
import { formatZodError } from '@/lib/api/zod-error';
import { buildPromptModule, promptActor, promptErrorResponse } from './_adapter';

const PROMPT_ROLES = ['admin', 'marketer_full', 'marketer_content'] as const;

export async function GET(request: NextRequest) {
  const { user, role, supabase, unauthorized } = await requireUserWithRole([...PROMPT_ROLES]);
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

  try {
    const result = await buildPromptModule(supabase).list(promptActor(user.id, role), parsed.data);
    return NextResponse.json({
      data: result.data,
      pagination: {
        page: parsed.data.page,
        pageSize: parsed.data.pageSize,
        total: result.total,
      },
    });
  } catch (error) {
    return promptErrorResponse(error, '[GET /api/prompts] error:');
  }
}

export async function POST(request: NextRequest) {
  const { user, role, supabase, unauthorized } = await requireUserWithRole([...PROMPT_ROLES]);
  if (unauthorized) return unauthorized;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body không phải JSON hợp lệ' }, { status: 400 });
  }

  const parsed = createPromptSchema.safeParse(body);
  if (!parsed.success) {
    console.error('[POST /api/prompts] Zod Validation Failed:', parsed.error.format(), 'Body received:', body);
    return NextResponse.json(
      { error: 'Dữ liệu không hợp lệ', details: formatZodError(parsed.error) },
      { status: 400 }
    );
  }

  try {
    const data = await buildPromptModule(supabase).create(promptActor(user.id, role), parsed.data);
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return promptErrorResponse(error, '[POST /api/prompts] error:');
  }
}
