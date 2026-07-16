"use client";

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CreatorFlowProvider, useCreatorFlow } from '@/contexts/CreatorFlowContext';
import { StepperHeader } from '../creator/StepperHeader';
import { Step1Platform } from '../creator/steps/Step1Platform';
import { Step2Article } from '../creator/steps/Step2Article';
import { Step3Presets } from '../creator/steps/Step3Presets';
import { Step4Post } from '../creator/steps/Step4Post';
import { Step5Schedule } from '../creator/steps/Step5Schedule';
import { AnimatePresence } from 'framer-motion';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const CreatorFlowContent = () => {
  const { step } = useCreatorFlow();

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-zinc-950/50 pt-8 pb-32">
      <StepperHeader />
      
      <div className="relative w-full">
        <AnimatePresence mode="wait">
          {step === 1 && <Step1Platform key="step1" />}
          {step === 2 && <Step2Article key="step2" />}
          {step === 3 && <Step3Presets key="step3" />}
          {step === 4 && <Step4Post key="step4" />}
          {step === 5 && <Step5Schedule key="step5" />}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default function AiCreatorView() {
  return (
    <QueryClientProvider client={queryClient}>
      <CreatorFlowProvider>
        <CreatorFlowContent />
      </CreatorFlowProvider>
    </QueryClientProvider>
  );
}
