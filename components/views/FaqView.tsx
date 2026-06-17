"use client";

import React, { useState } from 'react';
import { 
  Rocket, 
  Lightbulb, 
  Cpu, 
  Search, 
  ChevronDown, 
  CheckCircle,
  HelpCircle
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';


interface AccordionProps {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
  textColor?: string;
}

const AccordionItem: React.FC<AccordionProps> = ({ 
  question, 
  answer, 
  isOpen, 
  onToggle,
  textColor = "text-text"
}) => {
  return (
    <div className="w-full flex flex-col gap-2">
      <button 
        onClick={onToggle}
        className="w-full bg-white text-left px-6 py-4 rounded-full shadow-sm flex items-center justify-between text-sm font-bold transition-all hover:shadow cursor-pointer select-none group"
      >
        <span className={textColor}>{question}</span>
        <ChevronDown 
          size={18} 
          className={`text-text-muted transition-transform duration-300 shrink-0 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>
      
      {/* Smooth expanding content */}
      <div 
        className={`overflow-hidden transition-all duration-300 ease-in-out px-6 ${
          isOpen ? 'max-h-40 pb-2 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <p className="text-xs leading-relaxed text-text opacity-80 pt-2 font-medium">
          {answer}
        </p>
      </div>
    </div>
  );
};

export default function FaqView() {
  const { t } = useLanguage();
  // Accordion state
  const [openItems, setOpenItems] = useState<{ [key: string]: boolean }>({
    q1: false,
    q2: false,
    q3: false,
    q4: false,
    q5: false,
  });

  const toggleItem = (key: string) => {
    setOpenItems(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <div className="flex flex-col gap-6">
      
      {/* Title Header */}
      <div className="mt-2">
        <h1 className="text-4xl font-bold text-text mb-1 tracking-tight">{t('faq.heading')}</h1>
        <p className="text-text-muted">
          {t('faq.subtitle')}
        </p>
      </div>

      {/* FAQ Search Bar */}
      <div className="relative w-full max-w-xl">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted w-5 h-5" />
        <input 
          type="text" 
          placeholder={t('faq.searchPlace')} 
          className="w-full bg-sidebar rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-text-muted border border-gray-200/50 shadow-sm"
        />
      </div>

      {/* Grid Layout Row 1 */}
      <div className="grid grid-cols-12 gap-6 items-stretch">
        
        {/* Getting Started Section (Gold/Beige Theme) */}
        <div className="col-span-8 bg-[#F3E5CD] border border-[#E7D6BD] rounded-[32px] p-8 flex flex-col gap-6 relative overflow-hidden">
          
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#5D4E3C] text-[#F3E5CD] flex items-center justify-center shadow-md shrink-0">
              <Rocket size={22} />
            </div>
            <h2 className="text-2xl font-extrabold text-[#5D4E3C] tracking-tight">{t('faq.gettingStarted')}</h2>
          </div>

          <div className="flex flex-col gap-3">
            <AccordionItem 
              question={t('faq.question1')} 
              answer={t('faq.answer1')}
              isOpen={openItems.q1}
              onToggle={() => toggleItem('q1')}
              textColor="text-[#5D4E3C]"
            />
            <AccordionItem 
              question={t('faq.question2')} 
              answer={t('faq.answer2')}
              isOpen={openItems.q2}
              onToggle={() => toggleItem('q2')}
              textColor="text-[#5D4E3C]"
            />
          </div>
        </div>

        {/* Pro Tips Section (Dark Green/Teal Theme) */}
        <div className="col-span-4 bg-[#4E7164] border border-[#3E5C50] rounded-[32px] p-8 flex flex-col gap-6 text-white relative overflow-hidden">
          
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center shadow-md shrink-0">
              <Lightbulb size={22} />
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight">{t('faq.proTips')}</h2>
          </div>

          <p className="text-sm font-semibold text-white/90">
            {t('faq.tipIntro')}
          </p>

          <div className="flex flex-col gap-4 text-xs font-semibold text-white/80">
            <div className="flex gap-3 items-start">
              <CheckCircle size={16} className="text-[#C2E1D9] shrink-0 mt-[2px]" />
              <span>{t('faq.tip1')}</span>
            </div>
            <div className="flex gap-3 items-start">
              <CheckCircle size={16} className="text-[#C2E1D9] shrink-0 mt-[2px]" />
              <span>{t('faq.tip2')}</span>
            </div>
          </div>

          <button className="w-full bg-[#C2E1D9] hover:bg-[#A3CEBE] text-[#1E3A31] transition-colors py-3.5 rounded-full font-bold text-sm shadow-sm mt-auto select-none">
            {t('faq.readGuide')}
          </button>
        </div>

      </div>

      {/* Grid Layout Row 2 - AI Capabilities & Usage (Purple/Indigo Theme) */}
      <div className="bg-[#5D5FEF] border border-[#4D4ECF] rounded-[32px] p-8 flex flex-col gap-6 text-white relative overflow-hidden">
        
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center shadow-md shrink-0">
            <Cpu size={22} />
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight">{t('faq.aiCapabilities')}</h2>
        </div>

        {/* 2-Column Accordion Layout */}
        <div className="grid grid-cols-2 gap-6 items-start">
          
          {/* Column 1 */}
          <div className="flex flex-col gap-3">
            <AccordionItem 
              question={t('faq.question3')} 
              answer={t('faq.answer3')}
              isOpen={openItems.q3}
              onToggle={() => toggleItem('q3')}
              textColor="text-[#4D4ECF]"
            />
            <AccordionItem 
              question={t('faq.question4')} 
              answer={t('faq.answer4')}
              isOpen={openItems.q4}
              onToggle={() => toggleItem('q4')}
              textColor="text-[#4D4ECF]"
            />
          </div>

          {/* Column 2 */}
          <div className="flex flex-col gap-3">
            <AccordionItem 
              question={t('faq.question5')} 
              answer={t('faq.answer5')}
              isOpen={openItems.q5}
              onToggle={() => toggleItem('q5')}
              textColor="text-[#4D4ECF]"
            />
          </div>

        </div>

      </div>

    </div>
  );
}

