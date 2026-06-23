import React, { Suspense } from 'react';
import FaqView from '@/components/views/FaqView';
import { Loader2 } from 'lucide-react';

export default function FAQPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-text-muted">
          <Loader2 className="animate-spin text-primary" size={32} />
          <p className="font-bold text-sm">Đang tải...</p>
        </div>
      }
    >
      <FaqView />
    </Suspense>
  );
}
