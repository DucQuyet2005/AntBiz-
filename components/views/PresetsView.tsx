/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Plus,
  Search,
  Pencil,
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
  Calendar,
  ArrowRight,
  Star,
  ChevronDown,
  Sparkle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ──────────────────────────────────────────────────────────────────

type Platform = "facebook" | "thread" | "instagram" | "all";
type ActiveTab = "all" | "mine" | "system";

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

const CATEGORIES = [
  { id: "all", label: "Tất cả danh mục" },
  { id: "Bán hàng", label: "Bán hàng & Doanh số" },
  { id: "Thương hiệu", label: "Nhận diện Thương hiệu" },
  { id: "Tương tác", label: "Tương tác & Cộng đồng" },
  { id: "Giáo dục", label: "Giáo dục & Kiến thức" },
  { id: "Tuyển dụng", label: "Tuyển dụng" },
  { id: "Sự kiện", label: "Sự kiện & Truyền thông" },
];

// Helper to get styled preset icon based on name or objectives
function getPresetCategoryIcon(name: string, objectives: string[]) {
  const combined = (name + " " + objectives.join(" ")).toLowerCase();
  if (combined.includes("bán hàng") || combined.includes("sales")) return { icon: "🛒", bg: "bg-amber-50 dark:bg-amber-950/40 text-amber-600" };
  if (combined.includes("thương hiệu") || combined.includes("brand")) return { icon: "🎯", bg: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600" };
  if (combined.includes("tương tác") || combined.includes("viral")) return { icon: "🔥", bg: "bg-rose-50 dark:bg-rose-950/40 text-rose-600" };
  if (combined.includes("giáo dục") || combined.includes("education")) return { icon: "🎓", bg: "bg-blue-50 dark:bg-blue-950/40 text-blue-600" };
  if (combined.includes("chuyên gia") || combined.includes("expert")) return { icon: "👔", bg: "bg-violet-50 dark:bg-violet-950/40 text-violet-600" };
  if (combined.includes("gần gũi") || combined.includes("friend")) return { icon: "👥", bg: "bg-pink-50 dark:bg-pink-950/40 text-pink-600" };
  if (combined.includes("thông báo") || combined.includes("update")) return { icon: "📢", bg: "bg-sky-50 dark:bg-sky-950/40 text-sky-600" };
  return { icon: "✍️", bg: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600" };
}

// ─── PresetCard ───────────────────────────────────────────────────────────────

function PresetCard({
  preset,
  language,
  onEdit,
  onDelete,
  onSelect,
  onSetDefault,
}: {
  preset: PromptConfigRecord;
  language: string;
  onEdit: (p: PromptConfigRecord) => void;
  onDelete: (id: string) => void;
  onSelect: (p: PromptConfigRecord) => void;
  onSetDefault: (preset: PromptConfigRecord) => void;
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

  const categoryIconObj = useMemo(() => {
    return getPresetCategoryIcon(preset.name, objectives);
  }, [preset.name, objectives]);

  const parsedProps = useMemo(() => {
    const props: { icon: string; label: string; value: string }[] = [];

    // 1. Try from questionnaireAnswers if available
    if (preset.params?.questionnaireAnswers) {
      const qa = preset.params.questionnaireAnswers;
      const steps = qa.steps || [];
      const personaStep = steps.find((s: any) => s.key === "persona" || s.question?.toLowerCase().includes("vai trò"));
      const toneStep = steps.find((s: any) => s.key === "tone" || s.question?.toLowerCase().includes("sắc thái") || s.question?.toLowerCase().includes("giọng điệu"));

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
          label: language === "vi" ? "Giọng điệu" : "Tone",
          value: Array.isArray(toneStep.answer) ? toneStep.answer.join(", ") : toneStep.answer
        });
      }
    }

    // 2. Fallback to parse preset.rules
    if (props.length === 0 && preset.rules) {
      let rulesText = preset.rules;
      try {
        const parsed = JSON.parse(preset.rules);
        if (parsed?.general) rulesText = parsed.general;
      } catch { }

      const lines = rulesText.split(/[\n.]+/);
      lines.forEach((line) => {
        const clean = line.trim();
        if (!clean) return;

        const colonIdx = clean.indexOf(":");
        if (colonIdx !== -1) {
          const key = clean.substring(0, colonIdx).trim().toLowerCase();
          const val = clean.substring(colonIdx + 1).trim();
          if (val) {
            if ((key.includes("vai trò") || key.includes("role")) && props.every((p) => p.icon !== "🎭")) {
              props.push({ icon: "🎭", label: language === "vi" ? "Vai trò" : "Role", value: val });
            } else if ((key.includes("tông giọng") || key.includes("giọng điệu") || key.includes("sắc thái") || key.includes("tone")) && props.every((p) => p.icon !== "💬")) {
              props.push({ icon: "💬", label: language === "vi" ? "Giọng điệu" : "Tone", value: val });
            }
          }
        } else {
          const personaMatch = clean.match(/(?:vai trò là|role is)\s+([^,\n.]+)/i);
          const toneMatch = clean.match(/(?:tông giọng|sắc thái|giọng điệu|tone is)\s+([^,\n.]+)/i);

          if (personaMatch && props.every((p) => p.icon !== "🎭")) {
            props.push({ icon: "🎭", label: language === "vi" ? "Vai trò" : "Role", value: personaMatch[1].trim() });
          }
          if (toneMatch && props.every((p) => p.icon !== "💬")) {
            props.push({ icon: "💬", label: language === "vi" ? "Giọng điệu" : "Tone", value: toneMatch[1].trim() });
          }
        }
      });
    }

    // Fallback default values
    if (props.length === 0) {
      props.push({ icon: "🎭", label: language === "vi" ? "Vai trò" : "Role", value: language === "vi" ? "Người dẫn dắt chuyên môn" : "Expert Guide" });
      props.push({ icon: "💬", label: language === "vi" ? "Giọng điệu" : "Tone", value: language === "vi" ? "Trang trọng, chuẩn mực" : "Formal & standard" });
    }

    return props.slice(0, 2);
  }, [preset, language]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      onClick={() => onSelect(preset)}
      className={`relative group bg-white dark:bg-zinc-900 border rounded-2xl p-4 sm:p-5 shadow-2xs hover:shadow-lg hover:shadow-emerald-500/5 hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between cursor-pointer select-none ${preset.is_default
          ? "border-emerald-400 dark:border-emerald-700/70 ring-1 ring-emerald-500/20"
          : "border-gray-200 dark:border-zinc-800/80 hover:border-emerald-300 dark:hover:border-emerald-700"
        }`}
    >
      <div>
        {/* Card Header: Icon, Name, Star (Default toggle), 3-dots */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {/* Category Icon Badge */}
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${categoryIconObj.bg}`}>
              {categoryIconObj.icon}
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-sm text-text leading-tight group-hover:text-primary transition-colors line-clamp-1">
                {preset.name}
              </h3>

              {/* Optional Category Tag under title */}
              <div className="flex items-center gap-1.5 mt-1">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9.5px] font-extrabold bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 border border-violet-200/50 dark:border-violet-800/40 truncate max-w-[150px]">
                  🦄 {objectives[0] || (language === "vi" ? "Văn phong đa năng" : "Versatile Style")}
                </span>
              </div>
            </div>
          </div>

          {/* Right Action Icons: Star & Kebab Menu */}
          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
            {/* Set Default Star Button */}
            <button
              type="button"
              onClick={() => onSetDefault(preset)}
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer border-0 bg-transparent ${preset.is_default
                  ? "text-amber-500 hover:scale-110"
                  : "text-gray-300 hover:text-amber-400 dark:text-zinc-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                }`}
              title={
                preset.is_default
                  ? (language === "vi" ? "Văn phong mặc định" : "Default style")
                  : (language === "vi" ? "Đặt làm văn phong mặc định" : "Set as default style")
              }
            >
              <Star
                className={`w-4 h-4 transition-transform ${preset.is_default
                    ? "fill-amber-400 text-amber-400"
                    : "fill-none stroke-[2]"
                  }`}
              />
            </button>

            {/* Kebab Menu */}
            {!preset.is_system && (
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((v) => !v)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-text transition-all cursor-pointer border-0 bg-transparent"
                >
                  <MoreVertical size={14} />
                </button>
                <AnimatePresence>
                  {menuOpen && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -4 }}
                      transition={{ duration: 0.12 }}
                      className="absolute right-0 top-8 z-30 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-lg overflow-hidden min-w-[130px]"
                    >
                      <button
                        type="button"
                        onClick={() => { setMenuOpen(false); onEdit(preset); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-text hover:bg-gray-50 dark:hover:bg-zinc-800 cursor-pointer border-0 bg-transparent text-left"
                      >
                        <Pencil size={12} /> {language === "vi" ? "Chỉnh sửa" : "Edit"}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setMenuOpen(false); onDelete(preset.id); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer border-0 bg-transparent text-left"
                      >
                        <Trash2 size={12} /> {language === "vi" ? "Xóa" : "Delete"}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {/* Default Badge if Active */}
        {preset.is_default && (
          <div className="mb-2.5">
            <span className="inline-flex items-center gap-1 text-[9.5px] font-black px-2.5 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full border border-amber-500/20 select-none">
              ⭐ {language === "vi" ? "Mặc định" : "Default"}
            </span>
          </div>
        )}

        {/* Rules Overview Grid */}
        <div className="bg-gray-50/70 dark:bg-zinc-950/40 border border-gray-100 dark:border-zinc-800/60 p-3 rounded-xl space-y-2 mb-3">
          {parsedProps.map((p, idx) => (
            <div key={idx} className="flex items-center justify-between text-xs gap-2">
              <span className="text-text-muted font-medium flex items-center gap-1.5 shrink-0 text-[10.5px]">
                <span>{p.icon}</span>
                <span>{p.label}</span>
              </span>
              <span className="text-text font-bold truncate text-right text-[11px] max-w-[140px]">
                {p.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Card Footer: Date & Details Action */}
      <div className="flex items-center justify-between pt-2.5 border-t border-gray-100 dark:border-zinc-800/80 text-xs">
        <div className="flex items-center gap-1 text-[10.5px] text-text-muted font-medium">
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
        <div className="flex items-center gap-1 text-[11px] font-bold text-primary group-hover:translate-x-0.5 transition-all duration-200">
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

  const parsedRules = (() => {
    if (!preset.rules) return [];

    try {
      const parsed = JSON.parse(preset.rules);
      if (parsed && typeof parsed === "object") {
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
        return list;
      }
    } catch { }

    const list: { key: string; val: string; isAdditional?: boolean }[] = [];
    const lines = preset.rules.split("\n").filter(l => l.trim());
    let inAdditionalSection = false;

    lines.forEach((line) => {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-zinc-800/80">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border border-primary/20 bg-primary/10 text-primary">
              <Sparkles size={10} />
              {language === "vi" ? "Chi tiết Văn phong" : "Style Details"}
            </span>
            {preset.is_default && (
              <span className="inline-flex items-center gap-0.5 text-[9px] font-black px-2 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full border border-amber-500/25">
                ⭐ {language === "vi" ? "Mặc định" : "Default"}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-text-muted hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-text transition-all cursor-pointer border-0 bg-transparent"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 scrollbar-thin">
          <div>
            <h2 className="text-xl font-black text-text leading-tight">
              {preset.name}
            </h2>
            {objectives.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {objectives.map((obj: string, i: number) => (
                  <span key={i} className="inline-flex items-center gap-0.5 px-2.5 py-0.5 rounded-lg text-[10.5px] font-bold bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400 border border-violet-200/50 dark:border-violet-800/40">
                    🎯 {obj}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3 pt-1">
            <h3 className="text-xs font-extrabold text-text-muted uppercase tracking-wider">
              {language === "vi" ? "Quy tắc văn phong" : "Style Guidelines"}
            </h3>

            {mainRules.length === 0 ? (
              <p className="text-xs text-text-muted italic">
                {language === "vi" ? "Chưa có quy tắc văn phong nào được thiết lập." : "No style rules set."}
              </p>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-zinc-800/60 border border-gray-100 dark:border-zinc-800/80 rounded-2xl overflow-hidden bg-gray-50/30 dark:bg-zinc-950/20">
                {mainRules.map((rule, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
                    <div className="flex-1 min-w-0">
                      <span className="font-bold text-text block mb-0.5 text-xs">{rule.key}</span>
                      <span className="text-text-muted leading-relaxed">{rule.val}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {additionalRules.length > 0 && (
            <div className="space-y-2 pt-1">
              <h3 className="text-xs font-extrabold text-text-muted uppercase tracking-wider">
                {language === "vi" ? "Nguyên tắc bổ sung" : "Additional Rules"}
              </h3>
              <div className="p-3.5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 text-text-muted text-xs leading-relaxed space-y-1.5 font-medium">
                {additionalRules.map((rule, idx) => (
                  <p key={idx}>{rule.val}</p>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-zinc-900/60 border-t border-gray-100 dark:border-zinc-800/80 flex items-center justify-between">
          <div className="text-[10px] text-text-muted">
            {language === "vi" ? "Tạo lúc: " : "Created: "}
            <span className="font-semibold text-text">
              {preset.is_system
                ? (language === "vi" ? "Mặc định hệ thống" : "System default")
                : new Date(preset.created_at).toLocaleString(language === "vi" ? "vi-VN" : "en-US")}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-zinc-800 text-xs font-bold text-text hover:bg-gray-200 dark:hover:bg-zinc-700 transition-all cursor-pointer border-0"
            >
              {language === "vi" ? "Đóng" : "Close"}
            </button>
            {!preset.is_system && (
              <button
                type="button"
                onClick={() => { onClose(); onEdit(preset); }}
                className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-xs font-bold text-white transition-all cursor-pointer border-0 shadow-xs"
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
  initialPrompt,
  onClose,
  onSaved,
  lang,
}: {
  open: boolean;
  editPreset: PromptConfigRecord | null;
  initialPrompt?: string;
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

  useEffect(() => {
    if (initialPrompt && open && !editPreset) {
      setCustomObjective(initialPrompt);
      if (!selectedObjectives.includes("Khác")) {
        setSelectedObjectives(["Khác"]);
      }
    }
  }, [initialPrompt, open, editPreset]);

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
      setStep(-1);
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="bg-white dark:bg-zinc-950 rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden border border-gray-200 dark:border-zinc-800 flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b border-gray-100 dark:border-zinc-800/80 flex items-center justify-between shrink-0">
            <div className="flex-1 pr-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-base font-bold text-text">
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
                <div className="w-full h-1.5 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-primary to-violet-500 transition-all duration-300" style={{ width: `${progressPercent}%` }} />
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-gray-50 hover:bg-gray-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 flex items-center justify-center text-text-muted hover:text-text transition-all cursor-pointer border-0"
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
                    <h3 className="text-base font-black text-text">
                      {lang === "vi" ? "Mục tiêu cốt lõi của bạn là gì?" : "What are your core objectives?"}
                    </h3>
                    <p className="text-xs text-text-muted mt-1">
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
                          className={`flex items-center gap-3.5 p-3.5 rounded-2xl border text-xs font-bold transition-all ${isSelected
                              ? "border-primary bg-emerald-50/50 dark:bg-emerald-950/20 text-primary cursor-pointer"
                              : isDisabled
                                ? "border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/30 text-text-muted opacity-40 cursor-not-allowed"
                                : "border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-text hover:border-emerald-300 cursor-pointer"
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
                          className={`flex items-center gap-3.5 p-3.5 rounded-2xl border text-xs font-bold transition-all ${isKhacSelected
                              ? "border-primary bg-emerald-50/50 dark:bg-emerald-950/20 text-primary cursor-pointer"
                              : isKhacDisabled
                                ? "border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/30 text-text-muted opacity-40 cursor-not-allowed"
                                : "border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-text hover:border-emerald-300 cursor-pointer"
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
                        className={`w-full px-4 py-3 rounded-xl border bg-gray-50 dark:bg-zinc-900 text-xs text-text outline-none focus:border-primary transition-all ${customObjective.trim() && !validateCustomInput(customObjective).isValid
                            ? "border-rose-500"
                            : "border-gray-200 dark:border-zinc-700"
                          }`}
                        autoFocus
                      />
                      {customObjective.trim() && !validateCustomInput(customObjective).isValid && (
                        <p className="text-[11px] font-semibold text-rose-500 pl-1">
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
                  <h3 className="text-base font-bold text-text mb-2">
                    {lang === "vi" ? "AI đang xây dựng lộ trình câu hỏi..." : "AI is analyzing..."}
                  </h3>
                  <p className="text-xs text-text-muted text-center max-w-xs h-8 flex items-center justify-center animate-pulse">
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
                      <h3 className="text-base font-black text-text leading-snug">
                        {currentStepData.question}
                      </h3>
                      <p className="text-xs text-text-muted mt-1">
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
                            className={`group w-full px-4 py-3 rounded-2xl border text-xs font-semibold transition-all flex items-center gap-3.5 ${isSelected
                                ? "border-primary bg-emerald-50/50 dark:bg-emerald-950/20 text-primary cursor-pointer"
                                : isDisabled
                                  ? "border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/30 text-text-muted opacity-40 cursor-not-allowed"
                                  : "border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-text hover:border-emerald-300 cursor-pointer"
                              }`}
                          >
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 transition-all ${isSelected
                                ? "bg-primary text-white"
                                : isDisabled
                                  ? "bg-gray-100 dark:bg-zinc-800 text-text-muted"
                                  : "bg-gray-100 dark:bg-zinc-800 text-text-muted group-hover:bg-primary/20 group-hover:text-primary"
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
                              className={`group w-full px-4 py-3 rounded-2xl border text-xs font-semibold transition-all flex items-center gap-3.5 ${isSelected
                                  ? "border-primary bg-emerald-50/50 dark:bg-emerald-950/20 text-primary cursor-pointer"
                                  : isDisabled
                                    ? "border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/30 text-text-muted opacity-40 cursor-not-allowed"
                                    : "border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-text hover:border-emerald-300 cursor-pointer"
                                }`}
                            >
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 transition-all ${isSelected
                                  ? "bg-primary text-white"
                                  : isDisabled
                                    ? "bg-gray-100 dark:bg-zinc-800 text-text-muted"
                                    : "bg-gray-100 dark:bg-zinc-800 text-text-muted"
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
                                className={`w-full px-4 py-3 rounded-xl border bg-white dark:bg-zinc-900 text-xs text-text outline-none transition-all ${(customAnswers[currentKey] || "").trim() && !validateCustomInput(customAnswers[currentKey] || "").isValid
                                    ? "border-rose-500"
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
                      <label className="block text-[11px] font-bold text-text-muted mb-1">
                        {lang === "vi" ? "Tên Văn phong" : "Style Name"} <span className="text-rose-550">*</span>
                      </label>
                      <input
                        type="text"
                        spellCheck={false}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={lang === "vi" ? "Ví dụ: Facebook Bán hàng Thân thiện" : "e.g., Friendly Sales Style"}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs text-text focus:outline-none focus:border-primary transition-all font-semibold"
                      />
                    </div>
                    <div className="flex items-end pb-3">
                      <label className="flex items-center gap-2.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isDefault}
                          onChange={(e) => setIsDefault(e.target.checked)}
                          className="w-4.5 h-4.5 text-primary rounded border-gray-300 focus:ring-primary cursor-pointer transition-all"
                        />
                        <span className="text-xs font-bold text-text">
                          {lang === "vi" ? "Đặt làm mặc định" : "Set as default"}
                        </span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-text-muted mb-1">
                      {lang === "vi" ? "Quy định & Nguyên tắc văn phong" : "Style Rules & Principles"}
                    </label>
                    <textarea
                      value={additionalRules}
                      spellCheck={false}
                      onChange={(e) => setAdditionalRules(e.target.value)}
                      placeholder={lang === "vi" ? "Nhập chi tiết các nguyên tắc và văn phong viết bài..." : "Enter detailed style guidelines..."}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs text-text focus:outline-none focus:border-primary transition-all resize-y min-h-[220px] font-medium leading-relaxed"
                    />
                  </div>
                </motion.div>
              )}

              {/* Step N+1: Confirm Wizard Mode */}
              {step > aiSteps.length && (
                <motion.div key="confirm-wizard" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  <div className="bg-emerald-50 dark:bg-emerald-950/20 p-3.5 rounded-2xl flex gap-3 border border-emerald-100 dark:border-emerald-950/30">
                    <CheckCircle2 className="text-emerald-600 shrink-0 mt-0.5" size={16} />
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
                      <label className="block text-[11px] font-bold text-text-muted mb-1">
                        {lang === "vi" ? "Tên Văn phong" : "Style Name"} <span className="text-rose-550">*</span>
                      </label>
                      <input
                        type="text"
                        spellCheck={false}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={lang === "vi" ? "Ví dụ: Facebook Bán hàng Thân thiện" : "e.g., Friendly Sales Style"}
                        className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs text-text focus:outline-none focus:border-primary transition-all font-semibold"
                      />
                    </div>
                    <div className="flex items-end pb-2">
                      <label className="flex items-center gap-2.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isDefault}
                          onChange={(e) => setIsDefault(e.target.checked)}
                          className="w-4.5 h-4.5 text-primary rounded border-gray-300 focus:ring-primary cursor-pointer transition-all"
                        />
                        <span className="text-xs font-bold text-text">
                          {lang === "vi" ? "Đặt làm mặc định" : "Set as default"}
                        </span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-text-muted mb-1">
                      {lang === "vi" ? "Nguyên tắc bổ sung" : "Additional Rules"}
                    </label>
                    <textarea
                      value={additionalRules}
                      spellCheck={false}
                      onChange={(e) => setAdditionalRules(e.target.value)}
                      placeholder={lang === "vi" ? "Ví dụ: Luôn dùng emoji ở đầu câu, không viết quá 3 câu mỗi đoạn..." : "E.g., Always use emojis, keep paragraphs short..."}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs text-text focus:outline-none focus:border-primary transition-all resize-y min-h-[80px] mb-3 font-semibold"
                    />
                  </div>

                  <div className="rounded-2xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50 p-3.5">
                    <label className="block text-[10px] font-black text-primary mb-2 uppercase tracking-wider">
                      {lang === "vi" ? "Xem trước Văn phong AI" : "AI Style Preview"}
                    </label>
                    <div className="text-xs text-text space-y-1 whitespace-pre-line font-medium leading-relaxed max-h-[140px] overflow-y-auto pr-1">
                      {compiledRules}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 dark:border-zinc-800 flex items-center justify-between bg-gray-50 dark:bg-zinc-900/50">
            <button
              type="button"
              onClick={() => {
                if (step === -1) onClose();
                else if (step === 0) onClose();
                else setStep(s => s - 1);
              }}
              disabled={isGenerating}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-text-muted hover:text-text rounded-xl transition-all cursor-pointer border-0 disabled:opacity-50"
            >
              <ChevronLeft size={14} /> {step <= 0 ? (lang === "vi" ? "Hủy" : "Cancel") : (lang === "vi" ? "Quay lại" : "Back")}
            </button>

            {step === 0 ? (
              <button
                type="button"
                onClick={handleGenerateQuestions}
                disabled={selectedObjectives.length === 0 || (selectedObjectives.includes("Khác") && !validateCustomInput(customObjective).isValid) || isGenerating}
                className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold bg-primary hover:bg-primary-hover text-white rounded-xl transition-all cursor-pointer border-0 shadow-xs disabled:opacity-50"
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
                  className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold bg-primary hover:bg-primary-hover text-white rounded-xl transition-all cursor-pointer border-0 shadow-xs disabled:opacity-50"
                >
                  {lang === "vi" ? "Tiếp theo" : "Next"} <ChevronRight size={14} />
                </button>
              );
            })() : (
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || !name.trim()}
                className="flex items-center gap-1.5 px-6 py-2 text-xs font-bold bg-primary hover:bg-primary-hover text-white rounded-xl transition-all cursor-pointer border-0 shadow-xs disabled:opacity-50"
              >
                {isSaving ? (
                  <><Loader2 size={14} className="animate-spin" /> {lang === "vi" ? "Đang lưu..." : "Saving..."}</>
                ) : (
                  <><Sparkles size={14} /> {lang === "vi" ? "Lưu Văn phong" : "Save Style"}</>
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

  const queryClient = useQueryClient();
  const [presets, setPresets] = useState<PromptConfigRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<ActiveTab>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [aiPromptInput, setAiPromptInput] = useState("");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editingPreset, setEditingPreset] = useState<PromptConfigRecord | null>(null);
  const [viewingPreset, setViewingPreset] = useState<PromptConfigRecord | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;

  const fetchPresets = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch("/api/prompt-configs", { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        let fetchedPresets: PromptConfigRecord[] = json.data || [];

        const sysDefaultId = localStorage.getItem('systemDefaultPreset');
        if (sysDefaultId) {
          const hasUserDefault = fetchedPresets.some(p => p.is_default && !p.is_system);
          if (!hasUserDefault) {
            fetchedPresets = fetchedPresets.map(p => ({
              ...p,
              is_default: p.id === sysDefaultId ? true : (p.is_system ? false : p.is_default)
            }));
          } else {
            localStorage.removeItem('systemDefaultPreset');
          }
        }

        setPresets(fetchedPresets);
        queryClient.removeQueries({ queryKey: ['creatorPlatformPresets'] });
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [queryClient]);

  useEffect(() => {
    fetchPresets();
  }, [fetchPresets]);

  // Counts
  const myPresetsCount = useMemo(() => presets.filter(p => !p.is_system).length, [presets]);
  const systemPresetsCount = useMemo(() => presets.filter(p => p.is_system).length, [presets]);

  // Filtered list
  const displayed = useMemo(() => {
    let list = [...presets];

    // 1. Tab filter
    if (activeTab === "mine") {
      list = list.filter(p => !p.is_system);
    } else if (activeTab === "system") {
      list = list.filter(p => p.is_system);
    }

    // 2. Category filter
    if (selectedCategory !== "all") {
      list = list.filter(p => {
        const objs = p.params?.objectives || (p.params?.objective ? [p.params.objective] : []);
        const nameAndRules = (p.name + " " + (p.rules || "")).toLowerCase();
        const catLower = selectedCategory.toLowerCase();
        return (
          objs.some((o: string) => o.toLowerCase().includes(catLower)) ||
          nameAndRules.includes(catLower)
        );
      });
    }

    // 3. Search query filter
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.rules && p.rules.toLowerCase().includes(q))
      );
    }

    // Sort: Default first, then user presets, then system templates
    list.sort((a, b) => {
      if (a.is_default && !b.is_default) return -1;
      if (!a.is_default && b.is_default) return 1;
      const aIsSys = !!a.is_system;
      const bIsSys = !!b.is_system;
      if (!aIsSys && bIsSys) return -1;
      if (aIsSys && !bIsSys) return 1;
      return 0;
    });

    return list;
  }, [presets, activeTab, selectedCategory, search]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, activeTab, selectedCategory]);

  const totalPages = Math.ceil(displayed.length / ITEMS_PER_PAGE);
  const paginatedDisplayed = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return displayed.slice(start, start + ITEMS_PER_PAGE);
  }, [displayed, currentPage]);

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
      } else {
        alert(lang === "vi" ? "Lỗi khi xóa" : "Error deleting");
      }
    } catch {
      alert(lang === "vi" ? "Lỗi khi xóa" : "Error deleting");
    } finally {
      setIsDeleting(false);
      setDeleteConfirmId(null);
    }
  };

  const handleSetDefault = async (preset: PromptConfigRecord) => {
    try {
      if (preset.is_system) {
        const currentUserDefault = presets.find(p => p.is_default && !p.is_system);
        localStorage.setItem('systemDefaultPreset', preset.id);
        setPresets(prev => prev.map(p => ({
          ...p,
          is_default: p.id === preset.id
        })));

        if (currentUserDefault) {
          await fetch(`/api/prompt-configs/${currentUserDefault.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ is_default: false }),
          });
        }
        fetchPresets(true);
      } else {
        localStorage.removeItem('systemDefaultPreset');
        setPresets(prev => prev.map(p => ({
          ...p,
          is_default: p.id === preset.id
        })));

        const res = await fetch(`/api/prompt-configs/${preset.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_default: true }),
        });
        if (res.ok) {
          fetchPresets(true);
        } else {
          fetchPresets(true);
        }
      }
    } catch (e) {
      alert("Lỗi: " + e);
      fetchPresets(true);
    }
  };

  const handleClearFilters = () => {
    setSearch("");
    setActiveTab("all");
    setSelectedCategory("all");
  };

  const handleAiBannerSubmit = () => {
    if (!aiPromptInput.trim()) return;
    setEditingPreset(null);
    setWizardOpen(true);
  };

  return (
    <div className="flex flex-col gap-5 w-full font-sans select-none pb-8">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-primary flex items-center justify-center shrink-0 border border-emerald-200/50 dark:border-emerald-800/40 shadow-2xs">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-text tracking-tight">
              Văn phong
            </h1>
            <p className="text-xs text-text-muted mt-0.5 font-medium">
              Thư viện mẫu nội dung định hướng cách AI viết bài cho từng chiến dịch
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => { setEditingPreset(null); setAiPromptInput(""); setWizardOpen(true); }}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-2xl text-xs font-extrabold transition-all active:scale-95 cursor-pointer border-0 shadow-md shadow-primary/20 shrink-0"
        >
          <Plus size={15} className="stroke-[3]" />
          <span>Tạo Văn phong mới</span>
        </button>
      </div>



      {/* 3. Toolbar: Tabs (Left) & Category Dropdown + Search (Right) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800/60 rounded-2xl p-3 shadow-2xs">
        {/* Left: Segmented Control Tabs */}
        <div className="bg-gray-100 dark:bg-zinc-950 p-1 rounded-xl flex items-center gap-1 shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${activeTab === "all"
                ? "bg-white dark:bg-zinc-900 text-primary shadow-2xs"
                : "text-text-muted hover:text-text"
              }`}
          >
            Tất cả
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("mine")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${activeTab === "mine"
                ? "bg-white dark:bg-zinc-900 text-primary shadow-2xs"
                : "text-text-muted hover:text-text"
              }`}
          >
            <span>Văn phong của tôi</span>
            <span className="px-1.5 py-0.2 rounded-full bg-emerald-100/70 dark:bg-emerald-950/60 text-primary text-[10px]">
              {myPresetsCount}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("system")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${activeTab === "system"
                ? "bg-white dark:bg-zinc-900 text-primary shadow-2xs"
                : "text-text-muted hover:text-text"
              }`}
          >
            <span>Thư viện mẫu</span>
            <span className="px-1.5 py-0.2 rounded-full bg-gray-200 dark:bg-zinc-800 text-text-muted text-[10px]">
              {systemPresetsCount}
            </span>
          </button>
        </div>

        {/* Right: Category Dropdown & Search Input */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap flex-1 justify-end">
          {/* Category Dropdown */}
          <div className="relative shrink-0 min-w-[150px]">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full h-9 pl-3 pr-8 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-950 text-xs font-bold text-text outline-none focus:border-primary cursor-pointer appearance-none"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
          </div>

          {/* Search Input */}
          <div className="relative flex-1 max-w-xs min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="🔍 Tìm văn phong..."
              className="w-full h-9 pl-9 pr-8 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-950 text-xs font-semibold text-text outline-none focus:border-primary transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text p-0.5 rounded cursor-pointer"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. Cards Display Area */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={28} className="animate-spin text-primary" />
        </div>
      ) : displayed.length === 0 ? (
        /* Empty State */
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-gray-200 dark:border-zinc-800 rounded-3xl bg-white dark:bg-zinc-900 p-6"
        >
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-primary flex items-center justify-center mb-3">
            <Sparkles size={24} />
          </div>
          <h3 className="text-base font-extrabold text-text mb-1">
            Không tìm thấy văn phong phù hợp
          </h3>
          <p className="text-xs text-text-muted max-w-xs mb-4">
            Thử thay đổi từ khóa hoặc bộ lọc.
          </p>
          <button
            type="button"
            onClick={handleClearFilters}
            className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-zinc-800 text-text hover:bg-gray-200 dark:hover:bg-zinc-700 text-xs font-extrabold transition-all cursor-pointer border-0"
          >
            Xóa bộ lọc
          </button>
        </motion.div>
      ) : (
        <>
          <div className="flex flex-col justify-between">
            {/* Active Preset Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 min-h-[456px] content-start">
              {paginatedDisplayed.map((preset) => (
                <PresetCard
                  key={preset.id}
                  preset={preset}
                  language={lang}
                  onEdit={handleEdit}
                  onDelete={(id) => setDeleteConfirmId(id)}
                  onSelect={(p) => setViewingPreset(p)}
                  onSetDefault={handleSetDefault}
                />
              ))}
            </div>

            {/* Pagination Controls - Aligned with ArchiveView */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t border-gray-100 dark:border-zinc-800">
                <div className="text-xs font-semibold text-text-muted">
                  {lang === 'vi'
                    ? `Hiển thị ${Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, displayed.length)} - ${Math.min(currentPage * ITEMS_PER_PAGE, displayed.length)} trong tổng số ${displayed.length} văn phong`
                    : `Showing ${Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, displayed.length)} - ${Math.min(currentPage * ITEMS_PER_PAGE, displayed.length)} of ${displayed.length} styles`
                  }
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-2.5 border border-gray-200/80 dark:border-zinc-800 rounded-2xl hover:bg-gray-50 dark:hover:bg-zinc-800 transition-all disabled:opacity-30 disabled:pointer-events-none text-text-muted active:scale-95 cursor-pointer bg-white dark:bg-zinc-900"
                  >
                    <ChevronLeft size={16} />
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-10 h-10 rounded-2xl text-xs font-black transition-all active:scale-95 cursor-pointer ${currentPage === page
                        ? 'bg-primary text-white shadow-lg shadow-primary/20'
                        : 'border border-gray-200/80 dark:border-zinc-800 text-text hover:bg-gray-50 dark:hover:bg-zinc-800 bg-white dark:bg-zinc-900'
                        }`}
                    >
                      {page}
                    </button>
                  ))}

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="p-2.5 border border-gray-200/80 dark:border-zinc-800 rounded-2xl hover:bg-gray-50 dark:hover:bg-zinc-800 transition-all disabled:opacity-30 disabled:pointer-events-none text-text-muted active:scale-95 cursor-pointer bg-white dark:bg-zinc-900"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white dark:bg-zinc-900 rounded-2xl p-6 max-w-sm w-full shadow-xl select-none"
            >
              <h3 className="font-extrabold text-base text-text mb-1.5">
                {lang === "vi" ? "Xóa Văn phong?" : "Delete Style?"}
              </h3>
              <p className="text-xs text-text-muted mb-5 leading-relaxed">
                {lang === "vi"
                  ? "Hành động này không thể hoàn tác. Văn phong sẽ bị xóa vĩnh viễn khỏi thư viện."
                  : "This action cannot be undone."}
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 py-2 rounded-xl bg-gray-100 dark:bg-zinc-800 text-xs font-bold text-text hover:bg-gray-200 transition-all cursor-pointer border-0"
                >
                  {lang === "vi" ? "Hủy" : "Cancel"}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(deleteConfirmId)}
                  disabled={isDeleting}
                  className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-xs font-bold text-white transition-all cursor-pointer border-0"
                >
                  {isDeleting ? <Loader2 size={14} className="animate-spin mx-auto" /> : (lang === "vi" ? "Xóa" : "Delete")}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Interactive Wizard Modal */}
      <WizardModal
        open={wizardOpen}
        editPreset={editingPreset}
        initialPrompt={aiPromptInput}
        onClose={() => { setWizardOpen(false); setEditingPreset(null); setAiPromptInput(""); }}
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
