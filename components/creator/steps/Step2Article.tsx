"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCreatorFlow } from '@/contexts/CreatorFlowContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { StepFooter } from '../StepFooter';
import { SourceType } from '@/types/creator';
import { Globe, Type, CheckCircle2, Link2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { articleService } from '@/lib/services/creator/article.service';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const SOURCES = [
  { id: 'gocnhinmoi', name: 'Góc Nhìn Mới', url: 'Gocnhinmoi.com.vn', logo: 'GNM', color: 'bg-green-50 text-green-600' },
  { id: 'tuoitre', name: 'Tuổi Trẻ', url: 'tuoitre.vn', logo: 'TT', color: 'bg-red-50 text-red-600' },
  { id: 'dantri', name: 'Dân Trí', url: 'dantri.com.vn', logo: 'DT', color: 'bg-blue-50 text-blue-600' },
];

export const Step2Article = () => {
  const { setArticleContext, articleContext } = useCreatorFlow();
  const { language } = useLanguage();
  const [selectedSource, setSelectedSource] = useState<SourceType>(null);
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [isBrowserOpen, setIsBrowserOpen] = useState(false);
  const [browserUrl, setBrowserUrl] = useState('');
  
  const [isCrawling, setIsCrawling] = useState(false);

  // Auto next step if context is present initially? No, let user click next.
  
  const handleSelectSource = (id: SourceType) => {
    setSelectedSource(id);
    if (id !== 'manual') {
      const source = SOURCES.find(s => s.id === id);
      if (source) {
        setBrowserUrl(`https://${source.url}`);
        setIsBrowserOpen(true);
      }
    } else {
      setIsManualOpen(true);
    }
  };

  const handleConfirmUrl = async () => {
    setIsBrowserOpen(false);
    setIsCrawling(true);
    
    // Simulate crawling job
    try {
      const { jobId } = await articleService.crawlArticle(browserUrl, selectedSource);
      
      // We would poll here. For mock, just wait and get status
      const res = await articleService.getCrawlStatus(jobId);
      if (res.status === 'done' && res.context) {
        setArticleContext({ ...res.context, url: browserUrl });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsCrawling(false);
    }
  };

  const handleManualSubmit = async () => {
    if (!manualInput.trim()) return;
    setIsCrawling(true);
    try {
      const context = await articleService.submitManualContent(manualInput);
      setArticleContext(context);
      setIsManualOpen(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsCrawling(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="max-w-4xl mx-auto px-4 pb-24"
    >
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold mb-3 text-slate-900 dark:text-white">
          {language === 'vi' ? 'Lựa chọn nguồn bài viết' : 'Select Article Source'}
        </h2>
        <p className="text-slate-500 dark:text-zinc-400">
          {language === 'vi' ? 'Chọn trang báo hoặc tự nhập nội dung để AI phân tích.' : 'Choose a news site or enter content manually for AI to analyze.'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {SOURCES.map(source => (
          <button
            key={source.id}
            onClick={() => handleSelectSource(source.id as SourceType)}
            className={`
              relative flex items-center p-6 rounded-3xl transition-all duration-300 border text-left
              ${selectedSource === source.id && isCrawling 
                ? 'border-primary ring-2 ring-primary/20 bg-primary/5 shadow-lg' 
                : 'border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:shadow-xl hover:-translate-y-1'
              }
            `}
          >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-xl mr-5 shrink-0 ${source.color}`}>
              {source.logo}
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg text-slate-800 dark:text-white">{source.name}</h3>
              <p className="text-sm text-slate-500 dark:text-zinc-400 flex items-center gap-1 mt-1">
                <Globe size={14} /> {source.url}
              </p>
            </div>
            
            {selectedSource === source.id && isCrawling && (
              <div className="absolute inset-0 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm rounded-3xl flex flex-col items-center justify-center">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2" />
                <span className="text-sm font-semibold text-primary">Đang lấy dữ liệu...</span>
              </div>
            )}
          </button>
        ))}

        {/* Manual Input Card */}
        <button
          onClick={() => handleSelectSource('manual')}
          className={`
            relative flex items-center p-6 rounded-3xl transition-all duration-300 border border-dashed text-left
            ${selectedSource === 'manual' 
              ? 'border-primary bg-primary/5' 
              : 'border-slate-300 dark:border-zinc-700 hover:border-primary hover:bg-primary/5 hover:-translate-y-1'
            }
          `}
        >
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-slate-100 dark:bg-zinc-800 text-slate-500 mr-5 shrink-0">
            <Type size={24} />
          </div>
          <div>
            <h3 className="font-bold text-lg text-slate-800 dark:text-white">
              {language === 'vi' ? 'Hoặc tự nhập tay' : 'Or enter manually'}
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              {language === 'vi' ? 'Paste nội dung trực tiếp' : 'Paste content directly'}
            </p>
          </div>
        </button>
      </div>

      <AnimatePresence>
        {articleContext && !isCrawling && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 p-4 rounded-2xl flex items-start gap-3 mb-6"
          >
            <CheckCircle2 className="text-green-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-green-800 dark:text-green-400 font-semibold text-sm">
                Đã phân tích xong dữ liệu: {articleContext.title}
              </p>
              {articleContext.url && (
                <a href={articleContext.url} target="_blank" rel="noreferrer" className="text-xs text-green-600 dark:text-green-500 flex items-center gap-1 mt-1 hover:underline">
                  <Link2 size={12} /> {articleContext.url}
                </a>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Manual Input Drawer / Modal */}
      <AnimatePresence>
        {isManualOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-zinc-900 rounded-3xl p-6 w-full max-w-2xl shadow-2xl"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-xl">Nhập nội dung bài viết</h3>
                <button onClick={() => setIsManualOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
              </div>
              <textarea
                value={manualInput}
                onChange={e => setManualInput(e.target.value)}
                placeholder="Dán nội dung bài viết hoặc nhập URL vào đây..."
                className="w-full h-64 p-4 border border-slate-200 dark:border-zinc-800 rounded-2xl bg-slate-50 dark:bg-zinc-950 focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none mb-4"
              />
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIsManualOpen(false)} className="rounded-xl">Hủy</Button>
                <Button onClick={handleManualSubmit} disabled={isCrawling || !manualInput.trim()} className="rounded-xl bg-primary hover:bg-primary/90 text-white">
                  {isCrawling ? 'Đang xử lý...' : 'Xác nhận'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Embedded Browser Modal */}
      <AnimatePresence>
        {isBrowserOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-10 bg-slate-900/80 backdrop-blur-sm">
            <motion.div 
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="bg-white dark:bg-zinc-900 rounded-[2rem] w-full h-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 dark:border-zinc-800"
            >
              {/* Fake Browser Header */}
              <div className="h-14 bg-slate-100 dark:bg-zinc-950 border-b border-slate-200 dark:border-zinc-800 flex items-center px-4 gap-4">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="flex-1 max-w-xl mx-auto flex items-center bg-white dark:bg-zinc-900 rounded-xl px-3 py-1.5 text-sm text-slate-500 border border-slate-200 dark:border-zinc-800 shadow-sm">
                  <Globe size={14} className="mr-2" />
                  <input 
                    type="text" 
                    value={browserUrl} 
                    onChange={e => setBrowserUrl(e.target.value)}
                    className="bg-transparent border-none outline-none w-full text-slate-800 dark:text-zinc-200"
                  />
                </div>
                <button onClick={() => setIsBrowserOpen(false)} className="text-slate-500 hover:bg-slate-200 dark:hover:bg-zinc-800 p-2 rounded-full">
                  <X size={20} />
                </button>
              </div>
              
              {/* Fake Browser Content - Iframe would go here. We mock it with an empty state or iframe if allowed */}
              <div className="flex-1 bg-slate-50 dark:bg-zinc-950 relative overflow-hidden flex flex-col items-center justify-center">
                 <div className="text-center opacity-50">
                    <Globe size={48} className="mx-auto mb-4" />
                    <p>Mô phỏng trình duyệt web đang tải <b>{browserUrl}</b></p>
                    <p className="text-sm mt-2">Người dùng sẽ thao tác chọn bài ở đây</p>
                 </div>

                 <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
                    <Button onClick={handleConfirmUrl} className="rounded-full shadow-2xl shadow-primary/30 px-8 py-6 text-lg bg-primary hover:bg-primary/90 text-white font-bold">
                      <Link2 className="mr-2" /> Lấy link bài viết này
                    </Button>
                 </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <StepFooter 
        isNextDisabled={!articleContext && !isCrawling} 
        nextTooltip={language === 'vi' ? 'Vui lòng chọn bài viết' : 'Please select an article'} 
      />
    </motion.div>
  );
};
