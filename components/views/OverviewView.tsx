import React from 'react';
import StatCard from '@/components/StatCard';
import ChartPlaceholder from '@/components/ChartPlaceholder';
import ActivityList from '@/components/ActivityList';
import { Send } from 'lucide-react';

export default function OverviewView() {
  return (
    <div className="flex flex-col gap-6">
      {/* Top Cards Row */}
      <div className="grid grid-cols-3 gap-6 mt-2">
        <StatCard 
          title="Posts Published" 
          value="1,204" 
          trend="+12% this week" 
          icon={<Send size={20} className="text-primary" />}
          variant="purple"
        >
          {/* Decorative wave background */}
          <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-primary/20 opacity-50 rounded-b-[32px] overflow-hidden" 
               style={{ clipPath: 'path("M0,40 C50,60 100,0 200,30 C300,60 400,20 400,20 L400,100 L0,100 Z")' }}></div>
        </StatCard>
        
        <StatCard 
          title="AI Tokens Saved" 
          value="" 
          subtitle="45k Tokens Remaining"
          variant="mint"
          className="items-center text-center"
        >
           <div className="relative w-32 h-32 my-2 flex items-center justify-center mx-auto">
             {/* Circle progress mock */}
             <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
               <circle cx="50" cy="50" r="40" fill="transparent" stroke="rgba(0,0,0,0.1)" strokeWidth="12" />
               <circle cx="50" cy="50" r="40" fill="transparent" stroke="#2D3748" strokeWidth="12" strokeDasharray="251.2" strokeDashoffset="62.8" strokeLinecap="round" />
             </svg>
             <div className="absolute flex flex-col items-center justify-center text-text">
               <span className="text-3xl font-bold">75%</span>
             </div>
           </div>
        </StatCard>
        
        <StatCard 
          title="Top Platform" 
          value="" 
          icon={<span className="font-bold text-lg">@</span>}
          variant="peach"
        >
           <div className="mt-4 mb-2 flex items-end justify-center gap-3 h-24">
             <div className="w-12 h-8 bg-black/10 rounded-t-full"></div>
             <div className="w-12 h-16 bg-black/20 rounded-t-full"></div>
             <div className="w-12 h-24 bg-[#4A3B2A] rounded-t-full"></div>
             <div className="w-12 h-6 bg-black/10 rounded-t-full"></div>
           </div>
           <div>
             <h4 className="text-xl font-bold text-text mb-1">Threads</h4>
             <p className="text-sm font-medium text-text-muted">Highest engagement rate</p>
           </div>
        </StatCard>
      </div>

      <ChartPlaceholder />
      
      <ActivityList />
      
      <div className="mt-2">
        <ChartPlaceholder />
      </div>
    </div>
  );
}
