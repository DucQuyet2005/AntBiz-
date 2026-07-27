import { NextRequest, NextResponse } from 'next/server';
import { createUserAccessAdministrationModule } from '@/backend/modules/user-access-administration/user-access-administration-factory';
import { requireUserWithRole } from '@/lib/api/auth';
import { userAccessErrorResponse } from '../../route-errors';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, user, unauthorized } = await requireUserWithRole(['admin']);
  if (unauthorized) return unauthorized;
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Nội dung yêu cầu không hợp lệ' }, { status: 400 });
  }

  try {
    const { id } = await params;
    const result = await createUserAccessAdministrationModule(supabase).assignRole(
      { id: user.id, email: user.email || null },
      id,
      body
    );
    return NextResponse.json({
      success: true,
      message: 'Role updated successfully',
      ...(result.unchanged ? { unchanged: true } : {}),
    });
  } catch (error) {
    return userAccessErrorResponse(error, 'Không thể cập nhật vai trò người dùng');
  }
}
