'use client';

import React, { useState, useEffect } from 'react';
import {
  PenTool,
  Save,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  CheckCircle2,
  Users,
  Settings2,
  Sparkles,
  AlertTriangle,
  RefreshCw,
  PhoneCall,
  Sliders,
  HelpCircle,
  ShieldCheck,
  Send
} from 'lucide-react';
import { AppShell } from '../../../components/layout/AppShell';
import { supabase } from '../../../lib/supabase';

interface SignaturePartConfig {
  enabled: boolean;
  label_ar: string;
  template: string;
  editable_by: 'none' | 'staff' | 'admin';
  required: boolean; // هل إرساله إجباري لا يمكن للموظف إخفاؤه
}

interface SignatureGlobalConfig {
  part1: SignaturePartConfig;
  part2: SignaturePartConfig;
  part3: SignaturePartConfig;
  separator: string;
  send_mode: 'always' | 'first_only' | 'manual' | 'disabled';
}

interface StaffSignatureSetting {
  id: string;
  name: string;
  role: string;
  default_line: string;
  allow_custom_edit: boolean;
  can_disable_signature: boolean;
  custom_part1: string;
  custom_part2: string;
  custom_part3: string;
  is_active: boolean;
}

const INITIAL_CONFIG: SignatureGlobalConfig = {
  part1: {
    enabled: true,
    label_ar: 'القسم الأول: اسم الموظف والصفة المهنية',
    template: '{{staff_name}} ({{staff_role}})',
    editable_by: 'staff',
    required: true,
  },
  part2: {
    enabled: true,
    label_ar: 'القسم الثاني: اسم الخط أو القسم الرسمي',
    template: 'واتساب {{line_title}}',
    editable_by: 'admin',
    required: false,
  },
  part3: {
    enabled: true,
    label_ar: 'القسم الثالث: خاتمة المؤسسة والشعار',
    template: 'TripYou للسياحة والسفر ✈️',
    editable_by: 'admin',
    required: false,
  },
  separator: ' — ',
  send_mode: 'always',
};

const INITIAL_STAFF: StaffSignatureSetting[] = [
  {
    id: '1',
    name: 'م. أيمن مريعي',
    role: 'مسؤول النظام الأعلى',
    default_line: 'الرئيسي (Master)',
    allow_custom_edit: true,
    can_disable_signature: true,
    custom_part1: '*م. أيمن مريعي* (المدير العام)',
    custom_part2: 'الإدارة العامة',
    custom_part3: 'TripYou Travel & Tourism',
    is_active: true,
  },
  {
    id: '2',
    name: 'سارة خالد',
    role: 'مدير المبيعات',
    default_line: 'مبيعات 2',
    allow_custom_edit: true,
    can_disable_signature: false,
    custom_part1: '*سارة خالد* (مبيعات وحجوزات)',
    custom_part2: 'قسم المبيعات 2',
    custom_part3: 'TripYou Travel ✈️',
    is_active: true,
  },
  {
    id: '3',
    name: 'محمد العمر',
    role: 'خدمة عملاء',
    default_line: 'مبيعات 1',
    allow_custom_edit: false,
    can_disable_signature: false,
    custom_part1: '*محمد العمر* (خدمة العملاء)',
    custom_part2: 'خدمة عملاء TripYou',
    custom_part3: 'TripYou Support',
    is_active: true,
  },
];

