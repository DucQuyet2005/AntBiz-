"use client";

import React, { useState } from 'react';
import { 
  User, 
  Settings, 
  Bell, 
  MessageSquare, 
  Image as ImageIcon,
  Check
} from 'lucide-react';

// API Plug / Connection icon custom SVG to match mockup
const PlugIcon = ({ size = 20 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
  </svg>
);

export default function SettingsView() {
  // State for interactive inputs
  const [displayName, setDisplayName] = useState('Alex Rivera');
  const [emailAddress, setEmailAddress] = useState('alex@luminacreator.ai');
  const [openaiConnected, setOpenaiConnected] = useState(true);
  const [midjourneyConnected, setMidjourneyConnected] = useState(false);
  const [aiGenNotify, setAiGenNotify] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="flex flex-col gap-6">
      
      {/* Title Header */}
      <div className="mt-2">
        <h1 className="text-4xl font-bold text-text mb-1 tracking-tight">Settings</h1>
        <p className="text-text-muted">Manage your creator profile and AI integrations.</p>
      </div>

      {/* Profile Information Card (Full Width) */}
      <div className="bg-[#F3F4FD] border border-[#E4E6F8] rounded-[32px] p-8 flex flex-col gap-6">
        
        {/* Card Header */}
        <div className="flex items-center gap-3 text-[#3F51B5] font-bold text-lg">
          <User size={20} />
          <h2>Profile Information</h2>
        </div>

        {/* Card Content split */}
        <div className="flex gap-10 items-start">
          
          {/* Avatar side */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-white shadow-md">
              <img 
                src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop" 
                alt="User Profile" 
                className="w-full h-full object-cover"
              />
            </div>
            <button className="text-xs font-bold text-[#3F51B5] hover:text-indigo-800 transition-colors">
              Change Avatar
            </button>
          </div>

          {/* Inputs side */}
          <div className="flex-1 flex flex-col gap-4">
            
            {/* Input 1 */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-text-muted">Display Name</label>
              <input 
                type="text" 
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full max-w-xl bg-white text-text px-5 py-3 rounded-2xl shadow-sm border border-gray-200/50 focus:outline-none text-sm font-semibold focus:ring-2 focus:ring-[#3F51B5]/25"
              />
            </div>

            {/* Input 2 */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-text-muted">Email Address</label>
              <input 
                type="email" 
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
                className="w-full max-w-xl bg-white text-text px-5 py-3 rounded-2xl shadow-sm border border-gray-200/50 focus:outline-none text-sm font-semibold focus:ring-2 focus:ring-[#3F51B5]/25"
              />
            </div>

            {/* Save Changes button positioned on the right */}
            <div className="flex justify-end mt-2">
              <button 
                onClick={handleSave}
                className="bg-[#3F51B5] hover:bg-indigo-700 text-white px-8 py-3 rounded-full font-bold text-sm transition-all shadow-md shadow-[#3F51B5]/20 flex items-center gap-2 select-none hover:scale-102"
              >
                {isSaved ? (
                  <>
                    <Check size={16} />
                    Saved
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>

          </div>

        </div>

      </div>

      {/* Two Column Grid */}
      <div className="grid grid-cols-12 gap-6 items-stretch">
        
        {/* Left Column: API Integrations (Dark Green Card) */}
        <div className="col-span-7 bg-[#4E7164] border border-[#3E5C50] rounded-[32px] p-8 flex flex-col gap-6 text-white justify-between">
          
          <div>
            {/* Header */}
            <div className="flex items-center gap-3 font-bold text-lg text-white">
              <PlugIcon size={20} />
              <h2>API Integrations</h2>
            </div>
            
            {/* Subtitle */}
            <p className="text-xs font-medium text-white/80 mt-2">
              Connect your favorite tools to streamline your workflow.
            </p>
            
            {/* Integration connections list */}
            <div className="flex flex-col gap-4 mt-6">
              
              {/* OpenAI GPT-4 connection */}
              <div className="bg-white rounded-2xl p-4 flex items-center justify-between text-text shadow-sm border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#EDE9FE] text-[#6366F1] flex items-center justify-center shrink-0">
                    <MessageSquare size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold">OpenAI GPT-4</h4>
                    <span className="text-[10px] text-emerald-600 font-semibold block mt-[2px]">Connected</span>
                  </div>
                </div>
                <button 
                  onClick={() => setOpenaiConnected(!openaiConnected)}
                  className="text-xs font-bold text-red-500 hover:text-red-700 transition-colors px-3 py-1 cursor-pointer select-none"
                >
                  {openaiConnected ? 'Disconnect' : 'Connect'}
                </button>
              </div>

              {/* Midjourney connection */}
              <div className="bg-white rounded-2xl p-4 flex items-center justify-between text-text shadow-sm border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 text-gray-400 flex items-center justify-center shrink-0">
                    <ImageIcon size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold">Midjourney API</h4>
                    <span className="text-[10px] text-text-muted font-semibold block mt-[2px]">
                      {midjourneyConnected ? 'Connected' : 'Not Connected'}
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => setMidjourneyConnected(!midjourneyConnected)}
                  className="text-xs font-bold text-[#3F51B5] hover:text-indigo-800 transition-colors px-3 py-1 cursor-pointer select-none"
                >
                  {midjourneyConnected ? 'Disconnect' : 'Connect'}
                </button>
              </div>

            </div>
          </div>

        </div>

        {/* Right Column: Notifications (Light Lavender Card) */}
        <div className="col-span-5 bg-[#F3F4FD] border border-[#E4E6F8] rounded-[32px] p-8 flex flex-col gap-6 text-[#1E293B]">
          
          {/* Header */}
          <div className="flex items-center gap-3 font-bold text-lg text-[#3F51B5]">
            <Bell size={20} />
            <h2>Notifications</h2>
          </div>

          {/* Configuration List */}
          <div className="flex flex-col gap-6 mt-2">
            
            {/* Config Item 1 */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-bold">AI Generation Complete</span>
                <span className="text-[10px] text-text-muted font-semibold leading-relaxed">
                  Get notified when batch processing finishes.
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none shrink-0 mt-1">
                <input 
                  type="checkbox" 
                  checked={aiGenNotify}
                  onChange={() => setAiGenNotify(!aiGenNotify)}
                  className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-0 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#3F51B5]"></div>
              </label>
            </div>

            {/* Config Item 2 */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-bold">Weekly Digest</span>
                <span className="text-[10px] text-text-muted font-semibold leading-relaxed">
                  A summary of your top performing content.
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none shrink-0 mt-1">
                <input 
                  type="checkbox" 
                  checked={weeklyDigest}
                  onChange={() => setWeeklyDigest(!weeklyDigest)}
                  className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-0 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#3F51B5]"></div>
              </label>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
