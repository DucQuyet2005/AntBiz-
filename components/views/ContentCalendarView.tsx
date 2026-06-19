"use client";

import React, { useState, useEffect, useRef } from 'react';
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
  Send
} from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';

// Threads Custom SVG Logo
const ThreadsIcon = ({ size = 20, className = "" }: { size?: number; className?: string }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" className={className}>
    <path d="M22.5 12c0-5.799-4.701-10.5-10.5-10.5S1.5 6.201 1.5 12s4.701 10.5 10.5 10.5c2.328 0 4.475-.758 6.216-2.038l-1.39-1.39C15.42 19.98 13.784 20.5 12 20.5c-4.694 0-8.5-3.806-8.5-8.5s3.806-8.5 8.5-8.5 8.5 3.806 8.5 8.5c0 1.956-.503 3.659-1.42 4.8-.813 1.011-1.923 1.5-3.08 1.5-1.144 0-1.848-.553-2.128-1.123-.391-.798-.328-2.109-.328-3.177v-2.5c0-.828-.672-1.5-1.5-1.5s-1.5.672-1.5 1.5v2.5c0 .356-.002.83-.027 1.309a4 4 0 1 1-3.953-3.809c.28 0 .546.035.803.097V8.539c-.26-.025-.525-.039-.79-.039a7 7 0 1 0 5.679 11.096c.71.91 1.776 1.404 3.018 1.404 2.217 0 4.156-1.134 5.347-2.923 1.15-1.729 1.693-3.992 1.693-6.077zM9.5 12a1 1 0 1 0 2 0 1 1 0 0 0-2 0z" />
  </svg>
);

