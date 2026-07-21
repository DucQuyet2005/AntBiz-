import type { GoldenHourSlot, PerformanceMetrics } from './post-performance-types';

export interface PostWithPerformance {
  postedAt: string;
  platform: string;
  interactions?: PerformanceMetrics;
}

export class InstagramGoldenHoursCalculator {
  /**
   * Tính toán điểm số tương tác trung bình (Engagement Rate) theo từng Thứ (0-6) & Giờ (0-23)
   * Công thức Engagement Rate = (Likes + Comments + Shares + Clicks) / max(Reach, 1) * 100%
   */
  static calculateGoldenHours(posts: PostWithPerformance[]): {
    slots: GoldenHourSlot[];
    topOptimalSlots: GoldenHourSlot[];
    recommendedBestTimeText: string;
  } {
    const dayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

    // Khởi tạo ma trận 7 ngày x 24 giờ
    const grid: { [key: string]: { totalRate: number; count: number; dayOfWeek: number; hourOfDay: number } } = {};
    for (let d = 0; d < 7; d++) {
      for (let h = 0; h < 24; h++) {
        const key = `${d}_${h}`;
        grid[key] = { totalRate: 0, count: 0, dayOfWeek: d, hourOfDay: h };
      }
    }

    // Lọc bài đăng Instagram đã có chỉ số
    const igPosts = posts.filter(p => p.platform?.toLowerCase() === 'instagram' && p.postedAt);

    for (const post of igPosts) {
      const date = new Date(post.postedAt);
      const d = date.getDay();
      const h = date.getHours();
      const key = `${d}_${h}`;

      const likes = post.interactions?.likes || 0;
      const comments = post.interactions?.comments || 0;
      const shares = post.interactions?.shares || 0;
      const clicks = post.interactions?.clicks || 0;
      const reach = post.interactions?.reach || 1;

      const totalEngagement = likes + comments + shares + clicks;
      const rate = reach > 0 ? (totalEngagement / reach) * 100 : totalEngagement * 0.1;

      if (grid[key]) {
        grid[key].totalRate += rate;
        grid[key].count += 1;
      }
    }

    // Chuyển đổi grid thành danh sách slots
    const slots: GoldenHourSlot[] = Object.values(grid).map(item => {
      const avgRate = item.count > 0 ? Number((item.totalRate / item.count).toFixed(2)) : 0;
      return {
        dayOfWeek: item.dayOfWeek,
        dayName: dayNames[item.dayOfWeek],
        hourOfDay: item.hourOfDay,
        avgEngagementRate: avgRate,
        totalPosts: item.count,
        isOptimal: false,
      };
    });

    // Sắp xếp các slot theo tỷ lệ tương tác trung bình giảm dần
    const sortedSlots = [...slots].sort((a, b) => b.avgEngagementRate - a.avgEngagementRate);

    // Lấy Top 3 khung giờ vàng tốt nhất (nếu có bài đăng)
    const activeOptimal = sortedSlots.filter(s => s.avgEngagementRate > 0).slice(0, 3);
    const optimalKeys = new Set(activeOptimal.map(s => `${s.dayOfWeek}_${s.hourOfDay}`));

    // Đánh dấu isOptimal
    slots.forEach(slot => {
      if (optimalKeys.has(`${slot.dayOfWeek}_${slot.hourOfDay}`)) {
        slot.isOptimal = true;
      }
    });

    // Tạo câu khuyến nghị văn bản cho Marketer
    let recommendedBestTimeText = 'Chưa đủ dữ liệu đăng bài Instagram để xác định khung giờ vàng.';
    if (activeOptimal.length > 0) {
      const topSlot = activeOptimal[0];
      const hourFormatted = `${topSlot.hourOfDay.toString().padStart(2, '0')}:00`;
      recommendedBestTimeText = `Khung giờ vàng hiệu quả nhất cho Instagram là ${topSlot.dayName} lúc ${hourFormatted} (Tỷ lệ tương tác trung bình: ${topSlot.avgEngagementRate}%).`;
    } else {
      recommendedBestTimeText = 'Gợi ý khung giờ mặc định cho Instagram: 11:00 - 13:00 và 19:00 - 21:00 các ngày Thứ 3, Thứ 5 & Thứ 7.';
    }

    return {
      slots,
      topOptimalSlots: activeOptimal,
      recommendedBestTimeText,
    };
  }
}
