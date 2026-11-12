'use client';

/**
 * عدّاد الاستجابة الحي — نمط v1 المعتمد: ينبض كل ثانية mm:ss،
 * أخضر تحت 5 دقائق · كهرماني حتى 10 · أحمر نابض بعدها · أخضر ثابت للمحلولة.
 * عدّاد مستقل لكل موضع (ترويسة المحادثة وصفوف القائمة) يتوقف تلقائياً عندما لا يلزم.
 */
import React, { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
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

  const label =
    level === 'resolved'
      ? 'تم الحل'
      : level === 'critical'
      ? `⛔ ${clock}`
      : level === 'warning'
      ? `تنبيه ${clock}`
      : clock;

  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border tabular-nums ${SLA_PILL_CLASS[level]} ${className}`}
      title="عدّاد زمن انتظار العميل — أخضر حتى 5 دقائق، كهرماني حتى 10، أحمر بعدها"
    >
      <Clock className="w-3 h-3 shrink-0" />
      <span>{showLabel ? label : clock}</span>
    </span>
  );
}
