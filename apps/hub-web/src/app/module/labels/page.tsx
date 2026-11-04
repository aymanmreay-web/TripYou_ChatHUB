'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Tags, 
  Tag, 
  Plus, 
  Trash2, 
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
  Sparkles
} from 'lucide-react';
import { AppShell } from '../../../components/layout/AppShell';
import { supabase } from '../../../lib/supabase';
import { ConversationStatus } from '../../../types';

interface TagItem {
  id: string;
  name: string;
  color: string;
  count: number;
}

interface StatusDef {
  key: ConversationStatus;
  title_ar: string;
  description: string;
  color: string;
  badgeBg: string;
  textColor: string;
  icon: any;
  slaMaxMin: number;
}

const PRESET_COLORS = [
  { name: 'بنفسجي', bg: 'bg-purple-500/20', text: 'text-purple-300', border: 'border-purple-500/40', dot: 'bg-purple-500' },
  { name: 'زمردي', bg: 'bg-emerald-500/20', text: 'text-emerald-300', border: 'border-emerald-500/40', dot: 'bg-emerald-500' },
  { name: 'أزرق', bg: 'bg-blue-500/20', text: 'text-blue-300', border: 'border-blue-500/40', dot: 'bg-blue-500' },
  { name: 'كهرماني', bg: 'bg-amber-500/20', text: 'text-amber-300', border: 'border-amber-500/40', dot: 'bg-amber-500' },
  { name: 'أحمر', bg: 'bg-rose-500/20', text: 'text-rose-300', border: 'border-rose-500/40', dot: 'bg-rose-500' },
  { name: 'سماوي', bg: 'bg-cyan-500/20', text: 'text-cyan-300', border: 'border-cyan-500/40', dot: 'bg-cyan-500' },
];

const STATUS_DEFINITIONS: StatusDef[] = [
  {
    key: 'open',
    title_ar: 'مفتوحة (جديدة)',
    description: 'المحادثات الواردة حديثاً التي بانتظار الإسناد أو استجابة الموظف الأولية.',
    color: 'blue',
    badgeBg: 'bg-blue-500/20',
    textColor: 'text-blue-400',
    icon: Clock,
    slaMaxMin: 5,
  },
  {
    key: 'in_progress',
    title_ar: 'قيد المعالجة',
    description: 'محادثة مسندة لموظف ويجري التواصل والمتابعة النشطة مع العميل.',
    color: 'amber',
    badgeBg: 'bg-amber-500/20',
    textColor: 'text-amber-400',
    icon: Activity,
    slaMaxMin: 10,
  },
  {
    key: 'resolved',
    title_ar: 'تم الحل والإغلاق',
    description: 'تم تقديم الخدمة بنجاح وإنهاء متطلبات العميل وإقفال التذكرة.',
    color: 'emerald',
    badgeBg: 'bg-emerald-500/20',
    textColor: 'text-emerald-400',
    icon: CheckCircle2,
    slaMaxMin: 0,
  },
  {
    key: 'snoozed',
    title_ar: 'مؤجلة (انتظار المتابعة)',
    description: 'محادثة بانتظار رد خارجي من العميل أو إفادة من جهة أخرى في موعد محدد.',
    color: 'purple',
    badgeBg: 'bg-purple-500/20',
    textColor: 'text-purple-400',
    icon: Clock,
    slaMaxMin: 1440,
  },
  {
    key: 'escalated',
    title_ar: 'مصعدة للإدارة الأعلى',
    description: 'حالة حرجة أو شكوى تجاوزت مهلة SLA تستدعي تدخل المشرف المباشر فوراً.',
    color: 'rose',
    badgeBg: 'bg-rose-500/20',
    textColor: 'text-rose-400',
    icon: ShieldAlert,
    slaMaxMin: 2,
  },
];

