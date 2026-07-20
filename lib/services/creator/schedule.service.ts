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
    const mockPosts: ScheduledPostInfo[] = [];
    return simulateRequest(mockPosts, 200);
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
