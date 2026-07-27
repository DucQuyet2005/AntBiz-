import { useQuery } from '@tanstack/react-query';

export interface GoldenHourData {
  hour: number;
  label: string;
  weight: number;
  dayOfWeek?: number;
}

interface GoldenHoursResponse {
  success: boolean;
  data: GoldenHourData[];
  error?: string;
}

/**
 * Hook lấy danh sách Giờ Vàng Động (thực tế) từ server.
 * Tự động gọi API khi platform thay đổi.
 * 
 * @param platform Tên nền tảng (facebook, instagram, threads...)
 * @param accountId ID tài khoản liên kết (sẽ dùng sau này)
 */
export function useDynamicGoldenHours(platform: string | null, accountId?: string) {
  const normalizedPlatform = platform?.toLowerCase() === 'thread' ? 'threads' : platform?.toLowerCase();

  return useQuery({
    queryKey: ['golden-hours', normalizedPlatform, accountId],
    queryFn: async (): Promise<GoldenHourData[]> => {
      if (!normalizedPlatform) return [];

      const url = new URL('/api/golden-hours', window.location.origin);
      url.searchParams.set('platform', normalizedPlatform);
      if (accountId) {
        url.searchParams.set('accountId', accountId);
      }

      const res = await fetch(url.toString());
      if (!res.ok) {
        throw new Error('Failed to fetch golden hours');
      }

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || 'Unknown error');
      }

      if (Array.isArray(json.data)) {
        return json.data;
      }

      if (json.data && typeof json.data === 'object') {
        const rawSlots = Array.isArray(json.data.topOptimalSlots) && json.data.topOptimalSlots.length > 0
          ? json.data.topOptimalSlots
          : Array.isArray(json.data.slots)
          ? json.data.slots.filter((s: any) => s.isOptimal || s.avgEngagementRate > 0)
          : [];

        if (rawSlots.length > 0) {
          return rawSlots.map((slot: any) => ({
            hour: slot.hourOfDay !== undefined ? slot.hourOfDay : slot.hour,
            dayOfWeek: slot.dayOfWeek,
            label: slot.dayName || slot.label || `${slot.hourOfDay}:00`,
            weight: slot.avgEngagementRate || slot.weight || 1,
          }));
        }
      }

      return [];
    },
    enabled: !!normalizedPlatform, // Chỉ gọi API khi đã chọn platform
    staleTime: 1000 * 60 * 5, // Cache trong 5 phút
    retry: 1,
  });
}
