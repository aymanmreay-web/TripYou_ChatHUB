'use client';

import React, { useState } from 'react';
import { Clock, UserPlus, X, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from '../../components/common/Toaster';
import { JoinRequestRow, decideJoin } from './groupsApi';

/**
 * طلبات الانضمام للمجموعات المعلقة (type=group_join) — قرار المالك:
 * زر ضم الخط بضغطة واحدة (addParticipants من خط أدمن)؛ عند التعذر رسالة
 * إضافة يدوية واضحة والطلب يبقى معلقاً لإعادة المحاولة.
 */
export function JoinRequestsCard({
  requests,
  onDecided,
}: {
  requests: JoinRequestRow[];
  onDecided: () => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);

  const decide = async (r: JoinRequestRow, decision: 'approved' | 'rejected') => {
    setBusyId(r.id);
    try {
      const res = await decideJoin(r.id, decision, r.line_title ? undefined : undefined);
      toast({
        title: decision === 'approved' ? 'تم ضم الخط للمجموعة ✅' : 'رُفض الطلب',
        body: decision === 'approved' ? undefined : `${r.staff_name} — ${r.chat_name || r.chat_jid}`,
        kind: 'success',
      });
      onDecided();
      void res;
    } catch (e: any) {
      // رسالة الإضافة اليدوية الواضحة (الطلب يبقى معلقاً)
      toast({ title: 'تعذر الضم التلقائي — أضف يدوياً', body: e.message, kind: 'error', durationMs: 10000 });
    } finally {
      setBusyId(null);
    }
  };

  if (requests.length === 0) return null;

  return (
    <div className="rounded-2xl bg-[var(--card-bg)] border border-amber-500/40 overflow-hidden">
      <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-amber-400" /> طلبات انضمام الخطوط للمجموعات
        </h3>
        <span className="text-[10px] px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/40 font-bold">
          {requests.length} معلق
        </span>
      </div>
      <div className="divide-y divide-[var(--border-subtle)]">
        {requests.map((r) => (
          <div key={r.id} className="p-3 flex items-center justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <div className="text-xs font-bold text-[var(--text-main)] flex items-center gap-2 flex-wrap">
                <span>{r.staff_name}</span>
                <span className="text-[var(--text-muted)] font-normal">يريد ضم</span>
                <span className="px-1.5 py-0.5 rounded-md bg-[var(--accent-soft)] text-[var(--text-main)] border border-[var(--border-subtle)]">
                  {r.line_title || r.instance_name || 'خط'}
                </span>
                <span className="text-[var(--text-muted)] font-normal">إلى</span>
                <span className="px-1.5 py-0.5 rounded-md bg-[var(--accent-soft)] text-[var(--text-main)] border border-[var(--border-subtle)]">
                  {r.chat_name || r.chat_jid}
                </span>
                {r.escalated && (
                  <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md bg-rose-500/15 text-rose-300 border border-rose-500/40 font-bold">
                    <Clock className="w-3 h-3" /> تجاوز 10 دقائق
                  </span>
                )}
              </div>
              {r.reason ? <div className="text-[10px] text-[var(--text-muted)] mt-1">السبب: {r.reason}</div> : null}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => decide(r, 'approved')}
                disabled={busyId === r.id}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-bold hover:bg-emerald-500/25 disabled:opacity-50 transition-all"
              >
                {busyId === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                ضم الخط
              </button>
              <button
                onClick={() => decide(r, 'rejected')}
                disabled={busyId === r.id}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--card-elevated)] border border-[var(--border-subtle)] text-[var(--text-muted)] text-xs font-bold hover:text-rose-300 hover:border-rose-500/40 disabled:opacity-50 transition-all"
              >
                <X className="w-3.5 h-3.5" /> رفض
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
