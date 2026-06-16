"use client";

import React, { useState, useEffect } from 'react';
import { 
  User, 
  Settings, 
  Bell, 
  MessageSquare, 
  Image as ImageIcon,
  Check,
  Globe,
  FileText,
  GitBranch
} from 'lucide-react';

// API Plug / Connection icon custom SVG to match mockup
const PlugIcon = ({ size = 20 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
  </svg>
);

// Localization dictionary
const translations = {
  vi: {
    title: "Cài đặt",
    subtitle: "Quản lý thông tin hồ sơ người sáng tạo và các tích hợp AI của bạn.",
    profileInfo: "Thông tin cá nhân",
    displayName: "Tên hiển thị",
    emailAddress: "Địa chỉ Email",
    saveChanges: "Lưu thay đổi",
    saved: "Đã lưu",
    changeAvatar: "Thay đổi ảnh đại diện",
    apiIntegrations: "Tích hợp API",
    apiSubtitle: "Kết nối các công cụ yêu thích để tối ưu hóa quy trình làm việc.",
    connected: "Đã kết nối",
    notConnected: "Chưa kết nối",
    connect: "Kết nối",
    disconnect: "Hủy kết nối",
    notifications: "Thông báo",
    aiNotifyTitle: "Hoàn thành tạo AI",
    aiNotifyDesc: "Nhận thông báo khi quá trình xử lý hàng loạt hoàn tất.",
    weeklyDigestTitle: "Báo cáo tuần",
    weeklyDigestDesc: "Tóm tắt các nội dung hoạt động hiệu quả nhất của bạn.",
    languageTitle: "Ngôn ngữ hệ thống",
    languageDesc: "Chọn ngôn ngữ hiển thị mặc định của bạn.",
    langVi: "Tiếng Việt",
    langEn: "Tiếng Anh",
    changelogTitle: "Lịch sử cập nhật (Changelog)",
    changelogDesc: "Theo dõi các cập nhật tính năng mới nhất của hệ thống.",
  },
  en: {
    title: "Settings",
    subtitle: "Manage your creator profile and AI integrations.",
    profileInfo: "Profile Information",
    displayName: "Display Name",
    emailAddress: "Email Address",
    saveChanges: "Save Changes",
    saved: "Saved",
    changeAvatar: "Change Avatar",
    apiIntegrations: "API Integrations",
    apiSubtitle: "Connect your favorite tools to streamline your workflow.",
    connected: "Connected",
    notConnected: "Not Connected",
    connect: "Connect",
    disconnect: "Disconnect",
    notifications: "Notifications",
    aiNotifyTitle: "AI Generation Complete",
    aiNotifyDesc: "Get notified when batch processing finishes.",
    weeklyDigestTitle: "Weekly Digest",
    weeklyDigestDesc: "A summary of your top performing content.",
    languageTitle: "System Language",
    languageDesc: "Choose your preferred system language.",
    langVi: "Vietnamese",
    langEn: "English",
    changelogTitle: "System Changelog",
    changelogDesc: "Track the latest feature updates of the system.",
  }
};

export default function SettingsView() {
  const [lang, setLang] = useState<'vi' | 'en'>('vi');

  // Load language from localStorage on mount
  useEffect(() => {
    const savedLang = localStorage.getItem('lang') as 'vi' | 'en';
    if (savedLang === 'en' || savedLang === 'vi') {
      setLang(savedLang);
    }

    const handleLangChange = () => {
      const currentLang = localStorage.getItem('lang') as 'vi' | 'en';
      if (currentLang === 'en' || currentLang === 'vi') {
        setLang(currentLang);
      }
    };

    window.addEventListener('languageChange', handleLangChange);
    return () => {
      window.removeEventListener('languageChange', handleLangChange);
    };
  }, []);

  const changeLanguage = (newLang: 'vi' | 'en') => {
    setLang(newLang);
    localStorage.setItem('lang', newLang);
    // Dispatch custom event to notify Footer or other elements
    window.dispatchEvent(new Event('languageChange'));
  };

  // State for interactive inputs
  const [displayName, setDisplayName] = useState('Alex Rivera');
  const [emailAddress, setEmailAddress] = useState('alex@luminacreator.ai');
  const [openaiConnected, setOpenaiConnected] = useState(true);
  const [midjourneyConnected, setMidjourneyConnected] = useState(false);
  const [aiGenNotify, setAiGenNotify] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const t = translations[lang];

  return (
    <div className="flex flex-col gap-6">
      
      {/* Title Header */}
      <div className="mt-2">
        <h1 className="text-4xl font-bold text-text mb-1 tracking-tight">{t.title}</h1>
        <p className="text-text-muted">{t.subtitle}</p>
      </div>

      {/* Profile Information Card (Full Width) */}
      <div className="bg-[#F3F4FD] border border-[#E4E6F8] rounded-[32px] p-8 flex flex-col gap-6">
        
        {/* Card Header */}
        <div className="flex items-center gap-3 text-[#3F51B5] font-bold text-lg">
          <User size={20} />
          <h2>{t.profileInfo}</h2>
        </div>

        {/* Card Content split */}
        <div className="flex gap-10 items-start">
          
          {/* Avatar side */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-white shadow-md">
              <img 
                src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop" 
                alt="User Profile" 
                className="w-full h-full object-cover"
              />
            </div>
            <button className="text-xs font-bold text-[#3F51B5] hover:text-indigo-800 transition-colors">
              {t.changeAvatar}
            </button>
          </div>

          {/* Inputs side */}
          <div className="flex-1 flex flex-col gap-4">
            
            {/* Input 1 */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-text-muted">{t.displayName}</label>
              <input 
                type="text" 
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full max-w-xl bg-white text-text px-5 py-3 rounded-2xl shadow-sm border border-gray-200/50 focus:outline-none text-sm font-semibold focus:ring-2 focus:ring-[#3F51B5]/25"
              />
            </div>

            {/* Input 2 */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-text-muted">{t.emailAddress}</label>
              <input 
                type="email" 
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
                className="w-full max-w-xl bg-white text-text px-5 py-3 rounded-2xl shadow-sm border border-gray-200/50 focus:outline-none text-sm font-semibold focus:ring-2 focus:ring-[#3F51B5]/25"
              />
            </div>

            {/* Save Changes button positioned on the right */}
            <div className="flex justify-end mt-2">
              <button 
                onClick={handleSave}
                className="bg-[#3F51B5] hover:bg-indigo-700 text-white px-8 py-3 rounded-full font-bold text-sm transition-all shadow-md shadow-[#3F51B5]/20 flex items-center gap-2 select-none hover:scale-102"
              >
                {isSaved ? (
                  <>
                    <Check size={16} />
                    {t.saved}
                  </>
                ) : (
                  t.saveChanges
                )}
              </button>
            </div>

          </div>

        </div>

      </div>

      {/* Two Column Grid */}
      <div className="grid grid-cols-12 gap-6 items-stretch">
        
        {/* Left Column: API Integrations (Dark Green Card) */}
        <div className="col-span-7 bg-[#4E7164] border border-[#3E5C50] rounded-[32px] p-8 flex flex-col gap-6 text-white justify-between">
          
          <div>
            {/* Header */}
            <div className="flex items-center gap-3 font-bold text-lg text-white">
              <PlugIcon size={20} />
              <h2>{t.apiIntegrations}</h2>
            </div>
            
            {/* Subtitle */}
            <p className="text-xs font-medium text-white/80 mt-2">
              {t.apiSubtitle}
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
                    <span className="text-[10px] text-emerald-600 font-semibold block mt-[2px]">{t.connected}</span>
                  </div>
                </div>
                <button 
                  onClick={() => setOpenaiConnected(!openaiConnected)}
                  className="text-xs font-bold text-red-500 hover:text-red-700 transition-colors px-3 py-1 cursor-pointer select-none"
                >
                  {openaiConnected ? t.disconnect : t.connect}
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
                      {midjourneyConnected ? t.connected : t.notConnected}
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => setMidjourneyConnected(!midjourneyConnected)}
                  className="text-xs font-bold text-[#3F51B5] hover:text-indigo-800 transition-colors px-3 py-1 cursor-pointer select-none"
                >
                  {midjourneyConnected ? t.disconnect : t.connect}
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
            <h2>{t.notifications}</h2>
          </div>

          {/* Configuration List */}
          <div className="flex flex-col gap-5 mt-1">
            
            {/* Config Item 1 */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-bold">{t.aiNotifyTitle}</span>
                <span className="text-[10px] text-text-muted font-semibold leading-relaxed">
                  {t.aiNotifyDesc}
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
                <span className="text-sm font-bold">{t.weeklyDigestTitle}</span>
                <span className="text-[10px] text-text-muted font-semibold leading-relaxed">
                  {t.weeklyDigestDesc}
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
                  {t.languageTitle}
                </span>
                <span className="text-[10px] text-text-muted font-semibold leading-relaxed">
                  {t.languageDesc}
                </span>
              </div>
              <div className="flex bg-white rounded-xl p-1 border border-[#E4E6F8] shadow-sm shrink-0">
                <button 
                  onClick={() => changeLanguage('vi')}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                    lang === 'vi' 
                      ? 'bg-[#3F51B5] text-white shadow-md' 
                      : 'text-text-muted hover:text-[#1E293B] hover:bg-gray-50'
                  }`}
                >
                  <span>🇻🇳</span>
                  <span>{t.langVi}</span>
                </button>
                <button 
                  onClick={() => changeLanguage('en')}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                    lang === 'en' 
                      ? 'bg-[#3F51B5] text-white shadow-md' 
                      : 'text-text-muted hover:text-[#1E293B] hover:bg-gray-50'
                  }`}
                >
                  <span>🇺🇸</span>
                  <span>{t.langEn}</span>
                </button>
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
