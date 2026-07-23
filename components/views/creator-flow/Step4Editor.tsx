'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  RefreshCw, Send, Sparkles,
  Cpu, Facebook, Instagram, X, Loader2, Globe,
  Bookmark, Check, Search, EyeOff, MoreHorizontal,
  ThumbsUp, MessageSquare, Share2, Heart, MessageCircle,
  Repeat2, CheckCircle2, ChevronLeft, ChevronRight, Wand2,
  History, RotateCcw, RotateCw, ChevronDown, Minus, MoreVertical, Image as ImageIcon, Paperclip, Mic, SlidersHorizontal,
  Scissors, Crop
} from 'lucide-react';
import { useCreatorFlow } from '@/frontend/modules/creator-flow';
import { useSmartCrop } from '@/frontend/modules/smart-crop';
import { createPortal } from 'react-dom';
import { createClient } from '@/utils/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { postService, ChatMessage } from '@/lib/services/creator/post.service';

// Custom SVG Logo for Threads
const ThreadsIcon = ({ className = '', size = 16 }: { className?: string; size?: number }) => (
  <svg viewBox="0 0 192 192" width={size} height={size} className={className} fill="currentColor">
    <path d="M141.537 88.9883C140.71 88.5919 139.87 88.2104 139.019 87.8451C137.537 60.5382 122.616 44.905 97.5619 44.745C97.4484 44.7443 97.3355 44.7443 97.222 44.7443C82.2364 44.7443 69.7731 51.1409 62.102 62.7807L75.881 72.2328C81.6116 63.5383 90.6052 61.6848 97.2286 61.6848C97.3051 61.6848 97.3819 61.6848 97.4576 61.6855C105.707 61.7381 111.932 64.1366 115.961 68.814C118.893 72.2193 120.854 76.925 121.825 82.8638C114.511 81.6207 106.601 81.2385 98.145 81.7233C74.3247 83.0954 59.0111 96.9879 60.0396 116.292C60.5615 126.084 65.4397 134.508 73.775 140.011C80.8224 144.663 89.899 146.938 99.3323 146.423C111.79 145.74 121.563 140.987 128.381 132.296C133.559 125.696 136.834 117.143 138.28 106.366C144.217 109.949 148.617 114.664 151.047 120.332C155.179 129.967 155.42 145.8 142.501 158.708C131.182 170.016 117.576 174.908 97.0135 175.059C74.2042 174.89 56.9538 167.575 45.7381 153.317C35.2355 139.966 29.8077 120.682 29.6052 96C29.8077 71.3178 35.2355 52.0336 45.7381 38.6827C56.9538 24.4249 74.2039 17.11 97.0132 16.9405C119.988 17.1113 137.539 24.4614 149.184 38.788C154.894 45.8136 159.199 54.6488 162.037 64.9503L178.184 60.6422C174.744 47.9622 169.331 37.0357 161.965 27.974C147.036 9.60668 125.202 0.195148 97.0695 0H96.9569C68.8816 0.19447 47.2921 9.6418 32.7883 28.0793C19.8819 44.4864 13.2244 67.3157 13.0007 95.9325L13 96L13.0007 96.0675C13.2244 124.684 19.8819 147.514 32.7883 163.921C47.2921 182.358 68.8816 191.806 96.9569 192H97.0695C122.03 191.827 139.624 185.292 154.118 170.811C173.081 151.866 172.51 128.119 166.26 113.541C161.776 103.087 153.227 94.5962 141.537 88.9883ZM98.4405 129.507C88.0005 130.095 77.1544 125.409 76.6196 115.372C76.2232 107.93 81.9158 99.626 99.0812 98.6368C101.047 98.5234 102.976 98.468 104.871 98.468C111.106 98.468 116.939 99.0737 122.242 100.233C120.264 124.935 108.662 128.946 98.4405 129.507Z" />
  </svg>
);

function QuotedTextBubble({ text }: { text: string }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      onClick={() => setIsExpanded(prev => !prev)}
      className="w-full bg-[#F4F5F9] dark:bg-zinc-800 text-slate-700 dark:text-slate-300 text-xs p-3.5 rounded-2xl rounded-bl-xs border border-slate-200/60 dark:border-zinc-700/60 leading-relaxed shadow-xs cursor-pointer hover:border-slate-300 dark:hover:border-zinc-600 transition-all select-text"
      title={isExpanded ? "Bấm để thu gọn" : "Bấm để xem đầy đủ"}
    >
      <p className={isExpanded ? "whitespace-pre-wrap" : "line-clamp-2 whitespace-pre-wrap"}>
        {text}
      </p>
    </div>
  );
}

