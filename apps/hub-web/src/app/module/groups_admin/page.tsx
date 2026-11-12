'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Users2, RefreshCw, Search, Loader2, ShieldX, Settings2, ArrowLeft, Clock,
  Crown, Megaphone, Lock, UserPlus, MessageSquarePlus,
} from 'lucide-react';
import { AppShell } from '../../../components/layout/AppShell';
import { toast } from '../../../components/common/Toaster';
import { useApp } from '../../../context/AppContext';
import { GroupItem, JoinRequestRow, LineRow } from '../../../components/groups/groupsApi';
import { LineBadges } from '../../../components/groups/LineBadges';
import { JoinRequestsCard } from '../../../components/groups/JoinRequestsCard';
import { CreateGroupModal } from '../../../components/groups/CreateGroupModal';
import { GroupDetailsDrawer } from '../../../components/groups/GroupDetailsDrawer';

/**
 * قسم إدارة المجموعات (مشرف + مدير) — قرار المالك نقاش الجولتين ④:
 * جدول المجموعات × خطوطنا العضو بشارة 👑 أدمن لكل خط، طلبات الانضمام المعلقة
 * مع ضم الخط بضغطة واحدة، وكل خواص Evolution v2.3.7 في درج التفاصيل.
 * كل البيانات من القاعدة (hub.whatsapp_groups + whatsapp_group_members).
 */

