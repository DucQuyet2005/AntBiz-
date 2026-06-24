"use client";

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

const ChartPlaceholder = () => {
  const { t } = useLanguage();

  return (
    <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h2 className="text-xl font-bold text-text mb-1">{t('overview.performanceOverview')}</h2>
          <p className="text-sm font-medium text-primary">{t('overview.performanceSubtitle')}</p>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary"></span>
            <span className="text-xs text-text-muted font-medium">{t('overview.indigo')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-peach"></span>
            <span className="text-xs text-text-muted font-medium">{t('overview.peach')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-mint"></span>
            <span className="text-xs text-text-muted font-medium">{t('overview.mint')}</span>
          </div>
        </div>
      </div>
      
      {/* Chart Area */}
      <div className="h-[200px] w-full mt-4 flex items-end justify-between px-2 pb-2 gap-2 sm:gap-4 border-b border-slate-100">
        {[
          { day: 'Mon', indigo: 'h-[65%]', peach: 'h-[45%]', mint: 'h-[30%]' },
          { day: 'Tue', indigo: 'h-[80%]', peach: 'h-[55%]', mint: 'h-[40%]' },
          { day: 'Wed', indigo: 'h-[45%]', peach: 'h-[75%]', mint: 'h-[50%]' },
          { day: 'Thu', indigo: 'h-[90%]', peach: 'h-[40%]', mint: 'h-[65%]' },
          { day: 'Fri', indigo: 'h-[60%]', peach: 'h-[85%]', mint: 'h-[75%]' },
          { day: 'Sat', indigo: 'h-[70%]', peach: 'h-[60%]', mint: 'h-[50%]' },
          { day: 'Sun', indigo: 'h-[85%]', peach: 'h-[70%]', mint: 'h-[60%]' },
        ].map((item, i) => (
          <div key={item.day} className="flex flex-col items-center gap-3 w-full h-full justify-end relative group">
             {/* Column Bars */}
             <div className="flex items-end gap-1 sm:gap-1.5 w-full justify-center h-[140px] px-0.5">
               <div className={`w-1 sm:w-2 bg-primary rounded-t-full ${item.indigo} transition-all duration-300 group-hover:opacity-90 hover:scale-y-105 origin-bottom`} />
               <div className={`w-1 sm:w-2 bg-peach rounded-t-full ${item.peach} transition-all duration-300 group-hover:opacity-90 hover:scale-y-105 origin-bottom`} />
               <div className={`w-1 sm:w-2 bg-mint rounded-t-full ${item.mint} transition-all duration-300 group-hover:opacity-90 hover:scale-y-105 origin-bottom`} />
             </div>
             {/* Day Label */}
             <div className="text-[10px] sm:text-xs text-text-muted font-semibold select-none">
               {t(`overview.days.${item.day}`)}
             </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChartPlaceholder;

