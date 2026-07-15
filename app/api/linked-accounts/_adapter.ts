import type { SupabaseClient } from '@supabase/supabase-js';
import { createSocialAccountConnectionsModule } from '@/backend/modules/social-account-connections';
import { socialConnectionJsonErrorResponse } from '../auth/_social-connection-adapter';

export { SOCIAL_CONNECTION_ROLES } from '../auth/_social-connection-adapter';
export { socialConnectionJsonErrorResponse };

export function buildLinkedAccountConnectionsModule(
  supabase: SupabaseClient,
  requestOrigin: string
) {
  return createSocialAccountConnectionsModule(supabase, requestOrigin);
}