export default function ContentCalendarView() {
  const { t, language } = useLanguage();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // States for filters, dropdown, and active selections
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([
    'facebook',
    'instagram',
    'threads',
    'blog'
  ]);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Base calendar state - June 19, 2026 is Friday
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const baseDate = new Date('2026-06-19T09:09:00+07:00');
    const day = baseDate.getDay();
    const diff = baseDate.getDate() - day; // Sunday is 0
    const sunday = new Date(baseDate.setDate(diff));
    sunday.setHours(0, 0, 0, 0);
    return sunday;
  });

  const fetchPosts = async () => {
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
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  useEffect(() => {
    if (scrollRef.current && !loading) {
      // Pre-scroll to 8 AM (8 * 60 = 480)
      scrollRef.current.scrollTop = 480;
    }
  }, [loading]);

  const handleCancel = async (postId: string) => {
    setActionLoadingId(postId);
    try {
      const res = await fetch(`/api/scheduled-posts/${postId}/cancel`, {
        method: 'POST',
      });
      if (res.ok) {
        await fetchPosts();
      } else {
        const errJson = await res.json().catch(() => ({}));
        alert(errJson.error || 'Lỗi khi hủy lịch đăng bài');
      }
    } catch (err) {
      console.error('Cancel error:', err);
      alert('Lỗi kết nối khi hủy lịch đăng bài');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Check if today (June 19, 2026) is within current week
  const isCurrentWeekToday = () => {
    const today = new Date('2026-06-19T09:09:00+07:00');
    const start = new Date(currentWeekStart);
    const end = new Date(currentWeekStart);
    end.setDate(start.getDate() + 7);
    return today >= start && today < end;
  };

  const todayIndex = 5; // Friday is 5th index from Sunday (0)
  const currentTimeOffset = 9 * 60 + 9; // 9:09 AM = 549px

  // Weekly Date Range
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(currentWeekStart);
    d.setDate(currentWeekStart.getDate() + i);
    return d;
  });

  const handlePrevWeek = () => {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(currentWeekStart.getDate() - 7);
    setCurrentWeekStart(newStart);
  };

  const handleNextWeek = () => {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(currentWeekStart.getDate() + 7);
    setCurrentWeekStart(newStart);
  };

  const handleToday = () => {
    const baseDate = new Date('2026-06-19T09:09:00+07:00');
    const day = baseDate.getDay();
    const diff = baseDate.getDate() - day;
    const sunday = new Date(baseDate.setDate(diff));
    sunday.setHours(0, 0, 0, 0);
    setCurrentWeekStart(sunday);
  };

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
    return date.getDate() === 19 && date.getMonth() === 5 && date.getFullYear() === 2026;
  };

  const handleTogglePlatform = (platform: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(platform) 
        ? prev.filter(p => p !== platform) 
        : [...prev, platform]
    );
  };

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
      `}</style>

      {/* Top Header: Floating Glassmorphism design bar */}
      <div className="flex justify-between items-center premium-glass rounded-[28px] p-5 shadow-sm">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-[20px] bg-gradient-to-tr from-indigo-500 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Calendar size={22} className="stroke-[2.5]" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest leading-none mb-1">
                {language === 'vi' ? 'Lên lịch đăng bài' : 'Editorial Calendar'}
              </span>
              <h1 className="text-xl font-black text-slate-800 tracking-tight leading-none">
                {language === 'vi' ? 'Tháng 6, 2026' : 'June 2026'}
              </h1>
            </div>
          </div>
          
          {/* Week Changer Controls */}
          <div className="flex items-center bg-slate-100 p-1.5 rounded-2xl border border-slate-200/40 select-none">
            <button 
              onClick={handleToday}
              className="px-4 py-2 text-xs font-black text-slate-700 bg-white shadow-sm rounded-xl hover:bg-slate-50 transition-all cursor-pointer border-0 active:scale-95"
            >
              {language === 'vi' ? 'Hôm nay' : 'Today'}
            </button>
            <div className="w-[1px] h-4 bg-slate-300 mx-2" />
            <button 
              onClick={handlePrevWeek}
              className="p-2 rounded-xl text-slate-600 hover:bg-white/80 hover:shadow-sm transition-all cursor-pointer border-0 bg-transparent active:scale-90"
            >
              <ChevronLeft size={15} />
            </button>
            <button 
              onClick={handleNextWeek}
              className="p-2 rounded-xl text-slate-600 hover:bg-white/80 hover:shadow-sm transition-all cursor-pointer border-0 bg-transparent active:scale-90"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>

        {/* Global Module Navigation Buttons */}
        <div className="flex items-center gap-3">
          <Link 
            href="/ai-creator" 
            className="flex items-center gap-2 bg-[#F1F3F9] hover:bg-indigo-50 border border-slate-200/50 px-4 py-2.5 rounded-xl text-xs font-black text-slate-700 hover:text-indigo-600 transition-all cursor-pointer decoration-none active:scale-95"
          >
            <Sparkles size={14} className="text-indigo-500" />
            <span>{language === 'vi' ? 'Trình tạo AI' : 'AICreator'}</span>
          </Link>
          <Link 
            href="/archive" 
            className="flex items-center gap-2 bg-[#F1F3F9] hover:bg-emerald-50 border border-slate-200/50 px-4 py-2.5 rounded-xl text-xs font-black text-slate-700 hover:text-emerald-700 transition-all cursor-pointer decoration-none active:scale-95"
          >
            <Globe size={14} className="text-emerald-500" />
            <span>{language === 'vi' ? 'Kho lưu trữ' : 'Archive'}</span>
          </Link>
        </div>
      </div>

      {/* Main Split Grid (Sidebar & Calendar Grid) */}
      <div className="grid grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Sidebar (Create, Mini Calendar, Platform Toggles) */}
        <div className="col-span-3 bg-white border border-slate-100 rounded-[32px] p-5 flex flex-col gap-6 shadow-sm shadow-slate-100/40">
          
          {/* Create Button with menu slide transitions */}
          <div className="relative w-full">
            <button 
              onClick={() => setShowCreateMenu(!showCreateMenu)}
              className="flex items-center justify-between bg-gradient-to-r from-indigo-500 to-indigo-600 text-white px-5 py-3.5 rounded-[22px] text-sm font-black shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/35 transition-all active:scale-95 cursor-pointer w-full select-none border-0"
            >
              <div className="flex items-center gap-3">
                <Plus size={18} className="stroke-[3.5]" />
                <span>{language === 'vi' ? 'Tạo mới' : 'Create'}</span>
              </div>
              <ChevronRight size={14} className={`transition-transform duration-300 ${showCreateMenu ? 'rotate-90' : ''}`} />
            </button>
            
            {showCreateMenu && (
              <div className="absolute left-0 right-0 mt-2 bg-white border border-slate-200/80 rounded-2xl shadow-xl z-50 py-2 border-collapse overflow-hidden animate-popover">
                <Link 
                  href="/ai-creator" 
                  onClick={() => setShowCreateMenu(false)}
                  className="flex items-center gap-3 px-4 py-3 text-xs font-black text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors w-full cursor-pointer decoration-none border-0"
                >
                  <Sparkles size={14} className="text-indigo-500" />
                  <span>{language === 'vi' ? 'Trình tạo bài viết AI' : 'Create with AI'}</span>
                </Link>
                <Link 
                  href="/archive" 
                  onClick={() => setShowCreateMenu(false)}
                  className="flex items-center gap-3 px-4 py-3 text-xs font-black text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors w-full cursor-pointer decoration-none border-0"
                >
                  <Globe size={14} className="text-emerald-600" />
                  <span>{language === 'vi' ? 'Xem kho lưu trữ' : 'View Archive'}</span>
                </Link>
              </div>
            )}
          </div>

          {/* Mini Monthly Calendar (June 2026) */}
          <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100 flex flex-col gap-3">
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
                ? ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map(d => <div key={d} className="py-0.5">{d}</div>)
                : ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => <div key={d} className="py-0.5">{d}</div>)
              }
              {miniCalendarDays.map((d, idx) => {
                const isToday = d.isCurrentMonth && d.day === 19;
                return (
                  <div 
                    key={idx} 
                    className={`py-1.5 flex items-center justify-center rounded-xl text-[10px] font-black select-none cursor-pointer transition-all hover:bg-slate-200/50 ${
                      !d.isCurrentMonth ? 'text-slate-300' : 'text-slate-700'
                    } ${
                      isToday ? 'bg-indigo-600 text-white hover:bg-indigo-700 font-black shadow-md shadow-indigo-600/20' : ''
                    }`}
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
              className="w-full bg-slate-100 border border-slate-200/50 rounded-2xl py-3 pl-10 pr-3.5 text-xs font-bold text-slate-700 placeholder:text-slate-400/80 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-inner"
            />
          </div>

          {/* Platform Filters - Slider Toggle style */}
          <div className="flex flex-col gap-3.5 border-t border-slate-100 pt-5">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
              {language === 'vi' ? 'Lịch của tôi' : 'My Calendars'}
            </span>
            
            <div className="flex flex-col gap-2.5 px-0.5">
              {/* Facebook */}
              <button 
                onClick={() => handleTogglePlatform('facebook')}
                className={`flex items-center justify-between px-3 py-2.5 rounded-2xl border transition-all text-left cursor-pointer w-full bg-transparent ${
                  selectedPlatforms.includes('facebook') 
                    ? 'border-blue-200 bg-blue-50/30' 
                    : 'border-slate-100 hover:border-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-3 h-3 rounded-full transition-all ${
                    selectedPlatforms.includes('facebook') ? 'bg-blue-600 scale-110 shadow-sm' : 'bg-slate-300'
                  }`} />
                  <span className={`text-xs font-bold ${selectedPlatforms.includes('facebook') ? 'text-blue-900 font-extrabold' : 'text-slate-500'}`}>Facebook</span>
                </div>
                <div className={`w-6 h-3.5 rounded-full p-0.5 transition-colors cursor-pointer ${
                  selectedPlatforms.includes('facebook') ? 'bg-blue-600' : 'bg-slate-200'
                }`}>
                  <div className={`w-2.5 h-2.5 bg-white rounded-full transition-transform ${
                    selectedPlatforms.includes('facebook') ? 'translate-x-2.5' : 'translate-x-0'
                  }`} />
                </div>
              </button>

              {/* Instagram */}
              <button 
                onClick={() => handleTogglePlatform('instagram')}
                className={`flex items-center justify-between px-3 py-2.5 rounded-2xl border transition-all text-left cursor-pointer w-full bg-transparent ${
                  selectedPlatforms.includes('instagram') 
                    ? 'border-pink-200 bg-pink-50/20' 
                    : 'border-slate-100 hover:border-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-3 h-3 rounded-full transition-all ${
                    selectedPlatforms.includes('instagram') ? 'bg-pink-500 scale-110 shadow-sm' : 'bg-slate-300'
                  }`} />
                  <span className={`text-xs font-bold ${selectedPlatforms.includes('instagram') ? 'text-pink-900 font-extrabold' : 'text-slate-500'}`}>Instagram</span>
                </div>
                <div className={`w-6 h-3.5 rounded-full p-0.5 transition-colors cursor-pointer ${
                  selectedPlatforms.includes('instagram') ? 'bg-pink-500' : 'bg-slate-200'
                }`}>
                  <div className={`w-2.5 h-2.5 bg-white rounded-full transition-transform ${
                    selectedPlatforms.includes('instagram') ? 'translate-x-2.5' : 'translate-x-0'
                  }`} />
                </div>
              </button>

              {/* Threads */}
              <button 
                onClick={() => handleTogglePlatform('threads')}
                className={`flex items-center justify-between px-3 py-2.5 rounded-2xl border transition-all text-left cursor-pointer w-full bg-transparent ${
                  selectedPlatforms.includes('threads') 
                    ? 'border-slate-800 bg-slate-50' 
                    : 'border-slate-100 hover:border-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-3 h-3 rounded-full transition-all ${
                    selectedPlatforms.includes('threads') ? 'bg-black scale-110 shadow-sm' : 'bg-slate-300'
                  }`} />
                  <span className={`text-xs font-bold ${selectedPlatforms.includes('threads') ? 'text-slate-900 font-extrabold' : 'text-slate-500'}`}>Threads</span>
                </div>
                <div className={`w-6 h-3.5 rounded-full p-0.5 transition-colors cursor-pointer ${
                  selectedPlatforms.includes('threads') ? 'bg-black' : 'bg-slate-200'
                }`}>
                  <div className={`w-2.5 h-2.5 bg-white rounded-full transition-transform ${
                    selectedPlatforms.includes('threads') ? 'translate-x-2.5' : 'translate-x-0'
                  }`} />
                </div>
              </button>

              {/* Blog */}
              <button 
                onClick={() => handleTogglePlatform('blog')}
                className={`flex items-center justify-between px-3 py-2.5 rounded-2xl border transition-all text-left cursor-pointer w-full bg-transparent ${
                  selectedPlatforms.includes('blog') 
                    ? 'border-emerald-200 bg-emerald-50/20' 
                    : 'border-slate-100 hover:border-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-3 h-3 rounded-full transition-all ${
                    selectedPlatforms.includes('blog') ? 'bg-[#1f5f4a] scale-110 shadow-sm' : 'bg-slate-300'
                  }`} />
                  <span className={`text-xs font-bold ${selectedPlatforms.includes('blog') ? 'text-emerald-900 font-extrabold' : 'text-slate-500'}`}>Blog (Articles)</span>
                </div>
                <div className={`w-6 h-3.5 rounded-full p-0.5 transition-colors cursor-pointer ${
                  selectedPlatforms.includes('blog') ? 'bg-[#1f5f4a]' : 'bg-slate-200'
                }`}>
                  <div className={`w-2.5 h-2.5 bg-white rounded-full transition-transform ${
                    selectedPlatforms.includes('blog') ? 'translate-x-2.5' : 'translate-x-0'
                  }`} />
                </div>
              </button>
            </div>
          </div>

          {/* Quick Access Navigation Buttons with side indicator animations */}
          <div className="flex flex-col gap-3 border-t border-slate-100 pt-5">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
              {language === 'vi' ? 'Kho phân hệ' : 'Quick Nav'}
            </span>
            <div className="flex flex-col gap-1.5">
              <Link 
                href="/archive"
                className="group flex items-center justify-between px-3.5 py-3 text-xs font-black text-slate-700 hover:bg-slate-50 border border-slate-100 rounded-2xl transition-all cursor-pointer decoration-none shadow-sm"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-sm group-hover:scale-110 transition-transform">📦</span>
                  <span>{language === 'vi' ? 'Kho lưu trữ bài viết' : 'Content Archive'}</span>
                </div>
                <ChevronRight size={14} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link 
                href="/ai-creator"
                className="group flex items-center justify-between px-3.5 py-3 text-xs font-black text-slate-700 hover:bg-slate-50 border border-slate-100 rounded-2xl transition-all cursor-pointer decoration-none shadow-sm"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-sm group-hover:scale-110 transition-transform">✨</span>
                  <span>{language === 'vi' ? 'Trình tạo bài viết AI' : 'AICreator Platform'}</span>
                </div>
                <ChevronRight size={14} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Google-Calendar-style Hourly Grid */}
        <div className="col-span-9 bg-white border border-slate-100 rounded-[32px] p-6 shadow-sm shadow-slate-100/40 flex flex-col gap-4 overflow-visible">
          
          {/* Main Grid Header Rows for Days */}
          <div className="grid grid-cols-[80px_1fr] items-stretch pr-2">
            <div className="flex flex-col justify-end text-[10px] text-slate-400 font-extrabold pb-3 border-b border-slate-100 text-right pr-4 tracking-wider select-none">
              GMT+07
            </div>
            
            <div className="grid grid-cols-7 border-b border-slate-100 pb-3 gap-x-3 text-center">
              {weekDates.map((date, idx) => {
                const isTodayDate = isToday(date);
                const dayNum = date.getDate();
                const dayLabel = getDayLabel(date);
                
                return (
                  <div key={idx} className="flex flex-col items-center select-none relative">
                    <span className={`text-[10px] font-black uppercase tracking-wider ${
                      isTodayDate ? 'text-indigo-600 font-black' : 'text-slate-400'
                    }`}>
                      {dayLabel}
                    </span>
                    <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black mt-1 transition-all duration-300 ${
                      isTodayDate 
                        ? 'bg-gradient-to-tr from-indigo-500 to-indigo-600 text-white shadow-md shadow-indigo-600/20' 
                        : 'text-slate-800 hover:bg-slate-100'
                    }`}>
                      {dayNum}
                    </span>
                    {isTodayDate && (
                      <div className="absolute bottom-[-13px] left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-indigo-600 rounded-full" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Time Grid Viewport */}
          {loading ? (
            <div className="h-[600px] flex items-center justify-center border border-slate-100 rounded-[24px]">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="animate-spin text-indigo-500" size={32} />
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{t('common.loading')}</span>
              </div>
            </div>
          ) : (
            <div 
              ref={scrollRef}
              className="h-[600px] overflow-y-auto relative border border-slate-100 rounded-[24px] bg-white select-none scrollbar-thin overflow-x-visible shadow-inner"
            >
              <div className="grid grid-cols-[80px_1fr] relative h-[1440px] overflow-x-visible">
                
                {/* Hours Left Column */}
                <div className="border-r border-slate-100 bg-slate-50/30 pt-2 flex flex-col z-20">
                  {hoursArray.map(hour => (
                    <div key={hour} className="h-[60px] text-right pr-4 text-[10px] text-slate-400 font-bold relative -top-[6px] select-none">
                      {hour > 0 ? formatHour(hour) : ''}
                    </div>
                  ))}
                </div>

                {/* Grid Columns Area */}
                <div className="relative h-full grid grid-cols-7 overflow-x-visible">
                  
                  {/* Horizontal Grid Lines */}
                  <div className="absolute inset-0 flex flex-col pointer-events-none z-0">
                    {hoursArray.map(hour => (
                      <div key={hour} className="h-[60px] border-b border-slate-100/70 first:border-t-0"></div>
                    ))}
                  </div>

                  {/* Vertical Column Borders */}
                  <div className="absolute inset-0 grid grid-cols-7 pointer-events-none z-0">
                    {weekDates.map((_, i) => (
                      <div key={i} className="border-r border-slate-100/70 h-full last:border-r-0"></div>
                    ))}
                  </div>

                  {/* Dynamic Red Time Line with Pulse Ring Radar effect */}
                  {isCurrentWeekToday() && (
                    <div 
                      className="absolute left-0 right-0 pointer-events-none z-30"
                      style={{ 
                        top: `${currentTimeOffset}px`,
                      }}
                    >
                      <div className="grid grid-cols-7 h-full w-full relative">
                        {/* Circle Indicator on the active day column */}
                        <div 
                          className="absolute w-3 h-3 bg-red-500 rounded-full -left-[6px] -top-1 animate-radar shadow-sm shadow-red-500/50"
                          style={{
                            left: `${(todayIndex / 7) * 100}%`,
                          }}
                        />
                        {/* Line extending across the active day column */}
                        <div 
                          className="absolute h-[2px] bg-gradient-to-r from-red-500 to-transparent"
                          style={{
                            left: `${(todayIndex / 7) * 100}%`,
                            width: `${100 / 7}%`
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Post Event Cards */}
                  {filteredPosts.map(post => {
                    const pos = getDayAndPosition(post.scheduled_at, currentWeekStart);
                    if (!pos) return null;

                    const { dayIndex, hours, minutes, timeStr } = pos;
                    const topOffset = hours * 60 + minutes;
                    const cardHeight = 54; // Standard height of post card

                    const platform = post.platform?.toLowerCase() || 'blog';
                    let borderClass = 'border-amber-500';
                    let bgGradient = 'from-amber-500/5 to-amber-600/15';
                    let textClass = 'text-amber-800';
                    let iconBg = 'bg-amber-100 text-amber-600';
                    let platformIcon = <Globe size={11} />;

                    if (platform === 'facebook') {
                      borderClass = 'border-blue-600';
                      bgGradient = 'from-blue-500/5 to-blue-600/15';
                      textClass = 'text-blue-900';
                      iconBg = 'bg-blue-100 text-blue-600';
                      platformIcon = <Facebook size={11} className="fill-blue-600 text-blue-600" />;
                    } else if (platform === 'instagram') {
                      borderClass = 'border-pink-500';
                      bgGradient = 'from-pink-500/5 to-rose-600/15';
                      textClass = 'text-pink-900';
                      iconBg = 'bg-pink-100 text-pink-600';
                      platformIcon = <Instagram size={11} className="text-pink-600" />;
                    } else if (platform === 'threads') {
                      borderClass = 'border-slate-800';
                      bgGradient = 'from-slate-700/5 to-slate-900/15';
                      textClass = 'text-slate-950';
                      iconBg = 'bg-slate-200 text-slate-800';
                      platformIcon = <ThreadsIcon size={11} className="text-black" />;
                    } else if (platform === 'blog') {
                      borderClass = 'border-emerald-600';
                      bgGradient = 'from-emerald-500/5 to-teal-600/15';
                      textClass = 'text-emerald-900';
                      iconBg = 'bg-emerald-100 text-emerald-700';
                      platformIcon = <Globe size={11} className="text-emerald-700" />;
                    }

                    // Check status representation
                    let statusIcon = null;
                    if (post.status === 'posted') {
                      statusIcon = <span className="bg-emerald-100 text-emerald-700 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black shadow-sm">✓</span>;
                    } else if (post.status === 'failed') {
                      statusIcon = <span className="bg-rose-100 text-rose-600 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black shadow-sm">⚠️</span>;
                    } else if (post.status === 'cancelled') {
                      statusIcon = <span className="bg-slate-100 text-slate-500 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black shadow-sm">✕</span>;
                    }

                    const title = post.captions?.articles?.title || post.captions?.ai_content?.substring(0, 30) + '...';

                    // Hover Popover layout config based on column position
                    const isRightSide = dayIndex >= 4;
                    const popoverPositionClass = isRightSide ? 'right-[102%]' : 'left-[102%]';

                    return (
                      <div
                        key={post.id}
                        style={{
                          gridColumnStart: dayIndex + 1,
                          gridColumnEnd: dayIndex + 2,
                          top: `${topOffset}px`,
                          height: `${cardHeight}px`
                        }}
                        className={`absolute left-1 right-1 rounded-2xl p-2.5 text-[10px] font-bold border-l-[4px] border-y border-r border-slate-200/60 shadow-sm flex flex-col justify-between cursor-pointer transition-all duration-300 hover:-translate-y-[1px] hover:shadow-md hover:border-slate-300/80 z-10 group overflow-visible bg-gradient-to-r ${bgGradient} ${borderClass} ${textClass}`}
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

                        {/* HOVER PREVIEW POPOVER (A/B TESTING HIGH-FIDELITY PREVIEW) */}
                        <div className={`hidden group-hover:block absolute ${popoverPositionClass} top-[-15px] w-[330px] bg-white border border-slate-200/80 rounded-[30px] shadow-2xl z-50 text-text p-4 cursor-default animate-popover border-collapse`}>
                          
                          {/* Popover Header */}
                          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500">
                                <Sparkles size={11} className="animate-pulse" />
                              </div>
                              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600">
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

                          {/* Social Mockup Preview depending on platform */}
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
                                <span className="hover:text-blue-600 cursor-pointer">👍 {language === 'vi' ? 'Thích' : 'Like'}</span>
                                <span className="hover:text-blue-600 cursor-pointer font-bold">💬 {language === 'vi' ? 'Bình luận' : 'Comment'}</span>
                                <span className="hover:text-blue-600 cursor-pointer font-bold">↩ {language === 'vi' ? 'Chia sẻ' : 'Share'}</span>
                              </div>
                            </div>
                          )}

                          {platform === 'instagram' && (
                            <div className="border border-slate-100 rounded-2xl p-3.5 bg-white text-left font-sans shadow-sm">
                              <div className="flex items-center gap-2.5 mb-2.5">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs p-[1px] select-none">
                                  <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-black text-[9px] font-black">AB</div>
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

                          {platform === 'threads' && (
                            <div className="border border-slate-100 rounded-2xl p-3.5 bg-white text-left font-sans shadow-sm">
                              <div className="flex items-start gap-2.5 mb-2">
                                <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs select-none">T</div>
                                <div className="flex-1 flex flex-col">
                                  <div className="flex justify-between items-center select-none">
                                    <span className="text-[10px] font-black text-slate-800">antbiz_official</span>
                                    <span className="text-[8px] text-slate-400 font-semibold">{timeStr}</span>
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

                          {/* Action Footer */}
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
                  })}

                </div>

              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
