"use client";

import React, { useState, useEffect, useRef } from 'react';
import { User, Settings, LogOut, Check, Loader2, Sparkles, ChevronDown, Upload } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { signout } from '@/app/(dashboard)/actions';
import { motion, AnimatePresence } from 'framer-motion';

// High-quality aesthetic preset GIFs
const PRESET_GIFS = [
  {
    name: 'Sparkle Stars',
    url: 'https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExdWp3d2Zsb2Jxb3p2Ymdna21lMmE1NXZmaW1xYnk2MXVyd2NlZnI1byZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/L8n8gU7n2gRBs1eTgd/giphy.gif'
  },
  {
    name: 'Cyber Neon',
    url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOHAwMzkxNmY0cWFkMzdhYnRpdTNscTJnbmlvOG5ocXlhcnR1NGp1biZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/l41JWR8v5J77O0u4w/giphy.gif'
  },
  {
    name: 'Pixel Neko',
    url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMHgyZzM3eHlweTZma2o2dWt1b3hicmF4dzZ5Mm1hc3JiaGF6c3A0ZCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/I17tZ21T4gnN9n2s5x/giphy.gif'
  }
];

export default function UserProfileDropdown() {
  const { t } = useLanguage();
  const supabase = createClient();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dropdown visibility
  const [isOpen, setIsOpen] = useState(false);

  // Profile fields state
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarFrame, setAvatarFrame] = useState('none');
  const [role, setRole] = useState('marketer_content');
  const [status, setStatus] = useState('active');

  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);

  // Request & Status state
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Fetch user data
  useEffect(() => {
    async function loadUserData() {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) return;

        setEmail(user.email || '');

        // Extract metadata values
        const metadata = user.user_metadata || {};
        setFullName(metadata.full_name || '');
        setAvatarUrl(metadata.avatar_url || '');
        setDepartment(metadata.department || '');
        setAvatarFrame(metadata.avatar_frame || 'none');

        // Fetch database table fields for role and status
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('role, status')
          .eq('id', user.id)
          .maybeSingle();

        if (!profileError && profile) {
          setRole(profile.role || 'marketer_content');
          setStatus(profile.status || 'active');
        }
      } catch (err) {
        console.error('Error loading user profile:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadUserData();
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get displayed avatar source (from local storage or raw URL)
  const getDisplayedAvatarUrl = () => {
    if (avatarUrl === 'local_storage_avatar') {
      if (typeof window !== 'undefined') {
        return localStorage.getItem('custom_avatar_base64') || '';
      }
      return '';
    }
    return avatarUrl;
  };

  // Update profile
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: fullName,
          avatar_url: avatarUrl,
          department: department,
          avatar_frame: avatarFrame,
        }
      });

      if (!error) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        console.error('Error updating profile:', error.message);
      }
    } catch (err) {
      console.error('Error during profile update:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Drag & Drop events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const processFile = (file: File) => {
    if (file && (file.type === 'image/gif' || file.type === 'image/png' || file.type === 'image/jpeg')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        try {
          localStorage.setItem('custom_avatar_base64', base64);
        } catch (e) {
          console.error('Failed to save to localStorage:', e);
        }
        setAvatarUrl('local_storage_avatar');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  // Get initials for placeholder avatar
  const getInitials = () => {
    if (fullName) {
      const parts = fullName.trim().split(' ');
      if (parts.length > 1) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return fullName.trim().substring(0, 2).toUpperCase();
    }
    return email ? email.substring(0, 2).toUpperCase() : 'JS';
  };

  // Frame utility classes
  const getFrameClass = (frame: string) => {
    switch (frame) {
      case 'rainbow':
        return 'frame-rainbow-glow border border-transparent';
      case 'gold':
        return 'frame-gold-shimmer border border-transparent shadow-lg shadow-amber-500/20';
      case 'cyber':
        return 'frame-cyber-pulse border border-transparent';
      default:
        return 'border border-gray-300 bg-white/20';
    }
  };

  const displayedAvatar = getDisplayedAvatarUrl();

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 focus:outline-none focus:ring-0 group"
      >
        <div className={`relative w-11 h-11 rounded-full flex items-center justify-center p-[2.5px] transition-transform duration-300 group-hover:scale-105 ${getFrameClass(avatarFrame)} ${avatarFrame !== 'none' ? 'animate-pulse-glow' : ''}`}>
          <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-gray-200">
            {displayedAvatar ? (
              <img
                src={displayedAvatar}
                alt="Profile Avatar"
                className="w-full h-full object-cover rounded-full"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <span className="text-gray-600 font-bold text-sm select-none">{getInitials()}</span>
            )}
          </div>
          {/* Animated sparkles overlay if premium frame is active */}
          {avatarFrame !== 'none' && (
            <span className="absolute -top-1 -right-1 text-amber-400 text-xs animate-bounce pointer-events-none">
              ✨
            </span>
          )}
        </div>
        <ChevronDown size={14} className={`text-text-muted transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Card */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute right-0 mt-3 w-80 bg-white/90 dark:bg-black/70 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 p-5 text-left"
          >
            {/* Header info */}
            <div className="flex items-center gap-3 pb-4 mb-4 border-b border-gray-200/50 dark:border-white/10">
              <div className={`relative w-12 h-12 rounded-full p-[2.5px] ${getFrameClass(avatarFrame)} ${avatarFrame !== 'none' ? 'animate-pulse-glow' : ''}`}>
                <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-gray-200">
                  {displayedAvatar ? (
                    <img src={displayedAvatar} alt="Avatar" className="w-full h-full object-cover rounded-full" />
                  ) : (
                    <span className="text-gray-600 font-bold text-sm select-none">{getInitials()}</span>
                  )}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-text truncate">
                  {fullName || t('profile.guest')}
                </h4>
                <p className="text-xs text-text-muted truncate mb-0.5">{email}</p>
                {department && (
                  <p className="text-[11px] text-primary font-medium truncate mb-1">{department}</p>
                )}
                
                {/* Badges */}
                <div className="flex flex-wrap gap-1.5 mt-1">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase tracking-wider">
                    {role.replace('marketer_', '')}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    status === 'active' 
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {status}
                  </span>
                </div>
              </div>
            </div>

            {/* Editable Form */}
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-6 gap-2">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
                <span className="text-xs text-text-muted">{t('common.loading')}</span>
              </div>
            ) : (
              <form onSubmit={handleSave} className="space-y-4">
                {/* Display Name */}
                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1">
                    {t('profile.displayName')}
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-gray-100/50 dark:bg-white/5 border border-gray-200/50 dark:border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-text-muted text-text"
                    placeholder="John Smith"
                  />
                </div>

                {/* Department */}
                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1">
                    {t('profile.department')}
                  </label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full bg-gray-100/50 dark:bg-white/5 border border-gray-200/50 dark:border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-text-muted text-text"
                    placeholder="Marketing, Content..."
                  />
                </div>

                {/* Drag and Drop Zone & presets */}
                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1">
                    {t('profile.avatarUrl')}
                  </label>
                  
                  {/* Hidden file input */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/gif,image/png,image/jpeg"
                    className="hidden"
                  />

                  {/* Drag drop zone card */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={triggerFileSelect}
                    className={`border-2 border-dashed rounded-xl p-3.5 text-center cursor-pointer transition-all mb-2 flex flex-col items-center justify-center gap-1 ${
                      isDragging
                        ? 'border-primary bg-primary/10 scale-102 shadow-md shadow-primary/10'
                        : 'border-gray-200/80 hover:bg-gray-50/50 dark:border-white/10 dark:hover:bg-white/5'
                    }`}
                  >
                    <Upload size={16} className={`text-text-muted transition-colors ${isDragging ? 'text-primary animate-bounce' : 'group-hover:text-primary'}`} />
                    <span className="text-[11px] font-semibold text-text-muted">
                      {isDragging ? 'Thả file vào đây!' : 'Kéo thả hoặc click chọn ảnh / GIF'}
                    </span>
                    <span className="text-[9px] text-text-muted/75">
                      Hỗ trợ GIF, PNG, JPG
                    </span>
                  </div>

                  <input
                    type="text"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    className="w-full bg-gray-100/50 dark:bg-white/5 border border-gray-200/50 dark:border-white/10 rounded-xl px-3 py-1.5 text-[11px] focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-text-muted text-text"
                    placeholder="Nhập link ảnh hoặc thả file phía trên"
                  />

                  {/* GIF Presets */}
                  <div className="mt-2.5">
                    <span className="text-[10px] text-text-muted block mb-1">
                      {t('profile.clickToSelectPreset')}
                    </span>
                    <div className="flex gap-2">
                      {PRESET_GIFS.map((gif, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => setAvatarUrl(gif.url)}
                          className={`w-8 h-8 rounded-lg overflow-hidden border transition-all hover:scale-105 ${
                            avatarUrl === gif.url ? 'border-primary shadow-sm shadow-primary/30 ring-1 ring-primary' : 'border-gray-200 hover:border-primary'
                          }`}
                          title={gif.name}
                        >
                          <img src={gif.url} alt={gif.name} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Frame selection */}
                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1">
                    {t('profile.avatarFrame')}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setAvatarFrame('none')}
                      className={`text-left text-xs p-2.5 rounded-xl border transition-all flex items-center justify-between ${
                        avatarFrame === 'none'
                          ? 'border-primary bg-primary/5 text-primary font-bold shadow-sm shadow-primary/10'
                          : 'border-gray-200 hover:bg-gray-50 text-text'
                      }`}
                    >
                      <span>{t('profile.frameNone')}</span>
                      {avatarFrame === 'none' && <Check size={12} />}
                    </button>

                    <button
                      type="button"
                      onClick={() => setAvatarFrame('rainbow')}
                      className={`text-left text-xs p-2.5 rounded-xl border transition-all flex items-center justify-between relative overflow-hidden ${
                        avatarFrame === 'rainbow'
                          ? 'border-purple-500 bg-purple-500/5 text-purple-700 font-bold shadow-sm shadow-purple-500/10'
                          : 'border-gray-200 hover:bg-gray-50 text-text'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <span className="text-[10px] animate-spin-slow">🌀</span>
                        {t('profile.frameRainbow')}
                      </span>
                      {avatarFrame === 'rainbow' && <Check size={12} />}
                    </button>

                    <button
                      type="button"
                      onClick={() => setAvatarFrame('gold')}
                      className={`text-left text-xs p-2.5 rounded-xl border transition-all flex items-center justify-between ${
                        avatarFrame === 'gold'
                          ? 'border-amber-500 bg-amber-500/5 text-amber-700 font-bold shadow-sm shadow-amber-500/10'
                          : 'border-gray-200 hover:bg-gray-50 text-text'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <Sparkles size={10} className="text-amber-500 animate-pulse" />
                        {t('profile.frameGold')}
                      </span>
                      {avatarFrame === 'gold' && <Check size={12} />}
                    </button>

                    <button
                      type="button"
                      onClick={() => setAvatarFrame('cyber')}
                      className={`text-left text-xs p-2.5 rounded-xl border transition-all flex items-center justify-between ${
                        avatarFrame === 'cyber'
                          ? 'border-cyan-500 bg-cyan-500/5 text-cyan-700 font-bold shadow-sm shadow-cyan-500/10'
                          : 'border-gray-200 hover:bg-gray-50 text-text'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <span className="text-[10px] animate-pulse font-bold">⚡</span>
                        {t('profile.frameCyber')}
                      </span>
                      {avatarFrame === 'cyber' && <Check size={12} />}
                    </button>
                  </div>
                </div>

                {/* Save button & success message */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="w-full bg-gradient-to-r from-primary to-purple-600 hover:opacity-95 text-white font-medium py-2 rounded-xl text-sm transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {t('profile.saving')}
                      </>
                    ) : (
                      <>
                        <Sparkles size={14} className="animate-pulse" />
                        {t('profile.saveChanges')}
                      </>
                    )}
                  </button>

                  {saveSuccess && (
                    <motion.p
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-[11px] text-green-600 text-center mt-2 font-bold"
                    >
                      ✓ {t('profile.saved')}
                    </motion.p>
                  )}
                </div>
              </form>
            )}

            {/* Logout Footer */}
            <div className="mt-4 pt-3 border-t border-gray-200/50 dark:border-white/10 flex items-center justify-between gap-4">
              <a
                href="/settings"
                className="text-xs text-text-muted hover:text-text flex items-center gap-1.5 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <Settings size={14} />
                {t('sidebar.settings')}
              </a>

              <form action={signout} className="m-0">
                <button
                  type="submit"
                  className="text-xs text-red-500 hover:text-red-600 font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <LogOut size={14} />
                  {t('sidebar.logout')}
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
