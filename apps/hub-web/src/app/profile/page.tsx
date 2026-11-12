'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { User, Phone, Mail, Clock, Shield, Check, Search, Radio, Key, PenTool, Loader2, Save } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AppShell } from '../../components/layout/AppShell';
import { Card, Avatar, Badge, Input } from '@tripyou/ui';
import { toast } from '../../components/common/Toaster';

/** بطاقة "توقيعي" — تحرير أجزاء التوقيع الثلاثة المسموحة للموظف من /api/signatures */
function MySignatureCard() {
  const { user } = useApp();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sig, setSig] = useState<{
    part1: string; part2: string; part3: string; is_active: boolean;
    editable1: boolean; editable2: boolean; editable3: boolean;
    labels: { p1: string; p2: string; p3: string };
  } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/signatures', { cache: 'no-store' });
      const json = await res.json();
      const mine = (json.staff || []).find((s: any) => s.id === user.id);
      const g = json.global;
      setSig({
        part1: mine?.custom_part1 || '',
        part2: mine?.custom_part2 || '',
        part3: mine?.custom_part3 || '',
        is_active: mine?.is_active ?? true,
        // قابلية التحرير: إعداد عام editable_by=staff/both أو ما لم يُقيَّد
        editable1: !g?.part1?.editable_by || ['staff', 'both'].includes(g.part1.editable_by),
        editable2: !g?.part2?.editable_by || ['staff', 'both'].includes(g.part2.editable_by),
        editable3: !g?.part3?.editable_by || ['staff', 'both'].includes(g.part3.editable_by),
        labels: {
          p1: g?.part1?.label_ar || 'السطر الأول (الاسم والصفة)',
          p2: g?.part2?.label_ar || 'السطر الثاني (القسم)',
          p3: g?.part3?.label_ar || 'السطر الثالث (الشركة)',
        },
      });
    } catch {
      toast({ title: 'تعذر تحميل التوقيع', kind: 'error' });
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!sig) return;
    setSaving(true);
    try {
      const res = await fetch('/api/signatures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staff: [{
            id: user.id,
            custom_part1: sig.part1,
            custom_part2: sig.part2,
            custom_part3: sig.part3,
            is_active: sig.is_active,
          }],
        }),
      });
      if (!res.ok) throw new Error('فشل الحفظ');
      toast({ title: 'تم حفظ توقيعك — سيُلحق برسائلك الصادرة', kind: 'success' });
    } catch (e: any) {
      toast({ title: e.message, kind: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card variant="subtle" className="p-6 border-slate-800/80">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
          جاري تحميل توقيعك...
        </div>
      </Card>
    );
  }
  if (!sig) return null;

  const preview = [sig.part1, sig.part2, sig.part3].filter(Boolean).join(' — ');

  return (
    <Card variant="subtle" className="p-6 border-slate-800/80">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2.5">
          <span className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <PenTool className="w-5 h-5" />
          </span>
          <div>
            <h2 className="text-base font-bold text-[var(--text-main)]">توقيعي في الرسائل</h2>
            <p className="text-xs text-slate-400">يُلحق تلقائياً برسائلك الصادرة عبر واتساب</p>
          </div>
        </div>
        <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
          <input
            type="checkbox"
            checked={sig.is_active}
            onChange={(e) => setSig({ ...sig, is_active: e.target.checked })}
            className="w-4 h-4 accent-purple-500"
          />
          التوقيع مُفعّل
        </label>
      </div>

      <div className="space-y-3">
        {([['part1', sig.labels.p1, sig.editable1], ['part2', sig.labels.p2, sig.editable2], ['part3', sig.labels.p3, sig.editable3]] as const).map(
          ([key, label, editable]) => (
            <div key={key}>
              <label className="text-[11px] text-slate-400 mb-1 flex items-center gap-1.5">
                {label}
                {!editable && <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-500">يديره المشرف</span>}
              </label>
              <input
                type="text"
                value={sig[key]}
                disabled={!editable}
                onChange={(e) => setSig({ ...sig, [key]: e.target.value })}
                className="w-full bg-slate-900/70 border border-slate-800 rounded-xl px-3 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:border-purple-500 disabled:opacity-50"
              />
            </div>
          )
        )}
      </div>

      {/* معاينة حية */}
      <div className="mt-4 p-3 rounded-xl bg-slate-900/70 border border-slate-800/60">
        <div className="text-[10px] text-slate-500 mb-1">معاينة كما ستظهر للعميل:</div>
        <div className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">{preview || '—'}</div>
      </div>

      <div className="flex justify-end mt-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-60 text-white text-xs font-bold transition-colors"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          حفظ التوقيع
        </button>
      </div>
    </Card>
  );
}

export default function ProfilePage() {
  const { user, selectedLine } = useApp();
  const [filterQuery, setFilterQuery] = useState('');

  const filteredPermissions = user.permissions.filter((p) =>
    p.toLowerCase().includes(filterQuery.toLowerCase())
  );

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto py-6 px-2 sm:px-4 space-y-6">
        {/* Profile Hero Card */}
        <Card variant="glass" className="p-6 sm:p-8 border-slate-800">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-right">
            <Avatar name={user.full_name} size="xl" status="online" className="shadow-xl" />

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 mb-1.5">
                <h1 className="text-2xl font-bold text-[var(--text-main)]">{user.full_name}</h1>
                <Badge variant="live" size="md">
                  نشط الآن
                </Badge>
              </div>

              <p className="text-sm text-emerald-400 font-medium mb-4">
                {user.role_title_ar}
              </p>

              {/* Grid of details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300">
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/60">
                  <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="text-slate-400">البريد الإلكتروني:</span>
                  <span className="font-mono text-[var(--text-main)] mr-auto">{user.email_masked}</span>
                </div>

                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/60">
                  <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="text-slate-400">رقم الهاتف:</span>
                  <span className="font-mono text-[var(--text-main)] mr-auto">{user.phone_masked}</span>
                </div>

                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/60">
                  <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="text-slate-400">ساعات العمل:</span>
                  <span className="text-[var(--text-main)] mr-auto">{user.working_hours || '09:00 ص - 05:00 م'}</span>
                </div>

                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/60">
                  <Radio className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-slate-400">الخط الافتراضي:</span>
                  <span className="text-emerald-300 mr-auto font-medium">{selectedLine.title_ar}</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* My Signature — م4 */}
        <MySignatureCard />

        {/* Permissions Matrix */}
        <Card variant="subtle" className="p-6 border-slate-800/80">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-5">
            <div className="flex items-center gap-2.5 text-right w-full sm:w-auto">
              <span className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Shield className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-base font-bold text-[var(--text-main)]">الصلاحيات الفعّالة (GET /me)</h2>
                <p className="text-xs text-slate-400">
                  يملك هذا الحساب {user.permissions.length} صلاحية تحدد الأقسام المتاحة في القائمة الجانبية
                </p>
              </div>
            </div>

            {/* Permissions Search Filter */}
            <div className="w-full sm:w-64">
              <Input
                placeholder="بحث في الصلاحيات..."
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                icon={<Search className="w-4 h-4 text-slate-500" />}
                className="text-xs h-9"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-96 overflow-y-auto pr-1">
            {filteredPermissions.map((perm) => (
              <div
                key={perm}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900/70 border border-slate-800/70 text-xs text-slate-300 hover:border-emerald-500/40 transition-colors"
              >
                <Key className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <code className="text-slate-200 font-mono text-[11px] truncate">{perm}</code>
                <Check className="w-3.5 h-3.5 text-emerald-400 mr-auto shrink-0" />
              </div>
            ))}
            {filteredPermissions.length === 0 && (
              <div className="col-span-full text-center py-6 text-xs text-slate-500">
                لا توجد نتائج مطابقة لبحثك
              </div>
            )}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
