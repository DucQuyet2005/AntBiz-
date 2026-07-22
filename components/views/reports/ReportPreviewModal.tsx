"use client";

import React, { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  FileSpreadsheet,
  Download,
  Calendar,
  User,
  Globe,
  Search,
  CheckCircle2,
  Table as TableIcon
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface ReportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmExport: () => void;
  isExporting: boolean;
  reportData: any;
  reporterName: string;
  timeframe: string;
  platform: string;
  startDate?: string;
  endDate?: string;
  scope?: string;
}

export function ReportPreviewModal({
  isOpen,
  onClose,
  onConfirmExport,
  isExporting,
  reportData,
  reporterName,
  timeframe,
  platform,
  startDate,
  endDate,
  scope = "all"
}: ReportPreviewModalProps) {
  const { language } = useLanguage();
  const [activeSheet, setActiveSheet] = useState<"overview" | "details">("overview");
  const [searchQuery, setSearchQuery] = useState("");

  if (!isOpen || typeof document === "undefined") return null;

  const getTimeframeLabel = () => {
    const startStr = startDate ? new Date(startDate).toLocaleDateString('vi-VN') : '';
    const endStr = endDate ? new Date(endDate).toLocaleDateString('vi-VN') : '';

    switch (timeframe) {
      case "7days":
        return `7 ngày qua`;
      case "30days":
        return `30 ngày qua`;
      case "thisMonth":
        return `Tháng này`;
      case "lastMonth":
        return `Tháng trước`;
      case "custom":
        return startStr && endStr ? `Từ ${startStr} đến ${endStr}` : "Tùy chỉnh";
      default:
        return timeframe;
    }
  };

  const posts = reportData?.topPosts || [];
  const chartData = reportData?.chartData || [];
  const breakdown = reportData?.platformBreakdown || {
    facebook: { posts: 0, likes: 0, comments: 0, shares: 0, clicks: 0, reach: 0, impressions: 0 },
    instagram: { posts: 0, likes: 0, comments: 0, shares: 0, clicks: 0, reach: 0, impressions: 0 },
    threads: { posts: 0, likes: 0, comments: 0, shares: 0, clicks: 0, reach: 0, impressions: 0 }
  };

  const calculateStats = (pList: any[]) => {
    const total = pList.length;
    const posted = pList.filter(p => p.status === 'posted').length;
    const successRate = total > 0 ? Math.round((posted / total) * 100) : 0;
    let likes = 0, comments = 0, shares = 0, clicks = 0, reach = 0, impressions = 0;

    pList.forEach(p => {
      let inter = p.interactions || (Array.isArray(p.post_interactions) ? p.post_interactions[0] : p.post_interactions);
      if (p.status === 'posted' && inter) {
        likes += inter.likes || 0;
        comments += inter.comments || 0;
        shares += inter.shares || 0;
        clicks += inter.clicks || 0;
        reach += inter.reach || 0;
        impressions += inter.impressions || 0;
      }
    });

    return { total, posted, successRate, likes, comments, shares, clicks, reach, impressions, totalEngagements: likes + comments + shares };
  };

  const fbPosts = posts.filter((p: any) => p.platform === 'facebook');
  const igPosts = posts.filter((p: any) => p.platform === 'instagram');
  const threadsPosts = posts.filter((p: any) => p.platform === 'thread' || p.platform === 'threads');

  const fbStats = calculateStats(fbPosts);
  const igStats = calculateStats(igPosts);
  const threadsStats = calculateStats(threadsPosts);
  const totalStats = calculateStats(posts);

  const filteredPosts = posts.filter((p: any) =>
    (p.title || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 md:p-8 bg-slate-900/75 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
          className="relative w-full max-w-6xl h-[92vh] bg-slate-100 dark:bg-zinc-900 border border-slate-300 dark:border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-800 dark:text-slate-200 font-sans"
        >
          {/* Excel Application Window Titlebar */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-emerald-700 text-white select-none">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded bg-white/20 flex items-center justify-center font-bold text-xs">
                <FileSpreadsheet size={15} />
              </div>
              <span className="text-xs font-bold tracking-tight truncate">
                Bao_cao_truyen_thong_{timeframe}_{new Date().toISOString().slice(0, 10)}.xlsx — Excel Preview
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onConfirmExport}
                disabled={isExporting}
                className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-white rounded text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
              >
                <Download size={13} />
                Tải file Excel (.xlsx)
              </button>

              <button
                onClick={onClose}
                className="p-1 rounded hover:bg-emerald-600 text-white/80 hover:text-white transition-colors cursor-pointer border-0"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Excel Formula & Toolbar Strip */}
          <div className="flex items-center gap-3 px-4 py-1.5 bg-white dark:bg-zinc-950 border-b border-slate-200 dark:border-zinc-800 text-xs text-slate-600 dark:text-slate-400 font-mono">
            <span className="font-bold text-emerald-600 dark:text-emerald-400 w-10 border-r border-slate-200 dark:border-zinc-800 pr-2">
              {activeSheet === "overview" ? "A2" : "A4"}
            </span>
            <span className="text-slate-400">fx</span>
            <span className="text-slate-800 dark:text-slate-200 font-sans truncate font-medium">
              {activeSheet === "overview"
                ? "BÁO CÁO THỐNG KÊ CHIẾN DỊCH TRUYỀN THÔNG - ANTBIZ"
                : "DANH SÁCH CHI TIẾT BÀI ĐĂNG - TOÀN HỆ THỐNG"}
            </span>
          </div>

          {/* Spreadsheet Main Grid Area */}
          <div className="flex-1 overflow-auto bg-slate-200/50 dark:bg-zinc-950/80 p-3 sm:p-5">
            <div className="bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-800 shadow-sm rounded-lg overflow-hidden font-sans">
              
              {/* Sheet 1: Overview Spreadsheet View */}
              {activeSheet === "overview" && (
                <div className="p-4 sm:p-6 space-y-6">
                  {/* Banner Title (Row 2 in Excel) */}
                  <div className="w-full bg-[#4F46E5] text-white py-3 px-4 text-center font-bold text-sm md:text-base tracking-wide rounded-md shadow-xs uppercase">
                    BÁO CÁO THỐNG KÊ CHIẾN DỊCH TRUYỀN THÔNG - ANTBIZ
                  </div>

                  {/* Metadata block (Rows 4-6 in Excel) */}
                  <div className="bg-slate-50 dark:bg-zinc-950/60 p-3.5 rounded-md border border-slate-200 dark:border-zinc-800 text-xs space-y-1.5 font-semibold text-slate-700 dark:text-slate-300">
                    <div className="flex items-center gap-2">
                      <span className="w-40 text-slate-500 font-bold">Người xuất báo cáo:</span>
                      <span className="text-slate-900 dark:text-white font-extrabold">{reporterName || "Thành viên AntBiz"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-40 text-slate-500 font-bold">Thời gian xuất:</span>
                      <span>{new Date().toLocaleString('vi-VN')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-40 text-slate-500 font-bold">Khoảng thời gian lọc:</span>
                      <span className="text-indigo-600 dark:text-indigo-400 font-bold">{getTimeframeLabel()}</span>
                    </div>
                  </div>

                  {/* Section 1: Platform Summary Table */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                      BẢNG TỔNG QUAN CHỈ SỐ THEO NỀN TẢNG
                    </h3>

                    <div className="overflow-x-auto border border-slate-300 dark:border-zinc-800 rounded-md">
                      <table className="w-full text-left text-xs border-collapse font-sans">
                        <thead>
                          <tr className="bg-[#4F46E5] text-white font-extrabold text-[11px] uppercase tracking-wider text-center">
                            <th className="py-2.5 px-3 border border-[#4338CA] text-left">Nền tảng</th>
                            <th className="py-2.5 px-3 border border-[#4338CA]">Tổng bài</th>
                            <th className="py-2.5 px-3 border border-[#4338CA]">Đã đăng</th>
                            <th className="py-2.5 px-3 border border-[#4338CA]">Tỷ lệ thành công</th>
                            <th className="py-2.5 px-3 border border-[#4338CA]">Lượt thích</th>
                            <th className="py-2.5 px-3 border border-[#4338CA]">Bình luận</th>
                            <th className="py-2.5 px-3 border border-[#4338CA]">Chia sẻ</th>
                            <th className="py-2.5 px-3 border border-[#4338CA]">Click link</th>
                            <th className="py-2.5 px-3 border border-[#4338CA]">Tiếp cận</th>
                            <th className="py-2.5 px-3 border border-[#4338CA]">Lượt hiển thị</th>
                            <th className="py-2.5 px-3 border border-[#4338CA]">Tổng tương tác</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-zinc-800 text-slate-800 dark:text-slate-200 font-medium">
                          {/* Facebook Row */}
                          <tr className="hover:bg-slate-50 dark:hover:bg-zinc-800/40">
                            <td className="py-2 px-3 border border-slate-200 dark:border-zinc-800 font-bold text-[#1877F2]">Facebook</td>
                            <td className="py-2 px-3 border border-slate-200 dark:border-zinc-800 text-right">{fbStats.total}</td>
                            <td className="py-2 px-3 border border-slate-200 dark:border-zinc-800 text-right">{fbStats.posted}</td>
                            <td className="py-2 px-3 border border-slate-200 dark:border-zinc-800 text-right font-semibold">{fbStats.successRate}%</td>
                            <td className="py-2 px-3 border border-slate-200 dark:border-zinc-800 text-right">{fbStats.likes.toLocaleString('vi-VN')}</td>
                            <td className="py-2 px-3 border border-slate-200 dark:border-zinc-800 text-right">{fbStats.comments.toLocaleString('vi-VN')}</td>
                            <td className="py-2 px-3 border border-slate-200 dark:border-zinc-800 text-right">{fbStats.shares.toLocaleString('vi-VN')}</td>
                            <td className="py-2 px-3 border border-slate-200 dark:border-zinc-800 text-right">{fbStats.clicks.toLocaleString('vi-VN')}</td>
                            <td className="py-2 px-3 border border-slate-200 dark:border-zinc-800 text-right">{fbStats.reach.toLocaleString('vi-VN')}</td>
                            <td className="py-2 px-3 border border-slate-200 dark:border-zinc-800 text-right">{fbStats.impressions.toLocaleString('vi-VN')}</td>
                            <td className="py-2 px-3 border border-slate-200 dark:border-zinc-800 text-right font-extrabold">{fbStats.totalEngagements.toLocaleString('vi-VN')}</td>
                          </tr>

                          {/* Instagram Row */}
                          <tr className="hover:bg-slate-50 dark:hover:bg-zinc-800/40">
                            <td className="py-2 px-3 border border-slate-200 dark:border-zinc-800 font-bold text-[#E1306C]">Instagram</td>
                            <td className="py-2 px-3 border border-slate-200 dark:border-zinc-800 text-right">{igStats.total}</td>
                            <td className="py-2 px-3 border border-slate-200 dark:border-zinc-800 text-right">{igStats.posted}</td>
                            <td className="py-2 px-3 border border-slate-200 dark:border-zinc-800 text-right font-semibold">{igStats.successRate}%</td>
                            <td className="py-2 px-3 border border-slate-200 dark:border-zinc-800 text-right">{igStats.likes.toLocaleString('vi-VN')}</td>
                            <td className="py-2 px-3 border border-slate-200 dark:border-zinc-800 text-right">{igStats.comments.toLocaleString('vi-VN')}</td>
                            <td className="py-2 px-3 border border-slate-200 dark:border-zinc-800 text-right">{igStats.shares.toLocaleString('vi-VN')}</td>
                            <td className="py-2 px-3 border border-slate-200 dark:border-zinc-800 text-right">{igStats.clicks.toLocaleString('vi-VN')}</td>
                            <td className="py-2 px-3 border border-slate-200 dark:border-zinc-800 text-right">{igStats.reach.toLocaleString('vi-VN')}</td>
                            <td className="py-2 px-3 border border-slate-200 dark:border-zinc-800 text-right">{igStats.impressions.toLocaleString('vi-VN')}</td>
                            <td className="py-2 px-3 border border-slate-200 dark:border-zinc-800 text-right font-extrabold">{igStats.totalEngagements.toLocaleString('vi-VN')}</td>
                          </tr>

                          {/* Threads Row */}
                          <tr className="hover:bg-slate-50 dark:hover:bg-zinc-800/40">
                            <td className="py-2 px-3 border border-slate-200 dark:border-zinc-800 font-bold text-slate-900 dark:text-white">Threads</td>
                            <td className="py-2 px-3 border border-slate-200 dark:border-zinc-800 text-right">{threadsStats.total}</td>
                            <td className="py-2 px-3 border border-slate-200 dark:border-zinc-800 text-right">{threadsStats.posted}</td>
                            <td className="py-2 px-3 border border-slate-200 dark:border-zinc-800 text-right font-semibold">{threadsStats.successRate}%</td>
                            <td className="py-2 px-3 border border-slate-200 dark:border-zinc-800 text-right">{threadsStats.likes.toLocaleString('vi-VN')}</td>
                            <td className="py-2 px-3 border border-slate-200 dark:border-zinc-800 text-right">{threadsStats.comments.toLocaleString('vi-VN')}</td>
                            <td className="py-2 px-3 border border-slate-200 dark:border-zinc-800 text-right">{threadsStats.shares.toLocaleString('vi-VN')}</td>
                            <td className="py-2 px-3 border border-slate-200 dark:border-zinc-800 text-right">{threadsStats.clicks.toLocaleString('vi-VN')}</td>
                            <td className="py-2 px-3 border border-slate-200 dark:border-zinc-800 text-right">{threadsStats.reach.toLocaleString('vi-VN')}</td>
                            <td className="py-2 px-3 border border-slate-200 dark:border-zinc-800 text-right">{threadsStats.impressions.toLocaleString('vi-VN')}</td>
                            <td className="py-2 px-3 border border-slate-200 dark:border-zinc-800 text-right font-extrabold">{threadsStats.totalEngagements.toLocaleString('vi-VN')}</td>
                          </tr>

                          {/* Total Row */}
                          <tr className="bg-slate-100 dark:bg-zinc-800/80 font-black text-slate-900 dark:text-white border-t-2 border-slate-300 dark:border-zinc-700">
                            <td className="py-2.5 px-3 border border-slate-300 dark:border-zinc-700">Tổng cộng</td>
                            <td className="py-2.5 px-3 border border-slate-300 dark:border-zinc-700 text-right">{totalStats.total}</td>
                            <td className="py-2.5 px-3 border border-slate-300 dark:border-zinc-700 text-right text-emerald-600 dark:text-emerald-400">{totalStats.posted}</td>
                            <td className="py-2.5 px-3 border border-slate-300 dark:border-zinc-700 text-right text-emerald-600 dark:text-emerald-400">{totalStats.successRate}%</td>
                            <td className="py-2.5 px-3 border border-slate-300 dark:border-zinc-700 text-right">{totalStats.likes.toLocaleString('vi-VN')}</td>
                            <td className="py-2.5 px-3 border border-slate-300 dark:border-zinc-700 text-right">{totalStats.comments.toLocaleString('vi-VN')}</td>
                            <td className="py-2.5 px-3 border border-slate-300 dark:border-zinc-700 text-right">{totalStats.shares.toLocaleString('vi-VN')}</td>
                            <td className="py-2.5 px-3 border border-slate-300 dark:border-zinc-700 text-right">{totalStats.clicks.toLocaleString('vi-VN')}</td>
                            <td className="py-2.5 px-3 border border-slate-300 dark:border-zinc-700 text-right text-amber-600 dark:text-amber-400">{totalStats.reach.toLocaleString('vi-VN')}</td>
                            <td className="py-2.5 px-3 border border-slate-300 dark:border-zinc-700 text-right text-sky-600 dark:text-sky-400">{totalStats.impressions.toLocaleString('vi-VN')}</td>
                            <td className="py-2.5 px-3 border border-slate-300 dark:border-zinc-700 text-right text-pink-600 dark:text-pink-400">{totalStats.totalEngagements.toLocaleString('vi-VN')}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Section 2: Daily Engagement Trend Table */}
                  <div className="space-y-2 pt-2">
                    <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                      DỮ LIỆU XU HƯỚNG ENGAGEMENT (THEO NGÀY)
                    </h3>

                    <div className="overflow-x-auto border border-slate-300 dark:border-zinc-800 rounded-md">
                      <table className="w-full text-left text-xs border-collapse font-sans">
                        <thead>
                          <tr className="bg-[#10B981] text-white font-extrabold text-[11px] uppercase tracking-wider text-center">
                            <th className="py-2 px-3 border border-[#059669]">Ngày</th>
                            <th className="py-2 px-3 border border-[#059669]">Lượt thích</th>
                            <th className="py-2 px-3 border border-[#059669]">Bình luận</th>
                            <th className="py-2 px-3 border border-[#059669]">Click link</th>
                            <th className="py-2 px-3 border border-[#059669]">Tiếp cận</th>
                            <th className="py-2 px-3 border border-[#059669]">Lượt hiển thị</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-zinc-800 text-slate-800 dark:text-slate-200 font-medium">
                          {chartData.length > 0 ? (
                            chartData.map((day: any, idx: number) => (
                              <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-zinc-800/40">
                                <td className="py-1.5 px-3 border border-slate-200 dark:border-zinc-800 text-center font-bold">{day.date}</td>
                                <td className="py-1.5 px-3 border border-slate-200 dark:border-zinc-800 text-right">{day.likes.toLocaleString('vi-VN')}</td>
                                <td className="py-1.5 px-3 border border-slate-200 dark:border-zinc-800 text-right">{day.comments.toLocaleString('vi-VN')}</td>
                                <td className="py-1.5 px-3 border border-slate-200 dark:border-zinc-800 text-right">{day.clicks.toLocaleString('vi-VN')}</td>
                                <td className="py-1.5 px-3 border border-slate-200 dark:border-zinc-800 text-right">{day.reach.toLocaleString('vi-VN')}</td>
                                <td className="py-1.5 px-3 border border-slate-200 dark:border-zinc-800 text-right">{day.impressions.toLocaleString('vi-VN')}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={6} className="py-4 text-center text-slate-400 font-medium">
                                Chưa có dữ liệu xu hướng theo ngày trong khoảng thời gian này.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Sheet 2: Detailed Posts Table View */}
              {activeSheet === "details" && (
                <div className="p-4 sm:p-6 space-y-4">
                  {/* Detailed Table Header */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                      DANH SÁCH CHI TIẾT BÀI ĐĂNG ({posts.length} bài)
                    </h3>

                    {/* Filter Search */}
                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Tìm theo tiêu đề bài viết..."
                        className="w-full h-8 pl-9 pr-3 rounded-md border border-slate-300 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-xs font-semibold outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto border border-slate-300 dark:border-zinc-800 rounded-md">
                    <table className="w-full text-left text-xs border-collapse font-sans">
                      <thead>
                        <tr className="bg-[#1F2937] text-white font-extrabold text-[11px] uppercase tracking-wider text-center">
                          <th className="py-2.5 px-3 border border-[#374151] w-12">STT</th>
                          <th className="py-2.5 px-4 border border-[#374151] text-left">Tiêu đề / Nội dung bài viết</th>
                          <th className="py-2.5 px-3 border border-[#374151]">Nền tảng</th>
                          <th className="py-2.5 px-3 border border-[#374151]">Thời gian lên lịch</th>
                          <th className="py-2.5 px-3 border border-[#374151]">Thời gian đăng</th>
                          <th className="py-2.5 px-3 border border-[#374151]">Trạng thái</th>
                          <th className="py-2.5 px-3 border border-[#374151]">Lượt thích</th>
                          <th className="py-2.5 px-3 border border-[#374151]">Bình luận</th>
                          <th className="py-2.5 px-3 border border-[#374151]">Chia sẻ</th>
                          <th className="py-2.5 px-3 border border-[#374151]">Click link</th>
                          <th className="py-2.5 px-3 border border-[#374151]">Tiếp cận</th>
                          <th className="py-2.5 px-3 border border-[#374151]">Lượt hiển thị</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-zinc-800 text-slate-800 dark:text-slate-200 font-medium">
                        {filteredPosts.length > 0 ? (
                          filteredPosts.map((post: any, idx: number) => {
                            let inter = post.interactions || (Array.isArray(post.post_interactions) ? post.post_interactions[0] : post.post_interactions) || {};

                            return (
                              <tr key={post.id || idx} className="hover:bg-slate-50 dark:hover:bg-zinc-800/40">
                                <td className="py-2 px-3 border border-slate-200 dark:border-zinc-800 text-center font-bold">{idx + 1}</td>
                                <td className="py-2 px-4 border border-slate-200 dark:border-zinc-800 font-semibold text-slate-900 dark:text-white max-w-[320px] truncate" title={post.title}>
                                  {post.title}
                                </td>
                                <td className="py-2 px-3 border border-slate-200 dark:border-zinc-800 text-center capitalize font-bold text-slate-600 dark:text-slate-400">
                                  {post.platform}
                                </td>
                                <td className="py-2 px-3 border border-slate-200 dark:border-zinc-800 text-center font-mono text-[11px]">
                                  {post.scheduled_at ? new Date(post.scheduled_at).toLocaleString('vi-VN') : '—'}
                                </td>
                                <td className="py-2 px-3 border border-slate-200 dark:border-zinc-800 text-center font-mono text-[11px]">
                                  {post.posted_at ? new Date(post.posted_at).toLocaleString('vi-VN') : '—'}
                                </td>
                                <td className="py-2 px-3 border border-slate-200 dark:border-zinc-800 text-center">
                                  {post.status === "posted" ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                                      Đã đăng
                                    </span>
                                  ) : post.status === "failed" ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400">
                                      Thất bại
                                    </span>
                                  ) : post.status === "cancelled" ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400">
                                      Đã hủy
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                                      Chờ đăng
                                    </span>
                                  )}
                                </td>
                                <td className="py-2 px-3 border border-slate-200 dark:border-zinc-800 text-right font-mono">{inter.likes ? inter.likes.toLocaleString('vi-VN') : 0}</td>
                                <td className="py-2 px-3 border border-slate-200 dark:border-zinc-800 text-right font-mono">{inter.comments ? inter.comments.toLocaleString('vi-VN') : 0}</td>
                                <td className="py-2 px-3 border border-slate-200 dark:border-zinc-800 text-right font-mono">{inter.shares ? inter.shares.toLocaleString('vi-VN') : 0}</td>
                                <td className="py-2 px-3 border border-slate-200 dark:border-zinc-800 text-right font-mono">{inter.clicks ? inter.clicks.toLocaleString('vi-VN') : 0}</td>
                                <td className="py-2 px-3 border border-slate-200 dark:border-zinc-800 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">{inter.reach ? inter.reach.toLocaleString('vi-VN') : 0}</td>
                                <td className="py-2 px-3 border border-slate-200 dark:border-zinc-800 text-right font-mono font-bold text-sky-600 dark:text-sky-400">{inter.impressions ? inter.impressions.toLocaleString('vi-VN') : 0}</td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={12} className="py-8 text-center text-slate-400 font-medium">
                              Không tìm thấy bài viết nào phù hợp.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* Excel Workbook Sheet Tabs Bar (Bottom Sheet Selector) */}
          <div className="flex items-center justify-between px-4 py-2 bg-slate-200 dark:bg-zinc-950 border-t border-slate-300 dark:border-zinc-800 text-xs font-bold select-none">
            <div className="flex items-center gap-1 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveSheet("overview")}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-t-md transition-all cursor-pointer ${
                  activeSheet === "overview"
                    ? "bg-white dark:bg-zinc-900 text-emerald-700 dark:text-emerald-400 border-t-2 border-emerald-600 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-300/60 dark:hover:bg-zinc-900/60"
                }`}
              >
                <TableIcon size={14} />
                <span>Sheet 1: Overview</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSheet("details")}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-t-md transition-all cursor-pointer ${
                  activeSheet === "details"
                    ? "bg-white dark:bg-zinc-900 text-emerald-700 dark:text-emerald-400 border-t-2 border-emerald-600 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-300/60 dark:hover:bg-zinc-900/60"
                }`}
              >
                <TableIcon size={14} />
                <span>Sheet 2: Chi tiết bài đăng ({posts.length})</span>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[11px] text-slate-500 font-medium">
                Khung xem trước dữ liệu Excel chuẩn
              </span>
              <button
                type="button"
                onClick={onConfirmExport}
                disabled={isExporting}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-black shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                <Download size={14} />
                Tải file Excel (.xlsx)
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