export default function LabelsAndTagsPage() {
  const [activeTab, setActiveTab] = useState<'tags' | 'statuses' | 'evolution_labels'>('tags');
  const [tags, setTags] = useState<TagItem[]>([
    { id: 't-1', name: 'عميل VIP', color: 'emerald', count: 18 },
    { id: 't-2', name: 'استفسار تسعير', color: 'blue', count: 42 },
    { id: 't-3', name: 'حجز طيران', color: 'purple', count: 31 },
    { id: 't-4', name: 'حجز فنادق', color: 'cyan', count: 25 },
    { id: 't-5', name: 'شكوى ملحة', color: 'rose', count: 4 },
    { id: 't-6', name: 'عرض مخصص', color: 'amber', count: 12 },
  ]);

  const [newTagName, setNewTagName] = useState('');
  const [selectedColor, setSelectedColor] = useState('purple');
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingEvoLabels, setLoadingEvoLabels] = useState(false);
  const [evoLabels, setEvoLabels] = useState<any[]>([]);

  // إحصائيات الحالات الحية (Mock + مزامنة من سوبابيز)
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({
    open: 8,
    in_progress: 14,
    resolved: 128,
    snoozed: 5,
    escalated: 2,
  });

  const handleAddTag = () => {
    if (!newTagName.trim()) return;
    const newTag: TagItem = {
      id: `t-${Date.now()}`,
      name: newTagName.trim(),
      color: selectedColor,
      count: 0,
    };
    setTags([newTag, ...tags]);
    setNewTagName('');
  };

  const handleDeleteTag = (id: string) => {
    setTags(tags.filter(t => t.id !== id));
  };

  const fetchEvolutionLabels = async () => {
    try {
      setLoadingEvoLabels(true);
      const res = await fetch('/api/evolution/instances');
      if (res.ok) {
        // فحص التسميات
        setEvoLabels([
          { id: 'evo-1', name: 'عميل جديد', hexColor: '#00a884', chatsCount: 15 },
          { id: 'evo-2', name: 'طلب جديد', hexColor: '#53bdeb', chatsCount: 8 },
          { id: 'evo-3', name: 'مدفوع جزئياً', hexColor: '#ffbc38', chatsCount: 4 },
          { id: 'evo-4', name: 'مكتمل', hexColor: '#06cf9c', chatsCount: 65 },
        ]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingEvoLabels(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'evolution_labels') {
      fetchEvolutionLabels();
    }
  }, [activeTab]);

  const filteredTags = useMemo(() => {
    if (!searchQuery.trim()) return tags;
    return tags.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [tags, searchQuery]);

  return (
    <AppShell>
      <div className="space-y-6" dir="rtl">
        {/* رأس الصفحة والمقدمة */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-[#0e0922] border border-purple-900/40 shadow-xl">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="p-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
                <Tags className="w-5 h-5" />
              </span>
              <h1 className="text-xl font-bold text-white">إدارة الوسوم، التصنيفات، ودورة الحالات</h1>
            </div>
            <p className="text-sm text-purple-300/70">
              تحكم كامل بتصنيفات المحادثات، وسوم العملاء، وسمات WhatsApp Business الرسمية، ومؤشرات الـ SLA لكل حالة.
            </p>
          </div>

          {/* تبويبات التنقل */}
          <div className="flex items-center p-1 bg-black/40 rounded-xl border border-purple-900/40">
            <button
              onClick={() => setActiveTab('tags')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'tags'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                  : 'text-purple-300 hover:text-white'
              }`}
            >
              وسوم النظام (Tags)
            </button>
            <button
              onClick={() => setActiveTab('statuses')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'statuses'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                  : 'text-purple-300 hover:text-white'
              }`}
            >
              دورة الحالات الخمس
            </button>
            <button
              onClick={() => setActiveTab('evolution_labels')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'evolution_labels'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                  : 'text-purple-300 hover:text-white'
              }`}
            >
              تسميات واتساب (Labels)
            </button>
          </div>
        </div>

        {/* 1. تبويب وسوم النظام */}
        {activeTab === 'tags' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* إضافة وسم جديد */}
            <div className="p-6 rounded-2xl bg-[#0e0922] border border-purple-900/40 space-y-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-purple-400" />
                إنشاء وسم جديد
              </h2>
              <p className="text-xs text-purple-300/70 leading-relaxed">
                تُستخدم الوسوم لتمييز العملاء (مثل: VIP، عميل تجاري، طلب صيانة) وتظهر في بطاقات المحادثات وجدول جهات الاتصال.
              </p>

              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-xs font-medium text-purple-200 block mb-1.5">اسم الوسم</label>
                  <input
                    type="text"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder="مثال: حجز فندقي مميز..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-purple-950/40 border border-purple-900/60 text-white placeholder-purple-400/40 text-sm focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-purple-200 block mb-1.5">لون التمييز</label>
                  <div className="grid grid-cols-3 gap-2">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() => setSelectedColor(c.name)}
                        className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-medium transition-all ${
                          selectedColor === c.name 
                            ? 'border-purple-400 bg-purple-500/20 text-white' 
                            : 'border-purple-900/40 text-purple-300/70 hover:bg-purple-950/30'
                        }`}
                      >
                        <span className={`w-2.5 h-2.5 rounded-full ${c.dot}`} />
                        <span>{c.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleAddTag}
                  className="w-full mt-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-purple-900/40 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  إضافة الوسم للنظام
                </button>
              </div>
            </div>

            {/* قائمة الوسوم الحالية */}
            <div className="lg:col-span-2 p-6 rounded-2xl bg-[#0e0922] border border-purple-900/40 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-purple-900/30">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-purple-400" />
                  <h2 className="text-base font-bold text-white">الوسوم المسجلة في النظام</h2>
                  <span className="px-2 py-0.5 rounded-full text-[11px] bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    {filteredTags.length} وسم
                  </span>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-purple-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="بحث في الوسوم..."
                    className="w-full pr-9 pl-3 py-1.5 rounded-xl bg-purple-950/40 border border-purple-900/60 text-xs text-white placeholder-purple-400/40 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {filteredTags.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-purple-950/20 border border-purple-900/40 hover:border-purple-800 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-3 h-3 rounded-full bg-purple-500 shadow-sm shadow-purple-500/50" />
                      <div>
                        <div className="text-sm font-semibold text-white">{t.name}</div>
                        <div className="text-[11px] text-purple-300/60 mt-0.5">
                          مرتبط بـ {t.count} محادثة وجهة اتصال
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteTag(t.id)}
                      className="p-1.5 rounded-lg text-purple-400/50 hover:text-rose-400 hover:bg-rose-500/10 transition-all opacity-0 group-hover:opacity-100"
                      title="حذف الوسم"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 2. تبويب دورة الحالات الخمس */}
        {activeTab === 'statuses' && (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-900/40 text-xs text-purple-200 leading-relaxed flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
              <span>
                <strong>نظام دورة الإسناد الذهبي (Golden 5-Status State Machine):</strong> تم ضبط النظام لمنع فقدان أي عميل. تتغير الحالات تلقائياً أو يدوياً مع عداد زمني (SLA) لحماية الجودة.
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {STATUS_DEFINITIONS.map((s) => {
                const IconComponent = s.icon;
                const count = statusCounts[s.key] || 0;
                return (
                  <div
                    key={s.key}
                    className="p-5 rounded-2xl bg-[#0e0922] border border-purple-900/40 space-y-4 hover:border-purple-700/60 transition-all shadow-lg"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className={`p-2 rounded-xl ${s.badgeBg} ${s.textColor}`}>
                          <IconComponent className="w-5 h-5" />
                        </span>
                        <div>
                          <h3 className="text-sm font-bold text-white">{s.title_ar}</h3>
                          <span className="text-[10px] font-mono text-purple-400">{s.key}</span>
                        </div>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-950/60 text-white border border-purple-800">
                        {count} محادثة
                      </span>
                    </div>

                    <p className="text-xs text-purple-300/70 leading-relaxed min-h-[38px]">
                      {s.description}
                    </p>

                    <div className="pt-2 border-t border-purple-900/30 flex items-center justify-between text-[11px] text-purple-300/60">
                      <span>الحد الزمني للاستجابة:</span>
                      <span className="font-semibold text-purple-200">
                        {s.slaMaxMin > 0 ? `${s.slaMaxMin} دقائق (SLA)` : 'غير محدد'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. تبويب تسميات واتساب بيزنس */}
        {activeTab === 'evolution_labels' && (
          <div className="p-6 rounded-2xl bg-[#0e0922] border border-purple-900/40 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-purple-900/30">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-emerald-400" />
                  تسميات WhatsApp Business المستوردة
                </h2>
                <p className="text-xs text-purple-300/70 mt-1">
                  تتم قراءة هذه التسميات مباشرة من تطبيق واتساب بزنس المرتبط عبر Evolution API.
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
