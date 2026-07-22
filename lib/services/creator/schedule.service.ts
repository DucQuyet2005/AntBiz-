import { simulateRequest, ApiResponse } from './apiClient';

export interface ScheduledPostInfo {
  id: string;
  postId: string;
  platform: 'facebook' | 'threads' | 'instagram';
  time: string; // "09:00", "15:00", etc.
  date?: string; // "YYYY-MM-DD"
  dayIndex: number; // 0 for Mon, 1 for Tue ... 6 for Sun
  title: string;
}

export const scheduleService = {
  async getTimeline(): Promise<ApiResponse<ScheduledPostInfo[]>> {
    try {
      const res = await fetch('/api/scheduled-posts');
      if (!res.ok) {
        return { status: 'error', error: 'Failed to fetch timeline', data: [] };
      }
      const json = await res.json();
      const posts: any[] = json.data || [];
      
      const timelinePosts: ScheduledPostInfo[] = posts
        .filter(p => p.status === 'pending') // Only show pending posts on the timeline
        .map(p => {
          const d = new Date(p.scheduled_at);
          
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          const dateStr = `${y}-${m}-${day}`;
          
          const hr = String(d.getHours()).padStart(2, '0');
          const mn = String(d.getMinutes()).padStart(2, '0');
          const timeStr = `${hr}:${mn}`;
          
          const jsDay = d.getDay();
          const dayIndex = jsDay === 0 ? 6 : jsDay - 1;
          
          const title = p.captions?.articles?.title || p.captions?.edited_content || 'Bài viết';
          
          return {
            id: p.id,
            postId: p.id,
            platform: p.platform === 'thread' ? 'threads' : p.platform,
            time: timeStr,
            date: dateStr,
            dayIndex,
            title: title.substring(0, 50)
          };
      });
      return { status: 'success', data: timelinePosts };
    } catch (e) {
      console.error('Error fetching timeline:', e);
      return { status: 'error', error: 'Lỗi tải timeline', data: [] };
    }
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
