"use client";

import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';

export default function AdminAccessDenied() {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
      <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mb-6">
        <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h1 className="text-2xl font-black text-slate-900 mb-2">{t('admin.accessDenied')}</h1>
      <p className="text-slate-500 mb-8 max-w-md">
        {t('admin.accessDeniedDesc')}
      </p>
      <Link 
        href="/overview"
        className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-6 rounded-xl transition-colors shadow-lg shadow-slate-900/20"
      >
        {t('admin.returnDashboard')}
      </Link>
    </div>
  );
}
