"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Sparkles,
  Newspaper,
  Zap,
  RefreshCw,
  CheckCircle2,
  Loader2,
  ChevronRight,
  ArrowUpRight,
  Facebook,
  Instagram,
  Globe,
  Shield
} from 'lucide-react';
import Link from 'next/link';

// Threads Custom SVG Logo
const ThreadsIcon = ({ size = 16, className = "" }: { size?: number; className?: string }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" className={className}>
    <path d="M22.5 12c0-5.799-4.701-10.5-10.5-10.5S1.5 6.201 1.5 12s4.701 10.5 10.5 10.5c2.328 0 4.475-.758 6.216-2.038l-1.39-1.39C15.42 19.98 13.784 20.5 12 20.5c-4.694 0-8.5-3.806-8.5-8.5s3.806-8.5 8.5-8.5 8.5 3.806 8.5 8.5c0 1.956-.503 3.659-1.42 4.8-.813 1.011-1.923 1.5-3.08 1.5-1.144 0-1.848-.553-2.128-1.123-.391-.798-.328-2.109-.328-3.177v-2.5c0-.828-.672-1.5-1.5-1.5s-1.5.672-1.5 1.5v2.5c0 .356-.002.83-.027 1.309a4 4 0 1 1-3.953-3.809c.28 0 .546.035.803.097V8.539c-.26-.025-.525-.039-.79-.039a7 7 0 1 0 5.679 11.096c.71.91 1.776 1.404 3.018 1.404 2.217 0 4.156-1.134 5.347-2.923 1.15-1.729 1.693-3.992 1.693-6.077zM9.5 12a1 1 0 1 0 2 0 1 1 0 0 0-2 0z" />
  </svg>
);

interface OverviewViewProps {
  isAdmin?: boolean;
  onSwitchView?: () => void;
}

