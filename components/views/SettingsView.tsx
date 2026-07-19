"use client";

import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Globe,
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
import { getSocialConnectionErrorMessage } from '@/lib/socialConnectionMessages';
import { useFont, fonts } from '@/contexts/FontContext';
import PopupDialog, { PopupType } from '@/components/PopupDialog';

// API Plug / Connection icon custom SVG to match mockup
const PlugIcon = ({ size = 20 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
  </svg>
);

const ThreadsIcon = ({ size = 20, className = "" }: { size?: number; className?: string; key?: any }) => (
  <svg viewBox="0 0 192 192" width={size} height={size} fill="currentColor" className={className}>
    <path d="M141.537 88.9883C140.71 88.5919 139.87 88.2104 139.019 87.8451C137.537 60.5382 122.616 44.905 97.5619 44.745C97.4484 44.7443 97.3355 44.7443 97.222 44.7443C82.2364 44.7443 69.7731 51.1409 62.102 62.7807L75.881 72.2328C81.6116 63.5383 90.6052 61.6848 97.2286 61.6848C97.3051 61.6848 97.3819 61.6848 97.4576 61.6855C105.707 61.7381 111.932 64.1366 115.961 68.814C118.893 72.2193 120.854 76.925 121.825 82.8638C114.511 81.6207 106.601 81.2385 98.145 81.7233C74.3247 83.0954 59.0111 96.9879 60.0396 116.292C60.5615 126.084 65.4397 134.508 73.775 140.011C80.8224 144.663 89.899 146.938 99.3323 146.423C111.79 145.74 121.563 140.987 128.381 132.296C133.559 125.696 136.834 117.143 138.28 106.366C144.217 109.949 148.617 114.664 151.047 120.332C155.179 129.967 155.42 145.8 142.501 158.708C131.182 170.016 117.576 174.908 97.0135 175.059C74.2042 174.89 56.9538 167.575 45.7381 153.317C35.2355 139.966 29.8077 120.682 29.6052 96C29.8077 71.3178 35.2355 52.0336 45.7381 38.6827C56.9538 24.4249 74.2039 17.11 97.0132 16.9405C119.988 17.1113 137.539 24.4614 149.184 38.788C154.894 45.8136 159.199 54.6488 162.037 64.9503L178.184 60.6422C174.744 47.9622 169.331 37.0357 161.965 27.974C147.036 9.60668 125.202 0.195148 97.0695 0H96.9569C68.8816 0.19447 47.2921 9.6418 32.7883 28.0793C19.8819 44.4864 13.2244 67.3157 13.0007 95.9325L13 96L13.0007 96.0675C13.2244 124.684 19.8819 147.514 32.7883 163.921C47.2921 182.358 68.8816 191.806 96.9569 192H97.0695C122.03 191.827 139.624 185.292 154.118 170.811C173.081 151.866 172.51 128.119 166.26 113.541C161.776 103.087 153.227 94.5962 141.537 88.9883ZM98.4405 129.507C88.0005 130.095 77.1544 125.409 76.6196 115.372C76.2232 107.93 81.9158 99.626 99.0812 98.6368C101.047 98.5234 102.976 98.468 104.871 98.468C111.106 98.468 116.939 99.0737 122.242 100.233C120.264 124.935 108.662 128.946 98.4405 129.507Z" />
  </svg>
);


export default function SettingsView() {
  const { language, setLanguage, t } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { font, setFont } = useFont();

  const [activeTab, setActiveTab] = useState<'general' | 'platform-presets'>('general');

  // State for interactive inputs
  const [openaiConnected, setOpenaiConnected] = useState(true);
  const [openaiLoading, setOpenaiLoading] = useState(false);
  const [midjourneyConnected, setMidjourneyConnected] = useState(false);
  const [midjourneyLoading, setMidjourneyLoading] = useState(false);
  // Dynamic Email Notification settings state
  const [notifSettingsLoading, setNotifSettingsLoading] = useState(false);
  const [notifSettingsSaving, setNotifSettingsSaving] = useState(false);
  const [emailPostSuccess, setEmailPostSuccess] = useState(true);
  const [emailPostFailed, setEmailPostFailed] = useState(true);
  const [emailDailyDigest, setEmailDailyDigest] = useState(false);
  const [digestTime, setDigestTime] = useState('08:00');

  const [userId, setUserId] = useState<string | null>(null);
  const [socialAccounts, setSocialAccounts] = useState<any[]>([]);
  const [socialLoading, setSocialLoading] = useState(false);
  const [popupOpen, setPopupOpen] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");
  const [popupType, setPopupType] = useState<PopupType>('info');
  const [popupTitle, setPopupTitle] = useState("");
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
    setTimeout(() => {
      loadSocialAccounts();
    }, 0);
  }, []);

  // Load email notification settings
  useEffect(() => {
    const fetchSettings = async () => {
      setNotifSettingsLoading(true);
      try {
        const res = await fetch('/api/notifications/settings');
        if (res.ok) {
          const json = await res.json();
          if (json && json.data) {
            setEmailPostSuccess(json.data.email_post_success ?? true);
            setEmailPostFailed(json.data.email_post_failed ?? true);
            setEmailDailyDigest(json.data.email_daily_digest ?? false);
            setDigestTime(json.data.digest_time ?? '08:00');
          }
        }
      } catch (err) {
        console.error('Error fetching notification settings:', err);
      } finally {
        setNotifSettingsLoading(false);
      }
    };
    if (userId) {
      fetchSettings();
    }
  }, [userId]);

  const handleSaveNotifSettings = async (
    postSuccess: boolean,
    postFailed: boolean,
    dailyDigest: boolean,
    time: string
  ) => {
    setNotifSettingsSaving(true);
    try {
      const res = await fetch('/api/notifications/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emailPostSuccess: postSuccess,
          emailPostFailed: postFailed,
          emailDailyDigest: dailyDigest,
          digestTime: time,
        }),
      });
      if (res.ok) {
        window.dispatchEvent(
          new CustomEvent('show-notification-toast', {
            detail: {
              message: language === 'vi' 
                ? 'Đã cập nhật cấu hình thông báo thành công!' 
                : 'Notification settings updated successfully!',
              type: 'success',
            }
          })
        );
      }
    } catch (err) {
      console.error('Error saving notification settings:', err);
    } finally {
      setNotifSettingsSaving(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get('connected');
    const platform = params.get('platform');
    const errorMsg = params.get('error');

    if (connected) {
      const platformLabel = platform === 'threads' || platform === 'thread' ? 'Meta Threads' : 
                            platform === 'instagram' ? 'Instagram Business' : 'Facebook Page';
      
      setTimeout(() => {
        if (connected === 'success') {
          setPopupType('success');
          setPopupTitle(language === 'vi' ? 'Liên kết thành công' : 'Connection Success');
          setPopupMessage(
            language === 'vi' 
              ? `Tài khoản ${platformLabel} của bạn đã được kết nối thành công.` 
              : `${platformLabel} account has been connected successfully.`
          );
        } else {
          setPopupType('error');
          setPopupTitle(language === 'vi' ? 'Liên kết thất bại' : 'Connection Failed');
          setPopupMessage(getSocialConnectionErrorMessage(errorMsg, language, platformLabel));
        }
        setPopupOpen(true);
      }, 0);

      // Clean up URL parameters
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, [language]);

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
      <div className="mt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-text mb-1 tracking-tight">{t('settings.title')}</h1>
          <p className="text-text-muted">{t('settings.subtitle')}</p>
        </div>
      </div>

      {/* Tab Content */}
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


              {/* Facebook Connection */}
              {(() => {
                const conn = socialAccounts.find(a => a.platform === 'facebook');
                return (
                  <div className="bg-card dark:bg-black/60 rounded-2xl p-4 flex items-center justify-between text-text shadow-sm border border-gray-100 dark:border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center shrink-0">
                        <Facebook size={20} className="text-[#1877F2] fill-[#1877F2] dark:text-blue-400 dark:fill-blue-400" />
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
                        <ThreadsIcon size={20} className="text-black dark:text-white" />
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
                      <div className="w-10 h-10 rounded-xl bg-pink-50 dark:bg-pink-950/40 flex items-center justify-center shrink-0">
                        <Instagram size={20} className="text-[#E4405F] dark:text-pink-400" />
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
          <div className="flex items-center justify-between font-bold text-lg text-primary border-b border-primary/10 pb-3">
            <div className="flex items-center gap-3">
              <Bell size={20} />
              <h2>{language === 'vi' ? 'Cấu hình thông báo email' : 'Email Notification Preferences'}</h2>
            </div>
            {(notifSettingsLoading || notifSettingsSaving) && (
              <Loader2 size={16} className="animate-spin text-primary" />
            )}
          </div>

          {/* Configuration List */}
          <div className="flex flex-col gap-5 mt-1">
            {notifSettingsLoading ? (
              <div className="py-6 flex flex-col items-center justify-center gap-2 text-text-muted">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <span className="text-xs">{language === 'vi' ? 'Đang tải cấu hình...' : 'Loading preferences...'}</span>
              </div>
            ) : (
              <>
                {/* 1. Post Success Email */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-col gap-0.5" id="email-success-label">
                    <span className="text-sm font-bold">
                      {language === 'vi' ? 'Báo cáo đăng bài thành công' : 'Email on successful posts'}
                    </span>
                    <span id="email-success-desc" className="text-[10px] text-text-muted font-semibold leading-relaxed">
                      {language === 'vi' 
                        ? 'Gửi email thông báo chi tiết ngay lập tức sau khi bài viết được đăng tải thành công.' 
                        : 'Send an email notification immediately after a post is successfully published.'}
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none shrink-0 mt-1">
                    <input 
                      type="checkbox" 
                      checked={emailPostSuccess}
                      disabled={notifSettingsSaving}
                      onChange={(e) => {
                        const val = e.target.checked;
                        setEmailPostSuccess(val);
                        handleSaveNotifSettings(val, emailPostFailed, emailDailyDigest, digestTime);
                      }}
                      aria-labelledby="email-success-label"
                      aria-describedby="email-success-desc"
                      className="sr-only peer" 
                    />
                    <div className={`w-11 h-6 rounded-full peer peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all transition-all ${
                      emailPostSuccess ? 'bg-primary' : 'bg-gray-200 dark:bg-black border dark:border-white/5'
                    }`}></div>
                  </label>
                </div>

                {/* 2. Post Failed Email */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-col gap-0.5" id="email-failed-label">
                    <span className="text-sm font-bold">
                      {language === 'vi' ? 'Báo cáo đăng bài thất bại' : 'Email on failed posts'}
                    </span>
                    <span id="email-failed-desc" className="text-[10px] text-text-muted font-semibold leading-relaxed">
                      {language === 'vi' 
                        ? 'Gửi thông báo và nguyên nhân lỗi chi tiết qua email ngay khi đăng bài thất bại.' 
                        : 'Send an email notification with failure details if publishing fails.'}
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none shrink-0 mt-1">
                    <input 
                      type="checkbox" 
                      checked={emailPostFailed}
                      disabled={notifSettingsSaving}
                      onChange={(e) => {
                        const val = e.target.checked;
                        setEmailPostFailed(val);
                        handleSaveNotifSettings(emailPostSuccess, val, emailDailyDigest, digestTime);
                      }}
                      aria-labelledby="email-failed-label"
                      aria-describedby="email-failed-desc"
                      className="sr-only peer" 
                    />
                    <div className={`w-11 h-6 rounded-full peer peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all transition-all ${
                      emailPostFailed ? 'bg-primary' : 'bg-gray-200 dark:bg-black border dark:border-white/5'
                    }`}></div>
                  </label>
                </div>

                {/* 3. Daily Digest Email */}
                <div className="flex items-start justify-between gap-4 border-t border-primary/10 pt-4">
                  <div className="flex flex-col gap-0.5" id="daily-digest-label">
                    <span className="text-sm font-bold">
                      {language === 'vi' ? 'Báo cáo tổng hợp hàng ngày' : 'Daily summary email digest'}
                    </span>
                    <span id="daily-digest-desc" className="text-[10px] text-text-muted font-semibold leading-relaxed">
                      {language === 'vi' 
                        ? 'Gom tất cả thông báo trong ngày thành 1 email tổng hợp gửi vào khung giờ lựa chọn.' 
                        : 'Aggregate all notifications into a single email summary sent at your preferred hour.'}
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none shrink-0 mt-1">
                    <input 
                      type="checkbox" 
                      checked={emailDailyDigest}
                      disabled={notifSettingsSaving}
                      onChange={(e) => {
                        const val = e.target.checked;
                        setEmailDailyDigest(val);
                        handleSaveNotifSettings(emailPostSuccess, emailPostFailed, val, digestTime);
                      }}
                      aria-labelledby="daily-digest-label"
                      aria-describedby="daily-digest-desc"
                      className="sr-only peer" 
                    />
                    <div className={`w-11 h-6 rounded-full peer peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all transition-all ${
                      emailDailyDigest ? 'bg-primary' : 'bg-gray-200 dark:bg-black border dark:border-white/5'
                    }`}></div>
                  </label>
                </div>

                {/* 4. Daily Digest Hour Selector */}
                {emailDailyDigest && (
                  <div className="flex items-center justify-between gap-4 bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-2xl border border-primary/5 ml-2 transition-all">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-bold text-text">
                        {language === 'vi' ? 'Thời gian nhận email' : 'Digest Delivery Time'}
                      </span>
                      <span className="text-[9px] text-text-muted">
                        {language === 'vi' ? 'Chọn khung giờ (GMT+7)' : 'Select preferred hour (GMT+7)'}
                      </span>
                    </div>
                    <select
                      value={digestTime}
                      disabled={notifSettingsSaving}
                      onChange={(e) => {
                        const val = e.target.value;
                        setDigestTime(val);
                        handleSaveNotifSettings(emailPostSuccess, emailPostFailed, emailDailyDigest, val);
                      }}
                      className="bg-white dark:bg-black border border-primary/10 rounded-xl px-3 py-1.5 text-xs font-bold text-text focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      {['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'].map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                )}
              </>
            )}

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

      <PopupDialog
        isOpen={popupOpen}
        onClose={() => setPopupOpen(false)}
        title={popupTitle}
        message={popupMessage}
        type={popupType}
      />
    </div>
  );
}
