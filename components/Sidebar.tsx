"use client";

import React from 'react';
import { 
  LayoutDashboard, 
  Wand2, 
  CalendarDays, 
  Archive, 
  Settings, 
  HelpCircle,
  HeadphonesIcon,
  LogOut
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const Sidebar = () => {
  const pathname = usePathname();

  return (
    <aside className="w-[280px] h-screen bg-sidebar flex flex-col justify-between py-8 px-6 rounded-r-[32px] fixed left-0 top-0 overflow-y-auto z-50">
      <div>
        <div className="flex items-center gap-3 mb-10 px-2">
          {/* Mock image from user screenshot */}
          <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-300">
             <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop" alt="User" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-primary">Creator Studio</h1>
            <p className="text-xs text-text-muted">AI Publishing Hub</p>
          </div>
        </div>

        <nav className="flex flex-col gap-2">
          <Link href="/" className={`flex items-center gap-4 px-4 py-3 rounded-xl font-medium transition-colors ${pathname === '/' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-text-muted hover:bg-white/50 hover:text-text'}`}>
            <LayoutDashboard size={20} />
            Overview
          </Link>
          <Link href="/ai-creator" className={`flex items-center gap-4 px-4 py-3 rounded-xl font-medium transition-colors ${pathname === '/ai-creator' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-text-muted hover:bg-white/50 hover:text-text'}`}>
            <Wand2 size={20} />
            AI Creator
          </Link>
          <Link href="/content-calendar" className={`flex items-center gap-4 px-4 py-3 rounded-xl font-medium transition-colors ${pathname === '/content-calendar' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-text-muted hover:bg-white/50 hover:text-text'}`}>
            <CalendarDays size={20} />
            Content Calendar
          </Link>
          <Link href="/archive" className={`flex items-center gap-4 px-4 py-3 rounded-xl font-medium transition-colors ${pathname === '/archive' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-text-muted hover:bg-white/50 hover:text-text'}`}>
            <Archive size={20} />
            Archive
          </Link>
          <Link href="/settings" className={`flex items-center gap-4 px-4 py-3 rounded-xl font-medium transition-colors ${pathname === '/settings' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-text-muted hover:bg-white/50 hover:text-text'}`}>
            <Settings size={20} />
            Settings
          </Link>
          <Link href="/faq" className={`flex items-center gap-4 px-4 py-3 rounded-xl font-medium transition-colors ${pathname === '/faq' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-text-muted hover:bg-white/50 hover:text-text'}`}>
            <HelpCircle size={20} />
            FAQ
          </Link>
        </nav>
      </div>

      <div className="flex flex-col gap-2 mt-auto pt-8">
        <button className="flex items-center gap-4 px-4 py-3 text-text-muted hover:text-text font-medium transition-colors w-full">
          <HeadphonesIcon size={20} />
          Support
        </button>
        <button className="flex items-center gap-4 px-4 py-3 text-text-muted hover:text-text font-medium transition-colors w-full">
          <LogOut size={20} />
          Log Out
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
