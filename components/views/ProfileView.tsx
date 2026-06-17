"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Check, Loader2, Sparkles, Upload, X, User, Briefcase, Mail, Shield, UserCheck } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';

const PRESET_GIFS = [
  { name: 'Sparkle Stars', url: 'https://media.giphy.com/media/L8n8gU7n2gRBs1eTgd/giphy.gif' },
  { name: 'Cyber Neon',    url: 'https://media.giphy.com/media/l41JWR8v5J77O0u4w/giphy.gif'  },
  { name: 'Pixel Cat',     url: 'https://media.giphy.com/media/I17tZ21T4gnN9n2s5x/giphy.gif' },
];

const FRAMES = [
  { key: 'none',    label: 'frameNone',    icon: '○',  ringClass: '', description: 'Không sử dụng hiệu ứng khung viền' },
  { key: 'rainbow', label: 'frameRainbow', icon: '🌈', ringClass: 'ring-rainbow', description: 'Viền cầu vồng chuyển động xoay 360 độ liên tục' },
  { key: 'gold',    label: 'frameGold',    icon: '✨', ringClass: 'ring-gold', description: 'Viền hoàng gia lấp lánh sang trọng' },
  { key: 'cyber',   label: 'frameCyber',   icon: '⚡', ringClass: 'ring-cyber', description: 'Khung neon Cyberpunk nhấp nháy công nghệ' },
];

function getRingClass(frame: string) {
  return FRAMES.find(f => f.key === frame)?.ringClass ?? '';
}

function AvatarPreview({
  avatarUrl, initials, frame, size = 160,
}: { avatarUrl: string; initials: string; frame: string; size?: number }) {
  const ringClass = getRingClass(frame);
  const pad = 6; // Dày hơn một chút cho bản preview lớn

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      {/* Glow effect ở xa */}
      {ringClass && (
        <div
          className={`absolute rounded-full opacity-60 blur-md ${ringClass}`}
          style={{ inset: -pad * 2, borderRadius: '50%' }}
        />
      )}
      {/* Ring chính ngay sát avatar */}
      {ringClass && (
        <div
          className={`absolute rounded-full ${ringClass}`}
          style={{ inset: -pad, borderRadius: '50%' }}
        />
      )}
      {/* Avatar ở trên */}
      <div
        className="absolute inset-0 rounded-full overflow-hidden flex items-center justify-center bg-gray-100 border-4 border-white shadow-inner"
        style={{ zIndex: 1 }}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt="Avatar Preview"
            className="w-full h-full object-cover select-none"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <span className="text-gray-500 font-extrabold select-none" style={{ fontSize: size * 0.35 }}>
            {initials}
          </span>
        )}
      </div>
      {/* Hiệu ứng hạt lấp lánh bay nhảy quanh khung */}
      {ringClass && (
        <>
          <span className="absolute text-lg animate-bounce pointer-events-none" style={{ top: -12, right: -12, zIndex: 2, animationDelay: '0s' }}>✨</span>
          <span className="absolute text-sm animate-pulse pointer-events-none" style={{ bottom: -6, left: -10, zIndex: 2, animationDelay: '0.5s' }}>⭐</span>
          <span className="absolute text-xs animate-bounce pointer-events-none" style={{ top: '40%', left: -14, zIndex: 2, animationDelay: '0.8s' }}>✨</span>
        </>
      )}
    </div>
  );
}

