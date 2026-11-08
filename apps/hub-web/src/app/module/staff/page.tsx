'use client';

import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  Plus,
  Edit2,
  Shield,
  PhoneCall,
  Inbox,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Lock,
  Unlock,
  AlertTriangle,
  RefreshCw,
  Save,
  X,
  Mail,
  UserPlus,
  ShieldCheck,
  Sliders,
  Check
} from 'lucide-react';
import { AppShell } from '../../../components/layout/AppShell';
import { fetchStaffAll, fetchRoles, fetchLines, fetchInboxes, saveStaffMember, setStaffStatus, StaffRow, RoleRow, LineOption, InboxRow } from '../../../lib/hubDb';

type StaffMember = StaffRow;

export default function StaffManagementPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [lines, setLines] = useState<LineOption[]>([]);
  const [inboxes, setInboxes] = useState<InboxRow[]>([]);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [isNewModal, setIsNewModal] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const reload = async () => {
    try {
      const [st, rl, ln, ib] = await Promise.all([fetchStaffAll(), fetchRoles(), fetchLines(), fetchInboxes()]);
      setStaff(st);
      setRoles(rl);
      setLines(ln);
      setInboxes(ib);
    } catch (e: any) {
      setSaveError(`تعذّر تحميل البيانات: ${e.message}`);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  const showNotification = (msg: string) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(null), 3500);
  };

  const handleApproveStaff = (st: StaffMember) => {
    setEditingStaff({ ...st, status: 'active' });
    setIsNewModal(false);
  };

  const handleToggleSuspend = async (id: string) => {
    const cur = staff.find((s) => s.id === id);
    if (!cur) return;
    setSaveError(null);
    try {
      await setStaffStatus(id, cur.status === 'active' ? 'suspended' : 'active');
      await reload();
      showNotification('تم تحديث حالة الموظف');
    } catch (e: any) {
      setSaveError(`تعذّر التحديث: ${e.message}`);
    }
  };

  const handleSaveStaffModal = async () => {
    if (!editingStaff) return;
    setSaving(true);
    setSaveError(null);
    try {
      await saveStaffMember(editingStaff, isNewModal);
      await reload();
      const name = editingStaff.name;
      setEditingStaff(null);
      setIsNewModal(false);
      showNotification(`تم حفظ "${name}"`);
    } catch (e: any) {
      setSaveError(`تعذّر الحفظ: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const pendingApprovals = staff.filter((s) => s.status === 'pending');
  const activeAndSuspended = staff.filter((s) => s.status !== 'pending');

  const filteredStaff = activeAndSuspended.filter((s) => {
    const matchSearch =
      s.name.includes(search) ||
      s.email.toLowerCase().includes(search.toLowerCase()) ||
      s.phone.includes(search);
    const matchRole = filterRole === 'all' || s.role === filterRole;
    const matchStatus = filterStatus === 'all' || s.status === filterStatus;
    return matchSearch && matchRole && matchStatus;
  });

  return (
    <AppShell>
      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border-subtle)]">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-main)] flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg">
                <UserCheck className="w-5 h-5" />
              </div>
              إدارة فريق العمل، الخطوط، والصلاحيات
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
              ترخيص الموظفين الجدد عبر Google، ربط الأرقام والصناديق، والتحكم بصلاحية قفل المحادثات
            </p>
          </div>

          <div className="flex items-center gap-3">
            {saveError && (
              <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-bold max-w-md">
                {saveError}
              </div>
            )}
            {actionSuccess && (
              <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold animate-in fade-in">
                <CheckCircle2 className="w-4 h-4" />
                {actionSuccess}
              </div>
            )}

            <button
              onClick={() => {
                setEditingStaff({
                  id: '',
                  name: '',
                  email: '',
                  phone: '',
                  role: 'support_agent',
                  role_title_ar: '',
                  status: 'active',
                  line_ids: [],
                  inbox_ids: [],
                  can_lock_conversations: false,
                  permissions_count: 0,
                });
                setIsNewModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-purple-950/40 transition-all"
            >
              <UserPlus className="w-4 h-4" />
              إضافة موظف جديد يدوياً
            </button>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════
            1. قسم خاص: طلبات الانضمام بانتظار ترخيص المدير
           ═════════════════════════════════════════════════════════ */}
        {pendingApprovals.length > 0 && (
          <div className="p-5 rounded-3xl bg-gradient-to-br from-[#1b1035] via-[#140b28] to-[#0e071e] border-2 border-amber-500/40 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-amber-400 animate-ping" />
                <h3 className="font-extrabold text-sm sm:text-base text-amber-200">
                  طلبات موظفين جدد بانتظار ترخيص المشرف ({pendingApprovals.length})
                </h3>
              </div>
              <span className="text-[11px] text-amber-300/80 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/30">
                سجلوا عبر Google ولم يُمنحوا ترخيصاً بعد
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingApprovals.map((st) => (
                <div
                  key={st.id}
                  className="p-4 rounded-2xl bg-slate-900/90 border border-amber-500/30 space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[var(--text-main)] text-sm">{st.name}</span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        معلق
                      </span>
                    </div>
                    <div className="text-xs text-purple-300 font-mono flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {st.email}
                    </div>
                    <div className="text-[11px] text-slate-400">{st.phone}</div>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500">يحتاج تعيين الخطوط والدور</span>
                    <button
                      onClick={() => handleApproveStaff(st)}
                      className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      ترخيص وتعيين الصلاحيات
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════
            2. أدوات البحث والفلترة
           ═════════════════════════════════════════════════════════ */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--card-elevated)] p-4 rounded-2xl border border-[var(--border-subtle)]">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
            <input
              type="text"
              placeholder="بحث بالاسم، البريد الإلكتروني، أو رقم الهاتف..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-900/80 border border-slate-700 rounded-xl pr-10 pl-3 py-2 text-xs text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none"
            >
              <option value="all">كافة الأدوار</option>
              {roles.map((r) => (
                <option key={r.key} value={r.key}>{r.title_ar}</option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none"
            >
              <option value="all">كافة الحالات</option>
              <option value="active">نشط ومفعل</option>
              <option value="suspended">موقوف مؤقتاً</option>
            </select>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════
            3. جدول الموظفين الموسع والدقيق
           ═════════════════════════════════════════════════════════ */}
        <div className="overflow-x-auto rounded-3xl border border-[var(--border-subtle)] bg-[var(--card-elevated)] shadow-xl">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] bg-slate-900/80 text-slate-400">
                <th className="p-4 font-bold">الموظف والبيانات</th>
                <th className="p-4 font-bold">الدور والقسم</th>
                <th className="p-4 font-bold">الخطوط المسموحة (Line Access)</th>
                <th className="p-4 font-bold">الصناديق المسندة</th>
                <th className="p-4 font-bold text-center">صلاحية قفل المحادثات</th>
                <th className="p-4 font-bold text-center">الحالة</th>
                <th className="p-4 font-bold text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {filteredStaff.map((st) => (
                <tr key={st.id} className="hover:bg-purple-900/10 transition-colors">
                  
                  {/* الموظف والبيانات */}
                  <td className="p-4">
                    <div className="font-extrabold text-sm text-[var(--text-main)]">{st.name}</div>
                    <div className="text-[11px] text-purple-300 font-mono mt-0.5">{st.email}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{st.phone}</div>
                  </td>

                  {/* الدور والقسم */}
                  <td className="p-4">
                    <span className="inline-block px-2.5 py-1 rounded-xl text-xs font-bold bg-purple-500/10 text-purple-300 border border-purple-500/30">
                      {st.role_title_ar}
                    </span>
                  </td>

                  {/* الخطوط المسموحة */}
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1.5 max-w-xs">
                      {st.line_ids.map((lid, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold flex items-center gap-1"
                        >
                          <PhoneCall className="w-2.5 h-2.5" />
                          {lines.find((l) => l.id === lid)?.name || '—'}
                        </span>
                      ))}
                    </div>
                  </td>

                  {/* الصناديق */}
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1.5 max-w-xs">
                      {st.inbox_ids.map((iid, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-300 border border-blue-500/30 text-[10px] font-semibold flex items-center gap-1"
                        >
                          <Inbox className="w-2.5 h-2.5" />
                          {inboxes.find((i) => i.id === iid)?.name_ar || '—'}
                        </span>
                      ))}
                    </div>
                  </td>

                  {/* صلاحية قفل المحادثات */}
                  <td className="p-4 text-center">
                    {st.can_lock_conversations ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                        <Lock className="w-3 h-3" />
                        يملك صلاحية القفل
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-800 text-slate-400 border border-slate-700 text-[10px]">
                        <Unlock className="w-3 h-3" />
                        غير مسموح
                      </span>
                    )}
                  </td>

                  {/* الحالة */}
                  <td className="p-4 text-center">
                    {st.status === 'active' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        نشط
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-500/15 text-rose-300 border border-rose-500/30 text-xs font-bold">
                        <XCircle className="w-3.5 h-3.5" />
                        موقوف
                      </span>
                    )}
                  </td>

                  {/* الإجراءات */}
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => {
                          setEditingStaff(st);
                          setIsNewModal(false);
                        }}
                        className="p-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white transition-all border border-purple-500/30"
                        title="تعديل الموظف والصلاحيات"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleToggleSuspend(st.id)}
                        className={`p-1.5 rounded-xl transition-all border ${
                          st.status === 'active'
                            ? 'bg-rose-500/10 hover:bg-rose-600 text-rose-300 hover:text-white border-rose-500/30'
                            : 'bg-emerald-500/10 hover:bg-emerald-600 text-emerald-300 hover:text-white border-emerald-500/30'
                        }`}
                        title={st.status === 'active' ? 'تجميد الحساب مؤقتاً' : 'إعادة تفعيل الحساب'}
                      >
                        {st.status === 'active' ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ═════════════════════════════════════════════════════════
            Modal الترخيص وتعيين الصلاحيات المتقدمة
           ═════════════════════════════════════════════════════════ */}
        {editingStaff && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[var(--card-bg)] border border-purple-500/50 rounded-3xl max-w-xl w-full p-6 space-y-5 text-right shadow-2xl max-h-[90vh] overflow-y-auto">
              
              <div className="flex items-center justify-between border-b border-purple-900/40 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-purple-400" />
                  <h3 className="font-extrabold text-base text-[var(--text-main)]">
                    {isNewModal ? 'إضافة وترخيص موظف جديد' : `تعديل صلاحيات وترخيص: ${editingStaff.name}`}
                  </h3>
                </div>
                <button
                  onClick={() => setEditingStaff(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-[var(--text-main)]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* البيانات الأساسية */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">الاسم الكامل:</label>
                  <input
                    type="text"
                    value={editingStaff.name}
                    onChange={(e) => setEditingStaff({ ...editingStaff, name: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">البريد الإلكتروني (Google):</label>
                  <input
                    type="email"
                    value={editingStaff.email}
                    onChange={(e) => setEditingStaff({ ...editingStaff, email: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* اختيار الدور والقسم */}
              <div className="grid grid-cols-1 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">الدور الوظيفي في النظام:</label>
                  <select
                    value={editingStaff.role}
                    onChange={(e) => {
                      const r = roles.find(role => role.key === e.target.value);
                      setEditingStaff({
                        ...editingStaff,
                        role: e.target.value,
                        role_title_ar: r ? r.title_ar : editingStaff.role_title_ar
                      });
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-none"
                  >
                    {roles.map((r) => (
                      <option key={r.key} value={r.key}>{r.title_ar}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* تعيين الخطوط المسموحة (Line Access) */}
              <div className="space-y-2 pt-2 border-t border-purple-900/30">
                <label className="text-xs font-bold text-[var(--text-main)] flex items-center gap-1.5">
                  <PhoneCall className="w-3.5 h-3.5 text-emerald-400" />
                  الخطوط المسموح للموظف القراءة والإرسال منها:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {lines.map((ln) => {
                    const isAssigned = editingStaff.line_ids.includes(ln.id);
                    return (
                      <button
                        key={ln.id}
                        type="button"
                        onClick={() => {
                          const nextLines = isAssigned
                            ? editingStaff.line_ids.filter(l => l !== ln.id)
                            : [...editingStaff.line_ids, ln.id];
                          setEditingStaff({ ...editingStaff, line_ids: nextLines });
                        }}
                        className={`p-2.5 rounded-xl border text-xs font-semibold text-right transition-all flex items-center justify-between ${
                          isAssigned
                            ? 'bg-emerald-500/20 text-emerald-200 border-emerald-500/50 shadow'
                            : 'bg-slate-900/80 text-slate-400 border-slate-800'
                        }`}
                      >
                        <span>{ln.name}</span>
                        {isAssigned && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* تعيين الصناديق المسموحة (Inbox Access) */}
              <div className="space-y-2 pt-2 border-t border-purple-900/30">
                <label className="text-xs font-bold text-[var(--text-main)] flex items-center gap-1.5">
                  <Inbox className="w-3.5 h-3.5 text-blue-400" />
                  الصناديق المسندة للموظف:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {inboxes.map((ibx) => {
                    const isAssigned = editingStaff.inbox_ids.includes(ibx.id);
                    return (
                      <button
                        key={ibx.id}
                        type="button"
                        onClick={() => {
                          const nextInboxes = isAssigned
                            ? editingStaff.inbox_ids.filter(i => i !== ibx.id)
                            : [...editingStaff.inbox_ids, ibx.id];
                          setEditingStaff({ ...editingStaff, inbox_ids: nextInboxes });
                        }}
                        className={`p-2.5 rounded-xl border text-xs font-semibold text-right transition-all flex items-center justify-between ${
                          isAssigned
                            ? 'bg-blue-500/20 text-blue-200 border-blue-500/50 shadow'
                            : 'bg-slate-900/80 text-slate-400 border-slate-800'
                        }`}
                      >
                        <span>{ibx.name_ar}</span>
                        {isAssigned && <Check className="w-3.5 h-3.5 text-blue-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ميزة قفل المحادثات (Conversation Lock Permission) */}
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-amber-200 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    صلاحية قفل المحادثات التابعة لخطه (Lock Conversation)
                  </span>
                  <p className="text-[11px] text-amber-300/70">
                    تمكين الموظف من قفل المحادثة على خطه المسموح لمنع أي موظف آخر من التداخل أو الرد عليها
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setEditingStaff({
                      ...editingStaff,
                      can_lock_conversations: !editingStaff.can_lock_conversations
                    });
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                    editingStaff.can_lock_conversations
                      ? 'bg-amber-500 text-slate-950 border-amber-400'
                      : 'bg-slate-900 text-slate-400 border-slate-700'
                  }`}
                >
                  {editingStaff.can_lock_conversations ? 'مفعّلة ومسموحة' : 'معطلة'}
                </button>
              </div>

              {/* أزرار الإجراء */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-purple-900/30">
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:bg-white/5"
                >
                  إلغاء
                </button>

                <button
                  type="button"
                  onClick={handleSaveStaffModal}
                  className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-purple-950/40 flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>اعتماد الترخيص وحفظ الصلاحيات</span>
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </AppShell>
  );
}
