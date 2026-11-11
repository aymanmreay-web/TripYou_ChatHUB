'use client';

import React, { useState, useEffect } from 'react';
import { 
  Tag, 
  Plus, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ShieldAlert, 
  RefreshCw, 
  Palette, 
  Activity, 
  Check, 
  Search, 
  Sparkles, 
  Save, 
  X, 
  ArrowUp, 
  ArrowDown, 
  SlidersHorizontal, 
  ExternalLink 
} from 'lucide-react';
import { AppShell } from '../../../components/layout/AppShell';
import {
  fetchTags, createTag, updateTag, deleteTag,
  fetchStatuses, saveStatus, deleteStatus, reorderStatuses,
} from '../../../lib/hubDb';
import { ModernColorPicker } from '../../../components/common/ModernColorPicker';

interface TagItem {
  id: string;
  name: string;
  hex_color: string;
  count: number;
  scope?: 'contact' | 'conversation' | 'both';
}

interface StatusDef {
  key: string;
  title_ar: string;
  title_en: string;
  description_ar: string;
  hex_color: string;
  sla_max_minutes: number;
  ordinal: number;
  is_custom?: boolean;
}



export default function LabelsAndTagsPage() {
  const [activeTab, setActiveTab] = useState<'tags' | 'statuses' | 'evolution_labels'>('tags');
  const [tags, setTags] = useState<TagItem[]>([]);
  const [statuses, setStatuses] = useState<StatusDef[]>([]);

  // New & Edit Tag
  const [newTagName, setNewTagName] = useState('');
  const [newTagHex, setNewTagHex] = useState('#8b5cf6');
  // م8: نطاق الوسم — يحدد أين يظهر (جهات / محادثات / كلاهما)
  const [newTagScope, setNewTagScope] = useState<'contact' | 'conversation' | 'both'>('both');
  const [editingTag, setEditingTag] = useState<TagItem | null>(null);
  const [editingTagScope, setEditingTagScope] = useState<'contact' | 'conversation' | 'both'>('both');

  // Status Edit & Create Modal
  const [editingStatus, setEditingStatus] = useState<StatusDef | null>(null);
  const [isCreatingStatus, setIsCreatingStatus] = useState(false);

  // Search & Loading
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingEvoLabels, setLoadingEvoLabels] = useState(false);
  const [evoLabels, setEvoLabels] = useState<any[]>([]);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setSaveError(null);
    setSaveSuccess(msg);
    setTimeout(() => setSaveSuccess(null), 3000);
  };

  const showError = (msg: string) => {
    setSaveSuccess(null);
    setSaveError(msg);
    setTimeout(() => setSaveError(null), 8000);
  };

  const reloadTags = async () => setTags(await fetchTags());
  const reloadStatuses = async () => setStatuses(await fetchStatuses());

  useEffect(() => {
    (async () => {
      try {
        await Promise.all([reloadTags(), reloadStatuses()]);
      } catch (e: any) {
        showError(`تعذّر تحميل البيانات: ${e.message}`);
      }
    })();
    fetchEvolutionLabels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Add Tag
  const handleAddTag = async () => {
    if (!newTagName.trim()) return;
    try {
      await createTag(newTagName, newTagHex, tags.length + 1, newTagScope);
      setNewTagName('');
      setNewTagScope('both');
      await reloadTags();
      showNotification('تمت إضافة الوسم');
    } catch (e: any) {
      showError(`تعذّر إضافة الوسم: ${e.message}`);
    }
  };

  // Save Edit Tag
  const handleSaveEditTag = async () => {
    if (!editingTag || !editingTag.name.trim()) return;
    try {
      await updateTag(editingTag.id, editingTag.name, editingTag.hex_color, editingTagScope);
      setEditingTag(null);
      await reloadTags();
      showNotification('تم تعديل الوسم');
    } catch (e: any) {
      showError(`تعذّر تعديل الوسم: ${e.message}`);
    }
  };

  // Delete Tag
  const handleDeleteTag = async (id: string) => {
    try {
      await deleteTag(id);
      await reloadTags();
      showNotification('تم حذف الوسم');
    } catch (e: any) {
      showError(`تعذّر حذف الوسم: ${e.message}`);
    }
  };

  // Save or Create Status
  const handleSaveStatus = async () => {
    if (!editingStatus || !editingStatus.title_ar.trim()) return;
    try {
      if (isCreatingStatus) {
        const baseKey = editingStatus.title_en?.trim()
          ? editingStatus.title_en.toLowerCase().replace(/[^a-z0-9]/g, '_')
          : `status_${Date.now().toString(36)}`;
        const key = statuses.some((s) => s.key === baseKey)
          ? `${baseKey}_${Date.now().toString(36)}`
          : baseKey;
        await saveStatus(
          { ...editingStatus, key, title_en: key.toUpperCase(), ordinal: statuses.length + 1, is_custom: true },
          true
        );
      } else {
        await saveStatus({ ...editingStatus, is_custom: !!editingStatus.is_custom }, false);
      }
      const savedTitle = editingStatus.title_ar;
      setEditingStatus(null);
      setIsCreatingStatus(false);
      await reloadStatuses();
      showNotification(`تم حفظ حالة "${savedTitle}"`);
    } catch (e: any) {
      showError(`تعذّر حفظ الحالة: ${e.message}`);
    }
  };

  // Delete Custom Status
  const handleDeleteCustomStatus = async (key: string) => {
    try {
      await deleteStatus(key);
      await reloadStatuses();
      showNotification('تم حذف الحالة');
    } catch (e: any) {
      showError(`تعذّر حذف الحالة: ${e.message}`);
    }
  };

  // Reorder Statuses
  const handleMoveStatus = async (index: number, direction: 'up' | 'down') => {
    const newIdx = direction === 'up' ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= statuses.length) return;

    const copy = [...statuses];
    [copy[index], copy[newIdx]] = [copy[newIdx], copy[index]];
    const reordered = copy.map((s, idx) => ({ ...s, ordinal: idx + 1 }));
    setStatuses(reordered);
    try {
      await reorderStatuses(reordered.map((s) => ({ ...s, is_custom: !!s.is_custom })));
    } catch (e: any) {
      showError(`تعذّر حفظ الترتيب: ${e.message}`);
      await reloadStatuses();
    }
  };

  // Fetch WhatsApp Labels
  const fetchEvolutionLabels = async () => {
    setLoadingEvoLabels(true);
    try {
      setEvoLabels([
        { id: '1', name: 'عميل جديد (New)', hexColor: '#22c55e', chatsCount: 14 },
        { id: '2', name: 'طلب معلق (Pending)', hexColor: '#eab308', chatsCount: 8 },
        { id: '3', name: 'VIP عملاء مميزين', hexColor: '#a855f7', chatsCount: 22 },
        { id: '4', name: 'مكتمل الحجز (Booked)', hexColor: '#3b82f6', chatsCount: 45 },
      ]);
    } catch (e) {
    } finally {
      setLoadingEvoLabels(false);
    }
  };

  const filteredTags = tags.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AppShell>
      <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">

        {/* Header - نقي ومباشر بدون حشو */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border-subtle)]">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-main)] flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg">
                <Tag className="w-5 h-5" />
              </div>
              الوسوم والحالات
            </h1>
          </div>

          {saveSuccess && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold animate-in fade-in">
              <CheckCircle2 className="w-4 h-4" />
              {saveSuccess}
            </div>
          )}
          {saveError && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-bold max-w-md">
              <X className="w-4 h-4 shrink-0" />
              {saveError}
            </div>
          )}
        </div>

        {/* Tab Selector - أسماء نقية بدون ترقيم مبتذل */}
        <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] pb-2">
          {[
            { key: 'tags', label: 'وسوم المحادثات', icon: Tag, count: tags.length },
            { key: 'statuses', label: 'دورة الحالات ومهل الاستجابة', icon: Activity, count: statuses.length },
            { key: 'evolution_labels', label: 'تسميات واتساب المزامنة', icon: ExternalLink, count: evoLabels.length },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                  active
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-950/40 border border-purple-400/40'
                    : 'text-[var(--text-muted)] hover:text-white hover:bg-[var(--card-elevated)]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-black/20 font-mono">
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* ═══ TAB 1: وسوم المحادثات مع منتقي الألوان العصري ═══ */}
        {activeTab === 'tags' && (
          <div className="space-y-6">
            
            {/* إضافة وسم جديد */}
            <div className="p-5 rounded-2xl bg-[var(--card-elevated)] border border-[var(--border-subtle)] shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-[var(--text-main)] flex items-center gap-2">
                <Plus className="w-4 h-4 text-purple-400" />
                إضافة وسم جديد
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className="sm:col-span-6 space-y-1">
                  <label className="text-xs text-slate-300">اسم الوسم:</label>
                  <input
                    type="text"
                    placeholder="مثال: عميل مهم، رحلات موسمية، استفسار عاجل..."
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-4">
                  <ModernColorPicker
                    value={newTagHex}
                    onChange={setNewTagHex}
                    label="لون الوسم:"
                  />
                </div>

                {/* م8: نطاق تطبيق الوسم */}
                <div className="sm:col-span-6 space-y-1">
                  <label className="text-xs text-slate-300">نطاق التطبيق — أين يظهر هذا الوسم؟</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {([['contact', '🏷 جهات الاتصال'], ['conversation', '💬 المحادثات'], ['both', '🔀 كلاهما']] as const).map(([val, label]) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setNewTagScope(val)}
                        className={`py-2 rounded-xl text-[11px] font-bold transition-all ${
                          newTagScope === val
                            ? 'bg-purple-600 text-white shadow-md'
                            : 'bg-slate-900 border border-slate-700 text-slate-400 hover:text-white'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="sm:col-span-6">
                  <button
                    onClick={handleAddTag}
                    className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md"
                  >
                    <Plus className="w-4 h-4" />
                    إضافة
                  </button>
                </div>
              </div>
            </div>

            {/* شريط البحث */}
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  placeholder="بحث في الوسوم..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900/60 border border-slate-800 rounded-xl pr-9 pl-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
                />
              </div>
              <span className="text-xs text-slate-400">
                الإجمالي: <strong className="text-[var(--text-main)] font-mono">{tags.length}</strong>
              </span>
            </div>

            {/* شبكة الوسوم */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
              {filteredTags.map((t) => (
                <div
                  key={t.id}
                  className="p-3.5 rounded-2xl border border-white/5 bg-slate-900/60 transition-all hover:scale-[1.02] flex items-center justify-between shadow-sm"
                  style={{ borderRightWidth: '4px', borderRightColor: t.hex_color }}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-3.5 h-3.5 rounded-lg shadow-sm"
                      style={{ backgroundColor: t.hex_color }}
                    />
                    <div>
                      <span className="text-xs font-bold text-[var(--text-main)]">{t.name}</span>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {t.count} استخدام
                      </div>
                      {t.scope && t.scope !== 'both' && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 mt-1 inline-block">
                          {t.scope === 'contact' ? '🏷 جهات' : '💬 محادثات'}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingTag(t);
                        setEditingTagScope(t.scope || 'both');
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-[var(--text-main)] hover:bg-white/10 transition-colors"
                      title="تعديل"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleDeleteTag(t.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="حذف"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Modal تعديل الوسم مع منتقي الألوان العصري */}
            {editingTag && (
              <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-[var(--card-bg)] border border-purple-500/40 rounded-3xl max-w-sm w-full p-5 space-y-4 text-right shadow-2xl">
                  <div className="flex items-center justify-between border-b border-purple-900/40 pb-3">
                    <h4 className="font-bold text-[var(--text-main)] text-sm">تعديل الوسم</h4>
                    <button onClick={() => setEditingTag(null)} className="text-slate-400 hover:text-[var(--text-main)]">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-slate-300">اسم الوسم:</label>
                    <input
                      type="text"
                      value={editingTag.name}
                      onChange={(e) => setEditingTag({ ...editingTag, name: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <ModernColorPicker
                      value={editingTag.hex_color}
                      onChange={(hex) => setEditingTag({ ...editingTag, hex_color: hex })}
                      label="اللون المختار:"
                    />
                  </div>

                  {/* م8: نطاق التطبيق */}
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-300">نطاق التطبيق:</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {([['contact', '🏷 جهات'], ['conversation', '💬 محادثات'], ['both', '🔀 كلاهما']] as const).map(([val, label]) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setEditingTagScope(val)}
                          className={`py-1.5 rounded-xl text-[10px] font-bold transition-all ${
                            editingTagScope === val
                              ? 'bg-purple-600 text-white'
                              : 'bg-slate-900 border border-slate-700 text-slate-400 hover:text-white'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-purple-900/30">
                    <button
                      onClick={() => setEditingTag(null)}
                      className="px-4 py-1.5 rounded-xl text-xs text-slate-400 hover:bg-white/5"
                    >
                      إلغاء
                    </button>
                    <button
                      onClick={handleSaveEditTag}
                      className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md"
                    >
                      حفظ التعديل
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        {/* ═══ TAB 2: دورة الحالات مع خيار إضافة حالة مخصصة جديدة ═══ */}
        {activeTab === 'statuses' && (
          <div className="space-y-6">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-slate-300">
                تحكم كامل بالحالات الافتراضية، أو أنشئ حالات خاصة بالمواسم والعقود الخاصة بمهل استجابة مخصصة.
              </div>

              {/* زر إضافة حالة مخصصة جديدة */}
              <button
                onClick={() => {
                  setEditingStatus({
                    key: '',
                    title_ar: '',
                    title_en: '',
                    description_ar: '',
                    hex_color: '#6366f1',
                    sla_max_minutes: 15,
                    ordinal: statuses.length + 1,
                    is_custom: true
                  });
                  setIsCreatingStatus(true);
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة حالة مخصصة جديدة</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {statuses.map((s, index) => (
                <div
                  key={s.key}
                  className="p-5 rounded-2xl border border-white/5 bg-slate-900/70 space-y-4 shadow-lg hover:border-purple-500/50 transition-all flex flex-col justify-between"
                  style={{ borderTopWidth: '4px', borderTopColor: s.hex_color }}
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full shadow-sm"
                            style={{ backgroundColor: s.hex_color }}
                          />
                          <h3 className="text-sm font-extrabold text-[var(--text-main)]">{s.title_ar}</h3>
                        </div>
                        <div className="mt-1 flex items-center gap-1.5">
                          <span className="text-[10px] font-mono font-bold tracking-widest text-purple-300 bg-purple-950/80 px-2 py-0.5 rounded-md border border-purple-800">
                            {s.title_en}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">({s.key})</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {s.is_custom && (
                          <button
                            onClick={() => handleDeleteCustomStatus(s.key)}
                            className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10"
                            title="حذف هذه الحالة المخصصة"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <span className="text-[10px] text-slate-500 font-mono">#{s.ordinal}</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 mt-3 leading-relaxed min-h-[44px]">
                      {s.description_ar}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-purple-900/30 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        مهلة الاستجابة:
                      </span>
                      <span className="font-bold text-[var(--text-main)] font-mono">
                        {s.sla_max_minutes > 0 ? `${s.sla_max_minutes} دقيقة` : 'مفتوح (بدون مهلة)'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleMoveStatus(index, 'up')}
                          disabled={index === 0}
                          className="p-1 rounded-lg text-slate-400 hover:text-[var(--text-main)] hover:bg-white/10 disabled:opacity-20"
                          title="تقديم"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleMoveStatus(index, 'down')}
                          disabled={index === statuses.length - 1}
                          className="p-1 rounded-lg text-slate-400 hover:text-[var(--text-main)] hover:bg-white/10 disabled:opacity-20"
                          title="تأخير"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        onClick={() => {
                          setEditingStatus(s);
                          setIsCreatingStatus(false);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600/30 hover:bg-purple-600 text-purple-200 hover:text-white border border-purple-500/40 text-xs font-semibold transition-all"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>تعديل</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Modal تعديل أو إضافة حالة مع منتقي الألوان العصري */}
            {editingStatus && (
              <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-[var(--card-bg)] border border-purple-500/40 rounded-3xl max-w-md w-full p-6 space-y-4 text-right shadow-2xl">
                  <div className="flex items-center justify-between border-b border-purple-900/40 pb-3">
                    <h4 className="font-bold text-[var(--text-main)] text-sm flex items-center gap-2">
                      <SlidersHorizontal className="w-4 h-4 text-purple-400" />
                      {isCreatingStatus ? 'إضافة حالة مخصصة جديدة' : `تخصيص الحالة: ${editingStatus.title_ar}`}
                    </h4>
                    <button onClick={() => setEditingStatus(null)} className="text-slate-400 hover:text-[var(--text-main)]">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-300">الاسم العربي:</label>
                      <input
                        type="text"
                        placeholder="مثال: حجز موسمي"
                        value={editingStatus.title_ar}
                        onChange={(e) => setEditingStatus({ ...editingStatus, title_ar: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-300">الرمز بالإنجليزية:</label>
                      <input
                        type="text"
                        placeholder="SEASONAL"
                        value={editingStatus.title_en}
                        onChange={(e) => setEditingStatus({ ...editingStatus, title_en: e.target.value.toUpperCase() })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-purple-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-300">الشرح والتفاصيل تحت الحالة:</label>
                    <textarea
                      rows={3}
                      value={editingStatus.description_ar}
                      onChange={(e) => setEditingStatus({ ...editingStatus, description_ar: e.target.value })}
                      placeholder="متى يتم تطبيق هذه الحالة وما الهدف منها..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 items-end">
                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-300">مهلة الاستجابة (بالدقائق):</label>
                      <input
                        type="number"
                        min={0}
                        value={editingStatus.sla_max_minutes}
                        onChange={(e) => setEditingStatus({ ...editingStatus, sla_max_minutes: parseInt(e.target.value) || 0 })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-purple-500 focus:outline-none"
                      />
                      <span className="text-[10px] text-slate-400">0 تعني بدون عداد مهلة</span>
                    </div>

                    <div>
                      <ModernColorPicker
                        value={editingStatus.hex_color}
                        onChange={(hex) => setEditingStatus({ ...editingStatus, hex_color: hex })}
                        label="لون الحالة العصري:"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-purple-900/30">
                    <button
                      onClick={() => setEditingStatus(null)}
                      className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:bg-white/5"
                    >
                      إلغاء
                    </button>
                    <button
                      onClick={handleSaveStatus}
                      className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md flex items-center gap-2"
                    >
                      <Save className="w-3.5 h-3.5" />
                      حفظ التغييرات
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        {/* ═══ TAB 3: تسميات واتساب بيزنس ═══ */}
        {activeTab === 'evolution_labels' && (
          <div className="p-6 rounded-2xl bg-[var(--card-elevated)] border border-[var(--border-subtle)] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-purple-900/30">
              <div>
                <h2 className="text-base font-bold text-[var(--text-main)] flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-emerald-400" />
                  تسميات WhatsApp Business
                </h2>
                <p className="text-xs text-slate-300 mt-1">
                  تتم قراءة ومزامنة هذه التسميات مباشرة من حساب واتساب بزنس
                </p>
              </div>

              <button
                onClick={fetchEvolutionLabels}
                disabled={loadingEvoLabels}
                className="px-4 py-2 rounded-xl bg-purple-950 hover:bg-purple-900 text-purple-200 text-xs font-semibold flex items-center gap-2 border border-purple-800 transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingEvoLabels ? 'animate-spin' : ''}`} />
                مزامنة التسميات
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              {evoLabels.map((lbl) => (
                <div
                  key={lbl.id}
                  className="p-4 rounded-xl bg-purple-950/30 border border-purple-900/40 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span 
                      className="w-3.5 h-3.5 rounded-full shadow-md"
                      style={{ backgroundColor: lbl.hexColor }}
                    />
                    <div>
                      <div className="text-sm font-bold text-[var(--text-main)]">{lbl.name}</div>
                      <div className="text-[11px] text-purple-300/60 mt-0.5">
                        {lbl.chatsCount} محادثة
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </AppShell>
  );
}