export default function ProfileView() {
  const { t } = useLanguage();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const getInitials = () => {
    if (fullName) {
      const p = fullName.trim().split(' ');
      return p.length > 1 ? (p[0][0] + p[p.length - 1][0]).toUpperCase() : fullName.substring(0, 2).toUpperCase();
    }
    return email ? email.substring(0, 2).toUpperCase() : 'JS';
  };

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
    } catch {
      setUploadError('Lỗi upload, vui lòng thử lại.');
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const processFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setUploadError('Chỉ hỗ trợ GIF, PNG, JPG, WebP');
      return;
    }
    const url = await uploadFile(file);
    if (url) setAvatarUrl(url);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await supabase.from('users').update({ avatars: avatarUrl }).eq('id', userId);
      await supabase.auth.updateUser({ data: { full_name: fullName, department, avatar_frame: avatarFrame } });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <span className="text-sm text-text-muted font-medium">{t('common.loading')}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Title Header */}
      <div className="mt-2">
        <h1 className="text-4xl font-bold text-text mb-1 tracking-tight flex items-center gap-2">
          <span>{t('profile.title')}</span>
          <span className="text-sm bg-primary/10 text-primary px-3 py-1 rounded-full font-semibold uppercase tracking-wider">
            Lumina Engine
          </span>
        </h1>
        <p className="text-text-muted">Cá nhân hóa tài khoản của bạn với hiệu ứng và ảnh đại diện cực kỳ bắt mắt.</p>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-12 gap-8 items-stretch">
        {/* Cột Trái: Live Preview & Profile Badges */}
        <div className="col-span-12 lg:col-span-4 bg-white border border-gray-200/60 rounded-[32px] p-8 flex flex-col items-center justify-center text-center shadow-sm relative overflow-hidden">
          {/* Background Gradient lung linh */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-purple-500/5 to-transparent pointer-events-none" />
          
          <div className="relative z-10 flex flex-col items-center">
            {/* Avatar Preview */}
            <div className="mb-6 flex justify-center items-center">
              <AvatarPreview avatarUrl={avatarUrl} initials={getInitials()} frame={avatarFrame} size={160} />
            </div>

            {/* Profile Info Display */}
            <h2 className="text-2xl font-black text-text tracking-tight mb-1">
              {fullName || t('profile.guest')}
            </h2>
            <p className="text-xs text-text-muted font-medium mb-3 flex items-center gap-1.5 justify-center">
              <Mail size={12} className="text-gray-400" />
              {email}
            </p>

            {department && (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#F3F4FD] text-primary border border-primary/10 text-xs font-bold rounded-full mb-6">
                <Briefcase size={12} />
                {department}
              </span>
            )}

            {/* Account Badges */}
            <div className="w-full border-t border-gray-100 pt-6 flex flex-col gap-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-text-muted flex items-center gap-1.5 font-medium">
                  <Shield size={13} className="text-gray-400" />
                  {t('profile.roleLabel')}:
                </span>
                <span className="font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full uppercase tracking-wider text-[10px]">
                  {role.replace('marketer_', '')}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-text-muted flex items-center gap-1.5 font-medium">
                  <UserCheck size={13} className="text-gray-400" />
                  {t('profile.statusLabel')}:
                </span>
                <span className={`font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider text-[10px] ${
                  status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {status}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Cột Phải: Form Chỉnh Sửa Thông Tin & Tải Avatar/Khung */}
        <div className="col-span-12 lg:col-span-8 bg-white border border-gray-200/60 rounded-[32px] p-8 shadow-sm flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Display Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-text-muted flex items-center gap-1.5">
                <User size={14} className="text-primary" />
                {t('profile.displayName')}
              </label>
              <input 
                type="text" 
                value={fullName} 
                onChange={e => setFullName(e.target.value)}
                className="w-full bg-gray-50/50 hover:bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-text transition-all font-semibold"
                placeholder="Ví dụ: Trung Lê Hải" 
              />
            </div>

            {/* Department */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-text-muted flex items-center gap-1.5">
                <Briefcase size={14} className="text-primary" />
                {t('profile.department')}
              </label>
              <input 
                type="text" 
                value={department} 
                onChange={e => setDepartment(e.target.value)}
                className="w-full bg-gray-50/50 hover:bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-text transition-all font-semibold"
                placeholder="Ví dụ: Marketing, Content Creator..." 
              />
            </div>
          </div>

          {/* Kéo thả ảnh & preset */}
          <div className="border-t border-gray-100 pt-6">
            <h3 className="text-sm font-bold text-text mb-3 flex items-center gap-2">
              <span>🖼️ Tải lên Ảnh Đại diện & GIF</span>
            </h3>
            
            {/* Dropzone */}
            <input 
              type="file" 
              ref={fileInputRef} 
              accept="image/gif,image/png,image/jpeg,image/webp"
              className="hidden" 
              onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f); e.target.value = ''; }} 
            />
            <div
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={e => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files?.[0]; if (f) processFile(f); }}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center gap-2 ${
                isDragging 
                  ? 'border-primary bg-primary/5 scale-[1.01]' 
                  : 'border-gray-200 hover:border-primary/40 hover:bg-gray-50/50'
              }`}
            >
              {isUploading ? (
                <>
                  <Loader2 size={24} className="text-primary animate-spin" />
                  <span className="text-xs text-primary font-bold">Đang tải tệp tin lên hệ thống...</span>
                </>
              ) : (
                <>
                  <Upload size={24} className={isDragging ? 'text-primary' : 'text-gray-400'} />
                  <span className="text-xs font-bold text-text">
                    {isDragging ? 'Thả tệp tin vào đây ngay!' : 'Kéo thả ảnh động (GIF) hoặc click để chọn từ thiết bị'}
                  </span>
                  <span className="text-[10px] text-text-muted font-medium">Hỗ trợ các định dạng: GIF, PNG, JPG, WebP</span>
                </>
              )}
            </div>

            {uploadError && (
              <div className="flex items-center gap-1.5 text-red-500 text-xs font-bold mt-2">
                <X size={14} /> {uploadError}
              </div>
            )}

            {/* URL input */}
            <div className="mt-3">
              <input 
                type="text" 
                value={avatarUrl} 
                onChange={e => setAvatarUrl(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 text-text font-medium"
                placeholder="Hoặc bạn có thể dán đường dẫn ảnh trực tuyến (https://...)" 
              />
            </div>

            {/* Presets */}
            <div className="mt-4 flex flex-col gap-2">
              <span className="text-xs font-bold text-text-muted">{t('profile.clickToSelectPreset')}</span>
              <div className="flex gap-3 items-center">
                {PRESET_GIFS.map((g, i) => (
                  <button 
                    key={i} 
                    type="button" 
                    onClick={() => setAvatarUrl(g.url)} 
                    title={g.name}
                    className={`w-12 h-12 rounded-xl overflow-hidden border-2 transition-all hover:scale-110 ${
                      avatarUrl === g.url 
                        ? 'border-primary ring-2 ring-primary/20 scale-105 shadow-sm' 
                        : 'border-gray-200 hover:border-primary/50'
                    }`}
                  >
                    <img src={g.url} alt={g.name} className="w-full h-full object-cover" />
                  </button>
                ))}
                {avatarUrl && (
                  <button 
                    type="button" 
                    onClick={() => setAvatarUrl('')} 
                    className="w-12 h-12 rounded-xl border-2 border-dashed border-gray-200 hover:border-red-300 hover:bg-red-50 flex items-center justify-center transition-all group"
                    title="Xóa avatar"
                  >
                    <X size={16} className="text-gray-400 group-hover:text-red-500 transition-colors" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Chọn Khung */}
          <div className="border-t border-gray-100 pt-6">
            <h3 className="text-sm font-bold text-text mb-3 flex items-center gap-2">
              <span>✨ {t('profile.avatarFrame')}</span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {FRAMES.map(({ key, label, icon, ringClass, description }) => {
                const active = avatarFrame === key;
                let borderCls = 'border-gray-100 hover:bg-gray-50 hover:border-gray-200';
                if (active) {
                  if (key === 'none') borderCls = 'border-primary bg-primary/5 ring-1 ring-primary';
                  if (key === 'rainbow') borderCls = 'border-purple-400 bg-purple-50 ring-1 ring-purple-400';
                  if (key === 'gold') borderCls = 'border-amber-400 bg-amber-50 ring-1 ring-amber-400';
                  if (key === 'cyber') borderCls = 'border-cyan-400 bg-cyan-50 ring-1 ring-cyan-400';
                }

                return (
                  <button 
                    key={key} 
                    type="button" 
                    onClick={() => setAvatarFrame(key)}
                    className={`text-left p-4 rounded-2xl border transition-all flex items-start gap-3 justify-between ${borderCls}`}
                  >
                    <div className="flex gap-3 items-center">
                      <div className="w-9 h-9 rounded-full bg-gray-100/80 flex items-center justify-center text-lg select-none shrink-0 relative overflow-hidden">
                        {ringClass && (
                          <div className={`absolute inset-0 rounded-full scale-105 opacity-80 ${ringClass}`} />
                        )}
                        <span className="relative z-10">{icon}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className={`text-xs font-bold ${active ? 'text-text' : 'text-text-muted'}`}>
                          {t(`profile.${label}`)}
                        </span>
                        <span className="text-[10px] text-text-muted/80 leading-tight mt-0.5">
                          {description}
                        </span>
                      </div>
                    </div>
                    {active && (
                      <span className="shrink-0 mt-0.5 text-primary">
                        <Check size={14} className="stroke-[3]" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form Actions */}
          <div className="border-t border-gray-100 pt-6 flex flex-col md:flex-row items-center justify-between gap-4 mt-auto">
            <p className="text-[11px] text-text-muted/80 font-medium">
              * Thay đổi sẽ được cập nhật đồng bộ ngay lập tức và lưu trữ vĩnh viễn trên Supabase Cloud.
            </p>
            <div className="flex gap-3 w-full md:w-auto">
              <button 
                type="submit" 
                disabled={isSaving || isUploading}
                className="w-full md:w-auto px-6 bg-gradient-to-r from-primary to-purple-600 hover:from-primary-hover hover:to-purple-700 text-white font-bold py-3 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>{t('profile.saving')}</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={14} className="animate-pulse" />
                    <span>{t('profile.saveChanges')}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <AnimatePresence>
            {saveSuccess && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0 }}
                className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-emerald-800 text-xs font-semibold flex items-center gap-2 justify-center shadow-sm"
              >
                ✓ {t('profile.saved')}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </form>
    </div>
  );
}
