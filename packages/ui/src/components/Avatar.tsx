import React from 'react';
import { cn } from '../lib/utils';

export interface AvatarProps {
  name: string;
  src?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  status?: 'online' | 'busy' | 'away' | 'offline';
}

export function Avatar({ name, src, size = 'md', className, status }: AvatarProps) {
  const sizes = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
  };

  const statusSizes = {
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
    xl: 'w-4 h-4',
  };

  const statusColors = {
    online: 'bg-emerald-500 ring-slate-900',
    busy: 'bg-rose-500 ring-slate-900',
    away: 'bg-amber-500 ring-slate-900',
    offline: 'bg-slate-500 ring-slate-900',
  };

  // Extract initials (Arabic or Latin)
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map(n => n.charAt(0))
    .join('')
    .toUpperCase();

  return (
    <div className={cn('relative inline-flex items-center justify-center shrink-0 select-none', className)}>
      <div
        className={cn(
          'rounded-2xl font-bold flex items-center justify-center overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-800 text-white shadow-md border border-white/10',
          sizes[size]
        )}
      >
        {src ? (
          <img src={src} alt={name} className="w-full h-full object-cover" />
        ) : (
          <span>{initials || 'R'}</span>
        )}
      </div>

      {status && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full ring-2',
            statusSizes[size],
            statusColors[status]
          )}
        />
      )}
    </div>
  );
}
