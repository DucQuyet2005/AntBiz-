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
  Type, 
  Loader2,
  Facebook,
  Instagram
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

const ThreadsIcon = ({ size = 20 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
    <path d="M22.5 12c0-5.799-4.701-10.5-10.5-10.5S1.5 6.201 1.5 12s4.701 10.5 10.5 10.5c2.328 0 4.475-.758 6.216-2.038l-1.39-1.39C15.42 19.98 13.784 20.5 12 20.5c-4.694 0-8.5-3.806-8.5-8.5s3.806-8.5 8.5-8.5 8.5 3.806 8.5 8.5c0 1.956-.503 3.659-1.42 4.8-.813 1.011-1.923 1.5-3.08 1.5-1.144 0-1.848-.553-2.128-1.123-.391-.798-.328-2.109-.328-3.177v-2.5c0-.828-.672-1.5-1.5-1.5s-1.5.672-1.5 1.5v2.5c0 .356-.002.83-.027 1.309a4 4 0 1 1-3.953-3.809c.28 0 .546.035.803.097V8.539c-.26-.025-.525-.039-.79-.039a7 7 0 1 0 5.679 11.096c.71.91 1.776 1.404 3.018 1.404 2.217 0 4.156-1.134 5.347-2.923 1.15-1.729 1.693-3.992 1.693-6.077zM9.5 12a1 1 0 1 0 2 0 1 1 0 0 0-2 0z" />
  </svg>
);

export default function SettingsView() {
  const { language, setLanguage, t } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { font, setFont } = useFont();

  // State for interactive inputs
  const [openaiConnected, setOpenaiConnected] = useState(true);
  const [openaiLoading, setOpenaiLoading] = useState(false);
  const [midjourneyConnected, setMidjourneyConnected] = useState(false);
  const [midjourneyLoading, setMidjourneyLoading] = useState(false);
  const [aiGenNotify, setAiGenNotify] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);

  const handleToggleOpenai = () => {
    setOpenaiLoading(true);
    setTimeout(() => {
      setOpenaiConnected(prev => !prev);
      setOpenaiLoading(false);
    }, 600);
  };

  const handleToggleMidjourney = () => {
    setMidjourneyLoading(true);
    setTimeout(() => {
      setMidjourneyConnected(prev => !prev);
      setMidjourneyLoading(false);
    }, 600);
  };

  const [userId, setUserId] = useState<string | null>(null);
  const [socialAccounts, setSocialAccounts] = useState<any[]>([]);
  const [socialLoading, setSocialLoading] = useState(false);
  const supabase = createClient();

  const loadSocialAccounts = async () => {
    try {
      const res = await fetch('/api/linked-accounts');
      if (res.ok) {
        const json = await res.json();
        setSocialAccounts(json.data || []);
      }
    } catch (err) {
      console.error('Error fetching linked social accounts:', err);
    }
  };

  const handleConnectSocial = (platform: string) => {
    window.location.href = `/api/auth/${platform}`;
  };

  const handleDisconnectSocial = async (platform: string) => {
    const platformLabel = platform === 'thread' ? 'Threads' : platform === 'facebook' ? 'Facebook' : 'Instagram';
    if (!window.confirm(`Bạn có chắc chắn muốn hủy liên kết tài khoản ${platformLabel}?`)) {
      return;
    }
    setSocialLoading(true);
    try {
      const res = await fetch(`/api/linked-accounts?platform=${platform}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await loadSocialAccounts();
      }
    } catch (err) {
      console.error('Error disconnecting social account:', err);
    } finally {
      setSocialLoading(false);
    }
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
    loadSocialAccounts();
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
            title: t('settings.notifyThemeChangedTitle'),
            message: t('settings.notifyThemeChangedMsg').replace('{color}', colorLabel),
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
        
        {/* Left Column: API Integrations (Theme-Aware Color Card) */}
        <div className="col-span-12 lg:col-span-7 bg-primary dark:bg-card/40 border border-primary/20 dark:border-white/5 rounded-2xl p-8 flex flex-col gap-6 text-white dark:text-text justify-between">
          
          <div>
            {/* Header */}
            <div className="flex items-center gap-3 font-bold text-lg text-white dark:text-text">
              <PlugIcon size={20} />
              <h2>{t('settings.apiIntegrations')}</h2>
            </div>
            
            {/* Subtitle */}
            <p className="text-xs font-medium text-white/90 dark:text-text-muted mt-2">
              {t('settings.apiSubtitle')}
            </p>
            
            {/* Integration connections list */}
            <div className="flex flex-col gap-4 mt-6">
                  {/* OpenAI GPT-4 connection */}
              <div className="bg-card dark:bg-black/60 rounded-2xl p-4 flex items-center justify-between text-text shadow-sm border border-gray-100 dark:border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#EDE9FE] dark:bg-indigo-950/40 text-[#6366F1] dark:text-indigo-400 flex items-center justify-center shrink-0">
                    <MessageSquare size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold">OpenAI GPT-4</h3>
                    <span className="text-[10px] font-bold block mt-[2px]">
                      {openaiLoading ? (
                        <span className="text-slate-400 dark:text-slate-300 flex items-center gap-1">
                          <Loader2 size={10} className="animate-spin" />
                          {t('common.updating')}
                        </span>
                      ) : openaiConnected ? (
                        <span className="text-emerald-600 dark:text-emerald-400">{t('settings.connected')}</span>
                      ) : (
                        <span className="text-text-muted">{t('common.notConnected')}</span>
                      )}
                    </span>
                  </div>
                </div>
                <button 
                  onClick={handleToggleOpenai}
                  disabled={openaiLoading}
                  className={`text-xs font-bold transition-all px-3.5 py-1.5 cursor-pointer select-none rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 flex items-center gap-1.5 ${
                    openaiConnected 
                      ? 'border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 bg-red-50/50 dark:bg-red-950/20 hover:bg-red-100/50 dark:hover:bg-red-900/30 focus-visible:ring-red-500' 
                      : 'bg-primary text-white hover:opacity-90 shadow-sm shadow-primary/10 focus-visible:ring-primary'
                  }`}
                >
                  {openaiLoading && <Loader2 size={11} className="animate-spin" />}
                  {openaiConnected ? t('settings.disconnect') : t('settings.connect')}
                </button>
              </div>

              {/* Midjourney connection */}
              <div className="bg-card dark:bg-black/60 rounded-2xl p-4 flex items-center justify-between text-text shadow-sm border border-gray-100 dark:border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-black text-gray-400 dark:text-slate-400 flex items-center justify-center shrink-0 border dark:border-white/5">
                    <ImageIcon size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold">Midjourney API</h3>
                    <span className="text-[10px] font-bold block mt-[2px]">
                      {midjourneyLoading ? (
                        <span className="text-slate-400 dark:text-slate-300 flex items-center gap-1">
                          <Loader2 size={10} className="animate-spin" />
                          {t('common.updating')}
                        </span>
                      ) : midjourneyConnected ? (
                        <span className="text-emerald-600 dark:text-emerald-400">{t('settings.connected')}</span>
                      ) : (
                        <span className="text-text-muted">{t('common.notConnected')}</span>
                      )}
                    </span>
                  </div>
                </div>
                <button 
                  onClick={handleToggleMidjourney}
                  disabled={midjourneyLoading}
                  className={`text-xs font-bold transition-all px-3.5 py-1.5 cursor-pointer select-none rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 flex items-center gap-1.5 ${
                    midjourneyConnected 
                      ? 'border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 bg-red-50/50 dark:bg-red-950/20 hover:bg-red-100/50 dark:hover:bg-red-900/30 focus-visible:ring-red-500' 
                      : 'bg-primary text-white hover:opacity-90 shadow-sm shadow-primary/10 focus-visible:ring-primary'
                  }`}
                >
                  {midjourneyLoading && <Loader2 size={11} className="animate-spin" />}
                  {midjourneyConnected ? t('settings.disconnect') : t('settings.connect')}
                </button>
              </div>

              {/* Facebook Connection */}
              {(() => {
                const conn = socialAccounts.find(a => a.platform === 'facebook');
                return (
                  <div className="bg-card dark:bg-black/60 rounded-2xl p-4 flex items-center justify-between text-text shadow-sm border border-gray-100 dark:border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                        <Facebook size={20} className="fill-current" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold">Facebook Page</h3>
                        <span className="text-[10px] font-bold block mt-[2px]">
                          {socialLoading ? (
                            <span className="text-slate-400 dark:text-slate-300 flex items-center gap-1">
                              <Loader2 size={10} className="animate-spin" />
                              {t('common.updating')}
                            </span>
                          ) : conn ? (
                            <span className="text-emerald-650 dark:text-emerald-400 font-extrabold text-[10px]">
                              {t('settings.connected')}: {conn.account_name}
                            </span>
                          ) : (
                            <span className="text-text-muted">{t('common.notConnected')}</span>
                          )}
                        </span>
                      </div>
                    </div>
                    <button 
                      onClick={() => conn ? handleDisconnectSocial('facebook') : handleConnectSocial('facebook')}
                      disabled={socialLoading}
                      className={`text-xs font-bold transition-all px-3.5 py-1.5 cursor-pointer select-none rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 flex items-center gap-1.5 ${
                        conn 
                          ? 'border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 bg-red-50/50 dark:bg-red-950/20 hover:bg-red-100/50 dark:hover:bg-red-900/30 focus-visible:ring-red-500' 
                          : 'bg-primary text-white hover:opacity-90 shadow-sm shadow-primary/10 focus-visible:ring-primary'
                      }`}
                    >
                      {socialLoading && <Loader2 size={11} className="animate-spin" />}
                      {conn ? t('settings.disconnect') : t('settings.connect')}
                    </button>
                  </div>
                );
              })()}

              {/* Threads Connection */}
              {(() => {
                const conn = socialAccounts.find(a => a.platform === 'thread');
                return (
                  <div className="bg-card dark:bg-black/60 rounded-2xl p-4 flex items-center justify-between text-text shadow-sm border border-gray-100 dark:border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-zinc-800 text-black dark:text-white flex items-center justify-center shrink-0 border dark:border-white/5">
                        <ThreadsIcon size={20} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold">Meta Threads</h3>
                        <span className="text-[10px] font-bold block mt-[2px]">
                          {socialLoading ? (
                            <span className="text-slate-400 dark:text-slate-300 flex items-center gap-1">
                              <Loader2 size={10} className="animate-spin" />
                              {t('common.updating')}
                            </span>
                          ) : conn ? (
                            <span className="text-emerald-650 dark:text-emerald-400 font-extrabold text-[10px]">
                              {t('settings.connected')}: @{conn.account_name}
                            </span>
                          ) : (
                            <span className="text-text-muted">{t('common.notConnected')}</span>
                          )}
                        </span>
                      </div>
                    </div>
                    <button 
                      onClick={() => conn ? handleDisconnectSocial('thread') : handleConnectSocial('threads')}
                      disabled={socialLoading}
                      className={`text-xs font-bold transition-all px-3.5 py-1.5 cursor-pointer select-none rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 flex items-center gap-1.5 ${
                        conn 
                          ? 'border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 bg-red-50/50 dark:bg-red-950/20 hover:bg-red-100/50 dark:hover:bg-red-900/30 focus-visible:ring-red-500' 
                          : 'bg-primary text-white hover:opacity-90 shadow-sm shadow-primary/10 focus-visible:ring-primary'
                      }`}
                    >
                      {socialLoading && <Loader2 size={11} className="animate-spin" />}
                      {conn ? t('settings.disconnect') : t('settings.connect')}
                    </button>
                  </div>
                );
              })()}

              {/* Instagram Connection */}
              {(() => {
                const conn = socialAccounts.find(a => a.platform === 'instagram');
                return (
                  <div className="bg-card dark:bg-black/60 rounded-2xl p-4 flex items-center justify-between text-text shadow-sm border border-gray-100 dark:border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-pink-50 dark:bg-pink-950/40 text-pink-600 dark:text-pink-400 flex items-center justify-center shrink-0">
                        <Instagram size={20} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold">Instagram Business</h3>
                        <span className="text-[10px] font-bold block mt-[2px]">
                          {socialLoading ? (
                            <span className="text-slate-400 dark:text-slate-300 flex items-center gap-1">
                              <Loader2 size={10} className="animate-spin" />
                              {t('common.updating')}
                            </span>
                          ) : conn ? (
                            <span className="text-emerald-655 dark:text-emerald-400 font-extrabold text-[10px] line-clamp-1 max-w-[200px]">
                              {t('settings.connected')}: {conn.account_name}
                            </span>
                          ) : (
                            <span className="text-text-muted">{t('common.notConnected')}</span>
                          )}
                        </span>
                      </div>
                    </div>
                    <button 
                      onClick={() => conn ? handleDisconnectSocial('instagram') : handleConnectSocial('instagram')}
                      disabled={socialLoading}
                      className={`text-xs font-bold transition-all px-3.5 py-1.5 cursor-pointer select-none rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 flex items-center gap-1.5 ${
                        conn 
                          ? 'border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 bg-red-50/50 dark:bg-red-950/20 hover:bg-red-100/50 dark:hover:bg-red-900/30 focus-visible:ring-red-500' 
                          : 'bg-primary text-white hover:opacity-90 shadow-sm shadow-primary/10 focus-visible:ring-primary'
                      }`}
                    >
                      {socialLoading && <Loader2 size={11} className="animate-spin" />}
                      {conn ? t('settings.disconnect') : t('settings.connect')}
                    </button>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Right Column: Notifications & Language (Theme-Adapted Lavender/Sidebar Card) */}
        <div className="col-span-12 lg:col-span-5 bg-sidebar/50 dark:bg-black/40 border border-primary/10 dark:border-white/5 rounded-2xl p-8 flex flex-col gap-6 text-text">
          
          {/* Header Notifications */}
          <div className="flex items-center gap-3 font-bold text-lg text-primary">
            <Bell size={20} />
            <h2>{t('settings.apiIntegrations')}</h2>
          </div>

          {/* Configuration List */}
          <div className="flex flex-col gap-5 mt-1">
            
            {/* Config Item 1 */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-0.5" id="ai-notify-label">
                <span className="text-sm font-bold">{t('settings.aiNotifyTitle')}</span>
                <span id="ai-notify-desc" className="text-[10px] text-text-muted font-semibold leading-relaxed">
                  {t('settings.aiNotifyDesc')}
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none shrink-0 mt-1">
                <input 
                  type="checkbox" 
                  checked={aiGenNotify}
                  onChange={() => setAiGenNotify(!aiGenNotify)}
                  aria-labelledby="ai-notify-label"
                  aria-describedby="ai-notify-desc"
                  className="sr-only peer" 
                />
                <div className={`w-11 h-6 rounded-full peer peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all transition-all ${
                  aiGenNotify ? 'bg-primary' : 'bg-gray-200 dark:bg-black border dark:border-white/5'
                }`}></div>
              </label>
            </div>

            {/* Config Item 2 */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-0.5" id="weekly-digest-label">
                <span className="text-sm font-bold">{t('settings.weeklyDigestTitle')}</span>
                <span id="weekly-digest-desc" className="text-[10px] text-text-muted font-semibold leading-relaxed">
                  {t('settings.weeklyDigestDesc')}
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none shrink-0 mt-1">
                <input 
                  type="checkbox" 
                  checked={weeklyDigest}
                  onChange={() => setWeeklyDigest(!weeklyDigest)}
                  aria-labelledby="weekly-digest-label"
                  aria-describedby="weekly-digest-desc"
                  className="sr-only peer" 
                />
                <div className={`w-11 h-6 rounded-full peer peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all transition-all ${
                  weeklyDigest ? 'bg-primary' : 'bg-gray-200 dark:bg-black border dark:border-white/5'
                }`}></div>
              </label>
            </div>

            {/* Language Setting Block */}
            <div className="border-t border-primary/10 pt-5 flex items-center justify-between gap-4">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-bold text-text flex items-center gap-1.5">
                  <Globe size={16} className="text-primary" />
                  {t('settings.languageTitle')}
                </span>
                <span className="text-[10px] text-text-muted font-semibold leading-relaxed">
                  {t('settings.languageDesc')}
                </span>
              </div>
              <div className="flex bg-white rounded-xl p-1 border border-primary/10 shadow-sm shrink-0">
                <button 
                  onClick={() => setLanguage('vi')}
                  className={`text-xs font-bold px-4 py-2.5 rounded-lg flex items-center gap-1.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${
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
                  className={`text-xs font-bold px-4 py-2.5 rounded-lg flex items-center gap-1.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${
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
            <div className="border-t border-primary/10 pt-5 flex flex-col gap-4">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-bold text-text flex items-center gap-1.5">
                  <Sliders size={16} className="text-primary" />
                  {t('settings.themeColor')}
                </span>
                <span className="text-[10px] text-text-muted font-semibold leading-relaxed">
                  {t('settings.themeDesc')}
                </span>
              </div>

              {/* Solids Group */}
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  {t('settings.solidColors')}
                </span>
                <div className="flex flex-wrap gap-3">
                  {[
                    { id: 'solid-red', color: '#EF4444', labelKey: 'settings.colorRed' },
                    { id: 'solid-orange', color: '#F97316', labelKey: 'settings.colorOrange' },
                    { id: 'solid-yellow', color: '#F59E0B', labelKey: 'settings.colorYellow' },
                    { id: 'solid-green', color: '#10B981', labelKey: 'settings.colorGreen' },
                    { id: 'solid-blue', color: '#5A5CDE', labelKey: 'settings.colorBlue' },
                    { id: 'solid-indigo', color: '#6366F1', labelKey: 'settings.colorIndigo' },
                    { id: 'solid-purple', color: '#A855F7', labelKey: 'settings.colorPurple' },
                  ].map((s) => {
                    const isSelected = theme === s.id;
                    const labelStr = t(s.labelKey as any);
                    return (
                      <button
                        key={s.id}
                        onClick={() => handleThemeChange(s.id as Theme, labelStr)}
                        title={labelStr}
                        aria-label={labelStr}
                        className={`w-10 h-10 rounded-full border transition-all active:scale-90 cursor-pointer flex items-center justify-center shadow-sm relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-800 dark:focus-visible:ring-white focus-visible:ring-offset-2 ${
                          isSelected 
                            ? 'border-slate-800 dark:border-white scale-110 ring-2 ring-primary/30' 
                            : 'border-white dark:border-transparent hover:border-slate-300 dark:hover:border-slate-600'
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
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  {t('settings.gradientColors')}
                </span>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { id: 'gradient-black-red', gradient: 'linear-gradient(135deg, #1A1A1A 0%, #EF4444 100%)', labelKey: 'settings.colorBlackRed' },
                    { id: 'gradient-yellow-black', gradient: 'linear-gradient(135deg, #F59E0B 0%, #1A1A1A 100%)', labelKey: 'settings.colorYellowBlack' },
                    { id: 'gradient-black-white', gradient: 'linear-gradient(135deg, #111827 0%, #E5E7EB 100%)', labelKey: 'settings.colorBlackWhite' },
                  ].map((g) => {
                    const isSelected = theme === g.id;
                    const labelStr = t(g.labelKey as any);
                    return (
                      <button
                        key={g.id}
                        onClick={() => handleThemeChange(g.id as Theme, labelStr)}
                        aria-label={labelStr}
                        className={`px-3 py-2 rounded-xl border text-white font-extrabold text-[10px] transition-all active:scale-95 cursor-pointer shadow-sm relative flex items-center justify-center gap-1 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-800 dark:focus-visible:ring-white focus-visible:ring-offset-2 ${
                          isSelected 
                            ? 'border-slate-800 dark:border-white scale-[1.02] ring-2 ring-primary/30' 
                            : 'border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
                        }`}
                        style={{ background: g.gradient }}
                      >
                        <span className="drop-shadow truncate">{labelStr}</span>
                        {isSelected && <Check size={12} className="text-white drop-shadow stroke-[3.5] shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* RGB Rainbow Group */}
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  {t('settings.rgbEffects')}
                </span>
                <button
                  onClick={() => handleThemeChange('rgb', t('settings.colorRainbow'))}
                  aria-label={t('settings.colorRainbow')}
                  className={`relative overflow-hidden w-full h-11 rounded-xl border text-white font-extrabold text-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-800 dark:focus-visible:ring-white focus-visible:ring-offset-2 ${
                    theme === 'rgb' ? 'border-slate-800 dark:border-white scale-[1.01] ring-2 ring-primary/30' : 'border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
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
                      {t('settings.rgbContinuous')}
                    </span>
                    {theme === 'rgb' && <Check size={13} className="text-white drop-shadow stroke-[3.5]" />}
                  </div>
                </button>
              </div>
            </div>
 
            {/* Font Customizer Setting Block */}
            <div className="border-t border-primary/10 pt-5 flex flex-col gap-3">
              <div className="flex items-center gap-1.5">
                <Type size={14} className="text-primary shrink-0" />
                <span className="text-sm font-bold text-text">
                  {t('settings.typeface')}
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
                      className={`relative text-left rounded-xl border px-3 py-2.5 transition-all active:scale-[0.98] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${
                        isActive
                          ? 'border-primary bg-primary/5 shadow-sm shadow-primary/10'
                          : 'border-primary/10 bg-white hover:border-primary/30 hover:bg-primary/[0.02]'
                      }`}
                    >
                      {isActive && (
                        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-primary" />
                      )}
                      <p
                        className="text-[13px] font-semibold text-text leading-tight truncate"
                        style={{ fontFamily: f.family }}
                      >
                        {f.name}
                      </p>
                      <span className="mt-1 inline-block text-[9px] font-bold text-slate-500 uppercase tracking-wide leading-none">
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
                  <div 
                    className="bg-black rounded-xl px-3 py-2.5"
                    style={{ border: '1.5px solid var(--color-primary)' }}
                  >
                    <p
                      className="text-sm font-medium text-white leading-snug"
                      style={{ fontFamily: activeFont.family }}
                    >
                      {t('settings.welcomeText')}
                    </p>
                    <p className="mt-1 text-[10px] text-zinc-400 leading-normal">
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
  );
}
