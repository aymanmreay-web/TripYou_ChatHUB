import React, { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '../lib/utils';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'gold';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading = false, children, disabled, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 disabled:pointer-events-none disabled:opacity-50 select-none';

    const variants = {
      primary: 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-950/50 border border-purple-400/30 active:scale-[0.98]',
      secondary: 'bg-[#180E30] hover:bg-[#231442] text-slate-100 border border-purple-800/40 active:scale-[0.98]',
      outline: 'border border-purple-800/50 bg-transparent hover:bg-purple-950/30 text-purple-200 active:scale-[0.98]',
      ghost: 'bg-transparent hover:bg-purple-950/40 text-purple-200 hover:text-white',
      danger: 'bg-rose-600/90 hover:bg-rose-500 text-white shadow-lg shadow-rose-950/40 border border-rose-500/30 active:scale-[0.98]',
      gold: 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold shadow-lg shadow-amber-950/40 border border-amber-300/40 active:scale-[0.98]',
    };

    const sizes = {
      sm: 'h-8 px-3 text-xs rounded-lg gap-1.5',
      md: 'h-10 px-4 text-sm rounded-xl gap-2',
      lg: 'h-12 px-6 text-base rounded-xl gap-2.5',
      icon: 'h-10 w-10 p-0 rounded-xl',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading ? (
          <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : null}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
