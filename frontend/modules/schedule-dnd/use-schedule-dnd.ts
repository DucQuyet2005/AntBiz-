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
  onScheduleChange: (dayIdx: number, hour: number) => void,
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
    setState(prev => ({
      ...prev,
      dragOverCell: { dayIdx, hour },
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

      // Chỉ xử lý bài nháp
      if (payload.type === 'draft') {
        onScheduleChange(dayIdx, hour);
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

  const isHourInDynamicList = useCallback((hour: number) => {
    return dynamicGoldenHours.some(gh => gh.hour === hour);
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
          bg: 'rgba(24,119,242,0.06)',
          border: '#93c5fd',
          text: '#1d4ed8',
          iconClass: 'text-[#1877F2]',
        };
      case 'instagram':
        return {
          bg: 'rgba(225,48,108,0.06)',
          border: '#f9a8d4',
          text: '#be185d',
          iconClass: 'text-[#E1306C]',
        };
      case 'threads':
        return {
          bg: 'rgba(0,0,0,0.04)',
          border: '#cbd5e1',
          text: '#334155',
          iconClass: 'text-black dark:text-white',
        };
      default:
        return {
          bg: 'rgba(245,158,11,0.06)',
          border: '#fcd34d',
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
    getGoldenHoursForPlatform,
    isCellGoldenHourForPlatform,
    isDefaultGoldenHour,
    shouldHighlightGoldenOnDrag,
    isCellHovered,
    getGoldenHourStyle,
  };
}
