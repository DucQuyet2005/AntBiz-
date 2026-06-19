"use client";

import React, { useState, useEffect } from 'react';
import { Twitter, Linkedin, Instagram, Facebook, Youtube } from 'lucide-react';

// High-fidelity recreation of the user's geometric gradient ribbon logo
const BrandLogo = ({ size = 32 }: { size?: number }) => (
  <svg viewBox="0 0 100 100" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
    <defs>
      {/* Gradients from the user's logo image */}
      <linearGradient id="topRibbonGrad" x1="20%" y1="0%" x2="80%" y2="80%">
        <stop offset="0%" stopColor="#93C5FD" />
        <stop offset="50%" stopColor="#60A5FA" />
        <stop offset="100%" stopColor="#818CF8" />
      </linearGradient>
      
      <linearGradient id="bottomRibbonGrad" x1="30%" y1="100%" x2="70%" y2="0%">
        <stop offset="0%" stopColor="#93F5E7" />
        <stop offset="60%" stopColor="#34D399" />
        <stop offset="100%" stopColor="#059669" />
      </linearGradient>
      
      <linearGradient id="rightRibbonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#A7F3D0" />
        <stop offset="50%" stopColor="#FDE047" />
        <stop offset="100%" stopColor="#FCD34D" />
      </linearGradient>
    </defs>
    
    {/* Geometric folds representing the double-loop ribbon */}
    {/* Left/Bottom Loop */}
    <path 
      d="M30 65 L10 45 C5 35 15 20 30 30 L50 45 L35 75 Z" 
      fill="url(#topRibbonGrad)" 
      opacity="0.85" 
    />
    
    {/* Main overlapping helix ribbon */}
    <path 
      d="M50 50 L30 80 C20 95 45 95 60 80 L80 60 C90 50 75 30 60 40 Z" 
      fill="url(#bottomRibbonGrad)" 
      opacity="0.95" 
    />
    
    {/* Right/Top Loop */}
    <path 
      d="M50 50 L70 20 C80 5 95 20 85 35 L65 65 Z" 
      fill="url(#rightRibbonGrad)" 
      opacity="0.9" 
    />
  </svg>
);

import { useLanguage } from '@/contexts/LanguageContext';