export default function Step4Editor() {
  const { t } = useLanguage();
  const {
    state,
    dispatch,
    generateAIContent,
    regeneratePostContent,
    sendAssistantChat,
    editHighlighted,
    restoreChatState,
  } = useCreatorFlow();

  // Style Presets states
  const [isPresetsOpen, setIsPresetsOpen] = useState(false);
  const [presetSearch, setPresetSearch] = useState('');
  const [presetTab, setPresetTab] = useState<'system' | 'personal'>('personal');
  const [initialSelectedPresetId, setInitialSelectedPresetId] = useState<string | null>(null);

  useEffect(() => {
    if (isPresetsOpen) {
      setInitialSelectedPresetId(state.selectedPresetId);
    }
  }, [isPresetsOpen]);

  // Default fallback image when no article/crawled image exists
  const fallbackImage = 'https://images.unsplash.com/photo-1542626991-cbc4e32524cc?q=80&w=1000';

  // ─── Smart Crop: auto-detect focal point & crop all crawled images to 1:1 ───
  const rawImagesForCrop = useMemo(() => {
    if (state.crawledImageUrls && state.crawledImageUrls.length > 0) return state.crawledImageUrls;
    const contextImages = (state.articleContext as any)?.imageUrls || (state.articleContext?.thumbnail ? [state.articleContext.thumbnail] : []);
    if (contextImages.length > 0) return contextImages;
    return [];
  }, [state.crawledImageUrls, state.articleContext]);

  const { croppedUrls, isCropping, cropProgress } = useSmartCrop(rawImagesForCrop);

  // Sync cropped URLs into global state when processing completes
  useEffect(() => {
    if (!isCropping && croppedUrls.length > 0) {
      if ((state.croppedImageUrls || []).join('|') !== croppedUrls.join('|')) {
        dispatch({ type: 'SET_CROPPED_IMAGES', payload: croppedUrls });
      }
    }
  }, [croppedUrls, isCropping, dispatch, state.croppedImageUrls]);

  // ─── Active images for preview: prefer cropped, fall back to crawled/thumbnail ───
  const postImages: string[] = (
    (state.croppedImageUrls && state.croppedImageUrls.length > 0)
      ? state.croppedImageUrls
      : (rawImagesForCrop.length > 0 ? rawImagesForCrop : [fallbackImage])
  );
  const postImage = postImages[0] || fallbackImage;

  const getTagColorClass = (tag: string) => {
    const text = tag.toLowerCase();
    if (text.includes('tương tác')) return 'bg-indigo-50 dark:bg-indigo-950/20 text-primary border border-indigo-100 dark:border-indigo-900/30';
    if (text.includes('sự kiện') || text.includes('báo')) return 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-900/30';
    if (text.includes('chuyên gia') || text.includes('uy quyền')) return 'bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 border border-green-100 dark:border-green-900/30';
    if (text.includes('kiến thức') || text.includes('sáng tạo')) return 'bg-purple-50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-400 border border-purple-100 dark:border-purple-900/30';
    if (text.includes('bán')) return 'bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30';
    if (text.includes('hệ thống')) return 'bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30';
    return 'bg-gray-55 dark:bg-zinc-800 text-gray-700 dark:text-gray-400 border border-gray-100 dark:border-zinc-700/50';
  };

  // Local states
  const [editableTitle, setEditableTitle] = useState<string>('');
  const [chatInput, setChatInput] = useState<string>('');
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [igImageIndex, setIgImageIndex] = useState<number>(0);

  // Dynamic Gemini 3.1 Flash Lite suggestion states
  const [aiSuggestions, setAiSuggestions] = useState<Array<{ label: string; prompt: string }>>([]);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState<boolean>(false);
  const lastSuggestedSigRef = useRef<string>('');

  useEffect(() => {
    if (state.highlightSelections.length === 0) {
      if (lastSuggestedSigRef.current !== '') {
        lastSuggestedSigRef.current = '';
        setAiSuggestions([]);
        setIsGeneratingSuggestions(false);
      }
      return;
    }

    const currentHighlightedText = state.highlightSelections.map(s => s.text).join(' ');
    if (currentHighlightedText === lastSuggestedSigRef.current) return;

    lastSuggestedSigRef.current = currentHighlightedText;
    setIsGeneratingSuggestions(true);
    setAiSuggestions([]);

    let isCancelled = false;

    postService.generateAiSuggestions(currentHighlightedText, state.articleContext?.title)
      .then((res) => {
        if (!isCancelled) {
          if (res.data?.suggestions && res.data.suggestions.length > 0) {
            setAiSuggestions(res.data.suggestions);
          }
          setIsGeneratingSuggestions(false);
        }
      })
      .catch((err) => {
        console.error('[Gemini Suggestions] Error:', err);
        if (!isCancelled) {
          setIsGeneratingSuggestions(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [state.highlightSelections, state.articleContext?.title]);

  // Auto-trigger AI content generation on mount if no post content/draft exists yet
  const hasTriggeredInitialGenRef = useRef(false);
  useEffect(() => {
    if (hasTriggeredInitialGenRef.current) return;

    const targetPlatforms = state.selectedPlatforms.length > 0
      ? state.selectedPlatforms
      : (state.selectedPlatform ? [state.selectedPlatform] : []);

    const hasAnyDraft = targetPlatforms.some(p => !!state.drafts[p]?.content);

    if (!hasAnyDraft && !state.isGeneratingPost && state.articleId && state.articleContext) {
      hasTriggeredInitialGenRef.current = true;
      generateAIContent();
    }
  }, [state.articleId, state.articleContext, state.selectedPlatforms, state.selectedPlatform, state.drafts, state.isGeneratingPost, generateAIContent]);

  // Add initial AI suggestion message on mount if no initial message exists
  useEffect(() => {
    const hasInitMsg = state.chatMessages.some(m => m.id.startsWith('msg_ai_init'));
    if (!hasInitMsg && state.chatMessages.length === 0) {
      const initialAiMsg: ChatMessage = {
        id: `msg_ai_init_${Date.now()}`,
        sender: 'ai',
        text: `Bài viết đã được khởi tạo thành công! ✨\nHãy bôi đen đoạn văn hoặc nhắn yêu cầu để mình hỗ trợ nhé.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      dispatch({ type: 'ADD_CHAT_MESSAGE', payload: initialAiMsg });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Formatting variables for preview cards
  const currentPlatform = state.selectedPlatform || 'facebook';

  const postContentText = state.postContent || '';

  // Extract inline hashtags from postContentText if present
  const inlineHashtags = (postContentText.match(/#[^\s#]+/g) || []);

  // Clean body text by stripping inline hashtags for clear separation
  const cleanBodyText = postContentText.replace(/(?:^|\s)(#[^\s#]+)/g, '').trim();
  const displayedContent = cleanBodyText || postContentText;

  const contentLength = displayedContent.length;
  const wordCount = displayedContent.trim() ? displayedContent.trim().split(/\s+/).length : 0;

  const isLongContent = contentLength > 500;

  const maxCharLimit = currentPlatform === 'threads' ? '5,000' : currentPlatform === 'instagram' ? '2,200' : '63,206';
  const formattedCounter = `${contentLength.toLocaleString()} ký tự (~${wordCount} từ) / ${maxCharLimit} ký tự`;

  const validKeywords = (state.articleContext?.keywords || []).filter(
    k => !['manual', 'bài viết thủ công', 'nhập tay', 'tuoitre', 'dantri', 'gocnhinmoi'].includes(k.trim().toLowerCase())
  );

  const categoryTag = (validKeywords[0] && validKeywords[0].toLowerCase() !== 'manual')
    ? `[${validKeywords[0]}]`
    : '';

  const authorName = state.articleContext?.author || 'Ngọc Linh';
  const keywordHashtags = validKeywords
    .map(k => '#' + (k.startsWith('#') ? k.slice(1) : k).replace(/\s+/g, ''))
    .filter(h => h.toLowerCase() !== '#manual');

  // Unique merged hashtags
  const hashtags = Array.from(new Set([...keywordHashtags, ...inlineHashtags]));

  const handleRestore = (idx: number) => {
    const result = restoreChatState(idx);

    if (result.userPrompt) {
      setChatInput(result.userPrompt);
      setTimeout(() => {
        chatInputRef.current?.focus({ preventScroll: true });
      }, 50);
    }

    if (result.quotedText) {
      const fullText = result.restoredContent ?? state.postContent ?? '';
      const quotes = result.quotedText.split('\n---\n');
      quotes.forEach((quoteText) => {
        const trimmedQuote = quoteText.trim();
        if (!trimmedQuote) return;
        const start = fullText.indexOf(trimmedQuote);
        if (start !== -1) {
          const end = start + trimmedQuote.length;
          dispatch({
            type: 'ADD_HIGHLIGHT_SELECTION',
            payload: {
              id: `sel_${Date.now()}_${Math.random()}`,
              text: trimmedQuote,
              start,
              end,
            },
          });
        }
      });
    }
  };

  const renderMultiImageGrid = (images: string[]) => {
    const displayImages = (images && images.length > 0) ? images : [fallbackImage];

    if (displayImages.length === 1) {
      return (
        <div className="w-full overflow-hidden select-none mb-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={displayImages[0]}
            alt="Post media"
            className="w-full max-h-[480px] object-cover rounded-2xl border border-slate-100 dark:border-zinc-800"
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = fallbackImage; }}
          />
        </div>
      );
    }

    if (displayImages.length === 2) {
      return (
        <div className="w-full grid grid-cols-2 gap-1 rounded-2xl overflow-hidden border border-slate-100 dark:border-zinc-800 select-none mb-3 h-[320px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={displayImages[0]} alt="Media 1" className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).src = fallbackImage; }} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={displayImages[1]} alt="Media 2" className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).src = fallbackImage; }} />
        </div>
      );
    }

    if (displayImages.length === 3) {
      return (
        <div className="w-full grid grid-cols-2 gap-1 rounded-2xl overflow-hidden border border-slate-100 dark:border-zinc-800 select-none mb-3 h-[360px]">
          {/* Left half: 1 image full height */}
          <div className="h-full overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={displayImages[0]} alt="Media 1" className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).src = fallbackImage; }} />
          </div>
          {/* Right half: 2 images split top and bottom */}
          <div className="flex flex-col gap-1 h-full overflow-hidden">
            <div className="h-1/2 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={displayImages[1]} alt="Media 2" className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).src = fallbackImage; }} />
            </div>
            <div className="h-1/2 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={displayImages[2]} alt="Media 3" className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).src = fallbackImage; }} />
            </div>
          </div>
        </div>
      );
    }

    // 4 or more images
    const remainingCount = displayImages.length - 4;
    return (
      <div className="w-full grid grid-cols-2 gap-1 rounded-2xl overflow-hidden border border-slate-100 dark:border-zinc-800 select-none mb-3 h-[400px]">
        {/* Left half: 1 image */}
        <div className="h-full overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={displayImages[0]} alt="Media 1" className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).src = fallbackImage; }} />
        </div>
        {/* Right half: 3 images stacked */}
        <div className="flex flex-col gap-1 h-full overflow-hidden">
          <div className="h-1/3 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={displayImages[1]} alt="Media 2" className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).src = fallbackImage; }} />
          </div>
          <div className="h-1/3 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={displayImages[2]} alt="Media 3" className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).src = fallbackImage; }} />
          </div>
          <div className="h-1/3 overflow-hidden relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={displayImages[3]} alt="Media 4" className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).src = fallbackImage; }} />
            {remainingCount > 0 && (
              <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px] flex items-center justify-center text-white font-extrabold text-xl">
                +{remainingCount}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderInstagramCarousel = (images: string[]) => {
    const displayImages = (images && images.length > 0) ? images : [fallbackImage];

    if (displayImages.length === 1) {
      return (
        <div className="w-full border-t border-b border-slate-100 dark:border-zinc-800 overflow-hidden select-none">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={displayImages[0]}
            alt="Instagram Post Media"
            className="w-full h-auto max-h-[550px] object-cover"
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = fallbackImage; }}
          />
        </div>
      );
    }

    const safeIndex = Math.min(igImageIndex, displayImages.length - 1);

    return (
      <div className="w-full select-none flex flex-col items-center">
        {/* Main Carousel Image Container */}
        <div className="w-full relative border-t border-b border-slate-100 dark:border-zinc-800 overflow-hidden">
          {/* Horizontal Sliding Track */}
          <div
            className="flex items-start w-full transition-transform duration-300 ease-out"
            style={{ transform: `translateX(-${safeIndex * 100}%)` }}
          >
            {displayImages.map((img, idx) => (
              <div key={idx} className="w-full shrink-0 flex-none relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img}
                  alt={`Instagram Post Media ${idx + 1}`}
                  className="w-full h-auto max-h-[550px] object-cover"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = fallbackImage; }}
                />
              </div>
            ))}
          </div>

          {/* Left Arrow Button */}
          {safeIndex > 0 && (
            <button
              type="button"
              onClick={() => setIgImageIndex(prev => Math.max(0, prev - 1))}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 dark:bg-black/60 backdrop-blur-md text-slate-800 dark:text-white flex items-center justify-center shadow-md hover:bg-white dark:hover:bg-black transition-all border-0 cursor-pointer z-10 active:scale-95"
              aria-label="Previous image"
            >
              <ChevronLeft size={18} />
            </button>
          )}

          {/* Right Arrow Button */}
          {safeIndex < displayImages.length - 1 && (
            <button
              type="button"
              onClick={() => setIgImageIndex(prev => Math.min(displayImages.length - 1, prev + 1))}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 dark:bg-black/60 backdrop-blur-md text-slate-800 dark:text-white flex items-center justify-center shadow-md hover:bg-white dark:hover:bg-black transition-all border-0 cursor-pointer z-10 active:scale-95"
              aria-label="Next image"
            >
              <ChevronRight size={18} />
            </button>
          )}
        </div>

        {/* Bullet Pagination Dots Below Image */}
        <div className="flex items-center justify-center gap-1.5 py-3">
          {displayImages.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setIgImageIndex(idx)}
              className={`rounded-full transition-all duration-200 border-0 p-0 cursor-pointer ${idx === safeIndex
                ? 'w-2 h-2 bg-[#1877F2] scale-110'
                : 'w-1.5 h-1.5 bg-slate-300 dark:bg-zinc-600 hover:bg-slate-400'
                }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    );
  };

  const renderThreadsCarousel = (images: string[]) => {
    const displayImages = (images && images.length > 0) ? images : [fallbackImage];

    if (displayImages.length === 1) {
      return (
        <div className="w-full rounded-2xl overflow-hidden border border-slate-100 dark:border-zinc-800 select-none mb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={displayImages[0]}
            alt="Threads post media"
            className="w-full max-h-[480px] object-cover"
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = fallbackImage; }}
          />
        </div>
      );
    }

    return (
      <div className="w-full select-none mb-4">
        <div
          ref={threadsScrollRef}
          onMouseDown={handleThreadsMouseDown}
          onMouseLeave={handleThreadsMouseLeave}
          onMouseUp={handleThreadsMouseUp}
          onMouseMove={handleThreadsMouseMove}
          className="flex gap-3 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory cursor-grab active:cursor-grabbing select-none"
        >
          {displayImages.map((img, idx) => (
            <div
              key={idx}
              className="w-[200px] sm:w-[240px] h-[260px] sm:h-[290px] shrink-0 rounded-2xl overflow-hidden border border-slate-100 dark:border-zinc-800 snap-align-start relative shadow-sm"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img}
                alt={`Threads image ${idx + 1}`}
                className="w-full h-full object-cover pointer-events-none select-none"
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = fallbackImage; }}
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Highlighting popover state
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [showPopover, setShowPopover] = useState<boolean>(false);
  const [currentSelection, setCurrentSelection] = useState<{ id: string; text: string; start: number; end: number } | null>(null);
  const [instructionText, setInstructionText] = useState<string>('');

  // Track visual flash transition state on update
  const [flashContent, setFlashContent] = useState<boolean>(false);

  // Floating display options popover state
  const [showDisplayOptionsPopover, setShowDisplayOptionsPopover] = useState<boolean>(false);
  const displayOptions = state.displayOptions || {
    showTitle: true,
    showContent: true,
    showImages: true,
    showAuthor: true,
    showHashtags: true,
  };
  const hiddenOptionsCount = Object.values(displayOptions).filter(v => v === false).length;

  // New hashtag input & state
  const [newHashtagInput, setNewHashtagInput] = useState<string>('');
  const [isAddingHashtag, setIsAddingHashtag] = useState<boolean>(false);

  const effectiveHashtags = state.customHashtags !== null ? state.customHashtags : hashtags;
  const currentTitle = state.customTitle ?? (editableTitle || state.articleContext?.title || '');

  const handleAddHashtag = (tag: string) => {
    const cleanTag = tag.trim().replace(/^#+/, '');
    if (!cleanTag) return;
    const formattedTag = `#${cleanTag}`;
    if (!effectiveHashtags.includes(formattedTag)) {
      const updated = [...effectiveHashtags, formattedTag];
      dispatch({ type: 'SET_CUSTOM_HASHTAGS', payload: updated });
    }
    setNewHashtagInput('');
    setIsAddingHashtag(false);
  };

  const handleRemoveHashtag = (tagToRemove: string) => {
    const updated = effectiveHashtags.filter(h => h !== tagToRemove);
    dispatch({ type: 'SET_CUSTOM_HASHTAGS', payload: updated });
  };

  const generateAITitle = async () => {
    dispatch({ type: 'SET_CHAT_SENDING', payload: true });
    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: 'Viết lại tiêu đề bài viết cho giật gân, cuốn hút hơn',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    dispatch({ type: 'ADD_CHAT_MESSAGE', payload: userMsg });

    try {
      const contentContext = displayedContent.length > 500 ? displayedContent.slice(0, 500) : displayedContent;
      const prompt = `Yêu cầu: Viết lại 1 TIÊU ĐỀ bài viết thật hấp dẫn, giật gân, thu hút độc giả.\nQUY TẮC BẮT BUỘC: CHỈ trả về đúng 1 câu tiêu đề ngắn gọn (dưới 50 từ), KHÔNG chào hỏi, KHÔNG giải thích, KHÔNG thêm bớt ký tự dẫn dắt.\nTitle hiện tại: ${currentTitle}\nNội dung bài viết: ${contentContext}`;
      const res = await postService.sendChatMessage(state.articleId || 'draft', prompt, []);
      let rawText = (res.data?.text || '').trim();
      // Remove leading markdown headers or quotes
      rawText = rawText.replace(/^(#+\s*|Tiêu đề:\s*|Title:\s*|["'«»])/, '').replace(/["'«»]$/, '').trim();
      // Extract the first non-empty line in case AI returned multiple lines
      const newTitle = rawText.split('\n').map(l => l.trim()).find(l => l.length > 0) || rawText;

      if (newTitle) {
        setEditableTitle(newTitle);
        dispatch({ type: 'SET_CUSTOM_TITLE', payload: newTitle });
        const aiMsg: ChatMessage = {
          id: `ai_${Date.now()}`,
          sender: 'ai',
          text: `Đã cập nhật tiêu đề mới:\n✨ "${newTitle}"`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          modelUsed: 'Gemini 2.5 Flash',
        };
        dispatch({ type: 'ADD_CHAT_MESSAGE', payload: aiMsg });
      }
    } catch (err) {
      console.error('[AI Title Error]', err);
      const errMsg: ChatMessage = {
        id: `ai_err_${Date.now()}`,
        sender: 'ai',
        text: '❌ Rất tiếc, không thể tạo tiêu đề mới lúc này. Vui lòng thử lại sau!',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      dispatch({ type: 'ADD_CHAT_MESSAGE', payload: errMsg });
    } finally {
      dispatch({ type: 'SET_CHAT_SENDING', payload: false });
    }
  };

  const generateAIHashtags = async () => {
    dispatch({ type: 'SET_CHAT_SENDING', payload: true });
    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: 'Gợi ý bộ Hashtags xu hướng mới',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    dispatch({ type: 'ADD_CHAT_MESSAGE', payload: userMsg });

    try {
      const contentContext = displayedContent.length > 500 ? displayedContent.slice(0, 500) : displayedContent;
      const prompt = `Tạo 5-8 hashtag tiếng Việt và tiếng Anh phổ biến, viral phù hợp với bài viết sau. QUY TẮC BẮT BUỘC: CHỈ trả về danh sách các hashtag cách nhau bởi dấu cách, không giải thích hay chào hỏi (ví dụ: #AntBiz #Marketing #AI):\nNội dung bài viết: ${contentContext}`;
      const res = await postService.sendChatMessage(state.articleId || 'draft', prompt, []);
      const reply = res.data?.text || '';
      let parsedTags = (reply.match(/#[^\s#]+/g) || []).slice(0, 8);

      // Fallback: If AI returned plain words without '#', parse words and convert to hashtags
      if (parsedTags.length === 0 && reply.trim()) {
        const plainWords = reply
          .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '')
          .split(/\s+/)
          .filter(w => w.length > 1 && !['và', 'hoặc', 'là', 'các', 'cho', 'với'].includes(w.toLowerCase()))
          .slice(0, 8);
        parsedTags = plainWords.map(w => w.startsWith('#') ? w : `#${w}`);
      }

      if (parsedTags.length > 0) {
        dispatch({ type: 'SET_CUSTOM_HASHTAGS', payload: parsedTags });
        const aiMsg: ChatMessage = {
          id: `ai_${Date.now()}`,
          sender: 'ai',
          text: `Đã cập nhật bộ Hashtags xu hướng mới:\n🏷️ ${parsedTags.join(' ')}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          modelUsed: 'Gemini 2.5 Flash',
        };
        dispatch({ type: 'ADD_CHAT_MESSAGE', payload: aiMsg });
      } else {
        const aiMsg: ChatMessage = {
          id: `ai_${Date.now()}`,
          sender: 'ai',
          text: `Không tìm thấy hashtag mới từ phản hồi AI. Vui lòng thử lại!`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        dispatch({ type: 'ADD_CHAT_MESSAGE', payload: aiMsg });
      }
    } catch (err) {
      console.error('[AI Hashtag Error]', err);
      const errMsg: ChatMessage = {
        id: `ai_err_${Date.now()}`,
        sender: 'ai',
        text: '❌ Rất tiếc, không thể tạo hashtag mới lúc này. Vui lòng thử lại sau!',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      dispatch({ type: 'ADD_CHAT_MESSAGE', payload: errMsg });
    } finally {
      dispatch({ type: 'SET_CHAT_SENDING', payload: false });
    }
  };

  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (titleRef.current && document.activeElement !== titleRef.current) {
      titleRef.current.innerText = currentTitle || "Nhập tiêu đề bài viết...";
    }
  }, [currentTitle]);

  const renderEditableTitle = () => {
    if (!displayOptions.showTitle) return null;

    return (
      <div className="mb-2 group relative">
        <h3
          ref={titleRef}
          contentEditable={!state.isGeneratingPost && !state.isHighlightEditing}
          suppressContentEditableWarning
          onBlur={(e) => {
            const val = e.currentTarget.innerText.trim();
            setEditableTitle(val);
            dispatch({ type: 'SET_CUSTOM_TITLE', payload: val });
          }}
          className="font-black text-slate-900 dark:text-white text-sm md:text-base inline-block leading-snug outline-none focus:ring-1 focus:ring-primary/50 focus:bg-primary/5 rounded px-1.5 py-0.5 transition-all cursor-text hover:bg-slate-100/70 dark:hover:bg-zinc-800/50"
          title="Bấm vào đây để tự sửa tiêu đề"
        >
          {currentTitle || "Nhập tiêu đề bài viết..."}
        </h3>
      </div>
    );
  };

  const renderEditableHashtags = () => {
    if (!displayOptions.showHashtags) return null;

    return (
      <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold mb-4 select-none">
        {effectiveHashtags.map((h, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 text-[#ff6b00] px-2.5 py-1 rounded-lg text-xs font-bold border border-amber-250/60 dark:border-amber-800/40 shadow-2xs group hover:border-amber-400 transition-all"
          >
            <span>{h}</span>
            <button
              type="button"
              onClick={() => handleRemoveHashtag(h)}
              className="p-0.5 rounded-full hover:bg-amber-200 dark:hover:bg-amber-900 text-amber-600 dark:text-amber-400 transition-colors cursor-pointer"
              title="Xóa hashtag này"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}

        {isAddingHashtag ? (
          <div className="inline-flex items-center gap-1">
            <input
              type="text"
              autoFocus
              value={newHashtagInput}
              onChange={(e) => setNewHashtagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddHashtag(newHashtagInput);
                } else if (e.key === 'Escape') {
                  setIsAddingHashtag(false);
                  setNewHashtagInput('');
                }
              }}
              onBlur={() => handleAddHashtag(newHashtagInput)}
              placeholder="Nhập hashtag..."
              className="w-28 h-7 px-2 py-0.5 rounded-lg border border-primary text-xs font-bold text-text bg-white dark:bg-zinc-800 outline-none shadow-2xs"
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsAddingHashtag(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-zinc-800 text-text-muted hover:text-primary hover:bg-primary/10 transition-all text-xs font-bold cursor-pointer border border-dashed border-gray-300 dark:border-zinc-700"
            title="Thêm hashtag mới"
          >
            <span>+ Thêm hashtag</span>
          </button>
        )}
      </div>
    );
  };

  // References
  const editorRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);

  // Mobile layout mode switcher: 'canvas' | 'chat'
  const [mobileMode, setMobileMode] = useState<'canvas' | 'chat'>('canvas');

  // Mouse drag scrolling state for Threads Carousel
  const threadsScrollRef = useRef<HTMLDivElement>(null);
  const isMouseDownRef = useRef<boolean>(false);
  const startXRef = useRef<number>(0);
  const scrollLeftRef = useRef<number>(0);

  const handleThreadsMouseDown = (e: React.MouseEvent) => {
    isMouseDownRef.current = true;
    if (threadsScrollRef.current) {
      startXRef.current = e.pageX - threadsScrollRef.current.offsetLeft;
      scrollLeftRef.current = threadsScrollRef.current.scrollLeft;
    }
  };

  const handleThreadsMouseLeave = () => {
    isMouseDownRef.current = false;
  };

  const handleThreadsMouseUp = () => {
    isMouseDownRef.current = false;
  };

  const handleThreadsMouseMove = (e: React.MouseEvent) => {
    if (!isMouseDownRef.current || !threadsScrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - threadsScrollRef.current.offsetLeft;
    const walk = (x - startXRef.current) * 1.5;
    threadsScrollRef.current.scrollLeft = scrollLeftRef.current - walk;
  };

  // Ref to track if generation was already triggered for initial mount
  const hasMountGeneratedRef = useRef<boolean>(false);

  // Trigger initial generation ONCE on mount if no draft exists yet
  useEffect(() => {
    if (!state.articleContext || !state.articleId || state.isGeneratingPost) return;

    const activePlatform = state.selectedPlatform || 'facebook';
    const hasDraft = !!state.drafts[activePlatform]?.content;

    if (!hasDraft && !hasMountGeneratedRef.current) {
      hasMountGeneratedRef.current = true;
      generateAIContent();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update title sync
  useEffect(() => {
    if (state.customTitle) {
      setEditableTitle(state.customTitle);
    } else if (state.articleContext?.title) {
      setEditableTitle(state.articleContext.title);
    }
  }, [state.customTitle, state.articleContext?.title]);

  // Flash highlight effect when post content updates (simulating AI modification flash)
  useEffect(() => {
    if (state.postContent) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFlashContent(true);
      const timer = setTimeout(() => setFlashContent(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [state.postContent]);

  // Keep contentEditable innerText in sync with displayedContent when not active
  useEffect(() => {
    if (editorRef.current && document.activeElement !== editorRef.current) {
      editorRef.current.innerText = displayedContent;
    }
  }, [displayedContent, isExpanded]);

  const handleSelectionCheck = () => {
    const selection = window.getSelection();
    if (!selection) return;

    const text = selection.toString();
    const cleanText = text.trim();
    if (!cleanText || cleanText.length < 2) return;

    // Verify selection is within the editor
    if (editorRef.current && editorRef.current.contains(selection.anchorNode)) {
      const range = selection.getRangeAt(0);

      let selectionStart = 0;
      const preRange = range.cloneRange();
      preRange.selectNodeContents(editorRef.current);
      preRange.setEnd(range.startContainer, range.startOffset);
      const approxStart = preRange.toString().length;

      // Find exact position of cleanText in state.postContent closest to approxStart
      const fullText = state.postContent || '';
      const occurrences: number[] = [];
      let idx = fullText.indexOf(text);
      if (idx === -1) {
        // Fallback to trim text search
        idx = fullText.indexOf(cleanText);
      }
      while (idx !== -1) {
        occurrences.push(idx);
        idx = fullText.indexOf(text, idx + 1);
      }

      if (occurrences.length > 0) {
        selectionStart = occurrences.reduce((prev, curr) =>
          Math.abs(curr - approxStart) < Math.abs(prev - approxStart) ? curr : prev
        );
      } else {
        selectionStart = approxStart;
      }
      const selectionEnd = selectionStart + text.length;

      const existing = state.highlightSelections || [];

      // 1. Check for exact match (same text or same start/end bounds)
      const exactMatch = existing.find(s =>
        s.text.trim() === cleanText ||
        (Math.abs(s.start - selectionStart) <= 1 && Math.abs(s.end - selectionEnd) <= 1)
      );

      if (exactMatch) {
        // Exact match: REMOVE that highlight segment!
        dispatch({
          type: 'REMOVE_HIGHLIGHT_SELECTION',
          payload: exactMatch.id
        });
      } else {
        // 2. Check for subset or overlap with an existing highlight
        const overlapping = existing.find(s =>
          (selectionStart >= s.start && selectionEnd <= s.end) || // subset inside existing
          (selectionStart < s.end && selectionEnd > s.start)      // partial overlap
        );

        if (overlapping) {
          // Subset or overlapping: group/merge with the larger highlight segment
          const mergedStart = Math.min(overlapping.start, selectionStart);
          const mergedEnd = Math.max(overlapping.end, selectionEnd);
          const fullPostText = state.postContent || '';
          const mergedText = fullPostText.slice(mergedStart, mergedEnd) || overlapping.text;

          dispatch({ type: 'REMOVE_HIGHLIGHT_SELECTION', payload: overlapping.id });
          dispatch({
            type: 'ADD_HIGHLIGHT_SELECTION',
            payload: {
              id: overlapping.id,
              text: mergedText,
              start: mergedStart,
              end: mergedEnd,
            }
          });
        } else {
          // 3. New independent highlight segment
          const newSelection = {
            id: `sel_${Date.now()}`,
            text,
            start: selectionStart,
            end: selectionEnd,
          };
          dispatch({
            type: 'ADD_HIGHLIGHT_SELECTION',
            payload: newSelection
          });
        }
      }

      window.getSelection()?.removeAllRanges();
    }
  };

  const handleCancelSelection = () => {
    setShowPopover(false);
    if (currentSelection) {
      dispatch({ type: 'REMOVE_HIGHLIGHT_SELECTION', payload: currentSelection.id });
    }
    setCurrentSelection(null);
  };

  const renderHighlightedBackdrop = (text: string, selections: Array<{ start: number, end: number }>) => {
    if (!text || selections.length === 0) return text;
    const sorted = [...selections].sort((a, b) => a.start - b.start);
    let lastIndex = 0;
    const elements: React.ReactNode[] = [];

    sorted.forEach((sel, idx) => {
      if (sel.start > lastIndex) {
        elements.push(<span key={`text-${idx}`}>{text.slice(lastIndex, sel.start)}</span>);
      }
      elements.push(
        <mark key={`mark-${idx}`} className="bg-amber-300/60 dark:bg-amber-500/40 text-transparent rounded-[3px]">
          {text.slice(sel.start, sel.end)}
        </mark>
      );
      lastIndex = sel.end;
    });
    if (lastIndex < text.length) {
      elements.push(<span key="text-last">{text.slice(lastIndex)}</span>);
    }

    return elements;
  };

  const handleSendHighlightEdit = () => {
    setShowPopover(false);
    setMobileMode('chat');
    // Focus the chat input
    setTimeout(() => {
      chatInputRef.current?.focus();
    }, 100);
  };

  // Helper function to generate contextual suggestions dynamically for highlighted text
  const getDynamicSuggestions = (selections: Array<{ text: string }>, topic?: string) => {
    if (selections.length === 0) return [];

    const fullSelectedText = selections.map(s => s.text).join(' ');
    const charCount = fullSelectedText.length;
    const isQuestion = fullSelectedText.includes('?') || fullSelectedText.includes('sao') || fullSelectedText.includes('gì');
    const hasNumbers = /\d+/.test(fullSelectedText);
    const hasEmotionalWords = /(thảm kịch|kinh hoàng|nỗi đau|xót xa|bàng hoàng|vô tội|nạn nhân|nghiêm trọng)/i.test(fullSelectedText);

    const suggestions: Array<{ label: string; prompt: string }> = [];

    // 1. Length-based suggestions
    if (charCount > 120) {
      suggestions.push({ label: '✨ Tóm tắt ngắn gọn', prompt: 'Rút gọn đoạn này lại súc tích, cô đọng nhất' });
    } else {
      suggestions.push({ label: '✍️ Bổ sung chi tiết', prompt: 'Viết mở rộng thêm chi tiết và góc nhìn sâu sắc hơn' });
    }

    // 2. Emotion / Tone suggestions based on content analysis
    if (hasEmotionalWords) {
      suggestions.push({ label: '💔 Tăng tính đồng cảm', prompt: 'Viết lại với văn phong sâu lắng, giàu cảm xúc và sự đồng cảm' });
      suggestions.push({ label: '📢 Văn phong thời sự', prompt: 'Chuyển sang giọng văn báo chí thời sự trung lập, khách quan' });
    } else {
      suggestions.push({ label: '🔥 Viết lại thu hút', prompt: 'Tạo giọng văn giật gân, cuốn hút gây sự chú ý mạnh mẽ' });
      suggestions.push({ label: '👔 Văn phong chuyên nghiệp', prompt: 'Chuyển sang văn phong chuyên nghiệp, chuẩn mực' });
    }

    // 3. Structure & CTA suggestions
    if (isQuestion) {
      suggestions.push({ label: '❓ Đặt câu hỏi mở', prompt: 'Chuyển đoạn này thành câu hỏi mở thảo luận cho cộng đồng' });
    } else if (hasNumbers) {
      suggestions.push({ label: '📊 Tóm tắt số liệu', prompt: 'Trình bày lại các con số/dữ liệu này rõ ràng và ấn tượng hơn' });
    } else {
      suggestions.push({ label: '📣 Thêm lời kêu gọi (CTA)', prompt: 'Thêm lời kêu gọi hành động (Call To Action) thúc đẩy tương tác ở cuối đoạn' });
    }

    // 4. Style & Formatting suggestion
    suggestions.push({ label: '✨ Tối ưu icon & hashtag', prompt: 'Bổ sung thêm emoji phù hợp và hashtag chuẩn bài' });
    suggestions.push({ label: '🎯 Đặt câu chốt ngắn', prompt: 'Tạo một câu kết thúc ngắn đắt giá và dễ nhớ' });

    return suggestions.slice(0, 6);
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    if (state.highlightSelections.length > 0) {
      editHighlighted(chatInput);
    } else {
      sendAssistantChat(chatInput);
    }
    setChatInput('');
  };

  const getPlatformIcon = (platform: string) => {
    if (platform === 'facebook') return <Facebook className="w-4 h-4 text-[#1877F2]" />;
    if (platform === 'instagram') return <Instagram className="w-4 h-4 text-[#E1306C]" />;
    if (platform === 'threads') return <ThreadsIcon size={16} className="text-black dark:text-white" />;
    return null;
  };



  return (
    <div className="w-full flex-grow flex flex-col md:flex-row h-[calc(100vh-130px)] min-h-[720px] overflow-hidden relative border border-gray-200 dark:border-zinc-800/60 rounded-3xl bg-card">

      {/* Mobile Tab Swapper */}
      <div className="md:hidden flex border-b border-gray-150 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900">
        <button
          onClick={() => setMobileMode('canvas')}
          className={`flex-1 py-3 text-sm font-bold border-b-2 transition-all ${mobileMode === 'canvas' ? 'border-primary text-primary' : 'border-transparent text-text-muted'
            }`}
        >
          {t('creator.stepper.step3')}
        </button>
        <button
          onClick={() => setMobileMode('chat')}
          className={`flex-1 py-3 text-sm font-bold border-b-2 transition-all ${mobileMode === 'chat' ? 'border-primary text-primary' : 'border-transparent text-text-muted'
            }`}
        >
          {t('creator.step4.assistantTitle')}
        </button>
      </div>

      {/* LEFT COLUMN: CANVAS POST PREVIEW (63% width) */}
      <section
        className={`w-full md:w-[63%] h-full flex flex-col border-r border-gray-200 dark:border-zinc-800/60 transition-all relative ${mobileMode === 'canvas' ? 'flex' : 'hidden md:flex'
          }`}
      >
        {/* Editor Top Toolbar */}
        <div className="px-6 h-[64px] flex items-center justify-between gap-4 border-b border-gray-200 dark:border-zinc-800/60 bg-white dark:bg-zinc-900 select-none flex-shrink-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <Globe className="w-4 h-4 text-text-muted shrink-0" />
            <span className="font-bold text-sm text-text truncate max-w-[260px] sm:max-w-[380px]">
              {editableTitle || state.articleContext?.title || "Vụ cháy xe khách làm 7 người chết ở Đồng..."}
            </span>
            <span className="bg-indigo-50 text-primary dark:bg-indigo-950/20 dark:text-primary text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider shrink-0">
              {t('creator.step4.statusEditing')}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => regeneratePostContent()}
              disabled={state.isGeneratingPost}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-gray-300 dark:border-zinc-700 text-xs font-bold text-text-muted hover:text-text hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all cursor-pointer disabled:opacity-50 shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${state.isGeneratingPost ? 'animate-spin' : ''}`} />
              <span>{t('creator.step4.regenerateBtn')}</span>
            </button>
          </div>
        </div>

        {/* Platform Indicator Tabs */}
        <div className="px-6 bg-white dark:bg-zinc-900 flex select-none border-b border-gray-200 dark:border-zinc-800/60 gap-4">
          {(state.selectedPlatforms.length > 0 ? state.selectedPlatforms : ['facebook'] as const).map((platform) => {
            const isActive = state.selectedPlatform === platform;
            return (
              <button
                key={platform}
                onClick={() => {
                  dispatch({ type: 'SET_PLATFORM', payload: platform });
                  const hasDraft = !!state.drafts[platform]?.content;
                  if (!hasDraft && !state.isGeneratingPost && state.articleContext && state.articleId) {
                    generateAIContent();
                  }
                }}
                className={`py-3 px-1 text-sm font-bold flex items-center gap-1.5 transition-all border-b-2 ${isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-muted hover:text-text'
                  }`}
              >
                <span className="flex-shrink-0">{getPlatformIcon(platform)}</span>
                <span className="capitalize">{platform}</span>
                {isActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />}
              </button>
            );
          })}
        </div>

        {/* Canvas Post Preview Area */}
        <div
          className="flex-grow overflow-y-auto p-4 md:p-8 bg-gray-55 dark:bg-zinc-950/20 select-text relative"
          onMouseUp={handleSelectionCheck}
        >
          {state.isGeneratingPost ? (
            <div className="max-w-3xl mx-auto space-y-6 pt-6">
              <div className="flex items-center gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="text-sm font-bold text-text animate-pulse">{t('creator.step4.generatingText')}</span>
              </div>
              <div className="space-y-3 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-gray-150 dark:border-zinc-800">
                <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-3/4 animate-pulse"></div>
                <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-5/6 animate-pulse"></div>
                <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded animate-pulse"></div>
                <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-2/3 animate-pulse"></div>
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-3 relative">
              {/* Floating Sticky Display Options Control Button aligned to card top-right */}
              <div className="sticky top-0 z-40 flex justify-end pointer-events-none -mb-1.5">
                <div className="relative pointer-events-auto">
                  <button
                    type="button"
                    onClick={() => setShowDisplayOptionsPopover(prev => !prev)}
                    className="px-3 py-1.5 rounded-full bg-white dark:bg-zinc-800 text-slate-700 dark:text-slate-200 border border-gray-200 dark:border-zinc-700 shadow-md hover:shadow-lg hover:bg-gray-50 dark:hover:bg-zinc-750 transition-all flex items-center gap-2 text-xs font-bold active:scale-95 cursor-pointer"
                    title={t('creator.step4.displayOptions.buttonTitle')}
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-bold">{t('creator.step4.displayOptions.buttonTitle')}</span>
                    {hiddenOptionsCount > 0 && (
                      <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-black flex items-center justify-center">
                        {hiddenOptionsCount}
                      </span>
                    )}
                  </button>

                  {/* Display Options Popover Menu */}
                  {showDisplayOptionsPopover && (
                    <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-xl p-4 z-50 animate-scale-up space-y-3 font-sans select-none">
                      <div className="flex items-center justify-between border-b border-gray-100 dark:border-zinc-800 pb-2">
                        <h4 className="text-xs font-extrabold text-text uppercase tracking-wider">
                          {t('creator.step4.displayOptions.popoverTitle')}
                        </h4>
                        <button
                          type="button"
                          onClick={() => setShowDisplayOptionsPopover(false)}
                          className="text-text-muted hover:text-text p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Toggle Controls List */}
                      <div className="space-y-1.5">
                        {[
                          { key: 'showTitle', label: t('creator.step4.displayOptions.showTitle') },
                          { key: 'showContent', label: t('creator.step4.displayOptions.showContent') },
                          { key: 'showImages', label: t('creator.step4.displayOptions.showImages') },
                          { key: 'showAuthor', label: t('creator.step4.displayOptions.showAuthor') },
                          { key: 'showHashtags', label: t('creator.step4.displayOptions.showHashtags') },
                        ].map((opt) => {
                          const isChecked = displayOptions[opt.key as keyof typeof displayOptions] ?? true;
                          return (
                            <label
                              key={opt.key}
                              className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-800/60 cursor-pointer transition-colors"
                            >
                              <span className="text-xs font-bold text-text">{opt.label}</span>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  dispatch({
                                    type: 'SET_DISPLAY_OPTIONS',
                                    payload: { [opt.key]: e.target.checked }
                                  });
                                }}
                                className="w-4 h-4 rounded border-gray-300 dark:border-zinc-700 text-primary focus:ring-primary accent-primary cursor-pointer"
                              />
                            </label>
                          );
                        })}
                      </div>

                      {/* Quick Selectors */}
                      <div className="flex items-center justify-between border-t border-gray-100 dark:border-zinc-800 pt-2 text-[11px]">
                        <button
                          type="button"
                          onClick={() => {
                            dispatch({
                              type: 'SET_DISPLAY_OPTIONS',
                              payload: { showTitle: true, showContent: true, showImages: true, showAuthor: true, showHashtags: true }
                            });
                          }}
                          className="text-primary font-bold hover:underline cursor-pointer"
                        >
                          {t('creator.step4.displayOptions.selectAll')}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            dispatch({
                              type: 'SET_DISPLAY_OPTIONS',
                              payload: { showTitle: false, showContent: false, showImages: false, showAuthor: false, showHashtags: false }
                            });
                          }}
                          className="text-text-muted font-bold hover:underline cursor-pointer"
                        >
                          {t('creator.step4.displayOptions.deselectAll')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* FACEBOOK PREVIEW */}
              {currentPlatform === 'facebook' && (
                <div className={`w-full bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-slate-200 dark:border-zinc-800 transition-all overflow-hidden ${flashContent ? 'ring-2 ring-primary ring-offset-2 dark:ring-offset-black scale-[1.01]' : ''
                  }`}>
                  {/* Post Header */}
                  <div className="p-6 pb-3 flex items-center justify-between select-none">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#ff6b00] text-white flex items-center justify-center font-extrabold text-lg select-none shadow-sm">
                        A
                      </div>
                      <div>
                        <div className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1">
                          <span>AntBiz Official</span>
                          <CheckCircle2 className="w-4 h-4 text-[#1877F2] fill-[#1877F2] inline-block shrink-0" />
                        </div>
                        <div className="text-xs text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                          <span>7 giờ</span>
                          <span>•</span>
                          <Globe className="w-3 h-3 text-slate-400 inline-block" />
                        </div>
                      </div>
                    </div>
                    <MoreHorizontal className="w-5 h-5 text-slate-400 cursor-pointer" />
                  </div>

                  {/* Post Body Content */}
                  <div className="px-6 py-2 select-text">
                    {renderEditableTitle()}

                    {/* Post Text Editor */}
                    {displayOptions.showContent && (
                      <>
                        <div className={`relative min-h-[120px] my-3 ${isLongContent && !isExpanded ? 'max-h-[180px] overflow-hidden' : ''}`}>
                          {state.isHighlightEditing && (
                            <div className="absolute inset-0 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-[1px] z-25 flex items-center justify-center rounded-xl animate-fade-in select-none">
                              <div className="bg-white dark:bg-zinc-800 px-4 py-2.5 rounded-2xl shadow-xl border border-amber-250 dark:border-zinc-700 flex items-center gap-3 select-none">
                                <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                                <span className="text-xs font-bold text-text animate-pulse">AI đang viết lại đoạn đã chọn...</span>
                              </div>
                            </div>
                          )}
                          <div className="absolute inset-0 text-xs md:text-sm leading-relaxed whitespace-pre-wrap font-sans text-transparent pointer-events-none z-0 overflow-hidden">
                            {renderHighlightedBackdrop(displayedContent, state.highlightSelections)}
                          </div>
                          <div
                            key={`${isExpanded ? 'exp' : 'col'}_${state.postContent}`}
                            ref={editorRef}
                            contentEditable={!state.isGeneratingPost && !state.isHighlightEditing}
                            suppressContentEditableWarning
                            onBlur={(e) => {
                              const newText = e.currentTarget.innerText;
                              const hashtagsStr = effectiveHashtags.length > 0 ? '\n\n' + effectiveHashtags.join(' ') : '';
                              dispatch({ type: 'SET_POST_CONTENT', payload: newText + hashtagsStr });
                            }}
                            className="text-xs md:text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap outline-none font-sans min-h-[120px] bg-transparent focus:ring-0 focus:outline-none relative z-10"
                          >
                            {displayedContent || "Nội dung bài viết sẽ hiển thị ở đây sau khi sinh..."}
                          </div>
                          {isLongContent && !isExpanded && (
                            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white dark:from-zinc-900 to-transparent pointer-events-none z-20" />
                          )}
                        </div>

                        {isLongContent && (
                          <button
                            type="button"
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="text-[#ff6b00] font-bold text-xs cursor-pointer hover:underline inline-block mb-3 border-0 bg-transparent p-0"
                          >
                            {isExpanded ? 'Thu gọn' : 'Xem thêm'}
                          </button>
                        )}

                        {/* Dashed Separator & Char Count */}
                        <div className="w-full border-b border-dashed border-slate-250 dark:border-zinc-700 my-2" />
                        <div className="text-[11px] font-bold text-slate-400 text-right mb-3">
                          {formattedCounter}
                        </div>
                      </>
                    )}

                    {/* Author & Hashtags */}
                    {displayOptions.showAuthor && (
                      <div className="text-xs text-slate-500 font-medium mb-2">
                        Tác giả: <span className="font-bold text-slate-700 dark:text-slate-300">{authorName}</span>
                      </div>
                    )}

                    {renderEditableHashtags()}
                  </div>

                  {/* Multi-Image Grid for Facebook */}
                  {displayOptions.showImages && renderMultiImageGrid(postImages)}

                  {/* Post Footer Action Bar */}
                  <div className="border-t border-slate-150 dark:border-zinc-800 py-2.5 px-4 grid grid-cols-3 text-center text-xs font-bold text-slate-600 dark:text-slate-300 select-none">
                    <button className="flex items-center justify-center gap-2 hover:bg-slate-100 dark:hover:bg-zinc-800 py-2 rounded-xl transition-colors cursor-pointer border-0 bg-transparent">
                      <ThumbsUp size={16} />
                      <span>Thích</span>
                    </button>
                    <button className="flex items-center justify-center gap-2 hover:bg-slate-100 dark:hover:bg-zinc-800 py-2 rounded-xl transition-colors cursor-pointer border-0 bg-transparent">
                      <MessageSquare size={16} />
                      <span>Bình luận</span>
                    </button>
                    <button className="flex items-center justify-center gap-2 hover:bg-slate-100 dark:hover:bg-zinc-800 py-2 rounded-xl transition-colors cursor-pointer border-0 bg-transparent">
                      <Share2 size={16} />
                      <span>Chia sẻ</span>
                    </button>
                  </div>
                </div>
              )}

              {/* THREADS PREVIEW */}
              {currentPlatform === 'threads' && (
                <div className={`w-full bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-slate-200 dark:border-zinc-800 p-6 md:p-8 transition-all space-y-4 ${flashContent ? 'ring-2 ring-primary ring-offset-2 dark:ring-offset-black scale-[1.01]' : ''
                  }`}>
                  {/* MAIN POST 1 BLOCK */}
                  <div className="flex gap-4">
                    {/* Left Column: Avatar 1 + Connecting Line */}
                    <div className="flex flex-col items-center shrink-0">
                      <div className="relative shrink-0">
                        <div className="w-10 h-10 rounded-full bg-[#ff6b00] text-white flex items-center justify-center font-extrabold text-lg select-none shadow-sm">
                          A
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-black dark:bg-white text-white dark:text-black flex items-center justify-center text-[10px] font-black border-2 border-white dark:border-zinc-900">
                          +
                        </div>
                      </div>

                      {/* Vertical Thread Line running to bottom of Post 1 */}
                      <div className="w-0.5 flex-grow bg-slate-200 dark:bg-zinc-700 mt-2 -mb-5 rounded-full min-h-[40px]" />
                    </div>

                    {/* Right Content 1 */}
                    <div className="flex-1 min-w-0 select-text pb-4">
                      <div className="flex items-center justify-between select-none mb-2">
                        <span className="text-sm font-black text-slate-900 dark:text-white">antbiz_official</span>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <span>1 giờ trước</span>
                          <MoreHorizontal className="w-4 h-4 cursor-pointer" />
                        </div>
                      </div>

                      {renderEditableTitle()}

                      {/* Editor Text Area */}
                      {displayOptions.showContent && (
                        <>
                          <div className={`relative min-h-[120px] my-3 ${isLongContent && !isExpanded ? 'max-h-[180px] overflow-hidden' : ''}`}>
                            {state.isHighlightEditing && (
                              <div className="absolute inset-0 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-[1px] z-25 flex items-center justify-center rounded-xl animate-fade-in select-none">
                                <div className="bg-white dark:bg-zinc-800 px-4 py-2.5 rounded-2xl shadow-xl border border-amber-250 dark:border-zinc-700 flex items-center gap-3 select-none">
                                  <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                                  <span className="text-xs font-bold text-text animate-pulse">AI đang viết lại đoạn đã chọn...</span>
                                </div>
                              </div>
                            )}
                            <div className="absolute inset-0 text-xs md:text-sm leading-relaxed whitespace-pre-wrap font-sans text-transparent pointer-events-none z-0 overflow-hidden">
                              {renderHighlightedBackdrop(displayedContent, state.highlightSelections)}
                            </div>
                            <div
                              key={`${isExpanded ? 'exp' : 'col'}_${state.postContent}`}
                              ref={editorRef}
                              contentEditable={!state.isGeneratingPost && !state.isHighlightEditing}
                              suppressContentEditableWarning
                              onBlur={(e) => {
                                dispatch({ type: 'SET_POST_CONTENT', payload: e.currentTarget.innerText });
                              }}
                              className="text-xs md:text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap outline-none font-sans min-h-[120px] bg-transparent focus:ring-0 focus:outline-none relative z-10"
                            >
                              {displayedContent || "Nội dung bài viết sẽ hiển thị ở đây sau khi sinh..."}
                            </div>
                            {isLongContent && !isExpanded && (
                              <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white dark:from-zinc-900 to-transparent pointer-events-none z-20" />
                            )}
                          </div>

                          {isLongContent && (
                            <button
                              type="button"
                              onClick={() => setIsExpanded(!isExpanded)}
                              className="text-[#ff6b00] font-bold text-xs cursor-pointer hover:underline inline-block mb-3 border-0 bg-transparent p-0"
                            >
                              {isExpanded ? 'Thu gọn' : 'Xem thêm'}
                            </button>
                          )}

                          {/* Dashed Separator & Right Aligned Char Counter */}
                          <div className="w-full border-b border-dashed border-slate-250 dark:border-zinc-700 my-2" />
                          <div className="text-[11px] font-bold text-slate-400 text-right mb-2">
                            {formattedCounter}
                          </div>
                        </>
                      )}

                      {/* 1/2 Badge */}
                      <div className="mb-3">
                        <span className="bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 text-[10px] font-bold px-2 py-0.5 rounded-md">1/2</span>
                      </div>

                      {/* Author & Hashtags */}
                      {displayOptions.showAuthor && (
                        <div className="text-xs text-slate-500 font-medium mb-2">
                          Tác giả: <span className="font-bold text-slate-700 dark:text-slate-300">{authorName}</span>
                        </div>
                      )}

                      {renderEditableHashtags()}

                      {/* Horizontal Draggable Carousel for Threads */}
                      {displayOptions.showImages && renderThreadsCarousel(postImages)}

                      {/* Action icons */}
                      <div className="flex items-center gap-5 text-slate-600 dark:text-slate-300 pt-1">
                        <Heart size={18} className="cursor-pointer hover:text-red-500 transition-colors" />
                        <MessageCircle size={18} className="cursor-pointer hover:text-blue-500 transition-colors" />
                        <Repeat2 size={18} className="cursor-pointer hover:text-green-500 transition-colors" />
                        <Send size={18} className="cursor-pointer hover:text-primary transition-colors" />
                      </div>
                    </div>
                  </div>

                  {/* THREAD REPLY POST 2 BLOCK */}
                  <div className="flex gap-4 pt-4 border-t border-slate-100 dark:border-zinc-800/80">
                    {/* Left Column: Avatar 2 */}
                    <div className="flex flex-col items-center shrink-0">
                      <div className="relative shrink-0">
                        <div className="w-10 h-10 rounded-full bg-[#ff6b00] text-white flex items-center justify-center font-extrabold text-lg select-none shadow-sm">
                          A
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-black dark:bg-white text-white dark:text-black flex items-center justify-center text-[10px] font-black border-2 border-white dark:border-zinc-900">
                          +
                        </div>
                      </div>
                    </div>

                    {/* Right Content 2 */}
                    <div className="flex-1 min-w-0 select-text">
                      <div className="flex items-center justify-between select-none mb-2">
                        <span className="text-sm font-black text-slate-900 dark:text-white">antbiz_official</span>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <span>1 giờ trước</span>
                          <MoreHorizontal className="w-4 h-4 cursor-pointer" />
                        </div>
                      </div>

                      <div className="text-xs font-medium text-blue-600 dark:text-blue-400 truncate flex items-center gap-2 mb-3">
                        <span className="text-slate-700 dark:text-slate-300 font-bold shrink-0">&gt;&gt;&gt; Xem chi tiết:</span>
                        <span className="underline truncate">{state.articleContext?.sourceUrl || 'https://gocnhinmoi.com.vn/tay-...'}</span>
                        <span className="bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0">2/2</span>
                      </div>

                      <div className="flex items-center gap-5 text-slate-600 dark:text-slate-300">
                        <Heart size={18} className="cursor-pointer hover:text-red-500 transition-colors" />
                        <MessageCircle size={18} className="cursor-pointer hover:text-blue-500 transition-colors" />
                        <Repeat2 size={18} className="cursor-pointer hover:text-green-500 transition-colors" />
                        <Send size={18} className="cursor-pointer hover:text-primary transition-colors" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* INSTAGRAM PREVIEW */}
              {currentPlatform === 'instagram' && (
                <div className={`w-full bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-slate-200 dark:border-zinc-800 transition-all overflow-hidden ${flashContent ? 'ring-2 ring-primary ring-offset-2 dark:ring-offset-black scale-[1.01]' : ''
                  }`}>
                  {/* Post Header */}
                  <div className="p-4 flex items-center justify-between select-none">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#ff6b00] text-white flex items-center justify-center font-extrabold text-lg select-none shadow-sm">
                        A
                      </div>
                      <div>
                        <div className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1">
                          <span>antbiz_official</span>
                          <CheckCircle2 className="w-4 h-4 text-[#1877F2] fill-[#1877F2] inline-block shrink-0" />
                        </div>
                        <div className="text-xs text-slate-400 font-medium">
                          Hồ Chí Minh
                        </div>
                      </div>
                    </div>
                    <MoreHorizontal className="w-5 h-5 text-slate-400 cursor-pointer" />
                  </div>

                  {/* MEDIA IMAGES CAROUSEL FOR INSTAGRAM */}
                  {displayOptions.showImages && renderInstagramCarousel(postImages)}

                  {/* Instagram Action Icons & Likes */}
                  <div className="p-4 pb-6 select-none">
                    <div className="flex items-center gap-4 text-slate-800 dark:text-white mb-3">
                      <Heart size={22} className="cursor-pointer hover:text-red-500 transition-colors" />
                      <MessageCircle size={22} className="cursor-pointer hover:text-blue-500 transition-colors" />
                      <Send size={22} className="cursor-pointer hover:text-primary transition-colors" />
                    </div>

                    <div className="text-xs font-black text-slate-900 dark:text-white mb-3 select-text">
                      Liked by <span className="font-extrabold">john_doe</span> and <span className="font-extrabold">42 others</span>
                    </div>

                    {/* Body Content */}
                    <div className="select-text">
                      {renderEditableTitle()}

                      <div className="font-black text-slate-900 dark:text-white text-sm mt-3 mb-2">
                        antbiz_official
                      </div>

                      {displayOptions.showContent && (
                        <>
                          <div className={`relative min-h-[100px] my-2 ${isLongContent && !isExpanded ? 'max-h-[180px] overflow-hidden' : ''}`}>
                            {state.isHighlightEditing && (
                              <div className="absolute inset-0 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-[1px] z-25 flex items-center justify-center rounded-xl animate-fade-in select-none">
                                <div className="bg-white dark:bg-zinc-800 px-4 py-2.5 rounded-2xl shadow-xl border border-amber-250 dark:border-zinc-700 flex items-center gap-3 select-none">
                                  <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                                  <span className="text-xs font-bold text-text animate-pulse">AI đang viết lại đoạn đã chọn...</span>
                                </div>
                              </div>
                            )}
                            <div className="absolute inset-0 text-xs md:text-sm leading-relaxed whitespace-pre-wrap font-sans text-transparent pointer-events-none z-0 overflow-hidden">
                              {renderHighlightedBackdrop(displayedContent, state.highlightSelections)}
                            </div>
                            <div
                              key={`${isExpanded ? 'exp' : 'col'}_${state.postContent}`}
                              ref={editorRef}
                              contentEditable={!state.isGeneratingPost && !state.isHighlightEditing}
                              suppressContentEditableWarning
                              onBlur={(e) => {
                                dispatch({ type: 'SET_POST_CONTENT', payload: e.currentTarget.innerText });
                              }}
                              className="text-xs md:text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap outline-none font-sans min-h-[100px] bg-transparent focus:ring-0 focus:outline-none relative z-10"
                            >
                              {displayedContent || "Nội dung bài viết sẽ hiển thị ở đây sau khi sinh..."}
                            </div>
                            {isLongContent && !isExpanded && (
                              <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white dark:from-zinc-900 to-transparent pointer-events-none z-20" />
                            )}
                          </div>

                          {isLongContent && (
                            <button
                              type="button"
                              onClick={() => setIsExpanded(!isExpanded)}
                              className="text-[#ff6b00] font-bold text-xs cursor-pointer hover:underline inline-block mb-3 border-0 bg-transparent p-0"
                            >
                              {isExpanded ? 'Thu gọn' : 'Xem thêm'}
                            </button>
                          )}

                          {/* Dashed separator & Counter */}
                          <div className="w-full border-b border-dashed border-slate-250 dark:border-zinc-700 my-2" />
                          <div className="text-[11px] font-bold text-slate-400 text-right mb-3">
                            {formattedCounter}
                          </div>
                        </>
                      )}

                      {/* Author & Hashtags */}
                      {displayOptions.showAuthor && (
                        <div className="text-xs text-slate-500 font-medium mb-2">
                          Tác giả: <span className="font-bold text-slate-700 dark:text-slate-300">{authorName}</span>
                        </div>
                      )}

                      {renderEditableHashtags()}
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}


        </div>
      </section>

      {/* RIGHT COLUMN: AI CHAT SIDEBAR (37% width) */}
      <aside
        className={`w-full md:w-[37%] h-full flex flex-col bg-gray-55 dark:bg-zinc-900/10 backdrop-blur-md transition-all ${mobileMode === 'chat' ? 'flex' : 'hidden md:flex'
          }`}
      >
        {/* Chat sidebar header */}
        <div className="px-4 h-[64px] flex items-center justify-between border-b border-gray-200 dark:border-zinc-800/60 bg-white dark:bg-zinc-900 flex-shrink-0 select-none">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-primary flex items-center justify-center shrink-0">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-extrabold text-sm text-text">{t('creator.step4.assistantTitle')}</h3>
                <span className="bg-[#E8F8F0] dark:bg-emerald-950/40 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider">PRO</span>
              </div>
              <p className="text-[10px] text-text-muted">{t('creator.step4.assistantSubtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-text-muted">
            <button type="button" className="p-1 rounded hover:bg-gray-100 dark:hover:bg-zinc-800 text-text-muted hover:text-text cursor-pointer" title="Thu nhỏ"><Minus className="w-4 h-4" /></button>
            <button type="button" className="p-1 rounded hover:bg-gray-100 dark:hover:bg-zinc-800 text-text-muted hover:text-text cursor-pointer" title="Tùy chọn"><MoreVertical className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Chat bubble logs */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {state.chatMessages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-text-muted text-xs gap-2 select-none">
              <Cpu className="w-8 h-8 opacity-45" />
              <span>{t('creator.step4.emptyChatHint')}</span>
            </div>
          )}
          <AnimatePresence initial={false}>
            {state.chatMessages.map((msg, idx) => {
              const isAI = msg.sender === 'ai';

              let quotedText = msg.quotedText;
              let userPrompt = msg.text;

              if (!quotedText && msg.text.startsWith('[Sửa đoạn:')) {
                const match = msg.text.match(/^\[Sửa đoạn:\s*([\s\S]+?)\]:\s*([\s\S]+)$/);
                if (match) {
                  quotedText = match[1];
                  userPrompt = match[2];
                }
              }

              if (!isAI && quotedText) {
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9, y: -10, transition: { duration: 0.2 } }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    className="flex flex-col items-end space-y-0 relative w-[90%] ml-auto select-text group"
                  >
                    {/* Top Quoted Bubble */}
                    <QuotedTextBubble text={quotedText} />
                    {/* Bottom User Instruction Bubble */}
                    <div className="-mt-2.5 w-[82%] bg-primary text-white text-sm font-medium p-3.5 rounded-2xl rounded-tr-xs shadow-md leading-relaxed whitespace-pre-wrap z-10 flex flex-col gap-1.5">
                      <div>{userPrompt}</div>
                      <div className="flex items-center justify-end gap-2 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity duration-200 pt-0.5 select-none">
                        {msg.timestamp && <span>{msg.timestamp}</span>}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleRestore(idx);
                          }}
                          className="p-1 rounded-md hover:bg-white/20 active:scale-95 text-white transition-all cursor-pointer border border-white/20 shadow-xs shrink-0"
                          title="Khôi phục bài viết về mốc này"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              }

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9, y: -10, transition: { duration: 0.2 } }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className={`group relative flex gap-3 ${isAI ? 'max-w-[88%] mr-auto' : 'w-[75%] ml-auto flex-row-reverse'}`}
                >
                  {isAI && (
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Cpu className="w-4 h-4" />
                    </div>
                  )}
                  <div className="flex flex-col min-w-0 w-full">
                    <div className={`rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-xs ${isAI
                      ? 'bg-[#F4F5F9] dark:bg-zinc-800 text-text rounded-tl-none border border-gray-100 dark:border-zinc-800/55 whitespace-pre-wrap'
                      : 'bg-primary text-white rounded-tr-none whitespace-pre-wrap flex flex-col gap-1.5 w-full'
                      }`}>
                      {isAI ? (
                        msg.text
                      ) : (
                        <>
                          <div>{msg.text}</div>
                          <div className="flex items-center justify-end gap-2 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity duration-200 pt-0.5 select-none">
                            {msg.timestamp && <span>{msg.timestamp}</span>}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleRestore(idx);
                              }}
                              className="p-1 rounded-md hover:bg-white/20 active:scale-95 text-white transition-all cursor-pointer border border-white/20 shadow-xs shrink-0"
                              title="Khôi phục bài viết về mốc này"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>

                    {isAI && msg.modelUsed && (
                      <div className="flex items-center gap-1.5 mt-1.5 px-1 select-none">
                        <span className="text-[9px] font-bold text-text-muted/70 flex items-center gap-1 uppercase tracking-wider">
                          <Sparkles className="w-2.5 h-2.5 text-yellow-500" />
                          <span>Powered by {msg.modelUsed}</span>
                        </span>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}

            {/* AI Thinking Animation State */}
            {(state.isChatSending || state.isHighlightEditing) && (
              <motion.div
                key="thinking-state"
                initial={{ opacity: 0, y: 10, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, y: -5, transition: { duration: 0.15 } }}
                transition={{ duration: 0.2 }}
                className="group relative flex gap-3 max-w-[88%] mr-auto select-none"
              >
                <div className="relative w-8 h-8 rounded-full bg-gradient-to-tr from-primary/20 via-primary/10 to-amber-500/20 text-primary flex items-center justify-center flex-shrink-0 mt-0.5 border border-primary/20 shadow-xs">
                  <Cpu className="w-4 h-4 animate-pulse text-primary" />
                  <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
                  </span>
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="bg-[#F4F5F9] dark:bg-zinc-800 text-text rounded-2xl rounded-tl-none p-4 text-sm border border-gray-100 dark:border-zinc-800/55 shadow-xs flex items-center gap-3">
                    <div className="flex items-center gap-1.5 px-0.5">
                      <span className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]"></span>
                      <span className="w-2 h-2 rounded-full bg-primary/80 animate-bounce [animation-delay:-0.15s]"></span>
                      <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce"></span>
                    </div>
                    <span className="text-xs font-medium text-text-muted animate-pulse">
                      {state.isHighlightEditing ? "AI đang phân tích & tinh chỉnh đoạn văn..." : "AI đang suy nghĩ & biên tập..."}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          {/* End of chat messages container */}
        </div>

        {/* Quick Suggestion Chips (Only visible when text is highlighted and after Gemini 3.1 Flash Lite finishes generating) */}
        {state.highlightSelections.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-200 dark:border-zinc-800/60 bg-white dark:bg-zinc-900 select-none animate-fade-in">
            {isGeneratingSuggestions ? (
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-text animate-pulse">
                      Gemini 3.1 Flash Lite đang sinh gợi ý...
                    </p>
                    <p className="text-[10px] text-text-muted">Đang phân tích đoạn văn để tạo các hướng chỉnh sửa tối ưu</p>
                  </div>
                </div>
                <span className="text-[9px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-primary px-2 py-0.5 rounded-full uppercase tracking-wider border border-emerald-200/50 dark:border-emerald-800/40">
                  Gemini 3.1 Flash Lite
                </span>
              </div>
            ) : aiSuggestions.length > 0 ? (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-text flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-primary fill-primary/20" />
                    <span>Gợi ý phong cách từ AI ({aiSuggestions.length})</span>
                  </p>
                  <span className="text-[10px] text-text-muted/80 font-medium flex items-center gap-1">
                    <span>Powered by</span>
                    <span className="font-bold text-primary">Gemini 3.1 Flash Lite</span>
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {aiSuggestions.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        editHighlighted(item.prompt);
                      }}
                      className="px-3 py-2 rounded-xl bg-gray-50 dark:bg-zinc-800/60 border border-gray-200/80 dark:border-zinc-700/60 text-text text-xs font-semibold hover:border-primary hover:text-primary hover:bg-primary/5 transition-all text-left truncate cursor-pointer shadow-2xs active:scale-95 flex items-center gap-1.5"
                      title={item.prompt}
                    >
                      <span className="truncate">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* Quick Title / Hashtag AI Actions when no text highlighted */}
        {state.highlightSelections.length === 0 && (
          <div className="px-4 py-2 bg-white/40 dark:bg-zinc-900/40 border-t border-gray-100 dark:border-zinc-800/40 flex items-center gap-2 overflow-x-auto select-none scrollbar-none">
            <button
              type="button"
              onClick={generateAITitle}
              disabled={state.isChatSending}
              className="px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-primary border border-emerald-200/60 dark:border-emerald-800/40 text-[11px] font-bold hover:bg-emerald-100 hover:border-emerald-300 dark:hover:bg-emerald-900 transition-all cursor-pointer shrink-0 flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
            >
              <Sparkles className="w-3 h-3" />
              <span>Viết lại Tiêu đề AI</span>
            </button>
            <button
              type="button"
              onClick={generateAIHashtags}
              disabled={state.isChatSending}
              className="px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-[#ff6b00] border border-amber-200/60 dark:border-amber-800/40 text-[11px] font-bold hover:bg-amber-100 hover:border-amber-300 dark:hover:bg-amber-900 transition-all cursor-pointer shrink-0 flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
            >
              <Wand2 className="w-3 h-3" />
              <span>Gợi ý Hashtags AI</span>
            </button>
          </div>
        )}

        {/* Chat input footer */}
        <div className="p-4 border-t border-gray-100 dark:border-zinc-800/40 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md space-y-2">
          {state.highlightSelections.length > 0 && (
            <div className="mb-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-250 dark:border-amber-900/40 rounded-xl p-2.5 flex flex-col gap-2 text-xs animate-fade-in select-none">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0 animate-pulse" />
                  <span className="text-text font-semibold">
                    {t('creator.step4.highlightEditingCount', { count: state.highlightSelections.length })}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'CLEAR_HIGHLIGHT_SELECTIONS' })}
                  className="text-text-muted hover:text-text p-1 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-full transition-colors shrink-0"
                  title="Xóa tất cả"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex flex-col gap-1 max-h-24 overflow-y-auto pr-1">
                {state.highlightSelections.map(sel => (
                  <div key={sel.id} className="flex items-center justify-between gap-2 bg-white/50 dark:bg-black/20 p-1.5 rounded-lg border border-amber-100 dark:border-amber-900/30">
                    <span className="italic text-text-muted truncate">"{sel.text}"</span>
                    <button
                      onClick={() => dispatch({ type: 'REMOVE_HIGHLIGHT_SELECTION', payload: sel.id })}
                      className="text-text-muted hover:text-red-500 shrink-0 transition-colors"
                      title="Xóa đoạn này"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <form onSubmit={handleSendChat} className="relative bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800/60 rounded-2xl shadow-sm focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all overflow-hidden p-2">
            <textarea
              ref={chatInputRef}
              disabled={state.isChatSending || state.isHighlightEditing || state.isGeneratingPost}
              className="w-full bg-transparent border-0 focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:outline-none outline-none shadow-none text-xs p-2 resize-none h-16 text-text placeholder-text-muted/65 disabled:opacity-60"
              placeholder={state.highlightSelections.length > 0 ? t('creator.step4.chatSelectionPlaceholder') : t('creator.step4.chatPlaceholder')}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendChat(e);
                }
              }}
            />
            {/* Input Bottom Action Toolbar */}
            <div className="flex items-center justify-between pt-1 px-1 select-none">
              <div className="flex items-center gap-1.5 text-text-muted">
                <button type="button" className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-text-muted hover:text-text cursor-pointer" title="Đính kèm tệp"><ImageIcon className="w-4 h-4" /></button>
                <button type="button" className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-text-muted hover:text-text cursor-pointer" title="Ghi âm"><Mic className="w-4 h-4" /></button>
                <button type="button" className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-text-muted hover:text-text cursor-pointer" title="Mẫu câu"><Paperclip className="w-4 h-4" /></button>
                <button type="button" className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-text-muted hover:text-text cursor-pointer" title="Tối ưu AI"><Sparkles className="w-4 h-4 text-amber-500" /></button>
              </div>
              <button
                type="submit"
                disabled={(!chatInput.trim() && state.highlightSelections.length === 0) || state.isChatSending || state.isHighlightEditing || state.isGeneratingPost}
                onClick={(e) => {
                  if (state.highlightSelections.length > 0 && !chatInput.trim()) {
                    e.preventDefault();
                    editHighlighted("Viết lại đoạn này hay hơn và tự nhiên hơn");
                  }
                }}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-95 duration-100 ${state.highlightSelections.length > 0 && !chatInput.trim()
                  ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-md cursor-pointer'
                  : 'bg-primary hover:bg-primary-hover text-white disabled:opacity-40 shadow-xs cursor-pointer'
                  }`}
                title={state.highlightSelections.length > 0 && !chatInput.trim() ? "Sửa nhanh" : "Gửi"}
              >
                {state.highlightSelections.length > 0 && !chatInput.trim() ? (
                  <Sparkles className="w-4 h-4" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
          </form>
        </div>
      </aside>





      {/* Style Presets Modal Portal */}
      {typeof window !== 'undefined' && createPortal(
        <AnimatePresence>
          {isPresetsOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 select-text font-sans">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsPresetsOpen(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[101]"
              />

              {/* Centered Modal Panel */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ type: 'spring', duration: 0.35 }}
                className="relative w-full max-w-2xl bg-white dark:bg-zinc-955 border border-gray-250 dark:border-zinc-850 z-[102] shadow-2xl rounded-3xl flex flex-col max-h-[85vh] overflow-hidden"
              >

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
                      placeholder={t('creator.step3.searchPlaceholder') || 'Tìm kiếm Presets...'}
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
                  .sort((a, b) => {
                    if (a.id === state.selectedPresetId) return -1;
                    if (b.id === state.selectedPresetId) return 1;
                    return 0;
                  })
                  .map((preset) => {
                    const isSelected = state.selectedPresetId === preset.id;
                    const isGeneratingThis = isSelected && state.isGeneratingPost;
                    return (
                      <div
                        key={preset.id}
                        onClick={() => {
                          if (state.isGeneratingPost) return; // Prevent clicking while generating
                          const newId = isSelected ? null : preset.id;
                          dispatch({ type: 'SET_SELECTED_PRESET', payload: newId });
                          regeneratePostContent(newId);
                        }}
                        className={`flex items-center justify-between p-4 transition-all ${
                          state.isGeneratingPost ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                        } ${isSelected
                          ? 'bg-primary/5 dark:bg-primary/5 hover:bg-primary/8'
                          : 'bg-white dark:bg-zinc-900/40 hover:bg-gray-55 dark:hover:bg-zinc-850/50'
                          }`}
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-gray-100 dark:bg-zinc-800 flex-shrink-0 text-text shadow-sm border border-gray-200/20">
                            {getPlatformIcon(preset.platform)}
                          </span>
                          <div className="min-w-0">
                            <h4 className={`text-xs font-bold text-text truncate flex items-center gap-2 ${isSelected ? 'text-primary' : ''}`}>
                              <span>{preset.name}</span>
                              {isGeneratingThis && (
                                <span className="text-[9px] font-medium text-primary animate-pulse bg-primary/10 px-2 py-0.5 rounded-md">
                                  Đang áp dụng...
                                </span>
                              )}
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

                          <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${isSelected
                            ? 'border-primary bg-primary text-white shadow-sm'
                            : 'border-gray-300 dark:border-zinc-700 bg-transparent'
                            }`}>
                            {isGeneratingThis ? (
                              <Loader2 className="w-3 h-3 animate-spin text-white" />
                            ) : isSelected ? (
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            ) : null}
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

              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Floating Style Presets Trigger Button */}
      <div
        className="fixed right-6 bottom-24 z-40 select-none"
      >
        <button
          onClick={() => setIsPresetsOpen(true)}
          className="h-12 w-12 hover:w-32 rounded-full bg-primary hover:bg-primary/95 text-white flex items-center justify-start pl-3.5 shadow-lg transition-all duration-300 ease-out active:scale-95 group relative animate-fade-in cursor-pointer"
          title="Chọn văn phong thương hiệu (Style Presets)"
        >
          <div className="flex items-center gap-2 overflow-hidden">
            <Bookmark className="w-5 h-5 flex-shrink-0 transition-transform duration-300 group-hover:rotate-6" />
            <span className="opacity-0 w-0 group-hover:opacity-100 group-hover:w-auto text-[10px] font-black tracking-wider transition-all duration-300 whitespace-nowrap uppercase">
              Văn phong
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
    </div>
  );
}
