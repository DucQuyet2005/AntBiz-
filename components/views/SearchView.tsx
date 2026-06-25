"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Search,
  FileText,
  MessageSquare,
  Sparkles,
  Loader2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Facebook,
  Instagram,
  Globe,
  HelpCircle
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

const PLATFORM_LABEL: Record<string, string> = {
  facebook: 'Facebook',
  threads: 'Threads',
  thread: 'Threads',
  instagram: 'Instagram',
  blog: 'Blog',
};

const PLATFORM_BADGE_CLASS: Record<string, string> = {
  facebook: 'bg-[#E7F0FE] dark:bg-blue-950/40 text-[#1877F2] dark:text-blue-400',
  threads: 'bg-[#F3E5CD] dark:bg-black border dark:border-white/5 text-[#5D4E3C] dark:text-slate-200',
  thread: 'bg-[#F3E5CD] dark:bg-black border dark:border-white/5 text-[#5D4E3C] dark:text-slate-200',
  instagram: 'bg-[#FCE7F3] dark:bg-pink-950/40 text-[#C026D3] dark:text-pink-400',
  blog: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30',
};

const ThreadsIcon = ({ size = 14 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
    <path d="M22.5 12c0-5.799-4.701-10.5-10.5-10.5S1.5 6.201 1.5 12s4.701 10.5 10.5 10.5c2.328 0 4.475-.758 6.216-2.038l-1.39-1.39C15.42 19.98 13.784 20.5 12 20.5c-4.694 0-8.5-3.806-8.5-8.5s3.806-8.5 8.5-8.5 8.5 3.806 8.5 8.5c0 1.956-.503 3.659-1.42 4.8-.813 1.011-1.923 1.5-3.08 1.5-1.144 0-1.848-.553-2.128-1.123-.391-.798-.328-2.109-.328-3.177v-2.5c0-.828-.672-1.5-1.5-1.5s-1.5.672-1.5 1.5v2.5c0 .356-.002.83-.027 1.309a4 4 0 1 1-3.953-3.809c.28 0 .546.035.803.097V8.539c-.26-.025-.525-.039-.79-.039a7 7 0 1 0 5.679 11.096c.71.91 1.776 1.404 3.018 1.404 2.217 0 4.156-1.134 5.347-2.923 1.15-1.729 1.693-3.992 1.693-6.077zM9.5 12a1 1 0 1 0 2 0 1 1 0 0 0-2 0z" />
  </svg>
);

function PlatformIcon({ platform, size = 14 }: { platform: string; size?: number }) {
  if (platform === 'facebook') return <Facebook size={size} className="fill-[#1877F2] text-[#1877F2] dark:fill-blue-400 dark:text-blue-400" />;
  if (platform === 'instagram') return <Instagram size={size} className="text-[#C026D3] dark:text-pink-400" />;
  if (platform === 'blog') return <Globe size={size} className="text-emerald-600 dark:text-emerald-400" />;
  return <ThreadsIcon size={size} />;
}

export default function SearchView() {
  const { t, language } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();

  const query = searchParams?.get('q') || '';

  const [localQuery, setLocalQuery] = useState(query);
  const [activeTab, setActiveTab] = useState<'all' | 'articles' | 'captions' | 'prompts' | 'faqs'>('all');
  const [results, setResults] = useState<{
    articles: any[];
    captions: any[];
    prompts: any[];
    faqs: any[];
  }>({ articles: [], captions: [], prompts: [], faqs: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync url param to local input state
  useEffect(() => {
    setLocalQuery(query);
  }, [query]);

  // Fetch search results from API
  useEffect(() => {
    if (!query.trim()) {
      setResults({ articles: [], captions: [], prompts: [], faqs: [] });
      return;
    }

    const fetchResults = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}&lang=${language}`);
        const data = await res.json();
        if (res.ok) {
          setResults(data);
        } else {
          setError(data.error || t('prompts.errorOccurred'));
        }
      } catch (err) {
        console.error('Search fetch error:', err);
        setError(t('prompts.errorOccurred'));
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [query, language, t]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (localQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(localQuery.trim())}`);
    }
  };

  const totalResults =
    results.articles.length + results.captions.length + results.prompts.length + results.faqs.length;

  return (
    <div className="flex flex-col gap-6">
      {/* Title */}
      <div className="mt-2">
        <h1 className="text-4xl font-bold text-text mb-1 tracking-tight">
          {t('search.title')}
        </h1>
        <p className="text-text-muted">
          {t('search.subtitle')}
        </p>
      </div>

      {/* Main Search Input */}
      <form onSubmit={handleSearchSubmit} className="flex gap-3 w-full max-w-2xl mt-2">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted w-5 h-5" />
          <input
            type="text"
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            placeholder={t('search.placeholder')}
            className="w-full bg-white border border-gray-200/80 rounded-2xl py-3.5 pl-12 pr-4 text-sm focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus:outline-none placeholder:text-text-muted shadow-sm"
          />
        </div>
        <button
          type="submit"
          className="bg-primary hover:bg-primary-hover text-white px-6 py-3.5 rounded-2xl text-sm font-bold shadow-md shadow-primary/20 transition-all active:scale-95 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus:outline-none"
        >
          {t('common.search')}
        </button>
      </form>

      {/* Results Meta Info */}
      {!loading && query && (
        <div className="text-xs text-text-muted font-bold -mt-2">
          {t('search.foundResults', { count: totalResults })} {language === 'vi' ? 'cho' : 'for'} &quot;{query}&quot;
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 overflow-x-auto whitespace-nowrap mt-4">
        {[
          { id: 'all', label: t('search.all'), count: totalResults },
          { id: 'articles', label: t('search.articles'), count: results.articles.length },
          { id: 'captions', label: t('search.captions'), count: results.captions.length },
          { id: 'prompts', label: t('search.prompts'), count: results.prompts.length },
          { id: 'faqs', label: t('search.faqs'), count: results.faqs.length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-6 py-3 text-sm font-extrabold relative transition-colors focus-visible:ring-2 focus-visible:ring-primary focus:outline-none rounded-t-xl ${activeTab === tab.id ? 'text-primary' : 'text-text-muted hover:text-text'
              }`}
          >
            <span className="flex items-center gap-1.5">
              {tab.label}
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === tab.id ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-500'
                }`}>
                {tab.count}
              </span>
            </span>
            {activeTab === tab.id && (
              <motion.div
                layoutId="searchActiveTabBorder"
                className="absolute bottom-0 left-0 w-full h-1 bg-primary rounded-t-full"
              />
            )}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="mt-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-text-muted">
            <Loader2 className="animate-spin text-primary" size={32} />
            <p className="font-bold text-sm">{t('common.loading')}</p>
          </div>
        ) : error ? (
          <div className="flex items-center gap-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 text-sm font-medium px-5 py-4 rounded-2xl">
            <AlertCircle size={20} className="shrink-0" />
            {error}
          </div>
        ) : totalResults === 0 ? (
          <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-16 flex flex-col items-center text-center gap-3 max-w-xl mx-auto mt-6">
            <div className="w-16 h-16 rounded-3xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-500 dark:text-blue-400">
              <Search size={32} />
            </div>
            <p className="font-extrabold text-lg text-text">
              {t('search.noResults')}
            </p>
            <p className="text-text-muted text-sm leading-relaxed">
              {t('search.tryChanging')}
            </p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {/* Tab: ALL */}
              {activeTab === 'all' && (
                <div className="flex flex-col gap-8">
                  {/* Articles Preview */}
                  {results.articles.length > 0 && (
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                        <FileText size={18} className="text-primary" />
                        <h2 className="text-lg font-black text-text">{t('search.articles')}</h2>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {results.articles.slice(0, 4).map((art) => (
                          <ArticleCard key={art.id} article={art} query={query} />
                        ))}
                      </div>
                      {results.articles.length > 4 && (
                        <button
                          onClick={() => setActiveTab('articles')}
                          className="self-start text-xs font-black text-primary hover:underline flex items-center gap-0.5"
                        >
                          {t('search.viewMoreArticles')} <ChevronRight size={14} />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Captions Preview */}
                  {results.captions.length > 0 && (
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                        <MessageSquare size={18} className="text-primary" />
                        <h2 className="text-lg font-black text-text">{t('search.captions')}</h2>
                      </div>
                      <div className="flex flex-col gap-3">
                        {results.captions.slice(0, 3).map((cap) => (
                          <CaptionRow key={cap.id} caption={cap} query={query} />
                        ))}
                      </div>
                      {results.captions.length > 3 && (
                        <button
                          onClick={() => setActiveTab('captions')}
                          className="self-start text-xs font-black text-primary hover:underline flex items-center gap-0.5"
                        >
                          {t('search.viewMoreCaptions')} <ChevronRight size={14} />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Prompts Preview */}
                  {results.prompts.length > 0 && (
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                        <Sparkles size={18} className="text-primary" />
                        <h2 className="text-lg font-black text-text">{t('search.prompts')}</h2>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {results.prompts.slice(0, 4).map((p) => (
                          <PromptCard key={p.id} prompt={p} query={query} />
                        ))}
                      </div>
                      {results.prompts.length > 4 && (
                        <button
                          onClick={() => setActiveTab('prompts')}
                          className="self-start text-xs font-black text-primary hover:underline flex items-center gap-0.5"
                        >
                          {t('search.viewMorePrompts')} <ChevronRight size={14} />
                        </button>
                      )}
                    </div>
                  )}

                  {/* FAQs Preview */}
                  {results.faqs.length > 0 && (
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                        <HelpCircle size={18} className="text-primary" />
                        <h2 className="text-lg font-black text-text">{t('search.faqs')}</h2>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {results.faqs.slice(0, 4).map((faq) => (
                          <FaqCard key={faq.key} faq={faq} query={query} />
                        ))}
                      </div>
                      {results.faqs.length > 4 && (
                        <button
                          onClick={() => setActiveTab('faqs')}
                          className="self-start text-xs font-black text-primary hover:underline flex items-center gap-0.5"
                        >
                          {t('search.viewMoreFaqs')} <ChevronRight size={14} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Tab: ARTICLES */}
              {activeTab === 'articles' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {results.articles.map((art) => (
                    <ArticleCard key={art.id} article={art} query={query} />
                  ))}
                </div>
              )}

              {/* Tab: CAPTIONS */}
              {activeTab === 'captions' && (
                <div className="flex flex-col gap-4">
                  {results.captions.map((cap) => (
                    <CaptionRow key={cap.id} caption={cap} query={query} />
                  ))}
                </div>
              )}

              {/* Tab: PROMPTS */}
              {activeTab === 'prompts' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {results.prompts.map((p) => (
                    <PromptCard key={p.id} prompt={p} query={query} />
                  ))}
                </div>
              )}

              {/* Tab: FAQS */}
              {activeTab === 'faqs' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {results.faqs.map((faq) => (
                    <FaqCard key={faq.key} faq={faq} query={query} />
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

/* Sub-components forSearchView */

function highlightText(text: string, query: string) {
  if (!query || !query.trim() || !text) return text;
  
  const escapedQuery = query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  const regex = new RegExp(`(${escapedQuery})`, 'gi');
  const parts = text.split(regex);
  
  return (
    <>
      {parts.map((part, i) => 
        regex.test(part) ? (
          <mark key={i} className="bg-amber-100 dark:bg-amber-500/20 text-amber-950 dark:text-amber-300 px-0.5 rounded font-extrabold">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

const ArticleCard = React.memo(function ArticleCard({ article, query = '' }: { article: any; query?: string; key?: any }) {
  const { t } = useLanguage();
  return (
    <Link
      href={`/archive/${article.id}`}
      className="bg-white border border-gray-200/60 p-6 rounded-2xl hover:shadow-md transition-all group flex flex-col justify-between gap-4 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus:outline-none"
    >
      <div>
        <div className="text-[10px] font-black text-primary uppercase tracking-widest mb-1.5 block">
          {t('search.originalArticleLabel')}
        </div>
        <h3 className="font-extrabold text-base text-text line-clamp-2 group-hover:text-primary transition-colors mb-2">
          {highlightText(article.title || t('search.untitled'), query)}
        </h3>
        {article.description && (
          <p className="text-xs text-text-muted line-clamp-3 leading-relaxed font-medium">
            {highlightText(article.description, query)}
          </p>
        )}
      </div>
      <div className="flex items-center justify-between mt-1 text-[10px] text-text-muted font-bold">
        <span>{article.crawled_at ? new Date(article.crawled_at).toLocaleDateString() : ''}</span>
        <span className="flex items-center gap-1 text-primary group-hover:underline">
          {t('search.details')} <ExternalLink size={10} />
        </span>
      </div>
    </Link>
  );
});

const CaptionRow = React.memo(function CaptionRow({ caption, query = '' }: { caption: any; query?: string; key?: any }) {
  const { t } = useLanguage();
  return (
    <Link
      href={`/archive/${caption.article_id}?captionId=${caption.id}`}
      className="bg-white border border-gray-200/60 p-5 rounded-2xl hover:shadow-sm transition-all flex flex-col gap-3 group cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus:outline-none"
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-0.5 rounded-full font-black text-[9px] uppercase tracking-wider ${PLATFORM_BADGE_CLASS[caption.platform] || 'bg-gray-100 text-gray-600'}`}>
            {PLATFORM_LABEL[caption.platform] || caption.platform}
          </span>
          {caption.articles?.title && (
            <span className="text-[10px] text-text-muted font-bold line-clamp-1 max-w-sm">
              {t('search.articlePrefix')}{highlightText(caption.articles.title, query)}
            </span>
          )}
        </div>
        <span className="text-[10px] font-black text-primary group-hover:underline flex items-center gap-0.5">
          {t('search.viewPost')} <ChevronRight size={12} />
        </span>
      </div>
      <p className="text-xs text-text leading-relaxed font-medium whitespace-pre-wrap bg-gray-50/50 p-3.5 rounded-2xl border border-gray-100/50">
        {highlightText(caption.edited_content || caption.ai_content || t('search.noContent'), query)}
      </p>
    </Link>
  );
});

const PromptCard = React.memo(function PromptCard({ prompt, query = '' }: { prompt: any; query?: string; key?: any }) {
  const { t } = useLanguage();
  return (
    <Link
      href={`/prompts?promptId=${prompt.id}`}
      className="bg-white border border-gray-200/60 p-6 rounded-2xl hover:shadow-md transition-all flex flex-col justify-between gap-4 group cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus:outline-none"
    >
      <div>
        <div className="flex items-center justify-between gap-3 mb-2.5">
          <span className={`px-2.5 py-0.5 rounded-full font-black text-[9px] uppercase tracking-wider inline-flex items-center gap-1.5 ${PLATFORM_BADGE_CLASS[prompt.platform] || 'bg-gray-100 text-gray-600'}`}>
            <PlatformIcon platform={prompt.platform} size={10} />
            {PLATFORM_LABEL[prompt.platform] || prompt.platform}
          </span>
          <div className="flex gap-1 flex-wrap">
            {prompt.tags?.slice(0, 2).map((tag: string) => (
              <span key={tag} className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[8px] font-black">
                {tag}
              </span>
            ))}
          </div>
        </div>
        <h3 className="font-extrabold text-base text-text line-clamp-1 group-hover:text-primary transition-colors mb-2">
          {highlightText(prompt.name, query)}
        </h3>
        <p className="text-xs text-text-muted line-clamp-3 leading-relaxed font-medium whitespace-pre-line">
          {highlightText(prompt.content, query)}
        </p>
      </div>
      <div className="flex items-center justify-end text-[10px] font-black text-primary group-hover:underline gap-0.5">
        {t('search.openInLibrary')} <ExternalLink size={10} />
      </div>
    </Link>
  );
});

const FaqCard = React.memo(function FaqCard({ faq, query = '' }: { faq: any; query?: string; key?: any }) {
  const { t } = useLanguage();
  return (
    <Link
      href={`/faq?key=${faq.key}`}
      className="bg-white border border-gray-200/60 p-6 rounded-2xl hover:shadow-md transition-all flex flex-col justify-between gap-4 group cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus:outline-none"
    >
      <div>
        <div className="flex items-center gap-1.5 mb-2.5">
          <HelpCircle size={12} className="text-primary" />
          <span className="text-[10px] font-black text-primary uppercase tracking-widest">
            FAQ
          </span>
        </div>
        <h3 className="font-extrabold text-base text-text line-clamp-2 group-hover:text-primary transition-colors mb-2">
          {highlightText(faq.question, query)}
        </h3>
        {faq.answer && (
          <p className="text-xs text-text-muted line-clamp-3 leading-relaxed font-medium">
            {highlightText(faq.answer, query)}
          </p>
        )}
      </div>
      <div className="flex items-center justify-end text-[10px] font-black text-primary group-hover:underline gap-0.5">
        {t('search.viewAnswer')} <ExternalLink size={10} />
      </div>
    </Link>
  );
});
