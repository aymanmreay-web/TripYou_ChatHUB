'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  User,
  Building2,
  UserCheck,
  Search,
  Plus,
  Filter,
  Download,
  Upload,
  Phone,
  Mail,
  MapPin,
  Star,
  ExternalLink,
  Edit2,
  Trash2,
  RefreshCw,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Smartphone,
  Cpu,
  Shield,
  Layers,
  SlidersHorizontal,
  X,
  MessageSquare,
  ArrowUpDown
} from 'lucide-react';
import { AppShell } from '../../../components/layout/AppShell';

interface Contact {
  id: string;
  display_name: string;
  company?: string;
  entity_type: 'individual' | 'organization' | 'group';
  commercial_role: 'b2c' | 'b2b' | 'vendor' | 'partner' | 'staff';
  source: 'evolution' | 'excel_import' | 'contacts_file' | 'system' | 'manual';
  source_detail?: string;
  primary_phone?: string;
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
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // نوافذ منبثقة
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    city: 'مكة المكرمة',
    district: '',
    notes: '',
    tags: '',
  });

  // نموذج الاستيراد
  const [importSourceType, setImportSourceType] = useState<'excel_import' | 'contacts_file' | 'evolution'>('excel_import');
  const [importSourceDetail, setImportSourceDetail] = useState('');
  const [importRawText, setImportRawText] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // جلب جهات الاتصال
  const fetchContacts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('q', searchQuery);
      if (entityFilter !== 'all') params.set('entity_type', entityFilter);
      if (roleFilter !== 'all') params.set('commercial_role', roleFilter);
      if (sourceFilter !== 'all') params.set('source', sourceFilter);
      if (cityFilter !== 'all') params.set('city', cityFilter);
      if (onlyFavorites) params.set('favorite', 'true');
      params.set('limit', '100');

      const res = await fetch(`/api/contacts?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setContacts(data.contacts || []);
      }
    } catch (err) {
      console.error('Failed to load contacts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [entityFilter, roleFilter, sourceFilter, cityFilter, onlyFavorites]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchContacts();
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
      primary_phone: contact.primary_phone || '',
      email: contact.email || '',
      company: contact.company || '',
      facility_name: contact.facility_name || '',
      entity_type: contact.entity_type,
      commercial_role: contact.commercial_role,
      source: contact.source,
      source_detail: contact.source_detail || '',
      city: contact.city || '',
      district: contact.district || '',
      notes: contact.notes || '',
      tags: contact.tags ? contact.tags.join(', ') : '',
    });
    setAddModalOpen(true);
  };

  // حفظ جهة الاتصال (إنشاء أو تحديث)
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

  // حذف جهة اتصال
  const handleDeleteContact = async (id: string, name: string) => {
    if (!confirm(`هل أنت متأكد من حذف جهة الاتصال "${name}"؟`)) return;
    try {
      const res = await fetch(`/api/contacts/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setContacts((prev) => prev.filter((c) => c.id !== id));
      } else {
        alert('فشل الحذف');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // معالجة الاستيراد السريع
  const handleRunImport = async () => {
    if (!importRawText.trim()) {
      alert('يرجى لصق أرقام أو أسماء جهات الاتصال');
      return;
    }

    setIsSubmitting(true);
    setImportStatus('جاري معالجة البيانات والاستيراد مع تتبع المصدر...');

    try {
      // تحليل النص سطر بسطر (الاسم, الرقم, المنشأة) أو مجرد أرقام
      const lines = importRawText.split('\n').map((l) => l.trim()).filter(Boolean);
      const parsedContacts = lines.map((line) => {
        const parts = line.split(/[,\t]/);
        if (parts.length >= 2) {
          return {
            name: parts[0].trim(),
            phone: parts[1].trim(),
            company: parts[2] ? parts[2].trim() : undefined,
          };
        }
        return {
          name: line,
          phone: line,
        };
      });

      const res = await fetch('/api/contacts/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contacts: parsedContacts,
          source: importSourceType,
          source_detail: importSourceDetail || (importSourceType === 'excel_import' ? 'استيراد ملف إكسل' : 'استيراد مجمّع'),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setImportStatus(`✅ تم بنجاح: استيراد ${data.imported_count}، ودمج وتحديث ${data.merged_count}، وأخطاء ${data.failed_count}`);
        fetchContacts();
        setTimeout(() => {
          setImportModalOpen(false);
          setImportRawText('');
          setImportStatus(null);
        }, 2000);
      } else {
        const err = await res.json();
        setImportStatus(`❌ خطأ: ${err.error}`);
      }
    } catch (err: any) {
      setImportStatus(`❌ خطأ في الاتصال: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // تصدير CSV
  const handleExportCSV = () => {
    if (contacts.length === 0) {
      alert('لا توجد بيانات للتصدير');
      return;
    }
    const headers = ['الاسم', 'الرقم', 'الكيان', 'الدور', 'المصدر', 'تفاصيل المصدر', 'الشركة', 'المدينة', 'الملاحظات'];
    const rows = contacts.map((c) => [
      `"${c.display_name.replace(/"/g, '""')}"`,
      `"${c.primary_phone || ''}"`,
      `"${c.entity_type}"`,
      `"${c.commercial_role}"`,
      `"${c.source}"`,
      `"${(c.source_detail || '').replace(/"/g, '""')}"`,
      `"${(c.company || '').replace(/"/g, '""')}"`,
      `"${c.city || ''}"`,
      `"${(c.notes || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contacts_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // شارات الكيان ثلاثي الأبعاد
  const getEntityBadge = (type: Contact['entity_type']) => {
    switch (type) {
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

  // 🌟 وسام المصدر (Source Badge) — المطلب الأساسي
  const getSourceBadge = (source: Contact['source'], detail?: string) => {
    switch (source) {
      case 'evolution':
        return (
          <span
            className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 shadow-sm"
            title={`وردت من رقم واتساب الرسمي: ${detail || 'Evolution Line'}`}
          >
            <Smartphone className="w-3 h-3 text-emerald-400" />
            <span>{detail || 'خط واتساب (Evolution)'}</span>
          </span>
        );
      case 'excel_import':
        return (
          <span
            className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-900/40 text-emerald-300 border border-emerald-600/40 shadow-sm"
            title={`مستورد من ملف إكسل: ${detail || 'ملف بيانات'}`}
          >
            <FileSpreadsheet className="w-3 h-3 text-emerald-400" />
            <span>{detail || 'استيراد إكسل'}</span>
          </span>
        );
      case 'contacts_file':
        return (
          <span
            className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-900/40 text-sky-300 border border-sky-500/40 shadow-sm"
            title={`مستورد من ملف جهات اتصال: ${detail || 'VCF / Contacts'}`}
          >
            <FileText className="w-3 h-3 text-sky-400" />
            <span>{detail || 'ملف جهات اتصال'}</span>
          </span>
        );
      case 'system':
        return (
          <span
            className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-900/40 text-purple-300 border border-purple-500/40 shadow-sm"
            title={`أنشئت آلياً عبر محرك النظام: ${detail || 'حجوزات / تذاكر'}`}
          >
            <Cpu className="w-3 h-3 text-purple-400" />
            <span>{detail || 'محرك النظام الداخلي'}</span>
          </span>
        );
      case 'manual':
      default:
        return (
          <span
            className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 shadow-sm"
            title={`إدخال يدوي مباشر: ${detail || 'الموظف'}`}
          >
            <Edit2 className="w-3 h-3 text-slate-400" />
            <span>{detail || 'إدخال يدوي'}</span>
          </span>
        );
    }
  };

  // إحصائيات سريعة
  const stats = useMemo(() => {
    return {
      total: contacts.length,
      individuals: contacts.filter((c) => c.entity_type === 'individual').length,
      orgs: contacts.filter((c) => c.entity_type === 'organization').length,
      groups: contacts.filter((c) => c.entity_type === 'group').length,
      fromEvolution: contacts.filter((c) => c.source === 'evolution').length,
      fromExcel: contacts.filter((c) => c.source === 'excel_import').length,
    };
  }, [contacts]);

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto py-4 px-2 sm:px-4 space-y-4">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-[var(--border-subtle)]">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-main)]">
              دليل جهات الاتصال ثلاثي الأبعاد (3D Contacts Hub)
            </h1>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              إدارة وتصنيف العملاء والمنشآت والمجموعات مع تتبع دقيق لمصدر كل جهة اتصال (Evolution / إكسل / النظام)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setImportModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-950/60 hover:bg-purple-900/80 text-purple-200 border border-purple-500/30 text-xs font-medium transition-all shadow-sm"
            >
              <Upload className="w-4 h-4 text-purple-400" />
              <span>استيراد جماعي</span>
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
        {/* شريط الإحصائيات السريع */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-subtle)] flex flex-col justify-between">
            <span className="text-[11px] text-[var(--text-muted)] font-medium">إجمالي السجلات</span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xl font-bold text-[var(--text-main)] font-mono">{stats.total}</span>
              <Layers className="w-4 h-4 text-purple-400" />
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-subtle)] flex flex-col justify-between">
            <span className="text-[11px] text-[var(--text-muted)] font-medium">🧑 الأفراد (B2C)</span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xl font-bold text-blue-400 font-mono">{stats.individuals}</span>
              <User className="w-4 h-4 text-blue-400" />
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-subtle)] flex flex-col justify-between">
            <span className="text-[11px] text-[var(--text-muted)] font-medium">🏢 منشآت وشركات</span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xl font-bold text-purple-400 font-mono">{stats.orgs}</span>
              <Building2 className="w-4 h-4 text-purple-400" />
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-subtle)] flex flex-col justify-between">
            <span className="text-[11px] text-[var(--text-muted)] font-medium">👥 مجموعات</span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xl font-bold text-amber-400 font-mono">{stats.groups}</span>
              <Users className="w-4 h-4 text-amber-400" />
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-subtle)] flex flex-col justify-between">
            <span className="text-[11px] text-[var(--text-muted)] font-medium">📱 من خطوط واتساب</span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xl font-bold text-emerald-400 font-mono">{stats.fromEvolution}</span>
              <Smartphone className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-subtle)] flex flex-col justify-between">
            <span className="text-[11px] text-[var(--text-muted)] font-medium">📊 استيراد إكسل</span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xl font-bold text-emerald-500 font-mono">{stats.fromExcel}</span>
              <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
            </div>
          </div>
        </div>

        {/* شريط الفلاتر والبحث */}
        <div className="p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-subtle)] space-y-3 shadow-md">
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
            {/* مربع البحث */}
            <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute right-3.5 top-3 text-[var(--text-muted)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث بالاسم، رقم الهاتف، المنشأة، المدينة، أو الملاحظات..."
                className="w-full bg-[var(--card-elevated)] text-xs text-[var(--text-main)] pr-10 pl-20 py-2.5 rounded-xl border border-[var(--border-subtle)] focus:border-purple-500 outline-none placeholder:text-[var(--text-muted)]"
              />
              <button
                type="submit"
                className="absolute left-2 top-1.5 px-3 py-1 rounded-lg bg-purple-600/30 hover:bg-purple-600 text-purple-200 hover:text-white text-[11px] font-medium transition-all"
              >
                بحث
              </button>
            </form>

            {/* أدوات التبديل السريع */}
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
                className="p-2 rounded-xl bg-[var(--card-elevated)] hover:bg-white/5 border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-white transition-all"
                title={viewMode === 'cards' ? 'التحويل إلى عرض الجدول' : 'التحويل إلى عرض البطاقات'}
              >
                <ArrowUpDown className="w-4 h-4" />
              </button>

              <button
                onClick={fetchContacts}
                className="p-2 rounded-xl bg-[var(--card-elevated)] hover:bg-white/5 border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-white transition-all"
                title="تحديث البيانات"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-purple-400' : ''}`} />
              </button>
            </div>
          </div>

          {/* صف الفلاتر متعددة الأبعاد */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[var(--border-subtle)]/50 text-xs">
            {/* نوع الكيان */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-[var(--text-muted)] font-medium">نوع الكيان:</span>
              <select
                value={entityFilter}
                onChange={(e) => setEntityFilter(e.target.value)}
                className="bg-[var(--card-elevated)] text-[var(--text-main)] border border-[var(--border-subtle)] rounded-xl px-2.5 py-1.5 outline-none focus:border-purple-500 font-medium"
              >
                <option value="all">كل الكيانات (الكل)</option>
                <option value="individual">🧑 أفراد</option>
                <option value="organization">🏢 منشآت وشركات</option>
                <option value="group">👥 مجموعات</option>
              </select>
            </div>

            {/* الدور التجاري */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-[var(--text-muted)] font-medium">الدور التجاري:</span>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="bg-[var(--card-elevated)] text-[var(--text-main)] border border-[var(--border-subtle)] rounded-xl px-2.5 py-1.5 outline-none focus:border-purple-500 font-medium"
              >
                <option value="all">كل الأدوار</option>
                <option value="b2c">عميل مباشر (B2C)</option>
                <option value="b2b">شركة (B2B)</option>
                <option value="vendor">مورد فندقي</option>
                <option value="partner">شريك أعمال</option>
                <option value="staff">موظف داخلي</option>
              </select>
            </div>

            {/* مصدر جهة الاتصال (المطلب الأساسي) */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-[var(--text-muted)] font-medium">المصدر الأساسي:</span>
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="bg-[var(--card-elevated)] text-[var(--text-main)] border border-[var(--border-subtle)] rounded-xl px-2.5 py-1.5 outline-none focus:border-purple-500 font-medium text-emerald-400"
              >
                <option value="all">كل المصادر</option>
                <option value="evolution">📱 خطوط واتساب (Evolution)</option>
                <option value="excel_import">📊 استيراد إكسل</option>
                <option value="contacts_file">📁 ملف جهات اتصال</option>
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
                className="bg-[var(--card-elevated)] text-[var(--text-main)] border border-[var(--border-subtle)] rounded-xl px-2.5 py-1.5 outline-none focus:border-purple-500 font-medium"
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
            <span className="text-sm">جاري تحميل سجلات جهات الاتصال ثلاثية الأبعاد...</span>
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
          /* عرض البطاقات الحديثة */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                className="p-4 rounded-3xl bg-[var(--card-bg)] border border-[var(--border-subtle)] hover:border-purple-500/40 transition-all shadow-lg flex flex-col justify-between group relative"
              >
                <div>
                  {/* الرأس: الصورة، الاسم، والمفضلة */}
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
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-bold text-sm text-[var(--text-main)] truncate" title={contact.display_name}>
                            {contact.display_name}
                          </h3>
                        </div>
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

                  {/* الشارات الثلاثية: الكيان + الدور + وسم المصدر */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-3">
                    {getEntityBadge(contact.entity_type)}
                    {getRoleBadge(contact.commercial_role)}
                    {getSourceBadge(contact.source, contact.source_detail)}
                  </div>

                  {/* معلومات الاتصال والموقع */}
                  <div className="space-y-1.5 text-xs text-[var(--text-secondary)] border-t border-[var(--border-subtle)]/40 pt-2.5">
                    {contact.primary_phone && (
                      <div className="flex items-center gap-2 font-mono dir-ltr text-right">
                        <Phone className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        <span className="truncate">{contact.primary_phone}</span>
                      </div>
                    )}
                    {contact.email && (
                      <div className="flex items-center gap-2 dir-ltr text-right">
                        <Mail className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        <span className="truncate">{contact.email}</span>
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

                {/* أزرار الإجراءات السريعة */}
                <div className="flex items-center justify-between gap-2 mt-4 pt-2.5 border-t border-[var(--border-subtle)]">
                  <a
                    href={`/inbox?phone=${encodeURIComponent(contact.primary_phone || '')}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white text-xs font-semibold transition-all shadow-sm"
                    title="فتح محادثة واتساب فورية"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>محادثة</span>
                  </a>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(contact)}
                      className="p-1.5 rounded-xl hover:bg-white/10 text-[var(--text-muted)] hover:text-white transition-colors"
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
                    <th className="p-3 font-semibold">رقم الهاتف</th>
                    <th className="p-3 font-semibold">نوع الكيان</th>
                    <th className="p-3 font-semibold">الدور</th>
                    <th className="p-3 font-semibold">وسام المصدر والتتبع</th>
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
                      <td className="p-3 font-mono text-[var(--text-secondary)] dir-ltr text-right">
                        {contact.primary_phone || '—'}
                      </td>
                      <td className="p-3">{getEntityBadge(contact.entity_type)}</td>
                      <td className="p-3">{getRoleBadge(contact.commercial_role)}</td>
                      <td className="p-3">{getSourceBadge(contact.source, contact.source_detail)}</td>
                      <td className="p-3 text-[var(--text-secondary)]">{contact.city || '—'}</td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <a
                            href={`/inbox?phone=${encodeURIComponent(contact.primary_phone || '')}`}
                            className="p-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white"
                            title="محادثة واتساب"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </a>
                          <button
                            onClick={() => openEditModal(contact)}
                            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
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

        {/* ════════════════════════════════════════════════════════
            نافذة إضافة / تعديل جهة اتصال كاملة
           ════════════════════════════════════════════════════════ */}
        {addModalOpen && (
          <div className="fixed inset-0 z-[150] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#120B24] border border-purple-500/40 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 text-right">
              <div className="flex items-center justify-between border-b border-purple-900/40 pb-3">
                <h3 className="font-bold text-base text-white">
                  {editContact ? '✏️ تعديل بيانات جهة الاتصال' : '➕ إضافة جهة اتصال جديدة ثلاثية الأبعاد'}
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
                      className="w-full bg-[#1A1235] text-white px-3 py-2 rounded-xl border border-purple-900/50 focus:border-purple-500 outline-none"
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
                      className="w-full bg-[#1A1235] text-white px-3 py-2 rounded-xl border border-purple-900/50 focus:border-purple-500 outline-none text-left font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-300 font-medium mb-1">نوع الكيان</label>
                    <select
                      value={formData.entity_type}
                      onChange={(e) => setFormData({ ...formData, entity_type: e.target.value as any })}
                      className="w-full bg-[#1A1235] text-white px-3 py-2 rounded-xl border border-purple-900/50 focus:border-purple-500 outline-none"
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
                      className="w-full bg-[#1A1235] text-white px-3 py-2 rounded-xl border border-purple-900/50 focus:border-purple-500 outline-none"
                    >
                      <option value="b2c">عميل مباشر (B2C)</option>
                      <option value="b2b">شركة (B2B)</option>
                      <option value="vendor">مورد فندقي</option>
                      <option value="partner">شريك أعمال</option>
                      <option value="staff">فريق العمل</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-300 font-medium mb-1">مصدر جهة الاتصال</label>
                    <select
                      value={formData.source}
                      onChange={(e) => setFormData({ ...formData, source: e.target.value as any })}
                      className="w-full bg-[#1A1235] text-white px-3 py-2 rounded-xl border border-purple-900/50 focus:border-purple-500 outline-none text-emerald-400 font-medium"
                    >
                      <option value="manual">✍️ إدخال يدوي</option>
                      <option value="evolution">📱 خط واتساب (Evolution)</option>
                      <option value="excel_import">📊 استيراد إكسل</option>
                      <option value="contacts_file">📁 ملف جهات اتصال</option>
                      <option value="system">⚙️ النظام الداخلي</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-300 font-medium mb-1">تفاصيل المصدر (اسم الخط أو اسم الملف)</label>
                    <input
                      type="text"
                      value={formData.source_detail}
                      onChange={(e) => setFormData({ ...formData, source_detail: e.target.value })}
                      placeholder="مثال: evolution:Sells_2 أو حجاج_1446.xlsx"
                      className="w-full bg-[#1A1235] text-white px-3 py-2 rounded-xl border border-purple-900/50 focus:border-purple-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-300 font-medium mb-1">اسم المنشأة أو الفندق التابع له</label>
                    <input
                      type="text"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      placeholder="مثال: شركة ريزف بار للسياحة"
                      className="w-full bg-[#1A1235] text-white px-3 py-2 rounded-xl border border-purple-900/50 focus:border-purple-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-300 font-medium mb-1">البريد الإلكتروني</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="email@example.com"
                      className="w-full bg-[#1A1235] text-white px-3 py-2 rounded-xl border border-purple-900/50 focus:border-purple-500 outline-none text-left"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-300 font-medium mb-1">المدينة</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="مكة المكرمة"
                      className="w-full bg-[#1A1235] text-white px-3 py-2 rounded-xl border border-purple-900/50 focus:border-purple-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-300 font-medium mb-1">الحي / المنطقة</label>
                    <input
                      type="text"
                      value={formData.district}
                      onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                      placeholder="حي العزيزية"
                      className="w-full bg-[#1A1235] text-white px-3 py-2 rounded-xl border border-purple-900/50 focus:border-purple-500 outline-none"
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
                    className="w-full bg-[#1A1235] text-white px-3 py-2 rounded-xl border border-purple-900/50 focus:border-purple-500 outline-none resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-purple-900/40">
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

        {/* ════════════════════════════════════════════════════════
            نافذة الاستيراد الجماعي الذكي
           ════════════════════════════════════════════════════════ */}
        {importModalOpen && (
          <div className="fixed inset-0 z-[150] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#120B24] border border-purple-500/40 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 text-right">
              <div className="flex items-center justify-between border-b border-purple-900/40 pb-3">
                <div className="flex items-center gap-2">
                  <Upload className="w-5 h-5 text-purple-400" />
                  <h3 className="font-bold text-base text-white">استيراد جماعي ذكي مع تتبع المصدر</h3>
                </div>
                <button onClick={() => setImportModalOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-[11px] text-slate-300 font-medium mb-1">تحديد نوع المصدر:</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setImportSourceType('excel_import')}
                      className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                        importSourceType === 'excel_import'
                          ? 'bg-emerald-950/50 border-emerald-500/60 text-emerald-300 font-bold'
                          : 'bg-[#1A1235] border-purple-900/40 text-slate-400'
                      }`}
                    >
                      <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                      <span>استيراد إكسل</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setImportSourceType('contacts_file')}
                      className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                        importSourceType === 'contacts_file'
                          ? 'bg-sky-950/50 border-sky-500/60 text-sky-300 font-bold'
                          : 'bg-[#1A1235] border-purple-900/40 text-slate-400'
                      }`}
                    >
                      <FileText className="w-5 h-5 text-sky-400" />
                      <span>ملف جهات اتصال</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setImportSourceType('evolution')}
                      className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                        importSourceType === 'evolution'
                          ? 'bg-purple-950/50 border-purple-500/60 text-purple-300 font-bold'
                          : 'bg-[#1A1235] border-purple-900/40 text-slate-400'
                      }`}
                    >
                      <Smartphone className="w-5 h-5 text-purple-400" />
                      <span>خط واتساب Evolution</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-300 font-medium mb-1">
                    اسم المصدر التفصيلي (ليظهر كوسام دائم):
                  </label>
                  <input
                    type="text"
                    value={importSourceDetail}
                    onChange={(e) => setImportSourceDetail(e.target.value)}
                    placeholder="مثال: ملف_حجاج_1446.xlsx أو خط واتساب Sells_2"
                    className="w-full bg-[#1A1235] text-white px-3 py-2 rounded-xl border border-purple-900/50 focus:border-purple-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-300 font-medium mb-1">
                    انسخ وألصق البيانات هنا (الاسم, الهاتف, المنشأة) أو قائمة أرقام:
                  </label>
                  <textarea
                    rows={6}
                    dir="ltr"
                    value={importRawText}
                    onChange={(e) => setImportRawText(e.target.value)}
                    placeholder={"فندق الصفوة, +966500123456, شركة الحج والعمرة\nأحمد علي, 0551234567\n+966548540410"}
                    className="w-full bg-[#1A1235] text-white px-3 py-2 rounded-xl border border-purple-900/50 focus:border-purple-500 outline-none font-mono text-left resize-none"
                  />
                </div>

                {importStatus && (
                  <div className="p-3 rounded-xl bg-purple-950/50 border border-purple-500/30 text-purple-200 text-xs">
                    {importStatus}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-purple-900/40">
                  <button
                    type="button"
                    onClick={() => setImportModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 font-semibold transition-all"
                  >
                    إغلاق
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleRunImport}
                    className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition-all shadow-lg disabled:opacity-50"
                  >
                    {isSubmitting ? 'جاري الاستيراد...' : 'بدء الاستيراد وتتبع المصدر'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
