'use client';

import React, { useState, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  Calendar, Clock, Facebook, Instagram, 
  Zap, Info, Settings, Star 
} from 'lucide-react';
import { useCreatorFlow } from '@/frontend/modules/creator-flow';
import { useScheduleDragDrop } from '@/frontend/modules/schedule-dnd';
import { useDynamicGoldenHours } from '@/frontend/modules/scheduled-publishing/use-golden-hours';

// Custom SVG Logo for Threads
const ThreadsIcon = ({ className = '', size = 14 }: { className?: string; size?: number }) => (
  <svg viewBox="0 0 192 192" width={size} height={size} className={className} fill="currentColor">
    <path d="M141.537 88.9883C140.71 88.5919 139.87 88.2104 139.019 87.8451C137.537 60.5382 122.616 44.905 97.5619 44.745C97.4484 44.7443 97.3355 44.7443 97.222 44.7443C82.2364 44.7443 69.7731 51.1409 62.102 62.7807L75.881 72.2328C81.6116 63.5383 90.6052 61.6848 97.2286 61.6848C97.3051 61.6848 97.3819 61.6848 97.4576 61.6855C105.707 61.7381 111.932 64.1366 115.961 68.814C118.893 72.2193 120.854 76.925 121.825 82.8638C114.511 81.6207 106.601 81.2385 98.145 81.7233C74.3247 83.0954 59.0111 96.9879 60.0396 116.292C60.5615 126.084 65.4397 134.508 73.775 140.011C80.8224 144.663 89.899 146.938 99.3323 146.423C111.79 145.74 121.563 140.987 128.381 132.296C133.559 125.696 136.834 117.143 138.28 106.366C144.217 109.949 148.617 114.664 151.047 120.332C155.179 129.967 155.42 145.8 142.501 158.708C131.182 170.016 117.576 174.908 97.0135 175.059C74.2042 174.89 56.9538 167.575 45.7381 153.317C35.2355 139.966 29.8077 120.682 29.6052 96C29.8077 71.3178 35.2355 52.0336 45.7381 38.6827C56.9538 24.4249 74.2039 17.11 97.0132 16.9405C119.988 17.1113 137.539 24.4614 149.184 38.788C154.894 45.8136 159.199 54.6488 162.037 64.9503L178.184 60.6422C174.744 47.9622 169.331 37.0357 161.965 27.974C147.036 9.60668 125.202 0.195148 97.0695 0H96.9569C68.8816 0.19447 47.2921 9.6418 32.7883 28.0793C19.8819 44.4864 13.2244 67.3157 13.0007 95.9325L13 96L13.0007 96.0675C13.2244 124.684 19.8819 147.514 32.7883 163.921C47.2921 182.358 68.8816 191.806 96.9569 192H97.0695C122.03 191.827 139.624 185.292 154.118 170.811C173.081 151.866 172.51 128.119 166.26 113.541C161.776 103.087 153.227 94.5962 141.537 88.9883ZM98.4405 129.507C88.0005 130.095 77.1544 125.409 76.6196 115.372C76.2232 107.93 81.9158 99.626 99.0812 98.6368C101.047 98.5234 102.976 98.468 104.871 98.468C111.106 98.468 116.939 99.0737 122.242 100.233C120.264 124.935 108.662 128.946 98.4405 129.507Z" />
  </svg>
);

