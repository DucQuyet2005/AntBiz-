'use client';

import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Search, Plus, Check, Facebook, Instagram, Bookmark, Info } from 'lucide-react';
import { Preset } from '@/lib/services/creator/preset.service';

// Custom SVG Logo for Threads
const ThreadsIcon = ({ className = '', size = 16 }: { className?: string; size?: number }) => (
  <svg viewBox="0 0 192 192" width={size} height={size} className={className} fill="currentColor">
    <path d="M141.537 88.9883C140.71 88.5919 139.87 88.2104 139.019 87.8451C137.537 60.5382 122.616 44.905 97.5619 44.745C97.4484 44.7443 97.3355 44.7443 97.222 44.7443C82.2364 44.7443 69.7731 51.1409 62.102 62.7807L75.881 72.2328C81.6116 63.5383 90.6052 61.6848 97.2286 61.6848C97.3051 61.6848 97.3819 61.6848 97.4576 61.6855C105.707 61.7381 111.932 64.1366 115.961 68.814C118.893 72.2193 120.854 76.925 121.825 82.8638C114.511 81.6207 106.601 81.2385 98.145 81.7233C74.3247 83.0954 59.0111 96.9879 60.0396 116.292C60.5615 126.084 65.4397 134.508 73.775 140.011C80.8224 144.663 89.899 146.938 99.3323 146.423C111.79 145.74 121.563 140.987 128.381 132.296C133.559 125.696 136.834 117.143 138.28 106.366C144.217 109.949 148.617 114.664 151.047 120.332C155.179 129.967 155.42 145.8 142.501 158.708C131.182 170.016 117.576 174.908 97.0135 175.059C74.2042 174.89 56.9538 167.575 45.7381 153.317C35.2355 139.966 29.8077 120.682 29.6052 96C29.8077 71.3178 35.2355 52.0336 45.7381 38.6827C56.9538 24.4249 74.2039 17.11 97.0132 16.9405C119.988 17.1113 137.539 24.4614 149.184 38.788C154.894 45.8136 159.199 54.6488 162.037 64.9503L178.184 60.6422C174.744 47.9622 169.331 37.0357 161.965 27.974C147.036 9.60668 125.202 0.195148 97.0695 0H96.9569C68.8816 0.19447 47.2921 9.6418 32.7883 28.0793C19.8819 44.4864 13.2244 67.3157 13.0007 95.9325L13 96L13.0007 96.0675C13.2244 124.684 19.8819 147.514 32.7883 163.921C47.2921 182.358 68.8816 191.806 96.9569 192H97.0695C122.03 191.827 139.624 185.292 154.118 170.811C173.081 151.866 172.51 128.119 166.26 113.541C161.776 103.087 153.227 94.5962 141.537 88.9883ZM98.4405 129.507C88.0005 130.095 77.1544 125.409 76.6196 115.372C76.2232 107.93 81.9158 99.626 99.0812 98.6368C101.047 98.5234 102.976 98.468 104.871 98.468C111.106 98.468 116.939 99.0737 122.242 100.233C120.264 124.935 108.662 128.946 98.4405 129.507Z" />
  </svg>
);

interface Step3PresetsProps {
  presets: Preset[];
  selectedPresetId: string | null;
  searchQuery: string;
  onSelect: (presetId: string | null) => void;
  onSearch: (query: string) => void;
}

