"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  Instagram, 
  Facebook, 
  Globe, 
  AlertTriangle, 
  CheckCircle2, 
  X,
  Loader2,
  CalendarDays
} from 'lucide-react';

const ThreadsIcon = ({ size = 20, className = "" }: { size?: number; className?: string }) => (
  <svg viewBox="0 0 192 192" width={size} height={size} fill="currentColor" className={className}>
    <path d="M141.537 88.9883C140.71 88.5919 139.87 88.2104 139.019 87.8451C137.537 60.5382 122.616 44.905 97.5619 44.745C97.4484 44.7443 97.3355 44.7443 97.222 44.7443C82.2364 44.7443 69.7731 51.1409 62.102 62.7807L75.881 72.2328C81.6116 63.5383 90.6052 61.6848 97.2286 61.6848C97.3051 61.6848 97.3819 61.6848 97.4576 61.6855C105.707 61.7381 111.932 64.1366 115.961 68.814C118.893 72.2193 120.854 76.925 121.825 82.8638C114.511 81.6207 106.601 81.2385 98.145 81.7233C74.3247 83.0954 59.0111 96.9879 60.0396 116.292C60.5615 126.084 65.4397 134.508 73.775 140.011C80.8224 144.663 89.899 146.938 99.3323 146.423C111.79 145.74 121.563 140.987 128.381 132.296C133.559 125.696 136.834 117.143 138.28 106.366C144.217 109.949 148.617 114.664 151.047 120.332C155.179 129.967 155.42 145.8 142.501 158.708C131.182 170.016 117.576 174.908 97.0135 175.059C74.2042 174.89 56.9538 167.575 45.7381 153.317C35.2355 139.966 29.8077 120.682 29.6052 96C29.8077 71.3178 35.2355 52.0336 45.7381 38.6827C56.9538 24.4249 74.2039 17.11 97.0132 16.9405C119.988 17.1113 137.539 24.4614 149.184 38.788C154.894 45.8136 159.199 54.6488 162.037 64.9503L178.184 60.6422C174.744 47.9622 169.331 37.0357 161.965 27.974C147.036 9.60668 125.202 0.195148 97.0695 0H96.9569C68.8816 0.19447 47.2921 9.6418 32.7883 28.0793C19.8819 44.4864 13.2244 67.3157 13.0007 95.9325L13 96L13.0007 96.0675C13.2244 124.684 19.8819 147.514 32.7883 163.921C47.2921 182.358 68.8816 191.806 96.9569 192H97.0695C122.03 191.827 139.624 185.292 154.118 170.811C173.081 151.866 172.51 128.119 166.26 113.541C161.776 103.087 153.227 94.5962 141.537 88.9883ZM98.4405 129.507C88.0005 130.095 77.1544 125.409 76.6196 115.372C76.2232 107.93 81.9158 99.626 99.0812 98.6368C101.047 98.5234 102.976 98.468 104.871 98.468C111.106 98.468 116.939 99.0737 122.242 100.233C120.264 124.935 108.662 128.946 98.4405 129.507Z" />
  </svg>
);

interface ContentListViewProps {
  selectedPlatforms: string[];
  searchQuery?: string;
  onPostClick?: (post: any) => void;
}

