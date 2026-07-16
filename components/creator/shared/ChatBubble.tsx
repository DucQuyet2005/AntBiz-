import React from 'react';
import { ChatMessage } from '@/types/creator';
import { Sparkles, User } from 'lucide-react';
import { motion } from 'framer-motion';

interface ChatBubbleProps {
  message: ChatMessage;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ message }) => {
  const isAI = message.role === 'assistant';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex w-full ${isAI ? 'justify-start' : 'justify-end'} mb-4`}
    >
      <div className={`flex max-w-[85%] gap-2 ${isAI ? 'flex-row' : 'flex-row-reverse'}`}>
        
        {/* Avatar */}
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1
          ${isAI ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-slate-200 text-slate-500 dark:bg-zinc-800 dark:text-zinc-400'}
        `}>
          {isAI ? <Sparkles size={14} /> : <User size={14} />}
        </div>

        {/* Bubble */}
        <div className={`
          px-4 py-3 rounded-2xl whitespace-pre-wrap text-sm leading-relaxed
          ${isAI 
            ? 'bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 text-slate-800 dark:text-zinc-200 rounded-tl-none' 
            : 'bg-orange-500 text-white rounded-tr-none'
          }
        `}>
          {message.summaryLabel && (
            <div className="text-[10px] font-bold uppercase tracking-wider mb-1 opacity-70">
              {message.summaryLabel}
            </div>
          )}
          {message.content}
        </div>
      </div>
    </motion.div>
  );
};
