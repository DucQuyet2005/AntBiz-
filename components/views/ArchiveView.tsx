"use client";

import React, { useState } from 'react';
import { 
  Facebook, 
  Instagram, 
  Globe, 
  TrendingUp, 
  Heart, 
  MessageSquare, 
  Search, 
  ChevronDown, 
  ArrowUpDown 
} from 'lucide-react';

// Threads Custom SVG Logo
const ThreadsIcon = ({ size = 14 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
    <path d="M22.5 12c0-5.799-4.701-10.5-10.5-10.5S1.5 6.201 1.5 12s4.701 10.5 10.5 10.5c2.328 0 4.475-.758 6.216-2.038l-1.39-1.39C15.42 19.98 13.784 20.5 12 20.5c-4.694 0-8.5-3.806-8.5-8.5s3.806-8.5 8.5-8.5 8.5 3.806 8.5 8.5c0 1.956-.503 3.659-1.42 4.8-.813 1.011-1.923 1.5-3.08 1.5-1.144 0-1.848-.553-2.128-1.123-.391-.798-.328-2.109-.328-3.177v-2.5c0-.828-.672-1.5-1.5-1.5s-1.5.672-1.5 1.5v2.5c0 .356-.002.83-.027 1.309a4 4 0 1 1-3.953-3.809c.28 0 .546.035.803.097V8.539c-.26-.025-.525-.039-.79-.039a7 7 0 1 0 5.679 11.096c.71.91 1.776 1.404 3.018 1.404 2.217 0 4.156-1.134 5.347-2.923 1.15-1.729 1.693-3.992 1.693-6.077zM9.5 12a1 1 0 1 0 2 0 1 1 0 0 0-2 0z" />
  </svg>
);

export default function ArchiveView() {
  const [platformFilter, setPlatformFilter] = useState('All Platforms');
  const [sortBy, setSortBy] = useState('Publish Date');

  const archiveItems = [
    {
      id: 1,
      type: 'CAMPAIGN',
      platform: 'blog',
      image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=400&auto=format&fit=crop',
      title: 'Organic Tech Recruiting Hub',
      description: 'Connecting candidate pipelines automatically with localized job previews from source nodes.',
      reach: '280k',
      conversions: '1.8k',
      likes: 120,
      comments: 14,
      nodeType: ''
    },
    {
      id: 2,
      type: 'THREAD',
      platform: 'threads',
      gradient: 'from-[#6366F1] via-[#D946EF] to-[#EC4899]',
      title: 'The Future of Generative UI',
      description: 'Why modular bento grids are capturing visual curiosity in modern software design tools. Structured as an interactive 4-post threads layout.',
      reach: '450k',
      conversions: '2.1k',
      likes: 432,
      comments: 37,
      nodeType: 'Organic Content Node'
    },
    {
      id: 3,
      type: 'ANALYTICS',
      platform: 'facebook',
      image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=400&auto=format&fit=crop',
      title: 'Q3 Engagement Surge',
      description: 'Analyzing target audience reach peaks and content distribution clusters on primary social feeds.',
      reach: '4.2M',
      conversions: '12.5k',
      likes: 8100,
      comments: 124,
      nodeType: ''
    },
    {
      id: 4,
      type: 'CAMPAIGN',
      platform: 'instagram',
      image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=400&auto=format&fit=crop',
      title: 'Summer Travel Series',
      description: 'Multi-platform travel visual guidelines and influencer outreach packages compiled for regional agencies.',
      reach: '950k',
      conversions: '4.7k',
      likes: 1240,
      comments: 89,
      nodeType: ''
    }
  ];

  return (
    <div className="flex flex-col gap-6">
      
      {/* Page Title & Subtitle */}
      <div className="mt-2">
        <h1 className="text-4xl font-bold text-text mb-1 tracking-tight">Campaign Directory Archive</h1>
        <p className="text-text-muted">Explore historic publications, variant details, conversion analytics, and assets library.</p>
      </div>

      {/* Search & Filters Controls Row */}
      <div className="flex justify-between items-center gap-4">
        
        {/* Search */}
        <div className="relative flex-1 max-w-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted w-5 h-5" />
          <input 
            type="text" 
            placeholder="Search archive title, tags, or description copy..." 
            className="w-full bg-sidebar/50 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-text-muted border border-gray-200/50 shadow-sm"
          />
        </div>

        {/* Dropdowns */}
        <div className="flex items-center gap-3">
          
          {/* Platform Filter */}
          <div className="relative">
            <button className="bg-white border border-gray-200 text-text px-4 py-3 rounded-2xl text-sm font-semibold shadow-sm hover:bg-gray-50 flex items-center gap-2 transition-colors cursor-pointer select-none">
              <span>{platformFilter}</span>
              <ChevronDown size={16} className="text-text-muted" />
            </button>
          </div>

          {/* Sort By */}
          <div className="relative">
            <button className="bg-white border border-gray-200 text-text px-4 py-3 rounded-2xl text-sm font-semibold shadow-sm hover:bg-gray-50 flex items-center gap-2 transition-colors cursor-pointer select-none">
              <ArrowUpDown size={14} className="text-text-muted" />
              <span>{sortBy}</span>
              <ChevronDown size={16} className="text-text-muted" />
            </button>
          </div>

        </div>

      </div>

      {/* 3-Column Grid Cards */}
      <div className="grid grid-cols-3 gap-6 mt-2">
        {archiveItems.map((item) => (
          <div 
            key={item.id} 
            className="bg-white border border-gray-200/60 rounded-[32px] overflow-hidden shadow-sm hover:shadow-md hover:translate-y-[-2px] transition-all cursor-pointer flex flex-col justify-between"
          >
            
            {/* Top Visual Banner */}
            <div className="h-44 w-full relative shrink-0 bg-gray-100">
              
              {/* Image if available */}
              {item.image ? (
                <img 
                  src={item.image} 
                  alt={item.title} 
                  className="w-full h-full object-cover"
                />
              ) : (
                /* Gradient background for text/thread card */
                <div className={`w-full h-full bg-gradient-to-tr ${item.gradient}`}></div>
              )}

              {/* Overlay Badges */}
              
              {/* Type Badge (Left) */}
              <span className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider select-none">
                {item.type}
              </span>

              {/* Platform Icon Badge (Right) */}
              <div className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/20 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white shadow-sm select-none">
                {item.platform === 'facebook' && <Facebook size={14} className="fill-white" />}
                {item.platform === 'instagram' && <Instagram size={14} />}
                {item.platform === 'blog' && <Globe size={14} />}
                {item.platform === 'threads' && <ThreadsIcon size={14} />}
              </div>

            </div>

            {/* Card Content Area */}
            <div className="p-6 flex-1 flex flex-col justify-between gap-6">
              
              {/* Title & Desc */}
              <div>
                {item.nodeType && (
                  <span className="text-[10px] font-bold text-rose-500 uppercase tracking-widest block mb-1">
                    {item.nodeType}
                  </span>
                )}
                <h3 className="text-lg font-extrabold text-text tracking-tight mb-2 hover:text-primary transition-colors">
                  {item.title}
                </h3>
                <p className="text-xs text-text-muted leading-relaxed font-medium">
                  {item.description}
                </p>
              </div>

              {/* Metrics & Reactions */}
              <div>
                {/* Horizontal divider */}
                <div className="border-t border-gray-100/80 my-4"></div>

                {/* Reach & Conversions */}
                <div className="flex gap-10">
                  <div>
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-0.5">Total Reach</span>
                    <span className="text-sm font-extrabold text-text flex items-center gap-1">
                      <TrendingUp size={14} className="text-emerald-500" />
                      {item.reach}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-0.5">Conversions</span>
                    <span className="text-sm font-extrabold text-text">
                      {item.conversions}
                    </span>
                  </div>
                </div>

                {/* Bottom Reactions */}
                <div className="flex items-center gap-4 text-xs font-semibold text-text-muted mt-5">
                  <div className="flex items-center gap-1.5 hover:text-red-500 transition-colors">
                    <Heart size={14} className="text-rose-400 fill-rose-50" />
                    <span>{item.likes >= 1000 ? `${(item.likes / 1000).toFixed(1)}k` : item.likes}</span>
                  </div>
                  <div className="flex items-center gap-1.5 hover:text-primary transition-colors">
                    <MessageSquare size={14} />
                    <span>{item.comments}</span>
                  </div>
                </div>

              </div>

            </div>

          </div>
        ))}
      </div>

    </div>
  );
}
