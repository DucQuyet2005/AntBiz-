"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useCreatorFlow } from '@/contexts/CreatorFlowContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { StepFooter } from '../StepFooter';
import { scheduleService } from '@/lib/services/creator/schedule.service';
import { PlatformIcon } from '../shared/PlatformIcon';
import { Calendar, Clock, CheckCircle2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const Step5Schedule = () => {
  const { 
    postContent, selectedPlatform, scheduleMode, setScheduleMode,
    scheduledDateTime, setScheduledDateTime, prevStep, resetFlow
  } = useCreatorFlow();
  const { language } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Mock timeline generation
  const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  const hours = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);

  const handleSubmit = async () => {
    if (!postContent) return;
    setIsSubmitting(true);
    try {
      if (scheduleMode === 'now') {
        await scheduleService.publishNow(postContent.id);
      } else {
        await scheduleService.schedulePost(postContent.id, scheduledDateTime || new Date().toISOString());
      }
      setIsSuccess(true);
    } catch(e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinish = () => {
    // Navigate away or reset
    resetFlow();
    window.location.href = '/dashboard'; // Redirect to dashboard or list
  };

  if (isSuccess) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl mx-auto px-4 py-20 text-center"
      >
        <div className="w-24 h-24 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 size={48} />
        </div>
        <h2 className="text-3xl font-bold mb-4 text-slate-800 dark:text-white">
          {scheduleMode === 'now' ? 'Đã đăng thành công!' : 'Đã lên lịch thành công!'}
        </h2>
        <p className="text-slate-500 dark:text-zinc-400 mb-8">
          Nội dung của bạn đã được {scheduleMode === 'now' ? 'phát hành' : 'thêm vào hàng đợi'} trên {selectedPlatform}.
        </p>
        <Button onClick={handleFinish} className="rounded-xl px-8 bg-primary hover:bg-primary/90">
          Về trang quản lý
        </Button>
      </motion.div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button onClick={prevStep} className="w-10 h-10 rounded-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex items-center justify-center hover:bg-slate-50 transition-colors">
            <ArrowLeft size={18} className="text-slate-600 dark:text-zinc-300" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              Kế hoạch đăng bài
            </h2>
            <p className="text-slate-500 dark:text-zinc-400 text-sm">
              Cấu hình thời gian đăng cho từng nền tảng
            </p>
          </div>
        </div>
        
        {/* We use StepFooter for the CTA, but can also put it here if we want. Design says CTA is top right or footer. We'll stick to footer for consistency. */}
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* LEFT COLUMN: Timeline (70%) */}
        <div className="flex-1 lg:flex-[0.7] bg-white dark:bg-zinc-950 rounded-[2rem] border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col h-[600px]">
          {/* Tabs */}
          <div className="h-14 border-b border-slate-100 dark:border-zinc-800 flex items-center px-4 gap-2 bg-slate-50 dark:bg-zinc-900/50">
            {['Tuần 1', 'Tuần 2', 'Tuần 3'].map((t, i) => (
              <button key={t} className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${i === 0 ? 'bg-white dark:bg-zinc-800 text-primary shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
                {t}
              </button>
            ))}
          </div>

          {/* Grid Header */}
          <div className="grid grid-cols-8 border-b border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-950">
            <div className="p-3 text-center border-r border-slate-100 dark:border-zinc-800">
              <Clock size={16} className="mx-auto text-slate-400" />
            </div>
            {days.map((d, i) => (
              <div key={d} className={`p-3 text-center border-r border-slate-100 dark:border-zinc-800 ${i === 2 ? 'bg-orange-50 dark:bg-orange-900/10' : ''}`}>
                <div className={`text-xs font-bold ${i === 2 ? 'text-orange-600' : 'text-slate-400'}`}>{d}</div>
                <div className={`text-lg font-bold mt-1 ${i === 2 ? 'text-orange-600' : 'text-slate-800 dark:text-white'}`}>{12 + i}</div>
              </div>
            ))}
          </div>

          {/* Grid Body */}
          <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-zinc-900/20">
            {hours.map(hour => (
              <div key={hour} className="grid grid-cols-8 border-b border-slate-100 dark:border-zinc-800/50">
                <div className="p-2 text-xs font-semibold text-slate-400 text-center border-r border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-950">
                  {hour}
                </div>
                {days.map((d, i) => (
                  <div key={`${d}-${hour}`} className={`p-1 border-r border-slate-100 dark:border-zinc-800/50 relative min-h-[48px] transition-colors hover:bg-primary/5 cursor-pointer ${i === 2 ? 'bg-orange-50/50 dark:bg-orange-900/5' : ''}`}>
                    {/* Mock a scheduled item */}
                    {d === 'WED' && hour === '10:00' && selectedPlatform === 'facebook' && (
                      <div className="absolute inset-1 bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-1.5 flex flex-col gap-1 overflow-hidden z-10 shadow-sm">
                        <div className="flex items-center gap-1 text-[10px] font-bold text-blue-700 dark:text-blue-400">
                          <PlatformIcon platform="facebook" size={12} /> Facebook
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT COLUMN: Config (30%) */}
        <div className="flex-1 lg:flex-[0.3] flex flex-col gap-4">
          <div className="bg-white dark:bg-zinc-950 rounded-[2rem] border border-slate-200 dark:border-zinc-800 p-6 shadow-sm">
            
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-zinc-900 flex items-center justify-center">
                {selectedPlatform && <PlatformIcon platform={selectedPlatform} size={24} className={selectedPlatform === 'facebook' ? 'text-blue-600' : selectedPlatform === 'instagram' ? 'text-pink-600' : 'text-zinc-900 dark:text-white'} />}
              </div>
              <div>
                <h3 className="font-bold text-lg capitalize">{selectedPlatform}</h3>
                <span className="text-xs text-slate-500 font-medium">AntBiz Page</span>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <label 
                className={`flex items-center p-4 rounded-2xl border-2 cursor-pointer transition-all ${scheduleMode === 'now' ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/10' : 'border-slate-100 dark:border-zinc-800 hover:border-orange-200'}`}
                onClick={() => setScheduleMode('now')}
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mr-3 ${scheduleMode === 'now' ? 'border-orange-500' : 'border-slate-300'}`}>
                  {scheduleMode === 'now' && <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />}
                </div>
                <div className="font-bold text-slate-800 dark:text-white">Đăng ngay lập tức</div>
              </label>

              <label 
                className={`flex items-center p-4 rounded-2xl border-2 cursor-pointer transition-all ${scheduleMode === 'scheduled' ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/10' : 'border-slate-100 dark:border-zinc-800 hover:border-orange-200'}`}
                onClick={() => setScheduleMode('scheduled')}
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mr-3 ${scheduleMode === 'scheduled' ? 'border-orange-500' : 'border-slate-300'}`}>
                  {scheduleMode === 'scheduled' && <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />}
                </div>
                <div className="font-bold text-slate-800 dark:text-white">Lên lịch đăng bài</div>
              </label>
            </div>

            <AnimatePresence>
              {scheduleMode === 'scheduled' && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4 overflow-hidden"
                >
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1 block">Ngày đăng</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        type="date" 
                        value={scheduledDateTime?.split('T')[0] || new Date().toISOString().split('T')[0]}
                        onChange={e => setScheduledDateTime(`${e.target.value}T${scheduledDateTime?.split('T')[1] || '12:00'}`)}
                        className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 outline-none focus:ring-2 focus:ring-orange-500/50"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1 block">Giờ đăng</label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        type="time" 
                        value={scheduledDateTime?.split('T')[1]?.substring(0, 5) || '12:00'}
                        onChange={e => setScheduledDateTime(`${scheduledDateTime?.split('T')[0] || new Date().toISOString().split('T')[0]}T${e.target.value}`)}
                        className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 outline-none focus:ring-2 focus:ring-orange-500/50"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </div>

      </div>

      <StepFooter 
        onNext={handleSubmit}
        isLoading={isSubmitting}
      />
    </div>
  );
};
