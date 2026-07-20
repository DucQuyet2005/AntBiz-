import { simulateRequest, ApiResponse } from './apiClient';
import { PlatformType } from './platform.service';

export interface Preset {
  id: string;
  name: string;
  platform: PlatformType;
  tags: string[];
  lastUpdated: string;
  isSystem?: boolean;
  isDefault?: boolean;
}

export const presetService = {
  async getPresets(): Promise<ApiResponse<Preset[]>> {
    try {
      const res = await fetch('/api/prompt-configs');
      if (!res.ok) {
        return { status: 'error', error: 'Failed to fetch presets' };
      }
      
      const json = await res.json();
      const data = json.data || [];
      
      const presets: Preset[] = data.map((item: any) => {
        // Build tags from params if available
        const tags: string[] = [];
        if (item.params?.objective) {
          tags.push(`🎯 ${item.params.objective}`);
        }
        
        const isSystem = Boolean(item.user_id === 'system' || !item.user_id || item.is_system);

        return {
          id: item.id,
          name: item.name,
          platform: item.platform,
          tags: tags.length > 0 ? tags : (isSystem ? ['Hệ thống'] : ['⭐ Văn phong tùy chỉnh']),
          lastUpdated: new Date(item.updated_at || item.created_at).toLocaleDateString('vi-VN'),
          isSystem,
          isDefault: Boolean(item.is_default),
        };
      });
      
      return { status: 'success', data: presets };
    } catch (error) {
      console.error(error);
      return { status: 'error', error: 'Network error fetching presets' };
    }
  }
};
