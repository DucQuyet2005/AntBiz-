"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Plus,
  Search,
  Pencil,
  Copy,
  Trash2,
  X,
  Facebook,
  Instagram,
  Loader2,
  CheckCircle2,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  MoreVertical,
  Layers,
  Target,
  BookOpen,
  Zap,
  Globe,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ──────────────────────────────────────────────────────────────────

type Platform = "facebook" | "thread" | "instagram" | "all";

interface PresetContent {
  __preset__: true;
  objectives: string[];
  topics: string[];
  formats: string[];
  tone: string;
  length: string;
  language: string;
  rules: string;
  name?: string;
  description?: string;
}

interface Preset {
  id: string;
  name: string;
  platform: string;
  content: string; // JSON string
  tags: string[];
  is_default: boolean;
  created_by: string | null;
  created_at: string;
  usage_count?: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const OBJECTIVES = [
  { id: "engagement", label: "Tăng tương tác", labelEn: "Boost Engagement", icon: "💬" },
  { id: "brand", label: "Xây dựng thương hiệu", labelEn: "Brand Building", icon: "🏆" },
  { id: "sales", label: "Quảng bá & Bán hàng", labelEn: "Sales & Promotion", icon: "🛒" },
  { id: "edu", label: "Chia sẻ kiến thức", labelEn: "Knowledge Sharing", icon: "📚" },
  { id: "viral", label: "Giải trí / Viral", labelEn: "Entertainment / Viral", icon: "🔥" },
  { id: "event", label: "Sự kiện / Thông báo", labelEn: "Events / Announcements", icon: "📢" },
  { id: "recruit", label: "Tuyển dụng", labelEn: "Recruitment", icon: "👥" },
  { id: "community", label: "Gắn kết cộng đồng", labelEn: "Community Building", icon: "❤️" },
  { id: "trust", label: "Xây dựng niềm tin", labelEn: "Trust Building", icon: "🤝" },
];

const TOPICS = [
  { id: "business", label: "Kinh doanh", labelEn: "Business" },
  { id: "tech", label: "Công nghệ", labelEn: "Technology" },
  { id: "lifestyle", label: "Lối sống", labelEn: "Lifestyle" },
  { id: "education", label: "Giáo dục", labelEn: "Education" },
  { id: "health", label: "Sức khỏe", labelEn: "Health & Wellness" },
  { id: "finance", label: "Tài chính", labelEn: "Finance" },
  { id: "food", label: "Ẩm thực", labelEn: "Food & Dining" },
  { id: "travel", label: "Du lịch", labelEn: "Travel" },
  { id: "fashion", label: "Thời trang", labelEn: "Fashion" },
  { id: "news", label: "Tin tức", labelEn: "News & Current Events" },
  { id: "entertainment", label: "Giải trí", labelEn: "Entertainment" },
  { id: "sports", label: "Thể thao", labelEn: "Sports" },
];

const FORMATS = [
  { id: "story", label: "Câu chuyện", labelEn: "Story", icon: "📖" },
  { id: "howto", label: "Hướng dẫn", labelEn: "How-to Guide", icon: "🔧" },
  { id: "list", label: "Danh sách", labelEn: "List / Tips", icon: "📋" },
  { id: "quote", label: "Trích dẫn", labelEn: "Quote", icon: "💬" },
  { id: "question", label: "Đặt câu hỏi", labelEn: "Question / Poll", icon: "❓" },
  { id: "news", label: "Bản tin", labelEn: "News Brief", icon: "📰" },
  { id: "behind", label: "Hậu trường", labelEn: "Behind the Scenes", icon: "🎬" },
  { id: "cta", label: "Kêu gọi hành động", labelEn: "Call to Action", icon: "🚀" },
];

const TONES = [
  { id: "friendly", label: "Thân thiện", labelEn: "Friendly" },
  { id: "professional", label: "Chuyên nghiệp", labelEn: "Professional" },
  { id: "humorous", label: "Hài hước", labelEn: "Humorous" },
  { id: "emotional", label: "Cảm xúc / Truyền cảm hứng", labelEn: "Emotional / Inspiring" },
  { id: "journalistic", label: "Báo chí / Khách quan", labelEn: "Journalistic / Objective" },
  { id: "authoritative", label: "Uy quyền / Chuyên gia", labelEn: "Authoritative / Expert" },
  { id: "casual", label: "Thoải mái / Đời thường", labelEn: "Casual / Everyday" },
];

const LENGTHS = [
  { id: "short", label: "Ngắn (< 150 từ)", labelEn: "Short (< 150 words)" },
  { id: "medium", label: "Vừa (150–400 từ)", labelEn: "Medium (150–400 words)" },
  { id: "long", label: "Dài (400+ từ)", labelEn: "Long (400+ words)" },
];

const PLATFORM_OPTIONS: { value: Platform; label: string; color: string }[] = [
  { value: "facebook", label: "Facebook", color: "#1877F2" },
  { value: "thread", label: "Threads", color: "#000000" },
  { value: "instagram", label: "Instagram", color: "#E1306C" },
  { value: "all", label: "Tất cả", color: "#6366F1" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parsePresetContent(content: string): PresetContent | null {
  try {
    const parsed = JSON.parse(content);
    if (parsed.__preset__) return parsed as PresetContent;
  } catch {}
  return null;
}

function compileRules(
  objectives: string[],
  topics: string[],
  formats: string[],
  tone: string,
  length: string,
  language: string,
  lang: string
): string {
  const objLabels = objectives
    .map((id) => {
      const obj = OBJECTIVES.find((o) => o.id === id);
      return obj ? (lang === "vi" ? obj.label : obj.labelEn) : id;
    })
    .join(", ");
  const topicLabels = topics
    .map((id) => {
      const t = TOPICS.find((t) => t.id === id);
      return t ? (lang === "vi" ? t.label : t.labelEn) : id;
    })
    .join(", ");
  const formatLabels = formats
    .map((id) => {
      const f = FORMATS.find((f) => f.id === id);
      return f ? (lang === "vi" ? f.label : f.labelEn) : id;
    })
    .join(", ");
  const toneLabel = (() => {
    const t = TONES.find((t) => t.id === tone);
    return t ? (lang === "vi" ? t.label : t.labelEn) : tone;
  })();
  const lengthLabel = (() => {
    const l = LENGTHS.find((l) => l.id === length);
    return l ? (lang === "vi" ? l.label : l.labelEn) : length;
  })();

  if (lang === "vi") {
    return `Hãy viết bài theo hướng: ${objLabels ? `Mục tiêu: ${objLabels}.` : ""} ${topicLabels ? `Lĩnh vực: ${topicLabels}.` : ""} ${formatLabels ? `Định dạng: ${formatLabels}.` : ""} Giọng điệu: ${toneLabel}. Độ dài: ${lengthLabel}. Ngôn ngữ: ${language === "vi" ? "Tiếng Việt" : "English"}.`.trim();
  }
  return `Write in the following style: ${objLabels ? `Objectives: ${objLabels}.` : ""} ${topicLabels ? `Topics: ${topicLabels}.` : ""} ${formatLabels ? `Formats: ${formatLabels}.` : ""} Tone: ${toneLabel}. Length: ${lengthLabel}. Language: ${language === "vi" ? "Vietnamese" : "English"}.`.trim();
}

// ─── PlatformIcon ────────────────────────────────────────────────────────────

function ThreadsIcon({ size = 14 }: { size?: number }) {
  return (
    <svg viewBox="0 0 192 192" width={size} height={size} fill="currentColor">
      <path d="M141.537 88.9883C140.71 88.5919 139.87 88.2104 139.019 87.8451C137.537 60.5382 122.616 44.905 97.5619 44.745C97.4484 44.7443 97.3355 44.7443 97.222 44.7443C82.2364 44.7443 69.7731 51.1409 62.102 62.7807L75.881 72.2328C81.6116 63.5383 90.6052 61.6848 97.2286 61.6848C97.3051 61.6848 97.3819 61.6848 97.4576 61.6855C105.707 61.7381 111.932 64.1366 115.961 68.814C118.893 72.2193 120.854 76.925 121.825 82.8638C114.511 81.6207 106.601 81.2385 98.145 81.7233C74.3247 83.0954 59.0111 96.9879 60.0396 116.292C60.5615 126.084 65.4397 134.508 73.775 140.011C80.8224 144.663 89.899 146.938 99.3323 146.423C111.79 145.74 121.563 140.987 128.381 132.296C133.559 125.696 136.834 117.143 138.28 106.366C144.217 109.949 148.617 114.664 151.047 120.332C155.179 129.967 155.42 145.8 142.501 158.708C131.182 170.016 117.576 174.908 97.0135 175.059C74.2042 174.89 56.9538 167.575 45.7381 153.317C35.2355 139.966 29.8077 120.682 29.6052 96C29.8077 71.3178 35.2355 52.0336 45.7381 38.6827C56.9538 24.4249 74.2039 17.11 97.0132 16.9405C119.988 17.1113 137.539 24.4614 149.184 38.788C154.894 45.8136 159.199 54.6488 162.037 64.9503L178.184 60.6422C174.744 47.9622 169.331 37.0357 161.965 27.974C147.036 9.60668 125.202 0.195148 97.0695 0H96.9569C68.8816 0.19447 47.2921 9.6418 32.7883 28.0793C19.8819 44.4864 13.2244 67.3157 13.0007 95.9325L13 96L13.0007 96.0675C13.2244 124.684 19.8819 147.514 32.7883 163.921C47.2921 182.358 68.8816 191.806 96.9569 192H97.0695C122.03 191.827 139.624 185.292 154.118 170.811C173.081 151.866 172.51 128.119 166.26 113.541C161.776 103.087 153.227 94.5962 141.537 88.9883ZM98.4405 129.507C88.0005 130.095 77.1544 125.409 76.6196 115.372C76.2232 107.93 81.9158 99.626 99.0812 98.6368C101.047 98.5234 102.976 98.468 104.871 98.468C111.106 98.468 116.939 99.0737 122.242 100.233C120.264 124.935 108.662 128.946 98.4405 129.507Z" />
    </svg>
  );
}

function PlatformIcon({ platform, size = 14 }: { platform: string; size?: number }) {
  if (platform === "facebook") return <Facebook size={size} />;
  if (platform === "instagram") return <Instagram size={size} />;
  if (platform === "thread") return <ThreadsIcon size={size} />;
  if (platform === "all") return <Globe size={size} />;
  return <Globe size={size} />;
}

const PLATFORM_BADGE: Record<string, string> = {
  facebook: "bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400",
  thread: "bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200",
  instagram: "bg-pink-100 dark:bg-pink-950/40 text-pink-600 dark:text-pink-400",
  all: "bg-violet-100 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400",
};

// ─── PresetCard ───────────────────────────────────────────────────────────────

function PresetCard({
  preset,
  language,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  preset: Preset;
  language: string;
  onEdit: (p: Preset) => void;
  onDuplicate: (p: Preset) => void;
  onDelete: (id: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const content = parsePresetContent(preset.content);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="relative group bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-5 hover:shadow-lg hover:border-primary/30 transition-all duration-200"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${PLATFORM_BADGE[preset.platform] || PLATFORM_BADGE.all}`}>
            <PlatformIcon platform={preset.platform} size={10} />
            {preset.platform === "thread" ? "Threads" : preset.platform === "all" ? (language === "vi" ? "Tất cả" : "All") : preset.platform.charAt(0).toUpperCase() + preset.platform.slice(1)}
          </span>
          {preset.is_default && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 rounded-full border border-amber-200/50">
              {language === "vi" ? "Mặc định" : "Default"}
            </span>
          )}
          {!preset.created_by && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-slate-400 rounded-full">
              {language === "vi" ? "Hệ thống" : "System"}
            </span>
          )}
        </div>

        {/* Kebab menu */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-700 dark:hover:text-slate-200 transition-all cursor-pointer border-0 bg-transparent"
          >
            <MoreVertical size={14} />
          </button>
          <AnimatePresence>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  transition={{ duration: 0.12 }}
                  className="absolute right-0 top-8 z-20 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl shadow-lg overflow-hidden min-w-[130px]"
                >
                  <button
                    type="button"
                    onClick={() => { setMenuOpen(false); onEdit(preset); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-zinc-800 cursor-pointer border-0 bg-transparent text-left"
                  >
                    <Pencil size={12} /> {language === "vi" ? "Chỉnh sửa" : "Edit"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMenuOpen(false); onDuplicate(preset); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-zinc-800 cursor-pointer border-0 bg-transparent text-left"
                  >
                    <Copy size={12} /> {language === "vi" ? "Nhân bản" : "Duplicate"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMenuOpen(false); onDelete(preset.id); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer border-0 bg-transparent text-left"
                  >
                    <Trash2 size={12} /> {language === "vi" ? "Xóa" : "Delete"}
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Name */}
      <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate mb-1">{preset.name}</h3>

      {/* Content summary */}
      {content ? (
        <div className="flex flex-wrap gap-1 mt-2">
          {content.objectives?.slice(0, 2).map((id) => {
            const obj = OBJECTIVES.find((o) => o.id === id);
            return obj ? (
              <span key={id} className="text-[10px] px-2 py-0.5 bg-primary/8 dark:bg-primary/15 text-primary rounded-full font-semibold">
                {obj.icon} {language === "vi" ? obj.label : obj.labelEn}
              </span>
            ) : null;
          })}
          {content.tone && (
            <span className="text-[10px] px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 rounded-full font-semibold">
              {TONES.find((t) => t.id === content.tone)?.[language === "vi" ? "label" : "labelEn"] || content.tone}
            </span>
          )}
        </div>
      ) : (
        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">{preset.content?.slice(0, 80)}...</p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-zinc-800">
        <span className="text-[10px] text-slate-400">
          {preset.usage_count !== undefined ? (language === "vi" ? `${preset.usage_count} lần dùng` : `Used ${preset.usage_count} times`) : ""}
        </span>
        <span className="text-[10px] text-slate-400">
          {new Date(preset.created_at).toLocaleDateString(language === "vi" ? "vi-VN" : "en-US")}
        </span>
      </div>
    </motion.div>
  );
}

// ─── WizardModal ──────────────────────────────────────────────────────────────

type WizardState = {
  objectives: string[];
  topics: string[];
  formats: string[];
  tone: string;
  length: string;
  language: string;
  name: string;
  platform: Platform;
};

const EMPTY_WIZARD: WizardState = {
  objectives: [],
  topics: [],
  formats: [],
  tone: "friendly",
  length: "medium",
  language: "vi",
  name: "",
  platform: "all",
};

function WizardModal({
  open,
  editPreset,
  onClose,
  onSaved,
  lang,
}: {
  open: boolean;
  editPreset: Preset | null;
  onClose: () => void;
  onSaved: () => void;
  lang: string;
}) {
  const [wizardStep, setWizardStep] = useState(1);
  const [form, setForm] = useState<WizardState>(EMPTY_WIZARD);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (!open) {
      setWizardStep(1);
      setSaveSuccess(false);
    }
    if (open && editPreset) {
      const parsed = parsePresetContent(editPreset.content);
      if (parsed) {
        setForm({
          objectives: parsed.objectives || [],
          topics: parsed.topics || [],
          formats: parsed.formats || [],
          tone: parsed.tone || "friendly",
          length: parsed.length || "medium",
          language: parsed.language || "vi",
          name: editPreset.name,
          platform: (editPreset.platform as Platform) || "all",
        });
      } else {
        setForm({ ...EMPTY_WIZARD, name: editPreset.name });
      }
    } else if (open && !editPreset) {
      setForm(EMPTY_WIZARD);
    }
  }, [open, editPreset]);

  const toggle = (arr: string[], val: string): string[] =>
    arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val];

  const compiledRules = useMemo(
    () => compileRules(form.objectives, form.topics, form.formats, form.tone, form.length, form.language, lang),
    [form.objectives, form.topics, form.formats, form.tone, form.length, form.language, lang]
  );

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setIsSaving(true);
    try {
      const contentObj: PresetContent = {
        __preset__: true,
        objectives: form.objectives,
        topics: form.topics,
        formats: form.formats,
        tone: form.tone,
        length: form.length,
        language: form.language,
        rules: compiledRules,
      };

      const body = {
        name: form.name.trim(),
        platform: form.platform === "all" ? "facebook" : form.platform, // prompts table expects valid platform
        content: JSON.stringify(contentObj),
        tags: ["preset", ...form.objectives.slice(0, 2)],
        is_default: false,
      };

      const url = editPreset ? `/api/prompts/${editPreset.id}` : "/api/prompts";
      const method = editPreset ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => {
          onSaved();
          onClose();
        }, 800);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || (lang === "vi" ? "Lỗi khi lưu Preset" : "Error saving Preset"));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const STEPS = [
    { label: lang === "vi" ? "Mục tiêu" : "Objective", icon: Target },
    { label: lang === "vi" ? "Chủ đề" : "Topic", icon: BookOpen },
    { label: lang === "vi" ? "Phong cách" : "Style", icon: Zap },
    { label: lang === "vi" ? "Xác nhận" : "Confirm", icon: CheckCircle2 },
  ];

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="bg-white dark:bg-zinc-950 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 dark:border-zinc-800"
        >
          {/* Modal Header */}
          <div className="px-6 pt-6 pb-4 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {editPreset
                  ? lang === "vi" ? "Chỉnh sửa Preset" : "Edit Preset"
                  : lang === "vi" ? "Tạo Preset mới" : "Create New Preset"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {lang === "vi" ? "Định hướng cách AI viết nội dung cho bạn" : "Guide how AI writes content for you"}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-zinc-700 transition-all cursor-pointer border-0"
            >
              <X size={16} />
            </button>
          </div>

          {/* Step Progress */}
          <div className="flex items-center gap-0 px-6 py-3 bg-slate-50 dark:bg-zinc-900/50 border-b border-slate-100 dark:border-zinc-800/60">
            {STEPS.map((s, i) => {
              const StepIcon = s.icon;
              const isActive = wizardStep === i + 1;
              const isDone = wizardStep > i + 1;
              return (
                <React.Fragment key={i}>
                  <button
                    type="button"
                    onClick={() => isDone && setWizardStep(i + 1)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-default ${isActive
                      ? "bg-primary text-white shadow-sm shadow-primary/20"
                      : isDone
                      ? "text-emerald-600 dark:text-emerald-400 cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                      : "text-slate-400 dark:text-slate-500"
                    }`}
                  >
                    {isDone ? <CheckCircle2 size={11} /> : <StepIcon size={11} />}
                    {s.label}
                  </button>
                  {i < STEPS.length - 1 && (
                    <ChevronRight size={12} className="text-slate-300 dark:text-zinc-600 shrink-0 mx-0.5" />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Modal Body */}
          <div className="p-6 overflow-y-auto max-h-[60vh]">
            <AnimatePresence mode="wait">
              {/* Step 1: Objectives (Why) */}
              {wizardStep === 1 && (
                <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.15 }}>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                    {lang === "vi" ? "Bạn muốn đạt được điều gì?" : "What do you want to achieve?"}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                    {lang === "vi" ? "Chọn một hoặc nhiều mục tiêu" : "Select one or more objectives"}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {OBJECTIVES.map((obj) => {
                      const sel = form.objectives.includes(obj.id);
                      return (
                        <button
                          key={obj.id}
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, objectives: toggle(f.objectives, obj.id) }))}
                          className={`flex items-center gap-2 p-3 rounded-xl border-2 text-left text-xs font-semibold transition-all cursor-pointer ${
                            sel
                              ? "border-primary bg-primary/8 dark:bg-primary/15 text-primary"
                              : "border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-700 dark:text-slate-200 hover:border-primary/40"
                          }`}
                        >
                          <span className="text-base shrink-0">{obj.icon}</span>
                          <span className="leading-tight">{lang === "vi" ? obj.label : obj.labelEn}</span>
                          {sel && <CheckCircle2 size={12} className="ml-auto shrink-0 text-primary" />}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* Step 2: Topics + Formats (What) */}
              {wizardStep === 2 && (
                <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.15 }}>
                  <div className="mb-5">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                      {lang === "vi" ? "Lĩnh vực nội dung" : "Content Domain"}
                    </h3>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {TOPICS.map((topic) => {
                        const sel = form.topics.includes(topic.id);
                        return (
                          <button
                            key={topic.id}
                            type="button"
                            onClick={() => setForm((f) => ({ ...f, topics: toggle(f.topics, topic.id) }))}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                              sel
                                ? "bg-primary text-white border-primary shadow-sm"
                                : "bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-slate-200 hover:border-primary/40"
                            }`}
                          >
                            {lang === "vi" ? topic.label : topic.labelEn}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                      {lang === "vi" ? "Định dạng bài viết" : "Post Format"}
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                      {FORMATS.map((fmt) => {
                        const sel = form.formats.includes(fmt.id);
                        return (
                          <button
                            key={fmt.id}
                            type="button"
                            onClick={() => setForm((f) => ({ ...f, formats: toggle(f.formats, fmt.id) }))}
                            className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-xs font-semibold transition-all cursor-pointer ${
                              sel
                                ? "border-primary bg-primary/8 dark:bg-primary/15 text-primary"
                                : "border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-700 dark:text-slate-200 hover:border-primary/40"
                            }`}
                          >
                            <span className="text-lg">{fmt.icon}</span>
                            <span>{lang === "vi" ? fmt.label : fmt.labelEn}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Tone + Length + Language (How) */}
              {wizardStep === 3 && (
                <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.15 }} className="space-y-5">
                  {/* Tone */}
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
                      {lang === "vi" ? "Giọng điệu" : "Tone"}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {TONES.map((tone) => {
                        const sel = form.tone === tone.id;
                        return (
                          <button
                            key={tone.id}
                            type="button"
                            onClick={() => setForm((f) => ({ ...f, tone: tone.id }))}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                              sel
                                ? "bg-primary text-white border-primary shadow-sm"
                                : "bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-slate-200 hover:border-primary/40"
                            }`}
                          >
                            {lang === "vi" ? tone.label : tone.labelEn}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {/* Length */}
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
                      {lang === "vi" ? "Độ dài bài viết" : "Post Length"}
                    </h3>
                    <div className="flex gap-2">
                      {LENGTHS.map((l) => {
                        const sel = form.length === l.id;
                        return (
                          <button
                            key={l.id}
                            type="button"
                            onClick={() => setForm((f) => ({ ...f, length: l.id }))}
                            className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer text-center ${
                              sel
                                ? "bg-primary text-white border-primary shadow-sm"
                                : "bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-slate-200 hover:border-primary/40"
                            }`}
                          >
                            {lang === "vi" ? l.label : l.labelEn}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {/* Language */}
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
                      {lang === "vi" ? "Ngôn ngữ đầu ra" : "Output Language"}
                    </h3>
                    <div className="flex gap-2">
                      {[{ id: "vi", label: "🇻🇳 Tiếng Việt" }, { id: "en", label: "🇺🇸 English" }].map((l) => {
                        const sel = form.language === l.id;
                        return (
                          <button
                            key={l.id}
                            type="button"
                            onClick={() => setForm((f) => ({ ...f, language: l.id }))}
                            className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer text-center ${
                              sel
                                ? "bg-primary text-white border-primary shadow-sm"
                                : "bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-slate-200 hover:border-primary/40"
                            }`}
                          >
                            {l.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 4: Confirm + Name */}
              {wizardStep === 4 && (
                <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.15 }} className="space-y-4">
                  {/* Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                      {lang === "vi" ? "Tên Preset" : "Preset Name"} <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder={lang === "vi" ? "Ví dụ: Facebook Bán hàng Thân thiện" : "e.g., Facebook Sales Friendly"}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                    />
                  </div>
                  {/* Platform */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                      {lang === "vi" ? "Nền tảng áp dụng" : "Apply to Platform"}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {PLATFORM_OPTIONS.map((p) => (
                        <button
                          key={p.value}
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, platform: p.value }))}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                            form.platform === p.value
                              ? "bg-primary text-white border-primary shadow-sm"
                              : "bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-slate-200 hover:border-primary/40"
                          }`}
                        >
                          <PlatformIcon platform={p.value} size={12} />
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Rules Preview */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                      {lang === "vi" ? "Xem trước quy tắc AI" : "AI Rules Preview"}
                    </label>
                    <div className="p-3 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl">
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{compiledRules || (lang === "vi" ? "(Chưa có quy tắc)" : "(No rules yet)")}</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Modal Footer */}
          <div className="px-6 py-4 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between">
            <button
              type="button"
              onClick={() => (wizardStep === 1 ? onClose() : setWizardStep((s) => s - 1))}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-all cursor-pointer border-0 bg-transparent"
            >
              <ChevronLeft size={14} /> {wizardStep === 1 ? (lang === "vi" ? "Hủy" : "Cancel") : (lang === "vi" ? "Quay lại" : "Back")}
            </button>

            {wizardStep < 4 ? (
              <button
                type="button"
                onClick={() => setWizardStep((s) => s + 1)}
                className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold bg-primary hover:bg-primary/90 text-white rounded-xl transition-all cursor-pointer border-0 shadow-sm"
              >
                {lang === "vi" ? "Tiếp theo" : "Next"} <ChevronRight size={14} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || !form.name.trim()}
                className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold bg-primary hover:bg-primary/90 disabled:opacity-50 text-white rounded-xl transition-all cursor-pointer border-0 shadow-sm"
              >
                {saveSuccess ? (
                  <><CheckCircle2 size={14} /> {lang === "vi" ? "Đã lưu!" : "Saved!"}</>
                ) : isSaving ? (
                  <><Loader2 size={14} className="animate-spin" /> {lang === "vi" ? "Đang lưu..." : "Saving..."}</>
                ) : (
                  <><Sparkles size={14} /> {lang === "vi" ? "Lưu Preset" : "Save Preset"}</>
                )}
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

// ─── PresetsView (Main) ───────────────────────────────────────────────────────

export default function PresetsView() {
  const { language } = useLanguage();
  const lang = language;

  const [presets, setPresets] = useState<Preset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"system" | "mine">("mine");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editingPreset, setEditingPreset] = useState<Preset | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchPresets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/prompts?pageSize=200");
      if (res.ok) {
        const json = await res.json();
        // Filter to only show items with __preset__ in content
        const all = (json.data || []) as Preset[];
        const presetItems = all.filter((p) => {
          try {
            const parsed = JSON.parse(p.content);
            return parsed.__preset__ === true;
          } catch {
            return false;
          }
        });
        setPresets(presetItems);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPresets();
  }, [fetchPresets]);

  const systemPresets = useMemo(
    () => presets.filter((p) => !p.created_by),
    [presets]
  );

  const myPresets = useMemo(
    () => presets.filter((p) => !!p.created_by),
    [presets]
  );

  const displayed = useMemo(() => {
    const list = activeTab === "system" ? systemPresets : myPresets;
    if (!search.trim()) return list;
    return list.filter(
      (p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.content.toLowerCase().includes(search.toLowerCase())
    );
  }, [activeTab, systemPresets, myPresets, search]);

  const handleEdit = (p: Preset) => {
    setEditingPreset(p);
    setWizardOpen(true);
  };

  const handleDuplicate = async (p: Preset) => {
    try {
      const res = await fetch("/api/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${p.name} (${lang === "vi" ? "bản sao" : "copy"})`,
          platform: p.platform,
          content: p.content,
          tags: p.tags || [],
          is_default: false,
        }),
      });
      if (res.ok) {
        showToast(lang === "vi" ? "Đã nhân bản Preset thành công!" : "Preset duplicated!");
        fetchPresets();
      }
    } catch (e) {
      showToast(lang === "vi" ? "Lỗi khi nhân bản" : "Error duplicating", "error");
    }
  };

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/prompts/${id}`, { method: "DELETE" });
      if (res.ok) {
        showToast(lang === "vi" ? "Đã xóa Preset!" : "Preset deleted!");
        fetchPresets();
      }
    } catch (e) {
      showToast(lang === "vi" ? "Lỗi khi xóa" : "Error deleting", "error");
    } finally {
      setIsDeleting(false);
      setDeleteConfirmId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full font-sans">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-lg text-sm font-semibold text-white ${toast.type === "success" ? "bg-emerald-600" : "bg-rose-600"}`}
          >
            <CheckCircle2 size={16} /> {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text tracking-tight flex items-center gap-2">
            <Layers className="text-primary" size={28} />
            {lang === "vi" ? "Presets" : "Presets"}
          </h1>
          <p className="text-sm text-text-muted mt-1">
            {lang === "vi"
              ? "Thư viện mẫu nội dung định hướng cách AI viết bài cho từng chiến dịch"
              : "Content template library that guides how AI writes for each campaign"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setEditingPreset(null); setWizardOpen(true); }}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-bold transition-all cursor-pointer border-0 shadow-md shadow-primary/20 active:scale-95 shrink-0"
        >
          <Plus size={16} />
          {lang === "vi" ? "+ Tạo Preset mới" : "+ Create New Preset"}
        </button>
      </div>

      {/* Search + Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={lang === "vi" ? "Tìm kiếm preset..." : "Search presets..."}
            className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          />
        </div>

        <div className="flex gap-1 bg-slate-100/80 dark:bg-zinc-900 rounded-xl p-1 border border-slate-200/60 dark:border-zinc-800">
          {(["mine", "system"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border-0 ${
                activeTab === tab
                  ? "bg-white dark:bg-zinc-800 text-primary shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 bg-transparent"
              }`}
            >
              {tab === "mine" ? (lang === "vi" ? "Của tôi" : "Mine") : (lang === "vi" ? "Hệ thống" : "System")}
              <span className={`ml-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${activeTab === tab ? "bg-primary/15 text-primary" : "bg-slate-200 dark:bg-zinc-700 text-slate-500"}`}>
                {tab === "mine" ? myPresets.length : systemPresets.length}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={28} className="animate-spin text-primary" />
        </div>
      ) : displayed.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-24 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 text-primary">
            <Layers size={28} />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">
            {search ? (lang === "vi" ? "Không tìm thấy Preset" : "No Presets Found") : (lang === "vi" ? "Chưa có Preset nào" : "No Presets Yet")}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs">
            {search
              ? lang === "vi" ? "Thử thay đổi từ khóa tìm kiếm." : "Try changing your search term."
              : lang === "vi"
              ? "Tạo preset đầu tiên để định hướng phong cách AI khi viết nội dung của bạn."
              : "Create your first preset to guide how AI writes content for your campaigns."}
          </p>
          {!search && (
            <button
              type="button"
              onClick={() => { setEditingPreset(null); setWizardOpen(true); }}
              className="mt-4 flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-bold transition-all cursor-pointer border-0"
            >
              <Plus size={14} /> {lang === "vi" ? "Tạo Preset đầu tiên" : "Create First Preset"}
            </button>
          )}
        </motion.div>
      ) : (
        <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <AnimatePresence>
            {displayed.map((preset) => (
              <PresetCard
                key={preset.id}
                preset={preset}
                language={lang}
                onEdit={handleEdit}
                onDuplicate={handleDuplicate}
                onDelete={(id) => setDeleteConfirmId(id)}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Delete Confirm Modal */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white dark:bg-zinc-900 rounded-2xl p-6 max-w-sm w-full border border-slate-200 dark:border-zinc-700 shadow-xl"
            >
              <h3 className="font-bold text-base text-slate-900 dark:text-white mb-2">
                {lang === "vi" ? "Xóa Preset?" : "Delete Preset?"}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                {lang === "vi"
                  ? "Hành động này không thể hoàn tác. Preset sẽ bị xóa vĩnh viễn."
                  : "This action cannot be undone. The Preset will be permanently deleted."}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all cursor-pointer bg-transparent"
                >
                  {lang === "vi" ? "Hủy" : "Cancel"}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(deleteConfirmId)}
                  disabled={isDeleting}
                  className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-sm font-semibold text-white transition-all cursor-pointer border-0"
                >
                  {isDeleting ? <Loader2 size={14} className="animate-spin mx-auto" /> : (lang === "vi" ? "Xóa" : "Delete")}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Wizard Modal */}
      <WizardModal
        open={wizardOpen}
        editPreset={editingPreset}
        onClose={() => { setWizardOpen(false); setEditingPreset(null); }}
        onSaved={() => fetchPresets()}
        lang={lang}
      />
    </div>
  );
}
