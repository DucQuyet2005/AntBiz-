import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

async function checkAdmin(supabase: ReturnType<typeof createClient>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { authorized: false, status: 401, error: 'Unauthorized' };

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    return { authorized: false, status: 403, error: 'Forbidden' };
  }

  return { authorized: true, user };
}

/**
 * GET /api/admin/gemini-keys
 * Fetch all Gemini API Keys (Admin only)
 */
export async function GET(req: NextRequest) {
  const supabase = createClient();
  const auth = await checkAdmin(supabase);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data: keys, error } = await supabase
    .from('gemini_api_keys')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: keys });
}

/**
 * POST /api/admin/gemini-keys
 * Add a new Gemini API Key (Admin only)
 */
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const auth = await checkAdmin(supabase);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { key_value, label } = await req.json();

    if (!key_value || !key_value.trim()) {
      return NextResponse.json({ error: 'API Key không được để trống' }, { status: 400 });
    }

    if (!label || !label.trim()) {
      return NextResponse.json({ error: 'Nhãn (label) không được để trống' }, { status: 400 });
    }

    const { data: newKey, error } = await supabase
      .from('gemini_api_keys')
      .insert({
        key_value: key_value.trim(),
        label: label.trim(),
        status: 'active',
        error_count: 0
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        return NextResponse.json({ error: 'API Key này đã tồn tại trong hệ thống' }, { status: 400 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: newKey });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Lỗi xử lý dữ liệu' }, { status: 500 });
  }
}
