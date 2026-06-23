"use client";

import React, { useState, useRef, useEffect } from 'react';
import {
  Link2,
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
  RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRouter } from 'next/navigation';
import { useUnsavedChanges } from '@/lib/hooks/useUnsavedChanges';
import PromptSuggestionSection from '../PromptSuggestionSection';
import CaptionEditor from '../CaptionEditor';
import PopupDialog, { PopupType } from '@/components/PopupDialog';


// Threads Custom SVG Logo
const ThreadsIcon = ({ size = 14, className = "" }: { size?: number; className?: string }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" className={className}>
    <path d="M22.5 12c0-5.799-4.701-10.5-10.5-10.5S1.5 6.201 1.5 12s4.701 10.5 10.5 10.5c2.328 0 4.475-.758 6.216-2.038l-1.39-1.39C15.42 19.98 13.784 20.5 12 20.5c-4.694 0-8.5-3.806-8.5-8.5s3.806-8.5 8.5-8.5 8.5 3.806 8.5 8.5c0 1.956-.503 3.659-1.42 4.8-.813 1.011-1.923 1.5-3.08 1.5-1.144 0-1.848-.553-2.128-1.123-.391-.798-.328-2.109-.328-3.177v-2.5c0-.828-.672-1.5-1.5-1.5s-1.5.672-1.5 1.5v2.5c0 .356-.002.83-.027 1.309a4 4 0 1 1-3.953-3.809c.28 0 .546.035.803.097V8.539c-.26-.025-.525-.039-.79-.039a7 7 0 1 0 5.679 11.096c.71.91 1.776 1.404 3.018 1.404 2.217 0 4.156-1.134 5.347-2.923 1.15-1.729 1.693-3.992 1.693-6.077zM9.5 12a1 1 0 1 0 2 0 1 1 0 0 0-2 0z" />
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
});

const toDatabasePlatform = (platform: SocialPlatform) => (platform === 'threads' ? 'thread' : platform);

// Module-level variables to share state/handlers with EditableText without unmounting it
let _editState: any = null;
let _setEditState: any = () => {};
let _handleUpdateVariantField: any = () => {};
let _isGeneratingAB: boolean = false;

interface EditableTextContextProps {
  editState: { variantId: string; field: string } | null;
  setEditState: (state: { variantId: string; field: keyof SocialVariant } | null) => void;
  handleUpdateVariantField: (variantId: string, field: keyof SocialVariant, value: string) => void;
  isGeneratingAB?: boolean;
}

const EditableTextContext = React.createContext<EditableTextContextProps | null>(null);

const EditableText = ({
  variantId,
  field,
  value,
  textarea = false,
  className = ""
}: {
  variantId: string;
  field: keyof SocialVariant;
  value: string;
  textarea?: boolean;
  className?: string;
}) => {
  const { language } = useLanguage();
  const context = React.useContext(EditableTextContext);
  const editState = context?.editState ?? _editState;
  const setEditState = context?.setEditState ?? _setEditState;
  const handleUpdateVariantField = context?.handleUpdateVariantField ?? _handleUpdateVariantField;
  const isGeneratingAB = context?.isGeneratingAB ?? _isGeneratingAB;
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

  React.useEffect(() => {
    if (isEditing) {
      if (textarea && textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      }
    }
  }, [isEditing, value, textarea]);

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
              className="w-full text-inherit bg-transparent p-0 border-0 outline-none resize-none focus:ring-0 focus:outline-none leading-relaxed transition-all"
            />
            {isCaptionField && charLimit && (
              <div className="flex flex-col gap-0.5 mt-1 border-t border-gray-100 pt-1">
                <div className={`text-[9px] text-right font-bold transition-colors ${value.length > charLimit ? 'text-rose-600' : 'text-gray-400'}`}>
                  {value.length.toLocaleString()} / {charLimit.toLocaleString()} {language === 'vi' ? 'ký tự' : 'characters'}
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
            className="w-full text-inherit bg-transparent p-0 border-0 outline-none focus:ring-0 focus:outline-none font-inherit transition-all"
          />
        )}
      </div>
    );
  }

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        setEditState({ variantId, field });
      }}
      className={`group relative cursor-pointer hover:bg-primary/5 rounded px-1 -mx-1 transition-all duration-200 border border-transparent hover:border-primary/10 ${className}`}
    >
      <span className="whitespace-pre-wrap">
        {value ? (
          value
        ) : isGeneratingAB ? (
          <span className="text-gray-400 italic flex items-center gap-1.5">
            <Loader2 size={12} className="animate-spin text-primary shrink-0" />
            {language === 'vi' ? 'AI đang viết...' : 'AI is writing...'}
          </span>
        ) : (
          <span className="text-gray-300 italic">Nhấp để chỉnh sửa...</span>
        )}
      </span>
      <span className="absolute right-1 top-1 opacity-0 group-hover:opacity-40 transition-opacity">
        <Edit2 size={10} className="text-primary" />
      </span>
    </div>
  );
};

