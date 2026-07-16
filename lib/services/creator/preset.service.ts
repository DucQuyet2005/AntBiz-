import { simulateRequest, ApiResponse } from './apiClient';
import { PlatformType } from './platform.service';

export interface Preset {
  id: string;
  name: string;
  platform: PlatformType;
  tags: string[];
  lastUpdated: string;
}

export const presetService = {
  async getPresets(): Promise<ApiResponse<Preset[]>> {
    const mockPresets: Preset[] = [
      {
        id: 'preset_summer_campaign',
        name: 'SS - Chiến dịch Mùa Hè',
        platform: 'facebook',
        tags: ['🔥 Tăng tương tác', '📢 Sự kiện / Thông báo', '⭐ Uy quyền / Chuyên gia'],
        lastUpdated: '15/7/2026',
      },
      {
        id: 'preset_product_launch',
        name: 'Mẫu Bài Đăng Sản Phẩm Mới',
        platform: 'facebook',
        tags: ['🛍️ Bán hàng', '💡 Chia sẻ kiến thức'],
        lastUpdated: '12/7/2026',
      },
      {
        id: 'preset_threads_weekly',
        name: 'Threads Thường Nhật - Tương tác cao',
        platform: 'threads',
        tags: ['🔥 Tăng tương tác', '💬 Thảo luận mở'],
        lastUpdated: '14/7/2026',
      },
      {
        id: 'preset_threads_tech',
        name: 'Threads Tech Insight - Góc nhìn chuyên sâu',
        platform: 'threads',
        tags: ['⭐ Uy quyền / Chuyên gia', '💡 Chia sẻ kiến thức'],
        lastUpdated: '10/7/2026',
      },
      {
        id: 'preset_insta_lifestyle',
        name: 'Instagram Storytelling - Kể chuyện qua ảnh',
        platform: 'instagram',
        tags: ['🎨 Sáng tạo', '📢 Sự kiện / Thông báo'],
        lastUpdated: '16/7/2026',
      },
    ];

    return simulateRequest(mockPresets, 500);
  }
};
