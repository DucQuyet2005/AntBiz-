/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { createPortal } from "react-dom";
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
  Globe,
  Eye,
  Calendar,
  ArrowRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ──────────────────────────────────────────────────────────────────

type Platform = "facebook" | "thread" | "instagram" | "all";

interface PromptConfigRecord {
  id: string;
  user_id: string;
  name: string;
  platform: string;
  rules: string;
  params: any;
  is_default: boolean;
  is_system?: boolean;
  created_at: string;
  updated_at: string;
}

interface GeneratedQuestionStep {
  key: string;
  question: string;
  options: string[];
  label?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const OBJECTIVES = [
  { id: "Bán hàng", label: "Tăng doanh số & Bán hàng", icon: "🛒" },
  { id: "Thương hiệu", label: "Xây dựng nhận diện thương hiệu", icon: "🏆" },
  { id: "Tương tác", label: "Tăng tương tác & Viral", icon: "🔥" },
  { id: "Giáo dục", label: "Chia sẻ kiến thức & Hướng dẫn", icon: "📚" },
  { id: "Tuyển dụng", label: "Tuyển dụng nhân sự", icon: "👥" },
  { id: "Sự kiện", label: "Truyền thông sự kiện mới", icon: "📢" },
];

const PLATFORM_OPTIONS: { value: Platform; label: string; color: string }[] = [
  { value: "facebook", label: "Facebook", color: "#1877F2" },
  { value: "thread", label: "Threads", color: "#000000" },
  { value: "instagram", label: "Instagram", color: "#E1306C" },
  { value: "all", label: "Tất cả", color: "#6366F1" },
];

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
  if (platform === "thread" || platform === "threads") return <ThreadsIcon size={size} />;
  return <Globe size={size} />;
}


const PLATFORM_BADGE: Record<string, string> = {
  facebook: "bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400",
  thread: "bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200",
  threads: "bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200",
  instagram: "bg-pink-100 dark:bg-pink-950/40 text-pink-600 dark:text-pink-400",
  all: "bg-violet-100 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400",
};

// ─── PresetCard ───────────────────────────────────────────────────────────────

