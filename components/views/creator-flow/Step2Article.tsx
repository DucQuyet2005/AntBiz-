'use client';

import React, { useState, useRef } from 'react';
import { 
  Loader2, Sparkles, Music, 
  FileSpreadsheet, UploadCloud, 
  Eye, Trash2, FolderOpen 
} from 'lucide-react';
import { ArticleContext } from '@/lib/services/creator/article.service';

interface Step2ArticleProps {
  sourceType: 'gocnhinmoi' | 'tuoitre' | 'dantri' | 'manual' | null;
  crawlStatus: 'idle' | 'crawling' | 'done' | 'error';
  articleContext: ArticleContext | null;
  startCrawl: (url: string, source: 'gocnhinmoi' | 'tuoitre' | 'dantri') => Promise<void>;
  submitManual: (title: string, content: string) => Promise<void>;
}

export default function Step2Article({
  articleContext,
  submitManual,
}: Step2ArticleProps) {
  
  // Drag and drop states
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Uploaded mock list states
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; size: string; type: 'audio' | 'document' }[]>([
    { name: 'phong-van-ceo-2023.mp3', size: '12.5 MB', type: 'audio' }
  ]);
  const [uploadedImages, setUploadedImages] = useState<string[]>([
    'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=500&auto=format&fit=crop&q=60',
    'https://images.unsplash.com/photo-1497366216548-37526070297c?w=500&auto=format&fit=crop&q=60'
  ]);

  // Handle file drop/select simulation
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
    // Simulate upload delay of 1s
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsUploading(false);

    const fileType = file.type;
    const fileName = file.name.toLowerCase();
    
    let detectedType: 'audio' | 'document' | 'image' = 'audio';
    if (fileType.startsWith('audio/') || fileName.endsWith('.mp3') || fileName.endsWith('.wav')) {
      detectedType = 'audio';
    } else if (fileType.startsWith('image/') || fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.png') || fileName.endsWith('.webp')) {
      detectedType = 'image';
    } else {
      detectedType = 'document';
    }

    let extractedText = '';
    if (detectedType === 'audio') {
      extractedText = `Chào mừng các bạn đến với buổi phỏng vấn ngày hôm nay. Chúng ta sẽ thảo luận về chiến lược phát triển bền vững trong năm 2024. Mục tiêu chính của chúng ta là giảm thiểu lượng khí thải carbon xuống 20% và tăng cường sử dụng năng lượng tái tạo.`;
      setUploadedFiles(prev => [...prev, { name: file.name, size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`, type: 'audio' }]);
    } else if (detectedType === 'document') {
      extractedText = `Báo cáo thường niên 2024 về kế hoạch phát triển bền vững và chuyển đổi số trong vận hành doanh nghiệp. Mục tiêu giảm thiểu lượng khí thải carbon xuống 20% và tăng cường sử dụng năng lượng tái tạo.`;
      setUploadedFiles(prev => [...prev, { name: file.name, size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`, type: 'document' }]);
    } else if (detectedType === 'image') {
      extractedText = `Trích xuất văn bản từ hình ảnh: Hướng dẫn sử dụng hệ thống content AI Creator. Kế hoạch chiến dịch marketing sản phẩm mới quý 3 năm 2026.`;
      setUploadedImages(prev => [...prev, 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=500&auto=format&fit=crop&q=60']);
    }

    await submitManual(file.name, extractedText);
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  // Preview content rendering values
  const previewTitle = articleContext?.title || "Báo cáo phát triển bền vững 2024";
  const previewContent = articleContext?.content || "";

  return (
    <div className="w-full max-w-7xl mx-auto flex-grow pt-4 pb-20 px-4 md:px-6 select-none">
      <div className="flex flex-col lg:flex-row gap-8 items-stretch">
        
        {/* Left Section: Source Selection & Main Input */}
        <div className="flex-1 flex flex-col">
          <div className="mb-6 text-center md:text-left">
            <h1 className="text-2xl md:text-3xl font-black text-text tracking-tight">Cung cấp nguồn nội dung</h1>
            <p className="text-text-muted text-sm mt-1">Tải lên tệp hoặc nhập trực tiếp nội dung để AI trích xuất và xử lý.</p>
          </div>

          {/* Main Input Area Container */}
          <div className="bg-white/75 dark:bg-zinc-900/75 backdrop-blur-md rounded-2xl p-6 border border-gray-200/80 dark:border-zinc-800/80 shadow-md flex-grow flex flex-col">
            <h2 className="text-base font-bold text-text mb-5">Vùng xem trước &amp; Nhập liệu</h2>
            
            {/* Drop Zone Area */}
            <div className="flex-grow flex flex-col justify-between">
              
              {/* Drag zone box */}
              <div 
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex-grow border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-8 transition-colors cursor-pointer min-h-[260px] ${
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
                  accept="audio/*,image/*,.pdf,.docx,.doc"
                />
                {isUploading ? (
                  <div className="flex flex-col items-center">
                    <Loader2 className="w-10 h-10 animate-spin text-[#a04100] mb-3" />
                    <h3 className="text-sm font-bold text-text mb-1">Đang tải tệp lên...</h3>
                    <p className="text-xs text-text-muted">AI đang tiến hành phân tích &amp; trích xuất nội dung</p>
                  </div>
                ) : (
                  <>
                    <UploadCloud className="w-10 h-10 text-purple-600 dark:text-purple-400 mb-3" />
                    <h3 className="text-sm font-bold text-text mb-1">Kéo thả tệp vào đây</h3>
                    <p className="text-xs text-text-muted mb-4 text-center">
                      Hoặc chọn tệp từ máy tính của bạn.<br />
                      Hỗ trợ MP3, WAV, PDF, DOCX, JPG, PNG, WEBP (Tối đa 50MB).
                    </p>
                    <button 
                      type="button"
                      className="bg-[#a04100] hover:brightness-110 text-white font-bold text-xs px-5 py-2.5 rounded-full shadow-md flex items-center gap-1.5 transition-all"
                    >
                      <FolderOpen className="w-4 h-4" />
                      <span>Duyệt tìm tệp</span>
                    </button>
                  </>
                )}
              </div>

              {/* Uploaded Image grid list */}
              {uploadedImages.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-xs font-bold text-text-muted mb-3 uppercase tracking-wider">Hình ảnh đã tải lên</h4>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
                    {uploadedImages.map((img, idx) => (
                      <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden border border-gray-200 dark:border-zinc-800 shadow-sm bg-zinc-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img} alt="Preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button 
                            onClick={(e) => { e.stopPropagation(); removeImage(idx); }}
                            className="bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-full hover:scale-110 transition-all shadow-md"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Uploaded File list */}
              {uploadedFiles.length > 0 && (
                <div className="mt-6 space-y-2">
                  <h4 className="text-xs font-bold text-text-muted mb-2 uppercase tracking-wider">Tệp đã tải lên</h4>
                  {uploadedFiles.map((file, idx) => (
                    <div key={idx} className="bg-gray-55 dark:bg-zinc-950/40 rounded-xl p-3.5 border border-gray-200 dark:border-zinc-850 flex items-center justify-between shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-zinc-850 text-purple-600 dark:text-purple-400 flex items-center justify-center flex-shrink-0">
                          {file.type === 'audio' ? <Music className="w-5 h-5" /> : <FileSpreadsheet className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-text">{file.name}</p>
                          <p className="text-[10px] text-text-muted mt-0.5">{file.size} • Tải lên hoàn tất</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button 
                          className="text-[#a04100] hover:bg-[#a04100]/5 p-2 rounded-full transition-colors" 
                          title="Xem nội dung"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                          className="text-red-500 hover:bg-red-500/5 p-2 rounded-full transition-colors" 
                          title="Xóa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Section: Preview Interface Panel */}
        <div className="w-full lg:w-[360px] xl:w-[420px] flex-shrink-0 flex flex-col bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md rounded-2xl overflow-hidden shadow-lg border border-gray-200/80 dark:border-zinc-800/80">
          <div className="bg-gray-55 dark:bg-zinc-900 p-4 border-b border-gray-200 dark:border-zinc-800 flex items-center justify-between">
            <h2 className="text-sm font-bold text-text flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span>Xem trước nội dung trích xuất</span>
            </h2>
          </div>
          
          <div className="p-5 overflow-y-auto flex-1 bg-white/30 min-h-[300px] lg:min-h-[480px]">
            <div className="space-y-4 text-xs leading-relaxed text-text">
              {previewContent ? (
                <>
                  <h3 className="text-sm font-black text-text mb-3 leading-snug">{previewTitle}</h3>
                  <div className="whitespace-pre-line text-text-muted">{previewContent}</div>
                </>
              ) : (
                /* Mock Placeholder Preview Panel match picture */
                <>
                  <p>
                    Chào mừng các bạn đến với buổi phỏng vấn ngày hôm nay. Chúng ta sẽ thảo luận về chiến lược{' '}
                    <span className="bg-[#ff6b00]/20 text-[#a04100] px-1 rounded font-bold border-b border-[#a04100]">
                      phát triển bền vững
                    </span>{' '}
                    trong năm 2024.
                  </p>
                  <p>
                    Mục tiêu chính của chúng ta là giảm thiểu{' '}
                    <span className="bg-purple-100 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 px-1 rounded font-bold border-b border-purple-700">
                      lượng khí thải carbon
                    </span>{' '}
                    xuống 20% và tăng cường sử dụng{' '}
                    <span className="bg-pink-100 dark:bg-pink-950/30 text-pink-700 dark:text-pink-400 px-1 rounded font-bold border-b border-pink-700">
                      năng lượng tái tạo
                    </span>.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
