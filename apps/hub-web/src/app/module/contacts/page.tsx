'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Users,
  User,
  Building2,
  Search,
  Plus,
  Download,
  Upload,
  Phone,
  Mail,
  MapPin,
  Star,
  Edit2,
  Trash2,
  RefreshCw,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Smartphone,
  Cpu,
  Layers,
  X,
  MessageSquare,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  GitMerge,
  AlertTriangle,
  Lock,
  Radio,
  Globe2,
  Tag,
  Check,
  Tags,
  Copy,
  CheckSquare,
  Square,
  ListPlus,
} from 'lucide-react';
import { AppShell } from '../../../components/layout/AppShell';
import { ContactsStats } from '../../../components/contacts/ContactsStats';
import { useApp } from '../../../context/AppContext';
import { ImportModal } from '../../../components/contacts/ImportModal';
import { MergePreviewModal } from '../../../components/contacts/MergePreviewModal';

/* ═══════════════════════════════════════════════════════════
   مكوّن محرر وسوم جهة الاتصال — قابل للاستدعاء من البطاقة
   ═══════════════════════════════════════════════════════════ */
interface TagPickerProps {
  contactId: string;
  allTags: { id: string; key: string; name_ar: string; color: string }[];
  onTagsChanged?: (newTags: { id: string; name_ar: string; color: string }[]) => void;
}

