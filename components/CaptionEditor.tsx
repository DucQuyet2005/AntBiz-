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
  threads: 5000,
  linkedin: 1300,
  thread: 5000,
  instagram: 2200,
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

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

  return (
    <div className={`flex flex-col gap-2 w-full ${className}`}>
      {/* Editor Header / Status */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
            isOverLimit ? 'bg-red-50 text-red-500' : 'bg-gray-100 text-gray-500'
          }`}>
            {content.length.toLocaleString()} / {charLimit.toLocaleString()} ký tự
          </span>
          
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
          className="text-[10px] text-primary hover:text-primary-hover font-bold flex items-center gap-1 transition-colors"
          title="Ve ban goc AI"
        >
          <RotateCcw size={10} />
          Ve ban goc AI
        </button>
      </div>

      {/* Editor Body */}
      <div 
        className={`relative group rounded-xl border-2 transition-all ${
          isEditing 
            ? 'border-primary bg-white shadow-sm ring-2 ring-primary/10' 
            : 'border-transparent hover:border-gray-200 bg-gray-50/30'
        } ${isOverLimit ? 'border-red-200' : ''}`}
        onClick={() => setIsEditing(true)}
      >
        {isEditing ? (
          <textarea
            ref={textareaRef}
            autoFocus
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onBlur={() => setIsEditing(false)}
            className="w-full bg-transparent p-3 text-[11px] text-text leading-relaxed outline-none resize-none focus:ring-0"
            placeholder="Nhập nội dung caption..."
          />
        ) : (
          <div className="p-3 text-[11px] text-text leading-relaxed whitespace-pre-wrap min-h-[60px] cursor-text">
            {content || <span className="text-gray-400 italic">Nhấp để chỉnh sửa nội dung...</span>}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-40 transition-opacity">
              <Edit2 size={12} className="text-primary" />
            </div>
          </div>
        )}
      </div>

      {isOverLimit && (
        <div className="flex items-center gap-1.5 text-[9px] text-red-500 font-bold px-1">
          <AlertCircle size={10} />
          Vượt giới hạn ký tự của {platform === 'thread' ? 'Threads' : platform === 'facebook' ? 'Facebook' : 'Instagram'}!
        </div>
      )}
    </div>
  );
};

export default CaptionEditor;
