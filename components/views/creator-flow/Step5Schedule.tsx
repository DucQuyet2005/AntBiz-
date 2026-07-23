'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  Calendar, Clock, Facebook, Instagram, 
  Settings, MoreVertical, Star 
} from 'lucide-react';
import { useCreatorFlow } from '@/frontend/modules/creator-flow';
import { useScheduleDragDrop } from '@/frontend/modules/schedule-dnd';
import { useDynamicGoldenHours } from '@/frontend/modules/scheduled-publishing/use-golden-hours';
import { useLanguage } from '@/contexts/LanguageContext';

// Custom SVG Logo for Threads
const ThreadsIcon = ({ className = '', size = 13 }: { className?: string; size?: number }) => (
  <svg viewBox="0 0 192 192" width={size} height={size} className={className} fill="currentColor">
    <path d="M141.537 88.9883C140.71 88.5919 139.87 88.2104 139.019 87.8451C137.537 60.5382 122.616 44.905 97.5619 44.745C97.4484 44.7443 97.3355 44.7443 97.222 44.7443C82.2364 44.7443 69.7731 51.1409 62.102 62.7807L75.881 72.2328C81.6116 63.5383 90.6052 61.6848 97.2286 61.6848C97.3051 61.6848 97.3819 61.6848 97.4576 61.6855C105.707 61.7381 111.932 64.1366 115.961 68.814C118.893 72.2193 120.854 76.925 121.825 82.8638C114.511 81.6207 106.601 81.2385 98.145 81.7233C74.3247 83.0954 59.0111 96.9879 60.0396 116.292C60.5615 126.084 65.4397 134.508 73.775 140.011C80.8224 144.663 89.899 146.938 99.3323 146.423C111.79 145.74 121.563 140.987 128.381 132.296C133.559 125.696 136.834 117.143 138.28 106.366C144.217 109.949 148.617 114.664 151.047 120.332C155.179 129.967 155.42 145.8 142.501 158.708C131.182 170.016 117.576 174.908 97.0135 175.059C74.2042 174.89 56.9538 167.575 45.7381 153.317C35.2355 139.966 29.8077 120.682 29.6052 96C29.8077 71.3178 35.2355 52.0336 45.7381 38.6827C56.9538 24.4249 74.2039 17.11 97.0132 16.9405C119.988 17.1113 137.539 24.4614 149.184 38.788C154.894 45.8136 159.199 54.6488 162.037 64.9503L178.184 60.6422C174.744 47.9622 169.331 37.0357 161.965 27.974C147.036 9.60668 125.202 0.195148 97.0695 0H96.9569C68.8816 0.19447 47.2921 9.6418 32.7883 28.0793C19.8819 44.4864 13.2244 67.3157 13.0007 95.9325L13 96L13.0007 96.0675C13.2244 124.684 19.8819 147.514 32.7883 163.921C47.2921 182.358 68.8816 191.806 96.9569 192H97.0695C122.03 191.827 139.624 185.292 154.118 170.811C173.081 151.866 172.51 128.119 166.26 113.541C161.776 103.087 153.227 94.5962 141.537 88.9883ZM98.4405 129.507C88.0005 130.095 77.1544 125.409 76.6196 115.372C76.2232 107.93 81.9158 99.626 99.0812 98.6368C101.047 98.5234 102.976 98.468 104.871 98.468C111.106 98.468 116.939 99.0737 122.242 100.233C120.264 124.935 108.662 128.946 98.4405 129.507Z" />
  </svg>
);

const getPlatformIcon = (platform: string) => {
  if (platform === 'facebook') return <Facebook className="w-3.5 h-3.5 text-[#1877F2] fill-[#1877F2]" />;
  if (platform === 'instagram') return <Instagram className="w-3.5 h-3.5 text-[#E1306C]" />;
  if (platform === 'threads') return <ThreadsIcon size={12} />;
  return <Facebook className="w-3.5 h-3.5 text-[#1877F2] fill-[#1877F2]" />;
};

