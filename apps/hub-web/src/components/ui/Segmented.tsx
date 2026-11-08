'use client';

import React, { useLayoutEffect, useRef, useState } from 'react';

export interface SegmentedOption<T extends string> {
  value: T;
  label: React.ReactNode;
  count?: number;
}

export interface SegmentedProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (v: T) => void;
  block?: boolean;
  size?: 'md' | 'sm';
  ariaLabel?: string;
}

/**
 * التبويب المقسّم الموحّد: يُستخدم فقط لعرض نفس البيانات بزوايا مختلفة (حد أقصى 5 خيارات).
 * المؤشر المتحرك ينزلق بنابض خفيف.
 */
export function Segmented<T extends string>({ options, value, onChange, block, size = 'md', ariaLabel }: SegmentedProps<T>) {
  const wrap = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState<{ left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    const el = wrap.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (el) setThumb({ left: el.offsetLeft, width: el.offsetWidth });
  }, [value, options.length]);

  return (
    <div
      ref={wrap}
      role="tablist"
      aria-label={ariaLabel}
      dir="rtl"
      className={`relative gap-0.5 overflow-x-auto rounded-full bg-[var(--card-surface)] p-[3px] scrollbar-none ${block ? 'flex w-full' : 'inline-flex max-w-full'}`}
    >
      {thumb && (
        <i
          aria-hidden
          className="pointer-events-none absolute bottom-[3px] top-[3px] rounded-full bg-[var(--card-bg)] shadow-[0_2px_10px_-2px_rgba(20,30,70,0.32)] transition-[left,width] duration-[380ms] ease-[cubic-bezier(0.2,0.9,0.3,1.25)] motion-reduce:transition-none"
          style={{ left: thumb.left, width: thumb.width }}
        />
      )}
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            type="button"
            aria-selected={on}
            onClick={() => onChange(o.value)}
            className={`relative z-[1] min-h-[44px] flex-none whitespace-nowrap rounded-full px-4 transition-colors md:min-h-0 md:py-1.5 ${block ? 'flex-1' : ''} ${size === 'sm' ? 'text-xs' : 'text-sm'} ${on ? 'font-semibold text-[var(--text-main)]' : 'font-medium text-[var(--text-muted)]'}`}
          >
            {o.label}
            {o.count !== undefined && <em className="ms-1.5 text-[0.85em] not-italic text-[var(--primary)]">{o.count}</em>}
          </button>
        );
      })}
    </div>
  );
}
