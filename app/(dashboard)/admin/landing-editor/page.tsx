"use client";

import React, { useState, useEffect, useRef } from 'react';
import LandingView, { DEFAULT_CONFIG, DEFAULT_CONFIG_VI } from '@/components/views/LandingView';
import BrandForm from '@/components/admin/landing-editor/BrandForm';
import HistorySidebar from '@/components/admin/landing-editor/HistorySidebar';
import ImageUploader from '@/components/admin/landing-editor/ImageUploader';
import PopupDialog from '@/components/PopupDialog';
import { Save, RefreshCcw, LayoutTemplate, Palette, History, X, Plus, Trash2, RotateCcw, ChevronLeft, ChevronRight, EyeOff, Eye, ChevronDown, Edit2, Monitor, Smartphone } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { translations } from '@/lib/i18n/translations';

export default function LandingEditor() {
  const { language, setLanguage } = useLanguage();
  const t = translations[language].landingEditor;
  const [config, setConfig] = useState(DEFAULT_CONFIG_VI);
  const lastSavedConfig = useRef<typeof DEFAULT_CONFIG_VI>(DEFAULT_CONFIG_VI);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const [isTranslating, setIsTranslating] = useState(false);
  const viConfigRef = useRef<typeof DEFAULT_CONFIG_VI | null>(null);

  useEffect(() => {
    if (isInitialLoading) return;

    const translateConfig = async () => {
      const toLang = language;
      const fromLang = 'vi';

      if (toLang === 'vi') {
        // Only translate from Vietnamese to English. For English to Vietnamese, restore the original content.
        if (viConfigRef.current) {
          setConfig(viConfigRef.current);
        }
        return;
      }

      // Switching from Vietnamese to English, back up the original Vietnamese content
      viConfigRef.current = config;

      setIsTranslating(true);
      try {
        const textItems: { path: string[]; text: string }[] = [];

        // 1. Hero Slides
        const slides = config.heroSlides || [];
        slides.forEach((slide: any, idx: number) => {
          if (slide.tagline) textItems.push({ path: ['heroSlides', String(idx), 'tagline'], text: slide.tagline });
          if (slide.description) textItems.push({ path: ['heroSlides', String(idx), 'description'], text: slide.description });
          if (slide.ctaText) textItems.push({ path: ['heroSlides', String(idx), 'ctaText'], text: slide.ctaText });
        });

        // 2. Sections
        const sec = config.sections || {};
        if (sec.aboutTitle) textItems.push({ path: ['sections', 'aboutTitle'], text: sec.aboutTitle });
        if (sec.aboutContent) textItems.push({ path: ['sections', 'aboutContent'], text: sec.aboutContent });
        if (sec.featuresTitle) textItems.push({ path: ['sections', 'featuresTitle'], text: sec.featuresTitle });
        if (sec.ctaBannerTitle) textItems.push({ path: ['sections', 'ctaBannerTitle'], text: sec.ctaBannerTitle });
        if (sec.ctaBannerText) textItems.push({ path: ['sections', 'ctaBannerText'], text: sec.ctaBannerText });
        if (sec.ctaBannerBtn) textItems.push({ path: ['sections', 'ctaBannerBtn'], text: sec.ctaBannerBtn });
        if (sec.footerText) textItems.push({ path: ['sections', 'footerText'], text: sec.footerText });

        // Features list
        const features = sec.features || [];
        features.forEach((feat: any, idx: number) => {
          if (feat.title) textItems.push({ path: ['sections', 'features', String(idx), 'title'], text: feat.title });
          if (feat.desc) textItems.push({ path: ['sections', 'features', String(idx), 'desc'], text: feat.desc });
        });

        if (textItems.length === 0) return;

        // Call Translation API route in bulk
        const res = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ texts: textItems.map(item => item.text), from: fromLang, to: toLang })
        });

        if (res.ok) {
          const { translatedTexts } = await res.json();
          if (translatedTexts && translatedTexts.length === textItems.length) {
            setConfig(prev => {
              const newConfig = JSON.parse(JSON.stringify(prev));
              textItems.forEach((item, idx) => {
                const val = translatedTexts[idx];
                const path = item.path;
                if (path[0] === 'heroSlides') {
                  const slideIdx = Number(path[1]);
                  const field = path[2];
                  if (newConfig.heroSlides && newConfig.heroSlides[slideIdx]) {
                    newConfig.heroSlides[slideIdx][field] = val;
                  }
                } else if (path[0] === 'sections') {
                  if (path[1] === 'features') {
                    const featIdx = Number(path[2]);
                    const field = path[3];
                    if (newConfig.sections.features && newConfig.sections.features[featIdx]) {
                      newConfig.sections.features[featIdx][field] = val;
                    }
                  } else {
                    const field = path[1];
                    newConfig.sections[field] = val;
                  }
                }
              });
              return newConfig;
            });
          }
        }
      } catch (err) {
        console.error('Translation error:', err);
      } finally {
        setIsTranslating(false);
      }
    };

    translateConfig();
  }, [language, isInitialLoading]);

  // UI State
  const [editingField, setEditingField] = useState<{ section: string; field: string; index?: number } | null>(null);
  const [showBrandDrawer, setShowBrandDrawer] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Left sidebar
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [leftTab, setLeftTab] = useState<'brand' | 'history'>('brand');

  // Toolbar visibility
  const [toolbarVisible, setToolbarVisible] = useState(true);

  // Canvas scroll → header nổi lên
  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasScrolled, setCanvasScrolled] = useState(false);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const onScroll = () => setCanvasScrolled(el.scrollTop > 10);
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const openLeftPanel = (tab: 'brand' | 'history') => {
    setLeftTab(tab);
    setLeftSidebarOpen(true);
  };

  // Fetch initial draft
  useEffect(() => {
    const fetchDraft = async () => {
      try {
        const res = await fetch('/api/admin/landing-config');
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0) {
            const draftConfig: any = { brand: {}, heroSlides: null, sections: {} };
            data.forEach((item: any) => {
              if (item.section === 'heroSlides' && item.key === 'data') {
                draftConfig.heroSlides = item.value;
              } else if (draftConfig[item.section]) {
                draftConfig[item.section][item.key] = item.value;
              }
            });
            const merged = {
              brand: { ...DEFAULT_CONFIG_VI.brand, ...draftConfig.brand },
              heroSlides: draftConfig.heroSlides || DEFAULT_CONFIG_VI.heroSlides,
              sections: { ...DEFAULT_CONFIG_VI.sections, ...draftConfig.sections }
            };
            setConfig(merged);
            lastSavedConfig.current = merged;
          } else {
            lastSavedConfig.current = DEFAULT_CONFIG_VI;
          }
        }
      } catch (e) {
        console.error("Failed to fetch draft config", e);
      } finally {
        setIsInitialLoading(false);
      }
    };
    fetchDraft();
  }, []);

  const updateConfig = (section: keyof typeof config, key: string, value: any) => {
    if (section === 'heroSlides') {
      setConfig(prev => ({ ...prev, heroSlides: value }));
      return;
    }
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
  };

  const updateArrayItem = (section: keyof typeof config, field: string, index: number, itemKey: string, value: any) => {
    const arr = [...(config as any)[section][field]];
    arr[index] = { ...arr[index], [itemKey]: value };
    updateConfig(section, field, arr);
  };

  const updatePrimitiveArrayItem = (section: keyof typeof config, field: string, index: number, value: any) => {
    const arr = [...(config as any)[section][field]];
    arr[index] = value;
    updateConfig(section, field, arr);
  };

  const [popupInfo, setPopupInfo] = useState<{ isOpen: boolean; message: string; type: 'success' | 'error' | 'warning' | 'info' }>({
    isOpen: false,
    message: '',
    type: 'info'
  });
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const handleResetToDefault = () => {
    setConfig(DEFAULT_CONFIG);
    setConfirmReset(false);
    setPopupInfo({ isOpen: true, message: t.resetSuccess, type: 'success' });
  };

  const isEqualConfig = (a: any, b: any): boolean => {
    const stringifySorted = (obj: any): string => {
      if (Array.isArray(obj)) return JSON.stringify(obj.map(stringifySorted));
      if (obj !== null && typeof obj === 'object') {
        const keys = Object.keys(obj).sort();
        const sortedObj: any = {};
        keys.forEach(k => { sortedObj[k] = stringifySorted(obj[k]); });
        return JSON.stringify(sortedObj);
      }
      return JSON.stringify(obj);
    };
    return stringifySorted(a) === stringifySorted(b);
  };

  const saveDraft = async (silent = false): Promise<boolean> => {
    // If in English mode, save the backed up Vietnamese configuration to database
    const configToSave = (language === 'en' && viConfigRef.current) ? viConfigRef.current : config;

    // Prevent saving if the user manually tries to save the default configuration
    if (isEqualConfig(configToSave, DEFAULT_CONFIG_VI)) {
      setPopupInfo({
        isOpen: true,
        message: language === 'vi' 
          ? 'Không thể lưu cấu hình mặc định. Vui lòng chỉnh sửa nội dung trước khi lưu.' 
          : 'Cannot save the default configuration. Please edit content before saving.',
        type: 'warning'
      });
      return false; // NEVER allow saving default, whether silent or not
    }

    // Prevent saving if the current configuration is identical to the last saved state
    if (isEqualConfig(configToSave, lastSavedConfig.current)) {
      if (!silent) {
        setPopupInfo({ isOpen: true, message: t.noChangesToSave, type: 'info' });
      }
      return false;
    }

    setIsSaving(true);
    try {
      const updates = [];
      for (const [section, sectionData] of Object.entries(configToSave)) {
        if (section === 'heroSlides') {
          updates.push(
            fetch('/api/admin/landing-config', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ section: 'heroSlides', key: 'data', value: sectionData })
            })
          );
        } else {
          for (const [key, value] of Object.entries(sectionData || {})) {
            updates.push(
              fetch('/api/admin/landing-config', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ section, key, value })
              })
            );
          }
        }
      }
      
      const results = await Promise.all(updates);
      for (const res of results) {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || res.statusText || t.saveFail);
        }
      }

      lastSavedConfig.current = config;
      if (!silent) {
        setPopupInfo({ isOpen: true, message: t.saveSuccess, type: 'success' });
      }
      return true;
    } catch (e: any) {
      if (!silent) {
        setPopupInfo({ isOpen: true, message: `${t.saveFail}: ${e.message}`, type: 'error' });
      }
      throw e; // Rethrow to stop publish if it was called from executePublish
    } finally {
      setIsSaving(false);
    }
  };

  const executePublish = async () => {
    const configToPublish = (language === 'en' && viConfigRef.current) ? viConfigRef.current : config;
    const isDefault = isEqualConfig(configToPublish, DEFAULT_CONFIG_VI);

    setIsPublishing(true);
    try {
      if (isDefault) {
        const resClear = await fetch('/api/admin/landing-config', { method: 'DELETE' });
        if (!resClear.ok) throw new Error('Failed to clear database configuration');
        lastSavedConfig.current = DEFAULT_CONFIG_VI;

        const res = await fetch('/api/admin/landing-config/publish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ note: 'Khôi phục Mặc định', skipHistory: true })
        });
        if (res.ok) {
          setPopupInfo({ isOpen: true, message: t.publishSuccess, type: 'success' });
        } else {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || res.statusText);
        }
      } else {
        await saveDraft(true).catch((e) => {
          throw e;
        });
        const res = await fetch('/api/admin/landing-config/publish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ note: 'Inline Editor Publish' })
        });
        if (res.ok) {
          setPopupInfo({ isOpen: true, message: t.publishSuccess, type: 'success' });
        } else {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || res.statusText);
        }
      }
    } catch (e: any) {
      setPopupInfo({ isOpen: true, message: `${t.publishError}: ${e.message}`, type: 'error' });
    } finally {
      setIsPublishing(false);
    }
  };

  // -------------------------------------------------------------
  // RENDER EDIT FORMS
  // -------------------------------------------------------------
  const renderEditForm = () => {
    if (!editingField) return null;
    const { section, field, index } = editingField;

    // 1. HERO SLIDES
    if (section === 'heroSlides') {
      return (
        <div className="flex flex-col gap-6">
          <div className="flex justify-between items-center bg-primary/10 p-3 rounded-lg">
            <span className="font-bold text-sm text-primary">{t.manageBanners}</span>
            <button 
              onClick={() => {
                const newSlides = [...config.heroSlides, { tagline: 'NEW BANNER', description: '', ctaText: 'Click Here', bgImageUrl: '' }];
                updateConfig('heroSlides', 'data', newSlides);
              }}
              className="flex items-center gap-1 bg-primary text-white px-3 py-1.5 rounded-md text-xs font-bold hover:bg-primary-hover transition-colors focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
            >
              <Plus size={14} /> {t.addSlide}
            </button>
          </div>

          {config.heroSlides.map((slide, i) => (
            <div key={i} className="border border-[#E2E8F0] dark:border-white/10 rounded-xl p-4 bg-[#F8F9FA] dark:bg-[#1A1D27] relative group">
              <button 
                onClick={() => {
                  const newSlides = config.heroSlides.filter((_, idx) => idx !== i);
                  updateConfig('heroSlides', 'data', newSlides);
                }}
                className="absolute top-4 right-4 text-red-400 hover:text-red-600 p-1.5 bg-red-50 rounded-md opacity-0 group-hover:opacity-100 transition-opacity focus-visible:ring-2 focus-visible:ring-red-500/40 focus-visible:outline-none"
              >
                <Trash2 size={14} />
              </button>
              
              <h4 className="font-extrabold text-xs text-slate-500 uppercase mb-4 tracking-wider">{t.slide} {i + 1}</h4>
              
              <div className="flex flex-col gap-4">
                <ImageUploader 
                  value={slide.bgImageUrl} 
                  onChange={v => {
                    const newSlides = [...config.heroSlides];
                    newSlides[i].bgImageUrl = v;
                    updateConfig('heroSlides', 'data', newSlides);
                  }} 
                />
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">{t.title}</label>
                  <input className="px-3 py-2 border rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary focus-visible:outline-none" value={slide.tagline} onChange={e => {
                    const newSlides = [...config.heroSlides];
                    newSlides[i].tagline = e.target.value;
                    updateConfig('heroSlides', 'data', newSlides);
                  }} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">{t.subtitle}</label>
                  <textarea className="px-3 py-2 border rounded-lg h-20 outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary focus-visible:outline-none" value={slide.description} onChange={e => {
                    const newSlides = [...config.heroSlides];
                    newSlides[i].description = e.target.value;
                    updateConfig('heroSlides', 'data', newSlides);
                  }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    // 2. FEATURES ARRAY
    if (section === 'sections' && field === 'features' && index !== undefined) {
      const feature = config.sections.features[index];
      return (
        <div className="flex flex-col gap-4">
          <ImageUploader value={feature.image} onChange={v => updateArrayItem('sections', 'features', index, 'image', v)} />
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">{t.titleLabel}</label>
            <input className="px-3 py-2 border rounded-lg" value={feature.title} onChange={e => updateArrayItem('sections', 'features', index, 'title', e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">{t.iconLabel}</label>
            <input className="px-3 py-2 border rounded-lg" value={feature.icon} onChange={e => updateArrayItem('sections', 'features', index, 'icon', e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">{t.descLabel}</label>
            <textarea className="px-3 py-2 border rounded-lg h-24" value={feature.desc} onChange={e => updateArrayItem('sections', 'features', index, 'desc', e.target.value)} />
          </div>
        </div>
      );
    }

    // 3. TRUSTED BY LOGOS
    if (section === 'sections' && field === 'trustedByLogos') {
      const logos = (config.sections as any).trustedByLogos || [];
      return (
        <div className="flex flex-col gap-6">
          <div className="flex justify-between items-center bg-primary/10 p-3 rounded-lg">
            <span className="font-bold text-sm text-primary">{t.manageLogos}</span>
            <button onClick={() => updateConfig('sections', 'trustedByLogos', [...logos, ''])} className="flex items-center gap-1 bg-primary text-white px-3 py-1.5 rounded-md text-xs font-bold hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none">
              <Plus size={14} /> {t.addLogo}
            </button>
          </div>
          {logos.map((logo: string, i: number) => (
            <div key={i} className="border border-[#E2E8F0] dark:border-white/10 rounded-xl p-4 bg-[#F8F9FA] dark:bg-[#1A1D27] relative group">
              <button onClick={() => updateConfig('sections', 'trustedByLogos', logos.filter((_: any, idx: number) => idx !== i))} className="absolute top-4 right-4 text-red-400 hover:text-red-600 p-1.5 bg-red-50 rounded-md opacity-0 group-hover:opacity-100 focus-visible:ring-2 focus-visible:ring-red-500/40 focus-visible:outline-none">
                <Trash2 size={14} />
              </button>
              <h4 className="font-extrabold text-xs text-slate-500 uppercase mb-4 tracking-wider">{t.logoNumber?.replace('{number}', String(i + 1)) || `Logo ${i + 1}`}</h4>
              <ImageUploader value={logo} onChange={v => updatePrimitiveArrayItem('sections', 'trustedByLogos', i, v)} />
            </div>
          ))}
        </div>
      );
    }

    // 4. STATS
    if (section === 'sections' && field === 'stats') {
      const stats = (config.sections as any).stats || [];
      return (
        <div className="flex flex-col gap-6">
          <div className="flex justify-between items-center bg-primary/10 p-3 rounded-lg">
            <span className="font-bold text-sm text-primary">{t.manageStats}</span>
            <button onClick={() => updateConfig('sections', 'stats', [...stats, { number: '0', label: 'New Stat' }])} className="flex items-center gap-1 bg-primary text-white px-3 py-1.5 rounded-md text-xs font-bold hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none">
              <Plus size={14} /> {t.addStat}
            </button>
          </div>
          {stats.map((stat: any, i: number) => (
            <div key={i} className="flex gap-2 items-center">
              <input className="px-3 py-2 border border-slate-200 rounded-lg w-1/3 outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary" placeholder={t.statNumberPlaceholder} value={stat.number} onChange={e => updateArrayItem('sections', 'stats', i, 'number', e.target.value)} />
              <input className="px-3 py-2 border border-slate-200 rounded-lg flex-1 outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary" placeholder={t.statLabelPlaceholder} value={stat.label} onChange={e => updateArrayItem('sections', 'stats', i, 'label', e.target.value)} />
              <button onClick={() => updateConfig('sections', 'stats', stats.filter((_: any, idx: number) => idx !== i))} className="p-2 text-red-500 hover:bg-red-50 rounded-lg focus-visible:ring-2 focus-visible:ring-red-500/40 focus-visible:outline-none">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      );
    }

    // 5. TESTIMONIALS
    if (section === 'sections' && field === 'testimonials') {
      const tms = (config.sections as any).testimonials || [];
      return (
        <div className="flex flex-col gap-6">
          <div className="flex justify-between items-center bg-primary/10 p-3 rounded-lg">
            <span className="font-bold text-sm text-primary">{t.manageReviews}</span>
            <button onClick={() => updateConfig('sections', 'testimonials', [...tms, { quote: '', author: '', role: '', avatar: '' }])} className="flex items-center gap-1 bg-primary text-white px-3 py-1.5 rounded-md text-xs font-bold hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none">
              <Plus size={14} /> {t.addReview}
            </button>
          </div>
          {tms.map((tItem: any, i: number) => (
            <div key={i} className="border border-[#E2E8F0] dark:border-white/10 rounded-xl p-4 bg-[#F8F9FA] dark:bg-[#1A1D27] relative group flex flex-col gap-2">
              <button onClick={() => updateConfig('sections', 'testimonials', tms.filter((_: any, idx: number) => idx !== i))} className="absolute top-4 right-4 text-red-400 hover:text-red-600 p-1.5 bg-red-50 rounded-md opacity-0 group-hover:opacity-100 z-10 focus-visible:ring-2 focus-visible:ring-red-500/40 focus-visible:outline-none">
                <Trash2 size={14} />
              </button>
              <ImageUploader value={tItem.avatar} onChange={v => updateArrayItem('sections', 'testimonials', i, 'avatar', v)} />
              <textarea className="px-3 py-2 border border-slate-200 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary" placeholder={t.quotePlaceholder} value={tItem.quote} onChange={e => updateArrayItem('sections', 'testimonials', i, 'quote', e.target.value)} />
              <input className="px-3 py-2 border border-slate-200 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary" placeholder={t.authorNamePlaceholder} value={tItem.author} onChange={e => updateArrayItem('sections', 'testimonials', i, 'author', e.target.value)} />
              <input className="px-3 py-2 border border-slate-200 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary" placeholder={t.authorRolePlaceholder} value={tItem.role} onChange={e => updateArrayItem('sections', 'testimonials', i, 'role', e.target.value)} />
            </div>
          ))}
        </div>
      );
    }

    // 6. PRICING
    if (section === 'sections' && field === 'pricing') {
      const prices = (config.sections as any).pricing || [];
      return (
        <div className="flex flex-col gap-6">
          <div className="flex justify-between items-center bg-primary/10 p-3 rounded-lg">
            <span className="font-bold text-sm text-primary">{t.managePricing}</span>
            <button onClick={() => updateConfig('sections', 'pricing', [...prices, { plan: 'New Plan', price: '$0', features: [] }])} className="flex items-center gap-1 bg-primary text-white px-3 py-1.5 rounded-md text-xs font-bold hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none">
              <Plus size={14} /> {t.addPlan}
            </button>
          </div>
          {prices.map((p: any, i: number) => (
            <div key={i} className="border border-[#E2E8F0] dark:border-white/10 rounded-xl p-4 bg-[#F8F9FA] dark:bg-[#1A1D27] relative group flex flex-col gap-2">
              <button onClick={() => updateConfig('sections', 'pricing', prices.filter((_: any, idx: number) => idx !== i))} className="absolute top-4 right-4 text-red-400 hover:text-red-600 p-1.5 bg-red-50 rounded-md opacity-0 group-hover:opacity-100 z-10 focus-visible:ring-2 focus-visible:ring-red-500/40 focus-visible:outline-none">
                <Trash2 size={14} />
              </button>
              <input className="px-3 py-2 border border-slate-200 rounded-lg font-bold outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary" placeholder={t.planNamePlaceholder} value={p.plan} onChange={e => updateArrayItem('sections', 'pricing', i, 'plan', e.target.value)} />
              <input className="px-3 py-2 border border-slate-200 rounded-lg text-2xl font-black text-primary outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary" placeholder={t.pricePlaceholder} value={p.price} onChange={e => updateArrayItem('sections', 'pricing', i, 'price', e.target.value)} />
              <textarea className="px-3 py-2 border border-slate-200 rounded-lg h-24 outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary" placeholder={t.featuresPlaceholder} value={(p.features || []).join('\n')} onChange={e => updateArrayItem('sections', 'pricing', i, 'features', e.target.value.split('\n'))} />
            </div>
          ))}
        </div>
      );
    }

    // 7. FAQ
    if (section === 'sections' && field === 'faq') {
      const faqs = (config.sections as any).faq || [];
      return (
        <div className="flex flex-col gap-6">
          <div className="flex justify-between items-center bg-primary/10 p-3 rounded-lg">
            <span className="font-bold text-sm text-primary">{t.manageFaq}</span>
            <button onClick={() => updateConfig('sections', 'faq', [...faqs, { q: 'Câu hỏi?', a: 'Trả lời...' }])} className="flex items-center gap-1 bg-primary text-white px-3 py-1.5 rounded-md text-xs font-bold hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none">
              <Plus size={14} /> {t.addFaq}
            </button>
          </div>
          {faqs.map((faq: any, i: number) => (
            <div key={i} className="border border-[#E2E8F0] dark:border-white/10 rounded-xl p-4 bg-[#F8F9FA] dark:bg-[#1A1D27] relative group flex flex-col gap-2">
              <button onClick={() => updateConfig('sections', 'faq', faqs.filter((_: any, idx: number) => idx !== i))} className="absolute top-4 right-4 text-red-400 hover:text-red-600 p-1.5 bg-red-50 rounded-md opacity-0 group-hover:opacity-100 z-10 focus-visible:ring-2 focus-visible:ring-red-500/40 focus-visible:outline-none">
                <Trash2 size={14} />
              </button>
              <input className="px-3 py-2 border border-slate-200 rounded-lg font-bold outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary" placeholder={t.faqQuestionPlaceholder} value={faq.q} onChange={e => updateArrayItem('sections', 'faq', i, 'q', e.target.value)} />
              <textarea className="px-3 py-2 border border-slate-200 rounded-lg h-24 outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary" placeholder={t.faqAnswerPlaceholder} value={faq.a} onChange={e => updateArrayItem('sections', 'faq', i, 'a', e.target.value)} />
            </div>
          ))}
        </div>
      );
    }

    // DEFAULT: Standard string fields
    const value = (config as any)[section]?.[field];
    
    // Image fields
    if (['logoUrl', 'bgImageUrl', 'image', 'avatar'].includes(field)) {
      return (
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-slate-500 uppercase">{t.editImage}</label>
          <ImageUploader value={value} onChange={v => updateConfig(section as any, field, v)} />
        </div>
      );
    }

    // Textarea fields
    if (['description', 'aboutContent', 'tagline', 'ctaBannerText', 'footerText'].includes(field)) {
      return (
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-slate-500 uppercase">{t.editText}</label>
          <textarea 
            className="w-full px-3 py-2 border border-slate-300 rounded-lg min-h-[120px] outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary focus-visible:outline-none" 
            value={value} 
            onChange={e => updateConfig(section as any, field, e.target.value)} 
          />
        </div>
      );
    }

    // Input fields
    return (
      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold text-slate-500 uppercase">{t.editTitleText}</label>
        <input 
          className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary focus-visible:outline-none" 
          type="text" 
          value={value} 
          onChange={e => updateConfig(section as any, field, e.target.value)} 
        />
      </div>
    );
  };

  const isDefaultConfig = isEqualConfig(
    (language === 'en' && viConfigRef.current) ? viConfigRef.current : config,
    DEFAULT_CONFIG_VI
  );

  if (isInitialLoading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-100 dark:bg-zinc-950">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mb-3" />
        <span className="text-xs font-semibold text-slate-500">{t.loading}</span>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-100 relative">

      {/* ── TOP TRIGGER – D-shape tab – click to scroll header into view ── */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 z-[9980] flex flex-col items-center group cursor-pointer"
        onClick={() => canvasRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
        title={t.scrollToTop}
      >
        {/* Glow */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-12 pointer-events-none rounded-full opacity-60 group-hover:opacity-90 transition-opacity duration-300"
          style={{
            background: 'radial-gradient(ellipse at top, var(--color-primary) 0%, transparent 70%)',
            filter: 'blur(14px)',
          }}
        />
        {/* D-shape pill */}
        <div
          className="relative flex items-center justify-center w-14 h-7 rounded-b-full transition-all duration-200 group-hover:h-10 group-hover:w-16 bg-primary shadow-lg shadow-primary/30"
        >
          <ChevronDown size={16} className="text-white" />
        </div>
      </div>


      {/* ── RIGHT SIDEBAR – Brand + History tabs ── */}
      <div
        className={`fixed right-0 top-0 bottom-0 z-[9970] flex flex-col bg-white dark:bg-zinc-950 border-l border-slate-200 dark:border-zinc-800 shadow-2xl transition-all duration-300 ease-in-out overflow-hidden ${
          leftSidebarOpen ? 'w-[360px]' : 'w-0'
        }`}
      >
        {leftSidebarOpen && (
          <>
            {/* Tab header */}
            <div className="flex items-center justify-between px-3 pt-3 pb-0 shrink-0 bg-slate-50 dark:bg-zinc-900 border-b border-slate-100 dark:border-zinc-800">
              <button
                onClick={() => setLeftSidebarOpen(false)}
                className="text-slate-400 hover:text-slate-700 rounded p-1 transition-colors focus-visible:outline-none mb-1"
                title="Đóng"
              >
                <ChevronRight size={16} />
              </button>
              <div className="flex gap-0.5">
                <button
                  onClick={() => setLeftTab('brand')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg text-[11px] font-bold uppercase tracking-wide transition-all focus-visible:outline-none ${
                    leftTab === 'brand'
                      ? 'bg-white dark:bg-zinc-950 text-primary border-b-2 border-primary'
                      : 'text-slate-500 hover:text-primary'
                  }`}
                >
                  <Palette size={12} /> {t.brand}
                </button>
                <button
                  onClick={() => setLeftTab('history')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg text-[11px] font-bold uppercase tracking-wide transition-all focus-visible:outline-none ${
                    leftTab === 'history'
                      ? 'bg-white dark:bg-zinc-950 text-primary border-b-2 border-primary'
                      : 'text-slate-500 hover:text-primary'
                  }`}
                >
                  <History size={12} /> {t.history}
                </button>
              </div>
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto">
              {leftTab === 'brand' && (
                <div className="p-4">
                  <BrandForm config={config.brand} onChange={(k, v) => updateConfig('brand', k, v)} />
                </div>
              )}
              {leftTab === 'history' && (
                <HistorySidebarInline
                  onRestore={(rawSnapshot: any) => {
                    let snapshot = rawSnapshot;
                    if (typeof rawSnapshot === 'string') {
                      try {
                        snapshot = JSON.parse(rawSnapshot);
                      } catch (e) {
                        console.error('Failed to parse snapshot JSON', e);
                        return;
                      }
                    }
                    if (!snapshot) return;

                    setConfig(prev => {
                      const prevBrand = prev?.brand || DEFAULT_CONFIG_VI.brand;
                      const prevSlides = prev?.heroSlides || DEFAULT_CONFIG_VI.heroSlides;
                      const prevSections = prev?.sections || DEFAULT_CONFIG_VI.sections;

                      return {
                        brand: { ...prevBrand, ...(snapshot.brand || {}) },
                        heroSlides: snapshot.heroSlides || prevSlides,
                        sections: { ...prevSections, ...(snapshot.sections || {}) }
                      };
                    });
                    setLeftSidebarOpen(false);
                  }}
                  t={t}
                  language={language}
                />
              )}
            </div>
          </>
        )}
      </div>

      {/* ── MAIN CANVAS (full width, overlay dims it when sidebar open) ── */}
      {/* Dark + blur overlay on canvas when sidebar is open */}
      {leftSidebarOpen && (
        <div
          onClick={() => setLeftSidebarOpen(false)}
          className="fixed inset-0 z-[9960] cursor-pointer transition-all duration-300"
          style={{
            background: 'rgba(0,0,0,0.30)',
            backdropFilter: 'blur(3px)',
            WebkitBackdropFilter: 'blur(3px)',
            right: '360px',
          }}
        />
      )}
      <div ref={canvasRef} className="flex-1 overflow-y-auto">
        <div className="min-h-full">
          <LandingView
            initialConfig={config}
            isEditor={true}
            onEditClick={(s, f, i) => {
              if (s === 'brand' && f === 'logoUrl') {
                openLeftPanel('brand');
              } else {
                setEditingField({ section: s, field: f, index: i });
              }
            }}
          />
        </div>
      </div>

      {/* Overlay tối + mờ khi header nổi lên trong canvas */}
      {canvasScrolled && (
        <div
          className="fixed inset-0 pointer-events-none z-[9955] transition-opacity duration-300"
          style={{
            top: '64px',
            right: leftSidebarOpen ? '360px' : 0,
            background: 'rgba(0,0,0,0.28)',
            backdropFilter: 'blur(3px)',
            WebkitBackdropFilter: 'blur(3px)',
          }}
        />
      )}

      {/* ── FLOATING TOOLBAR ── */}
      {toolbarVisible && (
        <div
          className={`fixed bottom-6 z-[9990] transition-all duration-300 left-1/2 -translate-x-1/2`}
          style={{ maxWidth: 'calc(100vw - 2rem)' }}
        >
          <div className="bg-white dark:bg-zinc-900 rounded-full shadow-2xl border border-slate-200 dark:border-zinc-700 px-2 py-2 flex items-center gap-1 md:gap-1.5 w-auto">

            {/* Left group: mode label + nav buttons */}
            <div className="flex items-center gap-1 md:gap-1.5 pl-2 md:pl-3 pr-2">

              {/* EDITOR MODE label */}
              <div className="hidden xl:flex items-center gap-1.5 pr-3 border-r border-slate-200 dark:border-zinc-700 shrink-0">
                <LayoutTemplate className="text-primary" size={15} />
                <span className="font-bold text-[10px] text-slate-700 dark:text-slate-200 uppercase tracking-wider">{t.mode}</span>
              </div>

              {/* Brand */}
              <button
                onClick={() => openLeftPanel('brand')}
                className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-primary focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none rounded-full px-2.5 py-1.5 font-semibold text-[10px] uppercase tracking-wide transition-colors shrink-0"
              >
                <Palette size={13} /> <span className="hidden lg:inline">{t.brand}</span>
              </button>

              {/* History */}
              <button
                onClick={() => openLeftPanel('history')}
                className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-primary focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none rounded-full px-2.5 py-1.5 font-semibold text-[10px] uppercase tracking-wide transition-colors shrink-0"
              >
                <History size={13} /> <span className="hidden lg:inline">{t.history}</span>
              </button>

              <div className="w-px h-4 bg-slate-200 dark:bg-zinc-700 mx-0.5 shrink-0" />

              {/* Reset to default */}
              <button
                onClick={() => setConfirmReset(true)}
                className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-primary focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none rounded-full px-2.5 py-1.5 font-semibold text-[10px] uppercase tracking-wide transition-colors shrink-0"
                title={t.resetDefaultTitle}
              >
                <RotateCcw size={12} /> <span className="hidden xl:inline">{t.resetDefault}</span>
              </button>

              {/* Hide UI */}
              <button
                onClick={() => setToolbarVisible(false)}
                className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 focus-visible:ring-2 focus-visible:ring-slate-400/40 focus-visible:outline-none rounded-full px-2.5 py-1.5 font-semibold text-[10px] uppercase tracking-wide transition-colors shrink-0"
                title={t.hideUITitle}
              >
                <EyeOff size={12} /> <span className="hidden xl:inline">{t.hideUI}</span>
              </button>

              <div className="w-px h-4 bg-slate-200 dark:bg-zinc-700 mx-0.5 shrink-0" />

              {/* Save Draft */}
              <button
                onClick={() => saveDraft()}
                disabled={isSaving || isDefaultConfig}
                className="bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-200 px-3 py-1.5 rounded-full font-semibold text-[10px] uppercase tracking-wide transition-colors flex items-center gap-1.5 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none shrink-0"
              >
                <Save size={12} />
                <span className="hidden lg:inline">{isSaving ? t.saving : t.saveDraft}</span>
              </button>
            </div>

            {/* Publish — standalone pill flush-right */}
            <button
              onClick={() => setConfirmPublish(true)}
              disabled={isPublishing}
              className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-full font-bold text-[10px] uppercase tracking-wide transition-all active:scale-95 flex items-center gap-1.5 disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1 focus-visible:outline-none shrink-0"
            >
              <RefreshCcw size={12} className={isPublishing ? 'animate-spin' : ''} />
              <span className="hidden md:inline">{isPublishing ? t.publishing : t.publishAction}</span>
            </button>
          </div>
        </div>
      )}

      {/* Restore toolbar when hidden */}
      {!toolbarVisible && (
        <button
          onClick={() => setToolbarVisible(true)}
          className="fixed bottom-6 right-6 z-[9990] bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 shadow-lg rounded-full p-3 text-slate-600 dark:text-slate-300 hover:text-primary transition-all"
          title={t.showUI}
        >
          <Eye size={18} />
        </button>
      )}

      {/* Inline Edit Popup Drawer */}
      {!!editingField && (
        <div className="fixed inset-0 z-[9999] flex justify-end bg-black/40 backdrop-blur-sm">
          <div className="bg-white shadow-2xl border-l border-slate-200 w-full max-w-md h-full overflow-hidden animate-in slide-in-from-right duration-300 flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <h3 className="font-extrabold text-slate-800 uppercase tracking-tight text-sm">{t.editContent}</h3>
              <button onClick={() => setEditingField(null)} className="text-slate-400 hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none rounded p-1">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {renderEditForm()}
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0">
              <button
                onClick={() => setEditingField(null)}
                className="px-6 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg font-bold text-xs uppercase tracking-wide transition-colors focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                {t.done}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Brand Config Drawer (legacy fallback) */}
      {showBrandDrawer && (
        <div className="fixed inset-0 z-[9999] flex justify-end bg-black/40 backdrop-blur-sm">
          <div className="bg-white shadow-2xl border-l border-slate-200 w-full max-w-md h-full overflow-hidden animate-in slide-in-from-right duration-300 flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <h3 className="font-extrabold text-slate-800 uppercase tracking-tight text-sm">{t.brandConfig}</h3>
              <button onClick={() => setShowBrandDrawer(false)} className="text-slate-400 hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none rounded p-1">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <BrandForm config={config.brand} onChange={(k, v) => updateConfig('brand', k, v)} />
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0">
              <button
                onClick={() => setShowBrandDrawer(false)}
                className="px-6 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg font-bold text-xs uppercase tracking-wide transition-colors focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                {t.close}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Drawer (legacy) */}
      <HistorySidebar
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        onRestore={(snapshot) => {
          setConfig(prev => ({
            brand: { ...prev.brand, ...(snapshot.brand || {}) },
            heroSlides: snapshot.heroSlides || prev.heroSlides,
            sections: { ...prev.sections, ...(snapshot.sections || {}) }
          }));
          setShowHistory(false);
        }}
      />

      {/* Confirm Publish Modal */}
      {confirmPublish && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm p-6 text-center animate-in fade-in zoom-in-95 duration-200">
            <h3 className="font-extrabold text-slate-800 text-lg mb-2">{t.confirmPublishTitle}</h3>
            <p className="text-sm text-slate-500 mb-6 font-semibold">{t.confirmPublishDesc}</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setConfirmPublish(false)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-xs uppercase transition-colors focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none">{t.cancel}</button>
              <button onClick={() => { setConfirmPublish(false); executePublish(); }} className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-bold text-xs shadow-md uppercase transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-red-500/40 focus-visible:ring-offset-2 focus-visible:outline-none">{t.confirm}</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Reset Modal */}
      {confirmReset && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-zinc-800 w-full max-w-sm p-6 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <RotateCcw size={22} className="text-primary" />
            </div>
            <h3 className="font-extrabold text-slate-800 dark:text-zinc-150 text-lg mb-2">{t.confirmResetTitle}</h3>
            <p className="text-sm text-slate-500 dark:text-zinc-400 mb-6 font-semibold">{t.confirmResetDesc}</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setConfirmReset(false)} className="px-4 py-2 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 rounded-lg font-bold text-xs uppercase transition-colors focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none">{t.cancel}</button>
              <button onClick={handleResetToDefault} className="px-6 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg font-bold text-xs shadow-md uppercase transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:outline-none">{t.confirmResetAction}</button>
            </div>
          </div>
        </div>
      )}

      {/* Notifications */}
      <PopupDialog
        isOpen={popupInfo.isOpen}
        onClose={() => setPopupInfo(prev => ({ ...prev, isOpen: false }))}
        message={popupInfo.message}
        type={popupInfo.type}
      />

      {isTranslating && (
        <div className="fixed bottom-6 left-6 z-[9999] bg-white/85 dark:bg-zinc-900/85 border border-slate-200 dark:border-zinc-800 px-4 py-2.5 rounded-full shadow-lg backdrop-blur-md flex items-center gap-2 animate-in fade-in duration-200">
          <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-primary border-t-transparent" />
          <span className="text-[10px] font-bold text-slate-650 dark:text-zinc-300 uppercase tracking-wide">
            {language === 'vi' ? 'Đang dịch giao diện...' : 'Translating content...'}
          </span>
        </div>
      )}

    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Inline History Sidebar — rendered directly inside the left panel
// (same visual style as HistorySidebar.tsx but without fixed positioning)
// ──────────────────────────────────────────────────────────────────────────
function HistorySidebarInline({
  onRestore,
  t,
  language,
}: {
  onRestore: (snapshot: any) => void;
  t: any;
  language: string;
}) {
  const [history, setHistory] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/admin/landing-config/history');
        if (res.ok) setHistory(await res.json());
      } catch {}
      finally { setIsLoading(false); }
    };
    load();
  }, []);

  const [recordToRestore, setRecordToRestore] = React.useState<{ id: string; snapshot: any } | null>(null);
  const [recordToDelete, setRecordToDelete] = React.useState<string | null>(null);
  const [recordToRename, setRecordToRename] = React.useState<{ id: string; note: string } | null>(null);
  const [recordToPreview, setRecordToPreview] = React.useState<{ id: string; snapshot: any; note: string; created_at: string } | null>(null);
  const [previewMode, setPreviewMode] = React.useState<'desktop' | 'mobile'>('desktop');
  const [isRestoring, setIsRestoring] = React.useState(false);
  const [isRenaming, setIsRenaming] = React.useState(false);
  const [popup, setPopup] = React.useState<{ isOpen: boolean; message: string; type: 'success' | 'error' | 'warning' | 'info' }>({
    isOpen: false,
    message: '',
    type: 'info'
  });

  const [previewY, setPreviewY] = React.useState<number | null>(null);
  const hoverTimeoutRef = React.useRef<any>(null);

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>, record: any) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    const currentTarget = e.currentTarget;
    const note = record.note || '';
    const created_at = record.created_at;
    const id = record.id;
    const snapshot = record.config_snapshot;

    hoverTimeoutRef.current = setTimeout(() => {
      const rect = currentTarget.getBoundingClientRect();
      const itemHeight = rect.height;
      const previewHeight = 360;
      const targetY = rect.top + itemHeight / 2 - previewHeight / 2;
      const safeY = Math.max(20, Math.min(targetY, window.innerHeight - previewHeight - 20));
      setPreviewY(safeY);
      setRecordToPreview({ id, snapshot, note, created_at });
    }, 3000);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setRecordToPreview(null);
    setPreviewY(null);
  };

  React.useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  const previewScrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!recordToPreview) return;
    
    let animationFrameId: number;
    let lastTime = Date.now();
    let currentScroll = 0;
    let isPaused = false;
    let pauseStartTime = 0;
    const speed = 62.5; // Pixels per second (25% faster)

    const scrollLoop = () => {
      const el = previewScrollRef.current;
      if (el) {
        const now = Date.now();
        const delta = (now - lastTime) / 1000;
        lastTime = now;

        const maxScroll = el.scrollHeight - el.clientHeight;
        if (maxScroll > 0) {
          if (isPaused) {
            if (now - pauseStartTime >= 2000) {
              isPaused = false;
              currentScroll = 0;
              el.scrollTop = 0;
            }
          } else {
            currentScroll += speed * delta;
            if (currentScroll >= maxScroll) {
              currentScroll = maxScroll;
              el.scrollTop = maxScroll;
              isPaused = true;
              pauseStartTime = now;
            } else {
              el.scrollTop = currentScroll;
            }
          }
        }
      } else {
        lastTime = Date.now();
      }
      animationFrameId = requestAnimationFrame(scrollLoop);
    };

    animationFrameId = requestAnimationFrame(scrollLoop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [recordToPreview]);

  const handleRollback = async (id: string, snapshot: any) => {
    setRecordToRestore({ id, snapshot });
  };

  const executeRollback = async () => {
    if (!recordToRestore) return;
    const { id } = recordToRestore;
    setRecordToRestore(null);
    setIsRestoring(true);
    try {
      const res = await fetch(`/api/admin/landing-config/rollback/${id}`, { method: 'POST' });
      if (res.ok) {
        // Force window reload to update all content instead of setting state directly
        window.location.reload();
      } else {
        setIsRestoring(false);
      }
    } catch {
      setIsRestoring(false);
    }
  };

  const executeDelete = async () => {
    if (!recordToDelete) return;
    const id = recordToDelete;
    setRecordToDelete(null);
    try {
      const res = await fetch(`/api/admin/landing-config/history?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setHistory(prev => prev.filter(r => r.id !== id));
        setPopup({ isOpen: true, message: t.deleteSuccess, type: 'success' });
      } else {
        setPopup({ isOpen: true, message: t.deleteFail, type: 'error' });
      }
    } catch {
      setPopup({ isOpen: true, message: t.deleteFail, type: 'error' });
    }
  };

  const executeRename = async () => {
    if (!recordToRename) return;
    const { id, note } = recordToRename;
    setRecordToRename(null);
    setIsRenaming(true);
    try {
      const res = await fetch('/api/admin/landing-config/history', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, note })
      });
      if (res.ok) {
        setHistory(prev => prev.map(r => r.id === id ? { ...r, note } : r));
        setPopup({ isOpen: true, message: t.updateNameSuccess, type: 'success' });
      } else {
        setPopup({ isOpen: true, message: t.updateNameFail, type: 'error' });
      }
    } catch {
      setPopup({ isOpen: true, message: t.updateNameFail, type: 'error' });
    } finally {
      setIsRenaming(false);
    }
  };

  if (isLoading || isRestoring) {
    return <div className="text-xs text-slate-500 text-center py-10">{isRestoring ? t.restoring : t.loading}</div>;
  }
  if (history.length === 0) {
    return <div className="text-xs text-slate-500 text-center py-10">{t.noHistory}</div>;
  }

  return (
    <div className="p-4 flex flex-col gap-3">
      {history.map((record: any) => (
        <div
          key={record.id}
          onMouseEnter={(e) => handleMouseEnter(e, record)}
          onMouseLeave={handleMouseLeave}
          className="border border-slate-200 dark:border-zinc-800 rounded-2xl p-3 hover:border-primary/30 dark:hover:border-primary/40 transition-colors bg-white dark:bg-zinc-950/40 relative group cursor-pointer"
        >
          {/* Action Buttons Container */}
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
            {/* Rename Button */}
            <button
              onClick={(e) => { e.stopPropagation(); setRecordToRename({ id: record.id, note: record.note || '' }); }}
              className="text-slate-400 hover:text-primary p-1 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-lg cursor-pointer border-0 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              title={t.editVersionName}
            >
              <Edit2 size={13} />
            </button>
            {/* Delete History Button */}
            <button
              onClick={(e) => { e.stopPropagation(); setRecordToDelete(record.id); }}
              className="text-slate-400 hover:text-red-550 p-1 hover:bg-red-50 dark:hover:bg-red-955/20 rounded-lg cursor-pointer border-0 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none"
              title={t.deleteHistory}
            >
              <Trash2 size={13} />
            </button>
          </div>

          <div className="mb-2 pr-12">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded-lg uppercase">
              {new Date(record.created_at).toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US')}
            </span>
          </div>
          <p className="text-xs text-slate-700 dark:text-slate-300 font-medium mb-1 pr-12">{record.note || t.autoSaved}</p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-3 pr-12">
            {t.by}: {record.users?.email || 'Unknown'}
          </p>
          <button
            onClick={(e) => { e.stopPropagation(); handleRollback(record.id, record.config_snapshot); }}
            className="w-full flex items-center justify-center gap-1 py-1.5 bg-slate-50 dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-zinc-700 rounded-xl text-[10px] font-bold uppercase tracking-wide transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            <RotateCcw size={12} /> {t.restore}
          </button>
        </div>
      ))}

      {/* Custom Confirmation Restore Modal */}
      {recordToRestore && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-zinc-800 w-full max-w-sm p-6 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <RotateCcw size={22} className="text-primary" />
            </div>
            <h3 className="font-extrabold text-slate-800 dark:text-zinc-150 text-lg mb-2">{t.confirmRestoreTitle}</h3>
            <p className="text-sm text-slate-500 dark:text-zinc-400 mb-6 font-semibold">{t.confirmRestore}</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setRecordToRestore(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 rounded-lg font-bold text-xs uppercase transition-colors focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
              >
                {t.cancel}
              </button>
              <button
                onClick={executeRollback}
                className="px-6 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg font-bold text-xs shadow-md uppercase transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                {t.confirm}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirmation Delete Modal */}
      {recordToDelete && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-zinc-800 w-full max-w-sm p-6 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-955/20 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={22} className="text-red-550" />
            </div>
            <h3 className="font-extrabold text-slate-800 dark:text-zinc-150 text-lg mb-2">{t.confirmDeleteTitle}</h3>
            <p className="text-sm text-slate-500 dark:text-zinc-400 mb-6 font-semibold">{t.confirmDeleteDesc}</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setRecordToDelete(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 rounded-lg font-bold text-xs uppercase transition-colors focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
              >
                {t.cancel}
              </button>
              <button
                onClick={executeDelete}
                className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-bold text-xs shadow-md uppercase transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-red-500/40 focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                {t.deleteAction}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Rename Modal */}
      {recordToRename && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-zinc-800 w-full max-w-sm p-6 text-left animate-in fade-in zoom-in-95 duration-200">
            <h3 className="font-extrabold text-slate-800 dark:text-zinc-150 text-lg mb-2">{t.renameVersionTitle}</h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mb-4 font-semibold">{t.versionNameLabel}</p>
            <input
              type="text"
              className="w-full px-3 py-2 border border-slate-350 dark:border-zinc-700 bg-white dark:bg-zinc-950 rounded-lg text-xs font-semibold text-slate-800 dark:text-zinc-100 outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none mb-6"
              value={recordToRename.note}
              onChange={e => setRecordToRename(prev => prev ? { ...prev, note: e.target.value } : null)}
              placeholder={t.autoSaved}
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setRecordToRename(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 rounded-lg font-bold text-xs uppercase transition-colors focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
              >
                {t.cancel}
              </button>
              <button
                onClick={executeRename}
                className="px-6 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg font-bold text-xs shadow-md uppercase transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                {t.saveNameAction}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Preview Modal */}
      {recordToPreview && (() => {
        let snapshotObj = recordToPreview.snapshot;
        if (typeof snapshotObj === 'string') {
          try {
            snapshotObj = JSON.parse(snapshotObj);
          } catch (e) {
            console.error(e);
          }
        }
        const safeSnapshot = {
          brand: { ...DEFAULT_CONFIG_VI.brand, ...(snapshotObj?.brand || {}) },
          heroSlides: snapshotObj?.heroSlides || DEFAULT_CONFIG_VI.heroSlides,
          sections: { ...DEFAULT_CONFIG_VI.sections, ...(snapshotObj?.sections || {}) }
        };

        return (
          <div 
            className="fixed right-[380px] z-[9999] p-4 pointer-events-none animate-in fade-in slide-in-from-right-4 duration-200"
            style={{ top: previewY !== null ? `${previewY}px` : '20px' }}
          >
             <div className="relative w-[500px] h-[360px] border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden bg-white shadow-2xl flex flex-col">
               {/* Address bar (Mini browser header) */}
               <div className="h-6 bg-slate-100 dark:bg-zinc-900 border-b border-slate-200/80 dark:border-zinc-800 flex items-center px-2 gap-1 shrink-0">
                 <div className="flex gap-1 shrink-0">
                   <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-zinc-700" />
                   <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-zinc-700" />
                   <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-zinc-700" />
                 </div>
                 <div className="flex-1 text-[8px] font-bold text-slate-500 dark:text-zinc-400 text-center truncate">
                   {recordToPreview.note || t.autoSaved}
                 </div>
               </div>
               
               {/* Viewport wrapper with exact visual size */}
               <div className="flex-1 w-full overflow-hidden relative">
                 {/* Scaled container */}
                 <div
                   ref={previewScrollRef}
                   className="overflow-y-auto no-scrollbar absolute left-0 top-0 bg-slate-100 dark:bg-zinc-950"
                   style={{
                     width: '1200px',
                     height: '810px', // 336px / 0.415 = ~809.6px
                     transform: 'scale(0.415)',
                     transformOrigin: 'top left'
                   }}
                 >
                   <LandingView initialConfig={safeSnapshot} isPreview={true} isEditor={false} />
                 </div>
               </div>
             </div>
          </div>
        );
      })()}

      {/* History Toast Notifications */}
      <PopupDialog
        isOpen={popup.isOpen}
        onClose={() => setPopup(p => ({ ...p, isOpen: false }))}
        message={popup.message}
        type={popup.type}
      />
    </div>
  );
}
