import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { createNotification } from '@/lib/services/notificationService';

export async function POST(request: Request) {
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
    const body = await request.json();
    const note = body?.note || 'Published changes';

    // 1. Fetch current config
    const { data: currentConfig, error: fetchError } = await supabase
      .from('landing_page_config')
      .select('key, value, section');

    if (fetchError) throw fetchError;

    // 2. Format it into a JSON snapshot
    // We will group it by section for easier rolling back and rendering
    const snapshot: Record<string, Record<string, any>> = {};
    currentConfig.forEach(item => {
      if (!snapshot[item.section]) {
        snapshot[item.section] = {};
      }
      snapshot[item.section][item.key] = item.value;
    });

    // 3. Save to history
    const { data: historyRecord, error: historyError } = await supabase
      .from('landing_page_history')
      .insert({
        config_snapshot: snapshot,
        note,
        created_by: user.id
      })
      .select()
      .single();

    if (historyError) throw historyError;

    // 4. Invalidate the public landing page cache
    revalidatePath('/', 'page');

    // Gửi thông báo in-app tới toàn bộ Admin
    try {
      const { data: admins } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'admin');
      
      if (admins) {
        const title = 'Landing Page đã được xuất bản';
        const message = `Admin ${user.email || 'hệ thống'} đã xuất bản một phiên bản Landing Page mới với ghi chú: "${note}".`;
        
        for (const admin of admins) {
          await createNotification({
            userId: admin.id,
            type: 'info',
            title,
            message,
            metadata: {
              history_id: historyRecord.id,
              action_by: user.id,
              note,
            }
          });
        }
      }
    } catch (notifErr: any) {
      console.error('[Publish API] Lỗi khi tạo thông báo in-app cho admin:', notifErr.message);
    }

    return NextResponse.json({ success: true, history: historyRecord });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
