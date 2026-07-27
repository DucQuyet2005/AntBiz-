import { NextRequest, NextResponse } from 'next/server';
import {
  createGlobalSearchModule,
  GlobalSearchError,
  GlobalSearchRepositoryError,
} from '@/backend/modules/global-search';
import { requireUserWithRole } from '@/lib/api/auth';

const ALLOWED_ROLES = ['admin', 'marketer_full', 'marketer_content'] as const;

export async function GET(request: NextRequest) {
  const { user, role, supabase, unauthorized } = await requireUserWithRole([...ALLOWED_ROLES]);
  if (unauthorized) return unauthorized;

  try {
    const search = createGlobalSearchModule(supabase);
    const result = await search.search({
      query: request.nextUrl.searchParams.get('q'),
      language: request.nextUrl.searchParams.get('lang'),
      actor: { id: user.id, role },
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof GlobalSearchError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof GlobalSearchRepositoryError) {
      console.error(`[GET /api/search] repository operation failed: ${error.operation}`);
    } else {
      console.error('[GET /api/search] unexpected search failure');
    }
    return NextResponse.json(
      { error: 'Không thể thực hiện tìm kiếm toàn cục' },
      { status: 500 }
    );
  }
}
