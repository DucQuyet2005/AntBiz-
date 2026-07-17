'use client';

import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Loader2, Music, FileSpreadsheet, 
  UploadCloud, Trash2, ExternalLink, X
} from 'lucide-react';
import { ArticleContext } from '@/lib/services/creator/article.service';

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
  
  // Active site simulated browser modal
  const [activeBrowserSite, setActiveBrowserSite] = useState<'gocnhinmoi' | 'tuoitre' | 'dantri' | null>(null);

  // Audio & Document drag & drop upload states
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Uploaded files list (both audio and documents)
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; size: string; type: 'audio' | 'document' }[]>([
    { name: 'phong-van-ceo-2023.mp3', size: '12.5 MB', type: 'audio' }
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
    
    let detectedType: 'audio' | 'document' = 'audio';
    if (fileType.startsWith('audio/') || fileName.endsWith('.mp3') || fileName.endsWith('.wav')) {
      detectedType = 'audio';
    } else {
      detectedType = 'document';
    }

    let extractedText = '';
    if (detectedType === 'audio') {
      extractedText = `Chào mừng các bạn đến với buổi phỏng vấn ngày hôm nay. Chúng ta sẽ thảo luận về chiến lược phát triển bền vững trong năm 2024. Mục tiêu chính của chúng ta là giảm thiểu lượng khí thải carbon xuống 20% và tăng cường sử dụng năng lượng tái tạo.`;
      setUploadedFiles(prev => [...prev, { name: file.name, size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`, type: 'audio' }]);
    } else {
      extractedText = `Báo cáo thường niên 2024 về kế hoạch phát triển bền vững và chuyển đổi số trong vận hành doanh nghiệp. Kế hoạch chiến dịch marketing sản phẩm mới quý 3 năm 2026.`;
      setUploadedFiles(prev => [...prev, { name: file.name, size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`, type: 'document' }]);
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

  return (
    <div className="w-full max-w-5xl mx-auto flex-grow pt-4 pb-20 px-4 md:px-6 select-none animate-fade-in">
      
      {/* Page Title */}
      <div className="mb-8 text-center md:text-left">
        <h1 className="text-2xl md:text-3xl font-black text-text tracking-tight">Lựa chọn trang báo nhập bài viết</h1>
        <p className="text-text-muted text-sm mt-1">Chọn một nguồn hoặc nhập URL trực tiếp để AI tiến hành trích xuất nội dung.</p>
      </div>

      {/* Grid of Cards - 3 columns */}
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
          
          <div className="absolute bottom-4 left-4 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm rounded-xl p-2.5 shadow-md border border-gray-200 dark:border-zinc-800 flex items-center gap-2 font-sans">
            <div className="w-7 h-7 rounded-full bg-[#ff6b00] text-white flex items-center justify-center font-bold text-sm">G</div>
            <span className="font-bold text-sm text-zinc-900 dark:text-white flex items-center gap-1">
              Gocnhinmoi.com.vn
              <ExternalLink className="w-3.5 h-3.5 text-zinc-400 group-hover:text-[#ff6b00] transition-colors" />
            </span>
          </div>

          {crawlStatus === 'crawling' && sourceType === 'gocnhinmoi' && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-20 rounded-2xl">
              <Loader2 className="w-10 h-10 animate-spin text-[#ff6b00] mb-2" />
              <span className="text-xs font-bold text-[#ff6b00]">Đang crawl dữ liệu...</span>
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
          
          <div className="absolute bottom-4 left-4 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm rounded-xl p-2.5 shadow-md border border-gray-200 dark:border-zinc-800 flex items-center gap-2 font-sans">
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
          
          <div className="absolute bottom-4 left-4 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm rounded-xl p-2.5 shadow-md border border-gray-200 dark:border-zinc-800 flex items-center gap-2 font-sans">
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
      <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md rounded-2xl p-6 border border-gray-200 dark:border-zinc-800 shadow-md font-sans">
        <h2 className="text-sm font-bold text-text mb-4">Hoặc tải lên tệp tin (Audio, Tài liệu)</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          
          {/* Dropzone */}
          <div className="md:col-span-2">
            <div 
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-6 transition-colors cursor-pointer min-h-[160px] ${
                isDragging 
                  ? 'border-[#a04100] bg-[#a04100]/5' 
                  : 'border-gray-200 dark:border-zinc-800 hover:border-[#a04100] bg-gray-55 dark:bg-zinc-900/30'
              }`}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileSelect} 
                className="hidden" 
                accept="audio/*,.pdf,.docx,.doc,.txt"
              />
              {isUploading ? (
                <div className="flex flex-col items-center">
                  <Loader2 className="w-8 h-8 animate-spin text-[#a04100] mb-2" />
                  <span className="text-xs font-bold text-text">Đang tải tệp lên...</span>
                </div>
              ) : (
                <>
                  <UploadCloud className="w-8 h-8 text-[#a04100] mb-2" />
                  <h4 className="text-xs font-bold text-text mb-1">Kéo thả tệp vào đây hoặc Duyệt tìm</h4>
                  <p className="text-[10px] text-text-muted text-center">
                    Hỗ trợ Audio (MP3, WAV) hoặc Tài liệu (PDF, DOCX, TXT)
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Uploaded Files (STT of Audio/Documents) */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Trạng thái tệp</h4>
            {uploadedFiles.length === 0 ? (
              <div className="text-[11px] text-text-muted py-6 text-center border border-dashed border-gray-200 dark:border-zinc-800 rounded-xl">
                Chưa có tệp nào được tải lên
              </div>
            ) : (
              <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                {uploadedFiles.map((file, idx) => (
                  <div key={idx} className="bg-gray-55 dark:bg-zinc-950/40 rounded-xl p-3 border border-gray-200 dark:border-zinc-850 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-[#a04100]/5 text-[#a04100] flex items-center justify-center flex-shrink-0">
                        {file.type === 'audio' ? <Music className="w-4 h-4" /> : <FileSpreadsheet className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-text truncate">{file.name}</p>
                        <p className="text-[9px] text-text-muted mt-0.5">{file.size} • Thành công</p>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                      className="text-red-500 hover:bg-red-500/5 p-1.5 rounded-full transition-colors flex-shrink-0"
                      title="Xóa"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Simulated News Website Browser Modal */}
      {activeBrowserSite && siteData && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 sm:p-6 animate-fade-in select-text font-sans">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-scale-up">
            
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
                  className="lg:col-span-2 group relative bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-850 rounded-2xl overflow-hidden cursor-pointer shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col h-[380px]"
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
                        className="group flex gap-3 p-2.5 bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-850 rounded-xl cursor-pointer hover:border-[#a04100] hover:shadow-md transition-all"
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

    </div>
  );
}
