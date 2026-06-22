import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify Admin Role
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action') || 'all';
  const fromDate = searchParams.get('from');
  const toDate = searchParams.get('to');
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  
  const offset = (page - 1) * limit;

  // We need to fetch audit logs, and join with the actor user email if possible.
  // In Supabase, if foreign keys are set up, we can do 'actor_id(email)'
  let query = supabase.from('audit_logs').select(`
    id,
    action,
    before_value,
    after_value,
    created_at,
    target_user_id,
    actor_id,
    actor:users!audit_logs_actor_id_fkey(email),
    target:users!audit_logs_target_user_id_fkey(email)
  `, { count: 'exact' });

  if (action !== 'all') {
    query = query.eq('action', action);
  }
  if (fromDate) {
    query = query.gte('created_at', fromDate);
  }
  if (toDate) {
    query = query.lte('created_at', toDate);
  }

  const { data: logs, count, error } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Flatten the relation response slightly to make frontend consumption easier
  const formattedLogs = logs?.map(log => ({
    id: log.id,
    action: log.action,
    before_value: log.before_value,
    after_value: log.after_value,
    created_at: log.created_at,
    actor_email: log.actor && typeof log.actor === 'object' && !Array.isArray(log.actor) ? (log.actor as any).email : 'System',
    target_email: log.target && typeof log.target === 'object' && !Array.isArray(log.target) ? (log.target as any).email : 'Unknown',
  }));

  return NextResponse.json({
    data: formattedLogs,
    meta: {
      total: count || 0,
      page,
      limit,
      totalPages: count ? Math.ceil(count / limit) : 0,
    }
  });
}
