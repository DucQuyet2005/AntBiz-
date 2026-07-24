import { createServiceRoleClient } from '@/lib/api/auth';
import { createScheduledPublishingModule } from '@/backend/modules/scheduled-publishing/scheduled-publishing-factory';
import { createPostPerformanceModule } from '@/backend/modules/post-performance/post-performance-factory';

export async function runSchedulerCycle() {
  return createScheduledPublishingModule(createServiceRoleClient()).runPublicationCycle();
}

export async function runPerformanceSyncCycle() {
  const results = await createPostPerformanceModule(createServiceRoleClient()).syncAllPerformance();
  let attempted = 0;
  let succeeded = 0;
  for (const key of Object.keys(results)) {
    attempted += (results as any)[key].attempted || 0;
    succeeded += (results as any)[key].succeeded || 0;
  }
  return { attempted, succeeded };
}

export function initScheduler() {
  const globalRef = global as typeof globalThis & {
    schedulerInterval?: ReturnType<typeof setInterval>;
    isSchedulerInitialized?: boolean;
  };
  if (globalRef.schedulerInterval) clearInterval(globalRef.schedulerInterval);
  globalRef.schedulerInterval = setInterval(async () => {
    try { await runSchedulerCycle(); }
    catch (error) { console.error('[Scheduler] Scheduler cycle failed:', error); }
  }, 60_000);
  globalRef.isSchedulerInitialized = true;
}

