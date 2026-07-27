import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

function getCorsHeaders(request: NextRequest) {
  const origin = request.headers.get('origin') || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  };
}

export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { headers: getCorsHeaders(request) });
}

export async function GET(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request);
  try {
    const supabase = createClient();
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session) {
      return NextResponse.json(
        { error: 'Không tìm thấy phiên đăng nhập' },
        { status: 401, headers: corsHeaders }
      );
    }

    return NextResponse.json({
      success: true,
      session: session,
    }, { headers: corsHeaders });
  } catch (err: any) {
    console.error('[API Auth Session] Error:', err);
    return NextResponse.json(
      { error: 'Lỗi hệ thống khi lấy phiên đăng nhập.' },
      { status: 500, headers: corsHeaders }
    );
  }
}
