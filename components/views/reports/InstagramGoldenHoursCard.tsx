"use client";

import React, { useState, useEffect } from "react";
import { Clock, Sparkles, TrendingUp, Calendar, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

interface GoldenSlot {
  dayOfWeek: number;
  dayName: string;
  hourOfDay: number;
  avgEngagementRate: number;
  totalPosts: number;
  isOptimal: boolean;
}

interface Props {
  platform?: string;
}

export function InstagramGoldenHoursCard({ platform = "all" }: Props) {
  const [loading, setLoading] = useState(true);
  const [recommendation, setRecommendation] = useState("");
  const [platformName, setPlatformName] = useState("");
  const [topSlots, setTopSlots] = useState<GoldenSlot[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchGoldenHours() {
      try {
        setLoading(true);
        const res = await fetch(`/api/reports/golden-hours?platform=${platform}`);
        if (!res.ok) {
          throw new Error("Không thể tải dữ liệu Khung Giờ Vàng");
        }
        const data = await res.json();
        setRecommendation(data.recommendation || "");
        setPlatformName(data.platformName || "Mạng xã hội");
        setTopSlots(data.topSlots || []);
      } catch (err: any) {
        setError(err.message || "Lỗi khi kết nối API");
      } finally {
        setLoading(false);
      }
    }

    fetchGoldenHours();
  }, [platform]);

  return (
    <div className="rounded-2xl border border-pink-500/20 bg-gradient-to-br from-pink-950/30 via-purple-950/20 to-slate-900/60 p-6 backdrop-blur-xl shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white shadow-md shadow-rose-500/20">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              Khung Giờ Vàng ({platformName})
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30">
                <Clock className="h-3 w-3" /> AI Gợi Ý
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Phân tích thời điểm tương tác cao nhất dựa trên dữ liệu thật
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex h-32 items-center justify-center space-x-2 text-slate-400">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-pink-500 border-t-transparent"></div>
          <span className="text-sm">Đang tính toán khung giờ tương tác cao nhất...</span>
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-900/80 border border-pink-500/30 text-slate-200 text-sm flex items-start space-x-3 shadow-inner">
            <TrendingUp className="h-5 w-5 text-pink-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">{recommendation}</div>
          </div>

          {topSlots.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
                Top Khung Giờ Đăng Bài Hiệu Quả Nhất:
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {topSlots.map((slot, idx) => (
                  <motion.div
                    key={`${slot.dayOfWeek}_${slot.hourOfDay}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="p-3 rounded-xl bg-slate-800/60 border border-pink-500/20 hover:border-pink-500/40 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-2.5">
                      <div className="h-8 w-8 rounded-lg bg-pink-500/20 flex items-center justify-center text-pink-300">
                        <Calendar className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">{slot.dayName}</div>
                        <div className="text-xs text-pink-400 font-mono font-semibold">
                          {slot.hourOfDay.toString().padStart(2, '0')}:00 - {(slot.hourOfDay + 1).toString().padStart(2, '0')}:00
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-extrabold text-emerald-400">
                        {slot.avgEngagementRate}%
                      </div>
                      <div className="text-[10px] text-slate-400">Tương tác</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
