import { NextRequest, NextResponse } from 'next/server';
import { requireUserWithRole } from '@/lib/api/auth';
import { GoldenHoursCalculator } from '@/backend/modules/post-performance';

export async function GET(request: NextRequest) {
  const isDev = process.env.NODE_ENV === 'development';
  const bypass = isDev && request.headers.get('x-bypass-auth') === 'true';
  let supabaseClient: any;
  let userId: string | null = null;

  if (bypass) {
    const { createServiceRoleClient } = require('@/lib/api/auth');
    supabaseClient = createServiceRoleClient();
  } else {
    const { user, supabase, unauthorized } = await requireUserWithRole(['admin', 'marketer_full', 'marketer_content']);
    if (unauthorized) return unauthorized;
    supabaseClient = supabase;
    userId = user?.id || null;
  }

  try {
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform') || 'all';

    let query = supabaseClient
      .from('scheduled_posts')
      .select(`
        id,
        platform,
        posted_at,
        post_interactions (
          likes,
          comments,
          shares,
          clicks,
          reach,
          impressions
        )
      `)
      .eq('status', 'posted')
      .not('posted_at', 'is', null)
      .order('posted_at', { ascending: false })
      .limit(150);

    if (userId) {
      query = query.eq('created_by', userId);
    }

    if (platform !== 'all') {
      query = query.eq('platform', platform);
    }

    const { data: postsData, error } = await query;

    if (error) {
      console.error('[API Golden Hours] Lỗi khi đọc scheduled_posts:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const posts = (postsData || []).map((p: any) => {
      const interaction = Array.isArray(p.post_interactions)
        ? p.post_interactions[0]
        : p.post_interactions;

      return {
        postedAt: p.posted_at,
        platform: p.platform,
        interactions: interaction ? {
          likes: interaction.likes ?? 0,
          comments: interaction.comments ?? 0,
          shares: interaction.shares ?? 0,
          clicks: interaction.clicks ?? 0,
          reach: interaction.reach ?? 0,
          impressions: interaction.impressions ?? 0,
        } : undefined,
      };
    });

    const result = GoldenHoursCalculator.calculateGoldenHours(posts, platform);

    return NextResponse.json({
      success: true,
      platform: platform,
      platformName: result.platformName,
      totalPostsAnalyzed: posts.length,
      recommendation: result.recommendedBestTimeText,
      topSlots: result.topOptimalSlots,
      slots: result.slots,
    });
  } catch (err: any) {
    console.error('[API Golden Hours] Lỗi hệ thống:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