function GroupsPageContent() {
  const { user } = useApp();
  const canView = user?.permissions?.includes('groups.view') ?? false;
  const canManage = user?.permissions?.includes('groups.manage') ?? false;

  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [requests, setRequests] = useState<JoinRequestRow[]>([]);
  const [lines, setLines] = useState<LineRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState('');
  const [lineFilter, setLineFilter] = useState('all');
  const [selected, setSelected] = useState<GroupItem | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const [gRes, rRes, lRes] = await Promise.allSettled([
        fetch('/api/groups', { cache: 'no-store' }),
        fetch('/api/permission-requests?pending=1', { cache: 'no-store' }),
        fetch('/api/lines', { cache: 'no-store' }),
      ]);
      if (gRes.status === 'fulfilled' && gRes.value.ok) {
        const json = await gRes.value.json();
        setGroups(json.groups || []);
      } else {
        toast({ title: 'تعذر تحميل المجموعات من القاعدة', kind: 'error' });
      }
      if (rRes.status === 'fulfilled' && rRes.value.ok) {
        const json = await rRes.value.json();
        setRequests((json.requests || []).filter((r: JoinRequestRow) => r.type === 'group_join'));
      }
      if (lRes.status === 'fulfilled' && lRes.value.ok) {
        const json = await lRes.value.json().catch(() => ({}));
        setLines(Array.isArray(json) ? json : json.lines || []);
      }
    } catch {
      toast({ title: 'تعذر التحميل', kind: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const sync = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/groups/sync', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'فشلت المزامنة');
      const failed = (json.instances || []).filter((i: any) => !i.ok);
      toast({
        title: `تمت المزامنة: ${json.groups} مجموعة و${json.members} سجل عضو`,
        body: failed.length > 0 ? `تعذر على الخطوط: ${failed.map((f: any) => f.instance).join('، ')}` : undefined,
        kind: failed.length > 0 ? 'info' : 'success',
        durationMs: failed.length > 0 ? 8000 : undefined,
      });
      await load();
    } catch (e: any) {
      toast({ title: e.message, kind: 'error', durationMs: 8000 });
    } finally {
      setSyncing(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim();
    return groups.filter((g) => {
      if (lineFilter !== 'all' && !g.our_lines.some((l) => l.instance_name === lineFilter)) return false;
      if (!q) return true;
      return (
        g.subject.includes(q) ||
        (g.display_name || '').includes(q) ||
        g.group_jid.includes(q)
      );
    });
  }, [groups, search, lineFilter]);

  const stats = useMemo(() => {
    const memberCount = groups.filter((g) => g.our_lines.length > 0).length;
    const adminCount = groups.filter((g) => g.our_lines.some((l) => l.is_admin || l.is_super_admin)).length;
    return {
      total: groups.length,
      member: memberCount,
      admin: adminCount,
      pending: requests.length,
    };
  }, [groups, requests.length]);

  const lineOptions = useMemo(() => {
    const set = new Map<string, string>();
    for (const l of lines) set.set(l.instance_name, l.title_ar || l.instance_name);
    for (const g of groups) for (const ol of g.our_lines) if (!set.has(ol.instance_name)) set.set(ol.instance_name, ol.line_title);
    return Array.from(set.entries());
  }, [lines, groups]);

  const lastSync = useMemo(() => {
    const times = groups.map((g) => g.synced_at).filter(Boolean) as string[];
    if (times.length === 0) return null;
    return new Date(Math.max(...times.map((t) => new Date(t).getTime())));
  }, [groups]);

  if (!canView) {
    return (
      <div className="max-w-md mx-auto mt-10" dir="rtl">
        <div className="rounded-2xl bg-[var(--card-bg)] border border-[var(--border-subtle)] p-8 text-center">
          <div className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 inline-flex mb-3">
            <ShieldX className="w-6 h-6" />
          </div>
          <h2 className="text-sm font-black text-[var(--text-main)] mb-1.5">صلاحية غير متوفرة لهذا الحساب</h2>
          <p className="text-xs text-[var(--text-muted)] mb-3">
            إدارة المجموعات تتطلب صلاحية <code className="px-1.5 py-0.5 rounded-md bg-[var(--card-elevated)] font-mono">groups.view</code>
          </p>
          <a href="/inbox" className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-300">
            <ArrowLeft className="w-3.5 h-3.5" /> العودة للمحادثات
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-6xl mx-auto" dir="rtl">
      {/* الرأس */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-purple-300">
            <Users2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-[var(--text-main)]">إدارة المجموعات</h1>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              كل مجموعات واتساب على خطوطنا — خطوطنا العضو بشارات <b className="text-rose-300">👑👑 المالك</b> و<b className="text-amber-300">👑 الأدمن</b>،
              طلبات انضمام الخطوط، وكل خواص المجموعة مربوطة بالقاعدة وEvolution
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canManage && (
            <button
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-500 text-white text-xs font-bold hover:bg-purple-400 transition-all"
            >
              <MessageSquarePlus className="w-4 h-4" /> مجموعة جديدة
            </button>
          )}
          <button
            onClick={sync}
            disabled={syncing}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--card-bg)] border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-main)] hover:border-purple-500/40 disabled:opacity-50 transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} /> مزامنة من واتساب
          </button>
        </div>
      </div>

      {/* بطاقات الإحصاء */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'إجمالي المجموعات', value: stats.total, icon: Users2, cls: 'text-purple-300' },
          { label: 'مجموعات خطوطنا عضو', value: stats.member, icon: UserPlus, cls: 'text-emerald-300' },
          { label: 'خطوطنا أدمن فيها', value: stats.admin, icon: Crown, cls: 'text-amber-300' },
          { label: 'طلبات انضمام معلقة', value: stats.pending, icon: Clock, cls: 'text-rose-300' },
        ].map((s) => (
          <div key={s.label} className="p-3.5 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-subtle)]">
            <div className="flex items-center justify-between">
              <span className={`text-lg font-black ${s.cls}`} style={{ fontFamily: 'var(--font-head)' }}>{s.value}</span>
              <s.icon className="w-4 h-4 text-[var(--text-muted)]" />
            </div>
            <div className="text-[10px] text-[var(--text-muted)] mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* طلبات الانضمام */}
      {canManage && (
        <JoinRequestsCard requests={requests} onDecided={() => { load(); }} />
      )}

      {/* شريط الفلترة */}
      <div className="rounded-2xl bg-[var(--card-bg)] border border-[var(--border-subtle)] p-3 flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute right-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو المعرف..."
            className="w-full bg-[var(--card-elevated)] border border-[var(--border-subtle)] rounded-xl pr-9 pl-3 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:border-purple-500"
          />
        </div>
        <select
          value={lineFilter}
          onChange={(e) => setLineFilter(e.target.value)}
          className="bg-[var(--card-elevated)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:border-purple-500"
        >
          <option value="all">كل الخطوط</option>
          {lineOptions.map(([inst, title]) => (
            <option key={inst} value={inst}>{title}</option>
          ))}
        </select>
        <span className="text-[10px] text-[var(--text-muted)]">
          {filtered.length} مجموعة
          {lastSync ? ` • آخر مزامنة ${new Date(lastSync).toLocaleString('ar', { dateStyle: 'short', timeStyle: 'short' })}` : ' • لم تتم مزامنة بعد'}
        </span>
      </div>

      {/* جدول المجموعات */}
      <div className="rounded-2xl bg-[var(--card-bg)] border border-[var(--border-subtle)] overflow-hidden">
        {loading && groups.length === 0 ? (
          <div className="p-8 text-center text-xs text-[var(--text-muted)] flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-purple-400" /> جاري التحميل...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center">
            <Users2 className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2" />
            <p className="text-xs text-[var(--text-muted)]">
              {groups.length === 0
                ? 'لا مجموعات بعد — اضغط «مزامنة من واتساب» لجلب كل مجموعات الخطوط المتصلة'
                : 'لا نتائج مطابقة للبحث'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-subtle)]">
            {filtered.map((g) => (
              <div key={g.group_jid} className="p-3.5 flex items-start justify-between gap-3 flex-wrap hover:bg-[var(--card-elevated)] transition-colors">
                <div className="flex items-start gap-3 min-w-0">
                  {g.picture_url || g.avatar_url ? (
                    <img src={g.picture_url || g.avatar_url || ''} alt="" className="w-10 h-10 rounded-2xl object-cover border border-[var(--border-subtle)] shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-2xl bg-[var(--accent-soft)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0 text-[var(--text-main)]">
                      <Users2 className="w-4 h-4" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-[var(--text-main)]">{g.display_name || g.subject}</span>
                      {g.pending_join > 0 && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/40 font-bold">
                          {g.pending_join} طلب انضمام
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-[var(--text-muted)] font-mono truncate" dir="ltr">{g.group_jid}</p>
                    <div className="mt-1.5"><LineBadges lines={g.our_lines} /></div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <span className="text-[10px] px-2 py-0.5 rounded-lg bg-[var(--card-elevated)] border border-[var(--border-subtle)] text-[var(--text-muted)] font-mono">
                    {g.participant_count} عضو
                  </span>
                  {g.announcement && (
                    <span title="وضع الإعلانات" className="p-1.5 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/40">
                      <Megaphone className="w-3 h-3" />
                    </span>
                  )}
                  {g.restricted && (
                    <span title="معلومات مقفلة" className="p-1.5 rounded-lg bg-sky-500/15 text-sky-300 border border-sky-500/40">
                      <Lock className="w-3 h-3" />
                    </span>
                  )}
                  <button
                    onClick={() => setSelected(g)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--card-elevated)] border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-main)] hover:border-purple-500/40 transition-all"
                  >
                    <Settings2 className="w-3.5 h-3.5" /> التفاصيل
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* الدرج والمودالات */}
      <GroupDetailsDrawer
        group={selected}
        canManage={canManage}
        onClose={() => setSelected(null)}
        onChanged={() => load()}
      />
      <CreateGroupModal
        open={createOpen}
        lines={lines}
        onClose={() => setCreateOpen(false)}
        onCreated={() => load()}
      />
    </div>
  );
}

export default function GroupsAdminPage() {
  return (
    <AppShell>
      <GroupsPageContent />
    </AppShell>
  );
}
