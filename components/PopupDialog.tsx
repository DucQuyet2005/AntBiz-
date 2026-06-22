"use client";

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export type PopupType = 'success' | 'error' | 'warning' | 'info';

interface PopupDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  type?: PopupType;
}

export default function PopupDialog({
  isOpen,
  onClose,
  title,
  message,
  type = 'info'
}: PopupDialogProps) {
  const { language } = useLanguage();

  // Auto-close after 5 seconds
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        onClose();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
      case 'error':
        return <AlertTriangle className="w-5 h-5 text-rose-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-600" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-[#5A5CDE]" />;
    }
  };

  const getIconBg = () => {
    switch (type) {
      case 'success':
        return 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/30';
      case 'error':
        return 'bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/30';
      case 'warning':
        return 'bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/30';
      case 'info':
      default:
        return 'bg-[#5A5CDE]/10 dark:bg-[#5A5CDE]/5 border border-[#5A5CDE]/20 dark:border-[#5A5CDE]/10';
    }
  };

  const getDefaultTitle = () => {
    if (title) return title;
    switch (type) {
      case 'success':
        return language === 'vi' ? 'Thành công' : 'Success';
      case 'error':
        return language === 'vi' ? 'Lỗi hệ thống' : 'System Error';
      case 'warning':
        return language === 'vi' ? 'Cảnh báo' : 'Warning';
      case 'info':
      default:
        return language === 'vi' ? 'Thông báo' : 'Notification';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-[9999] pointer-events-none w-full max-w-sm px-4 sm:px-0">
          {/* Toast Notification Card */}
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="pointer-events-auto relative bg-white/95 dark:bg-slate-900/95 border border-slate-200/80 dark:border-slate-800 rounded-[20px] shadow-2xl p-4 flex gap-3.5 backdrop-blur-md"
          >
            {/* Type status icon indicator */}
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${getIconBg()}`}>
              {getIcon()}
            </div>

            {/* Text content details */}
            <div className="flex-1 flex flex-col gap-1 pr-6 min-w-0">
              <h3 className="font-extrabold text-[14px] text-slate-850 dark:text-slate-100 tracking-tight leading-snug">
                {getDefaultTitle()}
              </h3>
              <p className="text-[11px] text-slate-600 dark:text-slate-350 leading-relaxed font-semibold">
                {message}
              </p>
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-3.5 right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer border-0 focus:outline-none shrink-0"
            >
              <X size={14} />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
