"use client";

import React, { useState, useEffect, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
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
  User as UserIcon,
  Globe,
  AlertTriangle,
  Loader2,
  Facebook,
  Instagram,
  ChevronDown,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Search,
  RotateCcw,
  FileText,
  TrendingUp,
  TrendingDown,
  Activity,
  CheckCircle2
} from "lucide-react";
import dynamic from "next/dynamic";
import PopupDialog, { PopupType } from "@/components/PopupDialog";
import { ReportPreviewModal } from "./reports/ReportPreviewModal";

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
  const [previewOpen, setPreviewOpen] = useState<boolean>(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [scope, setScope] = useState<string>("all");
  const [userRole, setUserRole] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Table filter and sort states
  const [sortField, setSortField] = useState<string>("interactions.likes");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [chartGranularity, setChartGranularity] = useState<"day" | "week" | "month">("day");
  const [tableSearchQuery, setTableSearchQuery] = useState<string>("");
  const [tablePlatformFilter, setTablePlatformFilter] = useState<string>("all");

  // Popup Toast Notification State
  const [popup, setPopup] = useState<{
    isOpen: boolean;
    message: string;
    type?: PopupType;
    title?: string;
  }>({
    isOpen: false,
    message: '',
    type: 'info',
  });

  const showToast = (message: string, type: PopupType = 'info', title?: string) => {
    setPopup({ isOpen: true, message, type, title });
  };

  // Load User Info for default reporter name and role
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const user = data?.user;
        if (user) {
          const fullName = user.user_metadata?.full_name || user.email?.split("@")[0] || "Marketer";
          setReporterName(fullName);

          const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).maybeSingle();
          if (profile) {
            setUserRole(profile.role);
            if (profile.role === 'marketer_content') {
              setScope('personal');
            }
          }
        }
      } catch (error) {
        console.warn("[ReportsView] Failed to fetch user from Supabase:", error);
      }
    };
    fetchUser();
  }, [supabase]);

  // Load reports stats data
  const loadStats = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const queryParams = new URLSearchParams({
        timeframe,
        platform,
        scope,
        ...(timeframe === "custom" && startDate ? { startDate } : {}),
        ...(timeframe === "custom" && endDate ? { endDate } : {}),
      });

      const res = await fetch(`/api/reports/stats?${queryParams.toString()}&t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) {
        const errText = await res.text();
        console.error("Stats API failed:", res.status, errText);
        throw new Error(`Không thể tải báo cáo (Mã lỗi: ${res.status}): ${errText}`);
      }
      const data = await res.json();
      setReportData(data);
    } catch (err: any) {
      console.error("Lỗi khi tải dữ liệu báo cáo:", err);
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (timeframe !== "custom" || (startDate && endDate)) {
      loadStats();
    }
  }, [timeframe, platform, startDate, endDate, scope]);

  const performSync = async (silent = false) => {
    try {
      setIsSyncing(true);
      const res = await fetch(`/api/reports/sync?platform=${platform}`, { method: 'POST' });
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        console.error("Sync API failed:", res.status, errText);
        if (!silent) {
          showToast(`Lỗi đồng bộ dữ liệu (Mã lỗi: ${res.status}). Chi tiết: ${errText || 'Không có phản hồi'}`, "error", "Đồng bộ thất bại");
        }
        return false;
      }
      const data = await res.json();
      if (!silent) {
        showToast(data.message || "Đồng bộ dữ liệu thành công!", "success", "Đồng bộ hoàn tất");
      }
      await loadStats();
      return true;
    } catch (err) {
      console.error("Lỗi đồng bộ:", err);
      if (!silent) {
        showToast("Đã xảy ra lỗi khi đồng bộ dữ liệu.", "error", "Lỗi đồng bộ");
      }
      return false;
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSync = () => performSync(false);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      showToast(
        "Đang đồng bộ dữ liệu thực tế mới nhất trước khi xem trước báo cáo...",
        "info",
        "Đồng bộ dữ liệu"
      );

      await performSync(true);
      setPreviewOpen(true);
    } catch (error: any) {
      console.error("Lỗi chuẩn bị báo cáo:", error);
      showToast(
        "Đã xảy ra lỗi khi chuẩn bị báo cáo. Vui lòng thử lại.",
        "error",
        "Thất bại"
      );
    } finally {
      setIsExporting(false);
    }
  };

  const confirmDownloadExcel = async () => {
    try {
      setIsExporting(true);
      const queryParams = new URLSearchParams({
        timeframe,
        platform,
        scope,
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

      setPreviewOpen(false);

      showToast(
        "Tải về file Excel (.xlsx) báo cáo thành công!",
        "success",
        "Tải báo cáo thành công"
      );
    } catch (error: any) {
      console.error("Lỗi xuất báo cáo:", error);
      showToast(
        "Đã xảy ra lỗi khi xuất file Excel. Vui lòng thử lại.",
        "error",
        "Xuất báo cáo thất bại"
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const filteredTablePosts = useMemo(() => {
    if (!reportData?.topPosts) return [];

    let list = [...reportData.topPosts];

    // 1. Filter by platform
    if (tablePlatformFilter !== "all") {
      list = list.filter(p => {
        const plat = (p.platform || "").toLowerCase();
        if (tablePlatformFilter === "threads") return plat === "threads" || plat === "thread";
        return plat === tablePlatformFilter;
      });
    }

    // 2. Filter by search query
    if (tableSearchQuery.trim()) {
      const q = tableSearchQuery.toLowerCase();
      list = list.filter(p => (p.title || "").toLowerCase().includes(q));
    }

    // 3. Sort list
    list.sort((a, b) => {
      const getValue = (obj: any, path: string) => {
        const fields = path.split(".");
        let curr = obj;
        for (const f of fields) {
          if (curr == null) return 0;
          curr = curr[f];
        }
        return curr;
      };

      const rawA = getValue(a, sortField);
      const rawB = getValue(b, sortField);

      let valA: any = rawA;
      let valB: any = rawB;

      // Handle date fields
      if (sortField === "posted_at" || sortField === "scheduled_at") {
        valA = rawA ? new Date(rawA).getTime() : 0;
        valB = rawB ? new Date(rawB).getTime() : 0;
      }

      // Handle string fields
      if (typeof valA === "string" && typeof valB === "string") {
        const res = valA.localeCompare(valB, "vi", { sensitivity: "base" });
        return sortDirection === "asc" ? res : -res;
      }

      // Handle numeric fields
      const numA = typeof valA === "number" ? valA : (parseFloat(valA) || 0);
      const numB = typeof valB === "number" ? valB : (parseFloat(valB) || 0);

      return sortDirection === "asc" ? numA - numB : numB - numA;
    });

    return list;
  }, [reportData?.topPosts, tablePlatformFilter, tableSearchQuery, sortField, sortDirection]);

  const processedChartData = useMemo(() => {
    if (!reportData?.chartData || reportData.chartData.length === 0) return [];
    
    if (chartGranularity === "day") {
      return reportData.chartData;
    }
    
    const currentYear = new Date().getFullYear();
    const parseDate = (dStr: string) => {
      const parts = dStr.split(/[-/]/);
      if (parts.length >= 2) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        return new Date(currentYear, month, day);
      }
      return new Date();
    };

    if (chartGranularity === "week") {
      const groups: { [weekKey: string]: typeof reportData.chartData } = {};
      const weekKeysOrder: string[] = [];
      
      reportData.chartData.forEach(item => {
        const dateObj = parseDate(item.date);
        const day = dateObj.getDay();
        const diff = dateObj.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(dateObj.getFullYear(), dateObj.getMonth(), diff);
        const weekKey = `${monday.getDate().toString().padStart(2, '0')}/${(monday.getMonth() + 1).toString().padStart(2, '0')}`;
        
        if (!groups[weekKey]) {
          groups[weekKey] = [];
          weekKeysOrder.push(weekKey);
        }
        groups[weekKey].push(item);
      });
      
      return weekKeysOrder.map(weekKey => {
        const items = groups[weekKey];
        const likes = items.reduce((sum, i) => sum + (i.likes || 0), 0);
        const comments = items.reduce((sum, i) => sum + (i.comments || 0), 0);
        const shares = items.reduce((sum, i) => sum + (i.shares || 0), 0);
        const clicks = items.reduce((sum, i) => sum + (i.clicks || 0), 0);
        const reach = items.reduce((sum, i) => sum + (i.reach || 0), 0);
        const impressions = items.reduce((sum, i) => sum + (i.impressions || 0), 0);
        
        return {
          date: `Tuần ${weekKey}`,
          likes,
          comments,
          shares,
          clicks,
          reach,
          impressions,
          count: items.length
        };
      });
    }
    
    if (chartGranularity === "month") {
      const groups: { [monthKey: string]: typeof reportData.chartData } = {};
      const monthKeysOrder: string[] = [];
      
      reportData.chartData.forEach(item => {
        const dateObj = parseDate(item.date);
        const monthKey = `T. ${(dateObj.getMonth() + 1).toString().padStart(2, '0')}`;
        
        if (!groups[monthKey]) {
          groups[monthKey] = [];
          monthKeysOrder.push(monthKey);
        }
        groups[monthKey].push(item);
      });
      
      return monthKeysOrder.map(monthKey => {
        const items = groups[monthKey];
        const likes = items.reduce((sum, i) => sum + (i.likes || 0), 0);
        const comments = items.reduce((sum, i) => sum + (i.comments || 0), 0);
        const shares = items.reduce((sum, i) => sum + (i.shares || 0), 0);
        const clicks = items.reduce((sum, i) => sum + (i.clicks || 0), 0);
        const reach = items.reduce((sum, i) => sum + (i.reach || 0), 0);
        const impressions = items.reduce((sum, i) => sum + (i.impressions || 0), 0);
        
        return {
          date: monthKey,
          likes,
          comments,
          shares,
          clicks,
          reach,
          impressions,
          count: items.length
        };
      });
    }
    
    return reportData.chartData;
  }, [reportData?.chartData, chartGranularity]);

  const totalEngagements = reportData
    ? (reportData.summary.totalLikes + reportData.summary.totalComments + reportData.summary.totalShares)
    : 0;

  const engagementRate = reportData && reportData.summary.totalReach > 0
    ? ((totalEngagements / reportData.summary.totalReach) * 100).toFixed(2)
    : "0.00";

  const themeContext = useTheme();
  const isDark = themeContext?.isDark ?? false;
  const threadsColor = isDark ? "#F4F4F5" : "#18181B";

  const getPlatformPieData = () => {
    if (!reportData?.platformBreakdown) return [];
    const bd = reportData.platformBreakdown;

    let data = [
      { name: "Facebook", value: bd.facebook.likes + bd.facebook.comments + bd.facebook.shares, fill: "#1877F2", color: "#1877F2" },
      { name: "Instagram", value: bd.instagram.likes + bd.instagram.comments + bd.instagram.shares, fill: "#E1306C", color: "#E1306C" },
      { name: "Threads", value: bd.threads.likes + bd.threads.comments + bd.threads.shares, fill: threadsColor, color: threadsColor },
    ];

    const totalVal = data.reduce((acc, curr) => acc + curr.value, 0);
    if (totalVal === 0) {
      data = [
        { name: "Facebook", value: bd.facebook.posts, fill: "#1877F2", color: "#1877F2" },
        { name: "Instagram", value: bd.instagram.posts, fill: "#E1306C", color: "#E1306C" },
        { name: "Threads", value: bd.threads.posts, fill: threadsColor, color: threadsColor },
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
    <div id="onboarding-reports" className="flex flex-col gap-6 text-foreground font-sans">

      {/* Page Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-2xs">
              <BarChart3 className="w-5 h-5 stroke-[2.5]" />
            </div>
            {t("reports.title") || "Báo cáo & Thống kê"}
          </h1>
          <p className="text-xs md:text-sm text-text-muted font-medium mt-1">
            {t("reports.subtitle") || "Theo dõi hiệu quả chiến dịch và tương tác trên mạng xã hội"}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 px-3.5 py-2 rounded-xl shadow-2xs border border-gray-200/70 dark:border-zinc-800">
            <UserIcon size={14} className="text-text-muted shrink-0" />
            <input
              type="text"
              value={reporterName}
              onChange={(e) => setReporterName(e.target.value)}
              placeholder={t("reports.reporterPlaceholder") || "Tên người báo cáo..."}
              className="bg-transparent text-xs focus:outline-none border-none outline-none w-[140px] font-semibold text-text"
            />
          </div>

          <button
            type="button"
            onClick={handleSync}
            disabled={isSyncing || loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md shadow-blue-600/20 hover:shadow-blue-600/30 transition-all duration-200 disabled:opacity-50 cursor-pointer text-xs active:scale-95 border-0"
          >
            {isSyncing ? (
              <RefreshCw className="animate-spin" size={14} />
            ) : (
              <RefreshCw size={14} />
            )}
            <span>Đồng bộ ngay</span>
          </button>

          <button
            id="tour-reports-export-btn"
            type="button"
            onClick={handleExport}
            disabled={isExporting || loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl shadow-md shadow-primary/20 hover:shadow-primary/30 transition-all duration-200 disabled:opacity-50 cursor-pointer text-xs active:scale-95 border-0"
          >
            {isExporting ? (
              <Loader2 className="animate-spin" size={14} />
            ) : (
              <Download size={14} />
            )}
            <span>{t("reports.exportExcel") || "Xuất Excel"}</span>
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
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200/70 dark:border-zinc-800 p-4 md:p-5 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 flex-1">
            {/* Scope Selector */}
            {userRole && userRole !== 'marketer_content' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-extrabold text-text-muted uppercase tracking-wider">
                  Phạm vi dữ liệu
                </label>
                <div className="relative">
                  <select
                    value={scope}
                    onChange={(e) => setScope(e.target.value)}
                    className="w-full bg-gray-50/80 dark:bg-zinc-950 border border-gray-200/80 dark:border-zinc-800 rounded-xl pl-3.5 pr-8 py-2 text-xs font-bold text-text focus:outline-none focus:border-primary transition-all appearance-none cursor-pointer h-9"
                  >
                    <option value="all">Toàn hệ thống</option>
                    <option value="personal">Cá nhân tôi</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" size={14} />
                </div>
              </div>
            )}

            {/* Timeframe Selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-extrabold text-text-muted uppercase tracking-wider">
                Khoảng thời gian
              </label>
              <div className="relative">
                <select
                  value={timeframe}
                  onChange={(e) => setTimeframe(e.target.value)}
                  className="w-full bg-gray-50/80 dark:bg-zinc-950 border border-gray-200/80 dark:border-zinc-800 rounded-xl pl-3.5 pr-8 py-2 text-xs font-bold text-text focus:outline-none focus:border-primary transition-all appearance-none cursor-pointer h-9"
                >
                  <option value="7days">7 ngày qua</option>
                  <option value="30days">30 ngày qua</option>
                  <option value="thisMonth">Tháng này</option>
                  <option value="lastMonth">Tháng trước</option>
                  <option value="custom">Tùy chọn ngày</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" size={14} />
              </div>
            </div>

            {/* Custom dates if selected */}
            {timeframe === "custom" && (
              <div className="flex items-center gap-2 col-span-1 sm:col-span-2">
                <div className="flex flex-col gap-1 flex-1">
                  <label className="text-[10px] font-extrabold text-text-muted uppercase">Từ ngày</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-gray-50/80 dark:bg-zinc-950 border border-gray-200/80 dark:border-zinc-800 rounded-xl px-3 py-1.5 text-xs font-bold text-text h-9"
                  />
                </div>
                <div className="flex flex-col gap-1 flex-1">
                  <label className="text-[10px] font-extrabold text-text-muted uppercase">Đến ngày</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-gray-50/80 dark:bg-zinc-950 border border-gray-200/80 dark:border-zinc-800 rounded-xl px-3 py-1.5 text-xs font-bold text-text h-9"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Platform Filter Tabs */}
          <div className="flex flex-col gap-1.5 shrink-0">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-extrabold text-text-muted uppercase tracking-wider">
                Nền tảng
              </label>
              {(platform !== "all" || timeframe !== "7days" || scope !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setPlatform("all");
                    setTimeframe("7days");
                    setScope("all");
                    setStartDate("");
                    setEndDate("");
                  }}
                  className="text-[10px] font-bold text-text-muted hover:text-primary transition-colors flex items-center gap-1 cursor-pointer border-0 bg-transparent"
                >
                  <RotateCcw size={10} />
                  <span>Đặt lại bộ lọc</span>
                </button>
              )}
            </div>
            <div className="flex items-center gap-1.5 bg-gray-100/70 dark:bg-zinc-950 p-1 rounded-xl border border-gray-200/60 dark:border-zinc-800/80 h-9">
              <button
                type="button"
                onClick={() => setPlatform("all")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer border-0 h-7 ${
                  platform === "all"
                    ? "bg-primary text-white shadow-2xs"
                    : "text-text-muted hover:text-text"
                }`}
              >
                <Globe size={12} />
                <span>Tất cả nền tảng</span>
              </button>
              <button
                type="button"
                onClick={() => setPlatform("facebook")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer border-0 h-7 ${
                  platform === "facebook"
                    ? "bg-[#1877F2] text-white shadow-2xs"
                    : "text-text-muted hover:text-[#1877F2]"
                }`}
              >
                <Facebook size={12} className="fill-current" />
                <span>Facebook</span>
              </button>
              <button
                type="button"
                onClick={() => setPlatform("instagram")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer border-0 h-7 ${
                  platform === "instagram"
                    ? "bg-[#E1306C] text-white shadow-2xs"
                    : "text-text-muted hover:text-[#E1306C]"
                }`}
              >
                <Instagram size={12} />
                <span>Instagram</span>
              </button>
              <button
                type="button"
                onClick={() => setPlatform("threads")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer border-0 h-7 ${
                  platform === "threads"
                    ? "bg-black dark:bg-white text-white dark:text-black shadow-2xs"
                    : "text-text-muted hover:text-black dark:hover:text-white"
                }`}
              >
                <ThreadsIcon size={12} />
                <span>Threads</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="animate-spin text-primary" size={48} />
          <p className="text-sm font-semibold text-text-muted">Đang tính toán các chỉ số thống kê...</p>
        </div>
      ) : errorMsg ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <AlertTriangle className="text-rose-500" size={48} />
          <p className="text-sm font-semibold text-text-muted">{errorMsg}</p>
          <button
            type="button"
            onClick={loadStats}
            className="mt-2 px-5 py-2.5 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl shadow-md transition-all text-sm cursor-pointer border-0"
          >
            Thử lại
          </button>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {reportData && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Metric KPI Cards (5 columns) */}
              <div id="tour-reports-stats" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {/* Card 1: Total Posts */}
                <div className="bg-white dark:bg-zinc-900 border border-gray-200/70 dark:border-zinc-800 rounded-2xl p-4 flex flex-col justify-between shadow-2xs hover:shadow-md transition-all duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-text-muted uppercase tracking-wider">TỔNG SỐ BÀI VIẾT</span>
                    <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-[#1877F2] flex items-center justify-center border border-blue-100 dark:border-blue-900/30">
                      <FileText size={16} />
                    </div>
                  </div>
                  <div className="mt-3">
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-none">
                      {reportData.summary.totalPosts}
                    </h3>
                    <div className="flex items-center gap-1 mt-2 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                      <TrendingUp size={12} />
                      <span>{reportData.summary.postedPosts} đã xuất bản thành công</span>
                    </div>
                  </div>
                </div>

                {/* Card 2: Engagement Rate */}
                <div className="bg-white dark:bg-zinc-900 border border-gray-200/70 dark:border-zinc-800 rounded-2xl p-4 flex flex-col justify-between shadow-2xs hover:shadow-md transition-all duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-text-muted uppercase tracking-wider">TỶ LỆ TƯƠNG TÁC</span>
                    <div className="w-8 h-8 rounded-xl bg-pink-50 dark:bg-pink-950/40 text-pink-500 flex items-center justify-center border border-pink-100 dark:border-pink-900/30">
                      <Activity size={16} />
                    </div>
                  </div>
                  <div className="mt-3">
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-none">
                      {engagementRate}%
                    </h3>
                    <div className="w-full bg-gray-100 dark:bg-zinc-800 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div className="bg-pink-500 h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(parseFloat(engagementRate), 100)}%` }} />
                    </div>
                    <div className="flex items-center gap-1 mt-2 text-[11px] font-bold text-rose-500">
                      <TrendingDown size={12} />
                      <span>↓ 1.4% so với 7 ngày trước</span>
                    </div>
                  </div>
                </div>

                {/* Card 4: Reach */}
                <div className="bg-white dark:bg-zinc-900 border border-gray-200/70 dark:border-zinc-800 rounded-2xl p-4 flex flex-col justify-between shadow-2xs hover:shadow-md transition-all duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-text-muted uppercase tracking-wider">TIẾP CẬN (REACH)</span>
                    <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 flex items-center justify-center border border-amber-100 dark:border-amber-900/30">
                      <UsersIcon size={16} />
                    </div>
                  </div>
                  <div className="mt-3">
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-none">
                      {reportData.summary.totalReach.toLocaleString("vi-VN")}
                    </h3>
                    <p className="text-[10px] font-semibold text-text-muted mt-1">Tổng tài khoản tiếp cận</p>
                    <div className="flex items-center gap-1 mt-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                      <TrendingUp size={12} />
                      <span>↑ 22% so với 7 ngày trước</span>
                    </div>
                  </div>
                </div>

                {/* Card 5: Impressions */}
                <div className="bg-white dark:bg-zinc-900 border border-gray-200/70 dark:border-zinc-800 rounded-2xl p-4 flex flex-col justify-between shadow-2xs hover:shadow-md transition-all duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-text-muted uppercase tracking-wider">LƯỢT HIỂN THỊ</span>
                    <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-500 flex items-center justify-center border border-teal-100 dark:border-teal-900/30">
                      <Eye size={16} />
                    </div>
                  </div>
                  <div className="mt-3">
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-none">
                      {reportData.summary.totalImpressions.toLocaleString("vi-VN")}
                    </h3>
                    <p className="text-[10px] font-semibold text-text-muted mt-1">Tổng lượt hiển thị bài</p>
                    <div className="flex items-center gap-1 mt-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                      <TrendingUp size={12} />
                      <span>↑ 10% so với 7 ngày trước</span>
                    </div>
                  </div>
                </div>

                {/* Card 6: Engagements */}
                <div className="bg-white dark:bg-zinc-900 border border-gray-200/70 dark:border-zinc-800 rounded-2xl p-4 flex flex-col justify-between shadow-2xs hover:shadow-md transition-all duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-text-muted uppercase tracking-wider">TƯƠNG TÁC</span>
                    <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-500 flex items-center justify-center border border-sky-100 dark:border-sky-900/30">
                      <ThumbsUp size={16} />
                    </div>
                  </div>
                  <div className="mt-3">
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-none">
                      {totalEngagements.toLocaleString("vi-VN")}
                    </h3>
                    <p className="text-[10px] font-semibold text-text-muted mt-1">Likes, Comments & Shares</p>
                    <div className="flex items-center gap-1 mt-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                      <TrendingUp size={12} />
                      <span>↑ 100% so với 7 ngày trước</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Engagement Summary Bar */}
              <div className="bg-white dark:bg-zinc-900 border border-gray-200/70 dark:border-zinc-800 rounded-2xl p-4 shadow-2xs">
                <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-gray-100 dark:divide-zinc-800">
                  {/* Likes */}
                  <div className="flex items-center gap-3.5 px-3 py-2">
                    <div className="w-10 h-10 rounded-xl bg-pink-50 dark:bg-pink-950/40 text-pink-500 flex items-center justify-center border border-pink-100 dark:border-pink-900/30 shrink-0">
                      <ThumbsUp size={18} />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-text-muted">Tổng Lượt Thích</p>
                      <p className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                        {reportData.summary.totalLikes.toLocaleString("vi-VN")}
                      </p>
                    </div>
                  </div>

                  {/* Comments */}
                  <div className="flex items-center gap-3.5 px-3 py-2">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-500 flex items-center justify-center border border-blue-100 dark:border-blue-900/30 shrink-0">
                      <MessageCircle size={18} />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-text-muted">Tổng Bình Luận</p>
                      <p className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                        {reportData.summary.totalComments.toLocaleString("vi-VN")}
                      </p>
                    </div>
                  </div>

                  {/* Shares */}
                  <div className="flex items-center gap-3.5 px-3 py-2">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-500 flex items-center justify-center border border-purple-100 dark:border-purple-900/30 shrink-0">
                      <Share2 size={18} />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-text-muted">Tổng Lượt Chia Sẻ</p>
                      <p className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                        {reportData.summary.totalShares.toLocaleString("vi-VN")}
                      </p>
                    </div>
                  </div>

                  {/* Clicks */}
                  <div className="flex items-center gap-3.5 px-3 py-2">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 flex items-center justify-center border border-amber-100 dark:border-amber-900/30 shrink-0">
                      <MousePointerClick size={18} />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-text-muted">Nhấp vào liên kết</p>
                      <p className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                        {reportData.summary.totalClicks.toLocaleString("vi-VN")}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Chart section */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* AreaChart: Interaction Trend */}
                <div className="lg:col-span-8 bg-white dark:bg-zinc-900 p-5 md:p-6 rounded-2xl border border-gray-200/70 dark:border-zinc-800 shadow-2xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-black text-slate-900 dark:text-white">
                        {chartGranularity === "day"
                          ? (t("reports.chartTitleDay") || "Biểu đồ xu hướng tương tác theo ngày")
                          : chartGranularity === "week"
                          ? (t("reports.chartTitleWeek") || "Biểu đồ xu hướng tương tác theo tuần")
                          : (t("reports.chartTitleMonth") || "Biểu đồ xu hướng tương tác theo tháng")
                        }
                      </h3>
                      <p className="text-xs text-text-muted font-medium mt-0.5">
                        Thống kê chi tiết bình luận và lượt thích theo thời gian
                      </p>
                    </div>

                    <div className="flex items-center gap-1 bg-gray-100/70 dark:bg-zinc-950 p-1 rounded-xl border border-gray-250/60 dark:border-zinc-800 shrink-0 self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={() => setChartGranularity("day")}
                        className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all border-0 cursor-pointer ${
                          chartGranularity === "day"
                            ? "bg-primary text-white shadow-2xs"
                            : "text-text-muted hover:text-text"
                        }`}
                      >
                        Ngày
                      </button>
                      <button
                        type="button"
                        onClick={() => setChartGranularity("week")}
                        className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all border-0 cursor-pointer ${
                          chartGranularity === "week"
                            ? "bg-primary text-white shadow-2xs"
                            : "text-text-muted hover:text-text"
                        }`}
                      >
                        Tuần
                      </button>
                      <button
                        type="button"
                        onClick={() => setChartGranularity("month")}
                        className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all border-0 cursor-pointer ${
                          chartGranularity === "month"
                            ? "bg-primary text-white shadow-2xs"
                            : "text-text-muted hover:text-text"
                        }`}
                      >
                        Tháng
                      </button>
                    </div>
                  </div>

                  <div className="h-[320px] w-full mt-2">
                    {processedChartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={processedChartData}
                          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                        >
                          <defs>
                            <linearGradient id="likesGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#818CF8" stopOpacity={0.4}/>
                              <stop offset="95%" stopColor="#818CF8" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="commentsGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10B981" stopOpacity={0.4}/>
                              <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" className="dark:stroke-zinc-800" />
                          <XAxis
                            dataKey="date"
                            stroke="#94A3B8"
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                            dy={8}
                          />
                          <YAxis
                            stroke="#94A3B8"
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(val) => val.toLocaleString("vi-VN")}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "rgba(15, 23, 42, 0.92)",
                              borderRadius: "14px",
                              border: "1px solid rgba(255,255,255,0.1)",
                              color: "#fff",
                              fontSize: "12px",
                              boxShadow: "0 10px 25px -5px rgba(0,0,0,0.3)"
                            }}
                            labelClassName="font-extrabold text-white mb-1"
                          />
                          <Legend verticalAlign="top" align="center" height={36} iconType="circle" iconSize={8} />
                          <Area
                            type="monotone"
                            dataKey="comments"
                            name="Bình luận"
                            stroke="#10B981"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#commentsGrad)"
                          />
                          <Area
                            type="monotone"
                            dataKey="likes"
                            name="Lượt thích"
                            stroke="#818CF8"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#likesGrad)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-text-muted font-semibold text-xs">
                        Chưa có dữ liệu biểu đồ
                      </div>
                    )}
                  </div>
                </div>

                {/* DonutChart: Platform Distribution */}
                <div id="tour-reports-export" className="lg:col-span-4 bg-white dark:bg-zinc-900 p-5 md:p-6 rounded-2xl border border-gray-200/70 dark:border-zinc-800 shadow-2xs flex flex-col justify-between">
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                      Phân phối nền tảng
                    </h3>
                    <p className="text-xs text-text-muted font-medium mt-0.5">
                      Tỷ lệ tương tác thu nhận theo kênh truyền thông
                    </p>
                  </div>

                  <div className="h-[220px] w-full flex items-center justify-center relative my-2">
                    {pieData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={75}
                            paddingAngle={4}
                            dataKey="value"
                            stroke="none"
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${entry.name}-${index}`} fill={entry.color || entry.fill} stroke={entry.color || entry.fill} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value: any) => [value.toLocaleString("vi-VN"), "Tương tác"]}
                            contentStyle={{
                              backgroundColor: "rgba(15, 23, 42, 0.92)",
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

                    {/* Centered text label inside donut */}
                    {pieData.length > 0 && (
                      <div className="absolute flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-[9px] uppercase font-black text-text-muted tracking-widest">TỔNG TƯƠNG TÁC</span>
                        <span className="text-2xl font-black text-slate-900 dark:text-white leading-none mt-1">
                          {totalEngagements.toLocaleString("vi-VN")}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Platform legend bar */}
                  <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-100 dark:border-zinc-800/80">
                    {pieData.map((item, idx) => {
                      const totalVal = pieData.reduce((acc, curr) => acc + curr.value, 0);
                      const percent = totalVal > 0 ? ((item.value / totalVal) * 100).toFixed(0) : 0;
                      return (
                        <div key={idx} className="flex flex-col items-center text-center">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                            <span className="text-[11px] font-extrabold text-slate-800 dark:text-slate-200">{item.name}</span>
                          </div>
                          <span className="text-xs font-black text-slate-900 dark:text-white mt-0.5">{percent}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Top 10 Posts Table */}
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200/70 dark:border-zinc-800 shadow-2xs overflow-hidden p-5 md:p-6 space-y-4">
                {/* Header with search & filter */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    {t("reports.topPostsTitle") || "Top 10 bài viết có tương tác tốt nhất"}
                  </h3>

                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    {/* Search Input */}
                    <div className="relative flex-1 sm:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted w-3.5 h-3.5 pointer-events-none" />
                      <input
                        type="text"
                        value={tableSearchQuery}
                        onChange={(e) => setTableSearchQuery(e.target.value)}
                        placeholder="Tìm kiếm bài viết..."
                        className="w-full bg-gray-50/80 dark:bg-zinc-950 border border-gray-200/80 dark:border-zinc-800 rounded-xl pl-9 pr-3 py-1.5 text-xs font-semibold text-text focus:outline-none focus:border-primary transition-all h-9"
                      />
                    </div>

                    {/* Table Platform Filter */}
                    <div className="relative w-36 shrink-0">
                      <select
                        value={tablePlatformFilter}
                        onChange={(e) => setTablePlatformFilter(e.target.value)}
                        className="w-full bg-gray-50/80 dark:bg-zinc-950 border border-gray-200/80 dark:border-zinc-800 rounded-xl pl-3 pr-8 py-1.5 text-xs font-bold text-text focus:outline-none focus:border-primary transition-all appearance-none cursor-pointer h-9"
                      >
                        <option value="all">Tất cả nền tảng</option>
                        <option value="facebook">Facebook</option>
                        <option value="instagram">Instagram</option>
                        <option value="threads">Threads</option>
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" size={14} />
                    </div>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-zinc-800">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50/90 dark:bg-zinc-950/90 text-text-muted text-[10px] font-extrabold uppercase tracking-wider border-b border-gray-200/60 dark:border-zinc-800">
                        <th className="py-3 px-4 w-12 text-center">STT</th>
                        <th className="py-3 px-4 min-w-[240px]">
                          <button
                            type="button"
                            onClick={() => handleSort("title")}
                            className={`inline-flex items-center gap-1 hover:text-primary uppercase font-extrabold text-[10px] tracking-wider transition-colors cursor-pointer border-0 bg-transparent ${
                              sortField === "title" ? "text-primary font-black" : "text-text-muted hover:text-slate-700 dark:hover:text-slate-200"
                            }`}
                          >
                            <span>NỘI DUNG BÀI VIẾT</span>
                            {sortField === "title" ? (
                              sortDirection === "asc" ? <ArrowUp size={12} className="stroke-[3] text-primary" /> : <ArrowDown size={12} className="stroke-[3] text-primary" />
                            ) : (
                              <ArrowUpDown size={11} className="opacity-50" />
                            )}
                          </button>
                        </th>
                        <th className="py-3 px-4 text-center w-28">
                          <button
                            type="button"
                            onClick={() => handleSort("posted_at")}
                            className={`inline-flex items-center justify-center gap-1 mx-auto hover:text-primary uppercase font-extrabold text-[10px] tracking-wider transition-colors cursor-pointer border-0 bg-transparent ${
                              sortField === "posted_at" ? "text-primary font-black" : "text-text-muted hover:text-slate-700 dark:hover:text-slate-200"
                            }`}
                          >
                            <span>NGÀY ĐĂNG</span>
                            {sortField === "posted_at" ? (
                              sortDirection === "asc" ? <ArrowUp size={12} className="stroke-[3] text-primary" /> : <ArrowDown size={12} className="stroke-[3] text-primary" />
                            ) : (
                              <ArrowUpDown size={11} className="opacity-50" />
                            )}
                          </button>
                        </th>
                        <th className="py-3 px-4 text-center w-28">
                          <button
                            type="button"
                            onClick={() => handleSort("platform")}
                            className={`inline-flex items-center justify-center gap-1 mx-auto hover:text-primary uppercase font-extrabold text-[10px] tracking-wider transition-colors cursor-pointer border-0 bg-transparent ${
                              sortField === "platform" ? "text-primary font-black" : "text-text-muted hover:text-slate-700 dark:hover:text-slate-200"
                            }`}
                          >
                            <span>NỀN TẢNG</span>
                            {sortField === "platform" ? (
                              sortDirection === "asc" ? <ArrowUp size={12} className="stroke-[3] text-primary" /> : <ArrowDown size={12} className="stroke-[3] text-primary" />
                            ) : (
                              <ArrowUpDown size={11} className="opacity-50" />
                            )}
                          </button>
                        </th>
                        <th className="py-3 px-4 text-center w-24">
                          <button
                            type="button"
                            onClick={() => handleSort("status")}
                            className={`inline-flex items-center justify-center gap-1 mx-auto hover:text-primary uppercase font-extrabold text-[10px] tracking-wider transition-colors cursor-pointer border-0 bg-transparent ${
                              sortField === "status" ? "text-primary font-black" : "text-text-muted hover:text-slate-700 dark:hover:text-slate-200"
                            }`}
                          >
                            <span>TRẠNG THÁI</span>
                            {sortField === "status" ? (
                              sortDirection === "asc" ? <ArrowUp size={12} className="stroke-[3] text-primary" /> : <ArrowDown size={12} className="stroke-[3] text-primary" />
                            ) : (
                              <ArrowUpDown size={11} className="opacity-50" />
                            )}
                          </button>
                        </th>
                        <th className="py-3 px-4 text-center w-20">
                          <button
                            type="button"
                            onClick={() => handleSort("interactions.likes")}
                            className={`inline-flex items-center justify-center gap-1 mx-auto hover:text-primary uppercase font-extrabold text-[10px] tracking-wider transition-colors cursor-pointer border-0 bg-transparent ${
                              sortField === "interactions.likes" ? "text-primary font-black" : "text-text-muted hover:text-slate-700 dark:hover:text-slate-200"
                            }`}
                          >
                            <span>THÍCH</span>
                            {sortField === "interactions.likes" ? (
                              sortDirection === "asc" ? <ArrowUp size={12} className="stroke-[3] text-primary" /> : <ArrowDown size={12} className="stroke-[3] text-primary" />
                            ) : (
                              <ArrowUpDown size={11} className="opacity-50" />
                            )}
                          </button>
                        </th>
                        <th className="py-3 px-4 text-center w-24">
                          <button
                            type="button"
                            onClick={() => handleSort("interactions.comments")}
                            className={`inline-flex items-center justify-center gap-1 mx-auto hover:text-primary uppercase font-extrabold text-[10px] tracking-wider transition-colors cursor-pointer border-0 bg-transparent ${
                              sortField === "interactions.comments" ? "text-primary font-black" : "text-text-muted hover:text-slate-700 dark:hover:text-slate-200"
                            }`}
                          >
                            <span>BÌNH LUẬN</span>
                            {sortField === "interactions.comments" ? (
                              sortDirection === "asc" ? <ArrowUp size={12} className="stroke-[3] text-primary" /> : <ArrowDown size={12} className="stroke-[3] text-primary" />
                            ) : (
                              <ArrowUpDown size={11} className="opacity-50" />
                            )}
                          </button>
                        </th>
                        <th className="py-3 px-4 text-center w-20">
                          <button
                            type="button"
                            onClick={() => handleSort("interactions.clicks")}
                            className={`inline-flex items-center justify-center gap-1 mx-auto hover:text-primary uppercase font-extrabold text-[10px] tracking-wider transition-colors cursor-pointer border-0 bg-transparent ${
                              sortField === "interactions.clicks" ? "text-primary font-black" : "text-text-muted hover:text-slate-700 dark:hover:text-slate-200"
                            }`}
                          >
                            <span>CLICKS</span>
                            {sortField === "interactions.clicks" ? (
                              sortDirection === "asc" ? <ArrowUp size={12} className="stroke-[3] text-primary" /> : <ArrowDown size={12} className="stroke-[3] text-primary" />
                            ) : (
                              <ArrowUpDown size={11} className="opacity-50" />
                            )}
                          </button>
                        </th>
                        <th className="py-3 px-4 text-center w-24">
                          <button
                            type="button"
                            onClick={() => handleSort("interactions.reach")}
                            className={`inline-flex items-center justify-center gap-1 mx-auto hover:text-primary uppercase font-extrabold text-[10px] tracking-wider transition-colors cursor-pointer border-0 bg-transparent ${
                              sortField === "interactions.reach" ? "text-primary font-black" : "text-text-muted hover:text-slate-700 dark:hover:text-slate-200"
                            }`}
                          >
                            <span>TIẾP CẬN</span>
                            {sortField === "interactions.reach" ? (
                              sortDirection === "asc" ? <ArrowUp size={12} className="stroke-[3] text-primary" /> : <ArrowDown size={12} className="stroke-[3] text-primary" />
                            ) : (
                              <ArrowUpDown size={11} className="opacity-50" />
                            )}
                          </button>
                        </th>
                        <th className="py-3 px-4 text-center w-24">
                          <button
                            type="button"
                            onClick={() => handleSort("interactions.impressions")}
                            className={`inline-flex items-center justify-center gap-1 mx-auto hover:text-primary uppercase font-extrabold text-[10px] tracking-wider transition-colors cursor-pointer border-0 bg-transparent ${
                              sortField === "interactions.impressions" ? "text-primary font-black" : "text-text-muted hover:text-slate-700 dark:hover:text-slate-200"
                            }`}
                          >
                            <span>HIỂN THỊ</span>
                            {sortField === "interactions.impressions" ? (
                              sortDirection === "asc" ? <ArrowUp size={12} className="stroke-[3] text-primary" /> : <ArrowDown size={12} className="stroke-[3] text-primary" />
                            ) : (
                              <ArrowUpDown size={11} className="opacity-50" />
                            )}
                          </button>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-zinc-800/80 text-xs font-semibold">
                      {filteredTablePosts.length > 0 ? (
                        filteredTablePosts.slice(0, 10).map((post, index) => {
                          const style = getPlatformStyle(post.platform);
                          const Icon = post.platform === "facebook" ? Facebook : post.platform === "instagram" ? Instagram : ThreadsIcon;

                          return (
                            <tr
                              key={post.id || index}
                              className="hover:bg-slate-50/70 dark:hover:bg-zinc-950/40 transition-colors"
                            >
                              <td className="py-3.5 px-4 text-center text-text-muted font-bold">{index + 1}</td>
                              <td className="py-3.5 px-4 max-w-xs md:max-w-md truncate text-slate-900 dark:text-white font-bold" title={post.title}>
                                {post.title}
                              </td>
                              <td className="py-3.5 px-4 text-center text-[11px] text-text-muted font-mono">
                                {post.posted_at ? new Date(post.posted_at).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }) : "—"}
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9.5px] font-black ${style.bg} ${style.color} ${style.border} border`}>
                                  <Icon size={10} className={post.platform === "facebook" ? "fill-current" : ""} />
                                  {post.platform.toUpperCase()}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                {post.status === "posted" ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                    Đã đăng
                                  </span>
                                ) : post.status === "failed" ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/10 text-rose-600 dark:text-rose-400">
                                    Thất bại
                                  </span>
                                ) : post.status === "cancelled" ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-500/10 text-slate-500 dark:text-slate-400">
                                    Đã hủy
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                    Chờ đăng
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 text-center text-slate-900 dark:text-slate-100 font-bold">{post.interactions.likes || 0}</td>
                              <td className="py-3.5 px-4 text-center text-slate-900 dark:text-slate-100 font-bold">{post.interactions.comments || 0}</td>
                              <td className="py-3.5 px-4 text-center text-slate-900 dark:text-slate-100 font-bold">{post.interactions.clicks || 0}</td>
                              <td className="py-3.5 px-4 text-center text-text-muted font-normal">{post.interactions.reach ? post.interactions.reach.toLocaleString("vi-VN") : 0}</td>
                              <td className="py-3.5 px-4 text-center text-text-muted font-normal">{post.interactions.impressions ? post.interactions.impressions.toLocaleString("vi-VN") : 0}</td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={10} className="py-8 text-center text-text-muted font-semibold">
                            {t("reports.noData") || "Chưa có dữ liệu bài viết"}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </motion.div>
          )}
        </AnimatePresence>
      )}

      <ReportPreviewModal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        onConfirmExport={confirmDownloadExcel}
        isExporting={isExporting}
        reportData={reportData}
        reporterName={reporterName}
        timeframe={timeframe}
        platform={platform}
        startDate={startDate}
        endDate={endDate}
        scope={scope}
      />

      <PopupDialog
        isOpen={popup.isOpen}
        onClose={() => setPopup(prev => ({ ...prev, isOpen: false }))}
        title={popup.title}
        message={popup.message}
        type={popup.type}
      />
    </div>
  );
}
