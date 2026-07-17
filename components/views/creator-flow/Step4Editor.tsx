'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  ChevronLeft, RefreshCw, Calendar, Send, Sparkles, 
  Info, Cpu, Facebook, Instagram, X, Loader2, Globe 
} from 'lucide-react';
import { useCreatorFlow } from '@/frontend/modules/creator-flow';

// Custom SVG Logo for Threads
const ThreadsIcon = ({ className = '', size = 16 }: { className?: string; size?: number }) => (
  <svg viewBox="0 0 192 192" width={size} height={size} className={className} fill="currentColor">
    <path d="M141.537 88.9883C140.71 88.5919 139.87 88.2104 139.019 87.8451C137.537 60.5382 122.616 44.905 97.5619 44.745C97.4484 44.7443 97.3355 44.7443 97.222 44.7443C82.2364 44.7443 69.7731 51.1409 62.102 62.7807L75.881 72.2328C81.6116 63.5383 90.6052 61.6848 97.2286 61.6848C97.3051 61.6848 97.3819 61.6848 97.4576 61.6855C105.707 61.7381 111.932 64.1366 115.961 68.814C118.893 72.2193 120.854 76.925 121.825 82.8638C114.511 81.6207 106.601 81.2385 98.145 81.7233C74.3247 83.0954 59.0111 96.9879 60.0396 116.292C60.5615 126.084 65.4397 134.508 73.775 140.011C80.8224 144.663 89.899 146.938 99.3323 146.423C111.79 145.74 121.563 140.987 128.381 132.296C133.559 125.696 136.834 117.143 138.28 106.366C144.217 109.949 148.617 114.664 151.047 120.332C155.179 129.967 155.42 145.8 142.501 158.708C131.182 170.016 117.576 174.908 97.0135 175.059C74.2042 174.89 56.9538 167.575 45.7381 153.317C35.2355 139.966 29.8077 120.682 29.6052 96C29.8077 71.3178 35.2355 52.0336 45.7381 38.6827C56.9538 24.4249 74.2039 17.11 97.0132 16.9405C119.988 17.1113 137.539 24.4614 149.184 38.788C154.894 45.8136 159.199 54.6488 162.037 64.9503L178.184 60.6422C174.744 47.9622 169.331 37.0357 161.965 27.974C147.036 9.60668 125.202 0.195148 97.0695 0H96.9569C68.8816 0.19447 47.2921 9.6418 32.7883 28.0793C19.8819 44.4864 13.2244 67.3157 13.0007 95.9325L13 96L13.0007 96.0675C13.2244 124.684 19.8819 147.514 32.7883 163.921C47.2921 182.358 68.8816 191.806 96.9569 192H97.0695C122.03 191.827 139.624 185.292 154.118 170.811C173.081 151.866 172.51 128.119 166.26 113.541C161.776 103.087 153.227 94.5962 141.537 88.9883ZM98.4405 129.507C88.0005 130.095 77.1544 125.409 76.6196 115.372C76.2232 107.93 81.9158 99.626 99.0812 98.6368C101.047 98.5234 102.976 98.468 104.871 98.468C111.106 98.468 116.939 99.0737 122.242 100.233C120.264 124.935 108.662 128.946 98.4405 129.507Z" />
  </svg>
);

