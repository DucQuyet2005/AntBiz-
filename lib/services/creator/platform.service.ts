import { apiClient } from './apiClient';
import { SocialPlatform } from '@/types/creator';

export const platformService = {
  getConnectedPlatforms: async (): Promise<SocialPlatform[]> => {
    // Expected endpoint: GET /api/linked-accounts
    // Mapped to return array of supported platforms
    try {
      const accounts: any[] = await apiClient.get('/api/linked-accounts');
      const platforms = accounts.map(acc => acc.platform === 'thread' ? 'threads' : acc.platform);
      return platforms.filter(p => ['facebook', 'threads', 'instagram'].includes(p)) as SocialPlatform[];
    } catch (e) {
      console.warn("Failed to fetch linked accounts, mocking data for dev");
      return ['facebook', 'threads', 'instagram'];
    }
  }
};
