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
    { label: 'Inter (Hiện đại, tối giản)', value: 'Inter' },
    { label: 'Roboto (Chuẩn mực)', value: 'Roboto' },
    { label: 'Montserrat (Đậm đà, cá tính)', value: 'Montserrat' },
    { label: 'Be Vietnam Pro (Bản địa hóa)', value: 'Be Vietnam Pro' }
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider mb-4 border-l-4 border-[#5A5CDE] pl-2">
          {t.logo}
        </h3>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-slate-500 uppercase">{t.logo} URL</label>
          <input 
            type="text" 
            value={config.logoUrl}
            onChange={(e) => onChange('logoUrl', e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-[#5A5CDE]/50 outline-none"
            placeholder="https://..."
          />
          <p className="text-[10px] text-slate-400 font-medium">Nhập URL hình ảnh logo (khuyến nghị định dạng PNG trong suốt, tỷ lệ 1:1 hoặc 3:1).</p>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider mb-4 border-l-4 border-[#5A5CDE] pl-2">
          Typography
        </h3>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-slate-500 uppercase">Font chữ chủ đạo</label>
          <select 
            value={config.fontFamily}
            onChange={(e) => onChange('fontFamily', e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-[#5A5CDE]/50 outline-none"
          >
            {fontFamilies.map(font => (
              <option key={font.value} value={font.value}>{font.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider mb-4 border-l-4 border-[#5A5CDE] pl-2">
          Bảng màu (Palette)
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">{t.primaryColor}</label>
            <div className="flex gap-2 items-center">
              <input 
                type="color" 
                value={config.primaryColor}
                onChange={(e) => onChange('primaryColor', e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border-0 p-0"
              />
              <input 
                type="text" 
                value={config.primaryColor}
                onChange={(e) => onChange('primaryColor', e.target.value)}
                className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs font-mono uppercase"
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
                className="w-8 h-8 rounded cursor-pointer border-0 p-0"
              />
              <input 
                type="text" 
                value={config.secondaryColor}
                onChange={(e) => onChange('secondaryColor', e.target.value)}
                className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs font-mono uppercase"
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
                className="w-8 h-8 rounded cursor-pointer border-0 p-0"
              />
              <input 
                type="text" 
                value={config.bgColor}
                onChange={(e) => onChange('bgColor', e.target.value)}
                className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs font-mono uppercase"
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
                className="w-8 h-8 rounded cursor-pointer border-0 p-0"
              />
              <input 
                type="text" 
                value={config.textColor}
                onChange={(e) => onChange('textColor', e.target.value)}
                className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs font-mono uppercase"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