export default function SignatureSettingsPage() {
  const [activeTab, setActiveTab] = useState<'parts' | 'staff_permissions' | 'policy'>('parts');
  const [config, setConfig] = useState<SignatureGlobalConfig>(INITIAL_CONFIG);
  const [staffList, setStaffList] = useState<StaffSignatureSetting[]>(INITIAL_STAFF);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [selectedStaffForPreview, setSelectedStaffForPreview] = useState<StaffSignatureSetting>(INITIAL_STAFF[0]);

  // Load from Supabase or localStorage
  useEffect(() => {
    async function loadSettings() {
      try {
        const { data, error } = await supabase
          .from('signature_settings')
          .select('*')
          .eq('scope_type', 'system')
          .maybeSingle();

        if (data && !error) {
          setConfig({
            part1: {
              enabled: data.part1_enabled ?? true,
              label_ar: data.part1_label_ar || INITIAL_CONFIG.part1.label_ar,
              template: data.part1_template || INITIAL_CONFIG.part1.template,
              editable_by: data.part1_editable_by || 'staff',
              required: data.part1_required ?? true,
            },
            part2: {
              enabled: data.part2_enabled ?? true,
              label_ar: data.part2_label_ar || INITIAL_CONFIG.part2.label_ar,
              template: data.part2_template || INITIAL_CONFIG.part2.template,
              editable_by: data.part2_editable_by || 'admin',
              required: data.part2_required ?? false,
            },
            part3: {
              enabled: data.part3_enabled ?? true,
              label_ar: data.part3_label_ar || INITIAL_CONFIG.part3.label_ar,
              template: data.part3_template || INITIAL_CONFIG.part3.template,
              editable_by: data.part3_editable_by || 'admin',
              required: data.part3_required ?? false,
            },
            separator: data.separator || ' — ',
            send_mode: data.send_mode || 'always',
          });
        } else {
          const cached = localStorage.getItem('hub_signature_config');
          if (cached) setConfig(JSON.parse(cached));
        }
      } catch (e) {
        console.warn('Could not load signature settings from DB, using cache', e);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      localStorage.setItem('hub_signature_config', JSON.stringify(config));
      localStorage.setItem('hub_signature_staff', JSON.stringify(staffList));

      // Sync to Supabase
      await supabase
        .from('signature_settings')
        .upsert({
          scope_type: 'system',
          scope_id: null,
          part1_enabled: config.part1.enabled,
          part1_template: config.part1.template,
          part1_editable_by: config.part1.editable_by,
          part1_required: config.part1.required,
          part2_enabled: config.part2.enabled,
          part2_template: config.part2.template,
          part2_editable_by: config.part2.editable_by,
          part2_required: config.part2.required,
          part3_enabled: config.part3.enabled,
          part3_template: config.part3.template,
          part3_editable_by: config.part3.editable_by,
          part3_required: config.part3.required,
          send_mode: config.send_mode,
          separator: config.separator,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'scope_type,scope_id' });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      console.error('Error saving signature settings:', e);
    } finally {
      setSaving(false);
    }
  };

  // Generate live preview string based on chosen staff
  const generatePreview = (st: StaffSignatureSetting) => {
    if (config.send_mode === 'disabled') return '(التوقيع معطل برمجياً على مستوى النظام)';

    const parts: string[] = [];
    if (config.part1.enabled) {
      const p1 = st.allow_custom_edit && st.custom_part1 ? st.custom_part1 : `*${st.name}*`;
      parts.push(p1);
    }
    if (config.part2.enabled) {
      const p2 = st.allow_custom_edit && st.custom_part2 ? st.custom_part2 : `واتساب ${st.default_line}`;
      parts.push(p2);
    }
    if (config.part3.enabled) {
      const p3 = st.allow_custom_edit && st.custom_part3 ? st.custom_part3 : config.part3.template;
      parts.push(p3);
    }

    return parts.join(config.separator);
  };

  return (
    <AppShell>
      <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border-subtle)]">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-main)] flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg">
                <PenTool className="w-5 h-5" />
              </div>
              محرك إدارة التوقيع المتقدم (3-Part Signature Engine)
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
              التحكم في الأقسام الثلاثية، الصلاحيات الفردية لكل موظف، الإرسال الإجباري والتخصيص التلقائي
            </p>
          </div>

          <div className="flex items-center gap-3">
            {saveSuccess && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/30 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4" />
                تم حفظ التوقيع بنجاح!
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-purple-950/40 transition-all disabled:opacity-50"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              حفظ التعديلات في النظام
            </button>
          </div>
        </div>

        {/* Live WhatsApp Simulation Card */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-[#120B24] via-[#1a0f38] to-[#0e071e] border-2 border-purple-500/40 shadow-2xl space-y-3">
          <div className="flex items-center justify-between border-b border-purple-500/20 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-purple-200">معاينة حية فورية لشكل الرسالة الصادرة في واتساب</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <span>الموظف المعاين:</span>
              <select
                value={selectedStaffForPreview.id}
                onChange={(e) => {
                  const s = staffList.find(st => st.id === e.target.value);
                  if (s) setSelectedStaffForPreview(s);
                }}
                className="bg-purple-950/80 border border-purple-500/40 rounded-xl px-2 py-1 text-xs text-white focus:outline-none"
              >
                {staffList.map(st => (
                  <option key={st.id} value={st.id}>{st.name} ({st.role})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-[#0b141a] rounded-2xl p-4 max-w-lg mx-auto border border-emerald-500/20 shadow-inner">
            <div className="bg-[#005c4b] text-white p-3 rounded-2xl rounded-tl-none shadow text-xs sm:text-sm space-y-2">
              <p>مرحباً بك أستاذ عبدالله، بخصوص حجز الطيران إلى إسطنبول تم تأكيد التذاكر وإرسالها إلى بريدك الإلكتروني.</p>
              
              {/* التوقيع الفعلي */}
              <div className="pt-2 border-t border-emerald-400/20 text-[11px] text-emerald-100/90 font-sans whitespace-pre-wrap flex items-center justify-between">
                <span>{generatePreview(selectedStaffForPreview)}</span>
                <span className="text-[9px] text-emerald-200/60 font-mono">11:45 ص ✓✓</span>
              </div>
            </div>
          </div>
          <div className="text-center text-[10px] text-purple-300/60">
            * هذا الشكل هو ما يظهر فعلياً للعميل في واتساب عند إرسال الرسالة من محرر الرد
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] pb-2">
          {[
            { key: 'parts', label: '1. هيكل وأقسام التوقيع الثلاثية', icon: Sliders },
            { key: 'staff_permissions', label: '2. صلاحيات الموظفين والتعديل والإلزام', icon: Users },
            { key: 'policy', label: '3. سياسة الإرسال والتكرار', icon: Send },
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
              </button>
            );
          })}
        </div>

        {/* ═══ TAB 1: هيكل الأقسام الثلاثية ═══ */}
        {activeTab === 'parts' && (
          <div className="space-y-4">
            {/* فاصل التوقيع */}
            <div className="p-4 rounded-2xl bg-[var(--card-elevated)] border border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-bold text-white">الفاصل بين أجزاء التوقيع</h3>
                <p className="text-[11px] text-[var(--text-muted)]">الرمز أو الكلمة الفاصلة بين اسم الموظف واسم الخط واسم المؤسسة</p>
              </div>
              <div className="flex items-center gap-2">
                {[' — ', ' | ', ' • ', '\n'].map((sep, idx) => (
                  <button
                    key={idx}
                    onClick={() => setConfig({ ...config, separator: sep })}
                    className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all ${
                      config.separator === sep
                        ? 'bg-purple-600 text-white border border-purple-400'
                        : 'bg-slate-900 text-slate-300 border border-slate-700 hover:border-purple-500'
                    }`}
                  >
                    {sep === '\n' ? 'سطر جديد [↵]' : `[ ${sep.trim()} ]`}
                  </button>
                ))}
              </div>
            </div>

            {/* الأقسام الثلاثة */}
            {(['part1', 'part2', 'part3'] as const).map((partKey, index) => {
              const part = config[partKey];
              return (
                <div
                  key={partKey}
                  className={`p-5 rounded-2xl border transition-all ${
                    part.enabled
                      ? 'bg-[var(--card-elevated)] border-purple-500/40 shadow-sm'
                      : 'bg-slate-950/40 border-slate-800 opacity-60'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]">
                    <div className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold ${
                        part.enabled ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-500'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">{part.label_ar}</h4>
                        <span className="text-[10px] text-purple-400 font-mono">
                          {partKey === 'part1' ? 'Staff Name & Role' : partKey === 'part2' ? 'Line or Department' : 'Company Branding'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* زر الظهور / الإخفاء */}
                      <button
                        onClick={() => {
                          setConfig({
                            ...config,
                            [partKey]: { ...part, enabled: !part.enabled }
                          });
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                          part.enabled
                            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                            : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                        }`}
                      >
                        {part.enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        <span>{part.enabled ? 'مفعّل ويظهر' : 'مخفي نهائياً'}</span>
                      </button>

                      {/* زر الإلزام الإجباري */}
                      <button
                        onClick={() => {
                          setConfig({
                            ...config,
                            [partKey]: { ...part, required: !part.required }
                          });
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                          part.required
                            ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                        title="هل إرساله إجباري بحيث لا يستطيع الموظف حذفه يدوياً"
                      >
                        {part.required ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                        <span>{part.required ? 'إجباري بالرسالة' : 'اختياري للموظف'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                    {/* القالب النصي */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">القالب الافتراضي للنظام:</label>
                      <input
                        type="text"
                        value={part.template}
                        onChange={(e) => {
                          setConfig({
                            ...config,
                            [partKey]: { ...part, template: e.target.value }
                          });
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-purple-500 focus:outline-none"
                      />
                      <span className="text-[10px] text-slate-400">
                        يدعم المتغيرات: {'{{staff_name}}'}, {'{{line_title}}'}, {'{{staff_role}}'}
                      </span>
                    </div>

                    {/* صلاحية التعديل */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">من يملك صلاحية تعديل هذا الجزء؟</label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { key: 'none', label: 'ممنوع (ثابت)' },
                          { key: 'staff', label: 'الموظف نفسه' },
                          { key: 'admin', label: 'المدير فقط' },
                        ].map((opt) => (
                          <button
                            key={opt.key}
                            onClick={() => {
                              setConfig({
                                ...config,
                                [partKey]: { ...part, editable_by: opt.key as any }
                              });
                            }}
                            className={`py-2 px-2 rounded-xl text-xs font-semibold border transition-all ${
                              part.editable_by === opt.key
                                ? 'bg-purple-600/30 text-purple-200 border-purple-500'
                                : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-white'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {part.editable_by === 'staff' ? 'يستطيع الموظف وضع لقبه المفضل من ملفه الشخصي' : 'يتم فرضه مركزياً من النظام والمدير فقط'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ═══ TAB 2: صلاحيات الموظفين والتعديل والإلزام ═══ */}
        {activeTab === 'staff_permissions' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-purple-950/20 border border-purple-500/30 flex items-center gap-3 text-xs text-purple-200">
              <ShieldCheck className="w-5 h-5 text-purple-400 shrink-0" />
              <span>
                <strong>نظام الصلاحيات الفردية للتوقيع:</strong> يمكنك هنا تخصيص توقيع كل موظف على حدة، وتحديد ما إذا كان يُسمح له بتعديل توقيعه، أو ما إذا كان يمكنه إلغاء التوقيع عند الحاجة.
              </span>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-[var(--border-subtle)] bg-[var(--card-elevated)]">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] bg-slate-900/60 text-slate-400">
                    <th className="p-3.5 font-bold">الموظف والدور</th>
                    <th className="p-3.5 font-bold">الخط الافتراضي</th>
                    <th className="p-3.5 font-bold text-center">صلاحية التعديل الشخصي</th>
                    <th className="p-3.5 font-bold text-center">السماح بعدم الإرسال (اختياري)</th>
                    <th className="p-3.5 font-bold">التوقيع المخصص الفعلي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {staffList.map((st) => (
                    <tr key={st.id} className="hover:bg-purple-900/10 transition-colors">
                      <td className="p-3.5">
                        <div className="font-bold text-white text-sm">{st.name}</div>
                        <div className="text-[10px] text-purple-400">{st.role}</div>
                      </td>

                      <td className="p-3.5">
                        <span className="px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-medium">
                          {st.default_line}
                        </span>
                      </td>

                      {/* صلاحية التعديل */}
                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => {
                            setStaffList(staffList.map(s => s.id === st.id ? { ...s, allow_custom_edit: !s.allow_custom_edit } : s));
                          }}
                          className={`px-3 py-1 rounded-xl text-xs font-semibold border transition-all ${
                            st.allow_custom_edit
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                          }`}
                        >
                          {st.allow_custom_edit ? 'مسموح له بالتعديل' : 'ممنوع (مقفل)'}
                        </button>
                      </td>

                      {/* السماح بعدم الإرسال */}
                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => {
                            setStaffList(staffList.map(s => s.id === st.id ? { ...s, can_disable_signature: !s.can_disable_signature } : s));
                          }}
                          className={`px-3 py-1 rounded-xl text-xs font-semibold border transition-all ${
                            st.can_disable_signature
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          {st.can_disable_signature ? 'اختياري (يمكنه إلغاؤه)' : 'إجباري دوماً'}
                        </button>
                      </td>

                      {/* التوقيع الفعلي */}
                      <td className="p-3.5">
                        <input
                          type="text"
                          value={st.custom_part1}
                          disabled={!st.allow_custom_edit}
                          onChange={(e) => {
                            setStaffList(staffList.map(s => s.id === st.id ? { ...s, custom_part1: e.target.value } : s));
                          }}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1 text-xs text-white font-sans disabled:opacity-50"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ═══ TAB 3: سياسة الإرسال والتكرار ═══ */}
        {activeTab === 'policy' && (
          <div className="p-6 rounded-2xl bg-[var(--card-elevated)] border border-[var(--border-subtle)] space-y-6">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Send className="w-5 h-5 text-purple-400" />
                سياسة تكرار وإلزامية التوقيع في المحادثات
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                تحديد متى يقوم محرك TripYou ChatHUB بإرفاق التوقيع مع الرسائل الصادرة عبر Evolution API
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  key: 'always',
                  title: 'إلزامي مع كل رسالة',
                  desc: 'يتم إرفاق التوقيع أسفل كل رسالة مرسلة بدون استثناء (الأكثر موثوقية واحترافية)',
                  color: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
                },
                {
                  key: 'first_only',
                  title: 'أول رسالة في اليوم فقط',
                  desc: 'يرسل التوقيع في أول رسالة يرسلها الموظف للعميل، ثم تكون باقي الرسائل في نفس اليوم بلا توقيع تجنباً للتكرار',
                  color: 'border-blue-500/40 bg-blue-500/10 text-blue-300',
                },
                {
                  key: 'manual',
                  title: 'اختياري / يدوي للموظف',
                  desc: 'يظهر زر تفعيل التوقيع داخل محرر الرد، والموظف يختار متى يفعله بنفسه',
                  color: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
                },
                {
                  key: 'disabled',
                  title: 'معطل نهائياً',
                  desc: 'إيقاف التوقيع التلقائي لجميع الموظفين والخطوط تماماً',
                  color: 'border-rose-500/40 bg-rose-500/10 text-rose-300',
                },
              ].map((pol) => (
                <button
                  key={pol.key}
                  onClick={() => setConfig({ ...config, send_mode: pol.key as any })}
                  className={`p-4 rounded-2xl border text-right transition-all flex flex-col justify-between space-y-3 ${
                    config.send_mode === pol.key
                      ? 'border-purple-500 bg-purple-900/30 shadow-lg shadow-purple-950/50'
                      : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-white">{pol.title}</span>
                      {config.send_mode === pol.key && (
                        <CheckCircle2 className="w-4 h-4 text-purple-400" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                      {pol.desc}
                    </p>
                  </div>

                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-lg border w-fit ${pol.color}`}>
                    {pol.key.toUpperCase()}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

      </div>
    </AppShell>
  );
}
