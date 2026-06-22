"use client";

import { usePathname } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';

export default function AdminHeaderTabs() {
  const pathname = usePathname();
  const { t } = useLanguage();

  if (pathname === '/admin/landing-editor') {
    return null;
  }

  const isAuditLogs = pathname === '/admin/audit-logs';
  const title = isAuditLogs ? t('admin.auditLogs') : t('admin.userManagement');
  const desc = isAuditLogs ? t('admin.systemLogsDesc') : t('admin.consoleDesc');

  return (
    <div className="mb-8">
      <h1 className="text-3xl font-black text-slate-900 tracking-tight">{title}</h1>
      <p className="text-sm text-slate-500 mt-1">{desc}</p>
    </div>
  );
}
