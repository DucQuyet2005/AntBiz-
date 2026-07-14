"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, Mic, Link2, FileText, Image as ImageIcon, X, Sparkles, Send,
  ChevronRight, ChevronLeft, Facebook, Instagram, MessageCircle,
  Calendar, Check, Loader2, RefreshCw, Highlighter, RotateCcw,
  Play, Pause, Plus, ChevronDown, Save, Wand2, AlignLeft,
  FileSearch, Bookmark, ArrowRight, ImagePlus, Globe, Newspaper,
  Volume2, FileType, Edit3, CheckCircle2, Clock, Search, Heart, ArrowLeft,
  ThumbsUp, MessageSquare
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { createClient } from '@/utils/supabase/client';
import PopupDialog from '@/components/PopupDialog';
import { mapErrorToHumanFriendly } from '@/lib/utils/errorMapper';

// ─── Types ────────────────────────────────────────────────────────────────────

type Platform = 'facebook' | 'threads' | 'instagram';
type SourceType = 'audio' | 'docx' | 'pdf' | 'image' | 'link' | 'manual' | null;
type Phase = 'drop' | 'processing' | 'source-review' | 'generating' | 'editing' | 'scheduling';

interface SourceDocument {
  type: SourceType;
  rawFile?: File;
  url?: string;
  extractedText: string;
  title: string;
  author: string;
  authorImageUrl?: string;
  publishedAt?: string;
  views?: string;
  category?: string;
  description?: string;
  tags?: string;
  imageUrls: string[];
  articleId: string | null;
  bodyBlocks?: any[];
}

interface ContentSegment {
  platform: Platform;
  content: string;
  originalContent: string;
  captionId: string | null;
  status: 'draft' | 'edited';
  htmlContent?: string;
  updateCounter: number;
}

interface HighlightMark {
  id: string;
  text: string;
  platform: Platform;
  color: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  highlightRef?: { markId: string; text: string };
  isStreaming?: boolean;
  revertContent?: string;
  revertHtmlContent?: string;
  revertPlatform?: Platform;
  reverted?: boolean;
  /** Q&A mode: which question this AI message belongs to */
  questionId?: string;
  /** Q&A mode: options shown below this message */
  options?: string[];
  /** Q&A mode: which option was selected */
  selectedOption?: string;
  /** Suggestions mode: AI-generated edit suggestions for user to pick from */
  suggestions?: string[];
  /** Suggestions mode: original user request that triggered suggestions */
  pendingUserMsg?: string;
  /** Suggestions mode: whether user has picked a suggestion (locks the card) */
  suggestionPicked?: boolean;
}

interface QAQuestion {
  id: string;
  isFixed: boolean;
  question: string;
  options: string[];
}

interface QAAnswer {
  questionId: string;
  question: string;
  answer: string;
}

