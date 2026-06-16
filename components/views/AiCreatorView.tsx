import React from 'react';
import { Link2, Share2, Facebook, Instagram, MessageCircle, Heart, MessageSquare, Send, Bookmark, ThumbsUp, Sparkles } from 'lucide-react';

export default function AiCreatorView() {
  return (
    <div className="flex flex-col gap-6">
      <div className="mt-2">
        <h1 className="text-4xl font-bold text-text mb-2 tracking-tight">New Campaign</h1>
        <p className="text-text-muted">Configure AI data sources and target distribution channels.</p>
      </div>

      {/* Config Cards */}
      <div className="grid grid-cols-5 gap-6">
        {/* Data Source */}
        <div className="col-span-2 bg-[#C4F0E1] rounded-[32px] p-8 flex flex-col relative overflow-hidden">
          <div className="flex items-center gap-3 mb-4 relative z-10">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
              <Link2 size={20} className="text-text" />
            </div>
            <h2 className="text-xl font-bold text-text">Data Source</h2>
          </div>
          <p className="text-sm text-text-muted mb-8 relative z-10">
            Paste an article URL to extract content, tone, and key insights automatically.
          </p>
          <div className="mt-auto relative z-10 flex gap-2 bg-white rounded-full p-2 shadow-sm">
            <input 
              type="text" 
              defaultValue="https://gocnhin"
              className="flex-1 bg-transparent px-4 py-2 text-sm focus:outline-none"
            />
            <button className="bg-[#4A6B5D] hover:bg-[#3A5B4D] text-white px-6 py-2 rounded-full text-sm font-medium transition-colors">
              Fetch
            </button>
          </div>
        </div>

        {/* Distribution Channels */}
        <div className="col-span-3 bg-[#F4F5F9] border border-primary/10 shadow-sm rounded-[32px] p-8 flex flex-col relative overflow-hidden">
          <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-0"></div>
          <div className="flex items-center gap-3 mb-4 relative z-10">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
              <Share2 size={20} className="text-primary" />
            </div>
            <h2 className="text-xl font-bold text-text">Distribution Channels</h2>
          </div>
          <p className="text-sm text-text-muted mb-8 relative z-10">
            Select platforms to generate tailored content variations.
          </p>
          <div className="mt-auto relative z-10 flex gap-4">
            <button className="flex items-center gap-2 bg-[#5A5CDE] text-white px-6 py-3 rounded-full font-medium shadow-md shadow-primary/20">
              <Facebook size={18} />
              Facebook
            </button>
            <button className="flex items-center gap-2 bg-[#5A5CDE] text-white px-6 py-3 rounded-full font-medium shadow-md shadow-primary/20">
              <Instagram size={18} />
              Instagram
            </button>
            <button className="flex items-center gap-2 bg-white border border-gray-200 text-text hover:bg-gray-50 px-6 py-3 rounded-full font-medium transition-colors">
              <MessageCircle size={18} />
              Threads
            </button>
          </div>
        </div>
      </div>

      {/* A/B Testing Previews */}
      <div className="bg-[#DFE1FA]/40 rounded-[32px] p-8 border border-primary/10">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white flex flex-col items-center justify-center gap-[2px] shadow-sm">
              <div className="w-4 h-[3px] bg-text rounded-full"></div>
              <div className="w-4 h-[3px] bg-text rounded-full"></div>
            </div>
            <h2 className="text-xl font-bold text-text">A/B Testing Previews</h2>
          </div>
          <div className="flex bg-white rounded-full p-1 shadow-sm">
            <button className="bg-primary text-white text-xs font-medium px-4 py-1.5 rounded-full">Variant A</button>
            <button className="text-text-muted text-xs font-medium px-4 py-1.5 rounded-full hover:text-text">Variant B</button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8">
          {/* Instagram Preview */}
          <div className="bg-white rounded-[24px] shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full border border-orange-400 p-[2px]">
                  <div className="w-full h-full rounded-full border border-gray-200"></div>
                </div>
                <span className="text-sm font-medium">brand_account</span>
              </div>
              <div className="flex gap-1">
                <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
              </div>
            </div>
            
            <div className="aspect-square bg-[#F3D5E7] relative">
               <img src="https://images.unsplash.com/photo-1541701494587-cb58502866ab?q=80&w=400&auto=format&fit=crop" alt="Abstract" className="w-full h-full object-cover opacity-80" />
               <div className="absolute inset-0 bg-[#EAC9E5] mix-blend-color"></div>
            </div>
            
            <div className="p-4 flex-1 flex flex-col">
              <div className="flex justify-between items-center mb-3 text-text">
                <div className="flex gap-4">
                  <Heart size={24} />
                  <MessageSquare size={24} />
                  <Send size={24} />
                </div>
                <Bookmark size={24} />
              </div>
              
              <div className="text-sm mb-4">
                 <p>Discover the future of AI content generation...</p>
              </div>
              
              <div className="mt-auto">
                <div className="border border-primary rounded-2xl p-2 flex items-center bg-primary/5 mb-4">
                  <input type="text" defaultValue="Discover the future of AI content generation..." className="flex-1 bg-transparent text-sm focus:outline-none px-2" />
                  <button className="bg-primary hover:bg-primary-hover text-white text-xs font-medium px-4 py-2 rounded-xl flex items-center gap-1">
                    <Sparkles size={12} />
                    Refine
                  </button>
                </div>
                <div className="flex gap-3">
                  <button className="flex-1 bg-primary hover:bg-primary-hover text-white py-2.5 rounded-xl text-sm font-medium transition-colors">Save Changes</button>
                  <button className="flex-1 bg-gray-200 hover:bg-gray-300 text-text py-2.5 rounded-xl text-sm font-medium transition-colors">Discard</button>
                </div>
              </div>
            </div>
          </div>

          {/* LinkedIn/Facebook Preview */}
          <div className="bg-white rounded-[24px] shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#5A5CDE]"></div>
              <div>
                <div className="text-sm font-bold">Brand Page Name</div>
                <div className="text-xs text-text-muted">2h • 🌎</div>
              </div>
            </div>
            
            <div className="px-4 text-sm mb-4">
              <div className="border border-primary rounded-2xl p-3 bg-primary/5 flex items-start gap-2">
                <p className="flex-1 text-xs">We're revolutionizing how creators build content. Check out our latest insights on scaling your workflow with AI-driven tools. 🚀👇</p>
                <button className="bg-primary hover:bg-primary-hover text-white text-[10px] font-medium px-3 py-1.5 rounded-full flex items-center gap-1 shrink-0 mt-auto">
                  <Sparkles size={10} />
                  Refine
                </button>
              </div>
            </div>
            
            <div className="aspect-[16/9] bg-gray-100 relative">
              <img src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=600&auto=format&fit=crop" alt="Chart on Laptop" className="w-full h-full object-cover" />
            </div>
            
            <div className="p-4 bg-gray-50 border-b border-gray-100">
              <div className="text-xs text-text-muted mb-1">GOCNHINMOI.COM.VN</div>
              <div className="text-sm font-bold">10 Ways AI is Changing Content Creation in 2024</div>
            </div>

            <div className="px-4 py-3 flex justify-between border-b border-gray-100 text-text-muted text-sm font-medium">
              <button className="flex items-center gap-2 hover:text-primary"><ThumbsUp size={18} /> Like</button>
              <button className="flex items-center gap-2 hover:text-primary"><MessageSquare size={18} /> Comment</button>
              <button className="flex items-center gap-2 hover:text-primary"><Share2 size={18} /> Share</button>
            </div>

            <div className="p-4 mt-auto">
               <div className="flex gap-3">
                  <button className="flex-1 bg-primary hover:bg-primary-hover text-white py-2.5 rounded-xl text-sm font-medium transition-colors">Save Changes</button>
                  <button className="flex-1 bg-gray-200 hover:bg-gray-300 text-text py-2.5 rounded-xl text-sm font-medium transition-colors">Discard</button>
                </div>
            </div>
          </div>
        </div>
      </div>

      {/* Generate Button */}
      <div className="flex justify-center mt-6">
        <button className="bg-[#4143D1] hover:bg-primary-hover text-white px-10 py-4 rounded-full text-lg font-bold shadow-lg shadow-primary/30 flex items-center gap-3 transition-transform hover:scale-105">
          <Sparkles size={24} />
          Generate Content
        </button>
      </div>
    </div>
  );
}
