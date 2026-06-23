"use client";

import React from 'react';
import { Search, Plus, Bell, Menu } from 'lucide-react';
import Image from 'next/image';
import { useLanguage } from '@/contexts/LanguageContext';
import UserProfileDropdown from '@/components/UserProfileDropdown';

import { useRouter, usePathname } from 'next/navigation';

const Header = ({ onMenuClick }: { onMenuClick?: () => void }) => {
  const { t, language } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith('/admin');

  return (
    <header className="flex items-center justify-between py-6 gap-3 sm:gap-6">
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

      <div className="flex items-center gap-3 sm:gap-6 shrink-0">
        {!isAdminRoute && (
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
            className={`relative text-primary p-2 rounded-full transition-colors cursor-pointer ${isOpen ? 'bg-sidebar' : 'hover:bg-sidebar'
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
                          className={`px-4 py-3.5 flex gap-3 cursor-pointer hover:bg-slate-50 transition-colors border-b border-gray-100/60 ${!n.is_read ? 'bg-[#5A5CDE]/5' : ''
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
