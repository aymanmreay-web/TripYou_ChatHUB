'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard, RefreshCw, Loader2, MessageSquare, MessagesSquare,
  CheckCircle2, ShieldAlert, AlertTriangle, Bot, Users, Clock,
  Phone, TrendingUp, ArrowUpRight, Timer, Zap, ShieldCheck, XCircle,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AppShell } from '../../components/layout/AppShell';

/**
 * م6 — لوحة مؤشرات الإدارة: بيانات حقيقية 100% من /api/admin/kpis
 * (الرسائل المخزنة فعلياً عبر ويب هوك م0 — تبدأ الإحصاءات من تاريخ تفعيله)
 */

interface StaffPerf {
  id: string;
  full_name: string;
  role_name: string | null;
  assigned_conversations: number;
  resolved: number;
  escalated: number;
  avg_first_reply_min: number | null;
  msgs_out_7d: number;
}

interface AbandonedRow {
  id: string;
  chat_jid: string;
  title: string;
  assigned_staff_name: string | null;
  instance_name: string;
  last_message_text: string | null;
  last_customer_message_at: string;
}

interface SlaRow {
  id: string;
  chat_jid: string;
  title: string;
  status: string;
  instance_name: string;
  sla_minutes: number;
  waiting_min: number;
}

interface DailyRow { day: string; msgs_in: number; msgs_out: number }
interface LineRow { instance_name: string; title_ar: string; status: string; daily_cap: number; sent_today: number }

interface Kpis {
  totals: any;
  staff_perf: StaffPerf[];
  abandoned: AbandonedRow[];
  sla_breaches: SlaRow[];
  daily: DailyRow[];
  lines: LineRow[];
  generated_at: string;
}

const STATUS_LABEL: Record<string, string> = {
  open: 'مفتوحة', in_progress: 'قيد المعالجة', snoozed: 'مؤجلة',
  escalated: 'مصعدة', resolved: 'محلولة', pending: 'بالانتظار',
};

function StatCard({ icon, label, value, sub, tone = 'purple' }: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string;
  tone?: 'purple' | 'emerald' | 'rose' | 'amber' | 'sky';
}) {
  const tones: Record<string, string> = {
    purple: 'from-purple-600/15 to-purple-500/5 text-purple-300 border-purple-500/25',
    emerald: 'from-emerald-600/15 to-emerald-500/5 text-emerald-300 border-emerald-500/25',
    rose: 'from-rose-600/15 to-rose-500/5 text-rose-300 border-rose-500/25',
    amber: 'from-amber-600/15 to-amber-500/5 text-amber-300 border-amber-500/25',
    sky: 'from-sky-600/15 to-sky-500/5 text-sky-300 border-sky-500/25',
  };
  return (
    <div className={`rounded-2xl border bg-gradient-to-br p-4 ${tones[tone]}`}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-[var(--text-muted)]">{label}</span>
        {icon}
      </div>
      <div className="text-2xl font-black text-[var(--text-main)] mt-2 tabular-nums">{value}</div>
      {sub && <div className="text-[10px] text-[var(--text-muted)] mt-1">{sub}</div>}
    </div>
  );
}

