'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, CheckCheck, RefreshCw, ShieldCheck, ShieldAlert, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { AppShell } from '../../../components/layout/AppShell';
import { useApp } from '../../../context/AppContext';
import { supabase } from '../../../lib/supabase';
import { toast } from '../../../components/common/Toaster';
import { NotificationItem, kindIcon, kindLabel, timeAgo } from '../../../lib/notificationsUi';

// الأنواع القابلة للموافقة/الرفض من قِبَل المشرف
const ACTIONABLE_KINDS = ['access_request', 'permission_request', 'group_join_request', 'assignment_request'];

function NotificationsPageContent() {
  const { user } = useApp();
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [filter, setFilter] = useState<'all' | 'unread' | 'actionable'>('all');
  const [loading, setLoading] = useState(true);
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const staffId = user?.id || null;

  // هل المستخدم الحالي مشرف أو مدير (يملك أزرار الموافقة)
  const canDecide = user?.role === 'super_admin' || user?.role === 'sales_lead' ||
    user?.role === 'manager' || user?.role === 'admin' ||
    Boolean(user?.email_masked?.toLowerCase().includes('ayman'));

  const load = useCallback(async () => {
    if (!staffId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/notifications?staff_id=${encodeURIComponent(staffId)}&limit=80`, { cache: 'no-store' });
      const data = await res.json();
      setItems(data.notifications || []);
      setUnread(data.unread || 0);
    } catch {
      toast({ title: 'تعذر تحميل الإشعارات', kind: 'error' });
    } finally {
      setLoading(false);
    }
  }, [staffId]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  // Realtime: إشعار جديد يظهر فوراً في القائمة
  useEffect(() => {
    if (!staffId) return;
    const channel = supabase
      .channel('notifications-page-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          const n = payload.new as NotificationItem;
          if (!n || n.staff_id !== staffId) return;
          setItems((prev) => [n, ...prev].slice(0, 80));
          setUnread((c) => c + 1);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [staffId]);

  const markRead = async (id?: string) => {
    if (!staffId) return;
    if (id) {
      setItems((prev) => prev.map((x) => (x.id === id ? { ...x, read_at: x.read_at || new Date().toISOString() } : x)));
      setUnread((c) => Math.max(0, c - 1));
    } else {
      setItems((prev) => prev.map((x) => ({ ...x, read_at: x.read_at || new Date().toISOString() })));
      setUnread(0);
    }
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staff_id: staffId, id, all: !id }),
      });
    } catch { /* صامت */ }
  };

  // ═══ قرار الموافقة أو الرفض على طلب صلاحية ═══
  const handleDecide = async (notification: NotificationItem, decision: 'approved' | 'rejected') => {
    if (!canDecide || !staffId) return;

    // نستخرج request_id من meta أو من الرابط
    const requestId = notification.meta?.request_id ||
      notification.link?.match(/request_id=([^&]+)/)?.[1] ||
      null;

    if (!requestId) {
      // محاولة استخراج الطلب من قاعدة البيانات بناءً على chat_jid والنوع
      toast({ title: 'تعذر العثور على معرف الطلب', kind: 'error' });
      return;
    }

    setDecidingId(notification.id);
    try {
      const res = await fetch('/api/permission-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'decide',
          request_id: requestId,
          decision,
          decided_by: staffId,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        toast({
          title: decision === 'approved' ? '✅ تمت الموافقة — أُشعر الموظف فوراً' : '❌ تم رفض الطلب — أُشعر الموظف',
          kind: decision === 'approved' ? 'success' : 'info',
        });
        // تحديث الإشعار محلياً كمقروء
        setItems((prev) =>
          prev.map((x) =>
            x.id === notification.id
              ? { ...x, read_at: x.read_at || new Date().toISOString() }
              : x
          )
        );
        setUnread((c) => Math.max(0, c - 1));
      } else {
        toast({ title: json.error || 'فشل اتخاذ القرار', kind: 'error' });
      }
    } catch (e: any) {
      toast({ title: e.message, kind: 'error' });
    } finally {
      setDecidingId(null);
    }
  };

  const openItem = async (n: NotificationItem) => {
    if (!n.read_at) await markRead(n.id);
    if (n.link) router.push(n.link);
  };

  const visible =
    filter === 'unread'
      ? items.filter((n) => !n.read_at)
      : filter === 'actionable'
      ? items.filter((n) => ACTIONABLE_KINDS.includes(n.kind) && !n.read_at)
      : items;

  return (
    <div className="space-y-4 max-w-4xl mx-auto" dir="rtl">
      {/* الرأس */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-main)] flex items-center gap-2">
            <Bell className="w-5 h-5 text-purple-400" />
            الإشعارات
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            كل تنبيهات الرسائل والإسناد والحملات في مكان واحد — فورية عبر الاتصال الحي
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="p-2 rounded-xl bg-[var(--card-elevated)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
            title="تحديث"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {unread > 0 && (
            <button
              onClick={() => markRead()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-600/20 border border-purple-500/40 text-purple-300 hover:bg-purple-600/30 text-xs font-bold transition-colors"
            >
              <CheckCheck className="w-4 h-4" />
              تعليم الكل كمقروء ({unread})
            </button>
          )}
        </div>
      </div>

      {/* الفلاتر */}
      <div className="flex gap-2 flex-wrap">
        {([
          ['all', `الكل (${items.length})`],
          ['unread', `غير المقروء (${unread})`],
          ...(canDecide ? [['actionable', `طلبات بانتظار قرارك (${items.filter(n => ACTIONABLE_KINDS.includes(n.kind) && !n.read_at).length})`]] : []),
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key as any)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              filter === key
                ? 'bg-purple-600 text-white shadow-lg'
                : 'bg-[var(--card-elevated)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* القائمة */}
      {visible.length === 0 ? (
        <div className="p-10 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-subtle)] text-center">
          <Bell className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3 opacity-50" />
          <p className="text-sm text-[var(--text-muted)]">
            {filter === 'unread' ? 'لا توجد إشعارات غير مقروءة — ممتاز!' :
             filter === 'actionable' ? 'لا توجد طلبات بانتظار قرارك حالياً' :
             'لا توجد إشعارات بعد'}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl bg-[var(--card-bg)] border border-[var(--border-subtle)] overflow-hidden divide-y divide-[var(--border-subtle)]">
          {visible.map((n) => {
            const isActionable = canDecide && ACTIONABLE_KINDS.includes(n.kind) && !n.read_at;
            const isDeciding = decidingId === n.id;

            return (
              <div
                key={n.id}
                className={`flex flex-col gap-2 px-4 py-3.5 transition-colors ${
                  !n.read_at ? 'bg-purple-500/5' : ''
                } ${isActionable ? 'border-r-2 border-amber-400/60' : ''}`}
              >
                {/* صف الإشعار الرئيسي */}
                <button
                  onClick={() => openItem(n)}
                  className="w-full text-right flex items-start gap-3 hover:opacity-80 transition-opacity"
                >
                  <div className="mt-0.5 shrink-0">{kindIcon(n.kind)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm ${!n.read_at ? 'font-bold' : ''} text-[var(--text-main)]`}>{n.title}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-lg bg-[var(--card-elevated)] border border-[var(--border-subtle)] text-[var(--text-muted)]">
                        {kindLabel(n.kind)}
                      </span>
                    </div>
                    {n.body && <div className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">{n.body}</div>}
                    <div className="text-[10px] text-[var(--text-muted)] mt-1.5 flex items-center gap-2">
                      <span>{timeAgo(n.created_at)}</span>
                      {n.instance_name && <span>• خط <bdi dir="ltr">{n.instance_name}</bdi></span>}
                    </div>
                  </div>
                  {!n.read_at && <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0 mt-1.5" />}
                </button>

                {/* ════════════════════════════════
                    أزرار القرار (للمشرف فقط)
                    — تظهر فقط على الإشعارات القابلة للقرار وغير المقروءة
                    ════════════════════════════════ */}
                {isActionable && (
                  <div className="flex items-center gap-2 mt-1 mr-7">
                    <button
                      disabled={isDeciding}
                      onClick={() => handleDecide(n, 'approved')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition-colors disabled:opacity-60"
                    >
                      {isDeciding ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                      ✅ موافقة
                    </button>
                    <button
                      disabled={isDeciding}
                      onClick={() => handleDecide(n, 'rejected')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/40 border border-rose-500/40 text-rose-300 text-xs font-bold transition-colors disabled:opacity-60"
                    >
                      {isDeciding ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                      ❌ رفض
                    </button>
                    <span className="text-[10px] text-slate-500 mr-1">— بانتظار قرارك</span>
                  </div>
                )}

                {/* ملاحظة خاصة: super_admin يرى أن يتخذ القرار فوراً لنفسه */}
                {user?.role === 'super_admin' && ACTIONABLE_KINDS.includes(n.kind) && !n.read_at && (
                  <div className="mr-7 text-[10px] text-purple-300/60 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    <span>بصفتك المدير الأعلى يمكنك الموافقة الفورية أو الرفض دون الرجوع لأحد</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <AppShell>
      <NotificationsPageContent />
    </AppShell>
  );
}
