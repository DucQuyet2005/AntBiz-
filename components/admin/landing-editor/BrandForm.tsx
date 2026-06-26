import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { translations } from '@/lib/i18n/translations';

interface BrandConfig {
  primaryColor: string;
  secondaryColor: string;
  bgColor: string;
  textColor: string;
  fontFamily: string;
  logoUrl: string;
}

interface Props {
  config: BrandConfig;
  onChange: (key: string, value: any) => void;
}

export default function BrandForm({ config, onChange }: Props) {
  const { language } = useLanguage();
  const t = translations[language].landingEditor;

  const fontFamilies = [
    { label: t.fontInter, value: 'Inter' },
    { label: t.fontRoboto, value: 'Roboto' },
    { label: t.fontMontserrat, value: 'Montserrat' },
    { label: t.fontBeVietnam, value: 'Be Vietnam Pro' }
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="text-xs font-black text-primary uppercase tracking-wider mb-4">
          {t.logo}
        </h3>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-slate-500 uppercase">{t.logo} URL</label>
          <input 
            type="text" 
            value={config.logoUrl}
            onChange={(e) => onChange('logoUrl', e.target.value)}
            className="w-full px-3 py-2 bg-[#F8F9FA] dark:bg-[#1A1D27] border border-[#E2E8F0] dark:border-white/10 rounded-xl text-sm font-medium focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none text-text"
            placeholder="https://..."
          />
          <p className="text-[10px] text-slate-400 font-medium">{t.logoUrlDesc}</p>
        </div>
      </div>

      <div>
        <h3 className="text-xs font-black text-primary uppercase tracking-wider mb-4">
          {t.typography}
        </h3>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-slate-500 uppercase">{t.fontFamilyLabel}</label>
          <select 
            value={config.fontFamily}
            onChange={(e) => onChange('fontFamily', e.target.value)}
            className="w-full px-3 py-2 bg-[#F8F9FA] dark:bg-[#1A1D27] border border-[#E2E8F0] dark:border-white/10 rounded-xl text-sm font-medium focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none text-text"
          >
            {fontFamilies.map(font => (
              <option key={font.value} value={font.value}>{font.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <h3 className="text-xs font-black text-primary uppercase tracking-wider mb-4">
          {t.colorPalette}
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">{t.primaryColor}</label>
            <div className="flex gap-2 items-center">
              <input 
                type="color" 
                value={config.primaryColor}
                onChange={(e) => onChange('primaryColor', e.target.value)}
                className="w-8 h-8 rounded-lg cursor-pointer border border-[#E2E8F0] dark:border-white/10 overflow-hidden p-0 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              />
              <input 
                type="text" 
                value={config.primaryColor}
                onChange={(e) => onChange('primaryColor', e.target.value)}
                className="w-full px-2.5 py-1.5 bg-[#F8F9FA] dark:bg-[#1A1D27] border border-[#E2E8F0] dark:border-white/10 rounded-lg text-xs font-mono uppercase focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none text-text"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">{t.secondaryColor}</label>
            <div className="flex gap-2 items-center">
              <input 
                type="color" 
                value={config.secondaryColor}
                onChange={(e) => onChange('secondaryColor', e.target.value)}
                className="w-8 h-8 rounded-lg cursor-pointer border border-[#E2E8F0] dark:border-white/10 overflow-hidden p-0 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              />
              <input 
                type="text" 
                value={config.secondaryColor}
                onChange={(e) => onChange('secondaryColor', e.target.value)}
                className="w-full px-2.5 py-1.5 bg-[#F8F9FA] dark:bg-[#1A1D27] border border-[#E2E8F0] dark:border-white/10 rounded-lg text-xs font-mono uppercase focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none text-text"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">{t.backgroundColor}</label>
            <div className="flex gap-2 items-center">
              <input 
                type="color" 
                value={config.bgColor}
                onChange={(e) => onChange('bgColor', e.target.value)}
                className="w-8 h-8 rounded-lg cursor-pointer border border-[#E2E8F0] dark:border-white/10 overflow-hidden p-0 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              />
              <input 
                type="text" 
                value={config.bgColor}
                onChange={(e) => onChange('bgColor', e.target.value)}
                className="w-full px-2.5 py-1.5 bg-[#F8F9FA] dark:bg-[#1A1D27] border border-[#E2E8F0] dark:border-white/10 rounded-lg text-xs font-mono uppercase focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none text-text"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">{t.textColor}</label>
            <div className="flex gap-2 items-center">
              <input 
                type="color" 
                value={config.textColor}
                onChange={(e) => onChange('textColor', e.target.value)}
                className="w-8 h-8 rounded-lg cursor-pointer border border-[#E2E8F0] dark:border-white/10 overflow-hidden p-0 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              />
              <input 
                type="text" 
                value={config.textColor}
                onChange={(e) => onChange('textColor', e.target.value)}
                className="w-full px-2.5 py-1.5 bg-[#F8F9FA] dark:bg-[#1A1D27] border border-[#E2E8F0] dark:border-white/10 rounded-lg text-xs font-mono uppercase focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none text-text"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
