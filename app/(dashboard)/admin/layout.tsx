import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import AdminHeaderTabs from './AdminHeaderTabs';
import AdminAccessDenied from './AdminAccessDenied';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  // Fetch user role from public.users table
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    // If not admin, return a 403-like UI or redirect
    return <AdminAccessDenied />;
  }

  return (
    <div className="w-full flex flex-col min-h-0 h-full">
      <AdminHeaderTabs />

      <div className="flex-1 min-h-0">
        {children}
      </div>
    </div>
  );
}
