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
  Wand2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import PromptSuggestionSection from '../PromptSuggestionSection';


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
  title: string;
  author: string;
  tags: string;
}

export default function AiCreatorView() {
  const { t, language } = useLanguage();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  
  // AI Generation States
  const [articleId, setArticleId] = useState<string | null>(null);
  const [promptPlatform, setPromptPlatform] = useState<'facebook' | 'thread' | 'instagram' | 'threads'>('facebook');
  const [activePrompt, setActivePrompt] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingSmartPrompt, setIsGeneratingSmartPrompt] = useState(false);
  const [isSavingPrompt, setIsSavingPrompt] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [lastGeneratedAiContent, setLastGeneratedAiContent] = useState<string | null>(null);

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
    if (!postData.title || !postData.description) return;
    setIsGeneratingSmartPrompt(true);
    try {
      const res = await fetch('/api/prompts/generate-smart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: postData.title,
          content: postData.description,
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
          content: postData.description,
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
    if (!activePrompt) return;
    setIsSavingPrompt(true);
    setSaveSuccess(false);
    try {
      const res = await fetch('/api/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `AI Generated - ${new Date().toLocaleDateString()}`,
          content: activePrompt,
          platform: selectedPlatform,
          tags: ['AI Generated', selectedPlatform]
        }),
      });
      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        // Refresh prompt list
        const listRes = await fetch('/api/prompts?pageSize=100');
        if (listRes.ok) {
          const json = await listRes.json();
          setPromptsList(json.data || []);
        }
      }
    } catch (error) {
      console.error('Error saving prompt:', error);
    } finally {
      setIsSavingPrompt(false);
    }
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


  const [facebookDate, setFacebookDate] = useState<string>("2026-06-19");
  const [facebookTime, setFacebookTime] = useState<string>("20:00");
  const [threadsDate, setThreadsDate] = useState<string>("2026-06-19");
  const [threadsTime, setThreadsTime] = useState<string>("18:00");
  const [instagramDate, setInstagramDate] = useState<string>("2026-06-19");
  const [instagramTime, setInstagramTime] = useState<string>("12:00");
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



  const existingPosts: Array<{ date: string; hour: number; title: string; category: string }> = [];

  const isCellOccupied = (dateStr: string, hour: number) => {
    return existingPosts.some(p => p.date === dateStr && p.hour === hour);
  };

  const weekDays = Array.from({ length: 21 }, (_, index) => {
    const start = new Date(2026, 5, 15); // June 15, 2026 (Mon)
    start.setDate(start.getDate() + index);
    const dateStr = start.toISOString().split('T')[0];

    const daysNameMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const name = daysNameMap[start.getDay()];
    const label = start.getDate().toString();
    const isToday = dateStr === '2026-06-17';

    return { name, date: dateStr, label, isToday };
  });

  const handleFacebookDateChange = (val: string) => {
    const activeHour = parseInt(facebookTime.split(':')[0]) || 16;
    if (isCellOccupied(val, activeHour)) {
      setFacebookError(language === 'vi' ? `Lịch bị cản trở! Ô lúc ${activeHour}:00 ngày ${val} đã có bài.` : `Slot blocked! A post is already scheduled at ${activeHour}:00 on ${val}.`);
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
    const hour = parseInt(val.split(':')[0]) || 16;
    const clampedHour = Math.max(16, Math.min(23, hour));
    const clampedTime = `${clampedHour.toString().padStart(2, '0')}:00`;

    if (isCellOccupied(facebookDate, clampedHour)) {
      setFacebookError(language === 'vi' ? `Lịch bị cản trở! Ô lúc ${clampedTime} ngày ${facebookDate} đã có bài.` : `Slot blocked! A post is already scheduled at ${clampedTime} on ${facebookDate}.`);
    } else {
      setFacebookError("");
      setFacebookTime(clampedTime);
    }
  };

  const handleThreadsDateChange = (val: string) => {
    const activeHour = parseInt(threadsTime.split(':')[0]) || 16;
    if (isCellOccupied(val, activeHour)) {
      setThreadsError(language === 'vi' ? `Lịch bị cản trở! Ô lúc ${activeHour}:00 ngày ${val} đã có bài.` : `Slot blocked! A post is already scheduled at ${activeHour}:00 on ${val}.`);
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
    const hour = parseInt(val.split(':')[0]) || 16;
    const clampedHour = Math.max(16, Math.min(23, hour));
    const clampedTime = `${clampedHour.toString().padStart(2, '0')}:00`;

    if (isCellOccupied(threadsDate, clampedHour)) {
      setThreadsError(language === 'vi' ? `Lịch bị cản trở! Ô lúc ${clampedTime} ngày ${threadsDate} đã có bài.` : `Slot blocked! A post is already scheduled at ${clampedTime} on ${threadsDate}.`);
    } else {
      setThreadsError("");
      setThreadsTime(clampedTime);
    }
  };

  const handleFacebookDragError = (blockedDate: string, hour: number) => {
    const timeStr = `${hour.toString().padStart(2, '0')}:00`;
    setFacebookError(
      language === 'vi'
        ? `Lịch bị cản trở! Ô lúc ${timeStr} ngày ${blockedDate} đã có bài.`
        : `Slot blocked! A post is already scheduled at ${timeStr} on ${blockedDate}.`
    );
    setTimeout(() => setFacebookError(""), 4500);
  };

  const handleThreadsDragError = (blockedDate: string, hour: number) => {
    const timeStr = `${hour.toString().padStart(2, '0')}:00`;
    setThreadsError(
      language === 'vi'
        ? `Lịch bị cản trở! Ô lúc ${timeStr} ngày ${blockedDate} đã có bài.`
        : `Slot blocked! A post is already scheduled at ${timeStr} on ${blockedDate}.`
    );
    setTimeout(() => setThreadsError(""), 4500);
  };

  const handleFbDragEnd = (event: any, info: any) => {
    if (!boardRef.current) return;
    const rect = boardRef.current.getBoundingClientRect();
    const x = info.point.x - rect.left;
    const y = info.point.y - rect.top;

    const col = Math.floor(x / (rect.width / 7));
    const row = Math.floor(y / (rect.height / 8));

    const clampedCol = Math.max(0, Math.min(6, col));
    const clampedRow = Math.max(0, Math.min(7, row));

    const targetDate = weekDays[activeWeek * 7 + clampedCol].date;
    const targetHour = 16 + clampedRow;

    // Check occupancy against existing posts AND threads active post AND instagram active post
    const threadsHour = parseInt(threadsTime.split(':')[0]) || 18;
    const instagramHour = parseInt(instagramTime.split(':')[0]) || 12;
    const targetPlatforms = getPromptTargetPlatforms(selectedPrompt);

    const isOccupied = isCellOccupied(targetDate, targetHour) ||
      (targetPlatforms.includes('threads') && targetDate === threadsDate && targetHour === threadsHour) ||
      (targetPlatforms.includes('instagram') && targetDate === instagramDate && targetHour === instagramHour);

    if (isOccupied) {
      handleFacebookDragError(targetDate, targetHour);
      setFbResetTrigger(prev => prev + 1);
    } else {
      setFacebookError("");
      setFacebookDate(targetDate);
      setFacebookTime(`${targetHour.toString().padStart(2, '0')}:00`);
    }
  };

  const handleThreadsDragEnd = (event: any, info: any) => {
    if (!boardRef.current) return;
    const rect = boardRef.current.getBoundingClientRect();
    const x = info.point.x - rect.left;
    const y = info.point.y - rect.top;

    const col = Math.floor(x / (rect.width / 7));
    const row = Math.floor(y / (rect.height / 8));

    const clampedCol = Math.max(0, Math.min(6, col));
    const clampedRow = Math.max(0, Math.min(7, row));

    const targetDate = weekDays[activeWeek * 7 + clampedCol].date;
    const targetHour = 16 + clampedRow;

    // Check occupancy against existing posts AND facebook active post AND instagram active post
    const facebookHour = parseInt(facebookTime.split(':')[0]) || 20;
    const instagramHour = parseInt(instagramTime.split(':')[0]) || 12;
    const targetPlatforms = getPromptTargetPlatforms(selectedPrompt);

    const isOccupied = isCellOccupied(targetDate, targetHour) ||
      (targetPlatforms.includes('facebook') && targetDate === facebookDate && targetHour === facebookHour) ||
      (targetPlatforms.includes('instagram') && targetDate === instagramDate && targetHour === instagramHour);

    if (isOccupied) {
      handleThreadsDragError(targetDate, targetHour);
      setThreadsResetTrigger(prev => prev + 1);
    } else {
      setThreadsError("");
      setThreadsDate(targetDate);
      setThreadsTime(`${targetHour.toString().padStart(2, '0')}:00`);
    }
  };

  const handleInstagramDateChange = (val: string) => {
    const activeHour = parseInt(instagramTime.split(':')[0]) || 12;
    if (isCellOccupied(val, activeHour)) {
      setInstagramError(language === 'vi' ? `Lịch bị cản trở! Ô lúc ${activeHour}:00 ngày ${val} đã có bài.` : `Slot blocked! A post is already scheduled at ${activeHour}:00 on ${val}.`);
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
    const hour = parseInt(val.split(':')[0]) || 12;
    const clampedHour = Math.max(16, Math.min(23, hour));
    const clampedTime = `${clampedHour.toString().padStart(2, '0')}:00`;

    if (isCellOccupied(instagramDate, clampedHour)) {
      setInstagramError(language === 'vi' ? `Lịch bị cản trở! Ô lúc ${clampedTime} ngày ${instagramDate} đã có bài.` : `Slot blocked! A post is already scheduled at ${clampedTime} on ${instagramDate}.`);
    } else {
      setInstagramError("");
      setInstagramTime(clampedTime);
    }
  };

  const handleInstagramDragError = (blockedDate: string, hour: number) => {
    const timeStr = `${hour.toString().padStart(2, '0')}:00`;
    setInstagramError(
      language === 'vi'
        ? `Lịch bị cản trở! Ô lúc ${timeStr} ngày ${blockedDate} đã có bài.`
        : `Slot blocked! A post is already scheduled at ${timeStr} on ${blockedDate}.`
    );
    setTimeout(() => setInstagramError(""), 4500);
  };

  const handleInstagramDragEnd = (event: any, info: any) => {
    if (!boardRef.current) return;
    const rect = boardRef.current.getBoundingClientRect();
    const x = info.point.x - rect.left;
    const y = info.point.y - rect.top;

    const col = Math.floor(x / (rect.width / 7));
    const row = Math.floor(y / (rect.height / 8));

    const clampedCol = Math.max(0, Math.min(6, col));
    const clampedRow = Math.max(0, Math.min(7, row));

    const targetDate = weekDays[activeWeek * 7 + clampedCol].date;
    const targetHour = 16 + clampedRow;

    // Check occupancy against existing posts, Facebook active post and Threads active post
    const targetPlatforms = getPromptTargetPlatforms(selectedPrompt);
    const facebookHour = parseInt(facebookTime.split(':')[0]) || 20;
    const threadsHour = parseInt(threadsTime.split(':')[0]) || 18;
    const isOccupied = isCellOccupied(targetDate, targetHour) ||
      (targetPlatforms.includes('facebook') && targetDate === facebookDate && targetHour === facebookHour) ||
      (targetPlatforms.includes('threads') && targetDate === threadsDate && targetHour === threadsHour);

    if (isOccupied) {
      handleInstagramDragError(targetDate, targetHour);
      setInstagramResetTrigger(prev => prev + 1);
    } else {
      setInstagramError("");
      setInstagramDate(targetDate);
      setInstagramTime(`${targetHour.toString().padStart(2, '0')}:00`);
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
                setCaptionId(parsed.captionId);
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

  // State for Social Media Variants (A/B Test copies)
  const [variants, setVariants] = useState<SocialVariant[]>([
    {
      id: 'A',
      facebook: `Bộ Tư lệnh TPHCM phối hợp các đơn vị chuyên môn, nhóm nghiên cứu và nhân chứng lịch sử triển khai khảo sát tại Công viên Lê Thị Riêng (phường Hòa Hưng, TPHCM) nhằm xác định các khu vực nghi có hố chôn tập thể liệt sĩ, phục vụ công tác tìm kiếm, quy tập hài cốt.\n\nĐợt khảo sát diễn ra từ ngày 15 đến 18/6, là bước tiếp theo sau quá trình nhiều năm thu thập tư liệu lịch sử, đối chiếu không ảnh và khảo sát thực địa liên quan đến khu vực được cho là nơi chôn cất các liệt sĩ hy sinh trong cuộc Tổng tiến công và nổi dậy Xuân Mậu Thân 1968.`,
      threads: `Choi Won Jun, 33 tuổi, quê ở Jeju, Hàn Quốc. Năm 2009, bố anh sang Việt Nam công tác nên đưa con theo cùng. Jun được học lớp 11 và 12 ở TP HCM.\n\nHoàn thành cấp 3, Jun về Hàn Quốc đi nghĩa vụ quân sự, học đại học và làm việc trong một công ty bất động sản ở Seoul. Sau 6 năm, anh trở thành trưởng phòng với mức lương nhiều người ao ước.\n\n"Nhưng tôi không thấy hạnh phúc, mỗi ngày như một vòng lặp tẻ nhạt", anh nói.`,
      instagram: `Hành trình tích lũy 10 năm mua vàng của một gia đình trẻ mua nhà từ những chỉ số tích lũy đơn giản nhất. Hãy đọc ngay kinh nghiệm này!`,
      title: '10 năm mua vàng và hành trình thoát cảnh ở trọ',
      author: 'Linh Trang',
      tags: '#Tiết kiệm tài chính #Mua nhà #Cuộc sống đô thị #Đầu tư'
    },
    {
      id: 'B',
      facebook: `Quyết định mua vàng tích lũy thay vì gửi tiết kiệm, liệu có đúng đắn? Câu chuyện thực tế của anh H. đứng giữa căn hộ 2 phòng ngủ trống huơ trống hoác, chưa có lấy một món nội thất nào ra hồn, tài khoản ngân hàng thì báo số dư gần như cạn kiệt, anh Phạm Quang H. lại thấy lòng mình nhẹ nhõm đến lạ.`,
      threads: `Scale your content publishing effortlessly with AntBiz. Our AI-driven content generation and multi-channel scheduler automate your workflows. Connect your ecommerce or blog directly and start scaling today!`,
      instagram: `Từng bước thoát khỏi cuộc sống ở trọ sau 10 năm tích góp. Một câu chuyện đáng học hỏi và suy ngẫm cho các gia đình trẻ hiện nay.`,
      title: '10 năm mua vàng và hành trình thoát cảnh ở trọ',
      author: 'Linh Trang',
      tags: '#Tiết kiệm tài chính #Mua nhà #Cuộc sống đô thị #Đầu tư'
    }
  ]);

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

  // Helper to generate platform-specific mock content
  const generatePlatformContent = (platform: 'facebook' | 'threads' | 'instagram', prompt: any, data: typeof postData, isVariantB: boolean = false) => {
    const promptStyle = prompt ? `[Prompt: ${prompt.name}] ` : "";
    const categoryClean = (data.category || '').replace('#', '');

    if (platform === 'facebook') {
      if (isVariantB) {
        return `🔥 [A/B Test Variant B] ${data.title}\n\n${data.description}\n\n#AntBiz #SocialMedia`;
      }
      if (prompt) {
        return `📱 ${promptStyle}\n🏠 [${categoryClean}] ${data.title}\n\n${data.description}\n\n👉 Chi tiết hành trình được chia sẻ bởi tác giả ${data.author}. Đọc thêm dưới phần bình luận! ${data.tags}`;
      }
      return `🏠 [${categoryClean}] ${data.title}\n\n"${data.description}"\n\nMột câu chuyện đầy cảm hứng từ tác giả ${data.author}. Hãy đọc ngay hành trình chi tiết để có thêm kinh nghiệm tích lũy!`;
    }

    if (platform === 'threads') {
      if (isVariantB) {
        return `🧵 [A/B Test Variant B] ${data.title}\n\n${data.description}\n\n#AntBiz`;
      }
      if (prompt) {
        return `🧵 ${promptStyle}\n🏠 [${categoryClean}] ${data.title}\n\n${data.description}\n\nTác giả: ${data.author} ${data.tags}`;
      }
      return `Choi Won Jun, 33 tuổi, quê ở Jeju, Hàn Quốc. Năm 2009, bố anh sang Việt Nam công tác nên đưa con theo cùng.\n\nHoàn thành cấp 3, Jun về Hàn Quốc học đại học và làm việc trong một công ty bất động sản ở Seoul. Sau 6 năm, anh trở thành trưởng phòng với mức lương nhiều người ao ước. "Nhưng tôi không thấy hạnh phúc, mỗi ngày như một vòng lặp tẻ nhạt", anh nói.`;
    }

    if (platform === 'instagram') {
      if (isVariantB) {
        return `📸 [A/B Test Variant B] ${data.title}\n\n${data.description}\n\n#AntBiz`;
      }
      if (prompt) {
        return `📸 ${promptStyle}\n🏠 [${categoryClean}] ${data.title}\n\n${data.description}\n\n📸 Photo by: ${data.author}\n\n${data.tags}`;
      }
      return `📸 [${categoryClean}] ${data.title}\n\n"${data.description}"\n\nChia sẻ bởi tác giả ${data.author}.\n\n${data.tags}`;
    }

    return "";
  };

  // Helper to generate new variants with prompt-platform filtering constraints
  const generateVariants = (data: typeof postData, prompt: any) => {
    const targetPlatforms = getPromptTargetPlatforms(prompt);
    const tagsStr = data.tags.split(',').map((t: string) => '#' + t.trim().replace('#', '')).join(' ');

    const newVariants: SocialVariant[] = [
      {
        id: 'A',
        facebook: targetPlatforms.includes('facebook') ? generatePlatformContent('facebook', prompt, data, false) : "",
        threads: targetPlatforms.includes('threads') ? generatePlatformContent('threads', prompt, data, false) : "",
        instagram: targetPlatforms.includes('instagram') ? generatePlatformContent('instagram', prompt, data, false) : "",
        title: data.title,
        author: data.author,
        tags: tagsStr
      },
      {
        id: 'B',
        facebook: targetPlatforms.includes('facebook') ? generatePlatformContent('facebook', prompt, data, true) : "",
        threads: targetPlatforms.includes('threads') ? generatePlatformContent('threads', prompt, data, true) : "",
        instagram: targetPlatforms.includes('instagram') ? generatePlatformContent('instagram', prompt, data, true) : "",
        title: data.title,
        author: data.author,
        tags: tagsStr
      }
    ];

    setVariants(newVariants);

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
            full_text: data.description || ''
          };
          setPostData(updatedPostData);
          const defaultPrompt = getDefaultPromptTemplate(selectedPlatform, updatedPostData.title, updatedPostData.description);
          setActivePrompt(defaultPrompt);
          generateVariants(updatedPostData, selectedPrompt);
          setIsFetching(false);
          return;
        }
      }
    } catch (e) {
      console.error("Scraper fetch error:", e);
    }

    // Fallback if live scrape fails
    setTimeout(() => {
      const updatedPostData = {
        title: 'Cơn sốt đất nền vùng ven và bài học đắt giá',
        category: '#Bất động sản',
        description: 'Những lô đất từng được định giá hàng tỷ đồng nay nằm phơi sương không người hỏi mua. Bài học về đòn bẩy tài chính và tâm lý đám đông.',
        author: 'Nguyễn Văn Nam',
        published_at: '17/06/2026 09:30',
        views: '12.4K lượt xem',
        tags: '#Đất nền, #Sốt đất, #Tài chính cá nhân, #Rủi ro',
        imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80',
        full_text: 'Toàn cảnh cơn sốt đất nền và bài học thức tỉnh nhà đầu tư cá nhân...'
      };
      setPostData(updatedPostData);
      const defaultPrompt = getDefaultPromptTemplate(selectedPlatform, updatedPostData.title, updatedPostData.description);
      setActivePrompt(defaultPrompt);
      generateVariants(updatedPostData, selectedPrompt);
      setIsFetching(false);
    }, 1200);
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
  };

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
            full_text: data.description || ''
          };
          setPostData(updatedPostData);
          setUrl(explorerUrl);
          generateVariants(updatedPostData, selectedPrompt);
          setIsExplorerOpen(false);
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

  // Inline editable wrapper component that prevents layout shifts
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
    const isEditing = editState?.variantId === variantId && editState?.field === field;
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
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
        <span className="whitespace-pre-wrap">{value || <span className="text-gray-300 italic">Nhấp để chỉnh sửa...</span>}</span>
        <span className="absolute right-1 top-1 opacity-0 group-hover:opacity-40 transition-opacity">
          <Edit2 size={10} className="text-primary" />
        </span>
      </div>
    );
  };

  const handleConfirmSchedule = async () => {
    // Không thực hiện lên lịch nếu có lỗi xảy ra đối với ngày/giờ Facebook hoặc Threads
    if (facebookError || threadsError) return;

    // Yêu cầu người dùng phải tạo nội dung caption trước
    if (!captionId) {
      setSchedulingError('Vui lòng tạo caption bằng AI ở Bước 1 trước khi thực hiện lên lịch.');
      return;
    }

    const scheduledAt = new Date(`${facebookDate}T${facebookTime}`);

    // Đảm bảo thời gian lên lịch phải ở tương lai so với thời điểm hiện tại
    if (scheduledAt.getTime() <= Date.now()) {
      setFacebookError('Thời gian lên lịch đăng bài bắt buộc phải ở tương lai.');
      return;
    }

    setIsSchedulingLoading(true);
    setSchedulingError(null);

    // Tách các đường dẫn hình ảnh theo từng dòng
    const imageUrls = postData.imageUrl
      ? postData.imageUrl.split('\n').map(line => line.trim()).filter(Boolean)
      : [];

    try {
      // Gửi yêu cầu lên lịch bài viết đến hệ thống backend
      const res = await fetch('/api/scheduled-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          captionId,
          scheduledAt: scheduledAt.toISOString(),
          imageUrls,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(errData.error || `Lỗi từ hệ thống HTTP ${res.status}`);
      }

      setIsScheduled(true);
    } catch (err: any) {
      setSchedulingError(err.message || 'Lỗi xảy ra trong quá trình lên lịch bài đăng');
    } finally {
      setIsSchedulingLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full font-sans">

      {/* Top Header Row */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mt-2">
        <div>
          <h1 className="text-3xl font-bold text-text tracking-tight">{t('aiCreator.title')}</h1>
          <p className="text-sm text-text-muted mt-1">{t('aiCreator.subtitle')}</p>
        </div>

        {/* Step Indicator Wizard */}
        <div className="flex items-center gap-2 bg-sidebar rounded-2xl p-1.5 border border-gray-200/50 shadow-sm">
          <button
            onClick={() => setStep(1)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-300 ${step === 1 ? 'bg-primary text-white shadow-sm' : 'text-text-muted hover:text-text'
              }`}
          >
            <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">1</span>
            {t('aiCreator.step1')}
          </button>
          <button
            onClick={() => setStep(2)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-300 ${step === 2 ? 'bg-primary text-white shadow-sm' : 'text-text-muted hover:text-text'
              }`}
          >
            <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">2</span>
            {t('aiCreator.step2')}
          </button>
          <button
            onClick={() => setStep(3)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-300 ${step === 3 ? 'bg-primary text-white shadow-sm' : 'text-text-muted hover:text-text'
              }`}
          >
            <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">3</span>
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

            {/* AI Prompt Editor Section */}
            <div className="bg-white border border-gray-200/80 rounded-[28px] p-8 flex flex-col gap-6 shadow-sm">
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
                          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                            promptPlatform === p 
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
            {/* ── AI Caption Generator Panel (T-1.12.3 / T-1.12.4 / T-1.12.5) ── */}
            <div className="bg-gradient-to-br from-[#EEF2FF] to-[#F5F3FF] border border-[#C7D2FE] rounded-[28px] p-6 flex flex-col gap-4 shadow-sm relative overflow-hidden">
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
                    value={postData.description}
                    onChange={(e) => setPostData({ ...postData, description: e.target.value })}
                    rows={3}
                    className="w-full bg-[#F8F9FE] border border-[#E4E6F8] rounded-xl px-4 py-3 text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none leading-relaxed transition-all"
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
            className={`lg:col-span-4 flex flex-col gap-6 sticky top-6 ${step === 1 ? 'order-2' : 'order-1'
              }`}
          >
            {/* Article Live Preview Card */}
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

              <div className="border border-gray-100 rounded-3xl overflow-hidden shadow-sm flex flex-col bg-white">
                <div className="h-44 bg-gray-100 relative">
                  {postData.imageUrl ? (
                    <img
                      src={postData.imageUrl.split('\n')[0].trim()}
                      alt={postData.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-tr from-indigo-500 to-purple-500"></div>
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

              {/* Prompt Selector Section */}
              <div className="flex flex-col gap-2 border-t border-gray-100 pt-4 mt-1 font-sans">
                <div className="flex items-center justify-between font-sans">
                  <span className="text-[10px] font-extrabold text-text-muted uppercase tracking-wider flex items-center gap-1.5 font-sans">
                    📝 Prompt {language === 'vi' ? 'sử dụng' : 'in use'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsPromptModalOpen(true)}
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

              {/* Next step button */}
              {step === 1 && (
                <motion.button
                  layout
                  onClick={() => setStep(2)}
                  className="w-full bg-primary hover:bg-primary-hover text-white py-3.5 px-6 rounded-2xl font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-95 text-sm cursor-pointer"
                >
                  {t('aiCreator.proceedToAb')}
                  <ArrowRight size={16} />
                </motion.button>
              )}
            </div>

            {/* Toggles Customizer */}
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
                        <div className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ${isChecked ? 'bg-primary justify-end' : 'bg-gray-200 justify-start'
                          }`}>
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

                  return (
                    <motion.div
                      key={v.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ type: "spring", stiffness: 350, damping: 25 }}
                      className="bg-white border border-gray-200/80 rounded-3xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-3 relative overflow-hidden"
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
                        <span className="text-xs bg-primary/10 text-primary font-black px-3 py-1 rounded-full border border-primary/10 select-none">
                          {language === 'vi' ? 'Biến thể' : 'Variant'} {v.id}
                        </span>
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
                                  <span>24/03/2025</span>
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
                                  <span>24/03/2025</span>
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
                onClick={() => setStep(1)}
                className="flex items-center gap-2 bg-white border border-gray-200 text-text px-5 py-3 rounded-2xl text-xs font-bold shadow-sm hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <ArrowLeft size={16} />
                {t('aiCreator.backToIngestion')}
              </button>

              <button
                onClick={() => setStep(3)}
                className="bg-gradient-to-r from-primary to-primary-hover hover:from-primary-hover hover:to-primary text-white py-3.5 px-8 rounded-2xl font-extrabold shadow-lg shadow-primary/20 flex items-center gap-2 transition-all hover:scale-[1.01] active:scale-95 text-xs cursor-pointer"
              >
                {t('aiCreator.step3')}
                <ArrowRight size={15} />
              </button>
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
            {/* Left Column - Decoupled Schedulers Form (col-span-3) */}
            <div className="lg:col-span-3 flex flex-col gap-6">
              <div className="bg-white border border-gray-200 rounded-[28px] p-6 shadow-sm flex flex-col gap-5">
                <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                  <Calendar size={18} className="text-primary" />
                  <h3 className="text-xs font-extrabold text-text uppercase tracking-wider">
                    {t('aiCreator.scheduleTitle')}
                  </h3>
                </div>

                <p className="text-xs text-text-muted font-semibold leading-relaxed">
                  {t('aiCreator.scheduleIntro')}
                </p>

                {/* 1. Facebook Scheduler Inputs */}
                {getPromptTargetPlatforms(selectedPrompt).includes('facebook') && (
                  <div className="border border-blue-100 bg-blue-50/10 rounded-2xl p-4 flex flex-col gap-4">
                    <div className="flex items-center gap-2 font-bold text-xs text-[#1877F2]">
                      <div className="w-5 h-5 rounded-full bg-[#1877F2] flex items-center justify-center text-white text-[10px]">
                        <Facebook size={10} className="fill-white" />
                      </div>
                      <span>Facebook Publication</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1.5 font-sans">
                        <label className="text-[10px] font-extrabold text-text-muted uppercase tracking-wider">
                          {t('aiCreator.dateInputLabel')}
                        </label>
                        <input
                          type="date"
                          min="2026-06-15"
                          max="2026-07-05"
                          value={facebookDate}
                          onChange={(e) => handleFacebookDateChange(e.target.value)}
                          className={`w-full bg-white border ${facebookError ? 'border-red-400 focus:ring-red-200' : 'border-[#E4E6F8] focus:ring-primary/20'} rounded-xl px-3 py-2 text-xs text-text focus:outline-none focus:ring-2 transition-all font-semibold`}
                        />
                      </div>

                      <div className="flex flex-col gap-1.5 font-sans">
                        <label className="text-[10px] font-extrabold text-text-muted uppercase tracking-wider">
                          {t('aiCreator.timeInputLabel')}
                        </label>
                        <input
                          type="time"
                          value={facebookTime}
                          onChange={(e) => handleFacebookTimeChange(e.target.value)}
                          className="w-full bg-white border border-[#E4E6F8] rounded-xl px-3 py-2 text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-semibold"
                        />
                      </div>
                    </div>

                    {facebookError && (
                      <div className="text-[10px] text-red-500 font-bold leading-normal font-sans">
                        ⚠️ {facebookError}
                      </div>
                    )}
                  </div>
                )}

                {/* 2. Threads Scheduler Inputs */}
                {getPromptTargetPlatforms(selectedPrompt).includes('threads') && (
                  <div className="border border-gray-200 bg-gray-50/10 rounded-2xl p-4 flex flex-col gap-4">
                    <div className="flex items-center gap-2 font-bold text-xs text-black">
                      <div className="w-5 h-5 rounded-full bg-black flex items-center justify-center text-white">
                        <ThreadsIcon size={10} />
                      </div>
                      <span>Threads Publication</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1.5 font-sans">
                        <label className="text-[10px] font-extrabold text-text-muted uppercase tracking-wider">
                          {t('aiCreator.dateInputLabel')}
                        </label>
                        <input
                          type="date"
                          min="2026-06-15"
                          max="2026-07-05"
                          value={threadsDate}
                          onChange={(e) => handleThreadsDateChange(e.target.value)}
                          className={`w-full bg-white border ${threadsError ? 'border-red-400 focus:ring-red-200' : 'border-[#E4E6F8] focus:ring-primary/20'} rounded-xl px-3 py-2 text-xs text-text focus:outline-none focus:ring-2 transition-all font-semibold`}
                        />
                      </div>

                      <div className="flex flex-col gap-1.5 font-sans">
                        <label className="text-[10px] font-extrabold text-text-muted uppercase tracking-wider">
                          {t('aiCreator.timeInputLabel')}
                        </label>
                        <input
                          type="time"
                          value={threadsTime}
                          onChange={(e) => handleThreadsTimeChange(e.target.value)}
                          className="w-full bg-white border border-[#E4E6F8] rounded-xl px-3 py-2 text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-semibold"
                        />
                      </div>
                    </div>

                    {threadsError && (
                      <div className="text-[10px] text-red-500 font-bold leading-normal font-sans">
                        ⚠️ {threadsError}
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Instagram Scheduler Inputs */}
                {getPromptTargetPlatforms(selectedPrompt).includes('instagram') && (
                  <div className="border border-pink-100 bg-pink-50/10 rounded-2xl p-4 flex flex-col gap-4">
                    <div className="flex items-center gap-2 font-bold text-xs text-pink-600">
                      <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-600 flex items-center justify-center text-white text-[10px]">
                        <Instagram size={10} />
                      </div>
                      <span>Instagram Publication</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1.5 font-sans">
                        <label className="text-[10px] font-extrabold text-text-muted uppercase tracking-wider">
                          {t('aiCreator.dateInputLabel')}
                        </label>
                        <input
                          type="date"
                          min="2026-06-15"
                          max="2026-07-05"
                          value={instagramDate}
                          onChange={(e) => handleInstagramDateChange(e.target.value)}
                          className={`w-full bg-white border ${instagramError ? 'border-red-400 focus:ring-red-200' : 'border-[#E4E6F8] focus:ring-primary/20'} rounded-xl px-3 py-2 text-xs text-text focus:outline-none focus:ring-2 transition-all font-semibold`}
                        />
                      </div>

                      <div className="flex flex-col gap-1.5 font-sans">
                        <label className="text-[10px] font-extrabold text-text-muted uppercase tracking-wider">
                          {t('aiCreator.timeInputLabel')}
                        </label>
                        <input
                          type="time"
                          value={instagramTime}
                          onChange={(e) => handleInstagramTimeChange(e.target.value)}
                          className="w-full bg-white border border-[#E4E6F8] rounded-xl px-3 py-2 text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-semibold"
                        />
                      </div>
                    </div>

                    {instagramError && (
                      <div className="text-[10px] text-red-500 font-bold leading-normal font-sans">
                        ⚠️ {instagramError}
                      </div>
                    )}
                  </div>
                )}


                {/* Drag instruction warning */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-[11px] text-amber-800 leading-relaxed font-semibold">
                  {t('aiCreator.dragInstruction')}
                </div>
              </div>
            </div>

            {/* Right Column - 2D Calendar Grid (col-span-9) */}
            <div className="lg:col-span-9 bg-white border border-gray-200 rounded-[28px] p-6 shadow-sm flex flex-col min-h-[500px]">

              {/* Header Title & Dropdown mimicking PostLab */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-100 pb-4 mb-4 gap-4">
                <div>
                  <h3 className="text-lg font-extrabold text-text flex items-center gap-2">
                    {language === 'vi' ? 'Kế hoạch đăng bài' : 'Publication Plan'}
                  </h3>
                  <p className="text-xs text-text-muted mt-0.5">
                    {language === 'vi'
                      ? 'Kéo thả thẻ bài viết màu sắc trên lịch 2D để đổi ngày/giờ đăng. Bài đăng cũ có màu xám.'
                      : 'Drag and drop colored cards on the 2D grid to change dates/hours. Old posts are gray.'}
                  </p>
                </div>

                {/* Active Week Selectors / Tabs */}
                <div className="flex bg-[#F1F3F9] p-1 rounded-xl border border-gray-250 select-none font-sans gap-1">
                  {[
                    { id: 0, label: language === 'vi' ? 'Tuần 1 (15/06 - 21/06)' : 'Wk 1 (15/06 - 21/06)' },
                    { id: 1, label: language === 'vi' ? 'Tuần 2 (22/06 - 28/06)' : 'Wk 2 (22/06 - 28/06)' },
                    { id: 2, label: language === 'vi' ? 'Tuần 3 (29/06 - 05/07)' : 'Wk 3 (29/06 - 05/07)' }
                  ].map((wk) => (
                    <button
                      key={wk.id}
                      onClick={() => setActiveWeek(wk.id as 0 | 1 | 2)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${activeWeek === wk.id
                        ? 'bg-white text-primary shadow-sm font-extrabold border border-gray-250'
                        : 'text-text-muted hover:text-text'
                        }`}
                    >
                      {wk.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2D Calendar Board Wrapper */}
              <div className="w-full overflow-x-auto relative border border-gray-150 rounded-2xl p-1 bg-white select-none">
                <div className="min-w-[760px] flex flex-col">

                  {/* Days of the Week Header Row */}
                  <div
                    className="grid border-b border-gray-200 pb-2.5 mb-1 font-sans text-center text-xs font-extrabold"
                    style={{ gridTemplateColumns: '80px repeat(7, 1fr)' }}
                  >
                    <span className="text-[10px] font-black text-text-muted uppercase tracking-wider text-left pl-3 flex items-center">
                      {language === 'vi' ? 'Giờ' : 'Time'}
                    </span>
                    {weekDays.slice(activeWeek * 7, activeWeek * 7 + 7).map((day) => {
                      const isFbScheduled = facebookDate === day.date;
                      const isThreadsScheduled = threadsDate === day.date;
                      const isAnyActive = isFbScheduled || isThreadsScheduled;

                      return (
                        <div
                          key={day.date}
                          className={`flex flex-col items-center py-1.5 rounded-xl transition-all ${isAnyActive
                            ? 'text-primary font-black bg-primary/5 border border-primary/20 shadow-sm'
                            : day.isToday
                              ? 'text-text font-black bg-gray-50 border border-gray-255'
                              : 'text-text-muted font-bold'
                            }`}
                        >
                          <span className="text-[10px] tracking-wide">{getDayLabel(day.name)}</span>
                          <span className="text-[11px] mt-0.5 font-bold opacity-80">{day.label} / 06</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* 2D Grid with Time Labels */}
                  <div className="flex relative w-full" style={{ height: '576px' }}>

                    {/* Hour Column (Left) */}
                    <div className="w-[80px] grid grid-rows-8 h-full pr-2 font-sans border-r border-gray-100/60 bg-gray-50/50 rounded-l-2xl select-none">
                      {[16, 17, 18, 19, 20, 21, 22, 23].map((hr) => (
                        <div key={hr} className="flex flex-col justify-start pt-2 items-center text-[11px] font-extrabold text-text-muted">
                          <span>{hr}:00</span>
                        </div>
                      ))}
                    </div>

                    {/* Draggable Area Relative Board (Right 7 Columns x 8 Rows) */}
                    <div
                      ref={boardRef}
                      className="flex-1 relative h-full bg-white select-none overflow-hidden"
                    >
                      {/* Background Grid Lines */}
                      <div className="absolute inset-0 grid grid-cols-7 grid-rows-8 pointer-events-none">
                        {Array.from({ length: 56 }).map((_, idx) => {
                          const isLastCol = (idx + 1) % 7 === 0;
                          const isLastRow = idx >= 49;
                          return (
                            <div
                              key={idx}
                              className={`border-gray-250/55 ${!isLastCol ? 'border-r' : ''} ${!isLastRow ? 'border-b' : ''}`}
                            />
                          );
                        })}
                      </div>

                      {/* 1. Existing Posts (Grayscale) */}
                      {existingPosts.map((post, index) => {
                        const dayIdx = weekDays.findIndex(d => d.date === post.date);
                        if (dayIdx < 0) return null;
                        const weekIdx = Math.floor(dayIdx / 7);
                        if (weekIdx !== activeWeek) return null;

                        const colIndex = dayIdx % 7;
                        const rowIndex = post.hour - 16;
                        if (rowIndex < 0 || rowIndex >= 8) return null;

                        return (
                          <div
                            key={`existing-${index}`}
                            className="absolute p-1.5 rounded-xl bg-[#FAFBFD] border border-gray-200/60 shadow-sm flex flex-col justify-between select-none pointer-events-none grayscale opacity-60 overflow-hidden"
                            style={{
                              left: `calc(${(colIndex * 100) / 7}% + 5px)`,
                              top: `calc(${(rowIndex * 100) / 8}% + 5px)`,
                              width: `calc(${(100) / 7}% - 10px)`,
                              height: `calc(${(100) / 8}% - 10px)`,
                            }}
                          >
                            <div className="flex flex-col overflow-hidden">
                              <span className="text-[9px] font-black text-gray-500 uppercase tracking-wider truncate">
                                {post.title}
                              </span>
                              <span className="text-[9px] text-gray-400 font-semibold truncate leading-tight mt-0.5">
                                {post.hour}:00 - {post.hour + 1}:00
                              </span>
                            </div>
                            <div className="flex items-center gap-1 mt-auto pt-0.5 text-gray-400 truncate">
                              {post.category === 'facebook' ? (
                                <Facebook size={9} className="fill-gray-400 stroke-none shrink-0" />
                              ) : (
                                <ThreadsIcon size={9} className="shrink-0" />
                              )}
                              <span className="text-[8px] font-bold uppercase tracking-widest text-gray-400 truncate whitespace-nowrap">
                                {post.category}
                              </span>
                            </div>
                          </div>
                        );
                      })}

                      {/* 2. Active Facebook Pill (Draggable) */}
                      {getPromptTargetPlatforms(selectedPrompt).includes('facebook') && (() => {
                        const fbIdx = weekDays.findIndex(d => d.date === facebookDate);
                        if (fbIdx < 0) return null;
                        const fbWeek = Math.floor(fbIdx / 7);
                        if (fbWeek !== activeWeek) return null;

                        const colIndex = fbIdx % 7;
                        const fbHour = parseInt(facebookTime.split(':')[0]) || 20;
                        const rowIndex = fbHour - 16;
                        if (rowIndex < 0 || rowIndex >= 8) return null;

                        return (
                          <motion.div
                            key={`fb-active-${fbResetTrigger}-${facebookDate}-${facebookTime}`}
                            drag
                            dragConstraints={boardRef}
                            dragElastic={0.05}
                            dragMomentum={false}
                            onDragEnd={handleFbDragEnd}
                            className="absolute p-1.5 rounded-2xl bg-white border-2 border-[#1877F2] shadow-xl flex flex-col justify-between cursor-grab active:cursor-grabbing z-20 hover:shadow-2xl transition-shadow select-none overflow-hidden"
                            style={{
                              left: `calc(${(colIndex * 100) / 7}% + 5px)`,
                              top: `calc(${(rowIndex * 100) / 8}% + 5px)`,
                              width: `calc(${(100) / 7}% - 10px)`,
                              height: `calc(${(100) / 8}% - 10px)`,
                            }}
                          >
                            <div className="flex flex-col relative w-full overflow-hidden">
                              {/* Blinking pulse dot */}
                              <span className="absolute top-0 right-0 flex h-1.5 w-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#1877F2]"></span>
                              </span>

                              <span className="text-[9px] font-black text-[#1877F2] uppercase tracking-wider truncate pr-2">
                                FACEBOOK
                              </span>
                              <span className="text-[9px] text-text font-black truncate leading-tight mt-0.5">
                                {fbHour}:00 - {fbHour + 1}:00
                              </span>
                            </div>
                            <div className="flex items-center justify-between mt-auto pt-0.5">
                              <div className="flex items-center gap-1 text-[#1877F2] min-w-0">
                                <Facebook size={9} className="fill-[#1877F2] stroke-none shrink-0" />
                                <span className="text-[8px] font-black uppercase tracking-wider truncate whitespace-nowrap">
                                  Active
                                </span>
                              </div>
                              <span className="text-[7px] text-gray-400 font-bold uppercase tracking-widest hidden md:inline select-none shrink-0">
                                {language === 'vi' ? 'Kéo' : 'Drag'}
                              </span>
                            </div>
                          </motion.div>
                        );
                      })()}

                      {/* 3. Active Threads Pill (Draggable) */}
                      {getPromptTargetPlatforms(selectedPrompt).includes('threads') && (() => {
                        const threadsIdx = weekDays.findIndex(d => d.date === threadsDate);
                        if (threadsIdx < 0) return null;
                        const threadsWeek = Math.floor(threadsIdx / 7);
                        if (threadsWeek !== activeWeek) return null;

                        const colIndex = threadsIdx % 7;
                        const threadsHour = parseInt(threadsTime.split(':')[0]) || 18;
                        const rowIndex = threadsHour - 16;
                        if (rowIndex < 0 || rowIndex >= 8) return null;

                        return (
                          <motion.div
                            key={`threads-active-${threadsResetTrigger}-${threadsDate}-${threadsTime}`}
                            drag
                            dragConstraints={boardRef}
                            dragElastic={0.05}
                            dragMomentum={false}
                            onDragEnd={handleThreadsDragEnd}
                            className="absolute p-1.5 rounded-2xl bg-white border-2 border-black shadow-xl flex flex-col justify-between cursor-grab active:cursor-grabbing z-20 hover:shadow-2xl transition-shadow select-none overflow-hidden"
                            style={{
                              left: `calc(${(colIndex * 100) / 7}% + 5px)`,
                              top: `calc(${(rowIndex * 100) / 8}% + 5px)`,
                              width: `calc(${(100) / 7}% - 10px)`,
                              height: `calc(${(100) / 8}% - 10px)`,
                            }}
                          >
                            <div className="flex flex-col relative w-full overflow-hidden">
                              {/* Blinking pulse dot */}
                              <span className="absolute top-0 right-0 flex h-1.5 w-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gray-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-black"></span>
                              </span>

                              <span className="text-[9px] font-black text-black uppercase tracking-wider truncate pr-2">
                                THREADS
                              </span>
                              <span className="text-[9px] text-text font-black truncate leading-tight mt-0.5">
                                {threadsHour}:00 - {threadsHour + 1}:00
                              </span>
                            </div>
                            <div className="flex items-center justify-between mt-auto pt-0.5">
                              <div className="flex items-center gap-1 text-black min-w-0">
                                <ThreadsIcon size={9} className="shrink-0" />
                                <span className="text-[8px] font-black uppercase tracking-wider truncate whitespace-nowrap">
                                  Active
                                </span>
                              </div>
                              <span className="text-[7px] text-gray-400 font-bold uppercase tracking-widest hidden md:inline select-none shrink-0">
                                {language === 'vi' ? 'Kéo' : 'Drag'}
                              </span>
                            </div>
                          </motion.div>
                        );
                      })()}

                      {/* 4. Active Instagram Pill (Draggable) */}
                      {getPromptTargetPlatforms(selectedPrompt).includes('instagram') && (() => {
                        const instaIdx = weekDays.findIndex(d => d.date === instagramDate);
                        if (instaIdx < 0) return null;
                        const instaWeek = Math.floor(instaIdx / 7);
                        if (instaWeek !== activeWeek) return null;

                        const colIndex = instaIdx % 7;
                        const instaHour = parseInt(instagramTime.split(':')[0]) || 12;
                        const rowIndex = instaHour - 16;
                        if (rowIndex < 0 || rowIndex >= 8) return null;

                        return (
                          <motion.div
                            key={`instagram-active-${instagramResetTrigger}-${instagramDate}-${instagramTime}`}
                            drag
                            dragConstraints={boardRef}
                            dragElastic={0.05}
                            dragMomentum={false}
                            onDragEnd={handleInstagramDragEnd}
                            className="absolute p-1.5 rounded-2xl bg-white border-2 border-pink-500 shadow-xl flex flex-col justify-between cursor-grab active:cursor-grabbing z-20 hover:shadow-2xl transition-shadow select-none overflow-hidden"
                            style={{
                              left: `calc(${(colIndex * 100) / 7}% + 5px)`,
                              top: `calc(${(rowIndex * 100) / 8}% + 5px)`,
                              width: `calc(${(100) / 7}% - 10px)`,
                              height: `calc(${(100) / 8}% - 10px)`,
                            }}
                          >
                            <div className="flex flex-col relative w-full overflow-hidden">
                              {/* Blinking pulse dot */}
                              <span className="absolute top-0 right-0 flex h-1.5 w-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-pink-500"></span>
                              </span>

                              <span className="text-[9px] font-black text-pink-600 uppercase tracking-wider truncate pr-2">
                                INSTAGRAM
                              </span>
                              <span className="text-[9px] text-text font-black truncate leading-tight mt-0.5">
                                {instaHour}:00 - {instaHour + 1}:00
                              </span>
                            </div>
                            <div className="flex items-center justify-between mt-auto pt-0.5">
                              <div className="flex items-center gap-1 text-pink-600 min-w-0">
                                <Instagram size={9} className="shrink-0" />
                                <span className="text-[8px] font-black uppercase tracking-wider truncate whitespace-nowrap">
                                  Active
                                </span>
                              </div>
                              <span className="text-[7px] text-gray-400 font-bold uppercase tracking-widest hidden md:inline select-none shrink-0">
                                {language === 'vi' ? 'Kéo' : 'Drag'}
                              </span>
                            </div>
                          </motion.div>
                        );
                      })()}

                    </div>
                  </div>

                </div>
              </div>

              {/* Bottom Actions inside Step 3 */}
              {schedulingError && (
                <div className="bg-red-50 border border-red-200 text-red-750 text-xs font-semibold p-3.5 rounded-xl mt-4">
                  ⚠️ {schedulingError}
                </div>
              )}
              <div className="flex items-center justify-between border-t border-gray-150 pt-6 mt-6 font-sans">
                <button
                  onClick={() => setStep(2)}
                  className="flex items-center gap-2 bg-white border border-gray-200 text-text px-5 py-3 rounded-2xl text-xs font-bold shadow-sm hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <ArrowLeft size={16} />
                  {t('aiCreator.backToAb')}
                </button>

                <button
                  id="confirm-schedule-btn"
                  onClick={handleConfirmSchedule}
                  disabled={
                    isSchedulingLoading ||
                    (getPromptTargetPlatforms(selectedPrompt).includes('facebook') && !!facebookError) ||
                    (getPromptTargetPlatforms(selectedPrompt).includes('threads') && !!threadsError) ||
                    (getPromptTargetPlatforms(selectedPrompt).includes('instagram') && !!instagramError)
                  }
                  className={`py-3.5 px-8 rounded-2xl font-extrabold shadow-lg flex items-center gap-2 transition-all hover:scale-[1.01] active:scale-95 text-xs cursor-pointer font-sans ${
                    isSchedulingLoading ||
                    (getPromptTargetPlatforms(selectedPrompt).includes('facebook') && facebookError) ||
                    (getPromptTargetPlatforms(selectedPrompt).includes('threads') && threadsError) ||
                    (getPromptTargetPlatforms(selectedPrompt).includes('instagram') && instagramError)
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                      : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-emerald-500/20'
                  }`}
                >
                  {isSchedulingLoading ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={15} />
                  )}
                  {isSchedulingLoading
                    ? (language === 'vi' ? 'Đang lên lịch...' : 'Scheduling...')
                    : t('aiCreator.confirmSchedule')}
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
                  setStep(1);
                }}
                className="w-full bg-primary hover:bg-primary-hover text-white py-3 px-6 rounded-2xl font-bold shadow-md shadow-primary/20 transition-all text-xs cursor-pointer font-sans"
              >
                {language === 'vi' ? 'Bắt đầu chiến dịch mới' : 'Start new campaign'}
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

    </div>
  );
}


