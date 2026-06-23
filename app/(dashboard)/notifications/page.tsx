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
  Terminal
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
  const [filterType, setFilterType] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      // Xây dựng câu truy vấn
      let query = supabase
        .from('notifications')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (filterType !== 'all') {
        query = query.eq('type', filterType);
      }

      const { data, error, count } = await query.range(from, to);

      if (error) {
        console.error('fetchNotifications query error:', error);
      } else if (data) {
        setNotifications(data as Notification[]);
        setTotalCount(count || 0);
      }
    } catch (err) {
      console.error('Error loading notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, filterType, supabase]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    let realtimeChannel: any = null;

    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

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
      if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
      }
    };
  }, [fetchNotifications, supabase]);

  // Reset về trang 1 khi đổi bộ lọc
  const handleFilterChange = (type: string) => {
    setFilterType(type);
    setCurrentPage(1);
  };

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

  // Danh sách các tab bộ lọc
  const filterTabs = [
    { type: 'all', label: t('notifications.filterAll') },
    ...(userRole !== 'admin' ? [
      { type: 'post_success', label: t('notifications.filterSuccess') },
      { type: 'post_failed', label: t('notifications.filterFailed') },
      { type: 'ab_test_complete', label: t('notifications.filterAb') },
    ] : []),
    { type: 'info', label: t('notifications.filterInfo') },
  ];

  return (
    <div className="flex flex-col gap-6 font-sans">
      {/* Header View */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
        <div>
          <h1 className="text-3xl font-extrabold text-[#1E293B] leading-none">
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

      {/* Filter Tabs */}
      <div className="flex overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 gap-2 no-scrollbar">
        {filterTabs.map((tab) => (
          <button
            key={tab.type}
            onClick={() => handleFilterChange(tab.type)}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer select-none border border-transparent ${
              filterType === tab.type
                ? 'bg-primary text-white shadow-sm'
                : 'bg-white border-gray-200 text-text-muted hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main List */}
      <div className="bg-white border border-gray-200/80 rounded-[32px] p-6 shadow-sm min-h-[400px] flex flex-col justify-between">
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
                    className={`p-4 rounded-2xl border transition-all flex items-start gap-4 cursor-pointer relative overflow-hidden ${
                      !n.is_read
                        ? 'bg-[#5A5CDE]/5 border-primary/20 hover:bg-[#5A5CDE]/8'
                        : 'bg-white border-gray-150 hover:bg-gray-50'
                    }`}
                  >
                    {/* Left Border Highlight for Unread */}
                    {!n.is_read && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                    )}

                    {/* Icon */}
                    <div className="mt-0.5 shrink-0">
                      {getNotificationIcon(n.type, n.title)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm text-gray-900 ${!n.is_read ? 'font-black' : 'font-semibold'}`}>
                            {translated.title}
                          </span>
                          {!n.is_read && (
                            <span className="px-2 py-0.5 rounded bg-primary/10 text-[9px] font-black text-primary uppercase select-none">
                              {t('notifications.newBadge')}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1 leading-relaxed max-w-3xl">
                          {translated.message}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 self-start sm:self-center shrink-0">
                        <span className="text-[10px] text-gray-400 font-bold select-none whitespace-nowrap">
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
          <div className="flex items-center justify-between border-t border-gray-100 pt-6 mt-6 select-none">
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
                className="p-2.5 border border-gray-200/80 rounded-2xl hover:bg-gray-50 transition-all disabled:opacity-30 disabled:pointer-events-none text-text-muted active:scale-95 cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-10 h-10 rounded-2xl text-xs font-black transition-all active:scale-95 cursor-pointer ${
                    currentPage === page
                      ? 'bg-primary text-white shadow-lg shadow-primary/20'
                      : 'border border-gray-200/80 text-text hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-2.5 border border-gray-200/80 rounded-2xl hover:bg-gray-50 transition-all disabled:opacity-30 disabled:pointer-events-none text-text-muted active:scale-95 cursor-pointer"
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
