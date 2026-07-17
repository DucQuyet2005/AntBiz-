'use client';

import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { 
  Loader2, Music, FileSpreadsheet, 
  UploadCloud, Trash2, ExternalLink, X,
  Search, Check, Bookmark, Facebook, Instagram
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCreatorFlow } from '@/frontend/modules/creator-flow';
import { ArticleContext } from '@/lib/services/creator/article.service';

const ThreadsIcon = ({ className = '', size = 14 }: { className?: string; size?: number }) => (
  <svg 
    viewBox="0 0 24 24" 
    width={size} 
    height={size} 
    className={className} 
    fill="currentColor"
  >
    <path d="M13.62 12c0-1.1-.9-2-2-2s-2 .9-2 2 .9 2 2 2 2-.9 2-2zm8.84-2.8c-.85-4.14-4.22-7.3-8.39-7.89C8.36.43 3.32 3.86 1.83 8.78c-1.39 4.56.4 9.53 4.26 12.06 3.65 2.4 8.72 2.05 11.96-.86.33-.29.35-.8.06-1.12-.29-.32-.8-.35-1.12-.06-2.61 2.34-6.72 2.62-9.66.7-3.13-2.05-4.59-6.1-3.46-9.75C5.12 5.92 9.25 3.1 13.57 3.7c3.34.47 6.03 2.99 6.72 6.3.82 3.96-1.28 7.82-5.12 8.89-1.92.54-3.95.27-5.5-.78-1.58-1.07-2.39-2.88-2.22-4.83.21-2.42 2.19-4.32 4.61-4.39 2.59-.08 4.79 1.88 4.96 4.46.06.84.77 1.48 1.61 1.42s1.48-.77 1.42-1.61c-.29-4.33-3.94-7.61-8.29-7.48-4.06.12-7.36 3.3-7.7 7.36-.28 3.23 1.05 6.27 3.68 8.05 2.58 1.74 5.9 2.13 8.82 1.06 5.37-1.97 8.35-7.76 6.91-13.28z"/>
  </svg>
);

interface Step2ArticleProps {
  sourceType: 'gocnhinmoi' | 'tuoitre' | 'dantri' | 'manual' | null;
  crawlStatus: 'idle' | 'crawling' | 'done' | 'error';
  articleContext: ArticleContext | null;
  startCrawl: (url: string, source: 'gocnhinmoi' | 'tuoitre' | 'dantri') => Promise<void>;
  submitManual: (title: string, content: string) => Promise<void>;
}

