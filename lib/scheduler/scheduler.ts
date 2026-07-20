import { createServiceRoleClient } from '@/lib/api/auth';
import { createScheduledPublishingModule } from '@/backend/modules/scheduled-publishing/scheduled-publishing-factory';
import { createPostPerformanceModule } from '@/backend/modules/post-performance/post-performance-factory';

export async function runSchedulerCycle() {
  return createScheduledPublishingModule(createServiceRoleClient()).runPublicationCycle();
}

export async function runPerformanceSyncCycle() {
  return createPostPerformanceModule(createServiceRoleClient()).syncFacebookPerformance();
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

