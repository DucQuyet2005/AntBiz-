'use client';

import React from 'react';

interface StepperHeaderProps {
  currentStep: number;
  onStepClick?: (step: number) => void;
}

export default function StepperHeader({ currentStep, onStepClick }: StepperHeaderProps) {
  return (
    <div className="w-full mb-6 select-none">
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, idx) => {
          const stepNumber = idx + 1;
          const isFilled = stepNumber <= currentStep;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => isFilled && onStepClick?.(stepNumber)}
              disabled={!isFilled || stepNumber === currentStep}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                isFilled 
                  ? 'bg-primary cursor-pointer hover:opacity-80' 
                  : 'bg-gray-200 dark:bg-zinc-800 cursor-not-allowed'
              }`}
              title={`Bước ${stepNumber}`}
            />
          );
        })}
      </div>
    </div>
  );
}
