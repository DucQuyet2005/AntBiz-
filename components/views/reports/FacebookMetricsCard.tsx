"use client";

import React from "react";
import { Facebook, ThumbsUp, MessageCircle, Share2, Users } from "lucide-react";

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
  };
}

export function FacebookMetricsCard({ data }: Props) {
  const likes = data?.likes ?? data?.totalLikes ?? 0;
  const comments = data?.comments ?? data?.totalComments ?? 0;
  const shares = data?.shares ?? data?.totalShares ?? 0;
  const reach = data?.reach ?? data?.totalReach ?? 0;

  return (
    <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-950/30 via-slate-900/50 to-zinc-900/80 p-5 shadow-lg">
      <div className="flex items-center space-x-3 mb-4">
        <div className="h-9 w-9 rounded-xl bg-[#1877F2] flex items-center justify-center text-white shadow-md">
          <Facebook className="h-5 w-5 fill-current" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-white">Chỉ số Facebook Page</h4>
          <p className="text-xs text-slate-400">Hiệu suất tương tác trang Facebook đã kết nối</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-slate-900/60 border border-blue-500/10">
          <div className="flex items-center space-x-1.5 text-xs text-blue-400 mb-1">
            <ThumbsUp className="h-3.5 w-3.5" />
            <span>Lượt Thích</span>
          </div>
          <div className="text-lg font-black text-white">{likes.toLocaleString("vi-VN")}</div>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/60 border border-blue-500/10">
          <div className="flex items-center space-x-1.5 text-xs text-blue-400 mb-1">
            <MessageCircle className="h-3.5 w-3.5" />
            <span>Bình Luận</span>
          </div>
          <div className="text-lg font-black text-white">{comments.toLocaleString("vi-VN")}</div>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/60 border border-blue-500/10">
          <div className="flex items-center space-x-1.5 text-xs text-blue-400 mb-1">
            <Share2 className="h-3.5 w-3.5" />
            <span>Chia Sẻ</span>
          </div>
          <div className="text-lg font-black text-white">{shares.toLocaleString("vi-VN")}</div>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/60 border border-blue-500/10">
          <div className="flex items-center space-x-1.5 text-xs text-blue-400 mb-1">
            <Users className="h-3.5 w-3.5" />
            <span>Tiếp Cận</span>
          </div>
          <div className="text-lg font-black text-white">{reach.toLocaleString("vi-VN")}</div>
        </div>
      </div>
    </div>
  );
}
