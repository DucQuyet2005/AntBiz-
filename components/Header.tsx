"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, Bell, Menu, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { useLanguage } from '@/contexts/LanguageContext';
import UserProfileDropdown from '@/components/UserProfileDropdown';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

const Header = ({ onMenuClick }: { onMenuClick?: () => void }) => {
  const { t, language } = useLanguage();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<{
    articles: any[];
    captions: any[];
    prompts: any[];
    faqs: any[];
  } | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Debounce API calls when query changes
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSuggestions(null);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    setIsOpen(true);

    const delayDebounce = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery.trim())}&lang=${language}`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data);
        }
      } catch (err) {
        console.error('Error fetching search suggestions:', err);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, language]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const triggerSearch = () => {
    if (searchQuery.trim()) {
      setIsOpen(false);
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'Enter') {
      triggerSearch();
    }
  };

  const hasSuggestions =
    suggestions &&
    (suggestions.articles.length > 0 ||
      suggestions.captions.length > 0 ||
      suggestions.prompts.length > 0 ||
      suggestions.faqs.length > 0);

  return (
    <header className="flex items-center justify-between py-6">
      <div ref={containerRef} className="relative w-96 z-40">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted w-5 h-5" />
        <input 
          type="text" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (searchQuery.trim().length >= 2) {
              setIsOpen(true);
            }
          }}
          placeholder={t('header.searchPlaceholder')} 
          className="w-full bg-sidebar/50 rounded-full py-3 pl-12 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-text-muted border border-transparent focus:border-gray-200"
        />
        {isLoading && (
          <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 text-primary w-4 h-4 animate-spin" />
        )}

        {/* Suggestions Dropdown */}
        {isOpen && (
          <div className="absolute top-full left-0 mt-2 w-[480px] bg-white border border-gray-200 rounded-[28px] shadow-2xl p-5 max-h-[460px] overflow-y-auto flex flex-col gap-4 z-50">
            {isLoading && !hasSuggestions ? (
              <div className="flex items-center justify-center py-8 text-xs text-text-muted gap-2">
                <Loader2 className="animate-spin text-primary" size={14} />
                <span>{t('common.loading')}</span>
              </div>
            ) : !hasSuggestions ? (
              <div className="text-center py-8 text-xs text-text-muted font-bold">
                {t('search.noResults')}
              </div>
            ) : (
              <>
                {/* Articles Section */}
                {suggestions.articles.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-black text-text-muted uppercase tracking-wider px-2.5">
                      {t('search.articles')}
                    </span>
                    <div className="flex flex-col">
                      {suggestions.articles.slice(0, 3).map((art) => (
                        <Link
                          key={art.id}
                          href={`/archive/${art.id}`}
                          onClick={() => setIsOpen(false)}
                          className="block hover:bg-gray-50 p-2.5 rounded-2xl transition-colors"
                        >
                          <div className="text-xs font-extrabold text-text line-clamp-1">{art.title}</div>
                          {art.description && (
                            <div className="text-[10px] text-text-muted line-clamp-1 mt-0.5">{art.description}</div>
                          )}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Captions Section */}
                {suggestions.captions.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-black text-text-muted uppercase tracking-wider px-2.5">
                      {t('search.captions')}
                    </span>
                    <div className="flex flex-col">
                      {suggestions.captions.slice(0, 3).map((cap) => (
                        <Link
                          key={cap.id}
                          href={`/archive/${cap.article_id}?captionId=${cap.id}`}
                          onClick={() => setIsOpen(false)}
                          className="block hover:bg-gray-50 p-2.5 rounded-2xl transition-colors"
                        >
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[8px] font-black uppercase">
                              {cap.platform}
                            </span>
                            {cap.articles?.title && (
                              <span className="text-[9px] text-text-muted font-bold line-clamp-1">
                                {cap.articles.title}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-text line-clamp-1 font-medium">
                            {cap.edited_content || cap.ai_content}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Prompts Section */}
                {suggestions.prompts.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-black text-text-muted uppercase tracking-wider px-2.5">
                      {t('search.prompts')}
                    </span>
                    <div className="flex flex-col">
                      {suggestions.prompts.slice(0, 3).map((p) => (
                        <Link
                          key={p.id}
                          href={`/prompts?promptId=${p.id}`}
                          onClick={() => setIsOpen(false)}
                          className="block hover:bg-gray-50 p-2.5 rounded-2xl transition-colors"
                        >
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-100 text-[8px] font-black uppercase">
                              {p.platform}
                            </span>
                            {p.tags?.slice(0, 2).map((tag: string) => (
                              <span
                                key={tag}
                                className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 text-[8px] font-black"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                          <div className="text-xs font-extrabold text-text line-clamp-1">{p.name}</div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* FAQs Section */}
                {suggestions.faqs.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-black text-text-muted uppercase tracking-wider px-2.5">
                      {t('search.faqs')}
                    </span>
                    <div className="flex flex-col">
                      {suggestions.faqs.slice(0, 3).map((faq) => (
                        <Link
                          key={faq.key}
                          href={`/faq?key=${faq.key}`}
                          onClick={() => setIsOpen(false)}
                          className="block hover:bg-gray-50 p-2.5 rounded-2xl transition-colors"
                        >
                          <div className="text-xs font-extrabold text-text line-clamp-1">{faq.question}</div>
                          {faq.answer && (
                            <div className="text-[10px] text-text-muted line-clamp-1 mt-0.5">{faq.answer}</div>
                          )}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Footer Action */}
                <button
                  onClick={triggerSearch}
                  className="w-full text-center text-xs font-black text-primary hover:underline border-t border-gray-100 pt-3 cursor-pointer"
                >
                  {t('search.seeAll')} &quot;{searchQuery}&quot;
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-6">
        <button 
          onClick={() => {
            router.push('/ai-creator');
            window.dispatchEvent(new CustomEvent('ai-creator-go-to-step-1'));
          }}
          className="bg-primary hover:bg-primary-hover text-white px-6 py-2.5 rounded-full flex items-center gap-2 font-medium transition-colors shadow-md shadow-primary/20 cursor-pointer"
        >
          <Plus size={18} />
          {t('header.addPost')}
        </button>
        
        <button className="relative text-primary hover:bg-sidebar p-2 rounded-full transition-colors">
          <Bell size={24} />
          <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-bg"></span>
        </button>

        <UserProfileDropdown />
      </div>
    </header>
  );
};

export default Header;

