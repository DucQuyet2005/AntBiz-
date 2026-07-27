import { simulateRequest, ApiResponse } from './apiClient';

export type PlatformType = 'facebook' | 'threads' | 'instagram';

export interface PlatformConnection {
  id: PlatformType;
  name: string;
  connected: boolean;
  avatarUrl?: string;
  accountName?: string;
  accountId?: string;
  profileUrl?: string;
}

export const platformService = {
  async getConnectedPlatforms(): Promise<ApiResponse<PlatformConnection[]>> {
    const mockPlatforms: PlatformConnection[] = [
      { id: 'facebook', name: 'Facebook', connected: true, avatarUrl: '/images/facebook.png' },
      { id: 'threads', name: 'Threads', connected: true, avatarUrl: '/images/threads.png' },
      { id: 'instagram', name: 'Instagram', connected: true, avatarUrl: '/images/instagram.png' },
    ];
    return simulateRequest(mockPlatforms, 600);
  }
};
