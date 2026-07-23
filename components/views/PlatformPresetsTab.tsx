import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Plus, Pencil, Trash2, X, Loader2, Save, FileText, CheckCircle2, Star, ChevronDown } from 'lucide-react';
import { getDefaultTemplateForPlatform } from '@/lib/utils/presetParser';

interface PlatformPreset {
  id: string;
  user_id?: string | null;
  platform: 'facebook' | 'instagram' | 'thread';
  name: string;
  rules: string;
  is_default: boolean;
}

const platforms = [
  { id: 'facebook', label: 'Facebook' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'thread', label: 'Threads' }
] as const;

export default function PlatformPresetsTab() {
  const { language } = useLanguage();
  const [activePlatform, setActivePlatform] = useState<'facebook' | 'instagram' | 'thread'>('facebook');
  const [presets, setPresets] = useState<PlatformPreset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editItem, setEditItem] = useState<PlatformPreset | null>(null);
  
  // Form states
  const [formPlatform, setFormPlatform] = useState<'facebook' | 'instagram' | 'thread'>('facebook');
  const [name, setName] = useState('');
  const [rules, setRules] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fetchPresets = async (platform: 'facebook' | 'instagram' | 'thread') => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/platform-presets?platform=${platform}`, {
        credentials: 'same-origin',
      });
      if (res.ok) {
        const json = await res.json();
        setPresets(json.data || []);
      } else {
        const errorJson = await res.json().catch(() => null);
        console.error('[PlatformPresetsTab] fetch presets error', res.status, errorJson);
      }
    } catch (err) {
      console.error('Failed to fetch presets:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void (async () => {
      await fetchPresets(activePlatform);
    })();
  }, [activePlatform]);

  const handleOpenEdit = (preset?: PlatformPreset) => {
    if (preset) {
      if (!preset.user_id) {
        alert(language === 'vi' ? 'Không thể chỉnh sửa quy chuẩn gốc của hệ thống.' : 'Cannot edit system preset.');
        return;
      }
      setEditItem(preset);
      setFormPlatform(preset.platform);
      setName(preset.name);
      setRules(preset.rules);
      setIsDefault(preset.is_default);
    } else {
      setEditItem(null);
      setFormPlatform(activePlatform);
      setName('');
      setRules(getDefaultTemplateForPlatform(activePlatform));
      setIsDefault(false);
    }
    setIsEditing(true);
  };

  const handleCloseEdit = () => {
    setIsEditing(false);
    setEditItem(null);
  };

  const handleSave = async () => {
    if (!name.trim() || !rules.trim()) {
      alert(language === 'vi' ? 'Vui lòng nhập tên và nội dung quy tắc.' : 'Please enter name and rules content.');
      return;
    }

    setIsSaving(true);
    try {
      const url = editItem ? `/api/platform-presets/${editItem.id}` : '/api/platform-presets';
      const method = editItem ? 'PUT' : 'POST';
      
      const payload = editItem 
        ? { name: name.trim(), rules: rules.trim(), is_default: isDefault }
        : { platform: formPlatform, name: name.trim(), rules: rules.trim(), is_default: isDefault };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        console.error('[PlatformPresetsTab] save preset error', res.status, err);
        throw new Error(err?.error || 'Failed to save');
      }

      if (formPlatform !== activePlatform) {
        setActivePlatform(formPlatform);
      } else {
        await fetchPresets(activePlatform);
      }
      handleCloseEdit();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error saving preset';
      alert(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSetDefault = async (preset: PlatformPreset) => {
    try {
      const res = await fetch(`/api/platform-presets/${preset.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ is_default: true }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || 'Failed to update default preset');
      }

      await fetchPresets(activePlatform);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error updating preset';
      alert(message);
    }
  };

  const handleDelete = async (preset: PlatformPreset) => {
    if (!preset.user_id) {
      alert(language === 'vi' ? 'Không thể xóa quy chuẩn hệ thống.' : 'Cannot delete system preset.');
      return;
    }

    if (!confirm(language === 'vi' ? 'Bạn có chắc chắn muốn xóa quy chuẩn này?' : 'Are you sure you want to delete this preset?')) {
      return;
    }

    try {
      const res = await fetch(`/api/platform-presets/${preset.id}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      });

      if (!res.ok) {
        throw new Error('Failed to delete');
      }

      await fetchPresets(activePlatform);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error deleting preset';
      alert(message);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-bold text-text flex items-center gap-2">
          <FileText size={20} className="text-primary" />
          {language === 'vi' ? 'Thư Viện Quy Chuẩn Kênh Đăng' : 'Platform Presets Library'}
        </h2>
        <p className="text-sm text-text-muted">
          {language === 'vi' 
            ? 'Cấu hình các quy chuẩn cá nhân hóa để AI học theo phong cách riêng của bạn khi viết bài cho từng kênh mạng xã hội.'
            : 'Configure personalized rules to let AI adapt to your specific style for each social platform.'}
        </p>
      </div>

      {/* Platform Controls: Tabs & Select */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-100 dark:bg-slate-800/50 p-2 rounded-2xl border border-slate-200 dark:border-white/5">
        {/* Button Tabs */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto hide-scrollbar">
          {platforms.map(platform => (
            <button
              key={platform.id}
              onClick={() => setActivePlatform(platform.id)}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all whitespace-nowrap min-w-[100px] ${
                activePlatform === platform.id
                  ? 'bg-white dark:bg-black text-primary shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              {platform.label}
            </button>
          ))}
        </div>

        {/* Platform Dropdown Select */}
        <div className="relative w-full sm:w-56">
          <select
            value={activePlatform}
            onChange={(e) => setActivePlatform(e.target.value as any)}
            className="w-full h-10 pl-3.5 pr-8 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer appearance-none shadow-sm"
          >
            {platforms.map(p => (
              <option key={p.id} value={p.id}>
                {language === 'vi' ? `Kênh: ${p.label}` : `Platform: ${p.label}`}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Add new button */}
      <div className="flex justify-between items-center mt-2">
        <h3 className="font-bold text-text flex items-center gap-2">
          <span>{language === 'vi' ? 'Danh sách quy chuẩn' : 'List of rules'}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
            {presets.length}
          </span>
        </h3>
        <button
          onClick={() => handleOpenEdit()}
          className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-xl font-bold text-sm transition-all flex items-center gap-2 shadow-sm shadow-primary/20"
        >
          <Plus size={16} />
          {language === 'vi' ? 'Thêm quy chuẩn' : 'Add preset'}
        </button>
      </div>

      {/* List Presets */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
          <Loader2 className="animate-spin mb-3 text-primary" size={32} />
          <p className="text-sm font-medium">Đang tải...</p>
        </div>
      ) : presets.length === 0 ? (
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-8 border border-slate-200 dark:border-white/5 text-center flex flex-col items-center">
          <div className="w-16 h-16 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center text-slate-400 mb-4">
            <FileText size={24} />
          </div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Chưa có quy chuẩn nào</h3>
          <p className="text-slate-500 text-sm max-w-sm mb-6">
            {language === 'vi' 
              ? `Bạn chưa tạo quy chuẩn cá nhân nào cho ${platforms.find(p => p.id === activePlatform)?.label}.`
              : `No custom rules created yet for ${platforms.find(p => p.id === activePlatform)?.label}.`}
          </p>
          <button
            onClick={() => handleOpenEdit()}
            className="bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 shadow-sm"
          >
            <Plus size={16} />
            {language === 'vi' ? 'Tạo quy chuẩn đầu tiên' : 'Create first preset'}
          </button>
        </div>
      ) : (() => {
        const activeDefaultPreset = presets.find(p => p.user_id && p.is_default) || presets.find(p => p.is_default);
        const activeDefaultId = activeDefaultPreset?.id;

        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {presets.map(preset => {
              const isEffectiveDefault = preset.id === activeDefaultId;
              return (
                <div 
                  key={preset.id} 
                  className={`bg-white dark:bg-card/40 border rounded-2xl p-5 flex flex-col gap-3 group transition-all shadow-sm relative ${
                    isEffectiveDefault 
                      ? 'border-emerald-500/50 dark:border-emerald-500/30 ring-1 ring-emerald-500/20 bg-emerald-50/10 dark:bg-emerald-950/5' 
                      : 'border-slate-200 dark:border-white/10 hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-bold text-text text-base truncate max-w-[180px]">{preset.name}</h4>
                      
                      {!preset.user_id ? (
                        <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">
                          Hệ thống
                        </span>
                      ) : (
                        <span className="bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">
                          Cá nhân
                        </span>
                      )}

                      {/* Default Tag Badge */}
                      {isEffectiveDefault ? (
                        <span className="bg-emerald-500 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-sm shadow-emerald-500/30">
                          <CheckCircle2 size={11} /> Mặc định
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSetDefault(preset)}
                          className="opacity-75 group-hover:opacity-100 bg-slate-100 hover:bg-emerald-100 dark:bg-slate-800 dark:hover:bg-emerald-950/50 text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full transition-all flex items-center gap-1"
                          title="Bấm để đặt làm quy chuẩn mặc định"
                        >
                          <Star size={10} /> Đặt làm mặc định
                        </button>
                      )}
                    </div>
                
                {/* Actions */}
                {preset.user_id && (
                  <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleOpenEdit(preset)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                      title="Sửa"
                    >
                      <Pencil size={14} />
                    </button>
                    <button 
                      onClick={() => handleDelete(preset)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      title="Xóa"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
              
              <div className="bg-slate-50 dark:bg-black/30 rounded-xl p-3 border border-slate-100 dark:border-white/5 flex-1">
                <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-4 leading-relaxed whitespace-pre-wrap">
                  {preset.rules}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    );
  })()}

      {/* Add / Edit Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-white/5">
              <h3 className="text-lg font-bold text-text flex items-center gap-2">
                <FileText size={18} className="text-primary" />
                {editItem 
                  ? (language === 'vi' ? 'Chỉnh sửa quy chuẩn' : 'Edit preset') 
                  : (language === 'vi' ? 'Thêm quy chuẩn mới' : 'Add new preset')}
              </h3>
              <button
                onClick={handleCloseEdit}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-500 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 flex-1 overflow-y-auto flex flex-col gap-4">
              {/* Platform Select */}
              {!editItem && (
                <div>
                  <label className="block text-sm font-bold text-text mb-1.5">
                    Nền tảng mạng xã hội <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={formPlatform}
                      onChange={(e) => {
                        const newPlatform = e.target.value as 'facebook' | 'instagram' | 'thread';
                        setFormPlatform(newPlatform);
                        if (!name) {
                          setRules(getDefaultTemplateForPlatform(newPlatform));
                        }
                      }}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm font-medium text-text focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all appearance-none cursor-pointer"
                    >
                      {platforms.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-sm font-bold text-text mb-1.5">
                  Tên quy chuẩn <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ví dụ: Dạng ngắn, Phong cách GenZ, Chuyên sâu 5000 từ..."
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm font-medium text-text focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>

              {/* Rules */}
              <div>
                <label className="block text-sm font-bold text-text mb-1.5">
                  Nội dung quy tắc <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={rules}
                  onChange={(e) => setRules(e.target.value)}
                  placeholder="Mô tả chi tiết các yêu cầu cho AI (độ dài, hashtag, emoji, cách chia đoạn...)"
                  className="w-full h-72 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-medium text-text focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all resize-y"
                />
              </div>

              {/* Is Default Toggle */}
              <label className="flex items-center gap-3 cursor-pointer mt-2 p-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="w-5 h-5 rounded text-primary border-slate-300 dark:border-slate-600 focus:ring-primary dark:bg-black cursor-pointer"
                />
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200 select-none">
                  Đặt làm mặc định cho nền tảng {platforms.find(p => p.id === formPlatform)?.label}
                </span>
              </label>
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-slate-100 dark:border-white/5 flex justify-end gap-3 bg-slate-50 dark:bg-black/20 rounded-b-2xl">
              <button
                onClick={handleCloseEdit}
                disabled={isSaving}
                className="px-5 py-2.5 rounded-xl font-bold text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-2.5 rounded-xl font-bold text-sm bg-primary text-white hover:bg-primary/90 flex items-center gap-2 transition-all shadow-sm shadow-primary/20"
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {isSaving ? 'Đang lưu...' : 'Lưu quy chuẩn'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

