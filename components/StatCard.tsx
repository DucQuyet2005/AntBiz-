import React from 'react';
import { ArrowUpRight } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  trend?: string;
  icon?: React.ReactNode;
  variant?: 'purple' | 'mint' | 'peach';
  className?: string;
  children?: React.ReactNode;
}

const StatCard = ({ title, value, subtitle, trend, icon, variant = 'purple', className = '', children }: StatCardProps) => {
  const bgColors = {
    purple: 'bg-[#DFE1FA]',
    mint: 'bg-[#C4F0E1]',
    peach: 'bg-[#EED7C8]'
  };

  return (
    <div className={`${bgColors[variant]} rounded-[32px] p-6 relative overflow-hidden flex flex-col justify-between ${className}`}>
      <div className="flex justify-between items-start z-10 relative">
        <h3 className="font-semibold text-text text-lg">{title}</h3>
        {icon && (
          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-text shadow-sm">
            {icon}
          </div>
        )}
      </div>
      
      <div className="z-10 relative mt-4">
        {value && <div className="text-5xl font-bold text-[#1a1b4b] tracking-tight">{value}</div>}
        {trend && (
          <div className="flex items-center text-sm font-medium text-text-muted mt-2">
            <ArrowUpRight size={16} className="mr-1" />
            {trend}
          </div>
        )}
        {subtitle && (
          <div className="text-sm font-medium text-text-muted mt-2">{subtitle}</div>
        )}
      </div>

      {children}
    </div>
  );
};

export default StatCard;
