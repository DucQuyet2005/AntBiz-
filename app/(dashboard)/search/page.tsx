import React, { Suspense } from 'react';
import SearchView from '@/components/views/SearchView';
import { Loader2 } from 'lucide-react';

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-text-muted">
          <Loader2 className="animate-spin text-primary" size={32} />
          <p className="font-bold text-sm">Đang tải...</p>
        </div>
      }
    >
      <SearchView />
    </Suspense>
  );
}
