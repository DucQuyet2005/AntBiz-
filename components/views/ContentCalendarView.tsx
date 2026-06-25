"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Instagram, 
  Facebook, 
  Plus, 
  Rocket, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  ThumbsUp,
  MessageSquare,
  MessageCircle,
  Repeat2,
  Share2,
  Heart,
  Globe,
  Check,
  Search,
  Eye,
  Sliders,
  Send,
  X
} from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import PopupDialog, { PopupType } from '@/components/PopupDialog';

// Threads Custom SVG Logo
const ThreadsIcon = ({ size = 20, className = "" }: { size?: number; className?: string; key?: any }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" className={className}>
    <path d="M22.5 12c0-5.799-4.701-10.5-10.5-10.5S1.5 6.201 1.5 12s4.701 10.5 10.5 10.5c2.328 0 4.475-.758 6.216-2.038l-1.39-1.39C15.42 19.98 13.784 20.5 12 20.5c-4.694 0-8.5-3.806-8.5-8.5s3.806-8.5 8.5-8.5 8.5 3.806 8.5 8.5c0 1.956-.503 3.659-1.42 4.8-.813 1.011-1.923 1.5-3.08 1.5-1.144 0-1.848-.553-2.128-1.123-.391-.798-.328-2.109-.328-3.177v-2.5c0-.828-.672-1.5-1.5-1.5s-1.5.672-1.5 1.5v2.5c0 .356-.002.83-.027 1.309a4 4 0 1 1-3.953-3.809c.28 0 .546.035.803.097V8.539c-.26-.025-.525-.039-.79-.039a7 7 0 1 0 5.679 11.096c.71.91 1.776 1.404 3.018 1.404 2.217 0 4.156-1.134 5.347-2.923 1.15-1.729 1.693-3.992 1.693-6.077zM9.5 12a1 1 0 1 0 2 0 1 1 0 0 0-2 0z" />
  </svg>
);

