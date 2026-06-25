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
  sparklineData?: number[];
}

const StatCard = ({ title, value, subtitle, trend, icon, variant = 'purple', className = '', children, sparklineData }: StatCardProps) => {
  const bgColors = {
    purple: 'bg-primary/10 dark:bg-primary/20 border border-primary/20 dark:border-primary/30',
    mint: 'bg-[#C4F0E1] dark:bg-emerald-950/20 border border-transparent dark:border-emerald-900/30',
    peach: 'bg-[#EED7C8] dark:bg-amber-950/20 border border-transparent dark:border-amber-900/30'
  };

  const sparklineColor = {
    purple: '#8B5CF6',
    mint: '#059669',
    peach: '#D97706',
  };

  const renderSparkline = () => {
    if (!sparklineData || sparklineData.length < 2) return null;
    const width = 100;
    const height = 30;
    const padding = 2;
    const maxVal = Math.max(...sparklineData);
    const minVal = Math.min(...sparklineData);
    const range = maxVal - minVal || 1;
    
    const points = sparklineData
      .map((val, index) => {
        const x = (index / (sparklineData.length - 1)) * (width - padding * 2) + padding;
        const y = height - ((val - minVal) / range) * (height - padding * 2) - padding;
        return `${x},${y}`;
      })
      .join(' ');

    const cleanTitle = title.replace(/\s+/g, '-').toLowerCase();

    return (
      <svg className="w-24 h-8 overflow-visible" viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <linearGradient id={`sparkline-grad-${cleanTitle}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={sparklineColor[variant]} stopOpacity="0.4" />
            <stop offset="100%" stopColor={sparklineColor[variant]} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        {/* Filled Area */}
        <path
          d={`M ${padding},${height} L ${points} L ${width - padding},${height} Z`}
          fill={`url(#sparkline-grad-${cleanTitle})`}
          className="transition-all duration-500"
        />
        {/* Line */}
        <polyline
          fill="none"
          stroke={sparklineColor[variant]}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
          className="transition-all duration-500"
        />
      </svg>
    );
  };

  return (
    <div className={`${bgColors[variant]} rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between ${className}`}>
      <div className="flex justify-between items-start z-10 relative">
        <h3 className="font-semibold text-text text-lg">{title}</h3>
        {icon && (
          <div className="w-10 h-10 rounded-full bg-[#ffffff] dark:bg-white/10 flex items-center justify-center text-text shadow-sm">
            {icon}
          </div>
        )}
      </div>
      
      <div className="z-10 relative mt-4 flex items-end justify-between">
        <div className="flex flex-col">
          {value && <div className="text-4xl font-bold text-text tracking-tight">{value}</div>}
          {trend && (
            <div className="flex items-center text-xs font-semibold text-text-muted mt-2">
              <ArrowUpRight size={14} className="mr-1" />
              {trend}
            </div>
          )}
          {subtitle && (
            <div className="text-sm font-medium text-text-muted mt-2">{subtitle}</div>
          )}
        </div>
        {sparklineData && renderSparkline()}
      </div>

      {children}
    </div>
  );
};

export default StatCard;
