'use client';

import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Loader2, Music, FileSpreadsheet, 
  UploadCloud, Trash2, X,
  Search, Check, Bookmark, Facebook, Instagram,
  ChevronLeft, Plus, Image as ImageIcon, Mic
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  getCreatorSourceBaseUrl,
  normalizeCreatorSourceUrl,
  useCreatorFlow,
  validateCreatorArticleUrl,
  type CreatorNewsSource,
  type CreatorUploadedSource,
} from '@/frontend/modules/creator-flow';
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
  uploadSource: (file: File) => Promise<CreatorUploadedSource>;
}

export default function Step2Article({
  sourceType,
  crawlStatus,
  startCrawl,
  submitManual,
  uploadSource,
}: Step2ArticleProps) {
  const { t } = useLanguage();
  const { state, dispatch } = useCreatorFlow();

  // Active source browser modal
  const [activeBrowserSite, setActiveBrowserSite] = useState<CreatorNewsSource | null>(null);
  const [currentBrowserUrl, setCurrentBrowserUrl] = useState<string>('');
  const [crawlError, setCrawlError] = useState('');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleGoBack = () => {
    if (iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.history.back();
      } catch (err) {
        console.error('Failed to navigate back:', err);
      }
    }
  };

  const openSourceBrowser = (source: CreatorNewsSource) => {
    setActiveBrowserSite(source);
    setCurrentBrowserUrl(getCreatorSourceBaseUrl(source));
    setCrawlError('');
  };

  React.useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (
        event.source !== iframeRef.current?.contentWindow
        || event.data?.type !== 'URL_CHANGE'
        || typeof event.data?.url !== 'string'
        || !activeBrowserSite
      ) return;
      const normalized = normalizeCreatorSourceUrl(activeBrowserSite, event.data.url);
      if (normalized) {
        setCurrentBrowserUrl(normalized);
        setCrawlError('');
      }
    };
    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [activeBrowserSite]);


  // Audio & Document drag & drop upload states
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadSectionRef = useRef<HTMLDivElement>(null);

  // Floating presets drawer states
  const [isPresetsOpen, setIsPresetsOpen] = useState(false);
  const [presetSearch, setPresetSearch] = useState('');
  const [presetTab, setPresetTab] = useState<'system' | 'personal'>('personal');

  // Active tab for uploaded files status
  const [activeFileTab, setActiveFileTab] = useState<'audio' | 'document'>('audio');

  // Preview document state modal
  const [previewDoc, setPreviewDoc] = useState<{ name: string; content: string } | null>(null);

  // Extracted images states
  const [extractedImages, setExtractedImages] = useState<{ src: string; name: string }[]>([]);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);

  const removeExtractedImage = (indexToRemove: number) => {
    setExtractedImages(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Audio Recording States
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Tries up to 4 getUserMedia constraint variants, waiting 400 ms between
  // each attempt so Windows can fully release the audio session after a
  // previous failed call (the most common cause of NotReadableError when no
  // other app is running).
  const tryGetAudioStream = async (): Promise<MediaStream> => {
    const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

    // Build the constraint list, optionally appending a device-specific variant
    const constraintsList: MediaStreamConstraints[] = [
      { audio: true },
      { audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } },
      { audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, sampleRate: 16000 } },
    ];

    // Try to enumerate and add a constraint targeting the first real input device
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const firstMic = devices.find((d) => d.kind === 'audioinput' && d.deviceId && d.deviceId !== 'default');
      if (firstMic) {
        constraintsList.push({
          audio: {
            deviceId: { exact: firstMic.deviceId },
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
        });
      }
    } catch {
      // enumerateDevices is best-effort — ignore errors
    }

    let lastErr: unknown = null;
    for (let i = 0; i < constraintsList.length; i++) {
      if (i > 0) {
        // Give the OS 400 ms to release the audio device between attempts
        await sleep(400);
      }
      try {
        return await navigator.mediaDevices.getUserMedia(constraintsList[i]);
      } catch (err) {
        lastErr = err;
        const isHardwareError =
          err instanceof DOMException &&
          (err.name === 'NotReadableError' || err.name === 'TrackStartError' || err.name === 'AbortError');
        if (!isHardwareError) throw err; // permission / device-not-found — no point retrying
      }
    }
    throw lastErr;
  };

  const startRecording = async () => {
    setUploadError('');
    audioChunksRef.current = [];
    setRecordingDuration(0);

    let stream: MediaStream;
    try {
      stream = await tryGetAudioStream();
    } catch (err) {
      console.error('Microphone access error:', err);
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setUploadError(
            'Bạn đã từ chối quyền truy cập Microphone. Vui lòng click vào biểu tượng 🔒 hoặc 🎙 trên thanh địa chỉ trình duyệt, chọn "Cho phép" và thử lại.'
          );
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setUploadError('Không tìm thấy thiết bị Microphone. Vui lòng cắm micro và thử lại.');
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError' || err.name === 'AbortError') {
          setUploadError(
            'Microphone không phản hồi sau nhiều lần thử. Hãy thử: (1) Tải lại trang, (2) Mở lại tab này, hoặc (3) Vào Cài đặt âm thanh Windows → chọn micro → tắt "Exclusive Mode".'
          );
        } else {
          setUploadError(`Lỗi Microphone: ${err.message}`);
        }
      } else {
        setUploadError('Không thể truy cập Microphone. Vui lòng kiểm tra lại thiết bị.');
      }
      return;
    }

    streamRef.current = stream;

    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const audioFile = new File([audioBlob], 'ghi_am_truc_tiep.webm', { type: 'audio/webm' });
      await handleFiles([audioFile]);
    };

    mediaRecorder.start(1000);
    setIsRecording(true);

    timerRef.current = setInterval(() => {
      setRecordingDuration((prev) => prev + 1);
    }, 1000);
  };

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setIsRecording(false);
  };

  React.useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

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

  // Files that completed processing and Article persistence.
  const [uploadedFiles, setUploadedFiles] = useState<CreatorUploadedSource[]>([]);

  const handleFileDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (isUploading) return;
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await handleFiles(Array.from(files));
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await handleFiles(Array.from(files));
    }
    e.target.value = '';
  };

  const handleFiles = async (files: File[]) => {
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    const sourceFiles = files.filter(f => !f.type.startsWith('image/'));

    if (imageFiles.length > 0) {
      const newImages: { src: string; name: string }[] = [];
      for (const file of imageFiles) {
        const src = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        newImages.push({ src, name: file.name });
      }
      setExtractedImages(prev => [...prev, ...newImages]);
    }

    if (sourceFiles.length > 0) {
      await processUploadedFile(sourceFiles[0]);
    }
  };

  const processUploadedFile = async (file: File) => {
    setUploadError('');
    setIsUploading(true);
    try {
      const uploaded = await uploadSource(file);
      setUploadedFiles((previous) => [
        ...previous.filter((item) => item.name !== uploaded.name),
        uploaded,
      ]);
      setActiveFileTab(uploaded.type);
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

  const handleSelectArticle = async (url: string) => {
    if (!activeBrowserSite) return;
    const validation = validateCreatorArticleUrl(activeBrowserSite, url);
    if (!validation.valid) {
      setCrawlError(validation.message);
      return;
    }
    setCrawlError('');
    try {
      await startCrawl(validation.url, activeBrowserSite);
      setActiveBrowserSite(null);
      setCurrentBrowserUrl('');
    } catch (error) {
      setCrawlError(error instanceof Error ? error.message : 'Không thể cào dữ liệu bài viết');
    }
  };

  const selectedUrlValidation = activeBrowserSite
    ? validateCreatorArticleUrl(activeBrowserSite, currentBrowserUrl)
    : { valid: false as const, message: 'Chưa chọn nguồn bài viết.' };

  // Extract selected site articles data

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
                    const isSystem = Boolean(preset.isSystem);
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
          onClick={() => openSourceBrowser('gocnhinmoi')}
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
          onClick={() => openSourceBrowser('tuoitre')}
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
          onClick={() => openSourceBrowser('dantri')}
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
        <h2 className="text-sm font-bold text-text mb-4">Hoặc tải lên tệp tin của bạn</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch min-h-[380px]">
          {/* Left Column: Dropzone & Image List */}
          <div className="flex flex-col justify-between h-full min-h-[350px] gap-6">
            <div 
              onDragOver={(e) => { e.preventDefault(); if (!isUploading) setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleFileDrop}
              onClick={() => { if (!isUploading) fileInputRef.current?.click(); }}
              className={`border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-6 transition-all min-h-[220px] flex-grow ${
                isUploading ? 'cursor-wait opacity-80' : 'cursor-pointer'
              } ${
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
                accept="audio/mpeg,audio/mp4,audio/wav,audio/webm,audio/ogg,.mp3,.m4a,.pdf,.docx,.txt,image/*"
                disabled={isUploading}
              />
              {isUploading ? (
                <div className="flex flex-col items-center">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
                  <span className="text-xs font-bold text-text">Đang xử lý và lưu nguồn...</span>
                </div>
              ) : (
                <>
                  <UploadCloud className="w-8 h-8 text-primary mb-2" />
                  <h4 className="text-xs font-bold text-text mb-1">Kéo thả tệp vào đây hoặc Duyệt tìm</h4>
                  <p className="text-[10px] text-text-muted text-center leading-relaxed">
                    Hỗ trợ Hình ảnh (PNG, JPG, JPEG), Audio (MP3, M4A, WAV, OGG, WebM) hoặc Tài liệu (PDF, DOCX, TXT)
                  </p>
                </>
              )}
            </div>
            {uploadError && (
              <p role="alert" className="text-[11px] font-semibold text-red-600 dark:text-red-400">
                {uploadError}
              </p>
            )}

            {/* Audio Recording Controller */}
            <div className="border border-gray-250 dark:border-zinc-800 rounded-2xl p-4 bg-gray-55/30 dark:bg-zinc-950/10 flex items-center justify-between gap-4 font-sans">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  isRecording 
                    ? 'bg-red-500/10 text-red-500 animate-pulse' 
                    : 'bg-primary/10 text-primary'
                }`}>
                  <Mic className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-text">Ghi âm trực tiếp</h4>
                  <p className="text-[10px] text-text-muted">
                    {isRecording 
                      ? 'Đang ghi âm...' 
                      : 'Bấm nút để nói và chuyển thành bài viết'}
                  </p>
                </div>
              </div>

              {isRecording ? (
                <div className="flex items-center gap-4">
                  {/* Pulsing indicator & timer */}
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                    <span className="text-xs font-mono font-bold text-text">
                      {formatDuration(recordingDuration)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="px-4 py-2 bg-red-650 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all active:scale-95 shadow-md shadow-red-500/10"
                  >
                    Dừng
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={startRecording}
                  className="px-4 py-2 bg-primary hover:bg-primary/95 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-all active:scale-95 shadow-md shadow-primary/10 flex items-center gap-1.5"
                >
                  <Mic className="w-3.5 h-3.5" />
                  Bắt đầu
                </button>
              )}
            </div>

            {/* Extracted Images Gallery */}
            {extractedImages.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider text-left">Hình ảnh trích xuất ({extractedImages.length})</span>
                <div className="grid grid-cols-5 gap-3">
                  {extractedImages.slice(0, 5).map((img, slotIdx) => {
                    const isLastSlot = slotIdx === 4;
                    const hasOverlay = isLastSlot && extractedImages.length > 5;
                    const overlayCount = extractedImages.length - 4;

                    return (
                      <div 
                        key={slotIdx} 
                        onClick={() => {
                          if (hasOverlay) {
                            setIsGalleryOpen(true);
                          }
                        }}
                        className={`flex flex-col gap-1 items-center min-w-0 ${hasOverlay ? 'cursor-pointer' : ''}`}
                      >
                        <div className="relative w-full aspect-square rounded-xl overflow-hidden border border-gray-250 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 flex-shrink-0 group">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={img.src} alt={img.name} className="w-full h-full object-cover" />
                          {hasOverlay && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center transition-opacity group-hover:bg-black/50">
                              <span className="text-white font-bold text-sm">+{overlayCount}</span>
                            </div>
                          )}
                          {!hasOverlay && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeExtractedImage(slotIdx);
                              }}
                              className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Xóa ảnh"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>
                        <span className="text-[9px] text-text-muted truncate w-full text-center">{img.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Uploaded Files Status & Manual Input */}
          <div className="flex flex-col h-full min-h-[350px] border-t md:border-t-0 md:border-l border-gray-150 dark:border-zinc-850 pt-6 md:pt-0 md:pl-6 justify-between gap-6">
            <div className="flex-grow flex flex-col min-h-0">
              <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">Trạng thái tệp tải lên</h4>
              
              <div className="flex border-b border-gray-150 dark:border-zinc-800 mb-4 flex-shrink-0">
                {(['audio', 'document'] as const).map((tab) => (
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
                    {tab === 'audio' ? 'Audio' : 'Tài liệu'}
                  </button>
                ))}
              </div>

              <div className="flex-grow overflow-y-auto pr-1 no-scrollbar max-h-[140px] mb-4">
                {uploadedFiles.filter(f => f.type === activeFileTab).length === 0 ? (
                  <div className="text-[11px] text-text-muted py-4 text-center border border-dashed border-gray-200 dark:border-zinc-800 rounded-xl flex items-center justify-center min-h-[80px]">
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
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>

            {/* Permanent Manual Ingestion Fields */}
            <div className="space-y-4 border-t border-gray-150 dark:border-zinc-850 pt-4">
              <div>
                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Tiêu đề bài viết gốc</label>
                <input
                  type="text"
                  placeholder="Nhập tiêu đề bài viết gốc..."
                  value={state.manualTitle}
                  disabled={isUploading}
                  onChange={(e) => dispatch({ type: 'SET_MANUAL_CONTENT', payload: { title: e.target.value, content: state.manualContent } })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-250 dark:border-zinc-800 focus:ring-1 focus:ring-primary outline-none bg-white dark:bg-zinc-900 text-xs font-semibold text-text"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Nội dung bài viết gốc</label>
                <textarea
                  placeholder="Nhập hoặc dán nội dung bài viết gốc của bạn vào đây..."
                  value={state.manualContent}
                  rows={12}
                  disabled={isUploading}
                  onChange={(e) => dispatch({ type: 'SET_MANUAL_CONTENT', payload: { title: state.manualTitle, content: e.target.value } })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-250 dark:border-zinc-800 focus:ring-1 focus:ring-primary outline-none bg-white dark:bg-zinc-900 text-xs font-semibold text-text resize-none"
                />
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
              
              <div className="flex-grow bg-white dark:bg-zinc-900 rounded-lg px-4 py-1.5 text-xs text-text-muted border border-gray-200 dark:border-zinc-800 select-all truncate font-semibold">
                {currentBrowserUrl}
              </div>
              
              <button
                type="button"
                onClick={() => handleSelectArticle(currentBrowserUrl)}
                disabled={!selectedUrlValidation.valid || crawlStatus === 'crawling'}
                title={selectedUrlValidation.valid ? 'Cào và sử dụng bài viết này' : selectedUrlValidation.message}
                className="px-4 py-1.5 bg-primary hover:bg-primary/95 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-xs font-black transition-all active:scale-95 flex items-center gap-1.5 shrink-0 shadow-md shadow-primary/10 cursor-pointer"
              >
                {crawlStatus === 'crawling' && sourceType === activeBrowserSite
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Check className="w-3.5 h-3.5" />}
                <span>{crawlStatus === 'crawling' && sourceType === activeBrowserSite ? 'Đang cào...' : 'Chọn bài viết này'}</span>
              </button>

              <button 
                onClick={() => {
                  setActiveBrowserSite(null);
                  setCurrentBrowserUrl('');
                  setCrawlError('');
                }}
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
                  src={`/api/proxy?url=${encodeURIComponent(getCreatorSourceBaseUrl(activeBrowserSite))}`}
                  className="w-full h-full border-none"
                  sandbox="allow-scripts allow-forms allow-popups"
                />
              </div>
              {crawlError && (
                <p role="alert" className="mt-3 text-xs font-semibold text-red-600 dark:text-red-400">
                  {crawlError}
                </p>
              )}
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

      {/* Extracted Images Gallery Modal */}
      {isGalleryOpen && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 sm:p-6 animate-fade-in font-sans">
          <div className="bg-white dark:bg-zinc-900 border border-gray-250 dark:border-zinc-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-scale-up">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-150 dark:border-zinc-850 flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-text truncate">Hình ảnh trích xuất ({extractedImages.length})</h3>
                  <p className="text-[10px] text-text-muted">Danh sách toàn bộ hình ảnh được trích xuất hoặc tải lên</p>
                </div>
              </div>
              <button 
                onClick={() => setIsGalleryOpen(false)}
                className="text-text-muted hover:text-text p-1.5 rounded-full hover:bg-gray-250 dark:hover:bg-zinc-850 transition-all active:scale-95"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto flex-grow bg-gray-55/30 dark:bg-zinc-950/10">
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
                {extractedImages.map((img, idx) => (
                  <div key={idx} className="flex flex-col gap-2 p-2 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 relative group shadow-sm">
                    <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-gray-55 dark:bg-zinc-950 flex-shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.src} alt={img.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex items-center justify-between gap-2 min-w-0">
                      <span className="text-[10px] text-text font-semibold truncate flex-grow">{img.name}</span>
                      <button
                        type="button"
                        onClick={() => {
                          removeExtractedImage(idx);
                        }}
                        className="text-red-500 hover:text-red-650 hover:bg-red-500/10 p-1 rounded-lg transition-colors flex-shrink-0"
                        title="Xóa ảnh"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer actions */}
            <div className="px-6 py-4 border-t border-gray-150 dark:border-zinc-850 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsGalleryOpen(false)}
                className="px-5 py-2.5 bg-primary hover:bg-primary/95 text-white rounded-xl text-xs font-bold transition-all active:scale-95 shadow-md shadow-primary/10"
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
