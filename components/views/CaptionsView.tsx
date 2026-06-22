"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  Calendar,
  MessageSquare,
  Facebook,
  Instagram,
  FileText,
  ExternalLink,
  Loader2,
} from "lucide-react";

// Threads Custom SVG Logo
const ThreadsIcon = ({ size = 14 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
    <path d="M22.5 12c0-5.799-4.701-10.5-10.5-10.5S1.5 6.201 1.5 12s4.701 10.5 10.5 10.5c2.328 0 4.475-.758 6.216-2.038l-1.39-1.39C15.42 19.98 13.784 20.5 12 20.5c-4.694 0-8.5-3.806-8.5-8.5s3.806-8.5 8.5-8.5 8.5 3.806 8.5 8.5c0 1.956-.503 3.659-1.42 4.8-.813 1.011-1.923 1.5-3.08 1.5-1.144 0-1.848-.553-2.128-1.123-.391-.798-.328-2.109-.328-3.177v-2.5c0-.828-.672-1.5-1.5-1.5s-1.5.672-1.5 1.5v2.5c0 .356-.002.83-.027 1.309a4 4 0 1 1-3.953-3.809c.28 0 .546.035.803.097V8.539c-.26-.025-.525-.039-.79-.039a7 7 0 1 0 5.679 11.096c.71.91 1.776 1.404 3.018 1.404 2.217 0 4.156-1.134 5.347-2.923 1.15-1.729 1.693-3.992 1.693-6.077zM9.5 12a1 1 0 1 0 2 0 1 1 0 0 0-2 0z" />
  </svg>
);

export default function CaptionsView() {
  const { language } = useLanguage();
  const [platformFilter, setPlatformFilter] = useState("All Platforms");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [captions, setCaptions] = useState<any[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const ITEMS_PER_PAGE = 9;

  useEffect(() => {
    setCurrentPage(1);
  }, [platformFilter, searchQuery]);

  useEffect(() => {
    const fetchCaptions = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (platformFilter !== "All Platforms") {
          params.append("platform", platformFilter);
        }
        if (searchQuery) {
          params.append("search", searchQuery);
        }
        params.append("page", currentPage.toString());
        params.append("limit", ITEMS_PER_PAGE.toString());

        const res = await fetch(`/api/captions?${params.toString()}`);
        if (res.ok) {
          const json = await res.json();
          setCaptions(json.data || []);
          setTotalItems(json.total || 0);
          setTotalPages(json.totalPages || 0);
        }
      } catch (err) {
        console.error("Error fetching captions:", err);
      } finally {
        setLoading(false);
      }
    };

    const delayDebounceFn = setTimeout(() => {
      fetchCaptions();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [platformFilter, searchQuery, currentPage]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case "facebook":
        return <Facebook size={16} className="text-blue-600 fill-blue-600" />;
      case "instagram":
        return <Instagram size={16} className="text-pink-600" />;
      case "thread":
      case "threads":
        return <ThreadsIcon size={16} />;
      default:
        return <FileText size={16} className="text-gray-500" />;
    }
  };

  const labels = {
    vi: {
      title: "Kho lưu trữ Caption",
      subtitle: "Xem, tìm kiếm và tái sử dụng toàn bộ caption đã tạo bằng AI hoặc biên tập viên.",
      searchPlaceholder: "Tìm kiếm caption hoặc tiêu đề bài viết gốc...",
      allPlatforms: "Tất cả nền tảng",
      noCaptions: "Không tìm thấy caption nào phù hợp.",
      promptLabel: "Prompt sử dụng:",
      platformLabel: "Nền tảng:",
      createdLabel: "Ngày tạo:",
      copyButton: "Sao chép",
      copied: "Đã sao chép!",
      viewDetails: "Xem chi tiết bài viết",
      showing: "Hiển thị",
      to: "đến",
      of: "trong số",
      results: "caption",
      noPrompt: "Không dùng prompt mẫu",
      draft: "Bản nháp",
      edited: "Đã chỉnh sửa",
      approved: "Đã duyệt",
      scheduled: "Đã lên lịch",
      posted: "Đã đăng",
    },
    en: {
      title: "Captions Repository",
      subtitle: "View, search, and reuse all generated captions created by AI or editors.",
      searchPlaceholder: "Search captions or original article titles...",
      allPlatforms: "All Platforms",
      noCaptions: "No captions found.",
      promptLabel: "Prompt used:",
      platformLabel: "Platform:",
      createdLabel: "Created:",
      copyButton: "Copy",
      copied: "Copied!",
      viewDetails: "View Article Details",
      showing: "Showing",
      to: "to",
      of: "of",
      results: "captions",
      noPrompt: "No prompt template",
      draft: "Draft",
      edited: "Edited",
      approved: "Approved",
      scheduled: "Scheduled",
      posted: "Posted",
    },
  };

  const t = language === "en" ? labels.en : labels.vi;

  return (
    <div className="flex flex-col gap-6">
      {/* Page Title & Subtitle */}
      <div className="mt-2">
        <h1 className="text-4xl font-bold text-text mb-1 tracking-tight">
          {t.title}
        </h1>
        <p className="text-text-muted">{t.subtitle}</p>
      </div>

      {/* Controls Row */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted w-5 h-5" />
          <input
            type="text"
            placeholder={t.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-sidebar/50 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-text-muted border border-gray-200/50 shadow-sm"
          />
        </div>

        {/* Platform Filter */}
        <div className="flex items-center gap-2">
          {["All Platforms", "facebook", "instagram", "threads"].map((p) => (
            <button
              key={p}
              onClick={() => setPlatformFilter(p)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold capitalize transition-all select-none border border-gray-200/40 shadow-sm cursor-pointer ${
                platformFilter === p
                  ? "bg-primary text-white"
                  : "bg-white text-text-muted hover:text-text hover:bg-gray-50"
              }`}
            >
              {p === "All Platforms" ? t.allPlatforms : p}
            </button>
          ))}
        </div>
      </div>

      {/* Grid List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="animate-spin text-primary" size={36} />
          <span className="font-bold text-sm text-text-muted">
            {language === "vi" ? "Đang tải dữ liệu..." : "Loading captions..."}
          </span>
        </div>
      ) : captions.length === 0 ? (
        <div className="text-center py-20 bg-white border border-gray-100 rounded-[32px] shadow-sm">
          <MessageSquare className="mx-auto text-gray-300 mb-4" size={48} />
          <p className="text-sm font-medium text-text-muted">{t.noCaptions}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {captions.map((cap) => {
              const displayContent = cap.edited_content || cap.ai_content;
              const dateStr = new Date(cap.created_at).toLocaleDateString(
                language === "vi" ? "vi-VN" : "en-US",
                {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                }
              );

              return (
                <div
                  key={cap.id}
                  className="bg-white border border-gray-150 rounded-[32px] p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between h-[380px]"
                >
                  {/* Card Header */}
                  <div>
                    <div className="flex justify-between items-start gap-2 mb-3">
                      {/* Platform & Status */}
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                          {getPlatformIcon(cap.platform)}
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-gray-100 text-text-muted">
                          {t[cap.status as keyof typeof t] || cap.status}
                        </span>
                      </div>

                      {/* Copy Action */}
                      <button
                        onClick={() => handleCopy(displayContent, cap.id)}
                        className={`p-2 rounded-xl border transition-all cursor-pointer ${
                          copiedId === cap.id
                            ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                            : "bg-white border-gray-200 hover:bg-gray-50 text-text-muted hover:text-text"
                        }`}
                        title={t.copyButton}
                      >
                        {copiedId === cap.id ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    </div>

                    {/* Article Title Link */}
                    {cap.articles && (
                      <Link
                        href={`/archive/${cap.articles.id}`}
                        className="group flex items-start gap-1 text-sm font-extrabold text-text hover:text-primary transition-colors line-clamp-2 mb-3"
                      >
                        <span>{cap.articles.title}</span>
                        <ExternalLink
                          size={12}
                          className="opacity-0 group-hover:opacity-100 transition-opacity mt-1 shrink-0"
                        />
                      </Link>
                    )}

                    {/* Scrollable Caption Content */}
                    <div className="bg-slate-50/50 border border-slate-100/60 rounded-2xl p-4 text-xs text-text-muted font-medium overflow-y-auto h-36 leading-relaxed whitespace-pre-wrap">
                      {displayContent}
                    </div>
                  </div>

                  {/* Card Footer Info */}
                  <div className="mt-4 pt-4 border-t border-gray-100 text-[11px] font-bold text-text-muted flex flex-col gap-1.5">
                    {/* Prompt Name */}
                    <div className="flex justify-between items-center gap-4">
                      <span>{t.promptLabel}</span>
                      <span className="text-text truncate max-w-[150px] text-right font-black">
                        {cap.prompts?.name || t.noPrompt}
                      </span>
                    </div>

                    {/* Created Date */}
                    <div className="flex justify-between items-center">
                      <span>{t.createdLabel}</span>
                      <span className="text-text font-black flex items-center gap-1">
                        <Calendar size={12} />
                        {dateStr}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Premium Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-100 pt-6 mt-6 select-none">
              <div className="text-xs text-text-muted font-bold">
                {t.showing}{" "}
                {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, totalItems)}{" "}
                {t.to} {Math.min(currentPage * ITEMS_PER_PAGE, totalItems)}{" "}
                {t.of} {totalItems} {t.results}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-2.5 border border-gray-200/80 rounded-2xl hover:bg-gray-50 transition-all disabled:opacity-30 disabled:pointer-events-none text-text-muted active:scale-95 cursor-pointer"
                >
                  <ChevronLeft size={16} />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-10 h-10 rounded-2xl text-xs font-black transition-all active:scale-95 cursor-pointer ${
                        currentPage === page
                          ? "bg-primary text-white shadow-lg shadow-primary/20"
                          : "border border-gray-200/80 text-text hover:bg-gray-50"
                      }`}
                    >
                      {page}
                    </button>
                  )
                )}

                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  disabled={currentPage === totalPages}
                  className="p-2.5 border border-gray-200/80 rounded-2xl hover:bg-gray-50 transition-all disabled:opacity-30 disabled:pointer-events-none text-text-muted active:scale-95 cursor-pointer"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
