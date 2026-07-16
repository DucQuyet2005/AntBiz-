"use client";

import React from 'react';
import { useCreatorFlow } from '@/contexts/CreatorFlowContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface StepFooterProps {
  isNextDisabled?: boolean;
  nextTooltip?: string;
  onNext?: () => void; // Optional override
  isLoading?: boolean;
}

export const StepFooter: React.FC<StepFooterProps> = ({ 
  isNextDisabled = false, 
  nextTooltip,
  onNext,
  isLoading = false
}) => {
  const { step, nextStep, prevStep } = useCreatorFlow();
  const { language } = useLanguage();

  const handleNext = () => {
    if (onNext) {
      onNext();
    } else {
      nextStep();
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-t border-slate-100 dark:border-zinc-800 p-4 z-40">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        {step > 1 ? (
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={isLoading}
            className="rounded-xl px-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {language === 'vi' ? 'Quay lại' : 'Back'}
          </Button>
        ) : (
          <div /> // Spacer
        )}

        {step < 5 ? (
          <div className="group relative">
            <Button
              onClick={handleNext}
              disabled={isNextDisabled || isLoading}
              className="rounded-xl px-8 bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
              ) : null}
              {language === 'vi' ? 'Tiếp tục' : 'Continue'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            {isNextDisabled && nextTooltip && (
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-slate-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                {nextTooltip}
              </div>
            )}
          </div>
        ) : (
          <Button
            onClick={handleNext}
            disabled={isNextDisabled || isLoading}
            className="rounded-xl px-8 bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
            ) : (
              <CheckCircle2 className="w-4 h-4 mr-2" />
            )}
            {language === 'vi' ? 'Xác nhận lên lịch' : 'Confirm Schedule'}
          </Button>
        )}
      </div>
    </div>
  );
};
