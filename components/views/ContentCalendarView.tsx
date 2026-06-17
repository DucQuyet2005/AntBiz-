"use client";

import React, { useState } from 'react';
import { 
  Instagram, 
  Facebook, 
  Plus, 
  CalendarDays, 
  Rocket, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';


// Threads Custom SVG Logo
const ThreadsIcon = ({ size = 20, className = "" }: { size?: number; className?: string }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" className={className}>
    <path d="M22.5 12c0-5.799-4.701-10.5-10.5-10.5S1.5 6.201 1.5 12s4.701 10.5 10.5 10.5c2.328 0 4.475-.758 6.216-2.038l-1.39-1.39C15.42 19.98 13.784 20.5 12 20.5c-4.694 0-8.5-3.806-8.5-8.5s3.806-8.5 8.5-8.5 8.5 3.806 8.5 8.5c0 1.956-.503 3.659-1.42 4.8-.813 1.011-1.923 1.5-3.08 1.5-1.144 0-1.848-.553-2.128-1.123-.391-.798-.328-2.109-.328-3.177v-2.5c0-.828-.672-1.5-1.5-1.5s-1.5.672-1.5 1.5v2.5c0 .356-.002.83-.027 1.309a4 4 0 1 1-3.953-3.809c.28 0 .546.035.803.097V8.539c-.26-.025-.525-.039-.79-.039a7 7 0 1 0 5.679 11.096c.71.91 1.776 1.404 3.018 1.404 2.217 0 4.156-1.134 5.347-2.923 1.15-1.729 1.693-3.992 1.693-6.077zM9.5 12a1 1 0 1 0 2 0 1 1 0 0 0-2 0z" />
  </svg>
);

// Blog Custom Icon (representing article/document)
const BlogIcon = ({ size = 20 }: { size?: number }) => (
  <div className={`w-${size / 4} h-${size / 4} flex items-center justify-center bg-[#1f5f4a] text-white rounded-full`} style={{ width: size, height: size }}>
    <span className="text-[10px] font-bold">B</span>
  </div>
);

export default function ContentCalendarView() {
  const { t } = useLanguage();
  const [viewMode, setViewMode] = useState<'week' | 'month' | 'quarter'>('week');

  return (
    <div className="flex flex-col gap-6">
      
      {/* Title Header */}
      <div className="flex justify-between items-end mt-2">
        <div>
          <h1 className="text-4xl font-bold text-text mb-1 tracking-tight">{t('contentCalendar.title')}</h1>
          <p className="text-text-muted">{t('contentCalendar.subtitle')}</p>
        </div>

        {/* View Selection Toggle */}
        <div className="flex bg-[#F1F3F9] p-1.5 rounded-2xl shadow-inner border border-gray-200/50">
          <button 
            onClick={() => setViewMode('week')}
            className={`px-5 py-2 text-xs font-semibold rounded-xl transition-all ${viewMode === 'week' ? 'bg-white text-text shadow-sm' : 'text-text-muted hover:text-text'}`}
          >
            {t('contentCalendar.week')}
          </button>
          <button 
            onClick={() => setViewMode('month')}
            className={`px-5 py-2 text-xs font-semibold rounded-xl transition-all ${viewMode === 'month' ? 'bg-white text-text shadow-sm' : 'text-text-muted hover:text-text'}`}
          >
            {t('contentCalendar.month')}
          </button>
          <button 
            onClick={() => setViewMode('quarter')}
            className={`px-5 py-2 text-xs font-semibold rounded-xl transition-all ${viewMode === 'quarter' ? 'bg-white text-text shadow-sm' : 'text-text-muted hover:text-text'}`}
          >
            {t('contentCalendar.quarter')}
          </button>
        </div>
      </div>

      {/* Main Split Grid */}
      <div className="grid grid-cols-12 gap-6 items-stretch">
        
        {/* Left Column: Active Campaigns */}
        <div className="col-span-4 bg-[#F8FAFC] border border-gray-200/60 rounded-[32px] p-6 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-text">{t('contentCalendar.activeCampaigns')}</h2>
              <button className="w-8 h-8 rounded-full bg-[#DFE5FA] hover:bg-primary/20 flex items-center justify-center text-primary transition-colors">
                <Plus size={18} />
              </button>
            </div>

            {/* Campaign Cards List */}
            <div className="flex flex-col gap-4">
              
              {/* Campaign 1 */}
              <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-[#FF7E67]">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-text text-sm">Summer Launch &apos;24</h3>
                  <span className="bg-[#EDE9FE] text-[#6366F1] font-semibold px-2 py-0.5 rounded text-[10px] uppercase tracking-wider">
                    {t('contentCalendar.statusActive')}
                  </span>
                </div>
                <p className="text-xs text-text-muted mb-3">{t('contentCalendar.postsCount', { count: 12 })}</p>
                
                {/* Users List Mock */}
                <div className="flex items-center">
                  <div className="flex -space-x-2">
                    <img className="w-6 h-6 rounded-full border-2 border-white" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50&h=50&fit=crop" alt="User 1" />
                    <img className="w-6 h-6 rounded-full border-2 border-white" src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=50&h=50&fit=crop" alt="User 2" />
                  </div>
                </div>
              </div>

              {/* Campaign 2 */}
              <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-[#3DD9D6]">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-text text-sm">Product Update 2.1</h3>
                  <span className="bg-[#E0F2FE] text-[#0369A1] font-semibold px-2 py-0.5 rounded text-[10px] uppercase tracking-wider">
                    {t('contentCalendar.statusDrafting')}
                  </span>
                </div>
                <p className="text-xs text-text-muted mb-3">{t('contentCalendar.threadsFocused', { count: 5 })}</p>
                
                {/* Users List Mock */}
                <div className="flex items-center">
                  <div className="flex -space-x-2">
                    <div className="w-6 h-6 rounded-full bg-primary text-white border-2 border-white flex items-center justify-center text-[10px] font-bold">
                      AI
                    </div>
                  </div>
                </div>
              </div>

              {/* Campaign 3 */}
              <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-[#FFD043]">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-text text-sm">User Stories Vol 3</h3>
                  <span className="bg-[#FEF3C7] text-[#D97706] font-semibold px-2 py-0.5 rounded text-[10px] uppercase tracking-wider">
                    {t('contentCalendar.statusReview')}
                  </span>
                </div>
                <p className="text-xs text-text-muted mb-3">{t('contentCalendar.instaReels', { count: 8 })}</p>
                
                {/* Users List Mock */}
                <div className="flex items-center">
                  <div className="flex -space-x-2">
                    <img className="w-6 h-6 rounded-full border-2 border-white" src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=50&h=50&fit=crop" alt="User 3" />
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Bottom Link */}
          <div className="mt-6 text-center">
            <button className="inline-flex items-center gap-2 text-sm text-[#4F46E5] hover:text-indigo-800 font-bold transition-colors">
              {t('contentCalendar.viewAllProjects')} <ArrowRight size={16} />
            </button>
          </div>
        </div>

        {/* Right Column: Platform Timeline (Calendar Grid) */}
        <div className="col-span-8 bg-white border border-gray-200/60 rounded-[32px] p-6 shadow-sm flex flex-col justify-between relative overflow-hidden">
          
          <div>
            {/* Timeline Header Row */}
            <div className="grid grid-cols-[140px_repeat(7,1fr)] items-center border-b border-gray-100 pb-4 mb-4">
              <span className="text-xs font-bold text-text-muted uppercase">{t('contentCalendar.platforms')}</span>
              
              {/* Day Labels Container */}
              <div className="col-span-7 grid grid-cols-7 gap-x-3 text-center px-1 text-xs font-semibold text-text-muted select-none">
                <div>{t('contentCalendar.days.Mon')} 12</div>
                <div>{t('contentCalendar.days.Tue')} 13</div>
                <div>{t('contentCalendar.days.Wed')} 14</div>
                <div className="text-text font-bold relative flex flex-col items-center">
                  {t('contentCalendar.days.Thu')} 15
                  <span className="text-[10px] text-primary mt-[2px] font-medium bg-[#EEF2FF] px-1.5 py-0.2 rounded-full border border-primary/20">{t('contentCalendar.today')}</span>
                </div>
                <div>{t('contentCalendar.days.Fri')} 16</div>
                <div className="text-[#E15A5A]">{t('contentCalendar.days.Sat')} 17</div>
                <div className="text-[#E15A5A]">{t('contentCalendar.days.Sun')} 18</div>
              </div>
            </div>

            {/* Platform Rows */}
            <div className="flex flex-col gap-3">
              
              {/* Instagram Row */}
              <div className="grid grid-cols-[140px_repeat(7,1fr)] items-center h-20 border-b border-gray-50 pb-2">
                {/* Platform Identity */}
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#FFB543] via-[#FF5858] to-[#E1306C] flex items-center justify-center text-white">
                    <Instagram size={18} />
                  </div>
                  <span className="font-bold text-text text-sm">{t('contentCalendar.instagram')}</span>
                </div>
                
                {/* Timeline cells & pills */}
                <div className="col-span-7 relative h-full">
                  {/* Vertical dividers */}
                  <div className="absolute inset-0 grid grid-cols-7 pointer-events-none">
                    {[...Array(7)].map((_, i) => (
                      <div key={i} className="border-l border-gray-100/70 h-full first:border-l-0"></div>
                    ))}
                  </div>
                  
                  {/* Pills */}
                  <div className="absolute inset-0 grid grid-cols-7 gap-x-3 items-center px-1 z-10">
                    {/* Pill 1: Tue-Wed */}
                    <div className="col-start-2 col-span-2 bg-[#FFF1F2] border border-rose-100 text-[#E11D48] rounded-full py-2 px-3 text-xs font-semibold flex items-center gap-2 shadow-sm hover:shadow transition-shadow truncate cursor-pointer">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#E11D48] shrink-0"></span>
                      <span className="truncate">Summer Launch: Teaser...</span>
                    </div>

                    {/* Pill 2: Thu-Fri */}
                    <div className="col-start-4 col-span-2 bg-[#FEF3C7] border border-amber-100 text-[#D97706] rounded-full py-2 px-3 text-xs font-semibold flex items-center gap-2 shadow-sm hover:shadow transition-shadow truncate cursor-pointer">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#D97706] shrink-0"></span>
                      <span className="truncate">User Story: Sarah&apos;s...</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Threads Row */}
              <div className="grid grid-cols-[140px_repeat(7,1fr)] items-center h-20 border-b border-gray-50 pb-2">
                {/* Platform Identity */}
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-black flex items-center justify-center text-white">
                    <ThreadsIcon size={18} />
                  </div>
                  <span className="font-bold text-text text-sm">{t('contentCalendar.threads')}</span>
                </div>
                
                {/* Timeline cells & pills */}
                <div className="col-span-7 relative h-full">
                  {/* Vertical dividers */}
                  <div className="absolute inset-0 grid grid-cols-7 pointer-events-none">
                    {[...Array(7)].map((_, i) => (
                      <div key={i} className="border-l border-gray-100/70 h-full first:border-l-0"></div>
                    ))}
                  </div>
                  
                  {/* Pills */}
                  <div className="absolute inset-0 grid grid-cols-7 gap-x-3 items-center px-1 z-10">
                    {/* Pill 1: Mon-Tue */}
                    <div className="col-start-1 col-span-2 bg-[#F0FDFA] border border-teal-100 text-[#0F766E] rounded-full py-2 px-3 text-xs font-semibold flex items-center gap-2 shadow-sm hover:shadow transition-shadow truncate cursor-pointer">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#0F766E] shrink-0"></span>
                      <span className="truncate">V2.1 Thread</span>
                    </div>

                    {/* Pill 2: Wed-Thu */}
                    <div className="col-start-3 col-span-2 bg-[#FFF1F2] border border-rose-100 text-[#E11D48] rounded-full py-2 px-3 text-xs font-semibold flex items-center gap-2 shadow-sm hover:shadow transition-shadow truncate cursor-pointer">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#E11D48] shrink-0"></span>
                      <span className="truncate">Feature Deep Dive</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Facebook Row */}
              <div className="grid grid-cols-[140px_repeat(7,1fr)] items-center h-20 border-b border-gray-50 pb-2">
                {/* Platform Identity */}
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#1877F2] flex items-center justify-center text-white">
                    <Facebook size={18} />
                  </div>
                  <span className="font-bold text-text text-sm">{t('contentCalendar.facebook')}</span>
                </div>
                
                {/* Timeline cells & pills */}
                <div className="col-span-7 relative h-full">
                  {/* Vertical dividers */}
                  <div className="absolute inset-0 grid grid-cols-7 pointer-events-none">
                    {[...Array(7)].map((_, i) => (
                      <div key={i} className="border-l border-gray-100/70 h-full first:border-l-0"></div>
                    ))}
                  </div>
                  
                  {/* Pills */}
                  <div className="absolute inset-0 grid grid-cols-7 gap-x-3 items-center px-1 z-10">
                    {/* Pill 1: Tue-Thu */}
                    <div className="col-start-2 col-span-3 bg-[#FEF3C7] border border-amber-100 text-[#D97706] rounded-full py-2 px-3 text-xs font-semibold flex items-center gap-2 shadow-sm hover:shadow transition-shadow truncate cursor-pointer">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#D97706] shrink-0"></span>
                      <span className="truncate">Community Poll</span>
                    </div>

                    {/* Pill 2: Fri-Sun */}
                    <div className="col-start-5 col-span-3 bg-[#FFF1F2] border border-rose-100 text-[#E11D48] rounded-full py-2 px-3 text-xs font-semibold flex items-center gap-2 shadow-sm hover:shadow transition-shadow truncate cursor-pointer">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#E11D48] shrink-0"></span>
                      <span className="truncate">Summer Launch: Live Event</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Blog Row */}
              <div className="grid grid-cols-[140px_repeat(7,1fr)] items-center h-20 pb-2">
                {/* Platform Identity */}
                <div className="flex items-center gap-3">
                  <BlogIcon size={36} />
                  <span className="font-bold text-text text-sm">{t('contentCalendar.blog')}</span>
                </div>
                
                {/* Timeline cells & pills */}
                <div className="col-span-7 relative h-full">
                  {/* Vertical dividers */}
                  <div className="absolute inset-0 grid grid-cols-7 pointer-events-none">
                    {[...Array(7)].map((_, i) => (
                      <div key={i} className="border-l border-gray-100/70 h-full first:border-l-0"></div>
                    ))}
                  </div>
                  
                  {/* Pills */}
                  <div className="absolute inset-0 grid grid-cols-7 gap-x-3 items-center px-1 z-10">
                    {/* Pill 1: Wed-Fri */}
                    <div className="col-start-3 col-span-3 bg-[#F0FDFA] border border-teal-100 text-[#0F766E] rounded-full py-2 px-3 text-xs font-semibold flex items-center gap-2 shadow-sm hover:shadow transition-shadow truncate cursor-pointer">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#0F766E] shrink-0"></span>
                      <span className="truncate">Release Notes Draft (Internal)</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Floating Action Button (FAB) */}
          <button className="absolute bottom-6 right-6 w-12 h-12 rounded-full bg-[#3F51B5] hover:bg-indigo-700 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95 z-20">
            <Plus size={24} />
          </button>
        </div>
        
      </div>

      {/* Bottom Row Statistics Cards */}
      <div className="grid grid-cols-3 gap-6 mt-2">
        
        {/* Card 1: Upcoming */}
        <div className="bg-[#FCF7ED] border border-[#F6E6CC] rounded-[32px] p-6 flex items-center gap-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-14 h-14 rounded-full bg-[#F5E6D3] text-[#A6783A] flex items-center justify-center shadow-inner">
            <Rocket size={24} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-[#A6783A] uppercase tracking-wider">{t('contentCalendar.upcoming')}</span>
            <h3 className="text-3xl font-extrabold text-[#5B3E14] mt-0.5">{t('contentCalendar.postsCountValue', { count: 24 })}</h3>
          </div>
        </div>

        {/* Card 2: Published */}
        <div className="bg-[#ECF8F4] border border-[#D1EDE3] rounded-[32px] p-6 flex items-center gap-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-14 h-14 rounded-full bg-[#D1EBE2] text-[#1E5C46] flex items-center justify-center shadow-inner">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-[#1E5C46] uppercase tracking-wider">{t('contentCalendar.published')}</span>
            <h3 className="text-3xl font-extrabold text-[#0E3A2A] mt-0.5">{t('contentCalendar.postsCountValue', { count: 12 })} {t('contentCalendar.thisWk')}</h3>
          </div>
        </div>

        {/* Card 3: Needs Approval */}
        <div className="bg-[#FFF1F2] border border-[#FFE4E6] rounded-[32px] p-6 flex items-center gap-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-14 h-14 rounded-full bg-[#FDE2E4] text-[#BE123C] flex items-center justify-center shadow-inner">
            <AlertTriangle size={24} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-[#BE123C] uppercase tracking-wider">{t('contentCalendar.needsApproval')}</span>
            <h3 className="text-3xl font-extrabold text-[#700D28] mt-0.5">{t('contentCalendar.draftsCount', { count: 3 })}</h3>
          </div>
        </div>

      </div>

    </div>
  );
}

