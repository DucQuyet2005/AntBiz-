"use client";

import { useEffect, useRef, useState } from 'react';
import { Sparkles, Tag, TrendingUp, RotateCcw } from 'lucide-react';
import { PromptSuggestResponse, PromptSuggestion } from '@/lib/types/api';

// ─── Platform badge colours ────────────────────────────────────────────────
const PLATFORM_COLOR: Record<string, string> = {
  facebook: 'bg-blue-100 text-blue-700',
  thread: 'bg-gray-100 text-gray-700',
  instagram: 'bg-pink-100 text-pink-700',
};

// ─── Skeleton card ─────────────────────────────────────────────────────────
function PromptCardSkeleton() {
  return (
    <div className="border border-gray-100 rounded-2xl p-4 flex flex-col gap-3 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-3 bg-gray-200 rounded w-2/3" />
        <div className="h-5 bg-gray-200 rounded-full w-16" />
      </div>
      <div className="space-y-1.5">
        <div className="h-2.5 bg-gray-100 rounded w-full" />
        <div className="h-2.5 bg-gray-100 rounded w-5/6" />
        <div className="h-2.5 bg-gray-100 rounded w-4/6" />
      </div>
      <div className="flex gap-1.5 mt-1">
        <div className="h-4 bg-gray-100 rounded-full w-14" />
        <div className="h-4 bg-gray-100 rounded-full w-16" />
      </div>
    </div>
  );
}

// ─── Relevance bar ──────────────────────────────────────────────────────────
function RelevanceBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = pct >= 60 ? 'bg-emerald-500' : pct >= 30 ? 'bg-amber-400' : 'bg-gray-300';
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] font-bold text-text-muted w-8 text-right">{pct}%</span>
    </div>
  );
}

// ─── Single prompt card ─────────────────────────────────────────────────────
interface PromptCardProps {
  suggestion: PromptSuggestion;
  onUse: (content: string) => void;
  onSave: (prompt: any) => void;
}

