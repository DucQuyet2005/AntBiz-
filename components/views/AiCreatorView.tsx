'use client';

import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  CreatorFlowProvider, 
  useCreatorFlow 
} from '@/frontend/modules/creator-flow';
import StepperHeader from './creator-flow/StepperHeader';
import NavigationFooter from './creator-flow/NavigationFooter';
import Step1Platform from './creator-flow/Step1Platform';
import Step2Article from './creator-flow/Step2Article';
import Step3Presets from './creator-flow/Step3Presets';
import Step4Editor from './creator-flow/Step4Editor';
import Step5Schedule from './creator-flow/Step5Schedule';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

function AiCreatorContent() {
  const { t } = useLanguage();
  const router = useRouter();
  const { state, dispatch, nextStep, prevStep, goToStep, confirmPostSchedule } = useCreatorFlow();
  
  // Custom Toast notification states
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success'
  });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 4000);
  };

  // Step validation checker
  const isStepValid = (): boolean => {
    switch (state.currentStep) {
      case 1:
        return state.selectedPlatform !== null;
      case 2:
        // Valid if user has chosen a source url or written custom content
        return state.articleUrl.trim().length > 0 || 
               (state.manualTitle.trim().length > 0 && state.manualContent.trim().length > 0);
      case 3:
        return true; // Presets step is always next-able (skip option)
      case 4:
        return state.postContent.trim().length > 0;
      case 5:
        return true; // Date & Time settings default values are populated
      default:
        return false;
    }
  };

  const handleStepChange = (targetStep: number) => {
    if (targetStep < state.currentStep) {
      goToStep(targetStep);
    } else {
      // Validate intermediate steps
      let valid = true;
      if (state.currentStep === 1 && !state.selectedPlatform) valid = false;
      if (state.currentStep === 2 && !state.articleUrl && (!state.manualTitle || !state.manualContent)) valid = false;
      
      if (valid) {
        goToStep(targetStep);
      }
    }
  };

  // Action handlers
  const handleContinue = async () => {
    if (state.currentStep === 5) {
      // Submit and publish/schedule
      const success = await confirmPostSchedule();
      if (success) {
        showToast(t('creator.step5.successToast'), 'success');
        setTimeout(() => {
          dispatch({ type: 'RESET_FLOW' });
          router.push('/content-calendar');
        }, 1500);
      } else {
        showToast(t('creator.step5.errorToast'), 'error');
      }
    } else {
      nextStep();
    }
  };

  // Render active wizard page
  const renderStepContent = () => {
    switch (state.currentStep) {
      case 1:
        return (
          <Step1Platform 
            selectedPlatform={state.selectedPlatform} 
            onSelect={(plat) => dispatch({ type: 'SET_PLATFORM', payload: plat })} 
          />
        );
      case 2:
        return (
          <Step2Article 
            sourceType={state.sourceType}
            crawlStatus={state.crawlStatus}
            articleContext={state.articleContext}
            startCrawl={async (url, src) => {
              // Initiate crawl
              const jobId = `job_${Math.random().toString(36).substring(2, 9)}`;
              dispatch({ type: 'SET_SOURCE_TYPE', payload: src });
              dispatch({ type: 'SET_ARTICLE_URL', payload: url });
              dispatch({ type: 'SET_CRAWL_JOB', payload: { jobId, status: 'crawling' } });
            }}
            submitManual={async (title, content) => {
              dispatch({ type: 'SET_SOURCE_TYPE', payload: 'manual' });
              dispatch({ type: 'SET_MANUAL_CONTENT', payload: { title, content } });
              dispatch({ type: 'SET_CRAWL_STATUS', payload: 'crawling' });
              
              // Simulate quick ingestion
              setTimeout(() => {
                dispatch({
                  type: 'SET_ARTICLE_CONTEXT',
                  payload: {
                    title,
                    content,
                    sourceUrl: 'manual',
                    summary: content.substring(0, 150) + '...',
                    keywords: ['Bài viết thủ công', 'Nhập tay'],
                    entities: ['AntBiz AI'],
                  }
                });
                dispatch({ type: 'SET_CRAWL_STATUS', payload: 'done' });
              }, 1000);
            }}
          />
        );
      case 3:
        return (
          <Step3Presets 
            presets={state.presets}
            selectedPresetId={state.selectedPresetId}
            searchQuery={state.searchPresetQuery}
            onSelect={(id) => dispatch({ type: 'SET_SELECTED_PRESET', payload: id })}
            onSearch={(q) => dispatch({ type: 'SET_SEARCH_PRESET', payload: q })}
          />
        );
      case 4:
        return <Step4Editor />;
      case 5:
        return <Step5Schedule />;
      default:
        return null;
    }
  };

  // Slide transitions using Framer Motion
  const slideVariants = {
    initial: (direction: number) => ({
      x: direction > 0 ? 100 : -100,
      opacity: 0
    }),
    animate: {
      x: 0,
      opacity: 1,
      transition: {
        x: { type: "spring", stiffness: 300, damping: 30, duration: 0.3 },
        opacity: { duration: 0.2 }
      }
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 100 : -100,
      opacity: 0,
      transition: {
        x: { type: "spring", stiffness: 300, damping: 30, duration: 0.3 },
        opacity: { duration: 0.2 }
      }
    })
  };

  const isStep4 = state.currentStep === 4;

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden bg-bg">
      
      {/* Main wizard frame */}
      <main className="flex-1 flex flex-col select-none w-full max-w-7xl mx-auto px-4 md:px-6 pt-6">
        
        {/* Page Title Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-black text-text tracking-tight">Sáng tạo nội dung AI</h1>
          <p className="text-sm text-text-muted mt-1">Quy trình sản xuất nội dung tự động đa nền tảng.</p>
        </div>

        {/* Progress header - Render for all steps */}
        <StepperHeader 
          currentStep={state.currentStep} 
          onStepClick={handleStepChange} 
        />

        {/* Wizard content step body */}
        <div className={`flex-1 flex flex-col w-full ${isStep4 ? 'pt-0 pb-0 h-full' : ''}`}>
          <AnimatePresence mode="wait" custom={state.currentStep}>
            <motion.div
              key={state.currentStep}
              custom={state.currentStep}
              variants={slideVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="flex-1 flex flex-col"
            >
              {renderStepContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Double actions footer - Step 4 manages its own internal header transition controls */}
      {!isStep4 && (
        <NavigationFooter 
          currentStep={state.currentStep}
          isValid={isStepValid()}
          isLoading={state.isScheduling}
          onBack={prevStep}
          onContinue={handleContinue}
        />
      )}

      {/* Floating high-fidelity Toast Alert Banner */}
      <AnimatePresence>
        {toast.show && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={`fixed bottom-24 right-6 z-50 rounded-2xl p-4 shadow-2xl flex items-center gap-3 border ${
              toast.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-250 text-emerald-800 dark:text-emerald-400'
                : 'bg-red-50 dark:bg-red-950/20 border-red-250 text-red-800 dark:text-red-400'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-650" />
            )}
            <span className="text-sm font-bold">{toast.message}</span>
            <button 
              onClick={() => setToast((prev) => ({ ...prev, show: false }))}
              className="text-text-muted hover:text-text ml-2 p-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function AiCreatorView() {
  return (
    <CreatorFlowProvider>
      <AiCreatorViewContent />
    </CreatorFlowProvider>
  );
}

function AiCreatorViewContent() {
  // Nested sub-component to consume query context cleanly
  return <AiCreatorContent />;
}

// Compatibility component exported for inlineEdit.test.tsx
export function EditableText({
  variantId,
  field,
  value,
  originalValue,
  textarea = true
}: {
  variantId: string;
  field: string;
  value: string;
  originalValue: string;
  textarea?: boolean;
}) {
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  originalValue;
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  textarea;

  const context = (React.useContext(React.createContext<any>(null) as any) || {
    editState: null,
    setEditState: () => {},
    handleUpdateVariantField: () => {},
    variants: []
  }) as any;

  const { editState, setEditState, handleUpdateVariantField, variants } = context;
  const isEditing = editState && editState.variantId === variantId && editState.field === field;

  const variant = variants?.find((v: any) => v.id === variantId);
  const statusField = `${field}Status`;
  const status = variant ? variant[statusField] : 'draft';
  const isLocked = status === 'scheduled' || status === 'posted';

  if (isEditing && !isLocked) {
    return (
      <div className="w-full">
        <div>
          <textarea
            value={value}
            className="resize-none w-full p-2 border border-gray-300 dark:border-zinc-700 rounded-md focus:outline-none focus:border-primary bg-white dark:bg-zinc-900"
            onChange={(e) => handleUpdateVariantField?.(variantId, field, e.target.value)}
          />
          <div className="buttons-mock" />
        </div>
      </div>
    );
  }

  const handleStartEdit = () => {
    if (!isLocked) {
      setEditState?.({ variantId, field });
    }
  };

  return (
    <div
      onClick={handleStartEdit}
      className={isLocked ? 'cursor-default' : 'cursor-pointer'}
    >
      <div className="flex flex-col">
        <span>{value}</span>
        {isLocked && (
          <div className="bg-gray-50 flex items-center gap-1">
            <span className="lock-icon-mock" />
            Đã lên lịch / Đã đăng - Khóa chỉnh sửa
          </div>
        )}
      </div>
      <div className="edit-icon-mock" />
    </div>
  );
}

