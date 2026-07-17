import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

export async function POST() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const adminClient = createAdminClient();
    const { data: userData, error: selectError } = await adminClient
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (selectError || !userData) {
      return NextResponse.json({ error: 'User not found in database' }, { status: 404 });
    }

    const newRole = userData.role === 'admin' ? 'marketer_full' : 'admin';

    const { error: updateError } = await adminClient
      .from('users')
      .update({ role: newRole })
      .eq('id', user.id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ success: true, role: newRole });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
