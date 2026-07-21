import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { InstagramGoldenHoursCalculator } from '@/backend/modules/post-performance';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Truy vấn các bài đăng Instagram của user đi kèm chỉ số tương tác
    const { data: postsData, error } = await supabase
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
      .eq('created_by', user.id)
      .eq('platform', 'instagram')
      .eq('status', 'posted')
      .not('posted_at', 'is', null)
      .order('posted_at', { ascending: false })
      .limit(100);

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

    const result = InstagramGoldenHoursCalculator.calculateGoldenHours(posts);

    return NextResponse.json({
      success: true,
      platform: 'instagram',
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
