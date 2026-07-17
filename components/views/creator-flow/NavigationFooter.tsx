'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { ArrowLeft, ArrowRight, Check, Send } from 'lucide-react';

interface NavigationFooterProps {
  currentStep: number;
  isValid: boolean;
  isLoading?: boolean;
  onBack: () => void;
  onContinue: () => void;
  onPublishNow?: () => void;
}

export default function NavigationFooter({
  currentStep,
  isValid,
  isLoading = false,
  onBack,
  onContinue,
  onPublishNow,
}: NavigationFooterProps) {
  const { t } = useLanguage();

  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === 4;

  return (
    <footer className="mt-8 border-t border-gray-200 dark:border-zinc-800/80 py-6 flex items-center justify-between w-full bg-transparent">
      {/* Left Back button */}
      <div>
        {!isFirstStep && (
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-300 dark:border-zinc-700 text-text hover:bg-gray-100 dark:hover:bg-zinc-900 font-semibold transition-all active:scale-95 duration-150"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('creator.buttons.back')}
          </button>
        )}
      </div>

      {/* Right Continue/Submit button */}
      <div>
        {currentStep === 3 ? (
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={!isValid || isLoading}
              onClick={onPublishNow}
              className={`flex items-center gap-2 px-6 py-3 rounded-full text-white font-bold transition-all active:scale-95 duration-150 shadow-md ${
                isValid && !isLoading
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                  : 'bg-gray-300 dark:bg-zinc-800 text-gray-500 cursor-not-allowed'
              }`}
            >
              <Send className="w-4 h-4" />
              Đăng nhanh
            </button>
            <button
              type="button"
              disabled={!isValid || isLoading}
              onClick={onContinue}
              className={`flex items-center gap-2 px-6 py-3 rounded-full text-white font-bold transition-all active:scale-95 duration-150 shadow-md ${
                isValid && !isLoading
                  ? 'bg-primary hover:bg-primary-hover shadow-primary/20'
                  : 'bg-gray-300 dark:bg-zinc-800 text-gray-500 cursor-not-allowed'
              }`}
            >
              Lên lịch
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : isLastStep ? (
          <button
            type="button"
            disabled={!isValid || isLoading}
            onClick={onContinue}
            className={`flex items-center gap-2 px-7 py-3 rounded-full text-white font-bold transition-all active:scale-95 duration-150 shadow-md ${
              isValid && !isLoading
                ? 'bg-primary hover:bg-primary-hover shadow-primary/20'
                : 'bg-gray-300 dark:bg-zinc-800 text-gray-500 cursor-not-allowed'
            }`}
          >
            <Check className="w-4 h-4" />
            {t('creator.buttons.confirmSchedule')}
          </button>
        ) : (
          <button
            type="button"
            disabled={!isValid || isLoading}
            onClick={onContinue}
            className={`flex items-center gap-2 px-7 py-3 rounded-full text-white font-bold transition-all active:scale-95 duration-150 shadow-md ${
              isValid && !isLoading
                ? 'bg-primary hover:bg-primary-hover shadow-primary/20'
                : 'bg-gray-300 dark:bg-zinc-800 text-gray-500 cursor-not-allowed'
            }`}
          >
            {t('creator.buttons.continue')}
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </footer>
  );
}
