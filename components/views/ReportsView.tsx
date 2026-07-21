"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3,
  Download,
  ThumbsUp,
  MessageCircle,
  Share2,
  MousePointerClick,
  Users as UsersIcon,
  Eye,
  Calendar,
  User as UserIcon,
  Globe,
  AlertTriangle,
  Loader2,
  Facebook,
  Instagram,
  ChevronDown,
  ArrowUpDown,
  RefreshCw
} from "lucide-react";
import dynamic from "next/dynamic";
import { InstagramGoldenHoursCard } from "./reports/InstagramGoldenHoursCard";
import { FacebookMetricsCard } from "./reports/FacebookMetricsCard";
import { ThreadsMetricsCard } from "./reports/ThreadsMetricsCard";

// Threads Custom SVG Logo
const ThreadsIcon = ({ size = 16, className = "" }: { size?: number; className?: string }) => (
  <svg viewBox="0 0 192 192" width={size} height={size} fill="currentColor" className={className}>
    <path d="M141.537 88.9883C140.71 88.5919 139.87 88.2104 139.019 87.8451C137.537 60.5382 122.616 44.905 97.5619 44.745C97.4484 44.7443 97.3355 44.7443 97.222 44.7443C82.2364 44.7443 69.7731 51.1409 62.102 62.7807L75.881 72.2328C81.6116 63.5383 90.6052 61.6848 97.2286 61.6848C97.3051 61.6848 97.3819 61.6848 97.4576 61.6855C105.707 61.7381 111.932 64.1366 115.961 68.814C118.893 72.2193 120.854 76.925 121.825 82.8638C114.511 81.6207 106.601 81.2385 98.145 81.7233C74.3247 83.0954 59.0111 96.9879 60.0396 116.292C60.5615 126.084 65.4397 134.508 73.775 140.011C80.8224 144.663 89.899 146.938 99.3323 146.423C111.79 145.74 121.563 140.987 128.381 132.296C133.559 125.696 136.834 117.143 138.28 106.366C144.217 109.949 148.617 114.664 151.047 120.332C155.179 129.967 155.42 145.8 142.501 158.708C131.182 170.016 117.576 174.908 97.0135 175.059C74.2042 174.89 56.9538 167.575 45.7381 153.317C35.2355 139.966 29.8077 120.682 29.6052 96C29.8077 71.3178 35.2355 52.0336 45.7381 38.6827C56.9538 24.4249 74.2039 17.11 97.0132 16.9405C119.988 17.1113 137.539 24.4614 149.184 38.788C154.894 45.8136 159.199 54.6488 162.037 64.9503L178.184 60.6422C174.744 47.9622 169.331 37.0357 161.965 27.974C147.036 9.60668 125.202 0.195148 97.0695 0H96.9569C68.8816 0.19447 47.2921 9.6418 32.7883 28.0793C19.8819 44.4864 13.2244 67.3157 13.0007 95.9325L13 96L13.0007 96.0675C13.2244 124.684 19.8819 147.514 32.7883 163.921C47.2921 182.358 68.8816 191.806 96.9569 192H97.0695C122.03 191.827 139.624 185.292 154.118 170.811C173.081 151.866 172.51 128.119 166.26 113.541C161.776 103.087 153.227 94.5962 141.537 88.9883ZM98.4405 129.507C88.0005 130.095 77.1544 125.409 76.6196 115.372C76.2232 107.93 81.9158 99.626 99.0812 98.6368C101.047 98.5234 102.976 98.468 104.871 98.468C111.106 98.468 116.939 99.0737 122.242 100.233C120.264 124.935 108.662 128.946 98.4405 129.507Z" />
  </svg>
);

