"use client";

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

const ChartPlaceholder = () => {
  const { t } = useLanguage();

  return (
    <div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100">
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
      <div className="h-[200px] w-full mt-4 flex items-end justify-between px-4 pb-6">
        {/* Simplified representation of the chart without an actual charting library */}
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => (
          <div key={day} className="flex flex-col items-center gap-4 w-full h-full justify-end relative">
             <div className="text-xs text-text-muted font-medium">{t(`overview.days.${day}`)}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChartPlaceholder;

