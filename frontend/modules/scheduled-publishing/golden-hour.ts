export const STATIC_GOLDEN_HOURS = {
  facebook: [
    { hour: 8, label: 'Sáng', weight: 0.8 },
    { hour: 12, label: 'Trưa', weight: 0.9 },
    { hour: 20, label: 'Tối', weight: 1.0 },
  ],
  instagram: [
    { hour: 11, label: 'Trưa', weight: 0.9 },
    { hour: 20, label: 'Tối', weight: 1.0 },
  ],
  threads: [
    { hour: 8, label: 'Sáng', weight: 0.9 },
    { hour: 22, label: 'Khuya', weight: 1.0 },
  ]
};

/**
 * Kiểm tra xem một khung giờ (hoặc thời gian lên lịch) có phải là Giờ Vàng (Golden Hour) của nền tảng đó không
 * @param platform - tên nền tảng (facebook, instagram, threads, thread, v.v...)
 * @param time - chuỗi ngày tháng ISO (ví dụ: 2024-05-10T12:00:00Z) hoặc số giờ từ 0-23
 * @returns boolean true nếu là giờ vàng
 */
export const isGoldenHour = (platform: string, time: string | Date | number): boolean => {
  if (!platform) return false;
  
  // Chuẩn hóa tên platform (VD: 'thread' -> 'threads')
  const normalizedPlatform = platform.toLowerCase() === 'thread' ? 'threads' : platform.toLowerCase();
  
  // Lấy danh sách giờ vàng từ constant
  const platHours = STATIC_GOLDEN_HOURS[normalizedPlatform as keyof typeof STATIC_GOLDEN_HOURS] || [];
  if (platHours.length === 0) return false;

  let hourToCheck: number;

  if (typeof time === 'number') {
    hourToCheck = time;
  } else {
    const dateObj = typeof time === 'string' ? new Date(time) : time;
    if (isNaN(dateObj.getTime())) return false;
    hourToCheck = dateObj.getHours();
  }

  return platHours.some((gh: any) => gh.hour === hourToCheck);
};