interface ScheduleSlot {
  platform: Platform;
  date: string;
  time: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PLATFORMS: Platform[] = ['facebook', 'threads', 'instagram'];
const PLATFORM_LIMITS: Record<Platform, number> = {
  facebook: 63206,
  threads: 5000,
  instagram: 2200,
};

// ─── Helper: Threads icon ────────────────────────────────────────────────────

const ThreadsIcon = ({ size = 14, className = '' }: { size?: number; className?: string }) => (
  <svg viewBox="0 0 192 192" width={size} height={size} fill="currentColor" className={className}>
    <path d="M141.537 88.9883C140.71 88.5919 139.87 88.2104 139.019 87.8451C137.537 60.5382 122.616 44.905 97.5619 44.745C97.4484 44.7443 97.3355 44.7443 97.222 44.7443C82.2364 44.7443 69.7731 51.1409 62.102 62.7807L75.881 72.2328C81.6116 63.5383 90.6052 61.6848 97.2286 61.6848C97.3051 61.6848 97.3819 61.6848 97.4576 61.6855C105.707 61.7381 111.932 64.1366 115.961 68.814C118.893 72.2193 120.854 76.925 121.825 82.8638C114.511 81.6207 106.601 81.2385 98.145 81.7233C74.3247 83.0954 59.0111 96.9879 60.0396 116.292C60.5615 126.084 65.4397 134.508 73.775 140.011C80.8224 144.663 89.899 146.938 99.3323 146.423C111.79 145.74 121.563 140.987 128.381 132.296C133.559 125.696 136.834 117.143 138.28 106.366C144.217 109.949 148.617 114.664 151.047 120.332C155.179 129.967 155.42 145.8 142.501 158.708C131.182 170.016 117.576 174.908 97.0135 175.059C74.2042 174.89 56.9538 167.575 45.7381 153.317C35.2355 139.966 29.8077 120.682 29.6052 96C29.8077 71.3178 35.2355 52.0336 45.7381 38.6827C56.9538 24.4249 74.2039 17.11 97.0132 16.9405C119.988 17.1113 137.539 24.4614 149.184 38.788C154.894 45.8136 159.199 54.6488 162.037 64.9503L178.184 60.6422C174.744 47.9622 169.331 37.0357 161.965 27.974C147.036 9.60668 125.202 0.195148 97.0695 0H96.9569C68.8816 0.19447 47.2921 9.6418 32.7883 28.0793C19.8819 44.4864 13.2244 67.3157 13.0007 95.9325L13 96L13.0007 96.0675C13.2244 124.684 19.8819 147.514 32.7883 163.921C47.2921 182.358 68.8816 191.806 96.9569 192H97.0695C122.03 191.827 139.624 185.292 154.118 170.811C173.081 151.866 172.51 128.119 166.26 113.541C161.776 103.087 153.227 94.5962 141.537 88.9883ZM98.4405 129.507C88.0005 130.095 77.1544 125.409 76.6196 115.372C76.2232 107.93 81.9158 99.626 99.0812 98.6368C101.047 98.5234 102.976 98.468 104.871 98.468C111.106 98.468 116.939 99.0737 122.242 100.233C120.264 124.935 108.662 128.946 98.4405 129.507Z" />
  </svg>
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function genId() { return Math.random().toString(36).slice(2, 10); }

function detectFileType(file: File): SourceType {
  if (file.type.startsWith('audio/') || file.type.startsWith('video/') || file.name.match(/\.(mp3|m4a|ogg|wav|flac|webm|mp4)$/i)) return 'audio';
  if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) return 'pdf';
  if (file.type.includes('wordprocessingml') || file.name.match(/\.(docx?|doc)$/i)) return 'docx';
  if (file.type.startsWith('image/')) return 'image';
  return 'manual';
}

function getPlatformIcon(p: Platform, size = 14) {
  if (p === 'facebook') return <Facebook size={size} />;
  if (p === 'threads') return <ThreadsIcon size={size} />;
  return <Instagram size={size} />;
}



// ─── Audio Player ─────────────────────────────────────────────────────────────

function AudioPlayer({ src, name }: { src: string; name: string }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(0);
  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  return (
    <div className="flex items-center gap-3 bg-slate-50 dark:bg-zinc-900 rounded-2xl p-3 border border-slate-100 dark:border-zinc-800">
      <audio ref={ref} src={src}
        onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
        onTimeUpdate={() => setTime(ref.current?.currentTime || 0)}
        onLoadedMetadata={() => setDur(ref.current?.duration || 0)}
        onEnded={() => setPlaying(false)} />
      <button onClick={() => playing ? ref.current?.pause() : ref.current?.play()}
        className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center shrink-0 cursor-pointer border-0 hover:scale-105 transition-transform">
        {playing ? <Pause size={14} fill="white" /> : <Play size={14} className="ml-0.5" fill="white" />}
      </button>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-bold text-text truncate mb-1">{name}</div>
        <div className="flex items-center gap-2">
          <input type="range" min={0} max={dur || 1} value={time} step={0.1}
            onChange={e => { if (ref.current) ref.current.currentTime = +e.target.value; setTime(+e.target.value); }}
            className="flex-1 h-1 accent-primary cursor-pointer" />
          <span className="text-[10px] text-text-muted font-bold shrink-0">{fmt(time)}/{fmt(dur)}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Q&A Option Chips (Claude-style) ─────────────────────────────────────────

interface QAOptionsProps {
  options: string[];
  selectedOption?: string;
  onSelect: (option: string) => void;
  disabled?: boolean;
  isOtherOpen?: boolean;
  onOtherSubmit?: (text: string) => void;
}

function QAOptions({ options, selectedOption, onSelect, disabled, isOtherOpen: externalIsOtherOpen, onOtherSubmit }: QAOptionsProps) {
  const [isOtherOpen, setIsOtherOpen] = useState(false);
  const [otherText, setOtherText] = useState('');
  const isAnswered = !!selectedOption;
  const otherLabel = options[options.length - 1]; // "Khác..." is always last

  return (
    <div className="mt-3 flex flex-col gap-2">
      <div className="flex flex-col gap-1.5">
        {options.map((opt, i) => {
          const isLast = i === options.length - 1; // "Khác..."
          const isRecommend = opt.startsWith('(Recommend) ');
          const displayOpt = isRecommend ? opt.replace('(Recommend) ', '').trim() : opt;
          const isSelected = selectedOption === displayOpt || selectedOption === opt;
          
          return (
            <motion.button
              key={opt}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => {
                if (disabled || isAnswered) return;
                if (isLast) { setIsOtherOpen(true); }
                else { onSelect(displayOpt); }
              }}
              disabled={disabled}
              className={`w-full text-left px-4 py-2.5 rounded-2xl text-[13px] leading-snug font-medium border transition-all cursor-pointer relative overflow-hidden pr-20
                ${isAnswered
                  ? isSelected
                    ? 'bg-primary text-white border-primary shadow-sm shadow-primary/20'
                    : 'bg-slate-50 dark:bg-zinc-900/60 text-text-muted border-slate-100 dark:border-zinc-800/60 opacity-50 cursor-default'
                  : isRecommend
                    ? 'bg-primary/5 text-primary border-primary/30 hover:bg-primary/10 hover:border-primary/50 active:scale-[0.98]'
                    : 'bg-white dark:bg-zinc-900 text-text border-slate-200 dark:border-zinc-700 hover:border-primary/40 hover:bg-primary/3 hover:text-primary active:scale-[0.98]'
                }`}
            >
              {isSelected && <CheckCircle2 size={12} className="inline mr-2 -mt-0.5 opacity-80" />}
              {displayOpt}
              
              {isRecommend && !isAnswered && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black uppercase tracking-wide bg-primary/20 text-primary px-2 py-0.5 rounded-lg flex items-center gap-1">
                  <Sparkles size={10} /> ĐỀ XUẤT
                </span>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* "Khác..." input */}
      <AnimatePresence>
        {isOtherOpen && !isAnswered && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex gap-2 mt-1">
              <input
                type="text"
                value={otherText}
                onChange={e => setOtherText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && otherText.trim()) {
                    onSelect(otherText.trim());
                    setIsOtherOpen(false);
                    setOtherText('');
                  }
                  if (e.key === 'Escape') setIsOtherOpen(false);
                }}
                placeholder="Nhập câu trả lời của bạn..."
                autoFocus
                className="flex-1 px-3 py-2 text-sm rounded-xl border border-primary/40 bg-white dark:bg-zinc-900 text-text outline-none focus:ring-1 focus:ring-primary/30"
              />
              <button
                onClick={() => {
                  if (otherText.trim()) { onSelect(otherText.trim()); setIsOtherOpen(false); setOtherText(''); }
                }}
                disabled={!otherText.trim()}
                className="px-4 py-2 bg-primary text-white text-sm font-bold rounded-xl border-0 cursor-pointer disabled:opacity-40 hover:bg-primary-hover transition-colors"
              >
                <ArrowRight size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Q&A Platform Multiselect Toggles ────────────────────────────────────────

interface QAPlatformTogglesProps {
  selectedPlatforms: Platform[];
  onChange: (plats: Platform[]) => void;
  onSubmit: (answer: string) => void;
  disabled?: boolean;
  selectedOption?: string;
  vi: boolean;
  connectedPlatforms: string[];
  onWarning: (msg: string) => void;
}

function QAPlatformToggles({ 
  selectedPlatforms, onChange, onSubmit, disabled, selectedOption, vi, 
  connectedPlatforms, onWarning 
}: QAPlatformTogglesProps) {
  const togglePlatform = (p: Platform) => {
    if (disabled) return;
    if (!connectedPlatforms.includes(p)) {
      const label = p === 'facebook' ? 'Facebook' : p === 'threads' ? 'Threads' : 'Instagram';
      onWarning(vi
        ? `Nền tảng ${label} chưa được kết nối. Vui lòng liên kết tài khoản trong mục Cài đặt trước.`
        : `Platform ${label} is not connected. Please connect your account in Settings first.`
      );
      return;
    }
    if (selectedPlatforms.includes(p)) {
      onChange(selectedPlatforms.filter(x => x !== p));
    } else {
      onChange([...selectedPlatforms, p]);
    }
  };

  const handleConfirm = () => {
    if (selectedPlatforms.length === 0) return;
    const answerText = selectedPlatforms.length > 1
      ? (vi 
        ? `Đa nền tảng (${selectedPlatforms.map(p => p === 'facebook' ? 'Facebook' : p === 'threads' ? 'Threads' : 'Instagram').join(', ')})`
        : `Multi-platform (${selectedPlatforms.map(p => p === 'facebook' ? 'Facebook' : p === 'threads' ? 'Threads' : 'Instagram').join(', ')})`)
      : selectedPlatforms.map(p => p === 'facebook' ? 'Facebook' : p === 'threads' ? 'Threads' : 'Instagram').join(', ');
    onSubmit(answerText);
  };

  const isAnswered = !!selectedOption;

  return (
    <div className="mt-3 flex flex-col gap-3">
      {isAnswered ? (
        <div className="text-xs text-text-muted font-semibold bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-2xl p-3 inline-block">
          {vi ? 'Nền tảng đã chọn:' : 'Selected platforms:'} <span className="text-primary font-black">{selectedOption}</span>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {(['facebook', 'threads', 'instagram'] as Platform[]).map((p) => {
              const isSelected = selectedPlatforms.includes(p);
              const name = p === 'facebook' ? 'Facebook' : p === 'threads' ? 'Threads' : 'Instagram';
              const isConnected = connectedPlatforms.includes(p);
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => togglePlatform(p)}
                  disabled={disabled}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2 border transition-all cursor-pointer select-none
                    ${!isConnected
                      ? 'bg-slate-50 dark:bg-zinc-900/50 text-slate-350 dark:text-zinc-650 border-slate-200 dark:border-zinc-800 opacity-50'
                      : isSelected
                        ? p === 'facebook'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : p === 'threads'
                            ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 shadow-sm'
                            : 'bg-gradient-to-r from-purple-600 to-pink-500 text-white border-transparent shadow-sm'
                        : 'bg-white dark:bg-zinc-900 text-text-muted border-slate-200 dark:border-zinc-800 hover:border-slate-300 hover:text-text'
                    }`}
                >
                  {getPlatformIcon(p, 13)}
                  {name}
                  {!isConnected && (
                    <span className="text-[8px] font-black text-red-500 bg-red-50 dark:bg-red-950/40 border border-red-105 dark:border-red-900/30 px-1 py-0.5 rounded uppercase tracking-wider scale-90">
                      {vi ? 'Chưa kết nối' : 'Not Connected'}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={disabled || selectedPlatforms.length === 0}
            className="w-full mt-1.5 py-2.5 bg-primary hover:bg-primary-hover disabled:opacity-40 text-white text-xs font-black rounded-xl border-0 shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Check size={14} />
            {vi ? 'Xác nhận nền tảng' : 'Confirm Platforms'}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

// ─── Editor Div ──────────────────────────────────────────────────────────────

const EditorDiv = React.memo(({ html, updateCounter, onInput, onMouseUp, onMouseOver, onMouseOut, onClick, className, innerRef }: any) => {
  return (
    <div
      ref={innerRef}
      contentEditable
      suppressContentEditableWarning
      onInput={onInput}
      onMouseUp={onMouseUp}
      onMouseOver={onMouseOver}
      onMouseOut={onMouseOut}
      onClick={onClick}
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}, (prev, next) => prev.updateCounter === next.updateCounter);
const getWeekStartDate = () => {
  const start = new Date();
  const day = start.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() + diffToMonday);
  return start;
};

const toDateInputValue = (date: Date) => {
  const local = new Date(date);
  local.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return local.toJSON().slice(0, 10);
};

export default function AICreatorPreviewView() {
  const { t, language } = useLanguage();
  const vi = language === 'vi';

  // ── Popup Dialog ──────────────────────────────────────────────────────────
  const [popupOpen, setPopupOpen] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");
  const [popupType, setPopupType] = useState<'success' | 'error' | 'warning' | 'info'>('error');
  const [popupTitle, setPopupTitle] = useState("");

  // ── Phase ─────────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>('drop');

  // ── Source ────────────────────────────────────────────────────────────────
  const [source, setSource] = useState<SourceDocument>({
    type: null, extractedText: '', title: '', author: '', imageUrls: [], articleId: null,
  });
  const [isDraftEditing, setIsDraftEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftContent, setDraftContent] = useState('');
  const [voiceFile, setVoiceFile] = useState<File | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [linkInput, setLinkInput] = useState('');

  // Image drag-drop (for non-URL sources)
  const [isImageDragging, setIsImageDragging] = useState(false);
  const imageDropRef = useRef<HTMLDivElement>(null);

  // ── Q&A state ─────────────────────────────────────────────────────────────
  const [qaQuestions, setQaQuestions] = useState<QAQuestion[]>([]);
  const [qaAnswers, setQaAnswers] = useState<QAAnswer[]>([]);
  const [qaSelectedPlatforms, setQaSelectedPlatforms] = useState<Platform[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0); // which question is active
  const [isLoadingQA, setIsLoadingQA] = useState(false);
  const [qaComplete, setQaComplete] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  // ── Platform & Content ────────────────────────────────────────────────────
  const [activePlatform, setActivePlatform] = useState<Platform>('facebook');
  const [activePlatforms, setActivePlatforms] = useState<Platform[]>(PLATFORMS);
  const [segments, setSegments] = useState<Record<Platform, ContentSegment>>({
    facebook: { platform: 'facebook', content: '', originalContent: '', captionId: null, status: 'draft', htmlContent: '', updateCounter: 0 },
    threads: { platform: 'threads', content: '', originalContent: '', captionId: null, status: 'draft', htmlContent: '', updateCounter: 0 },
    instagram: { platform: 'instagram', content: '', originalContent: '', captionId: null, status: 'draft', htmlContent: '', updateCounter: 0 },
  });
  const [isGenerating, setIsGenerating] = useState<Record<Platform, boolean>>({
    facebook: false, threads: false, instagram: false,
  });
  const abortRef = useRef<AbortController | null>(null);

  // ── Highlights ────────────────────────────────────────────────────────────
  const [highlights, setHighlights] = useState<HighlightMark[]>([]);
  const [activeHighlight, setActiveHighlight] = useState<HighlightMark | null>(null);
  const [hoverMarkId, setHoverMarkId] = useState<string | null>(null);
  const [hoverPos, setHoverPos] = useState<{x: number, y: number} | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});
  const [globalContext, setGlobalContext] = useState<string>('');
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
          if (platforms.length > 0 && !platforms.includes('facebook')) {
            setQaSelectedPlatforms([platforms[0] as Platform]);
          } else if (platforms.length === 0) {
            setQaSelectedPlatforms([]);
          }
        }
      } catch (err) {
        console.error('Error checking platform integrations:', err);
      }
    };
    fetchConnections();
  }, []);
  const [isGeneratingContext, setIsGeneratingContext] = useState<boolean>(false);
  const [showContextModal, setShowContextModal] = useState<boolean>(false);
  const contentRef = useRef<Record<Platform, HTMLDivElement | null>>({
    facebook: null, threads: null, instagram: null,
  });
  const nextColorIdx = useRef(0);

  // ── Free chat (editing phase) ─────────────────────────────────────────────
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [streamingPlatform, setStreamingPlatform] = useState<Platform | null>(null);
  const [isSuggestLoading, setIsSuggestLoading] = useState(false);
  const chatAbortRef = useRef<AbortController | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // ── Free chat (editing phase) ─────────────────────────────────────────────

  // ── Schedule ─────────────────────────────────────────────────────────────
  const [scheduleSlots, setScheduleSlots] = useState<Record<Platform, ScheduleSlot>>({
    facebook: { platform: 'facebook', date: '', time: '09:00' },
    threads: { platform: 'threads', date: '', time: '10:00' },
    instagram: { platform: 'instagram', date: '', time: '11:00' },
  });
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduleSuccess, setScheduleSuccess] = useState(false);
  
  // New 2D Scheduler States
  const [existingPosts, setExistingPosts] = useState<any[]>([]);
  const [activeWeekIndex, setActiveWeekIndex] = useState(0);
  const [selectedCell, setSelectedCell] = useState<{ dateStr: string, hour: number, posts: any[] } | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const [dragResetTrigger, setDragResetTrigger] = useState(0);
  const weekDays = useMemo(() => Array.from({ length: 21 }, (_, index) => {
    const start = getWeekStartDate();
    start.setDate(start.getDate() + index);
    const dateStr = toDateInputValue(start);
    const daysNameMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const name = daysNameMap[start.getDay()];
    const label = start.getDate().toString();
    const isToday = dateStr === toDateInputValue(new Date());
    return { name, date: dateStr, label, isToday };
  }), []);

  const timelinePosts = useMemo(() => {
    return existingPosts.filter(p => {
      const pDate = new Date(p.scheduled_at);
      const dateStr = toDateInputValue(pDate);
      return weekDays.some((w: { date: string }) => w.date === dateStr);
    });
  }, [existingPosts, weekDays]);

  useEffect(() => {
    if (phase === 'scheduling') {
      const fetchScheduledPosts = async () => {
        try {
          const res = await fetch('/api/scheduled-posts');
          if (res.ok) {
            const json = await res.json();
            if (json.data) {
              setExistingPosts(json.data);
            }
          }
        } catch (err) {
          console.error('Failed to fetch existing posts', err);
        }
      };
      fetchScheduledPosts();
    }
  }, [phase]);

  const handleDragEnd = (platform: Platform, event: any, info: any) => {
    if (!boardRef.current) return;
    const rect = boardRef.current.getBoundingClientRect();
    const x = info.point.x - rect.left;
    const y = info.point.y - rect.top;

    const col = Math.floor(x / (rect.width / 7));
    const row = Math.floor(y / (rect.height / 24));
    
    const clampedCol = Math.max(0, Math.min(6, col));
    const clampedRow = Math.max(0, Math.min(23, row));
    
    const targetDate = weekDays[activeWeekIndex * 7 + clampedCol].date;
    const targetHour = clampedRow;
    
    setScheduleSlots(prev => {
      const existingMinutes = prev[platform].time.split(':')[1] || "00";
      return {
        ...prev,
        [platform]: {
          ...prev[platform],
          date: targetDate,
          time: `${targetHour.toString().padStart(2, '0')}:${existingMinutes}`
        }
      };
    });
    setDragResetTrigger(prev => prev + 1);
  };

  // ── Minimap ───────────────────────────────────────────────────────────────
  const [minimapOpen, setMinimapOpen] = useState(false);

  // ── Recording States & Refs ───────────────────────────────────────────────
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

  // ─── Init ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const d = tomorrow.toISOString().split('T')[0];
    setScheduleSlots({
      facebook: { platform: 'facebook', date: d, time: '09:00' },
      threads: { platform: 'threads', date: d, time: '10:00' },
      instagram: { platform: 'instagram', date: d, time: '11:00' },
    });
  }, []);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);



  // ─── Recording Logic ──────────────────────────────────────────────────────

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
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
        const url = URL.createObjectURL(file);
        setAudioUrl(url);
      };

      // Set up canvas waveform
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioCtxRef.current = audioContext;
      const analyser = audioContext.createAnalyser();
      analyserRef.current = analyser;
      analyser.fftSize = 256;

      const sourceNode = audioContext.createMediaStreamSource(stream);
      sourceNode.connect(analyser);

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
        ctx.strokeStyle = '#E05E1B'; // AntBiz primary accent color
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
      if (recordDuration < 2) {
        setPopupType('warning');
        setPopupTitle(vi ? 'Ghi âm ngắn' : 'Recording too short');
        setPopupMessage(vi ? 'Đoạn ghi âm quá ngắn (dưới 2 giây). Vui lòng nói dài hơn!' : 'Recording is too short (under 2 seconds). Please speak longer!');
        setPopupOpen(true);
        cancelRecording();
        return;
      }

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
    if (timerRef.current) clearInterval(timerRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
    }
  };

  // ─── Q&A flow ─────────────────────────────────────────────────────────────

  const startQAFlow = useCallback(async (src: SourceDocument) => {
    setIsLoadingQA(true);
    setPhase('source-review');

    // Initial greeting
    const greetMsg: ChatMessage = {
      id: genId(), role: 'assistant', timestamp: new Date(),
      content: vi
        ? `Tuyệt! Tôi đã đọc xong tài liệu của bạn. Hãy để tôi hỏi thêm một vài câu để tạo nội dung phù hợp nhất nhé 🎯`
        : `Great! I've read your document. Let me ask a few questions to create the most suitable content 🎯`,
    };
    setChatMessages([greetMsg]);

    try {
      const res = await fetch('/api/ai-creator-preview/suggest-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceTitle: src.title,
          sourceText: src.extractedText.substring(0, 1500),
          platform: activePlatform,
          language,
        }),
      });
      const data = await res.json();
      const questions: QAQuestion[] = data.questions || [];
      
      // Add platform selection as the final question
      questions.push({
        id: 'q_platform',
        isFixed: true,
        question: vi ? 'Bạn muốn đăng nội dung này lên những nền tảng nào?' : 'Which platforms do you want to post to?',
        options: [
          '(Recommend) Đa nền tảng (Facebook, Threads, Instagram)',
          'Chỉ Facebook',
          'Chỉ Instagram',
          'Chỉ Threads',
          vi ? 'Khác...' : 'Other...'
        ]
      });

      setQaQuestions(questions);

      // Show first question
      if (questions[0]) {
        addQuestionMessage(questions[0]);
      }
    } catch {
      // Fallback questions
      const fallback: QAQuestion[] = [
        {
          id: 'q1', isFixed: true,
          question: vi ? 'Đối tượng hướng đến của bài viết này là ai?' : 'Who is the target audience?',
          options: [vi ? '(Recommend) Người dùng phổ thông' : '(Recommend) General public', vi ? 'Khách hàng tiềm năng' : 'Potential customers', vi ? 'Chuyên gia ngành' : 'Industry professionals', vi ? 'Người mới' : 'Beginners', vi ? 'Khác...' : 'Other...'],
        },
        {
          id: 'q2', isFixed: true,
          question: vi ? 'Bạn muốn giọng văn như thế nào?' : 'What tone do you prefer?',
          options: [vi ? 'Chuyên nghiệp' : 'Professional', vi ? '(Recommend) Thân thiện' : '(Recommend) Friendly', vi ? 'Năng động' : 'Energetic', vi ? 'Truyền cảm hứng' : 'Inspiring', vi ? 'Khác...' : 'Other...'],
        },
        {
          id: 'q_platform',
          isFixed: true,
          question: vi ? 'Bạn muốn đăng nội dung này lên những nền tảng nào?' : 'Which platforms do you want to post to?',
          options: [
            '(Recommend) Đa nền tảng (Facebook, Threads, Instagram)',
            'Chỉ Facebook',
            'Chỉ Instagram',
            'Chỉ Threads',
            vi ? 'Khác...' : 'Other...'
          ]
        }
      ];
      setQaQuestions(fallback);
      addQuestionMessage(fallback[0]);
    } finally {
      setIsLoadingQA(false);
    }
  }, [activePlatform, language, vi]);

  const addQuestionMessage = (q: QAQuestion) => {
    const msg: ChatMessage = {
      id: genId(), role: 'assistant', timestamp: new Date(),
      content: q.question,
      questionId: q.id,
      options: q.options,
    };
    setChatMessages(prev => [...prev, msg]);
  };

  const handleQAAnswer = (questionId: string, answer: string) => {
    const q = qaQuestions.find(q => q.id === questionId);
    if (!q) return;

    // Mark selected option in messages
    setChatMessages(prev => prev.map(m =>
      m.questionId === questionId ? { ...m, selectedOption: answer } : m
    ));

    // Add user answer bubble
    const userMsg: ChatMessage = {
      id: genId(), role: 'user', timestamp: new Date(), content: answer,
    };
    setChatMessages(prev => [...prev, userMsg]);

    // Save answer
    const newAnswer: QAAnswer = { questionId, question: q.question, answer };
    const updatedAnswers = [...qaAnswers.filter(a => a.questionId !== questionId), newAnswer];
    setQaAnswers(updatedAnswers);

    // Next question
    const nextIndex = currentQIndex + 1;
    if (nextIndex < qaQuestions.length) {
      setCurrentQIndex(nextIndex);
      setTimeout(() => {
        addQuestionMessage(qaQuestions[nextIndex]);
      }, 400);
    } else {
      // All answered → show generate button
      setCurrentQIndex(nextIndex);
      setQaComplete(true);
      setTimeout(() => {
        const doneMsg: ChatMessage = {
          id: genId(), role: 'assistant', timestamp: new Date(),
          content: vi
            ? `Cảm ơn bạn! Tôi đã có đủ thông tin. Hãy nhấn "Tạo nội dung" để AI sinh bài đăng ${qaSelectedPlatforms.length > 0 ? `cho ${qaSelectedPlatforms.map(p => p === 'facebook' ? 'Facebook' : p === 'threads' ? 'Threads' : 'Instagram').join(', ')}` : 'cho các nền tảng đã chọn'} nhé 🚀`
            : `Thank you! I have all the information I need. Click "Generate Content" to create posts for ${qaSelectedPlatforms.length > 0 ? qaSelectedPlatforms.map(p => p === 'facebook' ? 'Facebook' : p === 'threads' ? 'Threads' : 'Instagram').join(', ') : 'your selected platforms'} 🚀`,
        };
        setChatMessages(prev => [...prev, doneMsg]);
      }, 400);
    }
  };

  // ─── STT Transcription Trigger ─────────────────────────────────────────────

  const handleTranscribeAndRewrite = async () => {
    if (!voiceFile) return;
    setPhase('processing');
    setIsTranscribing(true);
    try {
      const fd = new FormData();
      fd.append('file', voiceFile);
      const res = await fetch('/api/stt', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi xử lý giọng nói');

      const newSource: SourceDocument = {
        type: 'audio',
        rawFile: voiceFile,
        extractedText: data.rewritten_post || data.transcript || '',
        title: data.generated_title || voiceFile.name.replace(/\.[^/.]+$/, ''),
        author: '',
        imageUrls: [],
        articleId: null,
      };

      setSource(newSource);
      setDraftTitle(newSource.title);
      setDraftContent(newSource.extractedText);
      setIsDraftEditing(true);
      setVoiceFile(null); // Clear after successful transcription
    } catch (err: any) {
      const friendlyMsg = mapErrorToHumanFriendly(err, t);
      setPopupType('error');
      setPopupTitle(t('errors.title'));
      setPopupMessage(friendlyMsg);
      setPopupOpen(true);
    } finally {
      setPhase('drop');
      setIsTranscribing(false);
    }
  };

  // ─── File processing ──────────────────────────────────────────────────────

  const processFiles = async (files: File[]) => {
    if (!files.length) return;
    setPhase('processing');

    const file = files[0];
    const type = detectFileType(file);

    try {
      let newSource: SourceDocument = {
        type, rawFile: file, extractedText: '', title: '', author: '', imageUrls: [], articleId: null,
      };

      if (type === 'audio') {
        setVoiceFile(file);
        const url = URL.createObjectURL(file);
        setAudioUrl(url);
        setPhase('drop');
        return;
      } else if (type === 'docx' || type === 'pdf') {
        const fd = new FormData(); fd.append('file', file);
        const res = await fetch('/api/parse-doc', { method: 'POST', body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Lỗi trích xuất tài liệu');
        newSource.extractedText = data.text || '';
        newSource.title = file.name.replace(/\.[^/.]+$/, '');

      } else if (type === 'image') {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id || 'public';
        const ext = file.name.split('.').pop() || 'png';
        const path = `${userId}/acp_${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
        if (!error) {
          const { data } = supabase.storage.from('avatars').getPublicUrl(path);
          if (data?.publicUrl) newSource.imageUrls = [data.publicUrl];
        }
        newSource.title = file.name.replace(/\.[^/.]+$/, '');
        newSource.extractedText = '';
      }

      setSource(newSource);
      await startQAFlow(newSource);
    } catch (err: any) {
      const friendlyMsg = mapErrorToHumanFriendly(err, t);
      setPopupType('error');
      setPopupTitle(t('errors.title'));
      setPopupMessage(friendlyMsg);
      setPopupOpen(true);
      setPhase('drop');
    }
  };

  const processLink = async (url: string) => {
    setPhase('processing');
    try {
      const res = await fetch(`/api/scrape?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Không thể crawl URL');

      const newSource: SourceDocument = {
        type: 'link', url,
        extractedText: data.full_text || data.description || '',
        title: data.title || url,
        author: data.author || '',
        authorImageUrl: data.author_image_url || '',
        publishedAt: data.published_at || '',
        views: data.views || '',
        category: data.category || '',
        description: data.description || '',
        tags: data.tags || '',
        imageUrls: data.imageUrl ? data.imageUrl.split('\n').filter(Boolean) : [],
        articleId: data.id || null,
        bodyBlocks: data.body || [],
      };
      setSource(newSource);
      await startQAFlow(newSource);
    } catch (err: any) {
      const friendlyMsg = mapErrorToHumanFriendly(err, t);
      setPopupType('error');
      setPopupTitle(t('errors.title'));
      setPopupMessage(friendlyMsg);
      setPopupOpen(true);
      setPhase('drop');
    }
  };

  // ─── Drag & Drop (main zone) ──────────────────────────────────────────────

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) { await processFiles(files); return; }
    const text = e.dataTransfer.getData('text/plain');
    if (text && (text.startsWith('http://') || text.startsWith('https://'))) {
      setLinkInput(text);
    }
  };

  // ─── Image drag-drop for non-URL sources ─────────────────────────────────

  const handleImageDrop = async (e: React.DragEvent) => {
    e.preventDefault(); setIsImageDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (!files.length) return;
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id || 'public';
    const newUrls: string[] = [];
    for (const file of files) {
      const ext = file.name.split('.').pop() || 'png';
      const path = `${userId}/acp_img_${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
      if (!error) {
        const { data } = supabase.storage.from('avatars').getPublicUrl(path);
        if (data?.publicUrl) newUrls.push(data.publicUrl);
      }
    }
    if (newUrls.length) {
      setSource(prev => ({ ...prev, imageUrls: [...prev.imageUrls, ...newUrls] }));
    }
  };

  // ─── Generate content after Q&A ──────────────────────────────────────────

  const startGeneratingContext = async () => {
    setIsGeneratingContext(true);
    setGlobalContext('');
    const contentAnswers = qaAnswers.filter(a => a.questionId !== 'q_platform');
    try {
      const res = await fetch('/api/ai-creator-preview/generate-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceTitle: source.title,
          sourceText: source.extractedText,
          qaAnswers: contentAnswers.map(a => ({ question: a.question, answer: a.answer })),
          language: language
        })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.context) {
          setGlobalContext(json.context);
        }
      }
    } catch (err) {
      console.error('Failed to generate global context:', err);
    } finally {
      setIsGeneratingContext(false);
    }
  };

  const regeneratePlatform = async (p: Platform) => {
    setIsGenerating(prev => ({ ...prev, [p]: true }));
    const contentAnswers = qaAnswers.filter(a => a.questionId !== 'q_platform');
    const answersText = contentAnswers.map(a => `${a.question}\n→ ${a.answer}`).join('\n\n');
    const contextPrompt = `Dựa trên tài liệu nguồn và thông tin người dùng cung cấp:\n\n${answersText}`;
    const platformLabel = p === 'facebook' ? 'Facebook' : p === 'threads' ? 'Threads' : 'Instagram';
    const bodyPrompt = `Tạo bài đăng ${platformLabel} chuyên nghiệp từ nội dung sau.

TÀI LIỆU NGUỒN:
Tiêu đề: ${source.title}
Nội dung: ${source.extractedText.substring(0, 2000)}

YÊU CẦU TỪ NGƯỜI DÙNG:
${contextPrompt}

Hãy viết bài đăng hoàn chỉnh cho ${platformLabel}. Chỉ trả về nội dung bài đăng, không có lời dẫn.`;

    try {
      const res = await fetch('/api/captions/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleId: source.articleId || undefined,
          customPrompt: bodyPrompt,
          platform: p,
        }),
        signal: abortRef.current?.signal,
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP error ${res.status}`);
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let acc = '';
      if (!reader) return;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.text) {
              acc += parsed.text;
              setSegments(prev => ({
                ...prev,
                [p]: { 
                  ...prev[p], 
                  content: acc, 
                  htmlContent: acc,
                  originalContent: prev[p].originalContent || acc,
                  updateCounter: (prev[p].updateCounter || 0) + 1
                },
              }));
            }
            if (parsed.done && parsed.captionId) {
              setSegments(prev => ({ ...prev, [p]: { ...prev[p], captionId: parsed.captionId } }));
            }
            if (parsed.done && parsed.articleId && !source.articleId) {
              setSource(prev => ({ ...prev, articleId: parsed.articleId }));
            }
          } catch { }
        }
      }
      setSegments(prev => ({ ...prev, [p]: { ...prev[p], originalContent: acc || prev[p].originalContent } }));
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      const friendlyMsg = mapErrorToHumanFriendly(err, t);
      setPopupType('error');
      setPopupTitle(t('errors.title'));
      setPopupMessage(friendlyMsg);
      setPopupOpen(true);
    } finally {
      setIsGenerating(prev => ({ ...prev, [p]: false }));
    }
  };

  const generateContent = async () => {
    setPhase('generating');
    startGeneratingContext(); // Run context generation concurrently
    abortRef.current = new AbortController();
    
    // Use selected platforms; fallback to only connected platforms (not all PLATFORMS)
    const connectedPlatformsList = PLATFORMS.filter(p => connectedPlatforms.includes(p));
    let platformsToGen: Platform[] = qaSelectedPlatforms.length > 0 
      ? qaSelectedPlatforms.filter(p => connectedPlatforms.includes(p))  // only keep connected ones
      : connectedPlatformsList.length > 0 ? connectedPlatformsList : [...PLATFORMS];

    if (platformsToGen.length > 0) setActivePlatform(platformsToGen[0]);
    setActivePlatforms(platformsToGen);

    await Promise.all(platformsToGen.map(p => regeneratePlatform(p)));
    setPhase('editing');

    // Add system message in chat with actual platform names
    const platformNames = platformsToGen.map(p => p === 'facebook' ? 'Facebook' : p === 'threads' ? 'Threads' : 'Instagram').join(', ');
    setChatMessages(prev => [...prev, {
      id: genId(), role: 'assistant', timestamp: new Date(),
      content: vi
        ? `✨ Nội dung đã được tạo cho ${platformsToGen.length === 1 ? `nền tảng ${platformNames}` : `${platformsToGen.length} nền tảng (${platformNames})`}! Bạn có thể bôi đen bất kỳ đoạn nào để nhờ tôi chỉnh sửa.`
        : `✨ Content created for ${platformsToGen.length === 1 ? `platform ${platformNames}` : `${platformsToGen.length} platforms (${platformNames})`}! Highlight any text to ask me to edit it.`,
    }]);
  };

  // ─── Highlight detection ──────────────────────────────────────────────────

  const handleTextMouseUp = (e: React.MouseEvent, p: Platform) => {
    if (phase !== 'editing') return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.toString().trim()) { 
      return; 
    }
    const text = sel.toString().trim();
    if (text.length < 3) return;

    const range = sel.getRangeAt(0);
    const markId = `mark-${genId()}`;
    const markNode = document.createElement('mark');
    markNode.id = markId;
    markNode.className = 'bg-amber-200 dark:bg-amber-900/50 text-text rounded-sm cursor-pointer border-b-2 border-transparent transition-all';
    
    try {
      range.surroundContents(markNode);
    } catch (err) {
      console.warn("Could not surround contents", err);
      return;
    }
    sel.removeAllRanges();

    const html = contentRef.current[p]?.innerHTML || '';
    setSegments(prev => ({
       ...prev,
       [p]: { 
         ...prev[p], 
         htmlContent: html,
         updateCounter: (prev[p].updateCounter || 0) + 1
       }
    }));
  };

  const handleTextMouseOver = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName.toLowerCase() === 'mark') {
      setHoverMarkId(target.id);
      const rect = target.getBoundingClientRect();
      setHoverPos({ x: rect.left + rect.width / 2, y: rect.top });
    }
  };

