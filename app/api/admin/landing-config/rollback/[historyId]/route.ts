import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ historyId: string }> }
) {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if user is admin
  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!userData || userData.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  try {
    const { historyId } = await params;
    if (!historyId) {
      return NextResponse.json({ error: 'Missing history ID' }, { status: 400 });
    }

    // 1. Fetch the snapshot
    const { data: historyRecord, error: fetchError } = await supabase
      .from('landing_page_history')
      .select('config_snapshot')
      .eq('id', historyId)
      .single();

    if (fetchError || !historyRecord) {
      return NextResponse.json({ error: 'History record not found' }, { status: 404 });
    }

    const snapshot = historyRecord.config_snapshot as Record<string, Record<string, any>>;

    // 2. Clear current config (truncate or delete all)
    // Supabase JS doesn't have truncate, so we delete all rows
    const { error: deleteError } = await supabase
      .from('landing_page_config')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Dummy condition to delete all

    if (deleteError) throw deleteError;

    // 3. Insert from snapshot
    const insertData = [];
    for (const section in snapshot) {
      for (const key in snapshot[section]) {
        insertData.push({
          section,
          key,
          value: snapshot[section][key],
          updated_by: user.id
        });
      }
    }

    if (insertData.length > 0) {
      const { error: insertError } = await supabase
        .from('landing_page_config')
        .insert(insertData);
      
      if (insertError) throw insertError;
    }

    // 4. Invalidate cache
    revalidatePath('/', 'page');

    return NextResponse.json({ success: true, message: 'Rollback successful' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
