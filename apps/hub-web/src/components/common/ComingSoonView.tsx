'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Sparkles, Calendar, CheckCircle2, ShieldCheck, ArrowRight, Bell, Check, Cpu } from 'lucide-react';
import { ModuleContract } from '../../types';
import { MODULE_ROADMAP_DETAILS } from '../../lib/mock-data';
import { Button, Badge, Card } from '@resvbar/ui';

interface ComingSoonViewProps {
  module: ModuleContract;
}

export function ComingSoonView({ module }: ComingSoonViewProps) {
  const [notified, setNotified] = useState(false);
  const details = MODULE_ROADMAP_DETAILS[module.key];

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      {/* Breadcrumb & Back */}
      <div className="flex items-center gap-2 mb-6 text-sm text-slate-400">
        <Link
          href="/inbox"
          className="flex items-center gap-1.5 hover:text-emerald-400 transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
          <span>الرئيسية</span>
        </Link>
        <span>/</span>
        <span className="text-slate-200">{module.area === 'admin' ? 'إدارة النظام' : 'المساحة الشخصية'}</span>
        <span>/</span>
        <span className="text-emerald-400 font-medium">{module.title_ar}</span>
      </div>

      {/* Main Feature Hero Card */}
      <Card variant="glass" className="border-slate-800/80 p-6 sm:p-8 mb-8 relative overflow-hidden">
        {/* Ambient Glow */}
        <div className="absolute top-0 right-1/4 -mt-20 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 -mb-20 w-80 h-80 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
            <div className="flex items-center gap-3">
              <span className="p-3 rounded-2xl bg-gradient-to-br from-purple-500/20 to-slate-800 border border-purple-500/30 text-purple-300">
                <Sparkles className="w-6 h-6 animate-pulse" />
              </span>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  {module.title_ar}
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                  معرّف القسم: <code className="text-purple-300 font-mono">{module.key}</code>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="coming_soon" size="md">
                قيد التطوير والتجهيز
              </Badge>
              {details?.version && (
                <Badge variant="default" size="md" className="border-slate-700 bg-slate-800/80 text-slate-300">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 ml-1" />
                  {details.version}
                </Badge>
              )}
            </div>
          </div>

          <p className="text-base sm:text-lg text-slate-300 leading-relaxed mb-6">
            {details?.description_ar || 'يجري حالياً بناء وتجهيز هذا القسم ليتكامل مع البنية التحتية لـ ResvBAR Hub وفق أعلى معايير السرعة والأمان.'}
          </p>

          {/* Action Row */}
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-800/60">
            <Button
              variant={notified ? 'secondary' : 'primary'}
              size="md"
              onClick={() => setNotified(!notified)}
              className="transition-all"
            >
              {notified ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>تم تفعيل التنبيه للجاهزية</span>
                </>
              ) : (
                <>
                  <Bell className="w-4 h-4" />
                  <span>أعلمني فور إطلاق هذا القسم</span>
                </>
              )}
            </Button>

            <Link href="/inbox">
              <Button variant="outline" size="md">
                الانتقال إلى المحادثات المباشرة
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      {/* Grid: Planned Features & Technical Architecture */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Planned Features Box */}
        <Card variant="subtle" className="p-6 border-slate-800/70">
          <div className="flex items-center gap-2 mb-4 text-emerald-400 font-semibold text-sm">
            <CheckCircle2 className="w-4 h-4" />
            <span>المميزات المخططة في هذا القسم</span>
          </div>

          <ul className="space-y-3">
            {(details?.features_ar || [
              'تكامل لحظي مع واجهات برمجة تطبيقات Evolution API وسيرفر واتساب المباشر',
              'دعم كامل للصلاحيات المقيدة وربط الخطوط بالموظفين',
              'واجهات عربية متجاوبة وسريعة بنظام التصميم الموحد',
              'تسجيل كافة العمليات في سجل التدقيق الأمني'
            ]).map((feat, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-sm text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
                <span className="leading-normal">{feat}</span>
              </li>
            ))}
          </ul>
        </Card>

        {/* Security & Architecture Specs Box */}
        <Card variant="subtle" className="p-6 border-slate-800/70 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4 text-purple-400 font-semibold text-sm">
              <Cpu className="w-4 h-4" />
              <span>البنية التقنية ومتطلبات الأمان</span>
            </div>

            <div className="space-y-3 text-sm text-slate-300 mb-4">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/60">
                <span className="text-slate-400 text-xs">الصلاحية المطلوبة للوصول:</span>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-amber-300">
                  {module.required_permission || 'عام (بدون قيد)'}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/60">
                <span className="text-slate-400 text-xs">نطاق التواجد:</span>
                <span className="text-xs text-slate-200">
                  {module.area === 'admin' ? 'لوحة تحكم المشرف (Admin)' : 'مساحة العمل اليومية (User)'}
                </span>
              </div>

              {details?.technical_note_ar && (
                <p className="text-xs text-slate-400 bg-slate-900/40 p-3 rounded-xl border border-slate-800/40 leading-relaxed">
                  <strong className="text-slate-300 ml-1">ملاحظة معمارية:</strong>
                  {details.technical_note_ar}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 pt-3 border-t border-slate-800/40">
            <ShieldCheck className="w-4 h-4 text-emerald-500/70" />
            <span>محمي بسياسات الأمان الدقيقة (RLS) وخادم Supabase المشفر</span>
          </div>
        </Card>
      </div>
    </div>
  );
}
