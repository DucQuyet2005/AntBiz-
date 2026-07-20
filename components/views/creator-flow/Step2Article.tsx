'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Loader2, Music, FileSpreadsheet, 
  UploadCloud, Trash2, ExternalLink, X,
  Search, Check, Bookmark, Facebook, Instagram,
  ChevronLeft, Mic, Square, AlertCircle, Play, Pause, CheckCircle2, RotateCcw,
  Sparkles, ArrowRight, Wand2

} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCreatorFlow } from '@/frontend/modules/creator-flow';
import type { CreatorUploadedSource } from '@/frontend/modules/creator-flow';
import { ArticleContext } from '@/lib/services/creator/article.service';
import { motion, AnimatePresence } from 'framer-motion';

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
  uploadSource: (file: File) => Promise<CreatorUploadedSource>;
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
  articleContext,
  startCrawl,
  submitManual,
  uploadSource,
}: Step2ArticleProps) {
  const { t } = useLanguage();
  const { state, dispatch } = useCreatorFlow();

  // Active site simulated browser modal
  const [activeBrowserSite, setActiveBrowserSite] = useState<'gocnhinmoi' | 'tuoitre' | 'dantri' | null>(null);
  const [currentBrowserUrl, setCurrentBrowserUrl] = useState<string>('');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleGoBack = () => {
    if (iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage({ type: 'NAVIGATE_BACK' }, '*');
      } catch (err) {
        // Ignore cross-origin postMessage error if iframe is detached or unaccessible
      }
    }
  };

  React.useEffect(() => {
    if (activeBrowserSite) {
      const baseUrl = activeBrowserSite === 'gocnhinmoi'
        ? 'https://gocnhinmoi.com.vn'
        : activeBrowserSite === 'tuoitre'
          ? 'https://tuoitre.vn'
          : 'https://dantri.com.vn';
      setCurrentBrowserUrl(baseUrl);
    } else {
      setCurrentBrowserUrl('');
    }
  }, [activeBrowserSite]);

  React.useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'URL_CHANGE' && typeof event.data?.url === 'string') {
        setCurrentBrowserUrl(event.data.url);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);


  // Audio & Document drag & drop upload states
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadSectionRef = useRef<HTMLDivElement>(null);

  // Floating presets drawer & hint popover states
  const [isPresetsOpen, setIsPresetsOpen] = useState(false);
  const [presetSearch, setPresetSearch] = useState('');
  const [presetTab, setPresetTab] = useState<'system' | 'personal'>('personal');
  const [showPresetHint, setShowPresetHint] = useState(false);

  // Auto show preset selection onboarding hint when step 2 is active/crawl is ready, then auto-hide after 5s
  useEffect(() => {
    if (state.articleContext || state.crawlStatus === 'done') {
      // Show hint popover
      setShowPresetHint(true);
      
      // Auto dismiss after 5s (5000ms) to let user notice without blocking the screen
      const hideTimer = setTimeout(() => {
        setShowPresetHint(false);
      }, 5000);

      return () => clearTimeout(hideTimer);
    }
  }, [state.articleContext, state.crawlStatus]);

  // Active tab for uploaded files status - restricted to audio and document (manual is always visible below)
  const [activeFileTab, setActiveFileTab] = useState<'audio' | 'document'>('audio');

  // Preview document state modal
  const [previewDoc, setPreviewDoc] = useState<{ name: string; content: string } | null>(null);

  // Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [uploadedImages, setUploadedImages] = useState<{ file: File; url: string }[]>(() => {
    if (typeof window === 'undefined') return [];
    const initialUrls = state.crawledImageUrls || [];
    return initialUrls
      .filter(url => url.startsWith('blob:') || url.startsWith('data:'))
      .map((url, idx) => {
        const dummyFile = new File([], `Anh_${idx + 1}.png`, { type: "image/png" });
        return { file: dummyFile, url };
      });
  });
  const uploadedImagesRef = useRef(uploadedImages);

  // Lightbox & image list modal states
  const [activeLightboxImage, setActiveLightboxImage] = useState<string | null>(null);
  const [showAllImagesModal, setShowAllImagesModal] = useState(false);

  // Audio playback and object URL states
  const [audioUrls, setAudioUrls] = useState<Record<string, string>>({});
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const audioPlaybackRef = useRef<HTMLAudioElement | null>(null);

  const togglePlayAudio = (fileName: string, url: string) => {
    if (playingAudio === fileName) {
      if (audioPlaybackRef.current) {
        audioPlaybackRef.current.pause();
      }
      setPlayingAudio(null);
    } else {
      if (audioPlaybackRef.current) {
        audioPlaybackRef.current.pause();
      }
      const audio = new Audio(url);
      audioPlaybackRef.current = audio;
      audio.onended = () => {
        setPlayingAudio(null);
      };
      audio.play().catch(err => {
        console.error("Playback failed:", err);
      });
      setPlayingAudio(fileName);
    }
  };

  React.useEffect(() => {
    return () => {
      if (audioPlaybackRef.current) {
        audioPlaybackRef.current.pause();
      }
    };
  }, []);

  React.useEffect(() => {
    return () => {
      Object.values(audioUrls).forEach(url => URL.revokeObjectURL(url));
    };
  }, [audioUrls]);

  React.useEffect(() => {
    uploadedImagesRef.current = uploadedImages;

    // Sync manually uploaded images to global state.crawledImageUrls
    const uploadedUrlsSet = new Set(uploadedImages.map(img => img.url));
    const crawledOnly = (state.crawledImageUrls || []).filter(url => !url.startsWith('blob:') && !url.startsWith('data:') && !uploadedUrlsSet.has(url));
    const uploadedUrls = uploadedImages.map(img => img.url);
    const combined = [...crawledOnly, ...uploadedUrls];
    
    const currentCombinedStr = JSON.stringify(state.crawledImageUrls || []);
    const newCombinedStr = JSON.stringify(combined);
    if (currentCombinedStr !== newCombinedStr) {
      dispatch({ type: 'SET_CRAWLED_IMAGES', payload: combined });
    }
  }, [uploadedImages, state.crawledImageUrls, dispatch]);

  const getAllItems = React.useCallback(() => {
    const uploadedUrlsSet = new Set(uploadedImages.map(img => img.url));
    const crawledUrls = (state.crawledImageUrls || []).filter(url => !uploadedUrlsSet.has(url));
    const crawledItems = crawledUrls.map((url, index) => ({
      type: 'crawled' as const,
      url,
      name: `Ảnh bài báo ${index + 1}`,
    }));
    const uploadedItems = uploadedImages.map((img, index) => ({
      type: 'uploaded' as const,
      url: img.url,
      name: img.file.name || `Ảnh ${index + 1}`,
      file: img.file,
      index,
    }));
    return [...crawledItems, ...uploadedItems];
  }, [state.crawledImageUrls, uploadedImages]);

  // Crawl success popup and content flow animation states
  const [isCrawlingActive, setIsCrawlingActive] = useState(false);
  const [showCrawlSuccessDialog, setShowCrawlSuccessDialog] = useState(false);
  const [animatingData, setAnimatingData] = useState<{ title: string; content: string } | null>(null);
  const [isHighlighting, setIsHighlighting] = useState(false);
  // Track previous crawlStatus to detect transitions (avoids race condition with isCrawlingActive state)
  // Initialized with current crawlStatus so first render does not false-trigger
  const prevCrawlStatusRef = React.useRef<string>(crawlStatus);

  React.useEffect(() => {
    const prev = prevCrawlStatusRef.current;
    prevCrawlStatusRef.current = crawlStatus;

    // Detect transition from 'crawling' → 'done'
    if (prev === 'crawling' && crawlStatus === 'done') {
      setIsCrawlingActive(false);
      // ONLY auto-fill and show animation for web crawl sources. Manual sources (like Audio/File uploads) 
      // already handle their own state in useCreatorFlow to support appending.
      if (articleContext && sourceType !== 'manual') {
        // Fill data IMMEDIATELY — do not rely on onAnimationComplete
        dispatch({
          type: 'SET_MANUAL_CONTENT',
          payload: { title: articleContext.title || '', content: articleContext.content || '' }
        });
        // Then trigger visual effects
        setAnimatingData({ title: articleContext.title || '', content: articleContext.content || '' });
        setShowCrawlSuccessDialog(true);
        setIsHighlighting(true);
        setTimeout(() => setIsHighlighting(false), 1500);
        const timer = setTimeout(() => setShowCrawlSuccessDialog(false), 6000);
        return () => clearTimeout(timer);
      }
    } else if (prev === 'crawling' && crawlStatus === 'error') {
      setIsCrawlingActive(false);
      setUploadError('Không thể thu thập bài viết. Vui lòng thử lại hoặc nhập thủ công.');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crawlStatus, articleContext]);

  React.useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

  React.useEffect(() => {
    return () => {
      uploadedImagesRef.current.forEach(img => {
        if (img.url.startsWith('blob:')) {
          URL.revokeObjectURL(img.url);
        }
      });
    };
  }, []);



  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartRecording = async () => {
    setUploadError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      const startTime = Date.now();
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());

        const durationMs = Date.now() - startTime;
        if (durationMs < 2000) {
          setUploadError('Thời lượng ghi âm quá ngắn. Vui lòng nói lâu hơn (tối thiểu 2 giây).');
          return;
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new File([audioBlob], `Ghi-am-${Date.now()}.webm`, { type: 'audio/webm' });
        await processUploadedFile(file);
      };
      
      mediaRecorder.start(1000); // chunk every 1s
      setIsRecording(true);
      setRecordingDuration(0);
      
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => {
          if (prev >= 300) { // Limit to 5 mins
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
              mediaRecorderRef.current.stop();
            }
            if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
      
    } catch (err) {
      console.error('Không thể truy cập microphone:', err);
      setUploadError('Không thể truy cập microphone. Vui lòng kiểm tra quyền thiết bị.');
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  const getTagColorClass = (tag: string) => {
    const text = tag.toLowerCase();
    if (text.includes('tương tác')) return 'bg-indigo-50 dark:bg-indigo-950/20 text-primary border border-indigo-100 dark:border-indigo-900/30';
    if (text.includes('sự kiện') || text.includes('báo')) return 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-900/30';
    if (text.includes('chuyên gia') || text.includes('uy quyền')) return 'bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 border border-green-100 dark:border-green-900/30';
    if (text.includes('kiến thức') || text.includes('sáng tạo')) return 'bg-purple-50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-400 border border-purple-100 dark:border-purple-900/30';
    if (text.includes('bán')) return 'bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30';
    if (text.includes('hệ thống')) return 'bg-sky-50 dark:bg-sky-950/20 text-sky-700 dark:text-sky-400 border border-sky-100 dark:border-sky-900/30';
    return 'bg-gray-50 dark:bg-zinc-800 text-gray-700 dark:text-gray-400 border border-gray-100 dark:border-zinc-700/50';
  };

  const getPlatformIcon = (platform: string) => {
    if (platform === 'facebook') return <Facebook className="w-3 h-3 text-[#1877F2]" />;
    if (platform === 'instagram') return <Instagram className="w-3 h-3 text-[#E1306C]" />;
    if (platform === 'threads') return <ThreadsIcon className="text-black dark:text-white" size={12} />;
    return null;
  };

  // Files that completed processing and Article persistence.
  const [uploadedFiles, setUploadedFiles] = useState<CreatorUploadedSource[]>([]);

  const handleFileDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (isUploading) return;
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        await processUploadedFile(files[i]);
      }
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        await processUploadedFile(files[i]);
      }
    }
    e.target.value = '';
  };

  const processUploadedFile = async (file: File) => {
    setUploadError('');
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (extension && ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(extension)) {
      try {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        setUploadedImages(prev => [...prev, { file, url: dataUrl }]);
      } catch {
        const objectUrl = URL.createObjectURL(file);
        setUploadedImages(prev => [...prev, { file, url: objectUrl }]);
      }
      return;
    }

    setIsUploading(true);
    try {
      const uploaded = await uploadSource(file);
      setUploadedFiles((previous) => [
        ...previous.filter((item) => item.name !== uploaded.name),
        uploaded,
      ]);
      if (uploaded.type === 'audio') {
        const url = URL.createObjectURL(file);
        setAudioUrls(prev => ({ ...prev, [uploaded.name]: url }));
      }
      if (uploaded.type === 'audio' || uploaded.type === 'document') {
        setActiveFileTab(uploaded.type);
        // Trigger highlight glow effect when content is filled from STT/Doc
        setIsHighlighting(true);
        setTimeout(() => setIsHighlighting(false), 1500);
      }
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Không thể xử lý tệp đã chọn');
    } finally {
      setIsUploading(false);
    }
  };

  const handleManualSubmit = async () => {
    setUploadError('');
    setIsUploading(true);
    try {
      await submitManual(state.manualTitle, state.manualContent);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Không thể lưu bài viết');
    } finally {
      setIsUploading(false);
    }
  };

  const handleResetAllFields = () => {
    // 1. Clear local uploaded images
    setUploadedImages([]);
    // 2. Clear uploaded files (audio/documents)
    setUploadedFiles([]);
    setAudioUrls({});
    if (audioPlaybackRef.current) {
      audioPlaybackRef.current.pause();
    }
    setPlayingAudio(null);
    // 3. Clear title and content in global state & context
    dispatch({ type: 'SET_MANUAL_CONTENT', payload: { title: '', content: '' } });
    dispatch({ type: 'SET_ARTICLE_ID', payload: null });
    dispatch({ type: 'SET_ARTICLE_CONTEXT', payload: null });
    dispatch({ type: 'SET_CRAWLED_IMAGES', payload: [] });
    dispatch({ type: 'SET_SOURCE_TYPE', payload: 'manual' });
    dispatch({ type: 'SET_CRAWL_STATUS', payload: 'idle' });
    setUploadError('');
  };

  const handleSelectArticle = (url: string) => {
    if (!activeBrowserSite) return;
    const site = activeBrowserSite;
    setActiveBrowserSite(null);
    setIsCrawlingActive(true);
    handleResetAllFields();
    startCrawl(url, site);
  };

  // Extract selected site articles data

  return (
    <div className="w-full max-w-5xl mx-auto flex-grow pt-4 pb-20 px-4 md:px-6 select-none animate-fade-in">
      
      {/* Page Title */}
      <div className="mb-6 text-center md:text-left">
        <h1 className="text-2xl md:text-3xl font-black text-text tracking-tight">Lựa chọn nguồn nhập bài viết</h1>
      </div>

      {/* Floating Style Presets Trigger Button & Onboarding Popover Hint */}
      <div 
        className="fixed right-6 bottom-24 z-40 select-none"
      >
        {/* Onboarding hint popover tooltip next to button */}
        <AnimatePresence>
          {showPresetHint && !isPresetsOpen && (
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="absolute right-0 bottom-16 mb-2 w-64 sm:w-72 bg-white dark:bg-zinc-900 border border-primary/40 dark:border-primary/50 rounded-2xl p-3.5 shadow-2xl z-50 font-sans text-left"
            >
              {/* Arrow indicator pointing down right towards button */}
              <div className="absolute -bottom-2 right-4 w-4 h-4 bg-white dark:bg-zinc-900 border-r border-b border-primary/40 dark:border-primary/50 rotate-45" />

              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 text-primary font-bold text-xs sm:text-sm">
                  <Sparkles className="w-4 h-4 text-amber-500 animate-bounce flex-shrink-0" />
                  <span>Nút chọn Văn phong</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPresetHint(false)}
                  className="text-text-muted hover:text-text p-1 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                  title="Đóng thông báo"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <p className="text-xs text-text-muted mt-1.5 leading-relaxed">
                Bạn có thể bấm vào đây để chọn <strong>văn phong thương hiệu</strong> phù hợp cho bài viết bất kỳ lúc nào.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => {
            setShowPresetHint(false);
            setIsPresetsOpen(true);
          }}
          className="h-12 w-12 hover:w-32 rounded-full bg-primary hover:bg-primary/95 text-white flex items-center justify-start pl-3.5 shadow-lg transition-all duration-300 ease-out active:scale-95 group relative animate-fade-in cursor-pointer"
          title="Chọn văn phong thương hiệu (Style Presets)"
        >
          {showPresetHint && (
            <span className="absolute inset-0 rounded-full bg-primary/40 animate-ping pointer-events-none" />
          )}
          <div className="flex items-center gap-2 overflow-hidden relative z-10">
            <Bookmark className="w-5 h-5 flex-shrink-0 transition-transform duration-300 group-hover:rotate-6" />
            <span className="opacity-0 w-0 group-hover:opacity-100 group-hover:w-auto text-[10px] font-black tracking-wider transition-all duration-300 whitespace-nowrap uppercase">
              Văn phong
            </span>
          </div>
          {/* Badge indicator if a preset is selected */}
          {state.selectedPresetId !== null && (
            <span className="absolute -top-1 -right-1 w-4.5 h-4.5 bg-emerald-500 rounded-full border-2 border-white dark:border-zinc-900 flex items-center justify-center text-[8px] font-black text-white shadow-md z-20">
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


            </div>

            {/* Presets List */}
            <div className="px-6 py-4 flex-grow flex-shrink min-h-0">
              <div className="h-[300px] max-h-full overflow-y-auto pr-1 no-scrollbar border border-gray-250 dark:border-zinc-850 rounded-2xl">
                {state.presets
                  .filter((preset) => {
                    return preset.name.toLowerCase().includes(presetSearch.toLowerCase()) ||
                      preset.tags.some(tag => tag.toLowerCase().includes(presetSearch.toLowerCase()));
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
                  const isSystem = Boolean(preset.isSystem);
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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/gocnhinmoi-logo.png" alt="Góc Nhìn Mới" className="h-6 object-contain" />
            <span className="font-bold text-sm text-zinc-900 dark:text-white">
              Góc Nhìn Mới
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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/tuoitre-logo.png" alt="Tuổi Trẻ" className="h-6 object-contain bg-red-600 p-1 rounded" />
            <span className="font-bold text-sm text-zinc-900 dark:text-white">
              Tuổi Trẻ
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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/dantri-logo.png" alt="Dân Trí" className="h-6 object-contain" />
            <span className="font-bold text-sm text-zinc-900 dark:text-white">
              Dân Trí
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
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-text">Hoặc tải lên tệp tin của bạn</h2>
          <button
            type="button"
            onClick={handleResetAllFields}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-800/50 rounded-xl transition-all active:scale-95 cursor-pointer shadow-sm"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Tạo lại</span>
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch min-h-[380px]">
          {/* Left Column: Dropzone & Direct Recording */}
          <div className="flex flex-col gap-4 justify-between h-full min-h-[350px]">
            <div 
              onDragOver={(e) => { e.preventDefault(); if (!isUploading) setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleFileDrop}
              onClick={() => { if (!isUploading) fileInputRef.current?.click(); }}
              className={`border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-6 transition-colors flex-grow h-full min-h-[220px] ${
                isUploading ? 'cursor-wait opacity-80' : 'cursor-pointer'
              } ${
                isDragging 
                  ? 'border-amber-500 bg-amber-500/5' 
                  : 'border-gray-250 dark:border-zinc-800 hover:border-amber-500 bg-gray-55 dark:bg-zinc-900/30'
              }`}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileSelect} 
                className="hidden" 
                accept="image/png,image/jpeg,image/jpg,image/webp,audio/mpeg,audio/mp4,audio/wav,audio/webm,audio/ogg,.mp3,.m4a,.pdf,.docx,.txt"
                disabled={isUploading}
                multiple
              />
              {isUploading ? (
                <div className="flex flex-col items-center">
                  <Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-2" />
                  <span className="text-xs font-bold text-text">Đang xử lý và lưu nguồn...</span>
                </div>
              ) : (
                <>
                  <UploadCloud className="w-10 h-10 text-amber-500 mb-3" />
                  <h4 className="text-xs font-bold text-text mb-1">Kéo thả tệp vào đây hoặc Duyệt tìm</h4>
                  <p className="text-[10px] text-text-muted text-center max-w-[280px] leading-relaxed">
                    Hỗ trợ Hình ảnh (PNG, JPG, JPEG), Audio (MP3, M4A, WAV, OGG, WebM) hoặc Tài liệu (PDF, DOCX, TXT)
                  </p>
                </>
              )}
            </div>

            {/* Direct Recording Card */}
            <div className="flex items-center justify-between p-4 bg-gray-55 dark:bg-zinc-900/30 border border-gray-250 dark:border-zinc-800 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
                  {isRecording ? (
                    <span className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
                  ) : (
                    <Mic className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <p className="text-xs font-bold text-text">
                    {isRecording ? `Đang ghi âm... (${formatDuration(recordingDuration)})` : 'Ghi âm trực tiếp'}
                  </p>
                  <p className="text-[10px] text-text-muted">
                    {isRecording ? 'Bấm dừng để nói và chuyển thành bài viết' : 'Bấm nút để nói và chuyển thành bài viết'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={isRecording ? handleStopRecording : handleStartRecording}
                disabled={isUploading}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all active:scale-95 duration-150 shrink-0 ${
                  isRecording 
                    ? 'bg-red-500 hover:bg-red-650 shadow-md shadow-red-500/10' 
                    : 'bg-amber-500 hover:bg-amber-600 shadow-md shadow-amber-500/10'
                }`}
              >
                {isRecording ? (
                  <>
                    <Square className="w-3.5 h-3.5 fill-white" />
                    <span>Dừng</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-3.5 h-3.5" />
                    <span>Bắt đầu</span>
                  </>
                )}
              </button>
            </div>

            {/* Combined Images Preview Row: crawled images + manually uploaded images */}
            {(() => {
              // Build a unified list: crawled images (url-only) + user-uploaded images (File + url)
              const crawledUrls = state.crawledImageUrls || [];
              const crawledItems = crawledUrls.map((url, idx) => ({ 
                type: 'crawled' as const, 
                url, 
                name: `Ảnh bài báo ${idx + 1}` 
              }));
              const uploadedItems = uploadedImages.map(img => ({ type: 'uploaded' as const, url: img.url, name: img.file.name, file: img.file, index: uploadedImages.indexOf(img) }));
              const allItems = [...crawledItems, ...uploadedItems];

              if (allItems.length === 0) return null;
              return (
                <div className="grid grid-cols-5 gap-3.5 mt-2 animate-fade-in select-none w-full">
                  {allItems.slice(0, 4).map((item, idx) => (
                    <div key={idx} className="flex flex-col items-center w-full group relative select-none">
                      <div
                        onClick={() => setActiveLightboxImage(item.url)}
                        title={item.url} // Add URL as tooltip for debugging
                        className="w-full aspect-square rounded-2xl border border-gray-250 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-950 relative shadow-sm hover:shadow-md transition-all duration-200 cursor-zoom-in"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.type === 'crawled' ? `/api/proxy?url=${encodeURIComponent(item.url)}` : item.url}
                          alt={item.name}
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).onerror = null;
                            (e.currentTarget as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect width='18' height='18' x='3' y='3' rx='2' ry='2'/%3E%3Ccircle cx='9' cy='9' r='2'/%3E%3Cpath d='m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21'/%3E%3C/svg%3E";
                          }}
                          className="w-full h-full object-cover select-none"
                        />
                        {item.type === 'crawled' ? (
                          <div className="absolute bottom-1 left-1 bg-amber-500/90 text-white text-[7px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wide shadow-sm">Crawl</div>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setUploadedImages(prev => prev.filter((_, i) => i !== (item as typeof uploadedItems[0]).index));
                              if (item.url.startsWith('blob:')) URL.revokeObjectURL(item.url);
                            }}
                            className="absolute top-1 right-1 bg-red-500 hover:bg-red-650 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 shadow-sm cursor-pointer"
                            title="Xóa ảnh"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        )}

                      </div>
                      <span className="text-[10px] text-text-muted text-center w-full truncate font-semibold mt-1">
                        {item.name.split('.')[0]}
                      </span>
                    </div>
                  ))}

                  {allItems.length > 4 && (
                    <div className="flex flex-col items-center w-full relative select-none">
                      <div
                        onClick={() => setShowAllImagesModal(true)}
                        className="w-full aspect-square rounded-2xl border border-gray-250 dark:border-zinc-800 overflow-hidden relative shadow-sm cursor-pointer hover:brightness-110 transition-all"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={allItems[4].type === 'crawled' ? `/api/proxy?url=${encodeURIComponent(allItems[4].url)}` : allItems[4].url}
                          alt={allItems[4].name}
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).onerror = null;
                            (e.currentTarget as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect width='18' height='18' x='3' y='3' rx='2' ry='2'/%3E%3Ccircle cx='9' cy='9' r='2'/%3E%3Cpath d='m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21'/%3E%3C/svg%3E";
                          }}
                          className="w-full h-full object-cover brightness-[0.4] select-none"
                        />
                        <div className="absolute inset-0 flex items-center justify-center text-white text-xs font-black">
                          +{allItems.length - 4}
                        </div>
                      </div>
                      <span className="text-[10px] text-text-muted text-center w-full truncate font-semibold mt-1">
                        {allItems[4].name.split('.')[0]}
                      </span>
                    </div>
                  )}
                </div>
              );
            })()}

          </div>

          {/* Right Column: Uploaded Files Status & Manual Input Always Visible */}
          <div className="flex flex-col h-full min-h-[350px] border-t md:border-t-0 md:border-l border-gray-150 dark:border-zinc-850 pt-6 md:pt-0 md:pl-6 justify-between">
            <div className="flex-grow flex flex-col min-h-0">
              <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">Trạng thái tệp tải lên</h4>
              
              {/* Audio and Document Tabs */}
              <div className="flex border-b border-gray-150 dark:border-zinc-800 mb-4 flex-shrink-0">
                {(['audio', 'document'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveFileTab(tab)}
                    className={`pb-2 px-3 text-xs font-bold transition-all border-b-2 capitalize ${
                      activeFileTab === tab 
                        ? 'border-amber-500 text-amber-500' 
                        : 'border-transparent text-text-muted hover:text-text'
                    }`}
                  >
                    {tab === 'audio' ? 'Audio' : 'Tài liệu'}
                  </button>
                ))}
              </div>

              {/* Uploaded File List / Empty State Container */}
              <div className="flex-grow overflow-y-auto pr-1 no-scrollbar max-h-[120px] mb-4">
                {uploadedFiles.filter(f => f.type === activeFileTab).length === 0 ? (
                  <div className="text-[11px] text-text-muted py-6 text-center border border-dashed border-gray-250 dark:border-zinc-800 rounded-xl bg-gray-55 dark:bg-zinc-950/20 flex items-center justify-center min-h-[80px]">
                    Chưa có {activeFileTab === 'audio' ? 'tệp âm thanh' : 'tài liệu'} nào
                  </div>
                ) : (
                  <div className="space-y-2 pr-1">
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
                            file.type === 'document' ? 'cursor-pointer hover:border-amber-500/50 hover:bg-amber-500/5' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-amber-500/5 text-amber-500 flex items-center justify-center flex-shrink-0">
                                {file.type === 'audio' ? (
                                  audioUrls[file.name] ? (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        togglePlayAudio(file.name, audioUrls[file.name]);
                                      }}
                                      className="w-full h-full rounded-lg flex items-center justify-center hover:bg-amber-500/10 active:scale-90 transition-all cursor-pointer"
                                      title={playingAudio === file.name ? "Tạm dừng" : "Phát ghi âm"}
                                    >
                                      {playingAudio === file.name ? (
                                        <Pause className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                                      ) : (
                                        <Play className="w-3.5 h-3.5 text-amber-500" />
                                      )}
                                    </button>
                                  ) : (
                                    <Music className="w-4 h-4" />
                                  )
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
                                if (playingAudio === file.name) {
                                  if (audioPlaybackRef.current) audioPlaybackRef.current.pause();
                                  setPlayingAudio(null);
                                }
                                if (audioUrls[file.name]) {
                                  URL.revokeObjectURL(audioUrls[file.name]);
                                  setAudioUrls(prev => {
                                    const next = { ...prev };
                                    delete next[file.name];
                                    return next;
                                  });
                                }
                                setUploadedFiles(prev => prev.filter(f => f.name !== file.name)); 
                              }}
                              className="text-red-500 hover:bg-red-500/5 p-1.5 rounded-full transition-colors flex-shrink-0 cursor-pointer"
                              title="Xóa"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Divider Line */}
              <div className="border-b border-gray-200 dark:border-zinc-800/80 my-4" />

              {/* Manual Input Fields - Always Visible */}
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">Tiêu đề bài viết gốc</label>
                  <input
                    type="text"
                    placeholder="Nhập tiêu đề bài viết gốc..."
                    value={state.manualTitle}
                    disabled={isUploading}
                    onChange={(e) => dispatch({ type: 'SET_MANUAL_CONTENT', payload: { title: e.target.value, content: state.manualContent } })}
                    className={`w-full px-3 py-2 rounded-xl border focus:ring-1 focus:ring-amber-500 outline-none bg-white dark:bg-zinc-900 text-xs font-semibold text-text transition-all duration-1000 ${
                      isHighlighting 
                        ? 'border-amber-500 bg-amber-500/10 dark:bg-amber-950/20 shadow-lg shadow-amber-500/20 scale-[1.01]' 
                        : 'border-gray-250 dark:border-zinc-800'
                    }`}
                  />
                </div>
                <div className="flex-grow flex flex-col min-h-[180px]">
                  <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">Nội dung bài viết gốc</label>
                  <textarea
                    placeholder="Nhập hoặc dán nội dung bài viết gốc của bạn vào đây..."
                    value={state.manualContent}
                    rows={6}
                    disabled={isUploading}
                    onChange={(e) => dispatch({ type: 'SET_MANUAL_CONTENT', payload: { title: state.manualTitle, content: e.target.value } })}
                    className={`w-full flex-grow px-3 py-3 rounded-xl border focus:ring-1 focus:ring-amber-500 outline-none bg-white dark:bg-zinc-900 text-xs font-semibold text-text resize-none min-h-[160px] leading-relaxed transition-all duration-1000 ${
                      isHighlighting 
                        ? 'border-amber-500 bg-amber-500/10 dark:bg-amber-950/20 shadow-lg shadow-amber-500/20 scale-[1.005]' 
                        : 'border-gray-250 dark:border-zinc-800'
                    }`}
                  />
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Simulated News Website Browser Modal */}
      {activeBrowserSite && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 sm:p-6 animate-fade-in select-text font-sans">
          <div className="bg-white dark:bg-zinc-900 border border-gray-250 dark:border-zinc-850 rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-scale-up">
            
            {/* Chrome-style browser address bar */}
            <div className="bg-zinc-100 dark:bg-zinc-950 px-4 py-3 border-b border-gray-200 dark:border-zinc-850 flex items-center gap-3">
              {/* Nút quay lại trang trước */}
              <button
                type="button"
                onClick={handleGoBack}
                className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-800 text-text-muted hover:text-text transition-colors flex items-center justify-center cursor-pointer shrink-0"
                title="Quay lại trang trước"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              
              <input
                type="text"
                value={currentBrowserUrl}
                onChange={(e) => setCurrentBrowserUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && currentBrowserUrl.trim() && iframeRef.current) {
                    let target = currentBrowserUrl.trim();
                    if (!target.startsWith('http://') && !target.startsWith('https://')) {
                      target = 'https://' + target;
                    }
                    iframeRef.current.src = `/api/proxy?url=${encodeURIComponent(target)}`;
                  }
                }}
                className="flex-grow bg-white dark:bg-zinc-900 rounded-lg px-3 py-1.5 text-xs text-text border border-gray-200 dark:border-zinc-800 font-semibold focus:ring-1 focus:ring-primary outline-none"
                placeholder="Nhập hoặc dán liên kết bài viết tại đây..."
              />
              
              <button
                type="button"
                onClick={() => handleSelectArticle(currentBrowserUrl)}
                className="px-4 py-1.5 bg-primary hover:bg-primary/95 text-white rounded-lg text-xs font-black transition-all active:scale-95 flex items-center gap-1.5 shrink-0 shadow-md shadow-primary/10 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Chọn bài viết này</span>
              </button>

              <button 
                onClick={() => setActiveBrowserSite(null)}
                className="text-text-muted hover:text-text p-1 rounded-full hover:bg-gray-250 dark:hover:bg-zinc-850 transition-colors cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Browser Content Area */}
            <div className="flex-grow flex flex-col bg-[#fcf9f8] dark:bg-zinc-900/40 p-4 min-h-[500px]">
              <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-200 dark:border-zinc-800 flex-shrink-0">
                <h2 className="text-xs font-black text-text uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse"></span>
                  Trình duyệt tích hợp - Duyệt tin trực tiếp
                </h2>
                <span className="text-[10px] bg-primary/10 text-primary font-black px-2.5 py-1 rounded-full uppercase">
                  Chọn bài viết để crawl nội dung
                </span>
              </div>
              
              <div className="w-full flex-grow relative bg-white rounded-2xl overflow-hidden border border-gray-250 dark:border-zinc-850 h-[50vh]">
                <iframe
                  ref={iframeRef}
                  src={`/api/proxy?url=${encodeURIComponent(
                    activeBrowserSite === 'gocnhinmoi' 
                      ? 'https://gocnhinmoi.com.vn' 
                      : activeBrowserSite === 'tuoitre' 
                        ? 'https://tuoitre.vn' 
                        : 'https://dantri.com.vn'
                  )}`}
                  className="w-full h-full border-none"
                  sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                />
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

      {/* Image Lightbox Modal */}
      {activeLightboxImage && typeof window !== 'undefined' && createPortal(
        <div 
          onClick={() => setActiveLightboxImage(null)}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4 cursor-zoom-out animate-fade-in select-none"
        >
          <div className="relative max-w-[90vw] max-h-[85vh] select-none" onClick={e => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={activeLightboxImage} 
              alt="Preview gốc" 
              className="rounded-2xl max-w-full max-h-[80vh] object-contain shadow-2xl border border-white/10"
            />
            <button
              onClick={() => setActiveLightboxImage(null)}
              className="absolute -top-10 right-0 text-white/80 hover:text-white flex items-center gap-1 text-xs font-bold bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>Đóng</span>
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* All Uploaded Images Modal */}
      {showAllImagesModal && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 sm:p-6 animate-fade-in select-text font-sans">
          <div className="bg-white dark:bg-zinc-900 border border-gray-250 dark:border-zinc-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-scale-up">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-150 dark:border-zinc-850 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-text">Tất cả ảnh ({getAllItems().length})</h3>
                <p className="text-[10px] text-text-muted">Xem và quản lý tất cả các ảnh nguồn</p>
              </div>
              <button 
                onClick={() => setShowAllImagesModal(false)}
                className="text-text-muted hover:text-text p-1.5 rounded-full hover:bg-gray-250 dark:hover:bg-zinc-850 transition-all active:scale-95 cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Grid of Images */}
            <div className="p-6 overflow-y-auto flex-grow bg-gray-55 dark:bg-zinc-950/20">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {getAllItems().map((item, index) => (
                  <div key={index} className="flex flex-col items-center gap-1.5 group relative select-none">
                    <div 
                      onClick={() => setActiveLightboxImage(item.url)}
                      className="w-full aspect-square rounded-2xl border border-gray-250 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-950 relative shadow-sm hover:shadow-md cursor-zoom-in transition-all duration-200"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.url} alt={item.name} className="w-full h-full object-cover select-none" />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (item.type === 'uploaded') {
                            setUploadedImages(prev => prev.filter((_, i) => i !== item.index));
                            if (item.url.startsWith('blob:')) URL.revokeObjectURL(item.url);
                          } else {
                            dispatch({
                              type: 'SET_CRAWLED_IMAGES',
                              payload: (state.crawledImageUrls || []).filter(u => u !== item.url)
                            });
                          }
                          if (getAllItems().length <= 1) {
                            setShowAllImagesModal(false);
                          }
                        }}
                        className="absolute top-1.5 right-1.5 bg-red-500 hover:bg-red-650 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 shadow-md cursor-pointer"
                        title="Xóa ảnh"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <span className="text-[10px] text-text-muted text-center w-full truncate font-semibold px-1 mt-1">
                      {item.name.split('.')[0]}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-150 dark:border-zinc-850 flex justify-end">
              <button
                type="button"
                onClick={() => setShowAllImagesModal(false)}
                className="px-4 py-2 bg-gray-100 dark:bg-zinc-850 hover:bg-gray-200 dark:hover:bg-zinc-800 text-text rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Warning Toast - bottom right, non-blocking. AnimatePresence removed: incompatible with createPortal */}
      {uploadError && typeof window !== 'undefined' && createPortal(
        <motion.div
          key="error-toast"
          initial={{ opacity: 0, y: 24, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', damping: 22, stiffness: 320 }}
          className="fixed bottom-6 right-6 z-[500] bg-white dark:bg-zinc-900 border-l-4 border-l-red-500 border border-red-200 dark:border-red-900/40 rounded-2xl p-4 shadow-2xl flex items-center gap-3 w-full max-w-sm font-sans select-text"
        >
          <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5 text-red-500" />
          </div>
          <div className="flex-grow min-w-0">
            <h4 className="text-xs font-black text-text">Cảnh báo</h4>
            <p className="text-[10px] text-text-muted break-words leading-relaxed mt-0.5">{uploadError}</p>
          </div>
          <button
            onClick={() => setUploadError('')}
            className="p-1.5 rounded-full hover:bg-gray-150 dark:hover:bg-zinc-850 text-text-muted hover:text-text transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>,
        document.body
      )}



      {/* Crawl Success Toast - bottom right, non-blocking. AnimatePresence removed: incompatible with createPortal */}
      {showCrawlSuccessDialog && typeof window !== 'undefined' && createPortal(
        <motion.div
          key="success-toast"
          initial={{ opacity: 0, y: 24, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', damping: 22, stiffness: 320 }}
          className="fixed bottom-6 right-6 z-[500] bg-white dark:bg-zinc-900 border-l-4 border-l-emerald-500 border border-emerald-200 dark:border-emerald-900/40 rounded-2xl p-4 shadow-2xl flex items-center gap-3 w-full max-w-sm font-sans select-text"
        >
          <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="flex-grow min-w-0">
            <h4 className="text-xs font-black text-text">Thu thập thành công</h4>
            <p className="text-[10px] text-text-muted mt-0.5 truncate font-semibold">
              {articleContext?.title || 'Đã tải bài viết về trình soạn thảo.'}
            </p>
          </div>
          <button
            onClick={() => setShowCrawlSuccessDialog(false)}
            className="text-text-muted hover:text-text p-1 cursor-pointer hover:bg-gray-150 dark:hover:bg-zinc-800 rounded-full transition-colors flex-shrink-0"
            title="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>,
        document.body
      )}

      {/* Lightbox Modal for Full Image View */}
      {activeLightboxImage && typeof window !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[600] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setActiveLightboxImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full flex items-center justify-center">
            <button
              type="button"
              onClick={() => setActiveLightboxImage(null)}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={activeLightboxImage.startsWith('http') && !activeLightboxImage.includes('localhost') ? `/api/proxy?url=${encodeURIComponent(activeLightboxImage)}` : activeLightboxImage} 
              alt="Ảnh phóng to" 
              referrerPolicy="no-referrer"
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>,
        document.body
      )}

      {/* Modal displaying all extracted article images */}
      {showAllImagesModal && typeof window !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[600] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in font-sans select-text"
          onClick={() => setShowAllImagesModal(false)}
        >
          <div 
            className="bg-white dark:bg-zinc-900 rounded-3xl p-6 max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-gray-200 dark:border-zinc-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-zinc-800">
              <h3 className="text-base font-black text-text">Tất cả hình ảnh bài viết ({(state.crawledImageUrls || []).length + uploadedImages.length})</h3>
              <button
                type="button"
                onClick={() => setShowAllImagesModal(false)}
                className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 text-text-muted hover:text-text transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 overflow-y-auto py-4 flex-grow">
              {[
                ...(state.crawledImageUrls || []).map((url, idx) => ({ type: 'crawled' as const, url, name: `Ảnh bài báo ${idx + 1}` })),
                ...uploadedImages.map(img => ({ type: 'uploaded' as const, url: img.url, name: img.file.name }))
              ].map((item, idx) => (
                <div 
                  key={idx} 
                  onClick={() => {
                    setShowAllImagesModal(false);
                    setActiveLightboxImage(item.url);
                  }}
                  className="aspect-square rounded-2xl overflow-hidden border border-gray-200 dark:border-zinc-800 relative group cursor-pointer hover:shadow-lg transition-all bg-white dark:bg-zinc-950"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={item.type === 'crawled' ? `/api/proxy?url=${encodeURIComponent(item.url)}` : item.url} 
                    alt={item.name} 
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).onerror = null;
                      (e.currentTarget as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect width='18' height='18' x='3' y='3' rx='2' ry='2'/%3E%3Ccircle cx='9' cy='9' r='2'/%3E%3Cpath d='m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21'/%3E%3C/svg%3E";
                    }}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {item.type === 'crawled' && (
                    <div className="absolute bottom-2 left-2 bg-amber-500/90 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide shadow-sm">Crawl</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
