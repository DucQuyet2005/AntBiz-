import React from 'react';
import LandingView from '@/components/views/LandingView';
import { createLandingConfigurationModule } from '@/backend/modules/landing-configuration/landing-configuration-factory';
import type { LandingConfigurationSnapshot } from '@/backend/modules/landing-configuration/landing-configuration-types';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function RootHome({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const params = await searchParams;
  const isPreview = params?.preview === 'true';

  if (user && !isPreview) {
    redirect('/overview');
  }

  let config: LandingConfigurationSnapshot = {};
  try {
    config = await createLandingConfigurationModule(supabase).readPublicConfiguration();
  } catch {
    console.error('[Landing Configuration]', {
      operation: 'render public page',
      code: 'PUBLIC_READ_FAILED',
    });
  }

  return <LandingView initialConfig={config} isPreview={isPreview} />;
}
