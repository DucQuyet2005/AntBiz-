import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Edit2, RotateCcw, Save, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CaptionEditorProps {
  captionId?: string;
  initialContent: string;
  originalAiContent: string;
  platform: 'facebook' | 'thread' | 'instagram';
  onSave?: (content: string) => void;
  className?: string;
}

export const PLATFORM_MAX_LENGTH = {
  facebook: 63206,
  threads: 500,
  linkedin: 1300,
  thread: 500,
  instagram: 2200,
};

const POPULAR_EMOJIS = [
  '🔥', '✨', '👍', '❤️', '👏', '🙌', '💡', '🚀', '📌', '🎯',
  '📢', '⏰', '👇', '👉', '✅', '⚠️', '⭐', '💬', '🎉', '💼'
];

const convertToUnicodeBold = (text: string): string => {
  const diffs = {
    upperDiff: 119743,
    lowerDiff: 119737,
  };
  return Array.from(text).map(char => {
    const code = char.charCodeAt(0);
    if (code >= 65 && code <= 90) {
      return String.fromCodePoint(code + diffs.upperDiff);
    }
    if (code >= 97 && code <= 122) {
      return String.fromCodePoint(code + diffs.lowerDiff);
    }
    return char;
  }).join('');
};

const convertToUnicodeItalic = (text: string): string => {
  return Array.from(text).map(char => {
    const code = char.charCodeAt(0);
    if (code >= 65 && code <= 90) {
      return String.fromCodePoint(code + 119795);
    }
    if (code >= 97 && code <= 122) {
      if (char === 'h') return 'ℎ';
      return String.fromCodePoint(code + 119789);
    }
    return char;
  }).join('');
};

