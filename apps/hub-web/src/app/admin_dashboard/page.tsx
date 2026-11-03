'use client';

import React from 'react';
import {
  MessageSquare, Zap, Radio, CheckCircle, TrendingUp,
  Cpu, BatteryCharging, ShieldAlert, AlertTriangle, ArrowUpRight
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AppShell } from '../../components/layout/AppShell';
import { Card, Badge, Button } from '@tripyou/ui';

export default function AdminDashboardPage() {
  const { lines, user } = useApp();

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto py-6 px-2 sm:px-4 space-y-6">
        {/* Page Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-white">لوحة الإدارة والعمليات</h1>
              <Badge variant="beta" size="md">
                إصدار تجريبي (Beta)
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              مؤشرات الأداء اللحظية لخطوط واتساب وسرعة استجابة فريق العمل
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
              آخر تحديث: <strong className="text-emerald-400 font-mono">منذ لحظات</strong>
            </span>
          </div>
        </div>

        {/* 4 KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card variant="interactive" className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-slate-400">إجمالي محادثات اليوم</span>
              <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                <MessageSquare className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl font-bold text-white mb-1">428</div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+18% عن يوم أمس</span>
            </div>
          </Card>

          <Card variant="interactive" className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-slate-400">متوسط سرعة الاستجابة</span>
              <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                <Zap className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl font-bold text-white mb-1">1m 24s</div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>ضمن المعيار المستهدف (&lt; 2m)</span>
            </div>
          </Card>

          <Card variant="interactive" className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-slate-400">جاهزية الخطوط (Lines)</span>
              <span className="p-2 rounded-xl bg-sky-500/10 text-sky-400">
                <Radio className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl font-bold text-white mb-1">3 / 3</div>
            <div className="flex items-center gap-1.5 text-xs text-sky-400 font-medium">
              <span>100% جلسات Baileys نشطة</span>
            </div>
          </Card>

          <Card variant="interactive" className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-slate-400">معدل الإغلاق الناجح</span>
              <span className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                <TrendingUp className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl font-bold text-white mb-1">94.8%</div>
            <div className="flex items-center gap-1.5 text-xs text-purple-400 font-medium">
              <span>406 تذكرة محلولة بالكامل</span>
            </div>
          </Card>
        </div>

        {/* Lines Status & Health */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Lines Monitor */}
          <div className="lg:col-span-2">
            <Card variant="default" className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-white">حالة خطوط واتساب (Evolution API)</h2>
                <Badge variant="live" size="sm">
                  مراقبة حية
                </Badge>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="pb-3 font-semibold">اسم الخط</th>
                      <th className="pb-3 font-semibold">الرقم المقنّع</th>
                      <th className="pb-3 font-semibold">الحالة</th>
                      <th className="pb-3 font-semibold">البطارية</th>
                      <th className="pb-3 font-semibold">المحادثات غير المقروءة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {lines.map((l) => (
                      <tr key={l.id} className="hover:bg-slate-850/50 transition-colors">
                        <td className="py-3 font-medium text-white">{l.title_ar}</td>
                        <td className="py-3 font-mono text-slate-400">{l.phone_masked}</td>
                        <td className="py-3">
                          <Badge variant={l.status === 'online' ? 'live' : 'warning'} size="sm">
                            {l.status === 'online' ? 'متصل' : 'تنبيه'}
                          </Badge>
                        </td>
                        <td className="py-3">
                          <span className="inline-flex items-center gap-1 text-slate-300 font-mono">
                            <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
                            {l.battery_level}%
                          </span>
                        </td>
                        <td className="py-3">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 font-bold">
                            {l.unread_count}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* Infrastructure Health Card */}
          <div>
            <Card variant="subtle" className="p-6 space-y-4">
              <h2 className="text-base font-bold text-white mb-2">سلامة البنية والخادم</h2>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/60 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">استهلاك الذاكرة (VPS 8GB):</span>
                  <span className="font-mono text-white">4.2 GB / 8.0 GB</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: '52%' }} />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/60 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">حاكم الإرسال (SendGovernor):</span>
                  <span className="text-emerald-400 font-semibold">نشط (حماية من الحظر)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">قاطع الدائرة (Circuit Breaker):</span>
                  <span className="text-emerald-400 font-semibold">مغلق (سليم)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">نظام المزامنة:</span>
                  <span className="text-slate-200 font-semibold">Supabase Cloud + Traefik</span>
                </div>
              </div>

              <div className="pt-2 text-xs text-slate-500 leading-relaxed">
                يتم إدارة وتوزيع الحمل بين جلسات وحاويات Evolution API تلقائياً وبشكل مباشر لمنع أي ضغط على السيرفر.
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
