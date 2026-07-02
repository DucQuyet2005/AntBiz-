import { NextRequest, NextResponse } from 'next/server';
import { getThreadsAuthUrl } from '@/lib/threads';

export async function GET(request: NextRequest) {
  // Chỉ tạo url xác thực từ helper đã viết sẵn và redirect người dùng đi
  const authUrl = getThreadsAuthUrl();
  return NextResponse.redirect(authUrl);
}
