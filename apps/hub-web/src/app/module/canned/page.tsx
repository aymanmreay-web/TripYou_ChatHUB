'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  MessageSquareQuote, Plus, Search, Pencil, Trash2, X, Zap, Loader2,
} from 'lucide-react';
import { AppShell } from '../../../components/layout/AppShell';
import { toast } from '../../../components/common/Toaster';

interface CannedRow {
  id: string;
  title: string;
  body: string;
  shortcut: string | null;
  category: string | null;
  usage_count: number;
  is_active: boolean;
  sort: number | null;
}

const CATEGORIES = [
  { key: 'greeting', label: 'ترحيب' },
  { key: 'prices', label: 'أسعار' },
  { key: 'schedule', label: 'مواعيد' },
  { key: 'visa', label: 'تأشيرات' },
  { key: 'followup', label: 'متابعة' },
  { key: 'general', label: 'عام' },
];

const EMPTY_FORM = { title: '', body: '', shortcut: '', category: 'general' };

function CannedPageContent() {
  const [items, setItems] = useState<CannedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/canned-responses?all=1', { cache: 'no-store' });
      const json = await res.json();
      setItems(json.data || []);
    } catch {
      toast({ title: 'تعذر تحميل الردود الجاهزة', kind: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEdit = (row: CannedRow) => {
    setEditingId(row.id);
    setForm({ title: row.title, body: row.body, shortcut: row.shortcut || '', category: row.category || 'general' });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.body.trim()) {
      toast({ title: 'العنوان والنص مطلوبان', kind: 'error' });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        body: form.body,
        shortcut: form.shortcut.trim() || null,
        category: form.category,
      };
      const res = await fetch('/api/canned-responses', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingId ? { id: editingId, ...payload } : payload),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'فشل الحفظ');
      toast({ title: editingId ? 'تم تحديث الرد الجاهز' : 'تمت إضافة الرد الجاهز', kind: 'success' });
      setFormOpen(false);
      load();
    } catch (e: any) {
      toast({ title: e.message, kind: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: CannedRow) => {
    if (!confirm(`حذف "${row.title}" نهائياً؟`)) return;
    try {
      const res = await fetch(`/api/canned-responses?id=${row.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('فشل الحذف');
      setItems((prev) => prev.filter((x) => x.id !== row.id));
      toast({ title: 'تم الحذف', kind: 'success' });
    } catch (e: any) {
      toast({ title: e.message, kind: 'error' });
    }
  };

  const toggleActive = async (row: CannedRow) => {
    try {
      const res = await fetch('/api/canned-responses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.id, is_active: !row.is_active }),
      });
      if (res.ok) setItems((prev) => prev.map((x) => (x.id === row.id ? { ...x, is_active: !x.is_active } : x)));
    } catch { /* صامت */ }
  };

  const visible = items.filter((r) => {
    if (catFilter && (r.category || 'general') !== catFilter) return false;
    if (!search.trim()) return true;
    const s = search.trim().toLowerCase();
    return (
      r.title.toLowerCase().includes(s) ||
      r.body.toLowerCase().includes(s) ||
      (r.shortcut || '').toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-5 max-w-5xl mx-auto" dir="rtl">
      {/* الرأس */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-purple-300">
            <MessageSquareQuote className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-[var(--text-main)]">الردود الجاهزة</h1>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              قوالب سريعة تُدرج داخل المحادثات بزر ⚡ أو بكتابة "/" — متاحة لكل الموظفين
            </p>
          </div>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          رد جاهز جديد
        </button>
      </div>

      {/* البحث والتصنيفات */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-[var(--text-muted)] absolute right-3 top-2.5" />
          <input
            type="text"
            placeholder="بحث بالعنوان أو النص أو الاختصار..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[var(--card-elevated)] border border-[var(--border-subtle)] rounded-xl pr-9 pl-3 py-2 text-xs text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-purple-500"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setCatFilter('')}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-colors ${
              !catFilter ? 'bg-purple-600 text-white' : 'bg-[var(--card-elevated)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            الكل ({items.length})
          </button>
          {CATEGORIES.map((c) => {
            const n = items.filter((r) => (r.category || 'general') === c.key).length;
            if (n === 0) return null;
            return (
              <button
                key={c.key}
                onClick={() => setCatFilter(c.key)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-colors ${
                  catFilter === c.key ? 'bg-purple-600 text-white' : 'bg-[var(--card-elevated)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                {c.label} ({n})
              </button>
            );
          })}
        </div>
      </div>

      {/* نموذج الإضافة/التحرير */}
      {formOpen && (
        <div className="rounded-2xl bg-[var(--card-bg)] border border-purple-500/40 p-4 space-y-3 shadow-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[var(--text-main)]">
              {editingId ? 'تعديل الرد الجاهز' : 'رد جاهز جديد'}
            </h3>
            <button onClick={() => setFormOpen(false)} className="p-1 rounded-lg hover:bg-[var(--card-elevated)] text-[var(--text-muted)]">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              placeholder="العنوان *"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="bg-[var(--card-elevated)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:border-purple-500"
            />
            <input
              type="text"
              placeholder='الاختصار مثل "/ترحيب"'
              value={form.shortcut}
              onChange={(e) => setForm({ ...form, shortcut: e.target.value })}
              dir="ltr"
              className="bg-[var(--card-elevated)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:border-purple-500 text-left"
            />
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="bg-[var(--card-elevated)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:border-purple-500"
            >
              {CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>{c.label}</option>
              ))}
            </select>
          </div>
          <textarea
            placeholder="نص الرد — المتغيرات المدعومة: {name} اسم العميل، {staff} اسم الموظف"
            rows={4}
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            className="w-full bg-[var(--card-elevated)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:border-purple-500 resize-y"
          />
          <div className="flex justify-end gap-2">
            <button onClick={() => setFormOpen(false)} className="px-4 py-2 rounded-xl text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-main)]">
              إلغاء
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-60 text-white text-xs font-bold transition-colors"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
              {editingId ? 'حفظ التعديلات' : 'إضافة'}
            </button>
          </div>
        </div>
      )}

      {/* القائمة */}
      {loading ? (
        <div className="p-10 text-center text-[var(--text-muted)] text-xs flex flex-col items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
          جاري التحميل...
        </div>
      ) : visible.length === 0 ? (
        <div className="p-10 rounded-2xl bg-[var(--card-bg)] border border-dashed border-[var(--border-subtle)] text-center">
          <MessageSquareQuote className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3 opacity-50" />
          <p className="text-sm text-[var(--text-muted)]">لا توجد ردود جاهزة مطابقة</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {visible.map((r) => {
            const cat = CATEGORIES.find((c) => c.key === (r.category || 'general'));
            return (
              <div
                key={r.id}
                className={`rounded-2xl bg-[var(--card-bg)] border border-[var(--border-subtle)] p-4 flex items-start gap-3 transition-colors ${
                  r.is_active ? '' : 'opacity-50'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-[var(--text-main)]">{r.title}</span>
                    {r.shortcut && (
                      <code className="text-[10px] px-2 py-0.5 rounded-lg bg-purple-500/15 text-purple-300 border border-purple-500/30" dir="ltr">
                        {r.shortcut}
                      </code>
                    )}
                    <span className="text-[10px] px-2 py-0.5 rounded-lg bg-[var(--card-elevated)] border border-[var(--border-subtle)] text-[var(--text-muted)]">
                      {cat?.label || r.category}
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)] font-mono">
                      استُخدم {r.usage_count}×
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-1.5 leading-relaxed line-clamp-2 whitespace-pre-wrap">
                    {r.body}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => toggleActive(r)}
                    className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-colors ${
                      r.is_active
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                        : 'bg-slate-500/15 text-slate-400 border border-slate-500/30'
                    }`}
                    title={r.is_active ? 'نشط — يظهر في الصندوق' : 'مخفي عن الصندوق'}
                  >
                    {r.is_active ? 'نشط' : 'مخفي'}
                  </button>
                  <button
                    onClick={() => openEdit(r)}
                    className="p-2 rounded-lg text-[var(--text-muted)] hover:text-purple-300 hover:bg-[var(--card-elevated)] transition-colors"
                    title="تعديل"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(r)}
                    className="p-2 rounded-lg text-[var(--text-muted)] hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="حذف"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function CannedPage() {
  return (
    <AppShell>
      <CannedPageContent />
    </AppShell>
  );
}
