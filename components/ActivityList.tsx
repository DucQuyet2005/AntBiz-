"use client";

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

const ActivityList = () => {
  const { t } = useLanguage();

  return (
    <div className="mt-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-text">{t('overview.recentActivity')}</h2>
        <button className="text-primary text-sm font-medium hover:underline">{t('overview.viewAll')}</button>
      </div>
      
      <div className="grid grid-cols-4 gap-6">
        <div className="bg-white rounded-3xl overflow-hidden aspect-square shadow-sm relative group cursor-pointer border border-gray-100">
           {/* Placeholder for actual image */}
           <div className="w-full h-full bg-gray-200">
             <img src="https://images.unsplash.com/photo-1542626991-cbc4e32524cc?q=80&w=400&auto=format&fit=crop" alt="Workspace" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
           </div>
        </div>
        
        <div className="bg-white rounded-3xl overflow-hidden aspect-square shadow-sm relative group cursor-pointer border border-gray-100">
           <div className="w-full h-full bg-gray-200">
             <img src="https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=400&auto=format&fit=crop" alt="Mobile App" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
           </div>
        </div>
        
        <div className="bg-[#DFE1FA] rounded-3xl overflow-hidden aspect-square shadow-sm relative group cursor-pointer border border-gray-100 flex items-center justify-center p-6">
           <div className="flex flex-wrap gap-2 justify-center items-center opacity-80 group-hover:opacity-100 transition-opacity">
              <div className="w-6 h-6 rounded-full bg-mint"></div>
              <div className="w-8 h-8 bg-peach rounded-md"></div>
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center"><div className="w-6 h-6 rounded-full bg-primary"></div></div>
              <div className="w-6 h-6 bg-white rotate-45"></div>
           </div>
        </div>

        <div className="bg-[#DFE1FA]/50 rounded-3xl aspect-square border-2 border-dashed border-primary/30 flex flex-col items-center justify-center text-primary/60 hover:text-primary hover:border-primary/60 transition-colors cursor-pointer group">
          <div className="w-10 h-10 rounded-full border border-current flex items-center justify-center mb-2 group-hover:bg-primary group-hover:text-white transition-all">
            <span className="text-xl leading-none">+</span>
          </div>
          <span className="font-medium text-sm">{t('overview.newPost')}</span>
        </div>
      </div>
    </div>
  );
};

export default ActivityList;

