"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCreatorFlow } from '@/contexts/CreatorFlowContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { StepFooter } from '../StepFooter';
import { ChatMessage, PostContent } from '@/types/creator';
import { postService } from '@/lib/services/creator/post.service';
import { ChatBubble } from '../shared/ChatBubble';
import { PlatformIcon } from '../shared/PlatformIcon';
import { 
  Send, RefreshCw, Sparkles, ChevronRight, LayoutTemplate, MessageSquare, BookOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export const Step4Post = () => {
  const { 
    articleContext, selectedPresetId, selectedPlatform, 
    postContent, setPostContent, nextStep 
  } = useCreatorFlow();
  const { language } = useLanguage();
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showContextPanel, setShowContextPanel] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Highlight-to-edit state
  const [highlightCoords, setHighlightCoords] = useState<{ top: number, left: number } | null>(null);
  const [selectedText, setSelectedText] = useState('');
  const contentRef = useRef<HTMLDivElement>(null);

  const hasInitialized = useRef(false);

  // Initialize chat and auto-generate post
  useEffect(() => {
    if (hasInitialized.current) return;
    if (!postContent && !isGenerating && selectedPlatform && articleContext) {
      hasInitialized.current = true;
      const initFlow = async () => {
        setIsGenerating(true);
        // Add initial bot message
        setMessages([
          { id: `init-1-${Date.now()}`, role: 'assistant', content: 'Đang phân tích dữ liệu và preset để tạo bài viết...', timestamp: new Date().toISOString() }
        ]);

        try {
          const post = await postService.generatePost({
            platform: selectedPlatform,
            context: articleContext,
            presetId: selectedPresetId
          });
          setPostContent(post);
          
          setMessages(prev => [...prev, {
            id: `init-2-${Date.now()}`, role: 'assistant', content: 'Mình đã tạo xong nội dung! Bạn có thể xem bên trái. \n\n💡 Mẹo: Hãy bôi đen bất kỳ đoạn văn bản nào bạn muốn mình sửa lại nhé!', timestamp: new Date().toISOString()
          }]);
        } catch (e) {
          console.error(e);
          hasInitialized.current = false;
        } finally {
          setIsGenerating(false);
        }
      };
      initFlow();
    }
  }, [postContent, selectedPlatform, articleContext, selectedPresetId, setPostContent, isGenerating]);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle Highlight selection
  const handleMouseUp = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const containerRect = contentRef.current?.getBoundingClientRect();
      
      if (containerRect) {
        setHighlightCoords({
          top: rect.top - containerRect.top - 40, // 40px above
          left: rect.left - containerRect.left + (rect.width / 2)
        });
        setSelectedText(selection.toString().trim());
      }
    } else {
      setHighlightCoords(null);
      setSelectedText('');
    }
  };

  const handleHighlightEdit = (instruction: string) => {
    if (!postContent) return;
    setHighlightCoords(null); // Hide popover
    setIsGenerating(true);
    
    // Optimistic Update (simple string replace for demo)
    const oldContent = postContent.content;
    const optimisticContent = oldContent.replace(selectedText, `<span class="bg-yellow-200 animate-pulse">${selectedText}</span>`);
    setPostContent({ ...postContent, content: optimisticContent });

    setMessages(prev => [...prev, 
      { id: Date.now().toString(), role: 'user', content: instruction, summaryLabel: `Sửa: "${selectedText.substring(0, 20)}..."`, timestamp: new Date().toISOString() }
    ]);

    setTimeout(async () => {
      try {
        const newContent = await postService.editSection(postContent.id, selectedText, instruction);
        setPostContent({ ...postContent, content: oldContent.replace(selectedText, newContent) });
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: 'Mình đã sửa xong đoạn đó rồi nhé!', timestamp: new Date().toISOString() }]);
      } catch(e) {
        setPostContent({ ...postContent, content: oldContent }); // rollback
      } finally {
        setIsGenerating(false);
      }
    }, 500);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isGenerating) return;
    
    const msg = inputMessage;
    setInputMessage('');
    setIsGenerating(true);
    
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: msg, timestamp: new Date().toISOString() }]);
    
    try {
      const response = await postService.chat(postContent?.id || null, msg, messages);
      setMessages(prev => [...prev, response]);
    } catch(e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerate = async () => {
    if (!postContent) return;
    setIsGenerating(true);
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: 'Tạo lại toàn bộ nội dung khác', timestamp: new Date().toISOString() }]);
    try {
      const newPost = await postService.regenerateAll(postContent.id);
      setPostContent(newPost);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: 'Đây là phiên bản mới hoàn toàn!', timestamp: new Date().toISOString() }]);
    } catch(e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col md:flex-row gap-4 max-w-[1400px] mx-auto px-4 pb-20 mt-4">
      
      {/* CANVAS (Left Side) */}
      <div className="flex-1 lg:flex-[0.6] flex flex-col bg-slate-50 dark:bg-zinc-950/50 rounded-3xl border border-slate-200 dark:border-zinc-800 overflow-hidden shadow-sm relative">
        {/* Header */}
        <div className="h-14 bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-500">‹ Tài liệu mới</span>
            <span className="text-slate-300">/</span>
            <span className="font-bold">Bài đăng {selectedPlatform && <span className="capitalize">{selectedPlatform}</span>}</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold ml-2">ĐANG CHỈNH SỬA</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRegenerate} disabled={isGenerating} className="h-8 rounded-lg text-slate-600">
              <RefreshCw size={14} className={`mr-1.5 ${isGenerating ? 'animate-spin' : ''}`} />
              Tạo lại
            </Button>
            <Button size="sm" onClick={nextStep} disabled={!postContent || isGenerating} className="h-8 rounded-lg bg-orange-500 hover:bg-orange-600 text-white shadow-md">
              📅 Lên lịch
            </Button>
          </div>
        </div>

        {/* Content Area (Fake UI) */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-100 dark:bg-zinc-950 flex justify-center">
          {postContent ? (
            <div className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-slate-200 dark:border-zinc-800 p-4 pb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-zinc-800 flex items-center justify-center">
                  <PlatformIcon platform={selectedPlatform!} size={20} className="text-slate-400" />
                </div>
                <div>
                  <div className="font-bold text-sm">AntBiz Page</div>
                  <div className="text-xs text-slate-500">Vừa xong • 🌎</div>
                </div>
              </div>
              
              {/* Highlightable Text Area */}
              <div 
                ref={contentRef}
                className="relative text-slate-800 dark:text-zinc-200 whitespace-pre-wrap leading-relaxed text-[15px]"
                onMouseUp={handleMouseUp}
              >
                <div dangerouslySetInnerHTML={{ __html: postContent.content }} />
                
                {/* Popover for Highlight-to-edit */}
                <AnimatePresence>
                  {highlightCoords && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: 10 }}
                      style={{ top: highlightCoords.top, left: highlightCoords.left, transform: 'translateX(-50%)' }}
                      className="absolute z-50 bg-white dark:bg-zinc-800 shadow-xl rounded-xl p-2 flex gap-2 border border-slate-200 dark:border-zinc-700 whitespace-nowrap min-w-[200px]"
                    >
                      <Button size="sm" onClick={() => handleHighlightEdit("Viết lại ngắn gọn hơn")} className="h-7 text-xs bg-orange-500 hover:bg-orange-600 text-white rounded-lg flex-1">
                        <Sparkles size={12} className="mr-1" /> Gửi AI sửa
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setHighlightCoords(null)} className="h-7 text-xs rounded-lg">
                        Hủy
                      </Button>
                      
                      {/* Arrow */}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-white dark:border-t-zinc-800" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Fake Image Placeholder */}
              <div className="mt-4 w-full h-48 bg-slate-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center border border-slate-200 dark:border-zinc-700">
                <span className="text-slate-400 font-medium">Hình ảnh/Media (Nếu có)</span>
              </div>
            </div>
          ) : (
             <div className="w-full max-w-lg bg-white/50 dark:bg-zinc-900/50 rounded-xl border border-slate-200 border-dashed dark:border-zinc-800 p-8 flex flex-col items-center justify-center text-slate-400">
                <Sparkles className="animate-pulse mb-2 text-primary" size={32} />
                <p>AI đang phác thảo nội dung...</p>
             </div>
          )}
        </div>
      </div>

      {/* CHATBAR (Right Side) */}
      <div className="flex-1 lg:flex-[0.4] bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 flex flex-col shadow-lg shadow-slate-200/20 relative overflow-hidden">
        
        {/* Header */}
        <div className="h-16 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between px-5 bg-slate-50/50 dark:bg-zinc-900">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-tr from-orange-500 to-pink-500 rounded-full flex items-center justify-center shadow-md">
              <Sparkles size={16} className="text-white" />
            </div>
            <div>
              <div className="font-bold text-slate-800 dark:text-white leading-tight">AI Trợ lý</div>
              <div className="text-[10px] text-emerald-500 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Sẵn sàng
              </div>
            </div>
          </div>
          
          <button 
            onClick={() => setShowContextPanel(!showContextPanel)}
            className="text-xs font-semibold text-slate-500 hover:text-primary flex items-center gap-1 px-3 py-1.5 rounded-full hover:bg-primary/5 transition-colors"
          >
            <BookOpen size={14} /> Context Tổng
          </button>
        </div>

        {/* Context Panel Overlay */}
        <AnimatePresence>
          {showContextPanel && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-b border-slate-100 dark:border-zinc-800 bg-amber-50 dark:bg-amber-900/10 p-4 text-xs text-slate-700 dark:text-zinc-300 overflow-hidden"
            >
              <h4 className="font-bold mb-2">Context Hiện Tại:</h4>
              <ul className="space-y-1 list-disc pl-4">
                <li>Nền tảng: <strong className="capitalize">{selectedPlatform}</strong></li>
                <li>Nguồn bài: <strong>{articleContext?.title || 'Tự nhập'}</strong></li>
                {selectedPresetId && <li>Preset: <strong>{selectedPresetId}</strong></li>}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto p-5 scroll-smooth">
          {messages.map((msg) => (
            <ChatBubble key={msg.id} message={msg} />
          ))}
          
          {isGenerating && (
            <div className="flex w-full justify-start mb-4">
              <div className="flex max-w-[85%] gap-2">
                <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shrink-0 mt-1">
                  <Sparkles size={14} className="text-orange-600 dark:text-orange-400" />
                </div>
                <div className="px-4 py-3 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 text-slate-400 rounded-tl-none flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" />
                  <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Chat Input */}
        <div className="p-4 bg-white dark:bg-zinc-900 border-t border-slate-100 dark:border-zinc-800">
          <form onSubmit={handleSendMessage} className="relative">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
              placeholder="Nhắn AI chỉnh sửa (Enter gửi, Shift+Enter xuống dòng)..."
              className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl py-3 pl-4 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none h-14"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || isGenerating}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-orange-500 hover:bg-orange-600 disabled:bg-slate-300 dark:disabled:bg-zinc-700 text-white flex items-center justify-center transition-colors"
            >
              <Send size={16} className="-ml-0.5" />
            </button>
          </form>
        </div>
      </div>

    </div>
  );
};
