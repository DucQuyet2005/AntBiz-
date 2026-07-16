import { STATIC_GOLDEN_HOURS } from '@/frontend/modules/scheduled-publishing/golden-hour';

export interface PostEngagementData {
  id: string;
  platform: string;
  postedAt: string; // ISO date string
  likes: number;
  comments: number;
  shares: number;
  views: number;
}

export interface GoldenHourResult {
  hour: number;
  label: string;
  weight: number;
}

/**
 * Ngưỡng (Threshold) cấu hình để quyết định xem có dùng Giờ Vàng Động hay không.
 */
const MIN_POSTS_REQUIRED = 5;
// Trung bình mỗi bài phải đạt tối thiểu số điểm tương tác này mới tính là "tương tác ổn định"
const MIN_AVERAGE_ENGAGEMENT_SCORE = 10; 

/**
 * Tính điểm tương tác (Engagement Score) cho 1 bài viết
 */
function calculateEngagementScore(post: PostEngagementData): number {
  // Trọng số: Shares = 3, Comments = 2, Likes = 1, Views = 0.1
  return (post.shares * 3) + (post.comments * 2) + (post.likes * 1) + (post.views * 0.1);
}

/**
 * Phân tích dữ liệu bài viết để gợi ý Giờ Vàng.
 * NẾU không đủ dữ liệu (dưới 5 bài) HOẶC tương tác quá kém -> Fallback về giờ tĩnh.
 * 
 * @param posts Mảng dữ liệu tương tác của các bài viết đã đăng
 * @param platform Tên nền tảng (facebook, instagram, threads...)
 * @returns Mảng các khung giờ vàng tốt nhất (động hoặc tĩnh)
 */
export function analyzeGoldenHours(posts: PostEngagementData[], platform: string): GoldenHourResult[] {
  const normalizedPlatform = platform.toLowerCase() === 'thread' ? 'threads' : platform.toLowerCase();
  const staticHours = STATIC_GOLDEN_HOURS[normalizedPlatform as keyof typeof STATIC_GOLDEN_HOURS] || [];

  // 1. Kiểm tra số lượng bài viết
  if (posts.length < MIN_POSTS_REQUIRED) {
    return staticHours;
  }

  // 2. Lọc các bài viết thuộc nền tảng đang cần phân tích
  const platformPosts = posts.filter(p => {
    const pName = p.platform.toLowerCase() === 'thread' ? 'threads' : p.platform.toLowerCase();
    return pName === normalizedPlatform;
  });

  if (platformPosts.length < MIN_POSTS_REQUIRED) {
    return staticHours;
  }

  // 3. Tính tổng điểm và kiểm tra Threshold (tương tác có ổn không?)
  let totalScore = 0;
  platformPosts.forEach(p => {
    totalScore += calculateEngagementScore(p);
  });
  
  const avgScore = totalScore / platformPosts.length;
  if (avgScore < MIN_AVERAGE_ENGAGEMENT_SCORE) {
    // Tương tác quá kém -> dùng cố định
    return staticHours;
  }

  // 4. Nhóm bài viết theo giờ đăng
  const scoreByHour = new Map<number, { totalScore: number; count: number }>();

  platformPosts.forEach(p => {
    const date = new Date(p.postedAt);
    if (isNaN(date.getTime())) return;
    
    const hour = date.getHours();
    const score = calculateEngagementScore(p);

    const existing = scoreByHour.get(hour) || { totalScore: 0, count: 0 };
    scoreByHour.set(hour, {
      totalScore: existing.totalScore + score,
      count: existing.count + 1
    });
  });

  if (scoreByHour.size === 0) {
    return staticHours;
  }

  // 5. Tính trung bình mỗi giờ và sắp xếp giảm dần
  const hourAverages: { hour: number; avgScore: number }[] = [];
  scoreByHour.forEach((val, hour) => {
    hourAverages.push({
      hour,
      avgScore: val.totalScore / val.count
    });
  });

  hourAverages.sort((a, b) => b.avgScore - a.avgScore);

  // 6. Lấy Top 3 khung giờ vàng (nếu có)
  const topHours = hourAverages.slice(0, 3);
  
  // Trả về định dạng chuẩn của Golden Hour
  return topHours.map((th, index) => {
    // Gán weight giảm dần: 1.0, 0.9, 0.8
    const weight = Math.max(1.0 - (index * 0.1), 0.5);
    
    // Gắn nhãn
    let label = 'Sáng';
    if (th.hour >= 11 && th.hour <= 14) label = 'Trưa';
    else if (th.hour >= 15 && th.hour <= 18) label = 'Chiều';
    else if (th.hour >= 19 && th.hour <= 23) label = 'Tối';
    else if (th.hour < 5) label = 'Khuya';

    return {
      hour: th.hour,
      label,
      weight
    };
  });
}
