'use client';

import React, { useState } from 'react';
import { UserCheck, Plus, Edit2, Shield, PhoneCall, Inbox, Search, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { AppShell } from '../../../components/layout/AppShell';

interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  role_title_ar: string;
  status: 'active' | 'inactive' | 'pending';
  default_line: string;
  assigned_lines: string[];
  assigned_inboxes: string[];
  permissions_count: number;
}

const MOCK_STAFF: StaffMember[] = [
  {
    id: '1',
    name: 'م. أيمن مريعي',
    email: 'AymanMreay@gmail.com',
    phone: '+963 962 128 616',
    role: 'super_admin',
    role_title_ar: 'مسؤول النظام الأعلى (Super Admin)',
    status: 'active',
    default_line: 'الخط الرئيسي (Master)',
    assigned_lines: ['Master', 'Sells_1', 'Sells_2'],
    assigned_inboxes: ['صندوق مجموعات الشركات', 'صندوق محادثات العملاء', 'صندوق إدارة العمليات'],
    permissions_count: 35,
  },
  {
    id: '2',
    name: 'سارة خالد',
    email: 's***@youtrip.com',
    phone: '+966 55 *** 2002',
    role: 'sales_lead',
    role_title_ar: 'مدير المبيعات (Sales Lead)',
    status: 'active',
    default_line: 'خط المبيعات 2 (Sells_2)',
    assigned_lines: ['Sells_2'],
    assigned_inboxes: ['صندوق مجموعات الشركات'],
    permissions_count: 16,
  },
  {
    id: '3',
    name: 'محمد العمر',
    email: 'm***@youtrip.com',
    phone: '+966 56 *** 3003',
    role: 'support_agent',
    role_title_ar: 'موظف خدمة عملاء',
    status: 'active',
    default_line: 'خط المبيعات 1 (Sells_1)',
    assigned_lines: ['Sells_1'],
    assigned_inboxes: ['صندوق محادثات العملاء'],
    permissions_count: 9,
  },
];

const STATUS_CONFIG = {
  active: { label: 'نشط', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', icon: CheckCircle2 },
  inactive: { label: 'موقوف', color: 'text-red-400 bg-red-500/10 border-red-500/30', icon: XCircle },
  pending: { label: 'معلق', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30', icon: Clock },
};

const ROLE_COLORS: Record<string, string> = {
  super_admin: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
  sales_lead: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
  support_agent: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
};

export default function StaffPage() {
  const [staff] = useState<StaffMember[]>(MOCK_STAFF);
  const [search, setSearch] = useState('');

  const filtered = staff.filter(s =>
    s.name.includes(search) || s.email.toLowerCase().includes(search.toLowerCase()) || s.role_title_ar.includes(search)
  );

  return (
    <AppShell>
      <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-purple-400" />
              </div>
              إدارة المستخدمين والموظفين
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              ربط الموظفين بالخطوط والصناديق وتحديد الأدوار والصلاحيات
            </p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs sm:text-sm font-medium transition-colors w-fit">
            <Plus className="w-4 h-4" />
            إضافة موظف جديد
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="البحث باسم الموظف، البريد أو الدور..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 pr-10 pl-4 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-purple-500/50"
          />
        </div>

        {/* Staff Table */}
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-xs text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4 font-medium">الموظف</th>
                  <th className="py-3 px-4 font-medium hidden md:table-cell">الدور</th>
                  <th className="py-3 px-4 font-medium hidden lg:table-cell">الخط الافتراضي</th>
                  <th className="py-3 px-4 font-medium hidden lg:table-cell">الصناديق المخصصة</th>
                  <th className="py-3 px-4 font-medium">الحالة</th>
                  <th className="py-3 px-4 font-medium">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filtered.map((member) => {
                  const status = STATUS_CONFIG[member.status];
                  const StatusIcon = status.icon;
                  return (
                    <tr key={member.id} className="hover:bg-slate-950/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-sm font-bold text-white shrink-0 shadow">
                            {member.name.slice(0, 1)}
                          </div>
                          <div>
                            <div className="font-semibold text-white">{member.name}</div>
                            <div className="text-xs text-slate-400 font-mono">{member.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 hidden md:table-cell">
                        <span className={`text-xs px-2.5 py-1 rounded-full border ${ROLE_COLORS[member.role] || 'bg-slate-800 text-slate-300 border-slate-700'}`}>
                          <Shield className="w-3 h-3 inline ml-1" />
                          {member.role_title_ar}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 hidden lg:table-cell">
                        <span className="flex items-center gap-1.5 text-xs text-slate-300">
                          <PhoneCall className="w-3.5 h-3.5 text-emerald-400" />
                          {member.default_line}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 hidden lg:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {member.assigned_inboxes.slice(0, 2).map(ib => (
                            <span key={ib} className="text-[10px] px-2 py-0.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300">
                              {ib}
                            </span>
                          ))}
                          {member.assigned_inboxes.length > 2 && (
                            <span className="text-[10px] text-slate-500 font-mono">+{member.assigned_inboxes.length - 2}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border ${status.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {status.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <button className="p-1.5 rounded-lg text-slate-400 hover:text-purple-400 hover:bg-purple-500/10 transition-colors">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

