import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/api/auth';
import { completeABTest } from '@/lib/services/abTestService';

// POST /api/ab-tests/complete - Hoàn thành kiểm thử A/B Test (chọn winner và tạo thông báo)
export async function POST(request: NextRequest) {
  // Cho phép gọi bằng session user thông thường hoặc bằng service_role
  const authHeader = request.headers.get('authorization');
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const isServiceRole = serviceRoleKey && authHeader === `Bearer ${serviceRoleKey}`;

  if (!isServiceRole) {
    const { unauthorized } = await requireUser();
    if (unauthorized) return unauthorized;
  }

  try {
    const body = await request.json();
    const { abTestId } = body;

    if (!abTestId) {
      return NextResponse.json({ error: 'Thiếu abTestId' }, { status: 400 });
    }

    const result = await completeABTest(abTestId);
    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    console.error('[POST /api/ab-tests/complete] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