export default function Step4Editor() {
  const { t } = useLanguage();
  const { 
    state, 
    dispatch,
    prevStep,
    nextStep,
    generateAIContent, 
    regeneratePostContent, 
    sendAssistantChat 
  } = useCreatorFlow();

  // Local states
  const [editableTitle, setEditableTitle] = useState<string>('');
  const [chatInput, setChatInput] = useState<string>('');
  const [openContextPanel, setOpenContextPanel] = useState<boolean>(false);
  
  // Highlighting popover state
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [showPopover, setShowPopover] = useState<boolean>(false);
  const [instructionText, setInstructionText] = useState<string>('');
  
  // Track visual flash transition state on update
  const [flashContent, setFlashContent] = useState<boolean>(false);

  // References
  const editorRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Mobile layout mode switcher: 'canvas' | 'chat'
  const [mobileMode, setMobileMode] = useState<'canvas' | 'chat'>('canvas');

  // Trigger initial generation once context is ready on mount
  useEffect(() => {
    if (state.articleContext && !state.generatedPost && !state.isGeneratingPost) {
      generateAIContent();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update title sync
  useEffect(() => {
    if (state.articleContext && !editableTitle) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEditableTitle(state.articleContext.title);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.articleContext]);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.chatMessages]);

  // Flash highlight effect when post content updates (simulating AI modification flash)
  useEffect(() => {
    if (state.postContent) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFlashContent(true);
      const timer = setTimeout(() => setFlashContent(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [state.postContent]);

  // Monitor text selections to draw inline popover
  const handleSelectionCheck = () => {
    const selection = window.getSelection();
    if (!selection) return;

    const text = selection.toString().trim();
    if (!text || text.length < 3) {
      setShowPopover(false);
      return;
    }

    // Verify selection is within the editor
    if (editorRef.current && editorRef.current.contains(selection.anchorNode)) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      // Calculate coordinates relative to screen view layout
      setPopoverPos({
        top: rect.top + window.scrollY - 55,
        left: rect.left + window.scrollX + (rect.width / 2),
      });
      dispatch({ type: 'SET_HIGHLIGHT_TEXT', payload: text });
      setShowPopover(true);
    }
  };

  const handleClearSelection = () => {
    setShowPopover(false);
    window.getSelection()?.removeAllRanges();
  };

  const handleSendHighlightEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!instructionText.trim()) return;
    setShowPopover(false);
    
    // Switch mobile mode to chat side if active
    setMobileMode('chat');

    // Create the message incorporating the highlighted context
    const contextPrompt = `[Bối cảnh bôi đen: "${state.highlightedText}"]\nYêu cầu: ${instructionText}`;
    
    // Transfer/Send context to Chatbar AI
    await sendAssistantChat(contextPrompt);
    
    setInstructionText('');
    handleClearSelection();
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    sendAssistantChat(chatInput);
    setChatInput('');
  };

  const getPlatformIcon = (platform: string) => {
    if (platform === 'facebook') return <Facebook className="w-4 h-4 text-[#1877F2]" />;
    if (platform === 'instagram') return <Instagram className="w-4 h-4 text-[#E1306C]" />;
    if (platform === 'threads') return <ThreadsIcon size={16} className="text-black dark:text-white" />;
    return null;
  };



  return (
    <div className="w-full flex-grow flex flex-col md:flex-row h-[calc(100vh-240px)] min-h-[500px] overflow-hidden relative border border-gray-200 dark:border-zinc-800 rounded-3xl bg-card">
      
      {/* Mobile Tab Swapper */}
      <div className="md:hidden flex border-b border-gray-150 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900">
        <button
          onClick={() => setMobileMode('canvas')}
          className={`flex-1 py-3 text-sm font-bold border-b-2 transition-all ${
            mobileMode === 'canvas' ? 'border-primary text-primary' : 'border-transparent text-text-muted'
          }`}
        >
          {t('creator.stepper.step4')}
        </button>
        <button
          onClick={() => setMobileMode('chat')}
          className={`flex-1 py-3 text-sm font-bold border-b-2 transition-all ${
            mobileMode === 'chat' ? 'border-primary text-primary' : 'border-transparent text-text-muted'
          }`}
        >
          {t('creator.step4.assistantTitle')}
        </button>
      </div>

      {/* LEFT COLUMN: CANVAS POST PREVIEW (63% width) */}
      <section 
        className={`w-full md:w-[63%] h-full flex flex-col border-r border-gray-200 dark:border-zinc-800 transition-all ${
          mobileMode === 'canvas' ? 'flex' : 'hidden md:flex'
        }`}
      >
        {/* Editor subheader */}
        <div className="px-6 h-[72px] flex items-center justify-between gap-6 border-b border-gray-150/10 dark:border-zinc-800/10 bg-white dark:bg-zinc-900 select-none flex-shrink-0">
          <div className="flex items-center gap-5 min-w-0">
            <button 
              onClick={prevStep}
              className="flex items-center text-xs font-bold text-text-muted hover:text-text gap-1.5 transition-colors flex-shrink-0"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Tài liệu mới</span>
            </button>
            <div className="h-4 w-px bg-gray-300 dark:bg-zinc-750 flex-shrink-0"></div>
            
            <div className="flex items-center gap-3 min-w-0">
              <Globe className="w-4 h-4 text-text-muted flex-shrink-0" />
              <span className="font-bold text-sm text-text truncate max-w-[240px] sm:max-w-[360px] md:max-w-[450px] lg:max-w-[600px]">
                {editableTitle || "Tài liệu mới"}
              </span>
            </div>
            
            <span className="bg-[#C4F0E1] text-[#0D6343] dark:bg-[#1b4332] dark:text-[#52b788] text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider flex-shrink-0">
              ĐANG CHỈNH SỬA
            </span>
          </div>
          
          <div className="flex items-center gap-3.5 flex-shrink-0">
            <button
              onClick={regeneratePostContent}
              disabled={state.isGeneratingPost}
              className="flex items-center gap-1.5 text-xs font-bold text-text-muted hover:text-text border border-gray-250 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-full px-4.5 py-2 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${state.isGeneratingPost ? 'animate-spin' : ''}`} />
              <span>Tạo lại</span>
            </button>
            <button
              onClick={nextStep}
              className="flex items-center gap-1.5 text-xs font-bold bg-[#F95A19] hover:bg-[#E54A0C] text-white rounded-full px-5 py-2 transition-all shadow-md shadow-[#F95A19]/10"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Lên lịch</span>
            </button>
          </div>
        </div>

        {/* Platform Indicator Tabs */}
        <div className="px-6 bg-white dark:bg-zinc-900 flex select-none">
          <div className="border-b-2 border-[#F95A19] py-3 px-1 text-sm font-bold text-[#F95A19] flex items-center gap-1.5 cursor-default">
            <span className="flex-shrink-0">{getPlatformIcon(state.selectedPlatform || 'facebook')}</span>
            <span className="capitalize">{state.selectedPlatform || 'Facebook'}</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
          </div>
        </div>

        {/* Canvas Post Preview Area */}
        <div 
          className="flex-grow overflow-y-auto p-6 md:p-10 bg-gray-55 dark:bg-zinc-950/20 select-text relative"
          onMouseUp={handleSelectionCheck}
        >
          {state.isGeneratingPost ? (
            <div className="max-w-3xl mx-auto space-y-6 pt-10">
              <div className="flex items-center gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-[#F95A19]" />
                <span className="text-sm font-bold text-text animate-pulse">Gemini 2.5 Flash đang tạo bài viết...</span>
              </div>
              <div className="space-y-3 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-gray-150 dark:border-zinc-800">
                <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-3/4 animate-pulse"></div>
                <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-5/6 animate-pulse"></div>
                <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded animate-pulse"></div>
                <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-2/3 animate-pulse"></div>
              </div>
            </div>
          ) : (
            <div 
              className={`max-w-3xl mx-auto bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-150 dark:border-zinc-800 transition-all overflow-hidden ${
                flashContent ? 'ring-2 ring-[#F95A19] ring-offset-2 dark:ring-offset-black scale-[1.01]' : ''
              }`}
            >
              {/* Fake post header */}
              <div className="p-6 pb-3 flex items-center justify-between select-none">
                <div className="flex items-center gap-3">
                  {/* Platform Avatar */}
                  {(() => {
                    const p = state.selectedPlatform || 'facebook';
                    if (p === 'facebook') {
                      return (
                        <div className="w-10 h-10 rounded-full bg-[#1877F2] text-white flex items-center justify-center font-extrabold text-lg select-none">
                          f
                        </div>
                      );
                    }
                    if (p === 'instagram') {
                      return (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#FFB900] via-[#D11874] to-[#7100A5] text-white flex items-center justify-center select-none">
                          <Instagram className="w-5 h-5" />
                        </div>
                      );
                    }
                    return (
                      <div className="w-10 h-10 rounded-full bg-black dark:bg-white text-white dark:text-black flex items-center justify-center select-none">
                        <ThreadsIcon size={18} />
                      </div>
                    );
                  })()}
                  <div>
                    <div className="text-sm font-bold text-text">
                      {state.articleContext?.author || "Ngọc Linh"}
                    </div>
                    <div className="text-[10px] text-text-muted flex items-center gap-1 mt-0.5">
                      Bây giờ • <Globe className="w-3 h-3 text-text-muted inline-block align-middle" />
                    </div>
                  </div>
                </div>
                
                {/* Character Counter */}
                <span className="text-xs text-text-muted font-bold bg-gray-100 dark:bg-zinc-850 px-2.5 py-1 rounded-lg border border-gray-250 dark:border-zinc-800">
                  {state.postContent ? state.postContent.length.toLocaleString() : 0} / {
                    state.selectedPlatform === 'threads' ? '500' : state.selectedPlatform === 'instagram' ? '2.200' : '63.206'
                  } ký tự
                </span>
              </div>

              {/* Fake post media thumbnail - spans full-width with 4:3 ratio */}
              {state.articleContext?.thumbnail && (
                <div className="w-full border-t border-b border-gray-100 dark:border-zinc-850 select-none overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={state.articleContext.thumbnail}
                    alt="Post media thumbnail"
                    className="w-full aspect-[4/3] object-cover"
                  />
                </div>
              )}

              {/* Editable Text Area */}
              <div className="p-6 pt-4">
                <div 
                  ref={editorRef}
                  className="text-sm md:text-[15px] text-text leading-relaxed whitespace-pre-wrap outline-none font-sans"
                >
                  {state.postContent || "Nội dung bài viết sẽ hiển thị ở đây sau khi sinh..."}
                </div>
              </div>
            </div>
          )}

          {/* Inline Selection Highlight popover */}
          {showPopover && (
            <div
              className="absolute z-50 bg-[#121214] text-white rounded-2xl shadow-2xl flex flex-col p-3.5 w-72 animate-scale-up border border-zinc-800"
              style={{
                top: `${popoverPos.top}px`,
                left: `${popoverPos.left}px`,
                transform: 'translateX(-50%)',
              }}
            >
              <div className="text-[10px] uppercase font-bold tracking-wider text-[#ff6b00] mb-2 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-[#ff6b00]" />
                <span>AI EDIT: &quot;{state.highlightedText.substring(0, 15)}...&quot;</span>
              </div>
              <form onSubmit={handleSendHighlightEdit} className="flex flex-col gap-2">
                <input
                  type="text"
                  required
                  placeholder="Nhập yêu cầu sửa..."
                  value={instructionText}
                  onChange={(e) => setInstructionText(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#ff6b00] focus:ring-1 focus:ring-[#ff6b00] w-full"
                />
                <div className="flex justify-end gap-1.5 mt-1">
                  <button
                    type="button"
                    onClick={handleClearSelection}
                    className="px-2.5 py-1 text-[10px] font-bold text-zinc-400 hover:text-white"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="bg-[#ff6b00] hover:bg-[#ff6b00]/90 text-white px-3 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-md shadow-[#ff6b00]/25"
                  >
                    <Send className="w-3 h-3" />
                    <span>Gửi AI sửa</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </section>

      {/* RIGHT COLUMN: AI CHAT SIDEBAR (37% width) */}
      <aside 
        className={`w-full md:w-[37%] h-full flex flex-col bg-gray-55 dark:bg-zinc-900/10 backdrop-blur-md transition-all ${
          mobileMode === 'chat' ? 'flex' : 'hidden md:flex'
        }`}
      >
        {/* Chat sidebar header */}
        <div className="px-6 h-[72px] flex items-center justify-between border-b border-gray-150/10 dark:border-zinc-800/10 bg-white/50 dark:bg-zinc-900/50 flex-shrink-0">
          <div className="flex items-center gap-2 text-[#F95A19] font-bold">
            <Cpu className="w-5 h-5" />
            <span className="text-base font-extrabold">AI Trợ lý</span>
          </div>
          <button
            onClick={() => setOpenContextPanel(true)}
            className="flex items-center gap-1.5 text-xs font-bold text-text-muted hover:text-text border border-gray-300 dark:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full px-4 py-1.5 transition-colors"
          >
            <Info className="w-3.5 h-3.5" />
            <span>Context Tổng</span>
          </button>
        </div>

        {/* Chat bubble logs */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {state.chatMessages.map((msg) => {
            const isAI = msg.sender === 'ai';
            return (
              <div 
                key={msg.id} 
                className={`flex gap-3 max-w-[85%] ${isAI ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}
              >
                {isAI && (
                  <div className="w-8 h-8 rounded-full bg-[#F95A19]/10 text-[#F95A19] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Cpu className="w-4 h-4" />
                  </div>
                )}
                <div className="flex flex-col">
                  <div className={`rounded-2xl p-4 text-sm leading-relaxed shadow-sm ${
                    isAI 
                      ? 'bg-[#F4F5F9] dark:bg-zinc-800 text-text rounded-tl-none border border-gray-100 dark:border-zinc-800/55' 
                      : 'bg-[#F95A19] text-white rounded-tr-none'
                  }`}>
                    {msg.text}
                  </div>
                  
                  {/* Model tag and metadata below AI speech bubbles */}
                  {isAI && msg.modelUsed && (
                    <span className="text-[9px] font-bold text-text-muted/70 flex items-center gap-1.5 mt-1.5 ml-1 uppercase tracking-wider select-none">
                      <Sparkles className="w-2.5 h-2.5 text-yellow-500" />
                      <span>Powered by {msg.modelUsed}</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
          {state.isChatSending && (
            <div className="flex gap-3 mr-auto max-w-[85%]">
              <div className="w-8 h-8 rounded-full bg-[#F95A19]/10 text-[#F95A19] flex items-center justify-center flex-shrink-0 animate-pulse">
                <Cpu className="w-4 h-4" />
              </div>
              <div className="bg-[#F4F5F9] dark:bg-zinc-800 text-text rounded-2xl rounded-tl-none p-4 text-sm border border-gray-100 dark:border-zinc-800 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#F95A19]" />
                <span className="animate-pulse text-xs text-text-muted">Gemini 3.1 Flash Lite đang trả lời...</span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Chat input footer */}
        <div className="p-4 border-t border-gray-150 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md">
          <form onSubmit={handleSendChat} className="relative bg-white dark:bg-zinc-900 border border-gray-250 dark:border-zinc-800 rounded-2xl shadow-sm focus-within:border-[#F95A19] focus-within:ring-1 focus-within:ring-[#F95A19] transition-all">
            <textarea
              className="w-full bg-transparent border-none focus:ring-0 text-sm p-4 resize-none h-20 text-text placeholder-text-muted/65 pr-14"
              placeholder="Nhắn AI... (Enter gửi, Shift+Enter xuống dòng)"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendChat(e);
                }
              }}
            />
            <button 
              type="submit"
              disabled={!chatInput.trim() || state.isChatSending}
              className="absolute bottom-3.5 right-4 w-9 h-9 bg-[#F95A19]/10 hover:bg-[#F95A19] text-[#F95A19] hover:text-white disabled:opacity-40 disabled:hover:bg-[#F95A19]/10 disabled:hover:text-[#F95A19] rounded-full flex items-center justify-center transition-all active:scale-95 duration-100"
            >
              <Send className="w-4.5 h-4.5" />
            </button>
          </form>
        </div>
      </aside>

      {/* Slide-out Global Context Details Panel */}
      {openContextPanel && (
        <div className="absolute inset-y-0 right-0 w-80 bg-white dark:bg-zinc-900 border-l border-gray-200 dark:border-zinc-800 shadow-2xl z-50 flex flex-col animate-slide-in-right">
          <div className="p-5 border-b border-gray-150 dark:border-zinc-800 flex justify-between items-center bg-gray-50 dark:bg-zinc-950/20">
            <h3 className="font-bold text-sm text-text uppercase tracking-wider">{t('creator.step4.contextTitle')}</h3>
            <button onClick={() => setOpenContextPanel(false)} className="text-text-muted hover:text-text p-1">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-6 space-y-6 text-sm">
            <div className="bg-gray-55 dark:bg-zinc-950/30 p-4 rounded-xl space-y-3">
              <div>
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Kênh xuất bản</span>
                <span className="font-bold text-text capitalize mt-0.5 block">{state.selectedPlatform || 'None'}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Nguồn bài viết gốc</span>
                <span className="text-text mt-0.5 block break-all font-mono text-xs">
                  {state.articleContext?.sourceUrl === 'manual' ? 'Nhập thủ công' : state.articleUrl || 'None'}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Preset đã áp dụng</span>
                <span className="text-text font-bold mt-0.5 block">
                  {state.presets.find(p => p.id === state.selectedPresetId)?.name || 'Không dùng Preset'}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider">Từ khóa phân tích</h4>
              <div className="flex flex-wrap gap-1.5">
                {state.articleContext?.keywords.map((kw, idx) => (
                  <span key={idx} className="bg-primary/5 text-primary text-xs px-2.5 py-1 rounded-full font-medium">
                    #{kw}
                  </span>
                )) || <span className="text-text-muted text-xs">Không có từ khóa</span>}
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider">Thực thể trích xuất</h4>
              <div className="flex flex-wrap gap-1.5">
                {state.articleContext?.entities.map((ent, idx) => (
                  <span key={idx} className="bg-gray-100 dark:bg-zinc-800 text-text text-xs px-2.5 py-1 rounded-full">
                    {ent}
                  </span>
                )) || <span className="text-text-muted text-xs">Không có thực thể</span>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
