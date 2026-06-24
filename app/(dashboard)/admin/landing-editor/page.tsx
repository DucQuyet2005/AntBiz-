"use client";

import React, { useState, useEffect } from 'react';
import LandingView, { DEFAULT_CONFIG } from '@/components/views/LandingView';
import BrandForm from '@/components/admin/landing-editor/BrandForm';
import HistorySidebar from '@/components/admin/landing-editor/HistorySidebar';
import ImageUploader from '@/components/admin/landing-editor/ImageUploader';
import PopupDialog from '@/components/PopupDialog';
import { Save, RefreshCcw, LayoutTemplate, Palette, History, X, Plus, Trash2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { translations } from '@/lib/i18n/translations';

export default function LandingEditor() {
  const { language } = useLanguage();
  const t = translations[language].landingEditor;
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  
  // UI State
  const [editingField, setEditingField] = useState<{ section: string; field: string; index?: number } | null>(null);
  const [showBrandDrawer, setShowBrandDrawer] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

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
            setConfig(prev => ({
              brand: { ...prev.brand, ...draftConfig.brand },
              heroSlides: draftConfig.heroSlides || prev.heroSlides,
              sections: { ...prev.sections, ...draftConfig.sections }
            }));
          }
        }
      } catch (e) {
        console.error("Failed to fetch draft config", e);
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

  const saveDraft = async () => {
    setIsSaving(true);
    try {
      const updates = [];
      for (const [section, sectionData] of Object.entries(config)) {
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

      setPopupInfo({ isOpen: true, message: t.saveSuccess, type: 'success' });
    } catch (e: any) {
      setPopupInfo({ isOpen: true, message: `${t.saveFail}: ${e.message}`, type: 'error' });
      throw e; // Rethrow to stop publish if it was called from executePublish
    } finally {
      setIsSaving(false);
    }
  };

  const executePublish = async () => {
    setIsPublishing(true);
    try {
      await saveDraft();
      const res = await fetch('/api/admin/landing-config/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: 'Inline Editor Publish' })
      });
      if (res.ok) {
        setPopupInfo({ isOpen: true, message: t.publishSuccess, type: 'success' });
      } else {
        const errData = await res.json().catch(() => ({}));
        setPopupInfo({ isOpen: true, message: `${t.publishFail}: ${errData.error || res.statusText}`, type: 'error' });
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
            <div key={i} className="border border-slate-200 rounded-xl p-4 bg-slate-50 relative group">
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
            <div key={i} className="border border-slate-200 rounded-xl p-4 bg-slate-50 relative group">
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
            <div key={i} className="border border-slate-200 rounded-xl p-4 bg-slate-50 relative group flex flex-col gap-2">
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
            <div key={i} className="border border-slate-200 rounded-xl p-4 bg-slate-50 relative group flex flex-col gap-2">
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
            <div key={i} className="border border-slate-200 rounded-xl p-4 bg-slate-50 relative group flex flex-col gap-2">
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

  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-100 relative">
      
      {/* Natively Rendered Live Preview Canvas */}
      <div className="flex-1 overflow-y-auto">
        <div className="min-h-full">
          <LandingView 
            initialConfig={config} 
            isEditor={true} 
            onEditClick={(s, f, i) => {
              if (s === 'brand' && f === 'logoUrl') {
                setShowBrandDrawer(true);
              } else {
                setEditingField({ section: s, field: f, index: i });
              }
            }} 
          />
        </div>
      </div>

      {/* Floating Toolbar */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-white rounded-full shadow-2xl border border-slate-200 px-4 py-3 flex items-center gap-4 z-[9990] animate-bounce-short">
        <div className="flex items-center gap-2 pr-4 border-r border-slate-200">
          <LayoutTemplate className="text-primary" size={20} />
          <span className="font-extrabold text-sm text-slate-800 uppercase tracking-wide">{t.mode}</span>
        </div>

        <button 
          onClick={() => setShowBrandDrawer(true)}
          className="flex items-center gap-2 text-slate-600 hover:text-primary focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none rounded-full px-2 py-1 font-bold text-xs uppercase transition-colors"
        >
          <Palette size={16} /> {t.brand}
        </button>

        <button 
          onClick={() => setShowHistory(true)}
          className="flex items-center gap-2 text-slate-600 hover:text-primary focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none rounded-full px-2 py-1 font-bold text-xs uppercase transition-colors"
        >
          <History size={16} /> {t.history}
        </button>

        <div className="w-[1px] h-6 bg-slate-200 mx-2" />

        <button
          onClick={saveDraft}
          disabled={isSaving}
          className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-full font-bold text-xs uppercase transition-colors flex items-center gap-2 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
        >
          <Save size={14} />
          {isSaving ? t.saving : t.saveDraft}
        </button>

        <button
          onClick={() => setConfirmPublish(true)}
          disabled={isPublishing}
          className="bg-primary hover:bg-primary-hover text-white px-6 py-2 rounded-full font-bold text-xs uppercase shadow-md shadow-primary/30 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          <RefreshCcw size={14} className={isPublishing ? "animate-spin" : ""} />
          {isPublishing ? t.publishing : t.publish}
        </button>
      </div>

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

      {/* Brand Config Drawer */}
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

      {/* History Drawer */}
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
               <button onClick={() => { setConfirmPublish(false); executePublish(); }} className="px-6 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg font-bold text-xs shadow-md uppercase transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:outline-none">{t.confirm}</button>
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

    </div>
  );
}