function ContactTagPicker({ contactId, allTags, onTagsChanged }: TagPickerProps) {
  const [open, setOpen] = useState(false);
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  // جلب وسوم جهة الاتصال عند الفتح
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch(`/api/contacts/${contactId}/tags`)
      .then((r) => r.json())
      .then((d) => {
        const ids = (d.tags || []).map((t: any) => t.id);
        setActiveTags(ids);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, contactId]);

  // إغلاق عند النقر خارج
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const toggle = async (tagId: string) => {
    const has = activeTags.includes(tagId);
    const next = has ? activeTags.filter((x) => x !== tagId) : [...activeTags, tagId];
    setActiveTags(next);
    try {
      const res = await fetch(`/api/contacts/${contactId}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag_id: tagId, action: has ? 'remove' : 'add' }),
      });
      if (res.ok) {
        const d = await res.json();
        if (onTagsChanged) onTagsChanged(d.tags || []);
      }
    } catch {}
  };

  const activeCount = activeTags.length;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
          activeCount > 0
            ? 'bg-purple-600/20 text-purple-300 border-purple-500/40'
            : 'bg-[var(--card-elevated)] text-[var(--text-muted)] border-[var(--border-subtle)] hover:text-purple-300'
        }`}
        title="وسوم جهة الاتصال"
      >
        <Tags className="w-3.5 h-3.5" />
        <span>{activeCount > 0 ? `وسوم (${activeCount})` : 'وسم'}</span>
      </button>

      {open && (
        <div
          className="absolute z-50 bottom-full mb-2 right-0 w-56 bg-[var(--card-bg)] border border-purple-500/30 rounded-2xl shadow-2xl p-2"
          dir="rtl"
        >
          <div className="px-2 py-1.5 text-[10px] font-bold text-[var(--text-muted)] border-b border-[var(--border-subtle)] mb-1">
            وسوم جهة الاتصال
          </div>
          {loading ? (
            <div className="p-3 text-center text-xs text-slate-400">
              <RefreshCw className="w-3.5 h-3.5 animate-spin mx-auto" />
            </div>
          ) : allTags.filter(t => t).length === 0 ? (
            <div className="p-3 text-center text-xs text-slate-400">
              لا وسوم متاحة — أضفها من صفحة الوسوم
            </div>
          ) : (
            allTags.map((t) => {
              const on = activeTags.includes(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggle(t.id)}
                  className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-semibold transition-colors ${
                    on
                      ? 'bg-purple-600/20 text-purple-200'
                      : 'text-[var(--text-muted)] hover:bg-[var(--card-elevated)] hover:text-[var(--text-main)]'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: t.color || '#8b5cf6' }}
                  />
                  <span className="flex-1 text-right">{t.name_ar}</span>
                  {on && <Check className="w-3.5 h-3.5 text-purple-400" />}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

interface Contact {
  id: string;
  display_name: string;
  company?: string;
  entity_type: 'individual' | 'organization' | 'group';
  commercial_role: 'b2c' | 'b2b' | 'vendor' | 'partner' | 'staff';
  source: 'evolution' | 'excel_import' | 'contacts_file' | 'system' | 'manual';
  source_detail?: string;
  primary_phone?: string;
  primary_phone_e164?: string;
  wa_jid?: string;
  email?: string;
  country_code?: string;
  city?: string;
  district?: string;
  facility_name?: string;
  avatar_url?: string;
  is_favorite?: boolean;
  notes?: string;
  tags?: string[];
  created_at: string;
  last_activity_at?: string;
}

// خريطة مفاتيح الاتصال الدولية
const COUNTRY_DIAL_CODES: Record<string, string> = {
  SA: '+966',
  SY: '+963',
  EG: '+20',
  AE: '+971',
  KW: '+965',
  QA: '+974',
  OM: '+968',
  BH: '+973',
  JO: '+962',
  IQ: '+964',
  YE: '+967',
  TR: '+90',
  US: '+1',
  GB: '+44',
  SD: '+249',
  MA: '+212',
  INTL: '+',
  XX: '+',
};

// كشف كود الدولة الذكي من بادئة الرقم
function detectCountryCodeFromPhone(phone: string, fallback = 'SA'): string {
  if (!phone) return fallback;
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('966') || (phone.startsWith('05') && digits.length === 10) || (phone.startsWith('5') && digits.length === 9)) return 'SA';
  if (digits.startsWith('963')) return 'SY';
  if (digits.startsWith('20')) return 'EG';
  if (digits.startsWith('971')) return 'AE';
  if (digits.startsWith('965')) return 'KW';
  if (digits.startsWith('974')) return 'QA';
  if (digits.startsWith('968')) return 'OM';
  if (digits.startsWith('973')) return 'BH';
  if (digits.startsWith('962')) return 'JO';
  if (digits.startsWith('964')) return 'IQ';
  if (digits.startsWith('967')) return 'YE';
  if (digits.startsWith('90')) return 'TR';
  if (digits.startsWith('1')) return 'US';
  if (digits.startsWith('44')) return 'GB';
  if (digits.startsWith('249')) return 'SD';
  if (digits.startsWith('212')) return 'MA';
  return fallback;
}

// تنسيق رقم الهاتف مقطعاً من اليسار لليمين بأجزاء مقروءة
function formatPhoneNumberParts(phone?: string | null): string {
  if (!phone) return '';
  const clean = phone.trim();
  if (clean.includes('@')) return clean;

  const saMatch = clean.match(/^\+?966(\d{2})(\d{3})(\d{4})$/);
  if (saMatch) return `+966 ${saMatch[1]} ${saMatch[2]} ${saMatch[3]}`;

  const syMatch = clean.match(/^\+?963(\d{2})(\d{3})(\d{4})$/);
  if (syMatch) return `+963 ${syMatch[1]} ${syMatch[2]} ${syMatch[3]}`;

  const egMatch = clean.match(/^\+?20(\d{2})(\d{4})(\d{4})$/);
  if (egMatch) return `+20 ${egMatch[1]} ${egMatch[2]} ${egMatch[3]}`;

  const aeMatch = clean.match(/^\+?971(\d{2})(\d{3})(\d{4})$/);
  if (aeMatch) return `+971 ${aeMatch[1]} ${aeMatch[2]} ${aeMatch[3]}`;

  const kwMatch = clean.match(/^\+?965(\d{4})(\d{4})$/);
  if (kwMatch) return `+965 ${kwMatch[1]} ${kwMatch[2]}`;

  const intlMatch = clean.match(/^(\+\d{1,3})(\d{3})(\d{3})(\d{3,4})$/);
  if (intlMatch) return `${intlMatch[1]} ${intlMatch[2]} ${intlMatch[3]} ${intlMatch[4]}`;

  return clean;
}

// دالة تنسيق معرف المجموعة القديم: 966548469204-1574527263@g.us -> +966 54 846 9204  --  1574527263@g.us
function formatJidDisplay(jid?: string | null): string {
  if (!jid) return '';
  const m = jid.match(/^(\d{8,15})-(\d+@g\.us)$/);
  if (m) {
    const raw = m[1];
    let phonePart = '+' + raw;
    if (raw.startsWith('966') && raw.length === 12) {
      phonePart = `+${raw.slice(0, 3)} ${raw.slice(3, 5)} ${raw.slice(5, 8)} ${raw.slice(8)}`;
    } else if (raw.startsWith('20') && raw.length === 12) {
      phonePart = `+${raw.slice(0, 2)} ${raw.slice(2, 4)} ${raw.slice(4, 8)} ${raw.slice(8)}`;
    } else if (raw.length >= 10) {
      phonePart = `+${raw.slice(0, 3)} ${raw.slice(3, 6)} ${raw.slice(6)}`;
    }
    return `${phonePart}  --  ${m[2]}`;
  }
  return jid;
}

/* ═══════════════════════════════════════════════════════════
   مكوّن الوسم الجماعي
   ═══════════════════════════════════════════════════════════ */
interface BulkTagModalProps {
  selectedCount: number;
  selectedIds: string[];
  availableTags: { id: string; key: string; name_ar: string; color: string }[];
  onClose: () => void;
  onDone: (message: string) => void;
}

function BulkTagModal({ selectedCount, selectedIds, availableTags, onClose, onDone }: BulkTagModalProps) {
  const [selectedTagId, setSelectedTagId] = useState('');
  const [tagAction, setTagAction] = useState<'add' | 'remove'>('add');
  const [loading, setLoading] = useState(false);

  const handleApply = async () => {
    if (!selectedTagId) {
      alert('يرجى اختيار وسم أولاً');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/contacts/bulk-tag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact_ids: selectedIds,
          tag_id: selectedTagId,
          action: tagAction,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onDone(data.message);
      } else {
        alert(data.error || 'حدث خطأ أثناء تعيين الوسوم');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div dir="rtl" className="bg-[var(--card-bg)] border border-purple-500/40 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 text-right">
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
          <div>
            <h3 className="font-bold text-base text-[var(--text-main)]">🏷️ تعيين وسم جماعي</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              ستُطبق العملية على{' '}
              <bdi className="font-mono font-bold text-indigo-300">{selectedCount}</bdi>{' '}
              جهة اتصال محددة
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* اختيار العملية */}
          <div>
            <label className="block text-xs text-slate-300 font-medium mb-2">العملية</label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setTagAction('add')}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  tagAction === 'add'
                    ? 'bg-purple-600/30 text-purple-200 border-purple-500/50'
                    : 'bg-[var(--card-elevated)] text-slate-400 border-[var(--border-subtle)]'
                }`}
              >
                ➕ إضافة وسم
              </button>
              <button
                onClick={() => setTagAction('remove')}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  tagAction === 'remove'
                    ? 'bg-rose-600/30 text-rose-200 border-rose-500/50'
                    : 'bg-[var(--card-elevated)] text-slate-400 border-[var(--border-subtle)]'
                }`}
              >
                ➖ إزالة وسم
              </button>
            </div>
          </div>

          {/* اختيار الوسم */}
          <div>
            <label className="block text-xs text-slate-300 font-medium mb-2">اختر الوسم</label>
            {availableTags.length === 0 ? (
              <p className="text-xs text-slate-500 p-3 bg-[var(--card-elevated)] rounded-xl">
                لا توجد وسوم متاحة. أنشئها أولاً من صفحة إدارة الوسوم.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {availableTags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => setSelectedTagId(tag.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border text-right transition-all ${
                      selectedTagId === tag.id
                        ? 'border-purple-500/60 bg-purple-600/20 text-purple-200'
                        : 'border-[var(--border-subtle)] bg-[var(--card-elevated)] text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ background: tag.color || '#8b5cf6' }}
                    />
                    <span className="truncate">{tag.name_ar}</span>
                    {selectedTagId === tag.id && <Check className="w-3 h-3 text-purple-400 shrink-0 mr-auto" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-subtle)]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-semibold transition-all"
          >
            إلغاء
          </button>
          <button
            onClick={handleApply}
            disabled={loading || !selectedTagId}
            className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-lg disabled:opacity-50 flex items-center gap-1.5"
          >
            {loading ? (
              <><RefreshCw className="w-3.5 h-3.5 animate-spin" /><span>جاري التطبيق...</span></>
            ) : (
              <><Check className="w-3.5 h-3.5" /><span>تطبيق الوسم</span></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   مكوّن إنشاء قائمة حملات
   ═══════════════════════════════════════════════════════════ */
interface CreateCampaignListModalProps {
  selectedCount: number;
  selectedIds: string[];
  onClose: () => void;
  onDone: (message: string) => void;
}

function CreateCampaignListModal({ selectedCount, selectedIds, onClose, onDone }: CreateCampaignListModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) {
      alert('يرجى إدخال اسم للقائمة');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/contacts/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          contact_ids: selectedIds,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onDone(data.message);
      } else {
        alert(data.error || 'فشل إنشاء القائمة');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div dir="rtl" className="bg-[var(--card-bg)] border border-emerald-500/40 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 text-right">
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
          <div>
            <h3 className="font-bold text-base text-[var(--text-main)]">📋 إنشاء قائمة حملات</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              ستُضاف{' '}
              <bdi className="font-mono font-bold text-emerald-300">{selectedCount}</bdi>{' '}
              جهة اتصال إلى القائمة الجديدة
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-slate-300 font-medium mb-1.5">اسم القائمة *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: عملاء مكة رمضان 2025"
              className="w-full bg-[var(--card-elevated)] text-[var(--text-main)] px-3 py-2 rounded-xl border border-[var(--border-subtle)] focus:border-emerald-500 outline-none text-right text-sm"
              dir="rtl"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-300 font-medium mb-1.5">وصف اختياري</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="وصف مختصر للقائمة وهدف الحملة..."
              className="w-full bg-[var(--card-elevated)] text-[var(--text-main)] px-3 py-2 rounded-xl border border-[var(--border-subtle)] focus:border-emerald-500 outline-none resize-none text-right text-xs"
              dir="rtl"
            />
          </div>
          <div className="p-3 bg-emerald-950/40 border border-emerald-500/20 rounded-xl text-xs text-emerald-200/80">
            ✅ ستظهر القائمة فور إنشائها في قسم <strong>إدارة الحملات</strong> وتكون جاهزة للاستخدام الفوري.
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-subtle)]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-semibold transition-all"
          >
            إلغاء
          </button>
          <button
            onClick={handleCreate}
            disabled={loading || !title.trim()}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-lg disabled:opacity-50 flex items-center gap-1.5"
          >
            {loading ? (
              <><RefreshCw className="w-3.5 h-3.5 animate-spin" /><span>جاري الإنشاء...</span></>
            ) : (
              <><ListPlus className="w-3.5 h-3.5" /><span>إنشاء القائمة</span></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(100);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // الفلاتر
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [lineFilter, setLineFilter] = useState<string>('all');
  const [originFilter, setOriginFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [countryFilter, setCountryFilter] = useState<string>('all');
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [showLids, setShowLids] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [availableTags, setAvailableTags] = useState<{ id: string; key: string; name_ar: string; color: string }[]>([]);

  // ===== التحديد الجماعي =====
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkTagModalOpen, setBulkTagModalOpen] = useState(false);
  const [createListModalOpen, setCreateListModalOpen] = useState(false);

  // إحصائيات النظام الشاملة
  const [globalStats, setGlobalStats] = useState({
    total: 0,
    individuals: 0,
    orgs: 0,
    groups: 0,
    fromEvolution: 0,
    fromExcel: 0,
    lids: 0,
    newsletters: 0,
    saudi: 0,
    gulf: 0,
  });

  // نوافذ منبثقة
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editContact, setEditContact] = useState<Contact | null>(null);
  // الواجهة تُخفي ما لا يملك الموظف صلاحيته (والخادم يرفضه على أي حال)
  const { user: authUser } = useApp();
  const can = (perm: string) => authUser.role === 'super_admin' || authUser.permissions.includes(perm);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [mergeModalOpen, setMergeModalOpen] = useState(false);
  const [clearModalOpen, setClearModalOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionAlert, setActionAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // حقول نموذج الإضافة / التعديل
  const [formData, setFormData] = useState({
    display_name: '',
    primary_phone: '',
    email: '',
    company: '',
    facility_name: '',
    entity_type: 'individual',
    commercial_role: 'b2c',
    source: 'manual',
    source_detail: '',
    country_code: 'SA',
    city: 'مكة المكرمة',
    district: '',
    notes: '',
    tags: '',
  });

  // جلب الوسوم المتاحة (من API الموحد الجديد مع دعم scope)
  const fetchTags = async () => {
    try {
      // استخدام API الجديد الذي يدعم scope + عداد الاستخدام
      const res = await fetch('/api/tags?scope=contact');
      if (res.ok) {
        const data = await res.json();
        const allList: { id: string; key: string; name_ar: string; color: string }[] =
          (data.tags || []).map((t: any) => ({
            id: t.id,
            key: t.key,
            name_ar: t.name_ar,
            color: t.color || '#8b5cf6',
          }));
        setAvailableTags(allList);
      }
    } catch (e) {
      console.error('Failed to load tags:', e);
    }
  };

  // جلب إحصائيات النظام الشاملة
  const fetchGlobalStats = async () => {
    try {
      const res = await fetch('/api/contacts/stats');
      if (res.ok) {
        const data = await res.json();
        setGlobalStats({
          total: data.total || 0,
          individuals: data.by_entity_type?.individual || 0,
          orgs: data.by_entity_type?.organization || 0,
          groups: data.by_entity_type?.group || 0,
          fromEvolution: data.by_source?.evolution || 0,
          fromExcel: data.by_source?.excel_import || 0,
          lids: data.by_entity_type?.lids || 0,
          newsletters: data.by_entity_type?.newsletters || 0,
          saudi: data.by_country?.saudi || 0,
          gulf: data.by_country?.gulf || 0,
        });
      }
    } catch (e) {
      console.error('Failed to load global contact stats:', e);
    }
  };

  // جلب جهات الاتصال بالترقيم والتصفية
  const fetchContacts = async (targetPage = page, targetPageSize = pageSize, queryOverride?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      const qVal = typeof queryOverride === 'string' ? queryOverride : searchQuery;
      if (qVal) params.set('q', qVal);
      if (entityFilter !== 'all') params.set('entity_type', entityFilter);
      if (roleFilter !== 'all') params.set('commercial_role', roleFilter);
      if (sourceFilter !== 'all') params.set('source', sourceFilter);
      if (lineFilter !== 'all') params.set('line', lineFilter);
      if (originFilter !== 'all') params.set('origin', originFilter);
      if (tagFilter !== 'all') params.set('tag', tagFilter);
      if (countryFilter !== 'all') params.set('country_code', countryFilter);
      if (cityFilter !== 'all') params.set('city', cityFilter);
      if (onlyFavorites) params.set('favorite', 'true');
      if (showLids) params.set('show_lids', 'true');
      params.set('limit', String(targetPageSize));
      params.set('offset', String((targetPage - 1) * targetPageSize));

      const res = await fetch(`/api/contacts?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setContacts(data.contacts || []);
        setTotalCount(data.total || 0);
        if (data.filtered_stats) {
          setGlobalStats((prev) => ({
            ...prev,
            total: data.total || 0,
            individuals: data.filtered_stats.individuals ?? prev.individuals,
            groups: data.filtered_stats.groups ?? prev.groups,
            orgs: data.filtered_stats.orgs ?? prev.orgs,
            lids: data.filtered_stats.lids ?? prev.lids,
          }));
        }
      }
    } catch (err) {
      console.error('Failed to load contacts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGlobalStats();
    fetchTags();
  }, []);

  useEffect(() => {
    setPage(1);
    fetchContacts(1, pageSize);
  }, [
    entityFilter,
    roleFilter,
    sourceFilter,
    lineFilter,
    originFilter,
    tagFilter,
    countryFilter,
    cityFilter,
    onlyFavorites,
    showLids,
    pageSize,
  ]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchContacts(1, pageSize);
  };

  const handlePageChange = (newPage: number) => {
    const maxPage = Math.max(1, Math.ceil(totalCount / pageSize));
    if (newPage >= 1 && newPage <= maxPage) {
      setPage(newPage);
      fetchContacts(newPage, pageSize);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // فتح نافذة الإضافة
  const openAddModal = () => {
    setEditContact(null);
    setFormData({
      display_name: '',
      primary_phone: '',
      email: '',
      company: '',
      facility_name: '',
      entity_type: 'individual',
      commercial_role: 'b2c',
      source: 'manual',
      source_detail: 'إدخال يدوي مباشر',
      country_code: 'SA',
      city: 'مكة المكرمة',
      district: '',
      notes: '',
      tags: '',
    });
    setAddModalOpen(true);
  };

  // فتح نافذة التعديل
  const openEditModal = (contact: Contact) => {
    setEditContact(contact);
    const rawPhone = contact.primary_phone || contact.primary_phone_e164 || '';
    const detectedCountry = detectCountryCodeFromPhone(rawPhone, contact.country_code || 'SA');
    setFormData({
      display_name: contact.display_name,
      primary_phone: rawPhone,
      email: contact.email || '',
      company: contact.company || '',
      facility_name: contact.facility_name || '',
      entity_type: contact.entity_type,
      commercial_role: contact.commercial_role,
      source: contact.source,
      source_detail: contact.source_detail || '',
      country_code: detectedCountry,
      city: contact.city || '',
      district: contact.district || '',
      notes: contact.notes || '',
      tags: contact.tags ? contact.tags.join(', ') : '',
    });
    setAddModalOpen(true);
  };

  // حفظ جهة الاتصال
  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.display_name && !formData.primary_phone) {
      alert('يرجى إدخال الاسم أو رقم الهاتف');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        tags: formData.tags ? formData.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      };

      if (editContact) {
        const res = await fetch(`/api/contacts/${editContact.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          setAddModalOpen(false);
          fetchContacts();
          fetchGlobalStats();
        } else {
          const err = await res.json();
          alert(`فشل التعديل: ${err.error}`);
        }
      } else {
        const res = await fetch('/api/contacts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          setAddModalOpen(false);
          fetchContacts();
          fetchGlobalStats();
        } else {
          const err = await res.json();
          alert(`فشل الإنشاء: ${err.error}`);
        }
      }
    } catch (err: any) {
      alert(`خطأ: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // تبديل المفضلة
  const handleToggleFavorite = async (contact: Contact) => {
    try {
      const newFav = !contact.is_favorite;
      setContacts((prev) =>
        prev.map((c) => (c.id === contact.id ? { ...c, is_favorite: newFav } : c))
      );
      await fetch(`/api/contacts/${contact.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_favorite: newFav }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  // حذف جهة اتصال مفردة
  const handleDeleteContact = async (id: string, name: string) => {
    if (!confirm(`هل أنت متأكد من حذف جهة الاتصال "${name}"؟`)) return;
    try {
      const res = await fetch(`/api/contacts/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setContacts((prev) => prev.filter((c) => c.id !== id));
        setTotalCount((prev) => Math.max(0, prev - 1));
        fetchGlobalStats();
      } else {
        alert('فشل الحذف');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ===== منطق التحديد الجماعي =====
  const toggleSelectContact = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(contacts.map((c) => c.id)));
  const clearSelection = () => setSelectedIds(new Set());
  const isAllSelected = contacts.length > 0 && contacts.every((c) => selectedIds.has(c.id));

  // مسح كافة جهات الاتصال نهائياً
  const handleClearAllContacts = async () => {
    try {
      setIsClearing(true);
      setActionAlert(null);
      const res = await fetch('/api/contacts?all=true', { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        setClearModalOpen(false);
        setActionAlert({
          type: 'success',
          message: 'تم تصفير ومسح كافة جهات الاتصال بنجاح. الدليل نظيف وجاهز للاستيراد المنظم.',
        });
        setContacts([]);
        setTotalCount(0);
        fetchGlobalStats();
      } else {
        setActionAlert({ type: 'error', message: data.error || 'تعذر مسح جهات الاتصال' });
      }
    } catch (err: any) {
      setActionAlert({ type: 'error', message: `خطأ أثناء المسح: ${err.message}` });
    } finally {
      setIsClearing(false);
    }
  };

  // تصدير CSV كامل (كل جهات الاتصال بالفلاتر الحالية — ليس فقط الصفحة)
  const handleExportCSV = async () => {
    try {
      setActionAlert(null);
      const params = new URLSearchParams();
      params.set('format', 'csv');
      if (searchQuery) params.set('q', searchQuery);
      if (entityFilter !== 'all') params.set('entity_type', entityFilter);
      if (roleFilter !== 'all') params.set('commercial_role', roleFilter);
      if (sourceFilter !== 'all') params.set('source', sourceFilter);
      if (lineFilter !== 'all') params.set('line', lineFilter);
      if (originFilter !== 'all') params.set('origin', originFilter);
      if (tagFilter !== 'all') params.set('tag', tagFilter);
      if (countryFilter !== 'all') params.set('country_code', countryFilter);
      if (cityFilter !== 'all') params.set('city', cityFilter);
      if (onlyFavorites) params.set('favorite', 'true');
      if (showLids) params.set('show_lids', 'true');
      params.set('limit', '50000');

      const res = await fetch(`/api/contacts/export?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json();
        setActionAlert({ type: 'error', message: `فشل التصدير: ${err.error || 'خطأ غير معروف'}` });
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contacts_export_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setActionAlert({ type: 'error', message: `خطأ في التصدير: ${err.message}` });
    }
  };

  // شارات الكيان (فحص صارم: أي جهة تملك رقماً حقيقياً هي فرد وليست مشفرة أبداً)
  const getEntityBadge = (contact: Contact) => {
    const hasPhone = Boolean(contact.primary_phone_e164 || (contact.primary_phone && !contact.primary_phone.includes('@')));
    const isLid = !hasPhone && Boolean(contact.wa_jid && contact.wa_jid.includes('@lid'));
    const isNewsletter = !hasPhone && Boolean(contact.wa_jid && (contact.wa_jid.includes('@newsletter') || contact.wa_jid.includes('@broadcast')));

    if (isLid) {
      return (
        <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-500/15 text-slate-300 border border-slate-500/30">
          <Lock className="w-3 h-3 text-slate-400" />
          <span>مشفر (LID)</span>
        </span>
      );
    }

    if (isNewsletter) {
      return (
        <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
          <Radio className="w-3 h-3 text-indigo-400" />
          <span>قناة / نشرة</span>
        </span>
      );
    }

    switch (contact.entity_type) {
      case 'individual':
        return (
          <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30">
            <User className="w-3 h-3 text-blue-400" />
            <span>فرد</span>
          </span>
        );
      case 'organization':
        return (
          <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
            <Building2 className="w-3 h-3 text-purple-400" />
            <span>منشأة / شركة</span>
          </span>
        );
      case 'group':
        return (
          <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <Users className="w-3 h-3 text-amber-400" />
            <span>مجموعة</span>
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30">
            <User className="w-3 h-3 text-blue-400" />
            <span>فرد</span>
          </span>
        );
    }
  };

  // شارات الدور التجاري (لا تظهر عميل B2C إطلاقاً إلا إذا تضمن الاسم صراحة: عميل أو زبون أو عميلة)
  const getRoleBadge = (contact: Contact) => {
    const role = contact.commercial_role;
    if (!role) return null;

    if (role === 'b2c') {
      const name = (contact.display_name || '').toLowerCase();
      const hasClientKeyword = /عميل|زبون|عميلة/.test(name);
      if (!hasClientKeyword) {
        return null;
      }
      return <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950/60 text-cyan-300 border border-cyan-500/30 font-medium">عميل B2C</span>;
    }

    switch (role) {
      case 'b2b':
        return <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-950/60 text-indigo-300 border border-indigo-500/30 font-medium">شركة B2B</span>;
      case 'vendor':
        return <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-950/60 text-orange-300 border border-orange-500/30 font-medium">مورد فندقي</span>;
      case 'partner':
        return <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 font-medium">شريك أعمال</span>;
      case 'staff':
        return <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-950/60 text-violet-300 border border-violet-500/30 font-medium">فريق العمل</span>;
      default:
        return null;
    }
  };

  // شارة الدولة (استبدال غير محدد بـ عام 🌐)
  const getCountryBadge = (code?: string) => {
    if (!code || code === 'XX') {
      return (
        <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-semibold" dir="rtl">
          <span>عام 🌐</span>
        </span>
      );
    }
    const flags: Record<string, string> = {
      SA: '🇸🇦 السعودية',
      AE: '🇦🇪 الإمارات',
      KW: '🇰🇼 الكويت',
      QA: '🇶🇦 قطر',
      OM: '🇴🇲 عمان',
      BH: '🇧🇭 البحرين',
      EG: '🇪🇬 مصر',
      JO: '🇯🇴 الأردن',
      IQ: '🇮🇶 العراق',
      YE: '🇾🇪 اليمن',
      SY: '🇸🇾 سوريا',
      LB: '🇱🇧 لبنان',
      MA: '🇲🇦 المغرب',
      DZ: '🇩🇿 الجزائر',
      TN: '🇹🇳 تونس',
      SD: '🇸🇩 السودان',
      TR: '🇹🇷 تركيا',
      US: '🇺🇸 أمريكا',
      GB: '🇬🇧 بريطانيا',
    };
    return (
      <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-semibold" dir="rtl">
        <span>{flags[code] || `🌐 ${code}`}</span>
      </span>
    );
  };

  // وسام المصدر وفصل كل خط واتساب في وسام مستقل بدلاً من دمجهما
  const getSourceBadges = (source: Contact['source'], detail?: string): React.ReactNode => {
    const cleanDetail = (detail || '').trim();
    const arabicLines: string[] = [];
    if (/sells_2|المبيعات 2/i.test(cleanDetail)) arabicLines.push('المبيعات 2');
    if (/master|الرئيسي/i.test(cleanDetail)) arabicLines.push('الرئيسي');
    if (/sells_1|المبيعات 1/i.test(cleanDetail)) arabicLines.push('المبيعات 1');

    if (arabicLines.length > 0) {
      return arabicLines.map((line) => (
        <span
          key={line}
          className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 shadow-sm"
          dir="rtl"
        >
          <Smartphone className="w-3 h-3 text-emerald-400 shrink-0" />
          <span>{line}</span>
        </span>
      ));
    }

    if (source === 'evolution') {
      const lineName = cleanDetail.replace(/evolution:/g, '').trim() || 'خط واتساب';
      return (
        <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 shadow-sm" dir="rtl">
          <Smartphone className="w-3 h-3 text-emerald-400 shrink-0" />
          <span>{lineName}</span>
        </span>
      );
    }

    switch (source) {
      case 'excel_import':
        return (
          <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-900/40 text-emerald-300 border border-emerald-600/40 shadow-sm" dir="rtl">
            <FileSpreadsheet className="w-3 h-3 text-emerald-400 shrink-0" />
            <span>{cleanDetail || 'استيراد إكسل'}</span>
          </span>
        );
      case 'contacts_file':
        return (
          <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-900/40 text-sky-300 border border-sky-500/40 shadow-sm" dir="rtl">
            <FileText className="w-3 h-3 text-sky-400 shrink-0" />
            <span>{cleanDetail || 'ملف جهات (VCF)'}</span>
          </span>
        );
      case 'system':
        return (
          <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-900/40 text-purple-300 border border-purple-500/40 shadow-sm" dir="rtl">
            <Cpu className="w-3 h-3 text-purple-400 shrink-0" />
            <span>{cleanDetail || 'النظام'}</span>
          </span>
        );
      case 'manual':
      default:
        return (
          <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 shadow-sm" dir="rtl">
            <Edit2 className="w-3 h-3 text-slate-400 shrink-0" />
            <span>{cleanDetail || 'يدوي'}</span>
          </span>
        );
    }
  };

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto py-4 px-2 sm:px-4 space-y-4" dir="rtl">
        {/* الرأس الرئيسي */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-[var(--border-subtle)]">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-main)]">
              دليل جهات الاتصال
            </h1>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              إدارة وتصنيف العملاء، المجموعات، الحسابات المشفرة، والقنوات مع كشف الدولة التلقائي
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {can('contacts.merge') && (
            <button
              onClick={() => setMergeModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-200 border border-indigo-500/40 text-xs font-medium transition-all shadow-sm"
              title="معاينة ودمج جهات الاتصال المكررة"
            >
              <GitMerge className="w-4 h-4 text-indigo-400" />
              <span>معاينة ودمج الجهات</span>
            </button>
            )}
            {can('contacts.delete') && (
            <button
              onClick={() => setClearModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-950/50 hover:bg-rose-900/80 text-rose-200 border border-rose-500/40 text-xs font-medium transition-all shadow-sm"
              title="مسح كافة جهات الاتصال لإعادة ضبط الدليل"
            >
              <Trash2 className="w-4 h-4 text-rose-400" />
              <span>مسح كل جهات الاتصال</span>
            </button>
            )}
            {can('contacts.import') && (
            <button
              onClick={() => setImportModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-950/60 hover:bg-purple-900/80 text-purple-200 border border-purple-500/30 text-xs font-medium transition-all shadow-sm"
            >
              <Upload className="w-4 h-4 text-purple-400" />
              <span>استيراد ملفات / واتساب</span>
            </button>
            )}
            {can('contacts.export') && (
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--card-elevated)] hover:bg-white/5 text-[var(--text-secondary)] border border-[var(--border-subtle)] text-xs font-medium transition-all shadow-sm"
            >
              <Download className="w-4 h-4 text-slate-400" />
              <span>تصدير CSV</span>
            </button>
            )}
            <button
              onClick={openAddModal}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold transition-all shadow-lg"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة جهة اتصال</span>
            </button>
          </div>
        </div>

        {/* تنبيه الإجراءات */}
        {actionAlert && (
          <div
            className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs font-semibold shadow-md ${
              actionAlert.type === 'success'
                ? 'bg-emerald-950/70 text-emerald-300 border-emerald-500/50'
                : 'bg-rose-950/70 text-rose-300 border-rose-500/50'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {actionAlert.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{actionAlert.message}</span>
            </div>
            <button
              onClick={() => setActionAlert(null)}
              className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* إحصائيات الدليل المتطورة */}
        <ContactsStats stats={globalStats} />

        {/* ===== شريط التحديد الجماعي — يظهر فقط عند وجود تحديد ===== */}
        {selectedIds.size > 0 && (
          <div
            dir="rtl"
            className="sticky top-2 z-30 p-3 rounded-2xl bg-indigo-950/90 border border-indigo-500/50 backdrop-blur-md flex flex-wrap items-center gap-3 shadow-xl"
          >
            <div className="flex items-center gap-2 text-sm font-bold text-indigo-200 shrink-0">
              <CheckSquare className="w-4 h-4 text-indigo-400" />
              <span>
                تم تحديد{' '}
                <bdi className="font-mono text-white">{selectedIds.size}</bdi>{' '}
                جهة اتصال
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setBulkTagModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600/30 hover:bg-purple-600 text-purple-200 hover:text-white border border-purple-500/40 text-xs font-semibold transition-all"
              >
                <Tags className="w-3.5 h-3.5" />
                <span>تعيين وسم جماعي</span>
              </button>
              <button
                onClick={() => setCreateListModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/30 hover:bg-emerald-600 text-emerald-200 hover:text-white border border-emerald-500/40 text-xs font-semibold transition-all"
              >
                <ListPlus className="w-3.5 h-3.5" />
                <span>إنشاء قائمة حملات</span>
              </button>
              {!isAllSelected && (
                <button
                  onClick={selectAll}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-700/60 hover:bg-slate-600 text-slate-300 hover:text-white border border-slate-500/40 text-xs font-semibold transition-all"
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>تحديد الكل ({contacts.length})</span>
                </button>
              )}
              <button
                onClick={clearSelection}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-all"
              >
                <X className="w-3.5 h-3.5" />
                <span>إلغاء التحديد</span>
              </button>
            </div>
          </div>
        )}

        {/* شريط الفلاتر والبحث الشامل */}
        <div className="p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-subtle)] space-y-3 shadow-md">
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
            <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute right-3.5 top-3 text-[var(--text-muted)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث بالاسم، رقم الهاتف، المنشأة، معرف واتساب، أو الملاحظات..."
                className="w-full bg-[var(--card-elevated)] text-xs text-[var(--text-main)] pr-10 pl-24 py-2.5 rounded-xl border border-[var(--border-subtle)] focus:border-purple-500 outline-none placeholder:text-[var(--text-muted)] text-right"
              />
              <div className="absolute left-2 top-1.5 flex items-center gap-1">
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setPage(1);
                      fetchContacts(1, pageSize, '');
                    }}
                    className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-rose-400 transition-all"
                    title="إلغاء البحث ومسح النص"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="submit"
                  className="px-3 py-1 rounded-lg bg-purple-600/30 hover:bg-purple-600 text-purple-200 hover:text-white text-[11px] font-medium transition-all"
                >
                  بحث
                </button>
              </div>
            </form>

            <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
              <button
                type="button"
                onClick={() => setShowLids((prev) => !prev)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  showLids
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                    : 'bg-[var(--card-elevated)] text-[var(--text-muted)] border-[var(--border-subtle)] hover:text-white'
                }`}
                title="إظهار جهات الاتصال المشفرة (تظهر في أسفل القائمة)"
              >
                <Lock className={`w-3.5 h-3.5 ${showLids ? 'text-amber-400' : 'text-slate-400'}`} />
                <span>إظهار المشفرين</span>
                {globalStats.lids > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/40 text-amber-300 font-mono">
                    <bdi dir="ltr">{globalStats.lids}</bdi>
                  </span>
                )}
              </button>

              <button
                onClick={() => setOnlyFavorites((prev) => !prev)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  onlyFavorites
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                    : 'bg-[var(--card-elevated)] text-[var(--text-muted)] border-[var(--border-subtle)] hover:text-white'
                }`}
              >
                <Star className={`w-3.5 h-3.5 ${onlyFavorites ? 'fill-amber-400 text-amber-400' : ''}`} />
                <span>المفضلة</span>
              </button>

              <button
                onClick={() => setViewMode(viewMode === 'cards' ? 'table' : 'cards')}
                className="p-2 rounded-xl bg-[var(--card-elevated)] hover:bg-white/5 border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all"
                title={viewMode === 'cards' ? 'التحويل إلى عرض الجدول' : 'التحويل إلى عرض البطاقات'}
              >
                <ArrowUpDown className="w-4 h-4" />
              </button>

              <button
                onClick={() => { fetchContacts(page, pageSize); fetchGlobalStats(); }}
                className="p-2 rounded-xl bg-[var(--card-elevated)] hover:bg-white/5 border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all"
                title="تحديث البيانات"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-purple-400' : ''}`} />
              </button>
            </div>
          </div>

          {/* صف الفلاتر متعددة الأبعاد */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 pt-2 border-t border-[var(--border-subtle)]/50 text-xs">
            {/* خط الواتساب */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-[var(--text-muted)] font-medium">خط الواتساب:</span>
              <select
                value={lineFilter}
                onChange={(e) => setLineFilter(e.target.value)}
                className="bg-[var(--card-elevated)] text-emerald-400 border border-[var(--border-subtle)] rounded-xl px-2 py-1.5 outline-none focus:border-purple-500 font-semibold text-right"
              >
                <option value="all">كل الخطوط</option>
                <option value="Master">الرئيسي (Master)</option>
                <option value="Sells_2">المبيعات 2 (Sells_2)</option>
                <option value="Sells_1">المبيعات 1 (Sells_1)</option>
                <option value="shared">خطوط مشتركة</option>
              </select>
            </div>

            {/* أصل ومصدر جهة الاتصال */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-[var(--text-muted)] font-medium">أصل السجل:</span>
              <select
                value={originFilter}
                onChange={(e) => setOriginFilter(e.target.value)}
                className="bg-[var(--card-elevated)] text-[var(--text-main)] border border-[var(--border-subtle)] rounded-xl px-2 py-1.5 outline-none focus:border-purple-500 font-medium text-right"
              >
                <option value="all">كل الأصول</option>
                <option value="saved_phone">📱 أرقام وأسماء محفوظة</option>
                <option value="group_member">🔒 أعضاء مجموعات / مشفر</option>
                <option value="groups">👥 مجموعات واتساب</option>
                <option value="newsletters">📢 قنوات وبث</option>
              </select>
            </div>

            {/* فلتر الوسوم المصنف بمجموعات */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-[var(--text-muted)] font-medium">الوسم:</span>
              <select
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                className="bg-[var(--card-elevated)] text-purple-300 border border-[var(--border-subtle)] rounded-xl px-2 py-1.5 outline-none focus:border-purple-500 font-medium text-right"
              >
                <option value="all">كل الوسوم</option>
                <optgroup label="خطوط الواتساب">
                  <option value="Master">📱 الرئيسي (Master)</option>
                  <option value="Sells_2">📱 المبيعات 2 (Sells_2)</option>
                  <option value="Sells_1">📱 المبيعات 1 (Sells_1)</option>
                </optgroup>
                <optgroup label="نوع جهة الاتصال">
                  <option value="individual">👤 فرد</option>
                  <option value="organization">🏢 منشأة / شركة</option>
                  <option value="group">👥 مجموعة</option>
                </optgroup>
                <optgroup label="الحالات الخاصة">
                  <option value="lid">🔒 مشفر (LID)</option>
                  <option value="newsletter">📢 قنوات وبث</option>
                </optgroup>
                <optgroup label="الدول">
                  <option value="SA">🇸🇦 السعودية</option>
                  <option value="SY">🇸🇾 سوريا</option>
                  <option value="EG">🇪🇬 مصر</option>
                  <option value="AE">🇦🇪 الإمارات</option>
                  <option value="KW">🇰🇼 الكويت</option>
                  <option value="QA">🇶🇦 قطر</option>
                  <option value="OM">🇴🇲 عمان</option>
                  <option value="BH">🇧🇭 البحرين</option>
                  <option value="XX">🌐 عام</option>
                </optgroup>
                <optgroup label="أصل ومصدر السجل">
                  <option value="saved_phone">📱 دفتر الجوال</option>
                  <option value="group_member">👥 عضو مجموعة</option>
                  <option value="excel_import">📊 استيراد إكسل</option>
                  <option value="contacts_file">📁 ملف جهات (VCF)</option>
                </optgroup>
                {availableTags.length > 0 && (
                  <optgroup label="وسوم مخصصة">
                    {availableTags.map((t) => (
                      <option key={t.id} value={t.name_ar || t.key}>
                        🏷️ {t.name_ar || t.key}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>

            {/* نوع الكيان */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-[var(--text-muted)] font-medium">نوع الكيان:</span>
              <select
                value={entityFilter}
                onChange={(e) => setEntityFilter(e.target.value)}
                className="bg-[var(--card-elevated)] text-[var(--text-main)] border border-[var(--border-subtle)] rounded-xl px-2 py-1.5 outline-none focus:border-purple-500 font-medium text-right"
              >
                <option value="all">كل الكيانات</option>
                <option value="individual">🧑 أفراد</option>
                <option value="organization">🏢 منشآت وشركات</option>
                <option value="group">👥 مجموعات</option>
                <option value="lid">🔒 مشفر (LID)</option>
                <option value="newsletter">📢 قنوات</option>
              </select>
            </div>

            {/* الدولة المكتشفة */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-[var(--text-muted)] font-medium">الدولة:</span>
              <select
                value={countryFilter}
                onChange={(e) => setCountryFilter(e.target.value)}
                className="bg-[var(--card-elevated)] text-[var(--text-main)] border border-[var(--border-subtle)] rounded-xl px-2 py-1.5 outline-none focus:border-purple-500 font-medium text-right"
              >
                <option value="all">كل الدول</option>
                <option value="SA">🇸🇦 السعودية</option>
                <option value="AE">🇦🇪 الإمارات</option>
                <option value="KW">🇰🇼 الكويت</option>
                <option value="QA">🇶🇦 قطر</option>
                <option value="OM">🇴🇲 عمان</option>
                <option value="BH">🇧🇭 البحرين</option>
                <option value="EG">🇪🇬 مصر</option>
                <option value="JO">🇯🇴 الأردن</option>
                <option value="IQ">🇮🇶 العراق</option>
                <option value="YE">🇾🇪 اليمن</option>
                <option value="SY">🇸🇾 سوريا</option>
                <option value="TR">🇹🇷 تركيا</option>
                <option value="INTL">🌍 دولي / أخرى</option>
                <option value="XX">🌐 عام</option>
              </select>
            </div>

            {/* الدور التجاري */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-[var(--text-muted)] font-medium">الدور التجاري:</span>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="bg-[var(--card-elevated)] text-[var(--text-main)] border border-[var(--border-subtle)] rounded-xl px-2 py-1.5 outline-none focus:border-purple-500 font-medium text-right"
              >
                <option value="all">كل الأدوار</option>
                <option value="b2c">عميل مباشر (B2C)</option>
                <option value="b2b">شركة (B2B)</option>
                <option value="vendor">مورد فندقي</option>
                <option value="partner">شريك أعمال</option>
                <option value="staff">موظف داخلي</option>
              </select>
            </div>

            {/* مصدر جهة الاتصال */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-[var(--text-muted)] font-medium">المصدر الأساسي:</span>
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="bg-[var(--card-elevated)] text-[var(--text-main)] border border-[var(--border-subtle)] rounded-xl px-2 py-1.5 outline-none focus:border-purple-500 font-medium text-right"
              >
                <option value="all">كل المصادر</option>
                <option value="evolution">📱 خطوط واتساب</option>
                <option value="excel_import">📊 استيراد إكسل</option>
                <option value="contacts_file">📁 ملف جهات (VCF)</option>
                <option value="system">⚙️ النظام الداخلي</option>
                <option value="manual">✍️ إدخال يدوي</option>
              </select>
            </div>

            {/* المدينة */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-[var(--text-muted)] font-medium">المدينة:</span>
              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="bg-[var(--card-elevated)] text-[var(--text-main)] border border-[var(--border-subtle)] rounded-xl px-2 py-1.5 outline-none focus:border-purple-500 font-medium text-right"
              >
                <option value="all">كل المدن</option>
                <option value="مكة المكرمة">مكة المكرمة</option>
                <option value="المدينة المنورة">المدينة المنورة</option>
                <option value="جدة">جدة</option>
                <option value="الرياض">الرياض</option>
                <option value="الدمام">الدمام</option>
              </select>
            </div>
          </div>
        </div>

        {/* عرض المحتوى: بطاقات أو جدول */}
        {loading ? (
          <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-8 h-8 text-purple-400 animate-spin" />
            <span className="text-sm">جاري تحميل سجلات جهات الاتصال...</span>
          </div>
        ) : contacts.length === 0 ? (
          <div className="p-16 text-center text-[var(--text-muted)] bg-[var(--card-bg)] rounded-3xl border border-[var(--border-subtle)] flex flex-col items-center justify-center gap-3">
            <Users className="w-12 h-12 text-slate-600" />
            <span className="text-sm font-semibold">لم يتم العثور على أي جهات اتصال تطابق خيارات البحث الحالية</span>
            <button
              onClick={openAddModal}
              className="mt-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md"
            >
              + إضافة أول جهة اتصال
            </button>
          </div>
        ) : viewMode === 'cards' ? (
          /* عرض البطاقات */
          <div className="space-y-3">
            {/* رأس القائمة: تحديد الكل */}
            <div className="flex items-center gap-3 px-1" dir="rtl">
              <button
                onClick={isAllSelected ? clearSelection : selectAll}
                className="flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors"
              >
                {isAllSelected ? (
                  <CheckSquare className="w-4 h-4 text-indigo-400" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
                <span>{isAllSelected ? 'إلغاء تحديد الكل' : 'تحديد الكل'}</span>
              </button>
              <span className="text-xs text-slate-500 font-mono">({contacts.length} في الصفحة)</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                className={`p-4 rounded-3xl bg-[var(--card-bg)] border transition-all shadow-lg flex flex-col justify-between group relative ${
                  selectedIds.has(contact.id)
                    ? 'border-indigo-500/60 bg-indigo-950/20'
                    : 'border-[var(--border-subtle)] hover:border-purple-500/40'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    {/* Checkbox التحديد + الأفاتار + الاسم */}
                    <div className="flex items-center gap-2 min-w-0">
                      <button
                        onClick={() => toggleSelectContact(contact.id)}
                        className="shrink-0 p-0.5 rounded-lg hover:bg-indigo-500/20 transition-colors"
                        title={selectedIds.has(contact.id) ? 'إلغاء التحديد' : 'تحديد'}
                      >
                        {selectedIds.has(contact.id) ? (
                          <CheckSquare className="w-4 h-4 text-indigo-400" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-500 group-hover:text-slate-400" />
                        )}
                      </button>
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-base shrink-0 shadow-md ${
                          contact.entity_type === 'organization'
                            ? 'bg-gradient-to-tr from-purple-700 to-indigo-700 text-white'
                            : contact.entity_type === 'group'
                            ? 'bg-gradient-to-tr from-amber-600 to-orange-600 text-white'
                            : 'bg-gradient-to-tr from-blue-600 to-cyan-600 text-white'
                        }`}
                      >
                        {contact.avatar_url ? (
                          <img src={contact.avatar_url} alt="" className="w-full h-full object-cover rounded-2xl" />
                        ) : contact.entity_type === 'organization' ? (
                          <Building2 className="w-5 h-5" />
                        ) : contact.entity_type === 'group' ? (
                          <Users className="w-5 h-5" />
                        ) : (
                          contact.display_name.charAt(0) || 'U'
                        )}
                      </div>

                      <div className="min-w-0">
                        <h3 className="font-bold text-sm text-[var(--text-main)] truncate" title={contact.display_name}>
                          {contact.display_name}
                        </h3>
                        {contact.company && (
                          <p className="text-[11px] text-[var(--text-secondary)] truncate">
                            {contact.company}
                          </p>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => handleToggleFavorite(contact)}
                      className="p-1 rounded-lg text-slate-400 hover:text-amber-400 transition-colors shrink-0"
                      title={contact.is_favorite ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
                    >
                      <Star className={`w-4 h-4 ${contact.is_favorite ? 'fill-amber-400 text-amber-400' : ''}`} />
                    </button>
                  </div>

                  {/* الشارات: الكيان + الدور + الدولة + المصدر */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-3">
                    {getEntityBadge(contact)}
                    {getCountryBadge(contact.country_code)}
                    {getRoleBadge(contact)}
                    {getSourceBadges(contact.source, contact.source_detail)}
                  </div>

                  {/* معلومات الاتصال والموقع */}
                  <div className="space-y-1.5 text-xs text-[var(--text-secondary)] border-t border-[var(--border-subtle)]/40 pt-2.5">
                    {(contact.primary_phone || contact.primary_phone_e164) && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        <span className="font-mono text-[11px] text-white">
                          <bdi dir="ltr">{formatPhoneNumberParts(contact.primary_phone_e164 || contact.primary_phone)}</bdi>
                        </span>
                      </div>
                    )}
                    {contact.wa_jid && !contact.primary_phone_e164 && (
                      <div className="flex items-center gap-2">
                        {contact.wa_jid.includes('@g.us') ? (
                          <Users className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        ) : (
                          <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        )}
                        <span className="font-mono text-[11px] text-slate-300 truncate tracking-wide select-all">
                          <bdi dir="ltr">{formatJidDisplay(contact.wa_jid)}</bdi>
                        </span>
                      </div>
                    )}
                    {contact.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        <span className="truncate">
                          <bdi dir="ltr">{contact.email}</bdi>
                        </span>
                      </div>
                    )}
                    {(contact.city || contact.district) && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        <span className="truncate">
                          {[contact.city, contact.district].filter(Boolean).join(' - ')}
                        </span>
                      </div>
                    )}
                  </div>

                  {contact.notes && (
                    <p className="mt-2 text-[11px] text-[var(--text-muted)] line-clamp-2 bg-[var(--card-elevated)] p-2 rounded-xl">
                      {contact.notes}
                    </p>
                  )}
                </div>

                {/* أزرار الإجراءات */}
                <div className="flex items-center justify-between gap-2 mt-4 pt-2.5 border-t border-[var(--border-subtle)]">
                  <a
                    href={`/inbox?phone=${encodeURIComponent(contact.primary_phone_e164 || contact.primary_phone || contact.wa_jid || '')}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white text-xs font-semibold transition-all shadow-sm"
                    title="فتح محادثة واتساب"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>محادثة</span>
                  </a>

                  <div className="flex items-center gap-1">
                    {/* محرر الوسوم المدمج في البطاقة */}
                    <ContactTagPicker
                      contactId={contact.id}
                      allTags={availableTags}
                    />
                    <button
                      onClick={() => openEditModal(contact)}
                      className="p-1.5 rounded-xl hover:bg-white/10 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
                      title="تعديل البيانات"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {can('contacts.delete') && (
<button
                      onClick={() => handleDeleteContact(contact.id, contact.display_name)}
                      className="p-1.5 rounded-xl hover:bg-rose-500/20 text-[var(--text-muted)] hover:text-rose-400 transition-colors"
                      title="حذف"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
)}
                  </div>
                </div>
              </div>
            ))}
            </div>
          </div>
        ) : (
          /* عرض الجدول التفصيلي */
          <div className="rounded-3xl bg-[var(--card-bg)] border border-[var(--border-subtle)] overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-[var(--card-elevated)] text-[var(--text-muted)] border-b border-[var(--border-subtle)]">
                  <tr>
                    <th className="p-3 w-10">
                      <button onClick={isAllSelected ? clearSelection : selectAll} className="p-0.5">
                        {isAllSelected ? (
                          <CheckSquare className="w-4 h-4 text-indigo-400" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </th>
                    <th className="p-3 font-semibold">الجهة / الاسم</th>
                    <th className="p-3 font-semibold">رقم الهاتف / المعرف</th>
                    <th className="p-3 font-semibold">الدولة</th>
                    <th className="p-3 font-semibold">نوع الكيان</th>
                    <th className="p-3 font-semibold">الدور</th>
                    <th className="p-3 font-semibold">المصدر</th>
                    <th className="p-3 font-semibold">المدينة</th>
                    <th className="p-3 font-semibold text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]/50">
                  {contacts.map((contact) => (
                    <tr
                      key={contact.id}
                      className={`transition-colors ${selectedIds.has(contact.id) ? 'bg-indigo-950/30' : 'hover:bg-purple-950/20'}`}
                    >
                      <td className="p-3">
                        <button onClick={() => toggleSelectContact(contact.id)} className="p-0.5">
                          {selectedIds.has(contact.id) ? (
                            <CheckSquare className="w-4 h-4 text-indigo-400" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-500" />
                          )}
                        </button>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleToggleFavorite(contact)}>
                            <Star className={`w-3.5 h-3.5 ${contact.is_favorite ? 'fill-amber-400 text-amber-400' : 'text-slate-600'}`} />
                          </button>
                          <div>
                            <span className="font-bold text-[var(--text-main)] block">{contact.display_name}</span>
                            {contact.company && <span className="text-[10px] text-[var(--text-muted)]">{contact.company}</span>}
                          </div>
                        </div>
                      </td>
                      <td className="p-3 font-mono text-[var(--text-secondary)]">
                        <bdi dir="ltr">{formatPhoneNumberParts(contact.primary_phone_e164 || contact.primary_phone) || (contact.wa_jid ? formatJidDisplay(contact.wa_jid) : '—')}</bdi>
                      </td>
                      <td className="p-3">{getCountryBadge(contact.country_code)}</td>
                      <td className="p-3">{getEntityBadge(contact)}</td>
                      <td className="p-3">{getRoleBadge(contact)}</td>
                      <td className="p-3"><div className="flex flex-wrap gap-1">{getSourceBadges(contact.source, contact.source_detail)}</div></td>
                      <td className="p-3 text-[var(--text-secondary)]">{contact.city || '—'}</td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <a
                            href={`/inbox?phone=${encodeURIComponent(contact.primary_phone_e164 || contact.primary_phone || contact.wa_jid || '')}`}
                            className="p-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white"
                            title="محادثة واتساب"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </a>
                          <button
                            onClick={() => openEditModal(contact)}
                            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-[var(--text-main)]"
                            title="تعديل"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {can('contacts.delete') && (
<button
                            onClick={() => handleDeleteContact(contact.id, contact.display_name)}
                            className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400"
                            title="حذف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* شريط ترقيم وتصفح الصفحات */}
        {!loading && totalCount > 0 && (
          <div className="p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-4 shadow-md text-xs">
            <div className="flex items-center gap-2 text-[var(--text-muted)]">
              <span>عرض</span>
              <span className="font-bold text-[var(--text-main)] font-mono">
                <bdi dir="ltr">{Math.min((page - 1) * pageSize + 1, totalCount)} - {Math.min(page * pageSize, totalCount)}</bdi>
              </span>
              <span>من أصل</span>
              <span className="font-bold text-purple-400 font-mono text-sm">
                <bdi dir="ltr">{totalCount}</bdi>
              </span>
              <span>جهة اتصال</span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--card-elevated)] text-[var(--text-secondary)] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight className="w-4 h-4" />
                <span>السابق</span>
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.ceil(totalCount / pageSize) }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === Math.ceil(totalCount / pageSize) || Math.abs(p - page) <= 1)
                  .map((p, idx, arr) => (
                    <React.Fragment key={p}>
                      {idx > 0 && p - arr[idx - 1] > 1 && (
                        <span className="px-1 text-slate-500 font-mono">...</span>
                      )}
                      <button
                        type="button"
                        onClick={() => handlePageChange(p)}
                        className={`w-8 h-8 rounded-xl font-bold font-mono text-xs transition-all ${
                          p === page
                            ? 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-md'
                            : 'bg-[var(--card-elevated)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-white'
                        }`}
                      >
                        <bdi dir="ltr">{p}</bdi>
                      </button>
                    </React.Fragment>
                  ))}
              </div>

              <button
                type="button"
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= Math.ceil(totalCount / pageSize)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--card-elevated)] text-[var(--text-secondary)] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <span>التالي</span>
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[var(--text-muted)]">لكل صفحة:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  const newSize = parseInt(e.target.value, 10);
                  setPageSize(newSize);
                  setPage(1);
                  fetchContacts(1, newSize);
                }}
                className="bg-[var(--card-elevated)] text-xs text-[var(--text-main)] border border-[var(--border-subtle)] rounded-xl px-2.5 py-1.5 outline-none font-mono focus:border-purple-500"
              >
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={250}>250</option>
                <option value={500}>500</option>
              </select>
            </div>
          </div>
        )}

        {/* نافذة إضافة / تعديل جهة اتصال */}
        {addModalOpen && (
          <div className="fixed inset-0 z-[150] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <div dir="rtl" className="bg-[var(--card-bg)] border border-purple-500/40 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 text-right">
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
                <h3 className="font-bold text-base text-[var(--text-main)]">
                  {editContact ? '✏️ تعديل بيانات جهة الاتصال' : '➕ إضافة جهة اتصال جديدة'}
                </h3>
                <button onClick={() => setAddModalOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveContact} className="space-y-3.5 text-xs max-h-[75vh] overflow-y-auto pr-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-300 font-medium mb-1">الاسم الكامل *</label>
                    <input
                      type="text"
                      required
                      value={formData.display_name}
                      onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                      placeholder="مثال: فندق صفوة المدينة أو أ. عبدالله"
                      className="w-full bg-[var(--card-elevated)] text-[var(--text-main)] px-3 py-2 rounded-xl border border-[var(--border-subtle)] focus:border-purple-500 outline-none text-right"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] text-slate-300 font-medium">رقم الهاتف (واتساب) *</label>
                      {formData.primary_phone && (
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(formData.primary_phone);
                            setActionAlert({ type: 'success', message: 'تم نسخ رقم الهاتف بنجاح' });
                            setTimeout(() => setActionAlert(null), 3000);
                          }}
                          className="flex items-center gap-1 text-[10px] text-purple-400 hover:text-purple-300 font-medium px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/20"
                          title="نسخ الرقم كاملاً إلى الحافظة"
                        >
                          <Copy className="w-3 h-3" />
                          <span>نسخ الرقم</span>
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5" dir="ltr">
                      <div className="px-2.5 py-2 rounded-xl bg-[var(--card-elevated)] border border-[var(--border-subtle)] text-slate-300 font-mono text-xs shrink-0 select-none">
                        {COUNTRY_DIAL_CODES[formData.country_code] || '+'}
                      </div>
                      <input
                        type="text"
                        dir="ltr"
                        value={formData.primary_phone}
                        onChange={(e) => {
                          const val = e.target.value;
                          const autoCountry = detectCountryCodeFromPhone(val, formData.country_code);
                          setFormData({ ...formData, primary_phone: val, country_code: autoCountry });
                        }}
                        placeholder="+9665xxxxxxxx أو 05xxxxxxxx"
                        className="w-full bg-[var(--card-elevated)] text-[var(--text-main)] px-3 py-2 rounded-xl border border-[var(--border-subtle)] focus:border-purple-500 outline-none text-left font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-300 font-medium mb-1">الدولة</label>
                    <select
                      value={formData.country_code}
                      onChange={(e) => setFormData({ ...formData, country_code: e.target.value })}
                      className="w-full bg-[var(--card-elevated)] text-[var(--text-main)] px-3 py-2 rounded-xl border border-[var(--border-subtle)] focus:border-purple-500 outline-none text-right"
                    >
                      <option value="SA">🇸🇦 السعودية</option>
                      <option value="SY">🇸🇾 سوريا</option>
                      <option value="EG">🇪🇬 مصر</option>
                      <option value="AE">🇦🇪 الإمارات</option>
                      <option value="KW">🇰🇼 الكويت</option>
                      <option value="QA">🇶🇦 قطر</option>
                      <option value="OM">🇴🇲 عمان</option>
                      <option value="BH">🇧🇭 البحرين</option>
                      <option value="JO">🇯🇴 الأردن</option>
                      <option value="IQ">🇮🇶 العراق</option>
                      <option value="YE">🇾🇪 اليمن</option>
                      <option value="TR">🇹🇷 تركيا</option>
                      <option value="SD">🇸🇩 السودان</option>
                      <option value="MA">🇲🇦 المغرب</option>
                      <option value="INTL">🌍 أخرى / دولي</option>
                      <option value="XX">🌐 عام</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-300 font-medium mb-1">نوع الكيان</label>
                    <select
                      value={formData.entity_type}
                      onChange={(e) => setFormData({ ...formData, entity_type: e.target.value as any })}
                      className="w-full bg-[var(--card-elevated)] text-[var(--text-main)] px-3 py-2 rounded-xl border border-[var(--border-subtle)] focus:border-purple-500 outline-none text-right"
                    >
                      <option value="individual">🧑 فرد</option>
                      <option value="organization">🏢 منشأة / شركة</option>
                      <option value="group">👥 مجموعة</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-300 font-medium mb-1">الدور التجاري</label>
                    <select
                      value={formData.commercial_role}
                      onChange={(e) => setFormData({ ...formData, commercial_role: e.target.value as any })}
                      className="w-full bg-[var(--card-elevated)] text-[var(--text-main)] px-3 py-2 rounded-xl border border-[var(--border-subtle)] focus:border-purple-500 outline-none text-right"
                    >
                      <option value="b2c">عميل مباشر (B2C)</option>
                      <option value="b2b">شركة (B2B)</option>
                      <option value="vendor">مورد فندقي</option>
                      <option value="partner">شريك أعمال</option>
                      <option value="staff">فريق العمل</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-300 font-medium mb-1">اسم المنشأة أو الفندق</label>
                    <input
                      type="text"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      placeholder="مثال: شركة ريزف بار"
                      className="w-full bg-[var(--card-elevated)] text-[var(--text-main)] px-3 py-2 rounded-xl border border-[var(--border-subtle)] focus:border-purple-500 outline-none text-right"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-300 font-medium mb-1">المدينة</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="مكة المكرمة"
                      className="w-full bg-[var(--card-elevated)] text-[var(--text-main)] px-3 py-2 rounded-xl border border-[var(--border-subtle)] focus:border-purple-500 outline-none text-right"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-300 font-medium mb-1">ملاحظات إدارية</label>
                  <textarea
                    rows={2}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="ملاحظات حول جهة الاتصال والاتفاقات..."
                    className="w-full bg-[var(--card-elevated)] text-[var(--text-main)] px-3 py-2 rounded-xl border border-[var(--border-subtle)] focus:border-purple-500 outline-none resize-none text-right"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-subtle)]">
                  <button
                    type="button"
                    onClick={() => setAddModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 font-semibold transition-all"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition-all shadow-lg disabled:opacity-50"
                  >
                    {isSubmitting ? 'جاري الحفظ...' : editContact ? 'حفظ التعديلات' : 'إضافة جهة الاتصال'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* نافذة الاستيراد الجماعي للملفات */}
        <ImportModal
          isOpen={importModalOpen}
          onClose={() => setImportModalOpen(false)}
          onSuccess={() => {
            fetchContacts();
            fetchGlobalStats();
          }}
        />

        {/* نافذة معاينة الدمج */}
        <MergePreviewModal
          isOpen={mergeModalOpen}
          onClose={() => setMergeModalOpen(false)}
          onSuccess={() => {
            fetchContacts();
            fetchGlobalStats();
            setActionAlert({
              type: 'success',
              message: 'تم دمج كافة جهات الاتصال المكررة بنجاح وربط سجلاتها بالسجل الرئيسي.',
            });
          }}
        />

        {/* نافذة تأكيد مسح كافة جهات الاتصال */}
        {clearModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div
              dir="rtl"
              className="bg-[var(--card-bg)] border border-rose-500/50 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl text-right animate-in fade-in zoom-in-95 duration-200"
            >
              <div className="flex items-center gap-3 text-rose-400">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-6 h-6 text-rose-400" />
                </div>
                <div>
                  <h3 className="font-black text-base text-[var(--text-main)]">
                    تأكيد مسح كافة جهات الاتصال
                  </h3>
                  <p className="text-xs text-rose-300/80">
                    تصفير الدليل بالكامل لإعادة الاستيراد النظيف
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/30 space-y-2 text-xs text-slate-300">
                <p>
                  هل أنت متأكد من رغبتك في حذف <bdi className="font-bold text-white">كافة جهات الاتصال المسجلة</bdi> نهائياً؟
                </p>
                <p className="text-[11px] text-rose-200/90 leading-relaxed">
                  سيتم تصفير الدليل مع الحفاظ الكامل على نصوص وسجلات المحادثات والشات في صندوق الوارد بأمان تام.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
                <button
                  type="button"
                  disabled={isClearing}
                  onClick={() => setClearModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-semibold transition-all disabled:opacity-50"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  disabled={isClearing}
                  onClick={handleClearAllContacts}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-lg shadow-rose-900/50 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isClearing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>جاري المسح الفوري...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>نعم، امسح كل جهات الاتصال</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ===== نافذة الوسم الجماعي ===== */}
      {bulkTagModalOpen && (
        <BulkTagModal
          selectedCount={selectedIds.size}
          selectedIds={Array.from(selectedIds)}
          availableTags={availableTags}
          onClose={() => setBulkTagModalOpen(false)}
          onDone={(msg) => {
            setBulkTagModalOpen(false);
            setActionAlert({ type: 'success', message: msg });
            setTimeout(() => setActionAlert(null), 5000);
          }}
        />
      )}

      {/* ===== نافذة إنشاء قائمة حملات ===== */}
      {createListModalOpen && (
        <CreateCampaignListModal
          selectedCount={selectedIds.size}
          selectedIds={Array.from(selectedIds)}
          onClose={() => setCreateListModalOpen(false)}
          onDone={(msg) => {
            setCreateListModalOpen(false);
            clearSelection();
            setActionAlert({ type: 'success', message: msg });
            setTimeout(() => setActionAlert(null), 7000);
          }}
        />
      )}
    </AppShell>
  );
}
