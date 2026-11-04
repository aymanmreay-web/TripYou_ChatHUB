import React, { type HTMLAttributes } from 'react';
import { cn } from '../lib/utils';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'live' | 'beta' | 'coming_soon' | 'default' | 'outline' | 'warning' | 'danger' | 'gold';
  size?: 'sm' | 'md';
}

export function Badge({ className, variant = 'default', size = 'md', children, ...props }: BadgeProps) {
  const variants = {
    live: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 font-semibold',
    beta: 'bg-purple-500/20 text-purple-300 border-purple-500/40 font-semibold',
    coming_soon: 'bg-white/10 backdrop-blur-sm text-slate-300 border border-white/15 shadow-sm',
    default: 'bg-[#180E30] text-purple-200 border-purple-800/40',
    outline: 'border-purple-800/50 text-purple-300',
    warning: 'bg-amber-500/15 text-amber-400 border-amber-500/30 font-semibold',
    danger: 'bg-rose-500/15 text-rose-400 border-rose-500/30 font-semibold',
    gold: 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-semibold',
  };

  const sizes = {
    sm: 'text-[10px] px-2 py-0.5 rounded-md border',
    md: 'text-xs px-2.5 py-1 rounded-lg border',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 transition-colors select-none',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {variant === 'live' && (
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
      )}
      {variant === 'beta' && (
        <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
      )}
      {variant === 'gold' && (
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
      )}
      {children}
    </span>
  );
}
