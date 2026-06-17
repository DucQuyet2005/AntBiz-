"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Settings, LogOut, Check, Loader2, Sparkles, ChevronDown, Upload, X } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { signout } from '@/app/(dashboard)/actions';
import { motion, AnimatePresence } from 'framer-motion';

const PRESET_GIFS = [
  {
    name: 'Sparkle Stars',
    url: 'https://media.giphy.com/media/L8n8gU7n2gRBs1eTgd/giphy.gif'
  },
  {
    name: 'Cyber Neon',
    url: 'https://media.giphy.com/media/l41JWR8v5J77O0u4w/giphy.gif'
  },
  {
    name: 'Pixel Cat',
    url: 'https://media.giphy.com/media/I17tZ21T4gnN9n2s5x/giphy.gif'
  }
];

export default function UserProfileDropdown() {
  const { t } = useLanguage();
  const supabase = createClient();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isOpen, setIsOpen] = useState(false);

  // User state
  const [userId, setUserId] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarFrame, setAvatarFrame] = useState('none');
  const [role, setRole] = useState('marketer_content');
  const [status, setStatus] = useState('active');

  // UI state
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load user on mount
  useEffect(() => {
    async function loadUserData() {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) return;

        setUserId(user.id);
        setEmail(user.email || '');

        // Load name, department, frame from user_metadata (small strings, safe)
        const meta = user.user_metadata || {};
        setFullName(meta.full_name || '');
        setDepartment(meta.department || '');
        setAvatarFrame(meta.avatar_frame || 'none');

        // Load avatar URL from users table column
        const { data: profile } = await supabase
          .from('users')
          .select('role, status, avatars')
          .eq('id', user.id)
          .maybeSingle();

        if (profile) {
          setRole(profile.role || 'marketer_content');
          setStatus(profile.status || 'active');
          setAvatarUrl(profile.avatars || '');
        }
      } catch (err) {
        console.error('Error loading user profile:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadUserData();
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Upload file to Supabase Storage → returns public URL
  const uploadToStorage = async (file: File): Promise<string | null> => {
    if (!userId) return null;
    setIsUploading(true);
    setUploadError('');

    try {
      const ext = file.name.split('.').pop() || 'gif';
      const fileName = `${userId}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true, cacheControl: '3600' });

      if (uploadError) {
        setUploadError('Upload thất bại: ' + uploadError.message);
        return null;
      }

      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
      // Append timestamp to bust cache
      return data.publicUrl + `?t=${Date.now()}`;
    } catch (err) {
      setUploadError('Lỗi upload, vui lòng thử lại.');
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const processFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setUploadError('Chỉ hỗ trợ GIF, PNG, JPG');
      return;
    }
    const url = await uploadToStorage(file);
    if (url) setAvatarUrl(url);
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  // Save all profile changes
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!userId) return;
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      // 1. Save avatar URL to users table
      const { error: dbError } = await supabase
        .from('users')
        .update({ avatars: avatarUrl })
        .eq('id', userId);

      if (dbError) console.error('DB update error:', dbError.message);

      // 2. Save name, department, frame to user_metadata (small, safe for JWT)
      const { error: metaError } = await supabase.auth.updateUser({
        data: {
          full_name: fullName,
          department: department,
          avatar_frame: avatarFrame,
        }
      });

      if (!dbError && !metaError) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const getInitials = () => {
    if (fullName) {
      const parts = fullName.trim().split(' ');
      return parts.length > 1
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : fullName.substring(0, 2).toUpperCase();
    }
    return email ? email.substring(0, 2).toUpperCase() : 'JS';
  };

  const getFrameWrapperClass = (frame: string) => {
    switch (frame) {
      case 'rainbow': return 'frame-rainbow-glow border border-transparent animate-pulse-glow';
      case 'gold': return 'frame-gold-shimmer border border-transparent shadow-lg shadow-amber-500/20 animate-pulse-glow';
      case 'cyber': return 'frame-cyber-pulse border border-transparent animate-pulse-glow';
      default: return 'border border-gray-300';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Avatar Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 focus:outline-none group"
      >
        <div className={`relative w-11 h-11 rounded-full p-[2.5px] transition-transform duration-300 group-hover:scale-110 ${getFrameWrapperClass(avatarFrame)}`}>
          <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-gray-200">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            ) : (
              <span className="text-gray-600 font-bold text-sm select-none">{getInitials()}</span>
            )}
          </div>
          {avatarFrame !== 'none' && (
            <span className="absolute -top-1 -right-1 text-[10px] animate-bounce pointer-events-none">✨</span>
          )}
        </div>
        <ChevronDown size={13} className={`text-text-muted transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="absolute right-0 mt-3 w-[320px] bg-white/95 backdrop-blur-xl border border-gray-200/60 rounded-2xl shadow-2xl z-50 p-5 text-left overflow-hidden"
          >
            {/* Profile header */}
            <div className="flex items-center gap-3 pb-4 mb-4 border-b border-gray-100">
              <div className={`relative w-13 h-13 rounded-full p-[2.5px] shrink-0 ${getFrameWrapperClass(avatarFrame)}`} style={{ width: 52, height: 52 }}>
                <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-gray-200">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-gray-600 font-bold">{getInitials()}</span>
                  )}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-text text-sm truncate">{fullName || t('profile.guest')}</p>
                <p className="text-[11px] text-text-muted truncate">{email}</p>
                {department && <p className="text-[11px] text-primary font-medium truncate">{department}</p>}
                <div className="flex gap-1.5 mt-1.5">
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase tracking-wider">
                    {role.replace('marketer_', '')}
                  </span>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${status === 'active' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-700'}`}>
                    {status}
                  </span>
                </div>
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8 gap-2">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
                <span className="text-xs text-text-muted">{t('common.loading')}</span>
              </div>
            ) : (
              <form onSubmit={handleSave} className="space-y-3.5">
                {/* Display Name */}
                <div>
                  <label className="block text-[11px] font-semibold text-text-muted mb-1">{t('profile.displayName')}</label>
                  <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-text"
                    placeholder="Nguyễn Văn A" />
                </div>

                {/* Department */}
                <div>
                  <label className="block text-[11px] font-semibold text-text-muted mb-1">{t('profile.department')}</label>
                  <input type="text" value={department} onChange={(e) => setDepartment(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-text"
                    placeholder="Marketing, Content, Design..." />
                </div>

                {/* Avatar Upload */}
                <div>
                  <label className="block text-[11px] font-semibold text-text-muted mb-1">{t('profile.avatarUrl')}</label>

                  {/* Drop zone */}
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/gif,image/png,image/jpeg,image/webp" className="hidden" />
                  <div
                    onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-3 text-center cursor-pointer transition-all flex flex-col items-center gap-1 mb-2 ${
                      isDragging ? 'border-primary bg-primary/8 scale-[1.01]' : 'border-gray-200 hover:border-primary/40 hover:bg-gray-50/50'
                    }`}
                  >
                    {isUploading ? (
                      <><Loader2 size={16} className="text-primary animate-spin" /><span className="text-[11px] text-primary font-semibold">Đang upload...</span></>
                    ) : (
                      <><Upload size={15} className={isDragging ? 'text-primary' : 'text-text-muted'} />
                      <span className="text-[11px] font-medium text-text-muted">{isDragging ? 'Thả vào đây!' : 'Kéo thả hoặc click để chọn ảnh'}</span>
                      <span className="text-[9px] text-text-muted/60">GIF, PNG, JPG, WebP</span></>
                    )}
                  </div>

                  {uploadError && (
                    <div className="flex items-center gap-1.5 text-red-500 text-[11px] mb-2">
                      <X size={12} /> {uploadError}
                    </div>
                  )}

                  {/* URL input */}
                  <input type="text" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-[11px] focus:outline-none focus:ring-2 focus:ring-primary/20 text-text placeholder:text-text-muted/60"
                    placeholder="Hoặc nhập link ảnh trực tiếp..." />

                  {/* Preset GIFs */}
                  <div className="mt-2">
                    <span className="text-[10px] text-text-muted block mb-1.5">{t('profile.clickToSelectPreset')}</span>
                    <div className="flex gap-2">
                      {PRESET_GIFS.map((gif, i) => (
                        <button key={i} type="button" onClick={() => setAvatarUrl(gif.url)} title={gif.name}
                          className={`w-9 h-9 rounded-lg overflow-hidden border-2 transition-all hover:scale-110 ${avatarUrl === gif.url ? 'border-primary ring-1 ring-primary' : 'border-gray-200 hover:border-primary/50'}`}>
                          <img src={gif.url} alt={gif.name} className="w-full h-full object-cover" />
                        </button>
                      ))}
                      {avatarUrl && (
                        <button type="button" onClick={() => setAvatarUrl('')} title="Xóa avatar"
                          className="w-9 h-9 rounded-lg border-2 border-dashed border-gray-200 hover:border-red-300 hover:bg-red-50 flex items-center justify-center transition-all">
                          <X size={14} className="text-text-muted hover:text-red-400" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Frame selector */}
                <div>
                  <label className="block text-[11px] font-semibold text-text-muted mb-1.5">{t('profile.avatarFrame')}</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { key: 'none', label: t('profile.frameNone'), icon: '○', cls: 'border-gray-200 text-text' },
                      { key: 'rainbow', label: t('profile.frameRainbow'), icon: '🌀', cls: 'border-purple-200 text-purple-700' },
                      { key: 'gold', label: t('profile.frameGold'), icon: '✨', cls: 'border-amber-200 text-amber-700' },
                      { key: 'cyber', label: t('profile.frameCyber'), icon: '⚡', cls: 'border-cyan-200 text-cyan-700' },
                    ].map(({ key, label, icon, cls }) => (
                      <button key={key} type="button" onClick={() => setAvatarFrame(key)}
                        className={`text-[11px] px-2.5 py-2 rounded-xl border transition-all flex items-center gap-1.5 justify-between ${
                          avatarFrame === key
                            ? `${cls} font-bold bg-opacity-10 shadow-sm`
                            : 'border-gray-100 hover:bg-gray-50 text-text-muted'
                        }`}
                      >
                        <span className="flex items-center gap-1"><span>{icon}</span>{label}</span>
                        {avatarFrame === key && <Check size={10} />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Save */}
                <div className="pt-1">
                  <button type="submit" disabled={isSaving || isUploading}
                    className="w-full bg-gradient-to-r from-primary to-purple-600 text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/25 hover:opacity-90 transition-all disabled:opacity-50"
                  >
                    {isSaving ? <><Loader2 size={14} className="animate-spin" />{t('profile.saving')}</> : <><Sparkles size={13} className="animate-pulse" />{t('profile.saveChanges')}</>}
                  </button>
                  <AnimatePresence>
                    {saveSuccess && (
                      <motion.p initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="text-[11px] text-green-600 text-center mt-2 font-semibold">
                        ✓ {t('profile.saved')}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              </form>
            )}

            {/* Footer */}
            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
              <a href="/settings" onClick={() => setIsOpen(false)}
                className="text-[11px] text-text-muted hover:text-text flex items-center gap-1.5 transition-colors">
                <Settings size={13} />{t('sidebar.settings')}
              </a>
              <form action={signout} className="m-0">
                <button type="submit" className="text-[11px] text-red-500 hover:text-red-600 font-semibold flex items-center gap-1.5 transition-colors">
                  <LogOut size={13} />{t('sidebar.logout')}
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
