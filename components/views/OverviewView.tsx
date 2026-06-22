"use client";

import React, { useState, useEffect } from 'react';
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
  Globe
} from 'lucide-react';
import Link from 'next/link';

// Threads Custom SVG Logo
const ThreadsIcon = ({ size = 16, className = "" }: { size?: number; className?: string }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" className={className}>
    <path d="M22.5 12c0-5.799-4.701-10.5-10.5-10.5S1.5 6.201 1.5 12s4.701 10.5 10.5 10.5c2.328 0 4.475-.758 6.216-2.038l-1.39-1.39C15.42 19.98 13.784 20.5 12 20.5c-4.694 0-8.5-3.806-8.5-8.5s3.806-8.5 8.5-8.5 8.5 3.806 8.5 8.5c0 1.956-.503 3.659-1.42 4.8-.813 1.011-1.923 1.5-3.08 1.5-1.144 0-1.848-.553-2.128-1.123-.391-.798-.328-2.109-.328-3.177v-2.5c0-.828-.672-1.5-1.5-1.5s-1.5.672-1.5 1.5v2.5c0 .356-.002.83-.027 1.309a4 4 0 1 1-3.953-3.809c.28 0 .546.035.803.097V8.539c-.26-.025-.525-.039-.79-.039a7 7 0 1 0 5.679 11.096c.71.91 1.776 1.404 3.018 1.404 2.217 0 4.156-1.134 5.347-2.923 1.15-1.729 1.693-3.992 1.693-6.077zM9.5 12a1 1 0 1 0 2 0 1 1 0 0 0-2 0z" />
  </svg>
);

