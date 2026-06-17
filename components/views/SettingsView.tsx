"use client";

import React, { useState } from 'react';
import { 
  Settings, 
  Bell, 
  MessageSquare, 
  Image as ImageIcon,
  Globe,
  FileText,
  GitBranch
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

// API Plug / Connection icon custom SVG to match mockup
const PlugIcon = ({ size = 20 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
  </svg>
);

export default function SettingsView() {
  const { language, setLanguage, t } = useLanguage();

  // State for interactive inputs
  const [openaiConnected, setOpenaiConnected] = useState(true);
  const [midjourneyConnected, setMidjourneyConnected] = useState(false);
  const [aiGenNotify, setAiGenNotify] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);


  return (
    <div className="flex flex-col gap-6">
      
      {/* Title Header */}
      <div className="mt-2">
        <h1 className="text-4xl font-bold text-text mb-1 tracking-tight">{t('settings.title')}</h1>
        <p className="text-text-muted">{t('settings.subtitle')}</p>
      </div>

      {/* Two Column Grid */}
      <div className="grid grid-cols-12 gap-6 items-stretch">
        
        {/* Left Column: API Integrations (Dark Green Card) */}
        <div className="col-span-7 bg-[#4E7164] border border-[#3E5C50] rounded-[32px] p-8 flex flex-col gap-6 text-white justify-between">
          
          <div>
            {/* Header */}
            <div className="flex items-center gap-3 font-bold text-lg text-white">
              <PlugIcon size={20} />
              <h2>{t('settings.apiIntegrations')}</h2>
            </div>
            
            {/* Subtitle */}
            <p className="text-xs font-medium text-white/80 mt-2">
              {t('settings.apiSubtitle')}
            </p>
            
            {/* Integration connections list */}
            <div className="flex flex-col gap-4 mt-6">
              
              {/* OpenAI GPT-4 connection */}
              <div className="bg-white rounded-2xl p-4 flex items-center justify-between text-text shadow-sm border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#EDE9FE] text-[#6366F1] flex items-center justify-center shrink-0">
                    <MessageSquare size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold">OpenAI GPT-4</h4>
                    <span className="text-[10px] text-emerald-600 font-semibold block mt-[2px]">{t('settings.connected')}</span>
                  </div>
                </div>
                <button 
                  onClick={() => setOpenaiConnected(!openaiConnected)}
                  className="text-xs font-bold text-red-500 hover:text-red-700 transition-colors px-3 py-1 cursor-pointer select-none"
                >
                  {openaiConnected ? t('settings.disconnect') : t('settings.connect')}
                </button>
              </div>

              {/* Midjourney connection */}
              <div className="bg-white rounded-2xl p-4 flex items-center justify-between text-text shadow-sm border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 text-gray-400 flex items-center justify-center shrink-0">
                    <ImageIcon size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold">Midjourney API</h4>
                    <span className="text-[10px] text-text-muted font-semibold block mt-[2px]">
                      {midjourneyConnected ? t('settings.connected') : t('settings.notConnected')}
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => setMidjourneyConnected(!midjourneyConnected)}
                  className="text-xs font-bold text-[#3F51B5] hover:text-indigo-800 transition-colors px-3 py-1 cursor-pointer select-none"
                >
                  {midjourneyConnected ? t('settings.disconnect') : t('settings.connect')}
                </button>
              </div>

            </div>
          </div>

        </div>

        {/* Right Column: Notifications & Language (Light Lavender Card) */}
        <div className="col-span-5 bg-[#F3F4FD] border border-[#E4E6F8] rounded-[32px] p-8 flex flex-col gap-6 text-[#1E293B]">
          
          {/* Header Notifications */}
          <div className="flex items-center gap-3 font-bold text-lg text-[#3F51B5]">
            <Bell size={20} />
            <h2>{t('settings.notifications')}</h2>
          </div>

          {/* Configuration List */}
          <div className="flex flex-col gap-5 mt-1">
            
            {/* Config Item 1 */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-bold">{t('settings.aiNotifyTitle')}</span>
                <span className="text-[10px] text-text-muted font-semibold leading-relaxed">
                  {t('settings.aiNotifyDesc')}
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none shrink-0 mt-1">
                <input 
                  type="checkbox" 
                  checked={aiGenNotify}
                  onChange={() => setAiGenNotify(!aiGenNotify)}
                  className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-0 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#3F51B5]"></div>
              </label>
            </div>

            {/* Config Item 2 */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-bold">{t('settings.weeklyDigestTitle')}</span>
                <span className="text-[10px] text-text-muted font-semibold leading-relaxed">
                  {t('settings.weeklyDigestDesc')}
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none shrink-0 mt-1">
                <input 
                  type="checkbox" 
                  checked={weeklyDigest}
                  onChange={() => setWeeklyDigest(!weeklyDigest)}
                  className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-0 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#3F51B5]"></div>
              </label>
            </div>

            {/* Language Setting Block */}
            <div className="border-t border-[#E4E6F8] pt-5 flex items-center justify-between gap-4">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-bold text-[#1E293B] flex items-center gap-1.5">
                  <Globe size={16} className="text-[#3F51B5]" />
                  {t('settings.languageTitle')}
                </span>
                <span className="text-[10px] text-text-muted font-semibold leading-relaxed">
                  {t('settings.languageDesc')}
                </span>
              </div>
              <div className="flex bg-white rounded-xl p-1 border border-[#E4E6F8] shadow-sm shrink-0">
                <button 
                  onClick={() => setLanguage('vi')}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                    language === 'vi' 
                      ? 'bg-[#3F51B5] text-white shadow-md' 
                      : 'text-text-muted hover:text-[#1E293B] hover:bg-gray-50'
                  }`}
                >
                  <span>🇻🇳</span>
                  <span>{t('settings.langVi')}</span>
                </button>
                <button 
                  onClick={() => setLanguage('en')}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                    language === 'en' 
                      ? 'bg-[#3F51B5] text-white shadow-md' 
                      : 'text-text-muted hover:text-[#1E293B] hover:bg-gray-50'
                  }`}
                >
                  <span>🇺🇸</span>
                  <span>{t('settings.langEn')}</span>
                </button>
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}

