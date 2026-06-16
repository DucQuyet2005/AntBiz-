"use client";

import React from 'react';
import { Facebook, ArrowRight } from 'lucide-react';

// Threads logo style for the third card
const ThreadsLoopIcon = ({ size = 18 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5zm0-2c.28 0 .5-.22.5-.5s-.22-.5-.5-.5-.5.22-.5.5.22.5.5.5z" />
  </svg>
);

export default function ArchiveView() {
  return (
    <div className="flex flex-col gap-6">
      
      {/* Title Header */}
      <div className="mt-2">
        <h1 className="text-4xl font-bold text-text mb-1 tracking-tight">Archive</h1>
        <p className="text-text-muted">Your library of AI-generated masterpieces.</p>
      </div>

      {/* Archive Items List */}
      <div className="flex flex-col gap-5">
        
        {/* Item 1: Q3 Engagement Surge */}
        <div className="bg-[#CEEFE5] border border-[#BCE1D5] rounded-[32px] p-6 flex items-center gap-6 shadow-sm hover:shadow-md transition-shadow relative group cursor-pointer">
          {/* Visual Element (Left Chart Card) */}
          <div className="w-48 h-28 bg-[#1F4C3F] rounded-2xl relative overflow-hidden flex items-end justify-center gap-2 pb-4 px-6 shrink-0 shadow-inner">
            {/* Grid/dots background effect */}
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>
            
            {/* Vertical white bars */}
            <div className="w-4.5 h-12 bg-white rounded-full opacity-80"></div>
            <div className="w-4.5 h-18 bg-white rounded-full"></div>
            <div className="w-4.5 h-20 bg-white rounded-full"></div>
            <div className="w-4.5 h-15 bg-white rounded-full opacity-90"></div>
          </div>

          {/* Card Content (Right Side) */}
          <div className="flex-1 flex flex-col justify-between h-28 py-1">
            {/* Badges and Date Row */}
            <div className="flex justify-between items-start">
              <div className="flex gap-2">
                <span className="bg-[#A4DFCB]/60 text-[#173D32] px-3 py-1 rounded-full text-xs font-semibold">
                  Analytics
                </span>
                <span className="bg-white text-text border border-gray-200/50 px-3 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm">
                  <Facebook size={12} className="text-[#1877F2] fill-[#1877F2]" />
                  Facebook
                </span>
              </div>
              <span className="text-xs text-text-muted select-none">Oct 24</span>
            </div>

            {/* Title */}
            <h2 className="text-2xl font-bold text-[#142A24] tracking-tight">
              Q3 Engagement Surge
            </h2>

            {/* Metrics */}
            <div className="flex gap-12">
              <div>
                <span className="text-[10px] font-bold text-[#4D6A60] uppercase tracking-wider block">Reach</span>
                <span className="text-xl font-black text-[#142A24]">4.2M</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-[#4D6A60] uppercase tracking-wider block">Conversions</span>
                <span className="text-xl font-black text-[#142A24]">12.5k</span>
              </div>
            </div>
          </div>
        </div>

        {/* Item 2: Neon Horizons Collection */}
        <div className="bg-[#E7E9FD] border border-[#D5D7F9] rounded-[32px] p-6 flex items-center gap-6 shadow-sm hover:shadow-md transition-shadow relative group cursor-pointer">
          {/* Visual Element (Left Neon Image Card) */}
          <div className="w-48 h-28 bg-[#101424] rounded-2xl overflow-hidden relative shrink-0 shadow-inner">
            <img 
              src="https://images.unsplash.com/photo-1508739773434-c26b3d09e071?q=80&w=400&auto=format&fit=crop" 
              alt="Neon Horizons" 
              className="w-full h-full object-cover opacity-80"
            />
            {/* Cyan sci-fi neon overlay style */}
            <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/20 to-transparent"></div>
          </div>

          {/* Card Content (Right Side) */}
          <div className="flex-1 flex flex-col justify-between h-28 py-1">
            {/* Badges and Date Row */}
            <div className="flex justify-between items-start">
              <div>
                <span className="bg-[#CFD2FA] text-[#1E255C] px-3 py-1 rounded-full text-xs font-semibold">
                  Campaign
                </span>
              </div>
              <span className="text-xs text-text-muted select-none">Oct 24</span>
            </div>

            {/* Title */}
            <h2 className="text-2xl font-bold text-[#10142C] tracking-tight">
              Neon Horizons Collection
            </h2>

            {/* Metrics */}
            <div className="flex gap-12">
              <div>
                <span className="text-[10px] font-bold text-[#4E527D] uppercase tracking-wider block">Reach</span>
                <span className="text-xl font-black text-[#10142C]">1.8M</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-[#4E527D] uppercase tracking-wider block">Conversions</span>
                <span className="text-xl font-black text-[#10142C]">5.2k</span>
              </div>
            </div>
          </div>
        </div>

        {/* Item 3: The Future of Generative UI */}
        <div className="bg-[#F3E5CD] border border-[#E7D6BD] rounded-[32px] p-6 flex items-center gap-6 shadow-sm hover:shadow-md transition-shadow relative group cursor-pointer">
          {/* Visual Element (Left Beige Card with icon) */}
          <div className="w-48 h-28 bg-[#E5D2BA] rounded-2xl flex items-center justify-center shrink-0 shadow-inner">
            <div className="w-10 h-10 rounded-full bg-[#5D4E3C] text-[#E5D2BA] flex items-center justify-center shadow-md">
              <ThreadsLoopIcon size={20} />
            </div>
          </div>

          {/* Card Content (Right Side) */}
          <div className="flex-1 flex flex-col justify-between h-28 py-1">
            {/* Badges and Date Row */}
            <div className="flex justify-between items-start">
              <div>
                <span className="bg-[#E4D1BA] text-[#4E3F2E] px-3 py-1 rounded-full text-xs font-semibold">
                  Thread
                </span>
              </div>
              <span className="text-xs text-text-muted select-none">Sep 12</span>
            </div>

            {/* Title */}
            <h2 className="text-2xl font-bold text-[#4E3F2E] tracking-tight">
              The Future of Generative UI
            </h2>

            {/* Metrics */}
            <div className="flex gap-12">
              <div>
                <span className="text-[10px] font-bold text-[#7D6B58] uppercase tracking-wider block">Reach</span>
                <span className="text-xl font-black text-[#4E3F2E]">850k</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-[#7D6B58] uppercase tracking-wider block">Conversions</span>
                <span className="text-xl font-black text-[#4E3F2E]">1.2k</span>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
