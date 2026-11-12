'use client';

/**
 * عدّاد الاستجابة الحي — نمط v1 المعتمد: ينبض كل ثانية mm:ss،
 * أخضر تحت 5 دقائق · كهرماني حتى 10 · أحمر نابض بعدها · أخضر ثابت للمحلولة.
 * عدّاد مستقل لكل موضع (ترويسة المحادثة وصفوف القائمة) يتوقف تلقائياً عندما لا يلزم.
 * compact=true: رمز ⏱ نابض مختصر في الترويسة بلا نص إضافي.
 */
import React, { useEffect, useState } from 'react';
import { slaAppliesTo, slaLevelFor, SLA_PILL_CLASS, SlaLevel } from '../../lib/inbox/uiMaps';
import { ConversationStatus } from '../../types';

interface SlaTimerProps {
  /** طابع زمني لآخر رسالة عميل (epoch ms أو نص ISO) */
  since?: number | string | null;
  status: ConversationStatus;
  /** نص وصفي قبل العداد (ترويسة المحادثة) أم عدّاد مختصر فقط (صفوف القائمة) */
  showLabel?: boolean;
  className?: string;
}

const pad = (n: number) => String(n).padStart(2, '0');

export function SlaTimer({ since, status, showLabel = false, className = '' }: SlaTimerProps) {
  const [now, setNow] = useState(() => Date.now());

  const live = !!since && slaAppliesTo(status);

  useEffect(() => {
    if (!live) return;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [live, since]);

  if (!since) return null;

  const ts = new Date(since).getTime();
  if (isNaN(ts)) return null;

  const totalSec = Math.max(0, Math.floor((now - ts) / 1000));
  const minutes = Math.floor(totalSec / 60);
  const level: SlaLevel = slaLevelFor(minutes, status);
  const clock = `${pad(minutes)}:${pad(totalSec % 60)}`;

  const resolvedLabel = level === 'resolved' ? 'تم الحل' : null;

  // حد بصري: 99 دقيقة كحد أقصى للعرض (بعده يظهر كـ 99:59)
  const displayClock = minutes > 999 ? `${pad(Math.min(minutes, 999))}:${pad(totalSec % 60)}` : clock;

  if (showLabel) {
    // ترويسة: نص كامل
    const labelText =
      resolvedLabel ||
      (level === 'critical' ? `⛔ ${displayClock}` : `⏱ ${displayClock}`);

    return (
      <span
        className={`inline-flex items-center gap-1 text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full border tabular-nums ${SLA_PILL_CLASS[level]} ${className}`}
        title="وقت انتظار العميل — أخضر ≤ 5 دق، كهرماني ≤ 10، أحمر نابض بعدها"
      >
        {labelText}
      </span>
    );
  }

  // صفوف القائمة: مختصر جداً
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded-full border ${SLA_PILL_CLASS[level]} ${className}`}
      title={`انتظار: ${displayClock}`}
    >
      <span className={level === 'critical' ? 'animate-pulse' : ''}>⏱</span>
      <span>{displayClock}</span>
    </span>
  );
}