// Mock articles data for simulation
const MOCK_SITE_ARTICLES = {
  gocnhinmoi: {
    main: {
      title: "Hội nghị thượng đỉnh COP28: Đạt thỏa thuận lịch sử chuyển đổi khỏi nhiên liệu hóa thạch",
      excerpt: "Đại biểu từ gần 200 quốc gia tham gia COP28 đã nhất trí về một lộ trình chung nhằm cắt giảm phát thải và tăng tỷ lệ sử dụng năng lượng tái tạo lên gấp ba lần trong thập kỷ này.",
      image: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=600&auto=format&fit=crop&q=60",
      url: "https://gocnhinmoi.com.vn/tin-tuc/cop28-historic-agreement"
    },
    sides: [
      {
        title: "Các tập đoàn công nghệ toàn cầu công bố quy tắc quản lý AI mới tại Brussels",
        image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=60",
        url: "https://gocnhinmoi.com.vn/tin-tuc/global-tech-ai-rules"
      },
      {
        title: "Báo cáo mới nhất về biến đổi khí hậu toàn cầu năm 2026",
        image: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=150&auto=format&fit=crop&q=60",
        url: "https://gocnhinmoi.com.vn/tin-tuc/climate-change-report"
      },
      {
        title: "Thị trường chứng khoán châu Á tăng điểm mạnh mẽ nhờ hỗ trợ từ các ngân hàng lớn",
        image: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=150&auto=format&fit=crop&q=60",
        url: "https://gocnhinmoi.com.vn/tin-tuc/asian-stock-market-rise"
      },
      {
        title: "Phỏng vấn độc quyền về tầm nhìn phát triển kinh tế số năm 2026",
        image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=60",
        url: "https://gocnhinmoi.com.vn/tin-tuc/digital-economy-interview"
      }
    ]
  },
  tuoitre: {
    main: {
      title: "Học sinh Việt Nam xuất sắc giành giải cao tại Olympic Tin học quốc tế 2026",
      excerpt: "Đoàn học sinh Việt Nam tham gia kỳ thi Olympic Tin học quốc tế năm nay đã xuất sắc mang về 3 Huy chương Vàng và 1 Huy chương Bạc, khẳng định chất lượng giáo dục đỉnh cao.",
      image: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&auto=format&fit=crop&q=60",
      url: "https://tuoitre.vn/giao-duc/vietnam-olympic-tin-hoc-2026"
    },
    sides: [
      {
        title: "Khởi động chiến dịch Mùa hè xanh hỗ trợ đồng bào vùng cao biên giới",
        image: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=150&auto=format&fit=crop&q=60",
        url: "https://tuoitre.vn/xa-hoi/mua-he-xanh-vung-cao"
      },
      {
        title: "TP.HCM chính thức ra mắt tuyến xe buýt điện mới thân thiện môi trường",
        image: "https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=150&auto=format&fit=crop&q=60",
        url: "https://tuoitre.vn/do-thi/xe-buyt-dien-tphcm"
      },
      {
        title: "Giá vàng trong nước biến động mạnh trước thềm công bố lãi suất của FED",
        image: "https://images.unsplash.com/photo-1610375461246-83df859d849d?w=150&auto=format&fit=crop&q=60",
        url: "https://tuoitre.vn/kinh-doanh/gia-vang-bien-dong-manh"
      },
      {
        title: "Khám phá vẻ đẹp ngoạn mục của Sơn Đoòng qua góc nhìn phóng viên quốc tế",
        image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=150&auto=format&fit=crop&q=60",
        url: "https://tuoitre.vn/du-lich/kham-pha-ve-dep-son-doong"
      }
    ]
  },
  dantri: {
    main: {
      title: "Chính phủ chủ trì hội nghị tháo gỡ khó khăn cho các doanh nghiệp công nghệ số",
      excerpt: "Thủ tướng nhấn mạnh chuyển đổi số là động lực cốt lõi thúc đẩy kinh tế. Các ban ngành cần nhanh chóng gỡ bỏ các rào cản hành chính nhằm tối đa hóa tiềm năng khởi nghiệp sáng tạo.",
      image: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=600&auto=format&fit=crop&q=60",
      url: "https://dantri.com.vn/kinh-doanh/chinh-phu-thao-go-doanh-nghiep-so"
    },
    sides: [
      {
        title: "Nhu cầu tuyển dụng nhân sự chất lượng cao ngành bán dẫn tăng mạnh",
        image: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=150&auto=format&fit=crop&q=60",
        url: "https://dantri.com.vn/viec-lam/tuyen-dung-nganh-ban-dan"
      },
      {
        title: "Đoàn thể thao Việt Nam sẵn sàng lên đường tham dự Giải vô địch châu Á",
        image: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=150&auto=format&fit=crop&q=60",
        url: "https://dantri.com.vn/the-thao/vietnam-giai-vo-dich-chau-a"
      },
      {
        title: "Trí tuệ nhân tạo AI đang tái định nghĩa trải nghiệm mua sắm trực tuyến",
        image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=150&auto=format&fit=crop&q=60",
        url: "https://dantri.com.vn/cong-nghe/ai-tai-dinh-nghia-shopping"
      },
      {
        title: "Những địa điểm du lịch mùa thu quyến rũ nhất định phải ghé thăm",
        image: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=150&auto=format&fit=crop&q=60",
        url: "https://dantri.com.vn/du-lich/dia-diem-mua-thu-quyen-ru"
      }
    ]
  }
};

