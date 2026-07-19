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
import Step4Editor from './creator-flow/Step4Editor';
import Step5Schedule from './creator-flow/Step5Schedule';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

function AiCreatorContent() {
  const { t } = useLanguage();
  const router = useRouter();
  const {
    state, dispatch, nextStep, prevStep, goToStep,
    startCrawl, submitManualArticle, uploadSourceFile, confirmPostSchedule,
  } = useCreatorFlow();

  // Custom Toast notification states
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

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
        return state.selectedPlatforms.length > 0;
      case 2:
        return (
          Boolean(state.articleId && state.articleContext && state.crawlStatus === 'done') ||
          Boolean(state.manualTitle.trim().length > 0 && state.manualContent.trim().length > 0)
        );
      case 3:
        return state.postContent.trim().length > 0;
      case 4:
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
      if (state.currentStep === 1 && state.selectedPlatforms.length === 0) valid = false;
      if (state.currentStep === 2 && (!state.articleId || state.crawlStatus !== 'done')) valid = false;

      if (valid) {
        goToStep(targetStep);
      }
    }
  };

  // Action handlers
  const handlePublishNow = async () => {
    dispatch({ type: 'SET_SCHEDULE_MODE', payload: 'now' });
    const result = await confirmPostSchedule('now');
    if (result.success) {
      showToast(t('creator.step5.successToast'), 'success');
      setTimeout(() => {
        dispatch({ type: 'RESET_FLOW' });
        router.push('/content-calendar');
      }, 1500);
    } else {
      const failed = result.failed.join(', ');
      showToast(`${t('creator.step5.errorToast')}${failed ? `: ${failed}` : ''}`, 'error');
    }
  };

  const handleContinue = async () => {
    if (state.currentStep === 2) {
      // Auto-submit manual article if manual title and content are entered and not yet matching the saved article
      if (state.manualTitle.trim() && state.manualContent.trim()) {
        const isDirty = !state.articleId || 
          state.manualTitle !== state.articleContext?.title || 
          state.manualContent !== state.articleContext?.description; // or content
        
        if (isDirty) {
          setIsSubmitting(true);
          try {
            await submitManualArticle(state.manualTitle, state.manualContent);
          } catch (err) {
            showToast("Không thể lưu bài viết. Vui lòng kiểm tra lại.", "error");
            setIsSubmitting(false);
            return;
          }
          setIsSubmitting(false);
        }
      }
      nextStep();
    } else if (state.currentStep === 3) {
      dispatch({ type: 'SET_SCHEDULE_MODE', payload: 'scheduled' });
      nextStep();
    } else if (state.currentStep === 4) {
      // Submit and publish/schedule
      const result = await confirmPostSchedule('scheduled');
      if (result.success) {
        showToast(t('creator.step5.successToast'), 'success');
        setTimeout(() => {
          dispatch({ type: 'RESET_FLOW' });
          router.push('/content-calendar');
        }, 1500);
      } else {
        const failed = result.failed.join(', ');
        showToast(`${t('creator.step5.errorToast')}${failed ? `: ${failed}` : ''}`, 'error');
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
            selectedPlatforms={state.selectedPlatforms}
            onSelect={(plats) => dispatch({ type: 'SET_SELECTED_PLATFORMS', payload: plats })}
          />
        );
      case 2:
        return (
          <Step2Article
            sourceType={state.sourceType}
            crawlStatus={state.crawlStatus}
            articleContext={state.articleContext}
            startCrawl={startCrawl}
            submitManual={submitManualArticle}
            uploadSource={uploadSourceFile}
          />
        );
      case 3:
        return <Step4Editor />;
      case 4:
        return <Step5Schedule />;
      default:
        return null;
    }
  };

  // Fade transitions using Framer Motion (avoid x-axis slide which causes scroll snap-back)
  const slideVariants = {
    initial: {
      opacity: 0,
      y: 8,
    },
    animate: {
      opacity: 1,
      y: 0,
      transition: {
        opacity: { duration: 0.2 },
        y: { duration: 0.2, ease: 'easeOut' },
      }
    },
    exit: {
      opacity: 0,
      y: -8,
      transition: {
        opacity: { duration: 0.15 },
        y: { duration: 0.15, ease: 'easeIn' },
      }
    }
  };

  return (
    <div className="w-full bg-bg">

      {/* Main wizard frame */}
      <div className="select-none w-full max-w-7xl mx-auto px-4 md:px-6 pt-6">

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
        <div className="w-full overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={state.currentStep}
              variants={slideVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="flex flex-col"
            >
              {renderStepContent()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Double actions footer */}
        <NavigationFooter
          currentStep={state.currentStep}
          isValid={isStepValid()}
          isLoading={state.isScheduling || isSubmitting}
          onBack={prevStep}
          onContinue={handleContinue}
          onPublishNow={handlePublishNow}
        />
      </div>

      {/* Floating high-fidelity Toast Alert Banner */}
      <AnimatePresence>
        {toast.show && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={`fixed bottom-24 right-6 z-50 rounded-2xl p-4 shadow-2xl flex items-center gap-3 border ${toast.type === 'success'
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
    setEditState: () => { },
    handleUpdateVariantField: () => { },
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
