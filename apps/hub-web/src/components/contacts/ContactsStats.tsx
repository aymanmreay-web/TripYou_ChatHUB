import React from 'react';
import {
  Users,
  User,
  Building2,
  Smartphone,
  FileSpreadsheet,
  Layers,
  Lock,
  Radio,
  Globe2,
} from 'lucide-react';

interface StatsProps {
  stats: {
    total: number;
    individuals: number;
    orgs: number;
    groups: number;
    fromEvolution: number;
    fromExcel: number;
    lids: number;
    newsletters: number;
    saudi: number;
    gulf: number;
  };
}

export const ContactsStats: React.FC<StatsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5" dir="rtl">
      {/* 1. إجمالي السجلات */}
      <div className="p-3 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-subtle)] flex flex-col justify-between shadow-sm">
        <span className="text-[11px] text-[var(--text-muted)] font-medium">إجمالي السجلات</span>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xl font-black text-[var(--text-main)] font-mono">
            <bdi dir="ltr">{stats.total}</bdi>
          </span>
          <Layers className="w-4 h-4 text-purple-400" />
        </div>
      </div>

      {/* 2. الأفراد */}
      <div className="p-3 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-subtle)] flex flex-col justify-between shadow-sm">
        <span className="text-[11px] text-[var(--text-muted)] font-medium">🧑 أفراد معلنون</span>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xl font-bold text-blue-400 font-mono">
            <bdi dir="ltr">{stats.individuals}</bdi>
          </span>
          <User className="w-4 h-4 text-blue-400" />
        </div>
      </div>

      {/* 3. منشآت وشركات */}
      <div className="p-3 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-subtle)] flex flex-col justify-between shadow-sm">
        <span className="text-[11px] text-[var(--text-muted)] font-medium">🏢 شركات ومنشآت</span>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xl font-bold text-purple-400 font-mono">
            <bdi dir="ltr">{stats.orgs}</bdi>
          </span>
          <Building2 className="w-4 h-4 text-purple-400" />
        </div>
      </div>

      {/* 4. المجموعات */}
      <div className="p-3 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-subtle)] flex flex-col justify-between shadow-sm">
        <span className="text-[11px] text-[var(--text-muted)] font-medium">👥 مجموعات</span>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xl font-bold text-amber-400 font-mono">
            <bdi dir="ltr">{stats.groups}</bdi>
          </span>
          <Users className="w-4 h-4 text-amber-400" />
        </div>
      </div>

      {/* 5. السعودية والخليج */}
      <div className="p-3 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-subtle)] flex flex-col justify-between shadow-sm">
        <span className="text-[11px] text-[var(--text-muted)] font-medium">🇸🇦 السعودية</span>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xl font-bold text-emerald-400 font-mono">
            <bdi dir="ltr">{stats.saudi}</bdi>
          </span>
          <Globe2 className="w-4 h-4 text-emerald-400" />
        </div>
      </div>

      {/* 6. مشفر LID */}
      <div className="p-3 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-subtle)] flex flex-col justify-between shadow-sm">
        <span className="text-[11px] text-[var(--text-muted)] font-medium">🔒 مشفر (LID)</span>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xl font-bold text-slate-400 font-mono">
            <bdi dir="ltr">{stats.lids}</bdi>
          </span>
          <Lock className="w-4 h-4 text-slate-400" />
        </div>
      </div>

      {/* 7. قنوات ونشرات */}
      <div className="p-3 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-subtle)] flex flex-col justify-between shadow-sm">
        <span className="text-[11px] text-[var(--text-muted)] font-medium">📢 قنوات ونشرات</span>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xl font-bold text-indigo-400 font-mono">
            <bdi dir="ltr">{stats.newsletters}</bdi>
          </span>
          <Radio className="w-4 h-4 text-indigo-400" />
        </div>
      </div>

      {/* 8. خطوط واتساب */}
      <div className="p-3 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-subtle)] flex flex-col justify-between shadow-sm">
        <span className="text-[11px] text-[var(--text-muted)] font-medium">📱 من واتساب</span>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xl font-bold text-teal-400 font-mono">
            <bdi dir="ltr">{stats.fromEvolution}</bdi>
          </span>
          <Smartphone className="w-4 h-4 text-teal-400" />
        </div>
      </div>
    </div>
  );
};