export default function Step2Article({
  sourceType,
  crawlStatus,
  startCrawl,
  submitManual,
}: Step2ArticleProps) {
  const { t } = useLanguage();
  const { state, dispatch } = useCreatorFlow();

  // Active site simulated browser modal
  const [activeBrowserSite, setActiveBrowserSite] = useState<'gocnhinmoi' | 'tuoitre' | 'dantri' | null>(null);

  // Audio & Document drag & drop upload states
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadSectionRef = useRef<HTMLDivElement>(null);

  // Floating presets drawer states
  const [isPresetsOpen, setIsPresetsOpen] = useState(false);
  const [presetSearch, setPresetSearch] = useState('');
  const [presetTab, setPresetTab] = useState<'system' | 'personal'>('system');

  // Active tab for uploaded files status
  const [activeFileTab, setActiveFileTab] = useState<'audio' | 'document' | 'write'>('audio');

  // Preview document state modal
  const [previewDoc, setPreviewDoc] = useState<{ name: string; content: string } | null>(null);

  const getTagColorClass = (tag: string) => {
    const text = tag.toLowerCase();
    if (text.includes('tương tác')) return 'bg-indigo-50 dark:bg-indigo-950/20 text-primary border border-indigo-100 dark:border-indigo-900/30';
    if (text.includes('sự kiện') || text.includes('báo')) return 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-900/30';
    if (text.includes('chuyên gia') || text.includes('uy quyền')) return 'bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 border border-green-100 dark:border-green-900/30';
    if (text.includes('kiến thức') || text.includes('sáng tạo')) return 'bg-purple-50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-400 border border-purple-100 dark:border-purple-900/30';
    if (text.includes('bán')) return 'bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30';
    return 'bg-gray-50 dark:bg-zinc-800 text-gray-700 dark:text-gray-400 border border-gray-100 dark:border-zinc-700/50';
  };

  const getPlatformIcon = (platform: string) => {
    if (platform === 'facebook') return <Facebook className="w-3 h-3 text-[#1877F2]" />;
    if (platform === 'instagram') return <Instagram className="w-3 h-3 text-[#E1306C]" />;
    if (platform === 'threads') return <ThreadsIcon className="text-black dark:text-white" size={12} />;
    return null;
  };

  // Uploaded files list (both audio, documents, and images)
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; size: string; type: 'audio' | 'document' | 'image'; url?: string; content?: string }[]>([
    { name: 'phong-van-ceo-2023.mp3', size: '12.5 MB', type: 'audio' },
    { 
      name: 'NETSPACE_Lê Hải Trung_T6_2026.docx', 
      size: '4.6 MB', 
      type: 'document',
      content: `BÁO CÁO HOẠT ĐỘNG TRUNG TÂM ĐÀO TẠO NETSPACE - THÁNG 06/2026
Người thực hiện: Lê Hải Trung

I. KẾT QUẢ ĐẠT ĐƯỢC:
1. Hoàn tất đào tạo 4 lớp AI ứng dụng cho đối tác SMEs với tổng số 85 học viên.
2. Tỷ lệ học viên hài lòng với chất lượng bài giảng và giảng viên đạt 94.5%.
3. Phát triển thành công bộ giáo trình chuyên sâu về Next.js và Tailwind CSS.

II. KẾ THỪA VÀ PHÁT TRIỂN QUÝ TIẾP THEO:
1. Đẩy mạnh tuyển sinh khóa học AI Creator và Content Automation.
2. Nâng cấp hạ tầng lab thực hành phục vụ học viên trực tuyến.`
    }
  ]);

  const handleFileDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await processUploadedFile(files[0]);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await processUploadedFile(files[0]);
    }
  };

  const processUploadedFile = async (file: File) => {
    setIsUploading(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsUploading(false);

    const fileType = file.type;
    const fileName = file.name.toLowerCase();
    
    let detectedType: 'audio' | 'document' | 'image' = 'document';
    let url = '';
    if (fileType.startsWith('image/') || fileName.endsWith('.png') || fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) {
      detectedType = 'image';
      url = URL.createObjectURL(file);
    } else if (fileType.startsWith('audio/') || fileName.endsWith('.mp3') || fileName.endsWith('.wav')) {
      detectedType = 'audio';
      url = URL.createObjectURL(file);
    } else {
      detectedType = 'document';
    }

    let extractedText = '';
    if (detectedType === 'audio') {
      extractedText = `Chào mừng các bạn đến với buổi phỏng vấn ngày hôm nay. Chúng ta sẽ thảo luận về chiến lược phát triển bền vững trong năm 2024. Mục tiêu chính của chúng ta là giảm thiểu lượng khí thải carbon xuống 20% và tăng cường sử dụng năng lượng tái tạo.`;
      setUploadedFiles(prev => [...prev, { name: file.name, size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`, type: 'audio', url }]);
      setActiveFileTab('audio');
    } else if (detectedType === 'image') {
      extractedText = `Hình ảnh: ${file.name}`;
      setUploadedFiles(prev => [...prev, { name: file.name, size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`, type: 'image', url }]);
      // Keep active tab unchanged for images as they display persistently below
    } else {
      extractedText = `Nội dung tài liệu trích xuất tự động từ tệp ${file.name}. Kế hoạch phát triển bền vững và chuyển đổi số trong vận hành doanh nghiệp trong giai đoạn tiếp theo.`;
      setUploadedFiles(prev => [...prev, { 
        name: file.name, 
        size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`, 
        type: 'document',
        content: extractedText
      }]);
      setActiveFileTab('write'); // Automatically switch to "Tự viết" editor when parsed

      // Auto-fill manual form area state
      const titleWithoutExtension = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      dispatch({ 
        type: 'SET_MANUAL_CONTENT', 
        payload: { title: titleWithoutExtension, content: extractedText } 
      });
    }

    await submitManual(file.name, extractedText);
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSelectArticle = async (url: string) => {
    if (!activeBrowserSite) return;
    await startCrawl(url, activeBrowserSite);
    setActiveBrowserSite(null);
  };

  // Extract selected site articles data
  const siteData = activeBrowserSite ? MOCK_SITE_ARTICLES[activeBrowserSite] : null;

  // Check if there are any uploaded images
  const hasImages = uploadedFiles.some(f => f.type === 'image');

  return (
    <div className="w-full max-w-5xl mx-auto flex-grow pt-4 pb-20 px-4 md:px-6 select-none animate-fade-in">
      
      {/* Page Title */}
      <div className="mb-6 text-center md:text-left">
        <h1 className="text-2xl md:text-3xl font-black text-text tracking-tight">Lựa chọn nguồn nhập bài viết</h1>
      </div>

      {/* Floating Style Presets Trigger Button */}
      <div 
        className="fixed right-6 bottom-24 z-40 select-none"
      >
        <button
          onClick={() => setIsPresetsOpen(true)}
          className="h-12 w-12 hover:w-28 rounded-full bg-primary hover:bg-primary/95 text-white flex items-center justify-start pl-3.5 shadow-lg transition-all duration-300 ease-out active:scale-95 group relative animate-fade-in"
          title="Chọn phong cách AI (Style Presets)"
        >
          <div className="flex items-center gap-2 overflow-hidden">
            <Bookmark className="w-5 h-5 flex-shrink-0 transition-transform duration-300 group-hover:rotate-6" />
            <span className="opacity-0 w-0 group-hover:opacity-100 group-hover:w-auto text-[10px] font-black tracking-wider transition-all duration-300 whitespace-nowrap uppercase">
              Presets
            </span>
          </div>
          {/* Badge indicator if a preset is selected */}
          {state.selectedPresetId !== null && (
            <span className="absolute -top-1 -right-1 w-4.5 h-4.5 bg-emerald-500 rounded-full border-2 border-white dark:border-zinc-900 flex items-center justify-center text-[8px] font-black text-white shadow-md z-10">
              ✓
            </span>
          )}
        </button>
      </div>

      {/* Sliding Style Presets Drawer -> Redesigned as a Centered Modal Dialog via React Portal */}
      {isPresetsOpen && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 select-text font-sans">
          {/* Backdrop */}
          <div 
            onClick={() => setIsPresetsOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[101] animate-fade-in"
          />
          
          {/* Centered Modal Panel */}
          <div className="relative w-full max-w-2xl bg-white dark:bg-zinc-950 border border-gray-250 dark:border-zinc-850 z-[102] shadow-2xl rounded-3xl flex flex-col max-h-[85vh] overflow-hidden animate-scale-up">
            
            {/* Modal Header */}
            <div className="px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-text">Chọn phong cách AI (Style Presets)</h3>
                <p className="text-[11px] text-text-muted mt-0.5">Đặt cấu hình định dạng, tone giọng và độ dài bài viết.</p>
              </div>
              <button 
                onClick={() => setIsPresetsOpen(false)}
                className="text-text-muted hover:text-text p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-850 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sub-header: Search and System/Personal tabs */}
            <div className="px-6 py-3 bg-gray-55 dark:bg-zinc-900/30 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 select-none">
              {/* Search bar */}
              <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="text"
                  className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-zinc-950 border border-gray-250 dark:border-zinc-800 rounded-xl text-xs text-text focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-text-muted/60"
                  placeholder={t('creator.step3.searchPlaceholder')}
                  value={presetSearch}
                  onChange={(e) => setPresetSearch(e.target.value)}
                />
              </div>

              {/* System / Personal Tabs */}
              <div className="flex gap-1 bg-gray-100 dark:bg-zinc-900 p-1 rounded-xl border border-gray-250/20 dark:border-zinc-800 shrink-0">
                <button
                  type="button"
                  onClick={() => setPresetTab('system')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    presetTab === 'system'
                      ? 'bg-white dark:bg-zinc-950 text-primary shadow-sm'
                      : 'text-text-muted hover:text-text'
                  }`}
                >
                  Presets hệ thống
                </button>
                <button
                  type="button"
                  onClick={() => setPresetTab('personal')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    presetTab === 'personal'
                      ? 'bg-white dark:bg-zinc-950 text-primary shadow-sm'
                      : 'text-text-muted hover:text-text'
                  }`}
                >
                  Presets cá nhân
                </button>
              </div>
            </div>

            {/* Presets List */}
            <div className="px-6 py-4 flex-grow flex-shrink min-h-0">
              <div className="h-[300px] max-h-full overflow-y-auto pr-1 no-scrollbar border border-gray-250 dark:border-zinc-850 rounded-2xl">
                {state.presets
                  .filter((preset) => {
                    const matchesSearch = preset.name.toLowerCase().includes(presetSearch.toLowerCase()) ||
                      preset.tags.some(tag => tag.toLowerCase().includes(presetSearch.toLowerCase()));
                    const isSystem = preset.id === 'preset_summer_campaign' || preset.id === 'preset_product_launch' || preset.id === 'preset_insta_lifestyle';
                    const matchesTab = presetTab === 'system' ? isSystem : !isSystem;
                    return matchesSearch && matchesTab;
                  })
                  .map((preset) => {
                    const isSelected = state.selectedPresetId === preset.id;
                    return (
                      <div
                        key={preset.id}
                        onClick={() => {
                          const newId = isSelected ? null : preset.id;
                          dispatch({ type: 'SET_SELECTED_PRESET', payload: newId });
                        }}
                        className={`flex items-center justify-between p-4 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-primary/5 dark:bg-primary/5 hover:bg-primary/8'
                            : 'bg-white dark:bg-zinc-900/40 hover:bg-gray-55 dark:hover:bg-zinc-850/50'
                        }`}
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-gray-100 dark:bg-zinc-800 flex-shrink-0 text-text shadow-sm border border-gray-200/20">
                            {getPlatformIcon(preset.platform)}
                          </span>
                          <div className="min-w-0">
                            <h4 className={`text-xs font-bold text-text truncate ${isSelected ? 'text-primary' : ''}`}>
                              {preset.name}
                            </h4>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="hidden md:flex flex-wrap gap-1">
                            {preset.tags.slice(0, 2).map((tag, tIdx) => (
                              <span key={tIdx} className={`text-[8px] font-bold px-2 py-0.5 rounded-full ${getTagColorClass(tag)}`}>
                                {tag}
                              </span>
                            ))}
                            {preset.tags.length > 2 && (
                              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-zinc-800 text-text-muted">
                                +{preset.tags.length - 2}
                              </span>
                            )}
                          </div>

                          <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                            isSelected 
                              ? 'border-primary bg-primary text-white' 
                              : 'border-gray-300 dark:border-zinc-700 bg-transparent'
                          }`}>
                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                {state.presets.filter((preset) => {
                  const matchesSearch = preset.name.toLowerCase().includes(presetSearch.toLowerCase()) ||
                    preset.tags.some(tag => tag.toLowerCase().includes(presetSearch.toLowerCase()));
                  const isSystem = preset.id === 'preset_summer_campaign' || preset.id === 'preset_product_launch' || preset.id === 'preset_insta_lifestyle';
                  const matchesTab = presetTab === 'system' ? isSystem : !isSystem;
                  return matchesSearch && matchesTab;
                }).length === 0 && (
                  <div className="p-8 text-center text-xs text-text-muted bg-white dark:bg-zinc-900/40">
                    Không tìm thấy phong cách nào phù hợp.
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gray-55 dark:bg-zinc-950 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsPresetsOpen(false)}
                className="px-4 py-2 bg-primary hover:bg-primary/95 text-white rounded-xl text-xs font-bold transition-all active:scale-95 shadow-md shadow-primary/10"
              >
                Đóng
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}

      {/* Grid of Website Cards - 3 columns */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
        
        {/* Card 1: Gocnhinmoi */}
        <div 
          onClick={() => setActiveBrowserSite('gocnhinmoi')}
          className="bg-zinc-100 dark:bg-zinc-900 rounded-2xl overflow-hidden cursor-pointer group hover:-translate-y-1 transition-all duration-300 shadow-md hover:shadow-xl relative aspect-[16/9]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80 mix-blend-multiply" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuAvJ8KciIMLvReEBHnYlzWk5BOfT2GOG8lxu4IKb1OHQtTenSlm0YKFuhjKVqF_QA28KA5cVi9DRYlzisegqFHq-R2GXI9ZAcbzrN0ZCb1wr4pw5qOH3JoU6hjFayqua_m7CY3YxZ6BvwVNrgzX9B-vg7YDbdC64mW0D_aswaQ14L3ZbTWK6koHlXFVwLZtZj8DvU-Y7KM6PdB4yVlrNiNLkj-Apkf_l2AIgg5nSBOmKFa__x1npWU"
            alt="Gocnhinmoi background"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
          
          <div className="absolute bottom-4 left-4 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm rounded-xl p-2.5 shadow-md border border-gray-250 dark:border-zinc-800 flex items-center gap-2 font-sans">
            <div className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">G</div>
            <span className="font-bold text-sm text-zinc-900 dark:text-white flex items-center gap-1">
              Gocnhinmoi.com.vn
              <ExternalLink className="w-3.5 h-3.5 text-zinc-400 group-hover:text-primary transition-colors" />
            </span>
          </div>

          {crawlStatus === 'crawling' && sourceType === 'gocnhinmoi' && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-20 rounded-2xl">
              <Loader2 className="w-10 h-10 animate-spin text-primary mb-2" />
              <span className="text-xs font-bold text-primary">Đang crawl dữ liệu...</span>
            </div>
          )}
        </div>

        {/* Card 2: Tuoi Tre */}
        <div 
          onClick={() => setActiveBrowserSite('tuoitre')}
          className="bg-zinc-100 dark:bg-zinc-900 rounded-2xl overflow-hidden cursor-pointer group hover:-translate-y-1 transition-all duration-300 shadow-md hover:shadow-xl relative aspect-[16/9]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80 mix-blend-multiply" 
            src="https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=600&auto=format&fit=crop&q=60"
            alt="Tuoitre background"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
          
          <div className="absolute bottom-4 left-4 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm rounded-xl p-2.5 shadow-md border border-gray-250 dark:border-zinc-800 flex items-center gap-2 font-sans">
            <div className="w-7 h-7 rounded-full bg-[#E32119] text-white flex items-center justify-center font-bold text-sm">T</div>
            <span className="font-bold text-sm text-zinc-900 dark:text-white flex items-center gap-1">
              tuoitre.vn
              <ExternalLink className="w-3.5 h-3.5 text-zinc-400 group-hover:text-[#E32119] transition-colors" />
            </span>
          </div>

          {crawlStatus === 'crawling' && sourceType === 'tuoitre' && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-20 rounded-2xl">
              <Loader2 className="w-10 h-10 animate-spin text-[#E32119] mb-2" />
              <span className="text-xs font-bold text-[#E32119]">Đang crawl dữ liệu...</span>
            </div>
          )}
        </div>

        {/* Card 3: Dan Tri */}
        <div 
          onClick={() => setActiveBrowserSite('dantri')}
          className="bg-zinc-100 dark:bg-zinc-900 rounded-2xl overflow-hidden cursor-pointer group hover:-translate-y-1 transition-all duration-300 shadow-md hover:shadow-xl relative aspect-[16/9]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80 mix-blend-multiply" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDzQ_bDckz_5eTLgBs9tEGpM7JxV3U5M8cLJAJ_4Wv_nfkOGTVFTaw9kPym9E51a0axHur2dgO7C-hnaoiNn-xIL0KJiOVoE4KUcwz6NLZKUiJpsja_rQwTEkbkR6cG73G4sxkb52Rwox3EzTs49LWb_UB6X2fpAMvXNIX0kXgtbKscE4umSG7GqKx6IFQk8EGeLm6TygMDkvopvWl6djx3aP3lIcVTbXkWiqkV_DvYZoRC3EDmMRA"
            alt="Dantri background"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
          
          <div className="absolute bottom-4 left-4 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm rounded-xl p-2.5 shadow-md border border-gray-250 dark:border-zinc-800 flex items-center gap-2 font-sans">
            <div className="w-7 h-7 rounded-full bg-[#008953] text-white flex items-center justify-center font-bold text-sm">D</div>
            <span className="font-bold text-sm text-zinc-900 dark:text-white flex items-center gap-1">
              dantri.com.vn
              <ExternalLink className="w-3.5 h-3.5 text-zinc-400 group-hover:text-[#008953] transition-colors" />
            </span>
          </div>

          {crawlStatus === 'crawling' && sourceType === 'dantri' && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-20 rounded-2xl">
              <Loader2 className="w-10 h-10 animate-spin text-[#008953] mb-2" />
              <span className="text-xs font-bold text-[#008953]">Đang crawl dữ liệu...</span>
            </div>
          )}
        </div>

      </div>

      {/* File Upload Area */}
      <div ref={uploadSectionRef} className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md rounded-2xl p-6 border border-gray-250 dark:border-zinc-800 shadow-md font-sans">
        <h2 className="text-sm font-bold text-text mb-4">Hoặc tải lên tệp tin của bạn</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch min-h-[380px]">
          {/* Left Column: Dropzone */}
          <div className="flex flex-col justify-between h-full min-h-[350px]">
            <div 
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-6 transition-colors cursor-pointer flex-grow h-full min-h-[330px] ${
                isDragging 
                  ? 'border-primary bg-primary/5' 
                  : 'border-gray-250 dark:border-zinc-800 hover:border-primary bg-gray-55 dark:bg-zinc-900/30'
              }`}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileSelect} 
                className="hidden" 
                accept="audio/*,.pdf,.docx,.doc,.txt,image/*"
              />
              {isUploading ? (
                <div className="flex flex-col items-center">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
                  <span className="text-xs font-bold text-text">Đang tải tệp lên...</span>
                </div>
              ) : (
                <>
                  <UploadCloud className="w-8 h-8 text-primary mb-2" />
                  <h4 className="text-xs font-bold text-text mb-1">Kéo thả tệp vào đây hoặc Duyệt tìm</h4>
                  <p className="text-[10px] text-text-muted text-center">
                    Hỗ trợ Audio, Hình ảnh (PNG, JPG) hoặc Tài liệu (PDF, DOCX, TXT)
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Right Column: Uploaded Files Status / Manual Input */}
          <div className="flex flex-col h-full min-h-[350px] border-t md:border-t-0 md:border-l border-gray-150 dark:border-zinc-850 pt-6 md:pt-0 md:pl-6 justify-between">
            <div className="flex-grow flex flex-col min-h-0">
              <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">Trạng thái tệp tải lên</h4>
              
              <div className="flex border-b border-gray-150 dark:border-zinc-800 mb-4 flex-shrink-0">
                {(['audio', 'document', 'write'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveFileTab(tab)}
                    className={`pb-2 px-3 text-xs font-bold transition-all border-b-2 capitalize ${
                      activeFileTab === tab 
                        ? 'border-primary text-primary' 
                        : 'border-transparent text-text-muted hover:text-text'
                    }`}
                  >
                    {tab === 'audio' ? 'Audio' : tab === 'document' ? 'Tài liệu' : 'Tự viết'}
                  </button>
                ))}
              </div>

              <div className={`flex-grow overflow-y-auto pr-1 no-scrollbar ${hasImages ? 'max-h-[210px]' : 'max-h-[290px]'}`}>
                {activeFileTab === 'write' ? (
                  <div className="space-y-4 flex-grow animate-fade-in">
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Tiêu đề bài viết gốc</label>
                        <input
                          type="text"
                          placeholder="Nhập tiêu đề bài viết gốc..."
                          value={state.manualTitle}
                          onChange={(e) => dispatch({ type: 'SET_MANUAL_CONTENT', payload: { title: e.target.value, content: state.manualContent } })}
                          className="w-full px-3 py-2 rounded-xl border border-gray-250 dark:border-zinc-800 focus:ring-1 focus:ring-primary outline-none bg-white dark:bg-zinc-900 text-xs font-semibold text-text"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Nội dung bài viết gốc</label>
                        <textarea
                          placeholder="Nhập hoặc dán nội dung bài viết gốc của bạn vào đây..."
                          value={state.manualContent}
                          rows={4}
                          onChange={(e) => dispatch({ type: 'SET_MANUAL_CONTENT', payload: { title: state.manualTitle, content: e.target.value } })}
                          className="w-full px-3 py-2 rounded-xl border border-gray-250 dark:border-zinc-800 focus:ring-1 focus:ring-primary outline-none bg-white dark:bg-zinc-900 text-xs font-semibold text-text resize-none"
                        />
                      </div>

                    </div>
                  </div>
                ) : (
                  uploadedFiles.filter(f => f.type === activeFileTab).length === 0 ? (
                    <div className="text-[11px] text-text-muted py-8 text-center border border-dashed border-gray-200 dark:border-zinc-800 rounded-xl flex-grow flex items-center justify-center min-h-[180px]">
                      Chưa có {activeFileTab === 'audio' ? 'tệp âm thanh' : 'tài liệu'} nào
                    </div>
                  ) : (
                    <div className="space-y-3 pr-1">
                      {uploadedFiles
                        .filter(f => f.type === activeFileTab)
                        .map((file, idx) => (
                          <div 
                            key={idx} 
                            onClick={() => {
                              if (file.type === 'document') {
                                setPreviewDoc({
                                  name: file.name,
                                  content: file.content || 'Không có nội dung preview.'
                                });
                              }
                            }}
                            className={`bg-gray-55 dark:bg-zinc-950/40 rounded-xl p-3 border border-gray-250 dark:border-zinc-850 flex flex-col gap-2.5 shadow-sm transition-all ${
                              file.type === 'document' ? 'cursor-pointer hover:border-primary/50 hover:bg-primary/5' : ''
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-8 h-8 rounded-lg bg-primary/5 text-primary flex items-center justify-center flex-shrink-0">
                                  {file.type === 'audio' ? (
                                    <Music className="w-4 h-4" />
                                  ) : (
                                    <FileSpreadsheet className="w-4 h-4" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-[11px] font-bold text-text truncate">{file.name}</p>
                                  <p className="text-[9px] text-text-muted mt-0.5">{file.size} • Thành công</p>
                                </div>
                              </div>
                              
                              <button 
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  setUploadedFiles(prev => prev.filter(f => f.name !== file.name)); 
                                }}
                                className="text-red-500 hover:bg-red-500/5 p-1.5 rounded-full transition-colors flex-shrink-0"
                                title="Xóa"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {file.type === 'audio' && (
                              <div className="mt-1">
                                <audio 
                                  src={file.url || "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"} 
                                  controls 
                                  className="w-full h-8 rounded-lg text-xs" 
                                />
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Persistent Selected Images Gallery */}
            {hasImages && (
              <div className="mt-4 pt-4 border-t border-gray-150 dark:border-zinc-850 flex-shrink-0 animate-fade-in select-none">
                <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">Hình ảnh đã tải lên ({uploadedFiles.filter(f => f.type === 'image').length})</h4>
                <div className="flex flex-wrap gap-2 overflow-x-auto py-1 max-h-[85px] no-scrollbar">
                  {uploadedFiles
                    .filter(f => f.type === 'image')
                    .map((file, idx) => (
                      <div key={idx} className="relative rounded-xl overflow-hidden border border-gray-250 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 w-16 h-16 group/img shadow-sm flex-shrink-0">
                        <img 
                          src={file.url || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200"} 
                          alt={file.name} 
                          className="w-full h-full object-cover"
                        />
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            setUploadedFiles(prev => prev.filter(f => f.name !== file.name)); 
                          }}
                          className="absolute top-1 right-1 bg-red-500 hover:bg-red-650 text-white p-1 rounded-full transition-colors opacity-95 shadow-md flex items-center justify-center"
                          title="Xóa"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Simulated News Website Browser Modal */}
      {activeBrowserSite && siteData && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 sm:p-6 animate-fade-in select-text font-sans">
          <div className="bg-white dark:bg-zinc-900 border border-gray-250 dark:border-zinc-850 rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-scale-up">
            
            {/* Chrome-style browser address bar */}
            <div className="bg-zinc-100 dark:bg-zinc-950 px-4 py-3 border-b border-gray-200 dark:border-zinc-850 flex items-center gap-3">
              <div className="flex gap-1.5 flex-shrink-0">
                <span onClick={() => setActiveBrowserSite(null)} className="w-3 h-3 rounded-full bg-red-400 block cursor-pointer hover:bg-red-500 transition-colors"></span>
                <span className="w-3 h-3 rounded-full bg-yellow-400 block"></span>
                <span className="w-3 h-3 rounded-full bg-green-400 block"></span>
              </div>
              <div className="flex-grow bg-white dark:bg-zinc-900 rounded-lg px-4 py-1.5 text-xs text-text-muted border border-gray-200 dark:border-zinc-800 select-all truncate">
                {`https://www.${activeBrowserSite === 'gocnhinmoi' ? 'gocnhinmoi.com.vn' : activeBrowserSite === 'tuoitre' ? 'tuoitre.vn' : 'dantri.com.vn'}`}
              </div>
              <button 
                onClick={() => setActiveBrowserSite(null)}
                className="text-text-muted hover:text-text p-1 rounded-full hover:bg-gray-250 dark:hover:bg-zinc-850 transition-colors"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Browser Content Area */}
            <div className="overflow-y-auto p-6 flex-grow bg-[#fcf9f8] dark:bg-zinc-900/40">
              <div className="flex justify-between items-center mb-6 pb-3 border-b border-gray-200 dark:border-zinc-800">
                <h2 className="text-xs font-black text-text uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#a04100] animate-pulse"></span>
                  CHỌN BÀI VIẾT CHO BẢN TIN HÔM NAY
                </h2>
                <span className="text-[10px] bg-[#a04100]/10 text-[#a04100] font-black px-2.5 py-1 rounded-full uppercase">
                  Bước 2: Chọn bài viết
                </span>
              </div>

              {/* Main and Side articles layout */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Main Article (Left) */}
                <div 
                  onClick={() => handleSelectArticle(siteData.main.url)}
                  className="lg:col-span-2 group relative bg-white dark:bg-zinc-900 border border-gray-250 dark:border-zinc-850 rounded-2xl overflow-hidden cursor-pointer shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col h-[380px]"
                >
                  <div className="h-[240px] overflow-hidden bg-zinc-150 relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500" 
                      src={siteData.main.image} 
                      alt={siteData.main.title}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent"></div>
                    
                    {/* Select Article Badge Overlay */}
                    <div className="absolute top-4 right-4 bg-zinc-900/90 text-white font-black text-[10px] px-3.5 py-1.5 rounded-md transition-colors border border-zinc-700 uppercase tracking-wider shadow-md hover:bg-black">
                      CHỌN BÀI VIẾT
                    </div>
                    
                    <div className="absolute bottom-4 left-4 right-4 text-white">
                      <span className="text-[9px] bg-[#a04100] text-white font-black px-2 py-0.5 rounded mr-2 uppercase">Tin nóng</span>
                      <span className="text-[10px] text-zinc-300">Vừa xong</span>
                      <h3 className="text-base font-black mt-2 leading-snug tracking-tight text-white group-hover:text-[#ffb693] transition-colors line-clamp-2">
                        {siteData.main.title}
                      </h3>
                    </div>
                  </div>
                  
                  <div className="p-4 flex-grow flex flex-col justify-between">
                    <p className="text-[11px] text-text-muted line-clamp-3 leading-relaxed">
                      {siteData.main.excerpt}
                    </p>
                    <div className="flex items-center justify-between text-[9px] text-text-muted mt-2 border-t border-gray-150 dark:border-zinc-800 pt-2">
                      <span>Nguồn: {activeBrowserSite === 'gocnhinmoi' ? 'Góc Nhìn Mới' : activeBrowserSite === 'tuoitre' ? 'Tuổi Trẻ' : 'Dân Trí'}</span>
                      <span>Chuyên mục: Thời sự</span>
                    </div>
                  </div>
                </div>

                {/* Side Articles List (Right) */}
                <div className="space-y-4 flex flex-col h-[380px]">
                  <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-wider flex-shrink-0">Tin nóng khác</h4>
                  <div className="space-y-3 overflow-y-auto pr-1 flex-grow">
                    {siteData.sides.map((article, idx) => (
                      <div 
                        key={idx}
                        onClick={() => handleSelectArticle(article.url)}
                        className="group flex gap-3 p-2.5 bg-white dark:bg-zinc-900 border border-gray-250 dark:border-zinc-850 rounded-xl cursor-pointer hover:border-[#a04100] hover:shadow-md transition-all"
                      >
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-zinc-150 flex-shrink-0 relative">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-350" src={article.image} alt={article.title} />
                        </div>
                        
                        <div className="flex flex-col justify-between min-w-0 flex-grow">
                          <h5 className="text-[10px] font-bold text-text leading-snug line-clamp-2 group-hover:text-[#a04100] transition-colors">
                            {article.title}
                          </h5>
                          <span className="text-[8px] text-text-muted mt-1 block">15 phút trước</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>,
        document.body
      )}

      {/* Document Preview Modal */}
      {previewDoc && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 sm:p-6 animate-fade-in select-text font-sans">
          <div className="bg-white dark:bg-zinc-900 border border-gray-250 dark:border-zinc-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-scale-up">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-150 dark:border-zinc-850 flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-text truncate">{previewDoc.name}</h3>
                  <p className="text-[10px] text-text-muted">Xem trước nội dung văn bản trích xuất</p>
                </div>
              </div>
              <button 
                onClick={() => setPreviewDoc(null)}
                className="text-text-muted hover:text-text p-1.5 rounded-full hover:bg-gray-250 dark:hover:bg-zinc-850 transition-all active:scale-95"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto flex-grow bg-gray-55 dark:bg-zinc-950/20 text-xs text-text leading-relaxed whitespace-pre-wrap select-all font-mono">
              {previewDoc.content}
            </div>

            {/* Footer actions */}
            <div className="px-6 py-4 border-t border-gray-150 dark:border-zinc-850 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  dispatch({ 
                    type: 'SET_MANUAL_CONTENT', 
                    payload: { title: previewDoc.name.substring(0, previewDoc.name.lastIndexOf('.')), content: previewDoc.content } 
                  });
                  setPreviewDoc(null);
                  setActiveFileTab('write'); // Switches to input tab
                }}
                className="px-4 py-2 bg-primary hover:bg-primary/95 text-white rounded-xl text-xs font-bold transition-all active:scale-95 shadow-md shadow-primary/10"
              >
                Đưa vào khung soạn thảo
              </button>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="px-4 py-2 bg-gray-100 dark:bg-zinc-850 hover:bg-gray-200 dark:hover:bg-zinc-800 text-text rounded-xl text-xs font-bold transition-all"
              >
                Đóng
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
