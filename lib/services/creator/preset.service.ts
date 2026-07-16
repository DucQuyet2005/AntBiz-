import { apiClient } from './apiClient';
import { Preset } from '@/types/creator';

export const presetService = {
  getPresets: async (): Promise<Preset[]> => {
    // Expected: GET /api/presets
    try {
      return await apiClient.get('/api/presets');
    } catch (e) {
      console.warn("Mocking presets fetch", e);
      return [
        { id: '1', name: 'Tăng tương tác mạnh', platform: 'facebook', tags: ['🔥 Tăng tương tác'], updatedAt: '2026-07-15T00:00:00Z', isSystem: true },
        { id: '2', name: 'Sự kiện - Lịch sự', platform: 'facebook', tags: ['📢 Thông báo'], updatedAt: '2026-07-14T00:00:00Z', isSystem: true },
        { id: '3', name: 'GenZ Trendy', platform: 'threads', tags: ['🎉 Trẻ trung', '🔥 Tăng tương tác'], updatedAt: '2026-07-10T00:00:00Z', isSystem: true },
        { id: '4', name: 'Hình ảnh đẹp', platform: 'instagram', tags: ['📷 Hình ảnh'], updatedAt: '2026-07-12T00:00:00Z', isSystem: false },
      ];
    }
  }
};
