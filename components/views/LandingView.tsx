"use client";

import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Database,
  Wand2,
  CalendarDays,
  Lock,
  ArrowUpRight
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Footer from '@/components/Footer';

export default function LandingView() {
  const { t, language, setLanguage } = useLanguage();
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('logging_out');
    }
  }, []);

  const slides = [
    {
      title: language === 'vi' ? 'HỆ ĐIỀU HÀNH XUẤT BẢN NỘI DUNG AI ĐA KÊNH' : 'MULTI-CHANNEL AI PUBLISHING HUB',
      desc: language === 'vi'
        ? 'Tối ưu hóa quy trình từ cào bài viết gốc, sinh biến thể bằng Gemini AI, đến quản lý và lên lịch trên biểu đồ Gantt chống va chạm.'
        : 'Optimize your content pipeline from scraping sources, generating AI variants via Gemini, to drag-and-drop Gantt calendar scheduling.',
      img: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1200',
      cta: language === 'vi' ? 'Trải Nghiệm Ngay' : 'Get Started Now',
      link: '/login'
    },
    {
      title: language === 'vi' ? 'SÁNG TẠO CAPTION ĐA KÊNH TỰ ĐỘNG VỚI GEMINI' : 'GEMINI AI AUTOMATED MULTI-CHANNEL COPYWRITER',
      desc: language === 'vi'
        ? 'Tự động tạo các bản sao thô tối ưu hóa riêng biệt cho Facebook, Instagram và Threads chỉ với một đường dẫn URL đầu vào.'
        : 'Generate customized A/B copy versions tailored for Facebook, Instagram, and Threads automatically with single URL ingestion.',
      img: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200',
      cta: language === 'vi' ? 'Khám Phá AI Creator' : 'Explore AI Creator',
      link: '/login'
    },
    {
      title: language === 'vi' ? 'BIỂU ĐỒ LỊCH GANTT 2D CHỐNG VA CHẠM LỊCH' : '2D GANTT BOARD & PUBLICATION COLLISION LOCK',
      desc: language === 'vi'
        ? 'Kéo thả trực quan bài viết trên khung giờ vàng và tự động ngăn chặn trùng giờ đăng trên cùng một nền tảng.'
        : 'Manage cross-platform calendar events visually and prevent schedule overlaps using automated collision locking.',
      img: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?q=80&w=1200',
      cta: language === 'vi' ? 'Xem Lịch Nội Dung' : 'View Content Calendar',
      link: '/login'
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const handlePrev = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const handleNext = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  return (
    <div className="min-h-screen bg-white text-slate-800 font-sans flex flex-col antialiased selection:bg-red-500/20">

      {/* 1. STANDALONE HEADER (Garena inspired dark navbar with top red bar) */}
      <header className="sticky top-0 z-50 bg-[#E9EAF5] text-slate-800 border-b border-slate-200/60 shadow-sm before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-[3px] before:bg-[#E31A1A] transition-all">
        <div className="max-w-7xl mx-auto px-6 md:px-12 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 flex items-center justify-center">
              <img
                src="/images/logo.png"
                alt="AntBiz Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight text-slate-800 block leading-none">
                AntBiz
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8">
            <Link href="/" className="text-slate-650 hover:text-slate-900 font-bold text-xs uppercase tracking-wider transition-colors decoration-none">
              {language === 'vi' ? 'Trang chủ' : 'Home'}
            </Link>
            <a href="#what-we-do" className="text-slate-650 hover:text-slate-900 font-bold text-xs uppercase tracking-wider transition-colors decoration-none">
              {language === 'vi' ? 'Chúng tôi làm gì' : 'What We Do'}
            </a>
            <a href="#platform" className="text-slate-650 hover:text-slate-900 font-bold text-xs uppercase tracking-wider transition-colors decoration-none">
              {language === 'vi' ? 'Nền tảng' : 'Platform'}
            </a>
            <Link href="/faq" className="text-slate-650 hover:text-slate-900 font-bold text-xs uppercase tracking-wider transition-colors decoration-none">
              {language === 'vi' ? 'Hỗ trợ & FAQ' : 'FAQ & Support'}
            </Link>
          </nav>

          <div className="flex items-center gap-4">
            {/* Language Switcher */}
            <div className="flex gap-0.5 bg-slate-200/60 p-0.5 rounded-lg border border-slate-300">
              <button
                onClick={() => setLanguage("vi")}
                className={`px-2 py-0.5 rounded font-bold transition-all text-[10px] cursor-pointer border-0 ${language === "vi"
                    ? "bg-[#E31A1A] text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-800 bg-transparent"
                  }`}
              >
                VN
              </button>
              <button
                onClick={() => setLanguage("en")}
                className={`px-2 py-0.5 rounded font-bold transition-all text-[10px] cursor-pointer border-0 ${language === "en"
                    ? "bg-[#E31A1A] text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-800 bg-transparent"
                  }`}
              >
                EN
              </button>
            </div>

            {/* Login & Register Buttons */}
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="bg-transparent hover:bg-slate-200/90 text-slate-700 border border-slate-300/85 px-4 py-2 rounded-full font-extrabold text-[10px] uppercase tracking-wider transition-all cursor-pointer decoration-none"
              >
                {language === 'vi' ? 'Đăng nhập' : 'Login'}
              </Link>
              <Link
                href="/register"
                className="bg-[#E31A1A] hover:bg-[#C21515] text-white px-4 py-2 rounded-full font-extrabold text-[10px] uppercase tracking-wider transition-all cursor-pointer decoration-none border-0"
              >
                {language === 'vi' ? 'Đăng ký' : 'Register'}
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* 2. HERO SLIDER BANNER (Premium slideshow overlay) */}
      <div className="relative w-full h-[450px] md:h-[620px] overflow-hidden bg-black select-none">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 w-full h-full"
          >
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url('${slides[currentSlide].img}')` }}
            />
            {/* Dark gradient overlay matching Garena premium aesthetic */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/30" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-transparent" />

            {/* Slide Content Layout */}
            <div className="absolute inset-x-4 bottom-16 md:bottom-24 flex flex-col items-center justify-center text-center max-w-4xl mx-auto z-10 px-4">
              <h1 className="text-white text-3xl md:text-5xl font-black tracking-tight leading-tight mb-4 select-none drop-shadow-md uppercase">
                {slides[currentSlide].title}
              </h1>
              <p className="text-slate-200 text-xs md:text-base font-semibold max-w-2xl mb-6 leading-relaxed select-none drop-shadow">
                {slides[currentSlide].desc}
              </p>

              <Link
                href={slides[currentSlide].link}
                className="bg-[#E31A1A] hover:bg-[#C21515] text-white px-8 py-3 rounded-full font-bold text-xs tracking-wider uppercase shadow-lg shadow-red-600/30 transition-all active:scale-95 flex items-center gap-2 cursor-pointer border-0 decoration-none"
              >
                <span>{slides[currentSlide].cta}</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Left/Right Arrow Navigation */}
        <button
          onClick={handlePrev}
          className="absolute left-6 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/35 hover:bg-black/60 border-0 rounded-full flex items-center justify-center text-white cursor-pointer transition-all z-20"
        >
          <ChevronLeft size={24} />
        </button>
        <button
          onClick={handleNext}
          className="absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/35 hover:bg-black/60 border-0 rounded-full flex items-center justify-center text-white cursor-pointer transition-all z-20"
        >
          <ChevronRight size={24} />
        </button>

        {/* Indicator Dots */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-20">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSlide(idx)}
              className={`w-2.5 h-2.5 rounded-full border-0 transition-all cursor-pointer ${idx === currentSlide ? 'bg-[#E31A1A] w-6' : 'bg-white/50 hover:bg-white'
                }`}
            />
          ))}
        </div>
      </div>

      {/* 3. INTRODUCTION SECTION (Central Logo & Brand Message) */}
      <section className="bg-white py-20 px-6 border-b border-slate-100">
        <div className="max-w-4xl mx-auto flex flex-col items-center text-center">
          <img
            src="/images/logo.png"
            alt="AntBiz Logo"
            className="w-16 h-16 object-contain mb-8 animate-pulse"
          />
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-800 mb-6 leading-snug">
            {language === 'vi'
              ? 'Được phát triển vào năm 2026, AntBiz là hệ điều hành xuất bản nội dung AI đa kênh hàng đầu với dấu ấn an toàn tại mọi chiến dịch truyền thông.'
              : 'Developed in 2026, AntBiz is the premier multi-channel AI content publishing platform with secure execution across all marketing campaigns.'}
          </h2>
          <p className="text-slate-500 text-sm md:text-base leading-relaxed font-semibold max-w-3xl">
            {language === 'vi'
              ? 'Chúng tôi tối ưu hóa toàn diện quy trình sáng tạo của biên tập viên hiện đại. Bằng việc kết hợp công nghệ cào dữ liệu Cheerio chuẩn xác, mô hình ngôn ngữ lớn Gemini AI, và hệ thống biểu đồ Gantt kéo thả chống va chạm lịch đăng, AntBiz giúp bạn tự động hóa việc xuất bản nội dung chất lượng cao.'
              : 'We comprehensively optimize the creative workflow of modern editors. By combining precise Cheerio data scraping, Gemini AI LLM copywriting, and drag-and-drop Gantt calendars with collision prevention, AntBiz automates high-quality content publication.'}
          </p>
        </div>
      </section>

      {/* 4. CHÚNG TÔI LÀ MÌNH (What We Do - Stacked Row Cards) */}
      <section id="what-we-do" className="bg-[#F8FAFC] py-20 border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-3xl font-extrabold text-slate-800 text-center mb-16 uppercase tracking-wider">
            {language === 'vi' ? 'Chúng tôi làm gì' : 'What We Do'}
          </h2>

          <div className="flex flex-col gap-10">
            {/* Card 1: AI Content Creator */}
            <div className="flex flex-col md:flex-row bg-white border border-slate-200/50 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 min-h-[280px]">
              <div className="w-full md:w-1/2 h-[240px] md:h-auto overflow-hidden relative bg-slate-900">
                <img
                  src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800"
                  alt="AI Content Creator"
                  className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                />
              </div>
              <div className="w-full md:w-1/2 p-8 flex flex-col justify-center">
                <div className="border-l-4 border-[#E31A1A] pl-4">
                  <h3 className="text-lg font-extrabold text-slate-800 uppercase tracking-wide">
                    {language === 'vi' ? 'Sáng tạo Caption AI' : 'AI Copywriting'}
                  </h3>
                </div>
                <p className="text-slate-500 text-sm mt-4 leading-relaxed font-semibold">
                  {language === 'vi'
                    ? 'Sáng tạo captions A/B tự động cho Facebook, Instagram và Threads bằng mô hình AI Gemini tiên tiến. Hệ thống hỗ trợ cào bài viết gốc trực tiếp từ gocnhinmoi.com.vn và tự động trích xuất siêu dữ liệu SEO.'
                    : 'Generate automated A/B copy variants optimized for Facebook, Instagram, and Threads with advanced Gemini AI models. Ingest raw articles directly from gocnhinmoi.com.vn to extract SEO metadata.'}
                </p>
              </div>
            </div>

            {/* Card 2: 2D Gantt Board */}
            <div className="flex flex-col md:flex-row bg-white border border-slate-200/50 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 min-h-[280px]">
              <div className="w-full md:w-1/2 h-[240px] md:h-auto overflow-hidden relative bg-slate-900">
                <img
                  src="https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=800"
                  alt="2D Gantt Board"
                  className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                />
              </div>
              <div className="w-full md:w-1/2 p-8 flex flex-col justify-center">
                <div className="border-l-4 border-[#E31A1A] pl-4">
                  <h3 className="text-lg font-extrabold text-slate-800 uppercase tracking-wide">
                    {language === 'vi' ? 'Biểu đồ Lịch Gantt 2D' : '2D Gantt Calendar'}
                  </h3>
                </div>
                <p className="text-slate-500 text-sm mt-4 leading-relaxed font-semibold">
                  {language === 'vi'
                    ? 'Bảng Gantt kéo thả trực quan theo tuần giúp quản lý bài đăng tối ưu trên từng nền tảng. Cơ chế tự động kiểm tra và khóa trùng giờ đăng (Collision Lock) giúp đảm bảo an toàn tuyệt đối cho lịch xuất bản.'
                    : 'Visual weekly Gantt board for drag-and-drop post scheduling. Features an automatic collision lock mechanism to prevent overlapping publications on identical channels.'}
                </p>
              </div>
            </div>

            {/* Card 3: Archive & Checkpoints */}
            <div className="flex flex-col md:flex-row bg-white border border-slate-200/50 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 min-h-[280px]">
              <div className="w-full md:w-1/2 h-[240px] md:h-auto overflow-hidden relative bg-slate-900">
                <img
                  src="https://images.unsplash.com/photo-1556761175-b413da4baf72?q=80&w=800"
                  alt="Archive & Checkpoints"
                  className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                />
              </div>
              <div className="w-full md:w-1/2 p-8 flex flex-col justify-center">
                <div className="border-l-4 border-[#E31A1A] pl-4">
                  <h3 className="text-lg font-extrabold text-slate-800 uppercase tracking-wide">
                    {language === 'vi' ? 'Lưu trữ & Checkpoints' : 'Archive & Checkpoints'}
                  </h3>
                </div>
                <p className="text-slate-500 text-sm mt-4 leading-relaxed font-semibold">
                  {language === 'vi'
                    ? 'Kho lưu trữ chiến dịch thông minh hỗ trợ xuất báo cáo CSV chạy ngầm và theo dõi lịch sử chỉnh sửa bài đăng. Cho phép khôi phục trạng thái (Checkpoints Revert) an toàn mọi lúc.'
                    : 'Smart campaign archives supporting background CSV export queues and post edit history logging. Allows secure rollback to previous checkpoints at any time.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. NỀN TẢNG ANTBIZ (Platform Showcase Section) */}
      <section id="platform" className="bg-white py-20 border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-3xl font-extrabold text-slate-800 text-center mb-16 uppercase tracking-wider">
            {language === 'vi' ? 'Nền tảng AntBiz' : 'AntBiz Platform'}
          </h2>

          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="w-full md:w-1/2">
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-md">
                <img
                  src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=800"
                  alt="AntBiz Workspace"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <div className="w-full md:w-1/2 flex flex-col gap-4">
              <h3 className="text-2xl font-extrabold text-slate-800">
                {language === 'vi' ? 'AntBiz Workspace' : 'AntBiz Workspace'}
              </h3>
              <p className="text-slate-500 text-sm leading-relaxed font-semibold">
                {language === 'vi'
                  ? 'Giao diện bảng điều khiển làm việc tối ưu và mượt mà trên trình duyệt máy tính. Biên tập viên dễ dàng theo dõi tổng sản lượng bài đăng, kiểm soát số lượng token AI đã sử dụng, quản lý thị phần đăng bài đa nền tảng (Facebook, Instagram, Threads) và xem nhật ký hoạt động chiến dịch thời gian thực.'
                  : 'Optimized and responsive browser dashboard designed for modern content operations. Content managers can seamlessly track output, monitor AI token consumption, manage channel share ratios across Facebook, Instagram, and Threads, and view campaign activity logs in real time.'}
              </p>
              <Link
                href="/login"
                className="text-[#E31A1A] hover:text-[#C21515] font-extrabold text-sm transition-colors decoration-none flex items-center gap-1 cursor-pointer w-fit mt-2"
              >
                <span>{language === 'vi' ? 'Xem thêm' : 'Learn More'}</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 6. ĐỒNG HÀNH CÙNG ANTBIZ (Careers Row Layout) */}
      <section className="bg-slate-900 text-white py-20 overflow-hidden relative">
        <div className="absolute inset-0 bg-cover bg-center opacity-10 select-none pointer-events-none" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=1200')" }} />

        <div className="max-w-5xl mx-auto px-6 relative z-10 flex flex-col md:flex-row items-center gap-12">
          {/* Left Column */}
          <div className="w-full md:w-1/2 flex flex-col items-start gap-6">
            <h2 className="text-3xl font-extrabold tracking-tight text-white leading-tight uppercase">
              {language === 'vi' ? 'Đồng hành cùng AntBiz' : 'Operate with AntBiz'}
            </h2>
            <p className="text-slate-350 text-sm leading-relaxed font-semibold">
              {language === 'vi'
                ? 'Tối ưu hóa toàn diện năng suất sản xuất nội dung của tổ chức và làm chủ các kênh truyền thông mạng xã hội của bạn. AntBiz được thiết kế để mang đến hiệu suất làm việc vượt trội, giao diện mượt mà và khả năng vận hành chuyên nghiệp nhất.'
                : 'Accelerate your content publishing workflow and gain complete control over your marketing channels. AntBiz is custom-built to deliver outstanding performance, smooth UI transitions, and professional content operations.'}
            </p>
            <Link
              href="/login"
              className="bg-[#E31A1A] hover:bg-[#C21515] text-white px-8 py-3.5 rounded-full font-bold text-xs tracking-wider uppercase shadow-lg shadow-red-600/20 transition-all active:scale-95 cursor-pointer decoration-none border-0"
            >
              {language === 'vi' ? 'Trải nghiệm ngay' : 'Get Started Now'}
            </Link>
          </div>

          {/* Right Column (Typographic values visual card matching Garena style) */}
          <div className="w-full md:w-1/2 flex justify-center md:justify-end">
            <div className="relative bg-slate-950 border border-slate-800 p-8 rounded-2xl w-full max-w-sm flex flex-col gap-2 select-none shadow-xl">
              <span className="text-xs text-[#E31A1A] font-bold tracking-widest uppercase mb-4">Core Workflow</span>

              <div className="flex flex-col font-black text-2xl md:text-3xl tracking-tight text-slate-700 leading-none">
                <span className="hover:text-white transition-colors duration-300">INGEST</span>
                <span className="text-slate-600 hover:text-white transition-colors duration-300 mt-1">CREATE</span>
                <span className="text-slate-500 hover:text-white transition-colors duration-300 mt-1">SCHEDULE</span>
                <span className="text-[#E31A1A] hover:text-white transition-colors duration-300 mt-1">PUBLISH</span>
                <span className="text-slate-450 hover:text-white transition-colors duration-300 mt-1">MEASURE</span>
              </div>

              <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-red-600/10 rounded-full blur-2xl pointer-events-none" />
            </div>
          </div>
        </div>
      </section>

      {/* 7. APP COMMON FOOTER (Footer sẵn có không phải đổi) */}
      <Footer />

    </div>
  );
}
