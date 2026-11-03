'use client';

import React, { useEffect, useState } from 'react';
import { 
  PhoneCall, RefreshCw, Wifi, WifiOff, Loader2, QrCode,
  MoreVertical, PowerOff, Users, MessageSquare, Clock, Plus, ShieldCheck
} from 'lucide-react';
import { AppShell } from '../../../components/layout/AppShell';

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
    profilePictureUrl?: string | null;
  };
  _count?: {
    Message?: number;
    Contact?: number;
    Chat?: number;
  };
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  open: { label: 'متصل', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', icon: Wifi },
  connecting: { label: 'جاري الاتصال', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30', icon: Loader2 },
  close: { label: 'منقطع', color: 'text-red-400 bg-red-500/10 border-red-500/30', icon: WifiOff },
};

export default function LinesPage() {
  const [instances, setInstances] = useState<EvolutionInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchInstances = async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/evolution/instances');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setInstances(Array.isArray(data) ? data : []);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { 
    fetchInstances(); 
  }, []);

  return (
    <AppShell>
      <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <PhoneCall className="w-5 h-5 text-emerald-400" />
              </div>
              إدارة الخطوط
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              إدارة جلسات واتساب الحقيقية المرتبطة عبر Evolution API
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchInstances}
              disabled={refreshing}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-emerald-500/40 transition-all text-xs sm:text-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              تحديث الحالة
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs sm:text-sm">
            <strong>خطأ في قراءة الخطوط من خادم Evolution API:</strong> {error}
          </div>
        )}

        {/* Stats Summary */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="text-xl sm:text-2xl font-bold text-white">{instances.length}</div>
            <div className="text-[11px] sm:text-xs text-slate-400 mt-0.5">إجمالي الخطوط</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="text-xl sm:text-2xl font-bold text-emerald-400">
              {instances.filter(i => (i.connectionStatus || i.instance?.status) === 'open').length}
            </div>
            <div className="text-[11px] sm:text-xs text-slate-400 mt-0.5">متصل ومستقر</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="text-xl sm:text-2xl font-bold text-amber-400">
              {instances.filter(i => (i.connectionStatus || i.instance?.status) !== 'open').length}
            </div>
            <div className="text-[11px] sm:text-xs text-slate-400 mt-0.5">غير متصل / معلق</div>
          </div>
        </div>

        {/* Loading state */}
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mb-3" />
            <span className="text-sm">جاري جلب الخطوط من خادم Evolution...</span>
          </div>
        ) : (
          /* Instances Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {instances.map((inst) => {
              const rawStatus = inst.connectionStatus || inst.instance?.status || 'close';
              const status = STATUS_MAP[rawStatus] || STATUS_MAP.close;
              const StatusIcon = status.icon;
              const name = inst.name || inst.instance?.instanceName || 'Unknown';
              const id = inst.id || inst.instance?.instanceId || name;
              const pName = inst.profileName || inst.instance?.profileName || name;
              const pic = inst.profilePicUrl || inst.instance?.profilePictureUrl;
              const rawOwner = inst.ownerJid || inst.instance?.owner || '';
              const phone = rawOwner
                ? rawOwner.replace('@s.whatsapp.net', '').replace('@g.us', '')
                : '—';
              
              return (
                <div
                  key={id}
                  className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Instance Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {pic ? (
                          <img
                            src={pic}
                            alt={pName}
                            className="w-12 h-12 rounded-full border-2 border-slate-700 object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center">
                            <PhoneCall className="w-5 h-5 text-slate-400" />
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-white text-sm">
                            {pName}
                          </div>
                          <div className="text-xs text-slate-400 font-mono mt-0.5">
                            {name}
                          </div>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <span className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${status.color}`}>
                        <StatusIcon className={`w-3 h-3 ${rawStatus === 'connecting' ? 'animate-spin' : ''}`} />
                        {status.label}
                      </span>
                    </div>

                    {/* Phone Display */}
                    <div className="text-sm text-slate-300 font-mono mb-4 bg-slate-950/70 px-3 py-2 rounded-xl border border-slate-800/80 flex items-center justify-between">
                      <span className="text-slate-400 text-xs font-sans">الرقم المرتبط:</span>
                      <span className="text-emerald-400 font-bold">{phone !== '—' ? `+${phone}` : '(بانتظار مسح QR)'}</span>
                    </div>

                    {/* Stats */}
                    {inst._count && (
                      <div className="grid grid-cols-3 gap-2 mb-4 p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/60">
                        <div className="text-center">
                          <div className="text-sm font-bold text-white">{inst._count.Chat?.toLocaleString() || 0}</div>
                          <div className="text-[10px] text-slate-500">محادثة</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-bold text-white">{inst._count.Message?.toLocaleString() || 0}</div>
                          <div className="text-[10px] text-slate-500">رسالة</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-bold text-white">{inst._count.Contact?.toLocaleString() || 0}</div>
                          <div className="text-[10px] text-slate-500">جهة اتصال</div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2 border-t border-slate-800/60">
                    {rawStatus === 'open' ? (
                      <button className="flex-1 py-2 px-3 rounded-xl text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center gap-1.5 font-medium cursor-default">
                        <Wifi className="w-3.5 h-3.5" />
                        الخط يعمل بنجاح
                      </button>
                    ) : (
                      <button className="flex-1 py-2 px-3 rounded-xl text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition-colors flex items-center justify-center gap-1.5 font-medium">
                        <QrCode className="w-3.5 h-3.5" />
                        ربط عبر رمز QR
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {instances.length === 0 && !loading && !error && (
          <div className="text-center py-16 text-slate-500">
            <PhoneCall className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>لا توجد خطوط مسجلة في Evolution API</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
