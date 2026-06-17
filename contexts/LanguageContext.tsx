"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '@/lib/i18n/translations';

type Language = 'vi' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, variables?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguageState] = useState<Language>('vi');

  // Load language from localStorage on mount and listen to window events
  useEffect(() => {
    const savedLang = localStorage.getItem('lang') as Language;
    if (savedLang === 'en' || savedLang === 'vi') {
      setLanguageState(savedLang);
    } else {
      localStorage.setItem('lang', 'vi');
      setLanguageState('vi');
    }

    const handleLangChange = () => {
      const currentLang = localStorage.getItem('lang') as Language;
      if (currentLang === 'en' || currentLang === 'vi') {
        setLanguageState(currentLang);
      }
    };

    window.addEventListener('languageChange', handleLangChange);
    return () => {
      window.removeEventListener('languageChange', handleLangChange);
    };
  }, []);

  const setLanguage = (newLang: Language) => {
    setLanguageState(newLang);
    localStorage.setItem('lang', newLang);
    // Dispatch event to keep other contexts/instances in sync
    window.dispatchEvent(new Event('languageChange'));
  };

  const t = (key: string, variables?: Record<string, string | number>): string => {
    const keys = key.split('.');
    let result: any = translations[language];

    for (const k of keys) {
      if (result && typeof result === 'object' && k in result) {
        result = result[k];
      } else {
        // Fallback to English if Vietnamese key is missing
        let fallbackResult: any = translations['en'];
        for (const fk of keys) {
          if (fallbackResult && typeof fallbackResult === 'object' && fk in fallbackResult) {
            fallbackResult = fallbackResult[fk];
          } else {
            return key; // return key as fallback
          }
        }
        result = fallbackResult;
        break;
      }
    }

    if (typeof result !== 'string') {
      return key;
    }

    // Replace variables (e.g. {count})
    if (variables) {
      let templated = result;
      Object.entries(variables).forEach(([vKey, vVal]) => {
        templated = templated.replace(new RegExp(`{${vKey}}`, 'g'), String(vVal));
      });
      return templated;
    }

    return result;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
