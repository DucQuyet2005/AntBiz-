"use client";

import React from "react";
import { MessageSquare, Repeat, Heart, Eye } from "lucide-react";

interface Props {
  data?: {
    likes?: number;
    totalLikes?: number;
    comments?: number;
    totalComments?: number;
    shares?: number;
    totalShares?: number;
    reach?: number;
    totalReach?: number;
    impressions?: number;
    totalImpressions?: number;
  };
}

export function ThreadsMetricsCard({ data }: Props) {
  const likes = data?.likes ?? data?.totalLikes ?? 0;
  const comments = data?.comments ?? data?.totalComments ?? 0;
  const shares = data?.shares ?? data?.totalShares ?? 0;
  const impressions = data?.impressions ?? data?.totalImpressions ?? 0;

  return (
    <div className="rounded-2xl border border-zinc-700/50 bg-gradient-to-br from-zinc-950 via-zinc-900 to-black p-5 shadow-lg">
      <div className="flex items-center space-x-3 mb-4">
        <div className="h-9 w-9 rounded-xl bg-white text-black flex items-center justify-center font-bold text-sm shadow-md">
          @
        </div>
        <div>
          <h4 className="text-sm font-bold text-white">Chỉ số Threads Account</h4>
          <p className="text-xs text-zinc-400">Hiệu suất tương tác tài khoản Threads đã kết nối</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800">
          <div className="flex items-center space-x-1.5 text-xs text-zinc-400 mb-1">
            <Heart className="h-3.5 w-3.5 text-rose-500" />
            <span>Lượt Thích</span>
          </div>
          <div className="text-lg font-black text-white">{likes.toLocaleString("vi-VN")}</div>
        </div>

        <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800">
          <div className="flex items-center space-x-1.5 text-xs text-zinc-400 mb-1">
            <MessageSquare className="h-3.5 w-3.5 text-blue-400" />
            <span>Trả Lời</span>
          </div>
          <div className="text-lg font-black text-white">{comments.toLocaleString("vi-VN")}</div>
        </div>

        <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800">
          <div className="flex items-center space-x-1.5 text-xs text-zinc-400 mb-1">
            <Repeat className="h-3.5 w-3.5 text-emerald-400" />
            <span>Repost & Quote</span>
          </div>
          <div className="text-lg font-black text-white">{shares.toLocaleString("vi-VN")}</div>
        </div>

        <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800">
          <div className="flex items-center space-x-1.5 text-xs text-zinc-400 mb-1">
            <Eye className="h-3.5 w-3.5 text-purple-400" />
            <span>Lượt Xem (Views)</span>
          </div>
          <div className="text-lg font-black text-white">{impressions.toLocaleString("vi-VN")}</div>
        </div>
      </div>
    </div>
  );
}
