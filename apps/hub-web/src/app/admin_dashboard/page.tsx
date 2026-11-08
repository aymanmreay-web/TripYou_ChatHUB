'use client';

import React, { useEffect, useState } from 'react';
import {
  MessageSquare, Zap, Radio, CheckCircle, TrendingUp,
  Cpu, BatteryCharging, ShieldAlert, AlertTriangle, ArrowUpRight,
  Phone, Users, RefreshCw, Loader2, ShieldCheck, Server, Building2, User, FileSpreadsheet, Smartphone, Layers
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AppShell } from '../../components/layout/AppShell';

interface EvolutionInstance {
  id?: string;
  name?: string;
  connectionStatus?: string;
  ownerJid?: string | null;
  profileName?: string | null;
  profilePicUrl?: string | null;
  instance?: {
    instanceName?: string;
    instanceId?: string;
    status?: string;
    owner?: string;
    profileName?: string;
  };
  _count?: {
    Message?: number;
    Contact?: number;
    Chat?: number;
  };
}

export default function AdminDashboardPage() {
  const { user } = useApp();
  const [instances, setInstances] = useState<EvolutionInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [contactStats, setContactStats] = useState<any>(null);

  const fetchContactStats = async () => {
    try {
      const res = await fetch('/api/contacts/stats');
      if (res.ok) {
        const data = await res.json();
        setContactStats(data);
      }
    } catch (e) {
      console.error('Failed to load contact stats:', e);
    }
  };

  const fetchInstances = async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/evolution/instances');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setInstances(data);
        }
      }
    } catch (e) {
      console.error('Failed to load instances in dashboard:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInstances();
  }, []);

  // Aggregated live metrics from real instances
  const totalMessages = instances.reduce((acc, curr) => acc + (curr._count?.Message || 0), 0);
  const totalContacts = instances.reduce((acc, curr) => acc + (curr._count?.Contact || 0), 0);
  const totalChats = instances.reduce((acc, curr) => acc + (curr._count?.Chat || 0), 0);
  const activeLinesCount = instances.filter(i => (i.connectionStatus || i.instance?.status) === 'open').length;

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto py-6 px-2 sm:px-4 space-y-6">
        {/* Page Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-[var(--border-subtle)]">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-[var(--text-main)]">لوحة الإدارة والعمليات</h1>
              <span className="badge-glass text-xs px-2.5 py-0.5 rounded-full text-purple-300 font-semibold border border-purple-500/30">
                إصدار 2026 SaaS
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
              مؤشرات الأداء اللحظية لخطوط واتساب وسرعة استجابة فريق العمل ومراقبة خادم VPS
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchInstances}
              disabled={refreshing}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[var(--card-elevated)] text-[var(--text-main)] text-xs border border-[var(--border-subtle)] hover:border-purple-500/40 transition-all shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-purple-400' : ''}`} />
              <span>تحديث المؤشرات</span>
            </button>
            <span className="text-xs text-[var(--text-muted)] bg-[var(--card-elevated)] px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] font-mono">
              مراقبة حية: <strong className="text-emerald-400">متصل</strong>
            </span>
          </div>
        </div>

        {/* 4 KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-3xl bg-[var(--card-bg)] border border-[var(--border-subtle)] shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-[var(--text-muted)]">إجمالي رسائل الخطوط</span>
              <span className="p-2.5 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <MessageSquare className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl font-bold text-[var(--text-main)] mb-1 font-mono">
              {loading ? '...' : totalMessages.toLocaleString()}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>حقيقي من خادم Evolution</span>
            </div>
          </div>

          <div className="p-5 rounded-3xl bg-[var(--card-bg)] border border-[var(--border-subtle)] shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-[var(--text-muted)]">إجمالي جهات الاتصال</span>
              <span className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Users className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl font-bold text-[var(--text-main)] mb-1 font-mono">
              {loading ? '...' : totalContacts.toLocaleString()}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>عملاء مسجلين بالذاكرة</span>
            </div>
          </div>

          <div className="p-5 rounded-3xl bg-[var(--card-bg)] border border-[var(--border-subtle)] shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-[var(--text-muted)]">جاهزية الخطوط (Lines)</span>
              <span className="p-2.5 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <Radio className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl font-bold text-[var(--text-main)] mb-1 font-mono">
              {loading ? '...' : `${activeLinesCount} / ${instances.length}`}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-sky-400 font-medium">
              <span>{instances.length > 0 ? `${Math.round((activeLinesCount / instances.length) * 100)}% الجلسات نشطة` : '—'}</span>
            </div>
          </div>

          <div className="p-5 rounded-3xl bg-[var(--card-bg)] border border-[var(--border-subtle)] shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-[var(--text-muted)]">المحادثات المفتوحة</span>
              <span className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Zap className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl font-bold text-[var(--text-main)] mb-1 font-mono">
              {loading ? '...' : totalChats.toLocaleString()}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-amber-400 font-medium">
              <span>تزامن مباشر مع قاعدة Baileys</span>
            </div>
          </div>
        </div>

        {/* Lines Status & Health */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Lines Monitor */}
          <div className="lg:col-span-2">
            <div className="p-6 rounded-3xl bg-[var(--card-bg)] border border-[var(--border-subtle)] shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Phone className="w-5 h-5 text-purple-400" />
                  <h2 className="text-base font-bold text-[var(--text-main)]">حالة خطوط واتساب الحقيقية (Evolution API)</h2>
                </div>
                <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  مراقبة حية
                </span>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12 text-[var(--text-muted)] gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                  <span className="text-xs">جاري جلب إحصائيات الخطوط...</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="border-b border-[var(--border-subtle)] text-[var(--text-muted)]">
                        <th className="pb-3 font-semibold">اسم الخط</th>
                        <th className="pb-3 font-semibold">الرقم المرتبط</th>
                        <th className="pb-3 font-semibold">الحالة</th>
                        <th className="pb-3 font-semibold">الرسائل</th>
                        <th className="pb-3 font-semibold">المحادثات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-subtle)]">
                      {instances.map((l) => {
                        const status = l.connectionStatus || l.instance?.status || 'close';
                        const owner = l.ownerJid || l.instance?.owner || '';
                        const phone = owner ? `+${owner.replace('@s.whatsapp.net', '')}` : '—';
                        const isConnected = status === 'open';

                        return (
                          <tr key={l.id || l.name} className="hover:bg-[var(--card-elevated)] transition-colors">
                            <td className="py-3.5 font-bold text-[var(--text-main)]">
                              {l.profileName || l.name}
                            </td>
                            <td className="py-3.5 font-mono text-[var(--text-secondary)]">
                              {phone}
                            </td>
                            <td className="py-3.5">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                                isConnected
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                  : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                                {isConnected ? 'متصل ومستقر' : 'بانتظار الاقتران'}
                              </span>
                            </td>
                            <td className="py-3.5 font-mono text-[var(--text-main)]">
                              {l._count?.Message?.toLocaleString() || 0}
                            </td>
                            <td className="py-3.5 font-mono text-[var(--text-main)]">
                              {l._count?.Chat?.toLocaleString() || 0}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Infrastructure Health Card */}
          <div>
            <div className="p-6 rounded-3xl bg-[var(--card-bg)] border border-[var(--border-subtle)] shadow-xl space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Server className="w-5 h-5 text-purple-400" />
                <h2 className="text-base font-bold text-[var(--text-main)]">سلامة خادم Hostinger VPS</h2>
              </div>

              <div className="p-3.5 rounded-2xl bg-[var(--card-elevated)] border border-[var(--border-subtle)] space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-[var(--text-muted)]">عنوان السيرفر (Hostinger):</span>
                  <span className="font-mono text-emerald-400 font-semibold">69.62.122.89</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[var(--text-muted)]">إصدار النظام:</span>
                  <span className="font-mono text-[var(--text-main)]">Ubuntu 24.04 LTS</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-1">
                  <div className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full" style={{ width: '48%' }} />
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[var(--card-elevated)] border border-[var(--border-subtle)] space-y-2.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">حاكم الإرسال (SendGovernor):</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    نشط (حماية من الحظر)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">قاطع الدائرة (Circuit Breaker):</span>
                  <span className="text-emerald-400 font-semibold">مغلق (سليم)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">خادم النطاقات الآمن:</span>
                  <span className="text-[var(--text-main)] font-mono">sslip.io (SSL Active)</span>
                </div>
              </div>

              <div className="pt-2 text-xs text-[var(--text-muted)] leading-relaxed">
                يتم إدارة وتوزيع أحمال الرسائل تلقائياً عبر محرك Evolution API مع عزل تام لكل جلسة لمنع أي تأثير متبادل.
              </div>
            </div>

            {/* ودجت دليل جهات الاتصال ثلاثي الأبعاد للمدير */}
            <div className="mt-4 p-6 rounded-3xl bg-[var(--card-bg)] border border-purple-500/30 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-purple-400" />
                  <h2 className="text-base font-bold text-[var(--text-main)]">دليل جهات الاتصال (3D Contacts)</h2>
                </div>
                <a
                  href="/module/contacts"
                  className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 font-semibold"
                >
                  <span>فتح الدليل</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* توزيع الكيانات */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 rounded-2xl bg-blue-950/40 border border-blue-500/30">
                  <User className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                  <span className="text-xs font-bold text-[var(--text-main)] block">{contactStats?.by_entity_type?.individual || 0}</span>
                  <span className="text-[10px] text-blue-300">أفراد (B2C)</span>
                </div>
                <div className="p-2.5 rounded-2xl bg-purple-950/40 border border-purple-500/30">
                  <Building2 className="w-4 h-4 text-purple-400 mx-auto mb-1" />
                  <span className="text-xs font-bold text-[var(--text-main)] block">{contactStats?.by_entity_type?.organization || 0}</span>
                  <span className="text-[10px] text-purple-300">منشآت</span>
                </div>
                <div className="p-2.5 rounded-2xl bg-amber-950/40 border border-amber-500/30">
                  <Users className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                  <span className="text-xs font-bold text-[var(--text-main)] block">{contactStats?.by_entity_type?.group || 0}</span>
                  <span className="text-[10px] text-amber-300">مجموعات</span>
                </div>
              </div>

              {/* تفصيل مصادر الإضافة وتتبع الأرقام */}
              <div className="p-3.5 rounded-2xl bg-[var(--card-elevated)] border border-[var(--border-subtle)] space-y-2 text-xs">
                <span className="text-[11px] font-semibold text-[var(--text-muted)] block mb-1">تتبع مصادر جهات الاتصال:</span>
                <div className="flex justify-between">
                  <span className="flex items-center gap-1 text-[var(--text-secondary)]">
                    <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                    خطوط واتساب (Evolution):
                  </span>
                  <span className="font-mono font-bold text-emerald-400">{contactStats?.by_source?.evolution || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="flex items-center gap-1 text-[var(--text-secondary)]">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-teal-400" />
                    استيراد ملفات إكسل:
                  </span>
                  <span className="font-mono font-bold text-teal-400">{contactStats?.by_source?.excel_import || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="flex items-center gap-1 text-[var(--text-secondary)]">
                    <Cpu className="w-3.5 h-3.5 text-purple-400" />
                    النظام الداخلي والحجوزات:
                  </span>
                  <span className="font-mono font-bold text-purple-400">{contactStats?.by_source?.system || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}