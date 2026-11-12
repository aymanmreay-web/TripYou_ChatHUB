'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Loader2, X, Crown, Link2, Copy, RotateCcw, Send, UserPlus, UserMinus, ChevronUp,
  ChevronDown, LogOut, ImageUp, Pencil, AlertTriangle, Users2, RefreshCw,
} from 'lucide-react';
import { toast } from '../../components/common/Toaster';
import { Modal } from '../inbox/Modal';
import { Switch } from '../ui';
import {
  GroupItem, ParticipantRow, manageGroup, actingInstance, fmtDigits,
} from './groupsApi';
import { LineBadges } from './LineBadges';

/**
 * درج تفاصيل المجموعة — كل خواص Evolution v2.3.7:
 * معلومات + صورة، رابط الدعوة (جلب/نسخ/إبطال/إرسال)، خطوطنا العضو،
 * المشاركون (إضافة/ترقية/تنزيل/إزالة)، الإعدادات (إعلانات/قفل)، مغادرة.
 */
interface DrawerProps {
  group: GroupItem | null;
  canManage: boolean;
  onClose: () => void;
  onChanged: () => void;
}

interface ConfirmState {
  title: string;
  body: string;
  run: () => Promise<void>;
}

export function GroupDetailsDrawer({ group, canManage, onClose, onChanged }: DrawerProps) {
  const [participants, setParticipants] = useState<ParticipantRow[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [participantsLive, setParticipantsLive] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  // تعديل المعلومات
  const [editSubject, setEditSubject] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editing, setEditing] = useState(false);

  // الدعوة
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [inviteNumbers, setInviteNumbers] = useState('');
  const [inviteDesc, setInviteDesc] = useState('');

  // المشاركون
  const [addNumbers, setAddNumbers] = useState('');

  const fileRef = useRef<HTMLInputElement | null>(null);

  const inst = group ? actingInstance(group) : null;

  useEffect(() => {
    if (group) {
      setEditSubject(group.subject);
      setEditDescription(group.description || '');
      setEditing(false);
      setInviteUrl(group.invite_url || null);
      setInviteNumbers('');
      setAddNumbers('');
      setConfirmState(null);
      setParticipants([]);
    }
  }, [group?.group_jid]);

  const fetchParticipants = useCallback(async (jid: string) => {
    setLoadingParticipants(true);
    try {
      const res = await fetch(`/api/groups/participants?group_jid=${encodeURIComponent(jid)}`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'فشل جلب المشاركين');
      setParticipants(json.participants || []);
      setParticipantsLive(json.live === true);
    } catch (e: any) {
      toast({ title: e.message, kind: 'error' });
    } finally {
      setLoadingParticipants(false);
    }
  }, []);

  useEffect(() => {
    if (group?.group_jid) fetchParticipants(group.group_jid);
  }, [group?.group_jid, fetchParticipants]);

  if (!group) return null;

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try {
      await fn();
    } catch (e: any) {
      toast({ title: e.message, kind: 'error', durationMs: 8000 });
    } finally {
      setBusy(null);
    }
  };

  const mg = (payload: Record<string, unknown>) =>
    manageGroup({ instance: inst || undefined, group_jid: group.group_jid, staff_id: undefined, ...payload });

  const refreshParticipants = () => group.group_jid && fetchParticipants(group.group_jid);

  const saveInfo = () =>
    run('info', async () => {
      if (editSubject.trim() && editSubject.trim() !== group.subject) {
        await mg({ action: 'subject', subject: editSubject.trim() });
      }
      if (editDescription !== (group.description || '')) {
        await mg({ action: 'description', description: editDescription });
      }
      toast({ title: 'حُفظت المعلومات في المجموعة ✅', kind: 'success' });
      setEditing(false);
      onChanged();
    });

  const onPickPicture = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () =>
      run('picture', async () => {
        await mg({ action: 'picture', image: String(reader.result) });
        toast({ title: 'تُغيّرت صورة المجموعة ✅', kind: 'success' });
        onChanged();
      });
    reader.readAsDataURL(file);
  };

  const toggleSetting = (setting: 'announcement' | 'locked', on: boolean) =>
    run(setting, async () => {
      await mg({ action: 'setting', setting, on });
      toast({ title: on ? 'فُعّل الإعداد في المجموعة' : 'أُوقف الإعداد في المجموعة', kind: 'success' });
      onChanged();
    });

  const getInvite = () =>
    run('invite', async () => {
      const json = await mg({ action: 'invite_code' });
      setInviteUrl(json?.invite_url || null);
      if (json?.invite_url) toast({ title: 'جُلب رابط الدعوة — انسخه الآن', kind: 'success' });
    });

  const revokeInvite = () =>
    setConfirmState({
      title: 'إبطال رابط الدعوة',
      body: 'لن يعمل الرابط القديم بعد الآن — من سيحاول الانضمام به لن يستطيع. هل تريد الإبطال؟',
      run: async () => {
        await mg({ action: 'invite_revoke' });
        setInviteUrl(null);
        toast({ title: 'أُبطل الرابط ✅', kind: 'success' });
        onChanged();
      },
    });

  const sendInvite = () =>
    run('invite_send', async () => {
      const list = inviteNumbers.split(/[\s,;\n]+/).filter(Boolean);
      if (list.length === 0) {
        toast({ title: 'أضف رقماً واحداً على الأقل', kind: 'error' });
        return;
      }
      const json = await mg({ action: 'invite_send', numbers: list, invite_description: inviteDesc.trim() || undefined });
      toast({ title: `أُرسلت الدعوة إلى ${json?.sent ?? list.length} رقم ✅`, kind: 'success' });
      setInviteNumbers('');
    });

  const participantOp = (op: 'add' | 'remove' | 'promote' | 'demote', numbers: string[], label: string) =>
    run(`p-${op}-${numbers.join(',')}`, async () => {
      await mg({ action: 'participants', op, numbers });
      toast({ title: `${label} ✅`, kind: 'success' });
      setAddNumbers('');
      refreshParticipants();
      onChanged();
    });

  const removeConfirm = (p: ParticipantRow) => {
    const digits = fmtDigits(p.phone_number) || p.participant_jid;
    setConfirmState({
      title: 'إزالة مشارك',
      body: `سيُزال ${p.display_name || p.participant_name || digits} من المجموعة. هل تريد المتابعة؟`,
      run: async () => {
        if (!fmtDigits(p.phone_number)) {
          toast({
            title: 'لا يمكن الإزالة التلقائية — رقم غير معروف (معرف @lid)',
            body: 'أزله يدوياً من واتساب ثم نفّذ مزامنة',
            kind: 'error', durationMs: 8000,
          });
          return;
        }
        await participantOp('remove', [fmtDigits(p.phone_number)], 'أُزيل المشارك');
      },
    });
  };

  const leaveGroup = () =>
    setConfirmState({
      title: 'مغادرة المجموعة',
      body: `سينسحب الخط (${inst || '—'}) من المجموعة نهائياً ولن يستلم رسائلها. واتساب لا يسمح بحذف المجموعة عن بُعد — البديل: قفلها (الإعلانات). هل تريد المغادرة؟`,
      run: async () => {
        await mg({ action: 'leave' });
        toast({ title: 'غادرت المجموعة', kind: 'success' });
        onChanged();
        onClose();
      },
    });

  const copyInvite = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast({ title: 'نُسخ رابط الدعوة', kind: 'success' });
    } catch {
      toast({ title: 'تعذر النسخ — انسخه يدوياً', kind: 'error' });
    }
  };

  return (
    <>
      <Modal open={!!group} onClose={onClose} level="drawer" ariaLabel="تفاصيل المجموعة" panelClassName="max-w-2xl rounded-l-3xl">
        {/* رأس الدرج */}
        <div className="p-4 border-b border-[var(--border-subtle)] flex items-center gap-3 sticky top-0 bg-[var(--card-bg)] z-10">
          {group.picture_url || group.avatar_url ? (
            <img src={group.picture_url || group.avatar_url || ''} alt="" className="w-11 h-11 rounded-2xl object-cover border border-[var(--border-subtle)]" />
          ) : (
            <div className="w-11 h-11 rounded-2xl bg-[var(--accent-soft)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-main)]">
              <Users2 className="w-5 h-5" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-black text-[var(--text-main)] truncate">{group.display_name || group.subject}</h3>
            <p className="text-[10px] text-[var(--text-muted)] font-mono truncate" dir="ltr">{group.group_jid}</p>
          </div>
          <button onClick={refreshParticipants} title="تحديث المشاركون" className="p-2 rounded-xl hover:bg-[var(--card-elevated)] text-[var(--text-muted)]">
            <RefreshCw className={`w-4 h-4 ${loadingParticipants ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-[var(--card-elevated)] text-[var(--text-muted)]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-5">
          {/* المعلومات والصورة */}
          <section className="rounded-2xl bg-[var(--card-elevated)] border border-[var(--border-subtle)] p-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-black text-[var(--text-main)]">المعلومات</h4>
              {canManage && !editing && (
                <button onClick={() => setEditing(true)} className="flex items-center gap-1 text-[10px] font-bold text-purple-300">
                  <Pencil className="w-3 h-3" /> تعديل
                </button>
              )}
            </div>
            {editing ? (
              <div className="space-y-2">
                <input
                  value={editSubject}
                  onChange={(e) => setEditSubject(e.target.value)}
                  className="w-full bg-[var(--card-bg)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:border-purple-500"
                  placeholder="اسم المجموعة"
                />
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={2}
                  className="w-full bg-[var(--card-bg)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:border-purple-500 resize-none"
                  placeholder="الوصف"
                />
                <div className="flex items-center gap-2">
                  <button onClick={saveInfo} disabled={busy === 'info'} className="px-3 py-1.5 rounded-xl bg-purple-500 text-white text-[10px] font-bold disabled:opacity-50">
                    {busy === 'info' ? 'جاري الحفظ...' : 'حفظ في واتساب'}
                  </button>
                  <button onClick={() => { setEditing(false); setEditSubject(group.subject); setEditDescription(group.description || ''); }} className="px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] text-[10px] font-bold text-[var(--text-muted)]">
                    إلغاء
                  </button>
                  <button onClick={() => fileRef.current?.click()} disabled={busy === 'picture'} className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] text-[10px] font-bold text-[var(--text-main)] disabled:opacity-50">
                    <ImageUp className="w-3 h-3" /> {busy === 'picture' ? 'جاري الرفع...' : 'تغيير الصورة'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <p className="text-xs text-[var(--text-main)] font-bold">{group.subject}</p>
                {group.description ? <p className="text-[10px] text-[var(--text-muted)] whitespace-pre-wrap">{group.description}</p> : null}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] px-2 py-0.5 rounded-lg bg-[var(--card-bg)] border border-[var(--border-subtle)] text-[var(--text-muted)] font-mono">
                    {group.participant_count} عضو
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-lg border font-bold ${group.announcement ? 'bg-amber-500/15 text-amber-300 border-amber-500/40' : 'bg-[var(--card-bg)] text-[var(--text-muted)] border-[var(--border-subtle)]'}`}>
                    📢 {group.announcement ? 'إعلانات — الأدمن فقط يرسل' : 'الكل يرسل'}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-lg border font-bold ${group.restricted ? 'bg-sky-500/15 text-sky-300 border-sky-500/40' : 'bg-[var(--card-bg)] text-[var(--text-muted)] border-[var(--border-subtle)]'}`}>
                    🔒 {group.restricted ? 'مقفلة — الأدمن فقط يعدل' : 'الكل يعدل المعلومات'}
                  </span>
                </div>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onPickPicture(e.target.files?.[0] || null)} />
          </section>

          {/* رابط الدعوة */}
          <section className="rounded-2xl bg-[var(--card-elevated)] border border-[var(--border-subtle)] p-3">
            <h4 className="text-xs font-black text-[var(--text-main)] flex items-center gap-1.5 mb-2">
              <Link2 className="w-3.5 h-3.5 text-purple-300" /> رابط الدعوة
            </h4>
            {inviteUrl ? (
              <div className="space-y-2">
                <p className="text-[10px] font-mono text-purple-300 break-all" dir="ltr">{inviteUrl}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <button onClick={copyInvite} className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[var(--card-bg)] border border-[var(--border-subtle)] text-[10px] font-bold text-[var(--text-main)]">
                    <Copy className="w-3 h-3" /> نسخ
                  </button>
                  <button onClick={getInvite} disabled={busy === 'invite' || !canManage} className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[var(--card-bg)] border border-[var(--border-subtle)] text-[10px] font-bold text-[var(--text-main)] disabled:opacity-50">
                    <RotateCcw className="w-3 h-3" /> تحديث الرابط
                  </button>
                  {canManage && (
                    <button onClick={revokeInvite} disabled={busy === 'invite_revoke'} className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/40 text-[10px] font-bold text-rose-300 disabled:opacity-50">
                      إبطال الرابط
                    </button>
                  )}
                </div>
                {canManage && (
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      value={inviteNumbers}
                      onChange={(e) => setInviteNumbers(e.target.value)}
                      placeholder="أرقام لإرسال الدعوة لهم (مفصولة بمسافة)"
                      dir="ltr"
                      className="flex-1 bg-[var(--card-bg)] border border-[var(--border-subtle)] rounded-xl px-3 py-1.5 text-[10px] font-mono text-left text-[var(--text-main)] focus:outline-none focus:border-purple-500"
                    />
                    <button onClick={sendInvite} disabled={busy === 'invite_send'} className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-500 text-white text-[10px] font-bold disabled:opacity-50">
                      <Send className="w-3 h-3" /> إرسال
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <p className="text-[10px] text-[var(--text-muted)] flex-1">لم يُجلب رابط الدعوة بعد</p>
                <button onClick={getInvite} disabled={!canManage || busy === 'invite'} className="px-3 py-1.5 rounded-xl bg-[var(--card-bg)] border border-[var(--border-subtle)] text-[10px] font-bold text-[var(--text-main)] disabled:opacity-50">
                  جلب الرابط
                </button>
              </div>
            )}
          </section>

          {/* خطوطنا العضو */}
          <section className="rounded-2xl bg-[var(--card-elevated)] border border-[var(--border-subtle)] p-3">
            <h4 className="text-xs font-black text-[var(--text-main)] mb-2">خطوطنا العضو</h4>
            <LineBadges lines={group.our_lines} />
          </section>

          {/* المشاركون */}
          <section className="rounded-2xl bg-[var(--card-elevated)] border border-[var(--border-subtle)] p-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-black text-[var(--text-main)] flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5 text-amber-400" /> المشاركون ({participants.length})
              </h4>
              {participantsLive && <span className="text-[9px] text-emerald-300 font-bold">حيّ من واتساب</span>}
            </div>
            {loadingParticipants ? (
              <p className="text-center text-[10px] text-[var(--text-muted)] py-3 flex items-center justify-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> جاري الجلب من واتساب...
              </p>
            ) : participants.length === 0 ? (
              <p className="text-center text-[10px] text-[var(--text-muted)] py-3">لا مشاركون مسجلون — نفّذ مزامنة</p>
            ) : (
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {participants.map((p) => (
                  <div key={p.participant_jid} className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-xl bg-[var(--card-bg)] border border-[var(--border-subtle)]">
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold text-[var(--text-main)] flex items-center gap-1.5">
                        {p.is_super_admin ? <Crown className="w-3 h-3 text-rose-400" /> : p.is_admin ? <Crown className="w-3 h-3 text-amber-400" /> : null}
                        <span className="truncate">{p.display_name || p.participant_name || fmtDigits(p.phone_number) || p.participant_jid}</span>
                        {p.is_super_admin && <span className="text-[9px] text-rose-300 font-bold">مالك</span>}
                        {p.is_admin && !p.is_super_admin && <span className="text-[9px] text-amber-300 font-bold">أدمن</span>}
                        {p.is_our_line && <span className="text-[9px] text-purple-300 font-bold">⭐ {p.our_line_title}</span>}
                      </div>
                      <p className="text-[9px] text-[var(--text-muted)] font-mono" dir="ltr">
                        {fmtDigits(p.phone_number) || p.participant_jid}
                      </p>
                    </div>
                    {canManage && fmtDigits(p.phone_number) && (
                      <div className="flex items-center gap-1 shrink-0">
                        {!p.is_super_admin && !p.is_admin && (
                          <button title="ترقية لأدمن" onClick={() => participantOp('promote', [fmtDigits(p.phone_number)], 'رُقّي المشارك أدمن')} disabled={!!busy} className="p-1.5 rounded-lg hover:bg-amber-500/15 text-amber-300 disabled:opacity-50">
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {p.is_admin && !p.is_super_admin && (
                          <button title="تنزيل عن الأدمن" onClick={() => participantOp('demote', [fmtDigits(p.phone_number)], 'نُزل المشارك عن الأدمن')} disabled={!!busy} className="p-1.5 rounded-lg hover:bg-[var(--card-bg)] text-[var(--text-muted)] disabled:opacity-50">
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button title="إزالة" onClick={() => removeConfirm(p)} disabled={!!busy} className="p-1.5 rounded-lg hover:bg-rose-500/15 text-rose-300 disabled:opacity-50">
                          <UserMinus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {canManage && (
              <div className="flex items-center gap-2 mt-2">
                <input
                  value={addNumbers}
                  onChange={(e) => setAddNumbers(e.target.value)}
                  placeholder="أرقام لإضافة مشاركين (مفصولة بمسافة)"
                  dir="ltr"
                  className="flex-1 bg-[var(--card-bg)] border border-[var(--border-subtle)] rounded-xl px-3 py-1.5 text-[10px] font-mono text-left text-[var(--text-main)] focus:outline-none focus:border-purple-500"
                />
                <button
                  onClick={() => {
                    const list = addNumbers.split(/[\s,;\n]+/).filter(Boolean);
                    if (list.length === 0) { toast({ title: 'أضف رقماً واحداً على الأقل', kind: 'error' }); return; }
                    participantOp('add', list, `أُضيف ${list.length} مشارك`);
                  }}
                  disabled={!!busy}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-500 text-white text-[10px] font-bold disabled:opacity-50"
                >
                  <UserPlus className="w-3 h-3" /> إضافة
                </button>
              </div>
            )}
          </section>

          {/* الإعدادات */}
          <section className="rounded-2xl bg-[var(--card-elevated)] border border-[var(--border-subtle)] p-3 space-y-2.5">
            <h4 className="text-xs font-black text-[var(--text-main)]">إعدادات المجموعة</h4>
            <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-[var(--card-bg)] border border-[var(--border-subtle)]">
              <div>
                <div className="text-xs font-bold text-[var(--text-main)]">📢 وضع الإعلانات</div>
                <div className="text-[10px] text-[var(--text-muted)]">الأدمن فقط يمكنه إرسال الرسائل</div>
              </div>
              <Switch checked={group.announcement} onChange={(v: boolean) => canManage && toggleSetting('announcement', v)} disabled={!canManage || busy === 'announcement'} ariaLabel="وضع الإعلانات" />
            </div>
            <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-[var(--card-bg)] border border-[var(--border-subtle)]">
              <div>
                <div className="text-xs font-bold text-[var(--text-main)]">🔒 قفل معلومات المجموعة</div>
                <div className="text-[10px] text-[var(--text-muted)]">الأدمن فقط يمكنه تعديل الاسم والوصف والصورة</div>
              </div>
              <Switch checked={group.restricted} onChange={(v: boolean) => canManage && toggleSetting('locked', v)} disabled={!canManage || busy === 'locked'} ariaLabel="قفل المعلومات" />
            </div>
          </section>

          {/* أخطار */}
          {canManage && inst && (
            <section className="rounded-2xl bg-rose-500/5 border border-rose-500/30 p-3">
              <h4 className="text-xs font-black text-rose-300 flex items-center gap-1.5 mb-2">
                <AlertTriangle className="w-3.5 h-3.5" /> منطقة خطر
              </h4>
              <button onClick={leaveGroup} disabled={busy === 'leave'} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-bold hover:bg-rose-500/25 disabled:opacity-50 transition-all">
                <LogOut className="w-3.5 h-3.5" /> مغادرة المجموعة من خط {inst}
              </button>
            </section>
          )}
        </div>
      </Modal>

      {/* تأكيد الإجراءات الحساسة */}
      <Modal
        open={!!confirmState}
        onClose={() => setConfirmState(null)}
        ariaLabel="تأكيد"
        panelClassName="max-w-sm rounded-3xl p-5"
      >
        <h3 className="text-sm font-black text-[var(--text-main)] mb-1.5">{confirmState?.title}</h3>
        <p className="text-xs text-[var(--text-muted)] leading-relaxed">{confirmState?.body}</p>
        <div className="flex items-center justify-end gap-2 mt-4">
          <button onClick={() => setConfirmState(null)} className="px-4 py-2 rounded-xl border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-muted)]">
            إلغاء
          </button>
          <button
            onClick={async () => {
              const c = confirmState;
              setConfirmState(null);
              if (c) await run('confirm', c.run);
            }}
            className="px-4 py-2 rounded-xl bg-rose-500 text-white text-xs font-bold hover:bg-rose-400 transition-all"
          >
            تأكيد
          </button>
        </div>
      </Modal>
    </>
  );
}
