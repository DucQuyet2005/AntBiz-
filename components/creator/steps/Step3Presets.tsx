"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useCreatorFlow } from '@/contexts/CreatorFlowContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { StepFooter } from '../StepFooter';
import { Search, Plus, Check } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { presetService } from '@/lib/services/creator/preset.service';
import { PlatformIcon } from '../shared/PlatformIcon';
import { Preset } from '@/types/creator';

export const Step3Presets = () => {
  const { selectedPresetId, setPreset, selectedPlatform } = useCreatorFlow();
  const { language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: presets, isLoading } = useQuery({
    queryKey: ['presets'],
    queryFn: presetService.getPresets,
  });

  // Filter presets based on selected platform and search query
  const filteredPresets = presets?.filter(p => {
    const matchesPlatform = p.platform === selectedPlatform;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesPlatform && matchesSearch;
  }) || [];

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="max-w-5xl mx-auto px-4 pb-24"
    >
      <div className="bg-white dark:bg-zinc-950/50 rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-zinc-800 backdrop-blur-sm relative overflow-hidden">
        
        {/* Background Decorative Gradient */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-10 translate-x-1/2 -translate-y-1/2 pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
              {language === 'vi' ? 'Lựa chọn Presets' : 'Select Presets'}
            </h2>
            <p className="text-slate-500 dark:text-zinc-400 mt-2">
              {language === 'vi' ? 'Dùng mẫu có sẵn hoặc bỏ qua bước này.' : 'Use an existing preset or skip this step.'}
            </p>
          </div>
          
          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder={language === 'vi' ? "Tìm kiếm Presets..." : "Search Presets..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Create New Preset Card */}
            <button className="h-full min-h-[160px] flex flex-col items-center justify-center p-6 rounded-3xl border-2 border-dashed border-slate-200 dark:border-zinc-800 hover:border-primary hover:bg-primary/5 transition-all text-slate-500 hover:text-primary group">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-zinc-900 group-hover:bg-primary/10 flex items-center justify-center mb-3 transition-colors">
                <Plus size={24} />
              </div>
              <span className="font-bold">
                {language === 'vi' ? '+ Tạo Preset mới' : '+ Create New Preset'}
              </span>
            </button>

            {/* Presets List */}
            {filteredPresets.map(preset => {
              const isSelected = selectedPresetId === preset.id;
              
              return (
                <button
                  key={preset.id}
                  onClick={() => setPreset(isSelected ? null : preset.id)}
                  className={`
                    relative flex flex-col text-left p-6 rounded-3xl transition-all duration-300 border
                    ${isSelected 
                      ? 'border-primary ring-2 ring-primary/20 bg-primary/5 shadow-lg shadow-primary/5 -translate-y-1' 
                      : 'border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:shadow-xl hover:shadow-slate-200/50 hover:-translate-y-1'
                    }
                  `}
                >
                  {isSelected && (
                    <div className="absolute top-4 right-4 w-5 h-5 bg-primary rounded-full flex items-center justify-center text-white shadow-md animate-in zoom-in">
                      <Check size={12} strokeWidth={3} />
                    </div>
                  )}

                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-zinc-800 text-xs font-bold text-slate-600 dark:text-zinc-300">
                      <PlatformIcon platform={preset.platform} size={12} />
                      <span className="capitalize">{preset.platform}</span>
                    </div>
                  </div>

                  <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-3 pr-6">
                    {preset.name}
                  </h3>

                  <div className="flex flex-wrap gap-2 mt-auto">
                    {preset.tags.map((tag, idx) => {
                      // Simple pastel color assignment based on index
                      const colorClasses = [
                        'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
                        'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
                        'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
                        'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                      ];
                      const color = colorClasses[idx % colorClasses.length];
                      return (
                        <span key={idx} className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${color}`}>
                          {tag}
                        </span>
                      );
                    })}
                  </div>

                  <div className="text-[10px] text-slate-400 mt-4 text-right w-full">
                    Cập nhật: {new Date(preset.updatedAt).toLocaleDateString('vi-VN')}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <StepFooter />
    </motion.div>
  );
};