export default function Step3Presets({
  presets,
  selectedPresetId,
  searchQuery,
  onSelect,
  onSearch,
}: Step3PresetsProps) {
  const { t } = useLanguage();
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Helper to resolve pastel color classes based on tag keyword meaning
  const getTagColorClass = (tag: string) => {
    const text = tag.toLowerCase();
    if (text.includes('tương tác')) return 'bg-orange-50 dark:bg-orange-950/20 text-orange-700 dark:text-orange-400 border border-orange-100 dark:border-orange-900/30';
    if (text.includes('sự kiện') || text.includes('báo')) return 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-900/30';
    if (text.includes('chuyên gia') || text.includes('uy quyền')) return 'bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 border border-green-100 dark:border-green-900/30';
    if (text.includes('kiến thức') || text.includes('sáng tạo')) return 'bg-purple-50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-400 border border-purple-100 dark:border-purple-900/30';
    if (text.includes('bán')) return 'bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30';
    return 'bg-gray-50 dark:bg-zinc-800 text-gray-700 dark:text-gray-400 border border-gray-100 dark:border-zinc-700/50';
  };

  const getPlatformIcon = (platform: string) => {
    if (platform === 'facebook') return <Facebook className="w-3.5 h-3.5 text-[#1877F2]" />;
    if (platform === 'instagram') return <Instagram className="w-3.5 h-3.5 text-[#E1306C]" />;
    if (platform === 'threads') return <ThreadsIcon className="text-black dark:text-white" size={14} />;
    return null;
  };

  // Filter presets based on live search query
  const filteredPresets = presets.filter((preset) =>
    preset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    preset.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="w-full max-w-6xl mx-auto flex-1 flex flex-col justify-center py-6 px-4">
      {/* Outer Floating Card with rounded-3xl */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-800/80 rounded-3xl p-6 md:p-10 shadow-2xl relative">
        
        {/* Header Section */}
        <div className="flex flex-col items-center justify-center mb-8">
          <h1 className="text-3xl font-extrabold text-text text-center mb-2">
            {t('creator.step3.title')}
          </h1>
          <p className="text-text-muted text-base text-center max-w-lg">
            {t('creator.step3.subtitle')}
          </p>
        </div>

        {/* Live Search Input */}
        <div className="relative max-w-2xl mx-auto mb-8">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-text-muted">
            <Search className="w-5 h-5" />
          </div>
          <input
            type="text"
            className="block w-full pl-12 pr-4 py-3.5 bg-gray-50 dark:bg-zinc-950 border border-gray-250 dark:border-zinc-800 rounded-full text-base text-text focus:ring-2 focus:ring-primary shadow-inner transition-all placeholder:text-text-muted/60"
            placeholder={t('creator.step3.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>

        {/* Optional Skip Preset Info bar */}
        <div 
          onClick={() => onSelect(null)}
          className={`max-w-2xl mx-auto mb-8 p-4 rounded-2xl border-2 flex items-start gap-3 cursor-pointer transition-all duration-200 ${
            selectedPresetId === null 
              ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
              : 'border-gray-200 dark:border-zinc-800/80 bg-gray-50 dark:bg-zinc-950 hover:bg-gray-100 dark:hover:bg-zinc-900/60'
          }`}
        >
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary mt-0.5">
            <Bookmark className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-text">{t('creator.step3.noPreset')}</h4>
            <p className="text-xs text-text-muted mt-0.5">{t('creator.step3.noPresetDesc')}</p>
          </div>
          {selectedPresetId === null && (
            <div className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center self-center">
              <Check className="w-3 h-3" />
            </div>
          )}
        </div>

        {/* Presets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Create Preset card - always first */}
          <button
            type="button"
            onClick={() => setShowCreateDialog(true)}
            className="group flex flex-col items-center justify-center p-8 rounded-3xl border-2 border-dashed border-gray-300 dark:border-zinc-700 bg-card hover:bg-primary/5 hover:border-primary/40 transition-all duration-300 min-h-[200px]"
          >
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-primary/20 transition-transform duration-300 text-primary">
              <Plus className="w-6 h-6" />
            </div>
            <span className="text-base font-bold text-primary group-hover:text-primary-hover transition-colors">
              {t('creator.buttons.createPreset')}
            </span>
          </button>

          {/* List items */}
          {filteredPresets.map((preset) => {
            const isSelected = selectedPresetId === preset.id;

            return (
              <div
                key={preset.id}
                onClick={() => onSelect(isSelected ? null : preset.id)}
                className={`bg-card rounded-3xl p-6 border-2 flex flex-col justify-between transition-all duration-300 cursor-pointer min-h-[200px] select-none hover:-translate-y-1 ${
                  isSelected
                    ? 'border-primary ring-2 ring-primary/20 shadow-md bg-white dark:bg-zinc-900'
                    : 'border-gray-250 dark:border-zinc-800 shadow-sm hover:shadow-md hover:border-gray-300 dark:hover:border-zinc-700'
                }`}
              >
                {/* Card Header (Platform icon + check) */}
                <div className="flex justify-between items-start mb-3">
                  <span className="inline-flex items-center gap-1.5 bg-gray-100 dark:bg-zinc-800 px-3 py-1 rounded-full text-xs font-semibold text-text">
                    {getPlatformIcon(preset.platform)}
                    <span className="capitalize">{preset.platform}</span>
                  </span>
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center">
                      <Check className="w-3 h-3" />
                    </div>
                  )}
                </div>

                {/* Preset Name */}
                <h3 className="text-lg font-bold text-text mb-4 leading-snug group-hover:text-primary transition-colors">
                  {preset.name}
                </h3>

                {/* Tag Pills */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {preset.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className={`inline-flex items-center text-[10px] md:text-xs px-2.5 py-1 rounded-full font-medium ${getTagColorClass(tag)}`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Footer (Date update) */}
                <div className="flex justify-between items-center pt-3 border-t border-gray-100 dark:border-zinc-800/80">
                  <span className="text-xs text-text-muted">
                    {t('creator.step3.lastUpdated', { date: preset.lastUpdated })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* dialog for create preset information/placeholder */}
      {showCreateDialog && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6 animate-scale-up text-center">
            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-4 text-blue-600 dark:text-blue-400">
              <Info className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-text mb-2">Trang Quản lý Presets</h3>
            <p className="text-sm text-text-muted mb-6 leading-relaxed">
              Theo định nghĩa hệ thống, các thao tác quản lý Presets (Thêm, Sửa, Xóa) nằm ở màn hình Cấu hình Presets riêng biệt. Chức năng khởi tạo này sẽ được bổ sung tại sprint tiếp theo.
            </p>
            <button
              onClick={() => setShowCreateDialog(false)}
              className="w-full bg-primary hover:bg-primary-hover text-white py-2.5 rounded-xl font-bold transition-all shadow-md active:scale-95 duration-100"
            >
              Đã hiểu
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
