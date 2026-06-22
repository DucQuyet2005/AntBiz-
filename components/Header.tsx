"use client";

import React from 'react';
import { Search, Plus, Bell, Menu } from 'lucide-react';
import Image from 'next/image';
import { useLanguage } from '@/contexts/LanguageContext';
import UserProfileDropdown from '@/components/UserProfileDropdown';

import { useRouter, usePathname } from 'next/navigation';

const Header = ({ onMenuClick }: { onMenuClick?: () => void }) => {
  const { t } = useLanguage();
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
        
        <button className="relative text-primary hover:bg-sidebar p-2 rounded-full transition-colors">
          <Bell size={24} />
          <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-bg"></span>
        </button>

        <UserProfileDropdown />
      </div>
    </header>
  );
};

export default Header;