// Dynamic Recharts Imports for next.js SSR safety
const ResponsiveContainer = dynamic(
  () => import("recharts").then((mod) => mod.ResponsiveContainer),
  { ssr: false }
);
const AreaChart = dynamic(
  () => import("recharts").then((mod) => mod.AreaChart),
  { ssr: false }
);
const Area = dynamic(
  () => import("recharts").then((mod) => mod.Area),
  { ssr: false }
);
const XAxis = dynamic(
  () => import("recharts").then((mod) => mod.XAxis),
  { ssr: false }
);
const YAxis = dynamic(
  () => import("recharts").then((mod) => mod.YAxis),
  { ssr: false }
);
const CartesianGrid = dynamic(
  () => import("recharts").then((mod) => mod.CartesianGrid),
  { ssr: false }
);
const Tooltip = dynamic(
  () => import("recharts").then((mod) => mod.Tooltip),
  { ssr: false }
);
const Legend = dynamic(
  () => import("recharts").then((mod) => mod.Legend),
  { ssr: false }
);
const PieChart = dynamic(
  () => import("recharts").then((mod) => mod.PieChart),
  { ssr: false }
);
const Pie = dynamic(
  () => import("recharts").then((mod) => mod.Pie),
  { ssr: false }
);
const Cell = dynamic(
  () => import("recharts").then((mod) => mod.Cell),
  { ssr: false }
);

interface ReportData {
  summary: {
    totalPosts: number;
    postedPosts: number;
    successRate: number;
    totalLikes: number;
    totalComments: number;
    totalShares: number;
    totalClicks: number;
    totalReach: number;
    totalImpressions: number;
  };
  chartData: any[];
  topPosts: any[];
  platformBreakdown?: {
    [key: string]: {
      posts: number;
      likes: number;
      comments: number;
      shares: number;
      clicks: number;
      reach: number;
      impressions: number;
    };
  };
  isMigrationMissing: boolean;
}