const CaptionEditor = ({
  captionId,
  initialContent,
  originalAiContent,
  platform,
  onSave,
  className = '',
}: CaptionEditorProps) => {
  const [content, setContent] = useState(initialContent);
  const [isEditing, setIsEditing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSavedContent, setLastSavedContent] = useState(initialContent);
  const [showEmojiPanel, setShowEmojiPanel] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Track original content to prevent it from changing when parent state updates after edits
  const originalRef = useRef(originalAiContent);
  const prevCaptionId = useRef(captionId);

  const charLimit = PLATFORM_MAX_LENGTH[platform] || 2000;
  const isOverLimit = content.length > charLimit;
  const hasUnsavedChanges = content !== lastSavedContent;

  useEffect(() => {
    originalRef.current = originalAiContent;
  }, [originalAiContent]);

  useEffect(() => {
    if (prevCaptionId.current !== captionId) {
      prevCaptionId.current = captionId;
      setContent(initialContent);
      setLastSavedContent(initialContent);
      setSaveStatus('idle');
    }
  }, [captionId, initialContent]);

  // Click outside to close editing mode
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsEditing(false);
        setShowEmojiPanel(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [isEditing, content]);

  // Handle Save logic
  const handleSave = useCallback(async (currentContent: string) => {
    if (!captionId || currentContent === lastSavedContent) return;

    setSaveStatus('saving');
    try {
      const res = await fetch(`/api/captions/${captionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ edited_content: currentContent }),
      });

      if (res.ok) {
        setSaveStatus('saved');
        setLastSavedContent(currentContent);
        onSave?.(currentContent);
        setTimeout(() => setSaveStatus('idle'), 3000);
      } else {
        setSaveStatus('error');
      }
    } catch (err) {
      console.error('[CaptionEditor] save error:', err);
      setSaveStatus('error');
    }
  }, [captionId, lastSavedContent, onSave]);

  // Autosave with debounce (3 seconds)
  useEffect(() => {
    if (content !== lastSavedContent && captionId) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        handleSave(content);
      }, 3000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [content, lastSavedContent, captionId, handleSave]);

  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleRestore = () => {
    if (content === originalRef.current) {
      setIsEditing(false);
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);
    if (window.confirm('Bạn có chắc chắn muốn quay về bản gốc của AI? Tất cả thay đổi hiện tại sẽ mất.')) {
      setContent(originalRef.current);
      setIsEditing(false);
      handleSave(originalRef.current);
    }
  };

  const applyStyling = (type: 'bold' | 'italic') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    if (start === end) return;

    const selectedText = content.substring(start, end);
    const styledText = type === 'bold' ? convertToUnicodeBold(selectedText) : convertToUnicodeItalic(selectedText);
    const newContent = content.substring(0, start) + styledText + content.substring(end);
    
    setContent(newContent);
    handleSave(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start, start + styledText.length);
    }, 0);
  };

  const insertEmoji = (emoji: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      const newContent = content + emoji;
      setContent(newContent);
      handleSave(newContent);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newContent = content.substring(0, start) + emoji + content.substring(end);
    
    setContent(newContent);
    handleSave(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + emoji.length, start + emoji.length);
    }, 0);
  };

  return (
    <div ref={containerRef} className={`flex flex-col gap-2 w-full ${className}`}>
      {/* Editor Header / Status */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          {(() => {
            const isThreads = platform === 'thread';
            let counterClass = 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400';
            if (isOverLimit) {
              counterClass = 'bg-red-50 dark:bg-red-950/20 text-red-500';
            } else if (isThreads) {
              const len = content.length;
              if (len <= 200) {
                counterClass = 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400';
              } else if (len <= 260) {
                counterClass = 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400';
              } else {
                counterClass = 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400';
              }
            }
            return (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${counterClass}`}>
                {content.length.toLocaleString()} / {charLimit.toLocaleString()} ký tự
              </span>
            );
          })()}
          
          <AnimatePresence mode="wait">
            {saveStatus === 'saving' && (
              <motion.span 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="text-[9px] text-text-muted flex items-center gap-1"
              >
                <Loader2 size={10} className="animate-spin" /> Đang lưu...
              </motion.span>
            )}
            {saveStatus === 'saved' && (
              <motion.span 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="text-[9px] text-emerald-500 flex items-center gap-1 font-bold"
              >
                <CheckCircle2 size={10} /> Đã lưu tự động
              </motion.span>
            )}
            {saveStatus === 'error' && (
              <motion.span 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="text-[9px] text-red-500 flex items-center gap-1 font-bold"
              >
                <AlertCircle size={10} /> Lỗi lưu nháp
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <button 
          onClick={handleRestore}
          className="text-[10px] text-primary hover:text-primary-hover font-bold flex items-center gap-1 transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none rounded px-1 border-0 bg-transparent cursor-pointer"
          title="Về bản gốc AI"
        >
          <RotateCcw size={10} />
          Về bản gốc AI
        </button>
      </div>

      {/* Editor Body */}
      <div 
        tabIndex={isEditing ? -1 : 0}
        onKeyDown={(e) => {
          if (!isEditing && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            setIsEditing(true);
          }
        }}
        className={`relative group rounded-xl border-2 transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
          isEditing 
            ? 'border-primary bg-[#ffffff] dark:bg-slate-900 shadow-sm ring-2 ring-primary/10' 
            : 'border-transparent hover:border-gray-200 dark:hover:border-white/10 bg-gray-50/30 dark:bg-slate-800/10'
        } ${isOverLimit ? 'border-red-200 dark:border-red-900/50' : ''}`}
        onClick={() => setIsEditing(true)}
      >
        {isEditing && (
          <div className="flex items-center gap-1 px-2.5 py-1.5 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-slate-900/50 rounded-t-xl select-none">
            <button
              type="button"
              onClick={() => applyStyling('bold')}
              className="px-2 py-0.5 hover:bg-gray-200/80 dark:hover:bg-slate-800 rounded font-bold text-xs text-slate-700 dark:text-slate-350 select-none cursor-pointer focus-visible:ring-1 focus-visible:ring-primary focus-visible:outline-none border-0 bg-transparent"
              title="In đậm Unicode"
            >
              B
            </button>
            <button
              type="button"
              onClick={() => applyStyling('italic')}
              className="px-2 py-0.5 hover:bg-gray-200/80 dark:hover:bg-slate-800 rounded italic text-xs text-slate-700 dark:text-slate-355 select-none cursor-pointer focus-visible:ring-1 focus-visible:ring-primary focus-visible:outline-none border-0 bg-transparent"
              title="In nghiêng Unicode"
            >
              I
            </button>
            <div className="w-px h-3.5 bg-gray-200 dark:bg-slate-800 mx-1.5" />
            
            {/* Emoji Selector */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowEmojiPanel(!showEmojiPanel)}
                className="p-1 hover:bg-gray-200/80 dark:hover:bg-slate-800 rounded text-xs select-none cursor-pointer focus-visible:ring-1 focus-visible:ring-primary focus-visible:outline-none border-0 bg-transparent flex items-center justify-center"
                title="Emoji"
              >
                😊
              </button>
              {showEmojiPanel && (
                <div className="absolute top-full left-0 mt-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/5 rounded-xl shadow-xl p-2 z-50 grid grid-cols-5 gap-1 w-44">
                  {POPULAR_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        insertEmoji(emoji);
                        setShowEmojiPanel(false);
                      }}
                      className="w-7 h-7 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/8 rounded text-sm transition-colors cursor-pointer select-none border-0 bg-transparent"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {isEditing ? (
          <textarea
            ref={textareaRef}
            autoFocus
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full bg-transparent p-3 text-[11px] text-text leading-relaxed outline-none resize-none focus:ring-0 border-0"
            placeholder="Nhập nội dung caption..."
          />
        ) : (
          <div className="p-3 text-[11px] text-text leading-relaxed whitespace-pre-wrap min-h-[60px] cursor-text">
            {(() => {
              if (!content) {
                return <span className="text-gray-400 dark:text-slate-500 italic">Nhấp để chỉnh sửa nội dung...</span>;
              }
              const isThreads = platform === 'thread';
              if (isThreads) {
                const lastQIndex = Math.max(content.lastIndexOf('?'), content.lastIndexOf('？'));
                if (lastQIndex !== -1) {
                  let start = 0;
                  for (let i = lastQIndex - 1; i >= 0; i--) {
                    if (['.', '!', '?', '？', '\n'].includes(content[i])) {
                      start = i + 1;
                      break;
                    }
                  }
                  const before = content.substring(0, start);
                  const question = content.substring(start, lastQIndex + 1);
                  const after = content.substring(lastQIndex + 1);
                  return (
                    <span>
                      {before}
                      <u className="underline decoration-indigo-500 decoration-2 underline-offset-2">{question}</u>
                      {after}
                    </span>
                  );
                }
              }
              return content;
            })()}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-40 transition-opacity">
              <Edit2 size={12} className="text-primary" />
            </div>
          </div>
        )}
      </div>

      {isOverLimit && (
        <div className="flex items-center gap-1.5 text-[9px] text-red-500 font-bold px-1 select-none">
          <AlertCircle size={10} />
          Vượt giới hạn ký tự của {platform === 'thread' ? 'Threads' : platform === 'facebook' ? 'Facebook' : 'Instagram'}!
        </div>
      )}
    </div>
  );
};

export default CaptionEditor;
