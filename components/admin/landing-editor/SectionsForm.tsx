import React from 'react';
import { Trash2, Plus, GripVertical } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { translations } from '@/lib/i18n/translations';

interface Feature {
  icon: string;
  title: string;
  desc: string;
  image: string;
}

interface SectionsConfig {
  aboutTitle: string;
  aboutContent: string;
  featuresTitle: string;
  features: Feature[];
  footerText: string;
}

interface Props {
  config: SectionsConfig;
  onChange: (key: string, value: any) => void;
}

export default function SectionsForm({ config, onChange }: Props) {
  const { language } = useLanguage();
  const t = translations[language].landingEditor;

  const addFeature = () => {
    onChange('features', [...config.features, { icon: 'Star', title: 'New Feature', desc: 'Description here', image: '' }]);
  };

  const updateFeature = (index: number, key: keyof Feature, value: string) => {
    const newFeatures = [...config.features];
    newFeatures[index] = { ...newFeatures[index], [key]: value };
    onChange('features', newFeatures);
  };

  const removeFeature = (index: number) => {
    const newFeatures = [...config.features];
    newFeatures.splice(index, 1);
    onChange('features', newFeatures);
  };

  return (
    <div className="flex flex-col gap-8">
      {/* 1. About Section */}
      <div>
        <h3 className="text-xs font-black text-primary uppercase tracking-wider mb-4">
          {t.aboutSection}
        </h3>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-500 uppercase">{t.h2Title}</label>
            <textarea 
              value={config.aboutTitle}
              onChange={(e) => onChange('aboutTitle', e.target.value)}
              className="w-full px-3 py-2 bg-[#F8F9FA] dark:bg-[#1A1D27] border border-[#E2E8F0] dark:border-white/10 rounded-xl text-sm font-bold focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none resize-none h-20 text-text"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-500 uppercase">{t.detailContent}</label>
            <textarea 
              value={config.aboutContent}
              onChange={(e) => onChange('aboutContent', e.target.value)}
              className="w-full px-3 py-2 bg-[#F8F9FA] dark:bg-[#1A1D27] border border-[#E2E8F0] dark:border-white/10 rounded-xl text-sm font-medium focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none resize-y min-h-[120px] text-text"
            />
            <p className="text-[10px] text-slate-400 font-medium">{t.htmlSupportDesc}</p>
          </div>
        </div>
      </div>

      <hr className="border-slate-100" />

      {/* 2. Features Section */}
      <div>
        <h3 className="text-xs font-black text-primary uppercase tracking-wider mb-4 flex justify-between items-center">
          <span>{t.featuresSection}</span>
          <button 
            onClick={addFeature}
            className="flex items-center gap-1 text-[10px] bg-primary/10 text-primary px-2.5 py-1.5 rounded-full font-bold hover:bg-primary/20 transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            <Plus size={12} /> {t.addFeature}
          </button>
        </h3>
        
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-500 uppercase">{t.h2Title}</label>
            <input 
              type="text"
              value={config.featuresTitle}
              onChange={(e) => onChange('featuresTitle', e.target.value)}
              className="w-full px-3 py-2 bg-[#F8F9FA] dark:bg-[#1A1D27] border border-[#E2E8F0] dark:border-white/10 rounded-xl text-sm font-bold focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none text-text"
            />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {config.features.map((feature, idx) => (
            <div key={idx} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm relative group">
              <div className="absolute top-4 left-2 text-slate-300 cursor-grab active:cursor-grabbing">
                <GripVertical size={16} />
              </div>
              <div className="pl-6 flex flex-col gap-3">
                <div className="flex gap-2">
                  <div className="flex-1 flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">{t.cardTitle}</label>
                    <input 
                       type="text"
                       value={feature.title}
                       onChange={(e) => updateFeature(idx, 'title', e.target.value)}
                       className="w-full px-2 py-1.5 bg-[#F8F9FA] dark:bg-[#1A1D27] border border-[#E2E8F0] dark:border-white/10 rounded-xl text-sm font-bold outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none text-text"
                    />
                  </div>
                  <div className="w-24 flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">{t.iconName}</label>
                    <input 
                       type="text"
                       value={feature.icon}
                       onChange={(e) => updateFeature(idx, 'icon', e.target.value)}
                       placeholder="lucide-icon"
                       className="w-full px-2 py-1.5 bg-[#F8F9FA] dark:bg-[#1A1D27] border border-[#E2E8F0] dark:border-white/10 rounded-xl text-xs font-mono outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none text-text"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">{t.imageUrl}</label>
                  <input 
                    type="text"
                    value={feature.image}
                    onChange={(e) => updateFeature(idx, 'image', e.target.value)}
                    className="w-full px-2 py-1.5 bg-[#F8F9FA] dark:bg-[#1A1D27] border border-[#E2E8F0] dark:border-white/10 rounded-xl text-xs font-mono outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none text-text"
                    placeholder="https://..."
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">{t.descLabel}</label>
                  <textarea 
                    value={feature.desc}
                    onChange={(e) => updateFeature(idx, 'desc', e.target.value)}
                    className="w-full px-2 py-1.5 bg-[#F8F9FA] dark:bg-[#1A1D27] border border-[#E2E8F0] dark:border-white/10 rounded-xl text-sm font-medium outline-none h-16 resize-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none text-text"
                  />
                </div>
              </div>
              <button 
                onClick={() => removeFeature(idx)}
                className="absolute top-4 right-4 text-red-400 hover:text-red-600 p-1.5 bg-red-50 hover:bg-red-100 rounded-lg opacity-0 group-hover:opacity-100 focus-within:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none transition-all"
                title={t.deleteCard}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <hr className="border-slate-100" />

      {/* 3. Footer Section */}
      <div>
        <h3 className="text-xs font-black text-primary uppercase tracking-wider mb-4">
          {t.footerSection}
        </h3>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-slate-500 uppercase">{t.copyrightLabel}</label>
          <input 
            type="text" 
            value={config.footerText}
            onChange={(e) => onChange('footerText', e.target.value)}
            className="w-full px-3 py-2 bg-[#F8F9FA] dark:bg-[#1A1D27] border border-[#E2E8F0] dark:border-white/10 rounded-xl text-sm font-medium focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none text-text"
          />
        </div>
      </div>
      
    </div>
  );
}
