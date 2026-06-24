"use client";

import React, { Suspense } from 'react';
import SearchView from '@/components/views/SearchView';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

function SearchLoading() {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 text-text-muted">
      <Loader2 className="animate-spin text-primary" size={32} />
      <p className="font-bold text-sm">{t('common.loading')}</p>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchLoading />}>
      <SearchView />
    </Suspense>
  );
}
