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
  AlertCircle,
  AlertTriangle,
} from "lucide-react";
import type { Prompt, PromptPlatform } from "@/lib/types/prompt";

const PLATFORM_OPTIONS: { value: PromptPlatform; label: string }[] = [
  { value: "facebook", label: "Facebook" },
  { value: "thread", label: "Threads" },
  { value: "instagram", label: "Instagram" },
];

const PLATFORM_BADGE_CLASS: Record<PromptPlatform, string> = {
  facebook: "bg-[#E7F0FE] text-[#1877F2]",
  thread: "bg-[#F3E5CD] text-[#5D4E3C]",
  instagram: "bg-[#FCE7F3] text-[#C026D3]",
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
  const { t } = useLanguage();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState<PromptPlatform | "">("");
  const [tagsFilter, setTagsFilter] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(6);
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
  const [allDbTags, setAllDbTags] = useState<string[]>([]);

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

  // Load all unique tags initially for dropdown multi-select
  useEffect(() => {
    fetch("/api/prompts?pageSize=100")
      .then((res) => res.json())
      .then((json) => {
        if (json.data) {
          const tagsSet = new Set<string>();
          json.data.forEach((p: Prompt) => p.tags.forEach((t: string) => tagsSet.add(t)));
          setAllDbTags(Array.from(tagsSet).sort());
        }
      })
      .catch((err) => console.error("Error fetching tags:", err));
  }, []);

  const fetchPrompts = useCallback(
    async (opts: {
      search: string;
      platform: PromptPlatform | "";
      tags: string[];
      page: number;
      pageSize: number;
    }) => {
      setLoading(true);
      setLoadError(null);
      try {
        const params = new URLSearchParams();
        if (opts.search) params.set("search", opts.search);
        if (opts.platform) params.set("platform", opts.platform);
        if (opts.tags.length > 0) params.set("tags", opts.tags.join(","));
        params.set("page", opts.page.toString());
        params.set("pageSize", opts.pageSize.toString());

        const res = await fetch(`/api/prompts?${params.toString()}`);
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json?.error || t("prompts.cannotLoad"));
        }
        setPrompts(json.data ?? []);
        setTotal(json.pagination?.total ?? json.data?.length ?? 0);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : t("prompts.errorOccurred"));
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // Debounce 300ms cho search, trigger ngay cho filter buttons
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPrompts({ search, platform: platformFilter, tags: tagsFilter, page, pageSize });
    }, 300);
    return () => clearTimeout(timer);
  }, [search, platformFilter, tagsFilter, page, pageSize, fetchPrompts]);

  // Reset page về 1 khi đổi bộ lọc
  useEffect(() => {
    setPage(1);
  }, [search, platformFilter, tagsFilter]);

  // Tập hợp tất cả tags từ danh sách hiện tại để gợi ý
  const allTags = useMemo(() => {
    const set = new Set<string>();
    prompts.forEach((p) => p.tags.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [prompts]);

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
      // Refresh tags list
      fetch("/api/prompts?pageSize=100")
        .then((res) => res.json())
        .then((json) => {
          if (json.data) {
            const tagsSet = new Set<string>();
            json.data.forEach((p: Prompt) => p.tags.forEach((t: string) => tagsSet.add(t)));
            setAllDbTags(Array.from(tagsSet).sort());
          }
        });

      setPage(1);
      await fetchPrompts({ search, platform: platformFilter, tags: tagsFilter, page: 1, pageSize });
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
        prompts
          .filter((p) => p.id !== prompt.id)
          .every((p) => !p.tags.some((t) => tagsFilter.includes(t)))
      ) {
        setTagsFilter([]);
      }
      setPage(1);
      await fetchPrompts({ search, platform: platformFilter, tags: tagsFilter, page: 1, pageSize });
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
      await fetchPrompts({ search, platform: platformFilter, tags: tagsFilter, page: 1, pageSize });
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
    <div className="flex flex-col gap-6">
      {/* Title Header */}
      <div className="mt-2 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-text mb-1 tracking-tight">
            {t("prompts.title")}
          </h1>
          <p className="text-text-muted">
            {t("prompts.subtitle")}
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-primary hover:bg-primary-hover text-white px-6 py-3 rounded-full flex items-center gap-2 font-bold text-sm transition-colors shadow-md shadow-primary/20 shrink-0"
        >
          <Plus size={18} />
          {t("prompts.createNew")}
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col gap-3">
        {/* Row 1: Search + Platform filter + Multi-select tags dropdown */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted w-4 h-4" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("prompts.searchPlaceholder")}
              className="w-full bg-card border border-gray-200/70 rounded-full py-2.5 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-text-muted"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPlatformFilter("")}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-colors ${
                platformFilter === ""
                  ? "bg-primary text-white shadow-sm"
                  : "bg-card text-text-muted border border-gray-200/70 hover:text-text"
              }`}
            >
              {t("prompts.all")}
            </button>
            {PLATFORM_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setPlatformFilter(opt.value)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-colors inline-flex items-center gap-1.5 ${
                  platformFilter === opt.value
                    ? "bg-primary text-white shadow-sm"
                    : "bg-card text-text-muted border border-gray-200/70 hover:text-text"
                }`}
              >
                <PlatformIcon platform={opt.value} size={13} />
                {opt.label}
              </button>
            ))}
          </div>

          {/* Tags multi-select dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsTagDropdownOpen(!isTagDropdownOpen)}
              className="bg-card border border-gray-200/70 rounded-full px-4 py-2.5 text-xs font-bold text-text-muted hover:text-text flex items-center gap-1.5 transition-colors focus:outline-none"
            >
              {t("prompts.filterByTag", { count: tagsFilter.length })}
            </button>
            {isTagDropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsTagDropdownOpen(false)} />
                <div className="absolute left-0 mt-2 w-48 bg-card border border-gray-200/70 rounded-2xl p-2 shadow-lg z-20 max-h-60 overflow-y-auto">
                  {allDbTags.length === 0 ? (
                    <div className="text-xs text-text-muted p-2 text-center">{t("prompts.noTags")}</div>
                  ) : (
                    allDbTags.map((tag) => {
                      const isSelected = tagsFilter.includes(tag);
                      return (
                        <label
                           key={tag}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs hover:bg-gray-50 cursor-pointer select-none text-text"
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              setTagsFilter((prev) =>
                                prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
                              );
                            }}
                            className="rounded border-gray-300 text-primary focus:ring-primary/20"
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

          <span className="text-xs text-text-muted ml-auto">
            {total} prompts
          </span>
        </div>

        {/* Row 2: Selected tags chips */}
        {tagsFilter.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-text-muted shrink-0">
              {t("prompts.filteringBy")}
            </span>
            {tagsFilter.map((tag) => (
              <button
                key={tag}
                onClick={() => setTagsFilter((prev) => prev.filter((t) => t !== tag))}
                className="px-3 py-1.5 rounded-full text-xs font-bold bg-primary text-white shadow-sm inline-flex items-center gap-1.5 transition-colors"
              >
                {tag}
                <X size={11} />
              </button>
            ))}
            <button
              onClick={() => setTagsFilter([])}
              className="text-xs font-semibold text-text-muted hover:text-red-500 transition-colors"
            >
              {t("prompts.clearAllFilters")}
            </button>
          </div>
        )}
      </div>

      {actionError && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-sm font-medium px-4 py-3 rounded-2xl">
          <AlertCircle size={16} />
          {actionError}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-text-muted gap-2">
          <Loader2 className="animate-spin" size={20} />
          {t("common.loading")}
        </div>
      ) : loadError ? (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-sm font-medium px-4 py-3 rounded-2xl">
          <AlertCircle size={16} />
          {loadError}
        </div>
      ) : prompts.length === 0 ? (
        <div className="bg-[#F3F4FD] border border-[#E4E6F8] rounded-[32px] p-12 flex flex-col items-center text-center gap-2">
          <p className="font-bold text-text">
            {search || platformFilter || tagsFilter.length > 0
              ? t("prompts.noMatching")
              : t("prompts.noPromptsYet")}
          </p>
          <p className="text-text-muted text-sm">
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
              className="mt-2 text-xs font-bold text-primary hover:underline"
            >
              {t("prompts.clearAllFilters")}
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {prompts.map((prompt) => (
            <div
              key={prompt.id}
              className="bg-card border border-gray-100 rounded-[28px] p-6 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 ${PLATFORM_BADGE_CLASS[prompt.platform]}`}
                  >
                    <PlatformIcon platform={prompt.platform} />
                    {PLATFORM_LABEL[prompt.platform]}
                  </span>
                  {prompt.cloned_from && (
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-text-muted">
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
                        className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                          isSelected
                            ? "bg-[#C4F0E1] text-[#1F4C3F] ring-1 ring-[#1F4C3F]/30"
                            : "bg-[#C4F0E1]/50 text-[#1F4C3F] hover:bg-[#C4F0E1]"
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleClone(prompt)}
                    disabled={cloningId === prompt.id}
                    title={t("prompts.cloneTooltip")}
                    className="p-2 rounded-full text-text-muted hover:text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
                  >
                    {cloningId === prompt.id ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Copy size={16} />
                    )}
                  </button>
                  <button
                    onClick={() => openEditModal(prompt)}
                    title={t("prompts.editTooltip")}
                    className="p-2 rounded-full text-text-muted hover:text-primary hover:bg-primary/10 transition-colors"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteClick(prompt)}
                    disabled={
                      isCheckingDelete && deletingPrompt?.id === prompt.id
                    }
                    title={t("prompts.deleteTooltip")}
                    className="p-2 rounded-full text-text-muted hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    {isCheckingDelete && deletingPrompt?.id === prompt.id ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Trash2 size={16} />
                    )}
                  </button>
                </div>
              </div>

              <h2 className="text-lg font-bold text-text">{prompt.name}</h2>
              <p className="text-sm text-text-muted line-clamp-2 whitespace-pre-line">
                {prompt.content}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Footer */}
      {!loading && prompts.length > 0 && (
        <div className="flex items-center justify-between mt-6 border-t border-gray-100 pt-6">
          <span className="text-xs text-text-muted">
            {t("prompts.paginationInfo", { count: prompts.length, total: total, page: page, totalPages: Math.ceil(total / pageSize) || 1 })}
          </span>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-4 py-2 bg-card border border-gray-200/70 rounded-full text-xs font-bold text-text-muted hover:text-text disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {t("prompts.prev")}
            </button>
            <button
              disabled={page >= Math.ceil(total / pageSize)}
              onClick={() => setPage((p) => p + 1)}
              className="px-4 py-2 bg-card border border-gray-200/70 rounded-full text-xs font-bold text-text-muted hover:text-text disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {t("prompts.next")}
            </button>
          </div>
        </div>
      )}

      {/* Create / Edit modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <form
            onSubmit={handleSubmit}
            className="bg-card rounded-[28px] p-8 w-full max-w-lg flex flex-col gap-5 shadow-xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-text">
                {modal.mode === "edit" ? t("prompts.editPrompt") : t("prompts.createNew")}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="text-text-muted hover:text-text p-1 rounded-full hover:bg-gray-100"
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
                className="w-full bg-bg text-text px-5 py-3 rounded-2xl border border-gray-200/70 focus:outline-none text-sm font-medium focus:ring-2 focus:ring-primary/25"
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
                    className={`flex-1 px-4 py-2.5 rounded-2xl text-xs font-bold transition-colors inline-flex items-center justify-center gap-1.5 border ${
                      form.platform === opt.value
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
                className="w-full bg-bg text-text px-5 py-3 rounded-2xl border border-gray-200/70 focus:outline-none text-sm font-medium focus:ring-2 focus:ring-primary/25 resize-none"
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
                className="w-full bg-bg text-text px-5 py-3 rounded-2xl border border-gray-200/70 focus:outline-none text-sm font-medium focus:ring-2 focus:ring-primary/25"
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
                className="px-6 py-3 rounded-full font-bold text-sm text-text-muted hover:text-text transition-colors disabled:opacity-50"
              >
                {t("common.cancel")}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="bg-primary hover:bg-primary-hover text-white px-8 py-3 rounded-full font-bold text-sm transition-colors shadow-md shadow-primary/20 inline-flex items-center gap-2 disabled:opacity-60"
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
          <div className="bg-card rounded-[28px] p-8 w-full max-w-sm flex flex-col gap-4 shadow-xl">
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
                className="px-5 py-2.5 rounded-full font-bold text-sm text-text-muted hover:text-text transition-colors disabled:opacity-50"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleteState.phase === "deleting"}
                className={`px-6 py-2.5 rounded-full font-bold text-sm transition-colors inline-flex items-center gap-2 disabled:opacity-60 ${
                  deleteState.captionCount > 0
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
