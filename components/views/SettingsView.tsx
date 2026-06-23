"use client";

import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Bell, 
  MessageSquare, 
  Image as ImageIcon,
  Globe,
  FileText,
  GitBranch,
  Check,
  Sliders,
  Sparkles,
  Type
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme, Theme } from '@/contexts/ThemeContext';
import { createClient } from '@/utils/supabase/client';
import { useFont, fonts } from '@/contexts/FontContext';

// API Plug / Connection icon custom SVG to match mockup
const PlugIcon = ({ size = 20 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
  </svg>
);

export default function SettingsView() {
  const { language, setLanguage, t } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { font, setFont } = useFont();

  // State for interactive inputs
  const [openaiConnected, setOpenaiConnected] = useState(true);
  const [midjourneyConnected, setMidjourneyConnected] = useState(false);
  const [aiGenNotify, setAiGenNotify] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);

  const [userId, setUserId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  const handleThemeChange = async (newTheme: Theme, colorLabel: string) => {
    setTheme(newTheme);
    if (userId) {
      try {
        await fetch('/api/notifications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId,
            type: 'info',
            title: 'Thay đổi màu giao diện',
            message: `Bạn đã thay đổi màu sắc giao diện hệ thống thành tông màu: ${colorLabel}.`,
          }),
        });
      } catch (err) {
        console.error('Lỗi khi gửi thông báo đổi màu giao diện:', err);
      }
    }
  };


  return (
    <div className="flex flex-col gap-6">
      
      {/* Title Header */}
      <div className="mt-2">
        <h1 className="text-4xl font-bold text-text mb-1 tracking-tight">{t('settings.title')}</h1>
        <p className="text-text-muted">{t('settings.subtitle')}</p>
      </div>

      {/* Two Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Left Column: API Integrations (Dark Green Card) */}
        <div className="col-span-12 lg:col-span-7 bg-[#4E7164] border border-[#3E5C50] rounded-[32px] p-8 flex flex-col gap-6 text-white justify-between">
          
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
                  className="text-xs font-bold text-primary hover:opacity-80 transition-colors px-3 py-1 cursor-pointer select-none"
                >
                  {midjourneyConnected ? t('settings.disconnect') : t('settings.connect')}
                </button>
              </div>

            </div>
          </div>

        </div>

        {/* Right Column: Notifications & Language (Light Lavender Card) */}
        <div className="col-span-12 lg:col-span-5 bg-[#F3F4FD] border border-[#E4E6F8] rounded-[32px] p-8 flex flex-col gap-6 text-[#1E293B]">
          
          {/* Header Notifications */}
          <div className="flex items-center gap-3 font-bold text-lg text-primary">
            <Bell size={20} />
            <h2>{t('settings.apiIntegrations')}</h2>
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
                <div className={`w-11 h-6 rounded-full peer peer-focus:ring-0 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all transition-all ${
                  aiGenNotify ? 'bg-primary' : 'bg-gray-200'
                }`}></div>
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
                <div className={`w-11 h-6 rounded-full peer peer-focus:ring-0 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all transition-all ${
                  weeklyDigest ? 'bg-primary' : 'bg-gray-200'
                }`}></div>
              </label>
            </div>

            {/* Language Setting Block */}
            <div className="border-t border-[#E4E6F8] pt-5 flex items-center justify-between gap-4">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-bold text-[#1E293B] flex items-center gap-1.5">
                  <Globe size={16} className="text-primary" />
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
                      ? 'bg-primary text-white shadow-md shadow-primary/20' 
                      : 'text-text-muted hover:text-primary hover:bg-primary/5'
                  }`}
                >
                  <span>🇻🇳</span>
                  <span>{t('settings.langVi')}</span>
                </button>
                <button 
                  onClick={() => setLanguage('en')}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                    language === 'en' 
                      ? 'bg-primary text-white shadow-md shadow-primary/20' 
                      : 'text-text-muted hover:text-primary hover:bg-primary/5'
                  }`}
                >
                  <span>🇺🇸</span>
                  <span>{t('settings.langEn')}</span>
                </button>
              </div>
            </div>

            {/* Theme Customizer Setting Block */}
            <div className="border-t border-[#E4E6F8] pt-5 flex flex-col gap-4">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-bold text-[#1E293B] flex items-center gap-1.5">
                  <Sliders size={16} className="text-primary" />
                  {language === 'vi' ? 'Màu sắc giao diện' : 'System Theme Color'}
                </span>
                <span className="text-[10px] text-text-muted font-semibold leading-relaxed">
                  {language === 'vi' 
                    ? 'Tùy chọn tông màu chủ đạo cho toàn bộ không gian làm việc của bạn.'
                    : 'Choose the main accent color for your entire workspace.'}
                </span>
              </div>

              {/* Solids Group */}
              <div className="flex flex-col gap-2">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  {language === 'vi' ? 'Màu đơn sắc' : 'Solid Colors'}
                </span>
                <div className="flex flex-wrap gap-2.5">
                  {[
                    { id: 'solid-red', color: '#EF4444', labelVi: 'Đỏ', labelEn: 'Red' },
                    { id: 'solid-orange', color: '#F97316', labelVi: 'Cam', labelEn: 'Orange' },
                    { id: 'solid-yellow', color: '#F59E0B', labelVi: 'Vàng', labelEn: 'Yellow' },
                    { id: 'solid-green', color: '#10B981', labelVi: 'Lục', labelEn: 'Green' },
                    { id: 'solid-blue', color: '#5A5CDE', labelVi: 'Lam', labelEn: 'Blue' },
                    { id: 'solid-indigo', color: '#6366F1', labelVi: 'Chàm', labelEn: 'Indigo' },
                    { id: 'solid-purple', color: '#A855F7', labelVi: 'Tím', labelEn: 'Purple' },
                  ].map((s) => {
                    const isSelected = theme === s.id;
                    return (
                      <button
                        key={s.id}
                        onClick={() => handleThemeChange(s.id as Theme, language === 'vi' ? s.labelVi : s.labelEn)}
                        title={language === 'vi' ? s.labelVi : s.labelEn}
                        className={`w-8 h-8 rounded-full border transition-all active:scale-90 cursor-pointer flex items-center justify-center shadow-sm relative ${
                          isSelected 
                            ? 'border-slate-800 scale-110 ring-2 ring-primary/30' 
                            : 'border-white hover:border-slate-300'
                        }`}
                        style={{ backgroundColor: s.color }}
                      >
                        {isSelected && <Check size={14} className="text-white drop-shadow stroke-[3.5]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Gradients Group */}
              <div className="flex flex-col gap-2">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  {language === 'vi' ? 'Màu Gradient' : 'Gradient Colors'}
                </span>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { id: 'gradient-black-red', gradient: 'linear-gradient(135deg, #1A1A1A 0%, #EF4444 100%)', labelVi: 'Đen đỏ', labelEn: 'Black-Red' },
                    { id: 'gradient-yellow-black', gradient: 'linear-gradient(135deg, #F59E0B 0%, #1A1A1A 100%)', labelVi: 'Vàng đen', labelEn: 'Yellow-Black' },
                    { id: 'gradient-black-white', gradient: 'linear-gradient(135deg, #111827 0%, #E5E7EB 100%)', labelVi: 'Đen trắng', labelEn: 'Black-White' },
                  ].map((g) => {
                    const isSelected = theme === g.id;
                    return (
                      <button
                        key={g.id}
                        onClick={() => handleThemeChange(g.id as Theme, language === 'vi' ? g.labelVi : g.labelEn)}
                        className={`px-3 py-2 rounded-xl border text-white font-extrabold text-[10px] transition-all active:scale-95 cursor-pointer shadow-sm relative flex items-center justify-center gap-1 min-h-[38px] ${
                          isSelected 
                            ? 'border-slate-800 scale-[1.02] ring-2 ring-primary/30' 
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                        style={{ background: g.gradient }}
                      >
                        <span className="drop-shadow truncate">{language === 'vi' ? g.labelVi : g.labelEn}</span>
                        {isSelected && <Check size={12} className="text-white drop-shadow stroke-[3.5] shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* RGB Rainbow Group */}
              <div className="flex flex-col gap-2">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  {language === 'vi' ? 'Hiệu ứng RGB' : 'RGB Effects'}
                </span>
                <button
                  onClick={() => handleThemeChange('rgb', language === 'vi' ? 'Cầu vồng 7 sắc' : 'RGB Rainbow')}
                  className={`relative overflow-hidden w-full h-10 rounded-xl border text-white font-extrabold text-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center shadow-sm ${
                    theme === 'rgb' ? 'border-slate-800 scale-[1.01] ring-2 ring-primary/30' : 'border-slate-200 hover:border-slate-300'
                  }`}
                  style={{
                    background: 'linear-gradient(90deg, #ff0000, #ff7700, #ffff00, #00ff00, #00ffff, #0000ff, #8a00ff, #ff0000)',
                    backgroundSize: '200% auto',
                    animation: 'rgb-rainbow 5s linear infinite'
                  }}
                >
                  <div className="absolute inset-0 bg-black/15 flex items-center justify-center gap-1.5 hover:bg-black/5 transition-colors">
                    <Sparkles size={13} className="text-white drop-shadow animate-pulse" />
                    <span className="text-white drop-shadow font-extrabold text-[11px] tracking-wide">
                      {language === 'vi' ? 'Cầu vồng 7 sắc chạy liên tục' : 'Continuous 7-Color Rainbow'}
                    </span>
                    {theme === 'rgb' && <Check size={13} className="text-white drop-shadow stroke-[3.5]" />}
                  </div>
                </button>
              </div>
 
              {/* Font Customizer Setting Block */}
              <div className="border-t border-[#E4E6F8] pt-5 flex flex-col gap-3">
                <div className="flex items-center gap-1.5">
                  <Type size={14} className="text-primary shrink-0" />
                  <span className="text-sm font-bold text-[#1E293B]">
                    {language === 'vi' ? 'Kiểu chữ hệ thống' : 'System Typeface'}
                  </span>
                </div>

                {/* Font Card Grid */}
                <div className="grid grid-cols-2 gap-2">
                  {fonts.map((f) => {
                    const isActive = font === f.id;
                    return (
                      <button
                        key={f.id}
                        onClick={() => setFont(f.id)}
                        className={`relative text-left rounded-xl border px-3 py-2.5 transition-all active:scale-[0.98] cursor-pointer ${
                          isActive
                            ? 'border-primary bg-primary/5 shadow-sm shadow-primary/10'
                            : 'border-[#E4E6F8] bg-white hover:border-primary/30 hover:bg-primary/[0.02]'
                        }`}
                      >
                        {isActive && (
                          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-primary" />
                        )}
                        <p
                          className="text-[13px] font-semibold text-[#1E293B] leading-tight truncate"
                          style={{ fontFamily: f.family }}
                        >
                          {f.name}
                        </p>
                        <span className="mt-1 inline-block text-[9px] font-bold text-slate-400 uppercase tracking-wide leading-none">
                          {f.tag}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Selected font description */}
                {(() => {
                  const activeFont = fonts.find(f => f.id === font);
                  if (!activeFont) return null;
                  return (
                    <div className="bg-white/70 border border-[#E4E6F8] rounded-xl px-3 py-2.5">
                      <p
                        className="text-sm font-medium text-[#1E293B] leading-snug"
                        style={{ fontFamily: activeFont.family }}
                      >
                        Aa — Chào mừng đến với AntBiz.
                      </p>
                      <p className="mt-1 text-[10px] text-text-muted leading-normal">
                        {language === 'vi' ? activeFont.descriptionVi : activeFont.descriptionEn}
                      </p>
                    </div>
                  );
                })()}
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}

