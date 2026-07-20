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
      const res = await fetch('/api/prompt-configs', { cache: 'no-store' });
      if (!res.ok) {
        return { status: 'error', error: 'Failed to fetch presets' };
      }
      
      const json = await res.json();
      const data = json.data || [];
      const sysDefaultId = typeof window !== 'undefined' ? localStorage.getItem('systemDefaultPreset') : null;
      const hasUserDefault = data.some((item: any) => item.is_default && !(item.user_id === 'system' || !item.user_id || item.is_system));

      const presets: Preset[] = data.map((item: any) => {
        // Build tags from params if available
        const tags: string[] = [];
        if (item.params?.objective) {
          tags.push(`🎯 ${item.params.objective}`);
        }
        
        const isSystem = Boolean(item.user_id === 'system' || !item.user_id || item.is_system);
        let isDefault = Boolean(item.is_default);

        if (sysDefaultId && !hasUserDefault) {
          if (item.id === sysDefaultId) isDefault = true;
          else if (isSystem) isDefault = false;
        }

        return {
          id: item.id,
          name: item.name,
          platform: item.platform,
          tags: tags.length > 0 ? tags : (isSystem ? ['Hệ thống'] : ['⭐ Văn phong tùy chỉnh']),
          lastUpdated: new Date(item.updated_at || item.created_at).toLocaleDateString('vi-VN'),
          isSystem,
          isDefault,
        };
      });
      
      if (sysDefaultId && hasUserDefault && typeof window !== 'undefined') {
        localStorage.removeItem('systemDefaultPreset');
      }

      return { status: 'success', data: presets };
    } catch (error) {
      console.error(error);
      return { status: 'error', error: 'Network error fetching presets' };
    }
  }
};
