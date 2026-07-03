import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/api/auth';
import { getCalendarToken } from '@/lib/api/auth';

export async function GET(request: NextRequest) {
  const { user, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const token = getCalendarToken(user.id);
  return NextResponse.json({ userId: user.id, token });
}
