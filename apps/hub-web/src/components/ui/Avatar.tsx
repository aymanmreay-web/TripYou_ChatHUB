'use client';

import React from 'react';
import { initials, shortName } from '../../lib/nameUtils';

const TONES = ['#4285F4', '#EA4335', '#FBBC04', '#34A853'];

function tone(seed: string | number): string {
  const n = typeof seed === 'number' ? seed : Array.from(seed).reduce((a, c) => a + c.charCodeAt(0), 0);
  return TONES[n % TONES.length];
}

export interface AvatarProps {
  name: string;
  seed?: string | number;
  size?: number; // px
  ring?: boolean; // حلقة ألوان جوجل الدوّارة
  presenceColor?: string; // نقطة الحضور
  className?: string;
}

/** أفاتار بالحرفين الأولين. الحلقة تُستخدم للمحادثات غير المقروءة أو الملف الشخصي. */
export function Avatar({ name, seed, size = 44, ring = false, presenceColor, className = '' }: AvatarProps) {
  const c = tone(seed ?? name);
  return (
    <span
      dir="rtl"
      className={`relative inline-grid shrink-0 place-items-center rounded-full ${ring ? 'avatar-ring p-[2px]' : ''} ${className}`}
      style={{ width: size, height: size }}
      aria-label={name}
    >
      <span
        className="grid h-full w-full place-items-center rounded-full font-semibold text-[var(--text-main)]"
        style={{
          background: `color-mix(in srgb, ${c} 22%, var(--card-bg))`,
          fontSize: size * 0.36,
          fontFamily: 'var(--font-head)',
        }}
      >
        {initials(name)}
      </span>
      {presenceColor && (
        <i
          className="absolute bottom-0 end-0 rounded-full border-2 border-[var(--card-bg)]"
          style={{ width: size * 0.26, height: size * 0.26, background: presenceColor }}
        />
      )}
    </span>
  );
}

/** كبسولة الاسم: أفاتار + أول كلمتين من الاسم داخل حلقة ألوان متحركة. تُستخدم في رأس المحادثة وصفحة الملف. */
export function NameCapsule({ name, seed, large = false }: { name: string; seed?: string | number; large?: boolean }) {
  return (
    <span dir="rtl" className="avatar-ring inline-flex min-w-0 rounded-full p-[2px]">
      <span
        className={`flex min-w-0 items-center gap-2 rounded-full bg-[var(--card-bg)] ${large ? 'py-1 pe-5 ps-1' : 'py-0.5 pe-3.5 ps-0.5'}`}
      >
        <Avatar name={name} seed={seed} size={large ? 48 : 32} />
        <span
          className={`truncate font-semibold text-[var(--text-main)] ${large ? 'text-lg' : 'text-sm'}`}
          style={{ fontFamily: 'var(--font-head)' }}
        >
          {shortName(name)}
        </span>
      </span>
    </span>
  );
}
