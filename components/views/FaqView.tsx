"use client";

import React, { useState, useEffect } from 'react';
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
import { useSearchParams } from 'next/navigation';

export default function FaqView() {
  const { t, language } = useLanguage();
  const searchParams = useSearchParams();
  const keyParam = searchParams?.get('key');
  const qParam = searchParams?.get('q') || searchParams?.get('search');

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  // Handle auto-expanding and scrolling based on query parameters
  useEffect(() => {
    if (qParam) {
      setSearchQuery(qParam);
    }
    if (keyParam) {
      setExpandedItems(prev => ({
        ...prev,
        [keyParam]: true
      }));

      const timer = setTimeout(() => {
        const element = document.getElementById(`faq-${keyParam}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [keyParam, qParam]);

  const toggleItem = (key: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const isItemOpen = (key: string) => {
    if (searchQuery.trim() !== '') {
      return true; // Auto-expand all matching questions when searching
    }
    return !!expandedItems[key];
  };

  const categoriesList = [
    {
      id: 'harvesting',
      title: t('faq.categories.harvesting.title'),
      icon: <Rocket size={18} />,
      accentClass: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-100/50 dark:border-indigo-900/30',
      borderClass: 'hover:border-indigo-200/50 dark:hover:border-indigo-800/40 focus-within:border-indigo-300 dark:focus-within:border-indigo-600',
      questions: [
        { q: t('faq.categories.harvesting.q1'), a: t('faq.categories.harvesting.a1'), key: 'harvesting_1' },
        { q: t('faq.categories.harvesting.q2'), a: t('faq.categories.harvesting.a2'), key: 'harvesting_2' },
        { q: t('faq.categories.harvesting.q3'), a: t('faq.categories.harvesting.a3'), key: 'harvesting_3' },
        { q: t('faq.categories.harvesting.q4'), a: t('faq.categories.harvesting.a4'), key: 'harvesting_4' },
        { q: t('faq.categories.harvesting.q5'), a: t('faq.categories.harvesting.a5'), key: 'harvesting_5' }
      ]
    },
    {
      id: 'aiPrompts',
      title: t('faq.categories.aiPrompts.title'),
      icon: <Lightbulb size={18} />,
      accentClass: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-100/50 dark:border-emerald-900/30',
      borderClass: 'hover:border-emerald-200/50 dark:hover:border-emerald-800/40 focus-within:border-emerald-300 dark:focus-within:border-emerald-600',
      questions: [
        { q: t('faq.categories.aiPrompts.q1'), a: t('faq.categories.aiPrompts.a1'), key: 'aiPrompts_1' },
        { q: t('faq.categories.aiPrompts.q2'), a: t('faq.categories.aiPrompts.a2'), key: 'aiPrompts_2' },
        { q: t('faq.categories.aiPrompts.q3'), a: t('faq.categories.aiPrompts.a3'), key: 'aiPrompts_3' },
        { q: t('faq.categories.aiPrompts.q4'), a: t('faq.categories.aiPrompts.a4'), key: 'aiPrompts_4' },
        { q: t('faq.categories.aiPrompts.q5'), a: t('faq.categories.aiPrompts.a5'), key: 'aiPrompts_5' }
      ]
    },
    {
      id: 'scheduling',
      title: t('faq.categories.scheduling.title'),
      icon: <Cpu size={18} />,
      accentClass: 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/40 border-violet-100/50 dark:border-violet-900/30',
      borderClass: 'hover:border-violet-200/50 dark:hover:border-violet-800/40 focus-within:border-violet-300 dark:focus-within:border-violet-600',
      questions: [
        { q: t('faq.categories.scheduling.q1'), a: t('faq.categories.scheduling.a1'), key: 'scheduling_1' },
        { q: t('faq.categories.scheduling.q2'), a: t('faq.categories.scheduling.a2'), key: 'scheduling_2' },
        { q: t('faq.categories.scheduling.q3'), a: t('faq.categories.scheduling.a3'), key: 'scheduling_3' },
        { q: t('faq.categories.scheduling.q4'), a: t('faq.categories.scheduling.a4'), key: 'scheduling_4' },
        { q: t('faq.categories.scheduling.q5'), a: t('faq.categories.scheduling.a5'), key: 'scheduling_5' }
      ]
    },
    {
      id: 'customization',
      title: t('faq.categories.customization.title'),
      icon: <HelpCircle size={18} />,
      accentClass: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-100/50 dark:border-rose-900/30',
      borderClass: 'hover:border-rose-200/50 dark:hover:border-rose-800/40 focus-within:border-rose-300 dark:focus-within:border-rose-600',
      questions: [
        { q: t('faq.categories.customization.q1'), a: t('faq.categories.customization.a1'), key: 'customization_1' },
        { q: t('faq.categories.customization.q2'), a: t('faq.categories.customization.a2'), key: 'customization_2' },
        { q: t('faq.categories.customization.q3'), a: t('faq.categories.customization.a3'), key: 'customization_3' },
        { q: t('faq.categories.customization.q4'), a: t('faq.categories.customization.a4'), key: 'customization_4' },
        { q: t('faq.categories.customization.q5'), a: t('faq.categories.customization.a5'), key: 'customization_5' }
      ]
    }
  ];

  // Search filtering logic
  const filteredCategories = categoriesList.map(category => {
    const matchedQuestions = category.questions.filter(item => 
      item.q.toLowerCase().includes(searchQuery.toLowerCase()) || 
      item.a.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return {
      ...category,
      questions: matchedQuestions
    };
  }).filter(category => category.questions.length > 0);

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
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('faq.searchPlace')} 
          aria-label={t('faq.searchPlace') || "Search FAQ"}
          className="w-full bg-sidebar/50 rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus-visible:ring-2 focus-visible:ring-primary/40 placeholder:text-text-muted border border-gray-200/50 shadow-sm"
        />
      </div>

      {/* 2-Column Grid Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Categories List & Accordions */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
          {filteredCategories.length === 0 ? (
            <div className="bg-sidebar/50 border border-primary/10 rounded-2xl p-12 flex flex-col items-center text-center gap-2">
              <p className="font-bold text-text">
                {language === 'vi' ? 'Không tìm thấy câu hỏi phù hợp' : 'No matching questions found'}
              </p>
              <p className="text-text-muted text-xs">
                {language === 'vi' ? 'Thử tìm kiếm với từ khóa khác.' : 'Try searching with another keyword.'}
              </p>
            </div>
          ) : (
            filteredCategories.map((category) => (
              <div 
                key={category.id} 
                className={`bg-white border border-gray-200/60 rounded-2xl p-6 flex flex-col gap-4 shadow-sm transition-all duration-300 ${category.borderClass}`}
              >
                {/* Category Title */}
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 ${category.accentClass}`}>
                     {category.icon}
                  </div>
                  <h2 className="text-md font-black text-slate-800 dark:text-white tracking-tight">{category.title}</h2>
                </div>

                {/* Accordion Questions */}
                <div className="flex flex-col">
                  {category.questions.map((item) => {
                    const isOpen = isItemOpen(item.key);
                    return (
                      <div key={item.key} id={`faq-${item.key}`} className="w-full flex flex-col scroll-mt-20">
                        <button 
                          id={`faq-btn-${item.key}`}
                          onClick={() => toggleItem(item.key)}
                          aria-expanded={isOpen}
                          aria-controls={`faq-content-${item.key}`}
                          className="w-full text-left py-3.5 flex items-start justify-between text-sm font-bold text-slate-700 dark:text-slate-300 transition-colors hover:text-primary dark:hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 rounded-lg group cursor-pointer select-none"
                        >
                          <span className="pr-4 leading-tight">{item.q}</span>
                          <ChevronDown 
                            size={16} 
                            className={`text-slate-400 dark:text-slate-500 group-hover:text-primary dark:group-hover:text-primary transition-transform duration-300 shrink-0 mt-0.5 ${isOpen ? 'rotate-180' : ''}`} 
                          />
                        </button>
                        
                        <div 
                          id={`faq-content-${item.key}`}
                          role="region"
                          aria-labelledby={`faq-btn-${item.key}`}
                          className="overflow-hidden transition-all duration-300 ease-in-out"
                          style={{
                            maxHeight: isOpen ? '600px' : '0px',
                            opacity: isOpen ? 1 : 0,
                            pointerEvents: isOpen ? 'auto' : 'none'
                          }}
                        >
                          <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400 pb-4 font-semibold whitespace-pre-line border-b border-slate-100/80 dark:border-white/5">
                            {item.a}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Right Column: Tips & Support Sidebar */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
          
          {/* Pro Tips Section (Dynamic theme matching app primary gradient) */}
          <div className="bg-gradient-to-br from-primary to-primary-hover border border-primary/20 rounded-2xl p-6 text-white flex flex-col gap-4 shadow-sm relative overflow-hidden shrink-0">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-2xl -mr-6 -mt-6"></div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/20 text-white flex items-center justify-center shrink-0">
                <Lightbulb size={18} />
              </div>
              <h2 className="text-lg font-black tracking-tight">{t('faq.proTips')}</h2>
            </div>
            
            <p className="text-xs font-semibold text-white/95 leading-relaxed">
              {t('faq.tipIntro')}
            </p>

            <div className="flex flex-col gap-3 text-xs font-bold text-white">
              <div className="flex gap-2.5 items-start">
                <CheckCircle size={15} className="text-white/80 shrink-0 mt-[1px]" />
                <span className="leading-tight">{t('faq.tip1')}</span>
              </div>
              <div className="flex gap-2.5 items-start">
                <CheckCircle size={15} className="text-white/80 shrink-0 mt-[1px]" />
                <span className="leading-tight">{t('faq.tip2')}</span>
              </div>
            </div>
          </div>

          {/* Support Help Contact Card (Glassmorphic) */}
          <div className="bg-white border border-gray-200/60 rounded-2xl p-6 flex flex-col gap-4 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-10 -mt-10"></div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <HelpCircle size={18} />
              </div>
              <h2 className="text-lg font-black text-slate-800 tracking-tight">{t('faq.contactTitle')}</h2>
            </div>

            <p className="text-xs font-semibold text-slate-500 leading-relaxed">
              {t('faq.contactDesc')}
            </p>

            <button className="w-full bg-primary hover:bg-primary-hover text-white transition-all py-3 rounded-2xl font-black text-xs shadow-md shadow-primary/20 active:scale-95 cursor-pointer mt-2 flex items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
              <span>{t('faq.contactBtn')}</span>
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}
