"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import {
  ArrowRight,
  LogIn,
  FileText,
  Sparkles,
  PenLine,
  CalendarDays,
  BarChart3,
  Sun,
  Moon,
  Play,
  ChevronRight,
} from 'lucide-react';
import Footer from '@/components/Footer';

const STEP_ICONS = [FileText, Sparkles, CalendarDays, BarChart3];

const STEP_COLORS = [
  'from-blue-500 to-cyan-600',
  'from-violet-500 to-indigo-600',
  'from-pink-500 to-rose-600',
  'from-purple-500 to-fuchsia-600',
];

const STEP_BG = [
  'bg-blue-50 dark:bg-blue-950/30',
  'bg-violet-50 dark:bg-violet-950/30',
  'bg-pink-50 dark:bg-pink-950/30',
  'bg-purple-50 dark:bg-purple-950/30',
];

export default function UserGuideView() {
  const { t, language, setLanguage } = useLanguage();

  let isDark = false;
  let toggleDarkMode = () => {};
  try {
    const themeCtx = useTheme();
    isDark = themeCtx?.isDark ?? false;
    toggleDarkMode = themeCtx?.toggleDarkMode ?? (() => {});
  } catch {
    // outside ThemeProvider
  }

  const [activeStep, setActiveStep] = useState<number | null>(null);

  const steps = [
    { titleKey: 'step1Title', descKey: 'step1Desc' },
    { titleKey: 'step2Title', descKey: 'step2Desc' },
    { titleKey: 'step3Title', descKey: 'step3Desc' },
    { titleKey: 'step4Title', descKey: 'step4Desc' },
  ] as const;

  const containerVariants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.12 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 32 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
  };

  return (
    <div className="min-h-screen flex flex-col antialiased bg-white dark:bg-[#0F1117] text-slate-800 dark:text-slate-100 transition-colors duration-300">

      {/* ─── HEADER (same style as LandingView) ─── */}
      <header className="sticky top-0 z-50 bg-white/95 dark:bg-[#0F1117]/95 border-b border-slate-200/60 dark:border-slate-800/80 shadow-sm backdrop-blur-md before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-[3px] before:bg-primary transition-all">
        <div className="max-w-7xl mx-auto px-6 md:px-12 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 decoration-none group">
            <div className="w-8 h-8 flex items-center justify-center">
              <img src="/images/logo.png" alt="AntBiz Logo" className="w-full h-full object-contain" />
            </div>
            <span className="font-extrabold text-lg tracking-tight text-slate-800 dark:text-white">AntBiz</span>
          </Link>

          {/* Nav */}
          <nav className="hidden md:flex items-center gap-8">
            <Link href="/" className="text-slate-600 dark:text-slate-400 hover:text-primary font-bold text-xs uppercase tracking-wider transition-colors decoration-none">
              {t('common.home')}
            </Link>
            <Link href="/#what-we-do" className="text-slate-600 dark:text-slate-400 hover:text-primary font-bold text-xs uppercase tracking-wider transition-colors decoration-none">
              {t('common.features')}
            </Link>
            <span className="text-primary font-bold text-xs uppercase tracking-wider border-b-2 border-primary pb-0.5">
              {t('common.userGuide')}
            </span>
            <Link href="/#faq-section" className="text-slate-600 dark:text-slate-400 hover:text-primary font-bold text-xs uppercase tracking-wider transition-colors decoration-none">
              {t('common.faqSupport')}
            </Link>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <div className="flex gap-0.5 bg-slate-200/60 dark:bg-slate-800/80 p-0.5 rounded-lg border border-slate-300 dark:border-slate-700">
              <button
                onClick={() => setLanguage('vi')}
                className={`px-2 py-0.5 rounded font-bold transition-all text-[10px] cursor-pointer border-0 ${language === 'vi' ? 'bg-primary text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 bg-transparent'}`}
              >VN</button>
              <button
                onClick={() => setLanguage('en')}
                className={`px-2 py-0.5 rounded font-bold transition-all text-[10px] cursor-pointer border-0 ${language === 'en' ? 'bg-primary text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 bg-transparent'}`}
              >EN</button>
            </div>
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer border-0 flex items-center justify-center"
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDark ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <div className="flex items-center gap-2">
              <Link href="/login" className="bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-750 dark:text-slate-200 border border-slate-300 dark:border-slate-700 py-2 rounded-full font-extrabold text-[10px] uppercase tracking-wider transition-all cursor-pointer decoration-none w-24 text-center inline-block">
                {t('common.login')}
              </Link>
              <Link href="/register" className="bg-primary hover:bg-primary-hover text-white py-2 rounded-full font-extrabold text-[10px] uppercase tracking-wider transition-all cursor-pointer decoration-none border-0 w-24 text-center inline-block">
                {t('common.register')}
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* ─── HERO ─── */}
      <section className="relative overflow-hidden py-20 md:py-28 px-6 bg-gradient-to-br from-primary/10 via-white dark:via-[#0F1117] to-indigo-50 dark:to-indigo-950/20">
        {/* decorative blobs */}
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-indigo-400/10 blur-3xl pointer-events-none" />

        <div className="relative max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
          >
            {/* badge */}
            <span className="inline-flex items-center gap-2 bg-primary/10 text-primary border border-primary/20 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-widest mb-6">
              <Play size={10} className="fill-current" />
              {language === 'vi' ? 'Hướng dẫn từng bước' : 'Step-by-step guide'}
            </span>

            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white mb-5 leading-tight">
              {t('userGuide.heroTitle')}
            </h1>
            <p className="text-base md:text-lg text-slate-500 dark:text-slate-400 font-semibold max-w-2xl mx-auto leading-relaxed">
              {t('userGuide.heroSubtitle')}
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-7 py-3 rounded-full font-bold text-xs uppercase tracking-wider shadow-lg shadow-primary/25 transition-all active:scale-95 decoration-none border-0"
              >
                {t('userGuide.ctaGetStarted')} <ArrowRight size={14} />
              </Link>
              <Link
                href="/login?redirect=%2Fpresets%3Fonboarding%3D1"
                className="inline-flex items-center gap-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 px-7 py-3 rounded-full font-bold text-xs uppercase tracking-wider transition-all active:scale-95 decoration-none shadow-sm"
              >
                <Play size={12} className="fill-current text-primary" />
                {t('userGuide.ctaInteractiveTour')}
              </Link>
            </div>
          </motion.div>

          {/* scroll indicator */}
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
            className="mt-12 flex justify-center"
          >
            <ChevronRight size={24} className="rotate-90 text-primary/40" />
          </motion.div>
        </div>
      </section>

      {/* ─── STEPS TIMELINE ─── */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl font-extrabold uppercase tracking-wider text-slate-800 dark:text-white">
              {t('userGuide.stepsHeading')}
            </h2>
            <div className="w-16 h-1 bg-primary rounded-full mx-auto mt-4" />
          </motion.div>

          <motion.div
            className="relative"
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
          >
            {/* vertical line (desktop) */}
            <div className="hidden md:block absolute left-1/2 -translate-x-px top-8 bottom-8 w-0.5 bg-gradient-to-b from-primary/30 via-primary/20 to-transparent rounded-full" />

            <div className="flex flex-col gap-10">
              {steps.map((step, idx) => {
                const Icon = STEP_ICONS[idx];
                const isLeft = idx % 2 === 0;
                const isActive = activeStep === idx;

                return (
                  <motion.div
                    key={idx}
                    variants={itemVariants}
                    className={`relative flex flex-col md:flex-row items-center gap-6 ${!isLeft ? 'md:flex-row-reverse' : ''}`}
                  >
                    {/* Step number bubble on the center line */}
                    <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 z-10 w-10 h-10 items-center justify-center rounded-full bg-white dark:bg-slate-900 border-2 border-primary shadow-md shadow-primary/20 font-black text-primary text-sm select-none">
                      {idx + 1}
                    </div>

                    {/* Card */}
                    <div className="w-full md:w-[calc(50%-2.5rem)]">
                      <button
                        onClick={() => setActiveStep(isActive ? null : idx)}
                        className={`group w-full text-left rounded-2xl border transition-all duration-300 overflow-hidden shadow-sm cursor-pointer bg-transparent p-0 ${
                          isActive
                            ? 'border-primary shadow-lg shadow-primary/10'
                            : 'border-slate-200 dark:border-slate-800 hover:border-primary/40 hover:shadow-md'
                        }`}
                      >
                        <div className={`p-6 ${STEP_BG[idx]}`}>
                          <div className="flex items-start gap-4">
                            {/* Mobile step number */}
                            <div className="md:hidden flex-none w-8 h-8 flex items-center justify-center rounded-full bg-white dark:bg-slate-900 border-2 border-primary font-black text-primary text-xs shadow-sm">
                              {idx + 1}
                            </div>

                            {/* Icon */}
                            <div className={`flex-none w-12 h-12 rounded-xl bg-gradient-to-br ${STEP_COLORS[idx]} flex items-center justify-center shadow-md group-hover:scale-105 transition-transform duration-200`}>
                              <Icon size={22} className="text-white" strokeWidth={2} />
                            </div>

                            <div className="flex-1 min-w-0">
                              <h3 className="font-extrabold text-slate-900 dark:text-white text-base leading-tight mb-1">
                                {t(`userGuide.${step.titleKey}` as any)}
                              </h3>
                              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                                {t(`userGuide.${step.descKey}` as any)}
                              </p>
                            </div>

                            {/* expand chevron (hidden, card always shows desc) */}
                          </div>
                        </div>

                        {/* Active highlight bar */}
                        {isActive && (
                          <div className={`h-1 w-full bg-gradient-to-r ${STEP_COLORS[idx]}`} />
                        )}
                      </button>
                    </div>

                    {/* Spacer for opposite column */}
                    <div className="hidden md:block w-[calc(50%-2.5rem)]" />
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── TIPS STRIP ─── */}
      <section className="py-12 px-6 bg-slate-50 dark:bg-slate-900/50 border-y border-slate-100 dark:border-slate-800">
        <div className="max-w-5xl mx-auto">
          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, staggerChildren: 0.1 }}
          >
            {[
              {
                icon: '⚡',
                vi: { title: 'Sinh caption trong vài giây', desc: 'Gemini AI xử lý toàn bộ phân tích và viết lại — bạn chỉ cần dán URL.' },
                en: { title: 'Generate captions in seconds', desc: 'Gemini AI handles all the analysis and rewriting — just paste your URL.' },
              },
              {
                icon: '🛡️',
                vi: { title: 'Không lo trùng lịch đăng', desc: 'Collision Lock tự động phát hiện và ngăn xung đột lịch trước khi bạn nhấn lưu.' },
                en: { title: 'No more scheduling conflicts', desc: 'Collision Lock automatically detects and blocks conflicts before you hit save.' },
              },
              {
                icon: '📊',
                vi: { title: 'Báo cáo xuất nền', desc: 'Export CSV ngầm không làm gián đoạn công việc, tải xuống khi sẵn sàng.' },
                en: { title: 'Background export', desc: 'CSV export runs in the background without interrupting your work.' },
              },
            ].map((tip, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex items-start gap-4 p-5 bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow"
              >
                <span className="text-2xl flex-none">{tip.icon}</span>
                <div>
                  <p className="font-extrabold text-sm text-slate-800 dark:text-white mb-1">
                    {language === 'vi' ? tip.vi.title : tip.en.title}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                    {language === 'vi' ? tip.vi.desc : tip.en.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── CTA BANNER ─── */}
      <section className="py-20 px-6 bg-gradient-to-br from-primary to-indigo-700 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />

        <motion.div
          className="relative max-w-3xl mx-auto"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-4xl font-black text-white mb-4 uppercase tracking-tight">
            {t('userGuide.ctaTitle')}
          </h2>
          <p className="text-white/80 font-semibold mb-10 text-sm md:text-base">
            {t('userGuide.ctaSubtitle')}
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 bg-white text-primary hover:bg-slate-50 px-8 py-4 rounded-full font-extrabold text-sm uppercase shadow-2xl transition-all active:scale-95 decoration-none border-0"
            >
              {t('userGuide.ctaGetStarted')} <ArrowRight size={15} />
            </Link>
            <Link
              href="/login?redirect=%2Fpresets%3Fonboarding%3D1"
              className="inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 text-white border border-white/30 px-8 py-4 rounded-full font-extrabold text-sm uppercase transition-all active:scale-95 decoration-none"
            >
              <Play size={13} className="fill-white" />
              {t('userGuide.ctaInteractiveTour')}
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="mt-auto w-full">
        <Footer />
      </footer>
    </div>
  );
}
