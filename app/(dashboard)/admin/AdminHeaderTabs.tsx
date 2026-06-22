"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';

export default function AdminHeaderTabs() {
  const pathname = usePathname();
  const { t } = useLanguage();

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">{t('admin.console')}</h1>
        <p className="text-sm text-slate-500 mt-1">{t('admin.consoleDesc')}</p>
      </div>
      
      {/* Admin Tabs Navigation */}
      <div className="flex items-center gap-6 border-b border-slate-200 mb-6">
        <Link 
          href="/admin/users" 
          className={`pb-4 font-bold text-sm transition-colors ${pathname === '/admin/users' ? 'text-primary border-b-2 border-primary' : 'text-slate-500 hover:text-slate-900'}`}
        >
          {t('admin.userManagement')}
        </Link>
        <Link 
          href="/admin/audit-logs" 
          className={`pb-4 font-bold text-sm transition-colors ${pathname === '/admin/audit-logs' ? 'text-primary border-b-2 border-primary' : 'text-slate-500 hover:text-slate-900'}`}
        >
          {t('admin.auditLogs')}
        </Link>
      </div>
    </>
  );
}
