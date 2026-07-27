"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { createClient } from '@/utils/supabase/client';
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
  HelpCircle,
  User,
  RotateCcw
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
  <svg viewBox="0 0 192 192" width={size} height={size} fill="currentColor">
    <path d="M141.537 88.9883C140.71 88.5919 139.87 88.2104 139.019 87.8451C137.537 60.5382 122.616 44.905 97.5619 44.745C97.4484 44.7443 97.3355 44.7443 97.222 44.7443C82.2364 44.7443 69.7731 51.1409 62.102 62.7807L75.881 72.2328C81.6116 63.5383 90.6052 61.6848 97.2286 61.6848C97.3051 61.6848 97.3819 61.6848 97.4576 61.6855C105.707 61.7381 111.932 64.1366 115.961 68.814C118.893 72.2193 120.854 76.925 121.825 82.8638C114.511 81.6207 106.601 81.2385 98.145 81.7233C74.3247 83.0954 59.0111 96.9879 60.0396 116.292C60.5615 126.084 65.4397 134.508 73.775 140.011C80.8224 144.663 89.899 146.938 99.3323 146.423C111.79 145.74 121.563 140.987 128.381 132.296C133.559 125.696 136.834 117.143 138.28 106.366C144.217 109.949 148.617 114.664 151.047 120.332C155.179 129.967 155.42 145.8 142.501 158.708C131.182 170.016 117.576 174.908 97.0135 175.059C74.2042 174.89 56.9538 167.575 45.7381 153.317C35.2355 139.966 29.8077 120.682 29.6052 96C29.8077 71.3178 35.2355 52.0336 45.7381 38.6827C56.9538 24.4249 74.2039 17.11 97.0132 16.9405C119.988 17.1113 137.539 24.4614 149.184 38.788C154.894 45.8136 159.199 54.6488 162.037 64.9503L178.184 60.6422C174.744 47.9622 169.331 37.0357 161.965 27.974C147.036 9.60668 125.202 0.195148 97.0695 0H96.9569C68.8816 0.19447 47.2921 9.6418 32.7883 28.0793C19.8819 44.4864 13.2244 67.3157 13.0007 95.9325L13 96L13.0007 96.0675C13.2244 124.684 19.8819 147.514 32.7883 163.921C47.2921 182.358 68.8816 191.806 96.9569 192H97.0695C122.03 191.827 139.624 185.292 154.118 170.811C173.081 151.866 172.51 128.119 166.26 113.541C161.776 103.087 153.227 94.5962 141.537 88.9883ZM98.4405 129.507C88.0005 130.095 77.1544 125.409 76.6196 115.372C76.2232 107.93 81.9158 99.626 99.0812 98.6368C101.047 98.5234 102.976 98.468 104.871 98.468C111.106 98.468 116.939 99.0737 122.242 100.233C120.264 124.935 108.662 128.946 98.4405 129.507Z" />
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
  const [activeTab, setActiveTab] = useState<string>('all');
  const [userRole, setUserRole] = useState<string | null>(null);
  const [results, setResults] = useState<{
    articles: any[];
    captions: any[];
    prompts: any[];
    faqs: any[];
    users?: any[];
    auditLogs?: any[];
  }>({ articles: [], captions: [], prompts: [], faqs: [], users: [], auditLogs: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync url param to local input state
  useEffect(() => {
    setLocalQuery(query);
  }, [query]);

  // Fetch role
  useEffect(() => {
    const fetchRole = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase.from('users').select('role').eq('id', user.id).single();
          if (data) {
            setUserRole(data.role);
          }
        }
      } catch (err) {
        console.warn('Error fetching user role in SearchView:', err);
      }
    };
    fetchRole();
  }, []);

  // Fetch search results from API
  useEffect(() => {
    if (!query.trim()) {
      setResults({ articles: [], captions: [], prompts: [], faqs: [], users: [], auditLogs: [] });
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

  const totalResults = userRole === 'admin'
    ? ((results.users?.length ?? 0) + (results.auditLogs?.length ?? 0) + results.faqs.length)
    : (results.articles.length + results.captions.length + results.prompts.length + results.faqs.length);

  const tabs = userRole === 'admin'
    ? [
        { id: 'all', label: t('search.all'), count: totalResults },
        { id: 'users', label: t('search.users'), count: results.users?.length ?? 0 },
        { id: 'auditLogs', label: t('search.auditLogs'), count: results.auditLogs?.length ?? 0 },
        { id: 'faqs', label: t('search.faqs'), count: results.faqs.length },
      ]
    : [
        { id: 'all', label: t('search.all'), count: totalResults },
        { id: 'articles', label: t('search.articles'), count: results.articles.length },
        { id: 'captions', label: t('search.captions'), count: results.captions.length },
        { id: 'prompts', label: t('search.prompts'), count: results.prompts.length },
        { id: 'faqs', label: t('search.faqs'), count: results.faqs.length },
      ];

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
            placeholder={
              userRole === 'admin'
                ? (language === 'vi' ? 'Tìm kiếm người dùng, nhật ký, câu hỏi...' : 'Search users, logs, questions...')
                : userRole === 'marketer_content'
                ? (language === 'vi' ? 'Tìm kiếm bài viết, caption, ý tưởng, câu hỏi...' : 'Search articles, captions, ideas, questions...')
                : (language === 'vi' ? 'Tìm kiếm bài viết, caption, prompt, câu hỏi...' : 'Search articles, captions, prompts, questions...')
            }
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
        {tabs.map((tab) => (
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
                  {userRole === 'admin' ? (
                    <>
                      {/* Users Preview */}
                      {results.users && results.users.length > 0 && (
                        <div className="flex flex-col gap-4">
                          <div className="flex items-center gap-2 border-b border-gray-100 dark:border-zinc-800 pb-2">
                            <User size={18} className="text-primary" />
                            <h2 className="text-lg font-black text-text">{t('search.users')}</h2>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {results.users.slice(0, 4).map((usr) => (
                              <UserCard key={usr.id} user={usr} query={query} />
                            ))}
                          </div>
                          {results.users.length > 4 && (
                            <button
                              onClick={() => setActiveTab('users')}
                              className="self-start text-xs font-black text-primary hover:underline flex items-center gap-0.5"
                            >
                              {language === 'vi' ? 'Xem thêm người dùng' : 'View more users'} <ChevronRight size={14} />
                            </button>
                          )}
                        </div>
                      )}

                      {/* Audit Logs Preview */}
                      {results.auditLogs && results.auditLogs.length > 0 && (
                        <div className="flex flex-col gap-4">
                          <div className="flex items-center gap-2 border-b border-gray-100 dark:border-zinc-800 pb-2">
                            <RotateCcw size={18} className="text-primary" />
                            <h2 className="text-lg font-black text-text">{t('search.auditLogs')}</h2>
                          </div>
                          <div className="flex flex-col gap-3">
                            {results.auditLogs.slice(0, 3).map((log) => (
                              <AuditLogCard key={log.id} log={log} query={query} />
                            ))}
                          </div>
                          {results.auditLogs.length > 3 && (
                            <button
                              onClick={() => setActiveTab('auditLogs')}
                              className="self-start text-xs font-black text-primary hover:underline flex items-center gap-0.5"
                            >
                              {language === 'vi' ? 'Xem thêm nhật ký' : 'View more logs'} <ChevronRight size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {/* Articles Preview */}
                      {results.articles && results.articles.length > 0 && (
                        <div className="flex flex-col gap-4">
                          <div className="flex items-center gap-2 border-b border-gray-100 dark:border-zinc-800 pb-2">
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
                      {results.captions && results.captions.length > 0 && (
                        <div className="flex flex-col gap-4">
                          <div className="flex items-center gap-2 border-b border-gray-100 dark:border-zinc-800 pb-2">
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
                      {results.prompts && results.prompts.length > 0 && (
                        <div className="flex flex-col gap-4">
                          <div className="flex items-center gap-2 border-b border-gray-100 dark:border-zinc-800 pb-2">
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
                    </>
                  )}

                  {/* FAQs Preview */}
                  {results.faqs && results.faqs.length > 0 && (
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center gap-2 border-b border-gray-100 dark:border-zinc-800 pb-2">
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

              {/* Tab: USERS */}
              {activeTab === 'users' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {results.users?.map((usr) => (
                    <UserCard key={usr.id} user={usr} query={query} />
                  ))}
                </div>
              )}

              {/* Tab: AUDIT LOGS */}
              {activeTab === 'auditLogs' && (
                <div className="flex flex-col gap-4">
                  {results.auditLogs?.map((log) => (
                    <AuditLogCard key={log.id} log={log} query={query} />
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
      href={`/archive/${caption.article_id}?captionId=${caption.id}&platform=${caption.platform === 'thread' ? 'threads' : caption.platform}`}
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

const UserCard = React.memo(function UserCard({ user, query = '' }: { user: any; query?: string }) {
  const { language } = useLanguage();
  return (
    <Link
      href="/admin/users"
      className="bg-white dark:bg-zinc-900 border border-gray-200/60 dark:border-zinc-800/80 p-6 rounded-2xl hover:shadow-md transition-all group flex flex-col justify-between gap-4 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus:outline-none"
    >
      <div>
        <div className="text-[10px] font-black text-primary uppercase tracking-widest mb-1.5 block">
          {user.role?.replace('marketer_', '') || 'User'}
        </div>
        <h3 className="font-extrabold text-base text-text line-clamp-2 group-hover:text-primary transition-colors mb-2">
          {highlightText(user.email, query)}
        </h3>
        <p className="text-xs text-text-muted font-medium">
          {language === 'vi' ? 'Trạng thái: ' : 'Status: '}
          <span className={`capitalize font-bold ${user.status === 'active' ? 'text-emerald-500' : 'text-amber-500'}`}>
            {user.status}
          </span>
        </p>
      </div>
      <div className="flex items-center justify-between mt-1 text-[10px] text-text-muted font-bold">
        <span>{user.created_at ? new Date(user.created_at).toLocaleDateString() : ''}</span>
        <span className="flex items-center gap-1 text-primary group-hover:underline">
          {language === 'vi' ? 'Quản lý' : 'Manage'} <ExternalLink size={10} />
        </span>
      </div>
    </Link>
  );
});

const AuditLogCard = React.memo(function AuditLogCard({ log, query = '' }: { log: any; query?: string }) {
  const { language } = useLanguage();
  return (
    <Link
      href="/admin/audit-logs"
      className="bg-white dark:bg-zinc-900 border border-gray-200/60 dark:border-zinc-800/80 p-5 rounded-2xl hover:shadow-sm transition-all flex flex-col gap-3 group cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus:outline-none"
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full font-black text-[9px] uppercase tracking-wider bg-primary/10 text-primary">
            {log.action}
          </span>
          <span className="text-[10px] text-text-muted font-bold line-clamp-1 max-w-sm">
            {language === 'vi' ? 'Thực hiện bởi: ' : 'Performed by: '}{log.actor?.email || 'System'}
          </span>
        </div>
        <span className="text-[10px] text-text-muted font-medium">
          {log.created_at ? new Date(log.created_at).toLocaleString() : ''}
        </span>
      </div>
    </Link>
  );
});
