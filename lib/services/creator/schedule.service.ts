import { simulateRequest, ApiResponse } from './apiClient';

export interface ScheduledPostInfo {
  id: string;
  postId: string;
  platform: 'facebook' | 'threads' | 'instagram';
  time: string; // "09:00", "15:00", etc.
  dayIndex: number; // 0 for Mon, 1 for Tue ... 6 for Sun
  title: string;
}

export const scheduleService = {
  async getTimeline(): Promise<ApiResponse<ScheduledPostInfo[]>> {
    const mockPosts: ScheduledPostInfo[] = [
      {
        id: 'sp_1',
        postId: 'p_1',
        platform: 'facebook',
        time: '09:00',
        dayIndex: 0, // MON
        title: 'Giới thiệu sản phẩm mới',
      },
      {
        id: 'sp_2',
        postId: 'p_2',
        platform: 'threads',
        time: '14:00',
        dayIndex: 2, // WED
        title: 'Q&A với khách hàng',
      },
      {
        id: 'sp_3',
        postId: 'p_3',
        platform: 'instagram',
        time: '20:00',
        dayIndex: 4, // FRI
        title: 'Hình ảnh văn phòng',
      },
      {
        id: 'sp_4',
        postId: 'p_4',
        platform: 'facebook',
        time: '10:00',
        dayIndex: 3, // THU (today in mockup)
        title: 'Báo cáo xu hướng công nghệ',
      }
    ];

    return simulateRequest(mockPosts, 600);
  },

  async publishNow(_postId: string): Promise<ApiResponse<{ success: boolean; publishedAt: string }>> {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    _postId;
    return simulateRequest({
      success: true,
      publishedAt: new Date().toISOString()
    }, 1000);
  },

  async schedulePost(
    _postId: string,
    _datetime: string,
    _platform: string
  ): Promise<ApiResponse<{ success: boolean; scheduledPostId: string }>> {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    _postId;
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    _datetime;
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    _platform;
    return simulateRequest({
      success: true,
      scheduledPostId: `sp_${Math.random().toString(36).substring(2, 9)}`
    }, 1200);
  }
};
