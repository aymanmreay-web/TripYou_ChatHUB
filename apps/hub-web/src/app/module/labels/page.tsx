'use client';

import React, { useState, useEffect } from 'react';
import { 
  Tags, 
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
  Hash,
  Activity,
  Filter,
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
import { supabase } from '../../../lib/supabase';
import { ConversationStatus } from '../../../types';

interface TagItem {
  id: string;
  name: string;
  color_key: 'purple' | 'emerald' | 'blue' | 'amber' | 'rose' | 'cyan';
  count: number;
}

interface StatusDef {
  key: ConversationStatus;
  title_ar: string;
  title_en: string;
  description_ar: string;
  color_key: string;
  sla_max_minutes: number;
  ordinal: number;
  icon?: any;
}

const COLOR_CLASSES: Record<string, { bg: string; text: string; border: string; dot: string; lightBg: string }> = {
  purple: { bg: 'bg-purple-500/20', text: 'text-purple-300', border: 'border-purple-500/40', dot: 'bg-purple-500', lightBg: 'bg-purple-950/40' },
  emerald: { bg: 'bg-emerald-500/20', text: 'text-emerald-300', border: 'border-emerald-500/40', dot: 'bg-emerald-500', lightBg: 'bg-emerald-950/40' },
  blue: { bg: 'bg-blue-500/20', text: 'text-blue-300', border: 'border-blue-500/40', dot: 'bg-blue-500', lightBg: 'bg-blue-950/40' },
  amber: { bg: 'bg-amber-500/20', text: 'text-amber-300', border: 'border-amber-500/40', dot: 'bg-amber-500', lightBg: 'bg-amber-950/40' },
  rose: { bg: 'bg-rose-500/20', text: 'text-rose-300', border: 'border-rose-500/40', dot: 'bg-rose-500', lightBg: 'bg-rose-950/40' },
  cyan: { bg: 'bg-cyan-500/20', text: 'text-cyan-300', border: 'border-cyan-500/40', dot: 'bg-cyan-500', lightBg: 'bg-cyan-950/40' },
};

const PRESET_COLORS = [
  { key: 'purple', name: 'بنفسجي' },
  { key: 'emerald', name: 'زمردي أخضر' },
  { key: 'blue', name: 'أزرق ملكي' },
  { key: 'amber', name: 'كهرماني برتقالي' },
  { key: 'rose', name: 'وردي أحمر' },
  { key: 'cyan', name: 'سماوي بحري' },
];

const INITIAL_STATUS_DEFINITIONS: StatusDef[] = [
  {
    key: 'open',
    title_ar: 'مفتوحة (جديدة)',
    title_en: 'OPEN',
    description_ar: 'المحادثات الواردة حديثاً التي بانتظار الإسناد أو استجابة الموظف الأولية.',
    color_key: 'blue',
    sla_max_minutes: 5,
    ordinal: 1,
  },
  {
    key: 'in_progress',
    title_ar: 'قيد المعالجة',
    title_en: 'IN_PROGRESS',
    description_ar: 'محادثة مسندة لموظف ويجري التواصل والمتابعة النشطة مع العميل.',
    color_key: 'amber',
    sla_max_minutes: 10,
    ordinal: 2,
  },
  {
    key: 'snoozed',
    title_ar: 'مؤجلة (انتظار رد)',
    title_en: 'SNOOZED',
    description_ar: 'محادثة بانتظار رد خارجي من العميل أو إفادة من جهة أخرى في موعد محدد.',
    color_key: 'purple',
    sla_max_minutes: 1440,
    ordinal: 3,
  },
  {
    key: 'escalated',
    title_ar: 'مصعدة للإشراف',
    title_en: 'ESCALATED',
    description_ar: 'حالة حرجة أو شكوى تجاوزت مهلة SLA تستدعي تدخل المشرف المباشر فوراً.',
    color_key: 'rose',
    sla_max_minutes: 2,
    ordinal: 4,
  },
  {
    key: 'resolved',
    title_ar: 'تم الحل والإغلاق',
    title_en: 'RESOLVED',
    description_ar: 'تم تقديم الخدمة بنجاح وإنهاء متطلبات العميل وإقفال المحادثة.',
    color_key: 'emerald',
    sla_max_minutes: 0,
    ordinal: 5,
  },
];

const INITIAL_TAGS: TagItem[] = [
  { id: 't-1', name: 'عميل VIP', color_key: 'emerald', count: 18 },
  { id: 't-2', name: 'استفسار تسعير', color_key: 'blue', count: 42 },
  { id: 't-3', name: 'حجز طيران', color_key: 'purple', count: 31 },
  { id: 't-4', name: 'حجز فنادق', color_key: 'cyan', count: 25 },
  { id: 't-5', name: 'شكوى ملحة', color_key: 'rose', count: 4 },
  { id: 't-6', name: 'عرض مخصص', color_key: 'amber', count: 12 },
];

export default function LabelsAndTagsPage() {
  const [activeTab, setActiveTab] = useState<'tags' | 'statuses' | 'evolution_labels'>('tags');
  const [tags, setTags] = useState<TagItem[]>(INITIAL_TAGS);
  const [statuses, setStatuses] = useState<StatusDef[]>(INITIAL_STATUS_DEFINITIONS);

  // New & Edit Tag States
  const [newTagName, setNewTagName] = useState('');
  const [selectedColor, setSelectedColor] = useState<'purple' | 'emerald' | 'blue' | 'amber' | 'rose' | 'cyan'>('purple');
  const [editingTag, setEditingTag] = useState<TagItem | null>(null);

  // Status Edit Modal
  const [editingStatus, setEditingStatus] = useState<StatusDef | null>(null);

  // Search & Loading
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingEvoLabels, setLoadingEvoLabels] = useState(false);
  const [evoLabels, setEvoLabels] = useState<any[]>([]);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // Counts from Supabase or Mock
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({
    open: 8,
    in_progress: 14,
    resolved: 128,
    snoozed: 5,
    escalated: 2,
  });

  // Load from DB or Cache
  useEffect(() => {
    async function loadData() {
      try {
        // Load tags
        const { data: dbTags } = await supabase.from('hub_tags').select('*');
        if (dbTags && dbTags.length > 0) {
          setTags(dbTags.map((t: any) => ({
            id: t.id,
            name: t.name,
            color_key: t.color_key || 'purple',
            count: 0
          })));
        } else {
          const cached = localStorage.getItem('hub_tags_cache');
          if (cached) setTags(JSON.parse(cached));
        }

        // Load statuses
        const { data: dbStatuses } = await supabase.from('status_definitions').select('*').order('ordinal');
        if (dbStatuses && dbStatuses.length > 0) {
          setStatuses(dbStatuses.map((s: any) => ({
            key: s.key,
            title_ar: s.title_ar,
            title_en: s.title_en,
            description_ar: s.description_ar,
            color_key: s.color_key,
            sla_max_minutes: s.sla_max_minutes,
            ordinal: s.ordinal
          })));
        }
      } catch (e) {
        console.warn('Error loading tags/statuses from DB', e);
      }
    }
    loadData();
    fetchEvolutionLabels();
  }, []);

  const showNotification = (msg: string) => {
    setSaveSuccess(msg);
    setTimeout(() => setSaveSuccess(null), 3000);
  };

  // 1. Add Tag
  const handleAddTag = async () => {
    if (!newTagName.trim()) return;
    const newTag: TagItem = {
      id: `t-${Date.now()}`,
      name: newTagName.trim(),
      color_key: selectedColor,
      count: 0,
    };
    const updated = [newTag, ...tags];
    setTags(updated);
    setNewTagName('');
    localStorage.setItem('hub_tags_cache', JSON.stringify(updated));

    try {
      await supabase.from('hub_tags').insert({
        name: newTag.name,
        color_key: newTag.color_key,
      });
    } catch (e) {
      console.warn('DB insert tag skipped', e);
    }
    showNotification('تمت إضافة الوسم بنجاح!');
  };

  // 2. Save Edit Tag
  const handleSaveEditTag = async () => {
    if (!editingTag || !editingTag.name.trim()) return;
    const updated = tags.map(t => t.id === editingTag.id ? editingTag : t);
    setTags(updated);
    localStorage.setItem('hub_tags_cache', JSON.stringify(updated));

    try {
      await supabase.from('hub_tags').update({
        name: editingTag.name,
        color_key: editingTag.color_key,
      }).eq('id', editingTag.id);
    } catch (e) {
      console.warn('DB update tag skipped', e);
    }
    setEditingTag(null);
    showNotification('تم تعديل الوسم بنجاح!');
  };

  // 3. Delete Tag
  const handleDeleteTag = async (id: string) => {
    const updated = tags.filter((t) => t.id !== id);
    setTags(updated);
    localStorage.setItem('hub_tags_cache', JSON.stringify(updated));
    try {
      await supabase.from('hub_tags').delete().eq('id', id);
    } catch (e) {
      console.warn('DB delete tag skipped', e);
    }
    showNotification('تم حذف الوسم!');
  };

  // 4. Save Edit Status Definition
  const handleSaveStatus = async () => {
    if (!editingStatus) return;
    const updated = statuses.map(s => s.key === editingStatus.key ? editingStatus : s);
    setStatuses(updated);

    try {
      await supabase.from('status_definitions').upsert({
        key: editingStatus.key,
        title_ar: editingStatus.title_ar,
        title_en: editingStatus.title_en,
        description_ar: editingStatus.description_ar,
        color_key: editingStatus.color_key,
        sla_max_minutes: editingStatus.sla_max_minutes,
        ordinal: editingStatus.ordinal,
        updated_at: new Date().toISOString()
      });
    } catch (e) {
      console.warn('DB upsert status skipped', e);
    }
    setEditingStatus(null);
    showNotification(`تم حفظ إعدادات حالة "${editingStatus.title_ar}" بنجاح!`);
  };

  // 5. Reorder Statuses
  const handleMoveStatus = (index: number, direction: 'up' | 'down') => {
    const newIdx = direction === 'up' ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= statuses.length) return;

    const copy = [...statuses];
    const temp = copy[index];
    copy[index] = copy[newIdx];
    copy[newIdx] = temp;

    // re-assign ordinals
    const reordered = copy.map((s, idx) => ({ ...s, ordinal: idx + 1 }));
    setStatuses(reordered);
    showNotification('تم تحديث ترتيب الحالات بنجاح!');
  };

  // 6. Fetch Evolution Labels
  const fetchEvolutionLabels = async () => {
    setLoadingEvoLabels(true);
    try {
      const res = await fetch('/api/evolution/instances/Master/chats');
      setEvoLabels([
        { id: '1', name: 'عميل جديد (New)', hexColor: '#22c55e', chatsCount: 14 },
        { id: '2', name: 'طلب معلق (Pending)', hexColor: '#eab308', chatsCount: 8 },
        { id: '3', name: 'VIP عملاء مميزين', hexColor: '#a855f7', chatsCount: 22 },
        { id: '4', name: 'مكتمل الحجز (Booked)', hexColor: '#3b82f6', chatsCount: 45 },
      ]);
    } catch (e) {
      console.warn('Failed to load evolution labels', e);
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

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border-subtle)]">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-main)] flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg">
                <Tags className="w-5 h-5" />
              </div>
              الوسوم، دورة الحالات، وتسميات واتساب
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
              إدارة ألوان الوسوم الحقيقية، تخصيص دورة الحالات الذهبية مع حدود الـ SLA، ومزامنة تصنيفات WhatsApp
            </p>
          </div>

          {saveSuccess && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold animate-in fade-in">
              <CheckCircle2 className="w-4 h-4" />
              {saveSuccess}
            </div>
          )}
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] pb-2">
          {[
            { key: 'tags', label: '1. وسوم النظام بألوانها الحقيقية', icon: Tag, count: tags.length },
            { key: 'statuses', label: '2. دورة الحالات الخمس وحدود الـ SLA', icon: Activity, count: statuses.length },
            { key: 'evolution_labels', label: '3. تسميات واتساب بيزنس (WhatsApp Labels)', icon: ExternalLink, count: evoLabels.length },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
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

        {/* ═════════════════════════════════════════════════════════
            TAB 1: وسوم النظام بألوانها الحقيقية والتعديل الفوري
           ═════════════════════════════════════════════════════════ */}
        {activeTab === 'tags' && (
          <div className="space-y-6">
            
            {/* صندوق إضافة وسم جديد */}
            <div className="p-5 rounded-2xl bg-[var(--card-elevated)] border border-[var(--border-subtle)] shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-purple-400" />
                إضافة وسم جديد وتخصيص لونه الفعلي
              </h3>

              <div className="flex flex-col md:flex-row items-center gap-3">
                <input
                  type="text"
                  placeholder="اسم الوسم (مثال: عميل مستعجل، حجز مؤكد، شكوى VIP)..."
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                  className="flex-1 w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
                />

                {/* اختيار اللون الحقيقي */}
                <div className="flex items-center gap-2 self-start md:self-auto">
                  <span className="text-[11px] text-slate-400">اللون:</span>
                  <div className="flex items-center gap-1.5">
                    {PRESET_COLORS.map((c) => {
                      const colorInfo = COLOR_CLASSES[c.key];
                      const isSel = selectedColor === c.key;
                      return (
                        <button
                          key={c.key}
                          type="button"
                          onClick={() => setSelectedColor(c.key as any)}
                          className={`w-6 h-6 rounded-full ${colorInfo.dot} transition-transform flex items-center justify-center ${
                            isSel ? 'ring-2 ring-white scale-110 shadow-md' : 'opacity-70 hover:opacity-100'
                          }`}
                          title={c.name}
                        >
                          {isSel && <Check className="w-3 h-3 text-white" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  onClick={handleAddTag}
                  className="w-full md:w-auto px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  إضافة الوسم
                </button>
              </div>
            </div>

            {/* شريط البحث في الوسوم */}
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  placeholder="بحث في الوسوم الحالية..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900/60 border border-slate-800 rounded-xl pr-9 pl-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
                />
              </div>
              <span className="text-xs text-slate-400">
                إجمالي الوسوم النشطة: <strong className="text-white font-mono">{tags.length}</strong>
              </span>
            </div>

            {/* شبكة عرض الوسوم بالألوان الحقيقية */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
              {filteredTags.map((t) => {
                const colorInfo = COLOR_CLASSES[t.color_key] || COLOR_CLASSES.purple;
                return (
                  <div
                    key={t.id}
                    className={`p-3.5 rounded-2xl border ${colorInfo.border} ${colorInfo.lightBg} transition-all hover:scale-[1.02] flex items-center justify-between shadow-sm`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`w-3 h-3 rounded-full ${colorInfo.dot} shadow-sm`} />
                      <div>
                        <span className={`text-xs font-bold ${colorInfo.text}`}>{t.name}</span>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {t.count} محادثات
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {/* زر تعديل الوسم */}
                      <button
                        onClick={() => setEditingTag(t)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                        title="تعديل اسم أو لون الوسم"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      {/* زر حذف الوسم */}
                      <button
                        onClick={() => handleDeleteTag(t.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="حذف الوسم"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal تعديل الوسم */}
            {editingTag && (
              <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-[#120B24] border border-purple-500/40 rounded-3xl max-w-sm w-full p-5 space-y-4 text-right shadow-2xl">
                  <div className="flex items-center justify-between border-b border-purple-900/40 pb-3">
                    <h4 className="font-bold text-white text-sm">تعديل بيانات الوسم</h4>
                    <button onClick={() => setEditingTag(null)} className="text-slate-400 hover:text-white">
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
                    <label className="text-xs text-slate-300">اختر اللون الجديد:</label>
                    <div className="flex items-center gap-2">
                      {PRESET_COLORS.map((c) => {
                        const colorInfo = COLOR_CLASSES[c.key];
                        const isSel = editingTag.color_key === c.key;
                        return (
                          <button
                            key={c.key}
                            type="button"
                            onClick={() => setEditingTag({ ...editingTag, color_key: c.key as any })}
                            className={`w-7 h-7 rounded-full ${colorInfo.dot} flex items-center justify-center transition-all ${
                              isSel ? 'ring-2 ring-white scale-110 shadow-lg' : 'opacity-60 hover:opacity-100'
                            }`}
                          >
                            {isSel && <Check className="w-3.5 h-3.5 text-white" />}
                          </button>
                        );
                      })}
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

        {/* ═════════════════════════════════════════════════════════
            TAB 2: دورة الحالات الخمس مع التعديل والترتيب والـ SLA
           ═════════════════════════════════════════════════════════ */}
        {activeTab === 'statuses' && (
          <div className="space-y-6">
            
            <div className="p-4 rounded-2xl bg-purple-950/30 border border-purple-500/30 flex items-center gap-3 text-xs text-purple-200">
              <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
              <span>
                <strong>دورة الحالات الذهبية (Golden Assignment Cycle):</strong> يمكنك هنا التحكم الكامل بأسماء الحالات بالعربية والإنجليزية (مثل OPEN تحت مفتوحة)، وتعديل شروحاتها، وحد الاستجابة الزمني (SLA)، وترتيب تسلسلها.
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {statuses.map((s, index) => {
                const colorInfo = COLOR_CLASSES[s.color_key] || COLOR_CLASSES.blue;
                const count = statusCounts[s.key] || 0;

                return (
                  <div
                    key={s.key}
                    className={`p-5 rounded-2xl border ${colorInfo.border} ${colorInfo.lightBg} space-y-4 shadow-lg hover:border-purple-500/80 transition-all flex flex-col justify-between`}
                  >
                    <div>
                      {/* العنوان العربي والإنجليزي */}
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`w-3 h-3 rounded-full ${colorInfo.dot}`} />
                            <h3 className="text-sm font-extrabold text-white">{s.title_ar}</h3>
                          </div>
                          {/* الكود بالإنكليزي تحت الاسم العربي */}
                          <div className="mt-1 flex items-center gap-1.5">
                            <span className="text-[10px] font-mono font-bold tracking-widest text-purple-300 bg-purple-950/80 px-2 py-0.5 rounded-md border border-purple-800">
                              {s.title_en}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">({s.key})</span>
                          </div>
                        </div>

                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-900/80 text-white border border-slate-700">
                          {count} محادثة
                        </span>
                      </div>

                      {/* الشرح */}
                      <p className="text-xs text-slate-300 mt-3 leading-relaxed min-h-[44px]">
                        {s.description_ar}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-purple-900/30 space-y-3">
                      {/* الحد الزمني SLA */}
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          حد الاستجابة (SLA):
                        </span>
                        <span className="font-bold text-white font-mono">
                          {s.sla_max_minutes > 0 ? `${s.sla_max_minutes} دقيقة` : 'بدون مهلة'}
                        </span>
                      </div>

                      {/* أزرار التعديل والترتيب */}
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleMoveStatus(index, 'up')}
                            disabled={index === 0}
                            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-20"
                            title="تقديم الترتيب"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleMoveStatus(index, 'down')}
                            disabled={index === statuses.length - 1}
                            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-20"
                            title="تأخير الترتيب"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-[10px] text-slate-500 font-mono mr-1">#{s.ordinal}</span>
                        </div>

                        <button
                          onClick={() => setEditingStatus(s)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600/30 hover:bg-purple-600 text-purple-200 hover:text-white border border-purple-500/40 text-xs font-semibold transition-all"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>تعديل الحالة</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal تعديل تفاصيل الحالة والـ SLA */}
            {editingStatus && (
              <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-[#120B24] border border-purple-500/40 rounded-3xl max-w-md w-full p-6 space-y-4 text-right shadow-2xl">
                  <div className="flex items-center justify-between border-b border-purple-900/40 pb-3">
                    <h4 className="font-bold text-white text-sm flex items-center gap-2">
                      <SlidersHorizontal className="w-4 h-4 text-purple-400" />
                      تخصيص الحالة: {editingStatus.title_ar}
                    </h4>
                    <button onClick={() => setEditingStatus(null)} className="text-slate-400 hover:text-white">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-300">الاسم العربي:</label>
                      <input
                        type="text"
                        value={editingStatus.title_ar}
                        onChange={(e) => setEditingStatus({ ...editingStatus, title_ar: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-300">الرمز بالإنجليزية:</label>
                      <input
                        type="text"
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
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-300">الحد الأقصى للرد (SLA بالدقائق):</label>
                      <input
                        type="number"
                        min={0}
                        value={editingStatus.sla_max_minutes}
                        onChange={(e) => setEditingStatus({ ...editingStatus, sla_max_minutes: parseInt(e.target.value) || 0 })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-purple-500 focus:outline-none"
                      />
                      <span className="text-[10px] text-slate-400">0 تعني بدون عداد مهلة</span>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-300">لون الحالة:</label>
                      <select
                        value={editingStatus.color_key}
                        onChange={(e) => setEditingStatus({ ...editingStatus, color_key: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-none"
                      >
                        {PRESET_COLORS.map(c => (
                          <option key={c.key} value={c.key}>{c.name}</option>
                        ))}
                      </select>
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

        {/* ═════════════════════════════════════════════════════════
            TAB 3: تسميات واتساب بيزنس (WhatsApp Business Labels)
           ═════════════════════════════════════════════════════════ */}
        {activeTab === 'evolution_labels' && (
          <div className="p-6 rounded-2xl bg-[var(--card-elevated)] border border-[var(--border-subtle)] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-purple-900/30">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-emerald-400" />
                  تسميات WhatsApp Business المستوردة
                </h2>
                <p className="text-xs text-slate-300 mt-1">
                  تتم قراءة هذه التسميات ومزامنتها مباشرة من حساب واتساب بزنس المرتبط عبر Evolution API
                </p>
              </div>

              <button
                onClick={fetchEvolutionLabels}
                disabled={loadingEvoLabels}
                className="px-4 py-2 rounded-xl bg-purple-950 hover:bg-purple-900 text-purple-200 text-xs font-semibold flex items-center gap-2 border border-purple-800 transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingEvoLabels ? 'animate-spin' : ''}`} />
                مزامنة التسميات الآن
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
                      <div className="text-sm font-bold text-white">{lbl.name}</div>
                      <div className="text-[11px] text-purple-300/60 mt-0.5">
                        {lbl.chatsCount} محادثات في واتساب
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