/* Component: ScheduledPostCard (Draggable) */
export function ScheduledPostCard({
  platform,
  time,
  title,
  thumbnail,
  onClick,
  onDragStart,
  onDragEnd,
}: {
  platform: string;
  time: string;
  title: string;
  thumbnail?: string;
  onClick?: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
}) {
  const [isDraggingSelf, setIsDraggingSelf] = useState(false);
  const defaultThumbnail = 'https://images.unsplash.com/photo-1542626991-cbc4e32524cc?q=80&w=300';
  const imgUrl = thumbnail || defaultThumbnail;

  const handleDragStartInternal = (e: React.DragEvent) => {
    if (onDragStart) onDragStart(e);
    // Defer setting opacity-0 so browser builds native drag ghost image first
    setTimeout(() => {
      setIsDraggingSelf(true);
    }, 0);
  };

  const handleDragEndInternal = () => {
    setIsDraggingSelf(false);
    if (onDragEnd) onDragEnd();
  };

  return (
    <div
      draggable
      onDragStart={handleDragStartInternal}
      onDragEnd={handleDragEndInternal}
      onClick={onClick}
      className={`bg-white dark:bg-zinc-900 border border-emerald-400/80 dark:border-emerald-700/60 rounded-xl p-1.5 shadow-xs hover:shadow-md transition-all cursor-grab active:cursor-grabbing select-none space-y-1 w-full max-w-full overflow-hidden z-30 ${
        isDraggingSelf ? 'opacity-0' : 'opacity-100 hover:scale-[1.02]'
      }`}
    >
      <div className="flex items-center gap-1 min-w-0">
        <div className="w-3.5 h-3.5 rounded-full bg-[#1877F2]/10 flex items-center justify-center shrink-0">
          {getPlatformIcon(platform)}
        </div>
        <span className="text-[10px] font-bold text-text truncate">{time}</span>
      </div>

      <p className="text-[9.5px] font-bold text-text leading-tight line-clamp-1">
        {title}
      </p>

      <div className="flex items-center justify-between gap-1 pt-0.5 min-w-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imgUrl}
          alt={title}
          className="w-5 h-5 rounded object-cover shadow-sm bg-gray-100 dark:bg-zinc-800 shrink-0 border border-black/5 dark:border-white/5"
          draggable={false}
        />
      </div>
    </div>
  );
}

/* Component: ChannelSummary */
export function ChannelSummary({
  platform,
  channelName,
  scheduleTimeText,
}: {
  platform: string;
  channelName: string;
  scheduleTimeText: string;
}) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800/60 rounded-xl p-3 flex items-center justify-between shadow-2xs">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-primary flex items-center justify-center shrink-0">
          {getPlatformIcon(platform)}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-text truncate">{channelName}</p>
          <p className="text-[10px] text-text-muted mt-0.5 truncate">{scheduleTimeText}</p>
        </div>
      </div>
      <MoreVertical className="w-4 h-4 text-text-muted shrink-0" />
    </div>
  );
}