export default function AiCreatorView() {
  const { t, language } = useLanguage();
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [popup, setPopup] = useState<{ isOpen: boolean; message: string; type: PopupType } | null>(null);

  const showPopup = (message: string, type: PopupType = 'info') => {
    setPopup({ isOpen: true, message, type });
  };
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');

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
  const [isAiPromptDialogOpen, setIsAiPromptDialogOpen] = useState(false);
  const [activeAiTab, setActiveAiTab] = useState<'editor' | 'generator'>('editor');
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
  // T-1.18: Multi-variant state
  const [variantCount, setVariantCount] = useState<2 | 3>(2);
  const [variantGroupId, setVariantGroupId] = useState<string | null>(null);
  const [regeneratingVariantId, setRegeneratingVariantId] = useState<string | null>(null);

  // ... (existing code)

  const handleProceedToABTest = async () => {
    if (!activePrompt) {
      alert(language === 'vi' ? 'Vui lòng cấu hình prompt trước khi sinh bài viết.' : 'Please configure a prompt before generating.');
      return;
    }

    if (!url.trim() && !articleId) {
      alert(language === 'vi' ? 'Vui lòng cào/nhập bài viết trước khi sinh nội dung.' : 'Please crawl or import an article before generating.');
      return;
    }

    setIsGeneratingAB(true);
    const tagsStr = postData.tags.split(',').map((t: string) => '#' + t.trim().replace('#', '')).join(' ');

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
    }));

    setVariants(newVariants);
    setStep(2);

    // T-1.18: Generate a new variantGroupId for this batch
    const newGroupId = crypto.randomUUID();
    setVariantGroupId(newGroupId);

    abortControllerRef.current = new AbortController();

    // T-1.18: Build prompt for each variant index to maximize diversity
    const buildVariantPrompt = (index: number, basePrompt: string): string => {
      if (index === 0) return basePrompt; // Variant A: prompt gốc
      if (index === 1) {
        // Variant B: Thân thiện, có emoji, câu hỏi gợi mở
        return `${basePrompt}\n\nLưu ý cho biến thể này: Hãy viết theo phong cách cực kỳ thân thiện, sử dụng emoji phù hợp, đặt câu hỏi gợi mở ở cuối bài để kích thích thảo luận và tương tác. Mở đầu bằng một câu ấn tượng tạo sự tò mò. CTA rõ ràng ở cuối.`;
      }
      // Variant C: Ngắn gọn, facts-driven, không emoji
      return `${basePrompt}\n\nLưu ý cho biến thể này: Hãy viết ngắn gọn, súc tích, tập trung vào dữ liệu và sự kiện quan trọng. Không sử dụng emoji. Phong cách báo chí chuyên nghiệp, đúng trọng tâm. Hashtag ngắn gọn, hiệu quả.`;
    };

    const streamVariant = async (variantId: string, variantIndex: number, groupId: string) => {
      const abortSignal = abortControllerRef.current?.signal;
      const customPromptText = buildVariantPrompt(variantIndex, activePrompt);
      try {
        const res = await fetch('/api/captions/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: url.trim() || undefined,
            articleId: articleId || undefined,
            customPrompt: customPromptText,
            platform: selectedPlatform,
            variantGroupId: groupId,
            variantIndex,
            ...(variantIndex === 0 && selectedPrompt?.id && !String(selectedPrompt.id).startsWith('custom-')
              ? { promptId: selectedPrompt.id }
              : {}),
          }),
          signal: abortSignal,
        });

        if (!res.ok) {
          const errJson = await res.json().catch(() => ({ error: res.statusText }));
          throw new Error(errJson?.error || `HTTP ${res.status}`);
        }

        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let accumulated = '';

        if (!reader) throw new Error('No response body');

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              if (data === '[DONE]') {
                continue;
              }
              try {
                const parsed = JSON.parse(data);
                if (parsed.text) {
                  accumulated += parsed.text;
                  setVariants((prev) =>
                    prev.map((v) =>
                      v.id === variantId
                        ? {
                          ...v,
                          [selectedPlatform]: accumulated,
                        }
                        : v
                    )
                  );
                }
                if (parsed.done && parsed.captionId) {
                  setVariants((prev) =>
                    prev.map((v) =>
                      v.id === variantId ? { ...v, captionId: parsed.captionId } : v
                    )
                  );
                }
                if (parsed.done && parsed.articleId && !articleId) {
                  setArticleId(parsed.articleId);
                }
              } catch (e) {
                // Ignore partial line JSON errors
              }
            }
          }
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        console.error(`Error streaming variant ${variantId}:`, err);
        setVariants((prev) =>
          prev.map((v) =>
            v.id === variantId
              ? {
                ...v,
                [selectedPlatform]:
                  language === 'vi'
                    ? 'Lỗi khi sinh nội dung AI cho phiên bản này.'
                    : 'Error generating AI content for this variant.',
              }
              : v
          )
        );
      }
    };

    try {
      // T-1.18: Stream all N variants in parallel
      await Promise.all(
        variantIds.map((id, index) => streamVariant(id, index, newGroupId))
      );
    } catch (error) {
      console.error('Error generating variants:', error);
    } finally {
      setIsGeneratingAB(false);
    }
  };

  // T-1.18: Regenerate a single variant without resetting the others
  const handleRegenerateVariant = async (variantId: string) => {
    if (!activePrompt || (!url.trim() && !articleId)) return;
    const variantIndex = ['A', 'B', 'C'].indexOf(variantId);
    if (variantIndex === -1) return;

    setRegeneratingVariantId(variantId);

    // Clear the current content for this variant
    setVariants((prev) =>
      prev.map((v) => (v.id === variantId ? { ...v, [selectedPlatform]: '', captionId: undefined } : v))
    );

    const buildVariantPrompt = (index: number, basePrompt: string): string => {
      if (index === 0) return basePrompt;
      if (index === 1) {
        return `${basePrompt}\n\nLưu ý cho biến thể này: Hãy viết theo phong cách cực kỳ thân thiện, sử dụng emoji phù hợp, đặt câu hỏi gợi mở ở cuối bài để kích thích thảo luận và tương tác.`;
      }
      return `${basePrompt}\n\nLưu ý cho biến thể này: Hãy viết ngắn gọn, súc tích, facts-driven, không emoji, phong cách báo chí chuyên nghiệp.`;
    };

    const groupId = variantGroupId || crypto.randomUUID();
    if (!variantGroupId) setVariantGroupId(groupId);

    const customPromptText = buildVariantPrompt(variantIndex, activePrompt);

    try {
      const res = await fetch('/api/captions/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url.trim() || undefined,
          articleId: articleId || undefined,
          customPrompt: customPromptText,
          platform: selectedPlatform,
          variantGroupId: groupId,
          variantIndex,
          ...(variantIndex === 0 && selectedPrompt?.id && !String(selectedPrompt.id).startsWith('custom-')
            ? { promptId: selectedPrompt.id }
            : {}),
        }),
      });

      if (!res.ok) return;

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';
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
              accumulated += parsed.text;
              setVariants((prev) =>
                prev.map((v) =>
                  v.id === variantId ? { ...v, [selectedPlatform]: accumulated } : v
                )
              );
            }
            if (parsed.done && parsed.captionId) {
              setVariants((prev) =>
                prev.map((v) =>
                  v.id === variantId ? { ...v, captionId: parsed.captionId } : v
                )
              );
            }
          } catch {
            // ignore
          }
        }
      }
    } catch (err) {
      console.error('Error regenerating variant:', err);
    } finally {
      setRegeneratingVariantId(null);
    }
  };

  // Update prompt when platform changes
  useEffect(() => {
    if (postData.title && postData.description && !isGenerating && !isGeneratingSmartPrompt) {
      const newPrompt = getDefaultPromptTemplate(promptPlatform, postData.title, postData.description);
      setActivePrompt(newPrompt);
    }
  }, [promptPlatform]);

  // Prompt Selector Library States
  const [promptsList, setPromptsList] = useState<any[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<any>(null);

  // AI Logic Functions
  const handleGenerateSmartPrompt = async () => {
    if (!postData.title || !(postData.full_text || postData.description)) return;
    setIsGeneratingSmartPrompt(true);
    try {
      const res = await fetch('/api/prompts/generate-smart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: postData.title,
          content: postData.full_text || postData.description,
          platform: selectedPlatform
        }),
      });
      const data = await res.json();
      if (data.smartPrompt) {
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

  const handleSaveCurrentPrompt = async () => {
    if (!activePrompt) return null;
    setIsSavingPrompt(true);
    setSaveSuccess(false);
    try {
      const finalTitle = customPromptTitle.trim() || `AI Generated - ${new Date().toLocaleDateString('vi-VN')}`;
      const res = await fetch('/api/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: finalTitle,
          content: activePrompt,
          platform: promptPlatform,
          tags: ['AI Generated', promptPlatform]
        }),
      });
      if (res.ok) {
        const json = await res.json();
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

  const getDefaultPromptTemplate = (platform: string, title: string, content: string) => {
    const platformLabel = platform.charAt(0).toUpperCase() + platform.slice(1);
    return `Bạn là một Content Marketer chuyên nghiệp. Hãy viết một bài đăng mạng xã hội (${platformLabel} post) dựa trên thông tin sau:

**Nền tảng:** ${platformLabel}

**Dữ liệu đầu vào:**
*   **Tiêu đề bài báo:** "${title}"
*   **Nội dung tóm tắt:** "${content}"

**Hướng dẫn khai thác nội dung:**
*   Sử dụng đoạn tóm tắt để tạo hook và gây tò mò ngay từ đầu.
*   Tập trung vào khía cạnh truyền cảm hứng của câu chuyện: sự kiên trì, mục tiêu tài chính, hành trình tiết kiệm/đầu tư để đạt được mục tiêu.
*   Bài viết không cần kể chi tiết toàn bộ câu chuyện mà cần gợi mở để khuyến khích sự tương tác và muốn tìm hiểu thêm.

**Văn phong:**
*   Thân thiện, gần gũi, dễ đọc, truyền cảm hứng.
*   Sử dụng ngôn ngữ đời thường, tránh thuật ngữ phức tạp.
*   Khuyến khích sự tương tác, đặt câu hỏi gợi mở.

**Cấu trúc bài viết:**
1.  **Hook (Móc câu):** Bắt đầu mạnh mẽ, gây tò mò hoặc bất ngờ từ đoạn tóm tắt. Có thể là một câu hỏi hoặc một phát biểu gây chú ý.
2.  **Body (Nội dung chính):** Phát triển câu chuyện ngắn gọn, nhấn mạnh cảm giác nhẹ nhõm và thành quả. Nhấn mạnh sự nỗ lực và bài học.
3.  **Call to Action (CTA - Kêu gọi hành động):** Khuyến khích người đọc bình luận, chia sẻ quan điểm, hoặc kể về câu chuyện/mục tiêu của họ.
4.  **Hashtag:** Đề xuất 3-5 hashtag liên quan, phổ biến và có khả năng viral.

TUYỆT ĐỐI KHÔNG có lời dẫn giải, không "Ok", không "Đây là bài viết", không có bất kỳ ký tự nào ngoài nội dung bài viết. Trả về TRỰC TIẾP bài đăng hoàn chỉnh.`;
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

  const isCellOccupied = (dateStr: string, hour: number) => {
    // Luôn cho phép lên lịch nhiều bài đăng trong cùng một khung giờ
    return false;
  };

  const getCellPosts = (dateStr: string, hour: number) => {
    const list: any[] = [];
    const targetPlatforms = getPromptTargetPlatforms(selectedPrompt);

    if (targetPlatforms.includes('facebook') && facebookDate === dateStr) {
      const fbHr = parseInt(facebookTime.split(':')[0]) || 0;
      if (fbHr === hour) {
        list.push({
          type: 'draft',
          platform: 'facebook',
          timeStr: facebookTime,
          title: language === 'vi' ? 'Facebook (Bản nháp)' : 'Facebook (Draft)',
          time: facebookTime,
        });
      }
    }

    if (targetPlatforms.includes('threads') && threadsDate === dateStr) {
      const trHr = parseInt(threadsTime.split(':')[0]) || 0;
      if (trHr === hour) {
        list.push({
          type: 'draft',
          platform: 'threads',
          timeStr: threadsTime,
          title: language === 'vi' ? 'Threads (Bản nháp)' : 'Threads (Draft)',
          time: threadsTime,
        });
      }
    }

    if (targetPlatforms.includes('instagram') && instagramDate === dateStr) {
      const igHr = parseInt(instagramTime.split(':')[0]) || 0;
      if (igHr === hour) {
        list.push({
          type: 'draft',
          platform: 'instagram',
          timeStr: instagramTime,
          title: language === 'vi' ? 'Instagram (Bản nháp)' : 'Instagram (Draft)',
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
    if (isCellOccupied(val, activeHour)) {
      setFacebookError(language === 'vi' ? `Lịch bị cản trở! Ô lúc ${facebookTime} ngày ${val} đã đầy bài (tối đa 3 bài/giờ).` : `Slot full! The slot at ${facebookTime} on ${val} has reached maximum capacity (max 3 posts/hour).`);
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

    if (isCellOccupied(facebookDate, clampedHour)) {
      setFacebookError(language === 'vi' ? `Lịch bị cản trở! Ô lúc ${finalTime} ngày ${facebookDate} đã đầy bài (tối đa 3 bài/giờ).` : `Slot full! The slot at ${finalTime} on ${facebookDate} has reached maximum capacity (max 3 posts/hour).`);
    } else {
      setFacebookError("");
      setFacebookTime(finalTime);
    }
  };

  const handleThreadsDateChange = (val: string) => {
    const activeHour = parseInt(threadsTime.split(':')[0]) || 10;
    if (isCellOccupied(val, activeHour)) {
      setThreadsError(language === 'vi' ? `Lịch bị cản trở! Ô lúc ${threadsTime} ngày ${val} đã đầy bài (tối đa 3 bài/giờ).` : `Slot full! The slot at ${threadsTime} on ${val} has reached maximum capacity (max 3 posts/hour).`);
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

    if (isCellOccupied(threadsDate, clampedHour)) {
      setThreadsError(language === 'vi' ? `Lịch bị cản trở! Ô lúc ${finalTime} ngày ${threadsDate} đã đầy bài (tối đa 3 bài/giờ).` : `Slot full! The slot at ${finalTime} on ${threadsDate} has reached maximum capacity (max 3 posts/hour).`);
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
        : `Slot full! The slot at ${timeStr} on ${blockedDate} is at maximum capacity (max 3 posts/hour).`
    );
    setTimeout(() => setFacebookError(""), 4500);
  };

  const handleThreadsDragError = (blockedDate: string, hour: number) => {
    const timeStr = `${hour.toString().padStart(2, '0')}:00`;
    setThreadsError(
      language === 'vi'
        ? `Lịch bị cản trở! Ô lúc ${timeStr} ngày ${blockedDate} đã đầy bài (tối đa 3 bài/giờ).`
        : `Slot full! The slot at ${timeStr} on ${blockedDate} is at maximum capacity (max 3 posts/hour).`
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
    if (isCellOccupied(val, activeHour)) {
      setInstagramError(language === 'vi' ? `Lịch bị cản trở! Ô lúc ${instagramTime} ngày ${val} đã đầy bài (tối đa 3 bài/giờ).` : `Slot full! The slot at ${instagramTime} on ${val} has reached maximum capacity (max 3 posts/hour).`);
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

    if (isCellOccupied(instagramDate, clampedHour)) {
      setInstagramError(language === 'vi' ? `Lịch bị cản trở! Ô lúc ${finalTime} ngày ${instagramDate} đã đầy bài (tối đa 3 bài/giờ).` : `Slot full! The slot at ${finalTime} on ${instagramDate} has reached maximum capacity (max 3 posts/hour).`);
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
        : `Slot full! The slot at ${timeStr} on ${blockedDate} is at maximum capacity (max 3 posts/hour).`
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
  const [selectedPlatform, setSelectedPlatform] = useState<'facebook' | 'threads' | 'instagram'>('facebook');

  // ── AI Generation State (T-1.12.3 / T-1.12.4 / T-1.12.5) ──────────────────
  interface Prompt { id: string; name: string; platform: string; content: string; }
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [promptsLoading, setPromptsLoading] = useState(false);
  const [selectedPromptId, setSelectedPromptId] = useState<string>('');
  const [captionId, setCaptionId] = useState<string>('');
  const [streamedCaption, setStreamedCaption] = useState('');
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generateDone, setGenerateDone] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (step === 2) {
          e.preventDefault();
          handleRevertToSaved();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [savedHistory, step, variants]);

  const handleGenerate = async () => {
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
      const res = await fetch('/api/captions/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, promptId: selectedPromptId }),
        signal: abortControllerRef.current.signal,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(errJson?.error || `HTTP ${res.status}`);
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      if (!reader) throw new Error('No response body');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') {
              setGenerateDone(true);
              // Auto-fill Variant A facebook field with the generated caption
              setVariants((prev) =>
                prev.map((v) =>
                  v.id === 'A' ? { ...v, facebook: accumulated, threads: accumulated } : v
                )
              );
              continue;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                accumulated += parsed.text;
                setStreamedCaption(accumulated);
              }
              if (parsed.done && parsed.captionId) {
                const newCaptionId = parsed.captionId;
                setCaptionId(newCaptionId);
                setVariants((prev) =>
                  prev.map((v) =>
                    v.id === 'A' ? { ...v, captionId: newCaptionId } : v
                  )
                );
              }
              if (parsed.done && parsed.articleId) {
                setArticleId(parsed.articleId);
              }
              if (parsed.error) throw new Error(parsed.error);
            } catch (e: any) {
              if (e?.name !== 'SyntaxError') throw e;
            }
          }
        }
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return; // user cancelled
      setGenerateError(
        err?.message ||
        (language === 'vi' ? 'Đã xảy ra lỗi khi sinh caption. Thử lại.' : 'An error occurred while generating. Please retry.')
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCancelGenerate = () => {
    abortControllerRef.current?.abort();
    setIsGenerating(false);
    setIsGeneratingAB(false);
  };

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
    full_text: ''
  });

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
    const tagsStr = data.tags.split(',').map((t: string) => '#' + t.trim().replace('#', '')).join(' ');

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

  // Fetch / Scrape Handler for original URL
  const handleFetch = async () => {
    if (!url || !url.trim()) {
      showPopup(language === 'vi' ? 'Vui lòng nhập url bài viết' : 'Please enter an article URL', 'warning');
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
            full_text: data.full_text || data.description || ''
          };
          setPostData(updatedPostData);
          setArticleId(data.id || null);
          setCaptionId('');
          const defaultPrompt = getDefaultPromptTemplate(selectedPlatform, updatedPostData.title, updatedPostData.description);
          setActivePrompt(defaultPrompt);
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
            full_text: data.full_text || data.description || ''
          };
          setPostData(updatedPostData);
          setArticleId(data.id || null);
          setCaptionId('');
          setUrl(explorerUrl);
          generateVariants(updatedPostData, selectedPrompt);
          setIsExplorerOpen(false);
          setHasUnsavedChanges(true);
        }
      }
    } catch (e) {
      console.error("Scraper explorer error:", e);
    } finally {
      setIsScraping(false);
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
    const selectedVariant = variants.find((variant) => variant.id === selectedVariantId);
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

  const compileFinalMessage = (variant: SocialVariant) => {
    const parts: string[] = [];

    if (toggles.showTitle && variant.title) {
      const categoryClean = postData.category.replace('#', '').trim();
      const titleLine = categoryClean
        ? `🏠 [${categoryClean}] ${variant.title}`
        : `🏠 ${variant.title}`;
      parts.push(titleLine);
    }

    if (toggles.showDescription) {
      const descVal = variant[selectedPlatform] || '';
      if (descVal.trim()) {
        parts.push(descVal.trim());
      }
    }

    const metaParts: string[] = [];
    if (toggles.showAuthor && variant.author) {
      const authorPrefix = `🎥 ${language === 'vi' ? 'Tác giả:' : 'Author:'} `;
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

  const ensureCaptionDraft = async () => {
    const selectedVariant = variants.find((v) => v.id === selectedVariantId);
    if (!selectedVariant) {
      throw new Error(
        language === 'vi'
          ? 'Vui lòng chọn biến thể trước khi lên lịch.'
          : 'Please select a variant before scheduling.'
      );
    }

    const finalCompiledContent = compileFinalMessage(selectedVariant);
    
    const platKey = selectedPlatform === 'facebook' ? 'facebookCaptionId' :
      selectedPlatform === 'threads' ? 'threadsCaptionId' :
        'instagramCaptionId';
    
    // Platform-specific caption ID fallback
    const activeCaptionId = selectedVariant[platKey] || selectedVariant.captionId || (selectedVariant.id === 'A' ? captionId : undefined);

    if (activeCaptionId) {
      // Cập nhật nội dung hoàn chỉnh của caption đã sinh trước đó để phản ánh tùy chỉnh hiển thị
      const res = await fetch(`/api/captions/${activeCaptionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          edited_content: finalCompiledContent,
          status: 'draft',
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Không thể cập nhật caption nháp.');
      }

      // Đảm bảo lưu captionId vào variant nếu nó chưa có
      if (!selectedVariant.captionId || !selectedVariant[platKey]) {
        setVariants((prev) =>
          prev.map((v) => (v.id === selectedVariant.id ? { ...v, captionId: activeCaptionId, [platKey]: activeCaptionId } : v))
        );
      }
      return activeCaptionId;
    }

    const getSelectedVariantCaption = () => {
      if (selectedPlatform === 'facebook') return selectedVariant.facebook;
      if (selectedPlatform === 'threads') return selectedVariant.threads;
      if (selectedPlatform === 'instagram') return selectedVariant.instagram;
      return '';
    };

    const selectedContent = getSelectedVariantCaption();
    if (!selectedContent) {
      throw new Error(
        language === 'vi'
          ? 'Vui lòng chọn biến thể có nội dung trước khi lên lịch.'
          : 'Please select a variant with content before scheduling.'
      );
    }

    const resolvedArticleId = await ensureArticleForCaption();
    const originalField = selectedPlatform === 'facebook' ? 'originalFacebook' :
      selectedPlatform === 'threads' ? 'originalThreads' :
        'originalInstagram';
    const originalAiText = selectedVariant[originalField] || selectedContent;

    // Check if the user has edited the caption compared to the original AI content
    const isEdited = selectedVariant[selectedPlatform] !== originalAiText;
    const editedContentPayload = isEdited ? finalCompiledContent : null;

    const res = await fetch('/api/captions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        article_id: resolvedArticleId,
        platform: toDatabasePlatform(selectedPlatform),
        ai_content: originalAiText,
        edited_content: editedContentPayload,
        ...(selectedPrompt?.id && !String(selectedPrompt.id).startsWith('custom-')
          ? { prompt_id: selectedPrompt.id }
          : {}),
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.data?.id) {
      throw new Error(
        data?.error ||
        (language === 'vi'
          ? 'Không thể lưu caption nháp trước khi lên lịch.'
          : 'Could not save a draft caption before scheduling.')
      );
    }

    const newCaptionId = data.data.id;
    setCaptionId(newCaptionId);
    setVariants((prev) =>
      prev.map((v) => (v.id === selectedVariant.id ? { ...v, captionId: newCaptionId, [platKey]: newCaptionId } : v))
    );
    return newCaptionId as string;
  };

  const handleConfirmSchedule = async () => {
    // Không thực hiện lên lịch nếu có lỗi xảy ra hoặc đang xử lý yêu cầu trước đó
    if (facebookError || threadsError || instagramError) return;
    if (isSchedulingLoading) return;

    const scheduleByPlatform = {
      facebook: { date: facebookDate, time: facebookTime },
      threads: { date: threadsDate, time: threadsTime },
      instagram: { date: instagramDate, time: instagramTime },
    };
    const selectedSchedule = scheduleByPlatform[selectedPlatform];
    const scheduledAt = new Date(`${selectedSchedule.date}T${selectedSchedule.time}`);

    // Đảm bảo thời gian lên lịch phải ở tương lai so với thời điểm hiện tại
    if (scheduledAt.getTime() <= Date.now()) {
      setFacebookError('Thời gian lên lịch đăng bài bắt buộc phải ở tương lai.');
      return;
    }

    setIsSchedulingLoading(true);
    setSchedulingError(null);

    // Tách các đường dẫn hình ảnh theo từng dòng nếu bật hiển thị hình ảnh
    const imageUrls = toggles.showImage && postData.imageUrl
      ? postData.imageUrl.split('\n').map(line => line.trim()).filter(Boolean)
      : [];

    try {
      const draftCaptionId = await ensureCaptionDraft();

      // Gửi yêu cầu lên lịch bài viết đến hệ thống backend
      const res = await fetch('/api/scheduled-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          captionId: draftCaptionId,
          scheduledAt: scheduledAt.toISOString(),
          imageUrls,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(errData.error || `Lỗi từ hệ thống HTTP ${res.status}`);
      }

      setIsScheduled(true);
      setHasUnsavedChanges(false);
    } catch (err: any) {
      setSchedulingError(err.message || 'Lỗi xảy ra trong quá trình lên lịch bài đăng');
    } finally {
      setIsSchedulingLoading(false);
    }
  };

  return (
    <EditableTextContext.Provider value={{ editState, setEditState, handleUpdateVariantField, isGeneratingAB }}>
      <div className="flex flex-col gap-6 w-full font-sans">

        {/* Top Header Row */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mt-2">
          <div>
            <h1 className="text-3xl font-bold text-text tracking-tight">{t('aiCreator.title')}</h1>
            <p className="text-sm text-text-muted mt-1">{t('aiCreator.subtitle')}</p>
          </div>

          {/* Step Indicator Wizard */}
          <div className="flex items-center gap-1 bg-slate-100/90 rounded-2xl p-1.5 border border-slate-200/70 shadow-sm select-none">
            <button
              onClick={() => changeStep(1)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all duration-300 cursor-pointer ${step === 1 ? 'bg-primary text-white shadow-md shadow-primary/25' : 'text-slate-500 hover:text-slate-800 hover:bg-white/70'
                }`}
            >
              <span className={`w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] font-black ${step === 1 ? 'bg-white/20' : 'bg-slate-200'}`}>1</span>
              {t('aiCreator.step1')}
            </button>
            <button
              onClick={() => changeStep(2)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all duration-300 cursor-pointer ${step === 2 ? 'bg-primary text-white shadow-md shadow-primary/25' : 'text-slate-500 hover:text-slate-800 hover:bg-white/70'
                }`}
            >
              <span className={`w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] font-black ${step === 2 ? 'bg-white/20' : 'bg-slate-200'}`}>2</span>
              {t('aiCreator.step2')}
            </button>
            <button
              onClick={() => { if (selectedVariantId) changeStep(3); }}
              disabled={!selectedVariantId}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all duration-300 ${step === 3 ? 'bg-primary text-white shadow-md shadow-primary/25 cursor-pointer' :
                  selectedVariantId ? 'text-slate-500 hover:text-slate-800 hover:bg-white/70 cursor-pointer' :
                    'text-slate-300 cursor-not-allowed'
                }`}
            >
              <span className={`w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] font-black ${step === 3 ? 'bg-white/20' : 'bg-slate-200'}`}>3</span>
              {t('aiCreator.step3')}
            </button>
          </div>
        </div>

        {/* Unified layout grid allowing shared layout morphing */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative">

          {/* STEP 1: Left column inputs form */}
          {step === 1 && (
            <motion.div
              layout
              key="step1-inputs"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.4, ease: 'easeInOut' }}
              className="lg:col-span-8 flex flex-col gap-6 order-1"
            >
              {/* URL Context Importer */}
              <div className="bg-[#C4F0E1]/40 border border-[#C4F0E1] rounded-[28px] p-6 flex flex-col gap-4 shadow-sm">
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
                    className="flex-1 bg-transparent px-2 py-1.5 text-xs text-text focus:outline-none"
                    placeholder={t('aiCreator.searchPlace')}
                  />
                  <button
                    onClick={handleFetch}
                    disabled={isFetching}
                    className="bg-[#4A6B5D] hover:bg-[#3A5B4D] disabled:opacity-50 text-white px-5 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
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

              {/* ─── AI PROMPT CONFIGURATION BAR ─── */}
              <button
                type="button"
                onClick={() => setIsAiPromptDialogOpen(true)}
                className="bg-white border border-slate-200/80 rounded-[24px] p-5 flex items-center justify-between shadow-sm hover:border-primary/40 hover:shadow-lg cursor-pointer transition-all duration-300 group text-left w-full"
              >
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary/10 to-violet-500/10 flex items-center justify-center text-primary border border-primary/15 group-hover:scale-105 transition-transform duration-300">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                      Cấu hình AI Prompt &amp; Nội dung
                      <span className="text-[9px] bg-primary/10 text-primary font-black px-2 py-0.5 rounded-full">AI Powered</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5 font-semibold">
                      {selectedPrompt
                        ? `Đang dùng: [${selectedPrompt.platform?.toUpperCase()}] ${selectedPrompt.name}`
                        : activePrompt
                          ? 'Đã soạn câu lệnh tùy chỉnh · Nhấn để chỉnh sửa'
                          : 'Nhấp để chọn Prompt từ thư viện hoặc tự soạn câu lệnh AI'
                      }
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {(selectedPrompt || activePrompt) && (
                    <span className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl font-bold">
                      Đã thiết lập
                    </span>
                  )}
                  <span className="bg-primary/10 text-primary px-4 py-2.5 rounded-xl text-xs font-black group-hover:bg-primary group-hover:text-white transition-all duration-300">
                    {selectedPrompt ? 'Thay đổi' : 'Cấu hình'}
                  </span>
                </div>
              </button>

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
                      <textarea
                        value={activePrompt}
                        onChange={(e) => setActivePrompt(e.target.value)}
                        placeholder="Nhập hướng dẫn của bạn tại đây hoặc sử dụng Prompt gợi ý..."
                        rows={8}
                        className="w-full bg-[#F8F9FE] border border-[#E4E6F8] rounded-[24px] px-6 py-5 text-sm text-text focus:outline-none focus:ring-4 focus:ring-primary/10 resize-none leading-relaxed transition-all placeholder:text-gray-400 font-medium"
                      />
                      <div className="absolute bottom-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {saveSuccess && (
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200 animate-in fade-in slide-in-from-right-2">
                            {language === 'vi' ? 'Đã lưu!' : 'Saved!'}
                          </span>
                        )}
                        <button
                          onClick={handleSaveCurrentPrompt}
                          disabled={isSavingPrompt}
                          className="p-2.5 rounded-xl bg-white border border-gray-200 text-gray-400 hover:text-primary hover:border-primary/30 shadow-sm transition-all disabled:opacity-50"
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
                          className="bg-emerald-50/50 border border-emerald-100 rounded-[24px] p-6 flex flex-col gap-4"
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
                    <div className="flex items-center gap-2 bg-white rounded-xl px-4 py-3 border border-[#C7D2FE] text-xs text-text-muted">
                      <Loader2 size={14} className="animate-spin text-primary" />
                      {language === 'vi' ? 'Đang tải prompts...' : 'Loading prompts...'}
                    </div>
                  ) : (
                    <div className="relative">
                      <select
                        id="ai-prompt-select"
                        value={selectedPromptId}
                        onChange={(e) => { setSelectedPromptId(e.target.value); setGenerateError(null); }}
                        className="w-full appearance-none bg-white border border-[#C7D2FE] rounded-xl px-4 py-3 text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary/30 pr-10 transition-all cursor-pointer font-semibold"
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

                {/* Error banner */}
                {generateError && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3"
                  >
                    <span className="text-xs text-red-700 font-semibold flex-1">
                      ⚠️ {generateError}
                    </span>
                    <button
                      onClick={handleGenerate}
                      className="flex items-center gap-1.5 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0"
                    >
                      <RefreshCw size={12} />
                      {language === 'vi' ? 'Thử lại' : 'Retry'}
                    </button>
                    <button
                      onClick={() => setGenerateError(null)}
                      className="text-red-400 hover:text-red-600 transition-colors shrink-0"
                    >
                      <X size={14} />
                    </button>
                  </motion.div>
                )}

                {/* Streaming output box */}
                <AnimatePresence>
                  {(isGenerating || streamedCaption) && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="relative bg-white border border-[#C7D2FE] rounded-2xl p-4 overflow-hidden"
                    >
                      {/* Shimmer bar while generating */}
                      {isGenerating && (
                        <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-primary via-purple-500 to-primary bg-[length:200%] animate-[shimmer_1.5s_linear_infinite]" />
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

              {/* Manual Edit Form */}
              <div className="bg-white border border-gray-200/80 rounded-[28px] p-8 flex flex-col gap-6 shadow-sm">
                <div className="flex items-center gap-2 border-b border-gray-100 pb-4">
                  <Layers size={18} className="text-primary" />
                  <h3 className="text-lg font-bold text-text">{t('aiCreator.editPostFields')}</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="md:col-span-2 flex flex-col gap-1.5">
                    <label className="text-xs font-extrabold text-text uppercase tracking-wider">{t('aiCreator.labelTitle')}</label>
                    <input
                      type="text"
                      value={postData.title}
                      onChange={(e) => setPostData({ ...postData, title: e.target.value })}
                      className="w-full bg-[#F8F9FE] border border-[#E4E6F8] rounded-xl px-4 py-3 text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                      placeholder={t('aiCreator.labelTitle')}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-extrabold text-text uppercase tracking-wider">{t('aiCreator.labelCategory')}</label>
                    <input
                      type="text"
                      value={postData.category}
                      onChange={(e) => setPostData({ ...postData, category: e.target.value })}
                      className="w-full bg-[#F8F9FE] border border-[#E4E6F8] rounded-xl px-4 py-3 text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-extrabold text-text uppercase tracking-wider">{t('aiCreator.labelAuthor')}</label>
                    <input
                      type="text"
                      value={postData.author}
                      onChange={(e) => setPostData({ ...postData, author: e.target.value })}
                      className="w-full bg-[#F8F9FE] border border-[#E4E6F8] rounded-xl px-4 py-3 text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-extrabold text-text uppercase tracking-wider">{t('aiCreator.labelPublishedAt')}</label>
                    <input
                      type="text"
                      value={postData.published_at}
                      onChange={(e) => setPostData({ ...postData, published_at: e.target.value })}
                      className="w-full bg-[#F8F9FE] border border-[#E4E6F8] rounded-xl px-4 py-3 text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-extrabold text-text uppercase tracking-wider">{t('aiCreator.labelViews')}</label>
                    <input
                      type="text"
                      value={postData.views}
                      onChange={(e) => setPostData({ ...postData, views: e.target.value })}
                      className="w-full bg-[#F8F9FE] border border-[#E4E6F8] rounded-xl px-4 py-3 text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>

                  <div className="md:col-span-2 flex flex-col gap-1.5">
                    <label className="text-xs font-extrabold text-text uppercase tracking-wider">{t('aiCreator.labelImageUrl')}</label>
                    <textarea
                      value={postData.imageUrl}
                      onChange={(e) => setPostData({ ...postData, imageUrl: e.target.value })}
                      rows={3}
                      className="w-full bg-[#F8F9FE] border border-[#E4E6F8] rounded-xl px-4 py-3 text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary/20 resize-y leading-relaxed transition-all"
                      placeholder="Nhập mỗi URL hình ảnh trên một dòng..."
                    />
                  </div>

                  <div className="md:col-span-2 flex flex-col gap-1.5">
                    <label className="text-xs font-extrabold text-text uppercase tracking-wider">{t('aiCreator.labelTags')}</label>
                    <input
                      type="text"
                      value={postData.tags}
                      onChange={(e) => setPostData({ ...postData, tags: e.target.value })}
                      className="w-full bg-[#F8F9FE] border border-[#E4E6F8] rounded-xl px-4 py-3 text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>

                  <div className="md:col-span-2 flex flex-col gap-1.5">
                    <label className="text-xs font-extrabold text-text uppercase tracking-wider">{t('aiCreator.labelShortDesc')}</label>
                    <textarea
                      value={postData.full_text}
                      onChange={(e) => setPostData({ ...postData, full_text: e.target.value })}
                      rows={10}
                      className="w-full bg-[#F8F9FE] border border-[#E4E6F8] rounded-xl px-4 pt-3 pb-6 text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary/20 resize-y leading-relaxed transition-all scroll-pb-4"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* SHARED PREVIEW COLUMN (Physically slides right-to-left between Step 1 and Step 2) */}
          {(step === 1 || step === 2) && (
            <motion.div
              layout
              transition={{ type: 'spring', stiffness: 220, damping: 28 }}
              className={`lg:col-span-4 flex flex-col gap-6 lg:sticky lg:top-6 ${step === 1 ? 'order-2' : 'order-1'}`}
            >
              {/* 1. Toggles Customizer (Tùy chỉnh mục hiển thị) - Only in Step 2 */}
              {step === 2 && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  className="bg-white border border-gray-200 rounded-[28px] p-6 shadow-sm flex flex-col gap-4"
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

              {/* 2. Prompt Selector Section (Prompt sử dụng) - ONLY in Step 2 (as a standalone card) */}
              {step === 2 && (
                <div className="bg-white border border-gray-200 rounded-[28px] p-6 shadow-sm flex flex-col gap-4 font-sans">
                  <div className="flex items-center justify-between font-sans">
                    <span className="text-[10px] font-extrabold text-text-muted uppercase tracking-wider flex items-center gap-1.5 font-sans">
                      📝 Prompt {language === 'vi' ? 'sử dụng' : 'in use'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsAiPromptDialogOpen(true)}
                      className="text-[10px] font-extrabold text-primary hover:text-white bg-primary/10 hover:bg-primary px-3 py-1.5 rounded-xl transition-all cursor-pointer font-sans"
                    >
                      {selectedPrompt ? (language === 'vi' ? 'Thay đổi' : 'Change') : (language === 'vi' ? 'Chọn Prompt' : 'Select Prompt')}
                    </button>
                  </div>
                  {selectedPrompt ? (
                    <div className="bg-[#F8FAFC] border border-gray-150 rounded-2xl p-3.5 flex flex-col gap-1.5 font-sans">
                      <div className="flex items-center justify-between font-sans">
                        <span className="text-xs font-extrabold text-text truncate max-w-[70%] font-sans">{selectedPrompt.name}</span>
                        <span className="text-[8px] bg-primary/10 text-primary font-black px-1.5 py-0.5 rounded uppercase font-sans">{selectedPrompt.platform}</span>
                      </div>
                      <p className="text-[10px] text-text-muted line-clamp-2 leading-relaxed font-semibold italic">
                        "{selectedPrompt.content}"
                      </p>
                    </div>
                  ) : (
                    <div className="border border-dashed border-gray-200 rounded-2xl p-4 text-center text-xs text-text-muted font-sans font-semibold">
                      {language === 'vi' ? 'Chưa chọn Prompt' : 'No prompt selected'}
                    </div>
                  )}
                </div>
              )}

              {/* 3. Article Live Preview Card (Bài viết gốc) */}
              <div className="bg-white border border-gray-200 rounded-[28px] p-6 shadow-sm flex flex-col gap-5">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <h3 className="text-sm font-extrabold text-text uppercase tracking-wider flex items-center gap-1.5">
                    <Smartphone size={16} className="text-primary" />
                    {t('aiCreator.articlePreview')}
                  </h3>
                  <span className="text-[10px] bg-emerald-50 text-emerald-600 font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">
                    {language === 'vi' ? 'Trực tiếp' : 'Live'}
                  </span>
                </div>

                {/* Preview Content */}
                <div className="border border-gray-100 rounded-3xl overflow-hidden shadow-sm flex flex-col bg-white">
                  <div className="h-44 bg-gray-100 relative">
                    {postData.imageUrl ? (
                      <img
                        src={postData.imageUrl.split('\n')[0].trim()}
                        alt={postData.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-tr from-indigo-550 to-purple-550"></div>
                    )}
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

                    <div className="flex items-center gap-4 text-[10px] text-text-muted font-bold">
                      <span className="flex items-center gap-1">
                        <User size={12} />
                        {postData.author || (language === 'vi' ? 'Không rõ' : 'Unknown')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {postData.published_at || (language === 'vi' ? 'Không có ngày' : 'No Date')}
                      </span>
                    </div>

                    <p className="text-xs text-text-muted leading-relaxed font-medium line-clamp-3">
                      {postData.description || (language === 'vi' ? 'Không có mô tả.' : 'No description provided.')}
                    </p>

                    <div className="flex flex-wrap gap-1 mt-1">
                      {postData.tags.split(',').map((tag, idx) => {
                        const trimmed = tag.trim();
                        if (!trimmed) return null;
                        return (
                          <span key={idx} className="bg-[#F3F4FD] text-primary px-2.5 py-1 rounded-full text-[10px] font-bold">
                            {trimmed}
                          </span>
                        );
                      })}
                    </div>

                    <div className="border-t border-gray-100 pt-3 mt-1 flex items-center justify-between text-[11px] font-bold text-text-muted">
                      <span className="flex items-center gap-1.5">
                        <Eye size={14} className="text-amber-500" />
                        {postData.views || (language === 'vi' ? '0 lượt xem' : '0 views')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 4. Prompt Selector Section (Prompt sử dụng) - ONLY in Step 1 (inside Article Preview Card) */}
                {step === 1 && (
                  <div className="flex flex-col gap-2 border-t border-gray-100 pt-4 mt-1 font-sans">
                    <div className="flex items-center justify-between font-sans">
                      <span className="text-[10px] font-extrabold text-text-muted uppercase tracking-wider flex items-center gap-1.5 font-sans">
                        📝 Prompt {language === 'vi' ? 'sử dụng' : 'in use'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsAiPromptDialogOpen(true)}
                        className="text-[10px] font-extrabold text-primary hover:text-white bg-primary/10 hover:bg-primary px-3 py-1.5 rounded-xl transition-all cursor-pointer font-sans"
                      >
                        {selectedPrompt ? (language === 'vi' ? 'Thay đổi' : 'Change') : (language === 'vi' ? 'Chọn Prompt' : 'Select Prompt')}
                      </button>
                    </div>
                    {selectedPrompt ? (
                      <div className="bg-[#F8FAFC] border border-gray-150 rounded-2xl p-3.5 flex flex-col gap-1.5 font-sans">
                        <div className="flex items-center justify-between font-sans">
                          <span className="text-xs font-extrabold text-text truncate max-w-[70%] font-sans">{selectedPrompt.name}</span>
                          <span className="text-[8px] bg-primary/10 text-primary font-black px-1.5 py-0.5 rounded uppercase font-sans">{selectedPrompt.platform}</span>
                        </div>
                        <p className="text-[10px] text-text-muted line-clamp-2 leading-relaxed font-semibold italic">
                          "{selectedPrompt.content}"
                        </p>
                      </div>
                    ) : (
                      <div className="border border-dashed border-gray-200 rounded-2xl p-4 text-center text-xs text-text-muted font-sans font-semibold">
                        {language === 'vi' ? 'Chưa chọn Prompt' : 'No prompt selected'}
                      </div>
                    )}
                  </div>
                )}

                {/* T-1.18: Variant count selector + Next step button */}
                {step === 1 && (
                  <div className="flex flex-col gap-2">
                    {/* Variant count segmented control */}
                    <div className="flex items-center justify-between px-1">
                      <span className="text-xs font-bold text-text-muted">
                        {language === 'vi' ? 'Số biến thể' : 'Variant count'}
                      </span>
                      <div className="flex bg-sidebar rounded-full p-0.5 border border-gray-200 shadow-inner">
                        {([2, 3] as const).map((count) => (
                          <button
                            key={count}
                            onClick={() => setVariantCount(count)}
                            className={`text-xs font-extrabold px-4 py-1.5 rounded-full transition-all duration-200 ${variantCount === count
                                ? 'bg-primary text-white shadow-sm'
                                : 'text-text-muted hover:text-text'
                              }`}
                          >
                            {count}
                          </button>
                        ))}
                      </div>
                    </div>
                    <motion.button
                      layout
                      onClick={handleProceedToABTest}
                      disabled={isGeneratingAB || isFetching}
                      className="w-full bg-primary hover:bg-primary-hover disabled:opacity-70 text-white py-3.5 px-6 rounded-2xl font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-95 text-sm cursor-pointer"
                    >
                      {isGeneratingAB ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          {language === 'vi'
                            ? `Đang sinh ${variantCount} biến thể...`
                            : `AI generating ${variantCount} variants...`}
                        </>
                      ) : (
                        <>
                          {t('aiCreator.proceedToAb')}
                          <ArrowRight size={16} />
                        </>
                      )}
                    </motion.button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* STEP 2: Right column A/B testing variants workspace */}
          {step === 2 && (
            <motion.div
              layout
              key="step2-variants"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              transition={{ duration: 0.4, ease: 'easeInOut' }}
              className="lg:col-span-8 flex flex-col gap-6 order-2"
            >
              {/* Platform Selector */}
              <div className="bg-white border border-gray-200 rounded-[28px] p-5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-pink-500 animate-pulse"></span>
                  <h3 className="text-base font-extrabold text-text">{t('aiCreator.multiChannelAb')}</h3>
                </div>

                <div className="flex bg-sidebar rounded-full p-1 border border-primary/5 shadow-inner">
                  {(['facebook', 'threads', 'instagram'] as const)
                    .filter(platform => getPromptTargetPlatforms(selectedPrompt).includes(platform))
                    .map((platform) => {
                      const isActive = selectedPlatform === platform;
                      return (
                        <button
                          key={platform}
                          onClick={() => setSelectedPlatform(platform)}
                          className={`text-xs font-extrabold px-5 py-2 rounded-full uppercase tracking-wider transition-all duration-300 ${isActive
                            ? 'bg-primary text-white shadow-sm'
                            : 'text-text-muted hover:text-text'
                            }`}
                        >
                          {platform === 'facebook' && t('aiCreator.fbLabel')}
                          {platform === 'threads' && t('aiCreator.threadsLabel')}
                          {platform === 'instagram' && 'Instagram'}
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* Displaying Variants in 2-Columns grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                <AnimatePresence mode="popLayout">
                  {variants.map((v) => {
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
                    const isCardSelected = selectedVariantId === v.id;
                    const originalField = selectedPlatform === 'facebook' ? 'originalFacebook' :
                      selectedPlatform === 'threads' ? 'originalThreads' :
                        'originalInstagram';
                    const currentVal = v[selectedPlatform] || '';
                    const originalVal = v[originalField] || '';
                    const hasChanged = !!(originalVal && currentVal !== originalVal);

                    return (
                      <motion.div
                        key={v.id}
                        layout
                        layoutId={`variant-card-${v.id}`}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ type: "spring", stiffness: 350, damping: 25 }}
                        onClick={() => setSelectedVariantId(v.id)}
                        className={`rounded-3xl p-5 flex flex-col gap-3 relative overflow-hidden cursor-pointer select-none transition-all duration-300 ${isCardSelected
                            ? 'bg-white border-2 border-primary ring-4 ring-primary/15 shadow-2xl shadow-primary/15 scale-[1.01]'
                            : 'bg-white border border-gray-200/80 hover:border-primary/30 hover:shadow-lg shadow-sm'
                          }`}
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
                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full select-none transition-colors duration-200 ${
                              currentVal.length > (selectedPlatform === 'facebook' ? 63206 : selectedPlatform === 'threads' ? 5000 : 2200)
                                ? 'bg-rose-50 text-rose-600 border border-rose-200'
                                : 'bg-gray-100 text-gray-500'
                            }`}>
                              {currentVal.length.toLocaleString()} / {(selectedPlatform === 'facebook' ? 63206 : selectedPlatform === 'threads' ? 5000 : 2200).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {hasChanged && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const confirmMsg = language === 'vi'
                                    ? 'Bạn có chắc chắn muốn hủy các thay đổi và quay lại nội dung gốc do AI tạo ra?'
                                    : 'Are you sure you want to discard your edits and revert to the original AI content?';
                                  if (window.confirm(confirmMsg)) {
                                    handleUpdateVariantField(v.id, selectedPlatform, originalVal);
                                  }
                                }}
                                className="flex items-center gap-1 text-[10px] font-black text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200/60 px-2.5 py-1 rounded-xl transition-all cursor-pointer select-none"
                                title={language === 'vi' ? 'Hủy chỉnh sửa, khôi phục bản AI gốc' : 'Discard edits, revert to original AI'}
                              >
                                <RefreshCw size={10} />
                                {language === 'vi' ? 'Về bản gốc' : 'Revert'}
                              </button>
                            )}
                            {isCardSelected && (
                              <motion.span
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="flex items-center gap-1 text-[9px] text-white bg-primary font-black px-2 py-0.5 rounded-full"
                              >
                                <Check size={9} />
                                {language === 'vi' ? 'Đã chọn' : 'Selected'}
                              </motion.span>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRegenerateVariant(v.id);
                              }}
                              disabled={regeneratingVariantId === v.id}
                              className={`p-1.5 rounded-full hover:bg-gray-100 border border-gray-200 transition-colors ${regeneratingVariantId === v.id ? 'opacity-50 pointer-events-none' : ''
                                }`}
                              title={language === 'vi' ? 'Tạo lại biến thể này' : 'Regenerate this variant'}
                            >
                              {regeneratingVariantId === v.id ? (
                                <Loader2 size={13} className="animate-spin text-primary" />
                              ) : (
                                <RefreshCw size={13} className="text-gray-500" />
                              )}
                            </button>
                            <span className={`text-xs font-black px-3 py-1 rounded-full border select-none transition-all ${isCardSelected ? 'bg-primary text-white border-primary' : 'bg-primary/10 text-primary border-primary/10'
                              }`}>
                              {language === 'vi' ? 'Biến thể' : 'Variant'} {v.id}
                            </span>
                          </div>
                        </div>

                        {/* Mockup */}
                        {selectedPlatform === 'threads' ? (
                          /* Connected multi-post threads markup */
                          <div className="flex flex-col gap-0 text-text">

                            {/* Thread Post 1/2 */}
                            <div className="flex gap-3 items-stretch">
                              <div className="flex flex-col items-center shrink-0">
                                <div className="relative w-9 h-9">
                                  <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white font-extrabold text-sm shadow-sm select-none">
                                    {v.id}
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
                                      🏠 [{postData.category.replace('#', '')}] <EditableText variantId={v.id} field="title" value={v.title} />
                                    </div>
                                  )}

                                  {toggles.showDescription && (
                                    <div className="whitespace-pre-wrap">
                                      <EditableText
                                        variantId={v.id}
                                        field="threads"
                                        value={v.threads}
                                        textarea
                                      />
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-medium text-[8px] ml-1.5 align-middle select-none">1/2</span>
                                    </div>
                                  )}

                                  {(toggles.showAuthor || toggles.showTags) && (
                                    <div className="text-[10px] text-text-muted flex flex-col gap-1 border-t border-gray-100 pt-1.5 mt-0.5">
                                      {toggles.showAuthor && (
                                        <div className="flex items-center gap-1 font-semibold text-gray-500">
                                          <span>🎥 {language === 'vi' ? 'Tác giả:' : 'Author:'}</span>
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
                                  <div className="aspect-[1.91/1] w-full rounded-2xl overflow-hidden border border-gray-100 mt-1.5 shadow-sm">
                                    <img src={postData.imageUrl.split('\n')[0].trim()} alt="Threads content" className="w-full h-full object-cover" />
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
                                    {v.id}
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
                          <div className="border border-gray-200/60 rounded-2xl overflow-hidden flex flex-col bg-white shadow-inner/5">
                            <div className="p-3.5 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-extrabold text-sm shadow-sm">
                                  {v.id}
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-xs font-bold text-text flex items-center gap-1">
                                    antbiz_official
                                    <span className="w-3.5 h-3.5 bg-blue-500 text-white rounded-full flex items-center justify-center text-[7px] font-bold select-none">✓</span>
                                  </span>
                                  <span className="text-[9px] text-text-muted">{language === 'vi' ? 'Hồ Chí Minh' : 'Ho Chi Minh City'}</span>
                                </div>
                              </div>
                              <MoreHorizontal size={14} className="text-gray-400" />
                            </div>

                            {toggles.showImage && postData.imageUrl && (
                              <div className="aspect-square w-full bg-gray-50 relative overflow-hidden border-t border-b border-gray-100">
                                <img src={postData.imageUrl} alt="Instagram asset" className="w-full h-full object-cover" />
                              </div>
                            )}

                            <div className="px-3.5 pt-3 pb-2 flex items-center gap-4 text-text">
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
                                  🏠 [{postData.category.replace('#', '')}] <EditableText variantId={v.id} field="title" value={v.title} />
                                </div>
                              )}

                              {toggles.showDescription && (
                                <div className="whitespace-pre-wrap">
                                  <span className="font-extrabold mr-1.5">antbiz_official</span>
                                  <EditableText
                                    variantId={v.id}
                                    field="instagram"
                                    value={v.instagram}
                                    textarea
                                  />
                                </div>
                              )}

                              {toggles.showAuthor && (
                                <div className="flex items-center gap-1 font-semibold text-gray-500 mt-1">
                                  <span>🎥 {language === 'vi' ? 'Tác giả:' : 'Author:'}</span>
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
                          /* Facebook Mockup */
                          <div className="border border-gray-200/60 rounded-2xl overflow-hidden flex flex-col bg-white shadow-inner/5">
                            <div className="p-3.5 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-extrabold text-sm shadow-sm">
                                  {v.id}
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-xs font-bold text-text flex items-center gap-1">
                                    AntBiz Official
                                    <span className="w-3.5 h-3.5 bg-blue-500 text-white rounded-full flex items-center justify-center text-[7px] font-bold select-none">✓</span>
                                  </span>
                                  <span className="text-[9px] text-text-muted">{language === 'vi' ? '7 giờ' : '7 hrs'} · 🌍</span>
                                </div>
                              </div>
                              <MoreHorizontal size={14} className="text-gray-400" />
                            </div>

                            <div className="px-3.5 pb-3.5 pt-1 text-[11px] text-text leading-relaxed flex flex-col gap-2.5">
                              {toggles.showTitle && (
                                <div className="font-extrabold text-xs text-text mb-0.5">
                                  🏠 [{postData.category.replace('#', '')}] <EditableText variantId={v.id} field="title" value={v.title} />
                                </div>
                              )}

                              {toggles.showDescription && (
                                <div className="whitespace-pre-wrap">
                                  <EditableText
                                    variantId={v.id}
                                    field="facebook"
                                    value={v.facebook}
                                    textarea
                                  />
                                </div>
                              )}

                              {(toggles.showAuthor || toggles.showTags) && (
                                <div className="text-[10px] text-text-muted mt-1.5 pt-1.5 border-t border-gray-100 flex flex-col gap-1.5">
                                  {toggles.showAuthor && (
                                    <div className="flex items-center gap-1 font-semibold text-gray-500">
                                      <span>🎥 {language === 'vi' ? 'Tác giả:' : 'Author:'}</span>
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
                              <div className="aspect-square w-full bg-gray-50 relative overflow-hidden border-t border-gray-100">
                                <img src={postData.imageUrl.split('\n')[0].trim()} alt="Post asset" className="w-full h-full object-cover" />
                              </div>
                            )}

                            <div className="px-1.5 py-1.5 flex border-t border-gray-100 text-[10px] text-text-muted font-bold justify-between">
                              <button className="flex-1 py-1.5 hover:bg-gray-50 rounded flex items-center justify-center gap-1 transition-colors">
                                <ThumbsUp size={11} /> {language === 'vi' ? 'Thích' : 'Like'}
                              </button>
                              <button className="flex-1 py-1.5 hover:bg-gray-50 rounded flex items-center justify-center gap-1 transition-colors">
                                <MessageSquare size={11} /> {language === 'vi' ? 'Bình luận' : 'Comment'}
                              </button>
                              <button className="flex-1 py-1.5 hover:bg-gray-50 rounded flex items-center justify-center gap-1 transition-colors">
                                <Share2 size={11} /> {language === 'vi' ? 'Chia sẻ' : 'Share'}
                              </button>
                            </div>
                          </div>
                        )}

                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {/* Add Variant Card */}
                <motion.button
                  onClick={handleAddVariant}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className="border-2 border-dashed border-gray-200 hover:border-primary/40 rounded-3xl p-8 flex flex-col items-center justify-center gap-3 bg-gray-50/20 hover:bg-primary/5 transition-all text-text-muted hover:text-primary group min-h-[300px]"
                >
                  <div className="w-12 h-12 rounded-full bg-white border border-gray-200 group-hover:border-primary/20 flex items-center justify-center shadow-sm text-text-muted group-hover:text-primary transition-all">
                    <Plus size={24} />
                  </div>
                  <div className="text-center">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider">{t('aiCreator.generateNewVariant')}</h4>
                    <p className="text-[10px] text-text-muted mt-1 max-w-[200px]">{t('aiCreator.generateNewVariantDesc')}</p>
                  </div>
                </motion.button>
              </div>

              {/* Bottom Actions Row */}
              <div className="flex items-center justify-between border-t border-gray-100 pt-6 mt-4">
                <button
                  onClick={() => changeStep(1)}
                  className="flex items-center gap-2 bg-white border border-gray-200 text-text px-5 py-3 rounded-2xl text-xs font-bold shadow-sm hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <ArrowLeft size={16} />
                  {t('aiCreator.backToIngestion')}
                </button>

                <div className="flex flex-col items-end gap-1.5">
                  {!selectedVariantId && (
                    <p className="text-[10px] text-slate-400 font-semibold animate-pulse">
                      ← Nhấn vào một biến thể để chọn
                    </p>
                  )}
                  <button
                    onClick={() => { if (selectedVariantId) changeStep(3); }}
                    disabled={!selectedVariantId}
                    className={`py-3.5 px-8 rounded-2xl font-extrabold flex items-center gap-2 transition-all text-xs ${selectedVariantId
                        ? 'bg-gradient-to-r from-primary to-primary-hover text-white shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 cursor-pointer'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                      }`}
                  >
                    {selectedVariantId ? (
                      <>
                        <CheckCircle2 size={15} />
                        {t('aiCreator.scheduleVariant', { variant: selectedVariantId })}
                        <ArrowRight size={14} />
                      </>
                    ) : (
                      <>
                        {t('aiCreator.step3')}
                        <ArrowRight size={15} />
                      </>
                    )}
                  </button>
                </div>
              </div>

            </motion.div>
          )}

          {/* STEP 3: Lên lịch đăng bài (2D Calendar Scheduler) */}
          {step === 3 && (
            <motion.div
              key="step3-scheduler"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              transition={{ duration: 0.4 }}
              className="lg:col-span-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start w-full"
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
                                    🏠 [{postData.category.replace('#', '')}] <EditableText variantId={v.id} field="title" value={v.title} />
                                  </div>
                                )}
                                {toggles.showDescription && (
                                  <div className="whitespace-pre-wrap">
                                    <EditableText variantId={v.id} field="threads" value={v.threads} textarea />
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-medium text-[8px] ml-1.5 align-middle">1/2</span>
                                  </div>
                                )}
                                {(toggles.showAuthor || toggles.showTags) && (
                                  <div className="text-[10px] text-text-muted flex flex-col gap-1 border-t border-gray-100 pt-1.5 mt-0.5">
                                    {toggles.showAuthor && (
                                      <div className="flex items-center gap-1 font-semibold text-gray-500">
                                        <span>🎥 {language === 'vi' ? 'Tác giả:' : 'Author:'}</span>
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
                                <div className="aspect-[1.91/1] w-full rounded-2xl overflow-hidden border border-gray-100 mt-1.5 shadow-sm">
                                  <img src={postData.imageUrl.split('\n')[0].trim()} alt="Threads content" className="w-full h-full object-cover" />
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
                        <div className="border border-gray-200/60 rounded-2xl overflow-hidden flex flex-col bg-white shadow-inner/5">
                          <div className="p-3.5 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-extrabold text-sm shadow-sm">
                                {v.id}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-text flex items-center gap-1">
                                  antbiz_official
                                  <span className="w-3.5 h-3.5 bg-blue-500 text-white rounded-full flex items-center justify-center text-[7px] font-bold">✓</span>
                                </span>
                                <span className="text-[9px] text-text-muted">{language === 'vi' ? 'Hồ Chí Minh' : 'Ho Chi Minh City'}</span>
                              </div>
                            </div>
                            <MoreHorizontal size={14} className="text-gray-400" />
                          </div>

                          {toggles.showImage && postData.imageUrl && (
                            <div className="aspect-square w-full bg-gray-50 relative overflow-hidden border-t border-b border-gray-100">
                              <img src={postData.imageUrl.split('\n')[0].trim()} alt="Instagram asset" className="w-full h-full object-cover" />
                            </div>
                          )}

                          <div className="px-3.5 pt-3 pb-2 flex items-center gap-4 text-text">
                            <Heart size={20} />
                            <MessageCircle size={20} />
                            <Send size={18} />
                          </div>

                          <div className="px-3.5 pb-3.5 pt-1 text-[11px] text-text leading-relaxed flex flex-col gap-1.5">
                            {toggles.showTitle && (
                              <div className="font-extrabold text-xs text-text">
                                🏠 [{postData.category.replace('#', '')}] <EditableText variantId={v.id} field="title" value={v.title} />
                              </div>
                            )}
                            {toggles.showDescription && (
                              <div className="whitespace-pre-wrap">
                                <span className="font-extrabold mr-1.5">antbiz_official</span>
                                <EditableText variantId={v.id} field="instagram" value={v.instagram} textarea />
                              </div>
                            )}
                            {toggles.showAuthor && (
                              <div className="flex items-center gap-1 font-semibold text-gray-500 mt-1">
                                <span>🎥 {language === 'vi' ? 'Tác giả:' : 'Author:'}</span>
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
                        <div className="border border-gray-200/60 rounded-2xl overflow-hidden flex flex-col bg-white shadow-inner/5">
                          <div className="p-3.5 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-extrabold text-sm shadow-sm">
                                {v.id}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-text flex items-center gap-1">
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
                                🏠 [{postData.category.replace('#', '')}] <EditableText variantId={v.id} field="title" value={v.title} />
                              </div>
                            )}
                            {toggles.showDescription && (
                              <div className="whitespace-pre-wrap">
                                <EditableText variantId={v.id} field="facebook" value={v.facebook} textarea />
                              </div>
                            )}
                            {(toggles.showAuthor || toggles.showTags) && (
                              <div className="text-[10px] text-text-muted mt-1.5 pt-1.5 border-t border-gray-100 flex flex-col gap-1.5">
                                {toggles.showAuthor && (
                                  <div className="flex items-center gap-1 font-semibold text-gray-500">
                                    <span>🎥 {language === 'vi' ? 'Tác giả:' : 'Author:'}</span>
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
                            <div className="aspect-square w-full bg-gray-50 relative overflow-hidden border-t border-gray-100">
                              <img src={postData.imageUrl.split('\n')[0].trim()} alt="Post asset" className="w-full h-full object-cover" />
                            </div>
                          )}
                        </div>
                      )}
                    </motion.div>
                  );
                })()}

                <div className="bg-white border border-gray-200 rounded-[28px] p-6 shadow-sm flex flex-col gap-5 mt-2">
                  <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                    <Calendar size={18} className="text-primary" />
                    <h3 className="text-xs font-extrabold text-text uppercase tracking-wider">
                      {t('aiCreator.scheduleTitle')}
                    </h3>
                  </div>

                  {/* Schedulers Inputs for platforms */}
                  <div className="flex flex-col gap-4">
                    {getPromptTargetPlatforms(selectedPrompt).includes('facebook') && (
                      <div className="border border-blue-100 bg-blue-50/10 rounded-2xl p-4 flex flex-col gap-4">
                        <div className="flex items-center gap-2 font-bold text-xs text-[#1877F2]">
                          <div className="w-5 h-5 rounded-full bg-[#1877F2] flex items-center justify-center text-white text-[10px]">
                            <Facebook size={10} className="fill-white" />
                          </div>
                          <span>Facebook</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <input type="date" value={facebookDate} onChange={(e) => handleFacebookDateChange(e.target.value)} className="w-full bg-white border border-[#E4E6F8] rounded-xl px-3 py-2 text-[11px] font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20" />
                          <input type="time" value={facebookTime} onChange={(e) => handleFacebookTimeChange(e.target.value)} className="w-full bg-white border border-[#E4E6F8] rounded-xl px-3 py-2 text-[11px] font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20" />
                        </div>
                        {facebookError && <div className="text-[10px] text-red-500 font-bold">⚠️ {facebookError}</div>}
                      </div>
                    )}

                    {getPromptTargetPlatforms(selectedPrompt).includes('threads') && (
                      <div className="border border-gray-200 bg-gray-50/10 rounded-2xl p-4 flex flex-col gap-4">
                        <div className="flex items-center gap-2 font-bold text-xs text-black">
                          <div className="w-5 h-5 rounded-full bg-black flex items-center justify-center text-white">
                            <ThreadsIcon size={10} />
                          </div>
                          <span>Threads</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <input type="date" value={threadsDate} onChange={(e) => handleThreadsDateChange(e.target.value)} className="w-full bg-white border border-[#E4E6F8] rounded-xl px-3 py-2 text-[11px] font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20" />
                          <input type="time" value={threadsTime} onChange={(e) => handleThreadsTimeChange(e.target.value)} className="w-full bg-white border border-[#E4E6F8] rounded-xl px-3 py-2 text-[11px] font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20" />
                        </div>
                        {threadsError && <div className="text-[10px] text-red-500 font-bold">⚠️ {threadsError}</div>}
                      </div>
                    )}

                    {getPromptTargetPlatforms(selectedPrompt).includes('instagram') && (
                      <div className="border border-pink-100 bg-pink-50/10 rounded-2xl p-4 flex flex-col gap-4">
                        <div className="flex items-center gap-2 font-bold text-xs text-pink-600">
                          <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-600 flex items-center justify-center text-white">
                            <Instagram size={10} />
                          </div>
                          <span>Instagram</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <input type="date" value={instagramDate} onChange={(e) => handleInstagramDateChange(e.target.value)} className="w-full bg-white border border-[#E4E6F8] rounded-xl px-3 py-2 text-[11px] font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20" />
                          <input type="time" value={instagramTime} onChange={(e) => handleInstagramTimeChange(e.target.value)} className="w-full bg-white border border-[#E4E6F8] rounded-xl px-3 py-2 text-[11px] font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20" />
                        </div>
                        {instagramError && <div className="text-[10px] text-red-500 font-bold">⚠️ {instagramError}</div>}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column - 2D Calendar Grid (col-span-8) */}
              <div className="lg:col-span-8 bg-white border border-gray-200 rounded-[28px] p-6 shadow-sm flex flex-col">

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
                          const platforms = getPromptTargetPlatforms(selectedPrompt);
                          if (platforms.includes('facebook')) setFacebookDate(wk.firstDate);
                          if (platforms.includes('threads')) setThreadsDate(wk.firstDate);
                          if (platforms.includes('instagram')) setInstagramDate(wk.firstDate);
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
                      <span className="text-text-muted uppercase tracking-wider text-left pl-3 flex items-center">H</span>
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

                          return cellsWithPosts.map(({ col, hr, dayDate, posts: cellPosts }, cellIdx) => {
                            const count = cellPosts.length;

                            if (count === 1) {
                              const post = cellPosts[0];
                              if (post.type === 'draft') {
                                if (post.platform === 'facebook') {
                                  return (
                                    <motion.div
                                      key={`fb-${fbResetTrigger}-${facebookDate}-${facebookTime}`}
                                      drag dragConstraints={boardRef} dragElastic={0} dragMomentum={false} onDragEnd={handleFbDragEnd}
                                      className="absolute p-1.5 rounded-xl bg-white border-2 border-[#1877F2] shadow-lg flex flex-col justify-center cursor-grab active:cursor-grabbing z-20 overflow-hidden"
                                      style={{ left: `calc(${(col * 100) / 7}% + 2px)`, top: `calc(${(hr * 100) / 24}% + 2px)`, width: `calc(${(100) / 7}% - 4px)`, height: `calc(${(100) / 24}% - 4px)` }}
                                    >
                                      <div className="flex items-center gap-1.5">
                                        <Facebook size={10} className="fill-[#1877F2] stroke-none shrink-0" />
                                        <span className="text-[8px] font-black text-[#1877F2] uppercase truncate">FB {facebookTime}</span>
                                      </div>
                                    </motion.div>
                                  );
                                } else if (post.platform === 'threads') {
                                  return (
                                    <motion.div
                                      key={`threads-${threadsResetTrigger}-${threadsDate}-${threadsTime}`}
                                      drag dragConstraints={boardRef} dragElastic={0} dragMomentum={false} onDragEnd={handleThreadsDragEnd}
                                      className="absolute p-1.5 rounded-xl bg-white border-2 border-black shadow-lg flex flex-col justify-center cursor-grab active:cursor-grabbing z-20 overflow-hidden"
                                      style={{ left: `calc(${(col * 100) / 7}% + 2px)`, top: `calc(${(hr * 100) / 24}% + 2px)`, width: `calc(${(100) / 7}% - 4px)`, height: `calc(${(100) / 24}% - 4px)` }}
                                    >
                                      <div className="flex items-center gap-1.5">
                                        <ThreadsIcon size={10} className="shrink-0" />
                                        <span className="text-[8px] font-black text-black uppercase truncate">TR {threadsTime}</span>
                                      </div>
                                    </motion.div>
                                  );
                                } else if (post.platform === 'instagram') {
                                  return (
                                    <motion.div
                                      key={`insta-${instagramResetTrigger}-${instagramDate}-${instagramTime}`}
                                      drag dragConstraints={boardRef} dragElastic={0} dragMomentum={false} onDragEnd={handleInstagramDragEnd}
                                      className="absolute p-1.5 rounded-xl bg-white border-2 border-pink-500 shadow-lg flex flex-col justify-center cursor-grab active:cursor-grabbing z-20 overflow-hidden"
                                      style={{ left: `calc(${(col * 100) / 7}% + 2px)`, top: `calc(${(hr * 100) / 24}% + 2px)`, width: `calc(${(100) / 7}% - 4px)`, height: `calc(${(100) / 24}% - 4px)` }}
                                    >
                                      <div className="flex items-center gap-1.5">
                                        <Instagram size={10} className="text-pink-600 shrink-0" />
                                        <span className="text-[8px] font-black text-pink-600 uppercase truncate">IG {instagramTime}</span>
                                      </div>
                                    </motion.div>
                                  );
                                }
                              } else {
                                // Existing post
                                return (
                                  <div
                                    key={`existing-${post.id}-${cellIdx}`}
                                    className="absolute p-1.5 rounded-xl bg-gray-50 border border-gray-200 shadow-sm flex flex-col justify-center overflow-hidden z-10 cursor-pointer hover:bg-gray-100 transition-colors"
                                    style={{ left: `calc(${(col * 100) / 7}% + 2px)`, top: `calc(${(hr * 100) / 24}% + 2px)`, width: `calc(${(100) / 7}% - 4px)`, height: `calc(${(100) / 24}% - 4px)` }}
                                    onClick={() => setSelectedCell({ dateStr: dayDate, hour: hr, posts: cellPosts })}
                                  >
                                    <div className="flex items-center gap-1 truncate">
                                      <span className="w-2.5 h-2.5 rounded bg-gray-400 text-[6px] text-white flex items-center justify-center font-bold">✓</span>
                                      <span className="text-[7.5px] font-bold text-gray-650 truncate uppercase">{post.title}</span>
                                    </div>
                                  </div>
                                );
                              }
                            } else {
                              // Multiple posts in the same cell
                              return (
                                <div
                                  key={`multiple-${dayDate}-${hr}`}
                                  onClick={() => setSelectedCell({ dateStr: dayDate, hour: hr, posts: cellPosts })}
                                  className="absolute p-1.5 rounded-xl bg-gradient-to-tr from-indigo-50 to-indigo-100/50 border border-indigo-200/80 shadow-md flex flex-col justify-between overflow-hidden cursor-pointer hover:shadow-indigo-500/10 hover:-translate-y-[0.5px] active:scale-[0.98] transition-all z-20 group"
                                  style={{ left: `calc(${(col * 100) / 7}% + 2px)`, top: `calc(${(hr * 100) / 24}% + 2px)`, width: `calc(${(100) / 7}% - 4px)`, height: `calc(${(100) / 24}% - 4px)` }}
                                >
                                  <div className="flex items-center justify-between gap-1 select-none">
                                    <span className="text-[7.5px] font-black text-indigo-700 bg-indigo-200/60 px-1.5 py-0.5 rounded-lg">
                                      {count} bài
                                    </span>
                                    <div className="flex gap-0.5 items-center">
                                      {cellPosts.map((cp: any, idx: number) => {
                                        if (cp.platform === 'facebook') {
                                          return <Facebook key={idx} size={7} className="text-[#1877F2] fill-[#1877F2]" />;
                                        } else if (cp.platform === 'threads' || cp.platform === 'thread') {
                                          return <ThreadsIcon key={idx} size={7} className="text-black" />;
                                        } else if (cp.platform === 'instagram') {
                                          return <Instagram key={idx} size={7} className="text-pink-600" />;
                                        }
                                        return null;
                                      })}
                                    </div>
                                  </div>
                                  <span className="text-[7px] text-indigo-500 font-extrabold tracking-wide uppercase select-none group-hover:text-indigo-700 truncate">
                                    {language === 'vi' ? 'Bấm để xem' : 'Click to view'}
                                  </span>
                                </div>
                              );
                            }
                            return null;
                          });
                        })()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 3 Actions */}
                <div className="flex items-center justify-between border-t border-gray-150 pt-6 mt-6">
                  <button onClick={() => changeStep(2)} className="flex items-center gap-2 bg-white border border-gray-200 text-text px-5 py-3 rounded-2xl text-xs font-bold shadow-sm hover:bg-gray-50 transition-colors cursor-pointer">
                    <ArrowLeft size={16} /> {t('aiCreator.backToAb')}
                  </button>
                  <button id="confirm-schedule-btn" onClick={handleConfirmSchedule} disabled={isSchedulingLoading || !!facebookError || !!threadsError || !!instagramError} className={`py-3.5 px-8 rounded-2xl font-extrabold shadow-lg flex items-center gap-2 transition-all hover:scale-[1.01] active:scale-95 text-xs cursor-pointer ${isSchedulingLoading ? 'bg-gray-200 text-gray-400 shadow-none' : 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-emerald-500/20'}`}>
                    {isSchedulingLoading ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                    {isSchedulingLoading ? (language === 'vi' ? 'Đang lên lịch...' : 'Scheduling...') : t('aiCreator.confirmSchedule')}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

        </div>

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
                transition={{ type: 'spring', duration: 0.5 }}
                className="bg-white rounded-[32px] border border-gray-200 shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden"
              >

                {/* Browser Header Bar */}
                <div className="bg-gray-100 border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0 gap-4">

                  {/* Browser controls */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={handleIframeBack}
                      className="w-8 h-8 rounded-full bg-white hover:bg-gray-200 border border-gray-300 flex items-center justify-center text-text-muted transition-colors cursor-pointer"
                    >
                      <ArrowLeft size={14} />
                    </button>
                    <button
                      onClick={handleRefresh}
                      className="w-8 h-8 rounded-full bg-white hover:bg-gray-200 border border-gray-300 flex items-center justify-center text-text-muted transition-colors cursor-pointer"
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
                    className="w-8 h-8 rounded-full bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center transition-colors cursor-pointer"
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
                className="bg-white rounded-[32px] border border-gray-200 shadow-2xl p-8 max-w-md w-full text-center flex flex-col items-center gap-5"
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

                <div className="bg-[#F8FAFC] border border-gray-150 rounded-2xl p-4 w-full text-left flex flex-col gap-3 font-sans">
                  <div className="text-[10px] font-extrabold text-text-muted uppercase tracking-wider font-sans">
                    {language === 'vi' ? 'Thông tin xuất bản' : 'Publication details'}
                  </div>

                  <div className="text-xs font-bold text-text truncate border-b border-gray-100 pb-2 font-sans">
                    {postData.title}
                  </div>

                  <div className="flex flex-col gap-2.5 font-sans">
                    {getPromptTargetPlatforms(selectedPrompt).includes('facebook') && (
                      <div className="flex items-center justify-between text-xs font-sans">
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-600 text-[10px] font-bold">Facebook</span>
                        <span className="font-semibold text-text-muted">{facebookDate} @ {facebookTime}</span>
                      </div>
                    )}

                    {getPromptTargetPlatforms(selectedPrompt).includes('threads') && (
                      <div className="flex items-center justify-between text-xs font-sans">
                        <span className="px-2 py-0.5 rounded bg-gray-100 text-text text-[10px] font-bold">Threads</span>
                        <span className="font-semibold text-text-muted">{threadsDate} @ {threadsTime}</span>
                      </div>
                    )}

                    {getPromptTargetPlatforms(selectedPrompt).includes('instagram') && (
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
                className="bg-white rounded-[28px] border border-gray-200 shadow-2xl p-6 max-w-md w-full flex flex-col gap-4"
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
                      platBg = 'bg-blue-50 text-[#1877F2] border-blue-100/60';
                    } else if (post.platform === 'threads' || post.platform === 'thread') {
                      platIcon = <ThreadsIcon size={11} className="text-black" />;
                      platLabel = 'Threads';
                      platBg = 'bg-slate-50 text-slate-900 border-slate-200/65';
                    } else if (post.platform === 'instagram') {
                      platIcon = <Instagram size={11} className="text-pink-650" />;
                      platLabel = 'Instagram';
                      platBg = 'bg-pink-50 text-pink-650 border-pink-100/60';
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
                className="bg-white rounded-[28px] border border-gray-200 shadow-2xl p-6 max-w-lg w-full flex flex-col gap-4 max-h-[80vh]"
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
                    className="w-full bg-[#F8F9FE] border border-[#E4E6F8] rounded-full py-2.5 pl-10 pr-4 text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-semibold"
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
                            generateVariants(postData, p);
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

        {/* ═══════════════════════════════════════════════════════════════
          AI PROMPT CONFIGURATION DIALOG
          Compact bar click → tabbed modal: Editor + Sinh Prompt bằng mẫu
      ═══════════════════════════════════════════════════════════════ */}
        <AnimatePresence>
          {isAiPromptDialogOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 font-sans"
              onClick={(e) => { if (e.target === e.currentTarget) setIsAiPromptDialogOpen(false); }}
            >
              <motion.div
                initial={{ scale: 0.96, y: 20, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.96, y: 20, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="bg-white rounded-[32px] border border-gray-200 shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
              >
                {/* Dialog Header */}
                <div className="bg-gradient-to-r from-primary/5 to-violet-500/5 border-b border-gray-100 px-7 py-5 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                      <Sparkles size={20} />
                    </div>
                    <div>
                      <h2 className="text-base font-black text-slate-800">Cấu hình AI Prompt &amp; Nội dung</h2>
                      <p className="text-[11px] text-slate-500 font-semibold mt-0.5">Tùy chỉnh câu lệnh AI và sinh nội dung theo ý muốn</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAiPromptDialogOpen(false)}
                    className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition-colors cursor-pointer border-none"
                  >
                    <X size={17} />
                  </button>
                </div>

                {/* Tab Bar */}
                <div className="flex border-b border-gray-100 px-7 shrink-0 bg-gray-50/60">
                  {[
                    { key: 'editor' as const, label: 'AI Prompt Editor', icon: Wand2 },
                    { key: 'generator' as const, label: 'Sinh Prompt bằng mẫu', icon: Sparkles }
                  ].map(({ key, label, icon: Icon }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setActiveAiTab(key)}
                      className={`flex items-center gap-1.5 px-5 py-3.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all -mb-px cursor-pointer ${activeAiTab === key ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                    >
                      <Icon size={13} />
                      {label}
                    </button>
                  ))}
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto px-7 py-6 flex flex-col gap-5 custom-scrollbar">
                  {activeAiTab === 'editor' ? (
                    <>
                      {/* Platform selector */}
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Nền tảng mạng xã hội</label>
                        <div className="flex items-center gap-1.5 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/60 w-fit">
                          {(['facebook', 'threads', 'instagram'] as const).map((p) => (
                            <button key={p} type="button" onClick={() => setPromptPlatform(p)}
                              className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${promptPlatform === p ? 'bg-white text-primary shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-800'
                                }`}>
                              {p}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Custom prompt title */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tên Prompt (tùy chọn)</label>
                        <input type="text" value={customPromptTitle} onChange={(e) => setCustomPromptTitle(e.target.value)}
                          placeholder="Đặt tên cho Prompt này..."
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all font-semibold placeholder:text-slate-400"
                        />
                      </div>

                      {/* Textarea for prompt */}
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Nội dung Prompt</label>
                          <button type="button" onClick={handleGenerateSmartPrompt} disabled={isGeneratingSmartPrompt || isGenerating}
                            className="flex items-center gap-1.5 bg-primary/10 hover:bg-primary/20 disabled:opacity-40 text-primary text-[10px] font-black px-3 py-1.5 rounded-xl transition-all border border-primary/15 cursor-pointer">
                            <RefreshCw size={11} className={isGeneratingSmartPrompt ? 'animate-spin' : ''} />
                            Tạo Prompt thông minh
                          </button>
                        </div>
                        <textarea value={activePrompt} onChange={(e) => setActivePrompt(e.target.value)}
                          placeholder="Nhập câu lệnh hướng dẫn AI tạo nội dung..." rows={16}
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm text-slate-700 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/30 resize-none leading-relaxed transition-all placeholder:text-slate-400 font-medium custom-scrollbar"
                        />
                      </div>
                    </>
                  ) : (
                    /* ─── TAB 2: SINH PROMPT BẰNG MẪU (Thư viện) ─── */
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center gap-3 bg-primary/5 border border-primary/15 rounded-2xl px-4 py-3">
                        <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center text-primary shrink-0">
                          <Layers size={15} />
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-800">Thư viện Prompt mẫu</p>
                          <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Chọn một prompt để tự động điền vào Tab Editor</p>
                        </div>
                      </div>

                      {/* Search */}
                      <div className="relative">
                        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input type="text" value={promptSearch} onChange={(e) => setPromptSearch(e.target.value)}
                          placeholder="Tìm theo tên hoặc nội dung..."
                          className="w-full bg-slate-50 border border-slate-200 rounded-full py-3 pl-10 pr-4 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-semibold placeholder:text-slate-400"
                        />
                      </div>

                      {/* Library Results as cards */}
                      <div className="flex flex-col gap-2.5 max-h-[420px] overflow-y-auto custom-scrollbar pr-1">
                        {loadingPrompts ? (
                          <div className="flex items-center justify-center py-12 text-xs text-slate-400 gap-2">
                            <Loader2 size={16} className="animate-spin text-primary" /> Đang tải thư viện...
                          </div>
                        ) : filteredPromptsForModal.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-12 gap-2">
                            <Layers size={24} className="text-slate-200" />
                            <p className="text-xs text-slate-400 font-semibold">Không tìm thấy prompt nào</p>
                          </div>
                        ) : (
                          filteredPromptsForModal.map((p) => {
                            const isSel = selectedPrompt?.id === p.id;
                            return (
                              <button key={p.id} type="button"
                                onClick={() => {
                                  setCustomPromptTitle(p.name);
                                  setActivePrompt(p.content);
                                  setSelectedPrompt(p);
                                  setPromptPlatform(p.platform as 'facebook' | 'threads' | 'instagram' || 'facebook');
                                }}
                                className={`text-left p-4 rounded-2xl border-2 transition-all flex flex-col gap-2 cursor-pointer ${isSel
                                    ? 'border-primary bg-primary/5 shadow-md shadow-primary/10'
                                    : 'border-slate-100 bg-white hover:bg-slate-50 hover:border-slate-300 hover:shadow-sm'
                                  }`}>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    {isSel && <Check size={13} className="text-primary shrink-0" />}
                                    <span className="text-sm font-extrabold text-slate-800 truncate max-w-[60%]">{p.name}</span>
                                  </div>
                                  <span className={`text-[9px] font-black px-2.5 py-1 rounded-xl uppercase ${p.platform === 'facebook' ? 'bg-blue-100 text-blue-700' :
                                      p.platform === 'threads' ? 'bg-slate-100 text-slate-700' :
                                        'bg-pink-100 text-pink-700'
                                    }`}>{p.platform}</span>
                                </div>
                                <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed font-medium">"{p.content}"</p>
                                {isSel && (
                                  <div className="flex items-center gap-1.5 text-[9px] text-primary font-black uppercase tracking-wider">
                                    <CheckCircle2 size={10} />
                                    Đã điền vào Tab Editor
                                  </div>
                                )}
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Dialog Footer */}
                <div className="bg-slate-50/80 border-t border-slate-200 px-7 py-4 flex items-center justify-between shrink-0">
                  <button type="button" onClick={() => setIsAiPromptDialogOpen(false)}
                    className="bg-white border border-slate-200 text-slate-700 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-50 transition-colors cursor-pointer">
                    Đóng
                  </button>

                  {activeAiTab === 'editor' ? (
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => {
                        if (!activePrompt) return;
                        const finalTitle = customPromptTitle.trim() || `Custom Prompt ${new Date().toLocaleDateString('vi-VN')}`;
                        const newPrompt = { id: selectedPrompt?.id || `custom-${Date.now()}`, name: finalTitle, content: activePrompt, platform: promptPlatform };
                        setSelectedPrompt(newPrompt);
                        generateVariants(postData, newPrompt);
                        setIsAiPromptDialogOpen(false);
                      }} disabled={!activePrompt}
                        className="bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-50 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer border-none">
                        Chỉ sử dụng
                      </button>

                      <button type="button" onClick={async () => {
                        if (!activePrompt) return;
                        const savedPrompt = await handleSaveCurrentPrompt();
                        const finalTitle = customPromptTitle.trim() || `AI Generated - ${new Date().toLocaleDateString('vi-VN')}`;
                        const newPrompt = savedPrompt || { id: selectedPrompt?.id || `custom-${Date.now()}`, name: finalTitle, content: activePrompt, platform: promptPlatform };
                        setSelectedPrompt(newPrompt);
                        generateVariants(postData, newPrompt);
                        setIsAiPromptDialogOpen(false);
                      }} disabled={!activePrompt || isSavingPrompt}
                        className="bg-primary hover:bg-primary/90 disabled:opacity-50 text-white px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-primary/20 transition-all cursor-pointer border-none flex items-center gap-2">
                        {isSavingPrompt && <Loader2 size={14} className="animate-spin" />}
                        Lưu &amp; Sử dụng Prompt
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => {
                      if (selectedPrompt) {
                        generateVariants(postData, selectedPrompt);
                        setIsAiPromptDialogOpen(false);
                      }
                    }} disabled={!selectedPrompt}
                      className="bg-primary hover:bg-primary-hover disabled:opacity-50 text-white px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-primary/20 transition-all cursor-pointer border-none">
                      Dùng Prompt này &amp; Sinh bài
                    </button>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <PopupDialog
          isOpen={!!popup?.isOpen}
          message={popup?.message || ''}
          type={popup?.type || 'info'}
          onClose={() => setPopup(null)}
        />

      </div>
    </EditableTextContext.Provider>
  );
}