export default function Step5Schedule() {
  const { state, dispatch } = useCreatorFlow();
  
  // Local state for week pagination
  const [activeWeekTab, setActiveWeekTab] = useState<'w1' | 'w2' | 'w3'>('w1');
  const currentPlatform = state.selectedPlatform || 'facebook';

  // Fetch dynamic golden hours for selected platform
  const { data: dynamicGoldenHours = [] } = useDynamicGoldenHours(currentPlatform);

  const today = new Date();
  const currentDayOfWeek = today.getDay(); // 0 is Sun, 1 is Mon...
  // Align Monday to index 0, Sunday to index 6
  const mondayOffset = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
  const weekShift = activeWeekTab === 'w1' ? 0 : activeWeekTab === 'w2' ? 7 : 14;

  const days = Array.from({ length: 7 }).map((_, idx) => {
    const d = new Date(today);
    d.setDate(today.getDate() + mondayOffset + weekShift + idx);
    const dayLabels = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const isToday = d.toDateString() === today.toDateString();
    return {
      label: dayLabels[d.getDay()],
      date: d.getDate().toString(),
      index: idx,
      isToday,
      fullDateStr: d.toISOString().split('T')[0]
    };
  });

  // DnD + Golden Hour hook (logic lives in frontend/modules/schedule-dnd)
  const handleScheduleChange = useCallback((dayIdx: number, hour: number) => {
    const targetDay = days.find(d => d.index === dayIdx);
    if (!targetDay) return;

    const hourPad = `${hour.toString().padStart(2, '0')}:00`;
    
    // Prevent scheduling in the past
    const targetDate = new Date(`${targetDay.fullDateStr}T${hourPad}`);
    if (targetDate.getTime() < new Date().getTime()) return;

    dispatch({ type: 'SET_SCHEDULE_DATE_TIME', payload: `${targetDay.fullDateStr}T${hourPad}` });
    dispatch({ type: 'SET_SCHEDULE_MODE', payload: 'scheduled' });
  }, [dispatch, days]);

  const dnd = useScheduleDragDrop(handleScheduleChange, dynamicGoldenHours);

  // Hours mapping for vertical list: 7:00 to 22:00
  const hours = Array.from({ length: 16 }, (_, i) => `${i + 7}:00`);

  // Parse state scheduled date and time to separate inputs
  const [datePart, timePart] = state.scheduledDateTime.split('T');

  let currentPostDayIndex: number | null = null;
  let currentPostHourVal: number | null = null;

  if (datePart) {
    const selectedDate = new Date(datePart);
    const dayOfWeek = selectedDate.getDay(); // 0 is Sunday, 1 is Monday...
    currentPostDayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  }
  if (timePart) {
    currentPostHourVal = parseInt(timePart.split(':')[0]);
  }

  const handleDateChange = (val: string) => {
    dispatch({ type: 'SET_SCHEDULE_DATE_TIME', payload: `${val}T${timePart || '09:00'}` });
  };

  const handleTimeChange = (val: string) => {
    dispatch({ type: 'SET_SCHEDULE_DATE_TIME', payload: `${datePart || ''}T${val}` });
  };
  // Helper when user clicks on an empty slot in the timeline grid
  const handleCellClick = (dayIndex: number, hourStr: string) => {
    const targetDay = days.find(d => d.index === dayIndex);
    if (!targetDay) return;

    const hourPad = hourStr.split(':')[0].padStart(2, '0') + ':00';
    
    // Prevent past scheduling
    const targetDate = new Date(`${targetDay.fullDateStr}T${hourPad}`);
    if (targetDate.getTime() < new Date().getTime()) return;

    dispatch({ type: 'SET_SCHEDULE_DATE_TIME', payload: `${targetDay.fullDateStr}T${hourPad}` });
    dispatch({ type: 'SET_SCHEDULE_MODE', payload: 'scheduled' });
  };

  const getPlatformIcon = (platform: string) => {
    if (platform === 'facebook') return <Facebook className="w-2.5 h-2.5 text-[#1877F2] fill-[#1877F2]" />;
    if (platform === 'instagram') return <Instagram className="w-2.5 h-2.5 text-[#E1306C]" />;
    if (platform === 'threads') return <ThreadsIcon size={10} />;
    return null;
  };

  const getChipColorClass = (platform: string) => {
    if (platform === 'facebook') return 'bg-[#E8F0FE] hover:bg-[#D2E3FC] text-[#1877F2] border border-[#ADC1FA] dark:bg-[#1877F2]/10 dark:text-[#1877F2] dark:border-[#1877F2]/20';
    if (platform === 'instagram') return 'bg-[#FDF0F5] hover:bg-[#FCE1EC] text-[#E1306C] border border-[#F7B6D2] dark:bg-[#E1306C]/10 dark:text-[#E1306C] dark:border-[#E1306C]/20';
    return 'bg-zinc-50 hover:bg-zinc-100 text-zinc-800 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700';
  };

  return (
    <div className="w-full max-w-7xl mx-auto flex-1 py-6 px-4">
      {/* 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: TIMELINE WEEK GRID (70% width -> 8 cols) */}
        <div className="lg:col-span-8 bg-card border border-gray-150 dark:border-zinc-800 rounded-3xl p-6 shadow-sm flex flex-col">
          
          {/* Timeline header controls */}
          <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
            <h2 className="text-sm font-bold text-primary tracking-wider flex items-center gap-2 select-none">
              <Calendar className="w-5 h-5 text-primary" />
              <span className="uppercase">TIMELINE TUẦN</span>
            </h2>
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="bg-[#F4F5F9] dark:bg-zinc-950 p-1 rounded-2xl flex gap-1 select-none">
                {(['w1', 'w2', 'w3'] as const).map((w) => (
                  <button
                    key={w}
                    onClick={() => setActiveWeekTab(w)}
                    className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      activeWeekTab === w
                        ? 'bg-white dark:bg-zinc-900 text-primary shadow-sm'
                        : 'text-text-muted hover:text-text'
                    }`}
                  >
                    {w === 'w1' ? 'Tuần 1' : w === 'w2' ? 'Tuần 2' : 'Tuần 3'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Calendar Grid wrapper */}
          <div className="border border-slate-100 dark:border-zinc-800/80 rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 shadow-inner">
            
            {/* Days Header Row */}
            <div 
              style={{ scrollbarGutter: 'stable' }}
              className="grid grid-cols-8 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50 text-center select-none"
            >
              <div className="p-3.5 text-[10px] font-bold text-text-muted border-r border-slate-100 dark:border-zinc-800 flex items-center justify-center">
                Giờ
              </div>
              {days.map((day) => {
                const isHighlighted = day.index === currentPostDayIndex;
                return (
                  <div 
                    key={day.index} 
                    className={`p-3.5 border-r border-slate-100 dark:border-zinc-800 last:border-r-0 transition-all ${
                      isHighlighted ? 'bg-primary/5 text-primary border-b-2 border-b-primary' : 'text-text'
                    }`}
                  >
                    <div className={`text-[9px] font-bold tracking-wider ${isHighlighted ? 'text-primary' : 'text-text-muted'}`}>{day.label}</div>
                    <div className={`text-sm font-black mt-0.5 ${isHighlighted ? 'text-primary' : 'text-text'}`}>{day.date}</div>
                  </div>
                );
              })}
            </div>

            {/* Scrollable hourly rows */}
            <div 
              style={{ scrollbarGutter: 'stable' }}
              className="h-[350px] overflow-y-auto bg-white dark:bg-zinc-900 relative scrollbar-thin scrollbar-thumb-gray-250 dark:scrollbar-thumb-zinc-800"
            >
              {/* Rows */}
              <div className="relative select-none">
                {hours.map((hour) => {
                  const hourVal = parseInt(hour);
                  return (
                    <div key={hour} className="grid grid-cols-8 border-b border-slate-100/50 dark:border-zinc-800/40 min-h-[56px] h-auto py-1 group">
                      {/* Hour column */}
                      <div className="flex items-start justify-center pt-2 font-mono text-[9px] font-bold text-text-muted/80 border-r border-slate-100/50 dark:border-zinc-800/40 bg-slate-50/20 dark:bg-zinc-950/10">
                        {hour}
                      </div>
                      
                      {/* Days grid cell slots (7 sibling cells to Hour column) */}
                      {Array.from({ length: 7 }).map((_, dayIdx) => {
                        const targetDay = days.find(d => d.index === dayIdx);
                        if (!targetDay) return null;

                        // Check if there's any scheduled posts in this slot
                        const cellPosts = state.timelinePosts.filter(
                          (p) => (p.date === targetDay.fullDateStr || (!p.date && p.dayIndex === dayIdx)) && parseInt(p.time.split(':')[0]) === hourVal
                        );

                        // Check if the current post we are scheduling belongs to this cell
                        const isCurrentPostInCell = 
                          state.scheduleMode === 'scheduled' &&
                          currentPostDayIndex === dayIdx && 
                          currentPostHourVal === hourVal;
                        const hourPad = `${hourVal.toString().padStart(2, '0')}:00`;
                        const targetDate = new Date(`${targetDay.fullDateStr}T${hourPad}`);
                        const isPast = targetDate.getTime() < new Date().getTime();
                        
                        const isHighlighted = dayIdx === currentPostDayIndex;

                        const isDefaultGolden = dnd.isDefaultGoldenHour(currentPlatform, hourVal);
                        const isDragGolden = dnd.shouldHighlightGoldenOnDrag(dayIdx, hourVal);
                        const isCellHover = dnd.isCellHovered(dayIdx, hourVal);
                        const showGolden = isDefaultGolden || isDragGolden;
                        const goldenStyle = showGolden ? dnd.getGoldenHourStyle(currentPlatform) : null;

                        let tooltipAlignClass = "right-0";
                        if (dayIdx === 0) {
                          tooltipAlignClass = "left-0";
                        }

                        return (
                          <div
                            key={dayIdx}
                            onClick={() => !isPast && handleCellClick(dayIdx, hour)}
                            onDragOver={(e) => !isPast && dnd.handleCellDragOver(e, dayIdx, hourVal)}
                            onDragLeave={() => !isPast && dnd.handleCellDragLeave()}
                            onDrop={(e) => !isPast && dnd.handleCellDrop(e, dayIdx, hourVal)}
                            className={`group/cell border-r border-slate-100/40 dark:border-zinc-800/30 last:border-r-0 h-full p-1.5 relative flex flex-col justify-center gap-1 transition-all duration-200 ${
                              isPast
                                ? 'cursor-not-allowed bg-gray-50/50 dark:bg-zinc-950/20 opacity-60'
                                : 'cursor-crosshair hover:bg-primary/4 dark:hover:bg-primary/8'
                            } ${
                              isCellHover && !isPast
                                ? 'bg-[#F95A19]/8 ring-2 ring-inset ring-[#F95A19]/40 scale-[1.02] z-10'
                                : 'z-0 hover:z-10'
                            } ${
                              isHighlighted ? 'bg-primary/[0.02]' : ''
                            }`}
                            style={showGolden && !isPast ? {
                              backgroundColor: isDragGolden ? goldenStyle?.bg : `${goldenStyle?.bg?.replace('0.06', '0.03') || 'transparent'}`,
                            } : undefined}
                          >
                            {/* Golden Hour indicator */}
                            {showGolden && !isPast && (
                              <div className="absolute inset-0.5 pointer-events-none flex items-end justify-end z-20">
                                <div className="flex items-center gap-1 relative group/golden pointer-events-auto cursor-help p-1.5">
                                  <Star size={10} className={`fill-amber-400 text-amber-500 transition-all duration-200 ${isDragGolden ? 'scale-110 opacity-100' : 'opacity-40 group-hover/golden:opacity-100'}`} />
                                  <span className={`hidden group-hover/golden:block absolute bottom-6 bg-[#1e293b] dark:bg-zinc-800 text-white text-[9.5px] font-bold px-1.5 py-0.5 rounded shadow-xl whitespace-nowrap capitalize z-30 ${tooltipAlignClass}`}>
                                    Giờ Vàng {currentPlatform}
                                  </span>
                                </div>
                              </div>
                            )}

                            {isCurrentPostInCell && (
                              <div
                                draggable
                                onDragStart={(e) => dnd.handleDragStart(e, {
                                  type: 'draft',
                                  platform: state.selectedPlatform || 'facebook',
                                  label: `Bản thảo`,
                                })}
                                onDragEnd={dnd.handleDragEnd}
                                className={`rounded-xl py-1 px-1.5 text-[8.5px] font-black flex items-center gap-1 truncate border-2 border-dashed border-[#F95A19] bg-[#FFF5F1] dark:bg-[#F95A19]/10 text-[#F95A19] shadow-sm cursor-grab active:cursor-grabbing select-none transition-opacity ${
                                  dnd.isDragging ? 'opacity-40' : 'animate-pulse'
                                }`}
                              >
                                <div className="w-3.5 h-3.5 rounded-full bg-white dark:bg-zinc-900 flex items-center justify-center flex-shrink-0 shadow-sm border border-[#F95A19]/35">
                                  {getPlatformIcon(state.selectedPlatform || 'facebook')}
                                </div>
                                <span className="truncate">
                                  Bản thảo
                                </span>
                              </div>
                            )}
                            {cellPosts.map((post) => (
                              <div
                                key={post.id}
                                className={`rounded-xl py-1 px-1.5 text-[8.5px] font-black flex items-center gap-1 truncate shadow-sm border transition-all hover:scale-102 hover:shadow-md cursor-pointer ${getChipColorClass(
                                  post.platform
                                )}`}
                              >
                                <div className="w-3.5 h-3.5 rounded-full bg-white dark:bg-zinc-900 flex items-center justify-center flex-shrink-0 shadow-sm">
                                  {getPlatformIcon(post.platform)}
                                </div>
                                <span>
                                  {post.time}
                                </span>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: PUBLISHING CONFIGS (30% width -> 4 cols) */}
        <div className="lg:col-span-4 bg-card border border-gray-150 dark:border-zinc-800 rounded-3xl p-6 shadow-xl sticky top-28 border-primary/20 ring-1 ring-primary/5">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
              <Settings className="w-4.5 h-4.5 text-white" />
            </div>
            <h3 className="text-base font-bold text-text uppercase tracking-wide">Cài đặt đăng bài</h3>
          </div>

          <div className="space-y-6">
            <div className="space-y-4">
              {/* Date Input */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Ngày đăng</label>
                <div className="relative">
                  <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                  <input 
                    type="date"
                    value={datePart || ''}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="w-full pl-10 pr-3 py-3 rounded-xl border border-gray-250 dark:border-zinc-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-white dark:bg-zinc-900 text-sm font-semibold text-text"
                  />
                </div>
              </div>

              {/* Time Input */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Giờ đăng</label>
                <div className="relative">
                  <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                  <input 
                    type="time"
                    value={timePart || ''}
                    onChange={(e) => handleTimeChange(e.target.value)}
                    className="w-full pl-10 pr-3 py-3 rounded-xl border border-gray-250 dark:border-zinc-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-white dark:bg-zinc-900 text-sm font-semibold text-text"
                  />
                </div>
              </div>
            </div>

            {/* Extra Toggle Panel */}
            <div className="pt-4 border-t border-gray-150 dark:border-zinc-800/80">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-text-muted">Báo cáo sau đăng bài</span>
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    defaultChecked 
                    className="sr-only peer" 
                  />
                  <div className="w-11 h-6 bg-gray-250 dark:bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
            </div>

            {/* Compact Publishing Schedule Info Card */}
            <div className="pt-4 border-t border-gray-150 dark:border-zinc-800/80 space-y-2">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Lịch xuất bản của bạn</label>
              <div className="bg-primary/5 dark:bg-primary/10 border border-primary/25 rounded-xl p-3.5 flex items-center justify-between text-xs text-text font-bold">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-white dark:bg-zinc-900 flex items-center justify-center shadow-sm">
                    {getPlatformIcon(currentPlatform)}
                  </div>
                  <span className="capitalize">{currentPlatform}</span>
                </div>
                <div className="text-right">
                  <span className="text-text font-black">
                    {timePart || '09:00'} ngày {datePart ? datePart.split('-').reverse().join('/') : '17/07/2026'}
                  </span>
                </div>
              </div>            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
