'use client';

import React, { useEffect, useState } from 'react';
import { 
  PhoneCall, RefreshCw, Wifi, WifiOff, Loader2, QrCode,
  Users, MessageSquare, Clock, Plus, ShieldCheck, X, CheckCircle2, Sparkles, Edit3, Tag
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
  open: { label: 'متصل ومستقر', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', icon: Wifi },
  connecting: { label: 'جاري الاتصال', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30', icon: Loader2 },
  close: { label: 'منقطع', color: 'text-rose-400 bg-rose-500/10 border-rose-500/30', icon: WifiOff },
};

export default function LinesPage() {
  const [instances, setInstances] = useState<EvolutionInstance[]>([]);
  const [lineTitles, setLineTitles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Edit Line Name State
  const [editingInstance, setEditingInstance] = useState<string | null>(null);
  const [editTitleInput, setEditTitleInput] = useState<string>('');
  const [savingTitle, setSavingTitle] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // QR Modal State
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [activeInstanceName, setActiveInstanceName] = useState<string>('');
  const [qrLoading, setQrLoading] = useState(false);
  const [qrBase64, setQrBase64] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);

  const fetchInstances = async () => {
    setRefreshing(true);
    try {
      const [resInst, resLines] = await Promise.allSettled([
        fetch('/api/evolution/instances'),
        fetch('/api/lines'),
      ]);

      if (resInst.status === 'fulfilled' && resInst.value.ok) {
        const data = await resInst.value.json();
        setInstances(Array.isArray(data) ? data : []);
      } else {
        throw new Error('تعذر جلب جلسات واتساب من الخادم');
      }

      if (resLines.status === 'fulfilled' && resLines.value.ok) {
        const linesData = await resLines.value.json();
        if (linesData.lines && Array.isArray(linesData.lines)) {
          const titleMap: Record<string, string> = {};
          linesData.lines.forEach((l: any) => {
            if (l.instance_name && l.title_ar) {
              titleMap[l.instance_name] = l.title_ar;
            }
          });
          setLineTitles(titleMap);
        }
      }

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

  const handleOpenConnect = async (name: string) => {
    setActiveInstanceName(name);
    setQrModalOpen(true);
    setQrLoading(true);
    setQrError(null);
    setQrBase64(null);
    setPairingCode(null);

    try {
      const res = await fetch(`/api/evolution/instances/${name}/connect`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `خطأ ${res.status}`);
      }
      const data = await res.json();
      const b64 = data.base64 || data.qrcode?.base64 || (typeof data.code === 'string' && data.code.startsWith('data:') ? data.code : null);
      setQrBase64(b64);
      setPairingCode(data.pairingCode || data.code || null);
    } catch (err: any) {
      setQrError(err.message || 'تعذر جلب رمز QR');
    } finally {
      setQrLoading(false);
    }
  };

  const handleOpenEditTitle = (instanceName: string, currentTitle: string) => {
    setEditingInstance(instanceName);
    setEditTitleInput(currentTitle || instanceName);
  };

  const handleSaveTitle = async () => {
    if (!editingInstance || !editTitleInput.trim()) return;
    setSavingTitle(true);
    try {
      const res = await fetch('/api/lines', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instance_name: editingInstance,
          title_ar: editTitleInput.trim(),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'فشل حفظ التسمية');
      }

      setLineTitles((prev) => ({
        ...prev,
        [editingInstance]: editTitleInput.trim(),
      }));

      setSaveSuccessMsg(`تم تحديث مسمى الخط بنجاح: ${editTitleInput.trim()}`);
      setTimeout(() => setSaveSuccessMsg(null), 4000);
      setEditingInstance(null);
    } catch (e: any) {
      alert(`خطأ: ${e.message}`);
    } finally {
      setSavingTitle(false);
    }
  };

  return (
    <AppShell>
      <div dir="rtl" className="text-right p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[var(--border-subtle)]">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-main)] flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <PhoneCall className="w-5 h-5 text-emerald-400" />
              </div>
              <span>إدارة خطوط واتساب والتسميات الداخلية</span>
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
              متابعة حالة الخطوط النشطة، تخصيص التسمية الرسمية للخط داخل النظام للموظفين، وربط الأجهزة عبر <bdi dir="ltr">QR</bdi>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchInstances}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-[var(--card-elevated)] border border-[var(--border-subtle)] text-[var(--text-main)] hover:border-emerald-500/40 transition-all text-xs sm:text-sm shadow-sm"
            >
              <span>تحديث الحالة اللحظية</span>
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
          </div>
        </div>

        {saveSuccessMsg && (
          <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs sm:text-sm">
            <strong>تعذر جلب حالة الخطوط:</strong> {error}
          </div>
        )}

        {/* Stats Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="p-5 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-subtle)] shadow-sm">
            <div className="text-2xl sm:text-3xl font-bold text-[var(--text-main)] font-mono">{instances.length}</div>
            <div className="text-xs text-[var(--text-muted)] mt-1">إجمالي الخطوط المسجلة</div>
          </div>
          <div className="p-5 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-subtle)] shadow-sm">
            <div className="text-2xl sm:text-3xl font-bold text-emerald-400 font-mono">
              {instances.filter(i => (i.connectionStatus || i.instance?.status) === 'open').length}
            </div>
            <div className="text-xs text-emerald-400/80 mt-1">جلسات نشطة ومستقرة</div>
          </div>
          <div className="p-5 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-subtle)] shadow-sm">
            <div className="text-2xl sm:text-3xl font-bold text-amber-400 font-mono">
              {instances.filter(i => (i.connectionStatus || i.instance?.status) !== 'open').length}
            </div>
            <div className="text-xs text-amber-400/80 mt-1">غير متصل / بانتظار الاقتران</div>
          </div>
        </div>

        {/* Loading state */}
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 text-[var(--text-muted)]">
            <Loader2 className="w-8 h-8 text-purple-400 animate-spin mb-3" />
            <span className="text-sm">جاري جلب بيانات الجلسات من السيرفر...</span>
          </div>
        ) : (
          /* Instances Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
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
              
              const customTitle = lineTitles[name] || (name === 'Master' ? 'الخط الرئيسي (Master)' : name === 'Sells_2' ? 'المبيعات 2 (Sells_2)' : name);

              return (
                <div
                  key={id}
                  className="p-5 rounded-3xl bg-[var(--card-bg)] border border-[var(--border-subtle)] hover:border-purple-500/40 transition-all flex flex-col justify-between shadow-lg"
                >
                  <div>
                    {/* Instance Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {pic ? (
                          <img
                            src={pic}
                            alt={pName}
                            className="w-12 h-12 rounded-2xl border-2 border-purple-500/30 object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-2xl bg-purple-600/10 border-2 border-purple-500/20 flex items-center justify-center">
                            <PhoneCall className="w-5 h-5 text-purple-400" />
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-[var(--text-main)] text-sm flex items-center gap-2">
                            <span>{customTitle}</span>
                          </div>
                          <div className="text-xs text-[var(--text-muted)] font-mono mt-0.5">
                            المعرف التقني: <bdi dir="ltr">{name}</bdi>
                          </div>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <span className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full border ${status.color}`}>
                        <StatusIcon className={`w-3.5 h-3.5 ${rawStatus === 'connecting' ? 'animate-spin' : ''}`} />
                        <span>{status.label}</span>
                      </span>
                    </div>

                    {/* Phone Display */}
                    <div className="text-xs text-[var(--text-main)] mb-3 bg-[var(--card-elevated)] px-3.5 py-2.5 rounded-2xl border border-[var(--border-subtle)] flex items-center justify-between">
                      <span className="text-[var(--text-muted)] font-sans">الرقم المرتبط:</span>
                      <span className="text-emerald-400 font-bold font-mono">
                        {phone !== '—' ? <bdi dir="ltr">+{phone}</bdi> : '(بانتظار مسح QR)'}
                      </span>
                    </div>

                    {/* Custom Title Card / Manager Edit */}
                    <div className="text-xs mb-4 bg-purple-950/20 px-3.5 py-2.5 rounded-2xl border border-purple-500/20 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-purple-300">
                        <Tag className="w-3.5 h-3.5" />
                        <span>المسمى الداخلي للموظفين:</span>
                      </div>
                      <button
                        onClick={() => handleOpenEditTitle(name, customTitle)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 text-[11px] font-bold transition-all border border-purple-500/30"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>تعديل المسمى</span>
                      </button>
                    </div>

                    {/* Stats */}
                    {inst._count && (
                      <div className="grid grid-cols-3 gap-2 mb-4 p-3 rounded-2xl bg-[var(--card-elevated)] border border-[var(--border-subtle)]">
                        <div className="text-center">
                          <div className="text-sm font-bold text-[var(--text-main)] font-mono">{inst._count.Chat?.toLocaleString() || 0}</div>
                          <div className="text-[10px] text-[var(--text-muted)]">محادثة</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-bold text-[var(--text-main)] font-mono">{inst._count.Message?.toLocaleString() || 0}</div>
                          <div className="text-[10px] text-[var(--text-muted)]">رسالة</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-bold text-[var(--text-main)] font-mono">{inst._count.Contact?.toLocaleString() || 0}</div>
                          <div className="text-[10px] text-[var(--text-muted)]">جهة اتصال</div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-3 border-t border-[var(--border-subtle)]">
                    {rawStatus === 'open' ? (
                      <button className="flex-1 py-2.5 px-3 rounded-2xl text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center gap-1.5 font-medium cursor-default">
                        <Wifi className="w-3.5 h-3.5" />
                        <span>الخط متصل ويعمل بنجاح</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleOpenConnect(name)}
                        className="flex-1 py-2.5 px-3 rounded-2xl text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 transition-all flex items-center justify-center gap-1.5 font-bold shadow-sm"
                      >
                        <QrCode className="w-4 h-4" />
                        <span>ربط عبر رمز QR الآن</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {instances.length === 0 && !loading && !error && (
          <div className="text-center py-16 text-[var(--text-muted)]">
            <PhoneCall className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>لا توجد خطوط مسجلة حالياً</p>
          </div>
        )}
      </div>

      {/* --- نافذة تعديل المسمى الداخلي للخط --- */}
      {editingInstance && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div dir="rtl" className="bg-[var(--card-bg)] border border-purple-500/40 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-right">
            <div className="flex items-center justify-between border-b border-purple-900/40 pb-3">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-base text-[var(--text-main)]">
                  تسمية الخط داخلياً: <bdi dir="ltr">{editingInstance}</bdi>
                </h3>
              </div>
              <button
                onClick={() => setEditingInstance(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-[var(--text-main)] hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              اكتب المسمى العربي الذي ترغب أن يظهر للموظفين وفي صندوق المحادثات بدلاً من الاسم التقني (مثال: <strong>المبيعات الخط الثاني</strong>، <strong>خدمة العملاء</strong>، <strong>الخط الرئيسي</strong>):
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--text-main)]">المسمى الداخلي للخط:</label>
              <input
                type="text"
                dir="rtl"
                value={editTitleInput}
                onChange={(e) => setEditTitleInput(e.target.value)}
                placeholder="مثال: المبيعات الخط الثاني"
                className="w-full px-4 py-2.5 rounded-2xl bg-[var(--card-elevated)] border border-purple-500/40 text-[var(--text-main)] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 text-right"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingInstance(null)}
                disabled={savingTitle}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white bg-slate-800/60 transition-all"
              >
                إلغاء
              </button>
              <button
                onClick={handleSaveTitle}
                disabled={savingTitle || !editTitleInput.trim()}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold transition-all shadow-md disabled:opacity-50"
              >
                {savingTitle ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>حفظ التسمية الداخلية</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- نافذة مسح رمز الـ QR Code لربط الخط --- */}
      {qrModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div dir="rtl" className="bg-[var(--card-bg)] border border-purple-500/40 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-right">
            <div className="flex items-center justify-between border-b border-purple-900/40 pb-3">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-base text-[var(--text-main)]">
                  ربط جلسة واتساب: <bdi dir="ltr">{activeInstanceName}</bdi>
                </h3>
              </div>
              <button
                onClick={() => setQrModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-[var(--text-main)] hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              افتح تطبيق واتساب على هاتفك &larr; الإعدادات &larr; الأجهزة المرتبطة &larr; ربط جهاز، ثم وجّه الكاميرا نحو الرمز التالي:
            </p>

            <div className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl border-4 border-purple-500/30 shadow-inner">
              {qrLoading ? (
                <div className="flex flex-col items-center justify-center h-52 text-slate-700 gap-2">
                  <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
                  <span className="text-xs font-semibold">جاري إنشاء وتوليد رمز QR من السيرفر...</span>
                </div>
              ) : qrError ? (
                <div className="text-center text-rose-600 text-xs py-8">
                  <p className="font-bold">فشل الاتصال بجلسة واتساب:</p>
                  <p className="mt-1">{qrError}</p>
                </div>
              ) : qrBase64 ? (
                <img
                  src={qrBase64.startsWith('data:') ? qrBase64 : `data:image/png;base64,${qrBase64}`}
                  alt="WhatsApp QR Code"
                  className="w-56 h-56 object-contain"
                />
              ) : pairingCode ? (
                <div className="text-center py-6">
                  <div className="text-xs text-slate-500 mb-2">رمز الاقتران المباشر:</div>
                  <div className="text-2xl font-mono font-bold tracking-widest text-purple-900 bg-purple-50 px-4 py-2 rounded-xl border border-purple-200">
                    <bdi dir="ltr">{pairingCode}</bdi>
                  </div>
                </div>
              ) : (
                <div className="text-center text-slate-500 text-xs py-8">
                  الخط متصل بالفعل أو بانتظار إعادة التوليد
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => handleOpenConnect(activeInstanceName)}
                disabled={qrLoading}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 text-xs font-medium border border-purple-500/30 transition-all"
              >
                <span>إعادة توليد الرمز</span>
                <RefreshCw className={`w-3.5 h-3.5 ${qrLoading ? 'animate-spin' : ''}`} />
              </button>

              <button
                onClick={() => {
                  setQrModalOpen(false);
                  fetchInstances();
                }}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white text-xs font-bold transition-all shadow-md shadow-purple-950/50"
              >
                تم المسح / إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
