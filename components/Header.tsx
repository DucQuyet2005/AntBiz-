"use client";

import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Plus,
  Bell,
  Menu,
  Loader2,
  CheckCheck,
  ExternalLink,
  Unlock,
  Lock,
  UserCog,
  Palette,
  Globe,
  User,
  Key,
  RotateCcw,
  Terminal,
  CheckCircle2,
  XCircle,
  Trophy,
  Info,
  Sun,
  Moon
} from 'lucide-react';
import Image from 'next/image';
import { useLanguage } from '@/contexts/LanguageContext';
import UserProfileDropdown from '@/components/UserProfileDropdown';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/utils/supabase/client';
import { translateNotification } from '@/lib/i18n/translateNotification';

const Header = ({ onMenuClick }: { onMenuClick?: () => void }) => {
  const { t, language } = useLanguage();
  const { isDark, toggleDarkMode } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith('/admin');

  // Search Suggestions State
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<{
    articles?: any[];
    captions?: any[];
    prompts?: any[];
    faqs?: any[];
    users?: any[];
    auditLogs?: any[];
  } | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Notifications State
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false); // matches user's notification dropdown state
  const [loading, setLoading] = useState(false); // matches user's notification loading state
  const dropdownRef = useRef<HTMLDivElement>(null);

  const supabase = createClient();
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase.from('users').select('role').eq('id', user.id).single();
          if (data) {
            setUserRole(data.role);
          }
        }
      } catch (err) {
        console.warn('Error fetching user role in Header:', err);
      }
    };
    fetchRole();
  }, [supabase]);

  // Role-based Search Suggestions config
  const popularKeywords = userRole === 'admin'
    ? (language === 'vi'
        ? ['Người dùng', 'Lịch sử', 'Giao diện', 'Bảo mật', 'Cài đặt', 'Tài khoản', 'Quyền truy cập']
        : ['Users', 'Audit Logs', 'Landing Editor', 'Security', 'Settings', 'Account', 'Permissions'])
    : userRole === 'marketer_content'
    ? (language === 'vi'
        ? ['Kịch bản', 'Bài viết', 'Ý tưởng', 'Caption', 'Mẫu nội dung', 'Xu hướng', 'Facebook', 'TikTok']
        : ['Script', 'Article', 'Idea', 'Caption', 'Templates', 'Trends', 'Facebook', 'TikTok'])
    : (language === 'vi'
        ? ['Facebook', 'TikTok', 'Instagram', 'Marketing', 'Bán hàng', 'Kịch bản', 'Bài viết', 'Khách hàng']
        : ['Facebook', 'TikTok', 'Instagram', 'Marketing', 'Sales', 'Script', 'Article', 'Customer']);

  const quickAccessLinks = userRole === 'admin'
    ? [
        { name: language === 'vi' ? 'Quản lý người dùng' : 'User Management', href: '/admin/users', icon: UserCog },
        { name: language === 'vi' ? 'Nhật ký hệ thống' : 'Audit Logs', href: '/admin/audit-logs', icon: RotateCcw },
        { name: language === 'vi' ? 'Chỉnh sửa Landing' : 'Landing Editor', href: '/admin/landing-editor', icon: Globe },
        { name: language === 'vi' ? 'Cài đặt hệ thống' : 'System Settings', href: '/settings', icon: User },
      ]
    : [
        { name: language === 'vi' ? 'Thư viện Prompt' : 'Prompts Library', href: '/prompts', icon: Terminal },
        { name: language === 'vi' ? 'AI Creator' : 'AI Creator', href: '/ai-creator', icon: Plus },
        { name: language === 'vi' ? 'Lịch nội dung' : 'Content Calendar', href: '/content-calendar', icon: Palette },
        { name: language === 'vi' ? 'Lưu trữ' : 'Archive', href: '/archive', icon: Search },
      ];

  // Debounce API calls when search query changes
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSuggestions(null);
      // Keep suggestions dropdown open to show general suggestions
      return;
    }

    setIsSearchLoading(true);
    setIsSearchOpen(true);

    const delayDebounce = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery.trim())}&lang=${language}`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data);
        }
      } catch (err) {
        console.error('Error fetching search suggestions:', err);
      } finally {
        setIsSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, language]);

  // Click outside to close dropdowns
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const triggerSearch = () => {
    if (searchQuery.trim()) {
      setIsSearchOpen(false);
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsSearchOpen(false);
    } else if (e.key === 'Enter') {
      triggerSearch();
    }
  };

  const hasSuggestions =
    suggestions &&
    (userRole === 'admin'
      ? ((suggestions.users?.length ?? 0) > 0 ||
         (suggestions.auditLogs?.length ?? 0) > 0 ||
         (suggestions.faqs?.length ?? 0) > 0)
      : ((suggestions.articles?.length ?? 0) > 0 ||
         (suggestions.captions?.length ?? 0) > 0 ||
         (suggestions.prompts?.length ?? 0) > 0 ||
         (suggestions.faqs?.length ?? 0) > 0));

  // Fetch Notifications
  const fetchNotifications = async (silent = false) => {
    if (typeof window !== 'undefined' && !navigator.onLine) return;
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden' && silent) return;
    if (!silent) setLoading(true);
    try {
      // getSession() reads from localStorage — no network call, no Failed to fetch
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return;

      const [listRes, countRes] = await Promise.all([
        supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_read', false)
      ]);

      if (!listRes.error && listRes.data) {
        setNotifications(listRes.data);
      }

      if (!countRes.error) {
        setUnreadCount(countRes.count || 0);
      }
    } catch (err: any) {
      if (err?.message?.includes('Failed to fetch') || err instanceof TypeError) {
        console.warn('Network issue fetching notifications in Header (Failed to fetch/offline).');
      } else {
        console.error('Error fetching notifications in Header:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    let active = true;
    let realtimeChannel: any = null;

    const setupRealtime = async () => {
      if (typeof window !== 'undefined' && !navigator.onLine) return;
      try {
        // getSession() reads from localStorage — no network call, no Failed to fetch
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;
        if (!user || !active) return;

        realtimeChannel = supabase
          .channel(`user-notifications-${user.id}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${user.id}`,
            },
            (payload) => {
              console.log('Realtime notification update received in Header:', payload);
              fetchNotifications(true); // silent fetch
            }
          )
          .subscribe((status, err) => {
            if (status !== 'SUBSCRIBED') {
              console.warn(`Supabase Realtime notification channel status for user-notifications-${user.id}:`, status, err);
            } else {
              console.log(`Supabase Realtime notification channel active for user-notifications-${user.id}`);
            }
          });
      } catch (err) {
        console.warn('Error setting up Supabase Realtime in Header:', err);
      }
    };

    setupRealtime();

    const interval = setInterval(() => fetchNotifications(true), 30000); // silent fetch

    return () => {
      active = false;
      clearInterval(interval);
      if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
      }
    };
  }, []);

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
        setUnreadCount(prev => Math.max(prev - 1, 0));
      }
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/read-all', {
        method: 'PUT',
      });
      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  const getNotificationIcon = (type: string, title?: string) => {
    const titleLower = (title || '').toLowerCase();
    if (titleLower.includes('mở khóa') || titleLower.includes('mở khoá')) {
      return <Unlock className="w-5 h-5 text-emerald-500 shrink-0" />;
    }
    if (titleLower.includes('khóa') || titleLower.includes('khoá')) {
      return <Lock className="w-5 h-5 text-rose-500 shrink-0" />;
    }
    if (titleLower.includes('vai trò')) {
      return <UserCog className="w-5 h-5 text-blue-500 shrink-0" />;
    }
    if (titleLower.includes('màu giao diện') || titleLower.includes('tông màu')) {
      return <Palette className="w-5 h-5 text-purple-500 shrink-0" />;
    }
    if (titleLower.includes('landing page') || titleLower.includes('landing')) {
      return <Globe className="w-5 h-5 text-cyan-500 shrink-0" />;
    }
    if (titleLower.includes('hồ sơ') || titleLower.includes('thông tin cá nhân') || titleLower.includes('ảnh đại diện')) {
      return <User className="w-5 h-5 text-indigo-500 shrink-0" />;
    }
    if (titleLower.includes('mật khẩu')) {
      return <Key className="w-5 h-5 text-amber-500 shrink-0" />;
    }
    if (titleLower.includes('khôi phục') || titleLower.includes('lưu trữ')) {
      return <RotateCcw className="w-5 h-5 text-teal-500 shrink-0" />;
    }
    if (titleLower.includes('prompt')) {
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
      relativeStr = language === 'vi' ? 'Vừa xong' : 'Just now';
    } else if (diffMins < 60) {
      relativeStr = language === 'vi' ? `${diffMins} phút trước` : `${diffMins}m ago`;
    } else if (diffHours < 24) {
      relativeStr = language === 'vi' ? `${diffHours} giờ trước` : `${diffHours}h ago`;
    } else {
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      relativeStr = language === 'vi' ? `${diffDays} ngày trước` : `${diffDays}d ago`;
      return `${timeStr} ${day}/${month} - ${relativeStr}`;
    }

    return `${timeStr} - ${relativeStr}`;
  };

  return (
    <header className="flex items-center justify-between py-6 gap-3 sm:gap-6">
      <div className="flex items-center flex-1 min-w-0">
        <button
          onClick={onMenuClick}
          className="lg:hidden text-primary hover:bg-sidebar p-2 rounded-xl transition-colors mr-2 cursor-pointer shrink-0 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
        >
          <Menu size={24} />
        </button>
        <div ref={containerRef} className="relative w-full max-w-[120px] sm:max-w-md z-40">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted w-5 h-5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              setIsSearchOpen(true);
            }}
            placeholder={
              userRole === 'admin'
                ? (language === 'vi' ? 'Tìm kiếm người dùng, nhật ký, câu hỏi...' : 'Search users, logs, questions...')
                : userRole === 'marketer_content'
                ? (language === 'vi' ? 'Tìm kiếm bài viết, caption, ý tưởng, câu hỏi...' : 'Search articles, captions, ideas, questions...')
                : (language === 'vi' ? 'Tìm kiếm bài viết, caption, prompt, câu hỏi...' : 'Search articles, captions, prompts, questions...')
            }
            className="w-full bg-sidebar/50 rounded-full py-3 pl-12 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-text-muted border border-transparent focus:border-gray-200 dark:focus:border-white/10 text-text"
          />
          {isSearchLoading && (
            <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 text-primary w-4 h-4 animate-spin" />
          )}

          {/* Suggestions Dropdown */}
          {isSearchOpen && (
            <div className="absolute top-full left-0 mt-2 w-[320px] sm:w-[480px] bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/5 rounded-2xl shadow-2xl p-5 max-h-[460px] overflow-y-auto flex flex-col gap-4 z-50">
              {searchQuery.trim().length < 2 ? (
                <>
                  {/* Popular Suggestions */}
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-black text-text-muted uppercase tracking-wider px-1">
                      {t('search.popularSuggestions')}
                    </span>
                    <div className="flex flex-wrap gap-2 px-1">
                      {popularKeywords.map((kw) => (
                        <button
                          key={kw}
                          onClick={() => {
                            setSearchQuery(kw);
                          }}
                          className="px-3 py-1.5 text-xs rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 text-text font-semibold transition-all cursor-pointer border border-transparent dark:border-white/5 hover:scale-[1.02] active:scale-95"
                        >
                          #{kw}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Quick Access */}
                  <div className="flex flex-col gap-2 mt-2">
                    <span className="text-[10px] font-black text-text-muted uppercase tracking-wider px-1">
                      {t('search.quickAccess')}
                    </span>
                    <div className="grid grid-cols-2 gap-2 px-1">
                      {quickAccessLinks.map((link) => {
                        const Icon = link.icon;
                        return (
                          <Link
                            key={link.href}
                            href={link.href}
                            onClick={() => setIsSearchOpen(false)}
                            className="flex items-center gap-2 p-2.5 rounded-xl border border-gray-150 dark:border-white/5 bg-slate-50/50 hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 text-xs font-bold text-text transition-all cursor-pointer hover:scale-[1.01]"
                          >
                            <Icon size={14} className="text-primary shrink-0" />
                            <span>{link.name}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>

                  {/* Search Tip */}
                  <div className="text-[10px] text-text-muted italic text-center border-t border-gray-100 dark:border-white/5 pt-3.5 mt-1 px-1">
                    {t('search.searchTip')}
                  </div>
                </>
              ) : isSearchLoading && !hasSuggestions ? (
                <div className="flex items-center justify-center py-8 text-xs text-text-muted gap-2">
                  <Loader2 className="animate-spin text-primary" size={14} />
                  <span>{t('common.loading')}</span>
                </div>
              ) : !hasSuggestions ? (
                <div className="text-center py-8 text-xs text-text-muted font-bold">
                  {t('search.noResults')}
                </div>
              ) : (
                <>
                  {userRole === 'admin' ? (
                    <>
                      {/* Users Section */}
                      {suggestions.users && suggestions.users.length > 0 && (
                        <div className="flex flex-col gap-1.5">
                          <span className="text-[10px] font-black text-text-muted uppercase tracking-wider px-2.5">
                            {t('search.users')}
                          </span>
                          <div className="flex flex-col">
                            {suggestions.users.slice(0, 3).map((usr) => (
                              <Link
                                 key={usr.id}
                                 href="/admin/users"
                                 onClick={() => setIsSearchOpen(false)}
                                 className="block hover:bg-gray-50 dark:hover:bg-slate-800 p-2.5 rounded-2xl transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                              >
                                <div className="text-xs font-extrabold text-text line-clamp-1">{usr.email}</div>
                                <div className="text-[10px] text-text-muted line-clamp-1 mt-0.5 capitalize">
                                  {usr.role.replace('marketer_', '')} • {usr.status}
                                </div>
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Audit Logs Section */}
                      {suggestions.auditLogs && suggestions.auditLogs.length > 0 && (
                        <div className="flex flex-col gap-1.5">
                          <span className="text-[10px] font-black text-text-muted uppercase tracking-wider px-2.5">
                            {t('search.auditLogs')}
                          </span>
                          <div className="flex flex-col">
                            {suggestions.auditLogs.slice(0, 3).map((log) => (
                              <Link
                                 key={log.id}
                                 href="/admin/audit-logs"
                                 onClick={() => setIsSearchOpen(false)}
                                 className="block hover:bg-gray-50 dark:hover:bg-slate-800 p-2.5 rounded-2xl transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                              >
                                <div className="text-xs font-extrabold text-text line-clamp-1">{log.action}</div>
                                <div className="text-[10px] text-text-muted line-clamp-1 mt-0.5">
                                  {log.actor?.email || 'System'} • {new Date(log.created_at).toLocaleDateString()}
                                </div>
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {/* Articles Section */}
                      {suggestions.articles && suggestions.articles.length > 0 && (
                        <div className="flex flex-col gap-1.5">
                          <span className="text-[10px] font-black text-text-muted uppercase tracking-wider px-2.5">
                            {t('search.articles')}
                          </span>
                          <div className="flex flex-col">
                            {suggestions.articles.slice(0, 3).map((art) => (
                              <Link
                                 key={art.id}
                                 href={`/archive/${art.id}`}
                                 onClick={() => setIsSearchOpen(false)}
                                 className="block hover:bg-gray-50 dark:hover:bg-slate-800 p-2.5 rounded-2xl transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                              >
                                <div className="text-xs font-extrabold text-text line-clamp-1">{art.title}</div>
                                {art.description && (
                                  <div className="text-[10px] text-text-muted line-clamp-1 mt-0.5">{art.description}</div>
                                )}
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Captions Section */}
                      {suggestions.captions && suggestions.captions.length > 0 && (
                        <div className="flex flex-col gap-1.5">
                          <span className="text-[10px] font-black text-text-muted uppercase tracking-wider px-2.5">
                            {t('search.captions')}
                          </span>
                          <div className="flex flex-col">
                            {suggestions.captions.slice(0, 3).map((cap) => (
                              <Link
                                 key={cap.id}
                                 href={`/archive/${cap.article_id}?captionId=${cap.id}&platform=${cap.platform === 'thread' ? 'threads' : cap.platform}`}
                                 onClick={() => setIsSearchOpen(false)}
                                 className="block hover:bg-gray-50 dark:hover:bg-slate-800 p-2.5 rounded-2xl transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                              >
                                <div className="flex items-center gap-1.5 mb-1.5">
                                  <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[8px] font-black uppercase">
                                    {cap.platform}
                                  </span>
                                  {cap.articles?.title && (
                                    <span className="text-[9px] text-text-muted font-bold line-clamp-1">
                                      {cap.articles.title}
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-text line-clamp-1 font-medium">
                                  {cap.edited_content || cap.ai_content}
                                </div>
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Prompts Section */}
                      {suggestions.prompts && suggestions.prompts.length > 0 && (
                        <div className="flex flex-col gap-1.5">
                          <span className="text-[10px] font-black text-text-muted uppercase tracking-wider px-2.5">
                            {t('search.prompts')}
                          </span>
                          <div className="flex flex-col">
                            {suggestions.prompts.slice(0, 3).map((p) => (
                              <Link
                                key={p.id}
                                href={`/prompts?promptId=${p.id}`}
                                onClick={() => setIsSearchOpen(false)}
                                className="block hover:bg-gray-50 dark:hover:bg-slate-800 p-2.5 rounded-2xl transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                              >
                                <div className="flex items-center gap-1.5 mb-1.5">
                                  <span className="px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-500/20 text-[8px] font-black uppercase">
                                    {p.platform}
                                  </span>
                                  {p.tags?.slice(0, 2).map((tag: string) => (
                                    <span
                                      key={tag}
                                      className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20 text-[8px] font-black"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                                <div className="text-xs font-extrabold text-text line-clamp-1">{p.name}</div>
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* FAQs Section */}
                  {suggestions.faqs && suggestions.faqs.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-black text-text-muted uppercase tracking-wider px-2.5">
                        {t('search.faqs')}
                      </span>
                      <div className="flex flex-col">
                        {suggestions.faqs.slice(0, 3).map((faq) => (
                          <Link
                            key={faq.key}
                            href={`/faq?key=${faq.key}`}
                            onClick={() => setIsSearchOpen(false)}
                            className="block hover:bg-gray-50 dark:hover:bg-slate-800 p-2.5 rounded-2xl transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                          >
                            <div className="text-xs font-extrabold text-text line-clamp-1">{faq.question}</div>
                            {faq.answer && (
                              <div className="text-[10px] text-text-muted line-clamp-1 mt-0.5">{faq.answer}</div>
                            )}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Footer Action */}
                  <button
                    onClick={triggerSearch}
                    className="w-full text-center text-xs font-black text-primary hover:underline border-t border-gray-100 dark:border-white/5 pt-3 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none rounded-xl"
                  >
                    {t('search.seeAll')} &quot;{searchQuery}&quot;
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-6 shrink-0">
        {!isAdminRoute && userRole !== 'admin' && (
          <button
            onClick={() => {
              router.push('/ai-creator');
              window.dispatchEvent(new CustomEvent('ai-creator-go-to-step-1'));
            }}
            className="bg-primary hover:bg-primary-hover text-white px-4 sm:px-6 py-2.5 rounded-full flex items-center gap-2 font-black transition-colors shadow-md shadow-primary/20 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">{t('header.addPost')}</span>
          </button>
        )}

        {/* Notification Bell Icon & Dropdown Container */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`relative text-primary p-2 rounded-full transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${isOpen ? 'bg-sidebar' : 'hover:bg-sidebar'
              }`}
          >
            <Bell size={24} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1 bg-rose-500 rounded-full border-2 border-white dark:border-slate-900 text-white text-[10px] font-black flex items-center justify-center animate-pulse">
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
                className="absolute right-0 mt-3 w-80 sm:w-96 bg-white dark:bg-black rounded-2xl border border-gray-200/80 dark:border-white/8 shadow-2xl z-50 flex flex-col overflow-hidden origin-top-right"
              >
                {/* Header */}
                <div className="px-4 py-3.5 border-b border-gray-100 dark:border-white/8 flex items-center justify-between bg-gray-50/50 dark:bg-white/3">
                  <span className="text-sm font-black text-gray-900 dark:text-text">
                    {language === 'vi' ? 'Thông báo gần đây' : 'Recent Notifications'}
                  </span>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllAsRead}
                      className="text-[11px] font-bold text-primary hover:text-primary-hover flex items-center gap-1 cursor-pointer border-0 bg-transparent focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none rounded px-1"
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
                          tabIndex={0}
                          onClick={() => {
                            handleMarkAsRead(n.id, n.is_read);
                            setIsOpen(false);
                            router.push('/notifications');
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleMarkAsRead(n.id, n.is_read);
                              setIsOpen(false);
                              router.push('/notifications');
                            }
                          }}
                          className={`px-4 py-3.5 flex gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-b border-gray-100/60 dark:border-white/5 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${!n.is_read ? 'bg-primary/5 dark:bg-primary/10' : ''
                            }`}
                        >
                          {getNotificationIcon(n.type, n.title)}
                          <div className="flex-1 flex flex-col gap-0.5 min-w-0">
                            <div className="flex items-start justify-between gap-1">
                              <span className={`text-xs text-gray-900 dark:text-text truncate ${!n.is_read ? 'font-black' : 'font-semibold'}`}>
                                {translated.title}
                              </span>
                              {!n.is_read && (
                                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                              )}
                            </div>
                            <span className="text-[11px] text-gray-500 dark:text-text-muted line-clamp-2 leading-relaxed">
                              {translated.message}
                            </span>
                            <span className="text-[9px] text-gray-400 dark:text-white/45 mt-1 select-none">
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
                  className="px-4 py-3 text-center text-xs font-bold text-primary hover:bg-slate-50 dark:hover:bg-white/5 transition-colors border-t border-gray-100 dark:border-white/8 flex items-center justify-center gap-1 cursor-pointer w-full bg-transparent border-0 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                >
                  {language === 'vi' ? 'Xem tất cả thông báo' : 'View all notifications'}
                  <ExternalLink size={12} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Dark Mode Toggle Button */}
        <button
          onClick={toggleDarkMode}
          className="text-primary hover:bg-sidebar p-2 rounded-full transition-all duration-100 active:scale-95 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          title={isDark ? (language === 'vi' ? 'Chuyển sang chế độ sáng' : 'Switch to light mode') : (language === 'vi' ? 'Chuyển sang chế độ tối' : 'Switch to dark mode')}
        >
          {isDark ? <Sun size={24} className="text-amber-500 animate-[spin_0.5s_ease-out_1]" /> : <Moon size={24} className="text-primary" />}
        </button>

        <UserProfileDropdown />
      </div>

    </header>
  );
};

export default Header;
