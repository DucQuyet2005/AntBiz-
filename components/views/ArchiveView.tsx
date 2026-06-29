"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { createClient } from '@/utils/supabase/client';
import PopupDialog, { PopupType } from '@/components/PopupDialog';

import {
  Facebook,
  Instagram,
  Globe,
  TrendingUp,
  Heart,
  MessageSquare,
  Search,
  ChevronDown,
  ArrowUpDown,
  Download,
  Loader2,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  FolderOpen
} from 'lucide-react';

// Threads Custom SVG Logo
const ThreadsIcon = ({ size = 14 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
    <path d="M22.5 12c0-5.799-4.701-10.5-10.5-10.5S1.5 6.201 1.5 12s4.701 10.5 10.5 10.5c2.328 0 4.475-.758 6.216-2.038l-1.39-1.39C15.42 19.98 13.784 20.5 12 20.5c-4.694 0-8.5-3.806-8.5-8.5s3.806-8.5 8.5-8.5 8.5 3.806 8.5 8.5c0 1.956-.503 3.659-1.42 4.8-.813 1.011-1.923 1.5-3.08 1.5-1.144 0-1.848-.553-2.128-1.123-.391-.798-.328-2.109-.328-3.177v-2.5c0-.828-.672-1.5-1.5-1.5s-1.5.672-1.5 1.5v2.5c0 .356-.002.83-.027 1.309a4 4 0 1 1-3.953-3.809c.28 0 .546.035.803.097V8.539c-.26-.025-.525-.039-.79-.039a7 7 0 1 0 5.679 11.096c.71.91 1.776 1.404 3.018 1.404 2.217 0 4.156-1.134 5.347-2.923 1.15-1.729 1.693-3.992 1.693-6.077zM9.5 12a1 1 0 1 0 2 0 1 1 0 0 0-2 0z" />
  </svg>
);

export default function ArchiveView() {
  const { t, language } = useLanguage();
  const supabase = createClient();
  const [popup, setPopup] = useState<{ isOpen: boolean; message: string; type: PopupType } | null>(null);

  const showPopup = (message: string, type: PopupType = 'info') => {
    setPopup({ isOpen: true, message, type });
  };
  const [platformFilter, setPlatformFilter] = useState('All Platforms');
  const [sortBy, setSortBy] = useState('Publish Date');
  const [activeTab, setActiveTab] = useState<'posts' | 'preview' | 'history'>('posts');
  const [captions, setCaptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isFetchingPreview, setIsFetchingPreview] = useState<boolean>(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState<boolean>(false);
  const [exportJobs, setExportJobs] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const next = new Set(expandedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setExpandedIds(next);
  };

  const [showPlatformDropdown, setShowPlatformDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  // Reset pagination when filter criteria change
  useEffect(() => {
    setCurrentPage(1);
  }, [platformFilter, sortBy, searchQuery]);

  useEffect(() => {
    async function fetchCaptions() {
      try {
        const { data, error } = await supabase
          .from('captions')
          .select(`
            id,
            platform,
            ai_content,
            edited_content,
            status,
            created_at,
            article_id,
            articles (
              id,
              title,
              category,
              description,
              views,
              images
            )
          `)
          .neq('status', 'draft')
          .order('created_at', { ascending: false });
        if (!error && data) {
          setCaptions(data);
        }
      } catch (err) {
        console.error('Error fetching captions:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchCaptions();
  }, []);

  useEffect(() => {
    async function fetchUserRole() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();
          if (profile) {
            setUserRole(profile.role);
          }
        }
      } catch (err) {
        console.error('Error fetching user role:', err);
      }
    }
    fetchUserRole();
  }, []);

  const fetchPreviewData = async () => {
    setIsFetchingPreview(true);
    try {
      const { data, error } = await supabase
        .from('captions')
        .select('id, platform, ai_content, status, created_at, articles (title)')
        .order('created_at', { ascending: false })
        .limit(15);
      if (!error && data) {
        setPreviewData(data);
      }
    } catch (err) {
      console.error('Error fetching preview data:', err);
    } finally {
      setIsFetchingPreview(false);
    }
  };

  const fetchExportJobs = async () => {
    setIsLoadingJobs(true);
    try {
      const res = await fetch('/api/export-jobs');
      if (res.ok) {
        const json = await res.json();
        setExportJobs(json.data || []);
      }
    } catch (err) {
      console.error('Error fetching export jobs:', err);
    } finally {
      setIsLoadingJobs(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'preview') {
      fetchPreviewData();
    } else if (activeTab === 'history') {
      fetchExportJobs();
    }
  }, [activeTab]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      if (platformFilter !== 'All Platforms') {
        params.append('platform', platformFilter);
      }
      if (searchQuery) {
        params.append('search', searchQuery);
      }
      const res = await fetch(`/api/captions/export?${params.toString()}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        // Trích xuất filename từ header content-disposition nếu có
        const contentDisposition = res.headers.get('content-disposition');
        let filename = `antbiz_export_${new Date().toISOString().slice(0, 10)}.csv`;
        if (contentDisposition) {
          const match = contentDisposition.match(/filename="?([^";\n]+)"?/);
          if (match && match[1]) {
            filename = match[1];
          }
        }
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);

        showPopup(language === 'vi' ? 'Đã xuất và tải file CSV thành công!' : 'Successfully exported and downloaded CSV file!', 'success');
        fetchExportJobs();
      } else {
        let errorMsg = 'Unknown error';
        try {
          const err = await res.json();
          errorMsg = err.error || errorMsg;
        } catch (_) {
          try {
            errorMsg = await res.text();
          } catch (_) {}
        }
        showPopup((language === 'vi' ? 'Lỗi: ' : 'Error: ') + errorMsg, 'error');
      }
    } catch (err) {
      console.error('Export error:', err);
      showPopup(language === 'vi' ? 'Có lỗi xảy ra khi xuất dữ liệu.' : 'An error occurred while exporting.', 'error');
    } finally {
      setIsExporting(false);
    }
  };



  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
      case 'processing':
        return <Loader2 size={16} className="animate-spin text-amber-500" />;
      case 'completed':
        return <CheckCircle2 size={16} className="text-emerald-500" />;
      case 'failed':
        return <AlertCircle size={16} className="text-rose-500" />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status: string) => {
    if (language === 'vi') {
      switch (status) {
        case 'pending':
          return 'Chờ xử lý';
        case 'processing':
          return 'Đang xử lý';
        case 'completed':
          return 'Hoàn thành';
        case 'failed':
          return 'Thất bại';
        default:
          return status;
      }
    } else {
      switch (status) {
        case 'pending':
          return 'Pending';
        case 'processing':
          return 'Processing';
        case 'completed':
          return 'Completed';
        case 'failed':
          return 'Failed';
        default:
          return status;
      }
    }
  };

  const archiveItems = captions.map(cap => {
    const art = cap.articles || {};
    const images = Array.isArray(art.images) ? art.images : [];
    const mainImage = images.length > 0 ? images[0].url : 'https://images.unsplash.com/photo-1616047006789-b7af5afb8c20?w=800&q=80';
    return {
      id: cap.id,
      type: art.category ? art.category.toUpperCase() : 'BÀI VIẾT',
      platform: cap.platform || 'facebook',
      image: mainImage,
      title: art.title || 'Không có tiêu đề',
      description: cap.edited_content || cap.ai_content || 'Không có mô tả',
      reach: art.views || '0',
      conversions: '0',
      likes: 0,
      comments: 0,
      nodeType: 'Caption',
      link: `/archive/${art.id || ''}`,
      gradient: '',
      created_at: cap.created_at,
      status: cap.status
    };
  });

  const filteredItems = archiveItems
    .filter(item => {
      const matchesPlatform = platformFilter === 'All Platforms' || item.platform.toLowerCase() === platformFilter.toLowerCase();
      const matchesSearch = searchQuery === '' ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesPlatform && matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'Publish Date') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
    });

  const ITEMS_PER_PAGE = 6;
  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="flex flex-col gap-6">

      {/* Page Title & Subtitle */}
      <div className="mt-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold text-text mb-1 tracking-tight">{t('archive.title')}</h1>
          <p className="text-text-muted">{t('archive.subtitle')}</p>
        </div>

        {/* Export Button (Only if not Viewer) */}
        {userRole !== 'viewer' && (
          <button
            onClick={handleExport}
            disabled={isExporting}
            title={t('archive.exportTooltip')}
            className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-2xl text-sm font-extrabold shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-70 disabled:pointer-events-none group"
          >
            {isExporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} className="group-hover:translate-y-0.5 transition-transform" />}
            <span>{isExporting ? t('common.loading') : t('archive.exportCta')}</span>
          </button>
        )}
      </div>

      {/* Tabs Control */}
      <div className="flex overflow-x-auto no-scrollbar border-b border-gray-200 dark:border-zinc-800 whitespace-nowrap">
        <button
          onClick={() => setActiveTab('posts')}
          className={`px-6 py-3 text-sm font-extrabold transition-all relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-t-xl z-10 ${activeTab === 'posts' ? 'text-primary' : 'text-text-muted hover:text-text dark:hover:text-zinc-100'}`}
        >
          {t('archive.tabPosts')}
          {activeTab === 'posts' && <div className="absolute bottom-0 left-0 w-full h-1 bg-primary rounded-t-full" />}
        </button>
        <button
          onClick={() => setActiveTab('preview')}
          className={`px-6 py-3 text-sm font-extrabold transition-all relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-t-xl z-10 ${activeTab === 'preview' ? 'text-primary' : 'text-text-muted hover:text-text dark:hover:text-zinc-100'}`}
        >
          {t('archive.tabPreview')}
          {activeTab === 'preview' && <div className="absolute bottom-0 left-0 w-full h-1 bg-primary rounded-t-full" />}
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-6 py-3 text-sm font-extrabold transition-all relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-t-xl z-10 ${activeTab === 'history' ? 'text-primary' : 'text-text-muted hover:text-text dark:hover:text-zinc-100'}`}
        >
          {t('archive.tabHistory')}
          {activeTab === 'history' && <div className="absolute bottom-0 left-0 w-full h-1 bg-primary rounded-t-full" />}
        </button>
      </div>

      {activeTab === 'posts' ? (
        <>
          {/* Search & Filters Controls Row */}
          <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">

            {/* Search */}
            <div className="relative w-full md:flex-1 md:max-w-xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted w-5 h-5" />
              <input
                type="text"
                placeholder={t('archive.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-sidebar/50 dark:bg-zinc-950/20 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-text-muted dark:text-zinc-200 dark:placeholder:text-zinc-550 border border-gray-200/50 dark:border-zinc-800 shadow-sm"
              />
            </div>

            {/* Dropdowns */}
            <div className="flex items-center gap-3 w-full md:w-auto justify-end">

              {/* Platform Filter */}
              <div className="relative">
                <button
                  onClick={() => setShowPlatformDropdown(!showPlatformDropdown)}
                  className="bg-white/80 dark:bg-zinc-900/50 backdrop-blur-md border border-gray-200 dark:border-zinc-800 text-text dark:text-zinc-250 px-4 py-3 rounded-2xl text-sm font-semibold shadow-sm hover:bg-gray-50 dark:hover:bg-zinc-800/40 flex items-center gap-2 transition-colors cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-0"
                >
                  <span>{platformFilter === 'All Platforms' ? t('archive.allPlatforms') : platformFilter}</span>
                  <ChevronDown size={16} className="text-text-muted" />
                </button>
                {showPlatformDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-xl z-50 py-2">
                    {['All Platforms', 'facebook', 'instagram', 'blog', 'threads'].map((p) => (
                      <button
                        key={p}
                        onClick={() => {
                          setPlatformFilter(p);
                          setShowPlatformDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-zinc-800/50 capitalize font-medium focus-visible:outline-none focus-visible:bg-gray-50 dark:focus-visible:bg-zinc-800/50 ${platformFilter === p ? 'text-primary font-bold' : 'text-text dark:text-zinc-300'}`}
                      >
                        {p === 'All Platforms' ? t('archive.allPlatforms') : p}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Sort By */}
              <div className="relative">
                <button
                  onClick={() => setShowSortDropdown(!showSortDropdown)}
                  className="bg-white/80 dark:bg-zinc-900/50 backdrop-blur-md border border-gray-200 dark:border-zinc-800 text-text dark:text-zinc-250 px-4 py-3 rounded-2xl text-sm font-semibold shadow-sm hover:bg-gray-50 dark:hover:bg-zinc-800/40 flex items-center gap-2 transition-colors cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-0"
                >
                  <ArrowUpDown size={14} className="text-text-muted" />
                  <span>{sortBy === 'Publish Date' ? t('archive.publishDate') : sortBy}</span>
                  <ChevronDown size={16} className="text-text-muted" />
                </button>
                {showSortDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-xl z-50 py-2">
                    {['Publish Date', 'Oldest First'].map((s) => (
                      <button
                        key={s}
                        onClick={() => {
                          setSortBy(s);
                          setShowSortDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-zinc-800/50 font-medium focus-visible:outline-none focus-visible:bg-gray-55 dark:focus-visible:bg-zinc-800/50 ${sortBy === s ? 'text-primary font-bold' : 'text-text dark:text-zinc-300'}`}
                      >
                        {s === 'Publish Date' ? t('archive.publishDate') : (language === 'vi' ? 'Cũ nhất trước' : 'Oldest First')}
                      </button>
                    ))}
                  </div>
                )}
              </div>

            </div>

          </div>
          {/* 3-Column Grid Cards */}
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center bg-white/50 dark:bg-zinc-900/30 backdrop-blur-md border border-dashed border-gray-200 dark:border-zinc-800 rounded-3xl p-12 mt-2 select-none min-h-[350px]">
              <div className="w-16 h-16 rounded-2xl bg-gray-50 dark:bg-zinc-800/80 flex items-center justify-center mb-4 text-text-muted dark:text-zinc-400">
                <FolderOpen size={28} className="text-gray-400 dark:text-zinc-500" />
              </div>
              <h3 className="text-base font-bold text-text dark:text-zinc-200 mb-1">
                {language === 'vi' ? 'Không tìm thấy bài viết' : 'No posts found'}
              </h3>
              <p className="text-xs text-text-muted dark:text-zinc-400 max-w-md leading-relaxed font-semibold">
                {language === 'vi'
                  ? `Hiện không có bài viết nào thuộc nền tảng ${platformFilter === 'All Platforms' ? 'đang chọn' : platformFilter.toUpperCase()}. Vui lòng chọn nền tảng khác.`
                  : `There are no posts belonging to ${platformFilter === 'All Platforms' ? 'this selection' : platformFilter.toUpperCase()} at the moment. Please try a different platform.`
                }
              </p>
            </div>
          ) : (
            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-2 ${totalPages > 1 ? 'min-h-[3000px] md:min-h-[1488px] lg:min-h-[984px]' : ''}`}>
              {paginatedItems.map((item) => (
                <Link
                  href={item.link}
                  key={item.id}
                  className="bg-white/80 dark:bg-zinc-900/50 backdrop-blur-md border border-gray-200/60 dark:border-zinc-800/80 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:translate-y-[-2px] transition-all cursor-pointer flex flex-col justify-between h-[480px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >

                  {/* Top Visual Banner */}
                  <div className="h-40 w-full relative shrink-0 bg-gray-100 dark:bg-zinc-950">

                    {/* Image if available */}
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      /* Gradient background for text/thread card */
                      <div className={`w-full h-full bg-gradient-to-tr ${item.gradient}`}></div>
                    )}

                    {/* Overlay Badges */}

                    <div className="absolute top-4 left-4 flex items-center gap-1.5 z-10">
                      {/* Type Badge */}
                      <span className="bg-black/60 backdrop-blur-sm text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider select-none">
                        {item.type}
                      </span>

                      {/* Publish Status Badge */}
                      <span className={`backdrop-blur-sm text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider select-none ${item.status === 'posted'
                        ? 'bg-emerald-600/80 border border-emerald-500/30'
                        : 'bg-amber-600/80 border border-amber-500/30'
                        }`}>
                        {item.status === 'posted'
                          ? (language === 'vi' ? 'Đã đăng' : 'Published')
                          : (language === 'vi' ? 'Chưa đăng' : 'Draft')
                        }
                      </span>
                    </div>

                    {/* Platform Icon Badge (Right) */}
                    <div className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/20 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white shadow-sm select-none z-10">
                      {item.platform === 'facebook' && <Facebook size={14} className="fill-white" />}
                      {item.platform === 'instagram' && <Instagram size={14} />}
                      {item.platform === 'blog' && <Globe size={14} />}
                      {item.platform === 'threads' && <ThreadsIcon size={14} />}
                    </div>

                  </div>

                  {/* Card Content Area */}
                  <div className="pt-5 pb-6 px-6 flex-1 flex flex-col justify-between gap-4">

                    {/* Title & Desc */}
                    <div>
                      {item.nodeType && (
                        <span className="text-[10px] font-bold text-primary uppercase tracking-widest block mb-1">
                          {item.nodeType}
                        </span>
                      )}
                      <h3 className="text-lg font-extrabold text-text dark:text-zinc-100 tracking-tight mb-1 hover:text-primary transition-colors line-clamp-2 min-h-[3rem]">
                        {item.title}
                      </h3>
                      <p className="text-xs text-text-muted dark:text-zinc-400 leading-relaxed font-semibold line-clamp-2 min-h-[2.5rem]">
                        {item.description}
                      </p>
                    </div>

                    {/* Metrics & Reactions */}
                    <div>
                      {/* Horizontal divider */}
                      <div className="border-t border-gray-100/80 dark:border-zinc-800/60 my-2.5"></div>

                      {/* Reach & Conversions */}
                      <div className="flex gap-10">
                        <div>
                          <span className="text-[10px] font-bold text-text-muted dark:text-zinc-500 uppercase tracking-wider block mb-0.5">{t('archive.totalReach')}</span>
                          <span className="text-sm font-extrabold text-text dark:text-zinc-200 flex items-center gap-1">
                            <TrendingUp size={14} className="text-emerald-500" />
                            {typeof item.reach === 'string' ? item.reach.replace(/\s*lượt\s*xem/gi, '') : item.reach}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-text-muted dark:text-zinc-500 uppercase tracking-wider block mb-0.5">{t('archive.conversions')}</span>
                          <span className="text-sm font-extrabold text-text dark:text-zinc-200">
                            {item.conversions}
                          </span>
                        </div>
                      </div>

                      {/* Bottom Reactions & Publish Date */}
                      <div className="flex items-center justify-between text-xs font-semibold text-text-muted dark:text-zinc-500 mt-3.5">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1.5 hover:text-red-500 transition-colors">
                            <Heart size={14} className="text-rose-400 fill-rose-50 dark:fill-rose-950/20" />
                            <span>{item.likes >= 1000 ? `${(item.likes / 1000).toFixed(1)}k` : item.likes}</span>
                          </div>
                          <div className="flex items-center gap-1.5 hover:text-primary transition-colors">
                            <MessageSquare size={14} />
                            <span>{item.comments}</span>
                          </div>
                        </div>
                        {item.created_at && (
                          <span className="text-[10px] text-text-muted dark:text-zinc-500 font-medium select-none">
                            {new Date(item.created_at).toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US')}
                          </span>
                        )}
                      </div>

                    </div>

                  </div>

                </Link>
              ))}
            </div>
          )}

          {/* Premium Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-100 pt-6 mt-6 select-none">
              <div className="text-xs text-text-muted font-bold">
                {language === 'vi'
                  ? `Hiển thị ${Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, filteredItems.length)} - ${Math.min(currentPage * ITEMS_PER_PAGE, filteredItems.length)} trong tổng số ${filteredItems.length} bài đăng`
                  : `Showing ${Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, filteredItems.length)} - ${Math.min(currentPage * ITEMS_PER_PAGE, filteredItems.length)} of ${filteredItems.length} posts`
                }
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-2.5 border border-gray-200/80 rounded-2xl hover:bg-gray-50 transition-all disabled:opacity-30 disabled:pointer-events-none text-text-muted active:scale-95 cursor-pointer"
                >
                  <ChevronLeft size={16} />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-10 h-10 rounded-2xl text-xs font-black transition-all active:scale-95 cursor-pointer ${currentPage === page
                      ? 'bg-primary text-white shadow-lg shadow-primary/20'
                      : 'border border-gray-200/80 text-text hover:bg-gray-50'
                      }`}
                  >
                    {page}
                  </button>
                ))}

                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-2.5 border border-gray-200/80 rounded-2xl hover:bg-gray-50 transition-all disabled:opacity-30 disabled:pointer-events-none text-text-muted active:scale-95 cursor-pointer"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      ) : activeTab === 'preview' ? (
        /* Data Preview Tab */
        <div className="flex flex-col gap-4">
          <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
              <FileText size={18} />
            </div>
            <p className="text-xs text-emerald-800 font-bold">
              {language === 'vi'
                ? 'Đây là 15 bản ghi mới nhất sẽ có trong tệp CSV của bạn.'
                : 'These are the 15 latest records that will be in your CSV file.'}
            </p>
          </div>

          <div className="bg-white/85 dark:bg-zinc-900/50 backdrop-blur-md border border-gray-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
            <table className="w-full text-left text-[11px] border-collapse min-w-[800px]">
              <thead className="bg-gray-55/50 dark:bg-zinc-950/40 border-b border-gray-200 dark:border-zinc-800">
                <tr>
                  <th className="px-4 py-3 font-black text-text-muted dark:text-zinc-400 uppercase tracking-wider">{language === 'vi' ? 'Tiêu đề bài viết' : 'Article Title'}</th>
                  <th className="px-4 py-3 font-black text-text-muted dark:text-zinc-400 uppercase tracking-wider">{language === 'vi' ? 'Nền tảng' : 'Platform'}</th>
                  <th className="px-4 py-3 font-black text-text-muted dark:text-zinc-400 uppercase tracking-wider">{language === 'vi' ? 'Nội dung AI' : 'AI Content'}</th>
                  <th className="px-4 py-3 font-black text-text-muted dark:text-zinc-400 uppercase tracking-wider">{language === 'vi' ? 'Trạng thái' : 'Status'}</th>
                  <th className="px-4 py-3 font-black text-text-muted dark:text-zinc-400 uppercase tracking-wider">{language === 'vi' ? 'Ngày tạo' : 'Created At'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-800/80">
                {isFetchingPreview ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center">
                      <Loader2 className="animate-spin inline-block mr-2" size={16} />
                      <span className="font-bold dark:text-zinc-300">{t('common.loading')}</span>
                    </td>
                  </tr>
                ) : previewData.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-text-muted dark:text-zinc-505 italic">No data found.</td>
                  </tr>
                ) : (
                  previewData.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50/50 dark:hover:bg-white/5">
                      <td className="px-4 py-3 font-bold text-text dark:text-zinc-200 truncate max-w-[200px]">{row.articles?.title}</td>
                      <td className="px-4 py-3">
                        <span className="capitalize px-2 py-0.5 rounded-full bg-gray-100 dark:bg-black text-slate-700 dark:text-slate-300 font-black text-[9px] border dark:border-white/5">{row.platform}</span>
                      </td>
                      <td className="px-4 py-3 text-text-muted dark:text-zinc-400 truncate max-w-[250px]">{row.ai_content}</td>
                      <td className="px-4 py-3 font-black text-[10px] text-text dark:text-zinc-200">{row.status}</td>
                      <td className="px-4 py-3 text-slate-500 dark:text-zinc-400">{new Date(row.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Export History Tab */
        <div className="flex flex-col gap-4">
          <div className="bg-white/85 dark:bg-zinc-900/50 backdrop-blur-md border border-gray-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse min-w-[600px]">
              <thead className="bg-gray-55/50 dark:bg-zinc-950/40 border-b border-gray-200 dark:border-zinc-800">
                <tr>
                  <th className="px-6 py-4 font-extrabold text-text-muted dark:text-zinc-400 uppercase text-[10px] tracking-wider">{t('archive.jobId')}</th>
                  <th className="px-6 py-4 font-extrabold text-text-muted dark:text-zinc-400 uppercase text-[10px] tracking-wider">{t('archive.jobStatus')}</th>
                  <th className="px-6 py-4 font-extrabold text-text-muted dark:text-zinc-400 uppercase text-[10px] tracking-wider">{t('archive.jobCreated')}</th>
                  <th className="px-6 py-4 font-extrabold text-text-muted dark:text-zinc-400 uppercase text-[10px] tracking-wider text-right">{t('archive.jobDownload')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-800/80">
                {isLoadingJobs ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center">
                      <div className="flex flex-col items-center gap-2 text-text-muted dark:text-zinc-400">
                        <Loader2 className="animate-spin" size={24} />
                        <span className="font-bold">{t('common.loading')}</span>
                      </div>
                    </td>
                  </tr>
                ) : exportJobs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-text-muted dark:text-zinc-505 italic font-medium">
                      {language === 'vi' ? 'Chưa có yêu cầu xuất dữ liệu nào.' : 'No export requests yet.'}
                    </td>
                  </tr>
                ) : (
                  exportJobs.map((job) => (
                    <tr key={job.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 font-mono text-[11px] text-text-muted dark:text-zinc-550">{job.id}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 font-extrabold text-xs dark:text-zinc-200">
                          {getStatusIcon(job.status)}
                          <span>{getStatusLabel(job.status)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-text-muted dark:text-zinc-400">
                        {new Date(job.created_at).toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US')}
                      </td>
                      <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                        {job.status === 'completed' && job.download_url ? (
                          <a
                            href={job.download_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1.5 rounded-xl text-xs font-black transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                          >
                            <Download size={14} />
                            {t('archive.jobDownload')}
                          </a>
                        ) : (
                          <span className="text-slate-405">
                            <Download size={14} className="inline text-slate-400" />
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-3 p-5 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-2xl">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
              <Clock size={20} />
            </div>
            <p className="text-xs text-blue-800 dark:text-blue-200 leading-relaxed font-medium">
              {language === 'vi'
                ? 'Các yêu cầu xuất dữ liệu CSV được tải trực tiếp về thiết bị của bạn và lưu trữ lịch sử tải xuống trong tab Lịch sử này.'
                : 'CSV export requests are downloaded directly to your device and your download history is saved in this History tab.'}
            </p>
          </div>
        </div>
      )}

      <PopupDialog
        isOpen={!!popup?.isOpen}
        message={popup?.message || ''}
        type={popup?.type || 'info'}
        onClose={() => setPopup(null)}
      />

    </div>
  );
}
