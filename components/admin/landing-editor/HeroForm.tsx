import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { translations } from '@/lib/i18n/translations';

interface HeroConfig {
  tagline: string;
  description: string;
  ctaText: string;
  bgImageUrl: string;
}

interface Props {
  config: HeroConfig;
  onChange: (key: string, value: any) => void;
}

export default function HeroForm({ config, onChange }: Props) {
  const { language } = useLanguage();
  const t = translations[language].landingEditor;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="text-xs font-black text-primary uppercase tracking-wider mb-4">
          {t.heroContent}
        </h3>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-500 uppercase">{t.taglineLabel}</label>
            <textarea 
              value={config.tagline}
              onChange={(e) => onChange('tagline', e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none resize-none h-20"
              placeholder={t.taglinePlaceholder}
            />
            <p className="text-[10px] text-slate-400 font-medium text-right">{config.tagline.length}/80 {t.characters}</p>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-500 uppercase">{t.descriptionLabel}</label>
            <textarea 
              value={config.description}
              onChange={(e) => onChange('description', e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none resize-none h-24"
              placeholder={t.descriptionPlaceholder}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-500 uppercase">{t.ctaTextLabel}</label>
            <input 
              type="text" 
              value={config.ctaText}
              onChange={(e) => onChange('ctaText', e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              placeholder={t.ctaTextPlaceholder}
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-xs font-black text-primary uppercase tracking-wider mb-4">
          {t.heroImage}
        </h3>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-slate-500 uppercase">Image URL</label>
          <input 
            type="text" 
            value={config.bgImageUrl}
            onChange={(e) => onChange('bgImageUrl', e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            placeholder="https://..."
          />
          <div className="mt-2 w-full h-32 rounded-2xl bg-[#F8F9FA] dark:bg-[#1A1D27] border border-[#E2E8F0] dark:border-white/10 overflow-hidden relative group">
            {config.bgImageUrl ? (
              <img 
                src={config.bgImageUrl} 
                alt="Hero Background Preview" 
                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400 dark:text-slate-500 text-xs font-medium">
                {t.noImage}
              </div>
            )}
          </div>
          <p className="text-[10px] text-slate-400 font-medium">{t.bgImageUrlDesc}</p>
        </div>
      </div>
    </div>
  );
}
