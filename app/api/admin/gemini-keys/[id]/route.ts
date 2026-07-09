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
 * PATCH /api/admin/gemini-keys/[id]
 * Update status/label of an API key (Admin only)
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createClient();
  const auth = await checkAdmin(supabase);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = await params;
    const { label, status, rate_limited_until } = await req.json();

    const updatePayload: any = {};
    if (label !== undefined) updatePayload.label = label.trim();
    if (status !== undefined) {
      updatePayload.status = status;
      if (status === 'active') {
        updatePayload.error_count = 0;
        updatePayload.rate_limited_until = null;
      }
    }
    if (rate_limited_until !== undefined) updatePayload.rate_limited_until = rate_limited_until;
    updatePayload.updated_at = new Date().toISOString();

    const { data: updatedKey, error } = await supabase
      .from('gemini_api_keys')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: updatedKey });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Lỗi xử lý dữ liệu' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/gemini-keys/[id]
 * Delete a Gemini API Key (Admin only)
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createClient();
  const auth = await checkAdmin(supabase);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  const { error } = await supabase
    .from('gemini_api_keys')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
