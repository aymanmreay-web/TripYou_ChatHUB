'use client';

import React, { useEffect, useState } from 'react';
import { X, CheckCircle2, AlertCircle, Info, Bell } from 'lucide-react';

/**
 * نظام توست خفيف قائم على أحداث النافذة — بدون مكتبات خارجية.
 * الاستخدام من أي مكان: toast({ title, body, kind })
 */

export interface ToastPayload {
  title: string;
  body?: string;
  kind?: 'success' | 'error' | 'info' | 'notification';
  durationMs?: number;
}

const TOAST_EVENT = 'hub-toast';

export function toast(payload: ToastPayload): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<ToastPayload>(TOAST_EVENT, { detail: payload }));
}

interface ToastItem extends ToastPayload {
  id: number;
}

const KIND_STYLES: Record<string, { icon: React.ReactNode; ring: string }> = {
  success: { icon: <CheckCircle2 className="w-4.5 h-4.5 text-emerald-400" />, ring: 'border-emerald-500/40' },
  error: { icon: <AlertCircle className="w-4.5 h-4.5 text-rose-400" />, ring: 'border-rose-500/40' },
  info: { icon: <Info className="w-4.5 h-4.5 text-sky-400" />, ring: 'border-sky-500/40' },
  notification: { icon: <Bell className="w-4.5 h-4.5 text-purple-400" />, ring: 'border-purple-500/40' },
};

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    let counter = 0;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<ToastPayload>).detail;
      const id = ++counter;
      setItems((prev) => [...prev.slice(-4), { ...detail, id }]);
      const duration = detail.durationMs ?? 5000;
      setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), duration);
    };
    window.addEventListener(TOAST_EVENT, handler);
    return () => window.removeEventListener(TOAST_EVENT, handler);
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="fixed top-4 left-4 z-[100] flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)]" dir="rtl">
      {items.map((t) => {
        const style = KIND_STYLES[t.kind || 'info'] || KIND_STYLES.info;
        return (
          <div
            key={t.id}
            className={`flex items-start gap-2.5 p-3 rounded-2xl bg-[var(--card-bg)] border ${style.ring} shadow-2xl animate-in fade-in slide-in-from-left-4 glass-panel`}
            onClick={() => setItems((prev) => prev.filter((x) => x.id !== t.id))}
            role="status"
          >
            <div className="mt-0.5 shrink-0">{style.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-[var(--text-main)] leading-relaxed">{t.title}</div>
              {t.body && (
                <div className="text-[11px] text-[var(--text-muted)] line-clamp-2 mt-0.5 leading-relaxed">{t.body}</div>
              )}
            </div>
            <X className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0 mt-0.5" />
          </div>
        );
      })}
    </div>
  );
}
