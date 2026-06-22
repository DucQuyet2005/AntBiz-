import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// This route must be dynamic if we want it to respond immediately to changes,
// but since we are using revalidatePath('/'), Next.js cache handles it.
export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createClient();
  
  // Public access, no auth check needed
  const { data, error } = await supabase
    .from('landing_page_config')
    .select('key, value, section');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Format into a structured JSON for easier consumption
  const config: Record<string, Record<string, any>> = {};
  data.forEach(item => {
    if (!config[item.section]) {
      config[item.section] = {};
    }
    config[item.section][item.key] = item.value;
  });

  return NextResponse.json(config);
}
