'use client';

import React, { useState } from 'react';
import { Inbox, Plus, Edit2, Trash2, PhoneCall, Users, ChevronDown, ChevronUp, Layers, CheckCircle2 } from 'lucide-react';
import { AppShell } from '../../../components/layout/AppShell';

interface InboxLine {
  instanceName: string;
  title: string;
  phone: string;
}

interface InboxItem {
  id: string;
  name_ar: string;
  description: string;
  lines: InboxLine[];
  filter: 'all' | 'dm' | 'groups';
  staff_count: number;
  color: string;
}

const FILTER_LABELS = { all: 'الكل', dm: 'محادثات فردية', groups: 'مجموعات فقط' };

const MOCK_INBOXES: InboxItem[] = [
  {
    id: 'inbox-01',
    name_ar: 'صندوق مجموعات الشركات',
    description: 'يجمع كل مجموعات الواتساب الخاصة بشركات وموردي YouTrip عبر جميع الخطوط المتصلة',
    lines: [
      { instanceName: 'Master', title: 'الخط الرئيسي', phone: '+966554125782' },
      { instanceName: 'Sells_2', title: 'خط المبيعات 2', phone: '+966548540410' },
    ],
    filter: 'groups',
    staff_count: 4,
    color: 'emerald',
  },
  {
    id: 'inbox-02',
    name_ar: 'صندوق محادثات العملاء',
    description: 'محادثات العملاء الفردية المباشرة — تسند تلقائياً لصاحب الخط',
    lines: [
      { instanceName: 'Master', title: 'الخط الرئيسي', phone: '+966554125782' },
      { instanceName: 'Sells_1', title: 'خط المبيعات 1', phone: '+966500000000' },
      { instanceName: 'Sells_2', title: 'خط المبيعات 2', phone: '+966548540410' },
    ],
    filter: 'dm',
    staff_count: 3,
    color: 'blue',
  },
  {
    id: 'inbox-03',
    name_ar: 'صندوق إدارة العمليات',
    description: 'كافة المحادثات والمجموعات التشغيلية على الخط الرئيسي الخاص بالإدارة',
    lines: [
      { instanceName: 'Master', title: 'الخط الرئيسي', phone: '+966554125782' },
    ],
    filter: 'all',
    staff_count: 2,
    color: 'purple',
  },
];

const COLOR_MAP: Record<string, string> = {
  emerald: 'from-emerald-600 to-teal-500',
  blue: 'from-blue-600 to-indigo-500',
  purple: 'from-purple-600 to-violet-500',
  amber: 'from-amber-600 to-orange-500',
};

export default function InboxesPage() {
  const [inboxes, setInboxes] = useState<InboxItem[]>(MOCK_INBOXES);
  const [expandedId, setExpandedId] = useState<string | null>('inbox-01');

  return (
    <AppShell>
      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <Inbox className="w-5 h-5 text-blue-400" />
              </div>
              إدارة الصناديق (Inboxes)
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              تنظيم وتوزيع محادثات ومجموعات الخطوط على فرق العمل والصناديق الموحدة
            </p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-medium transition-colors w-fit">
            <Plus className="w-4 h-4" />
            إنشاء صندوق جديد
          </button>
        </div>

        {/* Info card */}
        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs sm:text-sm flex items-start gap-3">
          <Layers className="w-5 h-5 shrink-0 text-blue-400 mt-0.5" />
          <div className="leading-relaxed">
            <strong>آلية الصناديق في YouTrip ChatHUB:</strong> كل صندوق يمكن أن يربط عدة خطوط ومجموعات. يظهر للموظف فقط ما يخص صلاحياته، وعند محاولة الرد في مجموعة لا يتواجد رقمه فيها يطلب منه النظام الانضمام أو التحويل لخط رئيسي.
          </div>
        </div>

        {/* Inboxes List */}
        <div className="space-y-3">
          {inboxes.map((inbox) => {
            const isExpanded = expandedId === inbox.id;
            return (
              <div key={inbox.id} className="rounded-2xl bg-slate-900/70 border border-slate-800 overflow-hidden transition-all">
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-900 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : inbox.id)}
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${COLOR_MAP[inbox.color] || COLOR_MAP.emerald} flex items-center justify-center shrink-0 shadow-md`}>
                      <Inbox className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="font-semibold text-white text-sm sm:text-base">{inbox.name_ar}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{inbox.description}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="hidden sm:flex items-center gap-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1 bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-700/60">
                        <PhoneCall className="w-3.5 h-3.5 text-emerald-400" />
                        {inbox.lines.length} خطوط
                      </span>
                      <span className="flex items-center gap-1 bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-700/60">
                        <Users className="w-3.5 h-3.5 text-purple-400" />
                        {inbox.staff_count} موظفين
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-300 border border-blue-500/20 font-medium">
                        {FILTER_LABELS[inbox.filter]}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-slate-800/80 p-4 bg-slate-950/40 space-y-3">
                    <div className="text-xs font-semibold text-slate-300">الخطوط المشمولة داخل هذا الصندوق:</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {inbox.lines.map((line) => (
                        <div key={line.instanceName} className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800">
                          <div className="flex items-center gap-3">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0 animate-pulse" />
                            <div>
                              <div className="text-xs sm:text-sm text-white font-medium">{line.title}</div>
                              <div className="text-xs text-slate-400 font-mono mt-0.5">{line.phone}</div>
                            </div>
                          </div>
                          <span className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2 py-1 rounded border border-slate-800">
                            {line.instanceName}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
