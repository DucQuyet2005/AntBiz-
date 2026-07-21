import { NextRequest, NextResponse } from 'next/server';
import { requireUserWithRole } from '@/lib/api/auth';

export async function GET(request: NextRequest) {
  const isDev = process.env.NODE_ENV === 'development';
  const bypass = isDev && request.headers.get('x-bypass-auth') === 'true';
  let supabaseClient: any;

  if (bypass) {
    const { createServiceRoleClient } = require('@/lib/api/auth');
    supabaseClient = createServiceRoleClient();
  } else {
    const { user, supabase, unauthorized } = await requireUserWithRole(['admin', 'marketer_full', 'marketer_content']);
    if (unauthorized) return unauthorized;
    supabaseClient = supabase;
  }

  const { searchParams } = new URL(request.url);
  const timeframe = searchParams.get('timeframe') || '7days';
  const platform = searchParams.get('platform') || 'all';
  const startDateParam = searchParams.get('startDate');
  const endDateParam = searchParams.get('endDate');

  // Resolve date range
  let start = new Date();
  let end = new Date();

  if (timeframe === '7days') {
    start.setDate(end.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  } else if (timeframe === '30days') {
    start.setDate(end.getDate() - 29);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  } else if (timeframe === 'thisMonth') {
    start = new Date(end.getFullYear(), end.getMonth(), 1);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  } else if (timeframe === 'lastMonth') {
    start = new Date(end.getFullYear(), end.getMonth() - 1, 1);
    end = new Date(end.getFullYear(), end.getMonth(), 0);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  } else if (timeframe === 'custom' && startDateParam && endDateParam) {
    start = new Date(startDateParam);
    start.setHours(0, 0, 0, 0);
    end = new Date(endDateParam);
    end.setHours(23, 59, 59, 999);
  } else {
    start.setDate(end.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  }

  let dbPlatform = platform;
  if (platform === 'threads') {
    dbPlatform = 'thread';
  }

  // Try querying with post_interactions join
  let data: any[] = [];
  let isMigrationMissing = false;

  let query = supabaseClient
    .from('scheduled_posts')
    .select(`
      id,
      platform,
      status,
      scheduled_at,
      posted_at,
      captions (
        id,
        edited_content,
        ai_content,
        articles (
          title
        )
      ),
      post_interactions (
        likes,
        comments,
        shares,
        clicks,
        reach,
        impressions
      )
    `)
    .gte('scheduled_at', start.toISOString())
    .lte('scheduled_at', end.toISOString());

  if (dbPlatform !== 'all') {
    query = query.eq('platform', dbPlatform);
  }

  const { data: postsData, error: postsError } = await query;

  if (postsError) {
    // If table doesn't exist, fallback to query without post_interactions
    if (postsError.message.includes('post_interactions') || postsError.code === 'PGRST108') {
      isMigrationMissing = true;
      let fallbackQuery = supabaseClient
        .from('scheduled_posts')
        .select(`
          id,
          platform,
          status,
          scheduled_at,
          posted_at,
          captions (
            id,
            edited_content,
            ai_content,
            articles (
              title
            )
          )
        `)
        .gte('scheduled_at', start.toISOString())
        .lte('scheduled_at', end.toISOString());

      if (dbPlatform !== 'all') {
        fallbackQuery = fallbackQuery.eq('platform', dbPlatform);
      }

      const { data: fallbackData, error: fallbackError } = await fallbackQuery;
      if (fallbackError) {
        console.error('[GET /api/reports/stats] Fallback query error:', fallbackError);
        return NextResponse.json({ error: 'Không thể lấy dữ liệu thống kê' }, { status: 500 });
      }
      data = fallbackData || [];
    } else {
      console.error('[GET /api/reports/stats] Query error:', postsError);
      return NextResponse.json({ error: 'Không thể lấy dữ liệu thống kê' }, { status: 500 });
    }
  } else {
    data = postsData || [];
  }

  try {
    // Process statistics
    const totalPosts = data.length;
    const postedPosts = data.filter(p => p.status === 'posted').length;
    const successRate = totalPosts > 0 ? Math.round((postedPosts / totalPosts) * 100) : 0;

    let totalLikes = 0;
    let totalComments = 0;
    let totalShares = 0;
    let totalClicks = 0;
    let totalReach = 0;
    let totalImpressions = 0;

    const platformBreakdown: { [key: string]: { posts: number; likes: number; comments: number; shares: number; clicks: number; reach: number; impressions: number } } = {
      facebook: { posts: 0, likes: 0, comments: 0, shares: 0, clicks: 0, reach: 0, impressions: 0 },
      instagram: { posts: 0, likes: 0, comments: 0, shares: 0, clicks: 0, reach: 0, impressions: 0 },
      threads: { posts: 0, likes: 0, comments: 0, shares: 0, clicks: 0, reach: 0, impressions: 0 }
    };

    const chartDataMap: { [dateStr: string]: { likes: number; comments: number; shares: number; clicks: number; reach: number; impressions: number; count: number } } = {};

    // Initialize dates in the range for chartDataMap to ensure continuous dates
    const cur = new Date(start);
    while (cur <= end) {
      const dStr = cur.toLocaleDateString('vi-VN', { month: '2-digit', day: '2-digit' });
      chartDataMap[dStr] = { likes: 0, comments: 0, shares: 0, clicks: 0, reach: 0, impressions: 0, count: 0 };
      cur.setDate(cur.getDate() + 1);
    }

    const processedPosts = data.map(post => {
      let interactions = post.post_interactions;
      if (Array.isArray(interactions)) {
        interactions = interactions[0];
      }
      
      if (post.status === 'posted' && interactions) {
        // Use real interactions from database
      } else {
        interactions = { likes: 0, comments: 0, shares: 0, clicks: 0, reach: 0, impressions: 0 };
      }

      // Accumulate metrics
      totalLikes += interactions.likes || 0;
      totalComments += interactions.comments || 0;
      totalShares += interactions.shares || 0;
      totalClicks += interactions.clicks || 0;
      totalReach += interactions.reach || 0;
      totalImpressions += interactions.impressions || 0;

      // Platform breakdown accumulation
      let pKey = post.platform ? post.platform.toLowerCase() : '';
      if (pKey === 'thread') pKey = 'threads';
      if (pKey && platformBreakdown[pKey]) {
        platformBreakdown[pKey].posts += 1;
        if (post.status === 'posted') {
          platformBreakdown[pKey].likes += interactions.likes || 0;
          platformBreakdown[pKey].comments += interactions.comments || 0;
          platformBreakdown[pKey].shares += interactions.shares || 0;
          platformBreakdown[pKey].clicks += interactions.clicks || 0;
          platformBreakdown[pKey].reach += interactions.reach || 0;
          platformBreakdown[pKey].impressions += interactions.impressions || 0;
        }
      }

      // Chart daily grouping
      const dateObj = new Date(post.posted_at || post.scheduled_at);
      const dateStr = dateObj.toLocaleDateString('vi-VN', { month: '2-digit', day: '2-digit' });

      if (chartDataMap[dateStr]) {
        chartDataMap[dateStr].likes += interactions.likes || 0;
        chartDataMap[dateStr].comments += interactions.comments || 0;
        chartDataMap[dateStr].shares += interactions.shares || 0;
        chartDataMap[dateStr].clicks += interactions.clicks || 0;
        chartDataMap[dateStr].reach += interactions.reach || 0;
        chartDataMap[dateStr].impressions += interactions.impressions || 0;
        chartDataMap[dateStr].count += 1;
      }

      let title = post.captions?.articles?.title;
      if (!title && post.captions) {
        const message = post.captions.edited_content || post.captions.ai_content || '';
        title = message.length > 40 ? message.substring(0, 40) + '...' : message;
      }
      if (!title) {
        title = 'Không có tiêu đề';
      }

      return {
        id: post.id,
        platform: post.platform,
        status: post.status,
        scheduled_at: post.scheduled_at,
        posted_at: post.posted_at,
        title,
        interactions
      };
    });

    // Convert chartDataMap to sorted array
    const chartData = Object.keys(chartDataMap).map(date => ({
      date,
      ...chartDataMap[date]
    }));

    // Top posts sorted by interactions (likes + comments + shares + clicks) descending
    const topPosts = [...processedPosts]
      .filter(p => p.status === 'posted')
      .sort((a, b) => {
        const scoreA = (a.interactions?.likes || 0) + (a.interactions?.comments || 0) + (a.interactions?.shares || 0) + (a.interactions?.clicks || 0);
        const scoreB = (b.interactions?.likes || 0) + (b.interactions?.comments || 0) + (b.interactions?.shares || 0) + (b.interactions?.clicks || 0);
        return scoreB - scoreA; // Giảm dần
      })
      .slice(0, 10);

    if (topPosts.length > 0) {
      console.log('\n=======================================');
      console.log('🚀 TOP 1 BÀI VIẾT CÓ TƯƠNG TÁC CAO NHẤT:');
      console.log('Tiêu đề:', topPosts[0].title);
      console.log('Nền tảng:', topPosts[0].platform);
      console.log('Chỉ số tương tác:', JSON.stringify(topPosts[0].interactions, null, 2));
      console.log('=======================================\n');
    }

    return NextResponse.json({
      summary: {
        totalPosts,
        postedPosts,
        successRate,
        totalLikes,
        totalComments,
        totalShares,
        totalClicks,
        totalReach,
        totalImpressions,
      },
      chartData,
      topPosts,
      platformBreakdown,
      isMigrationMissing
    });
  } catch (err: any) {
    console.error('[GET /api/reports/stats] Runtime error:', err);
    return NextResponse.json({ error: 'Lỗi xử lý thống kê: ' + err.message }, { status: 500 });
  }
}
