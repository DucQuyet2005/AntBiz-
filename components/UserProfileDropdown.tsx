"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Settings, LogOut, Check, Loader2, Sparkles, ChevronDown, Upload, X } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { signout } from '@/app/(dashboard)/actions';
import { motion, AnimatePresence } from 'framer-motion';

const PRESET_GIFS = [
  { name: 'Sparkle Stars', url: 'https://media.giphy.com/media/L8n8gU7n2gRBs1eTgd/giphy.gif' },
  { name: 'Cyber Neon',    url: 'https://media.giphy.com/media/l41JWR8v5J77O0u4w/giphy.gif'  },
  { name: 'Pixel Cat',     url: 'https://media.giphy.com/media/I17tZ21T4gnN9n2s5x/giphy.gif' },
];

const FRAMES = [
  { key: 'none',    label: 'frameNone',    icon: '○',  ringClass: '' },
  { key: 'rainbow', label: 'frameRainbow', icon: '🌈', ringClass: 'ring-rainbow' },
  { key: 'gold',    label: 'frameGold',    icon: '✨', ringClass: 'ring-gold'    },
  { key: 'cyber',   label: 'frameCyber',   icon: '⚡', ringClass: 'ring-cyber'   },
];

// Returns the ring CSS class for the given frame key
function getRingClass(frame: string) {
  return FRAMES.find(f => f.key === frame)?.ringClass ?? '';
}

// Reusable avatar display
function AvatarDisplay({
  avatarUrl, initials, frame, size = 44,
}: { avatarUrl: string; initials: string; frame: string; size?: number }) {
  const ringClass = getRingClass(frame);
  const pad = 3; // ring thickness in px

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      {/* Ring sits behind the avatar */}
      {ringClass && (
        <div
          className={`absolute rounded-full ${ringClass}`}
          style={{ inset: -pad, borderRadius: '50%' }}
        />
      )}
      {/* Avatar on top */}
      <div
        className="absolute inset-0 rounded-full overflow-hidden flex items-center justify-center bg-gray-200"
        style={{ zIndex: 1 }}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt="Avatar"
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <span className="text-gray-600 font-bold select-none" style={{ fontSize: size * 0.3 }}>
            {initials}
          </span>
        )}
      </div>
      {/* Sparkle badge */}
      {ringClass && (
        <span
          className="absolute text-[10px] animate-bounce pointer-events-none"
          style={{ top: -6, right: -6, zIndex: 2 }}
        >
          ✨
        </span>
      )}
    </div>
  );
}

