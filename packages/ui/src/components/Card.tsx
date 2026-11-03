import React, { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '../lib/utils';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass' | 'subtle' | 'interactive';
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    const variants = {
      default: 'bg-[#110A22]/90 border border-purple-900/30 shadow-xl shadow-black/50',
      glass: 'bg-[#110A22]/70 backdrop-blur-xl border border-purple-500/20 shadow-2xl shadow-black/60',
      subtle: 'bg-[#090514]/60 border border-purple-950/40',
      interactive: 'bg-[#110A22]/80 border border-purple-900/30 hover:border-purple-500/60 hover:bg-[#1A0F33] transition-all duration-300 hover:shadow-purple-950/40 hover:shadow-2xl cursor-pointer',
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
