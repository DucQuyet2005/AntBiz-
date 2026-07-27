import { NextRequest } from 'next/server';
import { requireUserWithRole } from '@/lib/api/auth';
import {
  beginSocialConnectionResponse,
  buildSocialAccountConnectionsModule,
  SOCIAL_CONNECTION_ROLES,
} from '../_social-connection-adapter';

export async function GET(request: NextRequest) {
  const { user, supabase, unauthorized } = await requireUserWithRole(SOCIAL_CONNECTION_ROLES);
  if (unauthorized) return unauthorized;
  return beginSocialConnectionResponse(
    buildSocialAccountConnectionsModule(supabase, request.nextUrl.origin),
    'threads',
    user.id
  );
}
