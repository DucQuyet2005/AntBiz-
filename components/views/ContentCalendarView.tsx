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
  X,
  Layers,
  Star
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import PopupDialog, { PopupType } from '@/components/PopupDialog';
import dynamic from 'next/dynamic';

const CalendarComponent = dynamic(() => import('./CalendarComponent'), { ssr: false });
const ContentListView = dynamic(() => import('./ContentListView'), { ssr: false });
import { STATIC_GOLDEN_HOURS } from '@/frontend/modules/scheduled-publishing/golden-hour';
import { buildGoogleCalendarUrl } from '@/frontend/modules/scheduled-publishing/google-calendar-helper';


// Threads Custom SVG Logo
const ThreadsIcon = ({ size = 20, className = "" }: { size?: number; className?: string; key?: any }) => (
  <svg viewBox="0 0 192 192" width={size} height={size} fill="currentColor" className={className}>
    <path d="M141.537 88.9883C140.71 88.5919 139.87 88.2104 139.019 87.8451C137.537 60.5382 122.616 44.905 97.5619 44.745C97.4484 44.7443 97.3355 44.7443 97.222 44.7443C82.2364 44.7443 69.7731 51.1409 62.102 62.7807L75.881 72.2328C81.6116 63.5383 90.6052 61.6848 97.2286 61.6848C97.3051 61.6848 97.3819 61.6848 97.4576 61.6855C105.707 61.7381 111.932 64.1366 115.961 68.814C118.893 72.2193 120.854 76.925 121.825 82.8638C114.511 81.6207 106.601 81.2385 98.145 81.7233C74.3247 83.0954 59.0111 96.9879 60.0396 116.292C60.5615 126.084 65.4397 134.508 73.775 140.011C80.8224 144.663 89.899 146.938 99.3323 146.423C111.79 145.74 121.563 140.987 128.381 132.296C133.559 125.696 136.834 117.143 138.28 106.366C144.217 109.949 148.617 114.664 151.047 120.332C155.179 129.967 155.42 145.8 142.501 158.708C131.182 170.016 117.576 174.908 97.0135 175.059C74.2042 174.89 56.9538 167.575 45.7381 153.317C35.2355 139.966 29.8077 120.682 29.6052 96C29.8077 71.3178 35.2355 52.0336 45.7381 38.6827C56.9538 24.4249 74.2039 17.11 97.0132 16.9405C119.988 17.1113 137.539 24.4614 149.184 38.788C154.894 45.8136 159.199 54.6488 162.037 64.9503L178.184 60.6422C174.744 47.9622 169.331 37.0357 161.965 27.974C147.036 9.60668 125.202 0.195148 97.0695 0H96.9569C68.8816 0.19447 47.2921 9.6418 32.7883 28.0793C19.8819 44.4864 13.2244 67.3157 13.0007 95.9325L13 96L13.0007 96.0675C13.2244 124.684 19.8819 147.514 32.7883 163.921C47.2921 182.358 68.8816 191.806 96.9569 192H97.0695C122.03 191.827 139.624 185.292 154.118 170.811C173.081 151.866 172.51 128.119 166.26 113.541C161.776 103.087 153.227 94.5962 141.537 88.9883ZM98.4405 129.507C88.0005 130.095 77.1544 125.409 76.6196 115.372C76.2232 107.93 81.9158 99.626 99.0812 98.6368C101.047 98.5234 102.976 98.468 104.871 98.468C111.106 98.468 116.939 99.0737 122.242 100.233C120.264 124.935 108.662 128.946 98.4405 129.507Z" />
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

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

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
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const goldenHourEvents = useMemo(() => {
    const events: any[] = [];
    const platformColors: Record<string, string> = {
      'facebook': 'rgba(24,119,242,0.04)',
      'instagram': 'rgba(225,48,108,0.04)',
      'threads': 'rgba(0,0,0,0.04)'
    };

    Object.entries(STATIC_GOLDEN_HOURS).forEach(([platform, hours]) => {
      const bg = platformColors[platform] || 'rgba(0,0,0,0.04)';
      (hours as any[]).forEach((gh: { hour: number; label: string; weight: number }) => {
        events.push({
          id: `golden-${platform}-${gh.hour}`,
          title: 'Giờ vàng',
          startTime: `${gh.hour.toString().padStart(2, '0')}:00:00`,
          endTime: `${(gh.hour + 1).toString().padStart(2, '0')}:00:00`,
          daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
          display: 'background',
          backgroundColor: bg,
          classNames: ['golden-hour-bg', `golden-${platform}`]
        });
      });
    });
    return events;
  }, []);

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

    const viewParam = searchParams.get('view');
    if (viewParam === 'list' || viewParam === 'calendar') {
      if (viewParam !== viewMode) setViewMode(viewParam);
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
    }
    
    if (viewMode === 'list') {
      params.set('view', 'list');
    } else {
      params.delete('view');
    }

    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [selectedPlatforms, viewMode, pathname, router]);
  const [subscriptionUrl, setSubscriptionUrl] = useState<string>('');

  // Fetch Webcal subscription link
  useEffect(() => {
    async function fetchToken() {
      try {
        const res = await fetch('/api/calendar/token');
        if (res.ok) {
          const { userId, token } = await res.json();
          const host = window.location.host;
          setSubscriptionUrl(`webcal://${host}/api/calendar/export/ical?userId=${userId}&token=${token}`);
        }
      } catch (err) {
        console.error('Failed to fetch calendar token:', err);
      }
    }
    fetchToken();
  }, []);

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
  const [selectedCell, setSelectedCell] = useState<{ date: Date; hour?: number; title?: string; posts: any[] } | null>(null);
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date());
  const [highlightedDate, setHighlightedDate] = useState<Date | null>(() => new Date());
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
    isMultiple?: boolean;
    posts?: any[];
    selectedPostIds?: string[];
    eventId: string;
    newStart: string;
    oldStart: string;
    title: string;
    revert: () => void;
    commit: (selectedIds?: string[]) => Promise<void>;
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
    calendarRef.current?.getApi()?.today();
    setHighlightedDate(new Date());
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
    const isMultiple = event.extendedProps.isMultiple;
    const posts = event.extendedProps.posts || [];

    // For single event, check its status
    if (!isMultiple && event.extendedProps.status !== 'pending') {
      info.revert();
      return;
    }

    // For multiple events, we only allow rescheduling the pending ones
    const pendingPosts = isMultiple ? posts.filter((p: any) => p.status === 'pending') : [];
    if (isMultiple && pendingPosts.length === 0) {
      info.revert();
      return;
    }

    const newStart = event.start;
    const oldStart = oldEvent.start;

    // Check if new scheduled time is in the past
    if (newStart < new Date()) {
      showPopup(
        language === 'vi'
          ? 'Không thể dời lịch đăng bài viết về thời gian trong quá khứ.'
          : 'Cannot reschedule a post to a past date/time.',
        'error'
      );
      info.revert();
      return;
    }

    setConfirmDrop({
      isOpen: true,
      isMultiple: !!isMultiple,
      posts: isMultiple ? posts : [event.extendedProps.post],
      selectedPostIds: isMultiple ? pendingPosts.map((p: any) => p.id) : [event.id],
      eventId: event.id,
      newStart: newStart.toISOString(),
      oldStart: oldStart.toISOString(),
      title: event.title,
      revert: () => info.revert(),
      commit: async (selectedIds?: string[]) => {
        const idsToUpdate = selectedIds || (isMultiple ? pendingPosts.map((p: any) => p.id) : [event.id]);
        if (idsToUpdate.length === 0) {
          info.revert();
          return;
        }

        if (idsToUpdate.length === 1) {
          await handleReschedule(idsToUpdate[0], newStart.toISOString(), () => info.revert());
        } else {
          // Bulk reschedule API
          setActionLoadingId('bulk');
          try {
            const res = await fetch('/api/scheduled-posts/bulk-reschedule', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ids: idsToUpdate, scheduledAt: newStart.toISOString() }),
            });
            if (res.ok) {
              showPopup(language === 'vi' ? 'Đã dời lịch các bài đăng thành công!' : 'Successfully rescheduled posts!', 'success');
              clearCache();
              calendarRef.current?.getApi()?.refetchEvents();
              await fetchPosts();
            } else {
              const errJson = await res.json().catch(() => ({}));
              showPopup(errJson.error || 'Lỗi khi thay đổi lịch đăng bài', 'error');
              info.revert();
            }
          } catch (err) {
            console.error('Bulk reschedule error:', err);
            showPopup('Lỗi kết nối khi dời lịch đăng bài', 'error');
            info.revert();
          } finally {
            setActionLoadingId(null);
          }
        }
      }
    });
  }, [handleReschedule, showPopup, language, clearCache, fetchPosts]);

  const renderEventContent = useCallback((eventInfo: any) => {
    const isMonthView = eventInfo.view.type === 'dayGridMonth';
    const { platform, platforms, isMultiple, status, posts } = eventInfo.event.extendedProps;

    const isGoldenHour = (postPlatform: string, scheduledAt: string) => {
      const hour = new Date(scheduledAt).getHours();
      const platHours = STATIC_GOLDEN_HOURS[postPlatform as keyof typeof STATIC_GOLDEN_HOURS] || [];
      return platHours.some(gh => gh.hour === hour);
    };

    if (isMultiple) {
      const postsCount = posts ? posts.length : 0;
      const uniquePlatforms = platforms || [];

      if (isMonthView) {
        return (
          <div className="w-full bg-[#EDF3FF] dark:bg-blue-950/40 rounded-lg border border-blue-200/60 dark:border-blue-900/40 px-1.5 py-0.5 flex items-center justify-between cursor-pointer select-none shadow-2xs hover:bg-[#E2EAFB] dark:hover:bg-blue-900/50 transition-colors my-0.5">
            <div className="flex items-center gap-1 min-w-0">
              <Layers size={11} className="text-[#1E40AF] dark:text-blue-300 stroke-[2.5] shrink-0" />
              <span className="text-[9.5px] font-black text-[#1E40AF] dark:text-blue-300 truncate">
                {postsCount} {language === 'vi' ? 'bài' : 'posts'}
              </span>
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              {uniquePlatforms.map((plat: string, idx: number) => {
                if (plat === 'facebook') return <Facebook key={idx} size={10} className="text-[#1877F2] fill-[#1877F2] shrink-0" />;
                if (plat === 'instagram') return <Instagram key={idx} size={10} className="text-[#E4405F] shrink-0" />;
                if (plat === 'threads') return <ThreadsIcon key={idx} size={10} className="text-black dark:text-white shrink-0" />;
                return <Globe key={idx} size={10} className="text-emerald-700 shrink-0" />;
              })}
            </div>
          </div>
        );
      }

      return (
        <div className="w-full h-auto bg-[#EDF3FF] dark:bg-blue-950/40 rounded-xl overflow-hidden cursor-pointer shadow-sm select-none border border-blue-100 dark:border-blue-900/30">
          <div className="flex items-center justify-between px-1.5 py-1 bg-[#E2EAFB] dark:bg-blue-900/40 border-b border-blue-200/50 dark:border-blue-900/50">
            <div className="flex items-center gap-1 text-[#1E40AF] dark:text-blue-300 font-black min-w-0">
              <Layers size={12} className="stroke-[2.5] shrink-0" />
              <div className="flex flex-col leading-none text-center justify-center pt-0.5 shrink-0">
                <span className="text-[11px] leading-none">{postsCount}</span>
                <span className="text-[8px] leading-none mt-[1px]">bài</span>
              </div>
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              {uniquePlatforms.map((plat: string, idx: number) => {
                if (plat === 'facebook') return <Facebook key={idx} size={10} className="text-[#1877F2] fill-[#1877F2] shrink-0" />;
                if (plat === 'instagram') return <Instagram key={idx} size={10} className="text-[#E4405F] shrink-0" />;
                if (plat === 'threads') return <ThreadsIcon key={idx} size={10} className="text-black dark:text-white shrink-0" />;
                return <Globe key={idx} size={10} className="text-emerald-700 shrink-0" />;
              })}
            </div>
          </div>
          <div className="flex flex-col">
            {(posts || []).map((post: any, i: number) => {
              const platform = post.platform === 'thread' ? 'threads' : (post.platform || 'blog');
              const title = post.captions?.articles?.title || post.captions?.ai_content || 'Bài viết...';
              const isGolden = isGoldenHour(platform, post.scheduled_at);
              
              let barColor = 'bg-emerald-500';
              if (platform === 'facebook') barColor = 'bg-[#1877F2]';
              else if (platform === 'instagram') barColor = 'bg-[#E4405F]';
              else if (platform === 'threads') barColor = 'bg-black dark:bg-white';

              return (
                <div key={post.id} className="flex items-center gap-1 px-1.5 py-1 border-b border-blue-100/50 dark:border-blue-900/30 last:border-0 hover:bg-white/40 dark:hover:bg-blue-900/20 transition-colors overflow-hidden w-full">
                  <div className={`w-0.5 h-2.5 rounded-full shrink-0 ${barColor}`} />
                  {isGolden ? <Star size={8} className="text-amber-500 fill-amber-400 shrink-0" /> : <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />}
                  <span className="text-[9px] font-bold text-slate-700 dark:text-slate-300 truncate flex-1 min-w-0">{title}</span>
                </div>
              );
            })}
          </div>
        </div>
      );
    } else {
      const time = new Date(eventInfo.event.start).toLocaleTimeString(language === 'vi' ? 'vi-VN' : 'en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
      const title = eventInfo.event.title;
      const post = eventInfo.event.extendedProps.post;
      const isGolden = post ? isGoldenHour(platform, post.scheduled_at) : false;

      let bgClass = '';
      let borderClass = '';
      let textClass = '';
      let icon = null;

      if (platform === 'facebook') {
        bgClass = 'bg-[#EDF3FF] dark:bg-blue-950/20';
        borderClass = 'border-[#D1E2FF] dark:border-blue-900/30';
        textClass = 'text-[#1E40AF] dark:text-blue-400';
        icon = <Facebook size={11} className="text-[#1877F2] fill-[#1877F2] shrink-0" />;
      } else if (platform === 'instagram') {
        bgClass = 'bg-[#FFF0F2] dark:bg-pink-950/20';
        borderClass = 'border-[#FFB8C6] dark:border-pink-900/30';
        textClass = 'text-[#900A22] dark:text-pink-400';
        icon = <Instagram size={11} className="text-[#E4405F] shrink-0" />;
      } else if (platform === 'threads') {
        bgClass = 'bg-[#F8F9FA] dark:bg-zinc-900/40';
        borderClass = 'border-[#E9ECEF] dark:border-zinc-800';
        textClass = 'text-[#212529] dark:text-zinc-300';
        icon = <ThreadsIcon size={11} className="text-black dark:text-white shrink-0" />;
      } else {
        bgClass = 'bg-[#E8F5E9] dark:bg-emerald-950/20';
        borderClass = 'border-[#C8E6C9] dark:border-emerald-900/30';
        textClass = 'text-[#2E7D32] dark:text-emerald-400';
        icon = <Globe size={11} className="text-[#2E7D32] shrink-0" />;
      }

      let statusIcon = null;
      if (status === 'failed') {
        statusIcon = <AlertTriangle size={9} className="text-rose-500 fill-rose-100 shrink-0 animate-pulse" />;
      } else if (status === 'cancelled') {
        statusIcon = <X size={9} className="text-slate-500 shrink-0 font-bold" />;
      } else if (status === 'posted') {
        statusIcon = <CheckCircle2 size={9} className="text-emerald-500 fill-emerald-100 shrink-0" />;
      }

      if (isMonthView) {
        return (
          <div className={`w-full rounded-lg border ${borderClass} ${bgClass} px-1.5 py-0.5 flex items-center justify-between gap-1 overflow-hidden cursor-pointer select-none shadow-2xs my-0.5`}>
            <div className="flex items-center gap-1 min-w-0 flex-1">
              {icon}
              <span className={`text-[9px] font-extrabold font-mono shrink-0 ${textClass}`}>
                {time}
              </span>
              {isGolden && <Star size={8} className="text-amber-500 fill-amber-400 shrink-0" />}
              <span className={`text-[9.5px] font-bold truncate min-w-0 leading-none ${textClass}`}>
                {title}
              </span>
            </div>
            {statusIcon}
          </div>
        );
      }

      return (
        <div className={`w-full h-full rounded-xl border ${borderClass} ${bgClass} p-1.5 flex flex-col justify-between overflow-hidden cursor-pointer min-h-[45px]`}>
          <div className="flex items-center justify-between gap-1 w-full overflow-hidden">
            <div className="flex items-center gap-1 min-w-0 flex-1">
              {icon}
              <span className={`text-[9px] font-black font-mono truncate ${textClass}`}>
                {time}
              </span>
              {isGolden && <Star size={10} className="text-amber-500 fill-amber-400 shrink-0 ml-0.5" />}
            </div>
            {statusIcon}
          </div>
          <div className={`text-[9px] font-black truncate leading-tight mt-1 w-full ${textClass}`}>
            {title}
          </div>
        </div>
      );
    }
  }, [language]);

  const handleMoreLinkClick = useCallback((arg: any) => {
    const extraPosts: any[] = [];
    const segsToProcess = (arg.hiddenSegs && arg.hiddenSegs.length > 0) ? arg.hiddenSegs : arg.allSegs;

    segsToProcess.forEach((seg: any) => {
      const post = seg.event?.extendedProps?.post;
      const postsList = seg.event?.extendedProps?.posts;
      if (postsList && Array.isArray(postsList)) {
        extraPosts.push(...postsList);
      } else if (post) {
        extraPosts.push(post);
      }
    });

    const uniqueMap = new Map();
    extraPosts.forEach((p) => {
      if (p && p.id) uniqueMap.set(p.id, p);
    });
    const uniquePosts = Array.from(uniqueMap.values());

    const clickDate = arg.date ? new Date(arg.date) : new Date();

    setSelectedCell({
      date: clickDate,
      hour: clickDate.getHours(),
      title: language === 'vi' ? 'Danh sách bài đăng nhóm thêm' : 'Extra Posts Group',
      posts: uniquePosts,
    });

    return 'none';
  }, [language]);

  const handleDateClick = useCallback((info: any) => {
    const clickedDate = new Date(info.dateStr || info.date);
    const dayPosts = posts.filter(post => {
      const d = new Date(post.scheduled_at);
      return d.getDate() === clickedDate.getDate() &&
             d.getMonth() === clickedDate.getMonth() &&
             d.getFullYear() === clickedDate.getFullYear();
    });

    if (dayPosts.length === 0) return;

    setSelectedCell({
      date: clickedDate,
      title: language === 'vi' ? 'Chi tiết lịch đăng bài' : 'Schedule Details',
      posts: dayPosts,
    });
  }, [posts, language]);



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
    const rawPlat = post.platform?.toLowerCase();
    const platKey = rawPlat === 'thread' ? 'threads' : (rawPlat || 'blog');
    const platformMatch = selectedPlatforms.includes(platKey);
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
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          overflow: visible !important;
        }
        .fc-v-event, .fc-h-event {
          background: transparent !important;
          border: none !important;
        }
        .fc-event, .fc-event * {
          cursor: pointer !important;
        }
        .fc-timegrid-event {
          min-height: 58px !important;
        }
        .fc .fc-daygrid-event {
          margin-top: 2px !important;
          margin-bottom: 2px !important;
          padding: 1px 2px !important;
        }
        .fc .fc-daygrid-more-link {
          font-size: 10px !important;
          font-weight: 800 !important;
          color: #1E40AF !important;
          background: #EDF3FF !important;
          border: 1px solid #D1E2FF !important;
          border-radius: 8px !important;
          padding: 2px 6px !important;
          margin-top: 2px !important;
          display: inline-flex !important;
          align-items: center !important;
          transition: all 0.15s ease !important;
          text-decoration: none !important;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05) !important;
        }
        .fc .fc-daygrid-more-link:hover {
          background: #D1E2FF !important;
          color: #1e3a8a !important;
          transform: translateY(-1px) !important;
        }
        .dark .fc .fc-daygrid-more-link {
          color: #60a5fa !important;
          background: rgba(30, 58, 138, 0.4) !important;
          border-color: rgba(30, 64, 175, 0.5) !important;
        }
        .dark .fc .fc-daygrid-more-link:hover {
          background: rgba(30, 58, 138, 0.7) !important;
          color: #93c5fd !important;
        }
        .fc .fc-daygrid-day-frame {
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

        <div className="flex items-center gap-4 shrink-0">
          {/* Calendar/List View Toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-zinc-800 p-1 rounded-xl border border-slate-200 dark:border-zinc-700 select-none">
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center justify-center px-3 py-2 rounded-lg text-xs font-black transition-all cursor-pointer border-0 ${
                viewMode === 'calendar'
                  ? 'bg-white dark:bg-zinc-600 shadow text-primary dark:text-white'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
              title={language === 'vi' ? 'Chế độ Lịch' : 'Calendar View'}
            >
              <Calendar size={16} className={viewMode === 'calendar' ? 'stroke-[2.5]' : ''} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center justify-center px-3 py-2 rounded-lg text-xs font-black transition-all cursor-pointer border-0 ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-zinc-600 shadow text-primary dark:text-white'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
              title={language === 'vi' ? 'Chế độ Danh sách' : 'List View'}
            >
              <Repeat2 size={16} className={viewMode === 'list' ? 'stroke-[2.5]' : ''} />
            </button>
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
        </div>

        {/* RIGHT COLUMN: FullCalendar Grid */}
        <div className="col-span-12 lg:col-span-9 bg-white dark:bg-slate-900 border border-slate-100 dark:border-zinc-800 rounded-2xl p-6 shadow-sm shadow-slate-100/40 flex flex-col gap-4 overflow-hidden relative h-[780px]">
          {/* Horizontal Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-50/50 dark:bg-zinc-800/40 rounded-2xl border border-slate-100 dark:border-zinc-850 backdrop-blur-md mb-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-slate-550 dark:text-zinc-400 uppercase tracking-widest leading-none">
                {language === 'vi' ? 'Lọc theo kênh:' : 'Filter by platform:'}
              </span>
              <span className="bg-primary/10 text-primary text-[10px] font-black px-2.5 py-0.5 rounded-full select-none">
                {language === 'vi' ? `Kênh đang lọc: ${selectedPlatforms.length}` : `Active: ${selectedPlatforms.length}`}
              </span>
              <button
                onClick={() => setSelectedPlatforms(['facebook', 'instagram', 'threads'])}
                className="text-[10px] font-black bg-primary/10 hover:bg-primary/20 text-primary px-2.5 py-1 rounded-lg transition-all border-0 cursor-pointer active:scale-95 ml-2"
              >
                {language === 'vi' ? 'Chọn tất cả' : 'Select All'}
              </button>
              <button
                onClick={() => setSelectedPlatforms([])}
                className="text-[10px] font-black bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-500 dark:text-zinc-400 px-2.5 py-1 rounded-lg transition-all border-0 cursor-pointer active:scale-95 ml-1.5"
              >
                {language === 'vi' ? 'Bỏ chọn' : 'Clear'}
              </button>
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
          {/* View Mode: List vs Calendar Grid */}
          {viewMode === 'list' ? (
            <div className="flex-1 mt-4">
              <ContentListView 
                selectedPlatforms={selectedPlatforms} 
                searchQuery={searchQuery}
                onPostClick={(post) => {
                  setSelectedCell({
                    date: new Date(post.scheduled_at),
                    hour: new Date(post.scheduled_at).getHours(),
                    posts: [post]
                  });
                }}
              />
            </div>
          ) : (
            <div className="flex-1 mt-4 overflow-hidden rounded-xl border border-slate-100 dark:border-zinc-850 bg-white dark:bg-slate-900 shadow-inner relative p-2 h-full">
              <style>{`
                .golden-hour-bg { opacity: 0 !important; transition: opacity 0.2s ease; pointer-events: none !important; }
                body.dragging-facebook .golden-facebook { opacity: 1 !important; }
                body.dragging-instagram .golden-instagram { opacity: 1 !important; }
                body.dragging-threads .golden-threads { opacity: 1 !important; }
              `}</style>
              <CalendarComponent
                ref={calendarRef}
                initialView={activeView}
                headerToolbar={false}
                allDaySlot={false}
                eventSources={useMemo(() => [
                  { events: fetchCalendarEvents },
                  { events: goldenHourEvents }
                ], [fetchCalendarEvents, goldenHourEvents])}
                editable={true}
                eventDragStart={(info: any) => {
                  const post = info.event.extendedProps?.post;
                  if (post) {
                    const plat = post.platform === 'thread' ? 'threads' : (post.platform || 'blog');
                    document.body.classList.add(`dragging-${plat}`);
                  }
                }}
                eventDragStop={(info: any) => {
                  const post = info.event.extendedProps?.post;
                  if (post) {
                    const plat = post.platform === 'thread' ? 'threads' : (post.platform || 'blog');
                    document.body.classList.remove(`dragging-${plat}`);
                  }
                }}
                eventDrop={handleEventDrop}
                eventClick={handleEventClick}
                eventContent={renderEventContent}
                datesSet={handleDatesSet}
                dateClick={handleDateClick}
                dayMaxEvents={3}
                moreLinkText={(num: number) => language === 'vi' ? `+${num} bài nữa` : `+${num} more`}
                moreLinkClick={handleMoreLinkClick}
                height="100%"
                slotDuration="00:30:00"
                snapDuration="00:01:00"
                slotMinTime="00:00:00"
                slotMaxTime="24:00:00"
                scrollTime="07:00:00"
              />
            </div>
          )}

        </div>

        {/* Mobile Timeline List View */}
        {(() => {
          const currentWeekPosts = filteredPosts.filter(post => {
            const postDate = new Date(post.scheduled_at);
            const start = new Date(currentWeekStart);
            const end = new Date(currentWeekStart);
            end.setDate(start.getDate() + 7);
            return postDate >= start && postDate < end;
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
      {mounted && typeof document !== 'undefined' && createPortal(
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
                    {selectedCell.title || (language === 'vi' ? 'Chi tiết lịch đăng bài' : 'Schedule Details')}
                  </h3>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                    {language === 'vi'
                      ? `Ngày ${selectedCell.date.getDate()}/${selectedCell.date.getMonth() + 1}/${selectedCell.date.getFullYear()}`
                      : `Date: ${selectedCell.date.getMonth() + 1}/${selectedCell.date.getDate()}/${selectedCell.date.getFullYear()}`}
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
                      platBg = 'bg-black text-white dark:bg-white dark:text-black border border-black dark:border-white';
                    } else if (platform === 'instagram') {
                      platIcon = <Instagram size={11} className="text-pink-650 dark:text-pink-400" />;
                      platLabel = 'Instagram';
                      platBg = 'bg-pink-600 text-white dark:bg-pink-700 dark:text-white border border-pink-600 dark:border-pink-700';
                    } else if (platform === 'blog') {
                      platIcon = <Globe size={11} className="text-emerald-700 dark:text-emerald-400" />;
                      platLabel = 'Blog';
                      platBg = 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-100/60 dark:border-emerald-900/30';
                    }

                    const timeStr = post.pos?.timeStr || new Date(post.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const postTitle = post.captions?.articles?.title || post.captions?.ai_content || '';

                    let imgUrl = '';
                    if (post.image_urls && post.image_urls.length > 0) {
                      imgUrl = post.image_urls[0];
                    } else if (post.captions?.articles?.images && post.captions.articles.images.length > 0) {
                      const firstImg = post.captions.articles.images[0];
                      imgUrl = typeof firstImg === 'string' ? firstImg : (firstImg.url || firstImg.image_url || '');
                    }

                    if (!imgUrl) {
                      const platform = post.platform?.toLowerCase();
                      if (platform === 'facebook') imgUrl = 'https://images.unsplash.com/photo-1542626991-cbc4e32524cc?q=80&w=400';
                      else if (platform === 'instagram') imgUrl = 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=400';
                      else imgUrl = 'https://images.unsplash.com/photo-1432888622747-4eb9a8efeb07?q=80&w=400';
                    }

                    return (
                      <div
                        key={idx}
                        className="p-3.5 rounded-2xl border border-slate-100 dark:border-slate-850 bg-slate-50/40 dark:bg-slate-950/20 flex flex-col gap-2.5 shadow-sm"
                      >
                        <div className="flex gap-3.5 items-start">
                          {imgUrl && (
                            <img referrerPolicy="no-referrer" 
                              src={imgUrl}
                              alt={postTitle}
                              className="w-16 h-16 rounded-xl object-cover border border-slate-200/50 dark:border-zinc-800 shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0 flex flex-col gap-1.5">
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
                              <p className="text-xs text-slate-700 dark:text-slate-250 font-bold leading-normal truncate">
                                {postTitle}
                              </p>
                            )}

                            {post.users?.email && (
                              <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold block">
                                👤 Tác giả: {post.users.email}
                              </span>
                            )}
                          </div>
                        </div>

                        {(post.captions?.edited_content || post.captions?.ai_content) ? (
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium bg-white dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-white/5 max-h-[100px] overflow-y-auto whitespace-pre-wrap">
                            {post.captions?.edited_content || post.captions?.ai_content}
                          </p>
                        ) : null}

                        <div className="flex justify-end items-center gap-2 mt-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const title = post.captions?.articles?.title || post.captions?.ai_content || 'Bài đăng AntBiz';
                              const details = post.captions?.edited_content || post.captions?.ai_content || '';
                              const gcalUrl = buildGoogleCalendarUrl({
                                title,
                                scheduledAt: post.scheduled_at,
                                details,
                                postId: post.id,
                                platform: post.platform,
                              });
                              window.open(gcalUrl, '_blank');
                            }}
                            className="bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 dark:text-blue-400 text-[9px] font-black px-2.5 py-1.5 rounded-xl transition-all border border-blue-200/50 dark:border-blue-800/40 cursor-pointer active:scale-95 flex items-center gap-1"
                            title={language === 'vi' ? 'Thêm bài đăng vào Google Calendar' : 'Add to Google Calendar'}
                          >
                            <Calendar size={10} />
                            <span>{language === 'vi' ? '+ Google Calendar' : '+ Google Calendar'}</span>
                          </button>

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
        </AnimatePresence>,
        document.body
      )}

      {mounted && typeof document !== 'undefined' && createPortal(
        <>
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
            
            {confirmDrop.isMultiple ? (
              <div className="flex flex-col gap-3">
                <p className="text-xs text-slate-650 dark:text-slate-350 leading-relaxed font-semibold">
                  {language === 'vi'
                    ? `Bạn đang di chuyển nhóm bài đăng sang thời gian mới. Chọn các bài đăng bạn muốn di chuyển:`
                    : `You are rescheduling a group of posts. Select the posts you want to reschedule:`}
                </p>
                
                <div className="max-h-[200px] overflow-y-auto border border-slate-100 dark:border-slate-850 rounded-xl p-2 flex flex-col gap-2 bg-slate-50/50 dark:bg-slate-900/20 scrollbar-thin">
                  {confirmDrop.posts?.map((post: any) => {
                    const isPending = post.status === 'pending';
                    const isSelected = confirmDrop.selectedPostIds?.includes(post.id);
                    const title = post.captions?.articles?.title || post.captions?.ai_content || 'Bài viết không tên';
                    
                    return (
                      <label 
                        key={post.id} 
                        className={`flex items-start gap-2.5 p-2 rounded-lg text-xs font-bold transition-all border ${
                          !isPending ? 'opacity-50 cursor-not-allowed border-transparent' : 
                          isSelected ? 'border-primary/20 bg-primary/5 cursor-pointer text-primary' : 'border-slate-100 bg-white dark:bg-black cursor-pointer text-slate-650 dark:text-slate-350'
                        }`}
                      >
                        <input
                          type="checkbox"
                          disabled={!isPending}
                          checked={!!isSelected}
                          onChange={(e) => {
                            if (!isPending) return;
                            const checked = e.target.checked;
                            setConfirmDrop((prev: any) => {
                              if (!prev) return null;
                              const currentSelected = prev.selectedPostIds || [];
                              const newSelected = checked
                                ? [...currentSelected, post.id]
                                : currentSelected.filter((id: string) => id !== post.id);
                              return { ...prev, selectedPostIds: newSelected };
                            });
                          }}
                          className="mt-0.5 rounded text-primary focus:ring-primary border-slate-300 w-3.5 h-3.5 shrink-0"
                        />
                        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-black uppercase text-slate-400">
                              {post.platform}
                            </span>
                            <span className="text-[9px] font-bold text-slate-400 font-mono">
                              {new Date(post.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className={`text-[8px] font-black uppercase px-1 rounded ${
                              post.status === 'posted' ? 'bg-emerald-100 text-emerald-700' :
                              post.status === 'failed' ? 'bg-rose-100 text-rose-700' :
                              post.status === 'cancelled' ? 'bg-slate-100 text-slate-500' : 'bg-primary/10 text-primary'
                            }`}>
                              {post.status}
                            </span>
                          </div>
                          <span className="truncate">
                            {title}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-650 dark:text-slate-350 leading-relaxed font-semibold">
                {language === 'vi'
                  ? `Bạn có chắc chắn muốn thay đổi lịch đăng bài viết "${confirmDrop.title}"?`
                  : `Are you sure you want to reschedule "${confirmDrop.title}"?`}
              </p>
            )}
            
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
                  confirmDrop.commit(confirmDrop.selectedPostIds);
                  setConfirmDrop(null);
                }}
                disabled={confirmDrop.isMultiple && (!confirmDrop.selectedPostIds || confirmDrop.selectedPostIds.length === 0)}
                className="flex-1 bg-primary hover:bg-primary-hover text-white py-3 rounded-2xl font-bold transition-all text-xs cursor-pointer active:scale-95 border-0 shadow-lg shadow-primary/20 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {language === 'vi' ? 'Xác nhận' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
        )}
        </>,
        document.body
      )}

      {mounted && typeof document !== 'undefined' && createPortal(
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

              {/* Live Webcal Sync (Phase 2) */}
              {subscriptionUrl && (
                <div className="flex flex-col gap-2.5 bg-slate-50 dark:bg-zinc-900/40 rounded-2xl p-4 border border-slate-100 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">📅</span>
                    <label className="text-[10px] font-black text-slate-700 dark:text-zinc-300 uppercase tracking-widest leading-none">
                      {language === 'vi' ? 'Đồng bộ tự động (Live Sync)' : 'Google Calendar Live Sync'}
                    </label>
                  </div>
                  <p className="text-[9px] text-slate-500 leading-relaxed">
                    {language === 'vi' 
                      ? 'Đăng ký nhận lịch tự động cập nhật thời gian thực vào Google Calendar / Apple Calendar mà không cần tải file thủ công.'
                      : 'Subscribe to get real-time updates directly into your Google/Apple Calendar without manual downloads.'}
                  </p>
                  
                  <div className="flex items-stretch gap-2 mt-1">
                    <input
                      type="text"
                      readOnly
                      value={subscriptionUrl}
                      className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl p-2.5 text-[9px] font-mono text-slate-600 dark:text-zinc-400 focus:outline-none flex-1 truncate"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(subscriptionUrl);
                        showPopup(language === 'vi' ? 'Đã sao chép link đồng bộ!' : 'Subscription link copied!', 'success');
                      }}
                      className="bg-slate-200 hover:bg-slate-350 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-white px-3.5 rounded-xl text-[10px] font-black transition-all cursor-pointer border-0 active:scale-95 flex items-center justify-center gap-1 shrink-0"
                    >
                      {language === 'vi' ? 'Sao chép' : 'Copy'}
                    </button>
                  </div>

                  <a
                    href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(subscriptionUrl)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl font-bold transition-all text-[10px] cursor-pointer active:scale-95 text-center decoration-none shadow-sm flex items-center justify-center gap-1.5 mt-0.5"
                  >
                    <span>➕</span>
                    <span>{language === 'vi' ? 'Thêm nhanh vào Google Calendar' : 'Add to Google Calendar'}</span>
                  </a>
                </div>
              )}

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
        </AnimatePresence>,
        document.body
      )}

      <PopupDialog
        isOpen={!!popup?.isOpen}
        message={popup?.message || ''}
        type={popup?.type || 'info'}
        onClose={() => setPopup(null)}
      />

    </div>
  );
}
