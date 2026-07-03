"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
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
  AlertCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { Prompt, PromptPlatform } from "@/lib/types/prompt";

const PLATFORM_OPTIONS: { value: PromptPlatform; label: string }[] = [
  { value: "facebook", label: "Facebook" },
  { value: "thread", label: "Threads" },
  { value: "instagram", label: "Instagram" },
];

const PLATFORM_BADGE_CLASS: Record<PromptPlatform, string> = {
  facebook: "bg-[#E7F0FE] dark:bg-blue-950/40 text-[#1877F2] dark:text-blue-400",
  thread: "bg-[#F3E5CD] dark:bg-black border dark:border-white/5 text-[#5D4E3C] dark:text-slate-200",
  instagram: "bg-[#FCE7F3] dark:bg-pink-950/40 text-[#C026D3] dark:text-pink-400",
};

const PLATFORM_LABEL: Record<PromptPlatform, string> = {
  facebook: "Facebook",
  thread: "Threads",
  instagram: "Instagram",
};

function ThreadsIcon({ size = 14 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5zm0-2c.28 0 .5-.22.5-.5s-.22-.5-.5-.5-.5.22-.5.5.22.5.5.5z" />
    </svg>
  );
}

function PlatformIcon({
  platform,
  size = 14,
}: {
  platform: PromptPlatform;
  size?: number;
}) {
  if (platform === "facebook") return <Facebook size={size} />;
  if (platform === "instagram") return <Instagram size={size} />;
  return <ThreadsIcon size={size} />;
}

type FormState = {
  name: string;
  platform: PromptPlatform;
  content: string;
  tagsText: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  platform: "facebook",
  content: "",
  tagsText: "",
};

type ModalState = { mode: "create" } | { mode: "edit"; prompt: Prompt } | null;

// Trạng thái delete: idle → checking → confirmed (in_use biết rồi) → deleting
type DeleteState =
  | { phase: "idle" }
  | { phase: "checking"; prompt: Prompt }
  | { phase: "confirmed"; prompt: Prompt; captionCount: number }
  | { phase: "deleting"; prompt: Prompt; captionCount: number };