export default function ReportsView() {
  const { t, language } = useLanguage();
  const supabase = createClient();

  const [timeframe, setTimeframe] = useState<string>("7days");
  const [platform, setPlatform] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [reporterName, setReporterName] = useState<string>("");
  
  const [loading, setLoading] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  
  // Sort state for Top Posts table
  const [sortField, setSortField] = useState<string>("interactions.likes");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Load User Info for default reporter name
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const fullName = user.user_metadata?.full_name || user.email?.split("@")[0] || "Marketer";
        setReporterName(fullName);
      }
    };
    fetchUser();
  }, [supabase]);

  // Load reports stats data
  const loadStats = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        timeframe,
        platform,
        ...(timeframe === "custom" && startDate ? { startDate } : {}),
        ...(timeframe === "custom" && endDate ? { endDate } : {}),
      });

      const res = await fetch(`/api/reports/stats?${queryParams.toString()}`);
      if (!res.ok) throw new Error("Không thể tải báo cáo");
      const data = await res.json();
      setReportData(data);
    } catch (err) {
      console.error("Lỗi khi tải dữ liệu báo cáo:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (timeframe !== "custom" || (startDate && endDate)) {
      loadStats();
    }
  }, [timeframe, platform, startDate, endDate]);

  const handleSync = async () => {
    try {
      setIsSyncing(true);
      const res = await fetch(`/api/reports/sync?platform=${platform}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Lỗi đồng bộ dữ liệu");
      } else {
        alert(data.message || "Đồng bộ thành công!");
        loadStats(); // Tải lại biểu đồ
      }
    } catch (err) {
      console.error("Lỗi đồng bộ:", err);
      alert("Đã xảy ra lỗi khi đồng bộ dữ liệu.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const queryParams = new URLSearchParams({
        timeframe,
        platform,
        createdBy: reporterName || "Thành viên AntBiz",
        ...(timeframe === "custom" && startDate ? { startDate } : {}),
        ...(timeframe === "custom" && endDate ? { endDate } : {}),
      });

      const res = await fetch(`/api/reports/export?${queryParams.toString()}`);
      if (!res.ok) throw new Error("Xuất báo cáo thất bại");
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      
      // Parse filename from Content-Disposition header
      const disposition = res.headers.get("content-disposition");
      let filename = `Bao_cao_truyen_thong_${timeframe}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      if (disposition && disposition.indexOf("attachment") !== -1) {
        const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
        const matches = filenameRegex.exec(disposition);
        if (matches != null && matches[1]) {
          filename = matches[1].replace(/['"]/g, "");
        }
      }
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Lỗi xuất báo cáo:", error);
      alert("Đã xảy ra lỗi khi xuất file Excel. Vui lòng thử lại.");
    } finally {
      setIsExporting(false);
    }
  };

  const getSortedPosts = () => {
    if (!reportData?.topPosts) return [];
    
    return [...reportData.topPosts].sort((a, b) => {
      let valA = a;
      let valB = b;
      
      const fields = sortField.split(".");
      fields.forEach(f => {
        valA = valA ? valA[f] : 0;
        valB = valB ? valB[f] : 0;
      });

      const numA = typeof valA === "number" ? valA : 0;
      const numB = typeof valB === "number" ? valB : 0;
      
      if (sortDirection === "asc") {
        return numA - numB;
      }
      return numB - numA;
    });
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const activeSortedPosts = getSortedPosts();

  const totalEngagements = reportData 
    ? (reportData.summary.totalLikes + reportData.summary.totalComments + reportData.summary.totalShares)
    : 0;
  
  const engagementRate = reportData && reportData.summary.totalReach > 0
    ? ((totalEngagements / reportData.summary.totalReach) * 100).toFixed(2)
    : "0.00";

  const getPlatformPieData = () => {
    if (!reportData?.platformBreakdown) return [];
    const bd = reportData.platformBreakdown;
    
    let data = [
      { name: "Facebook", value: bd.facebook.likes + bd.facebook.comments + bd.facebook.shares, color: "#1877F2" },
      { name: "Instagram", value: bd.instagram.likes + bd.instagram.comments + bd.instagram.shares, color: "#E1306C" },
      { name: "Threads", value: bd.threads.likes + bd.threads.comments + bd.threads.shares, color: "#10B981" },
    ];
    
    const totalVal = data.reduce((acc, curr) => acc + curr.value, 0);
    if (totalVal === 0) {
      data = [
        { name: "Facebook", value: bd.facebook.posts, color: "#1877F2" },
        { name: "Instagram", value: bd.instagram.posts, color: "#E1306C" },
        { name: "Threads", value: bd.threads.posts, color: "#6B7280" },
      ];
    }
    return data.filter(item => item.value > 0);
  };

  const pieData = getPlatformPieData();

  const getPlatformStyle = (p: string) => {
    switch (p.toLowerCase()) {
      case "facebook":
        return { color: "text-[#1877F2]", bg: "bg-[#1877F2]/10", border: "border-[#1877F2]/20" };
      case "instagram":
        return { color: "text-[#E1306C]", bg: "bg-[#E1306C]/10", border: "border-[#E1306C]/20" };
      case "thread":
      case "threads":
        return { color: "text-black dark:text-white", bg: "bg-black/5 dark:bg-white/10", border: "border-black/10 dark:border-white/20" };
      default:
        return { color: "text-primary", bg: "bg-primary/10", border: "border-primary/20" };
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 p-4 md:p-6 lg:p-8 min-h-screen text-foreground transition-all duration-300">
      
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-gray-200/60 dark:border-zinc-800">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white flex items-center gap-3">
            <BarChart3 className="text-primary w-8 h-8" />
            {t("reports.title")}
          </h1>
          <p className="text-sm text-text-muted mt-1">
            {t("reports.subtitle")}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 px-3 py-2 rounded-xl shadow-sm border border-gray-200/50 dark:border-zinc-800">
            <UserIcon size={16} className="text-text-muted" />
            <input
              type="text"
              value={reporterName}
              onChange={(e) => setReporterName(e.target.value)}
              placeholder={t("reports.reporterPlaceholder")}
              className="bg-transparent text-sm focus:outline-none border-none outline-none w-[160px] font-medium"
            />
          </div>

          <button
            onClick={handleSync}
            disabled={isSyncing || loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 cursor-pointer text-sm"
          >
            {isSyncing ? (
              <RefreshCw className="animate-spin" size={16} />
            ) : (
              <RefreshCw size={16} />
            )}
            Đồng bộ ngay
          </button>

          <button
            onClick={handleExport}
            disabled={isExporting || loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 cursor-pointer text-sm"
          >
            {isExporting ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              <Download size={16} />
            )}
            {t("reports.exportExcel")}
          </button>
        </div>
      </div>

      {/* RLS Migration warning */}
      {reportData?.isMigrationMissing && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-3.5 text-amber-600 dark:text-amber-400"
        >
          <AlertTriangle className="shrink-0 mt-0.5" size={20} />
          <div>
            <h4 className="font-bold text-sm">Chế độ Xem trước Mô phỏng</h4>
            <p className="text-xs mt-1 leading-relaxed">
              {t("reports.migrationWarning")}
            </p>
          </div>
        </motion.div>
      )}

      {/* Filter and settings bar */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200/60 dark:border-zinc-800 shadow-sm">
        
        {/* Left side: Timeframe & Custom Date Inputs */}
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-end gap-4 flex-1">
          {/* Timeframe selector */}
          <div className="flex flex-col gap-1.5 min-w-[200px]">
            <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">
              {t("reports.timeframe")}
            </label>
            <div className="relative">
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                className="w-full bg-gray-50 dark:bg-zinc-950 border border-gray-200/60 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer"
              >
                <option value="7days">{t("reports.timeframes.7days")}</option>
                <option value="30days">{t("reports.timeframes.30days")}</option>
                <option value="thisMonth">{t("reports.timeframes.thisMonth")}</option>
                <option value="lastMonth">{t("reports.timeframes.lastMonth")}</option>
                <option value="custom">{t("reports.timeframes.custom")}</option>
              </select>
              <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" size={16} />
            </div>
          </div>

          {/* Custom date range inputs */}
          {timeframe === "custom" && (
            <div className="flex flex-col sm:flex-row gap-4 flex-1 sm:flex-initial">
              <div className="flex flex-col gap-1.5 min-w-[150px] flex-1">
                <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Từ ngày</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-zinc-950 border border-gray-200/60 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="flex flex-col gap-1.5 min-w-[150px] flex-1">
                <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Đến ngày</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-zinc-950 border border-gray-200/60 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          )}
        </div>

        {/* Right side: Platform selection Tabs */}
        <div className="flex flex-col gap-1.5 shrink-0 w-full lg:w-auto">
          <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">
            {t("reports.platform")}
          </label>
          <div className="flex gap-1.5 bg-gray-50 dark:bg-zinc-950 p-1 rounded-xl border border-gray-200/60 dark:border-zinc-800 overflow-x-auto whitespace-nowrap scrollbar-none max-w-full">
            <button
              onClick={() => setPlatform("all")}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                platform === "all"
                  ? "bg-primary text-white shadow-sm"
                  : "text-text-muted hover:text-text"
              }`}
            >
              <Globe size={13} />
              {t("reports.allPlatforms")}
            </button>
            <button
              onClick={() => setPlatform("facebook")}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                platform === "facebook"
                  ? "bg-[#1877F2] text-white shadow-sm"
                  : "text-text-muted hover:text-[#1877F2]"
              }`}
            >
              <Facebook size={13} className="fill-current" />
              Facebook
            </button>
            <button
              onClick={() => setPlatform("instagram")}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                platform === "instagram"
                  ? "bg-[#E1306C] text-white shadow-sm"
                  : "text-text-muted hover:text-[#E1306C]"
              }`}
            >
              <Instagram size={13} />
              Instagram
            </button>
            <button
              onClick={() => setPlatform("threads")}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                platform === "threads"
                  ? "bg-black dark:bg-white text-white dark:text-black shadow-sm"
                  : "text-text-muted hover:text-black dark:hover:text-white"
              }`}
            >
              <ThreadsIcon size={13} />
              Threads
            </button>
          </div>
        </div>

      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="animate-spin text-primary" size={48} />
          <p className="text-sm font-semibold text-text-muted">Đang tính toán các chỉ số thống kê...</p>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {reportData && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              {/* Metric grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                
                {/* Total posts */}
                <div className="bg-white dark:bg-zinc-900 border border-gray-200/60 dark:border-zinc-800/80 p-5 rounded-2xl shadow-sm hover:scale-[1.02] transition-transform duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">{t("reports.totalPosts")}</span>
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold">#</div>
                  </div>
                  <h3 className="text-2xl font-black mt-3 text-gray-900 dark:text-white">
                    {reportData.summary.totalPosts}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-text-muted mt-2">
                    <span className="font-semibold text-green-500">{reportData.summary.postedPosts}</span> {t("reports.postedPosts").toLowerCase()}
                  </div>
                </div>

                {/* Success Rate */}
                <div className="bg-white dark:bg-zinc-900 border border-gray-200/60 dark:border-zinc-800/80 p-5 rounded-2xl shadow-sm hover:scale-[1.02] transition-transform duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">{t("reports.successRate")}</span>
                    <div className="w-8 h-8 rounded-lg bg-green-500/10 text-green-500 flex items-center justify-center font-bold">%</div>
                  </div>
                  <h3 className="text-2xl font-black mt-3 text-gray-900 dark:text-white">
                    {reportData.summary.successRate}%
                  </h3>
                  {/* Styled mini bar */}
                  <div className="w-full bg-gray-100 dark:bg-zinc-800 h-1.5 rounded-full mt-3 overflow-hidden">
                    <div className="bg-green-500 h-full rounded-full" style={{ width: `${reportData.summary.successRate}%` }}></div>
                  </div>
                </div>

                {/* Engagement Rate */}
                <div className="bg-white dark:bg-zinc-900 border border-gray-200/60 dark:border-zinc-800/80 p-5 rounded-2xl shadow-sm hover:scale-[1.02] transition-transform duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Tỷ lệ tương tác</span>
                    <div className="w-8 h-8 rounded-lg bg-pink-500/10 text-pink-500 flex items-center justify-center font-bold">%</div>
                  </div>
                  <h3 className="text-2xl font-black mt-3 text-gray-900 dark:text-white">
                    {engagementRate}%
                  </h3>
                  {/* Styled mini bar */}
                  <div className="w-full bg-gray-100 dark:bg-zinc-800 h-1.5 rounded-full mt-3 overflow-hidden">
                    <div className="bg-pink-500 h-full rounded-full" style={{ width: `${Math.min(parseFloat(engagementRate), 100)}%` }}></div>
                  </div>
                </div>

                {/* Reach */}
                <div className="bg-white dark:bg-zinc-900 border border-gray-200/60 dark:border-zinc-800/80 p-5 rounded-2xl shadow-sm hover:scale-[1.02] transition-transform duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">{t("reports.reach")}</span>
                    <UsersIcon className="text-amber-500" size={20} />
                  </div>
                  <h3 className="text-2xl font-black mt-3 text-gray-900 dark:text-white">
                    {reportData.summary.totalReach.toLocaleString("vi-VN")}
                  </h3>
                  <p className="text-xs text-text-muted mt-2">Tổng tài khoản tiếp cận</p>
                </div>

                {/* Impressions */}
                <div className="bg-white dark:bg-zinc-900 border border-gray-200/60 dark:border-zinc-800/80 p-5 rounded-2xl shadow-sm hover:scale-[1.02] transition-transform duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">{t("reports.impressions")}</span>
                    <Eye className="text-emerald-500" size={20} />
                  </div>
                  <h3 className="text-2xl font-black mt-3 text-gray-900 dark:text-white">
                    {reportData.summary.totalImpressions.toLocaleString("vi-VN")}
                  </h3>
                  <p className="text-xs text-text-muted mt-2">Tổng lượt hiển thị bài</p>
                </div>

                {/* Engagements */}
                <div className="bg-white dark:bg-zinc-900 border border-gray-200/60 dark:border-zinc-800/80 p-5 rounded-2xl shadow-sm hover:scale-[1.02] transition-transform duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Tương tác</span>
                    <ThumbsUp className="text-sky-500" size={18} />
                  </div>
                  <h3 className="text-2xl font-black mt-3 text-gray-900 dark:text-white">
                    {totalEngagements.toLocaleString("vi-VN")}
                  </h3>
                  <p className="text-xs text-text-muted mt-2">Likes, Comments & Shares</p>
                </div>

              </div>

              {/* Platform specific Cards */}
              {platform === "facebook" && (
                <FacebookMetricsCard data={reportData.platformBreakdown?.facebook || reportData.summary} />
              )}
              {platform === "threads" && (
                <ThreadsMetricsCard data={reportData.platformBreakdown?.threads || reportData.summary} />
              )}

              {/* AI Golden Hours Analytics Card */}
              <InstagramGoldenHoursCard platform={platform} />

              {/* Interactions Breakdown Bar */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-zinc-950 rounded-2xl border border-gray-200/60 dark:border-zinc-800 shadow-inner">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-pink-500/10 text-pink-500 flex items-center justify-center">
                    <ThumbsUp size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-text-muted">Tổng Lượt Thích</p>
                    <p className="text-base font-black text-gray-900 dark:text-white">{reportData.summary.totalLikes.toLocaleString("vi-VN")}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                    <MessageCircle size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-text-muted">Tổng Bình Luận</p>
                    <p className="text-base font-black text-gray-900 dark:text-white">{reportData.summary.totalComments.toLocaleString("vi-VN")}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
                    <Share2 size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-text-muted">Tổng Lượt Chia Sẻ</p>
                    <p className="text-base font-black text-gray-900 dark:text-white">{reportData.summary.totalShares.toLocaleString("vi-VN")}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
                    <MousePointerClick size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-text-muted">Nhấp vào liên kết</p>
                    <p className="text-base font-black text-gray-900 dark:text-white">{reportData.summary.totalClicks.toLocaleString("vi-VN")}</p>
                  </div>
                </div>
              </div>

              {/* Chart section */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                
                {/* AreaChart (Xu hướng tương tác) */}
                <div className="xl:col-span-2 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-gray-200/60 dark:border-zinc-800 shadow-sm space-y-4">
                  <h3 className="text-lg font-black text-gray-900 dark:text-white">
                    {t("reports.chartTitle")}
                  </h3>
                  
                  <div className="h-[350px] w-full mt-4">
                    {reportData.chartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={reportData.chartData}
                          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                        >
                          <defs>
                            <linearGradient id="likesGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.4}/>
                              <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="commentsGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10B981" stopOpacity={0.4}/>
                              <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" className="dark:stroke-zinc-800" />
                          <XAxis 
                            dataKey="date" 
                            stroke="#9CA3AF" 
                            fontSize={11} 
                            tickLine={false} 
                            axisLine={false} 
                            dy={10} 
                          />
                          <YAxis 
                            stroke="#9CA3AF" 
                            fontSize={11} 
                            tickLine={false} 
                            axisLine={false} 
                            width={45}
                            tickFormatter={(value) => value.toLocaleString('vi-VN')}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "rgba(17, 24, 39, 0.95)",
                              borderRadius: "12px",
                              border: "none",
                              color: "#fff",
                              fontSize: "12px",
                              boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)"
                            }}
                            labelClassName="font-extrabold text-white mb-1.5"
                          />
                          <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} />
                          <Area 
                            type="monotone" 
                            dataKey="likes" 
                            name="Lượt thích" 
                            stroke="#4F46E5" 
                            strokeWidth={2.5} 
                            fillOpacity={1} 
                            fill="url(#likesGrad)" 
                          />
                          <Area 
                            type="monotone" 
                            dataKey="comments" 
                            name="Bình luận" 
                            stroke="#10B981" 
                            strokeWidth={2.5} 
                            fillOpacity={1} 
                            fill="url(#commentsGrad)" 
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-text-muted font-medium text-sm">
                        {t("reports.noData")}
                      </div>
                    )}
                  </div>
                </div>

                {/* PieChart (Phân phối tương tác theo nền tảng) */}
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-gray-200/60 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-black text-gray-900 dark:text-white">
                      Phân phối nền tảng
                    </h3>
                    <p className="text-xs text-text-muted mt-1">
                      Tỷ lệ tương tác thu nhận theo kênh truyền thông
                    </p>
                  </div>

                  <div className="h-[250px] w-full flex items-center justify-center relative mt-4">
                    {pieData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value: any) => [value.toLocaleString("vi-VN"), "Tương tác"]}
                            contentStyle={{
                              backgroundColor: "rgba(17, 24, 39, 0.95)",
                              borderRadius: "12px",
                              border: "none",
                              color: "#fff",
                              fontSize: "12px",
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="text-text-muted text-xs font-semibold">Chưa có dữ liệu nền tảng</div>
                    )}

                    {/* Centered label inside donut */}
                    {pieData.length > 0 && (
                      <div className="absolute flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider">Tổng tương tác</span>
                        <span className="text-xl font-black text-gray-900 dark:text-white mt-0.5">
                          {totalEngagements.toLocaleString("vi-VN")}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Legends list */}
                  <div className="grid grid-cols-3 gap-2 pt-4 border-t border-gray-100 dark:border-zinc-800/60 mt-4">
                    {pieData.map((item, idx) => {
                      const totalVal = pieData.reduce((acc, curr) => acc + curr.value, 0);
                      const percent = totalVal > 0 ? ((item.value / totalVal) * 100).toFixed(0) : 0;
                      return (
                        <div key={idx} className="flex flex-col items-center text-center">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                            <span className="text-[10px] font-extrabold text-gray-900 dark:text-white">{item.name}</span>
                          </div>
                          <span className="text-xs font-black mt-1 text-gray-900 dark:text-zinc-100">{percent}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* Top Posts Table */}
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200/60 dark:border-zinc-800 shadow-sm overflow-hidden space-y-4 py-6">
                <div className="px-6 flex items-center justify-between">
                  <h3 className="text-lg font-black text-gray-900 dark:text-white">
                    {t("reports.topPostsTitle")}
                  </h3>
                </div>

                {/* Desktop View Table */}
                <div className="hidden md:block overflow-x-auto w-full">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50/75 dark:bg-zinc-950/75 text-text-muted text-[11px] font-extrabold uppercase tracking-wider border-b border-gray-100 dark:border-zinc-800">
                        <th className="py-4 px-6 w-16 text-center">STT</th>
                        <th className="py-4 px-6">{t("reports.postTitle")}</th>
                        <th className="py-4 px-6 text-center w-36">
                          <button 
                            onClick={() => handleSort("posted_at")} 
                            className="flex items-center gap-1.5 mx-auto hover:text-text uppercase font-extrabold text-[11px] tracking-wider transition-colors"
                          >
                            {t("reports.postedAt")}
                            <ArrowUpDown size={12} />
                          </button>
                        </th>
                        <th className="py-4 px-6 text-center w-28">Nền tảng</th>
                        <th className="py-4 px-6 text-center w-24">
                          <button 
                            onClick={() => handleSort("interactions.likes")} 
                            className="flex items-center gap-1.5 mx-auto hover:text-text uppercase font-extrabold text-[11px] tracking-wider transition-colors"
                          >
                            Thích
                            <ArrowUpDown size={12} />
                          </button>
                        </th>
                        <th className="py-4 px-6 text-center w-24">
                          <button 
                            onClick={() => handleSort("interactions.comments")} 
                            className="flex items-center gap-1.5 mx-auto hover:text-text uppercase font-extrabold text-[11px] tracking-wider transition-colors"
                          >
                            Bình luận
                            <ArrowUpDown size={12} />
                          </button>
                        </th>
                        <th className="py-4 px-6 text-center w-24">Clicks</th>
                        <th className="py-4 px-6 text-center w-28">Tiếp cận</th>
                        <th className="py-4 px-6 text-center w-28">Hiển thị</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-zinc-800 text-sm font-semibold">
                      {activeSortedPosts.length > 0 ? (
                        activeSortedPosts.map((post, index) => {
                          const style = getPlatformStyle(post.platform);
                          const Icon = post.platform === "facebook" ? Facebook : post.platform === "instagram" ? Instagram : ThreadsIcon;
                          
                          return (
                            <tr 
                              key={post.id} 
                              className="hover:bg-gray-50/50 dark:hover:bg-zinc-950/20 transition-colors"
                            >
                              <td className="py-4 px-6 text-center text-text-muted font-bold">{index + 1}</td>
                              <td className="py-4 px-6 max-w-sm truncate text-gray-900 dark:text-white font-bold">
                                {post.title}
                              </td>
                              <td className="py-4 px-6 text-center text-xs text-text-muted">
                                {post.posted_at ? new Date(post.posted_at).toLocaleString("vi-VN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"}
                              </td>
                              <td className="py-4 px-6 text-center">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black ${style.bg} ${style.color} ${style.border} border`}>
                                  <Icon size={10} className={post.platform === "facebook" ? "fill-current" : ""} />
                                  {post.platform.toUpperCase()}
                                </span>
                              </td>
                              <td className="py-4 px-6 text-center text-gray-900 dark:text-zinc-100">{post.interactions.likes || 0}</td>
                              <td className="py-4 px-6 text-center text-gray-900 dark:text-zinc-100">{post.interactions.comments || 0}</td>
                              <td className="py-4 px-6 text-center text-gray-900 dark:text-zinc-100">{post.interactions.clicks || 0}</td>
                              <td className="py-4 px-6 text-center text-text-muted font-normal">{post.interactions.reach ? post.interactions.reach.toLocaleString("vi-VN") : 0}</td>
                              <td className="py-4 px-6 text-center text-text-muted font-normal">{post.interactions.impressions ? post.interactions.impressions.toLocaleString("vi-VN") : 0}</td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={9} className="py-8 text-center text-text-muted font-medium">
                            {t("reports.noData")}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View Card List */}
                <div className="block md:hidden space-y-4 px-4">
                  {activeSortedPosts.length > 0 ? (
                    activeSortedPosts.map((post, index) => {
                      const style = getPlatformStyle(post.platform);
                      const Icon = post.platform === "facebook" ? Facebook : post.platform === "instagram" ? Instagram : ThreadsIcon;
                      
                      return (
                        <div 
                          key={post.id} 
                          className="bg-gray-50 dark:bg-zinc-950 p-4 rounded-xl border border-gray-200/40 dark:border-zinc-800/80 space-y-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-text-muted bg-white dark:bg-zinc-900 w-6 h-6 rounded-full flex items-center justify-center border border-gray-200/60 dark:border-zinc-800">
                                {index + 1}
                              </span>
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black ${style.bg} ${style.color} ${style.border} border`}>
                                <Icon size={9} className={post.platform === "facebook" ? "fill-current" : ""} />
                                {post.platform.toUpperCase()}
                              </span>
                            </div>
                            <span className="text-[10px] text-text-muted">
                              {post.posted_at ? new Date(post.posted_at).toLocaleDateString("vi-VN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"}
                            </span>
                          </div>
                          
                          <h4 className="text-sm font-bold text-gray-900 dark:text-white line-clamp-2">
                            {post.title}
                          </h4>
                          
                          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-200/50 dark:border-zinc-800/60 text-center">
                            <div>
                              <p className="text-[9px] font-bold text-text-muted uppercase">Thích</p>
                              <p className="text-xs font-black text-gray-900 dark:text-zinc-100">{post.interactions.likes || 0}</p>
                            </div>
                            <div>
                              <p className="text-[9px] font-bold text-text-muted uppercase">Bình luận</p>
                              <p className="text-xs font-black text-gray-900 dark:text-zinc-100">{post.interactions.comments || 0}</p>
                            </div>
                            <div>
                              <p className="text-[9px] font-bold text-text-muted uppercase">Clicks</p>
                              <p className="text-xs font-black text-gray-900 dark:text-zinc-100">{post.interactions.clicks || 0}</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 pt-1.5 text-center bg-white dark:bg-zinc-900/40 rounded-lg p-2 border border-gray-100 dark:border-zinc-800/40">
                            <div>
                              <span className="text-[9px] text-text-muted">Tiếp cận: </span>
                              <span className="text-xs font-bold text-gray-900 dark:text-zinc-100">{post.interactions.reach ? post.interactions.reach.toLocaleString("vi-VN") : 0}</span>
                            </div>
                            <div>
                              <span className="text-[9px] text-text-muted">Hiển thị: </span>
                              <span className="text-xs font-bold text-gray-900 dark:text-zinc-100">{post.interactions.impressions ? post.interactions.impressions.toLocaleString("vi-VN") : 0}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-8 text-center text-text-muted font-medium text-sm">
                      {t("reports.noData")}
                    </div>
                  )}
                </div>
              </div>

            </motion.div>
          )}
        </AnimatePresence>
      )}

    </div>
  );
}
