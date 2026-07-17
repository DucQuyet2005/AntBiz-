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
    try {
      const res = await fetch('/api/prompt-configs');
      if (!res.ok) {
        return { status: 'error', error: 'Failed to fetch presets' };
      }
      
      const json = await res.json();
      const data = json.data || [];
      
      // Map PromptConfigRecord to Preset for the Creator Flow
      const presets: Preset[] = data.map((item: any) => {
        // Build tags from params if available
        const tags: string[] = [];
        if (item.params?.objective) {
          tags.push(`🎯 ${item.params.objective}`);
        }
        
        return {
          id: item.id,
          name: item.name,
          platform: item.platform,
          tags: tags.length > 0 ? tags : ['⭐ Văn phong tùy chỉnh'],
          lastUpdated: new Date(item.updated_at || item.created_at).toLocaleDateString('vi-VN'),
        };
      });
      
      return { status: 'success', data: presets };
    } catch (error) {
      console.error(error);
      return { status: 'error', error: 'Network error fetching presets' };
    }
  }
};
