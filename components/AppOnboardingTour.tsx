"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { Sparkles, ArrowRight, ArrowLeft, Check, X, Compass } from 'lucide-react';

export interface TourStepConfig {
  step: number;
  path: string;
  targetId: string;
  sidebarTargetId?: string;
  titleVi: string;
  titleEn: string;
  descVi: string;
  descEn: string;
}

export const APP_TOUR_STEPS: TourStepConfig[] = [
  // ─── PAGE 1: PRESETS (/presets) — 2 STEPS ───
  {
    step: 1,
    path: '/presets',
    targetId: 'tour-presets-list',
    sidebarTargetId: 'sidebar-link-presets',
    titleVi: '1/11. Lưu Trữ & Quản Lý Văn Phong',
    titleEn: '1/11. Style Presets Library',
    descVi: 'Nơi lưu trữ các mẫu văn phong thương hiệu cá nhân và hệ thống. Mục "Văn phong" trên thanh Sidebar giúp bạn truy cập nhanh trang này bất cứ lúc nào.',
    descEn: 'Library of custom and system brand styles. The "Presets" link on the Sidebar provides quick access to this page anytime.',
  },
  {
    step: 2,
    path: '/presets',
    targetId: 'tour-presets-create',
    sidebarTargetId: 'sidebar-link-presets',
    titleVi: '2/11. Tạo Văn Phong Thương Hiệu Mới',
    titleEn: '2/11. Create New Style Preset',
    descVi: 'Bấm nút "Tạo Văn phong mới" để khởi động trình hỗ trợ thiết lập bộ quy chuẩn hành văn, độ dài, danh xưng và hashtag riêng biệt cho doanh nghiệp của bạn.',
    descEn: 'Click "Create New Style" to launch the wizard and define tone of voice, formatting, length, and custom hashtags.',
  },

  // ─── PAGE 2: AI CREATOR (/ai-creator) — 5 STEPS ───
  {
    step: 3,
    path: '/ai-creator',
    targetId: 'tour-aicreator-step1',
    sidebarTargetId: 'sidebar-link-aicreator',
    titleVi: '3/11. AI Creator: Chọn Nền Tảng Đăng',
    titleEn: '3/11. AI Creator: Platform Selection',
    descVi: 'Mục "AICreator" trên Sidebar là trung tâm sáng tạo bài viết. Bước 1 cho phép chọn đồng thời các mạng xã hội muốn xuất bản (Facebook, Instagram, Threads).',
    descEn: 'The "AICreator" link on Sidebar is your creation hub. Step 1 selects target social platforms (Facebook, Instagram, Threads).',
  },
  {
    step: 4,
    path: '/ai-creator',
    targetId: 'tour-aicreator-url',
    sidebarTargetId: 'sidebar-link-aicreator',
    titleVi: '4/11. Cào Bài Viết Trực Tiếp Từ Liên Kết (URL Crawl)',
    titleEn: '4/11. Auto Crawl Article from URL',
    descVi: 'Dán đường dẫn (URL) bài báo hoặc trang web bất kỳ. Trợ lý AI sẽ tự động cào dữ liệu, trích xuất văn bản và nội dung bài viết gốc trong giây lát.',
    descEn: 'Paste any news or website URL. AI assistant instantly crawls the page, extracting clean content and full article body.',
  },
  {
    step: 5,
    path: '/ai-creator',
    targetId: 'tour-aicreator-file',
    sidebarTargetId: 'sidebar-link-aicreator',
    titleVi: '5/11. Tải Lên Tệp Tin Tài Liệu (PDF / DOCX)',
    titleEn: '5/11. Upload Document Files (PDF / DOCX)',
    descVi: 'Tải lên trực tiếp các tập tin tài liệu định dạng PDF hoặc Word (DOCX). AI sẽ đọc hiểu tài liệu và phân tích ngữ cảnh để chuẩn bị sinh caption.',
    descEn: 'Directly upload PDF or Word (DOCX) files. AI reads the document context to generate tailored social captions.',
  },
  {
    step: 6,
    path: '/ai-creator',
    targetId: 'tour-aicreator-step3',
    sidebarTargetId: 'sidebar-link-aicreator',
    titleVi: '6/11. Trình Biên Tập Caption, AI Chat & Rewrite',
    titleEn: '6/11. Smart Editor, AI Chat & Text Rewrite',
    descVi: 'Giao diện biên soạn caption trực quan. Sử dụng Trợ lý AI Chat, bôi đen câu văn để gọi menu viết lại (Rewrite) và xem trước thiết bị thực tế.',
    descEn: 'Multi-platform editor. Use AI Chat assistant, highlight text to activate instant rewrite, and preview real device rendering.',
  },
  {
    step: 7,
    path: '/ai-creator',
    targetId: 'tour-aicreator-step4',
    sidebarTargetId: 'sidebar-link-aicreator',
    titleVi: '7/11. Thiết Lập Thời Gian & Lên Lịch Đăng Bài',
    titleEn: '7/11. Schedule & Publish Setup',
    descVi: 'Thiết lập ngày giờ phát hành bài viết, tham khảo gợi ý Khung giờ vàng (Golden Hour) và xác nhận đưa bài viết vào hệ thống xuất bản.',
    descEn: 'Configure publication date & time, leverage Golden Hour recommendations, and confirm automated queueing.',
  },

  // ─── PAGE 3: CONTENT CALENDAR (/content-calendar) — 2 STEPS ───
  {
    step: 8,
    path: '/content-calendar',
    targetId: 'tour-calendar-board',
    sidebarTargetId: 'sidebar-link-calendar',
    titleVi: '8/11. Lịch Nội Dung Gantt 2D Trực Quan',
    titleEn: '8/11. Visual 2D Gantt Content Calendar',
    descVi: 'Mục "Lịch nội dung" trên Sidebar cho phép theo dõi kế hoạch xuất bản. Hiển thị bài đăng dưới dạng biểu đồ Gantt 2D kéo thả tiện lợi.',
    descEn: 'The "Content Calendar" link on Sidebar tracks your publishing plan on an interactive visual 2D Gantt chart.',
  },
  {
    step: 9,
    path: '/content-calendar',
    targetId: 'tour-calendar-lock',
    sidebarTargetId: 'sidebar-link-calendar',
    titleVi: '9/11. Cơ Chế Khóa Chống Trùng Lịch (Collision Lock)',
    titleEn: '9/11. Collision Lock Conflict Prevention',
    descVi: 'Cơ chế Collision Lock tự động phát hiện và ngăn chặn việc lên lịch trùng giờ trên cùng một mạng xã hội, đảm bảo khoảng cách phát hành bài an toàn.',
    descEn: 'Collision Lock automatically detects and blocks conflicting post schedules on the same social network to preserve reach.',
  },

  // ─── PAGE 4: REPORTS (/reports) — 2 STEPS ───
  {
    step: 10,
    path: '/reports',
    targetId: 'tour-reports-stats',
    sidebarTargetId: 'sidebar-link-reports',
    titleVi: '10/11. Báo Cáo Thống Kê & Hiệu Suất Bài Đăng',
    titleEn: '10/11. Publishing Performance & Metrics',
    descVi: 'Mục "Báo cáo & Thống kê" trên Sidebar giúp đo lường hiệu quả. Tổng hợp sản lượng tổng, số bài đăng thành công và tỷ lệ tương tác.',
    descEn: 'The "Reports" link on Sidebar measures publishing performance, aggregating post volume, success rates, and engagement ratios.',
  },
  {
    step: 11,
    path: '/reports',
    targetId: 'tour-reports-export-btn',
    sidebarTargetId: 'sidebar-link-reports',
    titleVi: '11/11. Xuất Báo Cáo Dữ Liệu Excel / CSV',
    titleEn: '11/11. Export Excel / CSV Report',
    descVi: 'Bấm nút "Xuất Excel" để xuất toàn bộ danh sách dữ liệu bài đăng và thống kê tương tác ra tập tin Excel/CSV ngầm không làm đơ trình duyệt.',
    descEn: 'Click "Export Excel" to generate a background spreadsheet file containing all post statistics and performance metrics.',
  },
];

