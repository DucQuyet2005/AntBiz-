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

const Footer = () => {
  const [lang, setLang] = useState<'vi' | 'en'>('vi');

  // Load language on mount and listen to changes
  useEffect(() => {
    const savedLang = localStorage.getItem('lang') as 'vi' | 'en';
    if (savedLang === 'en' || savedLang === 'vi') {
      setLang(savedLang);
    } else {
      // Set default to Vietnamese
      localStorage.setItem('lang', 'vi');
      setLang('vi');
    }

    const handleLangChange = () => {
      const currentLang = localStorage.getItem('lang') as 'vi' | 'en';
      if (currentLang === 'en' || currentLang === 'vi') {
        setLang(currentLang);
      }
    };

    window.addEventListener('languageChange', handleLangChange);
    return () => {
      window.removeEventListener('languageChange', handleLangChange);
    };
  }, []);

  const changeLanguage = (newLang: 'vi' | 'en') => {
    setLang(newLang);
    localStorage.setItem('lang', newLang);
    window.dispatchEvent(new Event('languageChange'));
  };

  const isVi = lang === 'vi';

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
              <BrandLogo size={36} />
              <span className="font-extrabold text-2xl tracking-tight text-text">
                Antbiz
              </span>
            </div>
            
            <div>
              <h3 className="text-base font-bold text-text mb-2">
                {isVi ? "Về chúng tôi" : "About Us"}
              </h3>
              <p className="text-xs text-text-muted mb-3 leading-relaxed font-medium">
                {isVi 
                  ? "Chúng tôi là một đội ngũ gồm những cá nhân đam mê với mục tiêu cải thiện cuộc sống của mọi người thông qua các sản phẩm đột phá. Chúng tôi tạo ra những sản phẩm tuyệt vời để giải quyết các vấn đề kinh doanh của bạn."
                  : "We are a team of passionate individuals whose goal is to improve everyone's life through disruptive products. We build great products to solve your business problems."
                }
              </p>
              <p className="text-xs text-text-muted leading-relaxed font-medium">
                {isVi
                  ? "Sản phẩm của chúng tôi được thiết kế dành cho các công ty vừa và nhỏ muốn tối ưu hóa hiệu suất hoạt động."
                  : "Our products are designed for small and medium-sized companies willing to optimize their performance."
                }
              </p>
            </div>
          </div>
        </div>

        {/* Middle Column - Menu */}
        <div className="col-span-3 flex flex-col pl-4">
          <h3 className="text-base font-extrabold text-text mb-4 tracking-tight">
            {isVi ? "Mục lục" : "Table of Contents"}
          </h3>
          <div className="flex flex-col gap-2 text-xs text-text-muted font-semibold">
            <a href="#" className="hover:bg-primary/5 hover:text-primary px-3 py-1 rounded-xl transition-all w-fit">{isVi ? "Trang chủ" : "Home"}</a>
            <a href="#" className="hover:bg-primary/5 hover:text-primary px-3 py-1 rounded-xl transition-all w-fit">{isVi ? "Công ty của chúng tôi" : "Our Company"}</a>
            <a href="#" className="hover:bg-primary/5 hover:text-primary px-3 py-1 rounded-xl transition-all w-fit">{isVi ? "Nghiên cứu điển hình" : "Case Studies"}</a>
            <a href="#" className="hover:bg-primary/5 hover:text-primary px-3 py-1 rounded-xl transition-all w-fit">{isVi ? "Dịch vụ" : "Services"}</a>
            <a href="#" className="hover:bg-primary/5 hover:text-primary px-3 py-1 rounded-xl transition-all w-fit">{isVi ? "Tài nguyên" : "Resources"}</a>
            <a href="#" className="hover:bg-primary/5 hover:text-primary px-3 py-1 rounded-xl transition-all w-fit">{isVi ? "Tuyển dụng" : "Careers"}</a>
            <a href="#" className="hover:bg-primary/5 hover:text-primary px-3 py-1 rounded-xl transition-all w-fit">{isVi ? "Liên hệ" : "Contact Us"}</a>
          </div>
        </div>

        {/* Right Column - Support */}
        <div className="col-span-3 flex flex-col">
          <h3 className="text-base font-extrabold text-text mb-4 tracking-tight">
            {isVi ? "Hỗ trợ" : "Support"}
          </h3>
          <div className="flex flex-col gap-2 text-xs text-text-muted font-semibold">
            <a href="#" className="hover:bg-primary/5 hover:text-primary px-3 py-1 rounded-xl transition-all w-fit">{isVi ? "Trợ giúp" : "Help"}</a>
            <a href="#" className="hover:bg-primary/5 hover:text-primary px-3 py-1 rounded-xl transition-all w-fit">{isVi ? "Điều khoản Dịch vụ" : "Terms of Service"}</a>
            <a href="#" className="hover:bg-primary/5 hover:text-primary px-3 py-1 rounded-xl transition-all w-fit">{isVi ? "Chính sách Bảo mật" : "Privacy Policy"}</a>
            <a href="#" className="hover:bg-primary/5 hover:text-primary px-3 py-1 rounded-xl transition-all w-fit">{isVi ? "Chính sách quyền riêng tư" : "Privacy Rights"}</a>
            <a href="#" className="hover:bg-primary/5 hover:text-primary px-3 py-1 rounded-xl transition-all w-fit">{isVi ? "Vận chuyển" : "Shipping"}</a>
            <a href="#" className="hover:bg-primary/5 hover:text-primary px-3 py-1 rounded-xl transition-all w-fit">{isVi ? "Trả hàng" : "Returns"}</a>
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
            onClick={() => changeLanguage('en')}
            className={`border rounded-full px-3 py-1.5 flex items-center gap-1.5 transition-colors cursor-pointer text-text ${
              lang === 'en' ? 'bg-white border-primary/30 shadow-sm' : 'bg-white/50 border-primary/10 hover:bg-white'
            }`}
          >
            <span>🇺🇸</span>
            <span>US</span>
          </button>
          <button 
            onClick={() => changeLanguage('vi')}
            className={`border rounded-full px-3 py-1.5 flex items-center gap-1.5 transition-colors cursor-pointer text-text ${
              lang === 'vi' ? 'bg-white border-primary/30 shadow-sm' : 'bg-white/50 border-primary/10 hover:bg-white'
            }`}
          >
            <span>🇻🇳</span>
            <span>VN</span>
          </button>
        </div>

        {/* Copyright notice */}
        <div className="text-[10px] text-text-muted font-semibold tracking-wide uppercase">
          Copyright © Company name
        </div>
      </div>
    </footer>
  );
};

export default Footer;

