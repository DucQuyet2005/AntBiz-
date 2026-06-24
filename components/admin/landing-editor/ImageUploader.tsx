"use client";

import React, { useState, useRef, DragEvent } from 'react';
import { UploadCloud, Image as ImageIcon, ArrowRight, X } from 'lucide-react';
import PopupDialog from '@/components/PopupDialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { translations } from '@/lib/i18n/translations';

interface Props {
  value: string;
  onChange: (val: string) => void;
}

export default function ImageUploader({ value, onChange }: Props) {
  const { language } = useLanguage();
  const t = translations[language].landingEditor;
  const [dragActive, setDragActive] = useState(false);
  const [newImage, setNewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [popupInfo, setPopupInfo] = useState<{ isOpen: boolean; message: string; type: 'error' | 'success' }>({
    isOpen: false,
    message: '',
    type: 'error'
  });

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setPopupInfo({ isOpen: true, message: 'Vui lòng chọn file hình ảnh (JPG, PNG, GIF, WEBP)', type: 'error' });
      return;
    }
    // Set a reasonable limit like 3MB since we're using base64
    if (file.size > 3 * 1024 * 1024) {
      setPopupInfo({ isOpen: true, message: 'Kích thước ảnh tối đa là 3MB. Vui lòng nén ảnh lại.', type: 'error' });
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const b64 = e.target?.result as string;
      setNewImage(b64);
      onChange(b64);
    };
    reader.readAsDataURL(file);
  };

  const onDrag = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleUrlInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNewImage(val);
    onChange(val);
  };

  const cancelNew = () => {
    setNewImage(null);
    onChange(value); // revert to old value
  };

  return (
    <div className="flex flex-col gap-4">
      
      {/* Before / After Preview */}
      <div className="grid grid-cols-2 gap-4">
        {/* Old Image */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase">{t.imageCurrent}</span>
          <div className="w-full h-32 bg-slate-100 rounded-2xl border border-slate-200 overflow-hidden relative flex items-center justify-center">
            {value ? (
              <img src={value} alt="Old" className="w-full h-full object-cover opacity-80" />
            ) : (
              <ImageIcon className="text-slate-300" size={24} />
            )}
          </div>
        </div>

        {/* New Image Preview */}
        <div className="flex flex-col gap-1 relative">
          <span className="text-[10px] font-bold text-primary uppercase">{t.imageNew}</span>
          <div className="w-full h-32 bg-primary/5 rounded-2xl border-2 border-primary/30 overflow-hidden relative flex items-center justify-center">
            {newImage ? (
              <img src={newImage} alt="New" className="w-full h-full object-cover" />
            ) : (
              <div className="text-slate-400 text-xs font-medium px-4 text-center">
                {t.noNewImage}
              </div>
            )}
          </div>
          <div className="absolute top-1/2 -left-4 transform -translate-y-1/2 z-10 bg-white rounded-full shadow-sm p-0.5 border border-slate-100">
            <ArrowRight size={14} className="text-primary" />
          </div>

          {newImage && (
            <div className="flex gap-2 w-full mt-2">
              <button 
                onClick={() => setNewImage(null)}
                className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-[10px] uppercase transition-all duration-100 active:scale-95 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              >
                {t.cancelNewImage}
              </button>
              <button 
                onClick={() => { onChange(newImage); setNewImage(null); }}
                className="flex-1 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl font-bold text-[10px] uppercase shadow-md transition-all duration-100 active:scale-95 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-2"
              >
                {t.useThisImage}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="text-center text-xs font-bold text-slate-400 uppercase my-2 relative">
        <span className="bg-white px-2 relative z-10">{t.dragDrop}</span>
        <div className="absolute top-1/2 left-0 right-0 h-px bg-slate-100" />
      </div>

      {/* Dropzone */}
      <div 
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        className={`w-full p-6 rounded-2xl border-2 border-dashed transition-all duration-100 active:scale-[0.99] cursor-pointer flex flex-col items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${dragActive ? 'border-primary bg-primary/5' : 'border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-slate-400'}`}
        onDragEnter={onDrag}
        onDragLeave={onDrag}
        onDragOver={onDrag}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <UploadCloud size={24} className={dragActive ? 'text-primary' : 'text-slate-400'} />
        <p className="text-xs font-bold text-slate-600">{t.dragDropOrClick}</p>
        <p className="text-[10px] text-slate-400 font-medium">{t.supportFormat}</p>
        <input 
          type="file" 
          ref={fileInputRef}
          className="hidden" 
          accept="image/*"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) handleFile(e.target.files[0]);
          }}
        />
      </div>

      <div className="text-center text-xs font-bold text-slate-400 uppercase my-2 relative">
        <span className="bg-white px-2 relative z-10">{t.orUrl}</span>
        <div className="absolute top-1/2 left-0 right-0 h-px bg-slate-100" />
      </div>

      <div className="flex flex-col gap-2">
        <input 
          type="text" 
          placeholder="https://example.com/image.png"
          value={newImage || value}
          onChange={handleUrlInput}
          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
        />
      </div>

      <PopupDialog 
        isOpen={popupInfo.isOpen} 
        onClose={() => setPopupInfo(prev => ({ ...prev, isOpen: false }))} 
        message={popupInfo.message} 
        type={popupInfo.type} 
      />
    </div>
  );
}
