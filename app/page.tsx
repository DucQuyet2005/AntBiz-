import React from 'react';
import LandingView from '@/components/views/LandingView';
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

  // Fetch live config
  const { data: configData } = await supabase
    .from('landing_page_config')
    .select('key, value, section');

  const config: Record<string, Record<string, any>> = {};
  if (configData) {
    configData.forEach(item => {
      if (!config[item.section]) config[item.section] = {};
      config[item.section][item.key] = item.value;
    });
  }

  return <LandingView initialConfig={config} isPreview={isPreview} />;
}
