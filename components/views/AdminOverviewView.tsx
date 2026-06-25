"use client";

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Terminal, 
  Settings, 
  Activity, 
  FileText, 
  RefreshCw, 
  CheckCircle2, 
  Loader2, 
  ChevronRight, 
  ArrowUpRight,
  Shield, 
  AlertTriangle,
  Play, 
  Globe, 
  Link as LinkIcon,
  Facebook,
  Instagram,
  UserCheck,
  UserX,
  Clock,
  ExternalLink
} from 'lucide-react';
import Link from 'next/link';

// Threads Custom SVG Logo
const ThreadsIcon = ({ size = 16, className = "" }: { size?: number; className?: string }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" className={className}>
    <path d="M22.5 12c0-5.799-4.701-10.5-10.5-10.5S1.5 6.201 1.5 12s4.701 10.5 10.5 10.5c2.328 0 4.475-.758 6.216-2.038l-1.39-1.39C15.42 19.98 13.784 20.5 12 20.5c-4.694 0-8.5-3.806-8.5-8.5s3.806-8.5 8.5-8.5 8.5 3.806 8.5 8.5c0 1.956-.503 3.659-1.42 4.8-.813 1.011-1.923 1.5-3.08 1.5-1.144 0-1.848-.553-2.128-1.123-.391-.798-.328-2.109-.328-3.177v-2.5c0-.828-.672-1.5-1.5-1.5s-1.5.672-1.5 1.5v2.5c0 .356-.002.83-.027 1.309a4 4 0 1 1-3.953-3.809c.28 0 .546.035.803.097V8.539c-.26-.025-.525-.039-.79-.039a7 7 0 1 0 5.679 11.096c.71.91 1.776 1.404 3.018 1.404 2.217 0 4.156-1.134 5.347-2.923 1.15-1.729 1.693-3.992 1.693-6.077zM9.5 12a1 1 0 1 0 2 0 1 1 0 0 0-2 0z" />
  </svg>
);

interface AdminOverviewViewProps {
  onSwitchView: () => void;
  userName: string;
}

