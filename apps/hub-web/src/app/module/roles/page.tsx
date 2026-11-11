'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Shield, Loader2, Building2, Users, Lock, CheckCircle2, XCircle, Search } from 'lucide-react';
import { AppShell } from '../../../components/layout/AppShell';
import { toast } from '../../../components/common/Toaster';

/**
 * B4 — قسم الأدوار والصلاحيات (موسع، مفصل، مربوط بالقاعدة):
 * الأدوار الثلاثة المعتمدة: مدير (super_admin) / مشرف (sales_lead) / موظف (support_agent)
 * + الأدوار المساندة (مراقب/متدرب) — مصفوفة صلاحيات كاملة من hub.permissions × hub.role_permissions
 * + الأقسام (hub.departments) مع عدد الموظفين وربطهم
 */

interface RoleRow { id: string; key: string; title_ar: string; staff_count: number }
interface PermRow { key: string; grp: string; label_ar: string; super_only: boolean }
interface MatrixRow { role_id: string; permission_key: string }
interface DeptRow { id: string; key: string; title_ar: string; staff_count: number }

const ROLE_TAG: Record<string, { label: string; cls: string }> = {
  super_admin: { label: 'مدير', cls: 'bg-rose-500/15 text-rose-300 border-rose-500/40' },
  sales_lead: { label: 'مشرف', cls: 'bg-amber-500/15 text-amber-300 border-amber-500/40' },
  support_agent: { label: 'موظف', cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40' },
  observer: { label: 'مراقب', cls: 'bg-sky-500/15 text-sky-300 border-sky-500/40' },
  trainee: { label: 'متدرب', cls: 'bg-slate-500/15 text-slate-300 border-slate-500/40' },
};

function RolesPageContent() {
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [permissions, setPermissions] = useState<PermRow[]>([]);
  const [matrix, setMatrix] = useState<MatrixRow[]>([]);
  const [departments, setDepartments] = useState<DeptRow[]>([]);
  const [activeRoleId, setActiveRoleId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [permSearch, setPermSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/roles-matrix', { cache: 'no-store' });
      const json = await res.json();
      setRoles(json.roles || []);
      setPermissions(json.permissions || []);
      setMatrix(json.matrix || []);
      setDepartments(json.departments || []);
      if (!activeRoleId && (json.roles || []).length > 0) {
        const first = (json.roles as RoleRow[]).find((r) => r.key !== 'super_admin') || json.roles[0];
        setActiveRoleId(first.id);
      }
    } catch {
      toast({ title: 'تعذر تحميل الصلاحيات', kind: 'error' });
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { load(); }, [load]);

  const activeRole = roles.find((r) => r.id === activeRoleId);
  const isSuperAdminRole = activeRole?.key === 'super_admin';

  const rolePerms = useMemo(() => {
    const set = new Set<string>();
    matrix.filter((m) => m.role_id === activeRoleId).forEach((m) => set.add(m.permission_key));
    return set;
  }, [matrix, activeRoleId]);

  const groupedPerms = useMemo(() => {
    const groups = new Map<string, PermRow[]>();
    for (const p of permissions) {
      if (permSearch && !(p.label_ar || '').includes(permSearch) && !p.key.includes(permSearch.toLowerCase())) continue;
      const g = p.grp || 'عام';
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g)!.push(p);
    }
    return Array.from(groups.entries());
  }, [permissions, permSearch]);

  const togglePerm = async (permKey: string, on: boolean) => {
    if (!activeRole || isSuperAdminRole) return;
    const k = `${activeRole.id}:${permKey}`;
    setSavingKey(k);
    // تحديث متفائل
    setMatrix((prev) =>
      on
        ? [...prev.filter((m) => !(m.role_id === activeRole.id && m.permission_key === permKey)), { role_id: activeRole.id, permission_key: permKey }]
        : prev.filter((m) => !(m.role_id === activeRole.id && m.permission_key === permKey))
    );
    try {
      const res = await fetch('/api/roles-matrix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role_id: activeRole.id, permission_key: permKey, on }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast({ title: on ? 'فُعّلت الصلاحية للدور' : 'أُوقفت الصلاحية عن الدور', kind: 'success' });
    } catch (e: any) {
      toast({ title: e.message, kind: 'error' });
      load();
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="space-y-5 max-w-6xl mx-auto" dir="rtl">
      {/* الرأس */}
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-purple-300">
          <Shield className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-black text-[var(--text-main)]">الأدوار والصلاحيات</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            بنية الأدوار الثلاثة: <b className="text-rose-300">مدير</b> يملك كل شيء • <b className="text-amber-300">مشرف</b> يدير الفريق والإسناد • <b className="text-emerald-300">موظف</b> يعمل على محادثاته المسندة — كلها مربوطة بالقاعدة وتُطبق فوراً على الرؤية والوصول
          </p>
        </div>
      </div>

      {/* بطاقات الأدوار */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {loading && roles.length === 0 ? (
          <div className="col-span-full p-8 text-center text-xs text-[var(--text-muted)] flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-purple-400" /> جاري التحميل...
          </div>
        ) : (
          roles.map((r) => {
            const tag = ROLE_TAG[r.key] || { label: r.title_ar, cls: 'bg-slate-500/15 text-slate-300 border-slate-500/40' };
            const count = matrix.filter((m) => m.role_id === r.id).length;
            return (
              <button
                key={r.id}
                onClick={() => setActiveRoleId(r.id)}
                className={`p-4 rounded-2xl border text-right transition-all ${
                  activeRoleId === r.id
                    ? 'bg-purple-600/15 border-purple-500/50 shadow-lg'
                    : 'bg-[var(--card-bg)] border-[var(--border-subtle)] hover:border-purple-500/30'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-lg border font-bold ${tag.cls}`}>{tag.label}</span>
                  <Users className="w-4 h-4 text-[var(--text-muted)]" />
                </div>
                <div className="text-sm font-bold text-[var(--text-main)]">{r.title_ar}</div>
                <div className="text-[10px] text-[var(--text-muted)] mt-1 font-mono">
                  {r.staff_count} موظف • {r.key === 'super_admin' ? 'كل الصلاحيات' : `${count} صلاحية مفعلة`}
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* مصفوفة الصلاحيات */}
      {activeRole && (
        <div className="rounded-2xl bg-[var(--card-bg)] border border-[var(--border-subtle)] overflow-hidden">
          <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              {isSuperAdminRole ? (
                <span className="flex items-center gap-1.5 text-xs font-bold text-rose-300">
                  <Lock className="w-4 h-4" /> صلاحيات المدير كاملة دائماً — غير قابلة للتعديل
                </span>
              ) : (
                <span className="text-sm font-bold text-[var(--text-main)]">
                  صلاحيات دور: <span className="text-purple-300">{activeRole.title_ar}</span>
                </span>
              )}
            </div>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute right-3 top-2.5" />
              <input
                type="text"
                value={permSearch}
                onChange={(e) => setPermSearch(e.target.value)}
                placeholder="بحث في الصلاحيات..."
                className="bg-[var(--card-elevated)] border border-[var(--border-subtle)] rounded-xl pr-9 pl-3 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:border-purple-500 w-56"
              />
            </div>
          </div>

          <div className="p-4 space-y-5">
            {groupedPerms.map(([grp, perms]) => (
              <div key={grp}>
                <div className="text-[11px] font-bold text-purple-300 mb-2 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" />
                  {grp}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {perms.map((p) => {
                    const on = isSuperAdminRole ? true : rolePerms.has(p.key);
                    const locked = isSuperAdminRole || p.super_only;
                    const k = `${activeRole.id}:${p.key}`;
                    return (
                      <button
                        key={p.key}
                        type="button"
                        disabled={locked || savingKey === k}
                        onClick={() => togglePerm(p.key, !on)}
                        className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all text-right ${
                          on
                            ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-200'
                            : 'bg-[var(--card-elevated)] border-[var(--border-subtle)] text-[var(--text-muted)]'
                        } ${locked ? 'opacity-70 cursor-not-allowed' : 'hover:border-purple-500/40'}`}
                        title={p.key}
                      >
                        <span className="truncate">{p.label_ar || p.key}</span>
                        {on ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" /> : <XCircle className="w-4 h-4 shrink-0 text-slate-500" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            {groupedPerms.length === 0 && !loading && (
              <p className="text-center text-xs text-[var(--text-muted)] py-6">لا صلاحيات مطابقة للبحث</p>
            )}
          </div>
        </div>
      )}

      {/* الأقسام وربط الموظفين */}
      <div className="rounded-2xl bg-[var(--card-bg)] border border-[var(--border-subtle)] overflow-hidden">
        <div className="p-4 border-b border-[var(--border-subtle)]">
          <h3 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2">
            <Building2 className="w-4 h-4 text-amber-400" /> الأقسام وربط الموظفين
          </h3>
        </div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {departments.map((d) => (
            <div key={d.id} className="p-3 rounded-xl bg-[var(--card-elevated)] border border-[var(--border-subtle)]">
              <div className="text-xs font-bold text-[var(--text-main)]">{d.title_ar}</div>
              <div className="text-[10px] text-[var(--text-muted)] mt-1 font-mono">{d.staff_count} موظف</div>
            </div>
          ))}
          {departments.length === 0 && !loading && (
            <p className="col-span-full text-center text-xs text-[var(--text-muted)] py-4">لا أقسام معرفة بعد — تُدار من تبويب إدارة الشركة</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function RolesPage() {
  return (
    <AppShell>
      <RolesPageContent />
    </AppShell>
  );
}