function parseTagsText(tagsText: string): string[] {
  return tagsText
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

export default function PromptsView() {
  const { t, language } = useLanguage();
  const searchParams = useSearchParams();
  const promptIdParam = searchParams?.get("promptId");
  const [allPrompts, setAllPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState<PromptPlatform | "">("");
  const [tagsFilter, setTagsFilter] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10); // 10 prompts per page
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);

  const [modal, setModal] = useState<ModalState>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [deleteState, setDeleteState] = useState<DeleteState>({
    phase: "idle",
  });
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [cloningId, setCloningId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // --- US-2.07: Prompt Config Management ---
  const [activeTab, setActiveTab] = useState<'prompts' | 'configs'>('prompts');
  const [configs, setConfigs] = useState<any[]>([]);
  const [configsLoading, setConfigsLoading] = useState(false);
  const [configsError, setConfigsError] = useState<string | null>(null);

  // Modal edit config
  const [configModal, setConfigModal] = useState<{ mode: 'create' | 'edit', config: any } | null>(null);
  const [configForm, setConfigForm] = useState({
    name: '',
    platform: 'facebook' as PromptPlatform | 'threads',
    tone: 'Chuyên nghiệp',
    length: 'Vừa (200-500 từ)',
    emphasis: '',
    variantCount: 2 as number
  });
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  const fetchConfigs = useCallback(async () => {
    setConfigsLoading(true);
    setConfigsError(null);
    try {
      const res = await fetch('/api/prompt-configs');
      const json = await res.json();
      if (res.ok) {
        setConfigs(json.data || []);
      } else {
        throw new Error(json.error || 'Không thể tải danh sách cấu hình');
      }
    } catch (err: any) {
      setConfigsError(err.message || 'Lỗi khi tải cấu hình');
    } finally {
      setConfigsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'configs') {
      fetchConfigs();
    }
  }, [activeTab, fetchConfigs]);

  const handleDeleteConfig = async (id: string) => {
    const confirmMsg = language === 'vi' ? 'Bạn có chắc chắn muốn xóa cấu hình này?' : 'Are you sure you want to delete this configuration?';
    if (!window.confirm(confirmMsg)) return;
    try {
      const res = await fetch(`/api/prompt-configs/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchConfigs();
      } else {
        const json = await res.json();
        alert(json.error || 'Lỗi khi xóa cấu hình');
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi hệ thống');
    }
  };

  const handleSetDefaultConfig = async (config: any) => {
    try {
      const res = await fetch(`/api/prompt-configs/${config.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: config.name,
          platform: config.platform,
          params: config.params,
          is_default: true
        })
      });
      if (res.ok) {
        fetchConfigs();
      } else {
        const json = await res.json();
        alert(json.error || 'Lỗi khi đặt cấu hình mặc định');
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi hệ thống');
    }
  };

  const openCreateConfigModal = () => {
    setConfigForm({
      name: '',
      platform: 'facebook',
      tone: 'Chuyên nghiệp',
      length: 'Vừa (200-500 từ)',
      emphasis: '',
      variantCount: 2
    });
    setConfigModal({ mode: 'create', config: null });
  };

  const openEditConfigModal = (config: any) => {
    setConfigForm({
      name: config.name,
      platform: config.platform === 'thread' ? 'threads' : config.platform,
      tone: config.params?.tone || 'Chuyên nghiệp',
      length: config.params?.length || 'Vừa (200-500 từ)',
      emphasis: config.params?.emphasis || '',
      variantCount: config.params?.variant_count || 2
    });
    setConfigModal({ mode: 'edit', config });
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!configModal) return;
    setIsSavingConfig(true);
    try {
      const isEdit = configModal.mode === 'edit';
      const url = isEdit ? `/api/prompt-configs/${configModal.config.id}` : '/api/prompt-configs';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: configForm.name,
          platform: configForm.platform === 'threads' ? 'thread' : configForm.platform,
          params: {
            tone: configForm.tone,
            length: configForm.length,
            emphasis: configForm.emphasis,
            variant_count: configForm.variantCount
          },
          is_default: isEdit ? configModal.config.is_default : false
        })
      });
      if (res.ok) {
        setConfigModal(null);
        fetchConfigs();
      } else {
        const json = await res.json();
        alert(json.error || 'Lỗi khi lưu cấu hình');
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi hệ thống');
    } finally {
      setIsSavingConfig(false);
    }
  };

  const fetchPrompts = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/prompts?pageSize=1000");
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error || t("prompts.cannotLoad"));
      }
      setAllPrompts(json.data ?? []);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : t("prompts.errorOccurred"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  // Load all prompts once at mount
  useEffect(() => {
    fetchPrompts();
  }, [fetchPrompts]);

  // Reset page to 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [search, platformFilter, tagsFilter]);

  // Filter prompts in memory
  const filteredPrompts = useMemo(() => {
    return allPrompts.filter((prompt) => {
      const matchesSearch =
        search === "" ||
        prompt.name.toLowerCase().includes(search.toLowerCase()) ||
        prompt.content.toLowerCase().includes(search.toLowerCase());
      const matchesPlatform =
        platformFilter === "" || prompt.platform === platformFilter;
      const matchesTags =
        tagsFilter.length === 0 ||
        tagsFilter.every((tag) => prompt.tags.includes(tag));
      return matchesSearch && matchesPlatform && matchesTags;
    });
  }, [allPrompts, search, platformFilter, tagsFilter]);

  const total = filteredPrompts.length;
  const totalPages = Math.ceil(total / pageSize) || 1;

  // Paginated items
  const paginatedPrompts = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredPrompts.slice(start, start + pageSize);
  }, [filteredPrompts, page, pageSize]);

  // Compute all unique tags for filter dropdown in memory
  const allDbTags = useMemo(() => {
    const tagsSet = new Set<string>();
    allPrompts.forEach((p) => p.tags.forEach((t) => tagsSet.add(t)));
    return Array.from(tagsSet).sort();
  }, [allPrompts]);

  const allTags = allDbTags;

  function openCreateModal() {
    setForm(EMPTY_FORM);
    setFormError(null);
    setModal({ mode: "create" });
  }

  function openEditModal(prompt: Prompt) {
    setForm({
      name: prompt.name,
      platform: prompt.platform,
      content: prompt.content,
      tagsText: prompt.tags.join(", "),
    });
    setFormError(null);
    setModal({ mode: "edit", prompt });
  }

  // If promptId is in URL query parameters, find it, clear filters, navigate to the correct page, and scroll to it
  useEffect(() => {
    if (promptIdParam && allPrompts.length > 0) {
      const index = allPrompts.findIndex((p) => p.id === promptIdParam);
      if (index !== -1) {
        // Clear all filters so the target prompt is visible
        setSearch("");
        setPlatformFilter("");
        setTagsFilter([]);

        // Go to the correct page
        const targetPage = Math.floor(index / pageSize) + 1;
        setPage(targetPage);

        // Wait for DOM rendering and then scroll to the element
        const timer = setTimeout(() => {
          const element = document.getElementById(`prompt-${promptIdParam}`);
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }, 150);

        return () => clearTimeout(timer);
      }
    }
  }, [promptIdParam, allPrompts, pageSize]);

  function closeModal() {
    if (submitting) return;
    setModal(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!modal) return;

    setSubmitting(true);
    setFormError(null);

    const payload = {
      name: form.name,
      platform: form.platform,
      content: form.content,
      tags: parseTagsText(form.tagsText),
    };

    try {
      const isEdit = modal.mode === "edit";
      const url = isEdit ? `/api/prompts/${modal.prompt.id}` : "/api/prompts";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (!res.ok) {
        const detailMsg = Array.isArray(json?.details)
          ? json.details
            .map((d: { field: string; message: string }) => d.message)
            .join("; ")
          : null;
        throw new Error(detailMsg || json?.error || t("prompts.cannotSave"));
      }

      setModal(null);
      setPage(1);
      await fetchPrompts();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t("prompts.errorOccurred"));
    } finally {
      setSubmitting(false);
    }
  }

  // Bước 1: Người dùng nhấn nút Xóa → check usage trước
  async function handleDeleteClick(prompt: Prompt) {
    setDeleteError(null);
    setDeleteState({ phase: "checking", prompt });
    try {
      const res = await fetch(`/api/prompts/${prompt.id}/check-usage`);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error || t("prompts.cannotCheckUsage"));
      }
      setDeleteState({
        phase: "confirmed",
        prompt,
        captionCount: json.count ?? 0,
      });
    } catch (err) {
      setDeleteState({ phase: "idle" });
      setActionError(err instanceof Error ? err.message : t("prompts.errorOccurred"));
    }
  }

  // Bước 2: Người dùng xác nhận trong modal → thực sự xóa
  async function handleConfirmDelete() {
    if (deleteState.phase !== "confirmed" && deleteState.phase !== "deleting")
      return;
    const { prompt, captionCount } = deleteState as {
      prompt: Prompt;
      captionCount: number;
    };

    setDeleteState({ phase: "deleting", prompt, captionCount });
    setDeleteError(null);

    try {
      const res = await fetch(`/api/prompts/${prompt.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error || t("prompts.cannotDelete"));
      }
      setDeleteState({ phase: "idle" });
      // Nếu đang filter theo tag vừa xóa prompt cuối cùng → reset tag filter
      if (
        tagsFilter.length > 0 &&
        allPrompts
          .filter((p) => p.id !== prompt.id)
          .every((p) => !p.tags.some((t) => tagsFilter.includes(t)))
      ) {
        setTagsFilter([]);
      }
      setPage(1);
      await fetchPrompts();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : t("prompts.errorOccurred"));
      setDeleteState({ phase: "confirmed", prompt, captionCount });
    }
  }

  function handleCancelDelete() {
    setDeleteState({ phase: "idle" });
    setDeleteError(null);
  }

  async function handleClone(prompt: Prompt) {
    setCloningId(prompt.id);
    setActionError(null);
    try {
      const res = await fetch(`/api/prompts/${prompt.id}/clone`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error || t("prompts.cannotClone"));
      }
      setPage(1);
      await fetchPrompts();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t("prompts.errorOccurred"));
    } finally {
      setCloningId(null);
    }
  }

  const isDeleteModalOpen =
    deleteState.phase === "confirmed" || deleteState.phase === "deleting";
  const isCheckingDelete = deleteState.phase === "checking";

  const deletingPrompt: Prompt | null =
    deleteState.phase === "confirmed" || deleteState.phase === "deleting"
      ? deleteState.prompt
      : null;

  return (
    <div className="flex flex-col gap-4 font-sans max-w-7xl mx-auto w-full">
      {/* Title Header */}
      <div className="mt-1 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 dark:text-zinc-100 tracking-tight">
            {t("prompts.title")}
          </h1>
          <p className="text-xs text-text-muted mt-0.5">
            {t("prompts.subtitle")}
          </p>
        </div>
        {activeTab === 'prompts' ? (
          <button
            onClick={openCreateModal}
            className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-xl flex items-center gap-1.5 font-bold text-xs transition-all shadow-md shadow-primary/15 shrink-0 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus:outline-none active:scale-[0.98] cursor-pointer"
          >
            <Plus size={14} />
            {t("prompts.createNew")}
          </button>
        ) : (
          <button
            onClick={openCreateConfigModal}
            className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-xl flex items-center gap-1.5 font-bold text-xs transition-all shadow-md shadow-primary/15 shrink-0 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus:outline-none active:scale-[0.98] cursor-pointer"
          >
            <Plus size={14} />
            {language === 'vi' ? 'Tạo cấu hình mới' : 'Create new config'}
          </button>
        )}
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-gray-200 dark:border-zinc-800 gap-2 shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab('prompts')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all -mb-px cursor-pointer ${activeTab === 'prompts' ? 'border-primary text-primary dark:text-white' : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-zinc-400'
            }`}
        >
          {language === 'vi' ? 'Thư viện Prompt' : 'Prompt Library'}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('configs')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all -mb-px cursor-pointer ${activeTab === 'configs' ? 'border-primary text-primary dark:text-white' : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-zinc-400'
            }`}
        >
          {language === 'vi' ? 'Cấu hình tham số AI' : 'AI Parameters'}
        </button>
      </div>

      {activeTab === 'prompts' && (
        <React.Fragment>
          <div className="flex flex-col gap-2">
            {/* Row 1: Search + Platform filter + Multi-select tags dropdown */}
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <div className="relative w-full max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted w-3.5 h-3.5" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("prompts.searchPlaceholder")}
                  className="w-full bg-card border border-gray-200/60 dark:border-zinc-800/80 rounded-xl py-1.5 pl-9 pr-3 text-xs focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus:outline-none placeholder:text-text-muted text-text dark:bg-zinc-900"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPlatformFilter("")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus:outline-none cursor-pointer ${platformFilter === ""
                      ? "bg-primary text-white shadow-sm"
                      : "bg-card dark:bg-zinc-900 text-text-muted border border-gray-200/60 dark:border-zinc-800/80 hover:text-text hover:bg-gray-50 dark:hover:bg-zinc-800"
                    }`}
                >
                  {t("prompts.all")}
                </button>
                {PLATFORM_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setPlatformFilter(opt.value)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus:outline-none cursor-pointer ${platformFilter === opt.value
                        ? "bg-primary text-white shadow-sm"
                        : "bg-card dark:bg-zinc-900 text-text-muted border border-gray-200/60 dark:border-zinc-800/80 hover:text-text hover:bg-gray-50 dark:hover:bg-zinc-800"
                      }`}
                  >
                    <PlatformIcon platform={opt.value} size={12} />
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Tags multi-select dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsTagDropdownOpen(!isTagDropdownOpen)}
                  className="bg-card dark:bg-zinc-900 border border-gray-200/60 dark:border-zinc-800/80 rounded-xl px-3 py-1.5 text-xs font-bold text-text-muted hover:text-text flex items-center gap-1.5 transition-colors focus-visible:ring-2 focus-visible:ring-primary focus:outline-none cursor-pointer"
                >
                  {t("prompts.filterByTag", { count: tagsFilter.length })}
                </button>
                {isTagDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsTagDropdownOpen(false)} />
                    <div className="absolute left-0 mt-1.5 w-48 bg-card dark:bg-zinc-900 border border-gray-200/60 dark:border-zinc-800/80 rounded-xl p-1.5 shadow-lg z-20 max-h-56 overflow-y-auto">
                      {allDbTags.length === 0 ? (
                        <div className="text-[11px] text-text-muted p-2 text-center">{t("prompts.noTags")}</div>
                      ) : (
                        allDbTags.map((tag) => {
                          const isSelected = tagsFilter.includes(tag);
                          return (
                            <label
                              key={tag}
                              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs hover:bg-gray-50 dark:hover:bg-zinc-800/60 cursor-pointer select-none text-text"
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {
                                  setTagsFilter((prev) =>
                                    prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
                                  );
                                }}
                                className="rounded border-gray-300 dark:border-zinc-700 text-primary focus:ring-primary/20 dark:bg-zinc-850"
                              />
                              {tag}
                            </label>
                          );
                        })
                      )}
                    </div>
                  </>
                )}
              </div>

              <span className="text-xs text-text-muted ml-auto font-medium">
                {total} prompts
              </span>
            </div>

            {/* Row 2: Selected tags chips */}
            {tagsFilter.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap text-xs">
                <span className="text-xs font-bold text-text-muted shrink-0">
                  {t("prompts.filteringBy")}
                </span>
                {tagsFilter.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setTagsFilter((prev) => prev.filter((t) => t !== tag))}
                    className="px-2.5 py-1 rounded-full text-xs font-bold bg-primary text-white shadow-sm inline-flex items-center gap-1 transition-all cursor-pointer hover:bg-primary-hover"
                  >
                    {tag}
                    <X size={10} />
                  </button>
                ))}
                <button
                  onClick={() => setTagsFilter([])}
                  className="text-xs font-bold text-text-muted hover:text-red-500 transition-colors ml-1 cursor-pointer"
                >
                  {t("prompts.clearAllFilters")}
                </button>
              </div>
            )}
          </div>

          {actionError && (
            <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold px-4 py-2.5 rounded-xl">
              <AlertCircle size={14} />
              {actionError}
            </div>
          )}

          {/* List */}
          {loading ? (
            <div className="flex items-center justify-center py-16 text-text-muted gap-2 text-xs font-bold">
              <Loader2 className="animate-spin text-primary" size={16} />
              {t("common.loading")}
            </div>
          ) : loadError ? (
            <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold px-4 py-2.5 rounded-xl">
              <AlertCircle size={14} />
              {loadError}
            </div>
          ) : paginatedPrompts.length === 0 ? (
            <div className="bg-slate-50 dark:bg-zinc-900/40 border border-slate-200/50 dark:border-zinc-800/60 rounded-xl p-10 flex flex-col items-center text-center gap-1.5">
              <p className="font-bold text-xs text-text">
                {search || platformFilter || tagsFilter.length > 0
                  ? t("prompts.noMatching")
                  : t("prompts.noPromptsYet")}
              </p>
              <p className="text-text-muted text-xs font-semibold">
                {search || platformFilter || tagsFilter.length > 0
                  ? t("prompts.tryChangingFilters")
                  : t("prompts.createFirstPrompt")}
              </p>
              {(search || platformFilter || tagsFilter.length > 0) && (
                <button
                  onClick={() => {
                    setSearch("");
                    setPlatformFilter("");
                    setTagsFilter([]);
                  }}
                  className="mt-1.5 text-xs font-bold text-primary hover:underline cursor-pointer"
                >
                  {t("prompts.clearAllFilters")}
                </button>
              )}
            </div>
          ) : (
            <div style={{ minHeight: totalPages > 1 ? '764px' : undefined }} className="grid grid-cols-1 md:grid-cols-2 gap-4 auto-rows-max content-start">
              {paginatedPrompts.map((prompt) => (
                <div
                  key={prompt.id}
                  id={`prompt-${prompt.id}`}
                  className={`bg-card dark:bg-zinc-900 border border-gray-200/60 dark:border-zinc-800/80 rounded-xl p-4 flex flex-col h-[140px] shadow-sm hover:shadow-md transition-all group justify-start ${prompt.id === promptIdParam ? 'animate-highlight-glow' : ''
                    }`}
                >
                  <div className="h-6 flex items-center justify-between gap-3 shrink-0 overflow-hidden mb-2">
                    <div className="flex items-center gap-1.5 overflow-hidden flex-wrap max-h-6">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-black inline-flex items-center gap-1 shrink-0 ${PLATFORM_BADGE_CLASS[prompt.platform]}`}
                      >
                        <PlatformIcon platform={prompt.platform} size={10} />
                        {PLATFORM_LABEL[prompt.platform]}
                      </span>
                      {prompt.cloned_from && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-gray-150 dark:bg-zinc-800 text-text-muted dark:text-zinc-400 shrink-0">
                          {t("prompts.clonedBadge")}
                        </span>
                      )}
                      {prompt.tags.map((tag) => {
                        const isSelected = tagsFilter.includes(tag);
                        return (
                          <button
                            key={tag}
                            onClick={() =>
                              setTagsFilter((prev) =>
                                prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
                              )
                            }
                            className={`px-2 py-0.5 rounded-md text-[10px] font-black transition-all focus-visible:ring-2 focus-visible:ring-primary focus:outline-none cursor-pointer shrink-0 ${isSelected
                                ? "bg-[#C4F0E1] dark:bg-emerald-900/40 text-[#1F4C3F] dark:text-emerald-400 ring-1 ring-[#1F4C3F]/30 dark:ring-emerald-800/30"
                                : "bg-[#C4F0E1]/40 dark:bg-emerald-950/20 text-[#1F4C3F] dark:text-emerald-400 hover:bg-[#C4F0E1] dark:hover:bg-emerald-900/30"
                              }`}
                          >
                            {tag}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-center gap-0.5 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleClone(prompt)}
                        disabled={cloningId === prompt.id}
                        title={t("prompts.cloneTooltip")}
                        className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-primary/10 transition-all active:scale-95 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-primary focus:outline-none cursor-pointer"
                      >
                        {cloningId === prompt.id ? (
                          <Loader2 size={13} className="animate-spin text-primary" />
                        ) : (
                          <Copy size={13} className="transition-transform duration-300 scale-100 rotate-0" />
                        )}
                      </button>
                      <button
                        onClick={() => openEditModal(prompt)}
                        title={t("prompts.editTooltip")}
                        className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-primary/10 transition-colors focus-visible:ring-2 focus-visible:ring-primary focus:outline-none cursor-pointer"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(prompt)}
                        disabled={
                          isCheckingDelete && deletingPrompt?.id === prompt.id
                        }
                        title={t("prompts.deleteTooltip")}
                        className="p-1.5 rounded-lg text-text-muted hover:text-red-650 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-primary focus:outline-none cursor-pointer"
                      >
                        {isCheckingDelete && deletingPrompt?.id === prompt.id ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <Trash2 size={13} />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col flex-1 min-h-0 justify-start mt-1">
                    <h2 className="text-xs font-black text-slate-800 dark:text-white truncate h-5 leading-5 w-full" title={prompt.name}>
                      {prompt.name}
                    </h2>
                    <p className="text-[11px] text-text-muted dark:text-zinc-400 line-clamp-3 whitespace-pre-line leading-relaxed font-semibold mt-1">
                      {prompt.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination Footer */}
          {!loading && filteredPrompts.length > 0 && totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-150 dark:border-zinc-800 pt-4 mt-2 select-none text-xs font-bold">
              <div className="text-[11px] text-text-muted">
                {t('prompts.showingPrompts', {
                  start: total === 0 ? 0 : (page - 1) * pageSize + 1,
                  end: Math.min(page * pageSize, total),
                  total: total
                })}
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                  disabled={page === 1}
                  className="p-2 border border-gray-200/80 dark:border-zinc-800/80 rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-800 transition-all disabled:opacity-30 disabled:pointer-events-none text-text-muted active:scale-95 cursor-pointer"
                >
                  <ChevronLeft size={14} />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded-xl text-xs font-black transition-all active:scale-95 cursor-pointer ${page === p
                        ? 'bg-primary text-white shadow-md shadow-primary/20'
                        : 'border border-gray-200/80 dark:border-zinc-800/80 text-text hover:bg-gray-50 dark:hover:bg-zinc-800 bg-card'
                      }`}
                  >
                    {p}
                  </button>
                ))}

                <button
                  onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={page === totalPages}
                  className="p-2 border border-gray-200/80 dark:border-zinc-800/80 rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-800 transition-all disabled:opacity-30 disabled:pointer-events-none text-text-muted active:scale-95 cursor-pointer"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </React.Fragment>
      )}

      {/* --- Tab configs content --- */}
      {activeTab === 'configs' && (
        <div className="flex flex-col gap-4">
          {configsLoading ? (
            <div className="flex items-center justify-center py-16 text-text-muted gap-2 text-xs font-bold">
              <Loader2 className="animate-spin text-primary" size={16} />
              {t("common.loading")}
            </div>
          ) : configsError ? (
            <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold px-4 py-2.5 rounded-xl">
              <AlertCircle size={14} />
              {configsError}
            </div>
          ) : configs.length === 0 ? (
            <div className="bg-slate-50 dark:bg-zinc-900/40 border border-slate-200/50 dark:border-zinc-800/60 rounded-xl p-10 flex flex-col items-center text-center gap-1.5">
              <p className="font-bold text-xs text-text">
                {language === 'vi' ? 'Chưa có cấu hình tham số nào được lưu' : 'No configurations saved yet'}
              </p>
              <p className="text-text-muted text-xs font-semibold">
                {language === 'vi' ? 'Hãy lưu cấu hình khi tạo bài viết ở AI Creator.' : 'Save configs in the AI Creator view.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {configs.map((config) => (
                <div
                  key={config.id}
                  className="bg-card dark:bg-zinc-900 border border-gray-200/60 dark:border-zinc-800/80 rounded-xl p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-all group relative min-h-[160px]"
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`px-2 py-0.5 rounded-md text-[9px] font-black inline-flex items-center gap-1 uppercase ${PLATFORM_BADGE_CLASS[config.platform as PromptPlatform] || 'bg-gray-100 text-gray-800'}`}>
                        <PlatformIcon platform={config.platform} size={10} />
                        {config.platform === 'thread' ? 'Threads' : PLATFORM_LABEL[config.platform as PromptPlatform] || config.platform}
                      </span>

                      {config.is_default && (
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-black bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400">
                          {language === 'vi' ? 'Mặc định' : 'Default'}
                        </span>
                      )}
                    </div>

                    <h3 className="text-xs font-black text-slate-800 dark:text-white truncate" title={config.name}>
                      {config.name}
                    </h3>

                    {/* Params details */}
                    <div className="grid grid-cols-2 gap-2 text-[10px] text-text-muted font-bold mt-1 bg-gray-50/50 dark:bg-zinc-950/20 p-2.5 rounded-lg border border-gray-150/40 dark:border-zinc-800/40">
                      <div>Văn phong: <span className="text-text">{config.params?.tone || 'Chuyên nghiệp'}</span></div>
                      <div>Độ dài: <span className="text-text">{config.params?.length || 'Vừa'}</span></div>
                      {config.params?.emphasis && (
                        <div className="col-span-2 truncate">Nhấn mạnh: <span className="text-text">{config.params.emphasis}</span></div>
                      )}
                      <div className="col-span-2">Số biến thể: <span className="text-text">{config.params?.variant_count || 2}</span></div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-gray-100 dark:border-zinc-800/80 pt-3 mt-3">
                    {!config.is_default ? (
                      <button
                        type="button"
                        onClick={() => handleSetDefaultConfig(config)}
                        className="text-[9px] font-black text-primary hover:underline cursor-pointer bg-transparent border-none p-0"
                      >
                        {language === 'vi' ? 'Đặt mặc định' : 'Set as default'}
                      </button>
                    ) : (
                      <div />
                    )}

                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => openEditConfigModal(config)}
                        className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer border-none bg-transparent"
                        title={language === 'vi' ? 'Sửa cấu hình' : 'Edit config'}
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteConfig(config.id)}
                        className="p-1.5 rounded-lg text-text-muted hover:text-red-650 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer border-none bg-transparent"
                        title={language === 'vi' ? 'Xóa cấu hình' : 'Delete config'}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Edit Config Modal */}
      {configModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <form
            onSubmit={handleSaveConfig}
            className="bg-card rounded-2xl p-8 w-full max-w-lg flex flex-col gap-5 shadow-xl max-h-[90vh] overflow-y-auto text-xs"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-text">
                {configModal.mode === 'create'
                  ? (language === 'vi' ? 'Tạo cấu hình tham số AI mới' : 'Create New AI Parameters Config')
                  : (language === 'vi' ? 'Chỉnh sửa cấu hình tham số AI' : 'Edit AI Parameters Config')
                }
              </h2>
              <button
                type="button"
                onClick={() => setConfigModal(null)}
                className="text-text-muted hover:text-text p-1 rounded-full hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-primary focus:outline-none border-none bg-transparent cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-text-muted">
                {language === 'vi' ? 'Tên cấu hình' : 'Configuration name'}
              </label>
              <input
                type="text"
                required
                value={configForm.name}
                onChange={(e) =>
                  setConfigForm((f) => ({ ...f, name: e.target.value }))
                }
                className="w-full bg-bg text-text px-5 py-3 rounded-2xl border border-gray-200/70 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus:outline-none text-xs font-medium"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-text-muted">
                {language === 'vi' ? 'Áp dụng cho nền tảng' : 'Platform'}
              </label>
              <select
                value={configForm.platform}
                onChange={(e) => setConfigForm((f) => ({ ...f, platform: e.target.value as any }))}
                className="w-full bg-bg text-text px-5 py-3 rounded-2xl border border-gray-200/70 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus:outline-none text-xs font-medium cursor-pointer"
              >
                <option value="facebook">Facebook</option>
                <option value="threads">Threads</option>
                <option value="instagram">Instagram</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-text-muted">Văn phong (Tone)</label>
                <select
                  value={configForm.tone}
                  onChange={(e) => setConfigForm((f) => ({ ...f, tone: e.target.value }))}
                  className="w-full bg-bg text-text px-4 py-2.5 rounded-2xl border border-gray-200/70 focus-visible:ring-2 focus-visible:ring-primary focus:outline-none text-xs font-medium cursor-pointer"
                >
                  {['Chuyên nghiệp', 'Thân thiện', 'Hài hước', 'Sắc sảo', 'Storytelling', 'Trang trọng', 'Đơn giản'].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-text-muted">Độ dài</label>
                <select
                  value={configForm.length}
                  onChange={(e) => setConfigForm((f) => ({ ...f, length: e.target.value }))}
                  className="w-full bg-bg text-text px-4 py-2.5 rounded-2xl border border-gray-200/70 focus-visible:ring-2 focus-visible:ring-primary focus:outline-none text-xs font-medium cursor-pointer"
                >
                  {['Ngắn (dưới 200 từ)', 'Vừa (200-500 từ)', 'Dài (trên 500 từ)'].map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-text-muted">Khía cạnh nhấn mạnh (Emphasis)</label>
              <input
                type="text"
                value={configForm.emphasis}
                onChange={(e) => setConfigForm((f) => ({ ...f, emphasis: e.target.value }))}
                placeholder="Ví dụ: Lợi ích sức khỏe, Tiết kiệm chi phí..."
                className="w-full bg-bg text-text px-5 py-3 rounded-2xl border border-gray-200/70 focus-visible:ring-2 focus-visible:ring-primary focus:outline-none text-xs font-medium"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-text-muted">Số lượng biến thể sinh ra (Variant Count)</label>
              <select
                value={configForm.variantCount}
                onChange={(e) => setConfigForm((f) => ({ ...f, variantCount: parseInt(e.target.value) }))}
                className="w-full bg-bg text-text px-5 py-3 rounded-2xl border border-gray-200/70 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-outline-none text-xs font-medium cursor-pointer"
              >
                <option value={2}>2 biến thể (Variant A & B)</option>
                <option value={3}>3 biến thể (Variant A, B & C)</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 mt-1">
              <button
                type="button"
                onClick={() => setConfigModal(null)}
                disabled={isSavingConfig}
                className="px-6 py-3 rounded-full font-bold text-sm text-text-muted hover:text-text transition-colors disabled:opacity-50 border-none bg-transparent cursor-pointer"
              >
                {t("common.cancel")}
              </button>
              <button
                type="submit"
                disabled={isSavingConfig}
                className="bg-primary hover:bg-primary-hover text-white px-8 py-3 rounded-full font-bold text-sm transition-colors shadow-md shadow-primary/20 inline-flex items-center gap-2 disabled:opacity-60 border-none cursor-pointer"
              >
                {isSavingConfig && <Loader2 size={16} className="animate-spin" />}
                {configModal.mode === 'create'
                  ? (language === 'vi' ? 'Tạo mới' : 'Create')
                  : t("common.save")
                }
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Create / Edit modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <form
            onSubmit={handleSubmit}
            className="bg-card rounded-2xl p-8 w-full max-w-lg flex flex-col gap-5 shadow-xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-text">
                {modal.mode === "edit" ? t("prompts.editPrompt") : t("prompts.createNew")}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="text-text-muted hover:text-text p-1 rounded-full hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-primary focus:outline-none"
              >
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-sm font-medium px-4 py-3 rounded-2xl">
                <AlertCircle size={16} />
                {formError}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-text-muted">
                {t("prompts.promptName")}
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder={t("prompts.promptNamePlaceholder")}
                className="w-full bg-bg text-text px-5 py-3 rounded-2xl border border-gray-200/70 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus:outline-none text-sm font-medium"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-text-muted">
                {t("prompts.applicablePlatform")}
              </label>
              <div className="flex gap-2">
                {PLATFORM_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() =>
                      setForm((f) => ({ ...f, platform: opt.value }))
                    }
                    className={`flex-1 px-4 py-2.5 rounded-2xl text-xs font-bold transition-colors inline-flex items-center justify-center gap-1.5 border focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus:outline-none ${form.platform === opt.value
                        ? "bg-primary text-white border-primary shadow-sm"
                        : "bg-bg text-text-muted border-gray-200/70 hover:text-text"
                      }`}
                  >
                    <PlatformIcon platform={opt.value} size={13} />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-text-muted">
                {t("prompts.instructionContent")}
              </label>
              <textarea
                required
                rows={6}
                value={form.content}
                onChange={(e) =>
                  setForm((f) => ({ ...f, content: e.target.value }))
                }
                placeholder={t("prompts.instructionPlaceholder")}
                className="w-full bg-bg text-text px-5 py-3 rounded-2xl border border-gray-200/70 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus:outline-none text-sm font-medium resize-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-text-muted">
                {t("prompts.tagsLabel")}
              </label>
              <input
                type="text"
                value={form.tagsText}
                onChange={(e) =>
                  setForm((f) => ({ ...f, tagsText: e.target.value }))
                }
                placeholder={t("prompts.tagsPlaceholder")}
                list="prompt-tag-suggestions"
                className="w-full bg-bg text-text px-5 py-3 rounded-2xl border border-gray-200/70 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus:outline-none text-sm font-medium"
              />
              <datalist id="prompt-tag-suggestions">
                {allTags.map((tag) => (
                  <option key={tag} value={tag} />
                ))}
              </datalist>
            </div>

            <div className="flex justify-end gap-3 mt-1">
              <button
                type="button"
                onClick={closeModal}
                disabled={submitting}
                className="px-6 py-3 rounded-full font-bold text-sm text-text-muted hover:text-text transition-colors disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-primary focus:outline-none"
              >
                {t("common.cancel")}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="bg-primary hover:bg-primary-hover text-white px-8 py-3 rounded-full font-bold text-sm transition-colors shadow-md shadow-primary/20 inline-flex items-center gap-2 disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus:outline-none"
              >
                {submitting && <Loader2 size={16} className="animate-spin" />}
                {modal.mode === "edit" ? t("common.save") : t("prompts.createNew")}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete confirm modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="bg-card rounded-2xl p-8 w-full max-w-sm flex flex-col gap-4 shadow-xl">
            {/* Icon */}
            <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center">
              {deleteState.captionCount > 0 ? (
                <AlertTriangle size={22} className="text-amber-500" />
              ) : (
                <Trash2 size={22} className="text-red-500" />
              )}
            </div>

            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-bold text-text">
                {deleteState.captionCount > 0
                  ? t("prompts.promptInUse")
                  : t("prompts.deletePromptTitle")}
              </h2>
              <p className="text-sm text-text-muted">
                {t("prompts.deletePromptConfirm")}{" "}
                <span className="font-bold text-text">
                  &quot;{deleteState.prompt.name}&quot;
                </span>
                {deleteState.captionCount > 0 ? (
                  <>
                    ?{" "}
                    <span className="text-amber-600 font-semibold block mt-1">
                      {t("prompts.promptInUseWarn", { count: deleteState.captionCount })}
                    </span>{" "}
                    {t("prompts.promptInUseInfo")}
                  </>
                ) : (
                  <>? {t("prompts.actionUndone")}</>
                )}
              </p>
            </div>

            {deleteError && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-sm font-medium px-4 py-3 rounded-2xl">
                <AlertCircle size={16} />
                {deleteError}
              </div>
            )}

            <div className="flex justify-end gap-3 mt-1">
              <button
                onClick={handleCancelDelete}
                disabled={deleteState.phase === "deleting"}
                className="px-5 py-2.5 rounded-full font-bold text-sm text-text-muted hover:text-text transition-colors disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-primary focus:outline-none"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleteState.phase === "deleting"}
                className={`px-6 py-2.5 rounded-full font-bold text-sm transition-colors inline-flex items-center gap-2 disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus:outline-none ${deleteState.captionCount > 0
                    ? "bg-amber-500 hover:bg-amber-600 text-white"
                    : "bg-red-600 hover:bg-red-700 text-white"
                  }`}
              >
                {deleteState.phase === "deleting" && (
                  <Loader2 size={16} className="animate-spin" />
                )}
                {deleteState.captionCount > 0 ? t("prompts.deleteAnyway") : t("prompts.deleteBtn")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