export default function ContentCalendarView() {
  const { t, language } = useLanguage();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [popup, setPopup] = useState<{ isOpen: boolean; message: string; type: PopupType } | null>(null);

  const showPopup = useCallback((message: string, type: PopupType = 'info') => {
    setPopup({ isOpen: true, message, type });
  }, []);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // States for filters, dropdown, and active selections
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([
    'facebook',
    'instagram',
    'threads'
  ]);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const [selectedCell, setSelectedCell] = useState<{ date: Date; hour: number; posts: any[] } | null>(null);
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date());
  const [highlightedDate, setHighlightedDate] = useState<Date | null>(() => new Date());
  const [draggedPostId, setDraggedPostId] = useState<string | null>(null);
  const [dragOverTime, setDragOverTime] = useState<{ dayIndex: number; timeStr: string } | null>(null);

  const getMiniCalendarDate = (d: { day: number; isCurrentMonth: boolean }) => {
    if (d.isCurrentMonth) {
      return new Date(2026, 5, d.day); // June is month index 5
    } else if (d.day === 31) {
      return new Date(2026, 4, 31); // May is month index 4
    } else {
      return new Date(2026, 6, d.day); // July is month index 6
    }
  };

  const isDateMatch = (d1: Date | null, d2: Date) => {
    if (!d1) return false;
    return d1.getDate() === d2.getDate() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getFullYear() === d2.getFullYear();
  };

  const handleSelectDay = useCallback((targetDate: Date) => {
    const day = targetDate.getDay();
    const diff = targetDate.getDate() - day; // Sunday is 0
    const sunday = new Date(targetDate);
    sunday.setDate(diff);
    sunday.setHours(0, 0, 0, 0);
    setCurrentWeekStart(sunday);
    setHighlightedDate(targetDate);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Base calendar state - June 19, 2026 is Friday
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const baseDate = new Date('2026-06-19T09:09:00+07:00');
    const day = baseDate.getDay();
    const diff = baseDate.getDate() - day; // Sunday is 0
    const sunday = new Date(baseDate.setDate(diff));
    sunday.setHours(0, 0, 0, 0);
    return sunday;
  });

  const fetchPosts = useCallback(async () => {
    try {
      const res = await fetch('/api/scheduled-posts');
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setPosts(json.data);
        }
      }
    } catch (err) {
      console.error('Failed to fetch scheduled posts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
    // Tự động chuyển đến tuần chứa ngày hôm nay khi trang được tải
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day; // Sunday is 0
    const sunday = new Date(today.setDate(diff));
    sunday.setHours(0, 0, 0, 0);
    setCurrentWeekStart(sunday);
  }, []);

  useEffect(() => {
    if (scrollRef.current && !loading) {
      // Pre-scroll to 8 AM (8 * 60 = 480)
      scrollRef.current.scrollTop = 480;
    }
  }, [loading]);

  const handleCancel = useCallback(async (postId: string) => {
    setActionLoadingId(postId);
    try {
      const res = await fetch(`/api/scheduled-posts/${postId}/cancel`, {
        method: 'POST',
      });
      if (res.ok) {
        await fetchPosts();
      } else {
        const errJson = await res.json().catch(() => ({}));
        showPopup(errJson.error || 'Lỗi khi hủy lịch đăng bài', 'error');
      }
    } catch (err) {
      console.error('Cancel error:', err);
      showPopup('Lỗi kết nối khi hủy lịch đăng bài', 'error');
    } finally {
      setActionLoadingId(null);
    }
  }, [fetchPosts, showPopup]);

  const handleReschedule = useCallback(async (postId: string, newScheduledAt: string) => {
    setActionLoadingId(postId);
    try {
      const res = await fetch(`/api/scheduled-posts/${postId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledAt: newScheduledAt }),
      });
      if (res.ok) {
        showPopup(language === 'vi' ? 'Đã dời lịch đăng bài thành công!' : 'Successfully rescheduled post!', 'success');
        await fetchPosts();
      } else {
        const errJson = await res.json().catch(() => ({}));
        showPopup(errJson.error || 'Lỗi khi thay đổi lịch đăng bài', 'error');
      }
    } catch (err) {
      console.error('Reschedule error:', err);
      showPopup('Lỗi kết nối khi dời lịch đăng bài', 'error');
    } finally {
      setActionLoadingId(null);
    }
  }, [fetchPosts, showPopup, language]);

  const handleDragStart = useCallback((e: React.DragEvent<HTMLDivElement>, postId: string) => {
    e.dataTransfer.setData('text/plain', postId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedPostId(postId);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedPostId(null);
    setDragOverTime(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>, dayIdx: number) => {
    e.preventDefault();
    const gridContainer = gridContainerRef.current;
    if (!gridContainer) return;

    const rect = gridContainer.getBoundingClientRect();
    const offsetY = e.clientY - rect.top; // in pixels
    
    // 1 minute = 1 pixel
    let totalMinutes = Math.max(0, Math.min(1439, Math.round(offsetY)));
    // Round to nearest 15 minutes
    totalMinutes = Math.round(totalMinutes / 15) * 15;
    
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

    setDragOverTime({ dayIndex: dayIdx, timeStr });
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverTime(null);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>, dayIdx: number, date: Date) => {
    e.preventDefault();
    setDraggedPostId(null);
    setDragOverTime(null);
    const postId = e.dataTransfer.getData('text/plain');
    if (!postId) return;

    // Prevent dragging/moving if the post is already published
    const draggedPost = posts.find(p => p.id === postId);
    if (draggedPost && draggedPost.status === 'posted') {
      return;
    }

    const gridContainer = gridContainerRef.current;
    if (!gridContainer) return;

    const rect = gridContainer.getBoundingClientRect();
    const offsetY = e.clientY - rect.top; // in pixels
    
    // 1 minute = 1 pixel
    let totalMinutes = Math.max(0, Math.min(1439, Math.round(offsetY)));
    // Round to nearest 15 minutes
    totalMinutes = Math.round(totalMinutes / 15) * 15;
    
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    const newScheduledDate = new Date(date);
    newScheduledDate.setHours(hours, minutes, 0, 0);

    await handleReschedule(postId, newScheduledDate.toISOString());
  }, [handleReschedule]);

  // Check if today is within current week
  const isCurrentWeekToday = () => {
    const start = new Date(currentWeekStart);
    const end = new Date(currentWeekStart);
    end.setDate(start.getDate() + 7);
    return currentTime >= start && currentTime < end;
  };

  const todayIndex = currentTime.getDay(); // Sunday is 0, Monday is 1... Friday is 5.
  const currentTimeOffset = currentTime.getHours() * 60 + currentTime.getMinutes();

  // Weekly Date Range
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(currentWeekStart);
    d.setDate(currentWeekStart.getDate() + i);
    return d;
  });

  const handlePrevWeek = useCallback(() => {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(currentWeekStart.getDate() - 7);
    setCurrentWeekStart(newStart);
  }, [currentWeekStart]);

  const handleNextWeek = useCallback(() => {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(currentWeekStart.getDate() + 7);
    setCurrentWeekStart(newStart);
  }, [currentWeekStart]);

  const handleToday = useCallback(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day;
    const sunday = new Date(today.setDate(diff));
    sunday.setHours(0, 0, 0, 0);
    setCurrentWeekStart(sunday);
    setHighlightedDate(new Date());
  }, []);

  const getDayAndPosition = (scheduledAtStr: string, weekStart: Date) => {
    const scheduledDate = new Date(scheduledAtStr);
    const weekStartMs = weekStart.getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;
    
    const diffDays = Math.floor((scheduledDate.getTime() - weekStartMs) / oneDayMs);
    
    if (diffDays < 0 || diffDays > 6) {
      return null;
    }
    
    const hours = scheduledDate.getHours();
    const minutes = scheduledDate.getMinutes();
    
    return {
      dayIndex: diffDays,
      hours,
      minutes,
      timeStr: scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  const getDayLabel = (date: Date) => {
    const day = date.getDay();
    if (language === 'vi') {
      switch (day) {
        case 0: return 'CN';
        case 1: return 'Thứ 2';
        case 2: return 'Thứ 3';
        case 3: return 'Thứ 4';
        case 4: return 'Thứ 5';
        case 5: return 'Thứ 6';
        case 6: return 'Thứ 7';
        default: return '';
      }
    } else {
      switch (day) {
        case 0: return 'SUN';
        case 1: return 'MON';
        case 2: return 'TUE';
        case 3: return 'WED';
        case 4: return 'THU';
        case 5: return 'FRI';
        case 6: return 'SAT';
        default: return '';
      }
    }
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() && 
           date.getMonth() === today.getMonth() && 
           date.getFullYear() === today.getFullYear();
  };

  const handleTogglePlatform = useCallback((platform: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(platform) 
        ? prev.filter(p => p !== platform) 
        : [...prev, platform]
    );
  }, []);

  const filteredPosts = posts.filter(post => 
    selectedPlatforms.includes(post.platform?.toLowerCase() || 'blog')
  );

  const hoursArray = Array.from({ length: 24 }, (_, i) => i);
  const formatHour = (hour: number) => {
    if (hour === 0) return '12 AM';
    if (hour === 12) return '12 PM';
    return hour > 12 ? `${hour - 12} PM` : `${hour} AM`;
  };

  const miniCalendarDays = [
    { day: 31, isCurrentMonth: false },
    ...Array.from({ length: 30 }, (_, i) => ({ day: i + 1, isCurrentMonth: true })),
    { day: 1, isCurrentMonth: false },
    { day: 2, isCurrentMonth: false },
    { day: 3, isCurrentMonth: false },
    { day: 4, isCurrentMonth: false },
  ];

  const getHeaderTitle = () => {
    const midWeek = new Date(currentWeekStart);
    midWeek.setDate(currentWeekStart.getDate() + 3);
    const month = midWeek.getMonth() + 1;
    const year = midWeek.getFullYear();
    
    if (language === 'vi') {
      return `Tháng ${month}, ${year}`;
    } else {
      const monthsEN = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      return `${monthsEN[midWeek.getMonth()]} ${year}`;
    }
  };

  return (
    <div className="flex flex-col gap-6 font-sans relative pb-10">
      
      {/* INJECT CUSTOM PREMIUM STYLES FOR MOTION & SHAPES */}
      <style jsx global>{`
        @keyframes customPulse {
          0%, 100% { transform: scale(1); opacity: 1; box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
          50% { transform: scale(1.15); opacity: 0.8; box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
        }
        @keyframes popoverShow {
          0% { opacity: 0; transform: translateY(12px) scale(0.96); filter: blur(4px); }
          100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        }
        .animate-radar {
          animation: customPulse 2s infinite ease-in-out;
        }
        .animate-popover {
          animation: popoverShow 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .premium-glass {
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(226, 232, 240, 0.8);
        }
        .sidebar-card-curve {
          border-radius: 28px;
          transition: all 0.3s ease;
        }
        .sidebar-card-curve:hover {
          box-shadow: 0 20px 25px -5px rgba(99, 102, 241, 0.05), 0 8px 10px -6px rgba(99, 102, 241, 0.05);
        }
        .scrollbar-thin::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 20px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        .mini-cal-current {
          color: #334155 !important;
        }
        .dark .mini-cal-current {
          color: #ffffff !important;
        }
        .mini-cal-other {
          color: #cbd5e1 !important;
        }
        .dark .mini-cal-other {
          color: #4b5563 !important;
        }
        .mini-cal-container {
          background-color: rgba(248, 250, 252, 0.5) !important;
          border: 1px solid #f1f5f9 !important;
        }
        .dark .mini-cal-container {
          background-color: #000000 !important;
          border: 1px solid #27272a !important;
        }
        .platform-filter-container {
          border: 1px solid #e2e8f0 !important;
        }
        .dark .platform-filter-container {
          border-color: #3f3f46 !important;
        }
        .dark .platform-filter-btn {
          border-color: #52525b; /* zinc-600 */
        }
      `}</style>

      {/* Top Header: Floating bar */}
      <div className="flex justify-between items-center bg-white dark:bg-black border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20">
              <Calendar size={22} className="stroke-[2.5]" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest leading-none mb-1">
                {language === 'vi' ? 'Lên lịch đăng bài' : 'Editorial Calendar'}
              </span>
              <h1 className="text-xl font-black text-slate-800 dark:text-slate-200 tracking-tight leading-none">
                {getHeaderTitle()}
              </h1>
            </div>
          </div>
          
          {/* Week Changer Controls */}
          <div className="flex items-center bg-slate-150 dark:bg-black p-1.5 rounded-2xl border border-slate-200/40 dark:border-zinc-850 select-none">
            <button 
              onClick={handleToday}
              className="px-4 py-2.5 text-xs font-black text-slate-700 dark:text-white bg-white dark:bg-zinc-600 shadow-sm rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-550 transition-all cursor-pointer border-0 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
            >
              {language === 'vi' ? 'Hôm nay' : 'Today'}
            </button>
            <div className="w-[1px] h-4 bg-slate-350 dark:bg-zinc-800 mx-2" />
            <button 
              onClick={handlePrevWeek}
              className="w-10 h-10 rounded-xl text-slate-650 dark:text-white bg-transparent dark:bg-zinc-700 hover:bg-white/80 dark:hover:bg-zinc-600 hover:shadow-sm transition-all cursor-pointer border-0 active:scale-90 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
              aria-label={language === 'vi' ? 'Tuần trước' : 'Previous week'}
            >
              <ChevronLeft size={15} />
            </button>
            <button 
              onClick={handleNextWeek}
              className="w-10 h-10 rounded-xl text-slate-650 dark:text-white bg-transparent dark:bg-zinc-700 hover:bg-white/80 dark:hover:bg-zinc-600 hover:shadow-sm transition-all cursor-pointer border-0 active:scale-90 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
              aria-label={language === 'vi' ? 'Tuần sau' : 'Next week'}
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Split Grid (Sidebar & Calendar Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Sidebar (Create, Mini Calendar, Platform Toggles) */}
        <div className="col-span-12 lg:col-span-3 bg-white border border-slate-100 rounded-2xl p-5 flex flex-col gap-6 shadow-sm shadow-slate-100/40">
          
          {/* Create Button with menu slide transitions */}
          <div className="relative w-full">
            <button 
              onClick={() => setShowCreateMenu(!showCreateMenu)}
              className="flex items-center justify-between bg-primary hover:bg-primary-hover text-white px-5 py-3.5 rounded-xl text-sm font-black shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-95 cursor-pointer w-full select-none border-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
            >
              <div className="flex items-center gap-3">
                <Plus size={18} className="stroke-[3.5]" />
                <span>{language === 'vi' ? 'Tạo mới' : 'Create'}</span>
              </div>
              <ChevronRight size={14} className={`transition-transform duration-300 ${showCreateMenu ? 'rotate-90' : ''}`} />
            </button>
            
             {showCreateMenu && (
              <div className="absolute left-0 right-0 mt-2 bg-white dark:bg-card border border-slate-200/80 dark:border-white/5 rounded-2xl shadow-xl z-50 py-2 border-collapse overflow-hidden animate-popover">
                <Link 
                  href="/ai-creator" 
                  onClick={() => setShowCreateMenu(false)}
                  className="flex items-center gap-3 px-4 py-3 text-xs font-black text-slate-700 dark:text-text hover:bg-primary/5 hover:text-primary transition-colors w-full cursor-pointer decoration-none border-0"
                >
                  <Sparkles size={14} className="text-primary" />
                  <span>{language === 'vi' ? 'Trình tạo bài viết AI' : 'Create with AI'}</span>
                </Link>
                <Link 
                  href="/archive" 
                  onClick={() => setShowCreateMenu(false)}
                  className="flex items-center gap-3 px-4 py-3 text-xs font-black text-slate-700 dark:text-text hover:bg-emerald-50 dark:hover:bg-emerald-950/20 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors w-full cursor-pointer decoration-none border-0"
                >
                  <Globe size={14} className="text-emerald-600" />
                  <span>{language === 'vi' ? 'Xem kho lưu trữ' : 'View Archive'}</span>
                </Link>
              </div>
            )}
          </div>

          {/* Mini Monthly Calendar (June 2026) */}
          <div className="mini-cal-container rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-black text-slate-800 uppercase tracking-wider">
                {language === 'vi' ? 'Tháng 6, 2026' : 'June 2026'}
              </span>
              <div className="flex items-center gap-1.5">
                <ChevronLeft size={14} className="text-slate-400 cursor-pointer hover:text-slate-700 transition-colors" />
                <ChevronRight size={14} className="text-slate-400 cursor-pointer hover:text-slate-700 transition-colors" />
              </div>
            </div>
            
            <div className="grid grid-cols-7 gap-y-1.5 text-center text-[10px] text-slate-400 font-bold">
              {language === 'vi' 
                ? ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map((d, i) => <div key={i} className="py-0.5">{d}</div>)
                : ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={i} className="py-0.5">{d}</div>)
              }
              {miniCalendarDays.map((d, idx) => {
                const today = new Date();
                const isToday = d.isCurrentMonth && 
                                d.day === today.getDate() && 
                                today.getMonth() === 5 && 
                                today.getFullYear() === 2026;
                const cellDate = getMiniCalendarDate(d);
                const isSelected = highlightedDate && isDateMatch(highlightedDate, cellDate);
                
                const cellClass = isToday
                  ? 'bg-primary text-white hover:bg-primary-hover font-black shadow-md shadow-primary/20'
                  : isSelected
                    ? 'bg-primary/10 text-primary border border-primary/20 shadow-sm'
                    : !d.isCurrentMonth
                      ? 'mini-cal-other hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
                      : 'mini-cal-current hover:bg-slate-200/50 dark:hover:bg-slate-800/50';

                return (
                  <div 
                    key={idx} 
                    onClick={() => handleSelectDay(cellDate)}
                    className={`py-1.5 flex items-center justify-center rounded-xl text-[10px] font-black select-none cursor-pointer transition-all active:scale-90 ${cellClass}`}
                  >
                    {d.day}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Search Mock Panel */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-450 w-4 h-4" />
            <input 
              type="text" 
              placeholder={language === 'vi' ? 'Tìm người, sự kiện...' : 'Search people...'}
              aria-label={language === 'vi' ? 'Tìm kiếm bài viết' : 'Search posts'}
              className="w-full bg-slate-100 border border-slate-200/50 rounded-2xl py-3 pl-10 pr-3.5 text-xs font-bold text-slate-700 placeholder:text-slate-400/80 focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all shadow-inner"
            />
          </div>

          {/* Platform Filters - Slider Toggle style */}
          <div className="flex flex-col gap-3.5 border-t border-slate-100 pt-5">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">
              {language === 'vi' ? 'Lịch của tôi' : 'My Calendars'}
            </span>
            
            <div className="flex flex-col gap-2.5 p-3 rounded-2xl border platform-filter-container bg-transparent">
              {/* Facebook */}
              <button 
                onClick={() => handleTogglePlatform('facebook')}
                role="switch"
                aria-checked={selectedPlatforms.includes('facebook')}
                className={`platform-filter-btn flex items-center justify-between px-3 py-2.5 rounded-2xl border transition-all text-left cursor-pointer w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${
                  selectedPlatforms.includes('facebook') 
                    ? 'border-blue-200 dark:border-blue-500 bg-blue-50/30 dark:bg-blue-950/40' 
                    : 'border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/80 hover:bg-slate-100 dark:hover:bg-zinc-700/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-3 h-3 rounded-full transition-all ${
                    selectedPlatforms.includes('facebook') ? 'bg-blue-600 scale-110 shadow-sm' : 'bg-slate-300 dark:bg-zinc-600'
                  }`} />
                  <span className={`text-xs font-bold ${selectedPlatforms.includes('facebook') ? 'text-blue-900 dark:text-blue-400 font-extrabold' : 'text-slate-500 dark:text-zinc-400'}`}>Facebook</span>
                </div>
                <div className={`w-6 h-3.5 rounded-full p-0.5 transition-colors cursor-pointer ${
                  selectedPlatforms.includes('facebook') ? 'bg-slate-400 dark:bg-zinc-500' : 'bg-slate-200 dark:bg-zinc-700'
                }`}>
                  <div className={`w-2.5 h-2.5 bg-white rounded-full transition-transform ${
                    selectedPlatforms.includes('facebook') ? 'translate-x-2.5' : 'translate-x-0'
                  }`} />
                </div>
              </button>

              {/* Instagram */}
              <button 
                onClick={() => handleTogglePlatform('instagram')}
                role="switch"
                aria-checked={selectedPlatforms.includes('instagram')}
                className={`platform-filter-btn flex items-center justify-between px-3 py-2.5 rounded-2xl border transition-all text-left cursor-pointer w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${
                  selectedPlatforms.includes('instagram') 
                    ? 'border-blue-200 dark:border-blue-500 bg-blue-50/30 dark:bg-blue-950/40' 
                    : 'border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/80 hover:bg-slate-100 dark:hover:bg-zinc-700/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-3 h-3 rounded-full transition-all ${
                    selectedPlatforms.includes('instagram') ? 'bg-pink-500 scale-110 shadow-sm' : 'bg-slate-300 dark:bg-zinc-600'
                  }`} />
                  <span className={`text-xs font-bold ${selectedPlatforms.includes('instagram') ? 'text-pink-900 dark:text-pink-400 font-extrabold' : 'text-slate-500'}`}>Instagram</span>
                </div>
                <div className={`w-6 h-3.5 rounded-full p-0.5 transition-colors cursor-pointer ${
                  selectedPlatforms.includes('instagram') ? 'bg-slate-400 dark:bg-zinc-500' : 'bg-slate-200 dark:bg-zinc-700'
                }`}>
                  <div className={`w-2.5 h-2.5 bg-white rounded-full transition-transform ${
                    selectedPlatforms.includes('instagram') ? 'translate-x-2.5' : 'translate-x-0'
                  }`} />
                </div>
              </button>

              {/* Threads */}
              <button 
                onClick={() => handleTogglePlatform('threads')}
                role="switch"
                aria-checked={selectedPlatforms.includes('threads')}
                className={`platform-filter-btn flex items-center justify-between px-3 py-2.5 rounded-2xl border transition-all text-left cursor-pointer w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${
                  selectedPlatforms.includes('threads') 
                    ? 'border-blue-200 dark:border-blue-500 bg-blue-50/30 dark:bg-blue-950/40' 
                    : 'border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/80 hover:bg-slate-100 dark:hover:bg-zinc-700/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-3 h-3 rounded-full transition-all ${
                    selectedPlatforms.includes('threads') ? 'bg-black dark:bg-black scale-110 shadow-sm' : 'bg-slate-300 dark:bg-zinc-600'
                  }`} />
                  <span className={`text-xs font-bold ${selectedPlatforms.includes('threads') ? 'text-zinc-900 dark:text-black font-extrabold' : 'text-slate-500 dark:text-zinc-400'}`}>Threads</span>
                </div>
                <div className={`w-6 h-3.5 rounded-full p-0.5 transition-colors cursor-pointer ${
                  selectedPlatforms.includes('threads') ? 'bg-slate-400 dark:bg-zinc-500' : 'bg-slate-200 dark:bg-zinc-700'
                }`}>
                  <div className={`w-2.5 h-2.5 bg-white rounded-full transition-transform ${
                    selectedPlatforms.includes('threads') ? 'translate-x-2.5' : 'translate-x-0'
                  }`} />
                </div>
              </button>
            </div>
          </div>



        </div>

        {/* RIGHT COLUMN: Google-Calendar-style Hourly Grid */}
        <div className="hidden md:flex col-span-12 lg:col-span-9 bg-white border border-slate-100 rounded-2xl p-6 shadow-sm shadow-slate-100/40 flex-col gap-4 overflow-x-auto">
          <div className="min-w-[750px] flex flex-col gap-4">
            
            {/* Main Grid Header Rows for Days */}
            <div className="grid grid-cols-[80px_1fr] items-stretch pr-2">
            <div className="flex flex-col justify-end text-[10px] text-slate-400 font-extrabold pb-3 border-b border-slate-100 text-right pr-4 tracking-wider select-none">
              GMT+07
            </div>
            
            <div className="grid grid-cols-7 border-b border-slate-100 pb-3 gap-x-3 text-center">
              {weekDates.map((date, idx) => {
                const isTodayDate = isToday(date);
                const isSelected = highlightedDate && isDateMatch(highlightedDate, date);
                const dayNum = date.getDate();
                const dayLabel = getDayLabel(date);
                
                return (
                  <div 
                    key={idx} 
                    onClick={() => handleSelectDay(date)}
                    className="flex flex-col items-center select-none relative cursor-pointer group"
                  >
                    <span className={`text-[10px] font-black uppercase tracking-wider transition-colors duration-300 ${
                      isTodayDate 
                        ? 'text-primary font-black' 
                        : isSelected 
                          ? 'text-primary font-black' 
                          : 'text-slate-400 group-hover:text-slate-600'
                    }`}>
                      {dayLabel}
                    </span>
                    <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black mt-1 transition-all duration-300 ${
                      isTodayDate 
                        ? 'bg-primary text-white shadow-md shadow-primary/20' 
                        : isSelected
                          ? 'bg-primary/10 text-primary border border-primary/20 shadow-sm scale-105'
                          : 'text-slate-800 hover:bg-slate-100'
                    }`}>
                      {dayNum}
                    </span>
                    {isTodayDate && (
                      <div className="absolute bottom-[-13px] left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-primary rounded-full" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Time Grid Viewport */}
          {loading ? (
            <div className="h-[600px] flex items-center justify-center border border-slate-100 rounded-2xl">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="animate-spin text-primary" size={32} />
                <span className="text-xs font-black text-slate-500 uppercase tracking-widest">{t('common.loading')}</span>
              </div>
            </div>
          ) : (
            <div 
              ref={scrollRef}
              className="h-[600px] overflow-y-auto relative border border-slate-100 dark:border-white/5 rounded-2xl bg-white select-none scrollbar-thin overflow-x-visible shadow-inner"
            >
              <div className="grid grid-cols-[80px_1fr] relative h-[1440px] overflow-x-visible">
                
                {/* Hours Left Column */}
                <div className="border-r border-slate-100 dark:border-white/5 bg-black flex flex-col z-20">
                  {hoursArray.map(hour => (
                    <div key={hour} className="h-[60px] flex items-center justify-end pr-4 text-[10px] text-slate-400 font-bold select-none">
                      {hour > 0 ? formatHour(hour) : ''}
                    </div>
                  ))}
                </div>

                {/* Grid Columns Area */}
                <div ref={gridContainerRef} className="relative h-full grid grid-cols-7 overflow-x-visible">
                  
                  {/* Horizontal Grid Lines */}
                  <div className="absolute inset-0 flex flex-col pointer-events-none z-0">
                    {hoursArray.map(hour => (
                      <div key={hour} className="h-[60px] border-b border-slate-100/70 dark:border-white/5 first:border-t-0"></div>
                    ))}
                  </div>

                  {/* Vertical Column Borders and Highlights */}
                  <div className="absolute inset-0 grid grid-cols-7 pointer-events-none z-0">
                    {weekDates.map((date, i) => {
                      const isHighlighted = highlightedDate && isDateMatch(highlightedDate, date);
                      return (
                        <div 
                          key={i} 
                          className={`border-r border-slate-100/70 dark:border-white/5 h-full last:border-r-0 transition-all duration-300 ${
                            isHighlighted ? 'bg-primary/[0.04]' : ''
                          }`}
                        />
                      );
                    })}
                  </div>

                  {/* Droppable Columns Overlay */}
                  <div className="absolute inset-0 grid grid-cols-7 z-0">
                    {weekDates.map((date, dayIdx) => (
                      <div
                        key={dayIdx}
                        className="h-full w-full relative"
                        onDragOver={(e) => handleDragOver(e, dayIdx)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, dayIdx, date)}
                      >
                        {dragOverTime && dragOverTime.dayIndex === dayIdx && (
                          <div 
                            className="absolute left-0 right-0 border-t border-dashed border-primary/80 pointer-events-none z-30"
                            style={{
                              top: `${parseInt(dragOverTime.timeStr.split(':')[0]) * 60 + parseInt(dragOverTime.timeStr.split(':')[1])}px`
                            }}
                          >
                            <span className="absolute right-1 -top-3.5 bg-primary text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm">
                              {dragOverTime.timeStr}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Dynamic Time Line with Radar Pulse Indicator */}
                  {isCurrentWeekToday() && (
                    <div 
                      className="absolute left-0 right-0 pointer-events-none z-30 font-sans"
                      style={{ 
                        top: `${currentTimeOffset}px`,
                      }}
                    >
                      <div className="relative w-full h-full">
                        {/* Pulse indicator at the left border of the current day column */}
                        <div 
                          className="absolute w-2.5 h-2.5 bg-primary rounded-full -top-[4.5px] z-40 shadow-sm shadow-primary/30"
                          style={{
                            left: `${(todayIndex / 7) * 100}%`,
                            transform: 'translateX(-50%)'
                          }}
                        >
                          <span className="absolute -inset-1.5 rounded-full bg-primary/30 animate-ping pointer-events-none" />
                        </div>
                        {/* High-contrast solid line for the active day column */}
                        <div 
                          className="absolute h-[1.5px] bg-primary z-30"
                          style={{
                            left: `${(todayIndex / 7) * 100}%`,
                            width: `${100 / 7}%`
                          }}
                        />
                        {/* Low-contrast timeline extending across the rest of the week */}
                        <div className="absolute left-0 right-0 h-[1px] bg-primary/25 z-10" />
                      </div>
                    </div>
                  )}

                  {/* Post Event Cards */}
                  {(() => {
                    // 1. Phân loại posts theo từng ngày trong tuần (0 đến 6)
                    const dayPostsArray: any[][] = Array.from({ length: 7 }, () => []);
                    
                    filteredPosts.forEach(post => {
                      const pos = getDayAndPosition(post.scheduled_at, currentWeekStart);
                      if (!pos) return;
                      dayPostsArray[pos.dayIndex].push({
                        ...post,
                        pos
                      });
                    });

                    // 2. Gom nhóm các post trong cùng khoảng 1 giờ (60 phút) của từng ngày
                    const allGroups: any[][] = [];
                    
                    dayPostsArray.forEach((dayPosts) => {
                      if (dayPosts.length === 0) return;
                      
                      // Sắp xếp các bài đăng theo thời gian tăng dần
                      dayPosts.sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
                      
                      let currentGroup: any[] = [dayPosts[0]];
                      
                      for (let i = 1; i < dayPosts.length; i++) {
                        const prevPost = currentGroup[currentGroup.length - 1];
                        const currPost = dayPosts[i];
                        
                        const prevTime = new Date(prevPost.scheduled_at).getTime();
                        const currTime = new Date(currPost.scheduled_at).getTime();
                        
                        // Nếu khoảng cách giữa bài đăng này và bài đăng trước đó trong nhóm <= 60 phút
                        if (currTime - prevTime < 3600000) {
                          currentGroup.push(currPost);
                        } else {
                          allGroups.push(currentGroup);
                          currentGroup = [currPost];
                        }
                      }
                      allGroups.push(currentGroup);
                    });

                    // 3. Render các nhóm bài đăng
                    return allGroups.map((groupPosts) => {
                      const count = groupPosts.length;
                      const firstPost = groupPosts[0];
                      const { dayIndex, hours, minutes } = firstPost.pos;
                      
                      if (count === 1) {
                        const post = firstPost;
                        const { timeStr } = post.pos;
                        const topOffset = hours * 60 + minutes;
                        const cardHeight = 54;
                        
                        const platform = post.platform?.toLowerCase() || 'blog';
                        let borderClass = '';
                        let bgGradient = '';
                        let textClass = '';
                        let iconBg = '';
                        let platformIcon = null;

                        if (post.status === 'posted') {
                          borderClass = 'border-slate-300 dark:border-zinc-800';
                          bgGradient = 'from-slate-100 dark:from-zinc-800/80 to-slate-200/85 dark:to-zinc-900/80';
                          textClass = 'text-slate-400 dark:text-slate-300';
                          iconBg = 'bg-slate-200/70 dark:bg-zinc-900/80 text-slate-400 dark:text-slate-300';
                          if (platform === 'facebook') {
                            platformIcon = <Facebook size={11} className="fill-slate-400 text-slate-400 dark:fill-slate-400 dark:text-slate-300" />;
                          } else if (platform === 'instagram') {
                            platformIcon = <Instagram size={11} className="text-slate-400 dark:text-slate-300" />;
                          } else if (platform === 'threads' || platform === 'thread') {
                            platformIcon = <ThreadsIcon size={11} className="text-slate-400 dark:text-slate-300" />;
                          } else {
                            platformIcon = <Globe size={11} className="text-slate-400 dark:text-slate-300" />;
                          }
                        } else {
                          borderClass = 'border-amber-500/30 hover:border-amber-500/65 dark:border-amber-700/45';
                          bgGradient = 'from-amber-50 dark:from-amber-950/40 to-amber-100/70 dark:to-amber-900/30';
                          textClass = 'text-amber-800 dark:text-amber-200';
                          iconBg = 'bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400';
                          platformIcon = <Globe size={11} className="text-amber-750 dark:text-amber-450" />;

                          if (platform === 'facebook') {
                            borderClass = 'border-blue-600/35 hover:border-blue-600/70 dark:border-blue-700/50';
                            bgGradient = 'from-blue-50 dark:from-blue-950/40 to-blue-100/70 dark:to-blue-900/30';
                            textClass = 'text-blue-900 dark:text-blue-200';
                            iconBg = 'bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400';
                            platformIcon = <Facebook size={11} className="fill-blue-600 text-blue-600 dark:fill-blue-400 dark:text-blue-400" />;
                          } else if (platform === 'instagram') {
                            borderClass = 'border-pink-500/35 hover:border-pink-500/70 dark:border-pink-700/50';
                            bgGradient = 'from-pink-50 dark:from-pink-950/40 to-rose-100/70 dark:to-rose-900/30';
                            textClass = 'text-pink-900 dark:text-pink-200';
                            iconBg = 'bg-pink-100 dark:bg-pink-950/40 text-pink-650 dark:text-pink-400';
                            platformIcon = <Instagram size={11} className="text-pink-650 dark:text-pink-400" />;
                          } else if (platform === 'threads' || platform === 'thread') {
                            borderClass = 'border-slate-800/35 hover:border-slate-800/70 dark:border-slate-700/65';
                            bgGradient = 'from-slate-100 dark:from-slate-800/75 to-slate-200/70 dark:to-slate-700/60';
                            textClass = 'text-slate-950 dark:text-slate-200';
                            iconBg = 'bg-slate-200 dark:bg-black text-slate-800 dark:text-slate-200';
                            platformIcon = <ThreadsIcon size={11} className="text-black dark:text-white" />;
                          } else if (platform === 'blog') {
                            borderClass = 'border-emerald-600/35 hover:border-emerald-600/70 dark:border-emerald-700/40';
                            bgGradient = 'from-emerald-50 dark:from-emerald-950/40 to-teal-100/70 dark:to-emerald-900/30';
                            textClass = 'text-emerald-900 dark:text-emerald-200';
                            iconBg = 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400';
                            platformIcon = <Globe size={11} className="text-emerald-755 dark:text-emerald-450" />;
                          }
                        }

                        let statusIcon = null;
                        if (post.status === 'posted') {
                          statusIcon = <span className="bg-emerald-100 text-emerald-700 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black shadow-sm">✓</span>;
                        } else if (post.status === 'failed') {
                          statusIcon = <span className="bg-rose-100 text-rose-600 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black shadow-sm">⚠️</span>;
                        } else if (post.status === 'cancelled') {
                          statusIcon = <span className="bg-slate-100 text-slate-500 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black shadow-sm">✕</span>;
                        }

                        const title = post.captions?.articles?.title || post.captions?.ai_content?.substring(0, 30) + '...';
                        const isRightSide = dayIndex >= 4;
                        const popoverPositionClass = isRightSide ? 'right-[102%]' : 'left-[102%]';

                        return (
                          <div
                            key={post.id}
                            draggable={post.status !== 'posted'}
                            onDragStart={(e) => {
                              if (post.status === 'posted') {
                                e.preventDefault();
                                return;
                              }
                              handleDragStart(e, post.id);
                            }}
                            onDragEnd={handleDragEnd}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => handleDrop(e, dayIndex, weekDates[dayIndex])}
                            style={{
                              gridColumnStart: dayIndex + 1,
                              gridColumnEnd: dayIndex + 2,
                              top: `${topOffset}px`,
                              height: `${cardHeight}px`
                            }}
                            className={`absolute left-1 right-1 rounded-2xl p-2.5 text-[10px] font-bold border-2 shadow-sm flex flex-col justify-between transition-all duration-300 z-10 group overflow-visible bg-gradient-to-r ${bgGradient} ${borderClass} ${textClass} ${
                              post.status === 'posted'
                                ? 'cursor-not-allowed opacity-75 dark:opacity-80'
                                : 'cursor-pointer hover:-translate-y-[1px] hover:shadow-md'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1 select-none">
                              <div className="flex items-center gap-1.5 truncate">
                                <span className={`w-4 h-4 rounded-lg flex items-center justify-center shadow-inner ${iconBg}`}>
                                  {platformIcon}
                                </span>
                                <span className="truncate text-[9px] font-black tracking-wide font-mono opacity-80">{timeStr}</span>
                              </div>
                              {statusIcon}
                            </div>

                            <span className="truncate text-[9.5px] leading-tight font-black mt-1 tracking-tight select-none">
                              {title}
                            </span>

                            {/* HOVER PREVIEW POPOVER */}
                            <div className={`hidden ${draggedPostId ? '' : 'group-hover:block'} absolute ${popoverPositionClass} top-[-15px] w-[330px] bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-white/5 rounded-2xl shadow-2xl z-50 text-text p-4 cursor-default animate-popover border-collapse`}>
                              
                              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-5 h-5 rounded-lg bg-primary/5 flex items-center justify-center text-primary">
                                    <Sparkles size={11} className="animate-pulse" />
                                  </div>
                                  <span className="text-[10px] font-black uppercase tracking-wider text-primary">
                                    {language === 'vi' ? 'Bản mô phỏng A/B' : 'A/B Mock Preview'}
                                  </span>
                                </div>
                                <span className={`text-[8px] px-2 py-0.5 rounded-lg font-black uppercase tracking-wider ${
                                  post.status === 'posted' ? 'bg-emerald-50 text-emerald-600' :
                                  post.status === 'failed' ? 'bg-rose-50 text-rose-600' :
                                  post.status === 'cancelled' ? 'bg-slate-100 text-slate-500' : 'bg-amber-50 text-amber-600'
                                }`}>
                                  {post.status}
                                </span>
                              </div>

                              {platform === 'facebook' && (
                                <div className="border border-slate-100 rounded-2xl p-3.5 bg-white text-left font-sans shadow-sm">
                                  <div className="flex items-center gap-2.5 mb-2.5">
                                    <div className="w-8 h-8 rounded-full bg-[#1877F2] text-white flex items-center justify-center font-bold text-xs shadow-inner select-none">AB</div>
                                    <div className="flex flex-col">
                                      <span className="text-[10px] font-black text-slate-800 flex items-center gap-0.5 select-none">
                                        AntBiz Official
                                        <span className="w-3.5 h-3.5 bg-blue-500 text-white rounded-full flex items-center justify-center text-[7px] font-bold">✓</span>
                                      </span>
                                      <span className="text-[8px] text-slate-400 font-semibold">Scheduled: {timeStr} · 🌍</span>
                                    </div>
                                  </div>
                                  <p className="text-[10px] text-slate-700 leading-relaxed whitespace-pre-wrap line-clamp-3 mb-3 font-semibold">
                                    {post.captions?.edited_content || post.captions?.ai_content || 'No content available'}
                                  </p>
                                  {post.captions?.articles?.images?.[0]?.url && (
                                    <div className="aspect-[1.91/1] w-full rounded-xl overflow-hidden mb-3 border border-slate-100">
                                      <img src={post.captions.articles.images[0].url} alt="Post asset" className="w-full h-full object-cover" />
                                    </div>
                                  )}
                                  <div className="flex border-t border-slate-100 pt-2.5 text-[9px] text-slate-450 font-bold justify-between select-none">
                                    <span className="hover:text-blue-600 cursor-pointer font-bold">👍 {language === 'vi' ? 'Thích' : 'Like'}</span>
                                    <span className="hover:text-blue-600 cursor-pointer font-bold">💬 {language === 'vi' ? 'Bình luận' : 'Comment'}</span>
                                    <span className="hover:text-blue-600 cursor-pointer font-bold">↩ {language === 'vi' ? 'Chia sẻ' : 'Share'}</span>
                                  </div>
                                </div>
                              )}

                              {platform === 'instagram' && (
                                <div className="border border-slate-100 rounded-2xl p-3.5 bg-white text-left font-sans shadow-sm">
                                  <div className="flex items-center gap-2.5 mb-2.5">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs p-[1px] select-none">
                                      <div className="w-full h-full rounded-full bg-slate-150 dark:bg-black flex items-center justify-center text-slate-800 dark:text-slate-200 text-[9px] font-black">AB</div>
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="text-[10px] font-black text-slate-800">antbiz_official</span>
                                      <span className="text-[8px] text-slate-400 font-semibold">Instagram Post · {timeStr}</span>
                                    </div>
                                  </div>
                                  {post.captions?.articles?.images?.[0]?.url && (
                                    <div className="aspect-[4/3] w-full rounded-xl overflow-hidden mb-3 border border-slate-100">
                                      <img src={post.captions.articles.images[0].url} alt="Post asset" className="w-full h-full object-cover" />
                                    </div>
                                  )}
                                  <p className="text-[10px] text-slate-700 leading-normal line-clamp-3 font-semibold">
                                    <span className="font-black mr-1.5 text-slate-900">antbiz_official</span>
                                    {post.captions?.edited_content || post.captions?.ai_content}
                                  </p>
                                </div>
                              )}

                              {(platform === 'threads' || platform === 'thread') && (
                                <div className="border border-slate-100 rounded-2xl p-3.5 bg-white text-left font-sans shadow-sm">
                                  <div className="flex items-start gap-2.5 mb-2">
                                    <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs select-none">T</div>
                                    <div className="flex-1 flex flex-col">
                                      <div className="flex justify-between items-center select-none">
                                        <span className="text-[10px] font-black text-slate-800">antbiz_official</span>
                                        <span className="text-[8px] text-slate-450 font-semibold">{timeStr}</span>
                                      </div>
                                      <p className="text-[10px] text-slate-700 leading-relaxed whitespace-pre-wrap line-clamp-3 mt-1.5 font-semibold">
                                        {post.captions?.edited_content || post.captions?.ai_content}
                                      </p>
                                    </div>
                                  </div>
                                  {post.captions?.articles?.images?.[0]?.url && (
                                    <div className="aspect-[1.91/1] w-full rounded-xl overflow-hidden mb-3 ml-10 max-w-[calc(100%-40px)] border border-slate-100">
                                      <img src={post.captions.articles.images[0].url} alt="Post asset" className="w-full h-full object-cover" />
                                    </div>
                                  )}
                                  <div className="flex items-center gap-4 text-slate-400 mt-2.5 ml-10 select-none">
                                    <Heart size={12} className="hover:text-red-500 cursor-pointer transition-colors" />
                                    <MessageCircle size={12} className="hover:text-indigo-500 cursor-pointer transition-colors" />
                                    <Repeat2 size={12} className="hover:text-emerald-500 cursor-pointer transition-colors" />
                                    <Share2 size={12} className="hover:text-indigo-500 cursor-pointer transition-colors" />
                                  </div>
                                </div>
                              )}

                              {platform === 'blog' && (
                                <div className="border border-slate-100 rounded-2xl p-3.5 bg-white text-left font-sans shadow-sm">
                                  <div className="flex items-center gap-2.5 mb-2.5">
                                    <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs select-none">B</div>
                                    <div className="flex flex-col">
                                      <span className="text-[10px] font-black text-slate-800">AntBiz Blog</span>
                                      <span className="text-[8px] text-slate-400 font-semibold">Publication · {timeStr}</span>
                                    </div>
                                  </div>
                                  <h4 className="text-[10px] font-black text-emerald-800 truncate mb-1">
                                    {post.captions?.articles?.title}
                                  </h4>
                                  <p className="text-[9.5px] text-slate-500 leading-relaxed line-clamp-3 mb-2.5 font-semibold">
                                    {post.captions?.edited_content || post.captions?.ai_content || post.captions?.articles?.description}
                                  </p>
                                </div>
                              )}

                              <div className="mt-3.5 pt-3.5 border-t border-slate-100 flex items-center justify-between gap-2 select-none">
                                <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wide">
                                  {language === 'vi' ? 'Lên lịch tự động' : 'Auto scheduled'}
                                </span>
                                
                                {post.status === 'pending' && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCancel(post.id);
                                    }}
                                    disabled={actionLoadingId === post.id}
                                    className="bg-rose-50 hover:bg-rose-100 text-rose-600 text-[9px] font-black px-3 py-2 rounded-xl transition-all border border-rose-200/50 disabled:opacity-50 cursor-pointer active:scale-95 flex items-center gap-1"
                                  >
                                    {actionLoadingId === post.id ? <Loader2 size={10} className="animate-spin" /> : null}
                                    <span>{language === 'vi' ? 'Hủy lịch đăng' : 'Cancel Post'}</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      } else {
                        // Stacked layout for multiple posts in same interval
                        const topOffset = hours * 60 + minutes;
                        const cardHeight = 54;
                        const dateOfPost = new Date(firstPost.scheduled_at);
                        const uniquePlatforms = Array.from(new Set(groupPosts.map(gp => gp.platform?.toLowerCase())));

                        const allPosted = groupPosts.every(gp => gp.status === 'posted' || gp.status === 'failed' || gp.status === 'cancelled' || new Date(gp.scheduled_at) < currentTime);

                        return (
                          <React.Fragment key={`multiple-${dayIndex}-${hours}-${minutes}`}>
                            {/* Render helper layers underneath to show stacked deck of cards (only extending upwards) */}
                            {Array.from({ length: Math.min(count - 1, 3) }).map((_, i) => {
                              const layerIndex = i + 1;
                              return (
                                <div
                                  key={`layer-${dayIndex}-${hours}-${minutes}-${layerIndex}`}
                                  style={{
                                    gridColumnStart: dayIndex + 1,
                                    gridColumnEnd: dayIndex + 2,
                                    top: `${topOffset - layerIndex * 3.5}px`,
                                    height: `${cardHeight}px`,
                                    zIndex: 20 - layerIndex,
                                  }}
                                  className={`absolute left-1 right-1 rounded-2xl border shadow-sm pointer-events-none ${
                                    allPosted
                                      ? 'bg-zinc-200 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700/60'
                                      : 'bg-indigo-100 dark:bg-indigo-950 border-primary/20'
                                  }`}
                                />
                              );
                            })}
                            
                            {/* Main Card (Fully solid/opaque background) */}
                            <div
                              onClick={() => {
                                setSelectedCell({ date: dateOfPost, hour: hours, posts: groupPosts });
                              }}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={(e) => handleDrop(e, dayIndex, weekDates[dayIndex])}
                              style={{
                                gridColumnStart: dayIndex + 1,
                                gridColumnEnd: dayIndex + 2,
                                top: `${topOffset}px`,
                                zIndex: 20,
                                height: `${cardHeight}px`
                              }}
                              className={`absolute left-1 right-1 rounded-2xl p-2 border shadow-md flex flex-col justify-between overflow-hidden transition-all group ${
                                allPosted
                                  ? 'bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 cursor-pointer hover:bg-zinc-250 dark:hover:bg-zinc-700'
                                  : 'bg-indigo-50 dark:bg-indigo-900 border border-primary/25 dark:border-primary/45 cursor-pointer hover:shadow-primary/10 hover:-translate-y-[0.5px] active:scale-[0.98]'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1 select-none">
                                <span className={`whitespace-nowrap text-[8px] font-black px-1.5 py-0.5 rounded-md ${
                                  allPosted 
                                    ? 'bg-zinc-300 dark:bg-black text-zinc-600 dark:text-zinc-400 border dark:border-white/5' 
                                    : 'bg-primary/20 text-primary'
                                }`}>
                                  {count} {language === 'vi' ? 'bài' : 'posts'}
                                </span>
                                <div className="flex gap-1 items-center">
                                  {uniquePlatforms.map((plat, idx) => {
                                    if (allPosted) {
                                      if (plat === 'facebook') {
                                        return <Facebook key={idx} size={10} className="text-slate-400 dark:text-slate-500 fill-slate-400 dark:fill-slate-500" />;
                                      } else if (plat === 'threads' || plat === 'thread') {
                                        return <ThreadsIcon key={idx} size={10} className="text-slate-400 dark:text-slate-500" />;
                                      } else if (plat === 'instagram') {
                                        return <Instagram key={idx} size={10} className="text-slate-400 dark:text-slate-500" />;
                                      } else if (plat === 'blog') {
                                        return <Globe key={idx} size={10} className="text-slate-400 dark:text-slate-500" />;
                                      }
                                    } else {
                                      if (plat === 'facebook') {
                                        return <Facebook key={idx} size={10} className="text-[#1877F2] fill-[#1877F2] dark:fill-blue-400 dark:text-blue-400" />;
                                      } else if (plat === 'threads' || plat === 'thread') {
                                        return <ThreadsIcon key={idx} size={10} className="text-black dark:text-white" />;
                                      } else if (plat === 'instagram') {
                                        return <Instagram key={idx} size={10} className="text-pink-650 dark:text-pink-400" />;
                                      } else if (plat === 'blog') {
                                        return <Globe key={idx} size={10} className="text-emerald-700 dark:text-emerald-400" />;
                                      }
                                    }
                                    return null;
                                  })}
                                </div>
                              </div>
                              <span className={`text-[7.5px] font-extrabold tracking-wide uppercase select-none truncate ${
                                allPosted
                                  ? 'text-slate-400 dark:text-slate-500'
                                  : 'text-primary group-hover:text-primary-hover'
                              }`}>
                                {language === 'vi' ? 'Bấm để xem' : 'Click to view'}
                              </span>
                            </div>
                          </React.Fragment>
                        );
                      }
                    });
                  })()}
                </div>

              </div>
            </div>
          )}
          </div>

        </div>

        {/* Mobile Timeline List View */}
        {(() => {
          const currentWeekPosts = filteredPosts.filter(post => {
            const dayPos = getDayAndPosition(post.scheduled_at, currentWeekStart);
            return dayPos !== null;
          }).sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());

          return (
            <div className="flex md:hidden col-span-12 bg-white dark:bg-slate-950 border border-slate-100 dark:border-white/5 rounded-2xl p-5 flex-col gap-5 shadow-sm shadow-slate-100/40 dark:shadow-none">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h2 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide">
                  {language === 'vi' ? 'Danh sách bài đăng tuần này' : 'Schedule List for This Week'}
                </h2>
                <span className="text-[10px] bg-primary/10 text-primary font-black px-2.5 py-0.5 rounded-full">
                  {currentWeekPosts.length} {language === 'vi' ? 'bài viết' : 'posts'}
                </span>
              </div>

              {currentWeekPosts.length === 0 ? (
                <div className="py-8 flex flex-col items-center justify-center text-center gap-2 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                  <Calendar className="text-slate-350 dark:text-slate-600" size={28} />
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    {language === 'vi' ? 'Không có bài đăng nào trong tuần này' : 'No posts scheduled for this week'}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {weekDates.map((date, idx) => {
                    const dayPosts = currentWeekPosts.filter(post => {
                      const postDate = new Date(post.scheduled_at);
                      return postDate.getDate() === date.getDate() &&
                             postDate.getMonth() === date.getMonth() &&
                             postDate.getFullYear() === date.getFullYear();
                    });

                    if (dayPosts.length === 0) return null;

                    const isTodayDate = isToday(date);
                    const dayLabel = getDayLabel(date);

                    return (
                      <div key={idx} className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-black uppercase tracking-wider ${isTodayDate ? 'text-primary' : 'text-slate-700 dark:text-slate-200'}`}>
                            {dayLabel} ({date.getDate()}/{date.getMonth() + 1})
                          </span>
                          {isTodayDate && (
                            <span className="text-[9px] bg-primary text-white font-extrabold px-1.5 py-0.5 rounded-md">
                              {language === 'vi' ? 'Hôm nay' : 'Today'}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex flex-col gap-2 pl-2 border-l-2 border-slate-100 dark:border-slate-800">
                          {dayPosts.map((post) => {
                            const scheduledDate = new Date(post.scheduled_at);
                            const timeStr = scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                            const platform = post.platform?.toLowerCase() || 'blog';
                            const title = post.captions?.articles?.title || post.captions?.ai_content?.substring(0, 50) + '...';
                            
                            let platBg = 'bg-slate-50 dark:bg-black border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300';
                            if (platform === 'facebook') platBg = 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/30 text-blue-900 dark:text-blue-200';
                            else if (platform === 'instagram') platBg = 'bg-pink-50/50 dark:bg-pink-950/20 border-pink-100 dark:border-pink-900/30 text-pink-900 dark:text-pink-200';
                            else if (platform === 'threads' || platform === 'thread') platBg = 'bg-slate-50 dark:bg-black border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100';
                            else if (platform === 'blog') platBg = 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30 text-emerald-900 dark:text-emerald-200';

                            return (
                              <div 
                                key={post.id}
                                onClick={() => {
                                  setSelectedCell({ date: scheduledDate, hour: scheduledDate.getHours(), posts: [post] });
                                }}
                                className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer hover:shadow-sm active:scale-[0.99] transition-all ${platBg}`}
                              >
                                <div className="flex flex-col gap-1 min-w-0">
                                  <span className="text-[10px] font-black tracking-wider font-mono opacity-80">{timeStr}</span>
                                  <span className="text-xs font-black truncate">{title}</span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className={`text-[9px] px-2 py-0.5 rounded-lg font-black uppercase ${
                                    post.status === 'posted' ? 'bg-emerald-100 text-emerald-700' :
                                    post.status === 'failed' ? 'bg-rose-100 text-rose-600' :
                                    post.status === 'cancelled' ? 'bg-slate-100 text-slate-500' : 'bg-amber-100 text-amber-700'
                                  }`}>
                                    {post.status}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

      </div>

      {/* CELL POSTS TIMELINE DIALOG */}
      <AnimatePresence>
        {selectedCell && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4 font-sans"
            onClick={(e) => { if (e.target === e.currentTarget) setSelectedCell(null); }}
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200/80 dark:border-white/5 shadow-2xl p-6 max-w-md w-full flex flex-col gap-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex flex-col">
                  <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide">
                    {language === 'vi' ? 'Chi tiết lịch đăng bài' : 'Schedule Details'}
                  </h3>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                    {language === 'vi' 
                      ? `Ngày ${selectedCell.date.getDate()}/${selectedCell.date.getMonth() + 1}/${selectedCell.date.getFullYear()} · Khung giờ ${selectedCell.hour}:00`
                      : `Date: ${selectedCell.date.getMonth() + 1}/${selectedCell.date.getDate()}/${selectedCell.date.getFullYear()} · Time slot: ${selectedCell.hour}:00`}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedCell(null)}
                  className="text-gray-400 hover:text-slate-650 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-900 p-1.5 rounded-full transition-colors cursor-pointer border-0 bg-transparent"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex flex-col gap-3 overflow-y-auto max-h-[50vh] pr-1">
                {[...selectedCell.posts]
                  .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
                  .map((post: any, idx: number) => {
                    let platIcon = <Globe size={12} />;
                    let platLabel = 'Web';
                    let platBg = 'bg-gray-50 dark:bg-black/40 text-gray-700 dark:text-gray-300 border-gray-200/60 dark:border-slate-850';
                    
                    const platform = post.platform?.toLowerCase() || 'blog';

                    if (platform === 'facebook') {
                      platIcon = <Facebook size={11} className="fill-[#1877F2] text-[#1877F2] dark:fill-blue-400 dark:text-blue-400" />;
                      platLabel = 'Facebook';
                      platBg = 'bg-blue-50 dark:bg-blue-950/40 text-[#1877F2] dark:text-blue-400 border border-blue-100/60 dark:border-blue-900/30';
                    } else if (platform === 'threads' || platform === 'thread') {
                      platIcon = <ThreadsIcon size={11} className="text-black dark:text-white" />;
                      platLabel = 'Threads';
                      platBg = 'bg-slate-50 dark:bg-black text-slate-900 dark:text-slate-100 border border-slate-200/65 dark:border-slate-800';
                    } else if (platform === 'instagram') {
                      platIcon = <Instagram size={11} className="text-pink-650 dark:text-pink-400" />;
                      platLabel = 'Instagram';
                      platBg = 'bg-pink-50 dark:bg-pink-950/40 text-pink-650 dark:text-pink-400 border border-pink-100/60 dark:border-pink-900/30';
                    } else if (platform === 'blog') {
                      platIcon = <Globe size={11} className="text-emerald-700 dark:text-emerald-400" />;
                      platLabel = 'Blog';
                      platBg = 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-100/60 dark:border-emerald-900/30';
                    }

                    const timeStr = post.pos?.timeStr || new Date(post.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const postTitle = post.captions?.articles?.title || post.captions?.ai_content || '';

                    return (
                      <div 
                        key={idx}
                        className="p-3.5 rounded-2xl border border-slate-100 dark:border-slate-850 bg-slate-50/40 dark:bg-slate-950/20 flex flex-col gap-2.5 shadow-sm"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-lg border text-[9px] font-black uppercase tracking-wider flex items-center gap-1 ${platBg}`}>
                              {platIcon}
                              <span>{platLabel}</span>
                            </span>
                            <span className="text-[10px] font-black text-primary bg-primary/5 px-2 py-0.5 rounded-lg border border-primary/10 font-mono">
                              {timeStr}
                            </span>
                          </div>

                          <span className={`px-2 py-0.5 rounded-lg border text-[9px] font-black uppercase tracking-wider ${
                            post.status === 'posted' ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60' :
                            post.status === 'failed' ? 'bg-rose-50 text-rose-700 border-rose-200/60' :
                            post.status === 'cancelled' ? 'bg-slate-100 text-slate-500 border-slate-200/60' :
                            'bg-primary/5 text-primary border-primary/20'
                          }`}>
                            {language === 'vi' 
                              ? (post.status === 'posted' ? 'Đã đăng' : post.status === 'failed' ? 'Lỗi' : post.status === 'cancelled' ? 'Đã hủy' : 'Chờ đăng')
                              : post.status}
                          </span>
                        </div>

                        {postTitle && (
                          <p className="text-xs text-slate-700 dark:text-slate-250 font-bold leading-normal">
                            {postTitle}
                          </p>
                        )}

                        {(post.captions?.edited_content || post.captions?.ai_content) ? (
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium bg-white dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-white/5 max-h-[100px] overflow-y-auto whitespace-pre-wrap">
                            {post.captions?.edited_content || post.captions?.ai_content}
                          </p>
                        ) : null}

                        <div className="flex justify-end gap-2 mt-1">
                          {post.status === 'pending' && (
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                setActionLoadingId(post.id);
                                try {
                                  const res = await fetch(`/api/scheduled-posts/${post.id}/cancel`, {
                                    method: 'POST',
                                  });
                                  if (res.ok) {
                                    const updatedPosts = selectedCell.posts.map(p => 
                                      p.id === post.id ? { ...p, status: 'cancelled' } : p
                                    );
                                    setSelectedCell({ ...selectedCell, posts: updatedPosts });
                                    await fetchPosts();
                                  } else {
                                    const errJson = await res.json().catch(() => ({}));
                                    showPopup(errJson.error || 'Lỗi khi hủy lịch đăng bài', 'error');
                                  }
                                } catch (err) {
                                  console.error('Cancel error:', err);
                                  showPopup('Lỗi kết nối khi hủy lịch đăng bài', 'error');
                                } finally {
                                  setActionLoadingId(null);
                                }
                              }}
                              disabled={actionLoadingId === post.id}
                              className="bg-rose-50 hover:bg-rose-100 text-rose-600 text-[9px] font-black px-2.5 py-1.5 rounded-xl transition-all border border-rose-200/50 disabled:opacity-50 cursor-pointer active:scale-95 flex items-center gap-1"
                            >
                              {actionLoadingId === post.id ? <Loader2 size={10} className="animate-spin" /> : null}
                              <span>{language === 'vi' ? 'Hủy lịch đăng' : 'Cancel Post'}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>

              <button
                onClick={() => setSelectedCell(null)}
                className="w-full bg-slate-100 dark:bg-black hover:bg-slate-200 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 py-3 rounded-2xl font-bold transition-all text-xs cursor-pointer border dark:border-white/5 active:scale-95"
              >
                {language === 'vi' ? 'Đóng' : 'Close'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <PopupDialog
        isOpen={!!popup?.isOpen}
        message={popup?.message || ''}
        type={popup?.type || 'info'}
        onClose={() => setPopup(null)}
      />

    </div>
  );
}
