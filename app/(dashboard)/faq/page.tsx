"use client";

import React, { Suspense } from 'react';
import FaqView from '@/components/views/FaqView';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

function FaqLoading() {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 text-text-muted">
      <Loader2 className="animate-spin text-primary" size={32} />
      <p className="font-bold text-sm">{t('common.loading')}</p>
    </div>
  );
}

export default function FAQPage() {
  return (
    <Suspense fallback={<FaqLoading />}>
      <FaqView />
    </Suspense>
  );
}
