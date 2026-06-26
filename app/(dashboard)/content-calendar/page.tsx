import React, { Suspense } from 'react';
import ContentCalendarView from '@/components/views/ContentCalendarView';
import { Loader2 } from 'lucide-react';

export default function ContentCalendarPage() {
  return (
    <Suspense fallback={
      <div className="h-[400px] flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-primary" size={36} />
        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
          Loading Calendar...
        </span>
      </div>
    }>
      <ContentCalendarView />
    </Suspense>
  );
}
