import React from 'react';
import { Search, Plus, Bell } from 'lucide-react';
import Image from 'next/image';

const Header = () => {
  return (
    <header className="flex items-center justify-between py-6">
      <div className="relative w-96">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted w-5 h-5" />
        <input 
          type="text" 
          placeholder="Search..." 
          className="w-full bg-sidebar/50 rounded-full py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-text-muted"
        />
      </div>

      <div className="flex items-center gap-6">
        <button className="bg-primary hover:bg-primary-hover text-white px-6 py-2.5 rounded-full flex items-center gap-2 font-medium transition-colors shadow-md shadow-primary/20">
          <Plus size={18} />
          Add Post
        </button>
        
        <button className="relative text-primary hover:bg-sidebar p-2 rounded-full transition-colors">
          <Bell size={24} />
          <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-bg"></span>
        </button>

        <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-sm cursor-pointer">
          {/* Using a placeholder avatar since we don't have the real image */}
          <div className="w-full h-full bg-gray-300 flex items-center justify-center">
            <span className="text-gray-600 font-medium text-sm">JS</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