/** C4 — بطاقة طلبات إذن الرد من خطوط (للمشرفين): موافقة تُفعّل الخط للطالب / رفض يلزمه بخط الوارد */
function LineGrantRequestsCard() {
  const { user } = useApp();
  const [requests, setRequests] = useState<any[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const isManager = user?.role === 'super_admin' || user?.role === 'sales_lead';

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/line-grants?pending=1', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        setRequests(json.requests || []);
      }
    } catch { /* صامت */ }
  }, []);

  useEffect(() => {
    if (!isManager) return;
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, [isManager, load]);

  const decide = async (requestId: string, decision: 'approved' | 'rejected') => {
    setBusyId(requestId);
    try {
      const res = await fetch('/api/line-grants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'decide', request_id: requestId, decision, decided_by: user?.id }),
      });
      if (res.ok) setRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch { /* صامت */ }
    finally { setBusyId(null); }
  };

  if (!isManager || requests.length === 0) return null;

  return (
    <div className="rounded-2xl bg-[var(--card-bg)] border border-amber-500/40 overflow-hidden" dir="rtl">
      <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
        <h3 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-400" /> طلبات إذن الرد من خطوط أخرى
        </h3>
        <span className="text-[10px] px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-300 font-bold">{requests.length}</span>
      </div>
      <div className="divide-y divide-[var(--border-subtle)]">
        {requests.map((r) => (
          <div key={r.id} className="px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <div className="text-xs font-bold text-[var(--text-main)]">
                {r.staff_name} ← خط «{r.line_title}»
              </div>
              <div className="text-[10px] text-[var(--text-muted)] mt-0.5">
                المحادثة: {r.contact_name || r.chat_jid} • {new Date(r.created_at).toLocaleString('ar-SA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => decide(r.id, 'approved')}
                disabled={busyId === r.id}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-600/30 text-[11px] font-bold transition-colors disabled:opacity-50"
              >
                <ShieldCheck className="w-3.5 h-3.5" /> موافقة — يُفعّل الخط
              </button>
              <button
                onClick={() => decide(r.id, 'rejected')}
                disabled={busyId === r.id}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-600/15 border border-rose-500/40 text-rose-300 hover:bg-rose-600/25 text-[11px] font-bold transition-colors disabled:opacity-50"
              >
                <XCircle className="w-3.5 h-3.5" /> رفض — نفس الرقم إلزامي
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminDashboardContent() {
  const { user } = useApp();
  const router = useRouter();
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/kpis', { cache: 'no-store' });
      if (res.ok) setKpis(await res.json());
    } catch { /* صامت */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000); // تحديث كل دقيقة
    return () => clearInterval(interval);
  }, [load]);

  const t = kpis?.totals || {};
  const maxDaily = Math.max(1, ...(kpis?.daily || []).map((d) => Math.max(d.msgs_in, d.msgs_out)));

  return (
    <div className="max-w-7xl mx-auto py-6 px-2 sm:px-4 space-y-6" dir="rtl">
      {/* الرأس */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-purple-600/15 border border-purple-500/30 text-purple-300">
            <LayoutDashboard className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-[var(--text-main)]">لوحة مؤشرات الإدارة</h1>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              أداء حقيقي من الرسائل المخزنة بالقاعدة — {kpis ? `آخر تحديث ${new Date(kpis.generated_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}` : 'جاري التحميل...'} (تحديث تلقائي كل دقيقة)
            </p>
          </div>
        </div>
        <button onClick={load} className="p-2.5 rounded-xl bg-[var(--card-elevated)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)]" title="تحديث فوري">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading && !kpis ? (
        <div className="py-20 flex flex-col items-center gap-3 text-[var(--text-muted)] text-sm">
          <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
          جاري حساب المؤشرات من القاعدة...
        </div>
      ) : (
        <>
          {/* بطاقات الإجماليات */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard icon={<MessageSquare className="w-4 h-4" />} label="محادثات 24س" value={t.conversations_24h ?? 0} tone="purple" />
            <StatCard icon={<MessagesSquare className="w-4 h-4" />} label="رسائل واردة 24س" value={t.msgs_in_24h ?? 0} tone="sky" />
            <StatCard icon={<Zap className="w-4 h-4" />} label="رسائل صادرة 24س" value={t.msgs_out_24h ?? 0} tone="emerald" />
            <StatCard icon={<ShieldAlert className="w-4 h-4" />} label="مصعدة للإشراف" value={t.escalated ?? 0} tone="rose" />
            <StatCard icon={<CheckCircle2 className="w-4 h-4" />} label="حُلّت 24س" value={t.resolved_24h ?? 0} tone="emerald" />
            <StatCard icon={<Bot className="w-4 h-4" />} label="ردود آلية 24س" value={t.auto_replies_24h ?? 0} tone="amber" sub="خارج الدوام" />
          </div>

          {/* C4: طلبات إذن الرد من خطوط — للمشرفين فقط */}
          <LineGrantRequestsCard />

          {/* الخطوط الفعلية + سلسلة 14 يوم */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* حالة الخطوط الحقيقية */}
            <div className="rounded-2xl bg-[var(--card-bg)] border border-[var(--border-subtle)] p-4">
              <h3 className="text-sm font-bold text-[var(--text-main)] mb-3 flex items-center gap-2">
                <Phone className="w-4 h-4 text-emerald-400" /> حالة الخطوط وحصصها اليومية
              </h3>
              <div className="space-y-2.5">
                {(kpis?.lines || []).map((l) => {
                  const pct = l.daily_cap > 0 ? Math.min(100, Math.round((l.sent_today / l.daily_cap) * 100)) : 0;
                  return (
                    <div key={l.instance_name}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-bold text-[var(--text-main)] flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${l.status === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                          {l.title_ar || l.instance_name}
                        </span>
                        <span className="font-mono text-[10px] text-[var(--text-muted)]">{l.sent_today} / {l.daily_cap || '∞'}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[var(--card-elevated)] overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${pct > 80 ? 'bg-rose-500' : pct > 50 ? 'bg-amber-400' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
                {(kpis?.lines || []).length === 0 && (
                  <p className="text-xs text-[var(--text-muted)] text-center py-4">لا خطوط مسجلة</p>
                )}
              </div>
            </div>

            {/* سلسلة 14 يوماً — رسم أعمدة SVG خفيف */}
            <div className="lg:col-span-2 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-subtle)] p-4">
              <h3 className="text-sm font-bold text-[var(--text-main)] mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-sky-400" /> حركة الرسائل — آخر 14 يوماً
              </h3>
              <div className="flex items-end justify-between gap-1 h-40" dir="ltr">
                {(kpis?.daily || []).map((d) => (
                  <div key={d.day} className="flex-1 flex flex-col items-center gap-1 group" title={`${d.day}: ${d.msgs_in} وارد / ${d.msgs_out} صادر`}>
                    <div className="w-full flex items-end justify-center gap-0.5 h-32">
                      <div className="w-1/3 rounded-t bg-sky-500/80 group-hover:bg-sky-400 transition-all" style={{ height: `${(d.msgs_in / maxDaily) * 100}%`, minHeight: d.msgs_in > 0 ? 3 : 0 }} />
                      <div className="w-1/3 rounded-t bg-emerald-500/80 group-hover:bg-emerald-400 transition-all" style={{ height: `${(d.msgs_out / maxDaily) * 100}%`, minHeight: d.msgs_out > 0 ? 3 : 0 }} />
                    </div>
                    <span className="text-[8px] text-[var(--text-muted)] font-mono">{d.day}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-center gap-4 mt-3 text-[10px] text-[var(--text-muted)]">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-sky-500" /> واردة</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-500" /> صادرة</span>
              </div>
            </div>
          </div>

          {/* أداء الموظفين */}
          <div className="rounded-2xl bg-[var(--card-bg)] border border-[var(--border-subtle)] overflow-hidden">
            <div className="p-4 border-b border-[var(--border-subtle)]">
              <h3 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-400" /> أداء فريق العمل — متوسط زمن أول رد
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[var(--text-muted)] border-b border-[var(--border-subtle)]">
                    <th className="text-right font-bold px-4 py-2.5">الموظف</th>
                    <th className="text-right font-bold px-3 py-2.5">الدور</th>
                    <th className="text-center font-bold px-3 py-2.5">محادثات مسندة</th>
                    <th className="text-center font-bold px-3 py-2.5">حُلّت</th>
                    <th className="text-center font-bold px-3 py-2.5">مصعدة</th>
                    <th className="text-center font-bold px-3 py-2.5">متوسط أول رد</th>
                    <th className="text-center font-bold px-3 py-2.5">رسائل صادرة 7 أيام</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {(kpis?.staff_perf || []).map((s) => (
                    <tr key={s.id} className="hover:bg-[var(--card-elevated)] transition-colors">
                      <td className="px-4 py-2.5 font-bold text-[var(--text-main)]">{s.full_name}</td>
                      <td className="px-3 py-2.5 text-[var(--text-muted)]">{s.role_name || '—'}</td>
                      <td className="px-3 py-2.5 text-center tabular-nums">{s.assigned_conversations}</td>
                      <td className="px-3 py-2.5 text-center tabular-nums text-emerald-400">{s.resolved}</td>
                      <td className="px-3 py-2.5 text-center tabular-nums text-rose-400">{s.escalated}</td>
                      <td className="px-3 py-2.5 text-center tabular-nums">
                        {s.avg_first_reply_min != null ? (
                          <span className={`px-2 py-0.5 rounded-lg font-bold ${s.avg_first_reply_min <= 10 ? 'bg-emerald-500/15 text-emerald-300' : s.avg_first_reply_min <= 30 ? 'bg-amber-500/15 text-amber-300' : 'bg-rose-500/15 text-rose-300'}`}>
                            {s.avg_first_reply_min} د
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-center tabular-nums">{s.msgs_out_7d}</td>
                    </tr>
                  ))}
                  {(kpis?.staff_perf || []).length === 0 && (
                    <tr><td colSpan={7} className="text-center py-8 text-[var(--text-muted)]">لا موظفين نشطين</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* المتروكة + خرق SLA */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* المتروكة */}
            <div className="rounded-2xl bg-[var(--card-bg)] border border-[var(--border-subtle)] overflow-hidden">
              <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
                <h3 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" /> محادثات متروكة (+2 ساعات بلا رد)
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-300 font-bold">{kpis?.abandoned?.length || 0}</span>
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-[var(--border-subtle)]">
                {(kpis?.abandoned || []).map((a) => (
                  <button
                    key={a.id}
                    onClick={() => router.push(`/inbox?chat=${encodeURIComponent(a.chat_jid)}`)}
                    className="w-full text-right px-4 py-2.5 hover:bg-[var(--card-elevated)] transition-colors flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-[var(--text-main)] truncate">{a.title || a.chat_jid}</div>
                      <div className="text-[10px] text-[var(--text-muted)] truncate">
                        {a.assigned_staff_name || 'غير مسندة'} • خط {a.instance_name} • {a.last_message_text?.slice(0, 40) || '—'}
                      </div>
                    </div>
                    <span className="flex items-center gap-1 text-[10px] text-amber-300 font-mono shrink-0">
                      <Clock className="w-3 h-3" />
                      {Math.round((Date.now() - new Date(a.last_customer_message_at).getTime()) / 3600000)} س
                      <ArrowUpRight className="w-3 h-3" />
                    </span>
                  </button>
                ))}
                {(kpis?.abandoned || []).length === 0 && (
                  <div className="p-6 text-center text-xs text-[var(--text-muted)] flex flex-col items-center gap-2">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400/60" /> لا محادثات متروكة — ممتاز!
                  </div>
                )}
              </div>
            </div>

            {/* خرق SLA */}
            <div className="rounded-2xl bg-[var(--card-bg)] border border-[var(--border-subtle)] overflow-hidden">
              <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
                <h3 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2">
                  <Timer className="w-4 h-4 text-rose-400" /> تجاوز مهلة الحالة (SLA)
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-lg bg-rose-500/15 text-rose-300 font-bold">{kpis?.sla_breaches?.length || 0}</span>
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-[var(--border-subtle)]">
                {(kpis?.sla_breaches || []).map((b) => (
                  <button
                    key={b.id}
                    onClick={() => router.push(`/inbox?chat=${encodeURIComponent(b.chat_jid)}`)}
                    className="w-full text-right px-4 py-2.5 hover:bg-[var(--card-elevated)] transition-colors flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-[var(--text-main)] truncate">{b.title || b.chat_jid}</div>
                      <div className="text-[10px] text-[var(--text-muted)]">
                        {STATUS_LABEL[b.status] || b.status} • حد {b.sla_minutes} دقيقة • خط {b.instance_name}
                      </div>
                    </div>
                    <span className="text-[10px] text-rose-300 font-mono shrink-0 tabular-nums">{b.waiting_min} د</span>
                  </button>
                ))}
                {(kpis?.sla_breaches || []).length === 0 && (
                  <div className="p-6 text-center text-xs text-[var(--text-muted)] flex flex-col items-center gap-2">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400/60" /> لا تجاوزات مهلة
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <AppShell>
      <AdminDashboardContent />
    </AppShell>
  );
}
