import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Vì Instagram Business kết nối thông qua Facebook Page Login, 
  // chuyển hướng người dùng tới API Facebook Auth kèm theo state=instagram để nhận biết luồng.
  const origin = request.nextUrl.origin;
  return NextResponse.redirect(`${origin}/api/auth/facebook?state=instagram`);
}
