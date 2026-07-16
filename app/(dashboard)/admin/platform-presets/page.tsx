"use client";

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { createClient } from '@/utils/supabase/client';
import { Loader2 } from 'lucide-react';
import AdminAccessDenied from '@/app/(dashboard)/admin/AdminAccessDenied';
import PlatformPresetsTab from '@/components/views/PlatformPresetsTab';

export default function AdminPlatformPresetsPage() {
  const { language } = useLanguage();
  const supabase = createClient();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    const checkRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsAdmin(false);
        return;
      }
      const { data } = await supabase.from('users').select('role').eq('id', user.id).maybeSingle();
      setIsAdmin(data?.role === 'admin');
    };
    checkRole();
  }, [supabase]);

  if (isAdmin === null) {
    return (
      <div className="h-[60vh] w-full flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-primary w-8 h-8 mb-3" />
        <span className="text-xs font-semibold text-slate-500">
          {language === 'vi' ? 'Đang kiểm tra quyền truy cập...' : 'Loading access controls...'}
        </span>
      </div>
    );
  }

  if (isAdmin === false) {
    return <AdminAccessDenied />;
  }

  return (
    <div className="bg-white dark:bg-card/30 rounded-3xl p-6 border border-slate-200/60 dark:border-white/5 shadow-sm">
      <PlatformPresetsTab />
    </div>
  );
}
