"use client";

import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Check,
  Plus
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Footer from '@/components/Footer';

export const DEFAULT_CONFIG = {
  brand: {
    primaryColor: '#5A5CDE',
    secondaryColor: '#4A4CBF',
    bgColor: '#ffffff',
    textColor: '#1e293b',
    fontFamily: 'Inter',
    logoUrl: '/images/logo.png',
  },
  heroSlides: [
    {
      tagline: 'MULTI-CHANNEL AI PUBLISHING HUB',
      description: 'Optimize your content pipeline from scraping sources, generating AI variants via Gemini, to drag-and-drop Gantt calendar scheduling.',
      ctaText: 'Get Started Now',
      bgImageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1200'
    },
    {
      tagline: 'SCALE YOUR CONTENT REACH',
      description: 'Automate post scheduling and avoid collisions with our intelligent visual drag-and-drop calendar system.',
      ctaText: 'View Features',
      bgImageUrl: 'https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=1200'
    }
  ],
  sections: {
    aboutTitle: 'Developed in 2026, AntBiz is the premier multi-channel AI content publishing platform with secure execution across all marketing campaigns.',
    aboutContent: 'We comprehensively optimize the creative workflow of modern editors. By combining precise Cheerio data scraping, Gemini AI LLM copywriting, and drag-and-drop Gantt calendars with collision prevention, AntBiz automates high-quality content publication.',
    
    featuresTitle: 'What We Do',
    features: [
      {
        icon: 'Wand2',
        title: 'AI Copywriting',
        desc: 'Generate automated A/B copy variants optimized for Facebook, Instagram, and Threads with advanced Gemini AI models.',
        image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800'
      },
      {
        icon: 'CalendarDays',
        title: '2D Gantt Calendar',
        desc: 'Visual weekly Gantt board for drag-and-drop post scheduling. Features an automatic collision lock mechanism.',
        image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=800'
      },
      {
        icon: 'Archive',
        title: 'Archive & Checkpoints',
        desc: 'Smart campaign archives supporting background CSV export queues and post edit history logging.',
        image: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?q=80&w=800'
      }
    ],

    ctaBannerTitle: 'Ready to Transform Your Workflow?',
    ctaBannerText: 'Join thousands of editors publishing at scale today.',
    ctaBannerBtn: 'Start Free Trial',

    footerText: '© 2026 AntBiz. All rights reserved.'
  }
};

export const DEFAULT_CONFIG_VI = {
  brand: {
    primaryColor: '#5A5CDE',
    secondaryColor: '#4A4CBF',
    bgColor: '#ffffff',
    textColor: '#1e293b',
    fontFamily: 'Inter',
    logoUrl: '/images/logo.png',
  },
  heroSlides: [
    {
      tagline: 'HỆ ĐIỀU HÀNH XUẤT BẢN NỘI DUNG AI ĐA KÊNH',
      description: 'Tối ưu hóa quy trình từ cào bài viết gốc, sinh biến thể caption bằng Gemini AI, đến quản lý và lên lịch trên biểu đồ Gantt chống xung đột.',
      ctaText: 'Bắt đầu ngay',
      bgImageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1200'
    },
    {
      tagline: 'NÂNG TẦM ĐỘ PHỦ NỘI DUNG',
      description: 'Tự động hóa lập lịch bài viết và tránh xung đột thời gian với hệ thống lịch Gantt kéo thả trực quan thông minh.',
      ctaText: 'Xem các tính năng',
      bgImageUrl: 'https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=1200'
    }
  ],
  sections: {
    aboutTitle: 'Phát triển năm 2026, AntBiz là nền tảng xuất bản nội dung AI đa kênh hàng đầu với độ bảo mật tuyệt đối cho mọi chiến dịch marketing.',
    aboutContent: 'Chúng tôi tối ưu hóa toàn diện quy trình sáng tạo của biên tập viên hiện đại. Nhờ kết hợp thu thập dữ liệu bằng Cheerio, sinh caption AI bằng Gemini, và lên lịch trực quan chống trùng giờ, AntBiz giúp tự động hóa hoạt động phân phối nội dung chất lượng cao.',
    
    featuresTitle: 'Tính Năng Nổi Bật',
    features: [
      {
        icon: 'Wand2',
        title: 'Sáng tạo Caption AI',
        desc: 'Tự động sinh các biến thể A/B tối ưu riêng biệt cho Facebook, Instagram và Threads sử dụng mô hình Gemini AI tiên tiến.',
        image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800'
      },
      {
        icon: 'CalendarDays',
        title: 'Lịch biểu đồ Gantt 2D',
        desc: 'Bảng lập lịch kéo thả trực quan theo tuần với cơ chế Collision Lock tự động ngăn trùng lịch đăng bài.',
        image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=800'
      },
      {
        icon: 'Archive',
        title: 'Lưu trữ & Khôi phục',
        desc: 'Kho lưu trữ chiến dịch thông minh hỗ trợ xuất báo cáo CSV chạy ngầm và nhật ký lưu lịch sử chỉnh sửa caption.',
        image: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?q=80&w=800'
      }
    ],

    ctaBannerTitle: 'Sẵn sàng tối ưu hóa quy trình của bạn?',
    ctaBannerText: 'Đồng hành cùng hàng ngàn biên tập viên đang vận hành nội dung quy mô lớn mỗi ngày.',
    ctaBannerBtn: 'Trải nghiệm miễn phí',

    footerText: '© 2026 AntBiz. Bảo lưu mọi quyền.'
  }
};

