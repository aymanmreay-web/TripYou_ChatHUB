import React, { useEffect, useState } from 'react';
import { GitMerge, X, AlertCircle, CheckCircle2, RefreshCw, ChevronLeft } from 'lucide-react';

interface MergePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const MergePreviewModal: React.FC<MergePreviewModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(true);
  const [isMerging, setIsMerging] = useState(false);
  const [data, setData] = useState<{
    duplicate_groups_found: number;
    samples: { key: string; kept: string; removed: string[] }[];
    message?: string;
  } | null>(null);

  // جلب معاينة أولية بدون تنفيذ (Dry Run)
  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    fetch('/api/contacts/merge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dry_run: true }),
    })
      .then((res) => res.json())
      .then((resData) => {
        setData(resData);
      })
      .catch((err) => {
        console.error('Failed to dry-run merge:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirmMerge = async () => {
    setIsMerging(true);
    try {
      const res = await fetch('/api/contacts/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dry_run: false }),
      });
      const resData = await res.json();
      if (res.ok && resData.success) {
        onSuccess();
        onClose();
      } else {
        alert(resData.error || 'فشلت عملية الدمج');
      }
    } catch (e: any) {
      alert(`خطأ: ${e.message}`);
    } finally {
      setIsMerging(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div dir="rtl" className="bg-[var(--card-bg)] border border-indigo-500/40 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 text-right">
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
          <div className="flex items-center gap-2">
            <GitMerge className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-base text-[var(--text-main)]">معاينة وتأكيد دمج جهات الاتصال المكررة</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="p-10 text-center flex flex-col items-center justify-center gap-2 text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
            <span className="text-xs">جاري فحص قاعدة البيانات بحثاً عن جهات الاتصال المكررة...</span>
          </div>
        ) : (
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-indigo-300 font-medium block">عدد مجموعات التكرار المكتشفة:</span>
                <span className="text-xl font-black text-white font-mono">
                  <bdi dir="ltr">{data?.duplicate_groups_found || 0}</bdi>
                </span>
              </div>
              <GitMerge className="w-8 h-8 text-indigo-400/50" />
            </div>

            {data?.duplicate_groups_found === 0 ? (
              <div className="p-6 text-center text-slate-400 bg-[var(--card-elevated)] rounded-2xl border border-[var(--border-subtle)]">
                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-400 mb-2" />
                <p className="font-semibold text-white">الدليل نظيف تماماً!</p>
                <p className="text-[11px] text-slate-400 mt-1">لا توجد أي أرقام أو مجموعات مكررة حالياً.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <span className="text-[11px] text-slate-300 font-medium block">
                  عينة من المكررات التي سيتم دمجها (الاسم المحتفظ به مقابل الأسماء المحذوفة):
                </span>
                <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                  {(data?.samples || []).map((s, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-[var(--card-elevated)] border border-[var(--border-subtle)] space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-indigo-300 font-bold" dir="ltr">
                          {s.key}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold">
                          سيتم الاحتفاظ بـ: {s.kept}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        الصفوف المكررة التي ستُدمج مراجعها وتُحذف: {s.removed.join(' ، ')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-subtle)]">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 font-semibold transition-all"
              >
                إغلاق
              </button>
              {data && data.duplicate_groups_found > 0 && (
                <button
                  type="button"
                  disabled={isMerging}
                  onClick={handleConfirmMerge}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-lg flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isMerging ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>جاري الدمج الشامل...</span>
                    </>
                  ) : (
                    <>
                      <GitMerge className="w-3.5 h-3.5" />
                      <span>تأكيد دمج {data.duplicate_groups_found} مكرراً الآن</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
