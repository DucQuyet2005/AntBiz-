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
  Download,
  X
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import PopupDialog, { PopupType } from '@/components/PopupDialog';
import dynamic from 'next/dynamic';

const CalendarComponent = dynamic(() => import('./CalendarComponent'), { ssr: false });

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
  
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const targetPostId = searchParams ? searchParams.get('postId') : null;
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

  // 1. Sync from URL on mount & when URL search params change (Back/Forward button support)
  useEffect(() => {
    if (!searchParams) return;
    const platParam = searchParams.get('platforms');
    if (platParam) {
      const newPlats = platParam.split(',').map(p => {
        const lower = p.trim().toLowerCase();
        if (lower === 'fb') return 'facebook';
        if (lower === 'ig') return 'instagram';
        return lower;
      }).filter(p => ['facebook', 'instagram', 'threads'].includes(p));

      const sortedCurrent = [...selectedPlatforms].sort().join(',');
      const sortedNew = [...newPlats].sort().join(',');
      if (sortedCurrent !== sortedNew && newPlats.length > 0) {
        setSelectedPlatforms(newPlats);
      }
    } else {
      if (selectedPlatforms.length !== 3) {
        setSelectedPlatforms(['facebook', 'instagram', 'threads']);
      }
    }
  }, [searchParams]);

  // 2. Sync to URL when selectedPlatforms changes
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlPlatforms = selectedPlatforms.map(p => {
      if (p === 'facebook') return 'fb';
      if (p === 'instagram') return 'ig';
      return p;
    });

    const currentPlats = params.get('platforms') || '';
    const sortedCurrent = currentPlats.split(',').sort().join(',');
    const sortedNew = [...urlPlatforms].sort().join(',');

    if (sortedCurrent !== sortedNew) {
      if (urlPlatforms.length === 0) {
        params.delete('platforms');
      } else {
        params.set('platforms', urlPlatforms.join(','));
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }, [selectedPlatforms, pathname, router]);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFromDate, setExportFromDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  });
  const [exportToDate, setExportToDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
  });
  const scrollRef = useRef<HTMLDivElement>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const [selectedCell, setSelectedCell] = useState<{ date: Date; hour: number; posts: any[] } | null>(null);
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date());
  const [highlightedDate, setHighlightedDate] = useState<Date | null>(() => new Date());
  const [draggedPostId, setDraggedPostId] = useState<string | null>(null);
  const [dragOverTime, setDragOverTime] = useState<{ dayIndex: number; timeStr: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const handleExport = (type: 'ical' | 'csv') => {
    const url = `/api/calendar/export/${type}?from=${encodeURIComponent(exportFromDate)}&to=${encodeURIComponent(exportToDate)}`;
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `calendar.${type === 'ical' ? 'ics' : 'csv'}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // FullCalendar States & Refs
  const calendarRef = useRef<any>(null);
  const [activeView, setActiveView] = useState('timeGridWeek');
  const [calendarTitle, setCalendarTitle] = useState('');
  const [confirmDrop, setConfirmDrop] = useState<{
    isOpen: boolean;
    eventId: string;
    newStart: string;
    oldStart: string;
    title: string;
    revert: () => void;
    commit: () => Promise<void>;
  } | null>(null);

  // Query Cache
  const cacheRef = useRef<Record<string, any>>({});
  const clearCache = useCallback(() => {
    cacheRef.current = {};
  }, []);

  // Fetch events function for FullCalendar (Lazy loading according to viewport)
  const fetchCalendarEvents = useCallback(async (fetchInfo: any, successCallback: any, failureCallback: any) => {
    const fromStr = fetchInfo.startStr;
    const toStr = fetchInfo.endStr;
    const cacheKey = `${fromStr}_${toStr}_${selectedPlatforms.join(',')}`;

    if (cacheRef.current[cacheKey]) {
      successCallback(cacheRef.current[cacheKey]);
      return;
    }

    try {
      const url = `/api/calendar?from=${encodeURIComponent(fromStr)}&to=${encodeURIComponent(toStr)}&platforms=${encodeURIComponent(selectedPlatforms.join(','))}`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          cacheRef.current[cacheKey] = json.data;
          successCallback(json.data);
        } else {
          successCallback([]);
        }
      } else {
        failureCallback(new Error('Failed to fetch calendar data'));
      }
    } catch (err) {
      console.error('Error fetching calendar events:', err);
      failureCallback(err);
    }
  }, [selectedPlatforms]);

  // Refetch when platform filter changes
  useEffect(() => {
    clearCache();
    calendarRef.current?.getApi()?.refetchEvents();
  }, [selectedPlatforms, clearCache]);

  // Mini calendar month state — starts at today's month
  const [miniCalMonth, setMiniCalMonth] = useState<Date>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const handlePrevMiniMonth = useCallback(() => {
    setMiniCalMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }, []);

  const handleNextMiniMonth = useCallback(() => {
    setMiniCalMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  }, []);

  const getMiniCalendarDate = useCallback((d: { day: number; isCurrentMonth: boolean; isPrev: boolean }) => {
    if (d.isCurrentMonth) {
      return new Date(miniCalMonth.getFullYear(), miniCalMonth.getMonth(), d.day);
    } else if (d.isPrev) {
      return new Date(miniCalMonth.getFullYear(), miniCalMonth.getMonth() - 1, d.day);
    } else {
      return new Date(miniCalMonth.getFullYear(), miniCalMonth.getMonth() + 1, d.day);
    }
  }, [miniCalMonth]);

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
    
    // Navigate FullCalendar to the selected date
    calendarRef.current?.getApi()?.gotoDate(targetDate);
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
    if (targetPostId && posts.length > 0) {
      const post = posts.find(p => p.id === targetPostId);
      if (post) {
        const date = new Date(post.scheduled_at);
        setSelectedCell({
          date,
          hour: date.getHours(),
          posts: [post]
        });
        
        // Auto navigate to the week of this post
        const day = date.getDay();
        const diff = date.getDate() - day; // Sunday is 0
        const sunday = new Date(date);
        sunday.setDate(diff);
        sunday.setHours(0, 0, 0, 0);
        setCurrentWeekStart(sunday);
        setHighlightedDate(date);

        // Auto navigate FullCalendar
        calendarRef.current?.getApi()?.gotoDate(date);
      }
    }
  }, [targetPostId, posts]);

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
        showPopup(language === 'vi' ? 'Đã hủy lịch đăng bài thành công!' : 'Successfully cancelled scheduled post!', 'success');
        setSelectedCell(null);
        clearCache();
        calendarRef.current?.getApi()?.refetchEvents();
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
  }, [fetchPosts, showPopup, clearCache, language]);

  const handleReschedule = useCallback(async (postId: string, newScheduledAt: string, onRevert?: () => void) => {
    setActionLoadingId(postId);
    try {
      const res = await fetch(`/api/scheduled-posts/${postId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledAt: newScheduledAt }),
      });
      if (res.ok) {
        showPopup(language === 'vi' ? 'Đã dời lịch đăng bài thành công!' : 'Successfully rescheduled post!', 'success');
        clearCache();
        calendarRef.current?.getApi()?.refetchEvents();
        await fetchPosts();
      } else {
        const errJson = await res.json().catch(() => ({}));
        showPopup(errJson.error || 'Lỗi khi thay đổi lịch đăng bài', 'error');
        if (onRevert) onRevert();
      }
    } catch (err) {
      console.error('Reschedule error:', err);
      showPopup('Lỗi kết nối khi dời lịch đăng bài', 'error');
      if (onRevert) onRevert();
    } finally {
      setActionLoadingId(null);
    }
  }, [fetchPosts, showPopup, language, clearCache]);

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
  }, [handleReschedule, posts]);

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
    calendarRef.current?.getApi()?.prev();
  }, []);

  const handleNextWeek = useCallback(() => {
    calendarRef.current?.getApi()?.next();
  }, []);

  const handleToday = useCallback(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day;
    const sunday = new Date(today.setDate(diff));
    sunday.setHours(0, 0, 0, 0);
    setCurrentWeekStart(sunday);
    setHighlightedDate(new Date());
    calendarRef.current?.getApi()?.today();
  }, []);

  const handleViewChange = useCallback((viewType: string) => {
    setActiveView(viewType);
    calendarRef.current?.getApi()?.changeView(viewType);
  }, []);

  const handleDatesSet = useCallback((info: any) => {
    setCalendarTitle(info.view.title);
    const startOfView = new Date(info.start);
    setCurrentWeekStart(startOfView);
  }, []);

  const handleEventClick = useCallback((info: any) => {
    const post = info.event.extendedProps.post;
    const posts = info.event.extendedProps.posts;
    if (posts && posts.length > 0) {
      setSelectedCell({
        date: new Date(info.event.startStr || info.event.start),
        hour: new Date(info.event.startStr || info.event.start).getHours(),
        posts: posts
      });
    } else if (post) {
      setSelectedCell({
        date: new Date(post.scheduled_at),
        hour: new Date(post.scheduled_at).getHours(),
        posts: [post]
      });
    }
  }, []);

  const handleEventDrop = useCallback((info: any) => {
    const { event, oldEvent } = info;
    if (event.extendedProps.status !== 'pending') {
      info.revert();
      return;
    }

    const newStart = event.start;
    const oldStart = oldEvent.start;

    setConfirmDrop({
      isOpen: true,
      eventId: event.id,
      newStart: newStart.toISOString(),
      oldStart: oldStart.toISOString(),
      title: event.title,
      revert: () => info.revert(),
      commit: async () => {
        await handleReschedule(event.id, newStart.toISOString(), () => info.revert());
      }
    });
  }, [handleReschedule]);

  const renderEventContent = useCallback((eventInfo: any) => {
    const { platform, platforms, isMultiple, status } = eventInfo.event.extendedProps;
    let icon = null;
    let bgClass = '';

    if (isMultiple) {
      bgClass = 'bg-indigo-650';
      icon = (
        <div className="flex gap-0.5 items-center shrink-0">
          {(platforms || []).map((plat: string, idx: number) => {
            if (plat === 'facebook') return <Facebook key={idx} size={9} className="text-white fill-white shrink-0" />;
            if (plat === 'instagram') return <Instagram key={idx} size={9} className="text-white shrink-0" />;
            if (plat === 'threads') return <ThreadsIcon key={idx} size={9} className="text-white shrink-0" />;
            return <Globe key={idx} size={9} className="text-white shrink-0" />;
          })}
        </div>
      );
    } else {
      if (platform === 'facebook') {
        icon = <Facebook size={11} className="text-white fill-white shrink-0" />;
        bgClass = 'bg-[#1877F2]';
      } else if (platform === 'instagram') {
        icon = <Instagram size={11} className="text-white shrink-0" />;
        bgClass = 'bg-[#E4405F]';
      } else if (platform === 'threads') {
        icon = <ThreadsIcon size={11} className="text-white shrink-0" />;
        bgClass = 'bg-black text-white';
      } else {
        icon = <Globe size={11} className="text-white shrink-0" />;
        bgClass = 'bg-emerald-600';
      }
    }

    let statusText = '';
    if (!isMultiple) {
      if (status === 'posted') {
        statusText = ' ✓';
      } else if (status === 'failed') {
        statusText = ' ⚠️';
      } else if (status === 'cancelled') {
        statusText = ' ✕';
      }
    }

    return (
      <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-white text-[10px] w-full h-full overflow-hidden ${bgClass}`}>
        {icon}
        <span className="font-extrabold truncate flex-1">{eventInfo.event.title}</span>
        {statusText && <span className="text-[8px] font-black shrink-0">{statusText}</span>}
      </div>
    );
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

  const filteredPosts = posts.filter(post => {
    const platformMatch = selectedPlatforms.includes(post.platform?.toLowerCase() || 'blog');
    if (!platformMatch) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    
    const title = post.captions?.articles?.title || '';
    const aiContent = post.captions?.ai_content || '';
    const editedContent = post.captions?.edited_content || '';
    
    const titleMatch = title.toLowerCase().includes(q);
    const aiContentMatch = aiContent.toLowerCase().includes(q);
    const editedContentMatch = editedContent.toLowerCase().includes(q);
    
    return titleMatch || aiContentMatch || editedContentMatch;
  });

  const hoursArray = Array.from({ length: 24 }, (_, i) => i);
  const formatHour = (hour: number) => {
    if (hour === 0) return '12 AM';
    if (hour === 12) return '12 PM';
    return hour > 12 ? `${hour - 12} PM` : `${hour} AM`;
  };

  // Dynamic mini calendar — compute days for miniCalMonth
  const miniCalendarDays = useMemo(() => {
    const year = miniCalMonth.getFullYear();
    const month = miniCalMonth.getMonth();
    const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: { day: number; isCurrentMonth: boolean; isPrev: boolean }[] = [];

    // Leading days from previous month
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      days.push({ day: daysInPrevMonth - i, isCurrentMonth: false, isPrev: true });
    }
    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ day: i, isCurrentMonth: true, isPrev: false });
    }
    // Trailing days from next month to fill 6 rows (42 cells)
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ day: i, isCurrentMonth: false, isPrev: false });
    }
    return days;
  }, [miniCalMonth]);

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
        
        /* FullCalendar custom variables for premium theme */
        .fc {
          font-family: inherit;
          --fc-border-color: #f1f5f9;
          --fc-page-bg-color: transparent;
          --fc-today-bg-color: rgba(99, 102, 241, 0.04);
          --fc-event-bg-color: #1877F2;
          --fc-event-border-color: transparent;
          --fc-neutral-bg-color: transparent;
        }
        .dark .fc {
          --fc-border-color: #27272a;
          --fc-today-bg-color: rgba(99, 102, 241, 0.08);
        }
        .fc .fc-col-header-cell {
          padding: 8px 0;
          font-weight: 800;
          text-transform: uppercase;
          font-size: 10px;
          letter-spacing: 0.05em;
          color: #94a3b8;
        }
        .fc .fc-col-header-cell-cushion {
          color: inherit;
          text-decoration: none;
        }
        .fc-theme-standard .fc-scrollgrid {
          border: 1px solid var(--fc-border-color) !important;
          border-radius: 12px;
          overflow: hidden;
        }
        .fc .fc-timegrid-slot {
          height: 48px !important;
        }
        .fc .fc-timegrid-slot-label {
          font-size: 10px;
          font-weight: 700;
          color: #94a3b8;
        }
        .fc .fc-event {
          border-radius: 8px !important;
          box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
          border: none !important;
          overflow: hidden;
        }
        .fc .fc-daygrid-event {
          margin-top: 2px !important;
          margin-bottom: 2px !important;
          padding: 2px 4px !important;
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
              <h1 className="text-xl font-black text-slate-805 dark:text-slate-200 tracking-tight leading-none">
                {calendarTitle || getHeaderTitle()}
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

          {/* View Switcher Controls */}
          <div className="flex items-center bg-slate-150 dark:bg-black p-1.5 rounded-2xl border border-slate-200/40 dark:border-zinc-850 select-none">
            <button
              onClick={() => handleViewChange('dayGridMonth')}
              className={`px-4 py-2.5 text-xs font-black rounded-xl transition-all cursor-pointer border-0 ${
                activeView === 'dayGridMonth'
                  ? 'bg-white dark:bg-zinc-650 shadow-sm text-slate-800 dark:text-white'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'
              }`}
            >
              {language === 'vi' ? 'Tháng' : 'Month'}
            </button>
            <button
              onClick={() => handleViewChange('timeGridWeek')}
              className={`px-4 py-2.5 text-xs font-black rounded-xl transition-all cursor-pointer border-0 ${
                activeView === 'timeGridWeek'
                  ? 'bg-white dark:bg-zinc-650 shadow-sm text-slate-800 dark:text-white'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'
              }`}
            >
              {language === 'vi' ? 'Tuần' : 'Week'}
            </button>
            <button
              onClick={() => handleViewChange('timeGridDay')}
              className={`px-4 py-2.5 text-xs font-black rounded-xl transition-all cursor-pointer border-0 ${
                activeView === 'timeGridDay'
                  ? 'bg-white dark:bg-zinc-650 shadow-sm text-slate-800 dark:text-white'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'
              }`}
            >
              {language === 'vi' ? 'Ngày' : 'Day'}
            </button>
          </div>
        </div>

        {/* Export Button */}
        <button
          onClick={() => setShowExportModal(true)}
          className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-white px-4 py-2.5 rounded-xl text-xs font-black transition-all active:scale-95 cursor-pointer border-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 shrink-0"
        >
          <Download size={14} />
          <span>{language === 'vi' ? 'Xuất lịch' : 'Export'}</span>
        </button>
      </div>

      {/* Main Split Grid (Sidebar & Calendar Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">

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

          {/* Mini Monthly Calendar – dynamic */}
          <div className="mini-cal-container rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                {language === 'vi'
                  ? `Tháng ${miniCalMonth.getMonth() + 1}, ${miniCalMonth.getFullYear()}`
                  : miniCalMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' })
                }
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handlePrevMiniMonth}
                  aria-label={language === 'vi' ? 'Tháng trước' : 'Previous month'}
                  className="p-0.5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors focus-visible:outline-none"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  onClick={handleNextMiniMonth}
                  aria-label={language === 'vi' ? 'Tháng sau' : 'Next month'}
                  className="p-0.5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors focus-visible:outline-none"
                >
                  <ChevronRight size={14} />
                </button>
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
                  miniCalMonth.getMonth() === today.getMonth() &&
                  miniCalMonth.getFullYear() === today.getFullYear();
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
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={language === 'vi' ? 'Tìm lịch theo tên...' : 'Search schedules...'}
              aria-label={language === 'vi' ? 'Tìm kiếm lịch đăng bài' : 'Search scheduled posts'}
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
                className={`platform-filter-btn flex items-center justify-between px-3 py-2.5 rounded-2xl border transition-all text-left cursor-pointer w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${selectedPlatforms.includes('facebook')
                    ? 'border-blue-200 dark:border-blue-500 bg-blue-50/30 dark:bg-blue-950/40'
                    : 'border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/80 hover:bg-slate-100 dark:hover:bg-zinc-700/80'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-3 h-3 rounded-full transition-all ${selectedPlatforms.includes('facebook') ? 'bg-blue-600 scale-110 shadow-sm' : 'bg-slate-300 dark:bg-zinc-600'
                    }`} />
                  <span className={`text-xs font-bold ${selectedPlatforms.includes('facebook') ? 'text-blue-900 dark:text-blue-400 font-extrabold' : 'text-slate-500 dark:text-zinc-400'}`}>Facebook</span>
                </div>
                <div className={`w-6 h-3.5 rounded-full p-0.5 transition-colors cursor-pointer ${selectedPlatforms.includes('facebook') ? 'bg-slate-400 dark:bg-zinc-500' : 'bg-slate-200 dark:bg-zinc-700'
                  }`}>
                  <div className={`w-2.5 h-2.5 bg-white rounded-full transition-transform ${selectedPlatforms.includes('facebook') ? 'translate-x-2.5' : 'translate-x-0'
                    }`} />
                </div>
              </button>

              {/* Instagram */}
              <button
                onClick={() => handleTogglePlatform('instagram')}
                role="switch"
                aria-checked={selectedPlatforms.includes('instagram')}
                className={`platform-filter-btn flex items-center justify-between px-3 py-2.5 rounded-2xl border transition-all text-left cursor-pointer w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${selectedPlatforms.includes('instagram')
                    ? 'border-blue-200 dark:border-blue-500 bg-blue-50/30 dark:bg-blue-950/40'
                    : 'border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/80 hover:bg-slate-100 dark:hover:bg-zinc-700/80'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-3 h-3 rounded-full transition-all ${selectedPlatforms.includes('instagram') ? 'bg-pink-500 scale-110 shadow-sm' : 'bg-slate-300 dark:bg-zinc-600'
                    }`} />
                  <span className={`text-xs font-bold ${selectedPlatforms.includes('instagram') ? 'text-pink-900 dark:text-pink-400 font-extrabold' : 'text-slate-500'}`}>Instagram</span>
                </div>
                <div className={`w-6 h-3.5 rounded-full p-0.5 transition-colors cursor-pointer ${selectedPlatforms.includes('instagram') ? 'bg-slate-400 dark:bg-zinc-500' : 'bg-slate-200 dark:bg-zinc-700'
                  }`}>
                  <div className={`w-2.5 h-2.5 bg-white rounded-full transition-transform ${selectedPlatforms.includes('instagram') ? 'translate-x-2.5' : 'translate-x-0'
                    }`} />
                </div>
              </button>

              {/* Threads */}
              <button
                onClick={() => handleTogglePlatform('threads')}
                role="switch"
                aria-checked={selectedPlatforms.includes('threads')}
                className={`platform-filter-btn flex items-center justify-between px-3 py-2.5 rounded-2xl border transition-all text-left cursor-pointer w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${selectedPlatforms.includes('threads')
                    ? 'border-blue-200 dark:border-blue-500 bg-blue-50/30 dark:bg-blue-950/40'
                    : 'border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/80 hover:bg-slate-100 dark:hover:bg-zinc-700/80'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-3 h-3 rounded-full transition-all ${selectedPlatforms.includes('threads') ? 'bg-black dark:bg-white scale-110 shadow-sm' : 'bg-slate-300 dark:bg-zinc-600'
                    }`} />
                  <span className={`text-xs font-bold ${selectedPlatforms.includes('threads') ? 'text-zinc-900 dark:text-white font-extrabold' : 'text-slate-500 dark:text-zinc-400'}`}>Threads</span>
                </div>
                <div className={`w-6 h-3.5 rounded-full p-0.5 transition-colors cursor-pointer ${selectedPlatforms.includes('threads') ? 'bg-slate-400 dark:bg-zinc-500' : 'bg-slate-200 dark:bg-zinc-700'
                  }`}>
                  <div className={`w-2.5 h-2.5 bg-white rounded-full transition-transform ${selectedPlatforms.includes('threads') ? 'translate-x-2.5' : 'translate-x-0'
                    }`} />
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: FullCalendar Grid */}
        <div className="col-span-12 lg:col-span-9 bg-white dark:bg-slate-900 border border-slate-100 dark:border-zinc-800 rounded-2xl p-6 shadow-sm shadow-slate-100/40 flex flex-col gap-4 overflow-hidden relative h-[780px]">
          {/* Horizontal Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-50/50 dark:bg-zinc-800/40 rounded-2xl border border-slate-100 dark:border-zinc-850 backdrop-blur-md mb-2">
            <div className="flex items-center gap-2.5">
              <span className="text-[10px] font-black text-slate-550 dark:text-zinc-400 uppercase tracking-widest leading-none">
                {language === 'vi' ? 'Lọc theo kênh:' : 'Filter by platform:'}
              </span>
              <span className="bg-primary/10 text-primary text-[10px] font-black px-2.5 py-0.5 rounded-full select-none">
                {language === 'vi' ? `Kênh đang lọc: ${selectedPlatforms.length}` : `Active: ${selectedPlatforms.length}`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {/* Facebook Chip */}
              <button
                onClick={() => handleTogglePlatform('facebook')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-black transition-all active:scale-95 cursor-pointer ${
                  selectedPlatforms.includes('facebook')
                    ? 'border-blue-200 bg-blue-50/30 text-blue-700 dark:border-blue-550/30 dark:bg-blue-950/20 dark:text-blue-400'
                    : 'border-slate-200 bg-white text-slate-500 dark:border-zinc-800 dark:bg-zinc-900'
                }`}
              >
                <Facebook size={12} className={selectedPlatforms.includes('facebook') ? 'text-blue-650' : 'text-slate-400'} />
                <span>Facebook</span>
              </button>

              {/* Instagram Chip */}
              <button
                onClick={() => handleTogglePlatform('instagram')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-black transition-all active:scale-95 cursor-pointer ${
                  selectedPlatforms.includes('instagram')
                    ? 'border-pink-200 bg-pink-50/30 text-pink-700 dark:border-pink-550/30 dark:bg-pink-950/20 dark:text-pink-400'
                    : 'border-slate-200 bg-white text-slate-500 dark:border-zinc-800 dark:bg-zinc-900'
                }`}
              >
                <Instagram size={12} className={selectedPlatforms.includes('instagram') ? 'text-pink-555' : 'text-slate-400'} />
                <span>Instagram</span>
              </button>

              {/* Threads Chip */}
              <button
                onClick={() => handleTogglePlatform('threads')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-black transition-all active:scale-95 cursor-pointer ${
                  selectedPlatforms.includes('threads')
                    ? 'border-slate-800 bg-slate-900 text-white dark:border-zinc-700 dark:bg-white dark:text-slate-950'
                    : 'border-slate-200 bg-white text-slate-500 dark:border-zinc-800 dark:bg-zinc-900'
                }`}
              >
                <ThreadsIcon size={12} className={selectedPlatforms.includes('threads') ? 'text-white dark:text-slate-950' : 'text-slate-400'} />
                <span>Threads</span>
              </button>
            </div>
          </div>

          <CalendarComponent
            ref={calendarRef}
            initialView="timeGridWeek"
            headerToolbar={false}
            editable={true}
            selectable={true}
            selectMirror={true}
            dayMaxEvents={true}
            weekends={true}
            locale={language === 'vi' ? 'vi' : 'en'}
            events={fetchCalendarEvents}
            eventClick={handleEventClick}
            eventDrop={handleEventDrop}
            eventContent={renderEventContent}
            datesSet={handleDatesSet}
            allDaySlot={false}
            slotDuration="00:30:00"
            snapDuration="00:15:00"
            slotMinTime="00:00:00"
            slotMaxTime="24:00:00"
            height={700}
            scrollTime="07:00:00"
          />
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
                                  <span className={`text-[9px] px-2 py-0.5 rounded-lg font-black uppercase ${post.status === 'posted' ? 'bg-emerald-100 text-emerald-700' :
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

                          <span className={`px-2 py-0.5 rounded-lg border text-[9px] font-black uppercase tracking-wider ${post.status === 'posted' ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60' :
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
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCancel(post.id);
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

      {confirmDrop && (
        <div className="fixed inset-0 z-[70] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4 font-sans">
          <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200/80 dark:border-white/5 shadow-2xl p-6 max-w-md w-full flex flex-col gap-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center border border-amber-200/50">
                <AlertTriangle className="text-amber-600 w-5 h-5" />
              </div>
              <h3 className="text-sm font-black text-slate-805 dark:text-slate-100 uppercase tracking-wide">
                {language === 'vi' ? 'Xác nhận chuyển lịch đăng' : 'Confirm Reschedule'}
              </h3>
            </div>
            <p className="text-xs text-slate-650 dark:text-slate-350 leading-relaxed font-semibold">
              {language === 'vi'
                ? `Bạn có chắc chắn muốn thay đổi lịch đăng bài viết "${confirmDrop.title}"?`
                : `Are you sure you want to reschedule "${confirmDrop.title}"?`}
            </p>
            
            <div className="bg-slate-50 dark:bg-zinc-900/50 rounded-xl p-3.5 border border-slate-100 dark:border-zinc-800 flex flex-col gap-2.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400 font-bold">{language === 'vi' ? 'Thời gian cũ:' : 'Old Time:'}</span>
                <span className="text-slate-700 dark:text-slate-200 font-mono font-bold">
                  {new Date(confirmDrop.oldStart).toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US')}
                </span>
              </div>
              <div className="flex justify-between text-xs border-t border-slate-100 dark:border-zinc-800 pt-2.5">
                <span className="text-slate-400 font-bold">{language === 'vi' ? 'Thời gian mới:' : 'New Time:'}</span>
                <span className="text-primary font-mono font-bold">
                  {new Date(confirmDrop.newStart).toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US')}
                </span>
              </div>
            </div>

            <div className="flex gap-3.5 mt-2">
              <button
                onClick={() => {
                  confirmDrop.revert();
                  setConfirmDrop(null);
                }}
                className="flex-1 bg-slate-100 dark:bg-black hover:bg-slate-200 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 py-3 rounded-2xl font-bold transition-all text-xs cursor-pointer border dark:border-white/5 active:scale-95"
              >
                {language === 'vi' ? 'Hủy' : 'Cancel'}
              </button>
              <button
                onClick={() => {
                  confirmDrop.commit();
                  setConfirmDrop(null);
                }}
                className="flex-1 bg-primary hover:bg-primary-hover text-white py-3 rounded-2xl font-bold transition-all text-xs cursor-pointer active:scale-95 border-0 shadow-lg shadow-primary/20"
              >
                {language === 'vi' ? 'Xác nhận' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {showExportModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/55 backdrop-blur-sm flex items-center justify-center p-4 font-sans"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', duration: 0.35 }}
              className="bg-white dark:bg-slate-950 rounded-3xl border border-slate-200/80 dark:border-zinc-800 shadow-2xl p-6 max-w-md w-full flex flex-col gap-5 select-none"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                    <Download size={18} className="stroke-[2.5]" />
                  </div>
                  <h3 className="text-sm font-black text-slate-850 dark:text-slate-100 uppercase tracking-wider">
                    {language === 'vi' ? 'Xuất lịch đăng bài' : 'Export Editorial Calendar'}
                  </h3>
                </div>
                <button
                  onClick={() => setShowExportModal(false)}
                  className="p-1 rounded-xl text-slate-400 hover:text-slate-650 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer border-0"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Date pickers */}
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    {language === 'vi' ? 'Từ ngày' : 'From Date'}
                  </label>
                  <input
                    type="date"
                    value={exportFromDate}
                    onChange={(e) => setExportFromDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200/60 dark:border-zinc-800 rounded-xl p-3 text-xs font-bold text-slate-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    {language === 'vi' ? 'Đến ngày' : 'To Date'}
                  </label>
                  <input
                    type="date"
                    value={exportToDate}
                    onChange={(e) => setExportToDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200/60 dark:border-zinc-800 rounded-xl p-3 text-xs font-bold text-slate-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3.5 mt-2">
                <button
                  onClick={() => {
                    handleExport('ical');
                    setShowExportModal(false);
                  }}
                  className="bg-primary hover:bg-primary-hover text-white py-3 rounded-2xl font-bold transition-all text-xs cursor-pointer active:scale-95 border-0 shadow-md shadow-primary/10 flex items-center justify-center gap-2"
                >
                  <Download size={13} />
                  <span>iCal (.ics)</span>
                </button>
                <button
                  onClick={() => {
                    handleExport('csv');
                    setShowExportModal(false);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-2xl font-bold transition-all text-xs cursor-pointer active:scale-95 border-0 shadow-md shadow-emerald-600/10 flex items-center justify-center gap-2"
                >
                  <Download size={13} />
                  <span>CSV (.csv)</span>
                </button>
              </div>

              {/* Cancel Button */}
              <button
                onClick={() => setShowExportModal(false)}
                className="w-full bg-slate-100 dark:bg-zinc-900 hover:bg-slate-200 dark:hover:bg-zinc-800/80 text-slate-700 dark:text-zinc-300 py-3 rounded-2xl font-bold transition-all text-xs cursor-pointer border-0 active:scale-95"
              >
                {language === 'vi' ? 'Hủy bỏ' : 'Cancel'}
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