export default function UserProfileDropdown() {
  const { t } = useLanguage();
  const supabase  = createClient();
  const dropdownRef  = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isOpen, setIsOpen] = useState(false);

  // User state
  const [userId,     setUserId]     = useState('');
  const [email,      setEmail]      = useState('');
  const [fullName,   setFullName]   = useState('');
  const [department, setDepartment] = useState('');
  const [avatarUrl,  setAvatarUrl]  = useState('');
  const [avatarFrame, setAvatarFrame] = useState('none');
  const [role,   setRole]   = useState('marketer_content');
  const [status, setStatus] = useState('active');

  // UI state
  const [isDragging,   setIsDragging]   = useState(false);
  const [isUploading,  setIsUploading]  = useState(false);
  const [uploadError,  setUploadError]  = useState('');
  const [isLoading,    setIsLoading]    = useState(true);
  const [isSaving,     setIsSaving]     = useState(false);
  const [saveSuccess,  setSaveSuccess]  = useState(false);

  // Load user on mount
  useEffect(() => {
    (async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) return;

        setUserId(user.id);
        setEmail(user.email || '');

        const meta = user.user_metadata || {};
        setFullName(meta.full_name || '');
        setDepartment(meta.department || '');
        setAvatarFrame(meta.avatar_frame || 'none');

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
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // Close on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const getInitials = () => {
    if (fullName) {
      const p = fullName.trim().split(' ');
      return p.length > 1 ? (p[0][0] + p[p.length - 1][0]).toUpperCase() : fullName.substring(0, 2).toUpperCase();
    }
    return email ? email.substring(0, 2).toUpperCase() : 'JS';
  };

  // Upload to Supabase Storage
  const uploadFile = async (file: File): Promise<string | null> => {
    if (!userId) return null;
    setIsUploading(true);
    setUploadError('');
    try {
      const ext = file.name.split('.').pop() || 'png';
      const path = `${userId}/avatar.${ext}`;

      const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
      if (error) { setUploadError('Upload thất bại: ' + error.message); return null; }

      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      return data.publicUrl + `?t=${Date.now()}`;
    } catch { setUploadError('Lỗi upload, vui lòng thử lại.'); return null; }
    finally   { setIsUploading(false); }
  };

  const processFile = async (file: File) => {
    if (!file.type.startsWith('image/')) { setUploadError('Chỉ hỗ trợ GIF, PNG, JPG, WebP'); return; }
    const url = await uploadFile(file);
    if (url) setAvatarUrl(url);
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!userId) return;
    setIsSaving(true); setSaveSuccess(false);
    try {
      await supabase.from('users').update({ avatars: avatarUrl }).eq('id', userId);
      await supabase.auth.updateUser({ data: { full_name: fullName, department, avatar_frame: avatarFrame } });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } finally { setIsSaving(false); }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* ── Trigger ── */}
      <button
        onClick={() => setIsOpen(v => !v)}
        className="flex items-center gap-1.5 focus:outline-none group"
      >
        <div className="transition-transform duration-300 group-hover:scale-110">
          <AvatarDisplay avatarUrl={avatarUrl} initials={getInitials()} frame={avatarFrame} size={44} />
        </div>
        <ChevronDown
          size={13}
          className={`text-text-muted transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* ── Dropdown ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="absolute right-0 mt-3 w-[320px] bg-white/95 backdrop-blur-xl border border-gray-200/60 rounded-2xl shadow-2xl z-50 p-5 text-left"
          >
            {/* Profile header */}
            <div className="flex items-center gap-3 pb-4 mb-4 border-b border-gray-100">
              <AvatarDisplay avatarUrl={avatarUrl} initials={getInitials()} frame={avatarFrame} size={52} />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-text text-sm truncate">{fullName || t('profile.guest')}</p>
                <p className="text-[11px] text-text-muted truncate">{email}</p>
                {department && <p className="text-[11px] text-primary font-medium truncate">{department}</p>}
                <div className="flex gap-1.5 mt-1.5">
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase tracking-wider">
                    {role.replace('marketer_', '')}
                  </span>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    status === 'active' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-700'
                  }`}>{status}</span>
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
                  <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-text"
                    placeholder="Nguyễn Văn A" />
                </div>

                {/* Department */}
                <div>
                  <label className="block text-[11px] font-semibold text-text-muted mb-1">{t('profile.department')}</label>
                  <input type="text" value={department} onChange={e => setDepartment(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-text"
                    placeholder="Marketing, Content, Design..." />
                </div>

                {/* Avatar Upload */}
                <div>
                  <label className="block text-[11px] font-semibold text-text-muted mb-1">{t('profile.avatarUrl')}</label>
                  <input type="file" ref={fileInputRef} accept="image/gif,image/png,image/jpeg,image/webp"
                    className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f); e.target.value = ''; }} />

                  {/* Drop zone */}
                  <div
                    onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={e => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files?.[0]; if (f) processFile(f); }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-3 text-center cursor-pointer transition-all flex flex-col items-center gap-1 mb-2 ${
                      isDragging ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-primary/40 hover:bg-gray-50'
                    }`}
                  >
                    {isUploading ? (
                      <><Loader2 size={16} className="text-primary animate-spin" /><span className="text-[11px] text-primary font-semibold">Đang upload...</span></>
                    ) : (
                      <><Upload size={15} className={isDragging ? 'text-primary' : 'text-text-muted'} />
                        <span className="text-[11px] font-medium text-text-muted">{isDragging ? 'Thả vào đây!' : 'Kéo thả hoặc click để chọn'}</span>
                        <span className="text-[9px] text-text-muted/60">GIF · PNG · JPG · WebP</span>
                      </>
                    )}
                  </div>

                  {uploadError && <div className="flex items-center gap-1 text-red-500 text-[11px] mb-2"><X size={11}/>{uploadError}</div>}

                  <input type="text" value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-[11px] focus:outline-none focus:ring-2 focus:ring-primary/20 text-text"
                    placeholder="Hoặc nhập link ảnh trực tiếp..." />

                  {/* Preset GIFs */}
                  <div className="mt-2">
                    <span className="text-[10px] text-text-muted block mb-1.5">{t('profile.clickToSelectPreset')}</span>
                    <div className="flex gap-2 items-center">
                      {PRESET_GIFS.map((g, i) => (
                        <button key={i} type="button" onClick={() => setAvatarUrl(g.url)} title={g.name}
                          className={`w-9 h-9 rounded-lg overflow-hidden border-2 transition-all hover:scale-110 ${
                            avatarUrl === g.url ? 'border-primary ring-1 ring-primary' : 'border-gray-200 hover:border-primary/50'
                          }`}>
                          <img src={g.url} alt={g.name} className="w-full h-full object-cover" />
                        </button>
                      ))}
                      {avatarUrl && (
                        <button type="button" onClick={() => setAvatarUrl('')}
                          className="w-9 h-9 rounded-lg border-2 border-dashed border-gray-200 hover:border-red-300 hover:bg-red-50 flex items-center justify-center transition-all">
                          <X size={14} className="text-gray-400 hover:text-red-400" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Frame selector */}
                <div>
                  <label className="block text-[11px] font-semibold text-text-muted mb-1.5">{t('profile.avatarFrame')}</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {FRAMES.map(({ key, label, icon, ringClass }) => (
                      <button key={key} type="button" onClick={() => setAvatarFrame(key)}
                        className={`text-[11px] px-2.5 py-2 rounded-xl border transition-all flex items-center gap-1.5 justify-between ${
                          avatarFrame === key
                            ? key === 'none'    ? 'border-primary bg-primary/5 text-primary font-bold'
                            : key === 'rainbow' ? 'border-purple-400 bg-purple-50 text-purple-700 font-bold'
                            : key === 'gold'    ? 'border-amber-400 bg-amber-50 text-amber-700 font-bold'
                            :                    'border-cyan-400 bg-cyan-50 text-cyan-700 font-bold'
                            : 'border-gray-100 hover:bg-gray-50 text-text-muted'
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          <span className={ringClass ? `text-[12px] ${key === 'rainbow' ? 'animate-spin-slow' : key === 'gold' ? 'animate-pulse' : 'animate-pulse'}` : 'text-[12px]'}>{icon}</span>
                          {t(`profile.${label}`)}
                        </span>
                        {avatarFrame === key && <Check size={10} />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Save */}
                <div className="pt-1">
                  <button type="submit" disabled={isSaving || isUploading}
                    className="w-full bg-gradient-to-r from-primary to-purple-600 text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/25 hover:opacity-90 transition-all disabled:opacity-50">
                    {isSaving
                      ? <><Loader2 size={14} className="animate-spin" />{t('profile.saving')}</>
                      : <><Sparkles size={13} className="animate-pulse" />{t('profile.saveChanges')}</>}
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
                <button type="submit" className="text-[11px] text-red-500 hover:text-red-600 font-semibold flex items-center gap-1.5">
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
