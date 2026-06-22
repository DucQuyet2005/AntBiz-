import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify Admin Role
  const { data: adminProfile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!adminProfile || adminProfile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  if (id === user.id) {
    return NextResponse.json({ error: 'Cannot change your own status' }, { status: 400 });
  }

  let body;
  try {
    body = await req.json();
  } catch (e) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { status, locked_reason } = body;
  if (!status || !['active', 'locked', 'pending'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status provided' }, { status: 400 });
  }

  if (status === 'locked' && (!locked_reason || locked_reason.length < 10)) {
    return NextResponse.json({ error: 'A valid reason (min 10 chars) is required to lock an account' }, { status: 400 });
  }

  // Get current user status to log the change
  const { data: targetUser, error: fetchError } = await supabase
    .from('users')
    .select('status, locked_reason')
    .eq('id', id)
    .single();

  if (fetchError || !targetUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const oldStatus = targetUser.status;

  // Update status
  const updatePayload: any = { status };
  if (status === 'locked') {
    updatePayload.locked_reason = locked_reason;
    updatePayload.locked_at = new Date().toISOString();
    updatePayload.locked_by = user.id;
  } else {
    updatePayload.locked_reason = null;
    updatePayload.locked_at = null;
    updatePayload.locked_by = null;
  }

  const { error: updateError } = await supabase
    .from('users')
    .update(updatePayload)
    .eq('id', id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Insert audit log
  await supabase.from('audit_logs').insert({
    actor_id: user.id,
    target_user_id: id,
    action: status === 'locked' ? 'lock_account' : 'unlock_account',
    before_value: { status: oldStatus },
    after_value: { status: status, reason: locked_reason || null },
  });

  return NextResponse.json({ success: true, message: 'Status updated successfully' });
}