export default function AdminOverviewView({ onSwitchView, userName }: AdminOverviewViewProps) {
  const { language, t } = useLanguage();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'audit' | 'pipeline'>('audit');

  // Stats state for Admin
  const [adminStats, setAdminStats] = useState({
    userMetrics: {
      total: 0,
      active: 0,
      pending: 0,
      locked: 0
    },
    contentMetrics: {
      articles: 0,
      captions: 0
    },
    pipelineMetrics: {
      total: 0,
      running: 0,
      failed: 0
    },
    postMetrics: {
      posted: 0,
      pending: 0,
      failed: 0,
      cancelled: 0,
      totalShare: 0,
      facebook: 0,
      instagram: 0,
      threads: 0
    },
    dailyVolume: [] as { dateString: string; dayLabel: string; dateNum: number; count: number }[],
    recentAuditLogs: [] as any[],
    recentPipelineRuns: [] as any[]
  });

  const fetchAdminDashboardData = async () => {
    try {
      // 1. Fetch Users Info
      const { data: usersData } = await supabase
        .from('users')
        .select('role, status');

      let userTotal = 0;
      let userActive = 0;
      let userPending = 0;
      let userLocked = 0;

      if (usersData) {
        userTotal = usersData.length;
        usersData.forEach(u => {
          if (u.status === 'active') userActive++;
          else if (u.status === 'pending') userPending++;
          else if (u.status === 'locked') userLocked++;
        });
      }

      // 2. Fetch Global Articles & Captions counts
      const { count: globalArticlesCount } = await supabase
        .from('articles')
        .select('*', { count: 'exact', head: true });

      const { count: globalCaptionsCount } = await supabase
        .from('captions')
        .select('*', { count: 'exact', head: true });

      // 3. Fetch Pipeline Runs Stats & list 5 recent runs
      const { count: pipelineTotal } = await supabase
        .from('pipeline_runs')
        .select('*', { count: 'exact', head: true });

      const { count: pipelineRunning } = await supabase
        .from('pipeline_runs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'running');

      const { count: pipelineFailed } = await supabase
        .from('pipeline_runs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'failed');

      const { data: recentRuns } = await supabase
        .from('pipeline_runs')
        .select('id, url, status, started_at, error_message')
        .order('started_at', { ascending: false })
        .limit(5);

      // 4. Fetch Global Scheduled Posts & Platform distribution
      const { data: globalPosts } = await supabase
        .from('scheduled_posts')
        .select('id, platform, status, scheduled_at');

      let postPosted = 0;
      let postPending = 0;
      let postFailed = 0;
      let postCancelled = 0;
      let fbCount = 0;
      let instaCount = 0;
      let threadsCount = 0;

      // Last 7 days volume template
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

      if (globalPosts) {
        globalPosts.forEach(p => {
          if (p.status === 'posted') postPosted++;
          else if (p.status === 'pending') postPending++;
          else if (p.status === 'failed') postFailed++;
          else if (p.status === 'cancelled') postCancelled++;

          const plat = p.platform?.toLowerCase();
          if (plat === 'facebook') fbCount++;
          else if (plat === 'instagram') instaCount++;
          else if (plat === 'threads' || plat === 'thread') threadsCount++;

          // Match day volume for chart
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

      // 5. Fetch Recent Audit Logs from API endpoint to get formatted actor emails
      let auditLogsData = [];
      try {
        const res = await fetch('/api/admin/audit-logs?limit=5');
        if (res.ok) {
          const json = await res.json();
          auditLogsData = json.data || [];
        }
      } catch (err) {
        console.error('Failed to fetch formatted audit logs:', err);
      }

      setAdminStats({
        userMetrics: {
          total: userTotal,
          active: userActive,
          pending: userPending,
          locked: userLocked
        },
        contentMetrics: {
          articles: globalArticlesCount || 0,
          captions: globalCaptionsCount || 0
        },
        pipelineMetrics: {
          total: pipelineTotal || 0,
          running: pipelineRunning || 0,
          failed: pipelineFailed || 0
        },
        postMetrics: {
          posted: postPosted,
          pending: postPending,
          failed: postFailed,
          cancelled: postCancelled,
          totalShare: fbCount + instaCount + threadsCount,
          facebook: fbCount,
          instagram: instaCount,
          threads: threadsCount
        },
        dailyVolume: last7Days,
        recentAuditLogs: auditLogsData,
        recentPipelineRuns: recentRuns || []
      });

    } catch (err) {
      console.error('Failed to load admin overview metrics:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAdminDashboardData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAdminDashboardData();
  };

  const getPercent = (value: number) => {
    const total = adminStats.postMetrics.totalShare;
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
  };

  const maxPostVolume = Math.max(...adminStats.dailyVolume.map(d => d.count), 1);

  if (loading) {
    return (
      <div className="h-[400px] flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-indigo-650" size={36} />
        <span className="text-xs font-bold text-slate-450 uppercase tracking-widest">
          {t('overview.admin.loadingStats')}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 font-sans select-none pb-12">
      
      {/* Admin Hero Header Banner - White Theme */}
      <div className="relative overflow-hidden bg-white border border-slate-200/60 rounded-[32px] p-6 md:p-10 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="absolute top-0 right-0 w-[450px] h-[450px] rounded-full bg-gradient-to-tr from-indigo-500/5 via-purple-500/5 to-transparent blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -bottom-10 w-[250px] h-[250px] rounded-full bg-gradient-to-tr from-cyan-500/5 to-transparent blur-2xl pointer-events-none" />

        <div className="flex flex-col gap-2 relative z-10">
          <span className="text-[10px] text-indigo-600 font-mono tracking-widest uppercase font-extrabold flex items-center gap-2">
            <Shield size={12} className="text-indigo-600" />
            {t('overview.admin.title')}
          </span>
          <h1 className="text-3xl font-black tracking-tight leading-tight text-slate-800">
            {t('overview.admin.welcome', { name: userName })}
          </h1>
          <p className="text-slate-500 text-sm font-medium max-w-xl leading-relaxed">
            {t('overview.admin.subtitle')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 relative z-10 w-full md:w-auto">
          {/* Switch View button */}
          <button 
            onClick={onSwitchView}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-750 text-white px-5 py-3 rounded-2xl text-xs font-black transition-all active:scale-95 cursor-pointer shadow-lg shadow-indigo-600/20"
          >
            <Activity size={13} />
            <span>{t('overview.admin.switchToUserView')}</span>
          </button>
          
          <button 
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 bg-slate-100 hover:bg-indigo-50 border border-slate-200/50 text-slate-700 hover:text-indigo-605 px-5 py-3 rounded-2xl text-xs font-black transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {refreshing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            <span>{t('overview.admin.refreshBtn')}</span>
          </button>
        </div>
      </div>

      {/* Admin KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* KPI 1: User Management */}
        <div className="bg-white border border-slate-200/60 rounded-[32px] p-6 shadow-sm flex flex-col justify-between h-[240px] relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute top-0 right-0 w-[120px] h-[120px] bg-gradient-to-bl from-indigo-500/5 to-cyan-500/5 rounded-bl-[100px] pointer-events-none" />
          
          <div className="flex justify-between items-start">
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 font-mono tracking-wider font-extrabold uppercase">
                {t('overview.admin.userManagement')}
              </span>
              <h2 className="text-base font-extrabold text-slate-800 mt-0.5">
                {t('overview.admin.totalUsers')}
              </h2>
            </div>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Users size={16} />
            </div>
          </div>

          <div className="flex items-end justify-between mt-2">
            <div className="flex flex-col">
              <span className="text-4xl font-black text-slate-900 tracking-tight">
                {adminStats.userMetrics.total}
              </span>
              <span className="text-[10px] text-slate-400 font-black mt-1 uppercase">
                {t('admin.user')}
              </span>
            </div>
            <div className="flex flex-col text-right gap-1 font-semibold text-[10px]">
              <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
                {adminStats.userMetrics.active} {t('overview.admin.activeUsers')}
              </span>
              <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100">
                {adminStats.userMetrics.pending} {t('overview.admin.pendingUsers')}
              </span>
              <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-100">
                {adminStats.userMetrics.locked} {t('overview.admin.lockedUsers')}
              </span>
            </div>
          </div>

          <div className="h-1.5 w-full bg-slate-100 rounded-full mt-4 overflow-hidden relative">
            <div 
              className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-indigo-550 to-cyan-400 rounded-full" 
              style={{ width: `${adminStats.userMetrics.total > 0 ? (adminStats.userMetrics.active / adminStats.userMetrics.total) * 100 : 0}%` }} 
            />
          </div>
        </div>

        {/* KPI 2: Global Content */}
        <div className="bg-white border border-slate-200/60 rounded-[32px] p-6 shadow-sm flex flex-col justify-between h-[240px] relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute top-0 right-0 w-[120px] h-[120px] bg-gradient-to-bl from-purple-500/5 to-pink-500/5 rounded-bl-[100px] pointer-events-none" />
          
          <div className="flex justify-between items-start">
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 font-mono tracking-wider font-extrabold uppercase">
                {t('overview.admin.globalContent')}
              </span>
              <h2 className="text-base font-extrabold text-slate-800 mt-0.5">
                {t('overview.admin.totalArticles')}
              </h2>
            </div>
            <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
              <FileText size={16} />
            </div>
          </div>

          <div className="flex items-end justify-between mt-2">
            <div className="flex flex-col">
              <span className="text-4xl font-black text-slate-900 tracking-tight">
                {adminStats.contentMetrics.articles}
              </span>
              <span className="text-[10px] text-slate-400 font-black mt-1 uppercase">
                {t('search.articles')}
              </span>
            </div>
            <div className="flex flex-col text-right">
              <span className="text-sm font-black text-purple-600 bg-purple-50 px-2.5 py-1 rounded-xl border border-purple-100">
                {adminStats.contentMetrics.captions}
              </span>
              <span className="text-[9px] text-slate-400 font-bold mt-1">
                {t('overview.admin.totalCaptions')}
              </span>
            </div>
          </div>

          <div className="h-1.5 w-full bg-slate-100 rounded-full mt-4 overflow-hidden relative">
            <div className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" style={{ width: '80%' }} />
          </div>
        </div>

        {/* KPI 3: Pipeline Performance */}
        <div className="bg-white border border-slate-200/60 rounded-[32px] p-6 shadow-sm flex flex-col justify-between h-[240px] relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute top-0 right-0 w-[120px] h-[120px] bg-gradient-to-bl from-cyan-500/5 to-emerald-500/5 rounded-bl-[100px] pointer-events-none" />
          
          <div className="flex justify-between items-start">
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 font-mono tracking-wider font-extrabold uppercase">
                {t('overview.admin.pipelinePerformance')}
              </span>
              <h2 className="text-base font-extrabold text-slate-800 mt-0.5">
                {t('overview.admin.totalPipelines')}
              </h2>
            </div>
            <div className="w-9 h-9 rounded-xl bg-cyan-50 border border-cyan-100 flex items-center justify-center text-cyan-600">
              <Terminal size={16} />
            </div>
          </div>

          <div className="flex items-end justify-between mt-2">
            <div className="flex flex-col">
              <span className="text-4xl font-black text-slate-900 tracking-tight">
                {adminStats.pipelineMetrics.total}
              </span>
              <span className="text-[10px] text-slate-400 font-black mt-1 uppercase">
                {t('archive.tabHistory')}
              </span>
            </div>
            <div className="flex flex-col text-right gap-1 font-semibold text-[10px]">
              <span className="text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded-lg border border-cyan-100 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
                {adminStats.pipelineMetrics.running} {t('overview.admin.runningPipelines')}
              </span>
              <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-100 flex items-center gap-1">
                <AlertTriangle size={10} />
                {adminStats.pipelineMetrics.failed} {t('overview.admin.failedPipelines')}
              </span>
            </div>
          </div>

          <div className="h-1.5 w-full bg-slate-100 rounded-full mt-4 overflow-hidden relative">
            <div 
              className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-full" 
              style={{ width: `${adminStats.pipelineMetrics.total > 0 ? ((adminStats.pipelineMetrics.total - adminStats.pipelineMetrics.failed) / adminStats.pipelineMetrics.total) * 100 : 100}%` }} 
            />
          </div>
        </div>

        {/* KPI 4: Global Post Status */}
        <div className="bg-white border border-slate-200/60 rounded-[32px] p-6 shadow-sm flex flex-col justify-between h-[240px] relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute top-0 right-0 w-[120px] h-[120px] bg-gradient-to-bl from-emerald-500/5 to-amber-500/5 rounded-bl-[100px] pointer-events-none" />
          
          <div className="flex justify-between items-start">
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 font-mono tracking-wider font-extrabold uppercase">
                {t('overview.admin.globalPostStatus')}
              </span>
              <h2 className="text-base font-extrabold text-slate-800 mt-0.5">
                {t('overview.admin.totalScheduled')}
              </h2>
            </div>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <CheckCircle2 size={16} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-2">
            <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-2 flex flex-col">
              <span className="text-[9px] text-emerald-700 font-black uppercase">{t('overview.admin.postedStatus')}</span>
              <span className="text-xl font-black text-emerald-800 mt-0.5">{adminStats.postMetrics.posted}</span>
            </div>
            <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-2 flex flex-col">
              <span className="text-[9px] text-amber-700 font-black uppercase">{t('overview.admin.pendingStatus')}</span>
              <span className="text-xl font-black text-amber-800 mt-0.5">{adminStats.postMetrics.pending}</span>
            </div>
            <div className="bg-rose-50/50 border border-rose-100 rounded-xl p-2 flex flex-col">
              <span className="text-[9px] text-rose-700 font-black uppercase">{t('overview.admin.failedStatus')}</span>
              <span className="text-xl font-black text-rose-800 mt-0.5">{adminStats.postMetrics.failed}</span>
            </div>
            <div className="bg-slate-50 border border-slate-200/50 rounded-xl p-2 flex flex-col">
              <span className="text-[9px] text-slate-500 font-black uppercase">{t('overview.admin.cancelledStatus')}</span>
              <span className="text-xl font-black text-slate-650 mt-0.5">{adminStats.postMetrics.cancelled}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Global Charts & Platforms Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Publications Volume Chart (2/3 width) */}
        <div className="lg:col-span-2 bg-white border border-slate-200/60 rounded-[32px] p-6 shadow-sm relative overflow-hidden flex flex-col gap-6">
          <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-gradient-to-bl from-indigo-500/5 to-transparent pointer-events-none" />
          
          <div className="flex justify-between items-start">
            <div className="flex flex-col">
              <span className="text-[10px] text-indigo-500 font-mono tracking-wider font-extrabold uppercase">
                {t('overview.admin.chartSubtitle')}
              </span>
              <h2 className="text-lg font-extrabold text-slate-800 mt-0.5">
                {t('overview.admin.chartTitle')}
              </h2>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-450 font-bold bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
              <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-indigo-600 to-cyan-400" />
              <span>{t('overview.admin.totalVolume')}</span>
            </div>
          </div>

          {/* Interactive Chart */}
          <div className="h-[220px] w-full flex items-end justify-between px-6 pb-6 relative mt-2">
            
            {/* Horizontal lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none z-0 px-6 pb-12 pt-6">
              <div className="border-b border-slate-100 w-full h-[1px]" />
              <div className="border-b border-slate-100 w-full h-[1px]" />
              <div className="border-b border-slate-100 w-full h-[1px]" />
              <div className="border-b border-slate-100 w-full h-[1px]" />
            </div>

            {adminStats.dailyVolume.map((d, i) => {
              const heightPct = (d.count / maxPostVolume) * 80;
              return (
                <div key={i} className="flex flex-col items-center gap-3 w-full group relative z-10">
                  {/* Tooltip */}
                  <div className="absolute bottom-[calc(100%+8px)] bg-slate-800 text-white text-[9px] font-black px-2.5 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none shadow-md z-30 flex items-center gap-1">
                    <span>{d.count}</span>
                    <span>{language === 'vi' ? 'bài' : 'posts'}</span>
                  </div>
                  
                  {/* Bar */}
                  <div className="w-8 bg-slate-50 rounded-2xl h-[120px] flex items-end overflow-hidden border border-slate-100">
                    <div 
                      className="w-full bg-gradient-to-t from-indigo-600 to-cyan-400 rounded-2xl group-hover:scale-y-[1.03] transition-all duration-500 origin-bottom"
                      style={{ height: `${heightPct}%`, minHeight: d.count > 0 ? '8px' : '0' }}
                    />
                  </div>
                  
                  {/* Label */}
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

        {/* Platform Share (1/3 width) */}
        <div className="bg-white border border-slate-200/60 rounded-[32px] p-6 shadow-sm flex flex-col justify-between h-full relative overflow-hidden">
          
          <div className="flex justify-between items-start">
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 font-mono tracking-wider font-extrabold uppercase">
                {t('contentCalendar.platforms')}
              </span>
              <h2 className="text-base font-extrabold text-slate-800 mt-0.5">
                {t('overview.topPlatform')}
              </h2>
            </div>
          </div>

          <div className="flex flex-col gap-4 my-6">
            {/* FB Share */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <Facebook size={14} className="text-[#1877F2] fill-[#1877F2]" />
                  <span>Facebook</span>
                </span>
                <span>{getPercent(adminStats.postMetrics.facebook)}% ({adminStats.postMetrics.facebook})</span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full" style={{ width: `${getPercent(adminStats.postMetrics.facebook)}%` }} />
              </div>
            </div>

            {/* Insta Share */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <Instagram size={14} className="text-pink-500" />
                  <span>Instagram</span>
                </span>
                <span>{getPercent(adminStats.postMetrics.instagram)}% ({adminStats.postMetrics.instagram})</span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-pink-550 to-rose-450 rounded-full" style={{ width: `${getPercent(adminStats.postMetrics.instagram)}%` }} />
              </div>
            </div>

            {/* Threads Share */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <ThreadsIcon size={14} className="text-black" />
                  <span>Threads</span>
                </span>
                <span>{getPercent(adminStats.postMetrics.threads)}% ({adminStats.postMetrics.threads})</span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-slate-900 to-slate-600 rounded-full" style={{ width: `${getPercent(adminStats.postMetrics.threads)}%` }} />
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center text-xs text-slate-400 font-bold border-t border-slate-100 pt-4">
            <span>{t('contentCalendar.activeCampaigns')}</span>
            <span className="text-slate-700">{adminStats.postMetrics.totalShare} posts</span>
          </div>
        </div>

      </div>

      {/* Admin Dual Feeds: Audit Logs and Pipeline Runs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Live Feeds Table (2/3 width) */}
        <div className="lg:col-span-2 bg-white border border-slate-200/60 rounded-[32px] p-6 shadow-sm flex flex-col gap-5">
          
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 pb-3 border-b border-slate-100/60">
            <div className="flex flex-col">
              <h2 className="text-lg font-extrabold text-slate-800">
                {t('overview.admin.systemFeeds')}
              </h2>
            </div>
            
            {/* Tabs selector */}
            <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200/40 text-xs self-start sm:self-auto">
              <button 
                onClick={() => setActiveTab('audit')}
                className={`px-3 py-1.5 rounded-lg font-black transition-all cursor-pointer ${activeTab === 'audit' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                {t('overview.admin.recentAuditLogs')}
              </button>
              <button 
                onClick={() => setActiveTab('pipeline')}
                className={`px-3 py-1.5 rounded-lg font-black transition-all cursor-pointer ${activeTab === 'pipeline' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                {t('overview.admin.recentPipelineRuns')}
              </button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'audit' ? (
              <motion.div 
                key="audit-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-4"
              >
                {adminStats.recentAuditLogs.length === 0 ? (
                  <div className="py-8 text-center text-sm font-medium text-slate-400">
                    {t('overview.admin.noAuditLogs')}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-400 font-extrabold uppercase tracking-wider">
                          <th className="py-2.5">{t('overview.admin.action')}</th>
                          <th className="py-2.5">{t('overview.admin.actor')}</th>
                          <th className="py-2.5">{t('overview.admin.target')}</th>
                          <th className="py-2.5 text-right">{t('overview.admin.time')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adminStats.recentAuditLogs.map((log: any) => {
                          const timeStr = new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' · ' + new Date(log.created_at).toLocaleDateString([], { day: 'numeric', month: 'numeric' });
                          return (
                            <tr key={log.id} className="border-b border-slate-100/50 hover:bg-slate-50/50 transition-colors">
                              <td className="py-3 font-bold text-slate-800 max-w-[150px] truncate">{log.action}</td>
                              <td className="py-3 text-slate-500 font-medium">{log.actor_email}</td>
                              <td className="py-3 text-slate-500 font-medium">{log.target_email || 'System'}</td>
                              <td className="py-3 text-slate-400 font-mono text-right">{timeStr}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                
                <div className="flex justify-end pt-2">
                  <Link 
                    href="/admin/audit-logs"
                    className="flex items-center gap-1 text-xs font-black text-indigo-650 bg-indigo-50 hover:bg-indigo-100 px-3.5 py-2 rounded-xl transition-all cursor-pointer decoration-none"
                  >
                    <span>{t('overview.admin.viewAllAuditLogs')}</span>
                    <ChevronRight size={13} />
                  </Link>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="pipeline-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-4"
              >
                {adminStats.recentPipelineRuns.length === 0 ? (
                  <div className="py-8 text-center text-sm font-medium text-slate-400">
                    {t('overview.admin.noPipelineRuns')}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-400 font-extrabold uppercase tracking-wider">
                          <th className="py-2.5">{t('overview.admin.pipelineUrl')}</th>
                          <th className="py-2.5">{t('overview.admin.pipelineStatus')}</th>
                          <th className="py-2.5 text-right">{t('overview.admin.pipelineStarted')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adminStats.recentPipelineRuns.map((run: any) => {
                          const timeStr = new Date(run.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' · ' + new Date(run.started_at).toLocaleDateString([], { day: 'numeric', month: 'numeric' });
                          return (
                            <tr key={run.id} className="border-b border-slate-100/50 hover:bg-slate-50/50 transition-colors">
                              <td className="py-3 font-bold text-indigo-650 max-w-[200px] truncate flex items-center gap-1">
                                <LinkIcon size={12} className="text-slate-400 shrink-0" />
                                <a href={run.url} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-0.5">
                                  {run.url}
                                  <ExternalLink size={10} className="text-slate-400" />
                                </a>
                              </td>
                              <td className="py-3">
                                <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                                  run.status === 'success' || run.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                  run.status === 'failed' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-cyan-50 text-cyan-600 border border-cyan-100'
                                }`}>
                                  {run.status === 'running' && <Loader2 size={8} className="animate-spin inline mr-1" />}
                                  {run.status}
                                </span>
                              </td>
                              <td className="py-3 text-slate-400 font-mono text-right">{timeStr}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

        </div>

        {/* Quick Actions Panel (1/3 width) */}
        <div className="bg-white border border-slate-200/60 rounded-[32px] p-6 shadow-sm flex flex-col gap-5 justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[120px] h-[120px] bg-gradient-to-bl from-indigo-500/5 to-purple-500/5 rounded-bl-[100px] pointer-events-none" />
          
          <div className="flex flex-col gap-1 z-10">
            <span className="text-[10px] text-indigo-500 font-mono tracking-wider font-extrabold uppercase">
              {t('overview.admin.quickActions')}
            </span>
            <h2 className="text-lg font-extrabold text-slate-800">
              {t('overview.admin.quickActions')}
            </h2>
          </div>

          <div className="flex flex-col gap-3 my-2 z-10">
            
            {/* Quick Action 1: User management */}
            <Link 
              href="/admin/users" 
              className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-indigo-50/50 border border-slate-200/50 rounded-2xl group transition-all text-slate-700 decoration-none"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-600 group-hover:text-indigo-650 group-hover:border-indigo-100 transition-colors shadow-sm">
                  <Users size={16} />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-black text-slate-850 group-hover:text-indigo-700 transition-colors">
                    {t('overview.admin.goToUserManagement')}
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold leading-normal">
                    {t('admin.consoleDesc')}
                  </span>
                </div>
              </div>
              <ChevronRight size={14} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </Link>

            {/* Quick Action 2: Landing editor */}
            <Link 
              href="/admin/landing-editor" 
              className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-purple-50/50 border border-slate-200/50 rounded-2xl group transition-all text-slate-700 decoration-none"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-600 group-hover:text-purple-650 group-hover:border-purple-100 transition-colors shadow-sm">
                  <Globe size={16} />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-black text-slate-850 group-hover:text-purple-700 transition-colors">
                    {t('overview.admin.goToLandingEditor')}
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold leading-normal">
                    {t('sidebar.landingEditor')}
                  </span>
                </div>
              </div>
              <ChevronRight size={14} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </Link>

            {/* Quick Action 3: Audit logs */}
            <Link 
              href="/admin/audit-logs" 
              className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-cyan-50/50 border border-slate-200/50 rounded-2xl group transition-all text-slate-700 decoration-none"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-600 group-hover:text-cyan-650 group-hover:border-cyan-100 transition-colors shadow-sm">
                  <Activity size={16} />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-black text-slate-850 group-hover:text-cyan-700 transition-colors">
                    {t('overview.admin.goToAuditLogs')}
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold leading-normal">
                    {t('admin.systemLogsDesc')}
                  </span>
                </div>
              </div>
              <ChevronRight size={14} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </Link>

          </div>

          <div className="flex justify-between items-center text-[10px] text-slate-450 font-bold border-t border-slate-100 pt-3 z-10">
            <span>AntBiz Security Control</span>
            <span className="flex items-center gap-0.5 text-indigo-600">
              <Clock size={10} /> Live sync
            </span>
          </div>
        </div>

      </div>

    </div>
  );
}
