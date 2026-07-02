"use client";

import React, { useRef, useEffect, useState } from 'react';
import { Edit3, AlertCircle } from 'lucide-react';

interface InlineEditTextProps {
  value: string;
  onChange: (newValue: string) => void;
  multiline?: boolean;
  maxLength?: number;
  className?: string;
  isEditor?: boolean;
  required?: boolean;
  fieldName?: string;
}

export default function InlineEditText({
  value,
  onChange,
  multiline = false,
  maxLength = 500,
  className = '',
  isEditor = false,
  required = false,
  fieldName = 'Trường thông tin'
}: InlineEditTextProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [charCount, setCharCount] = useState(value?.length || 0);

  // Sync value from prop when not active editing
  useEffect(() => {
    if (editorRef.current && document.activeElement !== editorRef.current) {
      editorRef.current.innerText = value || '';
      setCharCount(value?.length || 0);
      validateValue(value || '');
    }
  }, [value]);

  const validateValue = (val: string) => {
    if (required && !val.trim()) {
      setError(`${fieldName} không được để trống`);
      return false;
    }
    if (maxLength && val.length > maxLength) {
      setError(`Vượt quá số ký tự tối đa (${val.length}/${maxLength})`);
      return false;
    }
    setError(null);
    return true;
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (editorRef.current) {
      let finalVal = editorRef.current.innerText || '';
      
      // Strict trim for single-line inputs
      if (!multiline) {
        finalVal = finalVal.replace(/\r?\n|\r/g, ' ').trim();
        editorRef.current.innerText = finalVal;
      }

      // Max length enforcement
      if (maxLength && finalVal.length > maxLength) {
        finalVal = finalVal.substring(0, maxLength);
        editorRef.current.innerText = finalVal;
      }

      setCharCount(finalVal.length);
      validateValue(finalVal);

      // Trigger change if value actually changed
      if (finalVal !== value) {
        onChange(finalVal);
      }
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleInput = () => {
    if (editorRef.current) {
      const currentVal = editorRef.current.innerText || '';
      setCharCount(currentVal.length);
      
      // Dynamic validation warning while typing
      validateValue(currentVal);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Escape: Revert and blur
    if (e.key === 'Escape') {
      e.preventDefault();
      if (editorRef.current) {
        editorRef.current.innerText = value || '';
        setError(null);
        editorRef.current.blur();
      }
      return;
    }

    // Enter: Blur on single line
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      editorRef.current?.blur();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    
    // Inject as plain text
    document.execCommand('insertText', false, text);
  };

  if (!isEditor) {
    // Plain render outside editor mode, supports raw html if needed by sections or just standard string output
    return <span className={className}>{value || ''}</span>;
  }

  return (
    <span className="relative group/inline-edit inline-block w-full">
      <span
        ref={editorRef}
        contentEditable={true}
        suppressContentEditableWarning={true}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        className={`
          transition-all duration-200 outline-none
          ${className}
          ${isFocused 
            ? 'ring-2 ring-primary/40 focus:bg-primary/5 dark:focus:bg-zinc-800/20 rounded-md p-1 min-w-[20px] outline-none border-transparent' 
            : 'hover:border-dashed hover:border-primary/50 hover:bg-primary/5 dark:hover:bg-zinc-800/10 cursor-pointer border-[1.5px] border-transparent rounded-md p-1'
          }
          ${error ? 'border-red-500 focus:ring-red-500/40' : ''}
        `}
        style={{
          display: 'inline-block',
          width: '100%',
          wordBreak: 'break-word',
          whiteSpace: multiline ? 'pre-wrap' : 'normal'
        }}
      />

      {/* Floating status tag/badge inside the block */}
      {!isFocused && (
        <span className="absolute right-2 top-1 opacity-0 group-hover/inline-edit:opacity-100 transition-opacity bg-primary text-white text-[9px] font-black tracking-wider px-1.5 py-0.5 rounded shadow-sm z-30 pointer-events-none uppercase flex items-center gap-1 select-none">
          <Edit3 size={9} /> Sửa
        </span>
      )}

      {/* Char limit counter & validation warning */}
      {isFocused && (
        <span className="absolute right-0 top-full mt-1 flex items-center gap-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 px-2.5 py-1 rounded-lg shadow-lg z-50 text-[10px] font-bold select-none text-slate-500 animate-in fade-in slide-in-from-top-1 duration-150">
          {error && (
            <span className="text-red-500 flex items-center gap-1">
              <AlertCircle size={10} /> {error}
            </span>
          )}
          <span className={charCount > maxLength ? 'text-red-500' : 'text-slate-400'}>
            {charCount}/{maxLength}
          </span>
        </span>
      )}
    </span>
  );
}
