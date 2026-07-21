'use client';

import React from 'react';
import { Check } from 'lucide-react';

interface StepperHeaderProps {
  currentStep: number;
  onStepClick?: (step: number) => void;
}

export default function StepperHeader({ currentStep, onStepClick }: StepperHeaderProps) {
  const steps = [
    { title: 'Chọn nền tảng', subtitle: 'Kết nối tài khoản' },
    { title: 'Tạo nội dung', subtitle: 'AI tạo nội dung' },
    { title: 'Xem trước', subtitle: 'Kiểm tra và chỉnh sửa' },
    { title: 'Đăng bài', subtitle: 'Xuất bản nội dung' },
  ];

  return (
    <div className="w-full mb-10 select-none">
      <div className="flex items-center justify-between w-full">
        {steps.map((step, idx) => {
          const stepNumber = idx + 1;
          const isCompleted = stepNumber < currentStep;
          const isActive = stepNumber === currentStep;
          const isFilled = stepNumber <= currentStep;

          return (
            <React.Fragment key={idx}>
              {/* Connector line before step (except first step) */}
              {idx > 0 && (
                <div 
                  className={`h-[2px] flex-1 min-w-[20px] mx-3 rounded-full transition-colors duration-300 ${
                    stepNumber <= currentStep ? 'bg-primary' : 'bg-gray-200 dark:bg-zinc-800'
                  }`}
                />
              )}

              {/* Step item */}
              <button
                type="button"
                onClick={() => isCompleted && onStepClick?.(stepNumber)}
                disabled={!isCompleted}
                className={`flex items-center gap-3 text-left transition-all duration-200 ${
                  isCompleted ? 'cursor-pointer group' : 'cursor-default'
                }`}
                title={`Bước ${stepNumber}: ${step.title}`}
              >
                {/* Circle Number / Check icon */}
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 shrink-0 ${
                    isActive
                      ? 'bg-primary text-white shadow-md shadow-primary/20 scale-105'
                      : isCompleted
                      ? 'bg-primary text-white group-hover:opacity-90'
                      : 'border-2 border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-gray-400 dark:text-zinc-500'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4 stroke-[3]" />
                  ) : (
                    <span>{stepNumber}</span>
                  )}
                </div>

                {/* Step Titles */}
                <div className="hidden sm:flex flex-col min-w-0">
                  <span
                    className={`text-xs sm:text-sm font-bold tracking-tight transition-colors duration-200 ${
                      isActive
                        ? 'text-primary'
                        : isCompleted
                        ? 'text-text group-hover:text-primary'
                        : 'text-gray-400 dark:text-zinc-500'
                    }`}
                  >
                    {step.title}
                  </span>
                  <span
                    className={`text-[11px] font-medium transition-colors duration-200 ${
                      isFilled
                        ? 'text-text-muted'
                        : 'text-gray-400/80 dark:text-zinc-600'
                    }`}
                  >
                    {step.subtitle}
                  </span>
                </div>
              </button>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
