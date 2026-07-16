import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'link';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'default', size = 'md', children, ...props }, ref) => {
    const baseStyle = 'inline-flex items-center justify-center font-semibold transition-colors duration-200 focus:outline-none disabled:opacity-50 disabled:pointer-events-none cursor-pointer';
    
    const variants = {
      default: 'bg-primary hover:bg-primary/95 text-white shadow-sm',
      outline: 'border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800/50',
      ghost: 'hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300',
      link: 'text-primary underline-offset-4 hover:underline p-0 bg-transparent',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-xs rounded-lg',
      md: 'px-4 py-2 text-sm rounded-xl',
      lg: 'px-6 py-3 text-base rounded-2xl',
    };

    const combinedClassName = `${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`;

    return (
      <button ref={ref} className={combinedClassName} {...props}>
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
