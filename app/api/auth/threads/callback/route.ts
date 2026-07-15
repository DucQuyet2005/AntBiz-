import { NextRequest } from 'next/server';
import { requireUserWithRole } from '@/lib/api/auth';
import {
  buildSocialAccountConnectionsModule,
  completeSocialConnectionResponse,
  SOCIAL_CONNECTION_ROLES,
} from '../../_social-connection-adapter';

export async function GET(request: NextRequest) {
  const { user, supabase, unauthorized } = await requireUserWithRole(SOCIAL_CONNECTION_ROLES);
  if (unauthorized) return unauthorized;
  return completeSocialConnectionResponse(
    buildSocialAccountConnectionsModule(supabase, request.nextUrl.origin),
    'threads',
    request,
    user.id
  );
}