export default function OverviewView() {
  const { language } = useLanguage();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userName, setUserName] = useState('');
  
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

  // Compute max count of posts in 7 days for scaling the chart
  const maxPostVolume = Math.max(...stats.dailyVolume.map(d => d.count), 1);

  if (loading) {
    return (
      <div className="h-[400px] flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-indigo-600" size={36} />
        <span className="text-xs font-bold text-slate-450 uppercase tracking-widest">
          {language === 'vi' ? 'Đang tải số liệu thống kê...' : 'Loading statistics...'}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 font-sans select-none pb-12">
      
      {/* Dynamic Greeting Hero Banner - White Theme */}
      <div className="relative overflow-hidden bg-white border border-slate-200/60 rounded-[32px] p-8 md:p-10 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        {/* Background neon ambient graphic */}
        <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full bg-gradient-to-tr from-indigo-500/5 via-cyan-500/5 to-transparent blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -bottom-10 w-[200px] h-[200px] rounded-full bg-gradient-to-tr from-emerald-500/5 to-transparent blur-2xl pointer-events-none" />

        <div className="flex flex-col gap-2 relative z-10">
          <span className="text-[10px] text-indigo-600 font-mono tracking-widest uppercase font-extrabold flex items-center gap-1.5">
            <Sparkles size={11} className="animate-pulse" />
            {language === 'vi' ? 'Hệ điều hành xuất bản tự động' : 'AUTOMATED PUBLISHING PIPELINE'}
          </span>
          <h1 className="text-3xl font-black tracking-tight leading-tight text-slate-800">
            {language === 'vi' ? `Chào mừng trở lại, ${userName}! ✨` : `Welcome back, ${userName}! ✨`}
          </h1>
          <p className="text-slate-500 text-sm font-medium max-w-xl leading-relaxed">
            {language === 'vi' 
              ? 'Hệ thống AI đang chạy ngầm tối ưu hóa chiến dịch của bạn. Tất cả các dữ liệu đã sẵn sàng để vận hành.'
              : 'The AI pipeline is continuously active and optimizing your copy variants in the background.'}
          </p>
        </div>

        <button 
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 bg-slate-100 hover:bg-indigo-50 border border-slate-200/50 text-slate-700 hover:text-indigo-605 px-5 py-3 rounded-2xl text-xs font-black transition-all active:scale-95 disabled:opacity-50 cursor-pointer relative z-10"
        >
          {refreshing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
          <span>{language === 'vi' ? 'Làm mới số liệu' : 'Refresh Metrics'}</span>
        </button>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Stat Card 1: Ingestion & Copywriting (Rose/Violet Theme) */}
        <div className="bg-white border border-slate-200/60 rounded-[32px] p-6 shadow-sm flex flex-col justify-between h-[240px] relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-[120px] h-[120px] bg-gradient-to-bl from-rose-500/5 to-indigo-500/5 rounded-bl-[100px] pointer-events-none" />
          
          <div className="flex justify-between items-start">
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 font-mono tracking-wider font-extrabold uppercase">
                {language === 'vi' ? 'Tiến độ Crawl & Soạn thảo' : 'Ingestion & Copywriting'}
              </span>
              <h2 className="text-base font-extrabold text-slate-800 mt-0.5">
                {language === 'vi' ? 'Nội dung tích lũy' : 'Ingested Content'}
              </h2>
            </div>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm">
              <Newspaper size={18} />
            </div>
          </div>

          <div className="flex items-end justify-between mt-4">
            <div className="flex flex-col">
              <span className="text-4xl font-black text-slate-900 tracking-tight">
                {stats.articlesCount} <span className="text-sm text-slate-400 font-bold">{language === 'vi' ? 'bài báo' : 'articles'}</span>
              </span>
              <span className="text-[10px] text-emerald-600 font-black tracking-wide flex items-center gap-0.5 mt-1">
                <ArrowUpRight size={10} /> +12% {language === 'vi' ? 'tuần này' : 'this week'}
              </span>
            </div>
            <div className="flex flex-col text-right">
              <span className="text-sm font-black text-indigo-650 bg-indigo-50 px-2.5 py-1 rounded-xl border border-indigo-100/40">
                {stats.captionsCount} {language === 'vi' ? 'AI Caption' : 'AI Captions'}
              </span>
              <span className="text-[9px] text-slate-400 font-bold mt-1">
                {stats.pendingCount} {language === 'vi' ? 'bài chờ đăng' : 'pending in queue'}
              </span>
            </div>
          </div>

          <div className="h-1.5 w-full bg-slate-105 rounded-full mt-4 overflow-hidden relative">
            <div className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-rose-500 to-indigo-500 rounded-full" style={{ width: '70%' }} />
          </div>
        </div>

        {/* Stat Card 2: Platform Distribution (Cylindrical Bar Chart Theme) */}
        <div className="bg-white border border-slate-200/60 rounded-[32px] p-6 shadow-sm flex flex-col justify-between h-[240px] relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 font-mono tracking-wider font-extrabold uppercase">
                {language === 'vi' ? 'Độ phủ trên mạng xã hội' : 'Cross-Platform Cover'}
              </span>
              <h2 className="text-base font-extrabold text-slate-800 mt-0.5">
                {language === 'vi' ? 'Phân bổ bài đăng kênh' : 'Platform Publication Share'}
              </h2>
            </div>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-sm">
              <Zap size={18} />
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
              <span className="text-[9px] font-black text-slate-800">{getPercent(stats.platformShare.threads)}%</span>
              <div className="w-3 rounded-full bg-slate-100 h-full relative overflow-hidden">
                <div 
                  className="absolute bottom-0 left-0 right-0 rounded-full bg-gradient-to-t from-slate-900 to-slate-600 transition-all duration-700" 
                  style={{ height: `${getPercent(stats.platformShare.threads)}%`, minHeight: '8px' }}
                />
              </div>
              <ThreadsIcon size={12} className="text-black mt-1" />
            </div>
          </div>

          <div className="flex justify-between items-center text-[8.5px] text-slate-400 font-bold border-t border-slate-100/60 pt-2">
            <span>{language === 'vi' ? 'Tổng số bài:' : 'Total scheduled:'} <strong className="text-slate-700">{totalShares}</strong></span>
          </div>
        </div>

        {/* Stat Card 3: Publication Status (Cyan Glow theme) */}
        <div className="bg-white border border-slate-200/60 rounded-[32px] p-6 shadow-sm flex flex-col justify-between h-[240px] relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 font-mono tracking-wider font-extrabold uppercase">
                {language === 'vi' ? 'Đo lường Vận hành' : 'Publication Status'}
              </span>
              <h2 className="text-base font-extrabold text-slate-800 mt-0.5">
                {language === 'vi' ? 'Trạng thái xuất bản' : 'Publication Status'}
              </h2>
            </div>
            <div className="w-9 h-9 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center shadow-sm">
              <CheckCircle2 size={18} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-1.5">
            <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-2.5 flex flex-col">
              <span className="text-[9px] text-emerald-700 font-black uppercase">{language === 'vi' ? 'Thành công' : 'Posted'}</span>
              <span className="text-2xl font-black text-emerald-800 mt-0.5">{stats.publishedCount}</span>
            </div>
            <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-2.5 flex flex-col">
              <span className="text-[9px] text-amber-700 font-black uppercase">{language === 'vi' ? 'Chờ đăng' : 'Pending'}</span>
              <span className="text-2xl font-black text-amber-800 mt-0.5">{stats.pendingCount}</span>
            </div>
            <div className="bg-rose-50/50 border border-rose-100 rounded-2xl p-2.5 flex flex-col">
              <span className="text-[9px] text-rose-700 font-black uppercase">{language === 'vi' ? 'Lỗi/Thất bại' : 'Failed'}</span>
              <span className="text-2xl font-black text-rose-800 mt-0.5">{stats.failedCount}</span>
            </div>
            <div className="bg-slate-50 border border-slate-200/50 rounded-2xl p-2.5 flex flex-col">
              <span className="text-[9px] text-slate-500 font-black uppercase">{language === 'vi' ? 'Đã hủy' : 'Cancelled'}</span>
              <span className="text-2xl font-black text-slate-650 mt-0.5">{stats.cancelledCount}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Chart: 7-Day Publication Volume Bar Chart */}
      <div className="bg-white border border-slate-200/60 rounded-[32px] p-6 shadow-sm relative overflow-hidden flex flex-col gap-6">
        <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-gradient-to-bl from-indigo-500/5 to-transparent pointer-events-none" />
        
        <div className="flex justify-between items-start">
          <div className="flex flex-col">
            <span className="text-[10px] text-indigo-500 font-mono tracking-wider font-extrabold uppercase">
              {language === 'vi' ? 'Biểu đồ xuất bản' : 'Publication Chart'}
            </span>
            <h2 className="text-lg font-extrabold text-slate-800 mt-0.5">
              {language === 'vi' ? 'Số lượng bài đăng 7 ngày qua' : 'Publications Last 7 Days'}
            </h2>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-450 font-bold bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
            <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-indigo-600 to-cyan-400" />
            <span>{language === 'vi' ? 'Tổng số bài' : 'Total volume'}</span>
          </div>
        </div>

        {/* Dynamic Interactive Chart */}
        <div className="h-[220px] w-full flex items-end justify-between px-6 pb-6 relative">
          
          {/* Horizontal grid guide lines */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none z-0 px-6 pb-12 pt-6">
            <div className="border-b border-slate-100 w-full h-[1px]" />
            <div className="border-b border-slate-100 w-full h-[1px]" />
            <div className="border-b border-slate-100 w-full h-[1px]" />
            <div className="border-b border-slate-100 w-full h-[1px]" />
          </div>

          {stats.dailyVolume.map((d, i) => {
            const heightPct = (d.count / maxPostVolume) * 80; // Scale height max at 80% of container
            return (
              <div key={i} className="flex flex-col items-center gap-3 w-full group relative z-10">
                {/* Tooltip on hover */}
                <div className="absolute bottom-[calc(100%+8px)] bg-slate-800 text-white text-[9px] font-black px-2.5 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none shadow-md z-30 flex items-center gap-1">
                  <span>{d.count}</span>
                  <span>{language === 'vi' ? 'bài' : 'posts'}</span>
                </div>
                
                {/* Bar graphic container */}
                <div className="w-8 bg-slate-50 rounded-2xl h-[120px] flex items-end overflow-hidden border border-slate-100">
                  <div 
                    className="w-full bg-gradient-to-t from-indigo-600 to-cyan-400 rounded-2xl group-hover:scale-y-[1.03] transition-all duration-500 origin-bottom"
                    style={{ height: `${heightPct}%`, minHeight: d.count > 0 ? '8px' : '0' }}
                  />
                </div>
                
                {/* Day axis label */}
                <div className="flex flex-col items-center select-none">
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase group-hover:text-indigo-605 transition-colors">
                    {d.dayLabel}
                  </span>
                  <span className="text-[9px] text-slate-450 font-bold font-mono mt-0.5">
                    {d.dateNum}
                  </span>
                </div>
              </div>
            );
          })}

        </div>
      </div>

      {/* Recent Posts Image Activity Log Grid */}
      <div className="bg-white border border-slate-200/60 rounded-[32px] p-6 shadow-sm flex flex-col gap-5">
        <div className="flex justify-between items-center pb-3 border-b border-slate-100/60">
          <div className="flex flex-col">
            <h2 className="text-lg font-extrabold text-slate-800">
              {language === 'vi' ? 'Nhật ký Hoạt động Bài đăng Gần đây' : 'Recent Posts Activity Log'}
            </h2>
            <p className="text-xs text-slate-400 font-medium leading-normal">
              {language === 'vi' 
                ? 'Hình ảnh minh họa trực quan cùng trạng thái của các bài đăng mới nhất trong cơ sở dữ liệu.' 
                : 'Visual images and live statuses of the latest campaign publications.'}
            </p>
          </div>
          <Link 
            href="/content-calendar" 
            className="flex items-center gap-1 text-xs font-black text-indigo-650 bg-indigo-50 hover:bg-indigo-100 px-3.5 py-2 rounded-xl transition-all cursor-pointer decoration-none border-0 active:scale-95 animate-fade-in"
          >
            <span>{language === 'vi' ? 'Xem lịch đăng bài' : 'View Calendar'}</span>
            <ChevronRight size={13} />
          </Link>
        </div>

        {stats.recentPosts.length === 0 ? (
          <div className="bg-[#F8F9FE] border border-dashed border-[#E4E6F8] rounded-[24px] py-12 px-6 flex flex-col items-center justify-center text-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-500 animate-pulse">
              <Globe size={20} />
            </div>
            <div className="flex flex-col gap-1">
              <p className="font-bold text-slate-700 text-sm">
                {language === 'vi' ? 'Không có bài đăng nào' : 'No posts recorded'}
              </p>
              <p className="text-slate-500 text-xs max-w-sm leading-relaxed">
                {language === 'vi' 
                  ? 'Cơ sở dữ liệu của bạn đang trống sạch sẽ. Hãy điều hướng sang AI Creator để tạo bài viết đầu tiên!' 
                  : 'Your database is currently empty. Go to the AI Creator view to publish your first post!'}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.recentPosts.map((post) => {
              let platIcon = <Globe size={13} />;
              let platBg = 'bg-slate-100 text-slate-700';

              const platform = post.platform?.toLowerCase();
              if (platform === 'facebook') {
                platIcon = <Facebook size={11} className="fill-[#1877F2] text-[#1877F2]" />;
                platBg = 'bg-blue-50 text-[#1877F2] border border-blue-100/35';
              } else if (platform === 'instagram') {
                platIcon = <Instagram size={11} className="text-pink-500" />;
                platBg = 'bg-pink-50 text-pink-500 border border-pink-100/35';
              } else if (platform === 'threads' || platform === 'thread') {
                platIcon = <ThreadsIcon size={11} className="text-black" />;
                platBg = 'bg-slate-50 text-black border border-slate-200/35';
              }

              const timeStr = new Date(post.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' · ' + new Date(post.scheduled_at).toLocaleDateString([], { day: 'numeric', month: 'numeric' });

              return (
                <div 
                  key={post.id}
                  className="bg-white rounded-3xl overflow-hidden aspect-square shadow-sm relative group cursor-pointer border border-slate-150/60"
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
                  <div className="absolute inset-0 bg-slate-900/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-4 text-white z-20">
                    <div className="flex justify-between items-start">
                      <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 ${platBg}`}>
                        {platIcon}
                        <span className="font-sans">{post.platform}</span>
                      </span>
                      
                      <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                        post.status === 'posted' ? 'bg-emerald-500 text-white' :
                        post.status === 'failed' ? 'bg-rose-500 text-white' :
                        post.status === 'cancelled' ? 'bg-slate-500 text-white' : 'bg-amber-500 text-white'
                      }`}>
                        {language === 'vi' 
                          ? (post.status === 'posted' ? 'Đã đăng' : post.status === 'failed' ? 'Lỗi' : post.status === 'cancelled' ? 'Đã hủy' : 'Chờ đăng')
                          : post.status}
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

    </div>
  );
}