function PromptCard({ suggestion, onUse, onSave }: PromptCardProps) {
  const { prompt, relevanceScore, matchedTags } = suggestion;
  const [isSaving, setIsSaving] = useState(false);

  const handleUsePrompt = async () => {
    // T-1.19.1: Increment usage_count khi user chọn dùng prompt
    try {
      await fetch(`/api/prompts/${prompt.id}/use`, {
        method: 'POST',
      });
    } catch (err) {
      console.error('[PromptCard] Failed to increment usage_count:', err);
    }
    // Gọi callback dù API có lỗi hay không
    onUse(prompt.content);
  };

  return (
    <div className="border border-gray-100 hover:border-primary/30 rounded-2xl p-4 flex flex-col gap-3 bg-white hover:shadow-sm transition-all duration-200 group">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-bold text-text leading-snug line-clamp-2 flex-1">{prompt.name}</p>
        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 ${PLATFORM_COLOR[prompt.platform] ?? 'bg-gray-100 text-gray-600'}`}>
          {prompt.platform}
        </span>
      </div>

      {/* Content preview */}
      <p className="text-[11px] text-text-muted leading-relaxed line-clamp-3">
        {prompt.content}
      </p>

      {/* Tags */}
      {prompt.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {prompt.tags.slice(0, 4).map((tag) => {
            const isMatched = matchedTags.includes(tag);
            return (
              <span
                key={tag}
                className={`flex items-center gap-0.5 text-[9px] font-bold px-2 py-0.5 rounded-full border transition-colors ${
                  isMatched
                    ? 'bg-primary/10 text-primary border-primary/20'
                    : 'bg-gray-50 text-gray-400 border-gray-100'
                }`}
              >
                {isMatched && <Tag size={8} />}
                {tag}
              </span>
            );
          })}
        </div>
      )}

      {/* Relevance bar */}
      {relevanceScore > 0 && <RelevanceBar score={relevanceScore} />}

      {/* Buttons */}
      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200">
        <button
          onClick={handleUsePrompt}
          className="w-full bg-primary text-white text-[10px] font-extrabold py-2 rounded-xl transition-all duration-200 cursor-pointer shadow-sm active:scale-95"
        >
          Dùng prompt này
        </button>
      </div>
    </div>
  );
}

// ─── Main section component ─────────────────────────────────────────────────

interface PromptSuggestionSectionProps {
  /** article_id từ database (UUID) – ưu tiên mode này khi có. */
  articleId?: string;
  /** Tiêu đề bài viết – dùng khi chưa có article_id (scraping flow). */
  articleTitle?: string;
  /** Nội dung tóm tắt – dùng khi chưa có article_id (scraping flow). */
  articleContent?: string;
  /** Nền tảng muốn lọc gợi ý (facebook, thread, instagram) */
  platform?: string;
  /** Callback khi user chọn dùng một prompt */
  onSelectPrompt?: (content: string) => void;
  /** Callback khi user muốn lưu prompt vào thư viện */
  onSavePrompt?: (prompt: any) => Promise<void>;
}

/**
 * T-1.19.4 – Section "Gợi ý cho bài này".
 * T-1.19.5 – Tự động gọi lại API khi articleId / title / content thay đổi.
 *            Dùng AbortController để tránh duplicate request.
 */
export default function PromptSuggestionSection({
  articleId,
  articleTitle,
  articleContent,
  platform,
  onSelectPrompt,
  onSavePrompt,
}: PromptSuggestionSectionProps) {
  const [data, setData] = useState<PromptSuggestResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // T-1.19.5: reactive fetch – gọi lại khi bất kỳ dependency nào thay đổi.
  useEffect(() => {
    const hasArticleId = !!articleId;
    const hasInline = !!(articleTitle || articleContent);

    if (!hasArticleId && !hasInline) {
      setData(null);
      return;
    }

    // Huỷ request cũ nếu còn đang chạy (tránh duplicate)
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    // Build query string
    const params = new URLSearchParams();
    if (hasArticleId) {
      params.set('article_id', articleId!);
    } else {
      if (articleTitle) params.set('title', articleTitle.substring(0, 200));
      if (articleContent) params.set('content', articleContent.substring(0, 500));
    }
    
    // Thêm platform vào query nếu có
    if (platform) {
      params.set('platform', platform);
    }

    setLoading(true);
    setError(null);

    fetch(`/api/prompts/suggest?${params.toString()}`, {
      signal: abortRef.current.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<PromptSuggestResponse>;
      })
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        if (err.name === 'AbortError') return; // intentional cancel – không set error
        setError('Không thể tải gợi ý prompt');
        setLoading(false);
      });

    return () => {
      abortRef.current?.abort();
    };
  }, [articleId, articleTitle, articleContent, platform]);

  // Không hiển thị nếu không có context nào
  if (!articleId && !articleTitle && !loading) return null;

  return (
    <div className="bg-white border border-gray-200/80 rounded-[28px] p-6 shadow-sm flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Sparkles size={16} />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-text">Gợi ý cho bài này</h3>
            {data && (
              <div className="flex items-center gap-2 mt-1">
                {/* T-1.19.2: Category badge */}
                {data.articleCategory && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                    {data.articleCategory}
                  </span>
                )}
                {/* Fallback badge */}
                {data.isFallback && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                    📌 Phổ biến nhất
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="text-xs text-red-500 bg-red-50 px-4 py-3 rounded-xl border border-red-100 flex items-center gap-2">
          <RotateCcw size={12} />
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="flex flex-col gap-3">
          <PromptCardSkeleton />
          <PromptCardSkeleton />
          <PromptCardSkeleton />
        </div>
      )}

      {/* Suggestions with Scroll Limit */}
      {!loading && !error && data && (
        <>
          {data.suggestions.length === 0 ? (
            <p className="text-xs text-text-muted text-center py-6">
              Không tìm thấy prompt phù hợp cho bài này.
            </p>
          ) : (
            <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                  width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                  background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                  background: #E2E8F0;
                  border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                  background: #CBD5E1;
                }
              `}</style>
              {data.suggestions.map((s) => (
                <PromptCard
                  key={s.prompt.id}
                  suggestion={s}
                  onUse={(content) => onSelectPrompt?.(content)}
                  onSave={(prompt) => onSavePrompt?.(prompt)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