  const handleTextMouseOut = (e: React.MouseEvent) => {
    // We don't hide immediately to allow mouse to enter the tooltip
  };

  const handleTextClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    document.querySelectorAll('mark').forEach(m => {
      m.style.borderBottomColor = 'transparent';
      m.style.backgroundColor = '';
    });
    
    if (target.tagName.toLowerCase() === 'mark') {
      target.style.borderBottomColor = '#f59e0b';
      target.style.backgroundColor = 'rgba(253, 224, 71, 0.8)';
    }
  };



  // ─── Fetch suggestions for free-text (no highlight) requests ─────────────

  const handleSuggestionPick = async (suggMsgId: string, chosenText: string) => {
    // Mark suggestion card as picked
    setChatMessages(prev => prev.map(m =>
      m.id === suggMsgId ? { ...m, suggestionPicked: true } : m
    ));
    // Trigger the actual edit with the chosen suggestion text
    await handleChatSend(chosenText, true);
  };

  // ─── Free chat (editing phase) ────────────────────────────────────────────

  const handleChatSend = async (text?: string, skipSuggest = false) => {
    const msg = (text || chatInput).trim();
    if (!msg || isChatLoading || isSuggestLoading) return;
    setChatInput('');

    const activeHighlightToSend = activeHighlight;
    setActiveHighlight(null);

    // ── When no highlight & not a picked suggestion → fetch suggestions first ──
    if (!activeHighlightToSend && !skipSuggest) {
      setIsSuggestLoading(true);
      const userMsg: ChatMessage = {
        id: genId(), role: 'user', timestamp: new Date(), content: msg,
      };
      setChatMessages(prev => [...prev, userMsg]);

      try {
        const res = await fetch('/api/ai-creator-preview/suggest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userMessage: msg,
            currentPlatformContent: segments[activePlatform]?.content || '',
            platform: activePlatform,
            globalContext,
            sourceTitle: source.title,
          }),
        });
        const data = await res.json();
        const suggestions: string[] = data.suggestions?.length > 0
          ? data.suggestions
          : [
              vi ? 'Viết lại theo phong cách chuyên nghiệp hơn' : 'Rewrite in a more professional tone',
              vi ? 'Rút ngắn và súc tích hơn' : 'Make it shorter and more concise',
              vi ? 'Thêm call-to-action hấp dẫn' : 'Add a compelling call-to-action',
            ];

        const suggMsgId = genId();
        setChatMessages(prev => [...prev, {
          id: suggMsgId,
          role: 'assistant',
          timestamp: new Date(),
          content: vi
            ? '💡 Dựa trên yêu cầu của bạn, đây là 3 cách tôi có thể chỉnh sửa bài đăng:'
            : '💡 Based on your request, here are 3 ways I can edit the post:',
          suggestions,
          pendingUserMsg: msg,
          suggestionPicked: false,
        }]);
      } catch {
        const suggMsgId = genId();
        setChatMessages(prev => [...prev, {
          id: suggMsgId,
          role: 'assistant',
          timestamp: new Date(),
          content: vi ? '💡 Chọn cách chỉnh sửa:' : '💡 Choose how to edit:',
          suggestions: [
            vi ? 'Viết lại theo yêu cầu' : 'Rewrite as requested',
            vi ? 'Chỉnh sửa nhẹ nhàng' : 'Make light edits',
            vi ? 'Cải thiện giọng văn' : 'Improve the tone',
          ],
          pendingUserMsg: msg,
          suggestionPicked: false,
        }]);
      } finally {
        setIsSuggestLoading(false);
      }
      return; // Stop here – wait for user to pick a suggestion
    }

    // ── Normal path: has highlight OR is a picked suggestion → call /chat ──
    setIsChatLoading(true);

    const currentPlatformContentText = segments[activePlatform]?.content || '';
    const currentPlatformContentHtml = segments[activePlatform]?.htmlContent || '';

    const userMsg: ChatMessage = {
      id: genId(), role: 'user', timestamp: new Date(), content: msg,
      highlightRef: activeHighlightToSend ? { markId: activeHighlightToSend.id, text: activeHighlightToSend.text } : undefined,
    };
    setChatMessages(prev => [...prev, userMsg]);

    const astId = genId();
    setChatMessages(prev => [...prev, {
      id: astId, role: 'assistant', timestamp: new Date(), content: '', isStreaming: true,
      revertContent: currentPlatformContentText,
      revertHtmlContent: currentPlatformContentHtml,
      revertPlatform: activePlatform,
      reverted: false,
    }]);

    chatAbortRef.current = new AbortController();
    try {
      const history = chatMessages.slice(-10).filter(m => m.role !== 'system').map(m => ({
        role: m.role, content: m.content,
      }));

      const res = await fetch('/api/ai-creator-preview/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemContext: {
            sourceTitle: source.title,
            sourceText: source.extractedText.substring(0, 2000),
            currentPlatformContent: segments[activePlatform]?.content || '',
            highlightedPortion: activeHighlightToSend?.text || '',
            platform: activePlatform,
            presetRules: '',
            conversationHistory: history,
            globalContext: globalContext,
          },
          userMessage: msg,
        }),
        signal: chatAbortRef.current.signal,
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let acc = '';
      let isFirstChunk = true;
      if (!reader) throw new Error('No stream');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;
          let parsed;
          try {
            parsed = JSON.parse(data);
          } catch {
            continue; // Ignore malformed JSON
          }
          
          if (parsed.error) {
            throw new Error(parsed.error); // throw to outer catch
          }

          if (parsed.text) {
            acc += parsed.text;
            setChatMessages(prev => prev.map(m => m.id === astId ? { ...m, content: acc } : m));

            if (activeHighlightToSend) {
              // Stream directly into the highlighted mark element
              const mark = document.getElementById(activeHighlightToSend.id);
              if (mark) {
                if (isFirstChunk) {
                  mark.innerText = '';
                  isFirstChunk = false;
                }
                mark.innerText = acc;
              }
            } else {
              // Stream full-content edit directly into the editor div chunk by chunk
              const div = contentRef.current[activePlatform];
              if (div) {
                if (isFirstChunk) {
                  div.innerText = '';
                  setStreamingPlatform(activePlatform);
                  isFirstChunk = false;
                }
                div.innerText = acc;
              }
            }
          }
          if (parsed.done) {
            setStreamingPlatform(null);
            // If AI refused (noChange), do NOT update the post content
            if (parsed.noChange) break;

            const div = contentRef.current[activePlatform];
            const updatedHtml = div ? div.innerHTML : '';
            const updatedText = div ? div.innerText : '';
            
            setSegments(prev => ({
              ...prev,
              [activePlatform]: { 
                ...prev[activePlatform], 
                content: activeHighlightToSend ? updatedText : (parsed.updatedContent || updatedText || prev[activePlatform].content), 
                htmlContent: activeHighlightToSend ? updatedHtml : (parsed.updatedContent || updatedHtml || prev[activePlatform].htmlContent), 
                status: 'edited',
                updateCounter: (prev[activePlatform].updateCounter || 0) + 1
              },
            }));
          }
        }
      }
      setStreamingPlatform(null);
      setChatMessages(prev => prev.map(m => m.id === astId ? { ...m, isStreaming: false } : m));
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      setChatMessages(prev => prev.map(m =>
        m.id === astId ? { ...m, content: vi ? `❌ Lỗi: ${err.message}` : `❌ Error: ${err.message}`, isStreaming: false } : m
      ));
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleRevert = (msgId: string) => {
    setChatMessages(prev => prev.map(m => {
      if (m.id === msgId) {
        if (m.revertPlatform) {
          setSegments(segPrev => ({
            ...segPrev,
            [m.revertPlatform!]: {
              ...segPrev[m.revertPlatform!],
              content: m.revertContent || '',
              htmlContent: m.revertHtmlContent || '',
              status: 'draft',
              updateCounter: (segPrev[m.revertPlatform!].updateCounter || 0) + 1
            }
          }));
        }
        return { ...m, reverted: true };
      }
      return m;
    }));

    setPopupType('success');
    setPopupTitle(vi ? 'Đã thu hồi' : 'Reverted');
    setPopupMessage(vi ? 'Đã khôi phục lại nội dung trước chỉnh sửa!' : 'Reverted content to previous state!');
    setPopupOpen(true);
  };

  // ─── Schedule ─────────────────────────────────────────────────────────────

  const handleSchedule = async () => {
    setIsScheduling(true);
    try {
      const targets = PLATFORMS.filter(p => !!segments[p]?.content);
      if (targets.length === 0) {
        setPopupType('warning');
        setPopupTitle(vi ? 'Không có nội dung' : 'No Content');
        setPopupMessage(vi ? 'Không có bài đăng nào chứa nội dung để lên lịch.' : 'There are no posts with content to schedule.');
        setPopupOpen(true);
        setIsScheduling(false);
        return;
      }

      // 1. Validate schedule inputs for all active platforms
      for (const p of targets) {
        const platformName = p === 'facebook' ? 'Facebook' : p === 'threads' ? 'Threads' : 'Instagram';
        
        if (!scheduleSlots[p].date || !scheduleSlots[p].time) {
          setPopupType('warning');
          setPopupTitle(vi ? 'Thiếu thông tin lịch đăng' : 'Missing Schedule Info');
          setPopupMessage(vi 
            ? `Vui lòng nhập đầy đủ ngày và giờ lên lịch cho nền tảng ${platformName}.`
            : `Please enter the scheduled date and time for platform ${platformName}.`
          );
          setPopupOpen(true);
          setIsScheduling(false);
          return;
        }

        const scheduledAt = new Date(`${scheduleSlots[p].date}T${scheduleSlots[p].time}`);
        if (isNaN(scheduledAt.getTime())) {
          setPopupType('warning');
          setPopupTitle(vi ? 'Thời gian không hợp lệ' : 'Invalid Time');
          setPopupMessage(vi 
            ? `Thời gian lên lịch cho nền tảng ${platformName} không đúng định dạng.`
            : `The scheduled time for platform ${platformName} is invalid.`
          );
          setPopupOpen(true);
          setIsScheduling(false);
          return;
        }

        if (scheduledAt <= new Date()) {
          setPopupType('warning');
          setPopupTitle(vi ? 'Thời gian ở quá khứ' : 'Past Time Error');
          setPopupMessage(vi 
            ? `Thời gian đăng cho nền tảng ${platformName} không được ở trong quá khứ. Vui lòng chọn một thời điểm trong tương lai.`
            : `The scheduled time for platform ${platformName} cannot be in the past. Please choose a future time.`
          );
          setPopupOpen(true);
          setIsScheduling(false);
          return;
        }
      }

      // 2. Process scheduling
      for (const p of targets) {
        const seg = segments[p];
        const scheduledAt = new Date(`${scheduleSlots[p].date}T${scheduleSlots[p].time}`);
        let captionId = seg.captionId;
        
        if (!captionId && source.articleId) {
          const res = await fetch('/api/captions', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              article_id: source.articleId, platform: p === 'threads' ? 'thread' : p,
              ai_content: seg.originalContent || seg.content,
              edited_content: seg.content !== seg.originalContent ? seg.content : null,
            }),
          });
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || (vi ? `Lỗi tạo bài đăng (caption) cho ${p}` : `Error creating caption for ${p}`));
          }
          captionId = (await res.json()).data?.id;
        }
        
        if (captionId) {
          const res = await fetch('/api/scheduled-posts', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ captionId, scheduledAt: scheduledAt.toISOString(), imageUrls: source.imageUrls }),
          });
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || (vi ? `Không thể lưu lịch đăng cho ${p}` : `Failed to save scheduled post for ${p}`));
          }
        } else {
          throw new Error(vi ? `Không thể sinh Caption ID cho nền tảng ${p}` : `Could not generate Caption ID for platform ${p}`);
        }
      }
      setScheduleSuccess(true);
    } catch (err: any) {
      console.error(err);
      const friendlyMsg = mapErrorToHumanFriendly(err, t);
      setPopupType('error');
      setPopupTitle(t('errors.title'));
      setPopupMessage(friendlyMsg);
      setPopupOpen(true);
    } finally {
      setIsScheduling(false);
    }
  };

  const resetAfterSchedule = () => {
    setScheduleSuccess(false);
    setPhase('drop');
    setSource({ type: null, extractedText: '', title: '', author: '', imageUrls: [], articleId: null });
    setSegments({ 
      facebook: { platform: 'facebook', content: '', originalContent: '', captionId: null, status: 'draft', htmlContent: '', updateCounter: 0 }, 
      threads: { platform: 'threads', content: '', originalContent: '', captionId: null, status: 'draft', htmlContent: '', updateCounter: 0 }, 
      instagram: { platform: 'instagram', content: '', originalContent: '', captionId: null, status: 'draft', htmlContent: '', updateCounter: 0 } 
    });
    setChatMessages([]);
    setQaAnswers([]);
    setQaComplete(false);
    setCurrentQIndex(0);
    setGlobalContext('');
    setIsGeneratingContext(false);
  };

  // ─── Render: Drop zone ────────────────────────────────────────────────────

  if (phase === 'drop') {
    return (
      <div className="flex flex-col h-[calc(100vh-100px)] min-h-[560px]">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text flex items-center gap-2">
            <Sparkles size={22} className="text-primary" />
            AI Creator Preview
          </h1>
          <p className="text-sm text-text-muted mt-0.5">
            {vi ? 'Kéo thả tài liệu để AI tư vấn và sinh nội dung bài đăng đa nền tảng' : 'Drop your document — AI will guide you through creating multi-platform content'}
          </p>
        </div>



        {isDraftEditing ? (
          /* Draft Editor Card */
          <div className="flex-1 flex flex-col rounded-3xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-6 md:p-8 shadow-sm relative overflow-hidden">
            {/* Ambient background decoration */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-50">
              <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-primary/5 blur-3xl" />
              <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-cyan-500/5 blur-3xl" />
            </div>

            <div className="z-10 flex flex-col h-full">
              <h2 className="text-lg font-bold text-text mb-5 flex items-center gap-2 border-b border-slate-100 dark:border-zinc-800 pb-3">
                {source.type === 'manual' ? (
                  <>✏️ {vi ? 'Tự soạn thảo bài viết mới' : 'Draft New Post'}</>
                ) : (
                  <>🎙️ {vi ? 'Hiệu đính văn bản ghi âm' : 'Edit Transcribed Audio'}</>
                )}
              </h2>

              <div className="flex flex-col gap-4 flex-1 overflow-y-auto pr-1">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-black text-text-muted uppercase tracking-wider">
                    {vi ? 'Tiêu đề bài viết' : 'Post Title'}
                  </label>
                  <input
                    type="text"
                    value={draftTitle}
                    onChange={e => setDraftTitle(e.target.value)}
                    placeholder={vi ? 'Nhập tiêu đề bài viết...' : 'Enter post title...'}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-text outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all font-semibold"
                  />
                </div>

                <div className="flex flex-col gap-1.5 flex-1 min-h-[220px]">
                  <label className="text-xs font-black text-text-muted uppercase tracking-wider">
                    {vi ? 'Nội dung chi tiết' : 'Post Content'}
                  </label>
                  <textarea
                    value={draftContent}
                    onChange={e => setDraftContent(e.target.value)}
                    placeholder={vi ? 'Soạn thảo hoặc chỉnh sửa nội dung bài viết của bạn tại đây...' : 'Write or edit your post content here...'}
                    className="w-full flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-text outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all resize-none font-sans leading-relaxed"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 justify-end mt-6 border-t border-slate-100 dark:border-zinc-800 pt-4">
                <button
                  onClick={() => {
                    setIsDraftEditing(false);
                    setSource({ type: null, extractedText: '', title: '', author: '', imageUrls: [], articleId: null });
                  }}
                  className="px-5 py-2.5 bg-slate-50 dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 text-text-muted hover:text-text rounded-xl text-xs font-black border border-slate-200 dark:border-zinc-800 transition-all cursor-pointer"
                >
                  {vi ? 'Quay lại' : 'Back'}
                </button>
                <button
                  onClick={async () => {
                    if (!draftTitle.trim() || !draftContent.trim()) {
                      setPopupType('warning');
                      setPopupTitle(vi ? 'Thiếu thông tin' : 'Missing Information');
                      setPopupMessage(vi ? 'Vui lòng nhập đầy đủ cả tiêu đề và nội dung bài viết!' : 'Please enter both the title and content!');
                      setPopupOpen(true);
                      return;
                    }
                    const updatedSource = {
                      ...source,
                      title: draftTitle,
                      extractedText: draftContent
                    };
                    setSource(updatedSource);
                    setIsDraftEditing(false);
                    await startQAFlow(updatedSource);
                  }}
                  className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-black border-0 transition-all shadow-md shadow-primary/10 cursor-pointer flex items-center gap-2"
                >
                  <Sparkles size={14} />
                  {vi ? 'Đồng ý & Bắt đầu thiết lập' : 'Confirm & Start Setup'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Drop Zone */
          <div
            onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
            className={`flex-1 flex flex-col items-center justify-center rounded-3xl border-2 border-dashed relative overflow-hidden transition-all duration-300
              ${isDragging ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-slate-200 dark:border-zinc-800 bg-slate-50/40 dark:bg-zinc-950/40 hover:border-primary/40'}`}
          >
          {/* Ambient gradient */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-primary/5 blur-3xl" />
            <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-cyan-500/5 blur-3xl" />
          </div>

          <div className={`text-center max-w-md px-6 py-12 z-10 transition-all duration-300 ${isDragging ? 'scale-105' : ''} w-full`}>
            {isRecording ? (
              /* Live Recording UI inside Drop Zone */
              <div className="flex flex-col items-center gap-4 py-6 w-full">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-rose-600 rounded-full animate-ping" />
                  <span className="text-xs font-black text-rose-600 uppercase tracking-widest">{vi ? 'Đang ghi âm...' : 'Recording...'}</span>
                </div>

                <div className="w-full bg-white dark:bg-zinc-900 rounded-xl overflow-hidden border border-slate-200 dark:border-zinc-800 shadow-inner p-1">
                  <canvas ref={canvasRef} width={400} height={60} className="w-full h-[60px]" />
                </div>

                <div className="text-xl font-mono font-black text-text mt-1">
                  {formatDuration(recordDuration)}
                </div>

                <div className="flex items-center gap-3 justify-center mt-2">
                  <button
                    onClick={stopRecording}
                    className="bg-rose-600 hover:bg-rose-700 text-white px-5 py-2.5 rounded-2xl text-xs font-black transition-all shadow-md shadow-rose-200 dark:shadow-none cursor-pointer border-0 flex items-center gap-1.5"
                  >
                    <span className="w-2.5 h-2.5 bg-white rounded-sm" />
                    {vi ? 'Hoàn thành' : 'Done'}
                  </button>
                  <button
                    onClick={cancelRecording}
                    className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-text-muted hover:text-text px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer"
                  >
                    {vi ? 'Hủy' : 'Cancel'}
                  </button>
                </div>
              </div>
            ) : voiceFile ? (
              /* Selected audio file preview & Transcribe button */
              <div className="bg-white dark:bg-zinc-900/60 p-5 rounded-2xl border border-slate-200 dark:border-zinc-800/80 flex flex-col gap-4 text-left w-full shadow-inner">
                <div className="flex items-center justify-between">
                  <span className="text-[11.5px] font-bold text-text truncate max-w-[75%]">🎵 {voiceFile.name}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setVoiceFile(null);
                      setAudioUrl(null);
                    }}
                    className="text-red-500 hover:text-red-700 text-xs font-black border-0 bg-transparent cursor-pointer"
                  >
                    {vi ? 'Xóa' : 'Remove'}
                  </button>
                </div>

                {audioUrl && (
                  <AudioPlayer src={audioUrl} name={voiceFile.name} />
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
                      {vi ? 'Đang dịch giọng nói...' : 'Transcribing voice...'}
                    </>
                  ) : (
                    <>
                      <Sparkles size={12} />
                      {vi ? 'Dịch giọng nói bằng AI' : 'Transcribe & Rewrite with AI'}
                    </>
                  )}
                </button>
              </div>
            ) : (
              <>
                <div className="relative mb-6 mx-auto w-24 h-24">
                  <div className={`w-full h-full rounded-3xl flex items-center justify-center transition-all ${isDragging ? 'bg-primary shadow-lg shadow-primary/30' : 'bg-slate-100 dark:bg-zinc-900'}`}>
                    <Upload size={36} className={isDragging ? 'text-white' : 'text-slate-400'} />
                  </div>
                  <span className="absolute -top-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-sm">
                    <Sparkles size={12} className="text-white" />
                  </span>
                </div>

                <h2 className="text-xl font-bold text-text mb-2">
                  {isDragging ? (vi ? 'Thả vào đây!' : 'Drop it here!') : (vi ? 'Kéo thả tài liệu của bạn' : 'Drop your document')}
                </h2>
                <p className="text-sm text-text-muted mb-6">
                  {vi ? 'Hỗ trợ Audio · PDF/DOCX · Ảnh · Link bài viết' : 'Supports Audio · PDF/DOCX · Image · Article URL'}
                </p>

                {/* Type chips */}
                <div className="flex flex-wrap justify-center gap-2 mb-8">
                  {[
                    { icon: <Volume2 size={11} />, label: 'Audio' },
                    { icon: <FileType size={11} />, label: 'PDF / DOCX' },
                    { icon: <ImageIcon size={11} />, label: vi ? 'Ảnh' : 'Image' },
                    { icon: <Globe size={11} />, label: 'URL' },
                    { icon: <Edit3 size={11} />, label: vi ? 'Tự viết' : 'Manual' },
                  ].map(t => (
                    <span key={t.label} className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-full text-[11px] font-semibold text-text-muted shadow-sm">
                      {t.icon} {t.label}
                    </span>
                  ))}
                </div>

                {/* Microphone Permission Guide Alert */}
                {showMicGuide && (
                  <div className="mb-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-2xl p-3 flex items-start gap-2 text-xs text-amber-800 dark:text-amber-400 leading-relaxed font-medium text-left">
                    <span>⚠️</span>
                    <div className="flex-1">
                      {vi
                        ? 'Không thể truy cập Micro. Vui lòng kiểm tra quyền thiết bị trong cài đặt trình duyệt và thử lại.'
                        : 'Cannot access microphone. Please verify device permissions in browser settings.'}
                    </div>
                    <button onClick={() => setShowMicGuide(false)} className="text-amber-500 hover:text-amber-700 font-bold border-0 bg-transparent cursor-pointer">×</button>
                  </div>
                )}

                <div className="text-xs text-text-muted mb-4 font-medium">— {vi ? 'hoặc nhập link' : 'or paste URL'} —</div>

                <div className="flex gap-2 mb-4">
                  <input
                    type="url" value={linkInput} onChange={e => setLinkInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && linkInput.trim()) processLink(linkInput.trim()); }}
                    placeholder={vi ? 'Dán link bài viết vào đây...' : 'Paste article URL here...'}
                    className="flex-1 px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-text placeholder-text-muted outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                  />
                  <button onClick={() => linkInput.trim() && processLink(linkInput.trim())}
                    disabled={!linkInput.trim()}
                    className="px-5 py-2.5 bg-primary text-white text-sm font-bold rounded-2xl border-0 cursor-pointer disabled:opacity-40 hover:bg-primary-hover transition-all">
                    {vi ? 'Nhập' : 'Import'}
                  </button>
                </div>

                {/* Direct buttons */}
                <div className="grid grid-cols-2 gap-3 w-full mt-3">
                  <button
                    onClick={startRecording}
                    className="py-2.5 border border-dashed border-slate-200 dark:border-zinc-700 rounded-2xl text-xs font-black text-text-muted hover:text-text hover:border-primary/40 transition-all cursor-pointer bg-transparent flex items-center justify-center gap-1.5"
                  >
                    🎙️ {vi ? 'Ghi âm trực tiếp' : 'Direct Record'}
                  </button>
                  
                  <button
                    onClick={() => {
                      setSource({ type: 'manual', extractedText: '', title: vi ? 'Bài viết' : 'My Post', author: '', imageUrls: [], articleId: null });
                      setDraftTitle('');
                      setDraftContent('');
                      setIsDraftEditing(true);
                    }}
                    className="py-2.5 border border-dashed border-slate-200 dark:border-zinc-700 rounded-2xl text-xs font-black text-text-muted hover:text-text hover:border-primary/40 transition-all cursor-pointer bg-transparent flex items-center justify-center gap-1.5"
                  >
                    ✏️ {vi ? 'Tự viết nội dung' : 'Write Content'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
        )}
        <PopupDialog
          isOpen={popupOpen}
          onClose={() => setPopupOpen(false)}
          title={popupTitle}
          message={popupMessage}
          type={popupType}
        />
      </div>
    );
  }

  // ─── Render: Processing ───────────────────────────────────────────────────

  if (phase === 'processing') {
    return (
      <div className="flex h-[calc(100vh-100px)] items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Loader2 size={28} className="text-primary animate-spin" />
          </div>
          <p className="text-text font-bold text-lg">{vi ? 'Đang xử lý tài liệu...' : 'Processing document...'}</p>
          <p className="text-sm text-text-muted mt-1">{vi ? 'AI đang đọc và phân tích nội dung' : 'AI is reading and analyzing your content'}</p>
        </div>
        <PopupDialog
          isOpen={popupOpen}
          onClose={() => setPopupOpen(false)}
          title={popupTitle}
          message={popupMessage}
          type={popupType}
        />
      </div>
    );
  }

  // ─── Render: Generating ───────────────────────────────────────────────────

  if (phase === 'generating') {
    const platformNames = activePlatforms.map(p => p === 'facebook' ? 'Facebook' : p === 'threads' ? 'Threads' : 'Instagram').join(', ');
    return (
      <div className="flex h-[calc(100vh-100px)] items-center justify-center">
        <div className="text-center max-w-sm">
          <div className="flex gap-2 justify-center mb-6">
            {activePlatforms.map((p, i) => (
              <motion.div key={p}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.15 }}
                className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white ${p === 'facebook' ? 'bg-blue-500' : p === 'threads' ? 'bg-zinc-800 dark:bg-zinc-700' : 'bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-600'}`}>
                {getPlatformIcon(p, 18)}
              </motion.div>
            ))}
          </div>
          <div className="w-48 h-1 bg-slate-100 dark:bg-zinc-800 rounded-full mx-auto mb-4 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-cyan-500 rounded-full"
              animate={{ width: ['10%', '90%'] }}
              transition={{ duration: 8, ease: 'easeInOut' }}
            />
          </div>
          <p className="text-text font-bold">{vi ? 'AI đang viết bài đăng...' : 'AI is writing your posts...'}</p>
          <p className="text-sm text-text-muted mt-1">
            {vi 
              ? `Đang tạo nội dung cho ${activePlatforms.length === 1 ? `nền tảng ${platformNames}` : `${activePlatforms.length} nền tảng`}`
              : `Creating content for ${activePlatforms.length === 1 ? `platform ${platformNames}` : `${activePlatforms.length} platforms`}`
            }
          </p>
        </div>
        <PopupDialog
          isOpen={popupOpen}
          onClose={() => setPopupOpen(false)}
          title={popupTitle}
          message={popupMessage}
          type={popupType}
        />
      </div>
    );
  }

  // ─── Render: Scheduling ────────────────────────────────────────────────────────
  if (phase === 'scheduling') {
    return (
      <motion.div
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -40 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="flex flex-col h-[calc(100vh-76px)] overflow-hidden font-sans bg-slate-50 dark:bg-zinc-950 p-6"
      >
        <div className="max-w-6xl w-full mx-auto flex flex-col h-full gap-6">
          {/* Header */}
          <div className="flex items-center justify-between shrink-0">
            <div className="flex items-center gap-4">
              <button onClick={() => setPhase('editing')} className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex items-center justify-center text-text-muted hover:text-text hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all cursor-pointer">
                <ArrowLeft size={16} />
              </button>
              <div>
                <h1 className="text-xl font-black text-text">{vi ? 'Kế hoạch đăng bài' : 'Publication Plan'}</h1>
                <p className="text-sm text-text-muted">{vi ? 'Cấu hình thời gian đăng cho từng nền tảng' : 'Configure publishing time for each platform'}</p>
              </div>
            </div>
            <button onClick={handleSchedule} disabled={isScheduling || PLATFORMS.every(p => !segments[p]?.content)} className="px-6 py-2.5 rounded-xl font-bold text-sm bg-primary text-white shadow-md shadow-primary/20 hover:bg-primary-hover transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
              {isScheduling ? <><Loader2 size={16} className="animate-spin" /> {vi ? 'Đang lên lịch...' : 'Scheduling...'}</> : <><Check size={16} /> {vi ? 'Xác nhận lên lịch' : 'Confirm Schedule'}</>}
            </button>
          </div>

          {/* Grid Layout: Calendar LEFT (8), Form RIGHT (4) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
            {/* Left Column: 2D Calendar */}
            <div className="lg:col-span-8 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-5 shadow-sm flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-4 shrink-0">
                <h3 className="text-sm font-bold text-text uppercase tracking-wider flex items-center gap-2">
                  <Calendar size={14} className="text-primary" />
                  {vi ? 'Timeline tuần' : 'Week Timeline'}
                </h3>
                <div className="flex bg-slate-100 dark:bg-zinc-800 p-1 rounded-xl gap-1">
                  {[0, 1, 2].map(wkIdx => (
                    <button key={wkIdx} onClick={() => setActiveWeekIndex(wkIdx)}
                      className={`text-[10px] font-bold px-4 py-1.5 rounded-lg transition-all border-0 cursor-pointer ${activeWeekIndex === wkIdx ? 'bg-white dark:bg-zinc-700 text-primary shadow-sm' : 'bg-transparent text-text-muted hover:text-text'}`}>
                      {vi ? 'Tuần' : 'Wk'} {wkIdx + 1}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-x-auto overflow-y-auto border border-slate-100 dark:border-zinc-800 rounded-2xl custom-scrollbar relative bg-slate-50 dark:bg-zinc-950/50">
                <div className="min-w-[600px] flex flex-col absolute inset-0 h-[960px]">
                  {/* Header Row */}
                  <div className="grid border-b border-slate-200 dark:border-zinc-800 sticky top-0 bg-slate-50 dark:bg-zinc-950/95 z-30 shadow-sm" style={{ gridTemplateColumns: '50px repeat(7, 1fr)' }}>
                    <div className="text-[10px] text-text-muted font-bold flex items-center justify-center border-r border-slate-200 dark:border-zinc-800 py-2">
                      {vi ? 'Giờ' : 'Hr'}
                    </div>
                    {weekDays.slice(activeWeekIndex * 7, activeWeekIndex * 7 + 7).map((day: any) => (
                      <div key={day.date} className={`flex flex-col items-center justify-center py-2 border-r border-slate-200 dark:border-zinc-800 last:border-r-0 ${activePlatforms.some(p => scheduleSlots[p].date === day.date && segments[p]?.content) ? 'text-primary bg-primary/5' : 'text-text-muted'}`}>
                        <span className="text-[10px] uppercase font-bold">{day.name.substring(0, 3)}</span>
                        <span className="text-xs font-black">{day.label}</span>
                      </div>
                    ))}
                  </div>

                  {/* 24h Grid */}
                  <div className="flex flex-1 relative h-full">
                    <div className="w-[50px] grid grid-rows-[repeat(24,minmax(0,1fr))] border-r border-slate-200 dark:border-zinc-800 sticky left-0 bg-slate-50 dark:bg-zinc-950/95 z-20">
                      {Array.from({ length: 24 }).map((_, hr) => (
                        <div key={hr} className="flex items-center justify-center text-[9px] font-bold text-text-muted border-b border-slate-100 dark:border-zinc-800">
                          {hr}:00
                        </div>
                      ))}
                    </div>
                    
                    <div ref={boardRef} className="flex-1 relative bg-white dark:bg-zinc-900 overflow-hidden">
                      {/* Grid Lines */}
                      <div className="absolute inset-0 grid grid-cols-7 grid-rows-[repeat(24,minmax(0,1fr))] pointer-events-none">
                        {Array.from({ length: 7 * 24 }).map((_, idx) => (
                          <div key={idx} className="border-r border-b border-slate-100 dark:border-zinc-800/50" />
                        ))}
                      </div>

                      {/* Timeline Posts Layer */}
                      {(() => {
                        const cells = [];
                        for (let col = 0; col < 7; col++) {
                          const dayDate = weekDays[activeWeekIndex * 7 + col].date;
                          for (let hr = 0; hr < 24; hr++) {
                            const postsInCell = timelinePosts.filter(p => {
                              const d = new Date(p.scheduled_at);
                              return toDateInputValue(d) === dayDate && d.getHours() === hr;
                            });
                            
                            const activeInCell = activePlatforms.filter((p: Platform) => {
                              const s = scheduleSlots[p];
                              return segments[p]?.content && s.date === dayDate && parseInt(s.time.split(':')[0]) === hr;
                            });

                            if (postsInCell.length > 0 || activeInCell.length > 0) {
                              cells.push({ col, hr, postsInCell, activeInCell });
                            }
                          }
                        }

                        return cells.flatMap(({ col, hr, postsInCell, activeInCell }) => {
                          const count = postsInCell.length + activeInCell.length;
                          let subIdx = 0;
                          const renderItems: React.ReactNode[] = [];

                          postsInCell.forEach((post: any) => {
                            const cardWidth = `calc((100% / 7) / ${count} - 4px)`;
                            const cardLeft = `calc(${(col * 100) / 7}% + ${(subIdx * 100) / (7 * count)}% + 2px)`;
                            renderItems.push(
                              <div key={`existing-${post.id}`} className="absolute p-1 rounded-lg bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 shadow-sm flex flex-col justify-center overflow-hidden z-10"
                                style={{ left: cardLeft, top: `calc(${(hr * 100) / 24}% + 2px)`, width: cardWidth, height: `calc((100) / 24% - 4px)` }}>
                                <div className="flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                  <span className="text-[7px] font-bold text-text-muted truncate">{post.platform?.substring(0, 2)?.toUpperCase()}</span>
                                </div>
                              </div>
                            );
                            subIdx++;
                          });

                          activeInCell.forEach((p: Platform) => {
                            const cardWidth = `calc((100% / 7) / ${count} - 4px)`;
                            const cardLeft = `calc(${(col * 100) / 7}% + ${(subIdx * 100) / (7 * count)}% + 2px)`;
                            const borderColor = p === 'facebook' ? 'border-[#1877F2]' : p === 'threads' ? 'border-zinc-800 dark:border-slate-300' : 'border-pink-500';
                            const bgColor = p === 'facebook' ? 'bg-[#1877F2]/10' : p === 'threads' ? 'bg-zinc-900/10 dark:bg-slate-100/10' : 'bg-pink-500/10';
                            let Icon: any;
                            if (p === 'facebook') Icon = Facebook;
                            else if (p === 'threads') Icon = ThreadsIcon;
                            else Icon = Instagram;
                            const iconColor = p === 'facebook' ? 'text-[#1877F2] fill-[#1877F2]' : p === 'threads' ? 'text-zinc-900 dark:text-slate-100' : 'text-pink-500';
                            
                            renderItems.push(
                              <motion.div key={`active-${p}-${dragResetTrigger}-${scheduleSlots[p].date}-${scheduleSlots[p].time}`} 
                                drag dragConstraints={boardRef} dragElastic={0} dragMomentum={false} onDragEnd={(e, info) => handleDragEnd(p, e, info)}
                                className={`absolute p-1 rounded-lg border-2 ${borderColor} ${bgColor} shadow-lg flex flex-col justify-center overflow-hidden z-20 cursor-pointer cursor-grab active:cursor-grabbing hover:brightness-95 transition-all`}
                                onClick={() => {
                                  setScheduleSlots(prev => {
                                    const next = { ...prev };
                                    const sourceSlot = prev[p];
                                    activePlatforms.forEach(other => {
                                      if (other !== p && segments[other]?.content) {
                                        next[other] = { ...next[other], date: sourceSlot.date, time: sourceSlot.time };
                                      }
                                    });
                                    return next;
                                  });
                                }}
                                style={{ left: cardLeft, top: `calc(${(hr * 100) / 24}% + 2px)`, width: cardWidth, height: `calc((100) / 24% - 4px)` }}>
                                <div className="flex items-center gap-1">
                                  <Icon size={8} className={`shrink-0 ${iconColor}`} />
                                  <span className={`text-[7px] font-black uppercase truncate ${iconColor}`}>{p.substring(0,2)} {scheduleSlots[p].time}</span>
                                </div>
                              </motion.div>
                            );
                            subIdx++;
                          });

                          return renderItems;
                        });
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Publish Time Form */}
            <div className="lg:col-span-4 flex flex-col gap-4 overflow-y-auto pr-1 custom-scrollbar">
              <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 p-5 shadow-sm">
                <h3 className="text-sm font-bold text-text mb-4 uppercase tracking-wider">{vi ? 'Thời gian đăng' : 'Publish Time'}</h3>
                <div className="flex flex-col gap-4">
                  {activePlatforms.map(p => {
                    const hasCont = !!segments[p]?.content;
                    return (
                      <div key={p} className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${hasCont ? 'border-slate-100 dark:border-zinc-800 bg-slate-50/40 dark:bg-zinc-900/40' : 'border-dashed border-slate-200 dark:border-zinc-800 opacity-50'}`}>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 ${p === 'facebook' ? 'bg-blue-500' : p === 'threads' ? 'bg-zinc-900 dark:bg-zinc-700' : 'bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-600'}`}>
                          {getPlatformIcon(p, 18)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-black text-text capitalize mb-2">{p}</p>
                          <div className="flex gap-2">
                            <input type="date" value={scheduleSlots[p].date} min={new Date().toISOString().split('T')[0]}
                              onChange={e => setScheduleSlots(prev => ({ ...prev, [p]: { ...prev[p], date: e.target.value } }))}
                              disabled={!hasCont}
                              className="flex-1 px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-text outline-none focus:border-primary/50 cursor-pointer disabled:cursor-not-allowed" />
                            <input type="time" value={scheduleSlots[p].time}
                              onChange={e => setScheduleSlots(prev => ({ ...prev, [p]: { ...prev[p], time: e.target.value } }))}
                              disabled={!hasCont}
                              className="w-24 px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-text outline-none focus:border-primary/50 cursor-pointer disabled:cursor-not-allowed" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
        <PopupDialog
          isOpen={popupOpen}
          onClose={() => setPopupOpen(false)}
          title={popupTitle}
          message={popupMessage}
          type={popupType}
        />
      </motion.div>
    );
  }

  // ─── Render: Source Review + Editing (shared layout) ─────────────────────



  // ─── Render: Source Review + Editing (shared layout) ─────────────────────

  const isSourceReview = phase === 'source-review';

  // ─── Newspaper Logo helper (mirrors AiCreatorView) ────────────────────────
  const renderNewspaperLogo = (size: 'sm' | 'lg' = 'sm') => {
    const srcUrl = source.url || '';
    const isDanTri = srcUrl.includes('dantri.com.vn');
    const isTuoiTre = srcUrl.includes('tuoitre.vn');
    let logoText = 'GócNhìnMới';
    let subText = vi ? 'Mạng xã hội' : 'Social Network';
    let colorClass = 'text-red-650';
    if (isDanTri) { logoText = 'DÂN TRÍ'; subText = vi ? 'Báo điện tử' : 'E-Newspaper'; colorClass = 'text-[#007f3f]'; }
    else if (isTuoiTre) { logoText = 'TuổiTrẻ'; subText = vi ? 'Tin nóng mỗi ngày' : 'Daily News'; colorClass = 'text-[#E43A45]'; }
    if (size === 'lg') return (
      <div className="flex flex-col gap-0.5 select-none">
        <span className={`${colorClass} font-black text-lg tracking-tighter uppercase font-sans`}>{logoText}</span>
        <span className="text-[8px] text-slate-450 dark:text-zinc-500 font-black tracking-widest uppercase -mt-1">{subText}</span>
      </div>
    );
    return (
      <div className="flex flex-col gap-0.5 select-none">
        <span className={`${colorClass} font-black text-base tracking-tighter uppercase font-sans`}>{logoText}</span>
        <span className="text-[7px] text-slate-450 dark:text-zinc-500 font-black tracking-widest uppercase -mt-1">{subText}</span>
      </div>
    );
  };

  // ─── Avatar Props helper (mirrors AiCreatorView) ──────────────────────────
  const getSourceAvatarProps = () => {
    const srcUrl = source.url || '';
    const isDanTri = srcUrl.includes('dantri.com.vn');
    const isTuoiTre = srcUrl.includes('tuoitre.vn');
    let bgClass = 'bg-red-100 dark:bg-red-955/40';
    let textClass = 'text-red-650 dark:text-red-400';
    let defaultInit = 'CD';
    if (isDanTri) { bgClass = 'bg-[#E6F4EA] dark:bg-emerald-955/40'; textClass = 'text-[#007f3f] dark:text-emerald-450'; defaultInit = 'DT'; }
    else if (isTuoiTre) { bgClass = 'bg-[#FCE8E6] dark:bg-rose-955/40'; textClass = 'text-[#E43A45] dark:text-rose-450'; defaultInit = 'TT'; }
    let initials = defaultInit;
    if (source.author) {
      const parts = source.author.trim().split(/\s+/);
      if (parts.length >= 2) initials = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      else if (parts.length === 1 && parts[0]) initials = parts[0].slice(0, 2).toUpperCase();
    }
    return { bgClass, textClass, initials, imageUrl: source.authorImageUrl || '' };
  };
  const currentContent = segments[activePlatform]?.content || '';
  const charLimit = PLATFORM_LIMITS[activePlatform];
  const isURLSource = source.type === 'link';
  const isNonURLWithText = source.type !== 'link' && !!source.extractedText;

  return (
    <div className="flex h-[calc(100vh-76px)] overflow-hidden font-sans">
      {/* ── Left Panel (Canvas / Source) ──────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-zinc-900 bg-white dark:bg-zinc-950 shrink-0 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => { setPhase('drop'); setSource({ type: null, extractedText: '', title: '', author: '', imageUrls: [], articleId: null }); setSegments({ facebook: { platform: 'facebook', content: '', originalContent: '', captionId: null, status: 'draft', htmlContent: '', updateCounter: 0 }, threads: { platform: 'threads', content: '', originalContent: '', captionId: null, status: 'draft', htmlContent: '', updateCounter: 0 }, instagram: { platform: 'instagram', content: '', originalContent: '', captionId: null, status: 'draft', htmlContent: '', updateCounter: 0 } }); setChatMessages([]); setQaAnswers([]); setQaComplete(false); setCurrentQIndex(0); setGlobalContext(''); setIsGeneratingContext(false); }}
              className="flex items-center gap-1.5 text-xs font-semibold text-text-muted hover:text-text transition-colors cursor-pointer border-0 bg-transparent p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 shrink-0"
            >
              <ChevronLeft size={14} /> {vi ? 'Tài liệu mới' : 'New'}
            </button>
            <div className="h-4 w-px bg-slate-200 dark:bg-zinc-800" />
            <div className="flex items-center gap-2 min-w-0">
              {source.type === 'audio' && <Volume2 size={13} className="text-primary shrink-0" />}
              {(source.type === 'docx' || source.type === 'pdf') && <FileType size={13} className="text-primary shrink-0" />}
              {source.type === 'link' && <Globe size={13} className="text-primary shrink-0" />}
              {source.type === 'image' && <ImageIcon size={13} className="text-primary shrink-0" />}
              {source.type === 'manual' && <Edit3 size={13} className="text-primary shrink-0" />}
              <h1 className="text-sm font-bold text-text truncate">{source.title || (vi ? 'Bài viết' : 'Untitled')}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Phase badge */}
            <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wide ${isSourceReview ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400' : 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'}`}>
              {isSourceReview ? (vi ? 'Xem lại bài gốc' : 'Source Review') : (vi ? 'Đang chỉnh sửa' : 'Editing')}
            </span>

            {!isSourceReview && (
              <>
                <button
                  onClick={() => regeneratePlatform(activePlatform)}
                  disabled={isGenerating[activePlatform]}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 text-xs font-semibold text-text-muted hover:text-primary hover:border-primary/30 transition-all cursor-pointer bg-transparent disabled:opacity-40"
                >
                  <RefreshCw size={12} className={isGenerating[activePlatform] ? 'animate-spin' : ''} />
                  {vi ? 'Tạo lại' : 'Regenerate'}
                </button>
                <button
                  onClick={() => setPhase('scheduling')}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-primary text-white text-xs font-bold border-0 cursor-pointer hover:bg-primary-hover transition-all shadow-sm"
                >
                  <Calendar size={12} /> {vi ? 'Lên lịch' : 'Schedule'}
                </button>
                {scheduleSuccess && (
                  <span className="flex items-center gap-1 text-emerald-600 text-xs font-bold">
                    <Check size={12} /> {vi ? 'Đã lên lịch!' : 'Scheduled!'}
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── Source Review Content ────────────────────────────── */}
        {isSourceReview && (
          <div className="flex-1 overflow-y-auto bg-slate-50/50 dark:bg-zinc-950 p-6">
            <div className="max-w-4xl mx-auto bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm flex flex-col gap-6 font-sans">
              
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-3">
                <h3 className="text-xs font-black text-text uppercase tracking-wider flex items-center gap-1.5">
                  <FileText size={16} className="text-primary" />
                  {vi ? 'Bản xem trước bài viết gốc' : 'Original Source Preview'}
                </h3>
                <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 font-bold px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-900/30">
                  {vi ? 'Đã tải' : 'Loaded'}
                </span>
              </div>

              <div className="border border-slate-150 dark:border-zinc-800 rounded-2xl overflow-hidden bg-[#ffffff] dark:bg-zinc-950 flex flex-col shadow-sm">
                <div className="bg-white/95 dark:bg-zinc-950/95 border-b border-slate-100 dark:border-zinc-800 px-5 py-3 flex items-center justify-between shrink-0">
                  {renderNewspaperLogo('sm')}
                  <div className="flex items-center gap-1.5 bg-[#F8F9FA] dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 px-3 py-1.5 rounded-full w-48 select-none">
                    <Search size={10} className="text-slate-400" />
                    <span className="text-[9px] font-bold text-slate-450 dark:text-zinc-500">Tìm kiếm...</span>
                  </div>
                </div>

                <div className="px-5 py-6 md:px-8 flex gap-6 w-full max-h-[60vh] overflow-y-auto">
                  <div className="hidden sm:flex flex-col items-center gap-4 pt-1 select-none">
                    <button className="w-8 h-8 rounded-full bg-slate-50 dark:bg-zinc-900 text-slate-400 flex items-center justify-center border border-slate-200/70 dark:border-zinc-800 shadow-sm transition-all duration-200 cursor-default">
                      <Facebook size={13} />
                    </button>
                    <button className="w-8 h-8 rounded-full bg-slate-50 dark:bg-zinc-900 text-slate-400 flex items-center justify-center border border-slate-200/70 dark:border-zinc-800 shadow-sm transition-all duration-200 cursor-default">
                      <Link2 size={13} />
                    </button>
                    <div className="w-px h-5 bg-slate-200 dark:border-zinc-800 my-0.5" />
                    <button className="w-8 h-8 rounded-full bg-slate-50 dark:bg-zinc-900 text-slate-400 flex items-center justify-center border border-slate-200/70 dark:border-zinc-800 shadow-sm transition-all duration-200 cursor-default">
                      <ThumbsUp size={13} />
                    </button>
                    <button className="w-8 h-8 rounded-full bg-slate-50 dark:bg-zinc-900 text-slate-400 flex items-center justify-center border border-slate-200/70 dark:border-zinc-800 shadow-sm transition-all duration-200 cursor-default">
                      <MessageSquare size={13} />
                    </button>
                  </div>

                  <div className="flex-1 flex flex-col min-w-0 pb-10">
                    {/* Category */}
                    {source.category && (
                      <span className="text-red-500 text-[10px] md:text-xs font-black tracking-widest uppercase mb-2.5 block select-none">
                        {source.category.startsWith('#') ? source.category : `#${source.category}`}
                      </span>
                    )}
                    {!source.category && (
                      <span className="text-red-500 text-[10px] md:text-xs font-black tracking-widest uppercase mb-2.5 block select-none">
                        #ARTICLE
                      </span>
                    )}

                    {/* Title */}
                    <h1 className="text-lg md:text-2xl font-black text-slate-900 dark:text-zinc-100 leading-tight mb-4 tracking-tight font-sans">
                      {source.title}
                    </h1>

                    {/* Description / Sapo */}
                    {source.description && (
                      <div className="bg-slate-50 dark:bg-zinc-900/40 p-3.5 border-l-4 border-red-550 rounded-r-xl text-xs md:text-sm text-slate-650 dark:text-slate-300 font-bold mb-5 leading-relaxed">
                        {source.description}
                      </div>
                    )}

                    {/* Tags */}
                    {source.tags && (
                      <div className="flex flex-wrap gap-1.5 mb-4 select-none">
                        {source.tags.split(',').map((tag, idx) => {
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

                    {source.url && (
                      <a href={source.url} target="_blank" rel="noopener noreferrer"
                        className="text-[11px] text-primary/70 hover:text-primary flex items-center gap-1.5 transition-colors mb-5 bg-primary/5 px-3 py-1.5 rounded-lg w-fit">
                        <Globe size={12} /> {source.url}
                      </a>
                    )}

                    {(source.author || source.publishedAt || source.views) && (
                      <div className="flex items-center gap-2.5 mb-6 border-b border-slate-100 dark:border-zinc-800/80 pb-3.5 select-none">
                        {source.author && (() => {
                          const { bgClass, textClass, initials, imageUrl } = getSourceAvatarProps();
                          return (
                            <div className={`w-8 h-8 rounded-full ${bgClass} ${textClass} flex items-center justify-center text-[9px] font-black uppercase tracking-wider select-none shrink-0 overflow-hidden`}>
                              {imageUrl ? (
                                <img referrerPolicy="no-referrer" src={imageUrl} alt={source.author} className="w-full h-full object-cover" />
                              ) : (
                                initials
                              )}
                            </div>
                          );
                        })()}
                        <div className="flex flex-col gap-0.5">
                          {source.author && <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">{source.author}</span>}
                          <div className="flex items-center gap-2 text-[9px] text-slate-400 dark:text-zinc-500 font-bold">
                            {source.publishedAt && <span>{source.publishedAt}</span>}
                            {source.publishedAt && source.views && <span>•</span>}
                            {source.views && <span>{source.views} {vi ? 'lượt xem' : 'views'}</span>}
                          </div>
                        </div>
                      </div>
                    )}

                    {source.imageUrls.length > 0 && (
                      <div className="mb-6 rounded-xl overflow-hidden border border-slate-100 dark:border-zinc-800">
                        <img src={source.imageUrls[0]} alt="" className="w-full h-auto" />
                      </div>
                    )}

                    {source.type === 'audio' && audioUrl && (
                      <div className="mb-6">
                        <AudioPlayer src={audioUrl} name={source.rawFile?.name || 'Audio'} />
                      </div>
                    )}

                    {!isURLSource && (
                      <div
                        ref={imageDropRef}
                        onDragOver={e => { e.preventDefault(); setIsImageDragging(true); }}
                        onDragLeave={() => setIsImageDragging(false)}
                        onDrop={handleImageDrop}
                        className={`mb-6 rounded-xl border-2 border-dashed transition-all duration-200 ${source.imageUrls.length > 0
                          ? 'border-slate-100 dark:border-zinc-800 p-0 overflow-hidden'
                          : isImageDragging
                            ? 'border-primary bg-primary/5 p-8'
                            : 'border-slate-200 dark:border-zinc-800 hover:border-primary/30 p-6'
                          }`}
                      >
                        {source.imageUrls.length === 0 && (
                          <div className="flex flex-col items-center gap-2 text-center">
                            <ImagePlus size={24} className={isImageDragging ? 'text-primary' : 'text-slate-300 dark:text-zinc-700'} />
                            <p className="text-sm text-text-muted">
                              {vi ? 'Kéo thả ảnh vào đây (tuỳ chọn)' : 'Drop images here (optional)'}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {source.extractedText && (
                      <div className="article-body-sections text-slate-700 dark:text-slate-350 min-h-[150px]">
                        {source.bodyBlocks && source.bodyBlocks.length > 0 ? (
                          source.bodyBlocks.slice(0, 40).map((block: any, i: number) => {
                            if (block.type === 'section') {
                              return (
                                <section
                                  key={i}
                                  className="py-4 my-3 rounded-xl border border-slate-150 dark:border-zinc-800 overflow-hidden shadow-sm px-4"
                                  dangerouslySetInnerHTML={{ __html: block.html || '' }}
                                />
                              );
                            }
                            if (block.type === 'heading2') {
                              return (
                                <h2 key={i} className="text-sm md:text-base font-black text-slate-800 dark:text-zinc-100 mt-6 mb-3 border-l-4 border-red-550 pl-2.5 leading-snug">
                                  {block.text}
                                </h2>
                              );
                            }
                            if (block.type === 'heading3') {
                              return (
                                <h3 key={i} className="text-xs md:text-sm font-extrabold text-slate-800 dark:text-zinc-200 mt-5 mb-2">
                                  {block.text}
                                </h3>
                              );
                            }
                            if (block.type === 'image' && block.url) {
                              return (
                                <div key={i} className="w-full my-5 flex flex-col items-center select-none">
                                  <img referrerPolicy="no-referrer" 
                                    src={block.url}
                                    alt={block.caption || 'Article Image'}
                                    className="w-full h-auto rounded-xl border border-slate-100 dark:border-zinc-800 shadow-sm"
                                  />
                                  {block.caption && (
                                    <span className="text-[9px] md:text-xs text-slate-450 dark:text-zinc-400 font-bold italic mt-1.5 text-center bg-slate-50 dark:bg-zinc-900/30 px-3 py-0.5 rounded">
                                      {block.caption}
                                    </span>
                                  )}
                                </div>
                              );
                            }
                            return (
                              <p key={i} className="text-xs md:text-sm text-slate-750 dark:text-slate-300 mb-3.5 leading-relaxed font-semibold">
                                {block.text}
                              </p>
                            );
                          })
                        ) : (
                          source.extractedText.split('\n\n').map((para, pIdx) => {
                            const trimmed = para.trim();
                            if (!trimmed) return null;
                            return (
                              <p key={pIdx} className="text-xs md:text-sm text-slate-750 dark:text-slate-300 mb-3 leading-relaxed font-semibold">
                                {trimmed}
                              </p>
                            );
                          })
                        )}
                      </div>
                    )}

                    {source.type === 'manual' && (
                      <textarea
                        value={source.extractedText}
                        onChange={e => setSource(prev => ({ ...prev, extractedText: e.target.value }))}
                        placeholder={vi ? 'Nhập nội dung bài viết gốc của bạn ở đây...' : 'Type your original content here...'}
                        rows={12}
                        className="w-full mt-4 px-4 py-3 text-sm leading-relaxed border border-slate-200 dark:border-zinc-700 rounded-xl bg-slate-50/50 dark:bg-zinc-900 text-text outline-none focus:border-primary/50 resize-none"
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Editing Canvas ────────────────────────────────────── */}
        {!isSourceReview && (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Platform tabs */}
            <div className="flex items-center border-b border-slate-100 dark:border-zinc-900 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-sm px-5 shrink-0 overflow-x-auto scrollbar-none">
              {activePlatforms.map(p => {
                const isActive = activePlatform === p;
                const isGen = isGenerating[p];
                const hasCont = !!segments[p]?.content;
                return (
                  <button key={p} onClick={() => setActivePlatform(p)}
                    className={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer bg-transparent border-x-0 border-t-0 whitespace-nowrap ${isActive ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text hover:border-slate-200 dark:hover:border-zinc-700'}`}>
                    {getPlatformIcon(p, 13)}
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                    {isGen && <Loader2 size={10} className="animate-spin text-primary ml-1" />}
                    {!isGen && hasCont && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 ml-1" />}
                  </button>
                );
              })}
            </div>

            {/* Content area */}
            <div className="flex-1 overflow-y-auto p-5">


              {/* Social card */}
              <div className="max-w-2xl mx-auto bg-white dark:bg-zinc-900 rounded-3xl border border-slate-100 dark:border-zinc-800 shadow-sm overflow-hidden">
                {/* Card header */}
                <div className="px-4 py-3 border-b border-slate-50 dark:border-zinc-800/50 flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs ${activePlatform === 'facebook' ? 'bg-blue-500' : activePlatform === 'threads' ? 'bg-zinc-900 dark:bg-zinc-700' : 'bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-600'}`}>
                    {getPlatformIcon(activePlatform, 15)}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-text">{source.author || 'AntBiz'}</p>
                    <p className="text-[10px] text-text-muted">{vi ? 'Bây giờ' : 'Just now'} · 🌐</p>
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    {currentContent && (
                      <span className={`text-[10px] font-bold ${currentContent.length > charLimit ? 'text-rose-500' : 'text-text-muted'}`}>
                        {currentContent.length.toLocaleString()} / {charLimit.toLocaleString()}
                      </span>
                    )}
                    {segments[activePlatform]?.status === 'edited' && (
                      <button
                        onClick={() => setSegments(prev => ({ ...prev, [activePlatform]: { ...prev[activePlatform], content: prev[activePlatform].originalContent, status: 'draft' } }))}
                        className="flex items-center gap-1 text-[10px] text-rose-500 hover:text-rose-700 font-bold cursor-pointer border-0 bg-transparent transition-colors"
                      >
                        <RotateCcw size={10} /> {vi ? 'Hoàn tác' : 'Revert'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Image */}
                {source.imageUrls.length > 0 && (
                  <img src={source.imageUrls[0]} alt="" className="w-full max-h-60 object-cover" />
                )}

                {/* Editable text */}
                <div className={`p-4 relative transition-all duration-300 ${streamingPlatform === activePlatform ? 'ai-streaming-editor' : ''}`}>
                  {isGenerating[activePlatform] ? (
                    <div className="space-y-2 py-2">
                      {[1, 0.85, 0.7, 1, 0.6].map((w, i) => (
                        <div key={i} className="h-3 bg-slate-100 dark:bg-zinc-800 rounded-full animate-pulse" style={{ width: `${w * 100}%` }} />
                      ))}
                      <div className="flex items-center gap-1.5 mt-3 text-xs text-primary font-semibold">
                        <Loader2 size={12} className="animate-spin" /> {vi ? 'AI đang viết...' : 'AI writing...'}
                      </div>
                    </div>
                  ) : streamingPlatform === activePlatform ? (
                    // Streaming skeleton blocks overlay
                    <div className="relative min-h-[80px] py-1">
                      {/* Hidden editor still receives streamed text */}
                      <div className="sr-only">
                        <EditorDiv
                          key={activePlatform}
                          innerRef={(el: HTMLDivElement | null) => { contentRef.current[activePlatform] = el; }}
                          html={segments[activePlatform]?.htmlContent || ''}
                          updateCounter={segments[activePlatform]?.updateCounter || 0}
                          onInput={() => {}}
                          onMouseUp={() => {}}
                          onMouseOver={() => {}}
                          onMouseOut={() => {}}
                          onClick={() => {}}
                          className=""
                        />
                      </div>
                      {/* Animated skeleton blocks */}
                      <div className="flex flex-col gap-2">
                        {[
                          { w: '92%', h: 'h-3', shade: 'bg-slate-200 dark:bg-zinc-700', delay: '0ms' },
                          { w: '78%', h: 'h-3', shade: 'bg-slate-150 dark:bg-zinc-750', delay: '60ms' },
                          { w: '85%', h: 'h-3', shade: 'bg-slate-200 dark:bg-zinc-700', delay: '120ms' },
                          { w: '60%', h: 'h-3', shade: 'bg-slate-100 dark:bg-zinc-800', delay: '180ms' },
                          { w: '90%', h: 'h-3', shade: 'bg-slate-200 dark:bg-zinc-700', delay: '240ms' },
                          { w: '70%', h: 'h-3', shade: 'bg-slate-150 dark:bg-zinc-750', delay: '300ms' },
                          { w: '82%', h: 'h-3', shade: 'bg-slate-100 dark:bg-zinc-800', delay: '360ms' },
                        ].map((block, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: [0, 0.7, 0.5, 0.8, 0.6], x: 0 }}
                            transition={{
                              delay: i * 0.07,
                              duration: 1.2,
                              repeat: Infinity,
                              repeatType: 'mirror',
                              ease: 'easeInOut',
                            }}
                            className={`${block.h} ${block.shade} rounded-full`}
                            style={{ width: block.w }}
                          />
                        ))}
                      </div>
                      <div className="flex items-center gap-1.5 mt-3 text-[10px] text-primary font-bold uppercase tracking-wider">
                        <Loader2 size={10} className="animate-spin" />
                        {vi ? 'AI đang chỉnh sửa...' : 'AI editing...'}
                      </div>
                    </div>
                  ) : (
                    <EditorDiv
                      key={activePlatform}
                      innerRef={(el: HTMLDivElement | null) => { contentRef.current[activePlatform] = el; }}
                      html={segments[activePlatform]?.htmlContent || currentContent || (vi ? '<span class="text-text-muted italic">Chưa có nội dung. Nhấn "Tạo lại" để sinh nội dung.</span>' : '<span class="text-text-muted italic">No content. Click Regenerate.</span>')}
                      updateCounter={segments[activePlatform]?.updateCounter || 0}
                      onInput={(e: React.FormEvent<HTMLDivElement>) => {
                        const div = e.currentTarget;
                        const text = div.innerText;
                        setSegments(prev => ({
                          ...prev, [activePlatform]: {
                            ...prev[activePlatform], content: text,
                            status: text !== prev[activePlatform].originalContent ? 'edited' : 'draft',
                          }
                        }));
                      }}
                      onMouseUp={(e: React.MouseEvent) => handleTextMouseUp(e, activePlatform)}
                      onMouseOver={handleTextMouseOver}
                      onMouseOut={handleTextMouseOut}
                      onClick={handleTextClick}
                      className="text-sm text-text leading-relaxed min-h-[80px] outline-none whitespace-pre-wrap cursor-text selection:bg-amber-200/60 dark:selection:bg-amber-700/40"
                    />
                  )}
                </div>

                {/* Engagement row */}
                <div className="px-4 py-2.5 border-t border-slate-50 dark:border-zinc-800/40 flex items-center gap-4">
                  {activePlatform === 'facebook' && <>
                    <span className="text-[11px] text-text-muted cursor-default">👍 {vi ? 'Thích' : 'Like'}</span>
                    <span className="text-[11px] text-text-muted cursor-default">💬 {vi ? 'Bình luận' : 'Comment'}</span>
                    <span className="text-[11px] text-text-muted cursor-default">↗️ {vi ? 'Chia sẻ' : 'Share'}</span>
                  </>}
                  {activePlatform === 'threads' && <>
                    <span className="text-[11px] text-text-muted">♡</span>
                    <span className="text-[11px] text-text-muted">💬 {vi ? 'Trả lời' : 'Reply'}</span>
                  </>}
                  {activePlatform === 'instagram' && <>
                    <span className="text-[11px] text-text-muted">♥</span>
                    <span className="text-[11px] text-text-muted">💬</span>
                    <span className="text-[11px] text-text-muted">📤</span>
                  </>}
                  {highlights.filter(h => h.platform === activePlatform).length > 0 && (
                    <span className="ml-auto flex items-center gap-1 text-[10px] text-amber-600 font-bold bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded-full">
                      <Highlighter size={9} />
                      {highlights.filter(h => h.platform === activePlatform).length}
                    </span>
                  )}
                </div>
              </div>

              {currentContent && !isGenerating[activePlatform] && (
                <p className="text-center text-[11px] text-text-muted mt-4 flex items-center justify-center gap-1.5">
                  <Highlighter size={10} className="text-amber-500" />
                  {vi ? 'Bôi đen đoạn văn để nhờ AI chỉnh sửa' : 'Highlight text to ask AI to edit'}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Right Panel: Chatbar ────────────────────────────────────────────── */}
      <div className="w-[360px] shrink-0 flex flex-col border-l border-slate-100 dark:border-zinc-900 bg-white dark:bg-zinc-950 overflow-hidden">
        {/* Chatbar header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-zinc-900 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles size={12} className="text-primary" />
            </div>
            <span className="text-xs font-black text-text">
              {isSourceReview ? (vi ? 'Thiết lập ban đầu' : 'Initial Setup') : (vi ? 'AI Trợ lý' : 'AI Assistant')}
            </span>
          </div>
          {/* Progress dots for Q&A */}
          {isSourceReview && qaQuestions.length > 0 && (
            <div className="flex items-center gap-1">
              {qaQuestions.map((q, i) => (
                <div key={q.id} className={`w-1.5 h-1.5 rounded-full transition-all ${i < currentQIndex ? 'bg-primary' : i === currentQIndex ? 'bg-primary scale-125' : 'bg-slate-200 dark:bg-zinc-700'}`} />
              ))}
            </div>
          )}
          {/* Context Viewer Button */}
          <button 
            onClick={() => setShowContextModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 text-[10px] font-black uppercase tracking-wider text-text-muted hover:text-text hover:border-primary/30 transition-all cursor-pointer bg-transparent">
            <FileSearch size={12} className="text-primary" />
            {vi ? 'Context tổng' : 'Context'}
          </button>
        </div>

        {/* Chat messages */}
        <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4 min-h-0 relative">
          

          {/* If manual mode and Q&A not started, render "Bắt đầu thiết lập" button */}
          {source.type === 'manual' && qaQuestions.length === 0 && (
            <div className="mt-2 p-1">
              <button
                onClick={() => {
                  if (!source.extractedText.trim()) {
                    setPopupType('warning');
                    setPopupTitle(vi ? 'Yêu cầu nội dung' : 'Content Required');
                    setPopupMessage(vi ? 'Vui lòng nhập nội dung bài viết gốc trước!' : 'Please enter the original content first!');
                    setPopupOpen(true);
                    return;
                  }
                  startQAFlow(source);
                }}
                className="w-full py-3 bg-primary text-white text-xs font-bold rounded-2xl border-0 cursor-pointer hover:bg-primary-hover shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2"
              >
                <Sparkles size={14} /> {vi ? 'Bắt đầu thiết lập với AI' : 'Start Setup with AI'}
              </button>
            </div>
          )}

          {chatMessages.map((msg, idx) => {
            // System = highlight reference
            if (msg.role === 'system') {
              return (
                <motion.div key={msg.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                  <div className="flex items-start gap-2 p-2.5 rounded-2xl border-2 border-dashed border-amber-300 dark:border-amber-700 bg-amber-50/80 dark:bg-amber-950/20 cursor-pointer hover:bg-amber-100/70 dark:hover:bg-amber-950/40 transition-colors group">
                    <Highlighter size={12} className="text-amber-500 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black text-amber-600 mb-0.5">{vi ? '📌 Đoạn bôi vàng' : '📌 Highlighted'}</p>
                      <p className="text-[11px] text-amber-700 dark:text-amber-400 line-clamp-2">"{msg.content}"</p>
                    </div>
                  </div>
                </motion.div>
              );
            }

            // AI message
            if (msg.role === 'assistant') {
              const isActiveQ = msg.questionId === qaQuestions[currentQIndex]?.id && !qaComplete && isSourceReview;
              const isAnsweredQ = msg.selectedOption !== undefined;
              const isReverted = msg.reverted;
              return (
                <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }} className={`flex gap-2.5 items-start ${isReverted ? 'opacity-40 select-none' : ''}`}>
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles size={13} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`rounded-2xl rounded-tl-sm px-4 py-3 text-[13px] leading-relaxed transition-all ${isReverted ? 'bg-slate-100 dark:bg-zinc-800 text-slate-450 dark:text-zinc-500 line-through border border-slate-200 dark:border-zinc-800' : 'bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800'}`}>
                      {isReverted ? (
                        <div className="flex items-center gap-1.5 font-bold italic text-text-muted">
                          <RotateCcw size={12} className="text-slate-400" />
                          {vi ? 'Đã thu hồi' : 'Reverted'}
                        </div>
                      ) : (
                        msg.content || (msg.isStreaming && (
                          <span className="flex items-center gap-1.5 text-text-muted">
                            <span className="flex gap-1">
                              {[0, 0.15, 0.3].map(d => (
                                <motion.span key={d} className="w-1.5 h-1.5 bg-primary/40 rounded-full inline-block"
                                  animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.8, delay: d }} />
                              ))}
                            </span>
                            {vi ? 'Đang trả lời...' : 'Thinking...'}
                          </span>
                        ))
                      )}
                    </div>

                    {/* Revert Button */}
                    {!isReverted && !msg.isStreaming && msg.revertContent !== undefined && (
                      <div className="flex justify-end mt-1.5">
                        <button
                          onClick={() => handleRevert(msg.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 text-[10px] font-black uppercase tracking-wider text-text-muted hover:text-red-500 hover:border-red-200 dark:hover:border-red-950 transition-all cursor-pointer bg-white dark:bg-zinc-900"
                        >
                          <RotateCcw size={10} />
                          {vi ? 'Thu hồi sửa đổi' : 'Revert Edit'}
                        </button>
                      </div>
                    )}

                    {/* Suggestions card – shown when AI offers edit options */}
                    {msg.suggestions && msg.suggestions.length > 0 && (
                      <div className={`mt-3 flex flex-col gap-2 transition-all ${msg.suggestionPicked ? 'opacity-40 pointer-events-none' : ''}`}>
                        {msg.suggestions.map((sug, i) => (
                          <motion.button
                            key={i}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.08 }}
                            onClick={() => !msg.suggestionPicked && handleSuggestionPick(msg.id, `${msg.pendingUserMsg} — ${sug}`)}
                            className="w-full text-left text-[12px] font-semibold px-3.5 py-2.5 rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/40 text-text transition-all flex items-start gap-2 cursor-pointer group"
                          >
                            <span className="w-5 h-5 rounded-lg bg-primary/15 text-primary flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5 group-hover:bg-primary group-hover:text-white transition-all">
                              {i + 1}
                            </span>
                            {sug}
                          </motion.button>
                        ))}
                        {/* Custom input */}
                        {!msg.suggestionPicked && (
                          <div className="flex gap-2 mt-1">
                            <input
                              type="text"
                              placeholder={vi ? 'Hoặc nhập yêu cầu của bạn...' : 'Or type your own request...'}
                              className="flex-1 text-[12px] px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-text outline-none focus:border-primary/50 transition-all placeholder:text-text-muted"
                              onKeyDown={async (e) => {
                                if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                                  const customText = e.currentTarget.value.trim();
                                  setChatMessages(prev => prev.map(m =>
                                    m.id === msg.id ? { ...m, suggestionPicked: true } : m
                                  ));
                                  await handleChatSend(customText, true);
                                }
                              }}
                            />
                            <button
                              className="px-3 py-2 rounded-xl bg-primary text-white text-[11px] font-bold hover:bg-primary-hover transition-all cursor-pointer shrink-0"
                              onClick={async (e) => {
                                const input = (e.currentTarget.previousSibling as HTMLInputElement);
                                if (input?.value.trim()) {
                                  const customText = input.value.trim();
                                  setChatMessages(prev => prev.map(m =>
                                    m.id === msg.id ? { ...m, suggestionPicked: true } : m
                                  ));
                                  await handleChatSend(customText, true);
                                }
                              }}
                            >
                              {vi ? 'Gửi' : 'Send'}
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Q&A options */}
                    {msg.options && (isActiveQ || isAnsweredQ) && (
                      msg.questionId === 'q_platform' ? (
                        <QAPlatformToggles
                          selectedPlatforms={qaSelectedPlatforms}
                          onChange={setQaSelectedPlatforms}
                          onSubmit={(ans) => handleQAAnswer('q_platform', ans)}
                          disabled={isAnsweredQ || !isActiveQ}
                          selectedOption={msg.selectedOption}
                          vi={vi}
                          connectedPlatforms={connectedPlatforms}
                          onWarning={(msg) => {
                            setPopupType('warning');
                            setPopupTitle(vi ? 'Chưa kết nối nền tảng' : 'Platform Not Connected');
                            setPopupMessage(msg);
                            setPopupOpen(true);
                          }}
                        />
                      ) : (
                        <QAOptions
                          options={msg.options}
                          selectedOption={msg.selectedOption}
                          onSelect={(ans) => msg.questionId && handleQAAnswer(msg.questionId, ans)}
                          disabled={isAnsweredQ || !isActiveQ}
                        />
                      )
                    )}
                    {isLoadingQA && idx === chatMessages.length - 1 && !msg.options && (
                      <div className="mt-3 flex flex-col gap-1.5">
                        {[1, 0.85, 0.95, 0.8].map((w, i) => (
                          <div key={i} className="h-9 bg-slate-100 dark:bg-zinc-800 rounded-2xl animate-pulse" style={{ width: `${w * 100}%` }} />
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            }

            // User message
            const isReverted = msg.reverted || (chatMessages[idx + 1]?.role === 'assistant' && chatMessages[idx + 1]?.reverted);
            return (
              <motion.div key={msg.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                className={`flex justify-end ${isReverted ? 'opacity-40 select-none' : ''}`}>
                <div className={`max-w-[80%] text-[13px] rounded-2xl rounded-tr-sm px-4 py-2.5 leading-relaxed shadow-sm flex flex-col gap-1 ${isReverted ? 'bg-slate-200 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 line-through border border-slate-300 dark:border-zinc-700/50' : 'bg-primary text-white shadow-primary/15'}`}>
                  {msg.highlightRef && (() => {
                    const isExpanded = expandedReplies[msg.id];
                    return (
                      <div 
                        onClick={() => setExpandedReplies(prev => ({ ...prev, [msg.id]: !isExpanded }))}
                        className={`text-[11px] italic border-l-2 pl-2 py-0.5 mb-0.5 cursor-pointer transition-all ${isReverted ? 'text-slate-450 dark:text-zinc-500 border-slate-350 dark:border-zinc-700 hover:text-slate-300' : 'text-white/70 border-white/30 hover:text-white'} ${isExpanded ? '' : 'line-clamp-2'}`}
                        title={vi ? 'Bấm để xem đầy đủ' : 'Click to see full text'}
                      >
                        "{msg.highlightRef.text}"
                      </div>
                    );
                  })()}
                  <div>{msg.content}</div>
                </div>
              </motion.div>
            );
          })}

          {/* Generate button after Q&A */}
          {qaComplete && isSourceReview && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="flex justify-center mt-2">
              <button
                onClick={generateContent}
                className="flex items-center gap-2.5 px-6 py-3.5 bg-primary text-white font-bold text-sm rounded-2xl border-0 cursor-pointer hover:bg-primary-hover transition-all shadow-md shadow-primary/25 hover:scale-[1.02] active:scale-[0.98]"
              >
                <Wand2 size={16} />
                {vi ? 'Tạo nội dung' : 'Generate Content'}
                <ArrowRight size={14} />
              </button>
            </motion.div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Chat input (editing phase only) */}
        {!isSourceReview && (
          <div className="px-4 pb-4 pt-2 border-t border-slate-100 dark:border-zinc-900 shrink-0">
            <div className="relative">
              <textarea
                id="acp-chat-input"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSend(); }
                }}
                placeholder={
                  activeHighlight
                    ? (vi ? 'Hướng dẫn chỉnh đoạn đã bôi...' : 'How to edit highlighted text...')
                    : (vi ? 'Nhắn AI... (Enter gửi, Shift+Enter xuống dòng)' : 'Message AI... (Enter to send)')
                }
                rows={3}
                disabled={isChatLoading}
                className={`w-full px-4 py-3 pr-12 text-sm rounded-2xl border resize-none outline-none leading-relaxed transition-all
                  ${activeHighlight
                    ? 'border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/10 focus:border-amber-400 dark:text-text'
                    : 'border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-text focus:border-primary/50 focus:ring-1 focus:ring-primary/10'
                  } ${isChatLoading ? 'opacity-50' : ''}`}
              />
              <button
                onClick={() => handleChatSend()}
                disabled={isChatLoading || !chatInput.trim()}
                className="absolute right-2.5 bottom-2.5 w-8 h-8 bg-primary text-white rounded-xl flex items-center justify-center border-0 cursor-pointer disabled:opacity-40 hover:bg-primary-hover transition-all shadow-sm"
              >
                {isChatLoading ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
              </button>
            </div>
            {activeHighlight && (
              <p className="text-[11px] text-amber-500 font-semibold mt-1.5 flex items-center gap-1">
                <Highlighter size={9} />
                {vi ? `Re: "${activeHighlight.text.substring(0, 35)}..."` : `Re: "${activeHighlight.text.substring(0, 35)}..."`}
                <button onClick={() => setActiveHighlight(null)} className="ml-1 text-amber-400 hover:text-amber-600 cursor-pointer border-0 bg-transparent">×</button>
              </p>
            )}
          </div>
        )}
      </div>

      {hoverMarkId && hoverPos && (
        <div 
          className="fixed z-50 transform -translate-x-1/2 -translate-y-[calc(100%+8px)]"
          style={{ left: hoverPos.x, top: hoverPos.y }}
          onMouseEnter={() => {}}
          onMouseLeave={() => setHoverMarkId(null)}
        >
          <div className="flex items-center gap-1 bg-zinc-900 text-white px-2 py-1.5 rounded-lg shadow-xl text-[11px] font-bold border border-zinc-700">
            <button 
              onClick={() => {
                const mark = document.getElementById(hoverMarkId);
                if (mark) {
                  const newHighlight = { id: hoverMarkId, text: mark.innerText, platform: activePlatform, color: 'bg-amber-200' };
                  setHighlights(prev => [...prev, newHighlight]);
                  setActiveHighlight(newHighlight);
                  setChatInput(vi ? 'Hãy chỉnh sửa đoạn này...' : 'Please edit this text...');
                  setTimeout(() => {
                    document.getElementById('acp-chat-input')?.focus();
                  }, 50);
                }
                setHoverMarkId(null);
              }}
              className="px-2 py-1 bg-primary hover:bg-primary-hover text-white rounded text-[11px] font-semibold border-0 cursor-pointer transition-colors"
            >
              {vi ? 'Gửi AI sửa' : 'Send to AI'}
            </button>
            <button 
              onClick={() => {
                const mark = document.getElementById(hoverMarkId);
                if (mark) {
                  const parent = mark.parentNode;
                  while (mark.firstChild) parent?.insertBefore(mark.firstChild, mark);
                  parent?.removeChild(mark);
                  
                  // Update HTML content in state
                  const html = contentRef.current[activePlatform]?.innerHTML || '';
                  setSegments(prev => ({
                    ...prev,
                    [activePlatform]: { 
                      ...prev[activePlatform], 
                      htmlContent: html,
                      updateCounter: (prev[activePlatform].updateCounter || 0) + 1
                    }
                  }));
                }
                setHoverMarkId(null);
              }}
              className="px-2 py-1 bg-transparent hover:bg-white/10 text-zinc-300 rounded text-[11px] font-semibold border-0 cursor-pointer transition-colors"
            >
              {vi ? 'Hủy' : 'Cancel'}
            </button>
          </div>
        </div>
      )}

      {/* Context Viewer Modal */}
      <AnimatePresence>
        {showContextModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowContextModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] font-sans"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-100 dark:border-zinc-800/80 flex items-center justify-between bg-slate-50/50 dark:bg-zinc-950/20 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <FileSearch size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-text uppercase tracking-wider">
                      {vi ? 'Context tổng quan bài viết' : 'Global Context Summary'}
                    </h3>
                    <p className="text-[10px] text-text-muted">
                      {vi ? 'Ý chính và định hướng bài viết dùng để tham chiếu' : 'Core context and arguments used for AI reference'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowContextModal(false)}
                  className="p-1.5 rounded-lg text-text-muted hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer border-0 bg-transparent"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-6 min-h-[200px]">
                {isGeneratingContext ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <Loader2 size={28} className="animate-spin text-primary" />
                    <p className="text-xs font-bold text-text-muted animate-pulse">
                      {vi ? 'Đang trích xuất và khởi tạo Context tổng...' : 'Analyzing and extracting global context...'}
                    </p>
                  </div>
                ) : !globalContext ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                    <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-zinc-950 flex items-center justify-center text-slate-300 dark:text-zinc-700">
                      <FileSearch size={24} />
                    </div>
                    <div className="max-w-md">
                      <p className="text-xs font-bold text-text">
                        {vi ? 'Chưa có Context tổng' : 'No Global Context available'}
                      </p>
                      <p className="text-[11px] text-text-muted mt-1 leading-relaxed">
                        {vi 
                          ? 'Bối cảnh tổng quan sẽ tự động được tạo sau khi hoàn thành thiết lập và bấm "Tạo bài viết".'
                          : 'Global context will automatically generate once you complete the setup and click "Generate".'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="prose dark:prose-invert max-w-none">
                    {/* Render simple markdown converter */}
                    <div 
                      className="flex flex-col gap-4 text-xs text-text leading-relaxed font-sans"
                      dangerouslySetInnerHTML={{
                        __html: globalContext
                          .replace(/&/g, '&amp;')
                          .replace(/</g, '&lt;')
                          .replace(/>/g, '&gt;')
                          .replace(/^### (.*$)/gim, '<h3 class="text-xs font-black text-slate-805 dark:text-zinc-100 mt-4 mb-1.5 border-l-4 border-primary pl-2 flex items-center gap-1.5">$1</h3>')
                          .replace(/^## (.*$)/gim, '<h2 class="text-sm font-black text-slate-900 dark:text-zinc-50 mt-5 mb-2">$1</h2>')
                          .replace(/^# (.*$)/gim, '<h1 class="text-base font-black text-slate-905 dark:text-zinc-50 mt-6 mb-2.5">$1</h1>')
                          .replace(/\*\*(.*?)\*\*/g, '<strong class="font-extrabold text-slate-900 dark:text-zinc-50">$1</strong>')
                          .replace(/^\s*[\-\*]\s+(.*$)/gim, '<li class="text-[11px] text-slate-650 dark:text-slate-350 ml-4 list-disc mb-1 leading-relaxed">$1</li>')
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-3 border-t border-slate-100 dark:border-zinc-800/80 bg-slate-50/50 dark:bg-zinc-950/20 flex justify-end gap-2 shrink-0">
                {globalContext && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(globalContext);
                      setPopupType('success');
                      setPopupTitle(vi ? 'Thành công' : 'Success');
                      setPopupMessage(vi ? 'Đã sao chép Context tổng vào clipboard!' : 'Copied global context to clipboard!');
                      setPopupOpen(true);
                    }}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 text-xs font-bold text-text-muted hover:text-text transition-all cursor-pointer bg-white dark:bg-zinc-900"
                  >
                    {vi ? 'Sao chép' : 'Copy'}
                  </button>
                )}
                <button
                  onClick={() => setShowContextModal(false)}
                  className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold border-0 cursor-pointer transition-all shadow-sm shadow-primary/10"
                >
                  {vi ? 'Đóng' : 'Close'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SUCCESS CONFIRMATION DIALOG */}
      <AnimatePresence>
        {scheduleSuccess && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 font-sans">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              role="dialog"
              aria-modal="true"
              className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-2xl p-8 max-w-md w-full text-center flex flex-col items-center gap-5 focus-visible:outline-none rounded-3xl"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-450 flex items-center justify-center shadow-inner animate-bounce">
                <CheckCircle2 size={36} />
              </div>

              <div>
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-zinc-50">
                  {vi ? 'Lên lịch đăng bài thành công' : 'Scheduled Successfully'}
                </h3>
                <p className="text-xs text-text-muted mt-2 leading-relaxed">
                  {vi
                    ? `Bài đăng của bạn đã được lên lịch xuất bản thành công trên các kênh đã chọn.`
                    : `Your posts have been successfully scheduled on the selected channels.`}
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-zinc-950/40 border border-slate-150 dark:border-zinc-800 rounded-2xl p-4 w-full text-left flex flex-col gap-3 font-sans">
                <div className="text-[10px] font-extrabold text-text-muted uppercase tracking-wider font-sans">
                  {vi ? 'Thông tin xuất bản' : 'Publication details'}
                </div>

                <div className="text-xs font-bold text-slate-800 dark:text-zinc-200 truncate border-b border-slate-100 dark:border-zinc-850 pb-2 font-sans">
                  {source.title || (vi ? 'Bài viết gốc' : 'Original Article')}
                </div>

                <div className="flex flex-col gap-2.5 font-sans">
                  {PLATFORMS.map(p => {
                    const slot = scheduleSlots[p];
                    const hasContent = segments[p]?.content;
                    if (!hasContent || !slot.date) return null;
                    const label = p === 'facebook' ? 'Facebook' : p === 'threads' ? 'Threads' : 'Instagram';
                    const badgeBg = p === 'facebook' 
                      ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400' 
                      : p === 'threads' 
                        ? 'bg-slate-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-200' 
                        : 'bg-pink-50 dark:bg-pink-950/30 text-pink-600 dark:text-pink-400';
                    return (
                      <div key={p} className="flex items-center justify-between text-xs font-sans">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${badgeBg}`}>{label}</span>
                        <span className="font-semibold text-text-muted">{slot.date} @ {slot.time}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={resetAfterSchedule}
                className="w-full bg-primary hover:bg-primary-hover text-white py-3 px-6 rounded-2xl font-bold shadow-md shadow-primary/20 transition-all text-xs cursor-pointer border-0 font-sans"
              >
                {vi ? 'Bắt đầu chiến dịch mới' : 'Start new campaign'}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <PopupDialog
        isOpen={popupOpen}
        onClose={() => setPopupOpen(false)}
        title={popupTitle}
        message={popupMessage}
        type={popupType}
      />
    </div>
  );
}
