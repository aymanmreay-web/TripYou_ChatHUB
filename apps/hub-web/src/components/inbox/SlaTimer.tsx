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
  /** هل المحادثة مجموعة واتساب؟ المجموعات تُحسب بالساعات والدقائق وتصفر بعد 48 ساعة */
  isGroup?: boolean;
  /** نص وصفي قبل العداد (ترويسة المحادثة) أم عدّاد مختصر فقط (صفوف القائمة) */
  showLabel?: boolean;
  className?: string;
}

const pad = (n: number) => String(n).padStart(2, '0');

export function SlaTimer({ since, status, isGroup = false, showLabel = false, className = '' }: SlaTimerProps) {
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
  const totalMinutes = Math.floor(totalSec / 60);
  const totalHours = Math.floor(totalMinutes / 60);

  // 1) المجموعات: تصفر وتلغى بعد 48 ساعة
  if (isGroup && totalHours >= 48) {
    return null;
  }
  // 2) المحادثات الفردية: تصفر وتلغى بعد 24 ساعة
  if (!isGroup && totalHours >= 24) {
    return null;
  }

  const level: SlaLevel = slaLevelFor(totalMinutes, status);

  // تنسيق الوقت دائماً بأرقام إنجليزية (ASCII / English numbers)
  let displayClock = '';
  if (isGroup) {
    // المجموعات: بالساعات والدقائق (hh:mm)
    displayClock = `${pad(totalHours)}:${pad(totalMinutes % 60)}`;
  } else {
    // الفردية: بالدقائق والثواني (mm:ss) حتى 59 دقيقة، ثم (hh:mm) إن طالت
    if (totalHours > 0) {
      displayClock = `${pad(totalHours)}:${pad(totalMinutes % 60)}`;
    } else {
      displayClock = `${pad(totalMinutes)}:${pad(totalSec % 60)}`;
    }
  }

  const resolvedLabel = level === 'resolved' ? 'تم الحل' : null;

  if (showLabel) {
    const labelText =
      resolvedLabel ||
      (level === 'critical' ? `⛔ ${displayClock}` : `⏱ ${displayClock}`);

    return (
      <span
        className={`inline-flex items-center gap-1 text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full border tabular-nums ${SLA_PILL_CLASS[level]} ${className}`}
        title={`وقت الانتظار: ${displayClock} ${isGroup ? '(ساعات:دقائق - مجموعات)' : '(دقائق:ثواني)'}`}
      >
        <bdi dir="ltr">{labelText}</bdi>
      </span>
    );
  }

  // صفوف القائمة: مختصر جداً
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded-full border ${SLA_PILL_CLASS[level]} ${className}`}
      title={`انتظار: ${displayClock} ${isGroup ? '(س:د)' : '(د:ث)'}`}
    >
      <span className={level === 'critical' ? 'animate-pulse' : ''}>⏱</span>
      <bdi dir="ltr">{displayClock}</bdi>
    </span>
  );
}