const Footer = () => {
  const { language, setLanguage, t } = useLanguage();
  const isVi = language === 'vi';

  return (
    <footer className="mt-16 bg-[#E9EAF5] text-text w-full flex flex-col px-10 pb-8 rounded-t-[32px] border-t border-primary/10 shadow-inner relative overflow-hidden shrink-0">
      
      {/* Decorative top ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent blur-md"></div>

      <div className="pt-14 pb-8 grid grid-cols-12 gap-8 border-b border-primary/10 relative z-10">
        
        {/* Left Column - About (Flat, non-card static column to prevent scrolling issues) */}
        <div className="col-span-6 pr-8">
          <div className="flex flex-col gap-4">
            {/* Logo + Brand Name */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 flex items-center justify-center">
                <img
                  src="/images/logo.png"
                  alt="AntBiz Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="font-extrabold text-2xl tracking-tight text-text">
                AntBiz
              </span>
            </div>
            
            <div>
              <h3 className="text-base font-bold text-text mb-2">
                {t('footer.aboutUs')}
              </h3>
              <p className="text-xs text-text-muted mb-3 leading-relaxed font-medium">
                {t('footer.aboutDesc1')}
              </p>
              <p className="text-xs text-text-muted leading-relaxed font-medium">
                {t('footer.aboutDesc2')}
              </p>
            </div>
          </div>
        </div>

        {/* Middle Column - Menu */}
        <div className="col-span-3 flex flex-col pl-4">
          <h3 className="text-base font-extrabold text-text mb-4 tracking-tight">
            {t('footer.tableOfContents')}
          </h3>
          <div className="flex flex-col gap-2 text-xs text-text-muted font-semibold">
            <a href="#" className="hover:bg-primary/5 hover:text-primary px-3 py-1 rounded-xl transition-all w-fit">{t('footer.home')}</a>
            <a href="#" className="hover:bg-primary/5 hover:text-primary px-3 py-1 rounded-xl transition-all w-fit">{t('footer.company')}</a>
            <a href="#" className="hover:bg-primary/5 hover:text-primary px-3 py-1 rounded-xl transition-all w-fit">{t('footer.caseStudies')}</a>
            <a href="#" className="hover:bg-primary/5 hover:text-primary px-3 py-1 rounded-xl transition-all w-fit">{t('footer.services')}</a>
            <a href="#" className="hover:bg-primary/5 hover:text-primary px-3 py-1 rounded-xl transition-all w-fit">{t('footer.resources')}</a>
            <a href="#" className="hover:bg-primary/5 hover:text-primary px-3 py-1 rounded-xl transition-all w-fit">{t('footer.careers')}</a>
            <a href="#" className="hover:bg-primary/5 hover:text-primary px-3 py-1 rounded-xl transition-all w-fit">{t('footer.contactUs')}</a>
          </div>
        </div>

        {/* Right Column - Support */}
        <div className="col-span-3 flex flex-col">
          <h3 className="text-base font-extrabold text-text mb-4 tracking-tight">
            {t('footer.support')}
          </h3>
          <div className="flex flex-col gap-2 text-xs text-text-muted font-semibold">
            <a href="#" className="hover:bg-primary/5 hover:text-primary px-3 py-1 rounded-xl transition-all w-fit">{t('footer.help')}</a>
            <a href="#" className="hover:bg-primary/5 hover:text-primary px-3 py-1 rounded-xl transition-all w-fit">{t('footer.terms')}</a>
            <a href="#" className="hover:bg-primary/5 hover:text-primary px-3 py-1 rounded-xl transition-all w-fit">{t('footer.privacy')}</a>
            <a href="#" className="hover:bg-primary/5 hover:text-primary px-3 py-1 rounded-xl transition-all w-fit">{t('footer.privacyRights')}</a>
            <a href="#" className="hover:bg-primary/5 hover:text-primary px-3 py-1 rounded-xl transition-all w-fit">{t('footer.shipping')}</a>
            <a href="#" className="hover:bg-primary/5 hover:text-primary px-3 py-1 rounded-xl transition-all w-fit">{t('footer.returns')}</a>
          </div>
        </div>

      </div>

      {/* Bottom Bar */}
      <div className="pt-8 flex flex-col gap-6 relative z-10">
        
        {/* Social Icons row */}
        <div className="flex items-center gap-3.5 text-text-muted">
          <a href="#" className="w-10 h-10 rounded-full bg-white/50 border border-primary/10 hover:border-primary/25 hover:bg-[#1DA1F2] hover:text-white flex items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-sm">
            <Twitter size={16} />
          </a>
          <a href="#" className="w-10 h-10 rounded-full bg-white/50 border border-primary/10 hover:border-primary/25 hover:bg-[#0077B5] hover:text-white flex items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-sm">
            <Linkedin size={16} />
          </a>
          <a href="#" className="w-10 h-10 rounded-full bg-white/50 border border-primary/10 hover:border-primary/25 hover:bg-gradient-to-tr hover:from-[#f9ce34] hover:via-[#ee2a7b] hover:to-[#6228d7] hover:text-white flex items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-sm">
            <Instagram size={16} />
          </a>
          <a href="#" className="w-10 h-10 rounded-full bg-white/50 border border-primary/10 hover:border-primary/25 hover:bg-[#1877F2] hover:text-white flex items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-sm">
            <Facebook size={16} />
          </a>
          <a href="#" className="w-10 h-10 rounded-full bg-white/50 border border-primary/10 hover:border-primary/25 hover:bg-[#FF0000] hover:text-white flex items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-sm">
            <Youtube size={16} />
          </a>
        </div>

        {/* Language Badges */}
        <div className="flex items-center gap-2 text-[10px] text-text font-bold select-none">
          <button 
            onClick={() => setLanguage('en')}
            className={`border rounded-full px-3 py-1.5 flex items-center gap-1.5 transition-colors cursor-pointer text-text ${
              language === 'en' ? 'bg-white border-primary/30 shadow-sm' : 'bg-white/50 border-primary/10 hover:bg-white'
            }`}
          >
            <span>🇺🇸</span>
            <span>US</span>
          </button>
          <button 
            onClick={() => setLanguage('vi')}
            className={`border rounded-full px-3 py-1.5 flex items-center gap-1.5 transition-colors cursor-pointer text-text ${
              language === 'vi' ? 'bg-white border-primary/30 shadow-sm' : 'bg-white/50 border-primary/10 hover:bg-white'
            }`}
          >
            <span>🇻🇳</span>
            <span>VN</span>
          </button>
        </div>

        {/* Copyright notice */}
        <div className="text-[10px] text-text-muted font-semibold tracking-wide uppercase">
          {t('footer.copyright')}
        </div>
      </div>
    </footer>
  );
};

export default Footer;


