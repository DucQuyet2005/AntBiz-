'use client';

import { useState, useCallback } from 'react';
import type { DragOverCell, DragPayload, GoldenHourCell, ScheduleDndState } from './schedule-dnd-types';
import type { GoldenHourData } from '@/frontend/modules/scheduled-publishing/use-golden-hours';

/**
 * useScheduleDragDrop
 * 
 * Hook quản lý toàn bộ logic Drag & Drop trên grid lịch (Step5Schedule).
 * Chịu trách nhiệm:
 * - Tracking trạng thái kéo thả (dragOverCell, draggedPlatform)
 * - Tính toán ô giờ vàng cho nền tảng đang kéo
 * - Xử lý sự kiện HTML5 DnD (dragStart, dragOver, dragLeave, drop)
 * - Tạo DnD payload và parse từ dataTransfer
 */
export function useScheduleDragDrop(
  onScheduleChange: (dayIdx: number, hour: number, minute: number) => void,
  dynamicGoldenHours: GoldenHourData[] = []
) {
  const [state, setState] = useState<ScheduleDndState>({
    dragOverCell: null,
    draggedPlatform: null,
    isDragging: false,
  });

  // ─── Drag Start ───
  const handleDragStart = useCallback((
    e: React.DragEvent,
    payload: DragPayload
  ) => {
    const dataStr = JSON.stringify(payload);
    e.dataTransfer.setData('text/plain', dataStr);
    e.dataTransfer.effectAllowed = 'move';

    setState(prev => ({
      ...prev,
      isDragging: true,
      draggedPlatform: payload.platform,
    }));
  }, []);

  // ─── Drag End ───
  const handleDragEnd = useCallback(() => {
    setState({
      dragOverCell: null,
      draggedPlatform: null,
      isDragging: false,
    });
  }, []);

  // ─── Drag Over (cell) ───
  const handleCellDragOver = useCallback((
    e: React.DragEvent,
    dayIdx: number,
    hour: number
  ) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const y = e.clientY - rect.top;
    const rawMinute = (y / rect.height) * 60;

    let minute = 0;
    if (rawMinute >= 52.5) {
      minute = 45;
    } else if (rawMinute >= 37.5) {
      minute = 45;
    } else if (rawMinute >= 22.5) {
      minute = 30;
    } else if (rawMinute >= 7.5) {
      minute = 15;
    } else {
      minute = 0;
    }

    setState(prev => ({
      ...prev,
      dragOverCell: { dayIdx, hour, minute },
    }));
  }, []);

  // ─── Drag Leave (cell) ───
  const handleCellDragLeave = useCallback(() => {
    setState(prev => ({
      ...prev,
      dragOverCell: null,
    }));
  }, []);

  // ─── Drop (cell) ───
  const handleCellDrop = useCallback((
    e: React.DragEvent,
    dayIdx: number,
    hour: number
  ) => {
    e.preventDefault();

    try {
      const dataStr = e.dataTransfer.getData('text/plain');
      if (!dataStr) return;
      const payload: DragPayload = JSON.parse(dataStr);

      // Support both draft and scheduled post drags
      if (payload.type === 'draft' || payload.type === 'scheduled' || payload.id) {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const y = e.clientY - rect.top;
        const rawMinute = (y / rect.height) * 60;

        // Snap minute to 15-minute interval: 0, 15, 30, 45
        let minute = 0;
        if (rawMinute >= 52.5) {
          minute = 45;
        } else if (rawMinute >= 37.5) {
          minute = 45;
        } else if (rawMinute >= 22.5) {
          minute = 30;
        } else if (rawMinute >= 7.5) {
          minute = 15;
        } else {
          minute = 0;
        }

        onScheduleChange(dayIdx, hour, minute);
      }
    } catch (err) {
      console.error('[ScheduleDnD] Drop parse error:', err);
    }

    // Reset drag state
    setState({
      dragOverCell: null,
      draggedPlatform: null,
      isDragging: false,
    });
  }, [onScheduleChange]);

  // ─── Golden Hour helpers ───

  const DEFAULT_GOLDEN_HOURS = [9, 11, 14, 19, 21];

  const isHourInDynamicList = useCallback((hour: number) => {
    // Nếu có dữ liệu Giờ Vàng Động từ DB analytics, kiểm tra theo khung giờ của hàng ngang
    if (Array.isArray(dynamicGoldenHours) && dynamicGoldenHours.length > 0) {
      return dynamicGoldenHours.some(gh => gh && gh.hour === hour);
    }

    // Chỉ khi DB chưa có dữ liệu bài đăng nào mới fallback sang giờ mặc định
    return DEFAULT_GOLDEN_HOURS.includes(hour);
  }, [dynamicGoldenHours]);

  /**
   * Kiểm tra xem ô có phải giờ vàng của một platform cụ thể không (dùng dynamic list)
   */
  const isCellGoldenHourForPlatform = useCallback((platform: string, hour: number): boolean => {
    return isHourInDynamicList(hour);
  }, [isHourInDynamicList]);

  /**
   * Giờ vàng mặc định (hiển thị luôn, không cần kéo)
   * Trả về true nếu ô này là giờ vàng cho platform được truyền vào
   */
  const isDefaultGoldenHour = useCallback((platform: string | null, hour: number): boolean => {
    if (!platform) return false;
    return isHourInDynamicList(hour);
  }, [isHourInDynamicList]);

  /**
   * Kiểm tra ô có nên highlight đậm golden hour khi drag không
   * (chỉ highlight cột đang hover)
   */
  const shouldHighlightGoldenOnDrag = useCallback((dayIdx: number, hour: number): boolean => {
    if (!state.isDragging || !state.dragOverCell) return false;
    if (state.dragOverCell.dayIdx !== dayIdx) return false;
    if (!state.draggedPlatform) return false;
    return isHourInDynamicList(hour);
  }, [state.isDragging, state.dragOverCell, state.draggedPlatform, isHourInDynamicList]);

  /**
   * Kiểm tra ô có đang bị hover trực tiếp không
   */
  const isCellHovered = useCallback((dayIdx: number, hour: number): boolean => {
    if (!state.dragOverCell) return false;
    return state.dragOverCell.dayIdx === dayIdx && state.dragOverCell.hour === hour;
  }, [state.dragOverCell]);

  /**
   * Lấy màu platform cho ô golden hour
   */
  const getGoldenHourStyle = useCallback((platform: string): {
    bg: string;
    border: string;
    text: string;
    iconClass: string;
  } => {
    const p = platform === 'thread' ? 'threads' : platform;
    switch (p) {
      case 'facebook':
        return {
          bg: 'rgba(24,119,242,0.04)',
          border: 'rgba(24,119,242,0.2)',
          text: '#1d4ed8',
          iconClass: 'text-[#1877F2]',
        };
      case 'instagram':
        return {
          bg: 'rgba(225,48,108,0.04)',
          border: 'rgba(225,48,108,0.2)',
          text: '#be185d',
          iconClass: 'text-[#E1306C]',
        };
      case 'threads':
        return {
          bg: 'rgba(245,158,11,0.04)',
          border: 'rgba(245,158,11,0.2)',
          text: '#b45309',
          iconClass: 'text-amber-500',
        };
      default:
        return {
          bg: 'rgba(245,158,11,0.04)',
          border: 'rgba(245,158,11,0.2)',
          text: '#b45309',
          iconClass: 'text-amber-500',
        };
    }
  }, []);

  return {
    // State
    ...state,

    // Event handlers
    handleDragStart,
    handleDragEnd,
    handleCellDragOver,
    handleCellDragLeave,
    handleCellDrop,

    // Golden Hour utilities
    isCellGoldenHourForPlatform,
    isDefaultGoldenHour,
    shouldHighlightGoldenOnDrag,
    isCellHovered,
    getGoldenHourStyle,
  };
}
