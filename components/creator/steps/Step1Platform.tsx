"use client";

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { platformService } from '@/lib/services/creator/platform.service';
import { useCreatorFlow } from '@/contexts/CreatorFlowContext';
import { PlatformIcon } from '../shared/PlatformIcon';
import { Check } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { SocialPlatform } from '@/types/creator';
import { motion } from 'framer-motion';
import { StepFooter } from '../StepFooter';

const PLATFORM_COLORS = {
  facebook: 'text-blue-600 dark:text-blue-500',
  instagram: 'text-pink-600 dark:text-pink-500',
  threads: 'text-zinc-900 dark:text-white',
};

const PLATFORM_NAMES = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  threads: 'Threads',
};

export const Step1Platform = () => {
  const { selectedPlatform, setPlatform } = useCreatorFlow();
  const { language } = useLanguage();

  const { data: connectedPlatforms, isLoading } = useQuery({
    queryKey: ['connectedPlatforms'],
    queryFn: platformService.getConnectedPlatforms,
  });

  const platforms: SocialPlatform[] = ['facebook', 'threads', 'instagram'];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="max-w-4xl mx-auto px-4 pb-24"
    >
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold mb-3 text-slate-900 dark:text-white">
          {language === 'vi' ? 'Chọn nền tảng đăng bài' : 'Select Platform'}
        </h2>
        <p className="text-slate-500 dark:text-zinc-400">
          {language === 'vi' ? 'Chọn một nền tảng mà bạn muốn AI tạo nội dung.' : 'Choose a platform you want the AI to create content for.'}
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {platforms.map(platform => {
            const isConnected = connectedPlatforms?.includes(platform);
            const isSelected = selectedPlatform === platform;

            return (
              <button
                key={platform}
                onClick={() => setPlatform(platform)}
                disabled={!isConnected}
                className={`
                  relative flex flex-col items-center p-8 rounded-3xl transition-all duration-300
                  ${!isConnected ? 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-zinc-900 grayscale' : 'cursor-pointer'}
                  ${isSelected 
                    ? 'bg-primary/5 ring-2 ring-primary shadow-lg shadow-primary/10 -translate-y-1' 
                    : 'bg-white dark:bg-zinc-900 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/50 border border-slate-100 dark:border-zinc-800'
                  }
                `}
              >
                {/* Active Checkmark */}
                {isSelected && (
                  <div className="absolute top-4 right-4 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white shadow-md animate-in zoom-in">
                    <Check size={14} strokeWidth={3} />
                  </div>
                )}

                {/* Icon Container */}
                <div className={`
                  w-20 h-20 rounded-2xl flex items-center justify-center mb-4 transition-transform duration-300
                  ${isSelected ? 'scale-110 shadow-lg' : 'shadow-md'}
                  ${platform === 'facebook' ? 'bg-blue-50 dark:bg-blue-900/20' : 
                    platform === 'instagram' ? 'bg-pink-50 dark:bg-pink-900/20' : 
                    'bg-slate-100 dark:bg-zinc-800'}
                `}>
                  <PlatformIcon 
                    platform={platform} 
                    size={40} 
                    className={`${PLATFORM_COLORS[platform]}`}
                  />
                </div>

                <span className="font-bold text-lg text-slate-800 dark:text-zinc-100">
                  {PLATFORM_NAMES[platform]}
                </span>
                
                {!isConnected && (
                  <span className="text-xs text-rose-500 mt-2 font-medium bg-rose-50 dark:bg-rose-500/10 px-2 py-1 rounded-md">
                    {language === 'vi' ? 'Chưa liên kết' : 'Not connected'}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      <StepFooter 
        isNextDisabled={!selectedPlatform} 
        nextTooltip={language === 'vi' ? 'Vui lòng chọn 1 nền tảng' : 'Please select a platform'} 
      />
    </motion.div>
  );
};
