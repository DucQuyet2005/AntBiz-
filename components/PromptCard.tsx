import React from 'react';
import { Sparkles, Check, ThumbsUp } from 'lucide-react';
import { Prompt } from '@/lib/types/prompt';

interface PromptCardProps {
  prompt: Prompt;
  relevanceScore?: number;
  isSelected?: boolean;
  onSelect: (prompt: Prompt) => void;
  className?: string;
}

const PromptCard = ({ 
  prompt, 
  relevanceScore, 
  isSelected, 
  onSelect,
  className = '' 
}: PromptCardProps) => {
  return (
    <div 
      onClick={() => onSelect(prompt)}
      className={`group relative p-4 rounded-2xl border transition-all duration-300 cursor-pointer overflow-hidden ${
        isSelected 
          ? 'bg-primary/5 border-primary shadow-md ring-1 ring-primary/20' 
          : 'bg-white border-gray-100 hover:border-primary/40 hover:shadow-sm'
      } ${className}`}
    >
      {/* Background Sparkle Decoration */}
      <div className={`absolute -right-4 -bottom-4 text-primary/5 transition-transform duration-500 group-hover:scale-125 ${
        isSelected ? 'opacity-20' : 'opacity-0'
      }`}>
        <Sparkles size={80} />
      </div>

      <div className="flex flex-col gap-2 relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              isSelected ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500'
            }`}>
              {isSelected ? <Check size={14} /> : <ThumbsUp size={12} />}
            </div>
            <h4 className={`text-xs font-bold transition-colors ${
              isSelected ? 'text-primary' : 'text-text'
            }`}>
              {prompt.name}
            </h4>
          </div>
          
          {relevanceScore !== undefined && relevanceScore > 0 && (
            <div className="text-[10px] bg-amber-50 text-amber-600 font-bold px-2 py-0.5 rounded-full border border-amber-200">
              {Math.round(relevanceScore * 100)}% Match
            </div>
          )}
        </div>

        <p className="text-[10px] text-text-muted leading-relaxed line-clamp-2 italic">
          "{prompt.content.substring(0, 80)}..."
        </p>

        <div className="flex flex-wrap gap-1 mt-1">
          {prompt.tags.slice(0, 3).map((tag, idx) => (
            <span 
              key={idx} 
              className={`text-[8px] font-bold px-1.5 py-0.5 rounded-md ${
                isSelected 
                  ? 'bg-primary/10 text-primary' 
                  : 'bg-gray-50 text-gray-400'
              }`}
            >
              #{tag.replace('#', '')}
            </span>
          ))}
          {prompt.tags.length > 3 && (
            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-md bg-gray-50 text-gray-400">
              +{prompt.tags.length - 3}
            </span>
          )}
        </div>
      </div>

      {isSelected && (
        <div className="absolute top-0 right-0 w-8 h-8 flex items-center justify-center">
          <div className="w-4 h-4 rounded-full bg-primary text-white flex items-center justify-center">
            <Check size={10} strokeWidth={4} />
          </div>
        </div>
      )}
    </div>
  );
};

export default PromptCard;
