'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
} from 'lucide-react';
import { AppShell } from '../../../components/layout/AppShell';
import { ContactsStats } from '../../../components/contacts/ContactsStats';
import { ImportModal } from '../../../components/contacts/ImportModal';
import { MergePreviewModal } from '../../../components/contacts/MergePreviewModal';

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
  const [countryFilter, setCountryFilter] = useState<string>('all');
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

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
  const fetchContacts = async (targetPage = page, targetPageSize = pageSize) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('q', searchQuery);
      if (entityFilter !== 'all') params.set('entity_type', entityFilter);
      if (roleFilter !== 'all') params.set('commercial_role', roleFilter);
      if (sourceFilter !== 'all') params.set('source', sourceFilter);
      if (countryFilter !== 'all') params.set('country_code', countryFilter);
      if (cityFilter !== 'all') params.set('city', cityFilter);
      if (onlyFavorites) params.set('favorite', 'true');
      params.set('limit', String(targetPageSize));
      params.set('offset', String((targetPage - 1) * targetPageSize));

      const res = await fetch(`/api/contacts?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setContacts(data.contacts || []);
        setTotalCount(data.total || 0);
      }
    } catch (err) {
      console.error('Failed to load contacts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGlobalStats();
  }, []);

  useEffect(() => {
    setPage(1);
    fetchContacts(1, pageSize);
  }, [entityFilter, roleFilter, sourceFilter, countryFilter, cityFilter, onlyFavorites, pageSize]);

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
    setFormData({
      display_name: contact.display_name,
      primary_phone: contact.primary_phone || contact.primary_phone_e164 || '',
      email: contact.email || '',
      company: contact.company || '',
      facility_name: contact.facility_name || '',
      entity_type: contact.entity_type,
      commercial_role: contact.commercial_role,
      source: contact.source,
      source_detail: contact.source_detail || '',
      country_code: contact.country_code || 'SA',
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
      if (countryFilter !== 'all') params.set('country_code', countryFilter);
      if (cityFilter !== 'all') params.set('city', cityFilter);
      if (onlyFavorites) params.set('favorite', 'true');
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

  // شارات الكيان
  const getEntityBadge = (contact: Contact) => {
    const isLid = contact.wa_jid && contact.wa_jid.includes('@lid');
    const isNewsletter = contact.wa_jid && (contact.wa_jid.includes('@newsletter') || contact.wa_jid.includes('@broadcast'));

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
    }
  };

  // شارات الدور التجاري
  const getRoleBadge = (role: Contact['commercial_role']) => {
    switch (role) {
      case 'b2c':
        return <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950/60 text-cyan-300 border border-cyan-500/30 font-medium">عميل B2C</span>;
      case 'b2b':
        return <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-950/60 text-indigo-300 border border-indigo-500/30 font-medium">شركة B2B</span>;
      case 'vendor':
        return <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-950/60 text-orange-300 border border-orange-500/30 font-medium">مورد فندقي</span>;
      case 'partner':
        return <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 font-medium">شريك أعمال</span>;
      case 'staff':
        return <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-950/60 text-violet-300 border border-violet-500/30 font-medium">فريق العمل</span>;
    }
  };

  // شارة الدولة
  const getCountryBadge = (code?: string) => {
    if (!code || code === 'XX') {
      return <span className="text-[10px] text-slate-500 font-mono">غير محدد</span>;
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

  // وسام المصدر
  const getSourceBadge = (source: Contact['source'], detail?: string) => {
    switch (source) {
      case 'evolution':
        return (
          <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 shadow-sm" dir="rtl">
            <Smartphone className="w-3 h-3 text-emerald-400" />
            <span>{detail || 'خط واتساب'}</span>
          </span>
        );
      case 'excel_import':
        return (
          <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-900/40 text-emerald-300 border border-emerald-600/40 shadow-sm" dir="rtl">
            <FileSpreadsheet className="w-3 h-3 text-emerald-400" />
            <span>{detail || 'استيراد إكسل'}</span>
          </span>
        );
      case 'contacts_file':
        return (
          <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-900/40 text-sky-300 border border-sky-500/40 shadow-sm" dir="rtl">
            <FileText className="w-3 h-3 text-sky-400" />
            <span>{detail || 'ملف جهات (VCF)'}</span>
          </span>
        );
      case 'system':
        return (
          <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-900/40 text-purple-300 border border-purple-500/40 shadow-sm" dir="rtl">
            <Cpu className="w-3 h-3 text-purple-400" />
            <span>{detail || 'النظام'}</span>
          </span>
        );
      case 'manual':
      default:
        return (
          <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 shadow-sm" dir="rtl">
            <Edit2 className="w-3 h-3 text-slate-400" />
            <span>{detail || 'يدوي'}</span>
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
            <button
              onClick={() => setMergeModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-200 border border-indigo-500/40 text-xs font-medium transition-all shadow-sm"
              title="معاينة ودمج جهات الاتصال المكررة"
            >
              <GitMerge className="w-4 h-4 text-indigo-400" />
              <span>معاينة ودمج الجهات</span>
            </button>
            <button
              onClick={() => setClearModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-950/50 hover:bg-rose-900/80 text-rose-200 border border-rose-500/40 text-xs font-medium transition-all shadow-sm"
              title="مسح كافة جهات الاتصال لإعادة ضبط الدليل"
            >
              <Trash2 className="w-4 h-4 text-rose-400" />
              <span>مسح كل جهات الاتصال</span>
            </button>
            <button
              onClick={() => setImportModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-950/60 hover:bg-purple-900/80 text-purple-200 border border-purple-500/30 text-xs font-medium transition-all shadow-sm"
            >
              <Upload className="w-4 h-4 text-purple-400" />
              <span>استيراد ملفات / واتساب</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--card-elevated)] hover:bg-white/5 text-[var(--text-secondary)] border border-[var(--border-subtle)] text-xs font-medium transition-all shadow-sm"
            >
              <Download className="w-4 h-4 text-slate-400" />
              <span>تصدير CSV</span>
            </button>
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
                className="w-full bg-[var(--card-elevated)] text-xs text-[var(--text-main)] pr-10 pl-20 py-2.5 rounded-xl border border-[var(--border-subtle)] focus:border-purple-500 outline-none placeholder:text-[var(--text-muted)] text-right"
              />
              <button
                type="submit"
                className="absolute left-2 top-1.5 px-3 py-1 rounded-lg bg-purple-600/30 hover:bg-purple-600 text-purple-200 hover:text-white text-[11px] font-medium transition-all"
              >
                بحث
              </button>
            </form>

            <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
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
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-[var(--border-subtle)]/50 text-xs">
            {/* نوع الكيان والتصنيف الخاص */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-[var(--text-muted)] font-medium">نوع الكيان:</span>
              <select
                value={entityFilter}
                onChange={(e) => setEntityFilter(e.target.value)}
                className="bg-[var(--card-elevated)] text-[var(--text-main)] border border-[var(--border-subtle)] rounded-xl px-2.5 py-1.5 outline-none focus:border-purple-500 font-medium text-right"
              >
                <option value="all">كل الكيانات (الكل)</option>
                <option value="individual">🧑 أفراد معلنون</option>
                <option value="organization">🏢 منشآت وشركات</option>
                <option value="group">👥 مجموعات واتساب</option>
                <option value="lid">🔒 حسابات مشفرة (LID فقط)</option>
                <option value="newsletter">📢 قنوات ونشرات إخبارية</option>
              </select>
            </div>

            {/* الدولة المكتشفة */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-[var(--text-muted)] font-medium">الدولة:</span>
              <select
                value={countryFilter}
                onChange={(e) => setCountryFilter(e.target.value)}
                className="bg-[var(--card-elevated)] text-[var(--text-main)] border border-[var(--border-subtle)] rounded-xl px-2.5 py-1.5 outline-none focus:border-purple-500 font-medium text-right"
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
                <option value="TR">🇹🇷 تركيا</option>
                <option value="INTL">🌍 دولي / أخرى</option>
                <option value="XX">غير محدد</option>
              </select>
            </div>

            {/* الدور التجاري */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-[var(--text-muted)] font-medium">الدور التجاري:</span>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="bg-[var(--card-elevated)] text-[var(--text-main)] border border-[var(--border-subtle)] rounded-xl px-2.5 py-1.5 outline-none focus:border-purple-500 font-medium text-right"
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
                className="bg-[var(--card-elevated)] text-[var(--text-main)] border border-[var(--border-subtle)] rounded-xl px-2.5 py-1.5 outline-none focus:border-purple-500 font-medium text-emerald-400 text-right"
              >
                <option value="all">كل المصادر</option>
                <option value="evolution">📱 خطوط واتساب</option>
                <option value="excel_import">📊 استيراد إكسل</option>
                <option value="contacts_file">📁 ملف جهات اتصال (VCF)</option>
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
                className="bg-[var(--card-elevated)] text-[var(--text-main)] border border-[var(--border-subtle)] rounded-xl px-2.5 py-1.5 outline-none focus:border-purple-500 font-medium text-right"
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                className="p-4 rounded-3xl bg-[var(--card-bg)] border border-[var(--border-subtle)] hover:border-purple-500/40 transition-all shadow-lg flex flex-col justify-between group relative"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div className="flex items-center gap-3 min-w-0">
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
                      className="p-1 rounded-lg text-slate-400 hover:text-amber-400 transition-colors"
                      title={contact.is_favorite ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
                    >
                      <Star className={`w-4 h-4 ${contact.is_favorite ? 'fill-amber-400 text-amber-400' : ''}`} />
                    </button>
                  </div>

                  {/* الشارات: الكيان + الدور + الدولة + المصدر */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-3">
                    {getEntityBadge(contact)}
                    {getCountryBadge(contact.country_code)}
                    {getRoleBadge(contact.commercial_role)}
                    {getSourceBadge(contact.source, contact.source_detail)}
                  </div>

                  {/* معلومات الاتصال والموقع */}
                  <div className="space-y-1.5 text-xs text-[var(--text-secondary)] border-t border-[var(--border-subtle)]/40 pt-2.5">
                    {(contact.primary_phone || contact.primary_phone_e164) && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        <span className="font-mono text-[11px] text-white">
                          <bdi dir="ltr">{contact.primary_phone_e164 || contact.primary_phone}</bdi>
                        </span>
                      </div>
                    )}
                    {contact.wa_jid && !contact.primary_phone_e164 && (
                      <div className="flex items-center gap-2">
                        <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-mono text-[10px] text-slate-400 truncate">
                          <bdi dir="ltr">{contact.wa_jid}</bdi>
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
                    <button
                      onClick={() => openEditModal(contact)}
                      className="p-1.5 rounded-xl hover:bg-white/10 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
                      title="تعديل البيانات"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteContact(contact.id, contact.display_name)}
                      className="p-1.5 rounded-xl hover:bg-rose-500/20 text-[var(--text-muted)] hover:text-rose-400 transition-colors"
                      title="حذف"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* عرض الجدول التفصيلي */
          <div className="rounded-3xl bg-[var(--card-bg)] border border-[var(--border-subtle)] overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-[var(--card-elevated)] text-[var(--text-muted)] border-b border-[var(--border-subtle)]">
                  <tr>
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
                    <tr key={contact.id} className="hover:bg-purple-950/20 transition-colors">
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
                        <bdi dir="ltr">{contact.primary_phone_e164 || contact.primary_phone || contact.wa_jid || '—'}</bdi>
                      </td>
                      <td className="p-3">{getCountryBadge(contact.country_code)}</td>
                      <td className="p-3">{getEntityBadge(contact)}</td>
                      <td className="p-3">{getRoleBadge(contact.commercial_role)}</td>
                      <td className="p-3">{getSourceBadge(contact.source, contact.source_detail)}</td>
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
                          <button
                            onClick={() => handleDeleteContact(contact.id, contact.display_name)}
                            className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400"
                            title="حذف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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
                    <label className="block text-[11px] text-slate-300 font-medium mb-1">رقم الهاتف (واتساب) *</label>
                    <input
                      type="text"
                      dir="ltr"
                      value={formData.primary_phone}
                      onChange={(e) => setFormData({ ...formData, primary_phone: e.target.value })}
                      placeholder="+9665xxxxxxxx أو 05xxxxxxxx"
                      className="w-full bg-[var(--card-elevated)] text-[var(--text-main)] px-3 py-2 rounded-xl border border-[var(--border-subtle)] focus:border-purple-500 outline-none text-left font-mono"
                    />
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
                      <option value="AE">🇦🇪 الإمارات</option>
                      <option value="KW">🇰🇼 الكويت</option>
                      <option value="QA">🇶🇦 قطر</option>
                      <option value="OM">🇴🇲 عمان</option>
                      <option value="BH">🇧🇭 البحرين</option>
                      <option value="EG">🇪🇬 مصر</option>
                      <option value="JO">🇯🇴 الأردن</option>
                      <option value="IQ">🇮🇶 العراق</option>
                      <option value="YE">🇾🇪 اليمن</option>
                      <option value="INTL">🌍 أخرى / دولي</option>
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
    </AppShell>
  );
}
