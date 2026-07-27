import { NextRequest, NextResponse } from 'next/server';
import { createUserAccessAdministrationModule } from '@/backend/modules/user-access-administration/user-access-administration-factory';
import { requireUserWithRole } from '@/lib/api/auth';
import { userAccessErrorResponse } from './route-errors';

export async function GET(request: NextRequest) {
  const { supabase, unauthorized } = await requireUserWithRole(['admin']);
  if (unauthorized) return unauthorized;

  const searchParams = request.nextUrl.searchParams;
  try {
    const result = await createUserAccessAdministrationModule(supabase).listUsers({
      search: searchParams.get('search'),
      role: searchParams.get('role'),
      status: searchParams.get('status'),
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
    });
    return NextResponse.json(result);
  } catch (error) {
    return userAccessErrorResponse(error, 'Không thể tải danh sách người dùng');
  }
}
