import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Vui lòng nhập đầy đủ email và mật khẩu.' },
        { status: 400 }
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
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      session: data.session,
    });
  } catch (err: any) {
    console.error('[API Auth Login] Error:', err);
    return NextResponse.json(
      { error: 'Lỗi hệ thống khi đăng nhập.' },
      { status: 500 }
    );
  }
}
