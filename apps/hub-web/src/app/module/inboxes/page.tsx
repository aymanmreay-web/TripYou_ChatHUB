'use client';

import React, { useState, useEffect } from 'react';
import { 
  Inbox, 
  Plus, 
  Edit2, 
  Trash2, 
  PhoneCall, 
  Users, 
  ChevronDown, 
  ChevronUp, 
  Layers, 
  CheckCircle2, 
  Check, 
  Save, 
  X, 
  Filter, 
  Palette 
} from 'lucide-react';
import { AppShell } from '../../../components/layout/AppShell';
import { supabase } from '../../../lib/supabase';
import { ModernColorPicker } from '../../../components/common/ModernColorPicker';
import { fetchInboxes, fetchLines, saveInbox, deleteInbox, LineOption } from '../../../lib/hubDb';

interface InboxItem {
  id: string;
  name_ar: string;
  description: string;
  assigned_lines: string[];
  filter_type: 'all' | 'dm' | 'groups';
  color_hex: string;
  staff_count: number;
}


const FILTER_LABELS = { all: 'الكل (فردية ومجموعات)', dm: 'محادثات فردية فقط', groups: 'مجموعات فقط' };


export default function InboxesPage() {
  const [inboxes, setInboxes] = useState<InboxItem[]>([]);
  const [lines, setLines] = useState<LineOption[]>([]);
  const [editingInbox, setEditingInbox] = useState<InboxItem | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveNotification, setSaveNotification] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const AVAILABLE_LINES = lines.map((l) => l.name);

  const showNotification = (msg: string) => {
    setSaveError(null);
    setSaveNotification(msg);
    setTimeout(() => setSaveNotification(null), 3500);
  };

  const showError = (msg: string) => {
    setSaveNotification(null);
    setSaveError(msg);
    setTimeout(() => setSaveError(null), 8000);
  };

  const reload = async () => {
    try {
      const [rows, ls] = await Promise.all([fetchInboxes(), fetchLines()]);
      setLines(ls);
      setInboxes(
        rows.map((r) => ({
          id: r.id,
          name_ar: r.name_ar,
          description: r.description,
          assigned_lines: r.line_ids
            .map((id) => ls.find((l) => l.id === id)?.name)
            .filter(Boolean) as string[],
          filter_type: r.filter_type,
          color_hex: r.color_hex,
          staff_count: r.staff_count,
        }))
      );
    } catch (e: any) {
      showError(e.message);
    }
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save Modal (Create or Edit)
  const handleSaveModal = async () => {
    if (!editingInbox || !editingInbox.name_ar.trim() || saving) return;
    setSaving(true);
    try {
      await saveInbox(
        {
          id: editingInbox.id,
          name_ar: editingInbox.name_ar,
          description: editingInbox.description,
          color_hex: editingInbox.color_hex,
          filter_type: editingInbox.filter_type,
          line_ids: editingInbox.assigned_lines
            .map((n) => lines.find((l) => l.name === n)?.id)
            .filter(Boolean) as string[],
          staff_count: 0,
        },
        isCreating,
        inboxes.length + 1
      );
      const savedName = editingInbox.name_ar;
      setEditingInbox(null);
      setIsCreating(false);
      await reload();
      showNotification(`تم حفظ صندوق "${savedName}" بنجاح!`);
    } catch (e: any) {
      showError(`تعذّر حفظ الصندوق: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Delete Inbox
  const handleDeleteInbox = async (id: string) => {
    try {
      await deleteInbox(id);
      await reload();
      showNotification('تم حذف الصندوق');
    } catch (e: any) {
      showError(`تعذّر حذف الصندوق: ${e.message}`);
    }
  };

  return (
    <AppShell>
      <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border-subtle)]">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-main)] flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg">
                <Inbox className="w-5 h-5" />
              </div>
              إدارة الصناديق
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
              تجميع المحادثات وتصنيفها حسب الأقسام والخطوط وسياسات الفلترة
            </p>
          </div>

          <div className="flex items-center gap-3">
            {saveError && (
              <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-bold max-w-md">
                <X className="w-4 h-4 shrink-0" />
                {saveError}
              </div>
            )}

            {saveNotification && (
              <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold animate-in fade-in">
                <CheckCircle2 className="w-4 h-4" />
                {saveNotification}
              </div>
            )}

            <button
              onClick={() => {
                setEditingInbox({
                  id: `inbox-${Date.now()}`,
                  name_ar: '',
                  description: '',
                  assigned_lines: [],
                  filter_type: 'all',
                  color_hex: '#6366f1',
                  staff_count: 1
                });
                setIsCreating(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-purple-950/40 transition-all"
            >
              <Plus className="w-4 h-4" />
              إنشاء صندوق جديد
            </button>
          </div>
        </div>

        {/* شبكة الصناديق التفاعلية */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {inboxes.map((ibx) => (
            <div
              key={ibx.id}
              className="p-5 rounded-3xl border border-white/5 bg-[var(--card-elevated)] space-y-4 shadow-xl hover:border-purple-500/50 transition-all flex flex-col justify-between"
              style={{ borderTopWidth: '4px', borderTopColor: ibx.color_hex }}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-3.5 h-3.5 rounded-xl shadow-sm"
                      style={{ backgroundColor: ibx.color_hex }}
                    />
                    <h3 className="font-bold text-white text-base">{ibx.name_ar}</h3>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingInbox(ibx);
                        setIsCreating(false);
                      }}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                      title="تعديل الصندوق"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteInbox(ibx.id)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="حذف الصندوق"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed min-h-[40px]">
                  {ibx.description || 'لا يوجد شرح مدخل لهذا الصندوق'}
                </p>

                {/* نوع الفلترة */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-400">نوع المحادثات:</span>
                  <span className="px-2 py-0.5 rounded-md bg-purple-950/60 border border-purple-800 text-[10px] font-bold text-purple-300">
                    {FILTER_LABELS[ibx.filter_type]}
                  </span>
                </div>
              </div>

              {/* الخطوط المرتبطة */}
              <div className="pt-3 border-t border-purple-900/30 space-y-2">
                <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                  <PhoneCall className="w-3 h-3 text-emerald-400" />
                  الخطوط التابعة ({ibx.assigned_lines.length}):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {ibx.assigned_lines.map((ln, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[10px] font-semibold"
                    >
                      {ln}
                    </span>
                  ))}
                  {ibx.assigned_lines.length === 0 && (
                    <span className="text-[10px] text-slate-500">لا توجد خطوط مسندة بعد</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Modal إنشاء وتعديل الصندوق */}
        {editingInbox && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[var(--card-bg)] border border-purple-500/40 rounded-3xl max-w-lg w-full p-6 space-y-5 text-right shadow-2xl">
              
              <div className="flex items-center justify-between border-b border-purple-900/40 pb-3">
                <h4 className="font-bold text-white text-base flex items-center gap-2">
                  <Inbox className="w-5 h-5 text-purple-400" />
                  {isCreating ? 'إنشاء صندوق محادثات جديد' : `تعديل: ${editingInbox.name_ar}`}
                </h4>
                <button onClick={() => setEditingInbox(null)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* الاسم والوصف */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">اسم الصندوق:</label>
                <input
                  type="text"
                  placeholder="مثال: صندوق عملاء الخليج، استفسارات الطيران..."
                  value={editingInbox.name_ar}
                  onChange={(e) => setEditingInbox({ ...editingInbox, name_ar: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">وصف الصندوق والهدف منه:</label>
                <textarea
                  rows={2}
                  placeholder="شرح موجز لنوع المحادثات التابعة له..."
                  value={editingInbox.description}
                  onChange={(e) => setEditingInbox({ ...editingInbox, description: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-none"
                />
              </div>

              {/* نوع الفلترة واللون */}
              <div className="grid grid-cols-2 gap-3 items-end">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">نوع المحادثات المشمولة:</label>
                  <select
                    value={editingInbox.filter_type}
                    onChange={(e) => setEditingInbox({ ...editingInbox, filter_type: e.target.value as any })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="all">الكل (فردية ومجموعات)</option>
                    <option value="dm">محادثات فردية فقط</option>
                    <option value="groups">مجموعات فقط</option>
                  </select>
                </div>

                <div>
                  <ModernColorPicker
                    value={editingInbox.color_hex}
                    onChange={(hex) => setEditingInbox({ ...editingInbox, color_hex: hex })}
                    label="لون الصندوق المميز:"
                  />
                </div>
              </div>

              {/* تحديد الخطوط المسندة */}
              <div className="space-y-2 pt-2 border-t border-purple-900/30">
                <label className="text-xs font-bold text-white flex items-center gap-1.5">
                  <PhoneCall className="w-3.5 h-3.5 text-emerald-400" />
                  الخطوط التابعة لهذا الصندوق:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {AVAILABLE_LINES.map((ln) => {
                    const isChecked = editingInbox.assigned_lines.includes(ln);
                    return (
                      <button
                        key={ln}
                        type="button"
                        onClick={() => {
                          const next = isChecked
                            ? editingInbox.assigned_lines.filter(l => l !== ln)
                            : [...editingInbox.assigned_lines, ln];
                          setEditingInbox({ ...editingInbox, assigned_lines: next });
                        }}
                        className={`p-2.5 rounded-xl border text-xs font-semibold text-right transition-all flex items-center justify-between ${
                          isChecked
                            ? 'bg-emerald-500/20 text-emerald-200 border-emerald-500/50 shadow'
                            : 'bg-slate-900/80 text-slate-400 border-slate-800'
                        }`}
                      >
                        <span>{ln}</span>
                        {isChecked && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* أزرار الإجراء */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-purple-900/30">
                <button
                  onClick={() => setEditingInbox(null)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:bg-white/5"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleSaveModal}
                  className="px-6 py-2 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-950/40 flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  حفظ الصندوق
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </AppShell>
  );
}