function PresetCard({
  preset,
  language,
  onEdit,
  onDelete,
  onSelect,
}: {
  preset: PromptConfigRecord;
  language: string;
  onEdit: (p: PromptConfigRecord) => void;
  onDelete: (id: string) => void;
  onSelect: (p: PromptConfigRecord) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [menuOpen]);

  const objectives = useMemo(() => {
    if (preset.params?.objectives && preset.params.objectives.length > 0) return preset.params.objectives;
    if (preset.params?.objective) return [preset.params.objective];
    return [language === "vi" ? "Văn phong đa năng" : "Versatile Style"];
  }, [preset.params, language]);

  const parsedProps = useMemo(() => {
    const props: { icon: string; label: string; value: string }[] = [];
    
    // 1. Try from questionnaireAnswers if available
    if (preset.params?.questionnaireAnswers) {
      const qa = preset.params.questionnaireAnswers;
      const steps = qa.steps || [];
      const personaStep = steps.find((s: any) => s.key === "persona" || s.question?.toLowerCase().includes("vai trò"));
      const toneStep = steps.find((s: any) => s.key === "tone" || s.question?.toLowerCase().includes("sắc thái"));
      const pronounStep = steps.find((s: any) => s.key === "pronoun" || s.question?.toLowerCase().includes("xưng hô"));
      
      if (personaStep?.answer) {
        props.push({ 
          icon: "🎭", 
          label: language === "vi" ? "Vai trò" : "Role", 
          value: Array.isArray(personaStep.answer) ? personaStep.answer.join(", ") : personaStep.answer 
        });
      }
      if (toneStep?.answer) {
        props.push({ 
          icon: "💬", 
          label: language === "vi" ? "Tông giọng" : "Tone", 
          value: Array.isArray(toneStep.answer) ? toneStep.answer.join(", ") : toneStep.answer 
        });
      }
      if (pronounStep?.answer) {
        props.push({ 
          icon: "👥", 
          label: language === "vi" ? "Xưng hô" : "Pronouns", 
          value: Array.isArray(pronounStep.answer) ? pronounStep.answer.join(", ") : pronounStep.answer 
        });
      }
    }
    
    // 2. Fallback to parse preset.rules
    if (props.length === 0 && preset.rules) {
      let rulesText = preset.rules;
      try {
        const parsed = JSON.parse(preset.rules);
        if (parsed?.general) rulesText = parsed.general;
      } catch {}

      // Look for lines or sub-sentences
      const lines = rulesText.split(/[\n.]+/);
      lines.forEach((line) => {
        const clean = line.trim();
        if (!clean) return;

        // Try colon-based formats: "Vai trò: ..."
        const colonIdx = clean.indexOf(":");
        if (colonIdx !== -1) {
          const key = clean.substring(0, colonIdx).trim().toLowerCase();
          const val = clean.substring(colonIdx + 1).trim();
          if (val) {
            if ((key.includes("vai trò") || key.includes("role")) && props.every((p) => p.icon !== "🎭")) {
              props.push({ icon: "🎭", label: language === "vi" ? "Vai trò" : "Role", value: val });
            } else if ((key.includes("tông giọng") || key.includes("sắc thái") || key.includes("tone") || key.includes("hành văn")) && props.every((p) => p.icon !== "💬")) {
              props.push({ icon: "💬", label: language === "vi" ? "Tông giọng" : "Tone", value: val });
            } else if ((key.includes("xưng hô") || key.includes("pronoun")) && props.every((p) => p.icon !== "👥")) {
              props.push({ icon: "👥", label: language === "vi" ? "Xưng hô" : "Pronouns", value: val });
            }
          }
        } else {
          // Sentence-based formats: "Bạn đóng vai trò là Người kể chuyện"
          const personaMatch = clean.match(/(?:vai trò là|role is)\s+([^,\n.]+)/i);
          const toneMatch = clean.match(/(?:tông giọng|sắc thái|tone is|hành văn với tông giọng)\s+([^,\n.]+)/i);
          const pronounMatch = clean.match(/(?:xưng hô với người đọc là|pronoun is)\s+([^,\n.]+)/i);
          
          if (personaMatch && props.every((p) => p.icon !== "🎭")) {
            props.push({ icon: "🎭", label: language === "vi" ? "Vai trò" : "Role", value: personaMatch[1].trim() });
          }
          if (toneMatch && props.every((p) => p.icon !== "💬")) {
            props.push({ icon: "💬", label: language === "vi" ? "Tông giọng" : "Tone", value: toneMatch[1].trim() });
          }
          if (pronounMatch && props.every((p) => p.icon !== "👥")) {
            props.push({ icon: "👥", label: language === "vi" ? "Xưng hô" : "Pronouns", value: pronounMatch[1].trim() });
          }
        }
      });
    }
    
    // Add default values for a completely full card layout if still empty
    if (props.length === 0) {
      props.push({ icon: "🎭", label: language === "vi" ? "Vai trò" : "Role", value: language === "vi" ? "Chuyên gia sáng tạo" : "Creative Expert" });
      props.push({ icon: "💬", label: language === "vi" ? "Tông giọng" : "Tone", value: language === "vi" ? "Tự nhiên, thuyết phục" : "Natural, persuasive" });
    }

    return props.slice(0, 3);
  }, [preset, language]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      onClick={() => onSelect(preset)}
      className="relative group bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl p-5 hover:shadow-xl hover:shadow-primary/5 dark:hover:shadow-none hover:border-primary/50 dark:hover:border-primary/50 transition-all duration-300 flex flex-col justify-between min-h-[220px] hover:-translate-y-0.5 cursor-pointer"
    >
      <div>
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5 min-w-0">
            {preset.is_default && (
              <span className="inline-flex items-center gap-0.5 text-[9px] font-black px-2.5 py-1 bg-amber-500/10 dark:bg-amber-500/5 text-amber-600 dark:text-amber-400 rounded-full border border-amber-500/20 select-none shrink-0">
                ⭐ {language === "vi" ? "Mặc định" : "Default"}
              </span>
            )}
            {preset.is_system && (
              <span className="inline-flex items-center gap-0.5 text-[9px] font-black px-2.5 py-1 bg-sky-500/10 dark:bg-sky-500/5 text-sky-600 dark:text-sky-400 rounded-full border border-sky-500/20 select-none shrink-0">
                🏷️ {language === "vi" ? "Mẫu" : "Template"}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
            {/* Kebab menu */}
            {!preset.is_system && (
              <div className="relative" ref={menuRef}>
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
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -4 }}
                      transition={{ duration: 0.12 }}
                      className="absolute right-0 top-8 z-20 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl shadow-lg overflow-hidden min-w-[135px]"
                    >
                      <button
                        type="button"
                        onClick={() => { setMenuOpen(false); onEdit(preset); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-zinc-800 cursor-pointer border-0 bg-transparent text-left"
                      >
                        <Pencil size={12} /> {language === "vi" ? "Sửa" : "Edit"}
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
            )}
          </div>
        </div>

        {/* Name */}
        <h3 className="font-bold text-base text-slate-900 dark:text-white line-clamp-2 mb-2.5 group-hover:text-primary transition-colors min-h-[44px]">
          {preset.name}
        </h3>

        {/* Objectives as Badges */}
        {objectives.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {objectives.slice(0, 2).map((obj: string, i: number) => (
              <span key={i} className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-violet-500/10 dark:bg-violet-500/5 text-violet-700 dark:text-violet-400 border border-violet-500/15 max-w-[120px] truncate">
                🎯 {obj}
              </span>
            ))}
            {objectives.length > 2 && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-lg text-[9px] font-bold bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 border border-slate-200/50 dark:border-zinc-700/50">
                +{objectives.length - 2}
              </span>
            )}
          </div>
        )}

        {/* Style Properties Grid */}
        {parsedProps.length > 0 && (
          <div className="grid grid-cols-1 gap-2 bg-slate-50/50 dark:bg-zinc-950/40 border border-slate-100/50 dark:border-zinc-950/70 p-3 rounded-2xl mb-1.5">
            {parsedProps.map((p, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs gap-3">
                <span className="text-slate-400 dark:text-zinc-550 font-bold flex items-center gap-1.5 shrink-0 select-none text-[10px]">
                  <span>{p.icon}</span>
                  <span>{p.label}</span>
                </span>
                <span className="text-slate-700 dark:text-zinc-300 font-extrabold truncate text-right text-[11px]">
                  {p.value}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-zinc-800/80">
        <div className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-zinc-500 font-medium">
          <Calendar size={11} />
          <span>
            {preset.is_system 
              ? (language === "vi" ? "Hệ thống" : "System")
              : new Date(preset.created_at).toLocaleDateString(language === "vi" ? "vi-VN" : "en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric"
                })}
          </span>
        </div>
        <div className="flex items-center gap-1 text-[11px] font-black text-primary group-hover:translate-x-0.5 transition-all duration-200">
          <span>{language === "vi" ? "Xem chi tiết" : "Details"}</span>
          <ArrowRight size={11} className="group-hover:translate-x-0.5 transition-transform duration-200" />
        </div>
      </div>
    </motion.div>
  );
}

// ─── PresetDetailModal ───────────────────────────────────────────────────────

function PresetDetailModal({
  preset,
  language,
  onClose,
  onEdit,
}: {
  preset: PromptConfigRecord | null;
  language: string;
  onClose: () => void;
  onEdit: (p: PromptConfigRecord) => void;
}) {
  if (!preset) return null;

  const objectives = preset.params?.objectives || (preset.params?.objective ? [preset.params.objective] : []);

  // Parse rules to render structured rows
  const parsedRules = (() => {
    if (!preset.rules) return [];
    
    // Check if JSON rules
    try {
      const parsed = JSON.parse(preset.rules);
      if (parsed && typeof parsed === "object") {
        // Handle JSON format
        const list: { key: string; val: string; isAdditional?: boolean }[] = [];
        if (parsed.general) {
          const generalLines = parsed.general.split("\n").filter((l: string) => l.trim());
          generalLines.forEach((line: string) => {
            if (line.startsWith("Lưu ý và nguyên tắc bổ sung:") || line.startsWith("Lưu ý:")) {
              list.push({
                key: language === "vi" ? "Nguyên tắc bổ sung" : "Additional Rules",
                val: line.replace(/^(Lưu ý và nguyên tắc bổ sung:|Lưu ý:)/i, "").trim(),
                isAdditional: true,
              });
            } else {
              const colonIdx = line.indexOf(":");
              if (colonIdx !== -1) {
                list.push({
                  key: line.substring(0, colonIdx).replace(/^-/, "").trim(),
                  val: line.substring(colonIdx + 1).trim(),
                });
              } else {
                list.push({
                  key: language === "vi" ? "Quy định chung" : "General Rule",
                  val: line.replace(/^-/, "").trim(),
                });
              }
            }
          });
        }
        
        // Add platform rules if any
        if (preset.platform === "all") {
          if (parsed.facebook) list.push({ key: "Facebook Style", val: parsed.facebook });
          if (parsed.instagram) list.push({ key: "Instagram Style", val: parsed.instagram });
          if (parsed.threads) list.push({ key: "Threads Style", val: parsed.threads });
        }
        
        return list;
      }
    } catch {
      // Fallback to text splitting
    }

    const list: { key: string; val: string; isAdditional?: boolean }[] = [];
    const lines = preset.rules.split("\n").filter(l => l.trim());
    let inAdditionalSection = false;

    lines.forEach((line) => {
      // Skip redundant objectives line
      if (line.startsWith("Mục tiêu:") || line.startsWith("Objectives:")) return;

      if (line.startsWith("Quy định bổ sung:") || line.startsWith("Nguyên tắc bổ sung:")) {
        inAdditionalSection = true;
        return;
      }

      if (line.startsWith("-")) {
        const cleanLine = line.substring(1).trim();
        const colonIdx = cleanLine.indexOf(":");
        if (colonIdx !== -1) {
          const key = cleanLine.substring(0, colonIdx).trim();
          const val = cleanLine.substring(colonIdx + 1).trim();
          list.push({ key, val, isAdditional: inAdditionalSection });
        } else {
          list.push({ key: language === "vi" ? "Quy tắc" : "Rule", val: cleanLine, isAdditional: inAdditionalSection });
        }
      } else {
        list.push({
          key: inAdditionalSection 
            ? (language === "vi" ? "Nguyên tắc bổ sung" : "Additional Rules")
            : (language === "vi" ? "Quy tắc chung" : "General Rule"),
          val: line.trim(),
          isAdditional: inAdditionalSection || line.toLowerCase().includes("lưu ý")
        });
      }
    });

    return list;
  })();

  const mainRules = parsedRules.filter(r => !r.isAdditional);
  const additionalRules = parsedRules.filter(r => r.isAdditional);

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-zinc-800/80">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-primary/20 bg-primary/5 text-primary">
              <Sparkles size={10} />
              {language === "vi" ? "Chi tiết Văn phong" : "Style Details"}
            </span>
            {preset.is_default && (
              <span className="inline-flex items-center gap-0.5 text-[9px] font-black px-2 py-0.5 bg-amber-500/10 dark:bg-amber-500/5 text-amber-600 dark:text-amber-400 rounded-full border border-amber-500/25">
                ⭐ {language === "vi" ? "Mặc định" : "Default"}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-700 dark:hover:text-slate-200 transition-all cursor-pointer border-0 bg-transparent"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 scrollbar-thin">
          {/* Title */}
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">
              {preset.name}
            </h2>
            {objectives.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {objectives.map((obj: string, i: number) => (
                  <span key={i} className="inline-flex items-center gap-0.5 px-2.5 py-0.5 rounded-lg text-[10.5px] font-bold bg-violet-500/10 dark:bg-violet-500/5 text-violet-700 dark:text-violet-400 border border-violet-500/15">
                    🎯 {obj}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Rules List */}
          <div className="space-y-3.5 pt-1.5">
            <h3 className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">
              {language === "vi" ? "Quy tắc văn phong" : "Style Guidelines"}
            </h3>

            {mainRules.length === 0 ? (
              <p className="text-sm text-slate-450 dark:text-zinc-500 italic">
                {language === "vi" ? "Chưa có quy tắc văn phong nào được thiết lập." : "No style rules set."}
              </p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-zinc-800/60 border border-slate-100 dark:border-zinc-800/80 rounded-2xl overflow-hidden bg-slate-50/20 dark:bg-zinc-950/20">
                {mainRules.map((rule, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3.5 text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/75 dark:bg-primary/90 shrink-0 mt-1.5" />
                    <div className="flex-1 min-w-0">
                      <span className="font-bold text-slate-700 dark:text-zinc-200 block mb-0.5 text-xs">{rule.key}</span>
                      <span className="text-slate-600 dark:text-zinc-400 leading-relaxed">{rule.val}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Additional Rules Section */}
          {additionalRules.length > 0 && (
            <div className="space-y-2 pt-1">
              <h3 className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">
                {language === "vi" ? "Nguyên tắc bổ sung" : "Additional Rules"}
              </h3>
              <div className="p-4 rounded-2xl bg-amber-50/30 dark:bg-amber-950/10 border border-amber-500/10 text-slate-600 dark:text-zinc-400 text-sm leading-relaxed space-y-2">
                {additionalRules.map((rule, idx) => (
                  <p key={idx}>{rule.val}</p>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-zinc-900/60 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between">
          <div className="text-[10px] text-slate-400 dark:text-zinc-500">
            {language === "vi" ? "Tạo lúc: " : "Created: "}
            <span className="font-medium">
              {preset.is_system 
                ? (language === "vi" ? "Mặc định hệ thống" : "System default") 
                : new Date(preset.created_at).toLocaleString(language === "vi" ? "vi-VN" : "en-US")}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-zinc-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-zinc-700/80 transition-all cursor-pointer border-0"
            >
              {language === "vi" ? "Đóng" : "Close"}
            </button>
            {!preset.is_system && (
              <button
                type="button"
                onClick={() => { onClose(); onEdit(preset); }}
                className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-xs font-semibold text-white transition-all cursor-pointer border-0 shadow-sm"
              >
                {language === "vi" ? "Chỉnh sửa" : "Edit"}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

// ─── Interactive WizardModal ──────────────────────────────────────────────────

function WizardModal({
  open,
  editPreset,
  onClose,
  onSaved,
  lang,
}: {
  open: boolean;
  editPreset: PromptConfigRecord | null;
  onClose: () => void;
  onSaved: () => void;
  lang: string;
}) {
  const [step, setStep] = useState(0); // 0: Objective, 1..N: AI Steps, N+1: Confirm
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form State
  const [selectedObjectives, setSelectedObjectives] = useState<string[]>([]);
  const [customObjective, setCustomObjective] = useState("");
  const [aiSteps, setAiSteps] = useState<GeneratedQuestionStep[]>([]);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({});
  const [name, setName] = useState("");
  const [additionalRules, setAdditionalRules] = useState("");
  const [platform, setPlatform] = useState<Platform>("all");
  const [isDefault, setIsDefault] = useState(false);

  const validateCustomInput = (text: string): { isValid: boolean; errorMsg?: string } => {
    const trimmed = text.trim();
    if (!trimmed) {
      return { isValid: false };
    }
    if (trimmed.length < 4) {
      return { 
        isValid: false, 
        errorMsg: lang === "vi" ? "Nội dung quá ngắn (tối thiểu 4 ký tự)" : "Too short (minimum 4 characters)" 
      };
    }
    if (trimmed.length > 80) {
      return { 
        isValid: false, 
        errorMsg: lang === "vi" ? "Nội dung quá dài (tối đa 80 ký tự)" : "Too long (maximum 80 characters)" 
      };
    }
    if (/(.)\1{3,}/.test(trimmed)) {
      return { 
        isValid: false, 
        errorMsg: lang === "vi" ? "Vui lòng tránh lặp ký tự vô nghĩa" : "Please avoid repetitive characters" 
      };
    }
    const hasVowels = /[aeiouyàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹ]/i.test(trimmed);
    if (!hasVowels) {
      return { 
        isValid: false, 
        errorMsg: lang === "vi" ? "Vui lòng nhập từ có nghĩa" : "Please enter a valid word" 
      };
    }
    return { isValid: true };
  };

  // Rotating loading messages to improve UX perceived latency
  const [statusIdx, setStatusIdx] = useState(0);
  const loadingStatuses = useMemo(() => lang === "vi" ? [
    "Đang kết nối với AI Engine của AntBiz...",
    "Đang phân tích các mục tiêu thương hiệu đã chọn...",
    "Đang tối ưu hóa lộ trình câu hỏi định dạng văn phong...",
    "Đang cấu trúc bộ câu hỏi định hướng cá nhân hóa...",
    "Đang chuẩn bị giao diện câu hỏi tương tác..."
  ] : [
    "Connecting to AntBiz AI Engine...",
    "Analyzing selected brand objectives...",
    "Optimizing questionnaire path for your style...",
    "Structuring personalized brand questions...",
    "Preparing the interactive questionnaire interface..."
  ], [lang]);

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const objectivesToSend = useMemo(() => {
    return selectedObjectives.map(obj => obj === "Khác" ? customObjective : obj).filter(Boolean);
  }, [selectedObjectives, customObjective]);

  useEffect(() => {
    if (!open) {
      setStatusIdx(0);
      return;
    }
    if (!isGenerating) {
      setStatusIdx(0);
      return;
    }
    const interval = setInterval(() => {
      setStatusIdx(prev => (prev + 1) % loadingStatuses.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [isGenerating, loadingStatuses.length, open]);

  useEffect(() => {
    // Tự động sinh tên văn phong khi tới bước cuối (Xác nhận)
    if (step > 0 && step > aiSteps.length && !name) {
      if (objectivesToSend.length > 0) {
        setName(lang === "vi" ? `Văn phong ${objectivesToSend.join(" & ")}` : `${objectivesToSend.join(" & ")} Style`);
      } else {
        setName(lang === "vi" ? "Văn phong Mặc định" : "Default Style");
      }
    }
  }, [step, aiSteps.length, name, objectivesToSend, lang]);


  useEffect(() => {
    if (!open) {
      setStep(0);
      setSelectedObjectives([]);
      setCustomObjective("");
      setAiSteps([]);
      setAnswers({});
      setCustomAnswers({});
      setName("");
      setAdditionalRules("");
      setPlatform("all");
      setIsDefault(false);
    } else if (editPreset) {
      // Editing Mode - Skip wizard steps, jump to confirm with existing data
      setStep(-1); // Special mode for direct editing
      setName(editPreset.name);
      setPlatform(editPreset.platform as Platform);
      setAdditionalRules(editPreset.rules || "");
      setIsDefault(editPreset.is_default);
      
      if (editPreset.params) {
        const objs = editPreset.params.objectives
          ? editPreset.params.objectives
          : (editPreset.params.objective ? [editPreset.params.objective] : []);
        setSelectedObjectives(objs);
        setAiSteps(editPreset.params.aiSteps || []);
        
        // Normalize loaded answers to string[]
        const loadedAnswers: Record<string, string[]> = {};
        if (editPreset.params.answers) {
          Object.entries(editPreset.params.answers).forEach(([key, val]) => {
            if (Array.isArray(val)) {
              loadedAnswers[key] = val;
            } else if (typeof val === "string") {
              loadedAnswers[key] = [val];
            }
          });
        }
        setAnswers(loadedAnswers);
      }
    }
  }, [open, editPreset]);

  const toggleObjective = (id: string) => {
    if (selectedObjectives.includes(id)) {
      setSelectedObjectives(selectedObjectives.filter((o) => o !== id));
    } else {
      if (selectedObjectives.length < 2) {
        setSelectedObjectives([...selectedObjectives, id]);
      }
    }
  };


  const handleGenerateQuestions = async () => {
    if (objectivesToSend.length === 0) return;
    setIsGenerating(true);
    try {
      const res = await fetch("/api/prompt-configs/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          objectives: objectivesToSend,
          objective: objectivesToSend.join(", "),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setAiSteps(data.steps || []);
        setStep(1);
      } else {
        alert(lang === "vi" ? "Lỗi sinh câu hỏi. Vui lòng thử lại." : "Error generating questions.");
      }
    } catch (e) {
      console.error(e);
      alert(lang === "vi" ? "Lỗi kết nối. Vui lòng thử lại." : "Connection error.");
    } finally {
      setIsGenerating(false);
    }
  };

  const compiledRules = useMemo(() => {
    const aiRules = aiSteps
      .map(s => {
        const selectedOpts = answers[s.key] || [];
        const normalizedOpts = selectedOpts.map(opt => opt === "Khác" ? customAnswers[s.key] : opt).filter(Boolean);
        const ans = normalizedOpts.join(", ");
        const title = s.label || s.question.replace(/\?$/, "");
        return ans ? `- ${title}: ${ans}` : "";
      })
      .filter(Boolean)
      .join("\n");
    
    const labelObjectives = lang === "vi" ? "Mục tiêu" : "Objectives";
    const labelAdditionalRules = lang === "vi" ? "Quy định bổ sung" : "Additional Rules";
    const baseRules = `${labelObjectives}: ${objectivesToSend.join(", ")}\n${aiRules}`;
    if (additionalRules.trim()) {
      return `${baseRules}\n\n${labelAdditionalRules}:\n${additionalRules.trim()}`;
    }
    return baseRules;
  }, [aiSteps, answers, customAnswers, objectivesToSend, additionalRules, lang]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      const body = {
        name: name.trim(),
        platform,
        rules: compiledRules,
        is_default: isDefault,
        params: {
          objectives: objectivesToSend,
          objective: objectivesToSend.join(", "),
          aiSteps,
          answers: Object.fromEntries(
            Object.entries(answers).map(([k, v]) => {
              const mappedArr = (v || []).map(opt => opt === "Khác" ? customAnswers[k] : opt).filter(Boolean);
              return [k, mappedArr];
            })
          )
        }
      };
      const url = editPreset ? `/api/prompt-configs/${editPreset.id}` : "/api/prompt-configs";
      const method = editPreset ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        onSaved();
        onClose();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || (lang === "vi" ? "Lỗi khi lưu Văn phong" : "Error saving Brand Style"));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  if (!open || !isMounted) return null;

  const totalSteps = aiSteps.length > 0 ? aiSteps.length + 2 : 2;
  const progressPercent = step === -1 ? 100 : Math.round((step / (totalSteps - 1)) * 100);

  const modalContent = (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="bg-white dark:bg-zinc-950 rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200 dark:border-zinc-800 flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b border-slate-100 dark:border-zinc-800/80 flex items-center justify-between shrink-0">
            <div className="flex-1 pr-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-base font-bold text-slate-800 dark:text-zinc-200">
                  {editPreset
                    ? (lang === "vi" ? "Chỉnh sửa Văn phong" : "Edit Brand Style")
                    : (lang === "vi" ? "Kiến tạo Văn phong Thương hiệu" : "Create Brand Style")}
                </h2>
                {step > 0 && step <= aiSteps.length && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-primary/10 text-primary">
                    {lang === "vi" ? `Bước ${step}/${aiSteps.length}` : `Step ${step}/${aiSteps.length}`}
                  </span>
                )}
              </div>
              {step !== -1 && (
                <div className="w-full h-1.5 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-primary to-violet-500 transition-all duration-300" style={{ width: `${progressPercent}%` }} />
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer border-0"
            >
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto flex-1">
            <AnimatePresence mode="wait">
              {/* Step 0: Objective */}
              {step === 0 && !isGenerating && (
                <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  <div className="text-center mb-5">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">
                      {lang === "vi" ? "Mục tiêu cốt lõi của bạn là gì?" : "What are your core objectives?"}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                      {lang === "vi" ? "Chọn tối đa 2 mục tiêu để AI thiết kế bộ câu hỏi tối ưu nhất cho văn phong của bạn." : "Select up to 2 objectives to let AI tailor the best questionnaire path."}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {OBJECTIVES.map((obj) => {
                      const isSelected = selectedObjectives.includes(obj.id);
                      const isDisabled = selectedObjectives.length >= 2 && !isSelected;

                      return (
                        <button
                          key={obj.id}
                          type="button"
                          disabled={isDisabled}
                          onClick={() => toggleObjective(obj.id)}
                          className={`flex items-center gap-3.5 p-4 rounded-2xl border text-sm font-semibold transition-all ${
                            isSelected
                              ? "border-primary bg-primary/5 text-primary shadow-sm shadow-primary/5 ring-1 ring-primary/20 cursor-pointer"
                              : isDisabled
                              ? "border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/30 text-slate-400 dark:text-zinc-600 opacity-40 cursor-not-allowed"
                              : "border-slate-150 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-200 hover:border-slate-300 dark:hover:border-zinc-700 cursor-pointer"
                          }`}
                        >
                          <span className="text-2xl shrink-0">{obj.icon}</span>
                          <span className="leading-snug">{obj.label}</span>
                        </button>
                      );
                    })}
                    {(() => {
                      const isKhacSelected = selectedObjectives.includes("Khác");
                      const isKhacDisabled = selectedObjectives.length >= 2 && !isKhacSelected;

                      return (
                        <button
                          type="button"
                          disabled={isKhacDisabled}
                          onClick={() => toggleObjective("Khác")}
                          className={`flex items-center gap-3.5 p-4 rounded-2xl border text-sm font-semibold transition-all ${
                            isKhacSelected
                              ? "border-primary bg-primary/5 text-primary shadow-sm shadow-primary/5 ring-1 ring-primary/20 cursor-pointer"
                              : isKhacDisabled
                              ? "border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/30 text-slate-400 dark:text-zinc-600 opacity-40 cursor-not-allowed"
                              : "border-slate-150 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-200 hover:border-slate-300 dark:hover:border-zinc-700 cursor-pointer"
                          }`}
                        >
                          <span className="text-2xl shrink-0">✨</span>
                          <span>{lang === "vi" ? "Khác..." : "Other..."}</span>
                        </button>
                      );
                    })()}
                  </div>
                  {selectedObjectives.includes("Khác") && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-3 space-y-1.5">
                      <input
                        type="text"
                        value={customObjective}
                        onChange={(e) => setCustomObjective(e.target.value)}
                        placeholder={lang === "vi" ? "Nhập mục tiêu cụ thể của bạn..." : "Enter your specific objective..."}
                        className={`w-full px-4 py-3 rounded-xl border bg-slate-50 dark:bg-zinc-900 focus:ring-2 focus:ring-primary/20 outline-none text-sm text-slate-800 dark:text-white transition-all ${
                          customObjective.trim() && !validateCustomInput(customObjective).isValid
                            ? "border-rose-500 focus:border-rose-500 focus:ring-rose-550/20"
                            : "border-slate-200 dark:border-zinc-700 focus:border-primary/55"
                        }`}
                        autoFocus
                      />
                      {customObjective.trim() && !validateCustomInput(customObjective).isValid && (
                        <p className="text-[11px] font-semibold text-rose-500 dark:text-rose-400 pl-1">
                          {validateCustomInput(customObjective).errorMsg}
                        </p>
                      )}
                    </motion.div>
                  )}
                </motion.div>
              )}

              {/* Generating AI Steps */}
              {isGenerating && (
                <motion.div key="generating" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-16">
                  <div className="relative w-14 h-14 flex items-center justify-center mb-6">
                    <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-primary rounded-full border-t-transparent animate-spin"></div>
                    <Sparkles className="text-primary animate-pulse" size={20} />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                    {lang === "vi" ? "AI đang xây dựng lộ trình câu hỏi..." : "AI is analyzing..."}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 text-center max-w-xs h-8 flex items-center justify-center animate-pulse">
                    {loadingStatuses[statusIdx]}
                  </p>
                </motion.div>
              )}

              {/* Step 1..N: Dynamic AI Questions */}
              {step > 0 && step <= aiSteps.length && (() => {
                const currentStepData = aiSteps[step - 1];
                const currentKey = currentStepData.key;
                const currentAnswers = answers[currentKey] || [];
                const isLimitReached = currentAnswers.length >= 2;

                return (
                  <motion.div key={`step_${step}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                    <div className="text-center">
                      <h3 className="text-lg font-black text-slate-900 dark:text-white leading-snug">
                        {currentStepData.question}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                        {lang === "vi" ? "Chọn tối đa 2 đáp án." : "Select up to 2 options."}
                      </p>
                    </div>
                    
                    <div className="flex flex-col gap-2.5 max-w-lg mx-auto">
                      {currentStepData.options.map((opt, idx) => {
                        const letters = ["A", "B", "C", "D", "E", "F"];
                        const letter = letters[idx] || "";
                        const isSelected = currentAnswers.includes(opt);
                        const isDisabled = isLimitReached && !isSelected;

                        return (
                          <button
                            key={idx}
                            type="button"
                            disabled={isDisabled}
                            onClick={() => {
                              if (isSelected) {
                                setAnswers(prev => ({ ...prev, [currentKey]: (prev[currentKey] || []).filter(x => x !== opt) }));
                              } else if (!isLimitReached) {
                                setAnswers(prev => ({ ...prev, [currentKey]: [...(prev[currentKey] || []), opt] }));
                              }
                            }}
                            className={`group w-full px-4 py-3.5 rounded-2xl border text-sm font-semibold transition-all flex items-center gap-3.5 ${
                              isSelected
                                ? "border-primary bg-primary/5 text-primary shadow-sm shadow-primary/5 ring-1 ring-primary/10 cursor-pointer"
                                : isDisabled
                                ? "border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/30 text-slate-400 dark:text-zinc-600 opacity-40 cursor-not-allowed"
                                : "border-slate-150 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-200 hover:border-primary/40 hover:bg-slate-50 dark:hover:bg-zinc-800/40 cursor-pointer"
                            }`}
                          >
                            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 transition-all ${
                              isSelected
                                ? "bg-primary text-white"
                                : isDisabled
                                ? "bg-slate-100/50 dark:bg-zinc-900/50 text-slate-300 dark:text-zinc-700"
                                : "bg-slate-100 dark:bg-zinc-800 text-slate-555 dark:text-slate-400 group-hover:bg-primary/15 group-hover:text-primary"
                            }`}>
                              {letter}
                            </span>
                            <span className="text-left leading-normal flex-1">{opt}</span>
                          </button>
                        );
                      })}
                      
                      {/* Other option */}
                      <div className="relative">
                        {(() => {
                          const isSelected = currentAnswers.includes("Khác");
                          const isDisabled = isLimitReached && !isSelected;

                          return (
                            <button
                              type="button"
                              disabled={isDisabled}
                              onClick={() => {
                                if (isSelected) {
                                  setAnswers(prev => ({ ...prev, [currentKey]: (prev[currentKey] || []).filter(x => x !== "Khác") }));
                                } else if (!isLimitReached) {
                                  setAnswers(prev => ({ ...prev, [currentKey]: [...(prev[currentKey] || []), "Khác"] }));
                                }
                              }}
                              className={`group w-full px-4 py-3.5 rounded-2xl border text-sm font-semibold transition-all flex items-center gap-3.5 ${
                                isSelected
                                  ? "border-primary bg-primary/5 text-primary shadow-sm ring-1 ring-primary/10 cursor-pointer"
                                  : isDisabled
                                  ? "border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/30 text-slate-400 dark:text-zinc-600 opacity-40 cursor-not-allowed"
                                  : "border-slate-150 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-200 hover:border-primary/40 hover:bg-slate-50 dark:hover:bg-zinc-800/40 cursor-pointer"
                              }`}
                            >
                              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 transition-all ${
                                isSelected
                                  ? "bg-primary text-white"
                                  : isDisabled
                                  ? "bg-slate-100/50 dark:bg-zinc-900/50 text-slate-300 dark:text-zinc-700"
                                  : "bg-slate-100 dark:bg-zinc-800 text-slate-555 dark:text-slate-400"
                              }`}>
                                ✎
                              </span>
                              <span className="text-left flex-1">{lang === "vi" ? "Lựa chọn khác..." : "Other response..."}</span>
                            </button>
                          );
                        })()}
                        
                         <AnimatePresence>
                          {currentAnswers.includes("Khác") && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-3 space-y-1.5">
                              <input
                                type="text"
                                value={customAnswers[currentKey] || ""}
                                onChange={(e) => setCustomAnswers(prev => ({ ...prev, [currentKey]: e.target.value }))}
                                placeholder={lang === "vi" ? "Nhập văn phong mong muốn của bạn..." : "Type your customized tone..."}
                                className={`w-full px-4 py-3 rounded-xl border bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-primary/20 outline-none text-sm text-slate-800 dark:text-white transition-all ${
                                  (customAnswers[currentKey] || "").trim() && !validateCustomInput(customAnswers[currentKey] || "").isValid
                                    ? "border-rose-500 focus:border-rose-500 focus:ring-rose-550/20"
                                    : "border-primary/45 focus:border-primary"
                                }`}
                                autoFocus
                              />
                              {(customAnswers[currentKey] || "").trim() && !validateCustomInput(customAnswers[currentKey] || "").isValid && (
                                <p className="text-[11px] font-semibold text-rose-550 pl-1">
                                  {validateCustomInput(customAnswers[currentKey] || "").errorMsg}
                                </p>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </motion.div>
                );
              })()}

              {/* Step -1: Direct Edit Mode */}
              {step === -1 && (
                <motion.div key="edit-mode" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-650 dark:text-slate-350 mb-1">
                        {lang === "vi" ? "Tên Văn phong" : "Style Name"} <span className="text-rose-550">*</span>
                      </label>
                      <input
                        type="text"
                        spellCheck={false}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={lang === "vi" ? "Ví dụ: Facebook Bán hàng Thân thiện" : "e.g., Friendly Sales Style"}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all font-semibold"
                      />
                    </div>
                    <div className="flex items-end pb-3">
                      <label className="flex items-center gap-2.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isDefault}
                          onChange={(e) => setIsDefault(e.target.checked)}
                          className="w-4.5 h-4.5 text-primary rounded border-slate-300 focus:ring-primary cursor-pointer transition-all"
                        />
                        <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                          {lang === "vi" ? "Đặt làm mặc định" : "Set as default"}
                        </span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-650 dark:text-slate-350 mb-1">
                      {lang === "vi" ? "Quy định & Nguyên tắc văn phong" : "Style Rules & Principles"}
                    </label>
                    <textarea
                      value={additionalRules}
                      spellCheck={false}
                      onChange={(e) => setAdditionalRules(e.target.value)}
                      placeholder={lang === "vi" ? "Nhập chi tiết các nguyên tắc và văn phong viết bài..." : "Enter detailed style guidelines..."}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all resize-y min-h-[260px] font-medium leading-relaxed"
                    />
                  </div>
                </motion.div>
              )}

              {/* Step N+1: Confirm Wizard Mode */}
              {step > aiSteps.length && (
                <motion.div key="confirm-wizard" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  <div className="bg-emerald-50 dark:bg-emerald-950/20 p-3.5 rounded-2xl flex gap-3 border border-emerald-100 dark:border-emerald-950/30">
                    <CheckCircle2 className="text-emerald-555 shrink-0 mt-0.5" size={16} />
                    <div>
                      <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                        {lang === "vi" ? "Đã thu thập đủ thông tin!" : "Information collected!"}
                      </h4>
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 leading-normal">
                        {lang === "vi" 
                          ? "Bạn có thể điều chỉnh lại các quy định bên dưới hoặc bổ sung nguyên tắc riêng."
                          : "You can adjust the rules below or add your own principles."}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-650 dark:text-slate-350 mb-1">
                        {lang === "vi" ? "Tên Văn phong" : "Style Name"} <span className="text-rose-550">*</span>
                      </label>
                      <input
                        type="text"
                        spellCheck={false}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={lang === "vi" ? "Ví dụ: Facebook Bán hàng Thân thiện" : "e.g., Friendly Sales Style"}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all font-semibold"
                      />
                    </div>
                    <div className="flex items-end pb-3">
                      <label className="flex items-center gap-2.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isDefault}
                          onChange={(e) => setIsDefault(e.target.checked)}
                          className="w-4.5 h-4.5 text-primary rounded border-slate-300 focus:ring-primary cursor-pointer transition-all"
                        />
                        <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                          {lang === "vi" ? "Đặt làm mặc định" : "Set as default"}
                        </span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-650 dark:text-slate-350 mb-1">
                      {lang === "vi" ? "Nguyên tắc bổ sung" : "Additional Rules"}
                    </label>
                    <textarea
                      value={additionalRules}
                      spellCheck={false}
                      onChange={(e) => setAdditionalRules(e.target.value)}
                      placeholder={lang === "vi" ? "Ví dụ: Luôn dùng emoji ở đầu câu, không viết quá 3 câu mỗi đoạn..." : "E.g., Always use emojis, keep paragraphs short..."}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all resize-y min-h-[90px] mb-4 font-semibold"
                    />
                  </div>

                  <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 p-4">
                    <label className="block text-[10px] font-black text-primary/80 dark:text-primary/95 mb-2.5 uppercase tracking-wider">
                      {lang === "vi" ? "Xem trước Văn phong AI" : "AI Style Preview"}
                    </label>
                    <div className="text-xs text-slate-700 dark:text-zinc-300 space-y-1.5 whitespace-pre-line font-medium leading-relaxed max-h-[160px] overflow-y-auto pr-1">
                      {compiledRules}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between bg-slate-50 dark:bg-zinc-900/50">
            <button
              type="button"
              onClick={() => {
                if (step === -1) onClose();
                else if (step === 0) onClose();
                else setStep(s => s - 1);
              }}
              disabled={isGenerating}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded-xl transition-all cursor-pointer border-0 disabled:opacity-50"
            >
              <ChevronLeft size={14} /> {step <= 0 ? (lang === "vi" ? "Hủy" : "Cancel") : (lang === "vi" ? "Quay lại" : "Back")}
            </button>

            {step === 0 ? (
              <button
                type="button"
                onClick={handleGenerateQuestions}
                disabled={selectedObjectives.length === 0 || (selectedObjectives.includes("Khác") && !validateCustomInput(customObjective).isValid) || isGenerating}
                className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold bg-primary hover:bg-primary/90 text-white rounded-xl transition-all cursor-pointer border-0 shadow-sm disabled:opacity-50"
              >
                {lang === "vi" ? "Bắt đầu định hình" : "Start generating"} <ChevronRight size={14} />
              </button>
            ) : step > 0 && step <= aiSteps.length ? (() => {
              const currentKey = aiSteps[step - 1].key;
              const selectedOpts = answers[currentKey] || [];
              const isNextDisabled = selectedOpts.length === 0 || (selectedOpts.includes("Khác") && !validateCustomInput(customAnswers[currentKey] || "").isValid);

              return (
                <button
                  type="button"
                  onClick={() => setStep(s => s + 1)}
                  disabled={isNextDisabled}
                  className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold bg-primary hover:bg-primary/90 text-white rounded-xl transition-all cursor-pointer border-0 shadow-sm disabled:opacity-50"
                >
                  {lang === "vi" ? "Tiếp theo" : "Next"} <ChevronRight size={14} />
                </button>
              );
            })() : (
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || !name.trim()}
                className="flex items-center gap-1.5 px-6 py-2.5 text-sm font-bold bg-primary hover:bg-primary/90 text-white rounded-xl transition-all cursor-pointer border-0 shadow-md shadow-primary/20 disabled:opacity-50"
              >
                {isSaving ? (
                  <><Loader2 size={16} className="animate-spin" /> {lang === "vi" ? "Đang lưu..." : "Saving..."}</>
                ) : (
                  <><Sparkles size={16} /> {lang === "vi" ? "Lưu Văn phong" : "Save Style"}</>
                )}
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}

// ─── PresetsView (Main) ───────────────────────────────────────────────────────

export default function PresetsView() {
  const { language, t } = useLanguage();
  const lang = language;

  const [presets, setPresets] = useState<PromptConfigRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editingPreset, setEditingPreset] = useState<PromptConfigRecord | null>(null);
  const [viewingPreset, setViewingPreset] = useState<PromptConfigRecord | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchPresets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/prompt-configs");
      if (res.ok) {
        const json = await res.json();
        setPresets(json.data || []);
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

  const displayed = useMemo(() => {
    let list = presets;
    if (!search.trim()) return list;
    return list.filter(
      (p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.rules && p.rules.toLowerCase().includes(search.toLowerCase()))
    );
  }, [presets, search]);

  useEffect(() => {
    const handleGlobalSearch = (e: Event) => {
      const customEvent = e as CustomEvent;
      setSearch(customEvent.detail || "");
    };
    window.addEventListener('global-search', handleGlobalSearch);
    return () => window.removeEventListener('global-search', handleGlobalSearch);
  }, []);

  const handleEdit = (p: PromptConfigRecord) => {
    setEditingPreset(p);
    setWizardOpen(true);
  };

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/prompt-configs/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchPresets();
      }
    } catch {
      alert(lang === "vi" ? "Lỗi khi xóa" : "Error deleting");
    } finally {
      setIsDeleting(false);
      setDeleteConfirmId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Layers className="text-primary" size={28} />
            {t("presets.title") || "Văn phong Thương hiệu"}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t("presets.subtitle") || "Tạo và quản lý các văn phong đặc trưng cho thương hiệu của bạn."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setEditingPreset(null); setWizardOpen(true); }}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-bold transition-all cursor-pointer border-0 shadow-md shadow-primary/20 shrink-0"
        >
          <Plus size={16} />
          {lang === "vi" ? "Tạo Văn phong mới" : "Create New Style"}
        </button>
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
          className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed border-slate-200 dark:border-zinc-800 rounded-3xl"
        >
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 text-primary">
            <Sparkles size={28} />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">
            {search ? (lang === "vi" ? "Không tìm thấy Văn phong" : "No Styles Found") : (lang === "vi" ? "Chưa có Văn phong nào" : "No Brand Styles Yet")}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mb-4">
            {search
              ? lang === "vi" ? "Thử thay đổi từ khóa tìm kiếm." : "Try changing your search term."
              : lang === "vi" ? "Thiết lập văn phong để AI hiểu rõ cách thương hiệu của bạn giao tiếp với khách hàng." : "Set up brand styles to help AI understand how your brand communicates."}
          </p>
          {!search && (
            <button
              type="button"
              onClick={() => { setEditingPreset(null); setWizardOpen(true); }}
              className="flex items-center gap-2 px-5 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-bold transition-all cursor-pointer border-0"
            >
              <Plus size={14} /> {lang === "vi" ? "Bắt đầu thiết lập" : "Start Setup"}
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
                onDelete={(id) => setDeleteConfirmId(id)}
                onSelect={(p) => setViewingPreset(p)}
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
              className="bg-white dark:bg-zinc-900 rounded-2xl p-6 max-w-sm w-full shadow-xl"
            >
              <h3 className="font-bold text-base text-slate-900 dark:text-white mb-2">
                {lang === "vi" ? "Xóa Văn phong?" : "Delete Style?"}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
                {lang === "vi"
                  ? "Hành động này không thể hoàn tác. Văn phong sẽ bị xóa vĩnh viễn."
                  : "This action cannot be undone."}
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 py-2 rounded-xl bg-slate-100 dark:bg-zinc-800 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition-all cursor-pointer border-0"
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

      {/* Preset Detail Modal */}
      <AnimatePresence>
        {viewingPreset && (
          <PresetDetailModal
            preset={viewingPreset}
            language={lang}
            onClose={() => setViewingPreset(null)}
            onEdit={handleEdit}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