export default function ContentListView({ selectedPlatforms, searchQuery = '', onPostClick }: ContentListViewProps) {
  const { language } = useLanguage();
  const [data, setData] = useState<{ date: string; posts: any[] }[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  const limit = 30;

  const fetchData = useCallback(async (pageNum: number, isInitial = false) => {
    if (isInitial) setLoading(true);
    else setLoadingMore(true);

    try {
      const platformsParam = selectedPlatforms.map(p => {
        if (p === 'threads') return 'thread';
        return p;
      }).join(',');
      
      const url = `/api/scheduled-posts?paginated=true&page=${pageNum}&limit=${limit}&platforms=${platformsParam}&sortOrder=asc`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        const incomingData = json.data || [];
        
        if (isInitial) {
          setData(incomingData);
        } else {
          setData(prev => {
            const newData = [...prev];
            // Merge overlapping dates
            incomingData.forEach((incDay: any) => {
              const existingDayIndex = newData.findIndex(d => d.date === incDay.date);
              if (existingDayIndex >= 0) {
                // Avoid duplicates
                const existingPostIds = new Set(newData[existingDayIndex].posts.map((p: any) => p.id));
                const uniqueNewPosts = incDay.posts.filter((p: any) => !existingPostIds.has(p.id));
                newData[existingDayIndex].posts = [...newData[existingDayIndex].posts, ...uniqueNewPosts].sort(
                  (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
                );
              } else {
                newData.push(incDay);
              }
            });
            return newData;
          });
        }
        
        const total = json.meta?.total || 0;
        if (pageNum * limit >= total) {
          setHasMore(false);
        } else {
          setHasMore(true);
        }
      }
    } catch (error) {
      console.error('Failed to fetch paginated posts', error);
    } finally {
      if (isInitial) setLoading(false);
      else setLoadingMore(false);
    }
  }, [selectedPlatforms]);

  // Reset and fetch when platforms change
  useEffect(() => {
    setPage(1);
    setHasMore(true);
    fetchData(1, true);
  }, [fetchData]);

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchData(nextPage, false);
    }
  };

  const getDayLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const isToday = d.toDateString() === today.toDateString();
    const isTomorrow = d.toDateString() === tomorrow.toDateString();
    
    const formatter = new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : 'en-US', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    
    let label = formatter.format(d);
    
    if (isToday) {
      label = (language === 'vi' ? 'Hôm nay - ' : 'Today - ') + label;
    } else if (isTomorrow) {
      label = (language === 'vi' ? 'Ngày mai - ' : 'Tomorrow - ') + label;
    }
    
    return label;
  };

  const renderPost = (post: any) => {
    const time = new Date(post.scheduled_at).toLocaleTimeString(language === 'vi' ? 'vi-VN' : 'en-US', { 
      hour: '2-digit', minute: '2-digit', hour12: false 
    });
    const platform = (post.platform || 'facebook').toLowerCase();
    const title = post.captions?.articles?.title || post.captions?.ai_content || 'Untitled';
    
    let bgClass = 'bg-white dark:bg-zinc-900/50';
    let borderClass = 'border-slate-200 dark:border-zinc-800';
    let textClass = 'text-slate-800 dark:text-slate-200';
    let icon = null;

    if (platform === 'facebook') {
      bgClass = 'bg-[#EDF3FF]/30 dark:bg-blue-950/20';
      borderClass = 'border-[#D1E2FF] dark:border-blue-900/30';
      textClass = 'text-[#1E40AF] dark:text-blue-400';
      icon = <Facebook size={16} className="text-[#1877F2] fill-[#1877F2] shrink-0" />;
    } else if (platform === 'instagram') {
      bgClass = 'bg-[#FFF0F2]/40 dark:bg-pink-950/20';
      borderClass = 'border-[#FFB8C6] dark:border-pink-900/30';
      textClass = 'text-[#900A22] dark:text-pink-400';
      icon = <Instagram size={16} className="text-[#E4405F] shrink-0" />;
    } else if (platform === 'threads' || platform === 'thread') {
      bgClass = 'bg-[#F8F9FA]/50 dark:bg-zinc-900/40';
      borderClass = 'border-[#E9ECEF] dark:border-zinc-800';
      textClass = 'text-[#212529] dark:text-zinc-300';
      icon = <ThreadsIcon size={16} className="text-black dark:text-white shrink-0" />;
    } else {
      bgClass = 'bg-[#E8F5E9]/40 dark:bg-emerald-950/20';
      borderClass = 'border-[#C8E6C9] dark:border-emerald-900/30';
      textClass = 'text-[#2E7D32] dark:text-emerald-400';
      icon = <Globe size={16} className="text-[#2E7D32] shrink-0" />;
    }

    let statusBadge = null;
    if (post.status === 'failed') {
      statusBadge = <span className="flex items-center gap-1 text-[10px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded font-bold uppercase"><AlertTriangle size={10} /> {language === 'vi' ? 'Lỗi' : 'Failed'}</span>;
    } else if (post.status === 'cancelled') {
      statusBadge = <span className="flex items-center gap-1 text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-bold uppercase"><X size={10} /> {language === 'vi' ? 'Đã hủy' : 'Cancelled'}</span>;
    } else if (post.status === 'posted') {
      statusBadge = <span className="flex items-center gap-1 text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-bold uppercase"><CheckCircle2 size={10} /> {language === 'vi' ? 'Đã đăng' : 'Posted'}</span>;
    } else {
      statusBadge = <span className="flex items-center gap-1 text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold uppercase">{language === 'vi' ? 'Đang chờ' : 'Pending'}</span>;
    }

    return (
      <div 
        key={post.id} 
        onClick={() => onPostClick && onPostClick(post)}
        className={`flex items-center gap-4 p-4 rounded-2xl border ${borderClass} ${bgClass} cursor-pointer hover:shadow-md transition-all group`}
      >
        <div className={`flex flex-col items-center justify-center w-14 shrink-0 ${textClass}`}>
          <span className="text-sm font-black font-mono">{time}</span>
        </div>
        
        <div className="w-[1px] h-10 bg-slate-200 dark:bg-zinc-700 shrink-0 group-hover:bg-primary/30 transition-colors hidden sm:block" />

        <div className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-full bg-white dark:bg-black border border-slate-200 dark:border-zinc-800 flex items-center justify-center shadow-sm">
            {icon}
          </div>
        </div>

        <div className="flex flex-col min-w-0 flex-1">
          <span className={`text-sm font-bold truncate ${textClass}`}>
            {title}
          </span>
        </div>

        <div className="shrink-0 ml-auto flex items-center">
          {statusBadge}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="w-full h-[600px] flex flex-col items-center justify-center bg-white dark:bg-black rounded-2xl border border-slate-100 dark:border-zinc-800">
        <Loader2 size={32} className="animate-spin text-primary mb-4" />
        <p className="text-sm text-slate-500 font-bold">{language === 'vi' ? 'Đang tải danh sách...' : 'Loading list...'}</p>
      </div>
    );
  }

  // Filter local based on search query if needed
  const filteredData = data.map(day => {
    const filteredPosts = day.posts.filter(p => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      const title = p.captions?.articles?.title || '';
      const aiContent = p.captions?.ai_content || '';
      return title.toLowerCase().includes(q) || aiContent.toLowerCase().includes(q);
    });
    return { ...day, posts: filteredPosts };
  }).filter(day => day.posts.length > 0);

  if (filteredData.length === 0) {
    return (
      <div className="w-full h-[600px] flex flex-col items-center justify-center bg-slate-50 dark:bg-zinc-900/30 rounded-2xl border border-dashed border-slate-300 dark:border-zinc-700">
        <div className="w-16 h-16 bg-white dark:bg-zinc-800 rounded-full flex items-center justify-center shadow-sm mb-4">
          <CalendarDays size={28} className="text-slate-400" />
        </div>
        <p className="text-sm font-black text-slate-600 dark:text-slate-300">
          {language === 'vi' ? 'Không có bài đăng nào' : 'No scheduled posts'}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full bg-white dark:bg-black rounded-2xl border border-slate-200/80 dark:border-zinc-800 overflow-hidden shadow-sm flex flex-col h-[700px]">
      <div className="flex-1 overflow-y-auto p-4 md:p-6 scrollbar-thin">
        <div className="flex flex-col gap-10">
          {filteredData.map((dayGroup) => {
            return (
              <div key={dayGroup.date} className="flex flex-col">
                <div className="sticky top-0 z-10 bg-white/95 dark:bg-black/95 backdrop-blur-sm py-3 border-b border-slate-100 dark:border-zinc-800 mb-4">
                  <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 capitalize tracking-wide">
                    {getDayLabel(dayGroup.date)}
                  </h3>
                </div>

                <div className="flex flex-col gap-3">
                  {dayGroup.posts.map((post) => (
                    <React.Fragment key={post.id}>
                      {renderPost(post)}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {hasMore && (
          <div className="mt-10 flex justify-center pb-6">
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="flex items-center gap-2 px-6 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs transition-colors cursor-pointer border-0"
            >
              {loadingMore && <Loader2 size={14} className="animate-spin" />}
              {language === 'vi' ? 'Tải thêm' : 'Load more'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
