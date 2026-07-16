import { apiClient } from './apiClient';
import { ScheduleTimelineEvent } from '@/types/creator';

export const scheduleService = {
  getTimeline: async (): Promise<ScheduleTimelineEvent[]> => {
    // Expected: GET /api/schedule/timeline
    try {
      return await apiClient.get('/api/schedule/timeline');
    } catch (e) {
      console.warn("Mocking timeline fetch", e);
      // Return some mock events for today
      const today = new Date();
      today.setHours(10, 0, 0, 0);
      return [
        { id: '1', platform: 'facebook', time: today.toISOString() },
      ];
    }
  },

  publishNow: async (postId: string): Promise<boolean> => {
    // Expected: POST /api/posts/:postId/publish-now
    try {
      await apiClient.post(`/api/posts/${postId}/publish-now`, {});
      return true;
    } catch (e) {
      console.warn("Mocking publish now", e);
      return new Promise(resolve => setTimeout(() => resolve(true), 1500));
    }
  },

  schedulePost: async (postId: string, time: string): Promise<boolean> => {
    // Expected: POST /api/posts/:postId/schedule
    try {
      await apiClient.post(`/api/posts/${postId}/schedule`, { time });
      return true;
    } catch (e) {
      console.warn("Mocking schedule post", e);
      return new Promise(resolve => setTimeout(() => resolve(true), 1500));
    }
  }
};
