"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
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

const getPlatformIcon = (platform: string, size = 12) => {
  const plat = platform?.toLowerCase();
  if (plat === 'facebook') {
    return <Facebook size={size} className="fill-current text-current" />;
  }
  if (plat === 'instagram') {
    return <Instagram size={size} className="text-current" />;
  }
  if (plat === 'threads' || plat === 'thread') {
    return <ThreadsIcon size={size} className="text-current" />;
  }
  return <Globe size={size} className="text-current" />;
};

const formatDayName = (label: string) => {
  const upper = label.toUpperCase();
  if (upper.includes('TH 2') || upper.includes('MON') || upper.includes('T2')) return 'THỨ 2';
  if (upper.includes('TH 3') || upper.includes('TUE') || upper.includes('T3')) return 'THỨ 3';
  if (upper.includes('TH 4') || upper.includes('WED') || upper.includes('T4')) return 'THỨ 4';
  if (upper.includes('TH 5') || upper.includes('THU') || upper.includes('T5')) return 'THỨ 5';
  if (upper.includes('TH 6') || upper.includes('FRI') || upper.includes('T6')) return 'THỨ 6';
  if (upper.includes('TH 7') || upper.includes('SAT') || upper.includes('T7')) return 'THỨ 7';
  if (upper.includes('CN') || upper.includes('SUN')) return 'CN';
  return upper;
};

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
  const [tourRect, setTourRect] = useState<DOMRect | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  // Track target element rect for the SVG cutout mask
  useEffect(() => {
    if (!showTour || tourStep === 0 || tourStep === 5) {
      setTourRect(null);
      return;
    }

    const updateRect = () => {
      let targetId = '';
      if (tourStep === 1) targetId = 'tour-welcome';
      if (tourStep === 2) targetId = 'tour-stats';
      if (tourStep === 3) targetId = 'tour-chart';
      if (tourStep === 4) targetId = 'tour-recent';

      if (targetId) {
        const el = document.getElementById(targetId);
        if (el) {
          setTourRect(el.getBoundingClientRect());
        }
      }
    };

    // Update immediately and also after a short delay to allow scrollIntoView to settle
    updateRect();
    const timer = setTimeout(updateRect, 300);

    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true); // true for capture phase

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [showTour, tourStep]);

  const highlightElement = (step: number) => {
    let targetId = '';
    if (step === 1) targetId = 'tour-welcome';
    if (step === 2) targetId = 'tour-stats';
    if (step === 3) targetId = 'tour-chart';
    if (step === 4) targetId = 'tour-recent';

    if (targetId) {
      const element = document.getElementById(targetId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  const clearHighlights = () => {
    // No-op since we removed the aggressive highlighting classes that break layouts
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

  // Compute max count of posts in timeframe for scaling the chart (unused in new UI, but keeping variables to avoid compilation errors elsewhere if referenced)
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

  // Next post scheduling calculation
  const nextPost = useMemo(() => {
    const pendingPosts = allPosts
      .filter(p => p.status === 'pending')
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
    return pendingPosts[0] || null;
  }, [allPosts]);

  const nextPostTimeStr = useMemo(() => {
    if (!nextPost) return '—';
    const date = new Date(nextPost.scheduled_at);
    const dayNamesVi = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const dayNamesEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayName = language === 'vi' ? dayNamesVi[date.getDay()] : dayNamesEn[date.getDay()];
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${dayName} ${hours}:${minutes}`;
  }, [nextPost, language]);

  const nextPostSubtext = useMemo(() => {
    if (!nextPost) return language === 'vi' ? 'Không có bài chờ' : 'No posts waiting';
    const plat = nextPost.platform === 'thread' || nextPost.platform === 'threads' ? 'Threads' : nextPost.platform;
    const platFormatted = plat ? plat.charAt(0).toUpperCase() + plat.slice(1).toLowerCase() : '';
    return language === 'vi' ? `${platFormatted} - 1 bài chờ` : `${platFormatted} - 1 post waiting`;
  }, [nextPost, language]);

  const { todayValue, todaySubtext } = useMemo(() => {
    const d = new Date();
    const dayNamesVi = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const dayNamesEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = language === 'vi' ? dayNamesVi[d.getDay()] : dayNamesEn[d.getDay()];
    const dateNum = String(d.getDate()).padStart(2, '0');
    const monthNum = String(d.getMonth() + 1).padStart(2, '0');
    const yearNum = d.getFullYear();

    return {
      todayValue: language === 'vi' ? `${dayName}, ${dateNum}/${monthNum}` : `${dayName}, ${monthNum}/${dateNum}`,
      todaySubtext: language === 'vi' ? `Ngày ${dateNum} tháng ${monthNum}, ${yearNum}` : `${dayName}, ${monthNum}/${dateNum}/${yearNum}`
    };
  }, [language]);

  // Success rate calculations
  const { successRateStr, successCountStr } = useMemo(() => {
    const published = stats.publishedCount || 8;
    const failed = stats.failedCount || 0;
    const total = published + failed;
    if (total === 0) {
      return { successRateStr: '100%', successCountStr: language === 'vi' ? '8/8 bài thành công' : '8/8 posts success' };
    }
    const rate = Math.round((published / total) * 105);
    return {
      successRateStr: `${rate > 100 ? 100 : rate}%`,
      successCountStr: language === 'vi' ? `${published}/${total} bài thành công` : `${published}/${total} posts success`
    };
  }, [stats.publishedCount, stats.failedCount, language]);

  const fbShareStr = useMemo(() => {
    const totalShares = stats.platformShare.facebook + stats.platformShare.instagram + stats.platformShare.threads;
    if (totalShares === 0) return '100%';
    const pct = Math.round((stats.platformShare.facebook / totalShares) * 100);
    return `${pct}%`;
  }, [stats.platformShare]);

  // Featured Posts ("BÀI ĐĂNG NỔI BẬT") items
  const featuredPosts = useMemo(() => {
    return stats.recentPosts.slice(0, 3).map((post, i) => {
      const time = new Date(post.scheduled_at);
      let timeLabel = '';

      if (i === 0) {
        timeLabel = language === 'vi'
          ? `Hôm nay ${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`
          : `Today ${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`;
      } else if (i === 1) {
        timeLabel = `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`;
      } else {
        const dayNamesVi = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
        const dayNamesEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const dayName = language === 'vi' ? dayNamesVi[time.getDay()] : dayNamesEn[time.getDay()];
        timeLabel = `${dayName} ${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`;
      }

      const colors = [
        {
          bgColor: 'bg-[#C4F0E1]/45 border-emerald-100 dark:bg-emerald-950/10 dark:border-emerald-900/20 text-emerald-800 dark:text-emerald-355',
          badgeColor: 'bg-emerald-600 text-white'
        },
        {
          bgColor: 'bg-[#EED7C8]/45 border-orange-100 dark:bg-orange-950/10 dark:border-orange-900/20 text-orange-900 dark:text-orange-350',
          badgeColor: 'bg-emerald-600 text-white'
        },
        {
          bgColor: 'bg-purple-50/70 border-purple-100 dark:bg-purple-950/10 dark:border-purple-900/20 text-purple-800 dark:text-purple-300',
          badgeColor: post.status === 'posted' ? 'bg-emerald-600 text-white' : 'bg-primary text-white'
        }
      ];

      const colorSet = colors[i % colors.length];

      return {
        id: post.id,
        title: post.title,
        platform: post.platform,
        status: post.status,
        timeLabel: timeLabel,
        bgColor: colorSet.bgColor,
        badgeColor: colorSet.badgeColor,
        imgUrl: post.imgUrl
      };
    });
  }, [stats.recentPosts, language]);

  // Upcoming Schedule ("LỊCH ĐĂNG SẮP TỚI") items
  const upcomingScheduleItems = useMemo(() => {
    const pendingPosts = allPosts
      .filter(p => p.status === 'pending')
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());

    const colors = [
      'bg-[#C4F0E1]/40 border-emerald-100 text-emerald-805 dark:bg-emerald-950/10 dark:border-emerald-900/20',
      'bg-[#EED7C8]/40 border-orange-100 text-orange-900 dark:bg-orange-950/10 dark:border-orange-900/20',
      'bg-purple-50 border-purple-100 text-purple-800 dark:bg-purple-950/10 dark:border-purple-900/20',
      'bg-blue-50 border-blue-100 text-blue-800 dark:bg-blue-950/10 dark:border-blue-900/20',
      'bg-rose-50 border-rose-100 text-rose-800 dark:bg-rose-950/10 dark:border-rose-900/20'
    ];

    return pendingPosts.slice(0, 8).map((post, i) => {
      const date = new Date(post.scheduled_at);
      const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
      const dayName = language === 'vi' ? dayNames[date.getDay()] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const timeBlock = `${dayName} ${hours}:${minutes}`;

      const dots = [];
      if (post.platform === 'facebook') dots.push('#1877F2');
      else if (post.platform === 'instagram') dots.push('#E1306C');
      else if (post.platform === 'thread' || post.platform === 'threads') dots.push('#22D3EE');

      const title = post.captions?.articles?.title || post.captions?.ai_content || 'AntBiz Campaign';

      return {
        id: post.id,
        timeBlock,
        title,
        dots,
        colorClass: colors[i % colors.length]
      };
    });
  }, [allPosts, language]);

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

      {/* Split-Layout Greeting Hero Banner - Theme-Aware with Gradient Fade and Team Background */}
      <motion.div
        id="tour-welcome"
        className="relative overflow-hidden border border-primary/20 rounded-2xl p-6 md:p-10 shadow-sm flex flex-col lg:flex-row justify-between items-stretch gap-6 transition-all duration-300"
        style={{
          backgroundColor: 'var(--color-primary)'
        }}
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        {/* Right-aligned team photo - displayed in correct aspect ratio, blended with the theme background */}
        <div className="absolute right-0 top-0 bottom-0 w-full lg:w-1/2 z-0 pointer-events-none overflow-hidden select-none">
          <img
            src="/images/welcome-team.jpg"
            alt="AntBiz Team"
            className="w-full h-full object-cover object-center opacity-65 lg:opacity-100"
          />
          {/* Subtle fade to blend with primary color on the left */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/30 to-transparent pointer-events-none" />
        </div>

        {/* Saturated theme color on the left, fading completely to transparent on the right to show the team photo clearly */}
        <div
          className="absolute inset-0 bg-gradient-to-r from-primary via-primary via-[30%] to-transparent to-[75%] pointer-events-none z-0"
        />
        <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full bg-gradient-to-tr from-white/10 via-white/5 to-transparent blur-3xl pointer-events-none z-0" />

        {/* Left Column: Greeting details */}
        <div className="flex flex-col justify-between items-start flex-[2] gap-6 relative z-10">
          <div className="flex flex-col gap-2">
            <span className="text-[10px] text-zinc-200 !text-zinc-200 font-mono tracking-widest uppercase font-extrabold flex items-center gap-1.5">
              {t('overview.automatedPipeline')}
            </span>
            <h2 className="text-3xl font-black tracking-tight leading-tight text-white !text-white">
              {t('overview.welcomeUser', { name: userName })}
            </h2>
            <p className="text-zinc-100 !text-zinc-100 text-sm font-medium max-w-xl leading-relaxed">
              {t('overview.greetingDesc')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {isAdmin && onSwitchView && (
              <button
                onClick={onSwitchView}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white px-4 py-3 rounded-xl text-xs font-black transition-all active:scale-95 cursor-pointer"
              >
                <Shield size={13} />
                <span>{language === 'vi' ? 'Giao diện Admin' : 'Admin View'}</span>
              </button>
            )}

            <button
              onClick={handleRestartTour}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white px-4 py-3 rounded-xl text-xs font-black transition-all active:scale-95 cursor-pointer"
            >
              <Sparkles size={13} />
              <span>{t('overview.tourGuide')}</span>
            </button>
          </div>
        </div>

        {/* Right Column: In-banner Metrics */}
        <div className="flex flex-col lg:justify-center flex-[1] lg:pl-8 border-t lg:border-t-0 lg:border-l border-white/20 pt-6 lg:pt-0 relative z-10">
          <div
            className="grid grid-cols-3 lg:grid-cols-1 gap-4 lg:gap-6 bg-black/25 backdrop-blur-[2px] rounded-xl p-4 lg:p-6 border border-white/10"
          >
            {/* Metric 1 */}
            <div className="flex flex-col">
              <span className="text-3xl font-black text-white leading-none">{stats.publishedCount}</span>
              <span className="text-[10px] text-white/90 font-bold mt-1.5">{language === 'vi' ? 'Bài đã đăng' : 'Posts published'}</span>
              <span className="text-[9px] text-emerald-350 font-semibold mt-0.5">+12% {language === 'vi' ? 'tuần' : 'week'}</span>
            </div>

            {/* Metric 2 */}
            <div className="flex flex-col">
              <span className="text-3xl font-black text-white leading-none">{stats.captionsCount}</span>
              <span className="text-[10px] text-white/90 font-bold mt-1.5">{language === 'vi' ? 'Caption sẵn sàng' : 'Captions ready'}</span>
              <span className="text-[9px] text-white/70 mt-0.5">{language === 'vi' ? '0 chờ duyệt' : '0 pending'}</span>
            </div>

            {/* Metric 3 */}
            <div className="flex flex-col">
              <span className="text-3xl font-black text-white leading-none">{stats.pendingCount}</span>
              <span className="text-[10px] text-white/90 font-bold mt-1.5">{language === 'vi' ? 'Lên lịch tới' : 'Scheduled posts'}</span>
              <span className="text-[9px] text-white/90 font-semibold font-mono mt-0.5">{nextPostTimeStr}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 4 horizontal stats columns */}
      <motion.div
        id="tour-stats"
        className="grid grid-cols-2 md:grid-cols-4 gap-6 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-white/5 rounded-2xl p-6 shadow-sm transition-all duration-300"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.08, ease: "easeOut" }}
      >
        <div className="flex flex-col min-w-0">
          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">{language === 'vi' ? 'Hôm nay' : 'Today'}</span>
          <span className="text-xl sm:text-2xl md:text-lg lg:text-base xl:text-xl font-extrabold text-[#1C1E2A] dark:text-white mt-2.5 whitespace-nowrap overflow-hidden text-ellipsis" title={todayValue}>
            {todayValue}
          </span>
          <span className="text-[10px] text-slate-550 dark:text-slate-400 font-bold mt-1.5 whitespace-nowrap overflow-hidden text-ellipsis" title={todaySubtext}>
            {todaySubtext}
          </span>
        </div>

        <div className="flex flex-col border-l border-slate-100 dark:border-white/5 pl-6">
          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">{language === 'vi' ? 'Bài đã tạo' : 'Articles created'}</span>
          <span className="text-3xl font-extrabold text-[#1C1E2A] dark:text-white mt-2">{stats.articlesCount}</span>
          <span className="text-[10px] text-emerald-600 font-black mt-1.5 flex items-center gap-0.5">
            <ArrowUpRight size={10} /> +12% {language === 'vi' ? 'so tuần trước' : 'vs last week'}
          </span>
        </div>

        <div className="flex flex-col border-l border-slate-100 dark:border-white/5 pl-6">
          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">{language === 'vi' ? 'Tỷ lệ thành công' : 'Success rate'}</span>
          <span className="text-3xl font-extrabold text-[#1C1E2A] dark:text-white mt-2">{successRateStr}</span>
          <span className="text-[10px] text-slate-555 dark:text-slate-400 font-bold mt-1.5">{successCountStr}</span>
        </div>

        <div className="flex flex-col border-l border-slate-100 dark:border-white/5 pl-6">
          <span className="text-xs text-slate-550 font-bold uppercase tracking-wider">{language === 'vi' ? 'Đăng tiếp theo' : 'Next schedule'}</span>
          <span className="text-3xl font-extrabold text-[#1C1E2A] dark:text-white mt-2">{nextPostTimeStr}</span>
          <span className="text-[10px] text-slate-550 dark:text-slate-400 font-bold mt-1.5">{nextPostSubtext}</span>
        </div>
      </motion.div>

      {/* Featured Posts ("BÀI ĐĂNG NỔI BẬT") */}
      <motion.div
        id="tour-chart"
        className="flex flex-col gap-4"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.16, ease: "easeOut" }}
      >
        <div className="flex justify-between items-center">
          <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-widest">
            {language === 'vi' ? 'BÀI ĐĂNG NỔI BẬT' : 'FEATURED POSTS'}
          </h3>
          <Link
            href="/content-calendar"
            className="text-xs font-bold text-slate-600 hover:text-primary dark:text-slate-400 dark:hover:text-white transition-colors"
          >
            {language === 'vi' ? 'Xem tất cả →' : 'See all →'}
          </Link>
        </div>

        {featuredPosts.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left card - Large, takes 2 columns on lg */}
            {featuredPosts[0] && (
              <Link
                href={`/content-calendar?postId=${featuredPosts[0].id}`}
                className={`lg:col-span-2 rounded-2xl border p-6 flex flex-col justify-between h-[320px] relative overflow-hidden group hover:shadow-md transition-all cursor-pointer decoration-none ${featuredPosts[0].imgUrl
                    ? 'text-white border-slate-200/80 dark:border-white/5'
                    : featuredPosts[0].bgColor
                  }`}
              >
                <div className="absolute top-4 right-4 z-10">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${featuredPosts[0].badgeColor}`}>
                    {featuredPosts[0].status === 'posted' ? (language === 'vi' ? 'Đã đăng' : 'Posted') : (language === 'vi' ? 'Lên lịch' : 'Scheduled')}
                  </span>
                </div>

                {featuredPosts[0].imgUrl ? (
                  <>
                    <div className="absolute inset-0 z-0">
                      <img
                        src={featuredPosts[0].imgUrl}
                        alt="Post preview"
                        className="w-full h-full object-cover group-hover:scale-105 transition-all duration-700"
                      />
                    </div>
                    {/* Dark gradient overlay to guarantee text readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/10 pointer-events-none z-0" />
                  </>
                ) : null}

                {!featuredPosts[0].imgUrl ? (
                  <div className="flex-1 flex items-center justify-center relative z-10 select-none">
                    <span className="text-sm font-bold opacity-30 tracking-widest uppercase">
                      {language === 'vi' ? 'Ảnh bài chính' : 'Main image'}
                    </span>
                  </div>
                ) : (
                  <div className="flex-1" />
                )}

                <div className="flex flex-col gap-1 relative z-10">
                  <h4 className="text-lg font-black tracking-tight line-clamp-2 leading-tight">
                    {featuredPosts[0].title}
                  </h4>
                  <div className="flex items-center gap-1.5 text-xs font-bold opacity-75 mt-1 font-mono">
                    {getPlatformIcon(featuredPosts[0].platform)}
                    <span>{featuredPosts[0].timeLabel}</span>
                  </div>
                </div>
              </Link>
            )}

            {/* Right column - Takes 1 column on lg, stacks 2 cards */}
            {(featuredPosts[1] || featuredPosts[2]) && (
              <div className="flex flex-col gap-6 lg:col-span-1">
                {/* Top item */}
                {featuredPosts[1] && (
                  <Link
                    href={`/content-calendar?postId=${featuredPosts[1].id}`}
                    className={`flex-1 rounded-2xl border p-6 flex flex-col justify-between h-[148px] relative overflow-hidden group hover:shadow-md transition-all cursor-pointer decoration-none ${featuredPosts[1].imgUrl
                        ? 'text-white border-slate-200/80 dark:border-white/5'
                        : featuredPosts[1].bgColor
                      }`}
                  >
                    <div className="absolute top-4 right-4 z-10">
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${featuredPosts[1].badgeColor}`}>
                        {featuredPosts[1].status === 'posted' ? (language === 'vi' ? 'Đã đăng' : 'Posted') : (language === 'vi' ? 'Lên lịch' : 'Scheduled')}
                      </span>
                    </div>

                    {featuredPosts[1].imgUrl ? (
                      <>
                        <div className="absolute inset-0 z-0">
                          <img
                            src={featuredPosts[1].imgUrl}
                            alt="Post preview"
                            className="w-full h-full object-cover group-hover:scale-105 transition-all duration-700"
                          />
                        </div>
                        {/* Dark gradient overlay to guarantee text readability */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/10 pointer-events-none z-0" />
                      </>
                    ) : null}

                    <div className="flex-1" />
                    <div className="flex flex-col gap-1 relative z-10">
                      <h4 className="text-sm font-black tracking-tight line-clamp-2 leading-snug">
                        {featuredPosts[1].title}
                      </h4>
                      <div className="flex items-center gap-1.5 text-[10px] font-bold opacity-75 mt-1 font-mono">
                        {getPlatformIcon(featuredPosts[1].platform)}
                        <span>{featuredPosts[1].timeLabel}</span>
                      </div>
                    </div>
                  </Link>
                )}

                {/* Bottom item */}
                {featuredPosts[2] && (
                  <Link
                    href={`/content-calendar?postId=${featuredPosts[2].id}`}
                    className={`flex-1 rounded-2xl border p-6 flex flex-col justify-between h-[148px] relative overflow-hidden group hover:shadow-md transition-all cursor-pointer decoration-none ${featuredPosts[2].imgUrl
                        ? 'text-white border-slate-200/80 dark:border-white/5'
                        : featuredPosts[2].bgColor
                      }`}
                  >
                    <div className="absolute top-4 right-4 z-10">
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${featuredPosts[2].badgeColor}`}>
                        {featuredPosts[2].status === 'posted' ? (language === 'vi' ? 'Đã đăng' : 'Posted') : (language === 'vi' ? 'Lên lịch' : 'Scheduled')}
                      </span>
                    </div>

                    {featuredPosts[2].imgUrl ? (
                      <>
                        <div className="absolute inset-0 z-0">
                          <img
                            src={featuredPosts[2].imgUrl}
                            alt="Post preview"
                            className="w-full h-full object-cover group-hover:scale-105 transition-all duration-700"
                          />
                        </div>
                        {/* Dark gradient overlay to guarantee text readability */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/10 pointer-events-none z-0" />
                      </>
                    ) : null}

                    <div className="flex-1" />
                    <div className="flex flex-col gap-1 relative z-10">
                      <h4 className="text-sm font-black tracking-tight line-clamp-2 leading-snug">
                        {featuredPosts[2].title}
                      </h4>
                      <div className="flex items-center gap-1.5 text-[10px] font-bold opacity-75 mt-1 font-mono">
                        {getPlatformIcon(featuredPosts[2].platform)}
                        <span>{featuredPosts[2].timeLabel}</span>
                      </div>
                    </div>
                  </Link>
                )}
              </div>
            )}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="h-40 flex items-center justify-center border border-dashed border-slate-200 dark:border-white/5 rounded-2xl bg-white dark:bg-slate-900 text-xs font-bold text-slate-400 uppercase tracking-widest select-none"
          >
            {language === 'vi' ? 'Chưa có bài đăng nổi bật' : 'No featured posts available'}
          </motion.div>
        )}
      </motion.div>

      {/* Post Log and Upcoming Schedule side by side */}
      <motion.div
        id="tour-recent"
        className="grid grid-cols-1 lg:grid-cols-3 gap-8"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.24, ease: "easeOut" }}
      >

        {/* Left Column: Publication Chart */}
        <div className="lg:col-span-2 flex flex-col gap-6 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-white/5 rounded-2xl p-6 shadow-sm">
          {/* Header */}
          <div className="flex flex-col xl:flex-row xl:justify-between xl:items-start gap-4 pb-4 border-b border-slate-100 dark:border-white/5">
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-mono tracking-widest text-[#F97316] uppercase font-black">
                {language === 'vi' ? 'BIỂU ĐỒ XUẤT BẢN' : 'PUBLICATION CHART'}
              </span>
              <h4 className="text-lg font-black text-slate-800 dark:text-white leading-tight">
                {chartTimeframe === 'week'
                  ? (language === 'vi' ? 'Số lượng bài đăng 7 ngày qua' : 'Post volume in last 7 days')
                  : (language === 'vi' ? 'Số lượng bài đăng 30 ngày qua' : 'Post volume in last 30 days')
                }
              </h4>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Timeframe selector */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200/50 dark:border-white/5">
                <button
                  onClick={() => setChartTimeframe('week')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${chartTimeframe === 'week'
                      ? 'bg-white dark:bg-slate-900 shadow-sm text-slate-800 dark:text-white'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                    }`}
                >
                  {language === 'vi' ? '7 Ngày' : '7 Days'}
                </button>
                <button
                  onClick={() => setChartTimeframe('month')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${chartTimeframe === 'month'
                      ? 'bg-white dark:bg-slate-900 shadow-sm text-slate-800 dark:text-white'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                    }`}
                >
                  {language === 'vi' ? '30 Ngày' : '30 Days'}
                </button>
              </div>

              {/* Platform selector */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200/50 dark:border-white/5">
                <button
                  onClick={() => setChartPlatform('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${chartPlatform === 'all'
                      ? 'bg-white dark:bg-slate-900 shadow-sm text-slate-800 dark:text-white'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                    }`}
                >
                  {language === 'vi' ? 'Tất cả' : 'All'}
                </button>
                <button
                  onClick={() => setChartPlatform('facebook')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${chartPlatform === 'facebook'
                      ? 'bg-white dark:bg-slate-900 shadow-sm text-slate-800 dark:text-white'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                    }`}
                >
                  <Facebook size={11} />
                  <span>FB</span>
                </button>
                <button
                  onClick={() => setChartPlatform('instagram')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${chartPlatform === 'instagram'
                      ? 'bg-white dark:bg-slate-900 shadow-sm text-slate-800 dark:text-white'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                    }`}
                >
                  <Instagram size={11} />
                  <span>IG</span>
                </button>
                <button
                  onClick={() => setChartPlatform('threads')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${chartPlatform === 'threads'
                      ? 'bg-white dark:bg-slate-900 shadow-sm text-slate-800 dark:text-white'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                    }`}
                >
                  <ThreadsIcon size={11} />
                  <span>Threads</span>
                </button>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-1.5 text-[10px] text-slate-550 dark:text-slate-400 font-bold shrink-0">
                <span className="w-2 h-2 rounded-full bg-[#F97316]" />
                <span>{language === 'vi' ? 'Tổng số bài' : 'Total posts'}</span>
              </div>
            </div>
          </div>

          {/* Chart Bars Area */}
          <div className="h-44 relative flex items-end justify-between px-2 pt-6">
            {/* Bars container */}
            <div className="absolute inset-0 flex justify-between items-end px-2 select-none">
              {dailyVolume.map((item, idx) => {
                const heightPct = maxPostVolume > 0 ? (item.count / maxPostVolume) * 100 : 0;

                // For month view, display every 5th day label to avoid overlapping text
                const showLabel = chartTimeframe === 'week' ? true : idx % 5 === 0 || idx === dailyVolume.length - 1;

                return (
                  <div key={item.dateString} className="flex-1 flex flex-col items-center gap-2 group relative">
                    {/* Count tooltip on Hover */}
                    <div className="absolute -top-8 bg-slate-800 text-white text-[10px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 whitespace-nowrap">
                      {item.count} {language === 'vi' ? 'bài' : 'posts'}
                    </div>

                    {/* Capsule container */}
                    <div className={`${chartTimeframe === 'week' ? 'w-6 md:w-8' : 'w-1.5 md:w-2.5'} bg-[#F4F5F9] dark:bg-slate-800 rounded-full h-24 flex items-end overflow-hidden`}>
                      {/* Filled progress bar with gradient */}
                      <div
                        className="w-full bg-gradient-to-t from-[#F97316] to-[#22D3EE] rounded-full transition-all duration-500 ease-out"
                        style={{ height: `${heightPct}%` }}
                      />
                    </div>

                    {/* Day name label */}
                    {showLabel ? (
                      <span className="text-[9px] text-slate-800 dark:text-slate-200 font-bold uppercase tracking-tight text-center whitespace-nowrap">
                        {formatDayName(item.dayLabel)}
                      </span>
                    ) : (
                      <span className="text-[9px] opacity-0 pointer-events-none">&nbsp;</span>
                    )}

                    {/* Date number label */}
                    {showLabel ? (
                      <span className="text-[8px] text-slate-400 dark:text-slate-500 font-bold font-mono">
                        {item.dateNum}
                      </span>
                    ) : (
                      <span className="text-[8px] opacity-0 pointer-events-none">&nbsp;</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Upcoming Schedule */}
        <div className="lg:col-span-1 flex flex-col gap-4 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-white/5 rounded-2xl p-6 shadow-sm">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-white/5">
            <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-widest">
              {language === 'vi' ? 'LỊCH ĐĂNG SẮP TỚI' : 'UPCOMING SCHEDULE'}
            </h3>
            <Link
              href="/content-calendar"
              className="text-xs font-bold text-primary hover:underline transition-all"
            >
              {language === 'vi' ? 'Mở lịch →' : 'Open calendar →'}
            </Link>
          </div>

          {upcomingScheduleItems.length > 0 ? (
            <div className="flex flex-col gap-4 mt-2">
              {upcomingScheduleItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black font-mono shrink-0 select-none text-center min-w-[70px] ${item.colorClass}`}>
                      {item.timeBlock}
                    </div>
                    <span className="text-xs font-black text-slate-800 dark:text-white truncate">
                      {item.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {item.dots.map((color, index) => (
                      <span
                        key={index}
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center min-h-[160px] text-xs font-bold text-slate-400 uppercase tracking-widest select-none">
              {language === 'vi' ? 'Không có lịch đăng sắp tới' : 'No upcoming schedules'}
            </div>
          )}
        </div>
      </motion.div>

      {/* Onboarding Tour Overlay */}
      {mounted && createPortal(
        <AnimatePresence>
          {showTour && (
            <motion.div
              key="tour-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-[9999] pointer-events-none"
            >
              {/* SVG Mask Backdrop - dims screen but cuts a hole for the active element */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                <defs>
                  <mask id="tour-mask" maskUnits="userSpaceOnUse">
                    <rect x="-100" y="-100" width="10000" height="10000" fill="white" />
                    {tourRect && (
                      <rect
                        x={tourRect.x - 2}
                        y={tourRect.y + 2}
                        width={tourRect.width}
                        height={tourRect.height}
                        rx={16}
                        fill="black"
                        className="transition-all duration-300 ease-in-out"
                      />
                    )}
                  </mask>
                </defs>
                <rect
                  x="-100"
                  y="-100"
                  width="10000"
                  height="10000"
                  fill="currentColor"
                  mask="url(#tour-mask)"
                  className="pointer-events-auto cursor-pointer text-black/60 dark:text-black/80"
                  onClick={handleSkipTour}
                />
              </svg>

              {/* Tour Card - pointer-events re-enabled only on card */}
              <div
                className={[
                  'absolute transition-all duration-300 ease-in-out pointer-events-auto',
                  tourStep === 0 || tourStep === 5
                    ? 'inset-0 flex items-center justify-center'
                    : 'bottom-6 right-6 flex items-end justify-end'
                ].join(' ')}
              >
                <div className="relative z-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-2xl rounded-2xl p-6 flex flex-col gap-4 w-[420px] max-w-[calc(100vw-2rem)]">
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
                      className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded px-1.5 py-0.5"
                    >
                      {t('overview.skip')}
                    </button>
                  </div>

                  {/* Step content */}
                  <div className="flex flex-col gap-2">
                    <h3 className="text-base font-extrabold text-slate-800 dark:text-white leading-snug">
                      {tourStep === 0 && t('overview.welcomeTourTitle')}
                      {tourStep === 1 && t('overview.tourStep1Title')}
                      {tourStep === 2 && t('overview.tourStep2Title')}
                      {tourStep === 3 && t('overview.tourStep3Title')}
                      {tourStep === 4 && t('overview.tourStep4Title')}
                      {tourStep === 5 && t('overview.tourStep5Title')}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                      {tourStep === 0 && t('overview.tourStep0Desc')}
                      {tourStep === 1 && t('overview.tourStep1Desc')}
                      {tourStep === 2 && t('overview.tourStep2Desc')}
                      {tourStep === 3 && t('overview.tourStep3Desc')}
                      {tourStep === 4 && t('overview.tourStep4Desc')}
                      {tourStep === 5 && t('overview.tourStep5Desc')}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-between items-center mt-2 pt-4 border-t border-slate-100 dark:border-white/8">
                    {tourStep > 0 ? (
                      <button
                        onClick={handlePrevStep}
                        className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold px-4 py-2.5 rounded-xl transition-all active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

    </div>
  );
}
