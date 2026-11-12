'use client';

import React, { useMemo, useState } from 'react';
import { Loader2, Users2 } from 'lucide-react';
import { toast } from '../../components/common/Toaster';
import { Modal } from '../inbox/Modal';
import { Switch } from '../ui';
import { LineRow, manageGroup } from './groupsApi';

/**
 * إنشاء مجموعة واتساب من خط متصل — Evolution v2.3.7:
 * subject + participants + description + promoteParticipants (ترقية المضافين أدمن).
 * واتساب يضيف منشئ المجموعة (الخط) تلقائياً.
 */
export function CreateGroupModal({
  open,
  lines,
  onClose,
  onCreated,
}: {
  open: boolean;
  lines: LineRow[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const connected = useMemo(() => lines.filter((l) => l.status === 'connected'), [lines]);
  const [instance, setInstance] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [numbers, setNumbers] = useState('');
  const [promote, setPromote] = useState(false);
  const [saving, setSaving] = useState(false);

  const effectiveInstance = instance || connected[0]?.instance_name || '';

  const submit = async () => {
    if (!subject.trim()) {
      toast({ title: 'اسم المجموعة مطلوب', kind: 'error' });
      return;
    }
    if (numbers.trim().length === 0) {
      toast({ title: 'أضف رقم مشارك واحد على الأقل', kind: 'error' });
      return;
    }
    setSaving(true);
    try {
      const json = await manageGroup({
        action: 'create',
        instance: effectiveInstance,
        subject: subject.trim(),
        description: description.trim() || undefined,
        promote,
        numbers: numbers.split(/[\s,;\n]+/).filter(Boolean),
      });
      toast({ title: 'أُنشئت المجموعة ✅', body: subject.trim(), kind: 'success' });
      setSubject('');
      setDescription('');
      setNumbers('');
      setPromote(false);
      onCreated();
      onClose();
      if (!json?.group_jid) {
        toast({ title: 'تنبيه: لم تُرجع Evolution معرف المجموعة — ستظهر بعد المزامنة', kind: 'info' });
      }
    } catch (e: any) {
      toast({ title: e.message, kind: 'error', durationMs: 8000 });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={saving ? () => {} : onClose} ariaLabel="إنشاء مجموعة" panelClassName="max-w-lg rounded-3xl p-5 gap-0">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2.5 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-purple-300">
          <Users2 className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-black text-[var(--text-main)]">إنشاء مجموعة جديدة</h3>
          <p className="text-[10px] text-[var(--text-muted)]">من خط متصل — سيصبح الخط مالك المجموعة</p>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-[10px] font-bold text-[var(--text-muted)] mb-1 block">الخط المنشئ (متصل)</label>
          <select
            value={effectiveInstance}
            onChange={(e) => setInstance(e.target.value)}
            className="w-full bg-[var(--card-elevated)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:border-purple-500"
          >
            {connected.length === 0 && <option value="">لا خطوط متصلة حالياً</option>}
            {connected.map((l) => (
              <option key={l.id} value={l.instance_name}>
                {l.title_ar || l.instance_name} — {l.phone_e164 || ''}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold text-[var(--text-muted)] mb-1 block">اسم المجموعة *</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="مثال: مجموعة رحلات الصيف"
            className="w-full bg-[var(--card-elevated)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:border-purple-500"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-[var(--text-muted)] mb-1 block">الوصف</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="وصف يظهر لأعضاء المجموعة (اختياري)"
            className="w-full bg-[var(--card-elevated)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:border-purple-500 resize-none"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-[var(--text-muted)] mb-1 block">
            أرقام المشاركين * (أرقام دولية مفصولة بمسافة أو سطر)
          </label>
          <textarea
            value={numbers}
            onChange={(e) => setNumbers(e.target.value)}
            rows={3}
            placeholder={'9665xxxxxxxx\n9665yyyyyyyy\n20zzzzzzzzzz'}
            dir="ltr"
            className="w-full bg-[var(--card-elevated)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:border-purple-500 resize-none font-mono text-left"
          />
        </div>
        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-[var(--card-elevated)] border border-[var(--border-subtle)]">
          <div>
            <div className="text-xs font-bold text-[var(--text-main)]">ترقية المضافين أدمن</div>
            <div className="text-[10px] text-[var(--text-muted)]">سيحصل كل من يُضاف الآن على صلاحية الأدمن</div>
          </div>
          <Switch checked={promote} onChange={setPromote} ariaLabel="ترقية المضافين أدمن" />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 mt-5">
        <button
          onClick={onClose}
          disabled={saving}
          className="px-4 py-2 rounded-xl border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all"
        >
          إلغاء
        </button>
        <button
          onClick={submit}
          disabled={saving || connected.length === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500 text-white text-xs font-bold hover:bg-purple-400 disabled:opacity-50 transition-all"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Users2 className="w-3.5 h-3.5" />}
          إنشاء المجموعة
        </button>
      </div>
    </Modal>
  );
}
