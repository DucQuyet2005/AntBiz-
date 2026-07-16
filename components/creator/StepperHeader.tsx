"use client";

import React from 'react';
import { useCreatorFlow } from '@/contexts/CreatorFlowContext';
import { Check } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const stepsConfig = [
  { step: 1, labelEn: 'Platform', labelVi: 'Nền tảng' },
  { step: 2, labelEn: 'Article', labelVi: 'Bài viết' },
  { step: 3, labelEn: 'Presets', labelVi: 'Presets' },
  { step: 4, labelEn: 'Post', labelVi: 'Bài đăng' },
  { step: 5, labelEn: 'Schedule', labelVi: 'Lên lịch' },
];

export const StepperHeader = () => {
  const { step } = useCreatorFlow();
  const { language } = useLanguage();

  return (
    <div className="w-full max-w-4xl mx-auto mb-8 px-4">
      <div className="flex items-center justify-between relative">
        {/* Progress Line */}
        <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-slate-200 dark:bg-zinc-800 -z-10 transform -translate-y-1/2 rounded-full" />
        <div 
          className="absolute left-0 top-1/2 h-0.5 bg-primary -z-10 transform -translate-y-1/2 rounded-full transition-all duration-500 ease-in-out" 
          style={{ width: `${((step - 1) / (stepsConfig.length - 1)) * 100}%` }}
        />

        {stepsConfig.map((s) => {
          const isCompleted = s.step < step;
          const isCurrent = s.step === step;

          return (
            <div key={s.step} className="flex flex-col items-center gap-2 bg-white dark:bg-zinc-950 px-2">
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-300
                  ${isCompleted ? 'bg-primary text-white scale-95' : 
                    isCurrent ? 'bg-primary text-white shadow-lg ring-4 ring-primary/20 scale-110' : 
                    'bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500'}`}
              >
                {isCompleted ? <Check size={18} strokeWidth={3} /> : s.step}
              </div>
              <span className={`text-xs font-semibold ${isCurrent ? 'text-primary' : 'text-slate-500 dark:text-zinc-400'}`}>
                {language === 'vi' ? s.labelVi : s.labelEn}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
