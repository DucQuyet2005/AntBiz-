import { apiClient } from './apiClient';
import { PostContent, SocialPlatform, ChatMessage, ArticleContext } from '@/types/creator';

export const postService = {
  generatePost: async (payload: { platform: SocialPlatform; context: ArticleContext; presetId: string | null }): Promise<PostContent> => {
    // Expected: POST /api/posts/generate
    try {
      return await apiClient.post('/api/posts/generate', payload);
    } catch (e) {
      console.warn("Mocking generate post", e);
      return new Promise(resolve => setTimeout(() => resolve({
        id: `mock-post-${Date.now()}`,
        platform: payload.platform,
        content: `🎉 Khám phá ngay những cập nhật mới nhất từ AntBiz! Đây là nội dung AI sinh ra mẫu cho nền tảng ${payload.platform}.\n\n#AntBiz #Update`,
        status: 'draft',
      }), 2000));
    }
  },

  editSection: async (postId: string, selectedText: string, instruction: string): Promise<string> => {
    // Expected: PATCH /api/posts/:postId/edit-section
    try {
      const res = await apiClient.patch<{ newContent: string }>(`/api/posts/${postId}/edit-section`, { selectedText, instruction });
      return res.newContent;
    } catch (e) {
      console.warn("Mocking edit section", e);
      return new Promise(resolve => setTimeout(() => resolve(`(Đã sửa theo yêu cầu: ${instruction}) ` + selectedText), 1500));
    }
  },

  regenerateAll: async (postId: string): Promise<PostContent> => {
    // Expected: POST /api/posts/:postId/regenerate
    try {
      return await apiClient.post(`/api/posts/${postId}/regenerate`, {});
    } catch (e) {
      console.warn("Mocking regenerate", e);
      return new Promise(resolve => setTimeout(() => resolve({
        id: postId,
        platform: 'facebook',
        content: `🔄 Nội dung đã được viết lại hoàn toàn mới! Bạn thấy sao? \n\n#Refresh #AntBiz`,
        status: 'draft',
      }), 2000));
    }
  },

  chat: async (postId: string | null, message: string, history: ChatMessage[]): Promise<ChatMessage> => {
    // Expected: POST /api/posts/chat
    try {
      return await apiClient.post('/api/posts/chat', { postId, message, history });
    } catch (e) {
      console.warn("Mocking chat response", e);
      return new Promise(resolve => setTimeout(() => resolve({
        id: `mock-msg-${Date.now()}`,
        role: 'assistant',
        content: `Mình đã nhận được yêu cầu: "${message}". Để mình điều chỉnh lại nhé!`,
        timestamp: new Date().toISOString()
      }), 1500));
    }
  }
};