/* Component: PublishingSettings */
export function PublishingSettings({
  dateValue,
  timeValue,
  platform,
  reportToggle,
  onDateChange,
  onTimeChange,
  onMinuteSelect,
  onReportToggleChange,
}: {
  dateValue: string;
  timeValue: string;
  platform: string;
  reportToggle: boolean;
  onDateChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onTimeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onMinuteSelect: (minuteStr: string) => void;
  onReportToggleChange: () => void;
}) {
  const { t } = useLanguage();
  const formattedDate = dateValue ? dateValue.split('-').reverse().join('/') : '22/07/2026';
  const scheduleTimeText = `${timeValue || '09:00'} ${formattedDate}`;

  return (
    <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800/60 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4 font-sans select-none">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-primary flex items-center justify-center shrink-0">
          <Settings className="w-3.5 h-3.5" />
        </div>
        <h3 className="text-xs font-extrabold text-text tracking-wide uppercase">{t('creator.step5.settingsTitle')}</h3>
      </div>

      <div className="space-y-3">
        {/* NGÀY ĐĂNG Input */}
        <div className="space-y-1">
          <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider">{t('creator.step5.dateLabel')}</label>
          <div className="relative">
            <input
              type="date"
              value={dateValue}
              onChange={onDateChange}
              className="w-full h-9 pl-3 pr-9 rounded-lg border border-gray-200 dark:border-zinc-800 focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-white dark:bg-zinc-900 text-xs font-semibold text-text transition-all"
            />
            <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
          </div>
        </div>

        {/* GIỜ ĐĂNG Input & Quick Minute Selectors */}
        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider">{t('creator.step5.timeLabel')}</label>
          <div className="relative">
            <input
              type="time"
              value={timeValue}
              onChange={onTimeChange}
              className="w-full h-9 pl-3 pr-9 rounded-lg border border-gray-200 dark:border-zinc-800 focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-white dark:bg-zinc-900 text-xs font-semibold text-text transition-all"
            />
            <Clock className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
          </div>

          {/* Quick Minute Selector Buttons (00, 15, 30, 45) */}
          <div className="flex items-center gap-1.5 pt-1">
            {['00', '15', '30', '45'].map((m) => {
              const currentMin = timeValue ? timeValue.split(':')[1] || '00' : '00';
              const isSelected = currentMin === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => onMinuteSelect(m)}
                  className={`flex-1 py-1 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-primary text-white border-primary shadow-2xs'
                      : 'bg-gray-50 dark:bg-zinc-800/40 border-gray-200 dark:border-zinc-800 text-text-muted hover:text-text hover:border-gray-300'
                  }`}
                >
                  :{m}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-b border-gray-100 dark:border-zinc-800/80" />

      {/* BÁO CÁO SAU ĐĂNG BÀI Toggle */}
      <div className="flex items-center justify-between py-0.5">
        <span className="text-xs font-bold text-text">{t('creator.step5.postReportLabel')}</span>
        <button
          type="button"
          onClick={onReportToggleChange}
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            reportToggle ? 'bg-primary' : 'bg-gray-200 dark:bg-zinc-700'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
              reportToggle ? 'translate-x-4' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Divider */}
      <div className="border-b border-gray-100 dark:border-zinc-800/80" />

      {/* KÊNH XUẤT BẢN Summary Card */}
      <div className="space-y-1.5">
        <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider">{t('creator.step5.channelLabel')}</label>
        <ChannelSummary
          platform={platform}
          channelName={platform === 'facebook' ? 'Facebook' : platform}
          scheduleTimeText={scheduleTimeText}
        />
      </div>
    </div>
  );
}

/* Component: WeeklyTimeline */
export function WeeklyTimeline({
  activeWeekTab,
  onWeekTabChange,
  days,
  hours,
  currentPostDayIndex,
  currentPostHourVal,
  state,
  dnd,
  handleCellClick,
  handleContainerDragOver,
  scrollContainerRef,
  now,
}: {
  activeWeekTab: 'w1' | 'w2' | 'w3';
  onWeekTabChange: (w: 'w1' | 'w2' | 'w3') => void;
  days: Array<{ label: string; date: string; index: number; isToday: boolean; isPastDay: boolean; fullDateStr: string }>;
  hours: string[];
  currentPostDayIndex: number | null;
  currentPostHourVal: number | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  state: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dnd: any;
  handleCellClick: (e: React.MouseEvent, dayIdx: number, hour: number, minute?: number) => void;
  handleContainerDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  now: Date;
}) {
  const currentPlatform = state?.selectedPlatform || 'facebook';
  const { t } = useLanguage();
  const [hoveredSubSlot, setHoveredSubSlot] = useState<{dayIdx: number, hour: number, minute: number} | null>(null);

  // Auto-scroll timeline container to active hour when initialized or changed
  useEffect(() => {
    if (scrollContainerRef.current && currentPostHourVal !== null) {
      const targetScroll = Math.max(0, (currentPostHourVal - 1) * 72);
      scrollContainerRef.current.scrollTo({ top: targetScroll, behavior: 'smooth' });
    }
  }, [currentPostHourVal, scrollContainerRef]);

  return (
    <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800/60 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col font-sans select-none">
      {/* Header controls */}
      <div className="flex flex-wrap gap-3 justify-between items-center mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-primary flex items-center justify-center shrink-0">
            <Calendar className="w-3.5 h-3.5" />
          </div>
          <h3 className="text-xs font-extrabold text-primary tracking-wider uppercase">{t('creator.step5.timelineTitle')}</h3>
        </div>

        {/* Segmented Control */}
        <div className="bg-gray-100 dark:bg-zinc-950 p-1 rounded-xl flex gap-1">
          {(['w1', 'w2', 'w3'] as const).map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => onWeekTabChange(w)}
              className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                activeWeekTab === w
                  ? 'bg-white dark:bg-zinc-900 text-primary shadow-2xs'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              {w === 'w1' ? t('creator.step5.week1') : w === 'w2' ? t('creator.step5.week2') : t('creator.step5.week3')}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar Table Grid Wrapper - Clean SaaS Style */}
      <div className="border border-gray-200 dark:border-zinc-800/60 rounded-xl overflow-hidden bg-white dark:bg-zinc-900">
        
        {/* Days Header Row with Fixed narrow 'Giờ' column */}
        <div className="flex border-b border-gray-200 dark:border-zinc-800/60 bg-gray-50/50 dark:bg-zinc-900/50 text-center">
          <div className="w-14 shrink-0 py-2.5 text-[11px] font-bold text-text-muted border-r border-gray-200 dark:border-zinc-800/60 flex items-center justify-center">
            {t('creator.step5.hourColumnHeader')}
          </div>
          <div className="grid grid-cols-7 flex-1">
            {days.map((day) => {
              const isWed22 = day.label === 'WED' && day.date === '22';
              const isHighlighted = isWed22 || day.index === currentPostDayIndex;
              return (
                <div
                  key={day.index}
                  className={`py-2 px-1 border-r border-gray-200 dark:border-zinc-800/60 last:border-r-0 transition-all ${
                    isHighlighted ? 'bg-emerald-50/70 dark:bg-emerald-950/20 text-primary font-bold border-b-2 border-b-primary' : 'text-text'
                  }`}
                >
                  <div className={`text-[9px] font-bold tracking-wider ${isHighlighted ? 'text-primary' : 'text-text-muted'}`}>{day.label}</div>
                  <div className={`text-xs font-extrabold mt-0.5 ${isHighlighted ? 'text-primary' : 'text-text'}`}>{day.date}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Hourly Rows Container - 24 Hours Scrollable Timeline */}
        <div
          ref={scrollContainerRef}
          onDragOver={handleContainerDragOver}
          className="h-[340px] overflow-y-auto bg-white dark:bg-zinc-900 relative scrollbar-thin scrollbar-thumb-gray-250 dark:scrollbar-thumb-zinc-800"
        >
          <div className="relative">
            {hours.map((hour) => {
              const hourVal = parseInt(hour);
              return (
                <div key={hour} className="flex border-b border-gray-100 dark:border-zinc-800/50 h-[72px] group relative">
                  {/* Hour column - clean minimal typography */}
                  <div className="w-14 shrink-0 flex items-center justify-center font-mono text-[11px] font-semibold text-text-muted border-r border-gray-200 dark:border-zinc-800/60 bg-gray-50/30 dark:bg-zinc-950/20 select-none">
                    {hour}
                  </div>

                  {/* Days grid cell slots (7 equal columns) */}
                  <div className="grid grid-cols-7 flex-1 relative">
                    {Array.from({ length: 7 }).map((_, dayIdx) => {
                      const targetDay = days.find(d => d.index === dayIdx);
                      const isTodayCol = targetDay?.isToday || dayIdx === currentPostDayIndex || (targetDay?.label === 'WED' && targetDay?.date === '22');

                      const isCurrentPostInCell = 
                        currentPostDayIndex === dayIdx && 
                        currentPostHourVal === hourVal;

                      const isCellDragOver = dnd?.dragOverCell?.dayIdx === dayIdx && dnd?.dragOverCell?.hour === hourVal;
                      const activeDragMinute = dnd?.dragOverCell?.minute ?? 0;
                      const isHighlighted = dayIdx === currentPostDayIndex;

                      const isPast = targetDay?.isPastDay || (targetDay?.isToday && hourVal < now.getHours());
                      const isDefaultGolden = dnd.isDefaultGoldenHour(currentPlatform, hourVal);
                      const isDragGolden = dnd.shouldHighlightGoldenOnDrag(dayIdx, hourVal);
                      const showGolden = (isDefaultGolden || isDragGolden) && !isPast;
                      const goldenStyle = showGolden ? dnd.getGoldenHourStyle(currentPlatform) : null;
                      
                      let tooltipAlignClass = "right-0";
                      if (dayIdx === 0) {
                        tooltipAlignClass = "left-0";
                      } else if (dayIdx === 6) {
                        tooltipAlignClass = "right-0";
                      } else {
                        tooltipAlignClass = "left-1/2 -translate-x-1/2";
                      }

                      return (
                        <div
                          key={dayIdx}
                          onDragOver={(e) => dnd.handleCellDragOver(e, dayIdx, hourVal)}
                          onDragLeave={() => dnd.handleCellDragLeave()}
                          onDrop={(e) => dnd.handleCellDrop(e, dayIdx, hourVal)}
                          className={`border-r border-gray-100 dark:border-zinc-800/50 last:border-r-0 relative flex flex-col h-full transition-all ${
                            isCurrentPostInCell
                              ? 'bg-emerald-100/50 dark:bg-emerald-950/35'
                              : isTodayCol
                              ? 'bg-emerald-50/35 dark:bg-emerald-950/20'
                              : isHighlighted
                              ? 'bg-primary/[0.02]'
                              : ''
                          }`}
                          style={showGolden ? {
                            backgroundColor: isDragGolden ? goldenStyle?.bg : `${goldenStyle?.bg?.replace('0.06', '0.03') || 'transparent'}`,
                          } : undefined}
                        >
                          {/* Red current time indicator */}
                          {targetDay?.isToday && now.getHours() === hourVal && (
                            <div
                              className="absolute left-0 right-0 h-[2px] bg-red-500 z-[60] pointer-events-none flex items-center"
                              style={{ top: `${(now.getMinutes() / 60) * 100}%` }}
                            >
                              <div className="absolute left-[-3px] w-2 h-2 rounded-full bg-red-500" />
                            </div>
                          )}

                          {/* Golden Hour indicator */}
                          {showGolden && (
                              <div className="absolute inset-0.5 pointer-events-none flex items-end justify-end z-20">
                                <div className="flex items-center gap-1 relative group/golden pointer-events-auto cursor-help p-1.5">
                                  <Star size={10} className={`fill-amber-400 text-amber-500 transition-all duration-200 ${isDragGolden ? 'scale-110 opacity-100' : 'opacity-40 group-hover/golden:opacity-100'}`} />
                                  <span className={`hidden group-hover/golden:block absolute bottom-6 bg-[#1e293b] dark:bg-zinc-800 text-white text-[9.5px] font-bold px-1.5 py-0.5 rounded shadow-xl whitespace-nowrap capitalize z-30 ${tooltipAlignClass}`}>
                                    Giờ Vàng {currentPlatform}
                                  </span>
                                </div>
                              </div>
                          )}

                          {/* Render 4 Quarter Sub-Slots (00, 15, 30, 45) */}
                          {[0, 15, 30, 45].map((minute) => {
                            const isSubPast = Boolean(targetDay?.isPastDay || (targetDay?.isToday && (hourVal < now.getHours() || (hourVal === now.getHours() && minute < now.getMinutes()))));
                            const isSubHovered = !isSubPast && hoveredSubSlot?.dayIdx === dayIdx && hoveredSubSlot?.hour === hourVal && hoveredSubSlot?.minute === minute;
                            const isSubDragOver = !isSubPast && isCellDragOver && activeDragMinute === minute;
                            const displayTimeStr = `${hourVal.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

                            return (
                              <div
                                key={minute}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!isSubPast) {
                                    handleCellClick(e, dayIdx, hourVal, minute);
                                  }
                                }}
                                onMouseEnter={() => {
                                  if (!isSubPast) setHoveredSubSlot({ dayIdx, hour: hourVal, minute });
                                }}
                                onMouseLeave={() => setHoveredSubSlot(null)}
                                className={`flex-1 relative transition-all duration-100 flex items-center justify-end pr-1 ${
                                  isSubPast
                                    ? 'bg-gray-100/60 dark:bg-zinc-950/70 text-gray-400 dark:text-zinc-600 cursor-not-allowed select-none opacity-50 backdrop-blur-[0.5px]'
                                    : isSubDragOver
                                    ? 'bg-emerald-200/60 dark:bg-emerald-800/50 border-y border-dashed border-primary z-20 cursor-pointer'
                                    : isSubHovered
                                    ? 'bg-emerald-100/50 dark:bg-emerald-950/40 z-10 cursor-pointer'
                                    : 'cursor-pointer'
                                }`}
                              >
                                {(isSubHovered || isSubDragOver) && !isCurrentPostInCell && (
                                  <span className="text-[8.5px] font-extrabold text-primary bg-emerald-100/90 dark:bg-emerald-950/90 px-1 py-0.2 rounded shadow-2xs animate-fade-in pointer-events-none z-10">
                                    {displayTimeStr}
                                  </span>
                                )}
                              </div>
                            );
                          })}

                          {/* Scheduled Post Card Overlay */}
                          {isCurrentPostInCell && (
                            <div className="absolute inset-1 z-30 flex items-center justify-center">
                              <ScheduledPostCard
                                platform={state.selectedPlatform || 'facebook'}
                                time={state.scheduledDateTime.split('T')[1] || `${hour}:00`}
                                title={state.articleContext?.title || "5 mẹo sử dụng AI hiệu quả trong marketing"}
                                thumbnail={state.articleContext?.thumbnail}
                                onDragStart={(e) => dnd.handleDragStart(e, {
                                  id: 'scheduled-post',
                                  type: 'scheduled',
                                  platform: state.selectedPlatform || 'facebook'
                                })}
                                onDragEnd={dnd.handleDragEnd}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* Component: Main Step5Schedule */
export default function Step5Schedule() {
  const { state, dispatch } = useCreatorFlow();
  const [activeWeekTab, setActiveWeekTab] = useState<'w1' | 'w2' | 'w3'>('w1');
  const [reportToggle, setReportToggle] = useState<boolean>(true);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleContainerDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!scrollContainerRef.current) return;

    const container = scrollContainerRef.current;
    const rect = container.getBoundingClientRect();
    const threshold = 60;
    const distanceFromTop = e.clientY - rect.top;
    const distanceFromBottom = rect.bottom - e.clientY;

    if (distanceFromTop > 0 && distanceFromTop < threshold) {
      const intensity = (threshold - distanceFromTop) / threshold;
      container.scrollTop -= Math.ceil(intensity * 16);
    } else if (distanceFromBottom > 0 && distanceFromBottom < threshold) {
      const intensity = (threshold - distanceFromBottom) / threshold;
      container.scrollTop += Math.ceil(intensity * 16);
    }
  }, []);

  const currentPlatform = state.selectedPlatform || 'facebook';
  const { data: dynamicGoldenHours = [] } = useDynamicGoldenHours(currentPlatform);

  const today = new Date();
  const currentDayOfWeek = today.getDay();
  const mondayOffset = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
  const weekShift = activeWeekTab === 'w1' ? 0 : activeWeekTab === 'w2' ? 7 : 14;

  const days = Array.from({ length: 7 }).map((_, idx) => {
    const d = new Date(today);
    const offset = mondayOffset + weekShift + idx;
    d.setDate(today.getDate() + offset);
    const dayLabels = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const isToday = d.toDateString() === today.toDateString();
    const isPastDay = offset < 0;
    return {
      label: dayLabels[d.getDay()],
      date: d.getDate().toString(),
      index: idx,
      isToday,
      isPastDay,
      fullDateStr: d.toISOString().split('T')[0]
    };
  });

  const checkIsPast = useCallback((dayIdx: number, hour: number, minute: number = 0) => {
    const targetDay = days.find(d => d.index === dayIdx);
    if (!targetDay) return true;
    if (targetDay.isPastDay) return true;
    if (targetDay.isToday) {
      if (hour < now.getHours()) return true;
      if (hour === now.getHours() && minute < now.getMinutes()) return true;
    }
    return false;
  }, [days, now]);

  const handleScheduleChange = useCallback((dayIdx: number, hour: number, minute: number = 0) => {
    if (checkIsPast(dayIdx, hour, minute)) return;
    const targetDay = days.find(d => d.index === dayIdx);
    if (!targetDay) return;

    const hourStr = hour.toString().padStart(2, '0');
    const minuteStr = minute.toString().padStart(2, '0');
    const timePad = `${hourStr}:${minuteStr}`;

    dispatch({ type: 'SET_SCHEDULE_DATE_TIME', payload: `${targetDay.fullDateStr}T${timePad}` });
    dispatch({ type: 'SET_SCHEDULE_MODE', payload: 'scheduled' });
  }, [dispatch, days, checkIsPast]);

  const dnd = useScheduleDragDrop(handleScheduleChange, dynamicGoldenHours, checkIsPast);

  // Full 24 Hours: 00:00 to 23:00
  const hours = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);

  const [datePart, timePart] = state.scheduledDateTime.split('T');

  let currentPostDayIndex: number | null = 2; // Default WED
  let currentPostHourVal: number | null = 9;  // Default 09:00

  if (datePart) {
    const selectedDate = new Date(datePart);
    const dayOfWeek = selectedDate.getDay();
    currentPostDayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  }
  if (timePart) {
    currentPostHourVal = parseInt(timePart.split(':')[0]);
  }

  const handleCellClick = (e: React.MouseEvent, dayIndex: number, hour: number, minute: number = 0) => {
    const targetDay = days.find(d => d.index === dayIndex);
    if (!targetDay) return;

    const timePad = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    dispatch({ type: 'SET_SCHEDULE_DATE_TIME', payload: `${targetDay.fullDateStr}T${timePad}` });
    dispatch({ type: 'SET_SCHEDULE_MODE', payload: 'scheduled' });
  };

  const handleMinuteSelect = (minuteStr: string) => {
    const currentHour = timePart ? timePart.split(':')[0] || '09' : '09';
    const currentDate = datePart || '2026-07-22';
    dispatch({ type: 'SET_SCHEDULE_DATE_TIME', payload: `${currentDate}T${currentHour}:${minuteStr}` });
  };

  return (
    <div className="w-full max-w-7xl mx-auto flex-1 py-2 px-3 sm:px-4 select-none">
      {/* 2-Column Responsive Layout (70% Left / 30% Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* Left Column: Weekly Timeline (70% -> lg:col-span-8) */}
        <div className="lg:col-span-8">
          <WeeklyTimeline
            activeWeekTab={activeWeekTab}
            onWeekTabChange={setActiveWeekTab}
            days={days}
            hours={hours}
            currentPostDayIndex={currentPostDayIndex}
            currentPostHourVal={currentPostHourVal}
            state={state}
            dnd={dnd}
            handleCellClick={handleCellClick}
            handleContainerDragOver={handleContainerDragOver}
            scrollContainerRef={scrollContainerRef}
            now={now}
          />
        </div>

        {/* Right Column: Publishing Settings (30% -> lg:col-span-4) */}
        <div className="lg:col-span-4">
          <PublishingSettings
            dateValue={datePart || '2026-07-22'}
            timeValue={timePart || '09:00'}
            platform={state.selectedPlatform || 'facebook'}
            reportToggle={reportToggle}
            onDateChange={(e) => dispatch({ type: 'SET_SCHEDULE_DATE_TIME', payload: `${e.target.value}T${timePart || '09:00'}` })}
            onTimeChange={(e) => dispatch({ type: 'SET_SCHEDULE_DATE_TIME', payload: `${datePart || '2026-07-22'}T${e.target.value}` })}
            onMinuteSelect={handleMinuteSelect}
            onReportToggleChange={() => setReportToggle(prev => !prev)}
          />
        </div>

      </div>
    </div>
  );
}
