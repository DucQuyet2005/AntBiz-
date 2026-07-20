'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  RefreshCw, Send, Sparkles,
  Cpu, Facebook, Instagram, X, Loader2, Globe,
  Bookmark, Check, Search, EyeOff, MoreHorizontal,
  ThumbsUp, MessageSquare, Share2, Heart, MessageCircle,
  Repeat2, CheckCircle2, ChevronLeft, ChevronRight, Wand2

} from 'lucide-react';
import { useCreatorFlow } from '@/frontend/modules/creator-flow';
import { createPortal } from 'react-dom';

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
    generateAIContent, 
    regeneratePostContent, 
    sendAssistantChat,
    editHighlighted
  } = useCreatorFlow();

  // Style Presets states
  const [isPresetsOpen, setIsPresetsOpen] = useState(false);
  const [presetSearch, setPresetSearch] = useState('');
  const [presetTab, setPresetTab] = useState<'system' | 'personal'>('personal');

  // Default fallback image when no article/crawled image exists
  const fallbackImage = 'https://images.unsplash.com/photo-1542626991-cbc4e32524cc?q=80&w=1000';

  // Determine active post preview images (prefer custom uploaded/crawled list first, then thumbnail fallback)
  const postImages: string[] = (state.crawledImageUrls && state.crawledImageUrls.length > 0)
    ? state.crawledImageUrls
    : state.articleContext?.thumbnail ? [state.articleContext.thumbnail] : [fallbackImage];
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

  // Formatting variables for preview cards
  const currentPlatform = state.selectedPlatform || 'facebook';
  const postContentText = state.postContent || '';
  const contentLength = postContentText.length;
  const wordCount = postContentText.trim() ? postContentText.trim().split(/\s+/).length : 0;
  
  const isLongContent = contentLength > 500;
  const displayedContent = (isLongContent && !isExpanded)
    ? postContentText.slice(0, 500) + '...'
    : postContentText;

  const maxCharLimit = currentPlatform === 'threads' ? '5,000' : currentPlatform === 'instagram' ? '2,200' : '63,206';
  const formattedCounter = `${contentLength.toLocaleString()} ký tự (~${wordCount} từ) / ${maxCharLimit} ký tự`;

  const validKeywords = (state.articleContext?.keywords || []).filter(
    k => !['manual', 'bài viết thủ công', 'nhập tay', 'tuoitre', 'dantri', 'gocnhinmoi'].includes(k.trim().toLowerCase())
  );

  const categoryTag = (validKeywords[0] && validKeywords[0].toLowerCase() !== 'manual')
    ? `[${validKeywords[0]}]`
    : '';

  const authorName = state.articleContext?.author || 'Ngọc Linh';
  const hashtags = validKeywords
    .map(k => '#' + (k.startsWith('#') ? k.slice(1) : k).replace(/\s+/g, ''))
    .filter(h => h.toLowerCase() !== '#manual');

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
            className="w-full aspect-square max-h-[500px] object-cover"
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = fallbackImage; }}
          />
        </div>
      );
    }

    const safeIndex = Math.min(igImageIndex, displayImages.length - 1);

    return (
      <div className="w-full select-none flex flex-col items-center">
        {/* Main Carousel Image Container */}
        <div className="w-full relative border-t border-b border-slate-100 dark:border-zinc-800 overflow-hidden bg-black aspect-square max-h-[500px]">
          {/* Horizontal Sliding Track */}
          <div
            className="flex w-full h-full transition-transform duration-300 ease-out"
            style={{ transform: `translateX(-${safeIndex * 100}%)` }}
          >
            {displayImages.map((img, idx) => (
              <div key={idx} className="w-full h-full shrink-0 flex-none relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img}
                  alt={`Instagram Post Media ${idx + 1}`}
                  className="w-full h-full object-cover"
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
              className={`rounded-full transition-all duration-200 border-0 p-0 cursor-pointer ${
                idx === safeIndex
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

  // References
  const editorRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
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
      const prefix = range.cloneRange();
      prefix.selectNodeContents(editorRef.current);
      prefix.setEnd(range.startContainer, range.startOffset);
      const selectionStart = prefix.toString().length;
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

  const renderHighlightedBackdrop = (text: string, selections: Array<{start: number, end: number}>) => {
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
    <div className="w-full flex-grow flex flex-col md:flex-row h-[calc(100vh-130px)] min-h-[720px] overflow-hidden relative border border-gray-200 dark:border-zinc-800 rounded-3xl bg-card">
      
      {/* Mobile Tab Swapper */}
      <div className="md:hidden flex border-b border-gray-150 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900">
        <button
          onClick={() => setMobileMode('canvas')}
          className={`flex-1 py-3 text-sm font-bold border-b-2 transition-all ${
            mobileMode === 'canvas' ? 'border-primary text-primary' : 'border-transparent text-text-muted'
          }`}
        >
          {t('creator.stepper.step3')}
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
        className={`w-full md:w-[63%] h-full flex flex-col border-r border-gray-200 dark:border-zinc-800 transition-all relative ${
          mobileMode === 'canvas' ? 'flex' : 'hidden md:flex'
        }`}
      >
        {/* Editor subheader */}
        <div className="px-6 h-[72px] flex items-center justify-between gap-6 border-b border-gray-150/10 dark:border-zinc-800/10 bg-white dark:bg-zinc-900 select-none flex-shrink-0">
          <div className="flex items-center gap-5 min-w-0">
            <div className="flex items-center gap-3 min-w-0">
              <Globe className="w-4 h-4 text-text-muted flex-shrink-0" />
              <span className="font-bold text-sm text-text truncate max-w-[240px] sm:max-w-[360px]">
                {editableTitle || "Tài liệu mới"}
              </span>
            </div>
            
            <span className="bg-indigo-50 text-primary dark:bg-indigo-950/20 dark:text-primary text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider flex-shrink-0">
              ĐANG CHỈNH SỬA
            </span>
          </div>
          
          <div className="flex items-center gap-3.5 flex-shrink-0">
            <button
              onClick={() => regeneratePostContent()}
              disabled={state.isGeneratingPost}
              className="flex items-center gap-1.5 text-xs font-bold text-text-muted hover:text-text border border-gray-250 dark:border-zinc-700 hover:bg-gray-55 dark:hover:bg-zinc-800 rounded-full px-4.5 py-2 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${state.isGeneratingPost ? 'animate-spin' : ''}`} />
              <span>Tạo lại bài đăng</span>
            </button>
          </div>
        </div>

        {/* Platform Indicator Tabs */}
        <div className="px-6 bg-white dark:bg-zinc-900 flex select-none border-b border-gray-150/20 dark:border-zinc-800/20 gap-4">
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
                className={`py-3 px-1 text-sm font-bold flex items-center gap-1.5 transition-all border-b-2 ${
                  isActive 
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
            <div className="max-w-3xl mx-auto space-y-4">

              {/* FACEBOOK PREVIEW */}
              {currentPlatform === 'facebook' && (
                <div className={`w-full bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-slate-200 dark:border-zinc-800 transition-all overflow-hidden ${
                  flashContent ? 'ring-2 ring-primary ring-offset-2 dark:ring-offset-black scale-[1.01]' : ''
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
                    <div className="mb-2">
                      <h3 className="font-black text-slate-900 dark:text-white text-base md:text-lg inline-block leading-snug">
                        {editableTitle || state.articleContext?.title}
                      </h3>
                    </div>

                    {/* Post Text Editor */}
                    <div className="relative min-h-[120px] my-3">
                      <div className="absolute inset-0 text-sm md:text-[15px] leading-relaxed whitespace-pre-wrap font-sans text-transparent pointer-events-none z-0 overflow-hidden">
                        {renderHighlightedBackdrop(displayedContent, state.highlightSelections)}
                      </div>
                      <div
                        key={isExpanded ? 'expanded' : 'collapsed'}
                        ref={editorRef}
                        contentEditable={!state.isGeneratingPost}
                        suppressContentEditableWarning
                        onBlur={(e) => {
                          dispatch({ type: 'SET_POST_CONTENT', payload: e.currentTarget.innerText });
                        }}
                        className="text-sm md:text-[15px] text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap outline-none font-sans min-h-[120px] bg-transparent focus:ring-0 focus:outline-none relative z-10"
                      >
                        {displayedContent || "Nội dung bài viết sẽ hiển thị ở đây sau khi sinh..."}
                      </div>
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

                    {/* Author & Hashtags */}
                    <div className="text-xs text-slate-500 font-medium mb-2">
                      Tác giả: <span className="font-bold text-slate-700 dark:text-slate-300">{authorName}</span>
                    </div>

                    {hashtags.length > 0 && (
                      <div className="flex flex-wrap gap-2 text-xs font-bold text-[#ff6b00] mb-4">
                        {hashtags.map((h, i) => (
                          <span key={i}>{h}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Multi-Image Grid for Facebook */}
                  {renderMultiImageGrid(postImages)}

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
                <div className={`w-full bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-slate-200 dark:border-zinc-800 p-6 md:p-8 transition-all space-y-4 ${
                  flashContent ? 'ring-2 ring-primary ring-offset-2 dark:ring-offset-black scale-[1.01]' : ''
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

                      <div className="mb-2">
                        <h3 className="font-black text-slate-900 dark:text-white text-base md:text-lg inline-block leading-snug">
                          {editableTitle || state.articleContext?.title}
                        </h3>
                      </div>

                      {/* Editor Text Area */}
                      <div className="relative min-h-[120px] my-3">
                        <div className="absolute inset-0 text-sm md:text-[15px] leading-relaxed whitespace-pre-wrap font-sans text-transparent pointer-events-none z-0 overflow-hidden">
                          {renderHighlightedBackdrop(displayedContent, state.highlightSelections)}
                        </div>
                        <div
                          key={isExpanded ? 'expanded' : 'collapsed'}
                          ref={editorRef}
                          contentEditable={!state.isGeneratingPost}
                          suppressContentEditableWarning
                          onBlur={(e) => {
                            dispatch({ type: 'SET_POST_CONTENT', payload: e.currentTarget.innerText });
                          }}
                          className="text-sm md:text-[15px] text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap outline-none font-sans min-h-[120px] bg-transparent focus:ring-0 focus:outline-none relative z-10"
                        >
                          {displayedContent || "Nội dung bài viết sẽ hiển thị ở đây sau khi sinh..."}
                        </div>
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

                      {/* 1/2 Badge */}
                      <div className="mb-3">
                        <span className="bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 text-[10px] font-bold px-2 py-0.5 rounded-md">1/2</span>
                      </div>

                      {/* Author & Hashtags */}
                      <div className="text-xs text-slate-500 font-medium mb-2">
                        Tác giả: <span className="font-bold text-slate-700 dark:text-slate-300">{authorName}</span>
                      </div>

                      {hashtags.length > 0 && (
                        <div className="flex flex-wrap gap-2 text-xs font-bold text-[#ff6b00] mb-4">
                          {hashtags.map((h, i) => (
                            <span key={i}>{h}</span>
                          ))}
                        </div>
                      )}

                      {/* Horizontal Draggable Carousel for Threads */}
                      {renderThreadsCarousel(postImages)}

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
                <div className={`w-full bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-slate-200 dark:border-zinc-800 transition-all overflow-hidden ${
                  flashContent ? 'ring-2 ring-primary ring-offset-2 dark:ring-offset-black scale-[1.01]' : ''
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
                  {renderInstagramCarousel(postImages)}

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
                      <div className="mb-2">
                        <h3 className="font-black text-slate-900 dark:text-white text-base md:text-lg inline-block leading-snug">
                          {editableTitle || state.articleContext?.title}
                        </h3>
                      </div>

                      <div className="font-black text-slate-900 dark:text-white text-sm mt-3 mb-2">
                        antbiz_official
                      </div>

                      <div className="relative min-h-[100px] my-2">
                        <div className="absolute inset-0 text-sm md:text-[15px] leading-relaxed whitespace-pre-wrap font-sans text-transparent pointer-events-none z-0 overflow-hidden">
                          {renderHighlightedBackdrop(displayedContent, state.highlightSelections)}
                        </div>
                        <div
                          key={isExpanded ? 'expanded' : 'collapsed'}
                          ref={editorRef}
                          contentEditable={!state.isGeneratingPost}
                          suppressContentEditableWarning
                          onBlur={(e) => {
                            dispatch({ type: 'SET_POST_CONTENT', payload: e.currentTarget.innerText });
                          }}
                          className="text-sm md:text-[15px] text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap outline-none font-sans min-h-[100px] bg-transparent focus:ring-0 focus:outline-none relative z-10"
                        >
                          {displayedContent || "Nội dung bài viết sẽ hiển thị ở đây sau khi sinh..."}
                        </div>
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

                      {/* Author & Hashtags */}
                      <div className="text-xs text-slate-500 font-medium mb-2">
                        Tác giả: <span className="font-bold text-slate-700 dark:text-slate-300">{authorName}</span>
                      </div>

                      {hashtags.length > 0 && (
                        <div className="flex flex-wrap gap-2 text-xs font-bold text-[#ff6b00] mb-2">
                          {hashtags.map((h, i) => (
                            <span key={i}>{h}</span>
                          ))}
                        </div>
                      )}
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
        className={`w-full md:w-[37%] h-full flex flex-col bg-gray-55 dark:bg-zinc-900/10 backdrop-blur-md transition-all ${
          mobileMode === 'chat' ? 'flex' : 'hidden md:flex'
        }`}
      >
        {/* Chat sidebar header */}
        <div className="px-6 h-[72px] flex items-center justify-between border-b border-gray-150/10 dark:border-zinc-800/10 bg-white/50 dark:bg-zinc-900/50 flex-shrink-0">
          <div className="flex items-center gap-2 text-primary font-bold">
            <Cpu className="w-5 h-5" />
            <span className="text-base font-extrabold">AI Trợ lý</span>
          </div>

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
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Cpu className="w-4 h-4" />
                  </div>
                )}
                <div className="flex flex-col">
                  <div className={`rounded-2xl p-4 text-sm leading-relaxed shadow-sm ${
                    isAI 
                      ? 'bg-[#F4F5F9] dark:bg-zinc-800 text-text rounded-tl-none border border-gray-100 dark:border-zinc-800/55' 
                      : 'bg-primary text-white rounded-tr-none'
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
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 animate-pulse">
                <Cpu className="w-4 h-4" />
              </div>
              <div className="bg-[#F4F5F9] dark:bg-zinc-800 text-text rounded-2xl rounded-tl-none p-4 text-sm border border-gray-100 dark:border-zinc-800 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="animate-pulse text-xs text-text-muted">Gemini 3.1 Flash Lite đang trả lời...</span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Chat input footer */}
        <div className="p-4 border-t border-gray-150 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md">
          {state.highlightSelections.length > 0 && (
            <div className="mb-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-250 dark:border-amber-900/40 rounded-xl p-2.5 flex flex-col gap-2 text-xs animate-fade-in select-none">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0 animate-pulse" />
                  <span className="text-text font-semibold">
                    Đang sửa {state.highlightSelections.length} đoạn
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
          <form onSubmit={handleSendChat} className="relative bg-white dark:bg-zinc-900 border border-gray-250 dark:border-zinc-800 rounded-2xl shadow-sm focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all overflow-hidden">
            <textarea
              ref={chatInputRef}
              className="w-full bg-transparent border-0 focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:outline-none outline-none shadow-none text-sm p-4 resize-none h-20 text-text placeholder-text-muted/65 pr-14"
              placeholder={state.highlightSelections.length > 0 ? "Nhập yêu cầu sửa cho các đoạn đã chọn..." : "Nhắn AI... (Enter gửi, Shift+Enter xuống dòng)"}
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
              className="absolute bottom-3.5 right-4 w-9 h-9 bg-primary/10 hover:bg-primary text-primary hover:text-white disabled:opacity-40 disabled:hover:bg-primary/10 disabled:hover:text-primary rounded-full flex items-center justify-center transition-all active:scale-95 duration-100"
            >
              <Send className="w-4.5 h-4.5" />
            </button>
          </form>
        </div>
      </aside>





      {/* Style Presets Modal Portal */}
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
                  .map((preset) => {
                    const isSelected = state.selectedPresetId === preset.id;
                    return (
                      <div
                        key={preset.id}
                        onClick={() => {
                          const newId = isSelected ? null : preset.id;
                          dispatch({ type: 'SET_SELECTED_PRESET', payload: newId });
                          regeneratePostContent(newId);
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
