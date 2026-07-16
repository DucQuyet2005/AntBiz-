"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Link2,
  Cpu,
  Globe,
  Check,
  Facebook,
  Instagram,
  Sparkles,
  MoreHorizontal,
  ThumbsUp,
  MessageSquare,
  Share2,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeOff,
  User,
  Calendar,
  Layers,
  Send,
  Loader2,
  Plus,
  Edit2,
  Smartphone,
  Heart,
  MessageCircle,
  Repeat2,
  Search,
  RefreshCw,
  X,
  FileText,
  Save,
  Wand2,
  RotateCcw,
  Mic,
  UploadCloud,
  Trash2,
  Lock,
  Play,
  Pause,
  Bold,
  Italic,
  Pencil,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRouter } from 'next/navigation';
import { useUnsavedChanges } from '@/lib/hooks/useUnsavedChanges';
import PromptSuggestionSection from '../PromptSuggestionSection';
import CaptionEditor from '../CaptionEditor';
import PopupDialog, { PopupType } from '@/components/PopupDialog';
import DebouncedTextarea from '../DebouncedTextarea';
import { createClient } from '@/utils/supabase/client';
import {
  QuickPublishingError,
  useQuickPublishing,
  type QuickPublishingEvent,
} from '@/frontend/modules/quick-publishing';


// Threads Custom SVG Logo
const ThreadsIcon = ({ size = 14, className = "" }: { size?: number; className?: string; key?: any }) => (
  <svg viewBox="0 0 192 192" width={size} height={size} fill="currentColor" className={className}>
    <path d="M141.537 88.9883C140.71 88.5919 139.87 88.2104 139.019 87.8451C137.537 60.5382 122.616 44.905 97.5619 44.745C97.4484 44.7443 97.3355 44.7443 97.222 44.7443C82.2364 44.7443 69.7731 51.1409 62.102 62.7807L75.881 72.2328C81.6116 63.5383 90.6052 61.6848 97.2286 61.6848C97.3051 61.6848 97.3819 61.6848 97.4576 61.6855C105.707 61.7381 111.932 64.1366 115.961 68.814C118.893 72.2193 120.854 76.925 121.825 82.8638C114.511 81.6207 106.601 81.2385 98.145 81.7233C74.3247 83.0954 59.0111 96.9879 60.0396 116.292C60.5615 126.084 65.4397 134.508 73.775 140.011C80.8224 144.663 89.899 146.938 99.3323 146.423C111.79 145.74 121.563 140.987 128.381 132.296C133.559 125.696 136.834 117.143 138.28 106.366C144.217 109.949 148.617 114.664 151.047 120.332C155.179 129.967 155.42 145.8 142.501 158.708C131.182 170.016 117.576 174.908 97.0135 175.059C74.2042 174.89 56.9538 167.575 45.7381 153.317C35.2355 139.966 29.8077 120.682 29.6052 96C29.8077 71.3178 35.2355 52.0336 45.7381 38.6827C56.9538 24.4249 74.2039 17.11 97.0132 16.9405C119.988 17.1113 137.539 24.4614 149.184 38.788C154.894 45.8136 159.199 54.6488 162.037 64.9503L178.184 60.6422C174.744 47.9622 169.331 37.0357 161.965 27.974C147.036 9.60668 125.202 0.195148 97.0695 0H96.9569C68.8816 0.19447 47.2921 9.6418 32.7883 28.0793C19.8819 44.4864 13.2244 67.3157 13.0007 95.9325L13 96L13.0007 96.0675C13.2244 124.684 19.8819 147.514 32.7883 163.921C47.2921 182.358 68.8816 191.806 96.9569 192H97.0695C122.03 191.827 139.624 185.292 154.118 170.811C173.081 151.866 172.51 128.119 166.26 113.541C161.776 103.087 153.227 94.5962 141.537 88.9883ZM98.4405 129.507C88.0005 130.095 77.1544 125.409 76.6196 115.372C76.2232 107.93 81.9158 99.626 99.0812 98.6368C101.047 98.5234 102.976 98.468 104.871 98.468C111.106 98.468 116.939 99.0737 122.242 100.233C120.264 124.935 108.662 128.946 98.4405 129.507Z" />
  </svg>
);

interface SocialVariant {
  id: string; // A, B, C...
  facebook: string;
  threads: string;
  instagram: string;
  originalFacebook?: string;
  originalThreads?: string;
  originalInstagram?: string;
  facebookCaptionId?: string;
  threadsCaptionId?: string;
  instagramCaptionId?: string;
  title: string;
  author: string;
  tags: string;
  captionId?: string;
  facebookStatus?: 'draft' | 'edited' | 'approved' | 'scheduled' | 'posted';
  threadsStatus?: 'draft' | 'edited' | 'approved' | 'scheduled' | 'posted';
  instagramStatus?: 'draft' | 'edited' | 'approved' | 'scheduled' | 'posted';
}

type SocialPlatform = 'facebook' | 'threads' | 'instagram';

const toDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toHourInputValue = (date: Date) => {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

const getFutureScheduleSlot = (offsetHours: number) => {
  const date = new Date();
  date.setMinutes(0, 0, 0);
  date.setHours(date.getHours() + offsetHours);
  return {
    date: toDateInputValue(date),
    time: toHourInputValue(date),
  };
};

// Note: DebouncedTextarea has been extracted to components/DebouncedTextarea.tsx for better re-render performance

const handleFocusTrap = (e: React.KeyboardEvent<HTMLDivElement>) => {
  if (e.key !== 'Tab') return;
  const modalEl = e.currentTarget;
  const focusableEls = modalEl.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
  if (focusableEls.length === 0) return;
  const focusable = Array.from(focusableEls) as HTMLElement[];
  const firstEl = focusable[0];
  const lastEl = focusable[focusable.length - 1];

  if (e.shiftKey) {
    if (document.activeElement === firstEl) {
      lastEl.focus();
      e.preventDefault();
    }
  } else {
    if (document.activeElement === lastEl) {
      firstEl.focus();
      e.preventDefault();
    }
  }
};

const convertToHashtag = (tag: string): string => {
  const cleaned = tag.trim().replace(/#/g, '');
  if (!cleaned) return '';
  const camelCase = cleaned
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
  return `#${camelCase}`;
};

const formatTagsAsHashtags = (tagsStr: string): string => {
  if (!tagsStr) return '';
  return tagsStr
    .split(',')
    .map(t => convertToHashtag(t))
    .filter(Boolean)
    .join(' ');
};

const getWeekStartDate = () => {
  const start = new Date();
  const day = start.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() + diffToMonday);
  return start;
};

const createEmptyVariant = (id: string): SocialVariant => ({
  id,
  facebook: '',
  threads: '',
  instagram: '',
  originalFacebook: '',
  originalThreads: '',
  originalInstagram: '',
  facebookCaptionId: '',
  threadsCaptionId: '',
  instagramCaptionId: '',
  title: '',
  author: '',
  tags: '',
  facebookStatus: 'draft',
  threadsStatus: 'draft',
  instagramStatus: 'draft',
});

const toDatabasePlatform = (platform: SocialPlatform) => (platform === 'threads' ? 'thread' : platform);

// Module-level variables to share state/handlers with EditableText without unmounting it
let _editState: any = null;
let _setEditState: any = () => { };
let _handleUpdateVariantField: any = () => { };
let _isGeneratingAB: boolean = false;

interface EditableTextContextProps {
  editState: { variantId: string; field: string } | null;
  setEditState: (state: { variantId: string; field: keyof SocialVariant } | null) => void;
  handleUpdateVariantField: (variantId: string, field: keyof SocialVariant, value: string) => void;
  isGeneratingAB?: boolean;
  variants: SocialVariant[];
  setVariants: React.Dispatch<React.SetStateAction<SocialVariant[]>>;
  articleId: string | null;
  selectedPlatform: SocialPlatform;
  selectedPrompt: any;
}

const EditableTextContext = React.createContext<EditableTextContextProps | null>(null);

const CustomAudioPlayer = ({ src, fileName, language }: { src: string; fileName: string; language: 'vi' | 'en' }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration || 0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '00:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
  }, [src]);

  return (
    <div className="bg-slate-50 dark:bg-zinc-900 border border-gray-150 dark:border-zinc-800/80 rounded-2xl p-4 flex flex-col gap-3 w-full shadow-sm">
      <audio
        ref={audioRef}
        src={src}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
      />
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={togglePlay}
          className="w-10 h-10 rounded-full bg-primary hover:bg-primary-hover text-white flex items-center justify-center cursor-pointer border-0 shadow transition-all hover:scale-105 active:scale-95 shrink-0"
        >
          {isPlaying ? <Pause size={18} fill="white" /> : <Play size={18} className="ml-0.5" fill="white" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-bold text-text truncate block mb-1">🎵 {fileName}</div>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className="flex-1 h-1 bg-slate-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <span className="text-[10px] text-text-muted font-bold shrink-0">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export const EditableText = ({
  variantId,
  field,
  value,
  originalValue,
  textarea = false,
  className = ""
}: {
  variantId: string;
  field: keyof SocialVariant;
  value: string;
  originalValue?: string;
  textarea?: boolean;
  className?: string;
}) => {
  const { language } = useLanguage();
  const context = React.useContext(EditableTextContext);
  const editState = context?.editState ?? _editState;
  const setEditState = context?.setEditState ?? _setEditState;
  const handleUpdateVariantField = context?.handleUpdateVariantField ?? _handleUpdateVariantField;
  const isGeneratingAB = context?.isGeneratingAB ?? _isGeneratingAB;
  const variants = context?.variants ?? [];
  const setVariants = context?.setVariants;
  const articleId = context?.articleId;
  const selectedPlatform = context?.selectedPlatform ?? 'facebook';
  const selectedPrompt = context?.selectedPrompt;

  const isEditing = editState?.variantId === variantId && editState?.field === field;
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const isCaptionField = field === 'facebook' || field === 'threads' || field === 'instagram';
  const captionLimits = {
    facebook: 63206,
    threads: 5000,
    instagram: 2200
  };
  const charLimit = isCaptionField ? captionLimits[field as keyof typeof captionLimits] : null;
  const hasChanged = originalValue !== undefined && originalValue !== "" && value !== originalValue;

  // Lock status calculation
  const currentVariant = variants.find(v => v.id === variantId);
  const statusKey = field === 'facebook' ? 'facebookStatus' :
    field === 'threads' ? 'threadsStatus' :
      field === 'instagram' ? 'instagramStatus' : null;
  const currentStatus = statusKey && currentVariant ? currentVariant[statusKey] : 'draft';
  const isLocked = currentStatus === 'scheduled' || currentStatus === 'posted';

  React.useEffect(() => {
    if (isEditing) {
      if (textarea && textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      }
    }
  }, [isEditing, value, textarea]);

  const [isExpanded, setIsExpanded] = React.useState(false);
  const shouldFold = textarea && value && value.length > 280;

  React.useEffect(() => {
    setIsExpanded(false);
  }, [variantId, field]);

  const saveToServer = async (currentContent: string, saveAsOriginal = false) => {
    if (!currentVariant || !articleId) return;

    try {
      const platKey = selectedPlatform === 'facebook' ? 'facebookCaptionId' :
        selectedPlatform === 'threads' ? 'threadsCaptionId' :
          'instagramCaptionId';
      const activeCaptionId = currentVariant[platKey] || currentVariant.captionId;

      if (activeCaptionId) {
        // Perform PUT update
        const payload: any = {
          edited_content: currentContent,
          status: 'edited'
        };
        if (saveAsOriginal) {
          payload.save_as_original = true;
          payload.ai_content = currentContent;
        }

        const res = await fetch(`/api/captions/${activeCaptionId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          const resData = await res.json();
          const updatedStatus = resData.data.status;

          // Sync changes to the global state
          const originalField = selectedPlatform === 'facebook' ? 'originalFacebook' :
            selectedPlatform === 'threads' ? 'originalThreads' :
              'originalInstagram';
          const statusKeyName = selectedPlatform === 'facebook' ? 'facebookStatus' :
            selectedPlatform === 'threads' ? 'threadsStatus' :
              'instagramStatus';

          setVariants?.((prev: any[]) =>
            prev.map((v) =>
              v.id === variantId
                ? {
                  ...v,
                  [selectedPlatform]: currentContent,
                  [statusKeyName]: updatedStatus,
                  ...(saveAsOriginal ? { [originalField]: currentContent } : {})
                }
                : v
            )
          );
        }
      } else {
        // Perform POST to create new caption draft
        const originalField = selectedPlatform === 'facebook' ? 'originalFacebook' :
          selectedPlatform === 'threads' ? 'originalThreads' :
            'originalInstagram';
        const aiContent = currentVariant[originalField] || currentVariant[selectedPlatform] || currentContent;

        const res = await fetch('/api/captions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            article_id: articleId,
            platform: toDatabasePlatform(selectedPlatform),
            ai_content: aiContent,
            edited_content: currentContent
          })
        });

        if (res.ok) {
          const resData = await res.json();
          const newId = resData.data.id;
          const newStatus = resData.data.status;

          // Sync variants
          const statusKeyName = selectedPlatform === 'facebook' ? 'facebookStatus' :
            selectedPlatform === 'threads' ? 'threadsStatus' :
              'instagramStatus';
          setVariants?.((prev: any[]) =>
            prev.map((v) =>
              v.id === variantId
                ? {
                  ...v,
                  captionId: newId,
                  [platKey]: newId,
                  [statusKeyName]: newStatus
                }
                : v
            )
          );
        }
      }
    } catch (err) {
      console.error('[AutoSave error]:', err);
    }
  };


  const lastSavedContentRef = React.useRef(value);

  // Debounced auto-save — all edits are saved as original
  React.useEffect(() => {
    if (isEditing && isCaptionField) {
      if (value === lastSavedContentRef.current) return;

      const timer = setTimeout(() => {
        saveToServer(value, true);
        lastSavedContentRef.current = value;
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [value, isEditing, isCaptionField]);

  const applyStyling = (type: 'bold' | 'italic') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const wrapper = type === 'bold' ? '**' : '*';

    if (start === end) {
      const newContent = value.substring(0, start) + wrapper + wrapper + value.substring(end);
      handleUpdateVariantField(variantId, field, newContent);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + wrapper.length, start + wrapper.length);
      }, 0);
      return;
    }

    const selectedText = value.substring(start, end);
    let styledText;
    let newEnd = end;

    if (selectedText.startsWith(wrapper) && selectedText.endsWith(wrapper)) {
      styledText = selectedText.slice(wrapper.length, -wrapper.length);
      newEnd = start + styledText.length;
    } else {
      styledText = `${wrapper}${selectedText}${wrapper}`;
      newEnd = start + styledText.length;
    }

    const newContent = value.substring(0, start) + styledText + value.substring(end);
    handleUpdateVariantField(variantId, field, newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start, newEnd);
    }, 0);
  };

  const insertEmoji = (emoji: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      handleUpdateVariantField(variantId, field, value + emoji);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newContent = value.substring(0, start) + emoji + value.substring(end);

    handleUpdateVariantField(variantId, field, newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + emoji.length, start + emoji.length);
    }, 0);
  };

  if (isEditing) {
    return (
      <div className="w-full relative">
        {textarea ? (
          <div className="flex flex-col w-full">
            <textarea
              ref={textareaRef}
              autoFocus
              value={value}
              onChange={(e) => {
                handleUpdateVariantField(variantId, field, e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${e.target.scrollHeight}px`;
              }}
              onBlur={() => setEditState(null)}
              className="w-full text-inherit bg-transparent p-0 border-0 outline-none resize-none focus:outline-none focus:ring-0 leading-relaxed transition-all"
            />
            {isCaptionField && charLimit && (
              <div className="flex flex-col gap-0.5 mt-1 border-t border-gray-100 dark:border-zinc-800 pt-1">
                <div className="flex items-center justify-between mt-1">
                  <div>
                    {hasChanged && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const confirmMsg = language === 'vi'
                            ? 'Bạn có chắc chắn muốn hủy các thay đổi và quay lại nội dung gốc do AI tạo ra?'
                            : 'Are you sure you want to discard your edits and revert to the original AI content?';
                          if (window.confirm(confirmMsg)) {
                            handleUpdateVariantField(variantId, field, originalValue || '');
                          }
                        }}
                        className="flex items-center gap-1 text-[9px] font-extrabold text-rose-600 hover:text-rose-700 transition-colors select-none cursor-pointer border-none bg-transparent p-0"
                        title={language === 'vi' ? 'Hủy chỉnh sửa, khôi phục bản AI gốc' : 'Discard edits, revert to original AI'}
                      >
                        <RotateCcw size={10} />
                        {language === 'vi' ? 'Về bản gốc AI' : 'Revert to original AI'}
                      </button>
                    )}
                  </div>
                  <div className={`text-[9px] font-bold transition-colors ${value.length > charLimit ? 'text-rose-600' : 'text-gray-400'}`}>
                    {value.length.toLocaleString()} ký tự (~{value.trim().split(/\s+/).filter(Boolean).length} từ) / {charLimit.toLocaleString()} {language === 'vi' ? 'ký tự' : 'characters'}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <input
            ref={inputRef}
            autoFocus
            type="text"
            value={value}
            onChange={(e) => handleUpdateVariantField(variantId, field, e.target.value)}
            onBlur={() => setEditState(null)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') setEditState(null);
            }}
            className="w-full text-inherit bg-transparent p-0 border-0 outline-none focus:outline-none focus:ring-0 font-inherit transition-all"
          />
        )}
      </div>
    );
  }

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        if (isLocked) return;
        setEditState({ variantId, field });
      }}
      className={`group relative rounded-xl px-2 py-1.5 transition-all duration-200 border border-dashed ${isLocked
        ? 'border-transparent cursor-default'
        : 'border-transparent hover:border-primary bg-transparent hover:bg-primary/5 cursor-pointer'
        } ${className}`}
    >
      <div className="flex flex-col w-full">
        <span className="whitespace-pre-wrap">
          {value ? (
            shouldFold ? (
              !isExpanded ? (
                <>
                  {value.substring(0, 280)}...
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsExpanded(true);
                    }}
                    className="text-primary hover:underline font-extrabold ml-1 border-0 bg-transparent p-0 cursor-pointer text-[10px]"
                  >
                    {language === 'vi' ? 'Xem thêm' : 'See more'}
                  </button>
                </>
              ) : (
                <>
                  {value}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsExpanded(false);
                    }}
                    className="text-primary hover:underline font-extrabold ml-1.5 border-0 bg-transparent p-0 cursor-pointer text-[10px]"
                  >
                    {language === 'vi' ? 'Ẩn bớt' : 'Show less'}
                  </button>
                </>
              )
            ) : (
              value
            )
          ) : isGeneratingAB ? (
            <span className="text-gray-400 italic flex items-center gap-1.5">
              <Loader2 size={12} className="animate-spin text-primary shrink-0" />
              {language === 'vi' ? 'AI đang viết...' : 'AI is writing...'}
            </span>
          ) : (
            <span className="text-gray-300 italic">Nhấp để chỉnh sửa...</span>
          )}
        </span>

        {/* Lock indicator */}
        {isLocked && (
          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-gray-450 bg-gray-50 dark:bg-zinc-800/40 px-2 py-0.5 rounded border border-gray-200/50 mt-1 select-none self-start">
            <Lock size={9} />
            {language === 'vi' ? 'Đã lên lịch / Đã đăng - Khóa chỉnh sửa' : 'Scheduled / Posted - Locked'}
          </span>
        )}

        {isCaptionField && charLimit && value && (
          <div className="flex flex-col gap-0.5 mt-1.5 border-t border-dashed border-gray-150 pt-1">
            <div className="flex items-center justify-between mt-1">
              <div>
                {hasChanged && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const confirmMsg = language === 'vi'
                        ? 'Bạn có chắc chắn muốn hủy các thay đổi và quay lại nội dung gốc do AI tạo ra?'
                        : 'Are you sure you want to discard your edits and revert to the original AI content?';
                      if (window.confirm(confirmMsg)) {
                        handleUpdateVariantField(variantId, field, originalValue || '');
                      }
                    }}
                    className="flex items-center gap-1 text-[9px] font-extrabold text-rose-600 hover:text-rose-700 transition-colors select-none cursor-pointer border-none bg-transparent p-0"
                    title={language === 'vi' ? 'Hủy chỉnh sửa, khôi phục bản AI gốc' : 'Discard edits, revert to original AI'}
                  >
                    <RotateCcw size={10} />
                    {language === 'vi' ? 'Về bản gốc AI' : 'Revert to original AI'}
                  </button>
                )}
              </div>
              <div className={`text-[9px] font-bold transition-colors ${value.length > charLimit ? 'text-rose-600' : 'text-gray-400'}`}>
                {value.length.toLocaleString()} ký tự (~{value.trim().split(/\s+/).filter(Boolean).length} từ) / {charLimit.toLocaleString()} {language === 'vi' ? 'ký tự' : 'characters'}
              </div>
            </div>
            {value.length > charLimit && (
              <div className="text-[8px] text-rose-600 font-extrabold text-right">
                {language === 'vi'
                  ? `Vượt quá giới hạn ký tự của ${field === 'facebook' ? 'Facebook' : field === 'threads' ? 'Threads' : 'Instagram'}!`
                  : `Exceeds character limit for ${field === 'facebook' ? 'Facebook' : field === 'threads' ? 'Threads' : 'Instagram'}!`}
              </div>
            )}
          </div>
        )}
      </div>
      {!isLocked && (
        <span className="absolute right-1 top-1 opacity-0 group-hover:opacity-40 transition-opacity">
          <Edit2 size={10} className="text-primary" />
        </span>
      )}
    </div>
  );
};

const parseStyleString = (styleStr: string): React.CSSProperties => {
  if (!styleStr) return {};
  const obj: Record<string, string> = {};
  styleStr.split(';').forEach((pair) => {
    const parts = pair.split(':');
    if (parts.length >= 2) {
      const key = parts[0].trim().replace(/-([a-z])/g, (g) => g[1].toUpperCase());
      const val = parts.slice(1).join(':').trim();
      if (key && val) {
        obj[key] = val;
      }
    }
  });
  return obj as React.CSSProperties;
};

