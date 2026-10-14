import React, { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '../lib/utils';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass' | 'subtle' | 'interactive';
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    const variants = {
      default: 'bg-slate-900/80 border border-slate-800/80 shadow-xl shadow-black/40',
      glass: 'bg-slate-900/60 backdrop-blur-xl border border-slate-700/40 shadow-2xl shadow-black/50',
      subtle: 'bg-slate-950/40 border border-slate-800/40',
      interactive: 'bg-slate-900/70 border border-slate-800/80 hover:border-emerald-500/50 hover:bg-slate-850/80 transition-all duration-300 hover:shadow-emerald-950/20 hover:shadow-xl cursor-pointer',
    };

    return (
      <div
        ref={ref}
        className={cn('rounded-2xl p-5 relative overflow-hidden', variants[variant], className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
