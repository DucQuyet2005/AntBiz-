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
  <svg viewBox="0 0 192 192" width={size} height={size} fill="currentColor">
    <path d="M141.537 88.9883C140.71 88.5919 139.87 88.2104 139.019 87.8451C137.537 60.5382 122.616 44.905 97.5619 44.745C97.4484 44.7443 97.3355 44.7443 97.222 44.7443C82.2364 44.7443 69.7731 51.1409 62.102 62.7807L75.881 72.2328C81.6116 63.5383 90.6052 61.6848 97.2286 61.6848C97.3051 61.6848 97.3819 61.6848 97.4576 61.6855C105.707 61.7381 111.932 64.1366 115.961 68.814C118.893 72.2193 120.854 76.925 121.825 82.8638C114.511 81.6207 106.601 81.2385 98.145 81.7233C74.3247 83.0954 59.0111 96.9879 60.0396 116.292C60.5615 126.084 65.4397 134.508 73.775 140.011C80.8224 144.663 89.899 146.938 99.3323 146.423C111.79 145.74 121.563 140.987 128.381 132.296C133.559 125.696 136.834 117.143 138.28 106.366C144.217 109.949 148.617 114.664 151.047 120.332C155.179 129.967 155.42 145.8 142.501 158.708C131.182 170.016 117.576 174.908 97.0135 175.059C74.2042 174.89 56.9538 167.575 45.7381 153.317C35.2355 139.966 29.8077 120.682 29.6052 96C29.8077 71.3178 35.2355 52.0336 45.7381 38.6827C56.9538 24.4249 74.2039 17.11 97.0132 16.9405C119.988 17.1113 137.539 24.4614 149.184 38.788C154.894 45.8136 159.199 54.6488 162.037 64.9503L178.184 60.6422C174.744 47.9622 169.331 37.0357 161.965 27.974C147.036 9.60668 125.202 0.195148 97.0695 0H96.9569C68.8816 0.19447 47.2921 9.6418 32.7883 28.0793C19.8819 44.4864 13.2244 67.3157 13.0007 95.9325L13 96L13.0007 96.0675C13.2244 124.684 19.8819 147.514 32.7883 163.921C47.2921 182.358 68.8816 191.806 96.9569 192H97.0695C122.03 191.827 139.624 185.292 154.118 170.811C173.081 151.866 172.51 128.119 166.26 113.541C161.776 103.087 153.227 94.5962 141.537 88.9883ZM98.4405 129.507C88.0005 130.095 77.1544 125.409 76.6196 115.372C76.2232 107.93 81.9158 99.626 99.0812 98.6368C101.047 98.5234 102.976 98.468 104.871 98.468C111.106 98.468 116.939 99.0737 122.242 100.233C120.264 124.935 108.662 128.946 98.4405 129.507Z" />
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
  const [scope, setScope] = useState<string>("all");
  const [userId, setUserId] = useState<string>("");
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
    async function fetchUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserId(user.id);
          const { data: profile } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .maybeSingle();
          if (profile) {
            setUserRole(profile.role);
            if (profile.role === 'marketer_content') {
              setScope('personal');
            }
          }
        }
      } catch (err) {
        console.error('Error fetching user:', err);
      }
    }
    fetchUser();
  }, []);

  useEffect(() => {
    async function fetchCaptions() {
      if (!userId || !userRole) return;
      setLoading(true);
      try {
        let query = supabase
          .from('captions')
          .select(`
            id,
            platform,
            ai_content,
            edited_content,
            status,
            created_at,
            article_id,
            created_by,
            articles (
              id,
              title,
              description,
              views,
              images
            ),
            scheduled_posts (
              id,
              status,
              scheduled_at,
              post_interactions (
                likes,
                comments,
                shares,
                clicks,
                reach,
                impressions
              )
            ),
            users:created_by (
              id,
              email
            )
          `)
          .neq('status', 'draft');

        const isPersonalScope = userRole === 'marketer_content' || scope === 'personal';
        if (isPersonalScope) {
          query = query.eq('created_by', userId);
        }

        const { data, error } = await query.order('created_at', { ascending: false });
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
  }, [userId, userRole, scope]);

  const fetchPreviewData = async () => {
    if (!userId || !userRole) return;
    setIsFetchingPreview(true);
    try {
      let query = supabase
        .from('captions')
        .select('id, platform, ai_content, status, created_at, articles (title)');

      const isPersonalScope = userRole === 'marketer_content' || scope === 'personal';
      if (isPersonalScope) {
        query = query.eq('created_by', userId);
      }

      const { data, error } = await query
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
  }, [activeTab, userId, userRole, scope]);

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

    // Resolve publish status from database scheduled_posts history
    let resolvedStatus = cap.status;
    const schedPosts = cap.scheduled_posts || [];
    if (schedPosts.length > 0) {
      const sortedSched = [...schedPosts].sort((a, b) => new Date(b.scheduled_at || 0).getTime() - new Date(a.scheduled_at || 0).getTime());
      const latestPost = sortedSched[0];
      if (cap.status === 'posted' || latestPost.status === 'posted') {
        resolvedStatus = 'posted';
      } else if (latestPost.status === 'cancelled') {
        resolvedStatus = 'cancelled';
      } else if (latestPost.status === 'failed') {
        resolvedStatus = 'failed';
      } else if (latestPost.status === 'pending') {
        resolvedStatus = 'scheduled';
      }
    } else {
      if (cap.status === 'approved') {
        resolvedStatus = 'approved';
      }
    }

    const creatorEmail = (cap as any).users?.email || null;

    let totalLikes = 0;
    let totalComments = 0;
    let totalClicks = 0;
    let totalReachFromSocial = 0;

    if (schedPosts.length > 0) {
      schedPosts.forEach((sched: any) => {
        if (sched.post_interactions && sched.post_interactions.length > 0) {
          const stats = sched.post_interactions[0];
          totalLikes += stats.likes || 0;
          totalComments += stats.comments || 0;
          totalClicks += stats.clicks || 0;
          totalReachFromSocial += (stats.reach || 0) > 0 ? stats.reach : (stats.impressions || 0);
        } else if (sched.post_interactions && !Array.isArray(sched.post_interactions)) {
          const stats = sched.post_interactions as any;
          totalLikes += stats.likes || 0;
          totalComments += stats.comments || 0;
          totalClicks += stats.clicks || 0;
          totalReachFromSocial += (stats.reach || 0) > 0 ? stats.reach : (stats.impressions || 0);
        }
      });
    }

    return {
      id: cap.id,
      type: 'BÀI VIẾT',
      platform: cap.platform === 'thread' ? 'threads' : (cap.platform || 'facebook'),
      image: mainImage,
      title: art.title || 'Không có tiêu đề',
      description: cap.edited_content || cap.ai_content || 'Không có mô tả',
      reach: totalReachFromSocial > 0 ? totalReachFromSocial : (art.views || '0'),
      conversions: totalClicks,
      likes: totalLikes,
      comments: totalComments,
      nodeType: 'Caption',
      link: `/archive/${art.id || ''}?captionId=${cap.id}&platform=${cap.platform === 'thread' ? 'threads' : cap.platform}`,
      gradient: '',
      created_at: cap.created_at,
      status: resolvedStatus,
      creatorEmail
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
              {/* Scope Filter */}
              {userRole && userRole !== 'marketer_content' && (
                <div className="relative">
                  <select
                    value={scope}
                    onChange={(e) => setScope(e.target.value)}
                    className="bg-white/80 dark:bg-zinc-900/50 backdrop-blur-md border border-gray-200 dark:border-zinc-800 text-text dark:text-zinc-250 px-4 py-3 rounded-2xl text-sm font-semibold shadow-sm hover:bg-gray-50 dark:hover:bg-zinc-800/40 flex items-center gap-2 transition-colors cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-0 appearance-none pr-10"
                  >
                    <option value="all">Toàn bộ kho</option>
                    <option value="personal">Bài viết của tôi</option>
                  </select>
                  <ChevronDown size={16} className="text-text-muted absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              )}

              {/* Platform Filter */}
              <div className="relative">
                <button
                  onClick={() => setShowPlatformDropdown(!showPlatformDropdown)}
                  className="bg-white/80 dark:bg-zinc-900/50 backdrop-blur-md border border-gray-200 dark:border-zinc-800 text-text dark:text-zinc-250 px-4 py-3 rounded-2xl text-sm font-semibold shadow-sm hover:bg-gray-50 dark:hover:bg-zinc-800/40 flex items-center gap-2 transition-colors cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-0"
                >
                  <span>{platformFilter === 'All Platforms' ? t('archive.allPlatforms') : (platformFilter.charAt(0).toUpperCase() + platformFilter.slice(1))}</span>
                  <ChevronDown size={16} className="text-text-muted" />
                </button>
                {showPlatformDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-xl z-50 py-2">
                    {['All Platforms', 'facebook', 'instagram', 'threads'].map((p) => (
                      <button
                        key={p}
                        onClick={() => {
                          setPlatformFilter(p);
                          setShowPlatformDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-zinc-800/50 capitalize font-medium focus-visible:outline-none focus-visible:bg-gray-50 dark:focus-visible:bg-zinc-800/50 ${platformFilter === p ? 'text-primary font-bold' : 'text-text dark:text-zinc-300'}`}
                      >
                        {p === 'All Platforms' ? t('archive.allPlatforms') : (p.charAt(0).toUpperCase() + p.slice(1))}
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
                    <img referrerPolicy="no-referrer" 
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


                    {/* Publish Status Badge */}
                    <span className={`backdrop-blur-sm text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider select-none ${
                      item.status === 'posted'
                        ? 'bg-emerald-600/80 border border-emerald-500/30'
                        : item.status === 'cancelled'
                          ? 'bg-slate-500/80 border border-slate-400/30'
                          : item.status === 'failed'
                            ? 'bg-rose-600/80 border border-rose-500/30'
                            : item.status === 'scheduled'
                              ? 'bg-indigo-600/80 border border-indigo-500/30'
                              : 'bg-amber-600/80 border border-amber-500/30'
                      }`}>
                      {item.status === 'posted'
                        ? (language === 'vi' ? 'Đã đăng' : 'Published')
                        : item.status === 'cancelled'
                          ? (language === 'vi' ? 'Đã hủy' : 'Cancelled')
                          : item.status === 'failed'
                            ? (language === 'vi' ? 'Thất bại' : 'Failed')
                            : item.status === 'scheduled'
                              ? (language === 'vi' ? 'Đã lên lịch' : 'Scheduled')
                              : (language === 'vi' ? 'Đã duyệt' : 'Approved')
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

                      {item.creatorEmail && userRole && userRole !== 'marketer_content' && (
                        <div className="mt-2 pt-2 border-t border-gray-100 dark:border-zinc-800/60 flex items-center justify-between">
                          <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold truncate">
                            👤 Tác giả: {item.creatorEmail}
                          </span>
                        </div>
                      )}

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
                        <span className="capitalize px-2 py-0.5 rounded-full bg-gray-100 dark:bg-black text-slate-700 dark:text-slate-300 font-black text-[9px] border dark:border-white/5">
                          {row.platform === 'thread' ? 'threads' : row.platform}
                        </span>
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
