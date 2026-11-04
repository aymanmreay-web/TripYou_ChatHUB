import React, { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '../lib/utils';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass' | 'subtle' | 'interactive';
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    const variants = {
      default: 'bg-[var(--card-bg)] border border-[var(--border-subtle)] shadow-xl shadow-black/30',
      glass: 'bg-[var(--card-bg)]/80 backdrop-blur-xl border border-[var(--border-subtle)] shadow-2xl shadow-black/30',
      subtle: 'bg-[var(--card-elevated)] border border-[var(--border-subtle)]',
      interactive: 'bg-[var(--card-bg)] border border-[var(--border-subtle)] hover:border-[var(--border-glow)] hover:bg-[var(--card-elevated)] transition-all duration-300 cursor-pointer',
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
