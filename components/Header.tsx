"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Plus, 
  Bell, 
  Menu, 
  CheckCircle2, 
  XCircle, 
  Trophy, 
  Info, 
  CheckCheck,
  Loader2,
  ExternalLink,
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
import UserProfileDropdown from '@/components/UserProfileDropdown';
import { translateNotification } from '@/lib/i18n/translateNotification';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';

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

const Header = ({ onMenuClick }: { onMenuClick?: () => void }) => {
  const { t, language } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const isAdminRoute = pathname?.startsWith('/admin');

  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Lấy danh sách 5 thông báo gần nhất và đếm số chưa đọc
  const fetchInitialNotifications = async (userId: string, role: string | null) => {
    setLoading(true);
    try {
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId);

      let countQuery = supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (role === 'admin') {
        query = query.eq('type', 'info');
        countQuery = countQuery.eq('type', 'info');
      }

      // Lấy 5 thông báo gần nhất
      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('fetchInitialNotifications query error:', error);
      } else if (data) {
        setNotifications(data as Notification[]);
      }

      // Đếm tổng số chưa đọc
      const { count, error: countError } = await countQuery;

      if (countError) {
        console.error('fetchInitialNotifications count query error:', countError);
      } else if (count !== null) {
        setUnreadCount(count);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;

    const initNotifications = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !isMounted) return;

      // Lấy role của user
      const { data: roleData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();
      
      let currentRole = null;
      if (roleData && isMounted) {
        currentRole = roleData.role;
        setUserRole(currentRole);
      }

      await fetchInitialNotifications(user.id, currentRole);

      // Đăng ký Supabase Realtime để nhận thông báo mới lập tức
      realtimeChannel = supabase
        .channel(`notifications-user-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const newNotif = payload.new as Notification;
            
            // Nếu user là admin và type thông báo không phải info, bỏ qua
            if (currentRole === 'admin' && newNotif.type !== 'info') {
              return;
            }

            // Cập nhật danh sách hiển thị
            setNotifications(prev => [newNotif, ...prev.slice(0, 4)]);
            setUnreadCount(prev => prev + 1);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          async (payload) => {
            // Khi có thay đổi trạng thái (ví dụ đã đọc từ nơi khác)
            const updatedNotif = payload.new as Notification;
            setNotifications(prev => 
              prev.map(n => n.id === updatedNotif.id ? updatedNotif : n)
            );
            
            // Tính toán lại số chưa đọc
            const { count } = await supabase
              .from('notifications')
              .select('id', { count: 'exact', head: true })
              .eq('user_id', user.id)
              .eq('is_read', false);
            if (count !== null) setUnreadCount(count);
          }
        )
        .subscribe();
    };

    initNotifications();

    // Click outside to close dropdown
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      isMounted = false;
      document.removeEventListener('mousedown', handleClickOutside);
      if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
      }
    };
  }, []);

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
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  // Đánh dấu đã đọc tất cả
  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return;

    try {
      const response = await fetch('/api/notifications/read-all', {
        method: 'PUT',
      });
      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  // Trả về Icon tương ứng với loại thông báo
  const getNotificationIcon = (type: string, title?: string) => {
    const t = (title || '').toLowerCase();
    if (t.includes('mở khóa') || t.includes('mở khoá')) {
      return <Unlock className="w-5 h-5 text-emerald-500 shrink-0" />;
    }
    if (t.includes('khóa') || t.includes('khoá')) {
      return <Lock className="w-5 h-5 text-rose-500 shrink-0" />;
    }
    if (t.includes('vai trò')) {
      return <UserCog className="w-5 h-5 text-blue-500 shrink-0" />;
    }
    if (t.includes('màu giao diện') || t.includes('tông màu')) {
      return <Palette className="w-5 h-5 text-purple-500 shrink-0" />;
    }
    if (t.includes('landing page') || t.includes('landing')) {
      return <Globe className="w-5 h-5 text-cyan-500 shrink-0" />;
    }
    if (t.includes('hồ sơ') || t.includes('thông tin cá nhân') || t.includes('ảnh đại diện')) {
      return <User className="w-5 h-5 text-indigo-500 shrink-0" />;
    }
    if (t.includes('mật khẩu')) {
      return <Key className="w-5 h-5 text-amber-500 shrink-0" />;
    }
    if (t.includes('khôi phục') || t.includes('lưu trữ')) {
      return <RotateCcw className="w-5 h-5 text-teal-500 shrink-0" />;
    }
    if (t.includes('prompt')) {
      return <Terminal className="w-5 h-5 text-orange-500 shrink-0" />;
    }

    switch (type) {
      case 'post_success':
        return <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />;
      case 'post_failed':
        return <XCircle className="w-5 h-5 text-rose-500 shrink-0" />;
      case 'ab_test_complete':
        return <Trophy className="w-5 h-5 text-amber-500 shrink-0" />;
      default:
        return <Info className="w-5 h-5 text-indigo-500 shrink-0" />;
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

    if (diffMins < 1) return language === 'vi' ? 'Vừa xong' : 'Just now';
    if (diffMins < 60) return language === 'vi' ? `${diffMins} phút trước` : `${diffMins}m ago`;
    if (diffHours < 24) return language === 'vi' ? `${diffHours} giờ trước` : `${diffHours}h ago`;
    return language === 'vi' ? `${diffDays} ngày trước` : `${diffDays}d ago`;
  };

  return (
    <header className="flex items-center justify-between py-6 gap-3 sm:gap-6 relative">


      <div className="flex items-center flex-1 min-w-0">
        <button 
          onClick={onMenuClick} 
          className="lg:hidden text-primary hover:bg-sidebar p-2 rounded-xl transition-colors mr-2 cursor-pointer shrink-0"
        >
          <Menu size={24} />
        </button>
        <div className="relative w-full max-w-[120px] sm:max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted w-5 h-5" />
          <input 
            type="text" 
            placeholder={t('header.searchPlaceholder')} 
            className="w-full bg-sidebar/50 rounded-full py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-text-muted"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-6 shrink-0 relative">
        {!isAdminRoute && userRole !== 'admin' && (
          <button 
            onClick={() => {
              router.push('/ai-creator');
              window.dispatchEvent(new CustomEvent('ai-creator-go-to-step-1'));
            }}
            className="bg-primary hover:bg-primary-hover text-white px-4 sm:px-6 py-2.5 rounded-full flex items-center gap-2 font-medium transition-colors shadow-md shadow-primary/20 cursor-pointer"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">{t('header.addPost')}</span>
          </button>
        )}
        
        {/* Notification Bell Icon & Dropdown Container */}
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className={`relative text-primary p-2 rounded-full transition-colors cursor-pointer ${
              isOpen ? 'bg-sidebar' : 'hover:bg-sidebar'
            }`}
          >
            <Bell size={24} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1 bg-rose-500 rounded-full border-2 border-white text-white text-[10px] font-black flex items-center justify-center animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-3 w-80 sm:w-96 bg-white rounded-2xl border border-gray-200/80 shadow-2xl z-50 flex flex-col overflow-hidden origin-top-right"
              >
                {/* Header */}
                <div className="px-4 py-3.5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                  <span className="text-sm font-black text-gray-900">
                    {language === 'vi' ? 'Thông báo gần đây' : 'Recent Notifications'}
                  </span>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllAsRead}
                      className="text-[11px] font-bold text-primary hover:text-primary-hover flex items-center gap-1 cursor-pointer border-0 bg-transparent"
                    >
                      <CheckCheck size={14} />
                      {language === 'vi' ? 'Đọc tất cả' : 'Read all'}
                    </button>
                  )}
                </div>

                {/* Notification Items List */}
                <div className="overflow-y-auto max-h-[320px] no-scrollbar">
                  {loading && notifications.length === 0 ? (
                    <div className="py-8 flex flex-col items-center justify-center gap-2 text-gray-400">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      <span className="text-xs">{language === 'vi' ? 'Đang tải thông báo...' : 'Loading notifications...'}</span>
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="py-8 text-center text-gray-400 text-xs">
                      {language === 'vi' ? 'Không có thông báo nào.' : 'No notifications yet.'}
                    </div>
                  ) : (
                    notifications.map((n) => {
                      const translated = translateNotification(n.title, n.message, language);
                      return (
                        <div
                          key={n.id}
                          onClick={() => {
                            handleMarkAsRead(n.id, n.is_read);
                            setIsOpen(false);
                            router.push('/notifications');
                          }}
                          className={`px-4 py-3.5 flex gap-3 cursor-pointer hover:bg-slate-50 transition-colors border-b border-gray-100/60 ${
                            !n.is_read ? 'bg-[#5A5CDE]/5' : ''
                          }`}
                        >
                          {getNotificationIcon(n.type, n.title)}
                          <div className="flex-1 flex flex-col gap-0.5 min-w-0">
                            <div className="flex items-start justify-between gap-1">
                              <span className={`text-xs text-gray-900 truncate ${!n.is_read ? 'font-black' : 'font-semibold'}`}>
                                {translated.title}
                              </span>
                              {!n.is_read && (
                                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                              )}
                            </div>
                            <span className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed">
                              {translated.message}
                            </span>
                            <span className="text-[9px] text-gray-400 mt-1 select-none">
                              {formatTimeAgo(n.created_at)}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Footer Link */}
                <button
                  onClick={() => {
                    setIsOpen(false);
                    router.push('/notifications');
                  }}
                  className="px-4 py-3 text-center text-xs font-bold text-primary hover:bg-slate-50 transition-colors border-t border-gray-100 flex items-center justify-center gap-1 cursor-pointer w-full bg-transparent border-0"
                >
                  {language === 'vi' ? 'Xem tất cả thông báo' : 'View all notifications'}
                  <ExternalLink size={12} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <UserProfileDropdown />
      </div>
    </header>
  );
};

export default Header;
