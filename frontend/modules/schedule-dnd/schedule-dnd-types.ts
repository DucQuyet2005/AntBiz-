/**
 * schedule-dnd types
 * Kiểu dữ liệu cho logic kéo-thả lịch và giờ vàng
 */

export interface DragOverCell {
  dayIdx: number;
  hour: number;
  minute?: number;
}

export interface DragPayload {
  id?: string;
  type: 'draft' | 'scheduled';
  platform: string;
  postId?: string;
  label?: string;
}

export interface GoldenHourCell {
  dayIdx: number;
  hour: number;
  platform: string;
  label: string;
  weight: number;
}

export interface ScheduleDndState {
  /** Ô đang được hover khi drag */
  dragOverCell: DragOverCell | null;
  /** Platform đang kéo */
  draggedPlatform: string | null;
  /** Đang kéo hay không */
  isDragging: boolean;
}
