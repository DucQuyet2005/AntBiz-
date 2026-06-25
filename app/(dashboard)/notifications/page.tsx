"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Trophy, 
  Info, 
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Trash2,
  Lock,
  Unlock,
  UserCog,
  Palette,
  Globe,
  User,
  Key,
  RotateCcw,
  Terminal,
  Send,
  Calendar,
  Sparkles,
  Settings2
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { createClient } from '@/utils/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { translateNotification } from '@/lib/i18n/translateNotification';

interface Notification {
  id: string;
  user_id: string;
  type: 'post_success' | 'post_failed' | 'ab_test_complete' | 'info';
  title: string;
  message: string;
  is_read: boolean;
  metadata: any;
  created_at: string;
}

const ITEMS_PER_PAGE = 10;

export default function NotificationsPage() {
  const { t, language } = useLanguage();
  const supabase = createClient();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterCategory, setFilterCategory] = useState<'all' | 'bai-dang' | 'prompt' | 'lich' | 'he-thong'>('all');
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);


  const handleFilterChange = (newCategory: typeof filterCategory) => {
    setFilterCategory(newCategory);
    setCurrentPage(1);
  };

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        const { data } = await supabase.from('users').select('role').eq('id', user.id).single();
        if (data) setUserRole(data.role);
      }
    });
  }, []);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      // Gọi API route với param category — server tự build query Supabase đúng chuẩn
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(ITEMS_PER_PAGE),
        category: filterCategory,
      });

      const res = await fetch(`/api/notifications?${params.toString()}`);
      if (!res.ok) {
        console.error('fetchNotifications HTTP error:', res.status);
        return;
      }

      const json = await res.json();
      setNotifications((json.data || []) as Notification[]);
      setTotalCount(json.count || 0);
    } catch (err) {
      console.error('Error loading notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, filterCategory]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    let active = true;
    let realtimeChannel: any = null;

    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !active) return;

      realtimeChannel = supabase
        .channel(`page-user-notifications-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            console.log('Realtime notification update received on page:', payload);
            fetchNotifications();
          }
        )
        .subscribe((status, err) => {
          if (status !== 'SUBSCRIBED') {
            console.warn(`Supabase Realtime notification channel status on page for page-user-notifications-${user.id}:`, status, err);
          } else {
            console.log(`Supabase Realtime notification channel active on page for page-user-notifications-${user.id}`);
          }
        });
    };

    setupRealtime();

    return () => {
      active = false;
      if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
      }
    };
  }, [fetchNotifications, supabase]);



  // Đánh dấu đã đọc một thông báo
  const handleMarkAsRead = async (id: string, isRead: boolean) => {
    if (isRead) return;

    try {
      const response = await fetch(`/api/notifications/${id}/read`, {
        method: 'PUT',
      });
      if (response.ok) {
        setNotifications(prev =>
          prev.map(n => n.id === id ? { ...n, is_read: true } : n)
        );
      }
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  // Đánh dấu đã đọc tất cả
  const handleMarkAllAsRead = async () => {
    setMarkingAll(true);
    try {
      const response = await fetch('/api/notifications/read-all', {
        method: 'PUT',
      });
      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      }
    } catch (err) {
      console.error('Error marking all as read:', err);
    } finally {
      setMarkingAll(false);
    }
  };

  // Trả về Icon tương ứng với loại thông báo
  const getNotificationIcon = (type: string, title?: string) => {
    const t = (title || '').toLowerCase();
    if (t.includes('mở khóa') || t.includes('mở khoá')) {
      return <Unlock className="w-6 h-6 text-emerald-500 shrink-0" />;
    }
    if (t.includes('khóa') || t.includes('khoá')) {
      return <Lock className="w-6 h-6 text-rose-500 shrink-0" />;
    }
    if (t.includes('vai trò')) {
      return <UserCog className="w-6 h-6 text-blue-500 shrink-0" />;
    }
    if (t.includes('màu giao diện') || t.includes('tông màu')) {
      return <Palette className="w-6 h-6 text-purple-500 shrink-0" />;
    }
    if (t.includes('landing page') || t.includes('landing')) {
      return <Globe className="w-6 h-6 text-cyan-500 shrink-0" />;
    }
    if (t.includes('hồ sơ') || t.includes('thông tin cá nhân') || t.includes('ảnh đại diện')) {
      return <User className="w-6 h-6 text-indigo-500 shrink-0" />;
    }
    if (t.includes('mật khẩu')) {
      return <Key className="w-6 h-6 text-amber-500 shrink-0" />;
    }
    if (t.includes('khôi phục') || t.includes('lưu trữ')) {
      return <RotateCcw className="w-6 h-6 text-teal-500 shrink-0" />;
    }
    if (t.includes('prompt')) {
      return <Terminal className="w-6 h-6 text-orange-500 shrink-0" />;
    }

    switch (type) {
      case 'post_success':
        return <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />;
      case 'post_failed':
        return <XCircle className="w-6 h-6 text-rose-500 shrink-0" />;
      case 'ab_test_complete':
        return <Trophy className="w-6 h-6 text-amber-500 shrink-0" />;
      default:
        return <Info className="w-6 h-6 text-indigo-500 shrink-0" />;
    }
  };

  // Format thời gian đã trôi qua
  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const timeStr = `${hours}:${minutes}`;

    let relativeStr = '';
    if (diffMins < 1) {
      relativeStr = t('notifications.timeJustNow');
    } else if (diffMins < 60) {
      relativeStr = t('notifications.timeMinsAgo').replace('{mins}', String(diffMins));
    } else if (diffHours < 24) {
      relativeStr = t('notifications.timeHoursAgo').replace('{hours}', String(diffHours));
    } else {
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      relativeStr = t('notifications.timeDaysAgo').replace('{days}', String(diffDays));
      return `${timeStr} ${day}/${month} - ${relativeStr}`;
    }

    return `${timeStr} - ${relativeStr}`;
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);



  return (
    <div className="flex flex-col gap-6 font-sans">
      {/* Header View */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-white/8">
        <div>
          <h1 className="text-3xl font-extrabold text-text dark:text-white leading-none">
            {t('notifications.infoTitle')}
          </h1>
        </div>

        <button
          onClick={handleMarkAllAsRead}
          disabled={markingAll || notifications.every(n => n.is_read)}
          className="bg-primary hover:bg-primary-hover disabled:opacity-50 text-white px-5 py-2.5 rounded-full flex items-center gap-2 font-bold text-xs transition-colors shadow-md shadow-primary/20 cursor-pointer border-0"
        >
          {markingAll ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <CheckCheck size={16} />
          )}
          {t('notifications.markAllRead')}
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-50 dark:bg-white/5 p-1.5 rounded-2xl border border-slate-100/80 dark:border-white/8 w-fit select-none">
        {[
          { key: 'all' as const, label: language === 'vi' ? 'Tất cả' : 'All', icon: null, activeClass: 'bg-primary text-white shadow-sm shadow-primary/25' },
          { key: 'bai-dang' as const, label: language === 'vi' ? 'Bài đăng' : 'Posts', icon: Send, activeClass: 'bg-indigo-600 text-white shadow-sm shadow-indigo-200' },
          { key: 'prompt' as const, label: 'Prompt', icon: Sparkles, activeClass: 'bg-amber-500 text-white shadow-sm shadow-amber-200' },
          { key: 'lich' as const, label: language === 'vi' ? 'Lịch' : 'Calendar', icon: Calendar, activeClass: 'bg-emerald-600 text-white shadow-sm shadow-emerald-200' },
          { key: 'he-thong' as const, label: language === 'vi' ? 'Hệ thống' : 'System', icon: Settings2, activeClass: 'bg-slate-700 text-white shadow-sm shadow-slate-200' },
        ].map(({ key, label, icon: Icon, activeClass }) => {
          const isActive = filterCategory === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => handleFilterChange(key)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-1.5 cursor-pointer border-0 active:scale-95 ${
                isActive
                  ? activeClass
                  : 'text-slate-600 dark:text-white/50 hover:text-slate-800 dark:hover:text-white hover:bg-white/80 dark:hover:bg-white/8 bg-transparent'
              }`}
            >
              {Icon && <Icon size={13} />}
              <span>{label}</span>
            </button>
          );
        })}
      </div>



      {/* Main List */}
      <div className="bg-white dark:bg-black border border-gray-200/80 dark:border-white/8 rounded-2xl p-6 shadow-sm min-h-[400px] flex flex-col justify-between">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-400 my-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="text-sm font-medium">{t('common.loading')}</span>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-gray-400 my-20">
            <span className="text-sm font-semibold">{t('notifications.noNotifications')}</span>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <AnimatePresence mode="popLayout">
              {notifications.map((n) => {
                const translated = translateNotification(n.title, n.message, language);
                return (
                  <motion.div
                    key={n.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    onClick={() => handleMarkAsRead(n.id, n.is_read)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleMarkAsRead(n.id, n.is_read);
                      }
                    }}
                    tabIndex={0}
                    className={`p-4 rounded-2xl border transition-all flex items-start gap-4 cursor-pointer relative overflow-hidden focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none ${
                      !n.is_read
                        ? 'bg-primary/5 dark:bg-primary/8 border-primary/20 dark:border-primary/25 hover:bg-primary/8 dark:hover:bg-primary/12'
                        : 'bg-white dark:bg-transparent border-gray-150 dark:border-white/8 hover:bg-gray-50 dark:hover:bg-white/4'
                    }`}
                  >
                    {/* Icon */}
                    <div className="mt-0.5 shrink-0">
                      {getNotificationIcon(n.type, n.title)}
                    </div>
 
                    {/* Content */}
                    <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm text-gray-900 dark:text-white ${!n.is_read ? 'font-black' : 'font-semibold'}`}>
                            {translated.title}
                          </span>
                          {!n.is_read && (
                            <span className="px-2 py-0.5 rounded bg-primary/10 text-[9px] font-black text-primary uppercase select-none">
                              {t('notifications.newBadge')}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-white/60 mt-1 leading-relaxed max-w-3xl">
                          {translated.message}
                        </p>
                      </div>
 
                      <div className="flex items-center gap-3 self-start sm:self-center shrink-0">
                        <span className="text-[10px] text-gray-400 dark:text-white/40 font-bold select-none whitespace-nowrap">
                          {formatTimeAgo(n.created_at)}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
 
        {/* Unified Premium Pagination Controls */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 dark:border-white/8 pt-6 mt-6 select-none">
            <div className="text-xs text-text-muted font-bold">
              {t('notifications.showingInfo')
                .replace('{from}', String(Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, totalCount)))
                .replace('{to}', String(Math.min(currentPage * ITEMS_PER_PAGE, totalCount)))
                .replace('{total}', String(totalCount))}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-2.5 border border-gray-200/80 dark:border-white/8 rounded-2xl hover:bg-gray-50 dark:hover:bg-white/5 transition-all disabled:opacity-30 disabled:pointer-events-none text-text-muted dark:text-white/50 active:scale-95 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
              >
                <ChevronLeft size={16} />
              </button>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-10 h-10 rounded-2xl text-xs font-black transition-all active:scale-95 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none ${
                    currentPage === page
                      ? 'bg-primary text-white shadow-lg shadow-primary/20'
                      : 'border border-gray-200/80 dark:border-white/8 text-text dark:text-white/70 hover:bg-gray-50 dark:hover:bg-white/5'
                  }`}
                >
                  {page}
                </button>
              ))}
 
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-2.5 border border-gray-200/80 dark:border-white/8 rounded-2xl hover:bg-gray-50 dark:hover:bg-white/5 transition-all disabled:opacity-30 disabled:pointer-events-none text-text-muted dark:text-white/50 active:scale-95 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
