'use client';

import React from 'react';

export interface SwitchProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  ariaLabel?: string;
}

/** مفتاح تشغيل وإيقاف موحّد، يُستخدم لأي خيار من نوع تشغيل/إيقاف. */
export function Switch({ checked, onChange, disabled, ariaLabel }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-300 disabled:cursor-not-allowed disabled:opacity-45 ${checked ? 'bg-[var(--primary)]' : 'bg-[var(--text-muted)]/30'}`}
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-md transition-[inset-inline-start] duration-300 ease-[cubic-bezier(0.2,0.9,0.3,1.25)] motion-reduce:transition-none ${checked ? 'start-[calc(100%-1.5rem)]' : 'start-1'}`}
      />
    </button>
  );
}
