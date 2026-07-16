import { apiClient } from './apiClient';
import { ArticleContext, SourceType } from '@/types/creator';

export const articleService = {
  crawlArticle: async (url: string, source: SourceType): Promise<{ jobId: string }> => {
    // Expected: POST /api/articles/crawl
    try {
      return await apiClient.post('/api/articles/crawl', { url, source });
    } catch (e) {
      console.warn("Mocking crawl start", e);
      return { jobId: `mock-job-${Date.now()}` };
    }
  },

  getCrawlStatus: async (jobId: string): Promise<{ status: 'crawling' | 'done' | 'error', context?: ArticleContext }> => {
    // Expected: GET /api/articles/crawl/:jobId
    try {
      return await apiClient.get(`/api/articles/crawl/${jobId}`);
    } catch (e) {
      console.warn("Mocking crawl status", e);
      // Mock delayed success
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            status: 'done',
            context: {
              title: "Mock Crawled Article Title",
              summary: "This is a mock summary of the crawled article.",
              url: "https://example.com",
            }
          });
        }, 3000);
      });
    }
  },

  submitManualContent: async (content: string): Promise<ArticleContext> => {
    // Expected: POST /api/articles/manual
    try {
      return await apiClient.post('/api/articles/manual', { content });
    } catch (e) {
      console.warn("Mocking manual content submission", e);
      return {
        title: "Manual Context",
        summary: "Parsed manual context summary",
        content: content,
      };
    }
  }
};
