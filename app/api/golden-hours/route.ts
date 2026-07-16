import { NextResponse } from 'next/server';
import { analyzeGoldenHours, PostEngagementData } from '@/backend/modules/scheduled-publishing/golden-hour-analyzer';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const platform = searchParams.get('platform') || 'facebook';
  const accountId = searchParams.get('accountId'); // Will be used later when querying DB

  try {
    // Tạm thời mock data từ DB.
    // Vì chưa có module Scraper, chúng ta trả về mảng rỗng để analyzer tự động fallback về giờ vàng tĩnh.
    // Sau này thay đoạn này bằng `await repository.getPostEngagements(accountId, platform)`
    const mockDbPosts: PostEngagementData[] = [];

    const goldenHours = analyzeGoldenHours(mockDbPosts, platform);

    return NextResponse.json({
      success: true,
      data: goldenHours,
    });
  } catch (error) {
    console.error('Error fetching golden hours:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
