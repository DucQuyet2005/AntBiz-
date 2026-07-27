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
  <svg viewBox="0 0 192 192" width={size} height={size} fill="currentColor">
    <path d="M141.537 88.9883C140.71 88.5919 139.87 88.2104 139.019 87.8451C137.537 60.5382 122.616 44.905 97.5619 44.745C97.4484 44.7443 97.3355 44.7443 97.222 44.7443C82.2364 44.7443 69.7731 51.1409 62.102 62.7807L75.881 72.2328C81.6116 63.5383 90.6052 61.6848 97.2286 61.6848C97.3051 61.6848 97.3819 61.6848 97.4576 61.6855C105.707 61.7381 111.932 64.1366 115.961 68.814C118.893 72.2193 120.854 76.925 121.825 82.8638C114.511 81.6207 106.601 81.2385 98.145 81.7233C74.3247 83.0954 59.0111 96.9879 60.0396 116.292C60.5615 126.084 65.4397 134.508 73.775 140.011C80.8224 144.663 89.899 146.938 99.3323 146.423C111.79 145.74 121.563 140.987 128.381 132.296C133.559 125.696 136.834 117.143 138.28 106.366C144.217 109.949 148.617 114.664 151.047 120.332C155.179 129.967 155.42 145.8 142.501 158.708C131.182 170.016 117.576 174.908 97.0135 175.059C74.2042 174.89 56.9538 167.575 45.7381 153.317C35.2355 139.966 29.8077 120.682 29.6052 96C29.8077 71.3178 35.2355 52.0336 45.7381 38.6827C56.9538 24.4249 74.2039 17.11 97.0132 16.9405C119.988 17.1113 137.539 24.4614 149.184 38.788C154.894 45.8136 159.199 54.6488 162.037 64.9503L178.184 60.6422C174.744 47.9622 169.331 37.0357 161.965 27.974C147.036 9.60668 125.202 0.195148 97.0695 0H96.9569C68.8816 0.19447 47.2921 9.6418 32.7883 28.0793C19.8819 44.4864 13.2244 67.3157 13.0007 95.9325L13 96L13.0007 96.0675C13.2244 124.684 19.8819 147.514 32.7883 163.921C47.2921 182.358 68.8816 191.806 96.9569 192H97.0695C122.03 191.827 139.624 185.292 154.118 170.811C173.081 151.866 172.51 128.119 166.26 113.541C161.776 103.087 153.227 94.5962 141.537 88.9883ZM98.4405 129.507C88.0005 130.095 77.1544 125.409 76.6196 115.372C76.2232 107.93 81.9158 99.626 99.0812 98.6368C101.047 98.5234 102.976 98.468 104.871 98.468C111.106 98.468 116.939 99.0737 122.242 100.233C120.264 124.935 108.662 128.946 98.4405 129.507Z" />
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

  // Scroll to top when currentPage changes
  useEffect(() => {
    const mainEl = document.querySelector('main');
    if (mainEl) {
      mainEl.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentPage]);

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
            className="w-full bg-sidebar/50 rounded-2xl py-3 pl-12 pr-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 placeholder:text-text-muted border border-gray-200/50 shadow-sm"
          />
        </div>

        {/* Platform Filter */}
        <div className="flex items-center gap-2">
          {["All Platforms", "facebook", "instagram", "threads"].map((p) => (
            <button
              key={p}
              onClick={() => setPlatformFilter(p)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold capitalize transition-all select-none border border-gray-200/40 dark:border-white/5 shadow-sm cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus:outline-none ${
                platformFilter === p
                  ? "bg-primary text-white"
                  : "bg-white dark:bg-black text-text-muted hover:text-text hover:bg-gray-50 dark:hover:bg-white/5"
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
        <div className="text-center py-20 bg-white border border-gray-100 rounded-2xl shadow-sm">
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
                  className="bg-white border border-gray-150 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between h-[380px]"
                >
                  {/* Card Header */}
                  <div>
                    <div className="flex justify-between items-start gap-2 mb-3">
                      {/* Platform & Status */}
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-white/5 flex items-center justify-center">
                          {getPlatformIcon(cap.platform)}
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-gray-100 dark:bg-zinc-800 text-text-muted">
                          {t[cap.status as keyof typeof t] || cap.status}
                        </span>
                      </div>

                      {/* Copy Action */}
                      <button
                        onClick={() => handleCopy(displayContent, cap.id)}
                        className={`p-2 rounded-xl border transition-all duration-100 active:scale-95 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus:outline-none ${
                          copiedId === cap.id
                            ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-450 shadow-sm shadow-emerald-100"
                            : "bg-white dark:bg-black border-gray-200 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 text-text-muted hover:text-text"
                        }`}
                        title={t.copyButton}
                      >
                        {copiedId === cap.id ? (
                          <Check size={14} className="transition-transform duration-300 scale-110 rotate-12 text-emerald-600" />
                        ) : (
                          <Copy size={14} className="transition-transform duration-300 scale-100 rotate-0" />
                        )}
                      </button>
                    </div>

                    {/* Article Title Link */}
                    {cap.articles && (
                      <Link
                        href={`/archive/${cap.articles.id}?captionId=${cap.id}&platform=${cap.platform === 'thread' ? 'threads' : cap.platform}`}
                        className="group flex items-start gap-1 text-sm font-extrabold text-text hover:text-primary transition-colors line-clamp-2 mb-3 rounded focus-visible:ring-2 focus-visible:ring-primary focus:outline-none"
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
                  className="p-2.5 border border-gray-200/80 rounded-2xl hover:bg-gray-50 transition-all disabled:opacity-30 disabled:pointer-events-none text-text-muted active:scale-95 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus:outline-none"
                >
                  <ChevronLeft size={16} />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-10 h-10 rounded-2xl text-xs font-black transition-all active:scale-95 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus:outline-none ${
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
                  className="p-2.5 border border-gray-200/80 rounded-2xl hover:bg-gray-50 transition-all disabled:opacity-30 disabled:pointer-events-none text-text-muted active:scale-95 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus:outline-none"
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
