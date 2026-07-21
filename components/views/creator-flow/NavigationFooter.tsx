'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { ArrowLeft, ArrowRight, Check, Send, Loader2 } from 'lucide-react';

interface NavigationFooterProps {
  currentStep: number;
  isValid: boolean;
  isLoading?: boolean;
  isPublishingNow?: boolean;
  onBack: () => void;
  onContinue: () => void;
  onPublishNow?: () => void;
}

export default function NavigationFooter({
  currentStep,
  isValid,
  isLoading = false,
  isPublishingNow = false,
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
            disabled={isLoading || isPublishingNow}
            onClick={onBack}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-300 dark:border-zinc-700 text-text hover:bg-gray-100 dark:hover:bg-zinc-900 font-semibold transition-all active:scale-95 duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
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
              disabled={!isValid || isLoading || isPublishingNow}
              onClick={onPublishNow}
              className={`h-11 px-6 rounded-2xl text-white font-bold text-xs transition-all active:scale-95 duration-150 flex items-center gap-1.5 shadow-md ${
                isValid && !isLoading && !isPublishingNow
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20 cursor-pointer'
                  : 'bg-gray-300 dark:bg-zinc-800 text-gray-500 cursor-not-allowed opacity-80'
              }`}
            >
              {isPublishingNow ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{t('creator.buttons.publishing')}</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>{t('creator.buttons.publishNow')}</span>
                </>
              )}
            </button>
            <button
              type="button"
              disabled={!isValid || isLoading || isPublishingNow}
              onClick={onContinue}
              className={`h-11 px-5 rounded-2xl border border-gray-300 dark:border-zinc-700 text-text font-bold text-xs transition-all hover:bg-gray-100 dark:hover:bg-zinc-800 flex items-center gap-1.5 ${
                isValid && !isLoading && !isPublishingNow ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'
              }`}
            >
              <span>{t('creator.buttons.scheduleOption')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : isLastStep ? (
          <button
            type="button"
            disabled={!isValid || isLoading || isPublishingNow}
            onClick={onContinue}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-white font-bold text-sm transition-all active:scale-95 duration-150 shadow-md ${
              isValid && !isLoading && !isPublishingNow
                ? 'bg-primary hover:bg-primary-hover shadow-primary/20 cursor-pointer'
                : 'bg-gray-300 dark:bg-zinc-800 text-gray-500 cursor-not-allowed opacity-60 shadow-none'
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t('creator.buttons.scheduling')}</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4 stroke-[3]" />
                <span>{t('creator.buttons.confirmSchedule')}</span>
              </>
            )}
          </button>
        ) : (
          <button
            type="button"
            disabled={!isValid || isLoading}
            onClick={onContinue}
            className={`h-14 px-8 rounded-2xl text-white font-bold text-base transition-all active:scale-95 duration-150 flex items-center justify-center gap-2 ${
              isValid && !isLoading
                ? 'bg-primary hover:bg-primary-hover shadow-lg shadow-primary/25 cursor-pointer'
                : 'bg-gray-300 dark:bg-zinc-800 text-gray-500 cursor-not-allowed opacity-60 shadow-none'
            }`}
          >
            <span>{t('creator.buttons.continue')}</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        )}
      </div>
    </footer>
  );
}
