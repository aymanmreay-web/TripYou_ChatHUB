import React, { type HTMLAttributes } from 'react';
import { cn } from '../lib/utils';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'live' | 'beta' | 'coming_soon' | 'default' | 'outline' | 'warning' | 'danger';
  size?: 'sm' | 'md';
}

export function Badge({ className, variant = 'default', size = 'md', children, ...props }: BadgeProps) {
  const variants = {
    live: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 font-semibold',
    beta: 'bg-sky-500/15 text-sky-400 border-sky-500/30 font-semibold',
    coming_soon: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    default: 'bg-slate-800 text-slate-300 border-slate-700/60',
    outline: 'border-slate-700 text-slate-400',
    warning: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    danger: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
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
        <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
      )}
      {children}
    </span>
  );
}
