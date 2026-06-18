"use client";

import React from 'react';
import { Search, Plus, Bell } from 'lucide-react';
import Image from 'next/image';
import { useLanguage } from '@/contexts/LanguageContext';
import UserProfileDropdown from '@/components/UserProfileDropdown';

import { useRouter } from 'next/navigation';

const Header = () => {
  const { t } = useLanguage();
  const router = useRouter();

  return (
    <header className="flex items-center justify-between py-6">
      <div className="relative w-96">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted w-5 h-5" />
        <input 
          type="text" 
          placeholder={t('header.searchPlaceholder')} 
          className="w-full bg-sidebar/50 rounded-full py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-text-muted"
        />
      </div>

      <div className="flex items-center gap-6">
        <button 
          onClick={() => {
            router.push('/ai-creator');
            window.dispatchEvent(new CustomEvent('ai-creator-go-to-step-1'));
          }}
          className="bg-primary hover:bg-primary-hover text-white px-6 py-2.5 rounded-full flex items-center gap-2 font-medium transition-colors shadow-md shadow-primary/20 cursor-pointer"
        >
          <Plus size={18} />
          {t('header.addPost')}
        </button>
        
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