interface Props {
  initialConfig?: any;
  isPreview?: boolean;
  isEditor?: boolean;
  onEditClick?: (section: string, key: string, index?: number) => void;
}

export default function LandingView({ initialConfig, isPreview = false, isEditor = false, onEditClick }: Props) {
  const { t, language, setLanguage } = useLanguage();
  
  // Merge initialConfig with defaults
  const [rawConfig, setRawConfig] = useState(() => {
    if (!initialConfig || Object.keys(initialConfig).length === 0) return DEFAULT_CONFIG;
    return {
      brand: { ...DEFAULT_CONFIG.brand, ...(initialConfig.brand || {}) },
      heroSlides: initialConfig.heroSlides || DEFAULT_CONFIG.heroSlides,
      sections: { ...DEFAULT_CONFIG.sections, ...(initialConfig.sections || {}) }
    };
  });

  const setConfig = setRawConfig;

  const getSlidesArray = (slides: any): any[] => {
    if (!slides) return [];
    if (Array.isArray(slides)) return slides;
    if (slides && typeof slides === 'object' && Array.isArray(slides.data)) return slides.data;
    return [];
  };

  // Localize values dynamically based on selected language
  const translateDefault = (section: string, field: string, value: any) => {
    if (language !== 'vi') return value;
    if (typeof value === 'string') {
      if (value === DEFAULT_CONFIG.sections.aboutTitle) return DEFAULT_CONFIG_VI.sections.aboutTitle;
      if (value === DEFAULT_CONFIG.sections.aboutContent) return DEFAULT_CONFIG_VI.sections.aboutContent;
      if (value === DEFAULT_CONFIG.sections.featuresTitle) return DEFAULT_CONFIG_VI.sections.featuresTitle;
      if (value === DEFAULT_CONFIG.sections.ctaBannerTitle) return DEFAULT_CONFIG_VI.sections.ctaBannerTitle;
      if (value === DEFAULT_CONFIG.sections.ctaBannerText) return DEFAULT_CONFIG_VI.sections.ctaBannerText;
      if (value === DEFAULT_CONFIG.sections.ctaBannerBtn) return DEFAULT_CONFIG_VI.sections.ctaBannerBtn;
      if (value === DEFAULT_CONFIG.sections.footerText) return DEFAULT_CONFIG_VI.sections.footerText;
    }
    return value;
  };

  const localizedSlides = getSlidesArray(rawConfig.heroSlides).map((slide: any, idx: number) => {
    if (language !== 'vi') return slide;
    const defaultSlide = DEFAULT_CONFIG.heroSlides[idx];
    if (defaultSlide && slide.tagline === defaultSlide.tagline) {
      const viSlide = DEFAULT_CONFIG_VI.heroSlides[idx];
      return {
        ...slide,
        tagline: viSlide.tagline,
        description: viSlide.description,
        ctaText: viSlide.ctaText,
      };
    }
    return slide;
  });

  const localizedFeatures = (rawConfig.sections.features || []).map((feature: any, idx: number) => {
    if (language !== 'vi') return feature;
    const defaultFeature = DEFAULT_CONFIG.sections.features[idx];
    if (defaultFeature && feature.title === defaultFeature.title) {
      const viFeature = DEFAULT_CONFIG_VI.sections.features[idx];
      return {
        ...feature,
        title: viFeature.title,
        desc: viFeature.desc,
      };
    }
    return feature;
  });

  const config = {
    ...rawConfig,
    heroSlides: localizedSlides,
    sections: {
      ...rawConfig.sections,
      aboutTitle: translateDefault('sections', 'aboutTitle', rawConfig.sections.aboutTitle),
      aboutContent: translateDefault('sections', 'aboutContent', rawConfig.sections.aboutContent),
      featuresTitle: translateDefault('sections', 'featuresTitle', rawConfig.sections.featuresTitle),
      ctaBannerTitle: translateDefault('sections', 'ctaBannerTitle', rawConfig.sections.ctaBannerTitle),
      ctaBannerText: translateDefault('sections', 'ctaBannerText', rawConfig.sections.ctaBannerText),
      ctaBannerBtn: translateDefault('sections', 'ctaBannerBtn', rawConfig.sections.ctaBannerBtn),
      footerText: translateDefault('sections', 'footerText', rawConfig.sections.footerText),
      features: localizedFeatures
    }
  };

  const [currentSlide, setCurrentSlide] = useState(0);

  // Auto-play Carousel (only if not in editor mode)
  useEffect(() => {
    if (!isEditor && config.heroSlides?.length > 1) {
      const timer = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % config.heroSlides.length);
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [config.heroSlides, isEditor]);

  // Sync state if initialConfig changes (for real-time updates from parent Editor)
  useEffect(() => {
    if (isEditor && initialConfig) {
      setConfig({
        brand: { ...DEFAULT_CONFIG.brand, ...(initialConfig.brand || {}) },
        heroSlides: initialConfig.heroSlides || DEFAULT_CONFIG.heroSlides,
        sections: { ...DEFAULT_CONFIG.sections, ...(initialConfig.sections || {}) }
      });
      // Ensure currentSlide is valid if a slide was deleted
      if (initialConfig.heroSlides && currentSlide >= initialConfig.heroSlides.length) {
        setCurrentSlide(Math.max(0, initialConfig.heroSlides.length - 1));
      }
    }
  }, [initialConfig, isEditor]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('logging_out');
    }
  }, []);

  // Derive dynamic CSS styles
  const dynamicStyles = {
    '--color-primary': config.brand.primaryColor,
    '--color-primary-hover': config.brand.secondaryColor,
    '--color-bg': config.brand.bgColor,
    '--color-text': config.brand.textColor,
    fontFamily: config.brand.fontFamily,
    backgroundColor: 'var(--color-bg)',
    color: 'var(--color-text)',
  } as React.CSSProperties;

  const DynamicIcon = ({ name }: { name: string }) => {
    return <div className="w-8 h-8 bg-[var(--color-primary)] text-white flex items-center justify-center rounded-lg font-bold text-xs">{name.charAt(0) || 'I'}</div>;
  };

  const EditableField = ({ 
    children, 
    section, 
    field, 
    index, 
    className = '' 
  }: { 
    children?: React.ReactNode, 
    section: string, 
    field: string, 
    index?: number,
    className?: string
  }) => {
    if (!isEditor) return <>{children}</>;
    
    return (
      <div 
        className={`relative group cursor-pointer transition-all ${className}`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onEditClick?.(section, field, index);
        }}
      >
        <div className="absolute -inset-2 border-2 border-dashed border-primary bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg pointer-events-none z-20 flex items-start justify-end p-1">
          <div className="bg-primary text-white p-1 rounded-sm shadow-md flex items-center justify-center gap-1 text-[10px] font-bold uppercase">
            <Edit2 size={12} /> Sửa
          </div>
        </div>
        <div className="relative z-10 pointer-events-none">
          {children}
        </div>
      </div>
    );
  };

  const currentHero = config.heroSlides?.[currentSlide] || config.heroSlides?.[0] || DEFAULT_CONFIG.heroSlides[0];

  const handlePrevSlide = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentSlide((prev) => (prev - 1 + config.heroSlides.length) % config.heroSlides.length);
  };

  const handleNextSlide = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentSlide((prev) => (prev + 1) % config.heroSlides.length);
  };

  return (
    <div className="min-h-screen antialiased flex flex-col selection:bg-[var(--color-primary)]/20" style={dynamicStyles}>
      
      {/* 1. STANDALONE HEADER */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/60 shadow-sm before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-[3px] before:bg-[var(--color-primary)] transition-all">
        <div className="max-w-7xl mx-auto px-6 md:px-12 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <EditableField section="brand" field="logoUrl">
              <div className="w-8 h-8 flex items-center justify-center">
                <img src={config.brand.logoUrl || '/images/logo.png'} alt="Brand Logo" className="w-full h-full object-contain" />
              </div>
            </EditableField>
            <div>
              <span className="font-extrabold text-lg tracking-tight block leading-none" style={{ color: 'var(--color-text)' }}>AntBiz</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            <Link href="/" className="text-slate-600 hover:text-[var(--color-primary)] font-bold text-xs uppercase tracking-wider transition-colors decoration-none focus-visible:ring-2 focus-visible:ring-primary focus:outline-none rounded px-1 py-0.5">
              {language === 'vi' ? 'Trang chủ' : 'Home'}
            </Link>
            <a href="#what-we-do" className="text-slate-600 hover:text-[var(--color-primary)] font-bold text-xs uppercase tracking-wider transition-colors decoration-none focus-visible:ring-2 focus-visible:ring-primary focus:outline-none rounded px-1 py-0.5">
              {language === 'vi' ? 'Tính năng' : 'Features'}
            </a>
            <Link href="/faq" className="text-slate-600 hover:text-[var(--color-primary)] font-bold text-xs uppercase tracking-wider transition-colors decoration-none focus-visible:ring-2 focus-visible:ring-primary focus:outline-none rounded px-1 py-0.5">
              {language === 'vi' ? 'Hỗ trợ & FAQ' : 'FAQ & Support'}
            </Link>
          </nav>

          <div className="flex items-center gap-4">
            <div className="flex gap-0.5 bg-slate-200/60 p-0.5 rounded-lg border border-slate-300">
              <button onClick={() => setLanguage("vi")} className={`px-2 py-0.5 rounded font-bold transition-all text-[10px] cursor-pointer border-0 focus-visible:ring-2 focus-visible:ring-primary focus:outline-none ${language === "vi" ? "bg-[var(--color-primary)] text-white shadow-sm" : "text-slate-500 hover:text-slate-800 bg-transparent"}`}>VN</button>
              <button onClick={() => setLanguage("en")} className={`px-2 py-0.5 rounded font-bold transition-all text-[10px] cursor-pointer border-0 focus-visible:ring-2 focus-visible:ring-primary focus:outline-none ${language === "en" ? "bg-[var(--color-primary)] text-white shadow-sm" : "text-slate-500 hover:text-slate-800 bg-transparent"}`}>EN</button>
            </div>

            <div className="flex items-center gap-2">
              <Link href="/login" className="bg-transparent hover:bg-slate-100 text-slate-700 border border-slate-300 py-2 rounded-full font-extrabold text-[10px] uppercase tracking-wider transition-all cursor-pointer decoration-none w-24 text-center inline-block focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus:outline-none" onClick={isEditor ? (e) => e.preventDefault() : undefined}>
                {language === 'vi' ? 'Đăng nhập' : 'Login'}
              </Link>
              <Link href="/register" className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white py-2 rounded-full font-extrabold text-[10px] uppercase tracking-wider transition-all cursor-pointer decoration-none border-0 w-24 text-center inline-block focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus:outline-none" onClick={isEditor ? (e) => e.preventDefault() : undefined}>
                {language === 'vi' ? 'Đăng ký' : 'Register'}
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* 2. HERO CAROUSEL */}
      <div className="relative w-full h-[450px] md:h-[620px] overflow-hidden bg-black select-none group">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url('${currentHero?.bgImageUrl}')` }}
          />
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/30" />
        
        <div className="absolute inset-x-4 bottom-16 md:bottom-24 flex flex-col items-center justify-center text-center max-w-4xl mx-auto z-10 px-4">
          <motion.h1 key={`title-${currentSlide}`} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-white text-3xl md:text-5xl font-black tracking-tight leading-tight mb-4 select-none drop-shadow-md uppercase">
            {currentHero?.tagline}
          </motion.h1>
          <motion.p key={`desc-${currentSlide}`} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="text-slate-200 text-xs md:text-base font-semibold max-w-2xl mb-6 leading-relaxed select-none drop-shadow">
            {currentHero?.description}
          </motion.p>
          <motion.button key={`btn-${currentSlide}`} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white px-8 py-3 rounded-full font-bold text-xs tracking-wider uppercase shadow-lg transition-all active:scale-95 flex items-center gap-2 cursor-pointer border-0 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus:outline-none">
            <span>{currentHero?.ctaText}</span>
            <ArrowRight size={14} />
          </motion.button>
        </div>

        {/* Dots Indicator */}
        {config.heroSlides?.length > 1 && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-20">
            {config.heroSlides.map((_: any, i: number) => (
              <button 
                key={i} 
                onClick={(e) => { e.stopPropagation(); setCurrentSlide(i); }} 
                className={`w-2 h-2 rounded-full transition-all focus-visible:ring-2 focus-visible:ring-primary focus:outline-none ${i === currentSlide ? 'bg-white w-6' : 'bg-white/50 hover:bg-white/80'}`}
              />
            ))}
          </div>
        )}

        {/* Editor Manual Navigation Arrows */}
        {isEditor && config.heroSlides?.length > 1 && (
          <>
            <button 
              onClick={handlePrevSlide}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-30 bg-black/30 hover:bg-black/60 text-white p-2 rounded-full backdrop-blur-sm transition-all focus-visible:ring-2 focus-visible:ring-primary focus:outline-none"
              title={language === 'vi' ? 'Slide trước' : 'Previous Slide'}
            >
              <ChevronLeft size={24} />
            </button>
            <button 
              onClick={handleNextSlide}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-30 bg-black/30 hover:bg-black/60 text-white p-2 rounded-full backdrop-blur-sm transition-all focus-visible:ring-2 focus-visible:ring-primary focus:outline-none"
              title={language === 'vi' ? 'Slide sau' : 'Next Slide'}
            >
              <ChevronRight size={24} />
            </button>
          </>
        )}

        {/* Editor Centered Edit Button */}
        {isEditor && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40">
            <button 
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEditClick?.('heroSlides', 'slideConfig'); }}
              className="bg-white hover:bg-slate-50 text-primary px-6 py-3 rounded-full font-black shadow-2xl flex items-center gap-2 text-sm uppercase transition-transform active:scale-95 border-2 border-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus:outline-none"
            >
              <Edit2 size={16} /> {language === 'vi' ? 'Chỉnh sửa Banners' : 'Edit Banners'}
            </button>
          </div>
        )}
      </div>

      {/* 4. INTRODUCTION (ABOUT) */}
      <section className="py-20 px-6 border-b border-slate-100" style={{ backgroundColor: 'var(--color-bg)' }}>
        <motion.div 
          initial={{ opacity: 0, y: 30 }} 
          whileInView={{ opacity: 1, y: 0 }} 
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto flex flex-col items-center text-center"
        >
          <EditableField section="brand" field="logoUrl">
            <img src={config.brand.logoUrl || '/images/logo.png'} alt="Brand Logo" className="w-16 h-16 object-contain mb-8 animate-pulse" />
          </EditableField>
          <EditableField section="sections" field="aboutTitle">
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-6 leading-snug" style={{ color: 'var(--color-text)' }}>{config.sections.aboutTitle}</h2>
          </EditableField>
          <EditableField section="sections" field="aboutContent">
            <p className="text-sm md:text-base leading-relaxed font-semibold max-w-3xl opacity-80" dangerouslySetInnerHTML={{ __html: config.sections.aboutContent }} />
          </EditableField>
        </motion.div>
      </section>

      {/* 6. FEATURES (WHAT WE DO) */}
      <section id="what-we-do" className="py-20 border-b border-slate-100 bg-slate-50 overflow-hidden">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} 
            whileInView={{ opacity: 1, scale: 1 }} 
            viewport={{ once: true, margin: "-50px" }}
          >
            <EditableField section="sections" field="featuresTitle" className="inline-block mx-auto mb-16 w-full text-center">
              <h2 className="text-3xl font-extrabold uppercase tracking-wider text-slate-800">{config.sections.featuresTitle}</h2>
            </EditableField>
          </motion.div>

          <div className="flex flex-col gap-10">
            {config.sections.features?.map((feature: any, idx: number) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, x: idx % 2 === 0 ? -50 : 50 }} 
                whileInView={{ opacity: 1, x: 0 }} 
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
              >
                <EditableField section="sections" field="features" index={idx}>
                  <div className="flex flex-col md:flex-row bg-white border border-slate-200/50 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 min-h-[280px]">
                    <div className="w-full md:w-1/2 h-[240px] md:h-auto overflow-hidden relative bg-slate-900">
                      <img src={feature.image || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800'} alt={feature.title} className="w-full h-full object-cover transition-transform duration-500 hover:scale-105" />
                    </div>
                    <div className="w-full md:w-1/2 p-8 flex flex-col justify-center">
                      <div className="border-l-4 pl-4 border-[var(--color-primary)]">
                        <h3 className="text-lg font-extrabold uppercase tracking-wide text-slate-800 flex items-center gap-2">
                          <DynamicIcon name={feature.icon} />
                          {feature.title}
                        </h3>
                      </div>
                      <p className="text-slate-500 text-sm mt-4 leading-relaxed font-semibold">{feature.desc}</p>
                    </div>
                  </div>
                </EditableField>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 10. CTA BANNER */}
      <section className="py-20 bg-gradient-to-br from-primary to-primary-hover text-center px-6">
        <div className="max-w-3xl mx-auto">
          <EditableField section="sections" field="ctaBannerTitle">
            <h2 className="text-3xl md:text-4xl font-black text-white mb-6 uppercase tracking-tight">{config.sections.ctaBannerTitle}</h2>
          </EditableField>
          <EditableField section="sections" field="ctaBannerText">
            <p className="text-white/80 font-semibold mb-10">{config.sections.ctaBannerText}</p>
          </EditableField>
          <EditableField section="sections" field="ctaBannerBtn">
            <button className="bg-white text-primary hover:bg-slate-50 px-10 py-4 rounded-full font-extrabold text-sm uppercase shadow-2xl transition-transform active:scale-95 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus:outline-none">{config.sections.ctaBannerBtn}</button>
          </EditableField>
        </div>
      </section>

      {/* 11. FOOTER */}
      <footer className="mt-auto flex flex-col w-full">
        {!isEditor && !isPreview && (
          <div className="w-full text-left text-base [&>footer]:mt-0 [&>footer]:rounded-none">
            <Footer />
          </div>
        )}
      </footer>

    </div>
  );
}
