import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

function getCorsHeaders(request: NextRequest) {
  const origin = request.headers.get('origin') || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  };
}

export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { headers: getCorsHeaders(request) });
}

export async function POST(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request);
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Vui lòng nhập đầy đủ email và mật khẩu.' },
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message || 'Tên đăng nhập hoặc mật khẩu không chính xác.' },
        { status: 401, headers: corsHeaders }
      );
    }

    const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0] || '';
    return NextResponse.json({
      success: true,
      session: data.session,
      projectRef,
    }, { headers: corsHeaders });
  } catch (err: any) {
    console.error('[API Auth Login] Error:', err);
    return NextResponse.json(
      { error: 'Lỗi hệ thống khi đăng nhập.' },
      { status: 500, headers: corsHeaders }
    );
  }
}