export default function OverviewView({ isAdmin = false, onSwitchView }: OverviewViewProps = {}) {
  const { t, language } = useLanguage();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userName, setUserName] = useState('');

  // Onboarding Tour state
  const [showTour, setShowTour] = useState(false);
  const [tourStep, setTourStep] = useState(0);

  useEffect(() => {
    // Only run on client side
    const completed = localStorage.getItem('antbiz_onboarded');
    if (!completed) {
      const timer = setTimeout(() => {
        setShowTour(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const highlightElement = (step: number) => {
    clearHighlights();
    let targetId = '';
    if (step === 1) targetId = 'tour-welcome';
    if (step === 2) targetId = 'tour-stats';
    if (step === 3) targetId = 'tour-chart';
    if (step === 4) targetId = 'tour-recent';

    if (targetId) {
      const element = document.getElementById(targetId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('ring-4', 'ring-primary', 'ring-offset-4', 'scale-[1.01]', 'z-45', 'relative');
      }
    }
  };

  const clearHighlights = () => {
    const ids = ['tour-welcome', 'tour-stats', 'tour-chart', 'tour-recent'];
    ids.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.classList.remove('ring-4', 'ring-primary', 'ring-offset-4', 'scale-[1.01]', 'z-45', 'relative');
      }
    });
  };

  const handleNextStep = () => {
    const nextStep = tourStep + 1;
    setTourStep(nextStep);
    highlightElement(nextStep);
  };

  const handlePrevStep = () => {
    const prevStep = tourStep - 1;
    setTourStep(prevStep);
    highlightElement(prevStep);
  };

  const handleSkipTour = () => {
    localStorage.setItem('antbiz_onboarded', 'true');
    setShowTour(false);
    clearHighlights();
  };

  const handleRestartTour = () => {
    setTourStep(0);
    setShowTour(true);
    clearHighlights();
  };

  // Real-time statistics state
  const [stats, setStats] = useState({
    publishedCount: 0,
    pendingCount: 0,
    failedCount: 0,
    cancelledCount: 0,
    articlesCount: 0,
    captionsCount: 0,
    platformShare: { facebook: 0, instagram: 0, threads: 0, blog: 0 },
    dailyVolume: [] as { dateString: string; dayLabel: string; dateNum: number; count: number }[],
    recentPosts: [] as { id: string; platform: string; status: string; scheduled_at: string; imgUrl: string; title: string }[]
  });

  const [allPosts, setAllPosts] = useState<any[]>([]);
  const [chartTimeframe, setChartTimeframe] = useState<'week' | 'month'>('week');
  const [chartPlatform, setChartPlatform] = useState<'all' | 'facebook' | 'instagram' | 'threads'>('all');

  const dailyVolume = useMemo(() => {
    const daysCount = chartTimeframe === 'week' ? 7 : 30;

    // Generate dates for the selected timeframe
    const datesArray = Array.from({ length: daysCount }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);

      const offset = d.getTimezoneOffset();
      const localDate = new Date(d.getTime() - (offset * 60 * 1000));
      const dateString = localDate.toISOString().split('T')[0];

      return {
        dateString,
        dayLabel: d.toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US', { weekday: 'short' }),
        dateNum: d.getDate(),
        count: 0
      };
    }).reverse();

    // Match counts based on filters
    allPosts.forEach(p => {
      const plat = p.platform?.toLowerCase();
      if (chartPlatform !== 'all' && plat !== chartPlatform) return;

      const postDate = new Date(p.scheduled_at);
      const postOffset = postDate.getTimezoneOffset();
      const localPostDate = new Date(postDate.getTime() - (postOffset * 60 * 1000));
      const postDateStr = localPostDate.toISOString().split('T')[0];

      const matchedDay = datesArray.find(d => d.dateString === postDateStr);
      if (matchedDay) {
        matchedDay.count++;
      }
    });

    return datesArray;
  }, [allPosts, chartTimeframe, chartPlatform, language]);

  const fetchDashboardData = async () => {
    try {
      // 1. Get current user profile
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const meta = user.user_metadata || {};
        setUserName(meta.full_name || user.email?.split('@')[0] || 'AntBiz Creator');
      }

      // 2. Fetch scheduled posts
      const { data: posts } = await supabase
        .from('scheduled_posts')
        .select('id, platform, status, scheduled_at, image_urls, captions(ai_content, edited_content, articles(title, images))');

      if (posts) {
        setAllPosts(posts);
      }

      // 3. Fetch articles count
      const { count: articlesCount } = await supabase
        .from('articles')
        .select('*', { count: 'exact', head: true });

      // 4. Fetch captions count
      const { count: captionsCount } = await supabase
        .from('captions')
        .select('*', { count: 'exact', head: true });

      // Generate dates for the last 7 days (including today)
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);

        const offset = d.getTimezoneOffset();
        const localDate = new Date(d.getTime() - (offset * 60 * 1000));
        const dateString = localDate.toISOString().split('T')[0];

        return {
          dateString,
          dayLabel: d.toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US', { weekday: 'short' }),
          dateNum: d.getDate(),
          count: 0
        };
      }).reverse();

      // Process counts
      let published = 0;
      let pending = 0;
      let failed = 0;
      let cancelled = 0;
      let fb = 0;
      let insta = 0;
      let th = 0;
      let bg = 0;

      if (posts) {
        posts.forEach(p => {
          if (p.status === 'posted') published++;
          else if (p.status === 'pending') pending++;
          else if (p.status === 'failed') failed++;
          else if (p.status === 'cancelled') cancelled++;

          const plat = p.platform?.toLowerCase();
          if (plat === 'facebook') fb++;
          else if (plat === 'instagram') insta++;
          else if (plat === 'threads' || plat === 'thread') th++;
          else if (plat === 'blog') bg++;

          // Match day volume
          const postDate = new Date(p.scheduled_at);
          const postOffset = postDate.getTimezoneOffset();
          const localPostDate = new Date(postDate.getTime() - (postOffset * 60 * 1000));
          const postDateStr = localPostDate.toISOString().split('T')[0];

          const matchedDay = last7Days.find(d => d.dateString === postDateStr);
          if (matchedDay) {
            matchedDay.count++;
          }
        });
      }

      // Get 4 most recent scheduled posts for visual activity log
      const { data: recentPostsData } = await supabase
        .from('scheduled_posts')
        .select('id, platform, status, scheduled_at, image_urls, captions(ai_content, edited_content, articles(title, images))')
        .order('created_at', { ascending: false })
        .limit(4);

      const processedRecentPosts = (recentPostsData || []).map((post: any) => {
        let imgUrl = '';
        if (post.image_urls && post.image_urls.length > 0) {
          imgUrl = post.image_urls[0];
        } else if (post.captions?.articles?.images && post.captions.articles.images.length > 0) {
          const firstImg = post.captions.articles.images[0];
          imgUrl = typeof firstImg === 'string' ? firstImg : (firstImg.url || firstImg.image_url || '');
        }

        // Fallback images if empty
        if (!imgUrl) {
          const platform = post.platform?.toLowerCase();
          if (platform === 'facebook') imgUrl = 'https://images.unsplash.com/photo-1542626991-cbc4e32524cc?q=80&w=400';
          else if (platform === 'instagram') imgUrl = 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=400';
          else imgUrl = 'https://images.unsplash.com/photo-1432888622747-4eb9a8efeb07?q=80&w=400';
        }

        const title = post.captions?.articles?.title || post.captions?.ai_content || 'AntBiz Campaign';

        return {
          id: post.id,
          platform: post.platform,
          status: post.status,
          scheduled_at: post.scheduled_at,
          imgUrl,
          title
        };
      });

      setStats({
        publishedCount: published,
        pendingCount: pending,
        failedCount: failed,
        cancelledCount: cancelled,
        articlesCount: articlesCount || 0,
        captionsCount: captionsCount || 0,
        platformShare: { facebook: fb, instagram: insta, threads: th, blog: bg },
        dailyVolume: last7Days,
        recentPosts: processedRecentPosts
      });

    } catch (err) {
      console.error('Failed to fetch dashboard overview data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  // Compute platform share ratios
  const totalShares = stats.platformShare.facebook + stats.platformShare.instagram + stats.platformShare.threads;
  const getPercent = (value: number) => {
    if (totalShares === 0) return 0;
    return Math.round((value / totalShares) * 100);
  };

  // Compute max count of posts in timeframe for scaling the chart
  const maxPostVolume = Math.max(...dailyVolume.map(d => d.count), 1);

  const sparklinePoints = useMemo(() => {
    const points = dailyVolume.slice(-7).map(d => d.count);
    const maxVal = Math.max(...points);
    const minVal = Math.min(...points);
    const range = maxVal - minVal || 1;
    const width = 80;
    const height = 24;
    const padding = 2;
    return points.map((val, idx) => {
      const x = (idx / (points.length - 1)) * (width - padding * 2) + padding;
      const y = height - ((val - minVal) / range) * (height - padding * 2) - padding;
      return { x, y };
    });
  }, [dailyVolume]);

  if (loading) {
    return (
      <div className="h-[400px] flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-primary" size={36} />
        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
          {t('overview.loadingStats')}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 font-sans select-none pb-12">

      {/* Dynamic Greeting Hero Banner - Theme Colored */}
      <div id="tour-welcome" className="relative overflow-hidden bg-primary border border-primary/20 rounded-2xl p-6 md:p-10 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6 transition-all duration-300">
        {/* Background neon ambient graphic */}
        <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full bg-gradient-to-tr from-white/5 via-white/5 to-transparent blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -bottom-10 w-[200px] h-[200px] rounded-full bg-gradient-to-tr from-white/5 to-transparent blur-2xl pointer-events-none" />

        <div className="flex flex-col gap-2 relative z-10">
          <span className="text-[10px] text-zinc-300 !text-zinc-300 font-mono tracking-widest uppercase font-extrabold flex items-center gap-1.5">
            {t('overview.automatedPipeline')}
          </span>
          <h1 className="text-3xl font-black tracking-tight leading-tight text-white !text-white">
            {t('overview.welcomeUser', { name: userName })}
          </h1>
          <p className="text-zinc-200 !text-zinc-200 text-sm font-medium max-w-xl leading-relaxed">
            {t('overview.greetingDesc')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 relative z-10 w-full md:w-auto">
          {isAdmin && onSwitchView && (
            <button
              onClick={onSwitchView}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-750 text-white px-5 py-3 rounded-2xl text-xs font-black transition-all active:scale-95 cursor-pointer shadow-lg shadow-indigo-600/20"
            >
              <Shield size={13} />
              <span>{language === 'vi' ? 'Chuyển sang giao diện Admin' : 'Switch to Admin View'}</span>
            </button>
          )}

          <div className="flex gap-2 relative z-10 shrink-0">
            <button
              onClick={handleRestartTour}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white !text-white px-4 py-3 rounded-xl text-xs font-black transition-all active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2"
            >
              <Sparkles size={13} />
              <span>{t('overview.tourGuide')}</span>
            </button>

            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 bg-slate-100 hover:bg-indigo-50 border border-slate-200/50 text-slate-700 hover:text-indigo-605 px-5 py-3 rounded-2xl text-xs font-black transition-all active:scale-95 disabled:opacity-50 cursor-pointer relative z-10"
            >
              {refreshing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
              <span>{language === 'vi' ? 'Làm mới số liệu' : 'Refresh Metrics'}</span>
            </button>
          </div>
        </div>

        {/* Stats Cards Row */}
        <div id="tour-stats" className="grid grid-cols-1 md:grid-cols-3 gap-6 transition-all duration-300">

          {/* Stat Card 1: Ingestion & Copywriting (Rose/Violet Theme) */}
          <div className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-sm flex flex-col justify-between h-[240px] relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-[120px] h-[120px] bg-gradient-to-bl from-rose-500/5 to-primary/5 rounded-bl-[100px] pointer-events-none" />

            <div className="flex justify-between items-start">
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 font-mono tracking-wider font-extrabold uppercase">
                  {t('overview.ingestionTitle')}
                </span>
                <h2 className="text-base font-extrabold text-slate-800 mt-0.5">
                  {t('overview.ingestedContent')}
                </h2>
              </div>
            </div>

            <div className="flex items-end justify-between mt-4">
              <div className="flex flex-col">
                <span className="text-4xl font-black text-slate-900 tracking-tight">
                  {stats.articlesCount} <span className="text-sm text-slate-500 font-bold">{t('overview.articlesLabel')}</span>
                </span>
                <span className="text-[10px] text-emerald-600 font-black tracking-wide flex items-center gap-0.5 mt-1">
                  <ArrowUpRight size={10} /> +12% {t('overview.thisWeekTrend')}
                </span>
              </div>

              {sparklinePoints.length > 1 && (
                <div className="flex flex-col items-center gap-0.5 select-none opacity-85 hover:opacity-100 transition-opacity">
                  <svg className="w-16 h-6 overflow-visible" viewBox="0 0 80 24">
                    <defs>
                      <linearGradient id="sparkline-overview" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path
                      d={`M 2,24 L ${sparklinePoints.map(p => `${p.x},${p.y}`).join(' L ')} L 78,24 Z`}
                      fill="url(#sparkline-overview)"
                    />
                    <polyline
                      fill="none"
                      stroke="#8B5CF6"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={sparklinePoints.map(p => `${p.x},${p.y}`).join(' ')}
                    />
                  </svg>
                  <span className="text-[7px] text-slate-400 font-black tracking-wider uppercase">{t('overview.last7Days')}</span>
                </div>
              )}

              <div className="flex flex-col text-right">
                <span className="text-sm font-black text-primary bg-primary/10 px-2.5 py-1 rounded-xl border border-primary/20">
                  {stats.captionsCount} {t('overview.captionLabel')}
                </span>
                <span className="text-[9px] text-slate-500 font-bold mt-1">
                  {stats.pendingCount} {t('overview.pendingQueue')}
                </span>
              </div>
            </div>

            <div className="h-1.5 w-full bg-slate-105 rounded-full mt-4 overflow-hidden relative">
              <div className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-rose-500 to-primary rounded-full" style={{ width: '70%' }} />
            </div>
          </div>

          {/* Stat Card 2: Platform Distribution (Cylindrical Bar Chart Theme) */}
          <div className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-sm flex flex-col justify-between h-[240px] relative overflow-hidden group">

            <div className="flex justify-between items-start">
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 font-mono tracking-wider font-extrabold uppercase">
                  {t('overview.socialCoverage')}
                </span>
                <h2 className="text-base font-extrabold text-slate-800 mt-0.5">
                  {t('overview.platformShare')}
                </h2>
              </div>
            </div>

            <div className="flex items-end justify-between gap-4 h-24 my-1 select-none">
              {/* FB Column */}
              <div className="flex flex-col items-center flex-1 h-full justify-end gap-1">
                <span className="text-[9px] font-black text-blue-600">{getPercent(stats.platformShare.facebook)}%</span>
                <div className="w-3 rounded-full bg-slate-100 h-full relative overflow-hidden">
                  <div
                    className="absolute bottom-0 left-0 right-0 rounded-full bg-gradient-to-t from-blue-600 to-blue-400 transition-all duration-700"
                    style={{ height: `${getPercent(stats.platformShare.facebook)}%`, minHeight: '8px' }}
                  />
                </div>
                <Facebook size={12} className="text-[#1877F2] mt-1" />
              </div>

              {/* Insta Column */}
              <div className="flex flex-col items-center flex-1 h-full justify-end gap-1">
                <span className="text-[9px] font-black text-pink-500">{getPercent(stats.platformShare.instagram)}%</span>
                <div className="w-3 rounded-full bg-slate-100 h-full relative overflow-hidden">
                  <div
                    className="absolute bottom-0 left-0 right-0 rounded-full bg-gradient-to-t from-pink-600 to-rose-400 transition-all duration-700"
                    style={{ height: `${getPercent(stats.platformShare.instagram)}%`, minHeight: '8px' }}
                  />
                </div>
                <Instagram size={12} className="text-pink-500 mt-1" />
              </div>

              {/* Threads Column */}
              <div className="flex flex-col items-center flex-1 h-full justify-end gap-1">
                <span className="text-[9px] font-black text-slate-800 dark:text-slate-200">{getPercent(stats.platformShare.threads)}%</span>
                <div className="w-3 rounded-full bg-slate-100 dark:bg-zinc-800 h-full relative overflow-hidden">
                  <div
                    className="absolute bottom-0 left-0 right-0 rounded-full bg-gradient-to-t from-slate-900 to-slate-600 transition-all duration-700"
                    style={{ height: `${getPercent(stats.platformShare.threads)}%`, minHeight: '8px' }}
                  />
                </div>
                <ThreadsIcon size={12} className="text-black dark:text-white mt-1" />
              </div>
            </div>

            <div className="flex justify-between items-center text-[8.5px] text-slate-500 font-bold border-t border-slate-100/60 pt-2">
              <span>{t('overview.totalScheduled')} <strong className="text-slate-700 dark:text-slate-350">{totalShares}</strong></span>
            </div>
          </div>

          {/* Stat Card 3: Publication Status (Cyan Glow theme) */}
          <div className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-sm flex flex-col justify-between h-[240px] relative overflow-hidden group">

            <div className="flex justify-between items-start">
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 font-mono tracking-wider font-extrabold uppercase">
                  {t('overview.operationalMetrics')}
                </span>
                <h2 className="text-base font-extrabold text-slate-800 mt-0.5">
                  {t('overview.publicationStatus')}
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-1.5">
              <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl p-2.5 flex flex-col">
                <span className="text-[9px] text-emerald-700 dark:text-emerald-450 font-black uppercase">{t('overview.statusPosted')}</span>
                <span className="text-2xl font-black text-emerald-800 dark:text-emerald-300 mt-0.5">{stats.publishedCount}</span>
              </div>
              <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-2xl p-2.5 flex flex-col">
                <span className="text-[9px] text-amber-700 dark:text-amber-450 font-black uppercase">{t('overview.statusPending')}</span>
                <span className="text-2xl font-black text-amber-800 dark:text-amber-300 mt-0.5">{stats.pendingCount}</span>
              </div>
              <div className="bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-2xl p-2.5 flex flex-col">
                <span className="text-[9px] text-rose-700 dark:text-rose-450 font-black uppercase">{t('overview.statusFailed')}</span>
                <span className="text-2xl font-black text-rose-800 dark:text-rose-300 mt-0.5">{stats.failedCount}</span>
              </div>
              <div className="bg-slate-50 dark:bg-zinc-900/40 border border-slate-200/50 dark:border-zinc-800 rounded-2xl p-2.5 flex flex-col">
                <span className="text-[9px] text-slate-550 dark:text-slate-400 font-black uppercase">{t('overview.statusCancelled')}</span>
                <span className="text-2xl font-black text-slate-650 dark:text-slate-300 mt-0.5">{stats.cancelledCount}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Chart: 7-Day Publication Volume Bar Chart */}
        <div id="tour-chart" className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-sm relative overflow-hidden flex flex-col gap-6 transition-all duration-300">
          <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-gradient-to-bl from-primary/5 to-transparent pointer-events-none" />

          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-100 pb-4">
            <div className="flex flex-col">
              <span className="text-[10px] text-primary font-mono tracking-wider font-extrabold uppercase">
                {t('overview.publicationChart')}
              </span>
              <h2 className="text-lg font-extrabold text-slate-800 mt-0.5">
                {chartTimeframe === 'week' ? t('overview.chartTitleWeek') : t('overview.chartTitleMonth')}
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Timeframe selector */}
              <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200/50">
                <button
                  type="button"
                  onClick={() => setChartTimeframe('week')}
                  className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all ${chartTimeframe === 'week'
                      ? 'bg-white text-primary shadow-sm'
                      : 'text-slate-550 hover:text-slate-800'
                    }`}
                >
                  {t('overview.chart7Days')}
                </button>
                <button
                  type="button"
                  onClick={() => setChartTimeframe('month')}
                  className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all ${chartTimeframe === 'month'
                      ? 'bg-white text-primary shadow-sm'
                      : 'text-slate-550 hover:text-slate-800'
                    }`}
                >
                  {t('overview.chart30Days')}
                </button>
              </div>

              {/* Platform selector */}
              <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200/50">
                <button
                  type="button"
                  onClick={() => setChartPlatform('all')}
                  className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all ${chartPlatform === 'all'
                      ? 'bg-white text-primary shadow-sm'
                      : 'text-slate-550 hover:text-slate-800'
                    }`}
                >
                  {t('overview.chartAll')}
                </button>
                <button
                  type="button"
                  onClick={() => setChartPlatform('facebook')}
                  className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1.5 ${chartPlatform === 'facebook'
                      ? 'bg-white text-primary shadow-sm'
                      : 'text-slate-550 hover:text-slate-800'
                    }`}
                >
                  <Facebook size={12} />
                  <span>FB</span>
                </button>
                <button
                  type="button"
                  onClick={() => setChartPlatform('instagram')}
                  className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1.5 ${chartPlatform === 'instagram'
                      ? 'bg-white text-primary shadow-sm'
                      : 'text-slate-550 hover:text-slate-800'
                    }`}
                >
                  <Instagram size={12} />
                  <span>IG</span>
                </button>
                <button
                  type="button"
                  onClick={() => setChartPlatform('threads')}
                  className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1.5 ${chartPlatform === 'threads'
                      ? 'bg-white text-primary shadow-sm'
                      : 'text-slate-550 hover:text-slate-800'
                    }`}
                >
                  <ThreadsIcon size={12} />
                  <span>Threads</span>
                </button>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-primary to-[#22D3EE]" />
                <span>{t('overview.totalVolume')}</span>
              </div>
            </div>
          </div>

          {/* Dynamic Interactive Chart */}
          <div className="h-[220px] w-full flex items-end justify-between px-2 md:px-6 pb-6 relative">

            {/* Horizontal grid guide lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none z-0 px-2 md:px-6 pb-12 pt-6">
              <div className="border-b border-slate-100 w-full h-[1px]" />
              <div className="border-b border-slate-100 w-full h-[1px]" />
              <div className="border-b border-slate-100 w-full h-[1px]" />
              <div className="border-b border-slate-100 w-full h-[1px]" />
            </div>

            {dailyVolume.map((d, i) => {
              const heightPct = (d.count / maxPostVolume) * 80; // Scale height max at 80% of container
              const isWeek = chartTimeframe === 'week';
              const shouldShowLabel = isWeek ? true : (i % 5 === 0 || i === dailyVolume.length - 1);
              const barWidth = isWeek ? 'w-6 md:w-10' : 'w-1.5 md:w-3';

              return (
                <div key={i} className="flex flex-col items-center gap-3 w-full group relative z-10">
                  {/* Tooltip on hover */}
                  <div className="absolute bottom-[calc(100%+8px)] bg-slate-800 text-white text-[9px] font-black px-2.5 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none shadow-md z-30 flex items-center gap-1 whitespace-nowrap">
                    <span>{d.count}</span>
                    <span>{t('overview.postsLabel')}</span>
                    <span className="text-slate-400 font-normal">({d.dateString})</span>
                  </div>

                  {/* Bar graphic container */}
                  <div className={`${barWidth} bg-slate-50 rounded-2xl h-[120px] flex items-end overflow-hidden border border-slate-100`}>
                    <div
                      className="w-full bg-gradient-to-t from-primary to-[#22D3EE] rounded-2xl group-hover:scale-y-[1.03] transition-all duration-500 origin-bottom"
                      style={{ height: `${heightPct}%`, minHeight: d.count > 0 ? '8px' : '0' }}
                    />
                  </div>

                  {/* Day axis label */}
                  <div className="flex flex-col items-center select-none h-6">
                    {shouldShowLabel && (
                      <>
                        <span className="text-[9px] md:text-[10px] text-slate-550 font-extrabold uppercase group-hover:text-primary transition-colors">
                          {d.dayLabel}
                        </span>
                        <span className="text-[8px] md:text-[9px] text-slate-500 font-bold font-mono mt-0.5">
                          {d.dateNum}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}

          </div>
        </div>

        {/* Recent Posts Image Activity Log Grid */}
        <div id="tour-recent" className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-sm flex flex-col gap-5 transition-all duration-300">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100/60">
            <div className="flex flex-col">
              <h2 className="text-lg font-extrabold text-slate-800">
                {t('overview.recentActivityLog')}
              </h2>
              <p className="text-xs text-slate-500 font-medium leading-normal">
                {t('overview.recentActivitySubtitle')}
              </p>
            </div>
            <Link
              href="/content-calendar"
              className="flex items-center gap-1 text-xs font-black text-primary bg-primary/10 hover:bg-primary/20 px-3.5 py-2 rounded-xl transition-all cursor-pointer decoration-none border-0 active:scale-95 animate-fade-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <span>{t('overview.viewCalendar')}</span>
              <ChevronRight size={13} />
            </Link>
          </div>

          {stats.recentPosts.length === 0 ? (
            <div className="bg-[#F8F9FE] dark:bg-black/40 border border-dashed border-[#E4E6F8] dark:border-slate-900 rounded-2xl py-12 px-6 flex flex-col items-center justify-center text-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary animate-pulse">
                <Globe size={20} />
              </div>
              <div className="flex flex-col gap-1">
                <p className="font-bold text-slate-700 dark:text-slate-200 text-sm">
                  {t('overview.noPostsRecorded')}
                </p>
                <p className="text-slate-500 dark:text-slate-400 text-xs max-w-sm leading-relaxed">
                  {t('overview.noPostsRecordedSubtitle')}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
              {stats.recentPosts.map((post) => {
                let platIcon = <Globe size={13} />;
                let platBg = 'bg-slate-100 dark:bg-black text-slate-700 dark:text-slate-350 border dark:border-white/5';

                const platform = post.platform?.toLowerCase();
                if (platform === 'facebook') {
                  platIcon = <Facebook size={11} className="fill-[#1877F2] text-[#1877F2]" />;
                  platBg = 'bg-blue-50 dark:bg-blue-950/40 text-[#1877F2] dark:text-blue-400 border border-blue-100/35 dark:border-blue-900/30';
                } else if (platform === 'instagram') {
                  platIcon = <Instagram size={11} className="text-pink-500" />;
                  platBg = 'bg-pink-50 dark:bg-pink-950/40 text-pink-500 dark:text-pink-400 border border-pink-100/35 dark:border-pink-900/30';
                } else if (platform === 'threads' || platform === 'thread') {
                  platIcon = <ThreadsIcon size={11} className="text-black dark:text-white" />;
                  platBg = 'bg-slate-50 dark:bg-black text-black dark:text-white border border-slate-200/35 dark:border-slate-800';
                }

                const timeStr = new Date(post.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' · ' + new Date(post.scheduled_at).toLocaleDateString([], { day: 'numeric', month: 'numeric' });

                return (
                  <div
                    key={post.id}
                    tabIndex={0}
                    className="bg-white rounded-2xl overflow-hidden aspect-square shadow-sm relative group cursor-pointer border border-slate-150/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  >
                    {/* Image Grid Card */}
                    <div className="w-full h-full bg-slate-50">
                      <img
                        src={post.imgUrl}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-all duration-700"
                      />
                    </div>

                    {/* Dark Hover Overlay */}
                    <div className="absolute inset-0 bg-slate-900/80 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-4 text-white z-20">
                      <div className="flex justify-between items-start">
                        <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 ${platBg}`}>
                          {platIcon}
                          <span className="font-sans">{post.platform}</span>
                        </span>

                        <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${post.status === 'posted' ? 'bg-emerald-500 text-white' :
                            post.status === 'failed' ? 'bg-rose-500 text-white' :
                              post.status === 'cancelled' ? 'bg-slate-500 text-white' : 'bg-amber-500 text-white'
                          }`}>
                          {post.status === 'posted' ? t('overview.statusPosted') :
                            post.status === 'failed' ? t('overview.statusFailed') :
                              post.status === 'cancelled' ? t('overview.statusCancelled') : t('overview.statusPending')}
                        </span>
                      </div>

                      <div className="flex flex-col gap-1 select-none">
                        <span className="text-[10px] font-black line-clamp-2 leading-tight">
                          {post.title}
                        </span>
                        <span className="text-[8px] text-slate-350 font-bold font-mono">
                          {timeStr}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Onboarding Tour Overlay */}
        <AnimatePresence>
          {showTour && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-[1.5px] z-40 pointer-events-auto"
                onClick={handleSkipTour}
              />

              {/* Tour Card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: "spring", bounce: 0.1, duration: 0.4 }}
                className={`fixed z-50 bg-white border border-slate-200/85 shadow-2xl rounded-2xl p-6 flex flex-col gap-4 ${tourStep === 0 || tourStep === 5
                    ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] max-w-[calc(100vw-2rem)]'
                    : 'bottom-6 right-6 w-[360px] max-w-[calc(100vw-2rem)]'
                  }`}
              >
                {/* Header */}
                <div className="flex justify-between items-center select-none">
                  <span className="text-[10px] text-primary font-mono font-extrabold uppercase tracking-widest">
                    {tourStep === 0
                      ? t('overview.welcome')
                      : tourStep === 5
                        ? t('overview.finished')
                        : `${t('overview.step')} ${tourStep} / 4`}
                  </span>
                  <button
                    onClick={handleSkipTour}
                    className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded px-1.5 py-0.5"
                  >
                    {t('overview.skip')}
                  </button>
                </div>

                {/* Step content */}
                <div className="flex flex-col gap-2">
                  <h3 className="text-base font-extrabold text-slate-800 leading-snug">
                    {tourStep === 0 && t('overview.welcomeTourTitle')}
                    {tourStep === 1 && t('overview.tourStep1Title')}
                    {tourStep === 2 && t('overview.tourStep2Title')}
                    {tourStep === 3 && t('overview.tourStep3Title')}
                    {tourStep === 4 && t('overview.tourStep4Title')}
                    {tourStep === 5 && t('overview.tourStep5Title')}
                  </h3>
                  <p className="text-xs text-slate-655 font-medium leading-relaxed">
                    {tourStep === 0 && t('overview.tourStep0Desc')}
                    {tourStep === 1 && t('overview.tourStep1Desc')}
                    {tourStep === 2 && t('overview.tourStep2Desc')}
                    {tourStep === 3 && t('overview.tourStep3Desc')}
                    {tourStep === 4 && t('overview.tourStep4Desc')}
                    {tourStep === 5 && t('overview.tourStep5Desc')}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-between items-center mt-2 pt-4 border-t border-slate-100">
                  {tourStep > 0 ? (
                    <button
                      onClick={handlePrevStep}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl transition-all active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      {t('overview.back')}
                    </button>
                  ) : (
                    <div />
                  )}

                  {tourStep < 5 ? (
                    <button
                      onClick={handleNextStep}
                      className="bg-primary hover:bg-primary-hover text-white text-xs font-black px-5 py-2.5 rounded-xl transition-all active:scale-95 cursor-pointer shadow-md shadow-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    >
                      {tourStep === 0
                        ? t('overview.startTour')
                        : t('overview.next')}
                    </button>
                  ) : (
                    <button
                      onClick={handleSkipTour}
                      className="bg-primary hover:bg-primary-hover text-white text-xs font-black px-5 py-2.5 rounded-xl transition-all active:scale-95 cursor-pointer shadow-md shadow-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    >
                      {t('overview.finishTour')}
                    </button>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

      </div>
      );
}
