"use client";

import React, { useState } from 'react';
import { 
  Link2, 
  Globe, 
  Check, 
  Facebook, 
  Instagram, 
  MessageCircle, 
  Sparkles, 
  MoreHorizontal, 
  ThumbsUp, 
  MessageSquare, 
  Share2,
  CheckCircle2
} from 'lucide-react';

export default function AiCreatorView() {
  const [activeVariant, setActiveVariant] = useState<'A' | 'B'>('A');
  const [activePlatform, setActivePlatform] = useState<'instagram' | 'facebook'>('facebook');
  const [url, setUrl] = useState('https://gocnhinmoi.com.vn/ai-trend-2026');
  
  // Channels selection state
  const [channels, setChannels] = useState({
    instagram: true,
    facebook: true,
    threads: true
  });

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Top Header Row */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mt-2">
        <div>
          <h1 className="text-3xl font-bold text-text tracking-tight">AI Publishing Creator</h1>
          <p className="text-sm text-text-muted mt-1">Orchestrate hyper-optimized copy variants from single URL inputs.</p>
        </div>
        <div className="flex items-center self-start md:self-center">
          <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-sidebar text-primary border border-primary/10">
            Gemini-3.5-Flash Active Engine
          </span>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column - Inputs & Options (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Source Context Importer Card */}
          <div className="bg-[#C4F0E1]/40 border border-[#C4F0E1] rounded-[24px] p-6 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#34D399]/20 flex items-center justify-center text-[#059669]">
                <Globe size={18} />
              </div>
              <h2 className="text-lg font-bold text-text">Source Context Importer</h2>
            </div>
            
            <p className="text-xs text-text-muted leading-relaxed">
              Input any blog, product URL, or topic node. Our server extracts metadata tags to define your brand intent.
            </p>
            
            <div className="flex items-center gap-2 bg-white rounded-xl p-1.5 border border-gray-200 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
              <span className="text-gray-400 pl-2">
                <Link2 size={16} />
              </span>
              <input 
                type="text" 
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="flex-1 bg-transparent px-2 py-1.5 text-xs text-text focus:outline-none"
              />
              <button className="bg-[#4A6B5D] hover:bg-[#3A5B4D] text-white px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors">
                Fetch
              </button>
            </div>
          </div>

          {/* Target Channels Card */}
          <div className="bg-white border border-gray-200 rounded-[24px] p-6 flex flex-col gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <CheckCircle2 size={18} />
              </div>
              <h2 className="text-lg font-bold text-text">Target Channels</h2>
            </div>
            
            <p className="text-xs text-text-muted leading-relaxed">
              Select key target social networks to tailor tone layouts, hashtags structures, and image dimension guides.
            </p>
            
            <div className="flex flex-col gap-2.5">
              {/* Instagram */}
              <button 
                onClick={() => setChannels({ ...channels, instagram: !channels.instagram })}
                className={`flex items-center justify-between p-3.5 rounded-xl border text-left transition-all ${
                  channels.instagram 
                    ? 'border-primary/30 bg-primary/5 text-text' 
                    : 'border-gray-200 hover:bg-gray-50 text-text-muted'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Instagram size={16} className={channels.instagram ? 'text-primary' : 'text-gray-400'} />
                  <span className="text-xs font-semibold">Instagram Direct</span>
                </div>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                  channels.instagram ? 'bg-primary text-white' : 'border border-gray-300'
                }`}>
                  {channels.instagram && <Check size={12} />}
                </div>
              </button>

              {/* Facebook */}
              <button 
                onClick={() => setChannels({ ...channels, facebook: !channels.facebook })}
                className={`flex items-center justify-between p-3.5 rounded-xl border text-left transition-all ${
                  channels.facebook 
                    ? 'border-primary/30 bg-primary/5 text-text' 
                    : 'border-gray-200 hover:bg-gray-50 text-text-muted'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Facebook size={16} className={channels.facebook ? 'text-primary' : 'text-gray-400'} />
                  <span className="text-xs font-semibold">Facebook Pages</span>
                </div>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                  channels.facebook ? 'bg-primary text-white' : 'border border-gray-300'
                }`}>
                  {channels.facebook && <Check size={12} />}
                </div>
              </button>

              {/* Threads */}
              <button 
                onClick={() => setChannels({ ...channels, threads: !channels.threads })}
                className={`flex items-center justify-between p-3.5 rounded-xl border text-left transition-all ${
                  channels.threads 
                    ? 'border-primary/30 bg-primary/5 text-text' 
                    : 'border-gray-200 hover:bg-gray-50 text-text-muted'
                }`}
              >
                <div className="flex items-center gap-3">
                  <MessageCircle size={16} className={channels.threads ? 'text-primary' : 'text-gray-400'} />
                  <span className="text-xs font-semibold">Threads Feed</span>
                </div>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                  channels.threads ? 'bg-primary text-white' : 'border border-gray-300'
                }`}>
                  {channels.threads && <Check size={12} />}
                </div>
              </button>
            </div>
          </div>

          {/* Action CTA Button */}
          <button className="w-full bg-gradient-to-r from-primary to-primary-hover hover:from-primary-hover hover:to-primary text-white py-4 px-6 rounded-2xl font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-2.5 transition-all hover:scale-[1.01] active:scale-95 text-sm">
            <Sparkles size={18} />
            Generate Optimized Content Variants
          </button>

        </div>

        {/* Right Column - Sandbox Previews (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-gray-200 rounded-[24px] p-6 shadow-sm flex flex-col gap-6">
          
          {/* Header of Sandbox */}
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-pink-500 animate-pulse"></span>
              <h2 className="text-lg font-bold text-text">Variant Sandbox Previews</h2>
            </div>
            
            {/* Variant Switcher Capsule */}
            <div className="flex bg-sidebar rounded-full p-1 border border-primary/5 shadow-inner">
              <button 
                onClick={() => setActiveVariant('A')}
                className={`text-xs font-bold px-4 py-1.5 rounded-full transition-all ${
                  activeVariant === 'A' 
                    ? 'bg-primary text-white shadow-sm' 
                    : 'text-text-muted hover:text-text'
                }`}
              >
                Variant A
              </button>
              <button 
                onClick={() => setActiveVariant('B')}
                className={`text-xs font-bold px-4 py-1.5 rounded-full transition-all ${
                  activeVariant === 'B' 
                    ? 'bg-primary text-white shadow-sm' 
                    : 'text-text-muted hover:text-text'
                }`}
              >
                Variant B
              </button>
            </div>
          </div>

          {/* Platform Toggle Tabs */}
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setActivePlatform('instagram')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all border ${
                activePlatform === 'instagram' 
                  ? 'bg-primary/5 border-primary/30 text-primary' 
                  : 'bg-white border-gray-200 text-text-muted hover:text-text'
              }`}
            >
              <Instagram size={14} />
              Instagram Feed
            </button>
            
            <button 
              onClick={() => setActivePlatform('facebook')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all border ${
                activePlatform === 'facebook' 
                  ? 'bg-primary/5 border-primary/30 text-primary' 
                  : 'bg-white border-gray-200 text-text-muted hover:text-text'
              }`}
            >
              <Facebook size={14} />
              Facebook Desk
            </button>
          </div>

          {/* Social Post Feed Wrapper */}
          <div className="bg-[#F4F5F9]/60 border border-gray-200/50 rounded-2xl p-6 flex justify-center">
            
            {/* The Actual Post Card */}
            <div className="w-full max-w-[500px] bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
              
              {/* Post Header */}
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Brand Profile Logo Icon */}
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-extrabold text-lg shadow-sm">
                    A
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-text">AntBiz Official</h4>
                    <p className="text-[10px] text-text-muted mt-0.5 font-medium">Sponsored · Paid Audience Reach</p>
                  </div>
                </div>
                <button className="text-gray-400 hover:text-gray-600">
                  <MoreHorizontal size={18} />
                </button>
              </div>

              {/* Post Caption */}
              <div className="px-4 pb-3 text-xs text-text leading-relaxed">
                {activeVariant === 'A' ? (
                  <>
                    We are thrilled to launch AntBiz Systems: a complete AI Content Orchestration suite. 
                    Achieve 4x faster production speeds and connect Your Shopify, WordPress, or custom portals directly! 
                    Check our profile to book a private demonstration. ↗️
                  </>
                ) : (
                  <>
                    Scale your content publishing effortlessly with AntBiz. Our AI-driven content generation and multi-channel 
                    scheduler automate your workflows. Connect your ecommerce or blog directly and start scaling today! 🚀
                  </>
                )}
              </div>

              {/* Post Image (Beautiful Colorful Wave Gradient matching screenshot) */}
              <div className="aspect-[1.91/1] w-full bg-gradient-to-tr from-cyan-400 via-purple-500 to-amber-300 relative overflow-hidden flex items-center justify-center">
                {/* Decorative glowing abstract shape inside image container */}
                <div className="absolute inset-0 opacity-40 mix-blend-overlay bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white via-indigo-950 to-black"></div>
                <div className="absolute w-72 h-72 rounded-full bg-pink-400/30 blur-2xl -top-10 -left-10"></div>
                <div className="absolute w-72 h-72 rounded-full bg-teal-400/30 blur-2xl -bottom-10 -right-10"></div>
                <span className="z-10 text-white font-extrabold text-xl tracking-wider drop-shadow-md">ANTBIZ SYSTEMS</span>
              </div>

              {/* Post URL Link Preview card */}
              <div className="p-3.5 bg-gray-50 border-t border-b border-gray-100 flex flex-col gap-0.5">
                <span className="text-[9px] font-bold text-primary tracking-wider uppercase">ANTBIZ.IO</span>
                <h5 className="text-xs font-bold text-text leading-tight">AntBiz - Smart Publishing Orchestration Platform</h5>
                <p className="text-[10px] text-text-muted leading-snug mt-0.5">Instantly deploy, schedule, and refine automated bento workflows using cloud...</p>
              </div>

              {/* Stats Bar */}
              <div className="px-4 py-2 flex items-center justify-between border-b border-gray-100 text-[10px] text-text-muted font-medium">
                <div className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center text-white text-[8px] font-bold">👍</span>
                  <span>2.4k Likes</span>
                </div>
                <div>
                  <span>186 Shares</span>
                </div>
              </div>

              {/* Interactive Actions Row */}
              <div className="px-2 py-1 flex items-center justify-between text-xs text-text-muted font-bold">
                <button className="flex-1 py-2 hover:bg-gray-50 rounded-lg flex items-center justify-center gap-1.5 transition-colors">
                  <ThumbsUp size={14} />
                  <span>Like</span>
                </button>
                <button className="flex-1 py-2 hover:bg-gray-50 rounded-lg flex items-center justify-center gap-1.5 transition-colors">
                  <MessageSquare size={14} />
                  <span>Reply</span>
                </button>
                <button className="flex-1 py-2 hover:bg-gray-50 rounded-lg flex items-center justify-center gap-1.5 transition-colors">
                  <Share2 size={14} />
                  <span>Share</span>
                </button>
              </div>

            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

