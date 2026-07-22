import { NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { createPostPerformanceModule } from '@/backend/modules/post-performance';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const platform = searchParams.get('platform') || 'all';

  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const postPerformanceModule = createPostPerformanceModule(supabase);
    const goldenHours = await postPerformanceModule.getGoldenHours(user.id, platform);

    return NextResponse.json({
      success: true,
      data: goldenHours,
    });
  } catch (error: any) {
    console.error('[API /api/golden-hours] Error fetching golden hours:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

