import type { SupabaseClient } from '@supabase/supabase-js';
import { ScheduledPublishingModule } from './scheduled-publishing-module';
import { SupabaseScheduledPublishingRepository } from './scheduled-publishing-repository';
import { ProductionSocialPublisher } from './social-publisher-adapter';
import { ProductionPublicationNotifier } from './publication-notifier-adapter';

export function createScheduledPublishingModule(supabase: SupabaseClient) {
  return new ScheduledPublishingModule(
    new SupabaseScheduledPublishingRepository(supabase),
    new ProductionSocialPublisher(),
    new ProductionPublicationNotifier()
  );
}