export default function AiCreatorView() {
  const { t, language } = useLanguage();
  const router = useRouter();
  const {
    loadPresets: loadQuickPublishingPresets,
    generate: executeQuickPublishingGeneration,
    regenerate: executeQuickPublishingRegeneration,
    schedule: executeQuickPublishingSchedule,
  } = useQuickPublishing();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [popup, setPopup] = useState<{ isOpen: boolean; message: string; type: PopupType } | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');

  // --- States moved from lower levels to avoid Temporal Dead Zone (Cannot access before initialization) ---
  const [selectedPlatform, setSelectedPlatform] = useState<'facebook' | 'threads' | 'instagram'>('facebook');
  const [selectedPlatforms, setSelectedPlatforms] = useState<('facebook' | 'threads' | 'instagram')[]>(['facebook']);
  const [excludedPlatforms, setExcludedPlatforms] = useState<('facebook' | 'threads' | 'instagram')[]>([]);
  const [connectedPlatforms, setConnectedPlatforms] = useState<string[]>([]);

  useEffect(() => {
    const fetchConnections = async () => {
      try {
        const res = await fetch('/api/linked-accounts');
        if (res.ok) {
          const json = await res.json();
          const platforms = (json.data || []).map((acc: any) => 
            acc.platform === 'thread' ? 'threads' : acc.platform
          );
          setConnectedPlatforms(platforms);
        }
      } catch (err) {
        console.error('Error checking platform integrations:', err);
      }
    };
    fetchConnections();
  }, []);
  const [variantCount, setVariantCount] = useState<2 | 3>(2);
  const [subStep, setSubStep] = useState<number>(1);

  // --- US-2.10: Platform Presets States ---
  const [platformPresets, setPlatformPresets] = useState<any[]>([]);
  const [selectedPlatformPresetId, setSelectedPlatformPresetId] = useState<string>('');
  const [isLoadingPlatformPresets, setIsLoadingPlatformPresets] = useState(false);

  // --- Playground Layout: Custom Instructions & Prompt Preview ---
  const [customPromptText, setCustomPromptText] = useState<string>('');
  const [isPromptPreviewOpen, setIsPromptPreviewOpen] = useState(false);
  const [presetOpen, setPresetOpen] = useState(false);
  const [toneOpen, setToneOpen] = useState(false);
  const [instructionOpen, setInstructionOpen] = useState(false);
  const [selectedQuickPicks, setSelectedQuickPicks] = useState<string[]>([]);

  // --- US-2.07: Prompt Config States ---
  const [savedConfigs, setSavedConfigs] = useState<any[]>([]);
  const [selectedConfigId, setSelectedConfigId] = useState<string>('');
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  // --- Platform-specific configurations map & syncing ---
  const [platformConfigMap, setPlatformConfigMap] = useState<Record<string, {
    presetId: string;
    customText: string;
    quickPicks: string[];
    configId: string;
  }>>({
    facebook: { presetId: '', customText: '', quickPicks: [], configId: '' },
    threads: { presetId: '', customText: '', quickPicks: [], configId: '' },
    instagram: { presetId: '', customText: '', quickPicks: [], configId: '' },
  });

  const platformConfigMapRef = useRef(platformConfigMap);
  useEffect(() => {
    platformConfigMapRef.current = platformConfigMap;
  }, [platformConfigMap]);

  const promptPreviewRef = useRef<HTMLDivElement>(null);


  // Load platform-specific configuration when switching platforms
  useEffect(() => {
    if (selectedPlatform) {
      const config = platformConfigMap[selectedPlatform];
      if (config) {
        setSelectedPlatformPresetId(config.presetId);
        setCustomPromptText(config.customText);
        setSelectedQuickPicks(config.quickPicks);
        setSelectedConfigId(config.configId);
      }
    }
  }, [selectedPlatform]);

  // --- Redesigned Brand Style Modal States ---
  const [isStyleModalOpen, setIsStyleModalOpen] = useState(false);
  const [editingConfigId, setEditingConfigId] = useState<string | null>(null);
  const [styleFormName, setStyleFormName] = useState('');
  const [styleFormPlatform, setStyleFormPlatform] = useState<'facebook' | 'threads' | 'instagram' | 'all'>('all');
  const [styleFormRulesObj, setStyleFormRulesObj] = useState<Record<string, string>>({ general: '', facebook: '', threads: '', instagram: '' });
  const [styleRulesTab, setStyleRulesTab] = useState<'general' | 'facebook' | 'threads' | 'instagram'>('general');
  const [styleFormIsDefault, setStyleFormIsDefault] = useState(false);

  // Form states
  const [tone, setTone] = useState<string>('Chuyên nghiệp');
  const [length, setLength] = useState<string>('Vừa (200-500 từ)');
  const [emphasis, setEmphasis] = useState<string>('');

  // Onboarding Tour state for AI Creator
  const [showTour, setShowTour] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const [tourRect, setTourRect] = useState<DOMRect | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const completed = localStorage.getItem('antbiz_creator_onboarded');
    if (!completed) {
      const timer = setTimeout(() => {
        setShowTour(true);
        setTourStep(1);
        setTimeout(() => highlightElement(1), 100);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    if (!showTour || tourStep === 0 || tourStep === 7) {
      setTourRect(null);
      return;
    }

    const updateRect = () => {
      let targetId = '';
      if (tourStep === 1) targetId = 'tour-creator-header';
      if (tourStep === 2) targetId = 'tour-creator-url';
      if (tourStep === 3) targetId = 'tour-creator-prompt';
      if (tourStep === 4) targetId = 'tour-creator-variants';
      if (tourStep === 5) targetId = 'tour-creator-refresh';
      if (tourStep === 6) targetId = 'tour-creator-scheduler';

      if (targetId) {
        const el = document.getElementById(targetId);
        if (el) {
          setTourRect(el.getBoundingClientRect());
        }
      }
    };

    updateRect();
    const timers = [100, 300, 500, 800, 1200].map(ms => setTimeout(updateRect, ms));

    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);

    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [showTour, tourStep]);

  const highlightElement = (stepNumber: number) => {
    let targetId = '';
    if (stepNumber === 1) targetId = 'tour-creator-header';
    if (stepNumber === 2) targetId = 'tour-creator-url';
    if (stepNumber === 3) targetId = 'tour-creator-prompt';
    if (stepNumber === 4) targetId = 'tour-creator-variants';
    if (stepNumber === 5) targetId = 'tour-creator-refresh';
    if (stepNumber === 6) targetId = 'tour-creator-scheduler';

    if (targetId) {
      const element = document.getElementById(targetId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  const clearHighlights = () => {
    // No-op
  };

  const handleNextStep = () => {
    const nextStep = tourStep + 1;
    if (nextStep === 2 || nextStep === 3) {
      setStep(1);
    } else if (nextStep === 4 || nextStep === 5) {
      // Mock variants if currently empty to display something useful
      if (!variants[0].facebook && !variants[0].threads && !variants[0].instagram) {
        setVariants([
          {
            id: 'A',
            facebook: '🎉 Thật tuyệt vời khi được đồng hành cùng các bạn! Đây là bài viết mẫu cho kênh A.',
            threads: 'Thật tuyệt vời khi được đồng hành! Bài viết mẫu kênh A.',
            instagram: 'Thật tuyệt vời khi được đồng hành! Bài viết mẫu kênh A. #AntBiz',
            title: 'Bài viết mẫu A',
            author: 'AntBiz AI',
            tags: '#Sample'
          },
          {
            id: 'B',
            facebook: '🔥 Hướng tới tương lai bền vững với giải pháp tự động hóa. Bản thảo A/B Test B.',
            threads: 'Hướng tới tương lai bền vững! Bản thảo B.',
            instagram: 'Hướng tới tương lai bền vững! Bản thảo B. #Creative',
            title: 'Bài viết mẫu B',
            author: 'AntBiz AI',
            tags: '#Future'
          }
        ]);
        setSelectedVariantId('A');
      }
      setStep(2);
    } else if (nextStep === 6) {
      setStep(3);
    }
    setTourStep(nextStep);
    setTimeout(() => highlightElement(nextStep), 100);
  };

  const handlePrevStep = () => {
    const prevStep = tourStep - 1;
    if (prevStep === 2 || prevStep === 3) {
      setStep(1);
    } else if (prevStep === 4 || prevStep === 5) {
      setStep(2);
    } else if (prevStep === 6) {
      setStep(3);
    }
    setTourStep(prevStep);
    setTimeout(() => highlightElement(prevStep), 100);
  };

  const handleSkipTour = () => {
    localStorage.setItem('antbiz_creator_onboarded', 'true');
    setShowTour(false);
    clearHighlights();
    setStep(1); // Return to Step 1 (Ingest Content) when the tour finishes
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll back to top
  };

  const handleStartTour = () => {
    setTourStep(1);
    setStep(1);
    setShowTour(true);
    setTimeout(() => highlightElement(1), 100);
  };

  // State for Social Media Variants (A/B Test copies)
  const [variants, setVariants] = useState<SocialVariant[]>([
    createEmptyVariant('A'),
    createEmptyVariant('B'),
  ]);

  // Track unsaved changes (T-1.13.5)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pendingTabSwitch, setPendingTabSwitch] = useState<'editor' | 'generator' | null>(null);

  // Undo history state (T-1.13.5)
  const [savedHistory, setSavedHistory] = useState<SocialVariant[][]>([]);

  // Use unsaved changes warning hook
  useUnsavedChanges(
    hasUnsavedChanges,
    language === 'vi'
      ? 'Bạn có thay đổi chưa được lưu. Nếu rời khỏi trang, dữ liệu sẽ bị mất. Bạn có muốn tiếp tục?'
      : 'You have unsaved changes. If you leave this page, your data will be lost. Do you want to continue?'
  );

  const [customPromptTitle, setCustomPromptTitle] = useState('');

  const changeStep = (newStep: 1 | 2 | 3) => setStep(newStep);

  useEffect(() => {
    const onGoStep1 = () => { setStep(1); setSelectedVariantId(''); };
    window.addEventListener('ai-creator-go-to-step-1', onGoStep1);
    return () => window.removeEventListener('ai-creator-go-to-step-1', onGoStep1);
  }, []);

  // AI Generation States
  const [articleId, setArticleId] = useState<string | null>(null);
  const [promptPlatform, setPromptPlatform] = useState<'facebook' | 'thread' | 'instagram' | 'threads'>('facebook');
  const [activePrompt, setActivePrompt] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingAB, setIsGeneratingAB] = useState(false);
  const [isGeneratingSmartPrompt, setIsGeneratingSmartPrompt] = useState(false);
  const [isSavingPrompt, setIsSavingPrompt] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [lastGeneratedAiContent, setLastGeneratedAiContent] = useState<string | null>(null);
  const [variantGroupId, setVariantGroupId] = useState<string | null>(null);
  const [regeneratingVariantId, setRegeneratingVariantId] = useState<string | null>(null);

  // ─── Multi-platform prompt config ────────────────────────────────────────
  const [promptPerPlatform, setPromptPerPlatform] = useState<Record<string, string>>({
    facebook: '', threads: '', instagram: ''
  });
  const [activePromptTab, setActivePromptTab] = useState<'facebook' | 'threads' | 'instagram'>('facebook');
  const [promptStylePerPlatform, setPromptStylePerPlatform] = useState<Record<string, string>>({
    facebook: 'formal', threads: 'snappy', instagram: 'visual'
  });


  // ... (existing code)

  const handleProceedToABTest = async () => {
    let resolvedActivePrompt = activePrompt;
    if (!resolvedActivePrompt) {
      const defaultPrompt = getDefaultPromptTemplate(
        selectedPlatform,
        postData.title || (language === 'vi' ? 'Bài viết tự soạn' : 'Manual post'),
        postData.full_text || postData.description || ''
      );
      resolvedActivePrompt = defaultPrompt;
      setActivePrompt(defaultPrompt);
    }

    let resolvedArticleId = articleId;

    if (inputMode === 'manual') {
      let currentFullText = postData.full_text;
      let currentTitle = postData.title;


      // 1. STT Auto-transcription if voiceFile is present but full_text is empty
      if (voiceFile && !currentFullText.trim()) {
        setIsAutoGenerating(true);
        try {
          const fd = new FormData();
          fd.append('file', voiceFile);
          const sttRes = await fetch('/api/stt', {
            method: 'POST',
            body: fd
          });
          if (sttRes.ok) {
            const sttData = await sttRes.json();
            currentFullText = sttData.rewritten_post || sttData.transcript || '';

            const finalTitle = sttData.generated_title || voiceFile.name.replace(/\.[^/.]+$/, '');
            const finalCategory = sttData.generated_category || '';
            const finalTags = sttData.generated_tags || '';

            setPostData(prev => ({
              ...prev,
              full_text: currentFullText,
              description: currentFullText,
              // Always overwrite title, category, and tags from audio transcription
              title: finalTitle,
              category: finalCategory,
              tags: finalTags
            }));
            currentTitle = finalTitle;
          } else {
            const sttErr = await sttRes.json().catch(() => ({ error: 'Lỗi dịch giọng nói tự động' }));
            throw new Error(sttErr.error || 'STT transcription failed');
          }
        } catch (err: any) {
          alert(language === 'vi' ? `Lỗi dịch giọng nói tự động: ${err.message}` : `Auto-transcription error: ${err.message}`);
          setIsAutoGenerating(false);
          return;
        } finally {
          setIsAutoGenerating(false);
        }
      }

      // 2. Reject if both Title and Content are still empty
      if (!currentTitle.trim() && !currentFullText.trim()) {
        alert(language === 'vi' ? 'Vui lòng nhập tiêu đề, nội dung bài viết hoặc tải lên ghi âm giọng nói.' : 'Please enter the title, detailed content, or upload a voice recording.');
        return;
      }

      // 4. Save manual article draft
      if (!resolvedArticleId) {
        setIsGeneratingAB(true);
        try {
          const saveRes = await fetch('/api/scrape', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: currentTitle,
              full_text: currentFullText,
              category: postData.category,
              author: postData.author,
              imageUrl: postData.imageUrl
            })
          });
          const savedData = await saveRes.json().catch(() => ({ error: 'Lỗi lưu bài viết' }));
          if (!saveRes.ok || savedData.error || !savedData.id) {
            throw new Error(savedData.error || 'Failed to save');
          }
          resolvedArticleId = savedData.id;
          setArticleId(savedData.id);
        } catch (err: any) {
          console.error('[Manual Save Error]:', err);
          alert(language === 'vi' ? `Không thể lưu bài viết tự soạn: ${err.message}` : `Cannot save manual article: ${err.message}`);
          setIsGeneratingAB(false);
          return;
        }
      }
    } else {
      if (!url.trim() && !resolvedArticleId) {
        alert(language === 'vi' ? 'Vui lòng cào/nhập bài viết trước khi sinh nội dung.' : 'Please crawl or import an article before generating.');
        return;
      }
    }

    setSelectedVariantId('');
    setExcludedPlatforms([]);
    setIsGeneratingAB(true);
    // Sync activePrompt with compiled preview so API receives the same prompt the user sees
    const compiledPrompt = compilePromptPreview();
    setActivePrompt(compiledPrompt);
    const tagsStr = formatTagsAsHashtags(postData.tags);

    // T-1.18: Build N variants (A, B, C) based on variantCount
    const variantIds = ['A', 'B', 'C'].slice(0, variantCount);
    const newVariants: SocialVariant[] = variantIds.map((id) => ({
      id,
      facebook: '',
      threads: '',
      instagram: '',
      title: postData.title,
      author: postData.author,
      tags: tagsStr,
      facebookStatus: 'draft',
      threadsStatus: 'draft',
      instagramStatus: 'draft',
    }));

    setVariants(newVariants);
    setStep(2);

    // T-1.18: Generate a new variantGroupId for this batch
    const newGroupId = crypto.randomUUID();
    setVariantGroupId(newGroupId);

    abortControllerRef.current = new AbortController();

    const projectGenerationEvent = (event: QuickPublishingEvent) => {
      if (event.type === 'text-fragment') {
        setVariants((prev) => prev.map((variant) => (
          variant.id === event.variantId
            ? { ...variant, [event.platform]: event.accumulated }
            : variant
        )));
        return;
      }
      if (event.type === 'caption-resolved') {
        const captionKey = event.platform === 'facebook'
          ? 'facebookCaptionId'
          : event.platform === 'threads'
            ? 'threadsCaptionId'
            : 'instagramCaptionId';
        setVariants((prev) => prev.map((variant) => (
          variant.id === event.variantId
            ? { ...variant, captionId: event.captionId, [captionKey]: event.captionId }
            : variant
        )));
        return;
      }
      if (event.type === 'article-resolved' && !articleId) {
        setArticleId(event.articleId);
        return;
      }
      if (event.type === 'generation-completed') {
        const originalKey = event.platform === 'facebook'
          ? 'originalFacebook'
          : event.platform === 'threads'
            ? 'originalThreads'
            : 'originalInstagram';
        setVariants((prev) => prev.map((variant) => (
          variant.id === event.variantId
            ? { ...variant, [originalKey]: event.content }
            : variant
        )));
        return;
      }
      if (event.type === 'generation-failed') {
        setVariants((prev) => prev.map((variant) => (
          variant.id === event.variantId
            ? {
              ...variant,
              [event.platform]: language === 'vi'
                ? 'Lỗi khi sinh nội dung AI cho phiên bản này.'
                : 'Error generating AI content for this variant.',
            }
            : variant
        )));
      }
    };

    try {
      await executeQuickPublishingGeneration({
        url: url.trim() || undefined,
        articleId: resolvedArticleId || undefined,
        platforms: selectedPlatforms,
        variantIds,
        variantGroupId: newGroupId,
        basePrompt: resolvedActivePrompt,
        model: selectedModel,
        platformConfigs: {
          facebook: platformConfigMap.facebook,
          threads: platformConfigMap.threads,
          instagram: platformConfigMap.instagram,
        },
        ...(selectedPrompt?.id && !String(selectedPrompt.id).startsWith('custom-')
          ? { promptId: selectedPrompt.id }
          : {}),
      }, projectGenerationEvent, abortControllerRef.current.signal);
    } finally {
      setIsGeneratingAB(false);
    }
  };

  // T-1.18: Regenerate a single variant without resetting the others
  const handleRegenerateVariant = async (variantId: string) => {
    if (!activePrompt || (!url.trim() && !articleId)) return;
    const variantIndex = ['A', 'B', 'C'].indexOf(variantId);
    if (variantIndex === -1) return;

    const oldCaptionId = variants.find((variant) => variant.id === variantId)?.captionId;
    const groupId = variantGroupId || crypto.randomUUID();
    if (!variantGroupId) setVariantGroupId(groupId);

    setRegeneratingVariantId(variantId);
    const captionKey = selectedPlatform === 'facebook'
      ? 'facebookCaptionId'
      : selectedPlatform === 'threads'
        ? 'threadsCaptionId'
        : 'instagramCaptionId';
    setVariants((prev) => prev.map((variant) => (
      variant.id === variantId
        ? { ...variant, [selectedPlatform]: '', captionId: undefined, [captionKey]: undefined }
        : variant
    )));

    try {
      await executeQuickPublishingRegeneration({
        url: url.trim() || undefined,
        articleId: articleId || undefined,
        platforms: [selectedPlatform],
        variantIds: [variantId],
        variantIndexes: [variantIndex],
        variantGroupId: groupId,
        basePrompt: activePrompt,
        model: selectedModel,
        oldCaptionId,
        platformConfigs: {
          facebook: platformConfigMap.facebook,
          threads: platformConfigMap.threads,
          instagram: platformConfigMap.instagram,
        },
        ...(variantIndex === 0 && selectedPrompt?.id && !String(selectedPrompt.id).startsWith('custom-')
          ? { promptId: selectedPrompt.id }
          : {}),
      }, variantId, (event) => {
        if (event.type === 'text-fragment') {
          setVariants((prev) => prev.map((variant) => (
            variant.id === variantId
              ? { ...variant, [selectedPlatform]: event.accumulated }
              : variant
          )));
          return;
        }
        if (event.type === 'caption-resolved') {
          setVariants((prev) => prev.map((variant) => (
            variant.id === variantId
              ? { ...variant, captionId: event.captionId, [captionKey]: event.captionId }
              : variant
          )));
          return;
        }
        if (event.type === 'generation-completed') {
          const originalKey = selectedPlatform === 'facebook'
            ? 'originalFacebook'
            : selectedPlatform === 'threads'
              ? 'originalThreads'
              : 'originalInstagram';
          setVariants((prev) => prev.map((variant) => (
            variant.id === variantId
              ? { ...variant, [originalKey]: event.content }
              : variant
          )));
          return;
        }
        if (event.type === 'generation-failed') {
          setVariants((prev) => prev.map((variant) => (
            variant.id === variantId
              ? {
                ...variant,
                [selectedPlatform]: language === 'vi'
                  ? 'Lỗi khi sinh nội dung AI cho phiên bản này.'
                  : 'Error generating AI content for this variant.',
              }
              : variant
          )));
        }
      });
    } finally {
      setRegeneratingVariantId(null);
    }
  };

  // Update prompt when platform or configurations change
  useEffect(() => {
    if (postData.title && (postData.full_text || postData.description) && !isGenerating && !isGeneratingSmartPrompt) {
      const newPrompt = getDefaultPromptTemplate(promptPlatform, postData.title, postData.full_text || postData.description, tone, length, emphasis);
      setActivePrompt(newPrompt);
    }
  }, [promptPlatform, tone, length, emphasis]);

  // Prompt Selector Library States
  const [promptsList, setPromptsList] = useState<any[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<any>(null);

  // AI Logic Functions
  const handleGenerateSmartPrompt = async () => {
    if (!postData.title || !(postData.full_text || postData.description)) return;
    setIsGeneratingSmartPrompt(true);
    try {
      const currentStyle = promptStylePerPlatform[activePromptTab] || 'formal';
      const res = await fetch('/api/prompts/generate-smart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: postData.title,
          content: postData.full_text || postData.description,
          platform: activePromptTab,
          style: currentStyle,
        }),
      });
      const data = await res.json();
      if (data.smartPrompt) {
        // Update promptPerPlatform for the active tab
        setPromptPerPlatform(prev => ({ ...prev, [activePromptTab]: data.smartPrompt }));
        // Keep activePrompt in sync
        setActivePrompt(data.smartPrompt);
      }
    } catch (error) {
      console.error('Error generating smart prompt:', error);
    } finally {
      setIsGeneratingSmartPrompt(false);
    }
  };

  const handleGenerateContent = async () => {
    if (!activePrompt) return;
    setIsGenerating(true);
    setLastGeneratedAiContent(null);
    try {
      const res = await fetch('/api/prompts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: postData.title,
          content: postData.full_text || postData.description,
          platform: selectedPlatform,
          customPrompt: activePrompt
        }),
      });
      const data = await res.json();
      if (data.content) {
        setLastGeneratedAiContent(data.content);
      }
    } catch (error) {
      console.error('Error generating content:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Analyze article content to automatically propose configurations (Tone, Length, Emphasis)
  const analyzeAndApplyConfig = async (title: string, content: string) => {
    try {
      const res = await fetch('/api/prompt-configs/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.tone) setTone(data.tone);
        if (data.length) setLength(data.length);
        if (data.emphasis) setEmphasis(data.emphasis);
        return {
          tone: data.tone || "Chuyên nghiệp",
          length: data.length || "Vừa (200-500 từ)",
          emphasis: data.emphasis || "",
        };
      }
    } catch (err) {
      console.error('Error analyzing article config:', err);
    }
    return {
      tone: "Chuyên nghiệp",
      length: "Vừa (200-500 từ)",
      emphasis: "",
    };
  };

  const handleSaveCurrentPrompt = async () => {
    const promptContent = promptPerPlatform[activePromptTab] || activePrompt;
    if (!promptContent) return null;
    setIsSavingPrompt(true);
    setSaveSuccess(false);
    try {
      const finalTitle = customPromptTitle.trim() || `AI Generated - ${new Date().toLocaleDateString('vi-VN')}`;
      const res = await fetch('/api/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: finalTitle,
          content: promptContent,
          platform: activePromptTab,
          tags: ['AI Generated', activePromptTab, promptStylePerPlatform[activePromptTab] || 'formal']
        }),
      });
      if (res.ok) {
        const json = await res.json();

        // --- US-2.07: Auto save/update prompt config ---
        try {
          const isEdit = !!selectedConfigId;
          const url = isEdit ? `/api/prompt-configs/${selectedConfigId}` : '/api/prompt-configs';
          const method = isEdit ? 'PUT' : 'POST';

          let configName = finalTitle;
          let configDefault = true;
          if (isEdit) {
            const found = savedConfigs.find(c => c.id === selectedConfigId);
            if (found) {
              configName = found.name;
              configDefault = found.is_default;
            }
          }

          await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: configName,
              platform: promptPlatform,
              params: { tone, length, emphasis, variant_count: variantCount },
              is_default: configDefault,
            }),
          });
          await fetchConfigs();
        } catch (configErr) {
          console.error('Error auto-saving prompt config:', configErr);
        }

        setSaveSuccess(true);
        setHasUnsavedChanges(false);
        setTimeout(() => setSaveSuccess(false), 3000);
        // Refresh prompt list
        const listRes = await fetch('/api/prompts?pageSize=100');
        if (listRes.ok) {
          const listJson = await listRes.json();
          setPromptsList(listJson.data || []);
        }
        return json.data;
      } else {
        const errJson = await res.json().catch(() => ({}));
        console.error('[Save Prompt API Error]:', errJson);
        const errMsg = errJson.error && errJson.details && Array.isArray(errJson.details)
          ? `${errJson.error} (${errJson.details.map((d: any) => `${d.path?.join('.') || 'trường'}: ${d.message || 'lỗi'}`).join(', ')})`
          : (errJson.error || 'Lỗi khi lưu prompt');
        alert(errMsg);
      }
    } catch (error) {
      console.error('Error saving prompt:', error);
    } finally {
      setIsSavingPrompt(false);
    }
    return null;
  };

  const handleSaveAiResult = (variantId: string) => {
    if (!lastGeneratedAiContent) return;
    handleUpdateVariantField(variantId, selectedPlatform as any, lastGeneratedAiContent);
    setLastGeneratedAiContent(null);
  };


  const getDefaultPromptTemplate = (platform: string, title: string, content: string, toneVal?: string, lengthVal?: string, emphasisVal?: string) => {
    const platformLabel = platform.charAt(0).toUpperCase() + platform.slice(1);
    const resolvedTone = toneVal || tone;
    const resolvedLength = lengthVal || length;
    const resolvedEmphasis = emphasisVal || emphasis;

    const truncatedTitle = title && title.length > 300 ? title.slice(0, 300) + '...' : title;
    const truncatedContent = content && content.length > 3000 ? content.slice(0, 3000) + '... (Nội dung rút gọn)' : content;

    return `Bạn là một Content Marketer chuyên nghiệp. Hãy viết một bài đăng mạng xã hội (${platformLabel} post) dựa trên thông tin sau:

**Nền tảng:** ${platformLabel}

**Dữ liệu đầu vào:**
*   **Tiêu đề bài báo:** "${truncatedTitle}"
*   **Nội dung tóm tắt:** "${truncatedContent}"
${resolvedEmphasis ? `*   **Khía cạnh đặc biệt cần nhấn mạnh:** "${resolvedEmphasis}"` : ''}

**Hướng dẫn khai thác nội dung:**
*   Sử dụng đoạn tóm tắt để tạo hook và gây tò mò ngay từ đầu.
*   Bài viết không cần kể chi tiết toàn bộ câu chuyện mà cần gợi mở để khuyến khích sự tương tác và muốn tìm hiểu thêm.

**Văn phong:**
*   Văn phong yêu cầu: ${resolvedTone}.
*   Khuyến khích sự tương tác, đặt câu hỏi gợi mở.

**Độ dài yêu cầu:** ${resolvedLength}.

**Cấu trúc bài viết:**
1.  **Hook (Móc câu):** Bắt đầu mạnh mẽ, gây tò mò hoặc bất ngờ từ đoạn tóm tắt.
2.  **Body (Nội dung chính):** Phát triển câu chuyện ngắn gọn, đúng trọng tâm.
3.  **Call to Action (CTA - Kêu gọi hành động):** Khuyến khích người đọc bình luận, chia sẻ quan điểm.
4.  **Hashtag:** Đề xuất 3-5 hashtag liên quan, phổ biến.

TUYỆT ĐỐI KHÔNG có lời dẫn giải, không "Ok", không "Đây là bài viết". Trả về TRỰC TIẾP bài đăng hoàn chỉnh.`;
  };

  // Compile a live preview of the final prompt from all layers
  const compilePromptPreview = () => {
    const platformLabel = selectedPlatform.charAt(0).toUpperCase() + selectedPlatform.slice(1);
    const truncatedTitle = postData.title && postData.title.length > 300 ? postData.title.slice(0, 300) + '...' : postData.title;
    const fullText = postData.full_text || postData.description || '';
    const truncatedContent = fullText.length > 3000 ? fullText.slice(0, 3000) + '... (Nội dung rút gọn)' : fullText;

    // Layer 1: Platform preset rules
    const selectedPreset = platformPresets.find((p: any) => p.id === selectedPlatformPresetId);
    const presetRules = selectedPreset?.rules || `(Chưa chọn quy chuẩn ${selectedPlatform === 'facebook' ? 'Facebook' : selectedPlatform === 'threads' ? 'Threads' : 'Instagram'})`;

    // Layer 2: Brand style
    const selectedStyle = savedConfigs.find((c: any) => c.id === selectedConfigId);
    let styleSection = '';
    if (selectedStyle && selectedStyle.rules) {
      let brandRules = selectedStyle.rules;
      try {
        const parsed = JSON.parse(brandRules);
        const generalRules = parsed.general || '';
        const platformRules = parsed[selectedPlatform] || '';
        if (generalRules && platformRules) {
          brandRules = generalRules + '\n\n' + platformRules;
        } else {
          brandRules = generalRules || platformRules || '';
        }
      } catch (e) {
        // Fallback to raw string if it's not JSON
      }
      styleSection = brandRules ? brandRules : '*   Không có hướng dẫn văn phong riêng.';
    } else {
      styleSection = '*   Không áp dụng quy chuẩn thương hiệu cụ thể.';
    }

    // Layer 3: Custom instructions
    const requirementsList = [
      { id: 'cta', name: 'Thêm kêu gọi hành động' },
      { id: 'quote', name: 'Bắt đầu bằng câu trích dẫn' },
      { id: 'emoji', name: 'Sử dụng nhiều emoji' },
      { id: 'stats', name: 'Tập trung vào số liệu' },
      { id: 'hashtag', name: 'Tập trung hashtag độc quyền' },
    ];
    let finalCustomText = customPromptText.trim();
    if (selectedQuickPicks.length > 0) {
      const picksText = selectedQuickPicks.map(id => requirementsList.find(r => r.id === id)?.name).filter(Boolean).join(', ');
      finalCustomText = finalCustomText
        ? `${finalCustomText} (Yêu cầu nhanh: ${picksText})`
        : `Yêu cầu nhanh: ${picksText}`;
    }
    const customSection = finalCustomText ? `*   ${finalCustomText}\n` : '';

    return `Bạn là một Content Marketer chuyên nghiệp. Hãy viết một bài đăng mạng xã hội (${platformLabel} post) dựa trên thông tin sau:

**Nền tảng:** ${platformLabel}

**Dữ liệu đầu vào:**
*   **Tiêu đề bài báo:** "${truncatedTitle || '(Chưa có tiêu đề)'}"
*   **Nội dung tóm tắt:** "${truncatedContent || '(Chưa có nội dung)'}"

**Hướng dẫn khai thác nội dung:**
*   ${presetRules}
${customSection}
**Văn phong:**
${styleSection}
**Cấu trúc bài viết:**
1.  Hook (Móc câu): Tạo điểm nhấn gây tò mò từ đoạn tóm tắt bài báo.
2.  Body (Nội dung chính): Phát triển câu chuyện ngắn gọn, súc tích.
3.  Call to Action (CTA): Gợi mở tương tác, đặt câu hỏi cho độc giả.
4.  Hashtag: Đề xuất 3-5 hashtag liên quan.

TUYỆT ĐỐI KHÔNG có lời dẫn giải, không "Dưới đây là...", không "Ok". Trả về TRỰC TIẾP bài đăng hoàn chỉnh.`;
  };

  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [promptSearch, setPromptSearch] = useState('');
  const [loadingPrompts, setLoadingPrompts] = useState(false);

  // Fetch prompts library on mount
  useEffect(() => {
    const fetchPrompts = async () => {
      setLoadingPrompts(true);
      try {
        const res = await fetch('/api/prompts?pageSize=100');
        if (res.ok) {
          const json = await res.json();
          setPromptsList(json.data || []);
        }
      } catch (e) {
        console.error("Failed to fetch prompts for selector:", e);
      } finally {
        setLoadingPrompts(false);
      }
    };
    fetchPrompts();
  }, []);

  const filteredPromptsForModal = promptsList.filter(p =>
    p.name.toLowerCase().includes(promptSearch.toLowerCase()) ||
    p.content.toLowerCase().includes(promptSearch.toLowerCase())
  );


  const [facebookSlot] = useState(() => getFutureScheduleSlot(1));
  const [threadsSlot] = useState(() => getFutureScheduleSlot(2));
  const [instagramSlot] = useState(() => getFutureScheduleSlot(3));
  const [facebookDate, setFacebookDate] = useState<string>(facebookSlot.date);
  const [facebookTime, setFacebookTime] = useState<string>(facebookSlot.time);
  const [threadsDate, setThreadsDate] = useState<string>(threadsSlot.date);
  const [threadsTime, setThreadsTime] = useState<string>(threadsSlot.time);
  const [instagramDate, setInstagramDate] = useState<string>(instagramSlot.date);
  const [instagramTime, setInstagramTime] = useState<string>(instagramSlot.time);
  const [facebookError, setFacebookError] = useState<string>("");
  const [threadsError, setThreadsError] = useState<string>("");
  const [instagramError, setInstagramError] = useState<string>("");
  const [isScheduled, setIsScheduled] = useState(false);
  const [activeWeek, setActiveWeek] = useState<0 | 1 | 2>(0);
  const [fbResetTrigger, setFbResetTrigger] = useState(0);
  const [threadsResetTrigger, setThreadsResetTrigger] = useState(0);
  const [instagramResetTrigger, setInstagramResetTrigger] = useState(0);
  const [isSchedulingLoading, setIsSchedulingLoading] = useState(false);
  const [schedulingError, setSchedulingError] = useState<string | null>(null);



  const [existingPosts, setExistingPosts] = useState<any[]>([]);
  const [selectedCell, setSelectedCell] = useState<{ dateStr: string; hour: number; posts: any[] } | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const handleCancel = async (postId: string) => {
    setActionLoadingId(postId);
    try {
      const res = await fetch(`/api/scheduled-posts/${postId}/cancel`, {
        method: 'POST',
      });
      if (res.ok) {
        if (selectedCell) {
          const updatedPosts = selectedCell.posts.map((p: any) =>
            p.id === postId ? { ...p, status: 'cancelled' } : p
          );
          setSelectedCell({ ...selectedCell, posts: updatedPosts });
        }
        // Refresh existing posts
        const loadRes = await fetch('/api/scheduled-posts');
        if (loadRes.ok) {
          const json = await loadRes.json();
          if (json.data) {
            setExistingPosts(json.data);
          }
        }
      } else {
        const errJson = await res.json().catch(() => ({}));
        alert(errJson.error || 'Lỗi khi hủy lịch đăng bài');
      }
    } catch (err) {
      console.error('Cancel error:', err);
      alert('Lỗi kết nối khi hủy lịch đăng bài');
    } finally {
      setActionLoadingId(null);
    }
  };

  useEffect(() => {
    async function loadExistingPosts() {
      try {
        const res = await fetch('/api/scheduled-posts');
        if (res.ok) {
          const json = await res.json();
          if (json.data) {
            setExistingPosts(json.data);
          }
        }
      } catch (err) {
        console.error('Failed to load existing scheduled posts:', err);
      }
    }
    loadExistingPosts();
  }, [step]);

  const getPostDateAndHour = (scheduledAtStr: string) => {
    const date = new Date(scheduledAtStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    const hour = date.getHours();
    return { dateStr, hour };
  };

  const getCellPostCount = (dateStr: string, hour: number, excludePlatform?: string) => {
    let count = existingPosts.filter(p => {
      const { dateStr: postDate, hour: postHour } = getPostDateAndHour(p.scheduled_at);
      return postDate === dateStr && postHour === hour;
    }).length;

    const targetPlatforms = selectedPlatforms;

    if (excludePlatform !== 'facebook' && targetPlatforms.includes('facebook') && !excludedPlatforms.includes('facebook') && facebookDate === dateStr) {
      const fbHr = parseInt(facebookTime.split(':')[0]) || 0;
      if (fbHr === hour) count++;
    }

    if (excludePlatform !== 'threads' && targetPlatforms.includes('threads') && !excludedPlatforms.includes('threads') && threadsDate === dateStr) {
      const trHr = parseInt(threadsTime.split(':')[0]) || 0;
      if (trHr === hour) count++;
    }

    if (excludePlatform !== 'instagram' && targetPlatforms.includes('instagram') && !excludedPlatforms.includes('instagram') && instagramDate === dateStr) {
      const igHr = parseInt(instagramTime.split(':')[0]) || 0;
      if (igHr === hour) count++;
    }

    return count;
  };

  const isCellOccupied = (dateStr: string, hour: number, excludePlatform?: string) => {
    // Đã loại bỏ giới hạn 3 bài/giờ để người dùng lên lịch tự do
    return false;
  };

  const getCellPosts = (dateStr: string, hour: number) => {
    const list: any[] = [];
    const targetPlatforms = selectedPlatforms;

    if (targetPlatforms.includes('facebook') && !excludedPlatforms.includes('facebook') && facebookDate === dateStr) {
      const fbHr = parseInt(facebookTime.split(':')[0]) || 0;
      if (fbHr === hour) {
        list.push({
          type: 'draft',
          platform: 'facebook',
          timeStr: facebookTime,
          title: postData.title || (language === 'vi' ? 'Facebook (Bản nháp)' : 'Facebook (Draft)'),
          time: facebookTime,
        });
      }
    }

    if (targetPlatforms.includes('threads') && !excludedPlatforms.includes('threads') && threadsDate === dateStr) {
      const trHr = parseInt(threadsTime.split(':')[0]) || 0;
      if (trHr === hour) {
        list.push({
          type: 'draft',
          platform: 'threads',
          timeStr: threadsTime,
          title: postData.title || (language === 'vi' ? 'Threads (Bản nháp)' : 'Threads (Draft)'),
          time: threadsTime,
        });
      }
    }

    if (targetPlatforms.includes('instagram') && !excludedPlatforms.includes('instagram') && instagramDate === dateStr) {
      const igHr = parseInt(instagramTime.split(':')[0]) || 0;
      if (igHr === hour) {
        list.push({
          type: 'draft',
          platform: 'instagram',
          timeStr: instagramTime,
          title: postData.title || (language === 'vi' ? 'Instagram (Bản nháp)' : 'Instagram (Draft)'),
          time: instagramTime,
        });
      }
    }

    existingPosts.forEach((post) => {
      const { dateStr: postDate, hour: postHour } = getPostDateAndHour(post.scheduled_at);
      if (postDate === dateStr && postHour === hour) {
        const title = post.captions?.articles?.title || post.captions?.ai_content?.substring(0, 30) + '...' || (language === 'vi' ? 'Bài viết không tên' : 'Untitled Post');
        const date = new Date(post.scheduled_at);
        const mins = String(date.getMinutes()).padStart(2, '0');
        const timeStr = `${String(postHour).padStart(2, '0')}:${mins}`;
        list.push({
          type: 'existing',
          platform: post.platform,
          timeStr: timeStr,
          title: title,
          status: post.status,
          id: post.id
        });
      }
    });

    return list.sort((a, b) => a.timeStr.localeCompare(b.timeStr));
  };

  const weekDays = Array.from({ length: 21 }, (_, index) => {
    const start = getWeekStartDate();
    start.setDate(start.getDate() + index);
    const dateStr = toDateInputValue(start);

    const daysNameMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const name = daysNameMap[start.getDay()];
    const label = start.getDate().toString();
    const isToday = dateStr === toDateInputValue(new Date());

    return { name, date: dateStr, label, isToday };
  });

  const handleFacebookDateChange = (val: string) => {
    const activeHour = parseInt(facebookTime.split(':')[0]) || 9;
    if (isCellOccupied(val, activeHour, 'facebook')) {
      setFacebookError(language === 'vi' ? `Lịch bị cản trở! Ô lúc ${facebookTime} ngày ${val} đã đầy bài (tối đa 3 bài/giờ).` : `Slot blocked! The slot has reached maximum capacity (max 3 posts/hour) at ${facebookTime} on ${val}.`);
    } else {
      setFacebookError("");
      setFacebookDate(val);
      // Auto-update activeWeek tab
      const dayIdx = weekDays.findIndex(d => d.date === val);
      if (dayIdx >= 0) {
        const weekIdx = Math.floor(dayIdx / 7) as 0 | 1 | 2;
        setActiveWeek(weekIdx);
      }
    }
  };

  const handleFacebookTimeChange = (val: string) => {
    const [h, m] = val.split(':').map(Number);
    const clampedHour = Math.max(0, Math.min(23, h));
    const clampedMinute = Math.max(0, Math.min(59, m || 0));
    const finalTime = `${clampedHour.toString().padStart(2, '0')}:${clampedMinute.toString().padStart(2, '0')}`;

    if (isCellOccupied(facebookDate, clampedHour, 'facebook')) {
      setFacebookError(language === 'vi' ? `Lịch bị cản trở! Ô lúc ${finalTime} ngày ${facebookDate} đã đầy bài (tối đa 3 bài/giờ).` : `Slot blocked! The slot has reached maximum capacity (max 3 posts/hour) at ${finalTime} on ${facebookDate}.`);
    } else {
      setFacebookError("");
      setFacebookTime(finalTime);
    }
  };

  const handleThreadsDateChange = (val: string) => {
    const activeHour = parseInt(threadsTime.split(':')[0]) || 10;
    if (isCellOccupied(val, activeHour, 'threads')) {
      setThreadsError(language === 'vi' ? `Lịch bị cản trở! Ô lúc ${threadsTime} ngày ${val} đã đầy bài (tối đa 3 bài/giờ).` : `Slot blocked! The slot has reached maximum capacity (max 3 posts/hour) at ${threadsTime} on ${val}.`);
    } else {
      setThreadsError("");
      setThreadsDate(val);
      // Auto-update activeWeek tab
      const dayIdx = weekDays.findIndex(d => d.date === val);
      if (dayIdx >= 0) {
        const weekIdx = Math.floor(dayIdx / 7) as 0 | 1 | 2;
        setActiveWeek(weekIdx);
      }
    }
  };

  const handleThreadsTimeChange = (val: string) => {
    const [h, m] = val.split(':').map(Number);
    const clampedHour = Math.max(0, Math.min(23, h));
    const clampedMinute = Math.max(0, Math.min(59, m || 0));
    const finalTime = `${clampedHour.toString().padStart(2, '0')}:${clampedMinute.toString().padStart(2, '0')}`;

    if (isCellOccupied(threadsDate, clampedHour, 'threads')) {
      setThreadsError(language === 'vi' ? `Lịch bị cản trở! Ô lúc ${finalTime} ngày ${threadsDate} đã đầy bài (tối đa 3 bài/giờ).` : `Slot blocked! The slot has reached maximum capacity (max 3 posts/hour) at ${finalTime} on ${threadsDate}.`);
    } else {
      setThreadsError("");
      setThreadsTime(finalTime);
    }
  };

  const handleFacebookDragError = (blockedDate: string, hour: number) => {
    const timeStr = `${hour.toString().padStart(2, '0')}:00`;
    setFacebookError(
      language === 'vi'
        ? `Lịch bị cản trở! Ô lúc ${timeStr} ngày ${blockedDate} đã đầy bài (tối đa 3 bài/giờ).`
        : `Slot blocked! The slot has reached maximum capacity (max 3 posts/hour) at ${timeStr} on ${blockedDate}.`
    );
    setTimeout(() => setFacebookError(""), 4500);
  };

  const handleThreadsDragError = (blockedDate: string, hour: number) => {
    const timeStr = `${hour.toString().padStart(2, '0')}:00`;
    setThreadsError(
      language === 'vi'
        ? `Lịch bị cản trở! Ô lúc ${timeStr} ngày ${blockedDate} đã đầy bài (tối đa 3 bài/giờ).`
        : `Slot blocked! The slot has reached maximum capacity (max 3 posts/hour) at ${timeStr} on ${blockedDate}.`
    );
    setTimeout(() => setThreadsError(""), 4500);
  };

  const handleFbDragEnd = (event: any, info: any) => {
    if (!boardRef.current) return;
    const rect = boardRef.current.getBoundingClientRect();
    const x = info.point.x - rect.left;
    const y = info.point.y - rect.top;

    const col = Math.floor(x / (rect.width / 7));
    const row = Math.floor(y / (rect.height / 24));

    const clampedCol = Math.max(0, Math.min(6, col));
    const clampedRow = Math.max(0, Math.min(23, row));

    const targetDate = weekDays[activeWeek * 7 + clampedCol].date;
    const targetHour = clampedRow;

    // Cho phép chồng chéo tự do
    const isOccupied = false;

    if (isOccupied) {
      handleFacebookDragError(targetDate, targetHour);
      setFbResetTrigger(prev => prev + 1);
    } else {
      setFacebookError("");
      setFacebookDate(targetDate);
      // Keep existing minutes when dragging to a new hour
      const existingMinutes = facebookTime.split(':')[1] || "00";
      setFacebookTime(`${targetHour.toString().padStart(2, '0')}:${existingMinutes}`);
    }
  };

  const handleThreadsDragEnd = (event: any, info: any) => {
    if (!boardRef.current) return;
    const rect = boardRef.current.getBoundingClientRect();
    const x = info.point.x - rect.left;
    const y = info.point.y - rect.top;

    const col = Math.floor(x / (rect.width / 7));
    const row = Math.floor(y / (rect.height / 24));

    const clampedCol = Math.max(0, Math.min(6, col));
    const clampedRow = Math.max(0, Math.min(23, row));

    const targetDate = weekDays[activeWeek * 7 + clampedCol].date;
    const targetHour = clampedRow;

    // Cho phép chồng chéo tự do
    const isOccupied = false;

    if (isOccupied) {
      handleThreadsDragError(targetDate, targetHour);
      setThreadsResetTrigger(prev => prev + 1);
    } else {
      setThreadsError("");
      setThreadsDate(targetDate);
      // Keep existing minutes when dragging to a new hour
      const existingMinutes = threadsTime.split(':')[1] || "00";
      setThreadsTime(`${targetHour.toString().padStart(2, '0')}:${existingMinutes}`);
    }
  };

  const handleInstagramDateChange = (val: string) => {
    const activeHour = parseInt(instagramTime.split(':')[0]) || 11;
    if (isCellOccupied(val, activeHour, 'instagram')) {
      setInstagramError(language === 'vi' ? `Lịch bị cản trở! Ô lúc ${instagramTime} ngày ${val} đã đầy bài (tối đa 3 bài/giờ).` : `Slot blocked! The slot has reached maximum capacity (max 3 posts/hour) at ${instagramTime} on ${val}.`);
    } else {
      setInstagramError("");
      setInstagramDate(val);
      // Auto-update activeWeek tab
      const dayIdx = weekDays.findIndex(d => d.date === val);
      if (dayIdx >= 0) {
        const weekIdx = Math.floor(dayIdx / 7) as 0 | 1 | 2;
        setActiveWeek(weekIdx);
      }
    }
  };

  const handleInstagramTimeChange = (val: string) => {
    const [h, m] = val.split(':').map(Number);
    const clampedHour = Math.max(0, Math.min(23, h));
    const clampedMinute = Math.max(0, Math.min(59, m || 0));
    const finalTime = `${clampedHour.toString().padStart(2, '0')}:${clampedMinute.toString().padStart(2, '0')}`;

    if (isCellOccupied(instagramDate, clampedHour, 'instagram')) {
      setInstagramError(language === 'vi' ? `Lịch bị cản trở! Ô lúc ${finalTime} ngày ${instagramDate} đã đầy bài (tối đa 3 bài/giờ).` : `Slot blocked! The slot has reached maximum capacity (max 3 posts/hour) at ${finalTime} on ${instagramDate}.`);
    } else {
      setInstagramError("");
      setInstagramTime(finalTime);
    }
  };

  const handleInstagramDragError = (blockedDate: string, hour: number) => {
    const timeStr = `${hour.toString().padStart(2, '0')}:00`;
    setInstagramError(
      language === 'vi'
        ? `Lịch bị cản trở! Ô lúc ${timeStr} ngày ${blockedDate} đã đầy bài (tối đa 3 bài/giờ).`
        : `Slot blocked! The slot has reached maximum capacity (max 3 posts/hour) at ${timeStr} on ${blockedDate}.`
    );
    setTimeout(() => setInstagramError(""), 4500);
  };

  const handleInstagramDragEnd = (event: any, info: any) => {
    if (!boardRef.current) return;
    const rect = boardRef.current.getBoundingClientRect();
    const x = info.point.x - rect.left;
    const y = info.point.y - rect.top;

    const col = Math.floor(x / (rect.width / 7));
    const row = Math.floor(y / (rect.height / 24));

    const clampedCol = Math.max(0, Math.min(6, col));
    const clampedRow = Math.max(0, Math.min(23, row));

    const targetDate = weekDays[activeWeek * 7 + clampedCol].date;
    const targetHour = clampedRow;

    // Cho phép chồng chéo tự do
    const isOccupied = false;

    if (isOccupied) {
      handleInstagramDragError(targetDate, targetHour);
      setInstagramResetTrigger(prev => prev + 1);
    } else {
      setInstagramError("");
      setInstagramDate(targetDate);
      // Keep existing minutes when dragging to a new hour
      const existingMinutes = instagramTime.split(':')[1] || "00";
      setInstagramTime(`${targetHour.toString().padStart(2, '0')}:${existingMinutes}`);
    }
  };

  const getDayLabel = (dayName: string) => {
    if (language === 'vi') {
      switch (dayName) {
        case 'Mon': return 'Thứ hai';
        case 'Tue': return 'Thứ ba';
        case 'Wed': return 'Thứ tư';
        case 'Thu': return 'Thứ năm';
        case 'Fri': return 'Thứ sáu';
        case 'Sat': return 'Thứ bảy';
        case 'Sun': return 'Chủ nhật';
        default: return dayName;
      }
    } else {
      switch (dayName) {
        case 'Mon': return 'Monday';
        case 'Tue': return 'Tuesday';
        case 'Wed': return 'Wednesday';
        case 'Thu': return 'Thursday';
        case 'Fri': return 'Friday';
        case 'Sat': return 'Saturday';
        case 'Sun': return 'Sunday';
        default: return dayName;
      }
    }
  };

  const [url, setUrl] = useState('');
  const [isFetching, setIsFetching] = useState(false);

  // ── AI Generation State (T-1.12.3 / T-1.12.4 / T-1.12.5) ──────────────────
  interface Prompt { id: string; name: string; platform: string; content: string; }
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [promptsLoading, setPromptsLoading] = useState(false);
  const [selectedPromptId, setSelectedPromptId] = useState<string>('');
  const [captionId, setCaptionId] = useState<string>('');
  const [streamedCaption, setStreamedCaption] = useState('');
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generateDone, setGenerateDone] = useState(false);
  const [selectedModel, setSelectedModel] = useState<'gpt4' | 'gemini' | 'claude'>('gpt4');
  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch list configs of user
  const fetchConfigs = async () => {
    try {
      const res = await fetch(`/api/prompt-configs`);
      if (res.ok) {
        const json = await res.json();
        setSavedConfigs(json.data || []);
      }
    } catch (err) {
      console.error('Lỗi fetchConfigs:', err);
    }
  };

  // Fetch platform presets
  const fetchPlatformPresets = useCallback(async (platform: SocialPlatform) => {
    setIsLoadingPlatformPresets(true);
    try {
      const currentSaved = platformConfigMapRef.current[platform]?.presetId;
      const { presets, selectedPresetId } = await loadQuickPublishingPresets(platform, currentSaved);
      setPlatformPresets(presets);
      setSelectedPlatformPresetId(selectedPresetId);
    } catch (err) {
      console.error('Lỗi fetchPlatformPresets:', err);
    } finally {
      setIsLoadingPlatformPresets(false);
    }
  }, [loadQuickPublishingPresets]);

  useEffect(() => {
    if (selectedPlatform) {
      fetchPlatformPresets(selectedPlatform);
    }
  }, [selectedPlatform, fetchPlatformPresets]);

  // Fetch default config
  const fetchDefaultConfig = async () => {
    try {
      const res = await fetch(`/api/prompt-configs/default`);
      if (res.ok) {
        const json = await res.json();
        const config = json.data;
        if (config) {
          setSelectedConfigId(config.id);
          setPlatformConfigMap(prev => ({
            facebook: { ...prev.facebook, configId: config.id },
            threads: { ...prev.threads, configId: config.id },
            instagram: { ...prev.instagram, configId: config.id },
          }));
          if (config.params) {
            if (config.params.tone) setTone(config.params.tone);
            if (config.params.length) setLength(config.params.length);
            if (config.params.emphasis) setEmphasis(config.params.emphasis);
            if (config.params.variant_count) setVariantCount(config.params.variant_count);
          }
        } else {
          setSelectedConfigId('');
        }
      }
    } catch (err) {
      console.error('Lỗi fetchDefaultConfig:', err);
    }
  };
  // Load configs when platform changes
  useEffect(() => {
    if (mounted) {
      fetchConfigs();
      fetchDefaultConfig();
    }
  }, [selectedPlatform, mounted]);

  // Delete config
  const handleDeleteConfig = async (configId: string) => {
    const confirmMsg = language === 'vi'
      ? 'Bạn có chắc chắn muốn xóa cấu hình này?'
      : 'Are you sure you want to delete this configuration?';
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/prompt-configs/${configId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Lỗi khi xóa cấu hình');
      }

      await fetchConfigs();
      setSelectedConfigId('');
    } catch (err) {
      console.error('Lỗi handleDeleteConfig:', err);
    }
  };

  // Handle dropdown config selection change
  const handleSelectConfig = (configId: string) => {
    setSelectedConfigId(configId);
    if (!configId || configId === 'none') {
      setTone('Chuyên nghiệp');
      setLength('Vừa (200-500 từ)');
      setEmphasis('');
      return;
    }
    const config = savedConfigs.find(c => c.id === configId);
    if (config && config.params) {
      if (config.params.tone) setTone(config.params.tone);
      if (config.params.length) setLength(config.params.length);
      if (config.params.custom_rules) setEmphasis(config.params.custom_rules);
    }
  };

  // Redesigned Style Modal Action Handlers
  const handleCreateNewConfig = () => {
    setEditingConfigId(null);
    setStyleFormName('');
    setStyleFormPlatform('all');
    setStyleFormRulesObj({
      general: '# QUY TẮC CHUNG\n- Tone giọng: [Ví dụ: Thân thiện, chuyên nghiệp]\n- Persona: [Ví dụ: Chuyên gia chia sẻ kiến thức]',
      facebook: '',
      threads: '',
      instagram: ''
    });
    setStyleRulesTab('general');
    setStyleFormIsDefault(false);
    setIsStyleModalOpen(true);
  };

  const handleEditConfig = (configId: string) => {
    const config = savedConfigs.find(c => c.id === configId);
    if (!config) return;
    setEditingConfigId(configId);
    setStyleFormName(config.name);
    setStyleFormPlatform(config.platform || 'all');

    let parsedRules: Record<string, string> = { general: '', facebook: '', threads: '', instagram: '' };
    try {
      if (config.rules && config.rules.trim().startsWith('{')) {
        parsedRules = { ...parsedRules, ...JSON.parse(config.rules) };
      } else {
        parsedRules.general = config.rules || '';
      }
    } catch {
      parsedRules.general = config.rules || '';
    }

    setStyleFormRulesObj(parsedRules);
    setStyleRulesTab('general');
    setStyleFormIsDefault(config.is_default || false);
    setIsStyleModalOpen(true);
  };

  const handleSaveStyleConfig = async () => {
    if (!styleFormName.trim()) {
      alert(language === 'vi' ? 'Vui lòng nhập tên văn phong' : 'Please enter style name');
      return;
    }

    const isEdit = !!editingConfigId;
    const url = isEdit ? `/api/prompt-configs/${editingConfigId}` : '/api/prompt-configs';
    const method = isEdit ? 'PUT' : 'POST';

    setIsSavingConfig(true);
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: styleFormName.trim(),
          is_default: styleFormIsDefault,
          rules: JSON.stringify(styleFormRulesObj),
          params: {}
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Lỗi khi lưu cấu hình');
      }

      const json = await res.json();
      await fetchConfigs();

      const savedData = json.data;
      if (savedData) {
        setSelectedConfigId(savedData.id);
        handleSelectConfig(savedData.id);
      }

      setIsStyleModalOpen(false);
      setPopup({
        isOpen: true,
        message: language === 'vi' ? 'Lưu văn phong thành công!' : 'Saved style successfully!',
        type: 'success'
      });
    } catch (err: any) {
      alert(err.message || 'Lỗi hệ thống');
    } finally {
      setIsSavingConfig(false);
    }
  };

  // --- US-2.08: Lọc và kiểm tra tính hợp lệ của dữ liệu nhập tùy chỉnh (Spam / Rác) ---
  const isValidCustomInput = (text: string) => {
    const trimmed = text.trim();
    if (trimmed.length < 2 || trimmed.length > 50) return false;

    const words = trimmed.split(/\s+/);

    // 1. Chống từ liền nhau quá dài (gõ phím rác liền mạch)
    for (const word of words) {
      if (word.length > 15) return false;
    }

    // 2. Chống lặp từ 1 ký tự quá nhiều (ví dụ: "ộ i i", "a b c d e")
    const singleCharWords = words.filter(w => w.length === 1);
    if (singleCharWords.length >= 2) return false;

    // 3. Nhận diện các pattern spam phím QWERTY phổ biến
    const spamPatterns = [
      /asd/i, /dsad/i, /asda/i, /zxc/i, /qwe/i, /sdf/i, /dfg/i, /fgh/i, /ghj/i, /hjk/i, /jkl/i,
      /rty/i, /yui/i, /uio/i, /iop/i, /xcv/i, /cvb/i, /vbn/i, /bnm/i, /dsa/i, /sda/i
    ];
    for (const pattern of spamPatterns) {
      if (pattern.test(trimmed)) return false;
    }

    // 4. Chỉ cho phép các ký tự hợp lệ
    const validRegex = /^[a-zA-Z0-9À-ỹ\s\-(),./]+$/u;
    return validRegex.test(trimmed);
  };

  // --- US-2.08: Helper to replace platform name in prompt text when switched ---
  const replacePlatformInPrompt = (promptText: string, newPlat: string, oldPlat: string) => {
    if (!promptText) return promptText;

    const formatLabel = (p: string) => {
      if (p === 'facebook') return 'Facebook';
      if (p === 'instagram') return 'Instagram';
      if (p === 'threads' || p === 'thread') return 'Threads';
      return p;
    };

    const newLabel = formatLabel(newPlat);
    const newLabelLower = newPlat === 'threads' ? 'threads' : newPlat.toLowerCase();

    let result = promptText;
    const platforms = [
      { key: 'facebook', label: 'Facebook' },
      { key: 'instagram', label: 'Instagram' },
      { key: 'threads', label: 'Threads' },
      { key: 'thread', label: 'Threads' },
    ];

    platforms.forEach(p => {
      if (p.key !== newPlat) {
        const regexCapital = new RegExp(p.label, 'g');
        result = result.replace(regexCapital, newLabel);
        const regexLower = new RegExp(p.key, 'g');
        result = result.replace(regexLower, newLabelLower);
      }
    });

    return result;
  };

  const handlePromptPlatformChange = (newPlat: 'facebook' | 'threads' | 'instagram') => {
    const oldPlat = promptPlatform;
    setPromptPlatform(newPlat);

    if (activePrompt) {
      const updatedPrompt = replacePlatformInPrompt(activePrompt, newPlat, oldPlat);
      setActivePrompt(updatedPrompt);
    }
  };

  // Helper to build generation prompt including configurations
  const buildGenerationPrompt = (basePrompt: string) => {
    let promptParts = [];
    if (tone) promptParts.push(`Văn phong: ${tone}`);
    if (length) promptParts.push(`Độ dài bài viết: ${length}`);
    if (emphasis) promptParts.push(`Khía cạnh cần nhấn mạnh: ${emphasis}`);
    if (basePrompt) promptParts.push(`Hướng dẫn chi tiết: ${basePrompt}`);
    return promptParts.join('. ');
  };

  // Fetch prompts on mount
  useEffect(() => {
    setPromptsLoading(true);
    fetch('/api/prompts?pageSize=50')
      .then((r) => r.json())
      .then((json) => {
        if (json?.data) setPrompts(json.data);
      })
      .catch(() => { })
      .finally(() => setPromptsLoading(false));
  }, []);

  // Prevent leaving the page with unsaved changes (T-1.13.5)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const hasUnsavedChanges = variants.some(v => {
        return (v.facebook && v.facebook !== v.originalFacebook) ||
          (v.threads && v.threads !== v.originalThreads) ||
          (v.instagram && v.instagram !== v.originalInstagram);
      });
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [variants]);

  // Local history tracking for Ctrl+Z Undo – 1 second after user stops typing
  useEffect(() => {
    if (step !== 2) return;

    const timer = setTimeout(() => {
      setSavedHistory(prev => {
        const currentStr = JSON.stringify(variants);
        const lastHistory = prev[prev.length - 1];
        const lastStr = lastHistory ? JSON.stringify(lastHistory) : '';
        if (currentStr !== lastStr) {
          return [...prev, JSON.parse(currentStr)];
        }
        return prev;
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [variants, step]);

  const handleRevertToSaved = () => {
    if (savedHistory.length === 0) return;

    const currentStr = JSON.stringify(variants);
    const latestSavedStr = JSON.stringify(savedHistory[savedHistory.length - 1]);

    if (currentStr !== latestSavedStr) {
      setVariants(JSON.parse(latestSavedStr));
    } else if (savedHistory.length > 1) {
      const newHistory = [...savedHistory];
      newHistory.pop();
      const previousSaved = newHistory[newHistory.length - 1];
      setVariants(JSON.parse(JSON.stringify(previousSaved)));
      setSavedHistory(newHistory);
    }
  };



  const handleGenerate = async () => {
    // Check if selected platforms are connected
    const unconnected = selectedPlatforms.filter(p => !connectedPlatforms.includes(p));
    if (unconnected.length > 0) {
      const platformLabels = unconnected.map(p => p === 'threads' ? 'Meta Threads' : p === 'instagram' ? 'Instagram Business' : 'Facebook Page').join(', ');
      setPopup({
        isOpen: true,
        type: 'warning',
        message: language === 'vi' 
          ? `Bạn chưa liên kết tài khoản cho: ${platformLabels}. Vui lòng liên kết tài khoản trong trang Cài đặt trước khi sinh nội dung.`
          : `You have not linked accounts for: ${platformLabels}. Please link them in Settings before generating content.`
      });
      return;
    }

    if (!selectedPromptId) {
      setGenerateError(language === 'vi' ? 'Vui lòng chọn một prompt trước.' : 'Please select a prompt first.');
      return;
    }
    setGenerateError(null);
    setStreamedCaption('');
    setCaptionId('');
    setGenerateDone(false);
    setIsGenerating(true);

    abortControllerRef.current = new AbortController();

    try {
      let failed = false;
      await executeQuickPublishingGeneration({
        url,
        platforms: [selectedPlatform],
        variantIds: ['A'],
        variantGroupId: crypto.randomUUID(),
        basePrompt: '',
        promptId: selectedPromptId,
        model: selectedModel,
        platformConfigs: {
          facebook: { presetId: '', customText: '', quickPicks: [], configId: 'none' },
          threads: { presetId: '', customText: '', quickPicks: [], configId: 'none' },
          instagram: { presetId: '', customText: '', quickPicks: [], configId: 'none' },
          [selectedPlatform]: {
            presetId: selectedPlatformPresetId,
            customText: '',
            quickPicks: [],
            configId: selectedConfigId || 'none',
          },
        },
      }, (event) => {
        if (event.type === 'text-fragment') {
          setStreamedCaption(event.accumulated);
          return;
        }
        if (event.type === 'caption-resolved') {
          setCaptionId(event.captionId);
          setVariants((prev) => prev.map((variant) => (
            variant.id === 'A' ? { ...variant, captionId: event.captionId } : variant
          )));
          return;
        }
        if (event.type === 'article-resolved') {
          setArticleId(event.articleId);
          return;
        }
        if (event.type === 'generation-completed') {
          setGenerateDone(true);
          setVariants((prev) => prev.map((variant) => (
            variant.id === 'A'
              ? { ...variant, facebook: event.content, threads: event.content }
              : variant
          )));
          return;
        }
        if (event.type === 'generation-failed') failed = true;
      }, abortControllerRef.current.signal);
      if (failed) throw new QuickPublishingError('GENERATION_FAILED');
    } catch (err: unknown) {
      if (err instanceof QuickPublishingError && err.code === 'GENERATION_ABORTED') return;
      setGenerateError(language === 'vi'
        ? 'Đã xảy ra lỗi khi sinh caption. Thử lại.'
        : 'An error occurred while generating. Please retry.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCancelGenerate = () => {
    abortControllerRef.current?.abort();
    setIsGenerating(false);
    setIsGeneratingAB(false);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl + Z Undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (step === 2) {
          e.preventDefault();
          handleRevertToSaved();
        }
      }

      // Ctrl + Enter (or Cmd + Enter): Generate AI content
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (step === 2 && !isGenerating) {
          e.preventDefault();
          handleGenerate();
        }
      }

      // Esc: Cancel generation or close modal
      if (e.key === 'Escape') {
        if (isGenerating || isGeneratingAB) {
          e.preventDefault();
          handleCancelGenerate();
        }
      }

      // Ctrl + Shift + C: Copy selected variant content
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'c') {
        if (step === 2) {
          e.preventDefault();
          const activeVariant = variants.find(v => v.id === (selectedVariantId || 'A'));
          const textToCopy = activeVariant ? (activeVariant[selectedPlatform] || '') : '';
          if (textToCopy) {
            navigator.clipboard.writeText(textToCopy).then(() => {
              alert(language === 'vi' ? 'Đã sao chép nội dung biến thể!' : 'Variant content copied to clipboard!');
            }).catch(err => {
              console.error('Failed to copy text: ', err);
            });
          }
        }
      }

      // Arrow keys (when not in input/textarea): Toggle platform
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const activeEl = document.activeElement;
        const isInputFocused = activeEl && (
          activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.getAttribute('contenteditable') === 'true'
        );
        if (!isInputFocused) {
          e.preventDefault();
          const platforms: ('facebook' | 'threads' | 'instagram')[] = ['facebook', 'threads', 'instagram'];
          const idx = platforms.indexOf(selectedPlatform);
          if (idx !== -1) {
            let nextIdx = idx;
            if (e.key === 'ArrowRight') {
              nextIdx = (idx + 1) % 3;
            } else if (e.key === 'ArrowLeft') {
              nextIdx = (idx - 1 + 3) % 3;
            }
            setSelectedPlatform(platforms[nextIdx]);
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    step,
    variants,
    savedHistory,
    isGenerating,
    isGeneratingAB,
    selectedVariantId,
    selectedPlatform,
    language
  ]);

  // Gocnhinmoi Explorer Modal State
  const [isExplorerOpen, setIsExplorerOpen] = useState(false);
  const [explorerUrl, setExplorerUrl] = useState('https://gocnhinmoi.com.vn/');
  const [iframeSrc, setIframeSrc] = useState('/api/proxy?url=' + encodeURIComponent('https://gocnhinmoi.com.vn/'));
  const [iframeKey, setIframeKey] = useState(0);
  const [isScraping, setIsScraping] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  const handleRefresh = () => {
    setIframeSrc(`/api/proxy?url=${encodeURIComponent(explorerUrl)}`);
    setIframeKey(k => k + 1);
  };

  // Manual Ingestion Form State
  const [postData, setPostData] = useState({
    title: '',
    category: '',
    description: '',
    author: '',
    published_at: '',
    views: '',
    tags: '',
    imageUrl: '',
    full_text: '',
    body: [] as any[],
    author_image_url: '',
    url: ''
  });

  // Input Ingestion Mode selection state (crawl vs manual)
  const [inputMode, setInputMode] = useState<'crawl' | 'manual'>('crawl');
  const [isVoiceAssistantExpanded, setIsVoiceAssistantExpanded] = useState(false);

  // Drag and Drop Image & Document Handlers
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [isParsingDoc, setIsParsingDoc] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);

  // Original Post Full Content Viewer Modal State
  const [isOriginalPostModalOpen, setIsOriginalPostModalOpen] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(true);
  };

  const handleDragLeave = () => {
    setIsDraggingFile(false);
  };

  const handleUploadFiles = async (files: File[]) => {
    setDocError(null);
    setArticleId(null);
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    const docFiles = files.filter(f => {
      const ext = f.name.toLowerCase();
      return ext.endsWith('.pdf') || ext.endsWith('.docx') || ext.endsWith('.doc');
    });

    // 1. Xử lý file ảnh
    if (imageFiles.length > 0) {
      const urls = postData.imageUrl ? postData.imageUrl.split('\n').filter(Boolean) : [];
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id || 'public';

      for (const file of imageFiles) {
        const fileExt = file.name.split('.').pop() || 'png';
        const path = `${userId}/article_images_${Date.now()}-${Math.random().toString(36).substring(2, 11)}.${fileExt}`;
        
        const { error } = await supabase.storage.from('avatars').upload(path, file, {
          upsert: true,
          contentType: file.type
        });

        if (error) {
          console.error('[Upload Image Error]:', error);
          // Fallback to data URL if upload fails
          const reader = new FileReader();
          const loadPromise = new Promise<string>((resolve) => {
            reader.onloadend = () => resolve(reader.result as string);
          });
          reader.readAsDataURL(file);
          const dataUrl = await loadPromise;
          urls.push(dataUrl);
        } else {
          const { data } = supabase.storage.from('avatars').getPublicUrl(path);
          if (data?.publicUrl) {
            urls.push(data.publicUrl);
          }
        }
      }
      setPostData(prev => ({ ...prev, imageUrl: urls.join('\n') }));
    }

    // 2. Xử lý file tài liệu
    if (docFiles.length > 0) {
      const docFile = docFiles[0]; // Xử lý file tài liệu đầu tiên
      setIsParsingDoc(true);
      try {
        const fd = new FormData();
        fd.append('file', docFile);

        const res = await fetch('/api/parse-doc', {
          method: 'POST',
          body: fd
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || (language === 'vi' ? 'Lỗi trích xuất tài liệu' : 'Failed to extract document'));

        const extractedText = data.text || '';
        if (extractedText) {
          setPostData(prev => ({
            ...prev,
            full_text: extractedText,
            description: extractedText,
            title: prev.title || docFile.name.replace(/\.[^/.]+$/, ''), // Lấy tên file làm tiêu đề nếu trống
          }));
        }
      } catch (err: any) {
        setDocError(err.message);
      } finally {
        setIsParsingDoc(false);
      }
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await handleUploadFiles(files);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length > 0) {
      await handleUploadFiles(files);
    }
  };

  const handleDeleteImage = (indexToDelete: number) => {
    const urls = postData.imageUrl.split('\n').filter(Boolean);
    const newUrls = urls.filter((_, idx) => idx !== indexToDelete);
    setPostData({ ...postData, imageUrl: newUrls.join('\n') });
  };

  // Voice / STT Mode State
  const voiceFileInputRef = useRef<HTMLInputElement>(null);
  const [voiceFile, setVoiceFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isAudioDragging, setIsAudioDragging] = useState(false);
  const [isAutoGenerating, setIsAutoGenerating] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [sttError, setSttError] = useState<string | null>(null);

  useEffect(() => {
    if (voiceFile) {
      const url = URL.createObjectURL(voiceFile);
      setAudioUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setAudioUrl(null);
    }
  }, [voiceFile]);

  // Direct In-App Recording States
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [showMicGuide, setShowMicGuide] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // Format record duration as MM:SS
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    setSttError(null);
    audioChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new File([audioBlob], 'ghi-am-truc-tiep.webm', { type: 'audio/webm' });
        setVoiceFile(file);
      };

      // Set up canvas waveform
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioCtxRef.current = audioContext;
      const analyser = audioContext.createAnalyser();
      analyserRef.current = analyser;
      analyser.fftSize = 256;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const drawWaveform = () => {
        if (!canvasRef.current || !analyserRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const width = canvas.width;
        const height = canvas.height;

        analyserRef.current.getByteTimeDomainData(dataArray);

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);

        ctx.lineWidth = 2;
        ctx.strokeStyle = '#4F46E5'; // primary color
        ctx.beginPath();

        const sliceWidth = width / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
          const y = (v * height) / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }

          x += sliceWidth;
        }

        ctx.lineTo(width, height / 2);
        ctx.stroke();

        animationFrameRef.current = requestAnimationFrame(drawWaveform);
      };

      drawWaveform();

      mediaRecorder.start();
      setIsRecording(true);
      setRecordDuration(0);

      timerRef.current = setInterval(() => {
        setRecordDuration(prev => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Microphone error:', err);
      setShowMicGuide(true);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (timerRef.current) clearInterval(timerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    }
  };

  const cancelRecording = () => {
    setIsRecording(false);
    setVoiceFile(null);
    if (timerRef.current) clearInterval(timerRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
    }
  };

  const handleTranscribeAndRewrite = async () => {
    setArticleId(null);
    if (!voiceFile) return;
    setIsTranscribing(true);
    setSttError(null);
    try {
      const fd = new FormData();
      fd.append('file', voiceFile);
      // Always let backend generate title — frontend decides whether to apply it

      const res = await fetch('/api/stt', {
        method: 'POST',
        body: fd
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi xử lý giọng nói');

      const finalText = data.rewritten_post || data.transcript || '';
      if (finalText) {
        setPostData(prev => ({
          ...prev,
          full_text: finalText,
          description: finalText,
          // Always overwrite title, category, and tags from audio transcription
          title: data.generated_title || voiceFile.name.replace(/\.[^/.]+$/, ''),
          category: data.generated_category || prev.category || '',
          tags: data.generated_tags || prev.tags || ''
        }));
      }
    } catch (err: any) {
      setSttError(err.message);
    } finally {
      setIsTranscribing(false);
    }
  };

  // Auto-fill author = tên user hiện tại, ngày = hôm nay khi vào mode manual
  useEffect(() => {
    if (inputMode !== 'manual') return;
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) return;
      const u = session.user;
      const displayName =
        u.user_metadata?.full_name ||
        u.user_metadata?.name ||
        u.email?.split('@')[0] ||
        '';
      const todayISO = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      setPostData(prev => ({
        ...prev,
        author: prev.author || displayName,
        published_at: prev.published_at || todayISO,
      }));
    });
  }, [inputMode]);

  // Toggles for Custom Display Components in Social Previews
  const [toggles, setToggles] = useState({
    showTitle: true,
    showAuthor: true,
    showDescription: true,
    showTags: true,
    showImage: true
  });

  // Inline Editing Active States
  const [editState, setEditState] = useState<{ variantId: string; field: string } | null>(null);

  // Helper to extract targeted platforms from prompt
  const getPromptTargetPlatforms = (prompt: any): ('facebook' | 'threads' | 'instagram')[] => {
    if (!prompt) return ['facebook', 'threads', 'instagram'];

    const platforms: ('facebook' | 'threads' | 'instagram')[] = [];

    const pPlatform = (prompt.platform || '').toLowerCase();
    const pTags = Array.isArray(prompt.tags)
      ? prompt.tags.map((t: string) => t.toLowerCase())
      : typeof prompt.tags === 'string'
        ? [prompt.tags.toLowerCase()]
        : [];
    const pName = (prompt.name || '').toLowerCase();
    const pContent = (prompt.content || '').toLowerCase();

    // Check Facebook/FB matching
    const matchesFb = pPlatform === 'facebook' ||
      pTags.includes('facebook') ||
      pTags.includes('fb') ||
      pName.includes('facebook') ||
      pContent.includes('facebook');

    // Check Thread/Threads matching
    const matchesThread = pPlatform === 'thread' ||
      pPlatform === 'threads' ||
      pTags.includes('thread') ||
      pTags.includes('threads') ||
      pName.includes('thread') ||
      pName.includes('threads') ||
      pContent.includes('thread') ||
      pContent.includes('threads');

    // Check Instagram/Insta matching
    const matchesInsta = pPlatform === 'instagram' ||
      pTags.includes('instagram') ||
      pTags.includes('insta') ||
      pName.includes('instagram') ||
      pContent.includes('instagram') ||
      pName.includes('insta') ||
      pContent.includes('insta');

    if (matchesFb) platforms.push('facebook');
    if (matchesThread) platforms.push('threads');
    if (matchesInsta) platforms.push('instagram');

    if (platforms.length === 0) {
      return ['facebook', 'threads', 'instagram'];
    }
    return platforms;
  };

  // Helper to generate platform-specific content from the current article data only.
  const generatePlatformContent = (platform: SocialPlatform, prompt: any, data: typeof postData, isVariantB: boolean = false) => {
    const categoryClean = (data.category || '').replace('#', '').trim();
    const title = data.title.trim();
    const description = (data.full_text || data.description).trim();
    const author = data.author.trim();
    const tags = data.tags.trim();
    const promptName = prompt?.name ? `[${prompt.name}]` : '';

    // T-1.19.1: Tạo 2 phong cách khác nhau cho A/B testing
    let body = description;
    if (isVariantB) {
      // Phong cách B: Thân thiện, đặt câu hỏi gợi mở, thêm emoji
      body = `✨ ${description}\n\n🤔 Bạn nghĩ sao về vấn đề này? Hãy để lại ý kiến dưới phần bình luận nhé! 👇`;
    }

    const intro = [promptName, categoryClean ? `[${categoryClean}]` : '', title].filter(Boolean).join(' ');

    if (!intro && !body && !author && !tags) return '';

    if (platform === 'threads') {
      return [intro, body, author ? `Tác giả: ${author}` : '', tags].filter(Boolean).join('\n\n');
    }

    if (platform === 'instagram') {
      return [intro, body, author ? `Photo/Credit: ${author}` : '', tags].filter(Boolean).join('\n\n');
    }

    return [intro, body, author ? `Nguồn: ${author}` : '', tags].filter(Boolean).join('\n\n');
  };

  // Helper to generate new variants with prompt-platform filtering constraints
  // T-1.19.1: Tạo 2 bản A/B với 2 phong cách khác nhau từ cùng 1 prompt
  const generateVariants = (data: typeof postData, prompt: any) => {
    const targetPlatforms = getPromptTargetPlatforms(prompt);
    const tagsStr = formatTagsAsHashtags(data.tags);

    const newVariants: SocialVariant[] = [
      {
        id: 'A',
        facebook: targetPlatforms.includes('facebook') ? generatePlatformContent('facebook', prompt, data, false) : "",
        threads: targetPlatforms.includes('threads') ? generatePlatformContent('threads', prompt, data, false) : "",
        instagram: targetPlatforms.includes('instagram') ? generatePlatformContent('instagram', prompt, data, false) : "",
        originalFacebook: targetPlatforms.includes('facebook') ? generatePlatformContent('facebook', prompt, data, false) : "",
        originalThreads: targetPlatforms.includes('threads') ? generatePlatformContent('threads', prompt, data, false) : "",
        originalInstagram: targetPlatforms.includes('instagram') ? generatePlatformContent('instagram', prompt, data, false) : "",
        title: data.title,
        author: data.author,
        tags: tagsStr
      },
      {
        id: 'B',
        // Bản B sẽ có văn phong khác một chút (ví dụ: thêm câu hỏi gợi mở hoặc thay đổi cách tiếp cận)
        facebook: targetPlatforms.includes('facebook') ? generatePlatformContent('facebook', prompt, data, true) : "",
        threads: targetPlatforms.includes('threads') ? generatePlatformContent('threads', prompt, data, true) : "",
        instagram: targetPlatforms.includes('instagram') ? generatePlatformContent('instagram', prompt, data, true) : "",
        originalFacebook: targetPlatforms.includes('facebook') ? generatePlatformContent('facebook', prompt, data, true) : "",
        originalThreads: targetPlatforms.includes('threads') ? generatePlatformContent('threads', prompt, data, true) : "",
        originalInstagram: targetPlatforms.includes('instagram') ? generatePlatformContent('instagram', prompt, data, true) : "",
        title: data.title,
        author: data.author,
        tags: tagsStr
      }
    ];

    setVariants(newVariants);
    setSavedHistory([JSON.parse(JSON.stringify(newVariants))]);
    setSelectedVariantId('');

    // Auto-select the first available platform tab
    if (targetPlatforms.length > 0) {
      const currentSelected = selectedPlatform as any;
      if (!targetPlatforms.includes(currentSelected)) {
        setSelectedPlatform(targetPlatforms[0]);
      }
    }
  };

  // Handle URL change postMessage from Iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'URL_CHANGE') {
        const proxiedUrl = event.data.url;
        try {
          const urlObj = new URL(proxiedUrl);
          const original = urlObj.searchParams.get('url');
          if (original) {
            setExplorerUrl(original);
          } else if (proxiedUrl.startsWith('http')) {
            setExplorerUrl(proxiedUrl);
          }
        } catch (e) {
          // Ignore
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const renderNewspaperLogo = (size: 'sm' | 'lg' = 'sm') => {
    const isDanTri = url.includes('dantri.com.vn') || (postData?.url && postData.url.includes('dantri.com.vn'));
    const isTuoiTre = url.includes('tuoitre.vn') || (postData?.url && postData.url.includes('tuoitre.vn'));

    let logoText = 'GócNhìnMới';
    let subText = language === 'vi' ? 'Mạng xã hội' : 'Social Network';
    let colorClass = 'text-red-650';

    if (isDanTri) {
      logoText = 'DÂN TRÍ';
      subText = language === 'vi' ? 'Báo điện tử' : 'E-Newspaper';
      colorClass = 'text-[#007f3f]';
    } else if (isTuoiTre) {
      logoText = 'TuổiTrẻ';
      subText = language === 'vi' ? 'Tin nóng mỗi ngày' : 'Daily News';
      colorClass = 'text-[#E43A45]';
    }

    if (size === 'lg') {
      return (
        <div className="flex flex-col gap-0.5 select-none">
          <span className={`${colorClass} font-black text-lg tracking-tighter uppercase font-sans`}>
            {logoText}
          </span>
          <span className="text-[8px] text-slate-450 dark:text-zinc-500 font-black tracking-widest uppercase -mt-1">
            {subText}
          </span>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-0.5 select-none">
        <span className={`${colorClass} font-black text-base tracking-tighter uppercase font-sans`}>
          {logoText}
        </span>
        <span className="text-[7px] text-slate-450 dark:text-zinc-500 font-black tracking-widest uppercase -mt-1">
          {subText}
        </span>
      </div>
    );
  };

  const getAvatarProps = () => {
    const isDanTri = url.includes('dantri.com.vn') || (postData?.url && postData.url.includes('dantri.com.vn'));
    const isTuoiTre = url.includes('tuoitre.vn') || (postData?.url && postData.url.includes('tuoitre.vn'));

    let bgClass = 'bg-red-100 dark:bg-red-955/40';
    let textClass = 'text-red-650 dark:text-red-400';
    let defaultInit = 'CD';

    if (isDanTri) {
      bgClass = 'bg-[#E6F4EA] dark:bg-emerald-955/40';
      textClass = 'text-[#007f3f] dark:text-emerald-450';
      defaultInit = 'DT';
    } else if (isTuoiTre) {
      bgClass = 'bg-[#FCE8E6] dark:bg-rose-955/40';
      textClass = 'text-[#E43A45] dark:text-rose-450';
      defaultInit = 'TT';
    }

    let initials = defaultInit;
    if (postData.author) {
      const parts = postData.author.trim().split(/\s+/);
      if (parts.length >= 2) {
        initials = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      } else if (parts.length === 1 && parts[0]) {
        initials = parts[0].slice(0, 2).toUpperCase();
      }
    }

    return { bgClass, textClass, initials, imageUrl: postData.author_image_url || '' };
  };

  // Fetch / Scrape Handler for original URL
  const handleFetch = async () => {
    if (!url || !url.trim()) {
      alert(language === 'vi' ? 'Vui lòng nhập url bài viết' : 'Please enter an article URL');
      return;
    }
    setIsFetching(true);
    try {
      const res = await fetch(`/api/scrape?url=${encodeURIComponent(url)}`);
      if (res.ok) {
        const data = await res.json();
        if (!data.error) {
          const updatedPostData = {
            title: data.title || '',
            category: data.category || '',
            description: data.description || '',
            author: data.author || '',
            published_at: data.published_at || '',
            views: data.views || '',
            tags: data.tags || '',
            imageUrl: data.imageUrl || '',
            full_text: data.full_text || data.description || '',
            body: data.body || [],
            author_image_url: data.author_image_url || '',
            url: data.url || ''
          };
          setPostData(updatedPostData);
          setArticleId(data.id || null);
          setCaptionId('');

          // Auto analyze and propose config
          const analysis = await analyzeAndApplyConfig(updatedPostData.title, updatedPostData.full_text);

          const defaultPrompt = getDefaultPromptTemplate(
            selectedPlatform,
            updatedPostData.title,
            updatedPostData.full_text,
            analysis.tone,
            analysis.length,
            analysis.emphasis
          );
          setActivePrompt(defaultPrompt);

          // Auto-generate a unique prompt title based on the scraped article title
          const basePromptTitle = updatedPostData.title ? (updatedPostData.title.length > 150 ? updatedPostData.title.slice(0, 147) + '...' : updatedPostData.title) : 'Bài viết';
          let uniqueTitle = basePromptTitle;
          let counter = 1;
          const allExistingNames = [
            ...(promptsList || []).map((p) => p?.name),
            ...(prompts || []).map((p) => p?.name),
            customPromptTitle
          ].filter(Boolean);
          while (allExistingNames.includes(uniqueTitle)) {
            uniqueTitle = `${basePromptTitle} (${counter})`;
            counter++;
          }
          setCustomPromptTitle(uniqueTitle);

          generateVariants(updatedPostData, selectedPrompt);
          setIsFetching(false);
          setHasUnsavedChanges(true);
          return;
        }
      }
    } catch (e) {
      console.error("Scraper fetch error:", e);
    } finally {
      setIsFetching(false);
    }
  };

  const handleToggle = (key: keyof typeof toggles) => {
    setToggles(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Add a new variant copy dynamically
  const handleAddVariant = () => {
    if (variants.length >= variantCount) {
      return;
    }
    const nextLetter = String.fromCharCode(65 + variants.length); // C, D, E...
    const firstTags = variants[0]?.tags || '';
    const targetPlatforms = getPromptTargetPlatforms(selectedPrompt);
    const newVariant: SocialVariant = {
      id: nextLetter,
      facebook: targetPlatforms.includes('facebook') ? `[Phiên bản đặc biệt ${nextLetter}] ${postData.description}` : "",
      threads: targetPlatforms.includes('threads') ? `[Phiên bản đặc biệt ${nextLetter}] ${postData.description}` : "",
      instagram: targetPlatforms.includes('instagram') ? `[Phiên bản đặc biệt ${nextLetter}] ${postData.description}` : "",
      title: postData.title,
      author: postData.author,
      tags: firstTags
    };
    setVariants([...variants, newVariant]);
  };

  // Update variant field state on inline edit
  const handleUpdateVariantField = (variantId: string, field: keyof SocialVariant, value: string) => {
    setVariants(prev => prev.map(v => v.id === variantId ? { ...v, [field]: value } : v));
    setHasUnsavedChanges(true);
  };

  // Sync state values to module-level refs for EditableText
  _editState = editState;
  _setEditState = setEditState;
  _handleUpdateVariantField = handleUpdateVariantField;
  _isGeneratingAB = isGeneratingAB;

  // Import from Live Explorer
  const handleImportFromExplorer = async () => {
    setIsScraping(true);
    setIsFetching(true);
    setUrl(explorerUrl);
    setIsExplorerOpen(false);
    try {
      const res = await fetch(`/api/scrape?url=${encodeURIComponent(explorerUrl)}`);
      if (res.ok) {
        const data = await res.json();
        if (!data.error) {
          const updatedPostData = {
            title: data.title || '',
            category: data.category || '',
            description: data.description || '',
            author: data.author || '',
            published_at: data.published_at || '',
            views: data.views || '',
            tags: data.tags || '',
            imageUrl: data.imageUrl || '',
            full_text: data.full_text || data.description || '',
            body: data.body || [],
            author_image_url: data.author_image_url || '',
            url: data.url || ''
          };
          setPostData(updatedPostData);
          setArticleId(data.id || null);
          setCaptionId('');

          // Auto analyze and propose config
          const analysis = await analyzeAndApplyConfig(updatedPostData.title, updatedPostData.full_text);

          const defaultPrompt = getDefaultPromptTemplate(
            selectedPlatform,
            updatedPostData.title,
            updatedPostData.full_text,
            analysis.tone,
            analysis.length,
            analysis.emphasis
          );
          setActivePrompt(defaultPrompt);

          // Auto-generate a unique prompt title based on the scraped article title
          const basePromptTitle = updatedPostData.title ? (updatedPostData.title.length > 150 ? updatedPostData.title.slice(0, 147) + '...' : updatedPostData.title) : 'Bài viết';
          let uniqueTitle = basePromptTitle;
          let counter = 1;
          const allExistingNames = [
            ...(promptsList || []).map((p) => p?.name),
            ...(prompts || []).map((p) => p?.name),
            customPromptTitle
          ].filter(Boolean);
          while (allExistingNames.includes(uniqueTitle)) {
            uniqueTitle = `${basePromptTitle} (${counter})`;
            counter++;
          }
          setCustomPromptTitle(uniqueTitle);

          generateVariants(updatedPostData, selectedPrompt);
          setHasUnsavedChanges(true);
        }
      }
    } catch (e) {
      console.error("Scraper explorer error:", e);
    } finally {
      setIsScraping(false);
      setIsFetching(false);
    }
  };

  // Back navigation for live proxy iframe
  const handleIframeBack = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      try {
        iframeRef.current.contentWindow.history.back();
      } catch (e) {
        console.error("Failed to navigate back:", e);
      }
    }
  };



  const getSelectedVariantCaption = () => {
    const activeId = selectedVariantId || (variants.length > 0 ? variants[0].id : 'A');
    const selectedVariant = variants.find((variant) => variant.id === activeId) || variants[0];
    if (!selectedVariant) return '';
    return (selectedVariant[selectedPlatform] || '').trim();
  };

  const ensureArticleForCaption = async () => {
    if (articleId) return articleId;
    if (!url.trim()) {
      throw new Error(
        language === 'vi'
          ? 'Vui lòng nhập hoặc import URL bài viết trước khi lên lịch.'
          : 'Please enter or import an article URL before scheduling.'
      );
    }

    const scrapeRes = await fetch(`/api/scrape?url=${encodeURIComponent(url.trim())}`);
    const scrapeData = await scrapeRes.json().catch(() => ({}));

    if (!scrapeRes.ok || scrapeData.error || !scrapeData.id) {
      throw new Error(
        scrapeData.error ||
        (language === 'vi'
          ? 'Không thể tạo dữ liệu bài viết để lưu caption.'
          : 'Could not create article data for saving the caption.')
      );
    }

    setArticleId(scrapeData.id);
    return scrapeData.id as string;
  };

  const compileFinalMessage = (variant: SocialVariant, platform: SocialPlatform) => {
    const parts: string[] = [];

    if (toggles.showTitle && variant.title) {
      const categoryClean = postData.category.replace('#', '').trim();
      const titleLine = categoryClean
        ? `[${categoryClean}] ${variant.title}`
        : `${variant.title}`;
      parts.push(titleLine);
    }

    if (toggles.showDescription) {
      const descVal = variant[platform] || '';
      if (descVal.trim()) {
        parts.push(descVal.trim());
      }
    }

    const metaParts: string[] = [];
    if (toggles.showAuthor && variant.author) {
      const authorPrefix = `${language === 'vi' ? 'Tác giả:' : 'Author:'} `;
      metaParts.push(`${authorPrefix}${variant.author.trim()}`);
    }
    if (toggles.showTags && variant.tags) {
      metaParts.push(variant.tags.trim());
    }

    if (metaParts.length > 0) {
      parts.push(metaParts.join('\n'));
    }

    return parts.join('\n\n');
  };

  const handleConfirmSchedule = async () => {
    const activePlatforms = selectedPlatforms.filter((platform) => !excludedPlatforms.includes(platform));
    const unconnected = activePlatforms.filter((platform) => !connectedPlatforms.includes(platform));
    if (unconnected.length > 0) {
      const platformLabels = unconnected.map((platform) => (
        platform === 'threads' ? 'Meta Threads' : platform === 'instagram' ? 'Instagram Business' : 'Facebook Page'
      )).join(', ');
      setPopup({
        isOpen: true,
        type: 'warning',
        message: language === 'vi'
          ? `Bạn chưa liên kết tài khoản cho: ${platformLabels}. Vui lòng liên kết tài khoản trong trang Cài đặt trước khi lên lịch đăng bài.`
          : `You have not linked accounts for: ${platformLabels}. Please link them in Settings before scheduling posts.`,
      });
      return;
    }
    if (facebookError || threadsError || instagramError || isSchedulingLoading) return;

    const activeId = selectedVariantId || variants[0]?.id || 'A';
    const selectedVariant = variants.find((variant) => variant.id === activeId) || variants[0];
    if (!selectedVariant) {
      setSchedulingError(language === 'vi'
        ? 'Vui lòng tạo nội dung trước khi lên lịch.'
        : 'Please generate content before scheduling.');
      return;
    }

    const scheduleByPlatform = {
      facebook: { date: facebookDate, time: facebookTime },
      threads: { date: threadsDate, time: threadsTime },
      instagram: { date: instagramDate, time: instagramTime },
    };
    const captionKeyFor = (platform: SocialPlatform) => (
      platform === 'facebook'
        ? 'facebookCaptionId'
        : platform === 'threads'
          ? 'threadsCaptionId'
          : 'instagramCaptionId'
    ) as 'facebookCaptionId' | 'threadsCaptionId' | 'instagramCaptionId';
    const originalKeyFor = (platform: SocialPlatform) => (
      platform === 'facebook'
        ? 'originalFacebook'
        : platform === 'threads'
          ? 'originalThreads'
          : 'originalInstagram'
    ) as 'originalFacebook' | 'originalThreads' | 'originalInstagram';
    const statusKeyFor = (platform: SocialPlatform) => (
      platform === 'facebook'
        ? 'facebookStatus'
        : platform === 'threads'
          ? 'threadsStatus'
          : 'instagramStatus'
    ) as 'facebookStatus' | 'threadsStatus' | 'instagramStatus';

    setIsSchedulingLoading(true);
    setSchedulingError(null);
    try {
      const needsArticle = activePlatforms.some((platform) => !selectedVariant[captionKeyFor(platform)]);
      const resolvedArticleId = needsArticle ? await ensureArticleForCaption() : (articleId || undefined);
      const imageUrls = toggles.showImage && postData.imageUrl
        ? postData.imageUrl.split('\n').map((line) => line.trim()).filter(Boolean)
        : [];
      const connected = connectedPlatforms.filter((platform): platform is SocialPlatform => (
        platform === 'facebook' || platform === 'threads' || platform === 'instagram'
      ));

      await executeQuickPublishingSchedule({
        connectedPlatforms: connected,
        imageUrls,
        platforms: activePlatforms.map((platform) => {
          const currentContent = selectedVariant[platform] || '';
          const originalContent = selectedVariant[originalKeyFor(platform)] || currentContent;
          const selectedPromptId = selectedPrompt?.id && !String(selectedPrompt.id).startsWith('custom-')
            ? selectedPrompt.id as string
            : undefined;
          return {
            platform,
            scheduledAt: new Date(
              `${scheduleByPlatform[platform].date}T${scheduleByPlatform[platform].time}`
            ).toISOString(),
            draft: {
              variantId: selectedVariant.id,
              platform,
              articleId: resolvedArticleId,
              captionId: selectedVariant[captionKeyFor(platform)] || undefined,
              promptId: selectedPromptId,
              originalContent,
              currentContent,
              compiledContent: compileFinalMessage(selectedVariant, platform),
            },
          };
        }),
      }, (event) => {
        if (event.type === 'draft-resolved') {
          const captionKey = captionKeyFor(event.platform);
          const statusKey = statusKeyFor(event.platform);
          setCaptionId(event.captionId);
          setVariants((prev) => prev.map((variant) => (
            variant.id === event.variantId
              ? {
                ...variant,
                captionId: event.captionId,
                [captionKey]: event.captionId,
                [statusKey]: event.status,
              }
              : variant
          )));
          return;
        }
        if (event.type === 'platform-scheduled') {
          const statusKey = statusKeyFor(event.platform);
          setVariants((prev) => prev.map((variant) => (
            variant.id === selectedVariant.id ? { ...variant, [statusKey]: 'scheduled' } : variant
          )));
          return;
        }
        if (event.type === 'schedule-completed' && event.failed.length === 0) {
          setIsScheduled(true);
          setHasUnsavedChanges(false);
        }
      });
    } catch (error) {
      if (error instanceof QuickPublishingError && error.code === 'SCHEDULE_INVALID') {
        setSchedulingError(language === 'vi'
          ? 'Vui lòng chọn ít nhất một nền tảng và thời gian hợp lệ trong tương lai.'
          : 'Please select at least one platform and a valid future time.');
      } else {
        setSchedulingError(language === 'vi'
          ? 'Lỗi xảy ra trong quá trình lên lịch bài đăng.'
          : 'An error occurred while scheduling posts.');
      }
    } finally {
      setIsSchedulingLoading(false);
    }
  };

  const renderAiConfigForm = (isModal: boolean = false) => {
    return (
      <div className="flex flex-col gap-4 text-left">
        {/* Platform tabs */}
        <div className="flex gap-1.5 bg-slate-100/80 dark:bg-zinc-900/80 rounded-2xl p-1.5 mb-2">
          {selectedPlatforms.map(pid => {
            const pm = [
              { id: 'facebook', label: 'Facebook', emoji: '🔵', bgColor: 'bg-blue-600' },
              { id: 'threads', label: 'Threads', emoji: '💬', bgColor: 'bg-zinc-900' },
              { id: 'instagram', label: 'Instagram', emoji: '📷', bgColor: 'bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-600' }
            ].find(p => p.id === pid)!;
            const isActive = selectedPlatform === pid;
            return (
              <button
                key={pid}
                type="button"
                onClick={() => setSelectedPlatform(pid as any)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer border ${isActive
                  ? 'bg-white dark:bg-slate-800 shadow-md border-primary/20 dark:border-primary/30 text-primary dark:text-white ring-1 ring-primary/20 scale-[1.02] z-10'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-black/5 dark:hover:bg-white/5 bg-transparent scale-100'
                  }`}
              >
                <span className="flex items-center gap-1.5">
                  {pm.id === 'facebook' && <Facebook size={14} className={`transition-colors ${isActive ? 'fill-primary text-primary' : 'fill-slate-400 text-slate-400'}`} />}
                  {pm.id === 'threads' && <ThreadsIcon size={14} className={`transition-colors ${isActive ? 'text-primary dark:text-white' : 'text-slate-400'}`} />}
                  {pm.id === 'instagram' && <Instagram size={14} className={`transition-colors ${isActive ? 'text-primary dark:text-primary-hover' : 'text-slate-400'}`} />}
                  {pm.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Platform-specific hint */}
        {(() => {
          const hints = {
            facebook: {
              vi: 'Tối ưu độ dài 80-180 ký tự, dùng CTA rõ ràng, gắn hashtag cuối bài.',
              en: 'Optimal 80-180 chars, use explicit CTA, append hashtags at end.'
            },
            threads: {
              vi: 'Tối đa 500 ký tự, giọng văn nhẹ nhàng, casual. Không nên dùng hashtag nhiều.',
              en: 'Max 500 chars, casual & conversational tone. Minimal hashtags recommended.'
            },
            instagram: {
              vi: 'Caption ngắn gọn + 5-10 hashtag liên quan. Nhấn mạnh hình ảnh và cảm xúc.',
              en: 'Short caption + 5-10 relevant hashtags. Emphasize visuals and emotions.'
            }
          };
          const hint = hints[selectedPlatform] || hints.facebook;
          return (
            <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-zinc-900/60 px-4 py-3 rounded-xl border border-slate-100 dark:border-zinc-800 leading-relaxed">
              💡 {language === 'vi' ? hint.vi : hint.en}
            </div>
          );
        })()}

        {/* 1. Preset Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => { setPresetOpen(!presetOpen); setToneOpen(false); setInstructionOpen(false); }}
            className="w-full flex items-center justify-between py-3.5 px-4 bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800/80 rounded-2xl text-xs font-bold text-slate-755 dark:text-slate-350 hover:border-primary/40 hover:bg-slate-100/40 transition-all cursor-pointer text-left shadow-sm"
          >
            <span className="flex items-center gap-2">
              ⚙️ {language === 'vi' ? 'Quy chuẩn: ' : 'Preset: '}
              <span className="font-bold text-primary">
                {platformPresets.find(p => p.id === selectedPlatformPresetId)?.name || 'Default'}
              </span>
            </span>
            <ChevronDown size={14} className={`text-slate-400 transition-transform ${presetOpen ? 'rotate-180' : ''}`} />
          </button>
          <AnimatePresence>
            {presetOpen && (
              <motion.div
                initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }}
                className="absolute left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xl z-20 flex flex-col p-1.5 gap-1 max-h-48 overflow-y-auto custom-scrollbar"
              >
                {platformPresets.map(preset => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setSelectedPlatformPresetId(preset.id);
                      setPresetOpen(false);
                      setPlatformConfigMap(prev => ({
                        ...prev,
                        [selectedPlatform]: { ...prev[selectedPlatform], presetId: preset.id }
                      }));
                    }}
                    className={`w-full text-left p-2.5 rounded-xl text-xs font-semibold hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all border-0 cursor-pointer flex flex-col gap-0.5 ${selectedPlatformPresetId === preset.id
                      ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary'
                      : 'text-slate-700 dark:text-slate-355 bg-transparent'
                      }`}
                  >
                    <span className="font-bold">{preset.name}{!preset.user_id ? ` (${language === 'vi' ? 'Hệ thống' : 'System'})` : ''}</span>
                    <span className="text-[10px] opacity-75 line-clamp-1">{preset.rules}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 2. Tone Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => { setToneOpen(!toneOpen); setPresetOpen(false); setInstructionOpen(false); }}
            className="w-full flex items-center justify-between py-3.5 px-4 bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800/80 rounded-2xl text-xs font-bold text-slate-750 dark:text-slate-355 hover:border-primary/40 hover:bg-slate-100/40 transition-all cursor-pointer text-left shadow-sm"
          >
            <span className="flex items-center gap-2">
              🎭 {language === 'vi' ? 'Văn phong: ' : 'Brand Tone: '}
              <span className="font-bold text-primary">
                {savedConfigs.find(cfg => cfg.id === selectedConfigId)?.name || (language === 'vi' ? 'Tự do (Không áp dụng)' : 'None')}
              </span>
            </span>
            <ChevronDown size={14} className={`text-slate-400 transition-transform ${toneOpen ? 'rotate-180' : ''}`} />
          </button>
          <AnimatePresence>
            {toneOpen && (
              <motion.div
                initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }}
                className="absolute left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xl z-20 flex flex-col p-1.5 gap-1 max-h-48 overflow-y-auto custom-scrollbar"
              >
                <button
                  type="button"
                  onClick={() => {
                    setSelectedConfigId('');
                    setToneOpen(false);
                    setPlatformConfigMap(prev => ({
                      ...prev,
                      [selectedPlatform]: { ...prev[selectedPlatform], configId: '' }
                    }));
                  }}
                  className={`w-full text-left p-2.5 rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all border-0 cursor-pointer ${selectedConfigId === ''
                    ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary'
                    : 'text-slate-700 dark:text-slate-355 bg-transparent'
                    }`}
                >
                  {language === 'vi' ? 'Tự do (Không áp dụng)' : 'None'}
                </button>
                {savedConfigs.map(cfg => (
                  <button
                    key={cfg.id}
                    type="button"
                    onClick={() => {
                      setSelectedConfigId(cfg.id);
                      setToneOpen(false);
                      setPlatformConfigMap(prev => ({
                        ...prev,
                        [selectedPlatform]: { ...prev[selectedPlatform], configId: cfg.id }
                      }));
                    }}
                    className={`w-full text-left p-2.5 rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all border-0 cursor-pointer ${selectedConfigId === cfg.id
                      ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary'
                      : 'text-slate-700 dark:text-slate-355 bg-transparent'
                      }`}
                  >
                    {cfg.name}
                  </button>
                ))}
                <div className="border-t border-slate-100 dark:border-zinc-800 mt-1 pt-1.5 px-1.5 flex justify-end">
                  <button type="button" onClick={() => { setIsStyleModalOpen(true); setToneOpen(false); if (isModal) setIsConfigModalOpen(false); }}
                    className="text-[10px] font-bold text-primary hover:text-white bg-primary/10 hover:bg-primary px-3 py-1 rounded-lg transition-all cursor-pointer border-0"
                  >{language === 'vi' ? 'Quản lý văn phong' : 'Manage Styles'}</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 3. Instructions Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => { setInstructionOpen(!instructionOpen); setPresetOpen(false); setToneOpen(false); }}
            className="w-full flex items-center justify-between py-3.5 px-4 bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800/80 rounded-2xl text-xs font-bold text-slate-755 dark:text-slate-350 hover:border-primary/40 hover:bg-slate-100/40 transition-all cursor-pointer text-left shadow-sm"
          >
            <span className="flex items-center gap-2">
              ✍️ {language === 'vi' ? 'Yêu cầu tùy chỉnh' : 'Custom Instructions'}
              {(selectedQuickPicks.length > 0 || customPromptText) && (
                <span className="text-[10px] bg-primary text-white px-2 py-0.5 rounded-full font-bold">
                  {selectedQuickPicks.length + (customPromptText ? 1 : 0)}
                </span>
              )}
            </span>
            <ChevronDown size={14} className={`text-slate-400 transition-transform ${instructionOpen ? 'rotate-180' : ''}`} />
          </button>
          <AnimatePresence>
            {instructionOpen && (
              <motion.div
                initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }}
                className="absolute left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xl z-20 p-4 flex flex-col gap-3"
              >
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-widest">{language === 'vi' ? 'CHỌN NHANH' : 'QUICK PICKS'}</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: 'cta', name: 'Thêm kêu gọi hành động' },
                    { id: 'quote', name: 'Bắt đầu bằng câu trích dẫn' },
                    { id: 'emoji', name: 'Sử dụng nhiều emoji' },
                    { id: 'stats', name: 'Tập trung vào số liệu' },
                    { id: 'hashtag', name: 'Tập trung hashtag độc quyền' },
                  ].map(req => {
                    const isSel = selectedQuickPicks.includes(req.id);
                    return (
                      <button
                        key={req.id}
                        type="button"
                        onClick={() => {
                          setSelectedQuickPicks(prev => {
                            const nextPicks = prev.includes(req.id) ? prev.filter(x => x !== req.id) : [...prev, req.id];
                            setPlatformConfigMap(mapPrev => ({
                              ...mapPrev,
                              [selectedPlatform]: { ...mapPrev[selectedPlatform], quickPicks: nextPicks }
                            }));
                            return nextPicks;
                          });
                        }}
                        className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${isSel
                          ? 'bg-primary text-white border-primary'
                          : 'bg-slate-50 dark:bg-zinc-800 text-slate-600 dark:text-slate-350 border-slate-200 dark:border-zinc-700 hover:border-primary/40'
                          }`}
                      >
                        {req.name}
                      </button>
                    );
                  })}
                </div>
                <textarea
                  value={customPromptText}
                  onChange={e => {
                    const text = e.target.value;
                    setCustomPromptText(text);
                    setPlatformConfigMap(prev => ({
                      ...prev,
                      [selectedPlatform]: { ...prev[selectedPlatform], customText: text }
                    }));
                  }}
                  rows={2}
                  placeholder={language === 'vi' ? 'Chỉ dẫn thêm bằng chữ...' : 'Extra text instructions...'}
                  className="w-full bg-slate-50 dark:bg-zinc-955 border border-slate-200 dark:border-zinc-800 rounded-xl p-3 text-xs leading-relaxed outline-none resize-none focus:ring-1 focus:ring-primary/50"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setInstructionOpen(false);
                  }}
                  className="w-full bg-primary text-white py-2 text-xs font-bold rounded-xl border-0 cursor-pointer active:scale-95 transition-all"
                >
                  {language === 'vi' ? 'Xác nhận' : 'Confirm'}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 4. Prompt Preview Accordion */}
        <div className="relative" ref={promptPreviewRef}>
          <button
            type="button"
            onClick={() => { setIsPromptPreviewOpen(!isPromptPreviewOpen); setPresetOpen(false); setToneOpen(false); setInstructionOpen(false); }}
            className="w-full flex items-center justify-between py-3.5 px-4 bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800/80 rounded-2xl text-xs font-bold text-slate-750 dark:text-slate-355 hover:border-primary/40 hover:bg-slate-100/40 transition-all cursor-pointer text-left shadow-sm"
          >
            <span className="flex items-center gap-2">
              👁️ {language === 'vi' ? 'Xem Prompt cho nền tảng này' : 'View prompt for this platform'}
            </span>
            <ChevronDown size={14} className={`text-slate-400 transition-transform ${isPromptPreviewOpen ? 'rotate-180' : ''}`} />
          </button>
          <AnimatePresence>
            {isPromptPreviewOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ type: "tween", ease: "easeInOut", duration: 0.25 }}
                onAnimationComplete={() => {
                  promptPreviewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
                }}
                className="w-full mt-2 bg-slate-50/50 dark:bg-zinc-955/30 border border-slate-200/60 dark:border-zinc-800/60 rounded-2xl p-4 overflow-hidden"
              >
                <pre className="text-slate-700 dark:text-slate-350 text-[10.5px] leading-relaxed overflow-x-auto whitespace-pre-wrap max-h-[250px] overflow-y-auto custom-scrollbar font-mono">
                  {compilePromptPreview()}
                </pre>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  };

  return (
    <EditableTextContext.Provider value={{
      editState,
      setEditState,
      handleUpdateVariantField,
      isGeneratingAB,
      variants,
      setVariants,
      articleId,
      selectedPlatform,
      selectedPrompt
    }}>
      <div className="flex flex-col gap-6 w-full font-sans">

        {/* Top Header Row */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mt-2">
          <div id="tour-creator-header" className="transition-all duration-300">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold text-text tracking-tight">{t('aiCreator.title')}</h1>
              <button
                type="button"
                onClick={handleStartTour}
                className="w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 flex items-center justify-center text-xs font-black text-slate-650 dark:text-zinc-300 transition-all border border-slate-200/60 dark:border-zinc-700/80 cursor-pointer active:scale-95 shadow-sm"
                title={language === 'vi' ? 'Hướng dẫn sử dụng' : 'User Guide'}
                aria-label="User Guide"
              >
                ?
              </button>
            </div>
            <p className="text-sm text-text-muted mt-1">{t('aiCreator.subtitle')}</p>
          </div>

          {/* Step Indicator Wizard */}
          <div className="flex flex-col gap-2 w-full md:w-auto select-none">
            {/* Smooth SVG/Motion Progress Bar */}
            <div className="h-1 bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden w-full relative">
              <motion.div
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary to-[#22D3EE]"
                initial={{ width: '33.3%' }}
                animate={{
                  width: step === 1 ? '33.3%' : step === 2 ? '66.6%' : '100%'
                }}
                transition={{ type: 'spring', stiffness: 180, damping: 22 }}
              />
            </div>

            <div className="flex items-center gap-1 bg-slate-100/90 dark:bg-black/60 rounded-2xl p-1.5 border border-slate-200/70 dark:border-white/5 shadow-sm">
              <button
                type="button"
                onClick={() => changeStep(1)}
                aria-current={step === 1 ? "step" : undefined}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all duration-300 cursor-pointer ${step === 1 ? 'bg-primary text-white shadow-md shadow-primary/25' : 'text-black dark:text-white hover:text-slate-800 dark:hover:text-white hover:bg-white/70 dark:hover:bg-white/5'
                  }`}
              >
                <span className={`w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] font-black ${step === 1
                  ? 'bg-white/20 text-white'
                  : (articleId || postData.title)
                    ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-250 dark:border-emerald-900/30'
                    : 'bg-slate-200 dark:bg-zinc-800 text-slate-500 dark:text-slate-300 border dark:border-white/10'
                  }`}>
                  {(articleId || postData.title) && step !== 1 ? (
                    <Check size={10} strokeWidth={3.5} />
                  ) : (
                    '1'
                  )}
                </span>
                {t('aiCreator.step1')}
              </button>

              <button
                type="button"
                onClick={() => changeStep(2)}
                aria-current={step === 2 ? "step" : undefined}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all duration-300 cursor-pointer ${step === 2 ? 'bg-primary text-white shadow-md shadow-primary/25' : 'text-black dark:text-white hover:text-slate-800 dark:hover:text-white hover:bg-white/70 dark:hover:bg-white/5'
                  }`}
              >
                <span className={`w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] font-black ${step === 2
                  ? 'bg-white/20 text-white'
                  : selectedVariantId
                    ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-250 dark:border-emerald-900/30'
                    : 'bg-slate-200 dark:bg-zinc-800 text-slate-500 dark:text-slate-300 border dark:border-white/10'
                  }`}>
                  {selectedVariantId && step !== 2 ? (
                    <Check size={10} strokeWidth={3.5} />
                  ) : (
                    '2'
                  )}
                </span>
                {t('aiCreator.step2')}
              </button>

              <button
                type="button"
                onClick={() => { if (selectedVariantId) changeStep(3); }}
                disabled={!selectedVariantId}
                aria-current={step === 3 ? "step" : undefined}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all duration-300 ${step === 3 ? 'bg-primary text-white shadow-md shadow-primary/25 cursor-pointer' :
                  selectedVariantId ? 'text-black dark:text-white hover:text-slate-800 dark:hover:text-white hover:bg-white/70 dark:hover:bg-white/5 cursor-pointer' :
                    'text-slate-500 dark:text-slate-500 cursor-not-allowed'
                  }`}
              >
                <span className={`w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] font-black ${step === 3
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-200 dark:bg-zinc-800 text-slate-500 dark:text-slate-300 border dark:border-white/10'
                  }`}>
                  {step === 3 && (typeof isScheduled !== 'undefined' && isScheduled) ? (
                    <Check size={10} strokeWidth={3.5} />
                  ) : (
                    '3'
                  )}
                </span>
                {t('aiCreator.step3')}
              </button>
            </div>
          </div>
        </div>

        {/* Unified layout grid allowing shared layout morphing */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative">

          {/* STEP 1: Left column inputs form */}
          {step === 1 && (
            <div
              key="step1-inputs"
              className="lg:col-span-8 flex flex-col gap-6 order-1"
            >
              {/* Segmented Mode Selector for input ingestion (crawl vs manual) */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl p-2.5 flex items-center justify-between shadow-sm shrink-0">
                <div className="flex bg-slate-50 dark:bg-zinc-950 rounded-xl p-1 border border-slate-100 dark:border-zinc-900 w-full">
                  <button
                    type="button"
                    onClick={() => {
                      setInputMode('crawl');
                      setArticleId(null);
                    }}
                    className={`flex-1 text-xs font-extrabold py-2.5 rounded-lg uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer border-0 ${inputMode === 'crawl'
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-text-muted hover:text-text bg-transparent'
                      }`}
                  >
                    <Globe size={13} />
                    {language === 'vi' ? 'Cào dữ liệu tự động' : 'Auto-crawl from Link'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setInputMode('manual');
                      setArticleId(null);
                    }}
                    className={`flex-1 text-xs font-extrabold py-2.5 rounded-lg uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer border-0 ${inputMode === 'manual'
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-text-muted hover:text-text bg-transparent'
                      }`}
                  >
                    <Mic size={13} />
                    {language === 'vi' ? 'Tự viết tay & Giọng nói' : 'Write / Voice Draft'}
                  </button>
                </div>
              </div>

              {/* URL Context Importer */}
              {inputMode === 'crawl' && (
                <div id="tour-creator-url" className="bg-mint/15 border border-mint/50 rounded-2xl p-6 flex flex-col gap-4 shadow-sm transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#34D399]/20 flex items-center justify-center text-[#059669] shadow-sm">
                        <Globe size={18} />
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-text">{t('aiCreator.sourceUrl')}</h2>
                        <p className="text-[11px] text-text-muted">{t('aiCreator.searchPlace')}</p>
                      </div>
                    </div>

                    {/* Search on Site Button */}
                    <button
                      onClick={() => {
                        setExplorerUrl('https://gocnhinmoi.com.vn/');
                        setIframeSrc('/api/proxy?url=' + encodeURIComponent('https://gocnhinmoi.com.vn/'));
                        setIsExplorerOpen(true);
                      }}
                      className="flex items-center gap-1.5 bg-primary/10 hover:bg-primary/20 text-primary px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer select-none"
                    >
                      <Search size={14} />
                      {t('aiCreator.searchGocNhinMoi')}
                    </button>
                  </div>

                  <div className="flex items-center gap-2 bg-white rounded-xl p-1.5 border border-gray-200 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                    <span className="text-gray-400 pl-2">
                      <Link2 size={16} />
                    </span>
                    <input
                      type="text"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !isFetching) {
                          e.preventDefault();
                          handleFetch();
                        }
                      }}
                      className="flex-1 bg-transparent px-2 py-1.5 text-xs text-text focus:outline-none"
                      placeholder={t('aiCreator.searchPlace')}
                    />
                    <button
                      onClick={handleFetch}
                      disabled={isFetching}
                      className="bg-primary hover:bg-primary-hover disabled:opacity-50 text-white px-5 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
                    >
                      {isFetching ? (
                        <>
                          <Loader2 size={12} className="animate-spin" />
                          {t('aiCreator.fetching')}
                        </>
                      ) : (
                        t('aiCreator.importButton')
                      )}
                    </button>
                  </div>
                </div>
              )}
              {/* Crawl Empty State Placeholder */}
              {inputMode === 'crawl' && !postData.title && (
                <div className="bg-slate-50/30 dark:bg-zinc-900/10 backdrop-blur-md border border-dashed border-slate-200 dark:border-zinc-850 rounded-3xl p-12 flex flex-col items-center text-center justify-center min-h-[400px] font-sans shadow-inner">
                  {/* Centered Graphic and Message */}
                  <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-6 shadow-[0_0_50px_0_rgba(99,102,241,0.15)]">
                    <Globe size={28} />
                    <span className="absolute -top-1 -right-1 bg-amber-400 text-white rounded-full p-1 shadow-sm">
                      <Sparkles size={11} />
                    </span>
                  </div>

                  <h3 className="text-sm font-extrabold text-text uppercase tracking-wider">
                    {language === 'vi' ? 'Sẵn sàng trích xuất nội dung' : 'Ready to Scrape Content'}
                  </h3>
                  <p className="text-xs text-text-muted mt-2 max-w-sm leading-relaxed">
                    {language === 'vi'
                      ? 'Nhập link bài viết ở trên để AI bắt đầu phân tích, trích xuất dữ liệu bài viết.'
                      : 'Enter a post URL above to let AI automatically extract and parse the content.'}
                  </p>

                  {/* Step Visualizer */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10 w-full max-w-xl relative">
                    <div className="flex flex-col items-center gap-2.5 relative">
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-text font-black border border-slate-200/50 dark:border-zinc-700 shadow-sm">
                        <Link2 size={16} className="text-primary" />
                      </div>
                      <div className="text-[11px] font-bold text-text">
                        {language === 'vi' ? '1. Dán URL bài viết' : '1. Paste URL'}
                      </div>
                    </div>

                    <div className="flex flex-col items-center gap-2.5 relative">
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-text font-black border border-slate-200/50 dark:border-zinc-700 shadow-sm">
                        <Cpu size={16} className="text-emerald-500" />
                      </div>
                      <div className="text-[11px] font-bold text-text">
                        {language === 'vi' ? '2. AI phân tích tự động' : '2. AI Parsing'}
                      </div>
                    </div>

                    <div className="flex flex-col items-center gap-2.5 relative">
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-text font-black border border-slate-200/50 dark:border-zinc-700 shadow-sm">
                        <Sparkles size={16} className="text-amber-500" />
                      </div>
                      <div className="text-[11px] font-bold text-text">
                        {language === 'vi' ? '3. Sinh caption đa kênh' : '3. Generate Caption'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Original Article Detailed Preview */}
              {inputMode === 'crawl' && postData.title && (
                <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-sm flex flex-col gap-6 font-sans">

                  {/* Title & Category info */}
                  <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-3">
                    <h3 className="text-xs font-black text-text uppercase tracking-wider flex items-center gap-1.5">
                      <FileText size={16} className="text-primary" />
                      {language === 'vi' ? 'Bản xem trước bài viết gốc cào về' : 'Original Scraped Article Preview'}
                    </h3>
                    <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 font-bold px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-900/30">
                      {language === 'vi' ? 'Thành công' : 'Scraped'}
                    </span>
                  </div>

                  {/* High Fidelity Clone Area */}
                  <div className="border border-slate-150 dark:border-zinc-800 rounded-2xl overflow-hidden bg-[#ffffff] dark:bg-zinc-950 flex flex-col shadow-sm">

                    {/* Mock Newspaper Header */}
                    <div className="bg-white/95 dark:bg-zinc-950/95 border-b border-slate-100 dark:border-zinc-800 px-5 py-3 flex items-center justify-between shrink-0">
                      {renderNewspaperLogo('sm')}
                      <div className="flex items-center gap-1.5 bg-[#F8F9FA] dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 px-3 py-1.5 rounded-full w-48 select-none">
                        <Search size={10} className="text-slate-400" />
                        <span className="text-[9px] font-bold text-slate-450 dark:text-zinc-500">Tìm kiếm...</span>
                      </div>
                    </div>

                    {/* Article Content Area */}
                    <div className="px-5 py-6 md:px-8 flex gap-6 max-w-3xl mx-auto w-full max-h-[480px] overflow-y-auto scrollbar-thin">

                      {/* Left Column Sticky Mock Actions */}
                      <div className="hidden sm:flex flex-col items-center gap-4 pt-1 select-none">
                        <button className="w-8 h-8 rounded-full bg-slate-50 dark:bg-zinc-900 text-slate-400 flex items-center justify-center border border-slate-200/70 dark:border-zinc-800 shadow-sm transition-all duration-200">
                          <Facebook size={13} />
                        </button>
                        <button className="w-8 h-8 rounded-full bg-slate-50 dark:bg-zinc-900 text-slate-400 flex items-center justify-center border border-slate-200/70 dark:border-zinc-800 shadow-sm transition-all duration-200">
                          <Link2 size={13} />
                        </button>
                        <div className="w-px h-5 bg-slate-200 dark:bg-zinc-800 my-0.5" />
                        <button className="w-8 h-8 rounded-full bg-slate-50 dark:bg-zinc-900 text-slate-400 flex items-center justify-center border border-slate-200/70 dark:border-zinc-800 shadow-sm transition-all duration-200">
                          <ThumbsUp size={13} />
                        </button>
                        <button className="w-8 h-8 rounded-full bg-slate-50 dark:bg-zinc-900 text-slate-400 flex items-center justify-center border border-slate-200/70 dark:border-zinc-800 shadow-sm transition-all duration-200">
                          <MessageSquare size={13} />
                        </button>
                      </div>

                      {/* Right Main Content */}
                      <div className="flex-1 flex flex-col min-w-0">
                        {/* Category */}
                        {postData.category && (
                          <span className="text-red-500 text-[10px] md:text-xs font-black tracking-widest uppercase mb-2.5 block select-none">
                            {postData.category.startsWith('#') ? postData.category : `#${postData.category}`}
                          </span>
                        )}

                        {/* Title */}
                        <h1 className="text-lg md:text-2xl font-black text-slate-900 dark:text-zinc-100 leading-tight mb-4 tracking-tight font-sans">
                          {postData.title}
                        </h1>

                        {/* Description/Sapo */}
                        {postData.description && (
                          <div className="bg-slate-50 dark:bg-zinc-900/40 p-3.5 border-l-4 border-red-550 rounded-r-xl text-xs md:text-sm text-slate-650 dark:text-slate-300 font-bold mb-5 leading-relaxed">
                            {postData.description}
                          </div>
                        )}

                        {/* Tags */}
                        {postData.tags && (
                          <div className="flex flex-wrap gap-1.5 mb-4 select-none">
                            {postData.tags.split(',').map((tag, idx) => {
                              const trimmed = tag.trim();
                              if (!trimmed) return null;
                              return (
                                <span key={idx} className="bg-slate-50 dark:bg-zinc-900 text-slate-600 dark:text-zinc-350 border border-slate-200/80 dark:border-zinc-800 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider">
                                  {trimmed.startsWith('#') ? trimmed : `#${trimmed}`}
                                </span>
                              );
                            })}
                          </div>
                        )}

                        {/* Author Info */}
                        {(postData.author || postData.published_at || postData.views) && (
                          <div className="flex items-center gap-2.5 mb-6 border-b border-slate-100 dark:border-zinc-800/80 pb-3.5 select-none">
                            {postData.author && (() => {
                              const { bgClass, textClass, initials, imageUrl } = getAvatarProps();
                              return (
                                <div className={`w-8 h-8 rounded-full ${bgClass} ${textClass} flex items-center justify-center text-[9px] font-black uppercase tracking-wider select-none shrink-0 overflow-hidden`}>
                                  {imageUrl ? (
                                    <img referrerPolicy="no-referrer" src={imageUrl} alt={postData.author} className="w-full h-full object-cover" />
                                  ) : (
                                    initials
                                  )}
                                </div>
                              );
                            })()}
                            <div className="flex flex-col gap-0.5">
                              {postData.author && (
                                <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                                  {postData.author}
                                </span>
                              )}
                              <div className="flex items-center gap-2 text-[9px] text-slate-400 dark:text-zinc-500 font-bold">
                                {postData.published_at && (
                                  <span>{postData.published_at}</span>
                                )}
                                {postData.published_at && postData.views && (
                                  <span>•</span>
                                )}
                                {postData.views && (
                                  <span>{postData.views} {language === 'vi' ? 'lượt xem' : 'views'}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Sections & Blocks rendering */}
                        <div className="article-body-sections text-slate-700 dark:text-slate-350 min-h-[150px]">
                          {postData.body && postData.body.length > 0 ? (
                            postData.body.map((block: any, idx: number) => {
                              // If it's a Spotlight section block, render it using dangerouslySetInnerHTML
                              if (block.type === 'section') {
                                return (
                                  <section
                                    key={idx}
                                    className={`${block.className || ''} py-6 my-4 rounded-xl border border-slate-150 dark:border-zinc-800 overflow-hidden shadow-sm`}
                                    style={block.style ? parseStyleString(block.style) : undefined}
                                    dangerouslySetInnerHTML={{ __html: block.html || '' }}
                                  />
                                );
                              }

                              if (block.type === 'heading2') {
                                return (
                                  <h2 key={idx} className="text-sm md:text-base font-black text-slate-800 dark:text-zinc-100 mt-6 mb-3 border-l-4 border-red-550 pl-2.5 leading-snug">
                                    {block.text}
                                  </h2>
                                );
                              }

                              if (block.type === 'heading3') {
                                return (
                                  <h3 key={idx} className="text-xs md:text-sm font-extrabold text-slate-800 dark:text-zinc-200 mt-5 mb-2">
                                    {block.text}
                                  </h3>
                                );
                              }

                              if (block.type === 'image' && block.url) {
                                return (
                                  <div key={idx} className="w-full my-5 flex flex-col items-center select-none">
                                    <img referrerPolicy="no-referrer" 
                                      src={block.url}
                                      alt={block.caption || 'Article Image'}
                                      className="w-full max-h-[300px] object-cover rounded-xl border border-slate-100 dark:border-zinc-800 shadow-sm"
                                    />
                                    {block.caption && (
                                      <span className="text-[9px] md:text-xs text-slate-400 font-bold italic mt-1.5 text-center bg-slate-50 dark:bg-zinc-900/30 px-3 py-0.5 rounded">
                                        {block.caption}
                                      </span>
                                    )}
                                  </div>
                                );
                              }

                              return (
                                <p key={idx} className="text-xs md:text-sm text-slate-750 dark:text-slate-300 mb-3.5 leading-relaxed font-semibold">
                                  {block.text}
                                </p>
                              );
                            })
                          ) : (
                            (postData.full_text || postData.description || '').split('\n\n').map((para, pIdx) => {
                              const trimmed = para.trim();
                              if (!trimmed) return null;
                              return (
                                <p key={pIdx} className="text-xs md:text-sm text-slate-755 dark:text-slate-300 mb-3 leading-relaxed font-semibold">
                                  {trimmed}
                                </p>
                              );
                            })
                          )}
                        </div>

                      </div>

                    </div>

                  </div>

                </div>
              )}

              {/* AI Prompt Editor - moved to dialog */}
              <div className="hidden">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-sm">
                      <Wand2 size={18} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-text">AI Prompt Editor</h3>
                      <p className="text-[11px] text-text-muted">Tinh chỉnh câu lệnh để AI tạo nội dung tốt nhất</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleGenerateSmartPrompt}
                      disabled={isGeneratingSmartPrompt || isGenerating}
                      className="bg-primary/10 hover:bg-primary/20 disabled:opacity-50 text-primary text-[10px] font-black px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-sm border border-primary/10"
                    >
                      <RefreshCw size={12} className={isGeneratingSmartPrompt ? "animate-spin" : ""} />
                      Tạo Prompt thông minh từ bài viết
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-6">
                  {/* Main Prompt Area */}
                  <div className="flex flex-col gap-4">
                    <div className="relative group">
                      <DebouncedTextarea
                        value={activePrompt}
                        onChange={setActivePrompt}
                        placeholder="Nhập hướng dẫn của bạn tại đây hoặc sử dụng Prompt gợi ý..."
                        rows={8}
                        className="w-full bg-[#F8F9FE] dark:bg-black/40 border border-[#E4E6F8] dark:border-zinc-800 rounded-2xl px-6 py-5 text-sm text-text focus:outline-none focus:ring-4 focus:ring-primary/10 resize-none leading-relaxed transition-all placeholder:text-gray-400 font-medium"
                      />
                      <div className="absolute bottom-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {saveSuccess && (
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-1 rounded-lg border border-emerald-200 dark:border-emerald-900/30 animate-in fade-in slide-in-from-right-2">
                            {language === 'vi' ? 'Đã lưu!' : 'Saved!'}
                          </span>
                        )}
                        <button
                          onClick={handleSaveCurrentPrompt}
                          disabled={isSavingPrompt}
                          className="p-2.5 rounded-xl bg-white dark:bg-black border border-gray-200 dark:border-white/5 text-gray-400 dark:text-slate-400 hover:text-primary hover:border-primary/30 dark:hover:border-primary/30 shadow-sm transition-all disabled:opacity-50"
                          title="Lưu prompt này vào thư viện"
                        >
                          {isSavingPrompt ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        </button>
                      </div>
                    </div>

                    {/* AI Output Preview (if generated) */}
                    <AnimatePresence>
                      {lastGeneratedAiContent && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-6 flex flex-col gap-4"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-emerald-700">
                              <Sparkles size={16} />
                              <span className="text-xs font-black uppercase tracking-wider">Kết quả từ AI</span>
                            </div>
                            <button
                              onClick={() => setLastGeneratedAiContent(null)}
                              className="text-emerald-400 hover:text-emerald-600 transition-colors"
                            >
                              <X size={14} />
                            </button>
                          </div>
                          <p className="text-sm text-emerald-900 leading-relaxed font-medium whitespace-pre-wrap">
                            {lastGeneratedAiContent}
                          </p>
                          <div className="flex items-center gap-3 pt-2">
                            <button
                              onClick={() => handleSaveAiResult('A')}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-emerald-200 transition-all flex items-center gap-2"
                            >
                              <Check size={14} />
                              Sử dụng cho Biến thể A
                            </button>
                            <button
                              onClick={() => handleSaveAiResult('B')}
                              className="bg-white border border-emerald-200 text-emerald-600 hover:bg-emerald-50 px-5 py-2.5 rounded-xl text-xs font-bold transition-all"
                            >
                              Dùng cho Biến thể B
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Action Bar */}
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-4 bg-gray-50 p-1.5 rounded-2xl border border-gray-100">
                        {(['facebook', 'threads', 'instagram'] as const).map((p) => (
                          <button
                            key={p}
                            onClick={() => setPromptPlatform(p)}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${promptPlatform === p
                              ? 'bg-white text-primary shadow-sm border border-gray-200'
                              : 'text-text-muted hover:text-text'
                              }`}
                          >
                            {p}
                          </button>
                        ))}
                      </div>

                      <button
                        onClick={handleGenerateContent}
                        disabled={isGenerating || !activePrompt}
                        className="bg-primary hover:bg-primary-hover disabled:opacity-50 text-white px-8 py-3 rounded-2xl text-xs font-black shadow-lg shadow-primary/20 flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-95 h-11"
                      >
                        {isGenerating ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            Đang tạo...
                          </>
                        ) : (
                          <>
                            <Sparkles size={16} />
                            Bắt đầu tạo nội dung AI
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Bottom Suggestions Section */}
                  <div className="border-t border-gray-100 pt-6">
                    <PromptSuggestionSection
                      articleId={articleId || ''}
                      articleTitle={postData.title}
                      articleContent={postData.description}
                      platform={promptPlatform}
                      onSelectPrompt={(content) => setActivePrompt(content)}
                      onSavePrompt={handleSaveCurrentPrompt}
                    />
                  </div>
                </div>
              </div>

              {/* Luồng 2: Tự viết tay & Giọng nói tích hợp */}
              {inputMode === 'manual' && (
                <div className="bg-white border border-gray-200/80 rounded-2xl p-8 flex flex-col gap-6 shadow-sm">
                  <div className="flex items-center gap-2 border-b border-gray-100 pb-4">
                    <Layers size={18} className="text-primary" />
                    <h3 className="text-lg font-bold text-text">{language === 'vi' ? 'Tự viết tay & Giọng nói tích hợp' : 'Write & Voice Integrated Post'}</h3>
                  </div>

                  {/* Form fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="md:col-span-2 flex flex-col gap-1.5">
                      <label className="text-xs font-extrabold text-text uppercase tracking-wider">{language === 'vi' ? 'Tiêu đề bài viết' : 'Post Title'}</label>
                      <input
                        type="text"
                        value={postData.title}
                        onChange={(e) => {
                          setPostData({ ...postData, title: e.target.value });
                          setArticleId(null);
                        }}
                        className="w-full bg-[#F8F9FE] dark:bg-black/40 border border-[#E4E6F8] dark:border-zinc-800 rounded-xl px-4 py-3 text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary/20 font-semibold"
                        placeholder={language === 'vi' ? 'Nhập tiêu đề bài viết của bạn tại đây...' : 'Enter post title here...'}
                      />
                    </div>

                    {/* Speech to Text Collapsible Accordion */}
                    <div className="md:col-span-2 bg-slate-50 dark:bg-zinc-900/40 rounded-2xl p-4 border border-slate-100 dark:border-zinc-800/80 flex flex-col gap-3">
                      <div className="flex items-center justify-between w-full select-none">
                        <div className="flex items-center gap-2">
                          <Mic size={15} className="text-primary" />
                          <span className="text-xs font-extrabold text-text uppercase tracking-wider">{language === 'vi' ? 'Trợ lý Giọng nói (Speech-to-Text)' : 'Voice Assistant (Speech-to-Text)'}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsVoiceAssistantExpanded(!isVoiceAssistantExpanded)}
                          className="bg-primary/10 hover:bg-primary/20 text-primary px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border-0 cursor-pointer flex items-center gap-1 shadow-sm"
                        >
                          {isVoiceAssistantExpanded ? (
                            <>
                              {language === 'vi' ? 'Thu gọn' : 'Collapse'} <span>▲</span>
                            </>
                          ) : (
                            <>
                              {language === 'vi' ? 'Mở rộng' : 'Expand'} <span>▼</span>
                            </>
                          )}
                        </button>
                      </div>

                      {isVoiceAssistantExpanded && (
                        <div className="flex flex-col gap-4 mt-1">
                          {isRecording ? (
                            /* Live Recording Panel */
                            <div className="border border-dashed border-primary bg-primary/5 rounded-xl p-4 text-center flex flex-col items-center gap-3">
                              <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 bg-red-600 rounded-full animate-ping" />
                                <span className="text-xs font-bold text-red-600 uppercase tracking-widest">{language === 'vi' ? 'Đang ghi âm...' : 'Recording...'}</span>
                              </div>

                              {/* Live Waveform Canvas */}
                              <div className="w-full bg-white rounded-lg overflow-hidden border border-gray-150 shadow-inner">
                                <canvas ref={canvasRef} width={400} height={60} className="w-full h-[60px]" />
                              </div>

                              <div className="text-lg font-mono font-bold text-text-muted mt-1">
                                {formatDuration(recordDuration)}
                              </div>
                              <div className="flex items-center gap-3 w-full justify-center">
                                <button
                                  type="button"
                                  onClick={stopRecording}
                                  className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md shadow-red-200 cursor-pointer border-0 flex items-center gap-1.5"
                                >
                                  <span className="w-2 h-2 bg-white rounded-sm" />
                                  {language === 'vi' ? 'Hoàn thành' : 'Done'}
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelRecording}
                                  className="bg-white border border-gray-200 text-text-muted hover:text-text px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
                                >
                                  {language === 'vi' ? 'Hủy' : 'Cancel'}
                                </button>
                              </div>
                            </div>
                          ) : (
                            /* Audio File Upload or Record Trigger */
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {/* Mic Trigger */}
                              <button
                                type="button"
                                onClick={startRecording}
                                className="bg-primary hover:bg-primary-hover text-white rounded-2xl p-5 flex flex-col items-center justify-center gap-2.5 border-0 shadow-sm transition-all hover:scale-[1.02] active:scale-95 cursor-pointer min-h-[120px]"
                              >
                                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white">
                                  <Mic size={20} />
                                </div>
                                <div className="text-center">
                                  <span className="text-[11px] font-black uppercase tracking-wider block">{language === 'vi' ? 'Ghi âm trực tiếp' : 'Direct Record'}</span>
                                  <span className="text-[9px] opacity-75 mt-0.5 block">{language === 'vi' ? 'Sử dụng Micro của thiết bị' : 'Use system microphone'}</span>
                                </div>
                              </button>

                              {/* Upload audio file */}
                              <div
                                onClick={() => voiceFileInputRef.current?.click()}
                                onDragOver={(e) => {
                                  e.preventDefault();
                                  setIsAudioDragging(true);
                                }}
                                onDragLeave={() => setIsAudioDragging(false)}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  setIsAudioDragging(false);
                                  const file = e.dataTransfer.files?.[0];
                                  if (file) {
                                    if (file.type.startsWith('audio/') || file.name.endsWith('.mp3') || file.name.endsWith('.wav') || file.name.endsWith('.m4a') || file.name.endsWith('.webm') || file.name.endsWith('.mp4')) {
                                      setVoiceFile(file);
                                      setSttError(null);
                                    } else {
                                      alert(language === 'vi' ? 'Vui lòng chỉ tải lên tệp âm thanh.' : 'Please upload audio files only.');
                                    }
                                  }
                                }}
                                className={`border-2 border-dashed rounded-2xl p-5 flex flex-col items-center justify-center gap-2.5 cursor-pointer transition-all min-h-[120px] ${isAudioDragging
                                  ? 'border-primary bg-primary/10 text-primary scale-[1.02]'
                                  : 'border-slate-200 dark:border-zinc-800 hover:border-primary/40 bg-white dark:bg-black/20 text-text-muted hover:text-primary hover:bg-primary/5'
                                  }`}
                              >
                                <UploadCloud size={24} className={isAudioDragging ? "text-primary animate-bounce" : "opacity-80"} />
                                <div className="text-center">
                                  <span className="text-[11px] font-black uppercase tracking-wider block">
                                    {isAudioDragging
                                      ? (language === 'vi' ? 'Thả tệp vào đây' : 'Drop file here')
                                      : (language === 'vi' ? 'Tải tệp âm thanh' : 'Upload Audio File')}
                                  </span>
                                  <span className="text-[9px] text-text-muted mt-0.5 block">MP3, WAV, WEBM, M4A</span>
                                </div>
                                <input
                                  type="file"
                                  ref={voiceFileInputRef}
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      setVoiceFile(file);
                                      setSttError(null);
                                    }
                                  }}
                                  accept="audio/*"
                                  className="hidden"
                                />
                              </div>
                            </div>
                          )}

                          {/* Micro Permission Guide Alert */}
                          {showMicGuide && (
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2 text-[11px] text-amber-800 leading-relaxed font-medium">
                              <span>⚠️</span>
                              <div className="flex-1">
                                {language === 'vi'
                                  ? 'Không thể truy cập Micro. Vui lòng kiểm tra quyền thiết bị trong cài đặt trình duyệt và thử lại.'
                                  : 'Cannot access microphone. Please verify device permissions in browser settings.'}
                              </div>
                              <button onClick={() => setShowMicGuide(false)} className="text-amber-500 hover:text-amber-700 font-bold">×</button>
                            </div>
                          )}

                          {/* Selected audio file preview & Transcribe button */}
                          {voiceFile && !isRecording && (
                            <div className="bg-white dark:bg-zinc-950 p-4 rounded-xl border border-gray-150 dark:border-zinc-800/80 flex flex-col gap-3">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-text truncate max-w-[70%]">🎵 {voiceFile.name}</span>
                                <button
                                  type="button"
                                  onClick={() => setVoiceFile(null)}
                                  className="text-red-500 hover:text-red-700 text-xs font-semibold"
                                >
                                  {language === 'vi' ? 'Xóa' : 'Remove'}
                                </button>
                              </div>

                              {audioUrl && (
                                <CustomAudioPlayer src={audioUrl} fileName={voiceFile.name} language={language} />
                              )}

                              <button
                                type="button"
                                onClick={handleTranscribeAndRewrite}
                                disabled={isTranscribing}
                                className="bg-primary hover:bg-primary-hover disabled:opacity-50 text-white w-full py-2.5 rounded-xl text-xs font-black shadow-sm flex items-center justify-center gap-1.5 cursor-pointer border-0"
                              >
                                {isTranscribing ? (
                                  <>
                                    <Loader2 size={12} className="animate-spin" />
                                    {language === 'vi' ? 'Đang dịch giọng nói...' : 'Transcribing voice...'}
                                  </>
                                ) : (
                                  <>
                                    <Wand2 size={12} />
                                    {language === 'vi' ? 'Dịch giọng nói bằng AI' : 'Transcribe & Rewrite with AI'}
                                  </>
                                )}
                              </button>
                            </div>
                          )}

                          {sttError && (
                            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2 text-[11px] text-red-800 leading-relaxed">
                              <span>⚠️</span>
                              <div className="flex-1 font-semibold">{sttError}</div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Drag and Drop Document Area */}
                    <div className="md:col-span-2 flex flex-col gap-1.5">
                      <label className="text-xs font-extrabold text-text uppercase tracking-wider">{language === 'vi' ? 'Hình ảnh bài viết' : 'Post Images'}</label>

                      {/* Image Previews grid */}
                      {postData.imageUrl && (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-2">
                          {postData.imageUrl.split('\n').filter(Boolean).map((imgUrl, idx) => (
                            <div key={idx} className="aspect-video bg-gray-50 border border-gray-150 rounded-xl overflow-hidden relative group">
                              <img referrerPolicy="no-referrer" src={imgUrl.trim()} alt="Preview" className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={() => handleDeleteImage(idx)}
                                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border-0 cursor-pointer shadow-sm"
                                title="Xóa hình ảnh này"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${isDraggingFile
                          ? 'border-primary bg-primary/5'
                          : 'border-slate-200 dark:border-zinc-800 bg-[#F8F9FE] dark:bg-black/40 hover:bg-primary/5 hover:border-primary/40'
                          }`}
                      >
                        <UploadCloud size={28} className="text-text-muted opacity-80" />
                        <div>
                          <span className="text-xs font-extrabold text-text uppercase tracking-wider block">
                            {language === 'vi' ? 'Kéo thả file vào đây hoặc click để chọn' : 'Drag & drop files here or click to browse'}
                          </span>
                          <span className="text-[10px] text-text-muted mt-1 block">
                            {language === 'vi' ? 'Hỗ trợ: PDF, Word (docx, doc) hoặc Hình ảnh (JPEG, PNG)' : 'Supports: PDF, Word (docx, doc) or Images (JPEG, PNG)'}
                          </span>
                        </div>
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileChange}
                          accept="image/*,.pdf,.docx,.doc"
                          multiple
                          className="hidden"
                        />
                      </div>

                      {isParsingDoc && (
                        <div className="flex items-center justify-center gap-2 text-xs text-text-muted mt-2">
                          <Loader2 size={14} className="animate-spin text-primary" />
                          <span>{language === 'vi' ? 'Đang trích xuất nội dung từ tài liệu...' : 'Parsing document content...'}</span>
                        </div>
                      )}

                      {docError && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2 text-[11px] text-red-800 leading-relaxed mt-2">
                          <span>⚠️</span>
                          <div className="flex-1 font-semibold">{docError}</div>
                        </div>
                      )}
                    </div>



                    <div className="md:col-span-2 flex flex-col gap-1.5 relative">
                      <label className="text-xs font-extrabold text-text uppercase tracking-wider">{language === 'vi' ? 'Nội dung chi tiết bài viết' : 'Detailed Post Content'}</label>

                      {/* Drop zone visual indicator directly on the textarea */}
                      <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className="relative w-full"
                      >
                        <textarea
                          value={postData.full_text}
                          onChange={(e) => {
                            setPostData({ ...postData, full_text: e.target.value, description: e.target.value });
                            setArticleId(null);
                          }}
                          rows={12}
                          className={`w-full bg-[#F8F9FE] dark:bg-black/40 border rounded-xl px-4 pt-3 pb-6 text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary/20 resize-y leading-relaxed transition-all ${isDraggingFile ? 'border-primary bg-primary/10 ring-2 ring-primary/20' : 'border-[#E4E6F8] dark:border-zinc-800'
                            }`}
                          placeholder={language === 'vi' ? 'Nhập nội dung bài viết gốc của bạn tại đây hoặc kéo thả file Word, PDF vào ô này...' : 'Enter your original post content here, or drag and drop Word / PDF file into this box...'}
                        />
                        {isDraggingFile && (
                          <div className="absolute inset-0 bg-primary/5 border-2 border-dashed border-primary rounded-xl flex items-center justify-center pointer-events-none">
                            <span className="text-xs font-bold text-primary uppercase tracking-wider bg-white px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-1.5">
                              <UploadCloud size={14} />
                              {language === 'vi' ? 'Thả tài liệu để trích xuất text' : 'Drop document to extract text'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* AI Caption Generator - moved to dialog */}
              <div className="hidden">
                {/* Decorative glow */}
                <div className="absolute -top-8 -right-8 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary shadow-sm">
                      <Sparkles size={18} />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-text">
                        {language === 'vi' ? 'Sinh caption bằng AI' : 'AI Caption Generator'}
                      </h2>
                      <p className="text-[11px] text-text-muted">
                        {language === 'vi' ? 'Chọn prompt → Bấm Tạo → AI sinh caption ngay' : 'Pick a prompt → Click Generate → AI writes instantly'}
                      </p>
                    </div>
                  </div>
                  {generateDone && (
                    <span className="flex items-center gap-1.5 bg-emerald-100 text-emerald-700 text-[11px] font-bold px-3 py-1.5 rounded-full border border-emerald-200">
                      <CheckCircle2 size={13} />
                      {language === 'vi' ? 'Đã điền vào Biến thể A' : 'Filled into Variant A'}
                    </span>
                  )}
                </div>

                {/* Prompt selector */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-extrabold text-text uppercase tracking-wider">
                    {language === 'vi' ? 'Prompt AI' : 'AI Prompt'}
                  </label>
                  {promptsLoading ? (
                    <div className="flex items-center gap-2 bg-white rounded-xl px-4 py-3 border border-primary/30 text-xs text-text-muted">
                      <Loader2 size={14} className="animate-spin text-primary" />
                      {language === 'vi' ? 'Đang tải prompts...' : 'Loading prompts...'}
                    </div>
                  ) : (
                    <div className="relative">
                      <select
                        id="ai-prompt-select"
                        value={selectedPromptId}
                        onChange={(e) => { setSelectedPromptId(e.target.value); setGenerateError(null); }}
                        className="w-full appearance-none bg-white border border-primary/30 rounded-xl px-4 py-3 text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary/30 pr-10 transition-all cursor-pointer font-semibold"
                      >
                        <option value="" disabled>
                          {language === 'vi' ? '── Chọn một prompt ──' : '── Select a prompt ──'}
                        </option>
                        {prompts.map((p) => (
                          <option key={p.id} value={p.id}>
                            [{p.platform?.toUpperCase()}] {p.name}
                          </option>
                        ))}
                      </select>
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-primary pointer-events-none">
                        <Layers size={14} />
                      </span>
                    </div>
                  )}
                </div>

                {/* AI Model Selection Switcher (craft/shape) */}
                <div className="flex flex-col gap-2 bg-[#F8F9FE] dark:bg-black/40 border border-[#E4E6F8] dark:border-zinc-800 rounded-2xl p-4">
                  <label className="text-[10px] font-black text-text uppercase tracking-widest">
                    {language === 'vi' ? 'Engine AI (Mẫu ngôn ngữ)' : 'AI Engine (Language Model)'}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => { setSelectedModel('gpt4'); setGenerateError(null); }}
                      className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border text-[11px] font-bold transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus:outline-none ${selectedModel === 'gpt4'
                        ? 'bg-primary text-white border-primary shadow-sm shadow-primary/25 active:scale-95'
                        : 'bg-white hover:bg-gray-50 border-gray-200 text-text-muted hover:text-text active:scale-95'
                        }`}
                    >
                      <Sparkles size={12} className={selectedModel === 'gpt4' ? 'text-white' : 'text-primary'} />
                      <span>GPT-4o</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setSelectedModel('gemini'); setGenerateError(null); }}
                      className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border text-[11px] font-bold transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus:outline-none ${selectedModel === 'gemini'
                        ? 'bg-primary text-white border-primary shadow-sm shadow-primary/25 active:scale-95'
                        : 'bg-white hover:bg-gray-50 border-gray-200 text-text-muted hover:text-text active:scale-95'
                        }`}
                    >
                      <Globe size={12} className={selectedModel === 'gemini' ? 'text-white' : 'text-blue-500'} />
                      <span>Gemini</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setSelectedModel('claude'); setGenerateError(null); }}
                      className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border text-[11px] font-bold transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus:outline-none ${selectedModel === 'claude'
                        ? 'bg-primary text-white border-primary shadow-sm shadow-primary/25 active:scale-95'
                        : 'bg-white hover:bg-gray-50 border-gray-200 text-text-muted hover:text-text active:scale-95'
                        }`}
                    >
                      <Wand2 size={12} className={selectedModel === 'claude' ? 'text-white' : 'text-amber-500'} />
                      <span>Claude</span>
                    </button>
                  </div>
                </div>

                {/* Error banner (clarify) */}
                {generateError && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col gap-3 bg-red-50 border border-red-200 rounded-xl p-4"
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="text-red-500 mt-0.5 shrink-0">⚠️</span>
                      <div className="flex-1 flex flex-col gap-1">
                        <span className="text-xs text-red-800 font-bold">
                          {language === 'vi' ? 'Lỗi sinh nội dung bằng AI' : 'AI Content Generation Error'}
                        </span>
                        <span className="text-[11px] text-red-700 leading-relaxed font-medium">
                          {generateError.includes("prompt") || generateError.includes("Prompt")
                            ? (language === 'vi'
                              ? 'Vui lòng chọn một mẫu prompt hợp lệ trước khi bắt đầu tạo nội dung.'
                              : 'Please select a valid prompt first before initiating caption creation.')
                            : (language === 'vi'
                              ? `Không thể kết nối với dịch vụ AI. Chi tiết: "${generateError}". Vui lòng kiểm tra lại cấu hình API key trong mục Cài đặt hoặc thử lại sau.`
                              : `Could not connect to the AI service. Details: "${generateError}". Please check your API key configuration in Settings or try again later.`)}
                        </span>
                      </div>
                      <button
                        onClick={() => setGenerateError(null)}
                        className="text-red-400 hover:text-red-600 transition-colors shrink-0"
                        title={language === 'vi' ? 'Đóng' : 'Close'}
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <div className="flex gap-2 justify-end border-t border-red-100 pt-2.5">
                      <button
                        onClick={() => {
                          setGenerateError(null);
                          router.push('/settings');
                        }}
                        className="text-[10px] text-red-700 hover:text-red-900 hover:underline font-bold transition-all px-2 py-1 cursor-pointer"
                      >
                        {language === 'vi' ? 'Cấu hình API' : 'Configure API Key'}
                      </button>
                      <button
                        onClick={handleGenerate}
                        className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0"
                      >
                        <RefreshCw size={11} />
                        {language === 'vi' ? 'Thử lại' : 'Retry'}
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Streaming output box (overdrive/delight) */}
                <AnimatePresence>
                  {(isGenerating || streamedCaption) && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className={`relative bg-white border rounded-2xl p-4 overflow-hidden transition-all duration-500 ${generateDone
                        ? "border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.25)] ring-2 ring-emerald-400/20"
                        : "border-primary/30"
                        }`}
                    >
                      {/* Shimmer bar while generating */}
                      {isGenerating && (
                        <div className="absolute top-0 left-0 right-0 h-1 overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-primary via-purple-500 to-primary bg-[length:200%] animate-[shimmer_1.5s_linear_infinite]" />
                        </div>
                      )}

                      {/* Floating particles delight/overdrive */}
                      {generateDone && (
                        <div className="absolute inset-0 pointer-events-none overflow-hidden">
                          <div className="absolute w-1.5 h-1.5 bg-emerald-400 rounded-full top-[10%] left-[20%] animate-ping" />
                          <div className="absolute w-1 h-1 bg-primary rounded-full top-[80%] left-[85%] animate-ping delay-300" />
                          <div className="absolute w-2 h-2 bg-amber-400 rounded-full top-[40%] left-[90%] animate-ping delay-700" />
                          <div className="absolute w-1.5 h-1.5 bg-emerald-400 rounded-full top-[70%] left-[10%] animate-ping delay-1000" />
                        </div>
                      )}

                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-extrabold text-primary uppercase tracking-wider flex items-center gap-1.5">
                          {isGenerating && <Loader2 size={11} className="animate-spin" />}
                          {isGenerating
                            ? (language === 'vi' ? 'AI đang sinh nội dung...' : 'AI is writing...')
                            : (language === 'vi' ? 'Nội dung đã sinh' : 'Generated content')}
                        </span>
                        {isGenerating && (
                          <button
                            onClick={handleCancelGenerate}
                            className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-red-500 font-bold transition-colors cursor-pointer"
                          >
                            <X size={11} />
                            {language === 'vi' ? 'Huỷ' : 'Cancel'}
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-text leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto font-medium">
                        {streamedCaption}
                        {isGenerating && (
                          <span className="inline-block w-0.5 h-3.5 bg-primary align-middle ml-0.5 animate-[blink_0.8s_step-end_infinite]" />
                        )}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Generate button */}
                <button
                  id="ai-generate-btn"
                  onClick={handleGenerate}
                  disabled={isGenerating || !selectedPromptId || promptsLoading}
                  className="w-full flex items-center justify-center gap-2.5 bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-white py-3.5 px-6 rounded-2xl font-extrabold shadow-lg shadow-primary/25 text-sm transition-all hover:scale-[1.01] active:scale-95 cursor-pointer relative overflow-hidden"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      {language === 'vi' ? 'Đang tạo caption...' : 'Generating caption...'}
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      {language === 'vi' ? 'Tạo Caption AI' : 'Generate AI Caption'}
                    </>
                  )}
                </button>
              </div>

            </div>
          )}

          {/* SHARED PREVIEW COLUMN (Physically slides right-to-left between Step 1 and Step 2) */}
          {(step === 1 || step === 2) && (
            <div
              className={`lg:col-span-4 flex flex-col gap-6 lg:sticky lg:top-6 ${step === 1 ? 'order-2' : 'order-1'}`}
            >
              {/* 1. Toggles Customizer (Tùy chỉnh mục hiển thị) - Only in Step 2 */}
              {step === 2 && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col gap-4"
                >
                  <h3 className="text-sm font-extrabold text-text uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-100 pb-3">
                    <Layers size={16} className="text-primary" />
                    {t('aiCreator.customDisplay')}
                  </h3>

                  <div className="flex flex-col gap-3">
                    {Object.entries({
                      showTitle: t('aiCreator.showTitle'),
                      showAuthor: t('aiCreator.showAuthor'),
                      showDescription: t('aiCreator.showDescription'),
                      showTags: t('aiCreator.showTags'),
                      showImage: t('aiCreator.showImage')
                    }).map(([key, label]) => {
                      const isChecked = toggles[key as keyof typeof toggles];
                      return (
                        <button
                          key={key}
                          onClick={() => handleToggle(key as keyof typeof toggles)}
                          className="flex items-center justify-between py-1.5 text-left text-xs font-semibold text-text hover:bg-gray-50/50 rounded-lg px-1 transition-all"
                        >
                          <span>{label}</span>
                          <div className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ${isChecked ? 'bg-primary justify-end' : 'bg-gray-200 justify-start'}`}>
                            <motion.div
                              layout
                              transition={{ type: "spring", stiffness: 500, damping: 30 }}
                              className="bg-white w-4 h-4 rounded-full shadow-md"
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <div
                  onClick={() => setIsConfigModalOpen(true)}
                  className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/10 rounded-2xl p-5 shadow-sm flex flex-col gap-3 font-sans cursor-pointer hover:border-primary/40 hover:shadow-md transition-all group"
                >
                  <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-2">
                    <span className="text-[10px] font-black text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                      ⚙️ {language === 'vi' ? 'Cấu hình AI hoạt động' : 'Active AI Config'}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsConfigModalOpen(true);
                      }}
                      className="text-[9px] font-extrabold text-primary hover:text-white bg-primary/10 hover:bg-primary px-2.5 py-1 rounded transition-all cursor-pointer border-0"
                    >
                      {language === 'vi' ? 'Chỉnh sửa' : 'Edit'}
                    </button>
                  </div>
                  <div className="flex flex-col gap-2 text-[11px] font-medium text-text">
                    <div>
                      <span className="text-text-muted">{language === 'vi' ? 'Nền tảng:' : 'Platform:'}</span>{' '}
                      <span className="font-extrabold text-primary uppercase">{selectedPlatform}</span>
                    </div>
                    <div>
                      <span className="text-text-muted">{language === 'vi' ? 'Văn phong:' : 'Brand Tone:'}</span>{' '}
                      <span className="font-bold">
                        {selectedConfigId && selectedConfigId !== 'none'
                          ? savedConfigs.find((c) => c.id === selectedConfigId)?.name
                          : language === 'vi' ? 'Tự do' : 'None'}
                      </span>
                    </div>

                    {activePrompt && (
                      <div className="bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg border border-gray-100 dark:border-white/5 italic text-text-muted text-[10px] mt-1 line-clamp-2 group-hover:text-primary transition-colors">
                        "Yêu cầu: {activePrompt}"
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 3. Article Live Preview Card (Bài viết gốc) */}
              {step === 2 && inputMode !== 'manual' && (
                <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-sm flex flex-col gap-5">
                  <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-3">
                    <h3 className="text-sm font-extrabold text-text uppercase tracking-wider flex items-center gap-1.5">
                      <Smartphone size={16} className="text-primary" />
                      {t('aiCreator.articlePreview')}
                    </h3>
                    <span className="text-[10px] bg-emerald-50 text-emerald-600 font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">
                      {language === 'vi' ? 'Trực tiếp' : 'Live'}
                    </span>
                  </div>

                  {/* Preview Content */}
                  <div
                    onClick={() => setIsOriginalPostModalOpen(true)}
                    className="border border-gray-100 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm flex flex-col bg-white dark:bg-black/20 cursor-pointer hover:border-primary/40 hover:shadow-md transition-all group relative"
                    title={language === 'vi' ? 'Click để xem toàn bộ bài viết gốc' : 'Click to view full original post'}
                  >
                    <div className="h-44 bg-gray-100 relative overflow-hidden">
                      {postData.imageUrl ? (
                        <img referrerPolicy="no-referrer" 
                          src={postData.imageUrl.split('\n')[0].trim()}
                          alt={postData.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-tr from-indigo-500 to-purple-500 opacity-80"></div>
                      )}

                      {/* Hover indicator overlay */}
                      <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="bg-white/95 dark:bg-zinc-900/95 text-primary text-[10px] font-black px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-1.5 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                          <Eye size={13} />
                          {language === 'vi' ? 'XEM TOÀN BỘ BÀI' : 'VIEW FULL POST'}
                        </span>
                      </div>

                      {postData.category && (
                        <span className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm text-white text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                          {postData.category}
                        </span>
                      )}
                    </div>

                    <div className="p-5 flex flex-col gap-3.5">
                      <h4 className="text-base font-extrabold text-[#1E293B] leading-tight">
                        {postData.title || (language === 'vi' ? 'Chưa có tiêu đề' : 'Untitled Post')}
                      </h4>

                      {(postData.author || postData.published_at) && (
                        <div className="flex items-center gap-4 text-[10px] text-text-muted font-bold">
                          {postData.author && (
                            <span className="flex items-center gap-1">
                              <User size={12} />
                              {postData.author}
                            </span>
                          )}
                          {postData.published_at && (
                            <span className="flex items-center gap-1">
                              <Calendar size={12} />
                              {postData.published_at}
                            </span>
                          )}
                        </div>
                      )}

                      {postData.description && (
                        <p className="text-xs text-text-muted leading-relaxed font-medium line-clamp-3">
                          {postData.description}
                        </p>
                      )}

                      {postData.tags && postData.tags.trim() && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {postData.tags.split(',').map((tag, idx) => {
                            const trimmed = tag.trim();
                            if (!trimmed) return null;
                            return (
                              <span key={idx} className="bg-[#F3F4FD] text-primary px-2.5 py-1 rounded-full text-[10px] font-bold">
                                {trimmed.startsWith('#') ? trimmed : `#${trimmed}`}
                              </span>
                            );
                          })}
                        </div>
                      )}

                      {postData.views && (
                        <div className="border-t border-gray-100 pt-3 mt-1 flex items-center justify-between text-[11px] font-bold text-text-muted">
                          <span className="flex items-center gap-1.5">
                            <Eye size={14} className="text-amber-500" />
                            {postData.views}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ═══ AI ENGINE CONTROL PANEL (Step 1 only) ═══ */}
              {step === 1 && (
                <div
                  className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-sm flex flex-col gap-4"
                >
                  {/* == Step Navigator == */}
                  <div className="flex border-b border-gray-200 dark:border-white/5 pb-0 mb-4">
                    <button
                      type="button"
                      onClick={() => setSubStep(1)}
                      className={`flex-1 py-2.5 text-[11px] font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer border-0 bg-transparent ${subStep === 1 ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-655'
                        }`}
                    >
                      <span className="flex items-center justify-center gap-1.5">
                        {language === 'vi' ? 'Bước 1: Nền tảng' : 'Step 1: Platform'}
                        {selectedPlatforms.length > 0 && (
                          <span className="w-4 h-4 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-bold">
                            {selectedPlatforms.length}
                          </span>
                        )}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { if (selectedPlatforms.length > 0) setSubStep(2); }}
                      disabled={selectedPlatforms.length === 0}
                      className={`flex-1 py-2.5 text-[11px] font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer border-0 bg-transparent disabled:opacity-35 ${subStep === 2 ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-655'
                        }`}
                    >
                      {language === 'vi' ? 'Bước 2: Cấu hình' : 'Step 2: Config'}
                    </button>
                  </div>

                  {/* == SUB-STEP 1: Platform Card Selection == */}
                  {subStep === 1 && (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                          {language === 'vi' ? 'CHỌN NỀN TẢNG ĐĂNG' : 'SELECT CHANNELS'}
                        </span>
                        {selectedPlatforms.length > 0 && (
                          <span className="text-[10px] text-primary font-bold">
                            {selectedPlatforms.length} {language === 'vi' ? 'đã chọn' : 'selected'}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-col gap-2">
                        {[
                          {
                            id: 'facebook',
                            label: 'Facebook',
                            bgColor: 'bg-blue-600',
                            borderActive: 'border-blue-500',
                            ringActive: 'ring-blue-500/15',
                            hint: 'Tối ưu độ dài 80-180 ký tự, dùng CTA rõ ràng, gắn hashtag cuối bài.',
                            hintEn: 'Optimal 80-180 chars, use explicit CTA, append hashtags at end.',
                            emoji: '🔵'
                          },
                          {
                            id: 'threads',
                            label: 'Threads',
                            bgColor: 'bg-zinc-900 dark:bg-zinc-700',
                            borderActive: 'border-zinc-800 dark:border-white',
                            ringActive: 'ring-zinc-400/15',
                            hint: 'Tối đa 500 ký tự, giọng văn nhẹ nhàng, casual. Không nên dùng hashtag nhiều.',
                            hintEn: 'Max 500 chars, casual & conversational tone. Minimal hashtags recommended.',
                            emoji: '💬'
                          },
                          {
                            id: 'instagram',
                            label: 'Instagram',
                            bgColor: 'bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-600',
                            borderActive: 'border-pink-500',
                            ringActive: 'ring-pink-500/15',
                            hint: 'Caption ngắn gọn + 5-10 hashtag liên quan. Nhấn mạnh hình ảnh và cảm xúc.',
                            hintEn: 'Short caption + 5-10 relevant hashtags. Emphasize visuals and emotions.',
                            emoji: '📷'
                          }
                        ].map(pm => {
                          const isSel = selectedPlatforms.includes(pm.id as any);
                          return (
                            <button
                              key={pm.id}
                              type="button"
                              onClick={() => {
                                setSelectedPlatforms(prev => {
                                  const newPlatforms = prev.includes(pm.id as any)
                                    ? prev.filter(p => p !== pm.id)
                                    : [...prev, pm.id as any];
                                  if (newPlatforms.length > 0 && !newPlatforms.includes(selectedPlatform)) {
                                    setSelectedPlatform(newPlatforms[0]);
                                  }
                                  return newPlatforms;
                                });
                              }}
                              className={`w-full py-4 px-4 rounded-2xl border-2 text-left transition-all cursor-pointer bg-white dark:bg-slate-900 flex items-center justify-between gap-3 ${isSel
                                ? `${pm.borderActive} ring-2 ${pm.ringActive}`
                                : 'border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-650'
                                }`}
                            >
                              <span className="flex items-center gap-3">
                                <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-base text-white shrink-0 ${pm.bgColor}`}>
                                  {pm.id === 'facebook' && <Facebook size={16} className="fill-white text-white" />}
                                  {pm.id === 'threads' && <ThreadsIcon size={16} className="text-white" />}
                                  {pm.id === 'instagram' && <Instagram size={16} className="text-white" />}
                                </span>
                                <span className="flex flex-col gap-0.5">
                                  <span className="flex items-center gap-2">
                                    <span className={`text-xs font-bold uppercase tracking-wider ${isSel ? 'text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                                      {pm.label}
                                    </span>
                                    {!connectedPlatforms.includes(pm.id) && (
                                      <span className="text-[9px] font-bold text-red-500 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/30 px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                                        {language === 'vi' ? 'Chưa kết nối' : 'Not Connected'}
                                      </span>
                                    )}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-medium leading-relaxed">
                                    {language === 'vi' ? pm.hint : pm.hintEn}
                                  </span>
                                </span>
                              </span>
                              <span className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${isSel ? 'bg-primary border-primary' : 'border-slate-300 dark:border-zinc-600 bg-transparent'
                                }`}>
                                {isSel && <Check size={11} className="text-white" strokeWidth={3} />}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      <button
                        type="button"
                        onClick={() => setSubStep(2)}
                        disabled={selectedPlatforms.length === 0}
                        className="w-full mt-1 bg-primary disabled:opacity-40 hover:bg-primary-hover text-white py-3.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer border-0 transition-all active:scale-95 shadow-md shadow-primary/20"
                      >
                        {language === 'vi' ? 'Tiếp theo: Cấu hình' : 'Next: Configure'} <ArrowRight size={13} />
                      </button>
                    </div>
                  )}

                  {subStep === 2 && (
                    <div className="flex flex-col gap-4">
                      {renderAiConfigForm()}
                      {false && (
                        <>
                          {/* Platform tabs */}
                      <div className="flex gap-1.5 bg-slate-100/80 dark:bg-zinc-900/80 rounded-2xl p-1.5 mb-2">
                        {selectedPlatforms.map(pid => {
                          const pm = [
                            { id: 'facebook', label: 'Facebook', emoji: '🔵', bgColor: 'bg-blue-600' },
                            { id: 'threads', label: 'Threads', emoji: '💬', bgColor: 'bg-zinc-900' },
                            { id: 'instagram', label: 'Instagram', emoji: '📷', bgColor: 'bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-600' }
                          ].find(p => p.id === pid)!;
                          const isActive = selectedPlatform === pid;
                          return (
                            <button
                              key={pid}
                              type="button"
                              onClick={() => setSelectedPlatform(pid as any)}
                              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer border ${isActive
                                ? 'bg-white dark:bg-slate-800 shadow-md border-primary/20 dark:border-primary/30 text-primary dark:text-white ring-1 ring-primary/20 scale-[1.02] z-10'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-black/5 dark:hover:bg-white/5 bg-transparent scale-100'
                                }`}
                            >
                              <span className="flex items-center gap-1.5">
                                {pm.id === 'facebook' && <Facebook size={14} className={`transition-colors ${isActive ? 'fill-primary text-primary' : 'fill-slate-400 text-slate-400'}`} />}
                                {pm.id === 'threads' && <ThreadsIcon size={14} className={`transition-colors ${isActive ? 'text-primary dark:text-white' : 'text-slate-400'}`} />}
                                {pm.id === 'instagram' && <Instagram size={14} className={`transition-colors ${isActive ? 'text-primary dark:text-primary-hover' : 'text-slate-400'}`} />}
                                {pm.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Platform-specific hint */}
                      {(() => {
                        const hints = {
                          facebook: {
                            vi: 'Tối ưu độ dài 80-180 ký tự, dùng CTA rõ ràng, gắn hashtag cuối bài.',
                            en: 'Optimal 80-180 chars, use explicit CTA, append hashtags at end.'
                          },
                          threads: {
                            vi: 'Tối đa 500 ký tự, giọng văn nhẹ nhàng, casual. Không nên dùng hashtag nhiều.',
                            en: 'Max 500 chars, casual & conversational tone. Minimal hashtags recommended.'
                          },
                          instagram: {
                            vi: 'Caption ngắn gọn + 5-10 hashtag liên quan. Nhấn mạnh hình ảnh và cảm xúc.',
                            en: 'Short caption + 5-10 relevant hashtags. Emphasize visuals and emotions.'
                          }
                        };
                        const hint = hints[selectedPlatform] || hints.facebook;
                        return (
                          <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-zinc-900/60 px-4 py-3 rounded-xl border border-slate-100 dark:border-zinc-800 leading-relaxed">
                            💡 {language === 'vi' ? hint.vi : hint.en}
                          </div>
                        );
                      })()}

                      {/* 1. Preset Dropdown */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => { setPresetOpen(!presetOpen); setToneOpen(false); setInstructionOpen(false); }}
                          className="w-full flex items-center justify-between py-3.5 px-4 bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800/80 rounded-2xl text-xs font-bold text-slate-750 dark:text-slate-350 hover:border-primary/40 hover:bg-slate-100/40 transition-all cursor-pointer text-left shadow-sm"
                        >
                          <span className="flex items-center gap-2">
                            ⚙️ {language === 'vi' ? 'Quy chuẩn: ' : 'Preset: '}
                            <span className="font-bold text-primary">
                              {platformPresets.find(p => p.id === selectedPlatformPresetId)?.name || 'Default'}
                            </span>
                          </span>
                          <ChevronDown size={14} className={`text-slate-400 transition-transform ${presetOpen ? 'rotate-180' : ''}`} />
                        </button>
                        <AnimatePresence>
                          {presetOpen && (
                            <motion.div
                              initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }}
                              className="absolute left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xl z-20 flex flex-col p-1.5 gap-1"
                            >
                              {platformPresets.map(preset => (
                                <button
                                  key={preset.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedPlatformPresetId(preset.id);
                                    setPresetOpen(false);
                                    setPlatformConfigMap(prev => ({
                                      ...prev,
                                      [selectedPlatform]: { ...prev[selectedPlatform], presetId: preset.id }
                                    }));
                                  }}
                                  className={`w-full text-left p-2.5 rounded-xl text-xs font-semibold hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all border-0 cursor-pointer flex flex-col gap-0.5 ${selectedPlatformPresetId === preset.id
                                    ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary'
                                    : 'text-slate-700 dark:text-slate-355 bg-transparent'
                                    }`}
                                >
                                  <span className="font-bold">{preset.name}{!preset.user_id ? ` (${language === 'vi' ? 'Hệ thống' : 'System'})` : ''}</span>
                                  <span className="text-[10px] opacity-75 line-clamp-1">{preset.rules}</span>
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* 2. Tone Dropdown */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => { setToneOpen(!toneOpen); setPresetOpen(false); setInstructionOpen(false); }}
                          className="w-full flex items-center justify-between py-3.5 px-4 bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800/80 rounded-2xl text-xs font-bold text-slate-750 dark:text-slate-355 hover:border-primary/40 hover:bg-slate-100/40 transition-all cursor-pointer text-left shadow-sm"
                        >
                          <span className="flex items-center gap-2">
                            🎭 {language === 'vi' ? 'Văn phong: ' : 'Brand Tone: '}
                            <span className="font-bold text-primary">
                              {savedConfigs.find(cfg => cfg.id === selectedConfigId)?.name || (language === 'vi' ? 'Tự do (Không áp dụng)' : 'None')}
                            </span>
                          </span>
                          <ChevronDown size={14} className={`text-slate-400 transition-transform ${toneOpen ? 'rotate-180' : ''}`} />
                        </button>
                        <AnimatePresence>
                          {toneOpen && (
                            <motion.div
                              initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }}
                              className="absolute left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xl z-20 flex flex-col p-1.5 gap-1"
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedConfigId('');
                                  setToneOpen(false);
                                  setPlatformConfigMap(prev => ({
                                    ...prev,
                                    [selectedPlatform]: { ...prev[selectedPlatform], configId: '' }
                                  }));
                                }}
                                className={`w-full text-left p-2.5 rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all border-0 cursor-pointer ${selectedConfigId === ''
                                  ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary'
                                  : 'text-slate-700 dark:text-slate-355 bg-transparent'
                                  }`}
                              >
                                {language === 'vi' ? 'Tự do (Không áp dụng)' : 'None'}
                              </button>
                              {savedConfigs.map(cfg => (
                                <button
                                  key={cfg.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedConfigId(cfg.id);
                                    setToneOpen(false);
                                    setPlatformConfigMap(prev => ({
                                      ...prev,
                                      [selectedPlatform]: { ...prev[selectedPlatform], configId: cfg.id }
                                    }));
                                  }}
                                  className={`w-full text-left p-2.5 rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all border-0 cursor-pointer ${selectedConfigId === cfg.id
                                    ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary'
                                    : 'text-slate-700 dark:text-slate-355 bg-transparent'
                                    }`}
                                >
                                  {cfg.name}
                                </button>
                              ))}
                              <div className="border-t border-slate-100 dark:border-zinc-800 mt-1 pt-1.5 px-1.5 flex justify-end">
                                <button type="button" onClick={() => { setIsStyleModalOpen(true); setToneOpen(false); }}
                                  className="text-[10px] font-bold text-primary hover:text-white bg-primary/10 hover:bg-primary px-3 py-1 rounded-lg transition-all cursor-pointer border-0"
                                >{language === 'vi' ? 'Quản lý văn phong' : 'Manage Styles'}</button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* 3. Instructions Dropdown */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => { setInstructionOpen(!instructionOpen); setPresetOpen(false); setToneOpen(false); }}
                          className="w-full flex items-center justify-between py-3.5 px-4 bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800/80 rounded-2xl text-xs font-bold text-slate-750 dark:text-slate-350 hover:border-primary/40 hover:bg-slate-100/40 transition-all cursor-pointer text-left shadow-sm"
                        >
                          <span className="flex items-center gap-2">
                            ✍️ {language === 'vi' ? 'Yêu cầu tùy chỉnh' : 'Custom Instructions'}
                            {(selectedQuickPicks.length > 0 || customPromptText) && (
                              <span className="text-[10px] bg-primary text-white px-2 py-0.5 rounded-full font-bold">
                                {selectedQuickPicks.length + (customPromptText ? 1 : 0)}
                              </span>
                            )}
                          </span>
                          <ChevronDown size={14} className={`text-slate-400 transition-transform ${instructionOpen ? 'rotate-180' : ''}`} />
                        </button>
                        <AnimatePresence>
                          {instructionOpen && (
                            <motion.div
                              initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }}
                              className="absolute left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xl z-20 p-4 flex flex-col gap-3"
                            >
                              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-widest">{language === 'vi' ? 'CHỌN NHANH' : 'QUICK PICKS'}</span>
                              <div className="flex flex-wrap gap-1.5">
                                {[
                                  { id: 'cta', name: 'Thêm kêu gọi hành động' },
                                  { id: 'quote', name: 'Bắt đầu bằng câu trích dẫn' },
                                  { id: 'emoji', name: 'Sử dụng nhiều emoji' },
                                  { id: 'stats', name: 'Tập trung vào số liệu' },
                                  { id: 'hashtag', name: 'Tập trung hashtag độc quyền' },
                                ].map(req => {
                                  const isSel = selectedQuickPicks.includes(req.id);
                                  return (
                                    <button
                                      key={req.id}
                                      type="button"
                                      onClick={() => {
                                        setSelectedQuickPicks(prev => {
                                          const nextPicks = prev.includes(req.id) ? prev.filter(x => x !== req.id) : [...prev, req.id];
                                          setPlatformConfigMap(mapPrev => ({
                                            ...mapPrev,
                                            [selectedPlatform]: { ...mapPrev[selectedPlatform], quickPicks: nextPicks }
                                          }));
                                          return nextPicks;
                                        });
                                      }}
                                      className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${isSel
                                        ? 'bg-primary text-white border-primary'
                                        : 'bg-slate-50 dark:bg-zinc-800 text-slate-600 dark:text-slate-350 border-slate-200 dark:border-zinc-700 hover:border-primary/40'
                                        }`}
                                    >
                                      {req.name}
                                    </button>
                                  );
                                })}
                              </div>
                              <textarea
                                value={customPromptText}
                                onChange={e => {
                                  const text = e.target.value;
                                  setCustomPromptText(text);
                                  setPlatformConfigMap(prev => ({
                                    ...prev,
                                    [selectedPlatform]: { ...prev[selectedPlatform], customText: text }
                                  }));
                                }}
                                rows={2}
                                placeholder={language === 'vi' ? 'Chỉ dẫn thêm bằng chữ...' : 'Extra text instructions...'}
                                className="w-full bg-slate-50 dark:bg-zinc-955 border border-slate-200 dark:border-zinc-800 rounded-xl p-3 text-xs leading-relaxed outline-none resize-none focus:ring-1 focus:ring-primary/50"
                              />
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  setInstructionOpen(false);
                                }}
                                className="w-full bg-primary text-white py-2 text-xs font-bold rounded-xl border-0 cursor-pointer active:scale-95 transition-all"
                              >
                                {language === 'vi' ? 'Xác nhận' : 'Confirm'}
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* 4. Prompt Preview Accordion */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => { setIsPromptPreviewOpen(!isPromptPreviewOpen); setPresetOpen(false); setToneOpen(false); setInstructionOpen(false); }}
                          className="w-full flex items-center justify-between py-3.5 px-4 bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800/80 rounded-2xl text-xs font-bold text-slate-750 dark:text-slate-355 hover:border-primary/40 hover:bg-slate-100/40 transition-all cursor-pointer text-left shadow-sm"
                        >
                          <span className="flex items-center gap-2">
                            👁️ {language === 'vi' ? 'Xem Prompt cho nền tảng này' : 'View prompt for this platform'}
                          </span>
                          <ChevronDown size={14} className={`text-slate-400 transition-transform ${isPromptPreviewOpen ? 'rotate-180' : ''}`} />
                        </button>
                        <AnimatePresence>
                          {isPromptPreviewOpen && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="w-full mt-2 bg-slate-50/50 dark:bg-zinc-955/30 border border-slate-200/60 dark:border-zinc-800/60 rounded-2xl p-4 overflow-hidden"
                            >
                              <pre className="text-slate-700 dark:text-slate-350 text-[10.5px] leading-relaxed overflow-x-auto whitespace-pre-wrap max-h-[250px] overflow-y-auto custom-scrollbar font-mono">
                                {compilePromptPreview()}
                              </pre>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      </>
                      )}

                      {/* Proceed Button */}
                      <motion.button layout onClick={handleProceedToABTest} disabled={isGeneratingAB || isFetching}
                        className="w-full bg-primary hover:bg-primary-hover disabled:opacity-70 text-white py-3.5 px-4 rounded-2xl font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-95 text-xs sm:text-sm cursor-pointer border-0 whitespace-nowrap"
                      >
                        {isGeneratingAB ? (
                          <><Loader2 size={16} className="animate-spin" />{language === 'vi' ? 'Đang sinh bài viết...' : 'Generating posts...'}</>
                        ) : (
                          <>{language === 'vi' ? 'Tạo nội dung AI cho tất cả nền tảng' : 'Generate AI content for all platforms'}<ArrowRight size={16} /></>
                        )}
                      </motion.button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Right column Mockup Feed Workspace */}
          {step === 2 && (() => {
            const activeVariant = variants.find(v => v.id === (selectedVariantId || 'A')) || variants[0];
            const previewTimestamp = postData.published_at || toDateInputValue(new Date());
            const originalField = selectedPlatform === 'facebook' ? 'originalFacebook' :
              selectedPlatform === 'threads' ? 'originalThreads' :
                'originalInstagram';
            const categoryClean = postData.category.replace('#', '').trim();
            const showCategory = categoryClean && categoryClean.toLowerCase() !== 'manual';

            if (!activeVariant) {
              return (
                <motion.div
                  key="step2-loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="lg:col-span-8 flex items-center justify-center p-12 bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/10 rounded-2xl order-2"
                >
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="animate-spin text-primary" size={24} />
                    <span className="text-xs text-text-muted">
                      {language === 'vi' ? 'Đang sinh biến thể...' : 'Generating variants...'}
                    </span>
                  </div>
                </motion.div>
              );
            }

            return (
              <motion.div
                id="tour-creator-variants"
                key="step2-variants"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 50 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="lg:col-span-8 flex flex-col gap-5 order-2"
              >
                {/* Platform Selector Header */}
                <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/10 rounded-2xl px-5 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-text dark:text-white">
                      {language === 'vi' ? 'Kiểm thử đa kênh' : 'Multi-Channel Preview'}
                    </span>
                    {selectedPlatforms.length > 1 && (
                      <span className="text-[10px] font-semibold text-text-muted bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                        {selectedPlatforms.length} {language === 'vi' ? 'kênh' : 'channels'}
                      </span>
                    )}
                  </div>

                  {/* Platform tabs */}
                  <div className="flex border border-gray-200 dark:border-white/10 rounded-xl p-0.5 gap-0.5 bg-white dark:bg-slate-900">
                    {selectedPlatforms.map((platform) => {
                      const isActive = selectedPlatform === platform;
                      const icons: Record<string, React.ReactNode> = {
                        facebook: <Facebook size={11} className="fill-current" />,
                        threads: <ThreadsIcon size={11} />,
                        instagram: <Instagram size={11} />,
                      };
                      return (
                        <button
                          key={platform}
                          onClick={() => setSelectedPlatform(platform)}
                          className={`flex items-center gap-1.5 text-[11px] font-semibold px-3.5 py-1.5 rounded-lg capitalize border-0 cursor-pointer ${isActive
                            ? 'bg-primary text-white'
                            : 'text-text-muted dark:text-slate-400 hover:text-text dark:hover:text-white bg-transparent'
                            }`}
                        >
                          {icons[platform]}
                          {platform}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Unified Preview Card */}
                <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/10 rounded-2xl flex flex-col">

                  {/* Card toolbar */}
                  <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-white/5">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-white shrink-0 ${selectedPlatform === 'facebook' ? 'bg-blue-600' :
                        selectedPlatform === 'threads' ? 'bg-black' :
                          'bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-600'
                        }`}>
                        {selectedPlatform === 'facebook' && <Facebook size={12} className="fill-white" />}
                        {selectedPlatform === 'threads' && <ThreadsIcon size={12} />}
                        {selectedPlatform === 'instagram' && <Instagram size={12} />}
                      </div>
                      <span className="text-sm font-semibold text-text dark:text-white capitalize">
                        {selectedPlatform}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Regenerate button */}
                      <div className="relative group">
                        <button
                          type="button"
                          disabled={regeneratingVariantId === activeVariant?.id}
                          onClick={() => handleRegenerateVariant(activeVariant?.id)}
                          className="flex items-center gap-1.5 text-[11px] font-semibold text-primary hover:bg-primary/10 px-3 py-1.5 rounded-lg cursor-pointer border-0 bg-transparent disabled:opacity-40"
                          title={language === 'vi' ? 'Tái tạo phiên bản AI' : 'Regenerate AI version'}
                        >
                          <RefreshCw size={12} className={regeneratingVariantId === activeVariant?.id ? "animate-spin" : ""} />
                          {language === 'vi' ? 'Tái tạo' : 'Regenerate'}
                        </button>

                        {/* Tooltip */}
                        <div className="absolute right-0 bottom-full mb-2 w-52 p-3 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 transition-all duration-150 opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 flex flex-col gap-1 z-50 text-left">
                          <div className="text-[11px] font-bold text-primary">{language === 'vi' ? 'Tái tạo bằng AI' : 'AI Regenerate'}</div>
                          <p className="text-[10px] text-text-muted leading-relaxed">{language === 'vi' ? 'Viết lại nội dung riêng cho nền tảng này.' : 'Rewrite content specifically for this platform.'}</p>
                        </div>
                      </div>

                      {/* Exclude platform button */}
                      {!excludedPlatforms.includes(selectedPlatform) ? (
                        <button
                          type="button"
                          onClick={() => setExcludedPlatforms(prev => [...prev, selectedPlatform])}
                          className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 hover:bg-red-50 hover:text-red-600 px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
                        >
                          <EyeOff size={12} />
                          {language === 'vi' ? 'Ẩn kênh' : 'Exclude'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setExcludedPlatforms(prev => prev.filter(p => p !== selectedPlatform))}
                          className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 hover:bg-emerald-50 px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
                        >
                          <Eye size={12} />
                          {language === 'vi' ? 'Bật lại' : 'Include'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Post preview area */}
                  <div className={`relative flex flex-col ${selectedPlatform === 'threads' ? 'p-5 gap-3' : ''}`}>
                    {/* Excluded Overlay */}
                    {excludedPlatforms.includes(selectedPlatform) && (
                      <div className="absolute inset-0 bg-white/70 dark:bg-slate-900/70 flex flex-col items-center justify-center z-20 backdrop-blur-sm rounded-b-2xl">
                        <div className="flex flex-col items-center gap-3 p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-700 text-center max-w-[280px]">
                          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400">
                            <EyeOff size={24} />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-slate-800 dark:text-white mb-1">
                              {language === 'vi' ? 'Đã ẩn kênh này' : 'Channel excluded'}
                            </h4>
                            <p className="text-[11px] text-slate-500 leading-relaxed">
                              {language === 'vi'
                                ? 'Nền tảng này sẽ không xuất hiện trong danh sách lên lịch và đăng bài ở bước tiếp theo.'
                                : 'This platform will not appear in the scheduling list in the next step.'}
                            </p>
                          </div>
                          <button
                            onClick={() => setExcludedPlatforms(prev => prev.filter(p => p !== selectedPlatform))}
                            className="mt-2 flex items-center justify-center gap-2 w-full bg-primary text-white font-bold text-xs py-2.5 rounded-xl hover:bg-primary-hover active:scale-95 transition-all cursor-pointer shadow-md shadow-primary/20"
                          >
                            <Eye size={14} />
                            {language === 'vi' ? 'Bật lại kênh này' : 'Re-include this channel'}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Regenerating overlay */}
                    {regeneratingVariantId === activeVariant?.id && (
                      <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 flex items-center justify-center z-10 backdrop-blur-[2px] rounded-b-2xl">
                        <div className="flex flex-col items-center gap-2">
                          <RefreshCw size={20} className="animate-spin text-primary" />
                          <span className="text-xs font-semibold text-primary">{language === 'vi' ? 'AI đang viết lại...' : 'AI rewriting...'}</span>
                        </div>
                      </div>
                    )}

                    {/* Mockup Display */}
                    {selectedPlatform === 'threads' ? (
                      /* Connected multi-post threads markup */
                      <div className="flex flex-col gap-0 text-text my-2">

                        {/* Thread Post 1/2 */}
                        <div className="flex gap-3 items-stretch">
                          <div className="flex flex-col items-center shrink-0">
                            <div className="relative w-9 h-9">
                              <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white font-extrabold text-sm shadow-sm select-none">
                                {activeVariant.id}
                              </div>
                              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-black border border-white flex items-center justify-center text-white font-bold text-[8px] leading-none select-none">
                                +
                              </div>
                            </div>
                            <div className="w-0.5 bg-gray-200 grow my-2"></div>
                          </div>

                          <div className="flex-1 flex flex-col gap-2 pb-5 overflow-hidden">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-extrabold text-text">antbiz_official</span>
                              <div className="flex items-center gap-1.5 text-[10px] text-text-muted">
                                <span>{previewTimestamp}</span>
                                <MoreHorizontal size={13} className="text-gray-400 cursor-pointer" />
                              </div>
                            </div>

                            <div className="flex flex-col gap-2.5 text-[11px] text-text leading-relaxed">
                              {toggles.showTitle && (
                                <div className="font-extrabold text-xs text-text">
                                  {showCategory ? `[${categoryClean}] ` : ''}<EditableText variantId={activeVariant.id} field="title" value={activeVariant.title} />
                                </div>
                              )}

                              {toggles.showDescription && (
                                <div className="whitespace-pre-wrap">
                                  <EditableText
                                    variantId={activeVariant.id}
                                    field="threads"
                                    value={activeVariant.threads}
                                    originalValue={activeVariant.originalThreads}
                                    textarea
                                  />
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-medium text-[8px] ml-1.5 align-middle select-none">1/2</span>
                                </div>
                              )}

                              {(toggles.showAuthor || toggles.showTags) && (
                                <div className="text-[10px] text-text-muted flex flex-col gap-1 border-t border-gray-100 pt-1.5 mt-0.5">
                                  {toggles.showAuthor && (
                                    <div className="flex items-center gap-1 font-semibold text-gray-500">
                                      <span>{language === 'vi' ? 'Tác giả:' : 'Author:'}</span>
                                      <EditableText variantId={activeVariant.id} field="author" value={activeVariant.author} />
                                    </div>
                                  )}
                                  {toggles.showTags && (
                                    <div className="text-primary font-bold">
                                      <EditableText variantId={activeVariant.id} field="tags" value={activeVariant.tags} />
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            {toggles.showImage && postData.imageUrl && (
                              <div className="w-full rounded-2xl overflow-hidden border border-gray-100 dark:border-white/5 mt-1.5 shadow-sm bg-gray-50 dark:bg-black/50 flex items-center justify-center">
                                <img referrerPolicy="no-referrer" src={postData.imageUrl.split('\n')[0].trim()} alt="Threads content" className="w-full max-h-[500px] object-contain" />
                              </div>
                            )}

                            <div className="flex items-center gap-4 text-gray-400 mt-2.5">
                              <Heart size={14} className="hover:text-red-500 cursor-pointer transition-colors" />
                              <MessageCircle size={14} className="hover:text-primary cursor-pointer transition-colors" />
                              <Repeat2 size={14} className="hover:text-emerald-500 cursor-pointer transition-colors" />
                              <Share2 size={14} className="hover:text-primary cursor-pointer transition-colors" />
                            </div>
                          </div>
                        </div>

                        {/* Thread Post 2/2 */}
                        <div className="flex gap-3 items-stretch">
                          <div className="flex flex-col items-center shrink-0">
                            <div className="relative w-9 h-9">
                              <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white font-extrabold text-sm shadow-sm select-none">
                                {activeVariant.id}
                              </div>
                              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-black border border-white flex items-center justify-center text-white font-bold text-[8px] leading-none select-none">
                                +
                              </div>
                            </div>
                          </div>

                          <div className="flex-1 flex flex-col gap-1.5 overflow-hidden">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-extrabold text-text">antbiz_official</span>
                              <div className="flex items-center gap-1.5 text-[10px] text-text-muted">
                                <span>{previewTimestamp}</span>
                                <MoreHorizontal size={13} className="text-gray-400 cursor-pointer" />
                              </div>
                            </div>

                            <div className="text-[11px] text-text leading-relaxed mt-0.5">
                              <span className="text-blue-500 hover:underline cursor-pointer font-medium">
                                &gt;&gt;&gt; {language === 'vi' ? 'Xem chi tiết:' : 'View details:'} {url.length > 30 ? `${url.substring(0, 30)}...` : url}
                              </span>
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-medium text-[8px] ml-1.5 align-middle select-none">2/2</span>
                            </div>

                            <div className="flex items-center gap-4 text-gray-400 mt-2">
                              <Heart size={14} className="hover:text-red-500 cursor-pointer transition-colors" />
                              <MessageCircle size={14} className="hover:text-primary cursor-pointer transition-colors" />
                              <Repeat2 size={14} className="hover:text-emerald-500 cursor-pointer transition-colors" />
                              <Share2 size={14} className="hover:text-primary cursor-pointer transition-colors" />
                            </div>
                          </div>
                        </div>

                      </div>
                    ) : selectedPlatform === 'instagram' ? (
                      /* Instagram Mockup */
                      <div className="border border-gray-200/60 dark:border-white/10 rounded-2xl overflow-hidden flex flex-col bg-white dark:bg-slate-950 shadow-inner/5 my-2">
                        <div className="p-3.5 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-extrabold text-sm shadow-sm">
                              {activeVariant.id}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-text dark:text-white flex items-center gap-1">
                                antbiz_official
                                <span className="w-3.5 h-3.5 bg-blue-500 text-white rounded-full flex items-center justify-center text-[7px] font-bold select-none">✓</span>
                              </span>
                              <span className="text-[9px] text-text-muted">{language === 'vi' ? 'Hồ Chí Minh' : 'Ho Chi Minh City'}</span>
                            </div>
                          </div>
                          <MoreHorizontal size={14} className="text-gray-400" />
                        </div>

                        {toggles.showImage && postData.imageUrl && (
                          <div className="w-full bg-gray-50 dark:bg-black/50 relative overflow-hidden border-t border-b border-gray-100 dark:border-white/5 flex items-center justify-center">
                            <img referrerPolicy="no-referrer" src={postData.imageUrl.split('\n')[0].trim()} alt="Instagram asset" className="w-full max-h-[500px] object-contain" />
                          </div>
                        )}

                        <div className="px-3.5 pt-3 pb-2 flex items-center gap-4 text-text dark:text-slate-300">
                          <Heart size={20} className="hover:text-red-500 cursor-pointer transition-colors" />
                          <MessageCircle size={20} className="hover:text-primary cursor-pointer transition-colors" />
                          <Send size={18} className="hover:text-primary cursor-pointer transition-colors" />
                        </div>

                        <div className="px-3.5 pb-3.5 pt-1 text-[11px] text-text leading-relaxed flex flex-col gap-1.5">
                          <div className="font-extrabold text-xs text-text">
                            Liked by <span className="underline cursor-pointer">john_doe</span> and <span className="underline cursor-pointer">42 others</span>
                          </div>

                          {toggles.showTitle && (
                            <div className="font-extrabold text-xs text-text">
                              {showCategory ? `[${categoryClean}] ` : ''}<EditableText variantId={activeVariant.id} field="title" value={activeVariant.title} />
                            </div>
                          )}

                          {toggles.showDescription && (
                            <div className="whitespace-pre-wrap">
                              <span className="font-extrabold mr-1.5">antbiz_official</span>
                              <EditableText
                                variantId={activeVariant.id}
                                field="instagram"
                                value={activeVariant.instagram}
                                originalValue={activeVariant.originalInstagram}
                                textarea
                              />
                            </div>
                          )}

                          {toggles.showAuthor && (
                            <div className="flex items-center gap-1 font-semibold text-gray-500 mt-1">
                              <span>{language === 'vi' ? 'Tác giả:' : 'Author:'}</span>
                              <EditableText variantId={activeVariant.id} field="author" value={activeVariant.author} />
                            </div>
                          )}

                          {toggles.showTags && (
                            <div className="text-primary font-bold mt-1">
                              <EditableText variantId={activeVariant.id} field="tags" value={activeVariant.tags} />
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* Facebook Mockup */
                      <div className="border border-gray-200/60 dark:border-white/10 rounded-2xl overflow-hidden flex flex-col bg-white dark:bg-slate-950 shadow-inner/5 my-2">
                        <div className="p-3.5 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-extrabold text-sm shadow-sm">
                              {activeVariant.id}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-text dark:text-white flex items-center gap-1">
                                AntBiz Official
                                <span className="w-3.5 h-3.5 bg-blue-500 text-white rounded-full flex items-center justify-center text-[7px] font-bold select-none">✓</span>
                              </span>
                              <span className="text-[9px] text-text-muted">{language === 'vi' ? '7 giờ' : '7 hrs'} · 🌍</span>
                            </div>
                          </div>
                          <MoreHorizontal size={14} className="text-gray-400" />
                        </div>

                        <div className="px-3.5 pb-3.5 pt-1 text-[11px] text-text dark:text-slate-300 leading-relaxed flex flex-col gap-2.5">
                          {toggles.showTitle && (
                            <div className="font-extrabold text-xs text-text dark:text-white mb-0.5">
                              {showCategory ? `[${categoryClean}] ` : ''}<EditableText variantId={activeVariant.id} field="title" value={activeVariant.title} />
                            </div>
                          )}

                          {toggles.showDescription && (
                            <div className="whitespace-pre-wrap">
                              <EditableText
                                variantId={activeVariant.id}
                                field="facebook"
                                value={activeVariant.facebook}
                                originalValue={activeVariant.originalFacebook}
                                textarea
                              />
                            </div>
                          )}

                          {(toggles.showAuthor || toggles.showTags) && (
                            <div className="text-[10px] text-text-muted mt-1.5 pt-1.5 border-t border-gray-100 flex flex-col gap-1.5">
                              {toggles.showAuthor && (
                                <div className="flex items-center gap-1 font-semibold text-gray-500">
                                  <span>{language === 'vi' ? 'Tác giả:' : 'Author:'}</span>
                                  <EditableText variantId={activeVariant.id} field="author" value={activeVariant.author} />
                                </div>
                              )}
                              {toggles.showTags && (
                                <div className="text-primary font-bold">
                                  <EditableText variantId={activeVariant.id} field="tags" value={activeVariant.tags} />
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {toggles.showImage && postData.imageUrl && (
                          <div className="w-full bg-gray-50 dark:bg-black/50 relative overflow-hidden border-t border-gray-100 dark:border-white/5 flex items-center justify-center">
                            <img referrerPolicy="no-referrer" src={postData.imageUrl.split('\n')[0].trim()} alt="Post asset" className="w-full max-h-[500px] object-contain" />
                          </div>
                        )}

                        <div className="px-3 py-1.5 flex border-t border-gray-100 dark:border-white/5 text-[11px] text-text-muted dark:text-slate-400 font-semibold justify-between">
                          <button className="flex-1 py-2 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg flex items-center justify-center gap-1.5 transition-colors border-0 bg-transparent text-inherit cursor-pointer">
                            <ThumbsUp size={15} /> {language === 'vi' ? 'Thích' : 'Like'}
                          </button>
                          <button className="flex-1 py-2 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg flex items-center justify-center gap-1.5 transition-colors border-0 bg-transparent text-inherit cursor-pointer">
                            <MessageSquare size={15} /> {language === 'vi' ? 'Bình luận' : 'Comment'}
                          </button>
                          <button className="flex-1 py-2 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg flex items-center justify-center gap-1.5 transition-colors border-0 bg-transparent text-inherit cursor-pointer">
                            <Share2 size={15} /> {language === 'vi' ? 'Chia sẻ' : 'Share'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Actions Row */}
                <div className="flex items-center justify-between pt-5 mt-1 border-t border-gray-100 dark:border-white/5">
                  <button
                    onClick={() => changeStep(1)}
                    className="flex items-center gap-2 text-text-muted dark:text-slate-400 hover:text-text dark:hover:text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer border-0 bg-transparent"
                  >
                    <ArrowLeft size={14} />
                    {t('aiCreator.backToIngestion')}
                  </button>

                  {(() => {
                    const activeChannelsCount = selectedPlatforms.filter(p => !excludedPlatforms.includes(p)).length;
                    const isDisabled = isGeneratingAB || activeChannelsCount === 0;

                    let buttonText = language === 'vi'
                      ? `Lên lịch đăng ${activeChannelsCount} kênh`
                      : `Schedule ${activeChannelsCount} channels`;

                    if (isGeneratingAB) {
                      buttonText = language === 'vi' ? 'Đang chuẩn bị nội dung...' : 'Preparing content...';
                    } else if (activeChannelsCount === 0) {
                      buttonText = language === 'vi' ? 'Vui lòng chọn kênh' : 'Select a channel';
                    }

                    return (
                      <button
                        onClick={() => { if (!isDisabled) changeStep(3); }}
                        disabled={isDisabled}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold transition-all border-0 whitespace-nowrap active:scale-95 shadow-md ${isDisabled
                          ? 'bg-gray-200 dark:bg-slate-800 text-gray-400 dark:text-slate-500 cursor-not-allowed shadow-none'
                          : 'bg-primary hover:bg-primary-hover text-white cursor-pointer shadow-primary/20'
                          }`}
                      >
                        {isGeneratingAB ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : activeChannelsCount > 0 ? (
                          <CheckCircle2 size={14} />
                        ) : null}
                        {buttonText}
                        {!isDisabled && <ArrowRight size={13} />}
                      </button>
                    );
                  })()}
                </div>
              </motion.div>
            );
          })()}

          {/* STEP 3: Lên lịch đăng bài (2D Calendar Scheduler) */}
          {step === 3 && (
            <motion.div
              id="tour-creator-scheduler"
              key="step3-scheduler"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              transition={{ duration: 0.4 }}
              className="lg:col-span-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start w-full transition-all duration-300"
            >
              {/* Left Column - Decoupled Schedulers Form (col-span-4) */}
              <div className="lg:col-span-4 flex flex-col gap-6">

                {/* Selected Variant Preview Card - Mirrored from Step 2 */}
                {(() => {
                  const v = variants.find(sv => sv.id === selectedVariantId);
                  if (!v) return null;
                  let iconBg = 'bg-black';
                  let platformLabel = '';
                  if (selectedPlatform === 'facebook') {
                    iconBg = 'bg-blue-600';
                    platformLabel = t('aiCreator.fbPreview');
                  } else if (selectedPlatform === 'threads') {
                    iconBg = 'bg-black';
                    platformLabel = t('aiCreator.threadsFeed');
                  } else if (selectedPlatform === 'instagram') {
                    iconBg = 'bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-600';
                    platformLabel = language === 'vi' ? 'Xem trước Instagram' : 'Instagram Feed';
                  }
                  const previewTimestamp = postData.published_at || toDateInputValue(new Date());
                  const categoryClean = (postData.category || '').replace('#', '').trim();
                  const showCategory = categoryClean && categoryClean.toLowerCase() !== 'manual';

                  return (
                    <motion.div
                      layoutId={`variant-card-${v.id}`}
                      className="rounded-3xl p-5 flex flex-col gap-3 relative overflow-hidden bg-white border-2 border-primary ring-4 ring-primary/15 shadow-2xl shadow-primary/15 scale-[1.01] select-none"
                    >
                      {/* Variant Badge & Platform Header */}
                      <div className="flex items-center justify-between pb-2.5 border-b border-gray-100">
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-full ${iconBg} flex items-center justify-center text-white shadow-sm`}>
                            {selectedPlatform === 'facebook' && <Facebook size={12} className="fill-white" />}
                            {selectedPlatform === 'threads' && <ThreadsIcon size={12} />}
                            {selectedPlatform === 'instagram' && <Instagram size={12} />}
                          </div>
                          <span className="text-xs font-extrabold text-text">{platformLabel}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black px-3 py-1 rounded-full border bg-primary text-white border-primary select-none">
                            {language === 'vi' ? 'Biến thể' : 'Variant'} {v.id}
                          </span>
                        </div>
                      </div>

                      {/* Mockup */}
                      {selectedPlatform === 'threads' ? (
                        <div className="flex flex-col gap-0 text-text">
                          <div className="flex gap-3 items-stretch">
                            <div className="flex flex-col items-center shrink-0">
                              <div className="relative w-9 h-9">
                                <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white font-extrabold text-sm shadow-sm">
                                  {v.id}
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-black border border-white flex items-center justify-center text-white font-bold text-[8px] leading-none">
                                  +
                                </div>
                              </div>
                              <div className="w-0.5 bg-gray-200 grow my-2"></div>
                            </div>

                            <div className="flex-1 flex flex-col gap-2 pb-5 overflow-hidden">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-extrabold text-text">antbiz_official</span>
                                <div className="flex items-center gap-1.5 text-[10px] text-text-muted">
                                  <span>{previewTimestamp}</span>
                                  <MoreHorizontal size={13} className="text-gray-400" />
                                </div>
                              </div>

                              <div className="flex flex-col gap-2.5 text-[11px] text-text leading-relaxed">
                                {toggles.showTitle && (
                                  <div className="font-extrabold text-xs text-text">
                                    {showCategory ? `[${categoryClean}] ` : ''}<EditableText variantId={v.id} field="title" value={v.title} />
                                  </div>
                                )}
                                {toggles.showDescription && (
                                  <div className="whitespace-pre-wrap">
                                    <EditableText variantId={v.id} field="threads" value={v.threads} originalValue={v.originalThreads} textarea />
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-medium text-[8px] ml-1.5 align-middle">1/2</span>
                                  </div>
                                )}
                                {(toggles.showAuthor || toggles.showTags) && (
                                  <div className="text-[10px] text-text-muted flex flex-col gap-1 border-t border-gray-100 pt-1.5 mt-0.5">
                                    {toggles.showAuthor && (
                                      <div className="flex items-center gap-1 font-semibold text-gray-500">
                                        <span>{language === 'vi' ? 'Tác giả:' : 'Author:'}</span>
                                        <EditableText variantId={v.id} field="author" value={v.author} />
                                      </div>
                                    )}
                                    {toggles.showTags && (
                                      <div className="text-primary font-bold">
                                        <EditableText variantId={v.id} field="tags" value={v.tags} />
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>

                              {toggles.showImage && postData.imageUrl && (
                                <div className="w-full rounded-2xl overflow-hidden border border-gray-100 dark:border-white/5 mt-1.5 shadow-sm bg-gray-50 dark:bg-black/50 flex items-center justify-center">
                                  <img referrerPolicy="no-referrer" src={postData.imageUrl.split('\n')[0].trim()} alt="Threads content" className="w-full max-h-[400px] object-contain" />
                                </div>
                              )}

                              <div className="flex items-center gap-4 text-gray-400 mt-2.5">
                                <Heart size={14} />
                                <MessageCircle size={14} />
                                <Repeat2 size={14} />
                                <Share2 size={14} />
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : selectedPlatform === 'instagram' ? (
                        <div className="border border-gray-200/60 dark:border-white/10 rounded-2xl overflow-hidden flex flex-col bg-white dark:bg-slate-950 shadow-inner/5 my-1">
                          <div className="p-3.5 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-extrabold text-sm shadow-sm">
                                {v.id}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-text dark:text-white flex items-center gap-1">
                                  antbiz_official
                                  <span className="w-3.5 h-3.5 bg-blue-500 text-white rounded-full flex items-center justify-center text-[7px] font-bold">✓</span>
                                </span>
                                <span className="text-[9px] text-text-muted">{language === 'vi' ? 'Hồ Chí Minh' : 'Ho Chi Minh City'}</span>
                              </div>
                            </div>
                            <MoreHorizontal size={14} className="text-gray-400" />
                          </div>

                          {toggles.showImage && postData.imageUrl && (
                            <div className="w-full bg-gray-50 dark:bg-black/50 relative overflow-hidden border-t border-b border-gray-100 dark:border-white/5 flex items-center justify-center">
                              <img referrerPolicy="no-referrer" src={postData.imageUrl.split('\n')[0].trim()} alt="Instagram asset" className="w-full max-h-[400px] object-contain" />
                            </div>
                          )}

                          <div className="px-3.5 pt-3 pb-2 flex items-center gap-4 text-text dark:text-slate-300">
                            <Heart size={20} className="hover:text-red-500 cursor-pointer transition-colors" />
                            <MessageCircle size={20} className="hover:text-primary cursor-pointer transition-colors" />
                            <Send size={18} className="hover:text-primary cursor-pointer transition-colors" />
                          </div>

                          <div className="px-3.5 pb-3.5 pt-1 text-[11px] text-text leading-relaxed flex flex-col gap-1.5">
                            {toggles.showTitle && (
                              <div className="font-extrabold text-xs text-text">
                                {showCategory ? `[${categoryClean}] ` : ''}<EditableText variantId={v.id} field="title" value={v.title} />
                              </div>
                            )}
                            {toggles.showDescription && (
                              <div className="whitespace-pre-wrap">
                                <span className="font-extrabold mr-1.5">antbiz_official</span>
                                <EditableText variantId={v.id} field="instagram" value={v.instagram} originalValue={v.originalInstagram} textarea />
                              </div>
                            )}
                            {toggles.showAuthor && (
                              <div className="flex items-center gap-1 font-semibold text-gray-500 mt-1">
                                <span>{language === 'vi' ? 'Tác giả:' : 'Author:'}</span>
                                <EditableText variantId={v.id} field="author" value={v.author} />
                              </div>
                            )}
                            {toggles.showTags && (
                              <div className="text-primary font-bold mt-1">
                                <EditableText variantId={v.id} field="tags" value={v.tags} />
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="border border-gray-200/60 dark:border-white/10 rounded-2xl overflow-hidden flex flex-col bg-white dark:bg-slate-950 shadow-inner/5 my-1">
                          <div className="p-3.5 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-extrabold text-sm shadow-sm">
                                {v.id}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-text dark:text-white flex items-center gap-1">
                                  AntBiz Official
                                  <span className="w-3.5 h-3.5 bg-blue-500 text-white rounded-full flex items-center justify-center text-[7px] font-bold">✓</span>
                                </span>
                                <span className="text-[9px] text-text-muted">{language === 'vi' ? '7 giờ' : '7 hrs'} · 🌍</span>
                              </div>
                            </div>
                            <MoreHorizontal size={14} className="text-gray-400" />
                          </div>

                          <div className="px-3.5 pb-3.5 pt-1 text-[11px] text-text leading-relaxed flex flex-col gap-2.5">
                            {toggles.showTitle && (
                              <div className="font-extrabold text-xs text-text mb-0.5">
                                {showCategory ? `[${categoryClean}] ` : ''}<EditableText variantId={v.id} field="title" value={v.title} />
                              </div>
                            )}
                            {toggles.showDescription && (
                              <div className="whitespace-pre-wrap">
                                <EditableText variantId={v.id} field="facebook" value={v.facebook} originalValue={v.originalFacebook} textarea />
                              </div>
                            )}
                            {(toggles.showAuthor || toggles.showTags) && (
                              <div className="text-[10px] text-text-muted mt-1.5 pt-1.5 border-t border-gray-100 flex flex-col gap-1.5">
                                {toggles.showAuthor && (
                                  <div className="flex items-center gap-1 font-semibold text-gray-500">
                                    <span>{language === 'vi' ? 'Tác giả:' : 'Author:'}</span>
                                    <EditableText variantId={v.id} field="author" value={v.author} />
                                  </div>
                                )}
                                {toggles.showTags && (
                                  <div className="text-primary font-bold">
                                    <EditableText variantId={v.id} field="tags" value={v.tags} />
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {toggles.showImage && postData.imageUrl && (
                            <div className="w-full bg-gray-50 dark:bg-black/50 relative overflow-hidden border-t border-gray-100 dark:border-white/5 flex items-center justify-center">
                              <img referrerPolicy="no-referrer" src={postData.imageUrl.split('\n')[0].trim()} alt="Post asset" className="w-full max-h-[400px] object-contain" />
                            </div>
                          )}

                          <div className="px-3 py-1.5 flex border-t border-gray-100 dark:border-white/5 text-[11px] text-text-muted dark:text-slate-400 font-semibold justify-between">
                            <button className="flex-1 py-2 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg flex items-center justify-center gap-1.5 transition-colors border-0 bg-transparent text-inherit cursor-pointer">
                              <ThumbsUp size={15} /> {language === 'vi' ? 'Thích' : 'Like'}
                            </button>
                            <button className="flex-1 py-2 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg flex items-center justify-center gap-1.5 transition-colors border-0 bg-transparent text-inherit cursor-pointer">
                              <MessageSquare size={15} /> {language === 'vi' ? 'Bình luận' : 'Comment'}
                            </button>
                            <button className="flex-1 py-2 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg flex items-center justify-center gap-1.5 transition-colors border-0 bg-transparent text-inherit cursor-pointer">
                              <Share2 size={15} /> {language === 'vi' ? 'Chia sẻ' : 'Share'}
                            </button>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  );
                })()}

                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col gap-5 mt-2">
                  <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                    <Calendar size={18} className="text-primary" />
                    <h3 className="text-xs font-extrabold text-text uppercase tracking-wider">
                      {t('aiCreator.scheduleTitle')}
                    </h3>
                  </div>

                  {/* Schedulers Inputs for platforms */}
                  <div className="flex flex-col gap-4">
                    {selectedPlatforms.includes('facebook') && !excludedPlatforms.includes('facebook') && (
                      <div className="border border-blue-100 bg-blue-50/10 rounded-2xl p-4 flex flex-col gap-4">
                        <div className="flex items-center gap-2 font-bold text-xs text-[#1877F2]">
                          <div className="w-5 h-5 rounded-full bg-[#1877F2] flex items-center justify-center text-white text-[10px]">
                            <Facebook size={10} className="fill-white" />
                          </div>
                          <span>Facebook</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <input type="date" value={facebookDate} onChange={(e) => handleFacebookDateChange(e.target.value)} className="w-full bg-white dark:bg-[#1A1D27] border border-[#E4E6F8] dark:border-white/5 rounded-xl px-3 py-2 text-[11px] font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20" />
                          <input type="time" value={facebookTime} onChange={(e) => handleFacebookTimeChange(e.target.value)} className="w-full bg-white dark:bg-[#1A1D27] border border-[#E4E6F8] dark:border-white/5 rounded-xl px-3 py-2 text-[11px] font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20" />
                        </div>
                        {facebookError && <div className="text-[10px] text-red-500 font-bold">⚠️ {facebookError}</div>}
                      </div>
                    )}

                    {selectedPlatforms.includes('threads') && !excludedPlatforms.includes('threads') && (
                      <div className="border border-gray-200 dark:border-white/5 bg-gray-50/10 dark:bg-white/3 rounded-2xl p-4 flex flex-col gap-4">
                        <div className="flex items-center gap-2 font-bold text-xs text-black dark:text-white">
                          <div className="w-5 h-5 rounded-full bg-black dark:bg-zinc-900 flex items-center justify-center text-white">
                            <ThreadsIcon size={10} />
                          </div>
                          <span>Threads</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <input type="date" value={threadsDate} onChange={(e) => handleThreadsDateChange(e.target.value)} className="w-full bg-white dark:bg-[#1A1D27] border border-[#E4E6F8] dark:border-white/5 rounded-xl px-3 py-2 text-[11px] font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20" />
                          <input type="time" value={threadsTime} onChange={(e) => handleThreadsTimeChange(e.target.value)} className="w-full bg-white dark:bg-[#1A1D27] border border-[#E4E6F8] dark:border-white/5 rounded-xl px-3 py-2 text-[11px] font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20" />
                        </div>
                        {threadsError && <div className="text-[10px] text-red-500 font-bold">⚠️ {threadsError}</div>}
                      </div>
                    )}

                    {selectedPlatforms.includes('instagram') && !excludedPlatforms.includes('instagram') && (
                      <div className="border border-pink-100 dark:border-pink-900/30 bg-pink-50/10 dark:bg-pink-950/10 rounded-2xl p-4 flex flex-col gap-4">
                        <div className="flex items-center gap-2 font-bold text-xs text-pink-600 dark:text-pink-400">
                          <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-600 flex items-center justify-center text-white">
                            <Instagram size={10} />
                          </div>
                          <span>Instagram</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <input type="date" value={instagramDate} onChange={(e) => handleInstagramDateChange(e.target.value)} className="w-full bg-white dark:bg-[#1A1D27] border border-[#E4E6F8] dark:border-white/5 rounded-xl px-3 py-2 text-[11px] font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20" />
                          <input type="time" value={instagramTime} onChange={(e) => handleInstagramTimeChange(e.target.value)} className="w-full bg-white dark:bg-[#1A1D27] border border-[#E4E6F8] dark:border-white/5 rounded-xl px-3 py-2 text-[11px] font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20" />
                        </div>
                        {instagramError && <div className="text-[10px] text-red-500 font-bold">⚠️ {instagramError}</div>}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column - 2D Calendar Grid (col-span-8) */}
              <div className="lg:col-span-8 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col">

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-100 pb-4 mb-4 gap-4">
                  <div>
                    <h3 className="text-lg font-extrabold text-text flex items-center gap-2">
                      {language === 'vi' ? 'Kế hoạch đăng bài' : 'Publication Plan'}
                    </h3>
                    <p className="text-[11px] text-text-muted mt-0.5">
                      {language === 'vi'
                        ? 'Kéo thả thẻ để đổi ngày/giờ. Grid hiển thị 24h.'
                        : 'Drag cards to change dates/hours. 24h grid view.'}
                    </p>
                  </div>

                  <div className="flex bg-[#F1F3F9] p-1 rounded-xl border border-gray-250 gap-1">
                    {[
                      { id: 0, label: language === 'vi' ? 'Tuần 1' : 'Wk 1', firstDate: weekDays[0].date },
                      { id: 1, label: language === 'vi' ? 'Tuần 2' : 'Wk 2', firstDate: weekDays[7].date },
                      { id: 2, label: language === 'vi' ? 'Tuần 3' : 'Wk 3', firstDate: weekDays[14].date }
                    ].map((wk) => (
                      <button
                        key={wk.id}
                        onClick={() => {
                          setActiveWeek(wk.id as 0 | 1 | 2);
                          const platforms = selectedPlatforms;
                          if (platforms.includes('facebook') && !excludedPlatforms.includes('facebook')) setFacebookDate(wk.firstDate);
                          if (platforms.includes('threads') && !excludedPlatforms.includes('threads')) setThreadsDate(wk.firstDate);
                          if (platforms.includes('instagram') && !excludedPlatforms.includes('instagram')) setInstagramDate(wk.firstDate);
                        }}
                        className={`text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all ${activeWeek === wk.id
                          ? 'bg-white text-primary shadow-sm border border-primary/20'
                          : 'text-text-muted hover:text-text'
                          }`}
                      >
                        {wk.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2D Calendar Board */}
                <div className="w-full overflow-x-auto border border-gray-150 rounded-2xl p-1 bg-white select-none">
                  <div className="min-w-[700px] flex flex-col">
                    {/* Days Header */}
                    <div
                      className="grid border-b border-gray-200 pb-2 mb-1 text-center text-[10px] font-extrabold"
                      style={{ gridTemplateColumns: '60px repeat(7, 1fr)' }}
                    >
                      <span className="text-text-muted uppercase tracking-wider text-left pl-3 flex items-center">
                        {language === 'vi' ? 'Giờ' : 'Hr'}
                      </span>
                      {weekDays.slice(activeWeek * 7, activeWeek * 7 + 7).map((day) => (
                        <div key={day.date} className={`flex flex-col items-center py-1 rounded-lg ${facebookDate === day.date || threadsDate === day.date ? 'text-primary bg-primary/5' : 'text-text-muted'}`}>
                          <span>{getDayLabel(day.name).substring(0, 3)}</span>
                          <span className="text-[11px] font-bold">{day.label}</span>
                        </div>
                      ))}
                    </div>

                    {/* 2D Grid with 24 Hours */}
                    <div className="flex relative w-full" style={{ height: '960px' }}>
                      {/* Hour Column */}
                      <div className="w-[60px] grid grid-rows-[repeat(24,minmax(0,1fr))] h-full pr-1 border-r border-gray-100 bg-gray-50/30">
                        {Array.from({ length: 24 }).map((_, hr) => (
                          <div key={hr} className="flex items-center justify-center text-[10px] font-bold text-text-muted border-b border-gray-50">
                            {hr}:00
                          </div>
                        ))}
                      </div>

                      {/* Board Area */}
                      <div ref={boardRef} className="flex-1 relative h-full bg-white overflow-hidden">
                        {/* Grid Lines */}
                        <div className="absolute inset-0 grid grid-cols-7 grid-rows-[repeat(24,minmax(0,1fr))] pointer-events-none">
                          {Array.from({ length: 7 * 24 }).map((_, idx) => (
                            <div key={idx} className="border-r border-b border-gray-100/50" />
                          ))}
                        </div>

                        {/* Unified Posts Layer */}
                        {(() => {
                          const cellsWithPosts: any[] = [];
                          for (let col = 0; col < 7; col++) {
                            const dayDate = weekDays[activeWeek * 7 + col].date;
                            for (let hr = 0; hr < 24; hr++) {
                              const cellPosts = getCellPosts(dayDate, hr);
                              if (cellPosts.length > 0) {
                                cellsWithPosts.push({ col, hr, dayDate, posts: cellPosts });
                              }
                            }
                          }

                          return cellsWithPosts.flatMap(({ col, hr, dayDate, posts: cellPosts }, cellIdx) => {
                            const count = cellPosts.length;

                            return cellPosts.map((post: any, subIdx: number) => {
                              const cardWidth = `calc((100% / 7) / ${count} - 4px)`;
                              const cardLeft = `calc(${(col * 100) / 7}% + ${(subIdx * 100) / (7 * count)}% + 2px)`;

                              if (post.type === 'draft') {
                                if (post.platform === 'facebook') {
                                  return (
                                    <motion.div
                                      key={`fb-${fbResetTrigger}-${facebookDate}-${facebookTime}`}
                                      drag dragConstraints={boardRef} dragElastic={0} dragMomentum={false} onDragEnd={handleFbDragEnd}
                                      onClick={() => setSelectedCell({ dateStr: dayDate, hour: hr, posts: cellPosts })}
                                      className="absolute p-1 border-2 border-[#1877F2] bg-white shadow-lg flex flex-col justify-center cursor-pointer cursor-grab active:cursor-grabbing hover:bg-blue-50/50 transition-colors z-20 overflow-hidden rounded-xl"
                                      style={{ left: cardLeft, top: `calc(${(hr * 100) / 24}% + 2px)`, width: cardWidth, height: `calc(${(100) / 24}% - 4px)` }}
                                    >
                                      <div className="flex flex-col gap-0.5 overflow-hidden">
                                        <div className="flex items-center gap-1 shrink-0">
                                          <Facebook size={9} className="fill-[#1877F2] stroke-none shrink-0" />
                                          <span className="text-[7.5px] font-black text-[#1877F2] uppercase truncate">FB {facebookTime}</span>
                                        </div>
                                        {postData.title && count === 1 && (
                                          <span className="text-[7px] text-text-muted dark:text-slate-400 truncate leading-none">{postData.title}</span>
                                        )}
                                      </div>
                                    </motion.div>
                                  );
                                } else if (post.platform === 'threads') {
                                  return (
                                    <motion.div
                                      key={`threads-${threadsResetTrigger}-${threadsDate}-${threadsTime}`}
                                      drag dragConstraints={boardRef} dragElastic={0} dragMomentum={false} onDragEnd={handleThreadsDragEnd}
                                      onClick={() => setSelectedCell({ dateStr: dayDate, hour: hr, posts: cellPosts })}
                                      className="absolute p-1 border-2 border-black dark:border-white bg-white dark:bg-black shadow-lg flex flex-col justify-center cursor-pointer cursor-grab active:cursor-grabbing hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors z-20 overflow-hidden rounded-xl"
                                      style={{ left: cardLeft, top: `calc(${(hr * 100) / 24}% + 2px)`, width: cardWidth, height: `calc(${(100) / 24}% - 4px)` }}
                                    >
                                      <div className="flex flex-col gap-0.5 overflow-hidden">
                                        <div className="flex items-center gap-1 shrink-0">
                                          <ThreadsIcon size={9} className="shrink-0 text-black dark:text-white" />
                                          <span className="text-[7.5px] font-black text-black dark:text-white uppercase truncate">TR {threadsTime}</span>
                                        </div>
                                        {postData.title && count === 1 && (
                                          <span className="text-[7px] text-text-muted dark:text-slate-400 truncate leading-none">{postData.title}</span>
                                        )}
                                      </div>
                                    </motion.div>
                                  );
                                } else if (post.platform === 'instagram') {
                                  return (
                                    <motion.div
                                      key={`insta-${instagramResetTrigger}-${instagramDate}-${instagramTime}`}
                                      drag dragConstraints={boardRef} dragElastic={0} dragMomentum={false} onDragEnd={handleInstagramDragEnd}
                                      onClick={() => setSelectedCell({ dateStr: dayDate, hour: hr, posts: cellPosts })}
                                      className="absolute p-1 border-2 border-pink-500 bg-white shadow-lg flex flex-col justify-center cursor-pointer cursor-grab active:cursor-grabbing hover:bg-pink-50/50 transition-colors z-20 overflow-hidden rounded-xl"
                                      style={{ left: cardLeft, top: `calc(${(hr * 100) / 24}% + 2px)`, width: cardWidth, height: `calc(${(100) / 24}% - 4px)` }}
                                    >
                                      <div className="flex flex-col gap-0.5 overflow-hidden">
                                        <div className="flex items-center gap-1 shrink-0">
                                          <Instagram size={9} className="text-pink-600 shrink-0" />
                                          <span className="text-[7.5px] font-black text-pink-600 uppercase truncate">IG {instagramTime}</span>
                                        </div>
                                        {postData.title && count === 1 && (
                                          <span className="text-[7px] text-text-muted dark:text-slate-400 truncate leading-none">{postData.title}</span>
                                        )}
                                      </div>
                                    </motion.div>
                                  );
                                }
                              } else {
                                // Existing post
                                return (
                                  <div
                                    key={`existing-${post.id}-${cellIdx}-${subIdx}`}
                                    className="absolute p-1.5 rounded-xl bg-gray-50 border border-gray-200 shadow-sm flex flex-col justify-center overflow-hidden z-10 cursor-pointer hover:bg-gray-100 transition-colors"
                                    style={{ left: cardLeft, top: `calc(${(hr * 100) / 24}% + 2px)`, width: cardWidth, height: `calc(${(100) / 24}% - 4px)` }}
                                    onClick={() => setSelectedCell({ dateStr: dayDate, hour: hr, posts: cellPosts })}
                                  >
                                    <div className="flex items-center gap-1 truncate">
                                      <span className="w-2.5 h-2.5 rounded bg-gray-400 text-[6px] text-white flex items-center justify-center font-bold">✓</span>
                                      <span className="text-[7.5px] font-bold text-gray-650 truncate uppercase">{post.title}</span>
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            });
                          });
                        })()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 3 Actions */}
                {schedulingError && (
                  <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm font-semibold mt-4 flex items-start gap-2">
                    <span className="text-red-500 mt-0.5">⚠️</span>
                    {schedulingError}
                  </div>
                )}
                <div className="flex items-center justify-between border-t border-gray-150 pt-6 mt-6">
                  <button onClick={() => changeStep(2)} className="flex items-center gap-2 bg-white border border-gray-200 text-text px-5 py-3 rounded-2xl text-xs font-bold shadow-sm hover:bg-gray-50 transition-colors cursor-pointer">
                    <ArrowLeft size={16} /> {t('aiCreator.backToAb')}
                  </button>
                  <button id="confirm-schedule-btn" onClick={handleConfirmSchedule} disabled={isSchedulingLoading || (selectedPlatforms.includes('facebook') && !excludedPlatforms.includes('facebook') && !!facebookError) || (selectedPlatforms.includes('threads') && !excludedPlatforms.includes('threads') && !!threadsError) || (selectedPlatforms.includes('instagram') && !excludedPlatforms.includes('instagram') && !!instagramError)} className={`py-3.5 px-8 rounded-2xl font-extrabold shadow-lg flex items-center gap-2 transition-all hover:scale-[1.01] active:scale-95 text-xs cursor-pointer ${isSchedulingLoading ? 'bg-gray-200 text-gray-400 shadow-none' : 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-emerald-500/20'}`}>
                    {isSchedulingLoading ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                    {isSchedulingLoading ? (language === 'vi' ? 'Đang lên lịch...' : 'Scheduling...') : t('aiCreator.confirmSchedule')}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

        </div>



        {/* ACTIVE AI CONFIGURATION MODAL */}
        {mounted && createPortal(
          <AnimatePresence>
            {isConfigModalOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 font-sans"
                onClick={(e) => {
                  if (e.target === e.currentTarget) setIsConfigModalOpen(false);
                }}
              >
                <motion.div
                  initial={{ scale: 0.95, y: 15 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.95, y: 15 }}
                  className="bg-white dark:bg-zinc-950 rounded-3xl border border-gray-200 dark:border-zinc-800 shadow-2xl p-6 max-w-lg w-full flex flex-col gap-4 max-h-[85vh] overflow-hidden"
                >
                  {/* Modal Header */}
                  <div className="flex items-center justify-between border-b border-gray-100 dark:border-zinc-850 pb-3">
                    <h3 className="text-sm font-extrabold text-text dark:text-white uppercase tracking-wider flex items-center gap-2">
                      ⚙️ {language === 'vi' ? 'CẤU HÌNH AI HOẠT ĐỘNG' : 'ACTIVE AI CONFIGURATION'}
                    </h3>
                    <button
                      onClick={() => setIsConfigModalOpen(false)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors cursor-pointer border-0 bg-transparent"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {/* Modal Form Scroll Area */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 pb-1">
                    {renderAiConfigForm(true)}
                  </div>

                  {/* Modal Footer Actions */}
                  <div className="flex gap-3 justify-end border-t border-gray-100 dark:border-zinc-850 pt-4 mt-2">
                    <button
                      type="button"
                      onClick={() => setIsConfigModalOpen(false)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-xs font-bold rounded-xl border-0 cursor-pointer transition-all"
                    >
                      {language === 'vi' ? 'Đóng' : 'Close'}
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        setIsConfigModalOpen(false);
                        const activeId = selectedVariantId || (variants.length > 0 ? variants[0].id : 'A');
                        await handleRegenerateVariant(activeId);
                      }}
                      className="px-5 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl border-0 cursor-pointer shadow-md shadow-primary/20 transition-all flex items-center gap-1.5 active:scale-95"
                    >
                      <RefreshCw size={13} />
                      {language === 'vi' ? 'Lưu & Tạo lại' : 'Save & Regenerate'}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}

          {/* BRAND STYLE CONFIGURATION MODAL */}
          <AnimatePresence>
            {isStyleModalOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 font-sans"
                onClick={(e) => { if (e.target === e.currentTarget && !isSavingConfig) setIsStyleModalOpen(false); }}
              >
                <motion.div
                  initial={{ scale: 0.95, y: 15 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.95, y: 15 }}
                  className="bg-white dark:bg-zinc-950 rounded-2xl border border-gray-205 dark:border-zinc-800 shadow-2xl p-6 max-w-md w-full flex flex-col gap-4 focus-visible:outline-none"
                >
                  <div className="flex items-center justify-between border-b border-gray-100 dark:border-zinc-800 pb-3">
                    <h3 className="text-sm font-extrabold text-slate-800 dark:text-zinc-200 uppercase tracking-wider">
                      {editingConfigId ? (language === 'vi' ? 'Chỉnh sửa văn phong' : 'Edit brand style') : (language === 'vi' ? 'Tạo văn phong mới' : 'Create brand style')}
                    </h3>
                    <button
                      onClick={() => { if (!isSavingConfig) setIsStyleModalOpen(false); }}
                      disabled={isSavingConfig}
                      className="text-gray-400 hover:text-slate-650 hover:bg-gray-100 p-1.5 rounded-full transition-colors cursor-pointer border-none bg-transparent disabled:opacity-50"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-sans">
                        {language === 'vi' ? 'Tên văn phong' : 'Style Name'}
                      </label>
                      <input
                        type="text"
                        value={styleFormName}
                        onChange={(e) => setStyleFormName(e.target.value)}
                        placeholder={language === 'vi' ? 'Ví dụ: Giọng GenZ Vui Vẻ, Chuyên nghiệp sâu...' : 'E.g., GenZ Fun, Corporate...'}
                        className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary/20 font-sans"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-sans">
                        {language === 'vi' ? 'Quy chuẩn văn phong thương hiệu (Markdown)' : 'Brand Style Rules (Markdown)'}
                      </label>
                      <div className="flex bg-slate-100 dark:bg-zinc-800/50 rounded-lg p-1 gap-1">
                        {['general', 'facebook', 'threads', 'instagram'].map((tab) => (
                          <button
                            key={tab}
                            type="button"
                            onClick={() => setStyleRulesTab(tab as any)}
                            className={`flex-1 text-[10px] font-bold py-1.5 px-2 rounded-md transition-all cursor-pointer border-none ${styleRulesTab === tab
                              ? 'bg-white dark:bg-zinc-700 text-primary shadow-sm'
                              : 'bg-transparent text-slate-500 hover:bg-slate-200 dark:hover:bg-zinc-700/50 hover:text-slate-700'
                              }`}
                          >
                            {tab === 'general' ? (language === 'vi' ? 'Quy tắc chung' : 'General') : tab.charAt(0).toUpperCase() + tab.slice(1)}
                          </button>
                        ))}
                      </div>
                      <textarea
                        value={styleFormRulesObj[styleRulesTab] || ''}
                        onChange={(e) => setStyleFormRulesObj(prev => ({ ...prev, [styleRulesTab]: e.target.value }))}
                        placeholder={
                          styleRulesTab === 'general'
                            ? '- Hình mẫu thương hiệu (Persona): ...\n- Từ ngữ khuyên dùng: ...\n- Từ ngữ cấm dùng: ...'
                            : styleRulesTab === 'facebook'
                              ? '# GHI CHÚ RIÊNG CHO FACEBOOK\n- Cách xưng hô: [Ví dụ: Xưng AntBiz, gọi người đọc là Bạn]\n- Tone giọng: [Ví dụ: Chuyên nghiệp, lịch sự]\n- Kêu gọi hành động (CTA): [Ví dụ: Luôn có link đăng ký ở cuối]'
                              : styleRulesTab === 'threads'
                                ? '# GHI CHÚ RIÊNG CHO THREADS\n- Cách xưng hô: [Ví dụ: Xưng mình, gọi người đọc là Các bác]\n- Tone giọng: [Ví dụ: Hài hước, thân mật, bắt trend]\n- Định dạng: [Ví dụ: Xuống dòng liên tục, dùng nhiều emoji]'
                                : '# GHI CHÚ RIÊNG CHO INSTAGRAM\n- Tone giọng: [Ví dụ: Truyền cảm hứng, tập trung vào hình ảnh]\n- Hashtag: [Ví dụ: Luôn chèn #AntBiz ở cuối]'
                        }
                        rows={8}
                        className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary/20 resize-y leading-relaxed font-mono placeholder:text-slate-400/70 dark:placeholder:text-zinc-600/70"
                      />
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="checkbox"
                        id="styleFormIsDefault"
                        checked={styleFormIsDefault}
                        onChange={(e) => setStyleFormIsDefault(e.target.checked)}
                        className="rounded border-gray-300 text-primary focus:ring-primary/20 cursor-pointer"
                      />
                      <label htmlFor="styleFormIsDefault" className="text-xs font-bold text-slate-650 dark:text-zinc-400 cursor-pointer font-sans select-none">
                        {language === 'vi' ? 'Đặt làm mặc định cho mọi bài đăng' : 'Set as default style'}
                      </label>
                    </div>

                    <div className="flex gap-3 mt-3">
                      <button
                        type="button"
                        onClick={() => setIsStyleModalOpen(false)}
                        disabled={isSavingConfig}
                        className="flex-1 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-slate-700 dark:text-zinc-350 py-3 rounded-xl font-bold transition-all text-xs cursor-pointer border-none font-sans"
                      >
                        {language === 'vi' ? 'Hủy' : 'Cancel'}
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveStyleConfig}
                        disabled={isSavingConfig}
                        className="flex-1 bg-primary hover:bg-primary-hover text-white py-3 rounded-xl font-bold transition-all text-xs cursor-pointer border-none shadow-md shadow-primary/10 flex items-center justify-center gap-1.5 font-sans"
                      >
                        {isSavingConfig ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                        {language === 'vi' ? 'Lưu cấu hình' : 'Save Style'}
                      </button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

        {/* LIVE GOCNHINMOI PORTAL BROWSER PROXY MODAL */}
        <AnimatePresence>
          {isExplorerOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.95, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 15 }}
                onKeyDown={handleFocusTrap}
                role="dialog"
                aria-modal="true"
                tabIndex={-1}
                className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden focus-visible:outline-none"
              >

                {/* Browser Header Bar */}
                <div className="bg-gray-100 border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0 gap-4">

                  {/* Browser controls */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={handleIframeBack}
                      className="w-10 h-10 rounded-full bg-white hover:bg-gray-200 border border-gray-300 flex items-center justify-center text-text-muted transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
                    >
                      <ArrowLeft size={14} />
                    </button>
                    <button
                      onClick={handleRefresh}
                      className="w-10 h-10 rounded-full bg-white hover:bg-gray-200 border border-gray-300 flex items-center justify-center text-text-muted transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
                    >
                      <RefreshCw size={12} />
                    </button>
                  </div>

                  {/* Address Bar showing live URL */}
                  <div className="flex-1 bg-white border border-gray-300 rounded-xl px-4 py-2 text-xs text-text-muted flex items-center gap-2 shadow-inner">
                    <Globe size={14} className="text-gray-400" />
                    <span className="font-semibold text-text truncate">
                      {explorerUrl}
                    </span>
                  </div>

                  {/* Close Button */}
                  <button
                    onClick={() => setIsExplorerOpen(false)}
                    className="w-10 h-10 rounded-full bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Portal Live Content Area */}
                <div className="flex-1 bg-white relative flex flex-col">

                  {/* Sticky banner to Import Current Page */}
                  <div className="bg-primary/5 border-b border-primary/20 py-3.5 px-8 flex items-center justify-between shrink-0 gap-4 z-10 shadow-sm">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-primary">{language === 'vi' ? 'Trình duyệt trực tiếp hoạt động' : 'Live Explorer Active'}</span>
                      <span className="text-[11px] text-text-muted truncate max-w-lg mt-0.5">
                        {language === 'vi' ? 'Đang xem:' : 'Viewing:'} {explorerUrl}
                      </span>
                    </div>

                    <button
                      onClick={handleImportFromExplorer}
                      disabled={isScraping}
                      className="bg-primary hover:bg-primary-hover disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-primary/10 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      {isScraping ? (
                        <>
                          <Loader2 size={12} className="animate-spin" />
                          {language === 'vi' ? 'Đang nạp dữ liệu...' : 'Scraping...'}
                        </>
                      ) : (
                        <>
                          <Check size={14} />
                          {language === 'vi' ? 'Sử dụng bài viết này cho Importer' : 'Use this article for Importer'}
                        </>
                      )}
                    </button>
                  </div>

                  {/* Iframe loading the proxied live website */}
                  <iframe
                    key={iframeKey}
                    ref={iframeRef}
                    src={iframeSrc}
                    className="w-full flex-1 border-0"
                    title="gocnhinmoi Explorer"
                  />

                </div>

              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>


        {/* SUCCESS CONFIRMATION DIALOG */}
        <AnimatePresence>
          {isScheduled && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 font-sans"
            >
              <motion.div
                initial={{ scale: 0.95, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 15 }}
                onKeyDown={handleFocusTrap}
                role="dialog"
                aria-modal="true"
                tabIndex={-1}
                className="bg-white rounded-2xl border border-gray-200 shadow-2xl p-8 max-w-md w-full text-center flex flex-col items-center gap-5 focus-visible:outline-none"
              >
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-inner animate-bounce">
                  <CheckCircle2 size={36} />
                </div>

                <div>
                  <h3 className="text-xl font-extrabold text-text">
                    {t('aiCreator.scheduleSuccess')}
                  </h3>
                  <p className="text-xs text-text-muted mt-2 leading-relaxed">
                    {language === 'vi'
                      ? `Bài đăng của bạn đã được lên lịch xuất bản thành công trên các kênh đã chọn.`
                      : `Your posts have been successfully scheduled on the selected channels.`}
                  </p>
                </div>

                <div className="bg-slate-50 border border-gray-150 rounded-2xl p-4 w-full text-left flex flex-col gap-3 font-sans">
                  <div className="text-[10px] font-extrabold text-text-muted uppercase tracking-wider font-sans">
                    {language === 'vi' ? 'Thông tin xuất bản' : 'Publication details'}
                  </div>

                  <div className="text-xs font-bold text-text truncate border-b border-gray-100 pb-2 font-sans">
                    {postData.title}
                  </div>

                  <div className="flex flex-col gap-2.5 font-sans">
                    {selectedPlatforms.includes('facebook') && (
                      <div className="flex items-center justify-between text-xs font-sans">
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-600 text-[10px] font-bold">Facebook</span>
                        <span className="font-semibold text-text-muted">{facebookDate} @ {facebookTime}</span>
                      </div>
                    )}

                    {selectedPlatforms.includes('threads') && (
                      <div className="flex items-center justify-between text-xs font-sans">
                        <span className="px-2 py-0.5 rounded bg-gray-100 text-text text-[10px] font-bold">Threads</span>
                        <span className="font-semibold text-text-muted">{threadsDate} @ {threadsTime}</span>
                      </div>
                    )}

                    {selectedPlatforms.includes('instagram') && (
                      <div className="flex items-center justify-between text-xs font-sans">
                        <span className="px-2 py-0.5 rounded bg-pink-50 text-pink-600 text-[10px] font-bold">Instagram</span>
                        <span className="font-semibold text-text-muted">{instagramDate} @ {instagramTime}</span>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => {
                    setIsScheduled(false);
                    changeStep(1);
                    setSelectedVariantId('');
                  }}
                  className="w-full bg-primary hover:bg-primary-hover text-white py-3 px-6 rounded-2xl font-bold shadow-md shadow-primary/20 transition-all text-xs cursor-pointer font-sans"
                >
                  {language === 'vi' ? 'Bắt đầu chiến dịch mới' : 'Start new campaign'}
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CELL POSTS TIMELINE DIALOG */}
        <AnimatePresence>
          {selectedCell && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[70] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4 font-sans"
              onClick={(e) => { if (e.target === e.currentTarget) setSelectedCell(null); }}
            >
              <motion.div
                initial={{ scale: 0.95, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 15 }}
                onKeyDown={handleFocusTrap}
                role="dialog"
                aria-modal="true"
                tabIndex={-1}
                className="bg-white rounded-2xl border border-gray-200 shadow-2xl p-6 max-w-md w-full flex flex-col gap-4 focus-visible:outline-none"
              >
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div className="flex flex-col">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">
                      {language === 'vi' ? 'Chi tiết lịch đăng bài' : 'Schedule Details'}
                    </h3>
                    <span className="text-[10px] text-slate-500 font-semibold mt-0.5">
                      {language === 'vi'
                        ? `Ngày ${selectedCell.dateStr} · Khung giờ ${selectedCell.hour}:00`
                        : `Date: ${selectedCell.dateStr} · Time slot: ${selectedCell.hour}:00`}
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedCell(null)}
                    className="text-gray-400 hover:text-slate-650 hover:bg-gray-100 p-1.5 rounded-full transition-colors cursor-pointer border-0 bg-transparent"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="flex flex-col gap-3 overflow-y-auto max-h-[50vh] pr-1">
                  {selectedCell.posts.map((post: any, idx: number) => {
                    let platIcon = <Globe size={12} />;
                    let platLabel = 'Web';
                    let platBg = 'bg-gray-50 text-gray-700 border-gray-200/60';

                    if (post.platform === 'facebook') {
                      platIcon = <Facebook size={11} className="fill-[#1877F2] text-[#1877F2]" />;
                      platLabel = 'Facebook';
                      platBg = 'bg-blue-50 dark:bg-blue-950/40 text-[#1877F2] dark:text-blue-400 border border-blue-100/60 dark:border-blue-900/30';
                    } else if (post.platform === 'threads' || post.platform === 'thread') {
                      platIcon = <ThreadsIcon size={11} className="text-black dark:text-white" />;
                      platLabel = 'Threads';
                      platBg = 'bg-slate-50 dark:bg-black text-slate-900 dark:text-slate-100 border border-slate-200/65 dark:border-slate-750';
                    } else if (post.platform === 'instagram') {
                      platIcon = <Instagram size={11} className="text-pink-650" />;
                      platLabel = 'Instagram';
                      platBg = 'bg-pink-50 dark:bg-pink-950/40 text-pink-650 dark:text-pink-400 border border-pink-100/60 dark:border-pink-900/30';
                    }

                    return (
                      <div
                        key={idx}
                        className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50/40 flex flex-col gap-2 shadow-sm"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-lg border text-[9px] font-black uppercase tracking-wider flex items-center gap-1 ${platBg}`}>
                              {platIcon}
                              <span>{platLabel}</span>
                            </span>
                            <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100/40 font-mono">
                              {post.timeStr}
                            </span>
                          </div>

                          {post.type === 'draft' ? (
                            <span className="bg-amber-50 text-amber-700 border border-amber-200/60 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider">
                              {language === 'vi' ? 'Bản nháp' : 'Draft'}
                            </span>
                          ) : (
                            <span className={`px-2 py-0.5 rounded-lg border text-[9px] font-black uppercase tracking-wider ${post.status === 'posted' ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60' :
                              post.status === 'failed' ? 'bg-rose-50 text-rose-700 border-rose-200/60' :
                                post.status === 'cancelled' ? 'bg-slate-100 text-slate-500 border-slate-200/60' :
                                  'bg-indigo-50 text-indigo-700 border-indigo-200/60'
                              }`}>
                              {language === 'vi'
                                ? (post.status === 'posted' ? 'Đã đăng' : post.status === 'failed' ? 'Lỗi' : post.status === 'cancelled' ? 'Đã hủy' : 'Chờ đăng')
                                : post.status}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-700 font-bold leading-normal line-clamp-3">
                          {post.title}
                        </p>

                        {post.type === 'existing' && post.status === 'pending' && (
                          <div className="flex justify-end mt-1">
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                handleCancel(post.id);
                              }}
                              disabled={actionLoadingId === post.id}
                              className="bg-rose-50 hover:bg-rose-100 text-rose-600 text-[9px] font-black px-2.5 py-1.5 rounded-xl transition-all border border-rose-200/50 disabled:opacity-50 cursor-pointer active:scale-95 flex items-center gap-1"
                            >
                              {actionLoadingId === post.id ? <Loader2 size={10} className="animate-spin" /> : null}
                              <span>{language === 'vi' ? 'Hủy lịch đăng' : 'Cancel Post'}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={() => setSelectedCell(null)}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-2xl font-bold transition-all text-xs cursor-pointer border-0 active:scale-95"
                >
                  {language === 'vi' ? 'Đóng' : 'Close'}
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* PROMPT SELECTOR POPUP DIALOG */}
        <AnimatePresence>
          {isPromptModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm flex items-center justify-center p-4 font-sans"
              onClick={(e) => { if (e.target === e.currentTarget) setIsPromptModalOpen(false); }}
            >
              <motion.div
                initial={{ scale: 0.95, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 15 }}
                onKeyDown={handleFocusTrap}
                role="dialog"
                aria-modal="true"
                tabIndex={-1}
                className="bg-white rounded-2xl border border-gray-200 shadow-2xl p-6 max-w-lg w-full flex flex-col gap-4 max-h-[80vh] focus-visible:outline-none"
              >
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <h3 className="text-base font-extrabold text-text uppercase tracking-wider flex items-center gap-2 font-sans">
                    📝 {language === 'vi' ? 'Chọn Prompt từ thư viện' : 'Select Prompt from Library'}
                  </h3>
                  <button
                    onClick={() => setIsPromptModalOpen(false)}
                    className="text-text-muted hover:text-text hover:bg-gray-100 p-1.5 rounded-full transition-colors cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Search Field */}
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted w-4 h-4" />
                  <input
                    type="text"
                    value={promptSearch}
                    onChange={(e) => setPromptSearch(e.target.value)}
                    placeholder={language === 'vi' ? "Tìm kiếm prompt..." : "Search prompts..."}
                    className="w-full bg-[#F8F9FE] dark:bg-black/40 border border-[#E4E6F8] dark:border-zinc-800 rounded-full py-2.5 pl-10 pr-4 text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-semibold"
                  />
                </div>

                {/* Prompts list */}
                <div className="flex-1 overflow-y-auto flex flex-col gap-2.5 pr-1 font-sans">
                  {loadingPrompts ? (
                    <div className="flex items-center justify-center py-12 text-xs text-text-muted font-bold gap-2">
                      <Loader2 className="animate-spin" size={16} />
                      {language === 'vi' ? 'Đang tải...' : 'Loading...'}
                    </div>
                  ) : filteredPromptsForModal.length === 0 ? (
                    <div className="text-center py-12 text-xs text-text-muted font-semibold">
                      {language === 'vi' ? 'Không tìm thấy prompt nào' : 'No prompts found'}
                    </div>
                  ) : (
                    filteredPromptsForModal.map((p) => {
                      const isSelected = selectedPrompt?.id === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setSelectedPrompt(p);
                            setIsPromptModalOpen(false);
                          }}
                          className={`text-left p-4 rounded-2xl border transition-all flex flex-col gap-2 font-sans ${isSelected
                            ? 'border-primary bg-primary/5 ring-1 ring-primary shadow-sm'
                            : 'border-gray-150 hover:bg-gray-50 hover:border-gray-200'
                            }`}
                        >
                          <div className="flex items-center justify-between w-full font-sans">
                            <span className="text-xs font-extrabold text-text truncate max-w-[70%] font-sans">{p.name}</span>
                            <span className="text-[8px] bg-primary/10 text-primary font-black px-1.5 py-0.5 rounded uppercase font-sans">{p.platform}</span>
                          </div>
                          <p className="text-[10px] text-text-muted line-clamp-2 leading-relaxed font-semibold italic">
                            "{p.content}"
                          </p>
                        </button>
                      );
                    })
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>




        {/* Onboarding Tour Overlay */}
        {mounted && createPortal(
          <AnimatePresence>
            {showTour && tourStep > 0 && (
              <motion.div
                key="tour-creator-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="fixed inset-0 z-[60] pointer-events-none"
              >
                {/* SVG Mask Backdrop - dims screen but cuts a hole for the active element */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                  <defs>
                    <mask id="tour-creator-mask">
                      <rect width="100%" height="100%" fill="white" />
                      {tourRect && (
                        <rect
                          x={tourRect.x - 8}
                          y={tourRect.y - 8}
                          width={tourRect.width + 16}
                          height={tourRect.height + 16}
                          rx={24}
                          fill="black"
                          className="transition-all duration-300 ease-in-out"
                        />
                      )}
                    </mask>
                  </defs>
                  <rect
                    width="100%"
                    height="100%"
                    fill="currentColor"
                    mask="url(#tour-creator-mask)"
                    className="pointer-events-auto cursor-pointer text-black/60 dark:text-black/80"
                    onClick={handleSkipTour}
                  />
                </svg>
              </motion.div>
            )}

            {showTour && tourStep > 0 && (
              <motion.div
                key="tour-creator-card"
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 50, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                className="fixed bottom-6 left-6 right-6 md:left-auto md:right-12 md:w-[380px] bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 shadow-2xl z-[70] flex flex-col gap-4 font-sans"
              >
                <div className="flex justify-between items-start">
                  <span className="text-[10px] bg-primary/10 text-primary font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                    Quick Guide · {tourStep}/6
                  </span>
                  <button
                    onClick={handleSkipTour}
                    className="text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors"
                    title="Close Guide"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="flex flex-col gap-1.5">
                  <h4 className="text-base font-extrabold text-slate-800 dark:text-zinc-100 flex items-center gap-2">
                    <Sparkles size={16} className="text-primary animate-pulse" />
                    {t(`aiCreator.tourStep${tourStep}Title` as any)}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed font-semibold">
                    {t(`aiCreator.tourStep${tourStep}Desc` as any)}
                  </p>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-zinc-800">
                  <button
                    onClick={handleSkipTour}
                    className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-all cursor-pointer"
                  >
                    {t('aiCreator.tourSkip' as any)}
                  </button>

                  <div className="flex gap-2">
                    {tourStep > 1 && (
                      <button
                        onClick={handlePrevStep}
                        className="bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        {t('aiCreator.tourPrev' as any)}
                      </button>
                    )}
                    <button
                      onClick={tourStep === 6 ? handleSkipTour : handleNextStep}
                      className="bg-primary hover:bg-primary-hover text-white px-5 py-2 rounded-xl text-xs font-black shadow-md shadow-primary/25 transition-all cursor-pointer"
                    >
                      {tourStep === 6 ? t('aiCreator.tourFinish' as any) : t('aiCreator.tourNext' as any)}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}

        {/* Original Post Detail Modal */}
        {isOriginalPostModalOpen && createPortal(
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-zinc-900 rounded-3xl max-w-5xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-zinc-800 p-6 shrink-0 bg-slate-50/50 dark:bg-zinc-900/50">
                <div className="flex items-center gap-2">
                  <FileText className="text-primary" size={18} />
                  <h3 className="text-sm font-black text-text uppercase tracking-wider">
                    {language === 'vi' ? 'Xem demo bài viết gốc' : 'Demo Original Article'}
                  </h3>
                </div>
                <button
                  onClick={() => setIsOriginalPostModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-750 text-slate-500 dark:text-zinc-400 flex items-center justify-center transition-colors cursor-pointer border-0"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Scrollable Content (Newspaper layout) */}
              <div className="flex-1 overflow-y-auto bg-[#ffffff] dark:bg-zinc-950 flex flex-col custom-scrollbar">

                {/* 1. Header Web Newspaper Mock */}
                <div className="sticky top-0 z-30 bg-white/95 dark:bg-zinc-950/95 border-b border-slate-150 dark:border-zinc-800 px-6 py-4 flex items-center justify-between shrink-0 shadow-sm backdrop-blur-md">
                  {/* Logo Group */}
                  {renderNewspaperLogo('lg')}

                  {/* Mock Search Input */}
                  <div className="hidden sm:flex items-center gap-2 bg-[#F8F9FA] dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 px-3.5 py-1.5 rounded-full w-64 select-none">
                    <Search size={12} className="text-slate-400" />
                    <input
                      type="text"
                      placeholder="Tìm kiếm bài viết, tác giả..."
                      className="bg-transparent border-none text-[10px] font-bold outline-none text-slate-700 dark:text-zinc-200 placeholder-slate-400/80 w-full cursor-not-allowed"
                      disabled
                    />
                  </div>
                </div>

                {/* 2. Article Wrapper */}
                <div className="px-6 py-8 md:px-12 flex gap-10 max-w-4xl mx-auto w-full">
                  {/* Left Column: Sticky Action Panel (like real web) */}
                  <div className="hidden md:flex flex-col items-center gap-5 pt-2 select-none">
                    <div className="sticky top-20 flex flex-col gap-4 items-center">
                      <button className="w-9 h-9 rounded-full bg-slate-50 dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-blue-600 flex items-center justify-center border border-slate-200/70 dark:border-zinc-800 shadow-sm transition-all duration-200 active:scale-95 cursor-default">
                        <Facebook size={15} />
                      </button>
                      <button className="w-9 h-9 rounded-full bg-slate-50 dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-700 dark:hover:text-white flex items-center justify-center border border-slate-200/70 dark:border-zinc-800 shadow-sm transition-all duration-200 active:scale-95 cursor-default">
                        <Link2 size={15} />
                      </button>
                      <div className="w-px h-6 bg-slate-200 dark:bg-zinc-800 my-1" />
                      <button className="w-9 h-9 rounded-full bg-slate-50 dark:bg-zinc-900 hover:bg-[#FFF1F2] dark:hover:bg-rose-950/20 text-slate-400 hover:text-rose-500 flex items-center justify-center border border-slate-200/70 dark:border-zinc-800 shadow-sm transition-all duration-200 active:scale-95 cursor-default">
                        <ThumbsUp size={15} />
                      </button>
                      <button className="w-9 h-9 rounded-full bg-slate-50 dark:bg-zinc-900 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 text-slate-400 hover:text-indigo-550 flex items-center justify-center border border-slate-200/70 dark:border-zinc-800 shadow-sm transition-all duration-200 active:scale-95 cursor-default">
                        <MessageSquare size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Right Column: Main Article Body */}
                  <div className="flex-1 flex flex-col">

                    {/* Category tag */}
                    {postData.category && (
                      <span className="text-red-500 text-[10px] md:text-xs font-black tracking-widest uppercase mb-3 block select-none">
                        {postData.category.startsWith('#') ? postData.category : `#${postData.category}`}
                      </span>
                    )}

                    {/* Headline Title */}
                    <h1 className="text-xl md:text-3xl font-black text-slate-900 dark:text-zinc-100 leading-tight mb-5 tracking-tight font-sans">
                      {postData.title || (language === 'vi' ? 'Chưa có tiêu đề' : 'Untitled Post')}
                    </h1>

                    {/* Lead description (Sapo block) */}
                    {postData.description && (
                      <div className="bg-slate-50 dark:bg-zinc-900/40 p-4 border-l-4 border-red-550 rounded-r-2xl text-xs md:text-sm text-slate-650 dark:text-slate-300 font-bold mb-6 leading-relaxed">
                        {postData.description}
                      </div>
                    )}

                    {/* Hashtags list */}
                    {postData.tags && (
                      <div className="flex flex-wrap gap-2 mb-4 select-none">
                        {postData.tags.split(',').map((tag, idx) => {
                          const trimmed = tag.trim();
                          if (!trimmed) return null;
                          return (
                            <span key={idx} className="bg-slate-50 dark:bg-zinc-900 text-slate-600 dark:text-zinc-350 border border-slate-200/80 dark:border-zinc-800 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider">
                              {trimmed.startsWith('#') ? trimmed : `#${trimmed}`}
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {/* Author & Publication metadata */}
                    {(postData.author || postData.published_at || postData.views) && (
                      <div className="flex items-center gap-3 mb-8 border-b border-slate-100 dark:border-zinc-800/80 pb-4 select-none">
                        {postData.author && (() => {
                          const { bgClass, textClass, initials, imageUrl } = getAvatarProps();
                          return (
                            <div className={`w-9 h-9 rounded-full ${bgClass} ${textClass} flex items-center justify-center text-[10px] font-black uppercase tracking-wider select-none shrink-0 overflow-hidden`}>
                              {imageUrl ? (
                                <img referrerPolicy="no-referrer" src={imageUrl} alt={postData.author} className="w-full h-full object-cover" />
                              ) : (
                                initials
                              )}
                            </div>
                          );
                        })()}

                        <div className="flex flex-col gap-0.5">
                          {postData.author && (
                            <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                              {postData.author}
                            </span>
                          )}
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 dark:text-zinc-500 font-bold">
                            {postData.published_at && (
                              <span>{postData.published_at}</span>
                            )}
                            {postData.published_at && postData.views && (
                              <span>•</span>
                            )}
                            {postData.views && (
                              <span>{postData.views} {language === 'vi' ? 'lượt xem' : 'views'}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Article Body Content */}
                    <div className="article-body-sections text-slate-700 dark:text-slate-350">
                      {postData.body && postData.body.length > 0 ? (
                        postData.body.map((block: any, idx: number) => {
                          if (block.type === 'heading2') {
                            return (
                              <h2 key={idx} className="text-base md:text-lg font-black text-slate-800 dark:text-zinc-100 mt-8 mb-4 border-l-4 border-red-550 pl-3 leading-snug">
                                {block.text}
                              </h2>
                            );
                          }
                          if (block.type === 'heading3') {
                            return (
                              <h3 key={idx} className="text-sm md:text-base font-extrabold text-slate-800 dark:text-zinc-200 mt-6 mb-3">
                                {block.text}
                              </h3>
                            );
                          }
                          if (block.type === 'image' && block.url) {
                            return (
                              <div key={idx} className="w-full my-6 flex flex-col items-center select-none animate-in fade-in duration-300">
                                <img referrerPolicy="no-referrer" 
                                  src={block.url}
                                  alt={block.caption || 'Article Image'}
                                  className="w-full max-h-[380px] object-cover rounded-2xl border border-slate-100 dark:border-zinc-800 shadow-sm"
                                />
                                {block.caption && (
                                  <span className="text-[10px] md:text-xs text-slate-400 font-bold italic mt-2 text-center bg-slate-50 dark:bg-zinc-900/30 px-3.5 py-1 rounded">
                                    {block.caption}
                                  </span>
                                )}
                              </div>
                            );
                          }
                          // Paragraph
                          return (
                            <p key={idx} className="text-xs md:text-sm text-slate-750 dark:text-slate-300 mb-4 leading-relaxed font-semibold">
                              {block.text}
                            </p>
                          );
                        })
                      ) : (
                        // Fallback parsing for full_text
                        (postData.full_text || postData.description || '').split('\n\n').map((para, pIdx) => {
                          const trimmed = para.trim();
                          if (!trimmed) return null;
                          return (
                            <p key={pIdx} className="text-xs md:text-sm text-slate-755 dark:text-slate-300 mb-4 leading-relaxed font-semibold">
                              {trimmed}
                            </p>
                          );
                        })
                      )}
                    </div>

                  </div>
                </div>

              </div>

              {/* Footer */}
              <div className="border-t border-gray-100 dark:border-zinc-800 p-6 shrink-0 bg-slate-50 dark:bg-zinc-900/30 flex justify-end">
                <button
                  onClick={() => setIsOriginalPostModalOpen(false)}
                  className="bg-primary hover:bg-primary-hover text-white px-6 py-2.5 rounded-xl text-xs font-black shadow-md shadow-primary/20 transition-all cursor-pointer border-0"
                >
                  {language === 'vi' ? 'Đóng' : 'Close'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Fullscreen Lightbox Gallery Modal */}
        {isLightboxOpen && postData.imageUrl && (() => {
          const imageUrls = postData.imageUrl.split('\n').map(url => url.trim()).filter(Boolean);
          if (imageUrls.length === 0) return null;

          const currentUrl = imageUrls[lightboxIndex] || imageUrls[0];

          const handleNext = (e?: React.MouseEvent) => {
            e?.stopPropagation();
            setLightboxIndex((prev) => (prev + 1) % imageUrls.length);
          };

          const handlePrev = (e?: React.MouseEvent) => {
            e?.stopPropagation();
            setLightboxIndex((prev) => (prev - 1 + imageUrls.length) % imageUrls.length);
          };

          return createPortal(
            <div
              onClick={() => setIsLightboxOpen(false)}
              className="fixed inset-0 bg-black/95 backdrop-blur-md z-[1000] flex flex-col items-center justify-center p-4 select-none animate-in fade-in duration-200"
            >
              {/* Close Button */}
              <button
                onClick={() => setIsLightboxOpen(false)}
                className="absolute top-6 right-6 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer border-0 z-[1002]"
              >
                <X size={20} />
              </button>

              {/* Navigation Arrows */}
              {imageUrls.length > 1 && (
                <>
                  <button
                    onClick={handlePrev}
                    className="absolute left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer border-0 z-[1001] active:scale-95"
                  >
                    <span className="text-xl">◀</span>
                  </button>
                  <button
                    onClick={handleNext}
                    className="absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer border-0 z-[1001] active:scale-95"
                  >
                    <span className="text-xl">▶</span>
                  </button>
                </>
              )}

              {/* Main Image */}
              <div
                onClick={(e) => e.stopPropagation()}
                className="max-w-[85vw] max-h-[75vh] rounded-2xl overflow-hidden shadow-2xl relative"
              >
                <img referrerPolicy="no-referrer" 
                  src={currentUrl}
                  alt={`Zoom view ${lightboxIndex + 1}`}
                  className="max-w-full max-h-[75vh] object-contain animate-in zoom-in-95 duration-200"
                />
              </div>

              {/* Pagination Info */}
              <div className="text-white/60 text-xs font-bold mt-4 z-[1001] bg-white/5 px-4 py-2 rounded-full backdrop-blur-sm border border-white/5">
                {language === 'vi' ? 'Ảnh' : 'Image'} {lightboxIndex + 1} / {imageUrls.length}
              </div>

              {/* Thumbnails list at bottom (if multiple images) */}
              {imageUrls.length > 1 && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-2 mt-6 max-w-[80vw] overflow-x-auto py-2 px-4 bg-white/5 border border-white/5 rounded-2xl backdrop-blur-sm custom-scrollbar"
                >
                  {imageUrls.map((url, idx) => (
                    <button
                      key={idx}
                      onClick={() => setLightboxIndex(idx)}
                      className={`w-14 h-14 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${idx === lightboxIndex ? 'border-primary scale-105 shadow-md shadow-primary/20' : 'border-transparent opacity-60 hover:opacity-100'
                        }`}
                    >
                      <img referrerPolicy="no-referrer" src={url} alt={`Thumbnail ${idx}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>,
            document.body
          );
        })()}

      </div>
      {popup && (
        <PopupDialog
          isOpen={popup.isOpen}
          onClose={() => setPopup(null)}
          message={popup.message}
          type={popup.type}
        />
      )}
    </EditableTextContext.Provider>
  );
}


