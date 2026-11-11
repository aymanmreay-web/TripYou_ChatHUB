'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Send, Plus, X, Loader2, Play, Pause, Square, RefreshCw,
  Users, Clock, CheckCircle2, XCircle, SkipForward, MessageSquareQuote,
} from 'lucide-react';
import { AppShell } from '../../../components/layout/AppShell';
import { toast } from '../../../components/common/Toaster';

interface CampaignRow {
  id: string;
  title: string;
  description: string | null;
  status: string;
  line_instance: string;
  audience: any;
  text: string;
  throttle: any;
  scheduled_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  stats: any;
  recipients_count: number;
  created_at: string;
}

interface RecipientRow {
  id: string;
  phone_e164: string;
  display_name: string | null;
  status: string;
  skip_reason: string | null;
  error: string | null;
  sent_at: string | null;
}

interface LineOpt { instance_name: string; title_ar: string; status: string; daily_cap: number }
interface ListOpt { id: string; title: string; members_count: number }

const STATUS_STYLE: Record<string, { label: string; cls: string }> = {
  draft: { label: 'مسودة', cls: 'bg-slate-500/20 text-slate-300 border-slate-500/40' },
  scheduled: { label: 'مجدولة', cls: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
  running: { label: 'جارية', cls: 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse' },
  paused: { label: 'متوقفة مؤقتاً', cls: 'bg-purple-500/20 text-purple-300 border-purple-500/40' },
  done: { label: 'مكتملة', cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
  cancelled: { label: 'ملغاة', cls: 'bg-rose-500/20 text-rose-300 border-rose-500/40' },
};

function CampaignsPageContent() {
  const [items, setItems] = useState<CampaignRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // معالج الإنشاء
  const [lines, setLines] = useState<LineOpt[]>([]);
  const [lists, setLists] = useState<ListOpt[]>([]);
  const [form, setForm] = useState({
    title: '',
    description: '',
    line_instance: '',
    text: '',
    per_minute: 20,
    scheduled_at: '',
    audienceMode: 'filter' as 'filter' | 'list',
    list_id: '',
    tag: '',
    city: '',
    source: '',
    country_code: '',
  });
  const [creating, setCreating] = useState(false);
  const [previewCount, setPreviewCount] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/campaigns', { cache: 'no-store' });
      const json = await res.json();
      setItems(json.data || []);
    } catch {
      /* صامت */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 10000); // تحديث دوري لكل الحملات
    return () => clearInterval(interval);
  }, [load]);

  // تحميل خيارات المعالج
  useEffect(() => {
    if (!wizardOpen || lines.length > 0) return;
    (async () => {
      try {
        const [lRes, liRes] = await Promise.all([
          fetch('/api/campaigns/meta?kind=lines'),
          fetch('/api/campaigns/meta?kind=lists'),
        ]);
        const l = await lRes.json();
        const li = await liRes.json();
        setLines(l.data || []);
        setLists(li.data || []);
        if ((l.data || []).length > 0 && !form.line_instance) {
          setForm((f) => ({ ...f, line_instance: l.data[0].instance_name }));
        }
      } catch { /* صامت */ }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wizardOpen]);

  // معاينة عدد المستلمين عند تغيير الفلاتر
  useEffect(() => {
    if (form.audienceMode !== 'filter') { setPreviewCount(null); return; }
    const hasAny = form.tag || form.city || form.source || form.country_code;
    if (!hasAny) { setPreviewCount(null); return; }
    const params = new URLSearchParams({ section: 'stats' });
    if (form.tag) params.set('tag', form.tag);
    if (form.city) params.set('city', form.city);
    if (form.country_code) params.set('country_code', form.country_code);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/contacts?${params.toString()}`);
        const json = await res.json();
        setPreviewCount(Number(json.stats?.total ?? json.total ?? 0));
      } catch { setPreviewCount(null); }
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.tag, form.city, form.source, form.country_code, form.audienceMode]);

  const handleCreate = async () => {
    if (!form.title.trim() || !form.line_instance || !form.text.trim()) {
      toast({ title: 'العنوان والخط ونص الرسالة مطلوبة', kind: 'error' });
      return;
    }
    setCreating(true);
    try {
      const audience =
        form.audienceMode === 'list' && form.list_id
          ? { list_id: form.list_id }
          : { filter: { tag: form.tag || undefined, city: form.city || undefined, source: form.source || undefined, country_code: form.country_code || undefined } };

      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          description: form.description || undefined,
          line_instance: form.line_instance,
          text: form.text,
          throttle: { per_minute: Number(form.per_minute) || 20 },
          scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : undefined,
          audience,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'فشل الإنشاء');
      toast({ title: json.message || 'تم إنشاء الحملة', kind: 'success' });
      setWizardOpen(false);
      setForm((f) => ({ ...f, title: '', description: '', text: '', scheduled_at: '' }));
      load();
    } catch (e: any) {
      toast({ title: e.message, kind: 'error' });
    } finally {
      setCreating(false);
    }
  };

  const handleAction = async (id: string, action: string) => {
    setBusyId(id);
    try {
      const res = await fetch('/api/campaigns', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setItems((prev) => prev.map((c) => (c.id === id ? { ...c, status: json.status } : c)));
      toast({ title: action === 'send_now' ? 'بدأ الإرسال — يتابعه المحرك تلقائياً' : 'تم التنفيذ', kind: 'success' });
      load();
    } catch (e: any) {
      toast({ title: e.message, kind: 'error' });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5 max-w-6xl mx-auto" dir="rtl">
      {/* الرأس */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-fuchsia-500/15 border border-fuchsia-500/30 text-fuchsia-300">
            <Send className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-[var(--text-main)]">حملات الواتساب</h1>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              إرسال مجدول بمعدل آمن يحترم حصص الخطوط — الحالة محفوظة بالقاعدة ولا تضيع عند إعادة التشغيل
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-2 rounded-xl bg-[var(--card-elevated)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)]" title="تحديث">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setWizardOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-xs font-bold shadow-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            حملة جديدة
          </button>
        </div>
      </div>

      {/* معالج الإنشاء */}
      {wizardOpen && (
        <div className="rounded-2xl bg-[var(--card-bg)] border border-fuchsia-500/40 p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[var(--text-main)]">إنشاء حملة جديدة</h3>
            <button onClick={() => setWizardOpen(false)} className="p-1 rounded-lg hover:bg-[var(--card-elevated)] text-[var(--text-muted)]">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-[var(--text-muted)] mb-1 block">عنوان الحملة *</label>
              <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full bg-[var(--card-elevated)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:border-fuchsia-500" />
            </div>
            <div>
              <label className="text-[11px] text-[var(--text-muted)] mb-1 block">خط الإرسال *</label>
              <select value={form.line_instance} onChange={(e) => setForm({ ...form, line_instance: e.target.value })}
                className="w-full bg-[var(--card-elevated)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:border-fuchsia-500">
                {lines.map((l) => (
                  <option key={l.instance_name} value={l.instance_name}>
                    {l.title_ar} ({l.instance_name}) — حد {l.daily_cap}/يوم
                  </option>
                ))}
                {lines.length === 0 && <option value="">لا خطوط متاحة</option>}
              </select>
            </div>
          </div>

          {/* الجمهور */}
          <div>
            <label className="text-[11px] text-[var(--text-muted)] mb-1.5 block">الجمهور</label>
            <div className="flex gap-2 mb-2">
              <button onClick={() => setForm({ ...form, audienceMode: 'filter' })}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold ${form.audienceMode === 'filter' ? 'bg-fuchsia-600 text-white' : 'bg-[var(--card-elevated)] text-[var(--text-muted)]'}`}>
                فلترة جهات الاتصال
              </button>
              <button onClick={() => setForm({ ...form, audienceMode: 'list' })} disabled={lists.length === 0}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold disabled:opacity-40 ${form.audienceMode === 'list' ? 'bg-fuchsia-600 text-white' : 'bg-[var(--card-elevated)] text-[var(--text-muted)]'}`}>
                قائمة محفوظة {lists.length === 0 ? '(لا قوائم)' : `(${lists.length})`}
              </button>
            </div>

            {form.audienceMode === 'list' ? (
              <select value={form.list_id} onChange={(e) => setForm({ ...form, list_id: e.target.value })}
                className="w-full bg-[var(--card-elevated)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-xs text-[var(--text-main)]">
                <option value="">اختر قائمة...</option>
                {lists.map((li) => (
                  <option key={li.id} value={li.id}>{li.title} ({li.members_count} عضو)</option>
                ))}
              </select>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <input type="text" placeholder="وسم (مثل VIP)" value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value })}
                  className="bg-[var(--card-elevated)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-xs text-[var(--text-main)]" />
                <input type="text" placeholder="مدينة" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="bg-[var(--card-elevated)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-xs text-[var(--text-main)]" />
                <input type="text" placeholder="مصدر" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}
                  className="bg-[var(--card-elevated)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-xs text-[var(--text-main)]" />
                <input type="text" placeholder="رمز دولة (SA)" value={form.country_code} onChange={(e) => setForm({ ...form, country_code: e.target.value })}
                  dir="ltr" className="bg-[var(--card-elevated)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-xs text-[var(--text-main)] text-left" />
              </div>
            )}
            {previewCount !== null && (
              <p className="text-[10px] text-fuchsia-300 mt-1.5 flex items-center gap-1">
                <Users className="w-3 h-3" /> ~{previewCount} جهة اتصال مطابقة (يُستثنى طالبو عدم الإزعاج تلقائياً)
              </p>
            )}
          </div>

          {/* النص والإعدادات */}
          <div>
            <label className="text-[11px] text-[var(--text-muted)] mb-1 block">
              نص الرسالة * — المتغيرات: {'{name}'} اسم العميل
            </label>
            <textarea rows={4} value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })}
              placeholder="مرحباً {name} 👋 لدينا عروض خاصة على رحلات العمرة..."
              className="w-full bg-[var(--card-elevated)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:border-fuchsia-500 resize-y" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-[var(--text-muted)] mb-1 block">معدل الإرسال: {form.per_minute} رسالة/دقيقة</label>
              <input type="range" min={5} max={60} step={5} value={form.per_minute}
                onChange={(e) => setForm({ ...form, per_minute: Number(e.target.value) })}
                className="w-full accent-fuchsia-500" />
            </div>
            <div>
              <label className="text-[11px] text-[var(--text-muted)] mb-1 block">جدولة الإرسال (اتركه فارغاً للإرسال اليدوي)</label>
              <input type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
                className="w-full bg-[var(--card-elevated)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-xs text-[var(--text-main)]" />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button onClick={() => setWizardOpen(false)} className="px-4 py-2 rounded-xl text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-main)]">إلغاء</button>
            <button onClick={handleCreate} disabled={creating || lines.length === 0}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-60 text-white text-xs font-bold transition-colors">
              {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              إنشاء الحملة
            </button>
          </div>
        </div>
      )}

      {/* قائمة الحملات */}
      {loading ? (
        <div className="p-12 text-center text-xs text-[var(--text-muted)] flex flex-col items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-fuchsia-400" /> جاري التحميل...
        </div>
      ) : items.length === 0 ? (
        <div className="p-12 rounded-2xl bg-[var(--card-bg)] border border-dashed border-[var(--border-subtle)] text-center">
          <Send className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3 opacity-50" />
          <p className="text-sm text-[var(--text-muted)]">لا حملات بعد — أنشئ أول حملة واتساب مجدولة</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((c) => {
            const st = STATUS_STYLE[c.status] || STATUS_STYLE.draft;
            const stats = c.stats || {};
            const total = c.recipients_count || 0;
            const sent = Number(stats.sent || 0);
            const progress = total > 0 ? Math.round((sent / total) * 100) : 0;
            return (
              <div key={c.id} className="rounded-2xl bg-[var(--card-bg)] border border-[var(--border-subtle)] p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-[var(--text-main)]">{c.title}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-lg border font-bold ${st.cls}`}>{st.label}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-lg bg-[var(--card-elevated)] border border-[var(--border-subtle)] text-[var(--text-muted)] font-mono">
                        {c.line_instance}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-1">{c.text}</p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {(c.status === 'draft' || c.status === 'paused') && (
                      <button onClick={() => handleAction(c.id, 'send_now')} disabled={busyId === c.id}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-600/30 text-[11px] font-bold transition-colors">
                        {busyId === c.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                        {c.status === 'draft' ? 'إرسال' : 'استئناف'}
                      </button>
                    )}
                    {c.status === 'running' && (
                      <button onClick={() => handleAction(c.id, 'pause')} disabled={busyId === c.id}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-600/20 border border-purple-500/40 text-purple-300 hover:bg-purple-600/30 text-[11px] font-bold transition-colors">
                        <Pause className="w-3 h-3" /> إيقاف مؤقت
                      </button>
                    )}
                    {['draft', 'scheduled', 'running', 'paused'].includes(c.status) && (
                      <button onClick={() => handleAction(c.id, 'cancel')} disabled={busyId === c.id}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-600/15 border border-rose-500/40 text-rose-300 hover:bg-rose-600/25 text-[11px] font-bold transition-colors">
                        <Square className="w-3 h-3" /> إلغاء
                      </button>
                    )}
                    <button onClick={() => setDetailId(detailId === c.id ? null : c.id)}
                      className="px-3 py-1.5 rounded-xl bg-[var(--card-elevated)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)] text-[11px] font-bold">
                      {detailId === c.id ? 'إخفاء المستلمين' : 'المستلمون'}
                    </button>
                  </div>
                </div>

                {/* شريط التقدم الحي */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] mb-1">
                    <span>{sent} / {total} أُرسلت ({progress}%)</span>
                    <span className="flex items-center gap-3 font-mono">
                      <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />{sent}</span>
                      <span className="text-rose-400 flex items-center gap-1"><XCircle className="w-3 h-3" />{Number(stats.failed || 0)}</span>
                      <span className="text-slate-400 flex items-center gap-1"><SkipForward className="w-3 h-3" />{Number(stats.skipped || 0)}</span>
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-[var(--card-elevated)] overflow-hidden">
                    <div className="h-full bg-gradient-to-l from-fuchsia-500 to-purple-500 transition-all duration-700" style={{ width: `${progress}%` }} />
                  </div>
                </div>

                {detailId === c.id && <RecipientsTable campaignId={c.id} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** جدول مستلمي الحملة بتحديث حي كل 3 ثوانٍ */
function RecipientsTable({ campaignId }: { campaignId: string }) {
  const [rows, setRows] = useState<RecipientRow[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState('');

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch(`/api/campaigns/${campaignId}`, { cache: 'no-store' });
        const json = await res.json();
        if (!alive) return;
        setRows(json.recipients || []);
        setCounts(json.counts || {});
      } catch { /* صامت */ }
    };
    load();
    const interval = setInterval(load, 3000);
    return () => { alive = false; clearInterval(interval); };
  }, [campaignId]);

  const visible = filter ? rows.filter((r) => r.status === filter) : rows;

  return (
    <div className="mt-3 rounded-xl border border-[var(--border-subtle)] overflow-hidden">
      <div className="flex gap-1.5 p-2 bg-[var(--card-elevated)] flex-wrap">
        <button onClick={() => setFilter('')}
          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${!filter ? 'bg-fuchsia-600 text-white' : 'text-[var(--text-muted)]'}`}>
          الكل ({rows.length})
        </button>
        {(['pending', 'sent', 'failed', 'skipped'] as const).map((k) => (
          <button key={k} onClick={() => setFilter(k)}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${filter === k ? 'bg-fuchsia-600 text-white' : 'text-[var(--text-muted)]'}`}>
            {{ pending: 'بالانتظار', sent: 'أُرسلت', failed: 'فشلت', skipped: 'تخطي' }[k]} ({counts[k] || 0})
          </button>
        ))}
      </div>
      <div className="max-h-64 overflow-y-auto divide-y divide-[var(--border-subtle)]">
        {visible.length === 0 ? (
          <div className="p-5 text-center text-xs text-[var(--text-muted)]">لا سجلات</div>
        ) : (
          visible.map((r) => (
            <div key={r.id} className="flex items-center justify-between px-3 py-2 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  r.status === 'sent' ? 'bg-emerald-400' : r.status === 'failed' ? 'bg-rose-400' : r.status === 'skipped' ? 'bg-slate-400' : 'bg-amber-400 animate-pulse'
                }`} />
                <span className="text-[var(--text-main)] truncate">{r.display_name || 'بدون اسم'}</span>
                <span className="font-mono text-[10px] text-[var(--text-muted)]" dir="ltr">{r.phone_e164}</span>
              </div>
              <span className="text-[10px] text-[var(--text-muted)] shrink-0">
                {r.status === 'sent' && r.sent_at ? new Date(r.sent_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : r.error ? r.error.slice(0, 40) : r.skip_reason || ''}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function CampaignsPage() {
  return (
    <AppShell>
      <CampaignsPageContent />
    </AppShell>
  );
}