export default function AppOnboardingTour() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { language } = useLanguage();

  const [activeStepIndex, setActiveStepIndex] = useState<number | null>(null);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [sidebarRect, setSidebarRect] = useState<DOMRect | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync active step based on URL param or sessionStorage state
  useEffect(() => {
    if (!mounted) return;

    const onboardingParam = searchParams?.get('onboarding');
    const storedStep = sessionStorage.getItem('antbiz_tour_step');

    let currentStepNum = 0;

    if (onboardingParam) {
      currentStepNum = parseInt(onboardingParam, 10);
    } else if (storedStep) {
      currentStepNum = parseInt(storedStep, 10);
    }

    if (currentStepNum >= 1 && currentStepNum <= APP_TOUR_STEPS.length) {
      const targetConfig = APP_TOUR_STEPS[currentStepNum - 1];

      // If user is not on the correct page for this step, navigate them there
      if (pathname !== targetConfig.path) {
        sessionStorage.setItem('antbiz_tour_step', String(currentStepNum));
        router.push(`${targetConfig.path}?onboarding=${currentStepNum}`);
        return;
      }

      setActiveStepIndex(currentStepNum - 1);
      sessionStorage.setItem('antbiz_tour_step', String(currentStepNum));
    } else {
      setActiveStepIndex(null);
    }
  }, [searchParams, pathname, mounted, router]);

  // Track & highlight target DOM element & sidebar element
  useEffect(() => {
    if (activeStepIndex === null) {
      setTargetRect(null);
      setSidebarRect(null);
      return;
    }

    const currentConfig = APP_TOUR_STEPS[activeStepIndex];

    const updateRects = () => {
      const el = document.getElementById(currentConfig.targetId);
      if (el) {
        setTargetRect(el.getBoundingClientRect());
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        setTargetRect(null);
      }

      if (currentConfig.sidebarTargetId) {
        const sEl = document.getElementById(currentConfig.sidebarTargetId);
        if (sEl) {
          setSidebarRect(sEl.getBoundingClientRect());
        } else {
          setSidebarRect(null);
        }
      } else {
        setSidebarRect(null);
      }
    };

    updateRects();
    const timer = setTimeout(updateRects, 350);

    window.addEventListener('resize', updateRects);
    window.addEventListener('scroll', updateRects, true);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateRects);
      window.removeEventListener('scroll', updateRects, true);
    };
  }, [activeStepIndex, pathname]);

  if (!mounted || activeStepIndex === null) return null;

  const currentConfig = APP_TOUR_STEPS[activeStepIndex];
  const isVi = language === 'vi';

  const handleNext = () => {
    if (activeStepIndex < APP_TOUR_STEPS.length - 1) {
      const nextIndex = activeStepIndex + 1;
      const nextConfig = APP_TOUR_STEPS[nextIndex];
      sessionStorage.setItem('antbiz_tour_step', String(nextConfig.step));
      router.push(`${nextConfig.path}?onboarding=${nextConfig.step}`);
    } else {
      handleFinish();
    }
  };

  const handlePrev = () => {
    if (activeStepIndex > 0) {
      const prevIndex = activeStepIndex - 1;
      const prevConfig = APP_TOUR_STEPS[prevIndex];
      sessionStorage.setItem('antbiz_tour_step', String(prevConfig.step));
      router.push(`${prevConfig.path}?onboarding=${prevConfig.step}`);
    }
  };

  const handleSkip = () => {
    sessionStorage.removeItem('antbiz_tour_step');
    localStorage.setItem('antbiz_onboarded', 'true');
    setActiveStepIndex(null);
    router.replace(pathname);
  };

  const handleFinish = () => {
    sessionStorage.removeItem('antbiz_tour_step');
    localStorage.setItem('antbiz_onboarded', 'true');
    setActiveStepIndex(null);
    router.replace(pathname);
  };

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="app-tour-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[99999] pointer-events-none"
      >
        {/* SVG Spotlight Mask */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
          <defs>
            <mask id="app-tour-mask" maskUnits="userSpaceOnUse">
              <rect x="-100" y="-100" width="10000" height="10000" fill="white" />
              {targetRect && (
                <rect
                  x={targetRect.x - 8}
                  y={targetRect.y - 8}
                  width={targetRect.width + 16}
                  height={targetRect.height + 16}
                  rx={16}
                  fill="black"
                  className="transition-all duration-300 ease-in-out"
                />
              )}
              {sidebarRect && (
                <rect
                  x={sidebarRect.x - 6}
                  y={sidebarRect.y - 6}
                  width={sidebarRect.width + 12}
                  height={sidebarRect.height + 12}
                  rx={12}
                  fill="black"
                  className="transition-all duration-300 ease-in-out"
                />
              )}
            </mask>
          </defs>
          <rect
            x="-100"
            y="-100"
            width="10000"
            height="10000"
            fill="currentColor"
            mask="url(#app-tour-mask)"
            className="pointer-events-auto cursor-pointer text-black/65 dark:text-black/85"
            onClick={handleSkip}
          />
        </svg>

        {/* Tour Card */}
        <div className="absolute bottom-8 right-8 flex items-end justify-end pointer-events-auto">
          <motion.div
            key={`tour-card-${activeStepIndex}`}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl p-6 flex flex-col gap-4 w-[460px] max-w-[calc(100vw-2rem)] relative overflow-hidden"
          >
            {/* Ambient Progress bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${((activeStepIndex + 1) / APP_TOUR_STEPS.length) * 100}%` }}
              />
            </div>

            {/* Card Header */}
            <div className="flex justify-between items-center pt-1 select-none">
              <span className="inline-flex items-center gap-1.5 text-xs font-mono font-black uppercase text-primary tracking-wider">
                <Compass size={14} />
                {isVi ? `Hướng dẫn ${currentConfig.step}/11` : `Tour Step ${currentConfig.step}/11`}
              </span>
              <button
                onClick={handleSkip}
                className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors border-0 bg-transparent cursor-pointer flex items-center gap-1"
              >
                <span>{isVi ? 'Bỏ qua' : 'Skip'}</span>
                <X size={14} />
              </button>
            </div>

            {/* Card Body */}
            <div className="flex flex-col gap-2">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-snug">
                {isVi ? currentConfig.titleVi : currentConfig.titleEn}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                {isVi ? currentConfig.descVi : currentConfig.descEn}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between items-center mt-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              {activeStepIndex > 0 ? (
                <button
                  onClick={handlePrev}
                  className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold px-4 py-2.5 rounded-xl transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 border-0"
                >
                  <ArrowLeft size={14} />
                  <span>{isVi ? 'Quay lại' : 'Back'}</span>
                </button>
              ) : (
                <div />
              )}

              {activeStepIndex < APP_TOUR_STEPS.length - 1 ? (
                <button
                  onClick={handleNext}
                  className="bg-primary hover:bg-primary-hover text-white text-xs font-black px-5 py-2.5 rounded-xl transition-all active:scale-95 cursor-pointer shadow-md shadow-primary/20 flex items-center gap-1.5 border-0"
                >
                  <span>
                    {isVi
                      ? 'Tiếp theo'
                      : 'Next Step'}
                  </span>
                  <ArrowRight size={14} />
                </button>
              ) : (
                <button
                  onClick={handleFinish}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-5 py-2.5 rounded-xl transition-all active:scale-95 cursor-pointer shadow-md shadow-emerald-600/20 flex items-center gap-1.5 border-0"
                >
                  <Check size={14} />
                  <span>{isVi ? 'Hoàn tất Tour 🚀' : 'Finish Tour 🚀'}</span>
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
