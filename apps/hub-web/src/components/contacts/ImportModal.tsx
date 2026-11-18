import React, { useRef, useState } from 'react';
import {
  Upload,
  FileSpreadsheet,
  FileText,
  Smartphone,
  X,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  FolderOpen,
} from 'lucide-react';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [sourceType, setSourceType] = useState<'excel_file' | 'contacts_file' | 'evolution'>('excel_file');
  const [sourceDetail, setSourceDetail] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'info' | 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setSelectedFile(f);
      if (!sourceDetail) {
        setSourceDetail(f.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleRunImport = async () => {
    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      // 1. استيراد خطوط واتساب Evolution
      if (sourceType === 'evolution') {
        setStatusMessage({
          type: 'info',
          text: 'جاري السحب الذكي الشامل من واتساب (يشمل الأفراد، المجموعات، الحسابات المشفرة LID مع استخلاص أرقامها، والقنوات)... قد يستغرق دقيقة.',
        });

        const suffix = sourceDetail.trim() ? `?instance=${encodeURIComponent(sourceDetail.trim())}` : '';
        const res = await fetch(`/api/contacts/sync-evolution${suffix}`, { method: 'POST' });
        const data = await res.json();

        if (res.ok && data.success) {
          setStatusMessage({
            type: 'success',
            text: `✅ اكتمل السحب بنجاح: ${data.total_individuals} فرد معلن، ${data.total_groups} مجموعة، ${data.total_lids} حساب مشفر (تم استخلاص رقم ${data.total_extracted_from_lids} منهم)، و ${data.total_newsletters} قناة ونشرة.`,
          });
          onSuccess();
          setTimeout(() => {
            onClose();
          }, 3500);
        } else {
          setStatusMessage({ type: 'error', text: `❌ فشل السحب: ${data.error || 'تعذر الاتصال بالخطوط'}` });
        }
        return;
      }

      // 2. استيراد ملف (Excel أو VCF)
      if (!selectedFile) {
        setStatusMessage({ type: 'error', text: 'يرجى اختيار ملف أولاً' });
        setIsSubmitting(false);
        return;
      }

      setStatusMessage({ type: 'info', text: 'جاري رفع وتحليل ومعالجة الملف...' });
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('source', sourceType === 'excel_file' ? 'excel_import' : 'contacts_file');
      formData.append('source_detail', sourceDetail.trim() || selectedFile.name);

      const res = await fetch('/api/contacts/import', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMessage({
          type: 'success',
          text: `✅ تم استيراد ${data.imported_count} جهة جديدة، ودمج وتحديث ${data.merged_count}، مع ${data.failed_count} أخطاء.`,
        });
        onSuccess();
        setTimeout(() => {
          onClose();
        }, 2500);
      } else {
        setStatusMessage({ type: 'error', text: `❌ خطأ في المعالجة: ${data.error || 'الملف غير صالح'}` });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: `❌ حدث خطأ: ${err.message}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div dir="rtl" className="bg-[var(--card-bg)] border border-purple-500/40 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-right">
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-purple-400" />
            <h3 className="font-bold text-base text-[var(--text-main)]">استيراد جهات الاتصال مع تتبع المصدر</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3.5 text-xs">
          {/* اختيار نوع المصدر */}
          <div>
            <label className="block text-[11px] text-slate-300 font-medium mb-1.5">اختر نوع المصدر:</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => { setSourceType('excel_file'); setSelectedFile(null); }}
                className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition-all ${
                  sourceType === 'excel_file'
                    ? 'bg-emerald-950/60 border-emerald-500/70 text-emerald-300 font-bold shadow-md'
                    : 'bg-[var(--card-elevated)] border-[var(--border-subtle)] text-slate-400'
                }`}
              >
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                <span>ملف إكسل / CSV</span>
              </button>

              <button
                type="button"
                onClick={() => { setSourceType('contacts_file'); setSelectedFile(null); }}
                className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition-all ${
                  sourceType === 'contacts_file'
                    ? 'bg-sky-950/60 border-sky-500/70 text-sky-300 font-bold shadow-md'
                    : 'bg-[var(--card-elevated)] border-[var(--border-subtle)] text-slate-400'
                }`}
              >
                <FileText className="w-5 h-5 text-sky-400" />
                <span>ملف هاتف (VCF)</span>
              </button>

              <button
                type="button"
                onClick={() => { setSourceType('evolution'); setSelectedFile(null); }}
                className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition-all ${
                  sourceType === 'evolution'
                    ? 'bg-purple-950/60 border-purple-500/70 text-purple-300 font-bold shadow-md'
                    : 'bg-[var(--card-elevated)] border-[var(--border-subtle)] text-slate-400'
                }`}
              >
                <Smartphone className="w-5 h-5 text-purple-400" />
                <span>واتساب Evolution</span>
              </button>
            </div>
          </div>

          {/* إذا كان المصدر ملفاً حقيقياً */}
          {sourceType !== 'evolution' ? (
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] text-slate-300 font-medium mb-1">رفع الملف من جهازك:</label>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept={sourceType === 'excel_file' ? '.xlsx, .xls, .csv' : '.vcf'}
                  className="hidden"
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-purple-500/40 hover:border-purple-400 rounded-2xl p-4 text-center cursor-pointer bg-[var(--card-elevated)]/50 hover:bg-white/5 transition-all space-y-1.5"
                >
                  <FolderOpen className="w-8 h-8 mx-auto text-purple-400" />
                  <p className="font-semibold text-[var(--text-main)]">
                    {selectedFile ? selectedFile.name : 'اضغط هنا لاختيار الملف من جهازك'}
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)]">
                    {sourceType === 'excel_file'
                      ? 'يدعم ملفات .xlsx و .xls و .csv (يتعرف على أعمدة الاسم والهاتف تلقائياً)'
                      : 'يدعم ملفات بطاقات جهات الاتصال .vcf المصدرة من هواتف آيفون وأندرويد'}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-300 font-medium mb-1">اسم المصدر (ليظهر كوسام تتبع دائم للجهات المستوردة):</label>
                <input
                  type="text"
                  value={sourceDetail}
                  onChange={(e) => setSourceDetail(e.target.value)}
                  placeholder="مثال: حجاج_1446 أو عملاء_معرض_الرياض"
                  className="w-full bg-[var(--card-elevated)] text-[var(--text-main)] px-3 py-2 rounded-xl border border-[var(--border-subtle)] focus:border-purple-500 outline-none text-right"
                />
              </div>
            </div>
          ) : (
            /* إذا كان المصدر واتساب Evolution */
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] text-slate-300 font-medium mb-1">حدد خط الواتساب المستهدف:</label>
                <select
                  value={sourceDetail}
                  onChange={(e) => setSourceDetail(e.target.value)}
                  className="w-full bg-[var(--card-elevated)] text-[var(--text-main)] px-3 py-2 rounded-xl border border-[var(--border-subtle)] focus:border-purple-500 outline-none text-xs font-semibold text-right"
                >
                  <option value="">🌐 كافة الخطوط المتصلة حالياً (سحب شامل موصى به)</option>
                  <option value="Master">الخط الرئيسي (Master) فقط</option>
                  <option value="Sells_2">خط المبيعات 2 (Sells_2) فقط</option>
                  <option value="Sells_1">خط المبيعات 1 (Sells_1) فقط</option>
                </select>
              </div>

              <div className="p-3.5 rounded-2xl bg-purple-950/40 border border-purple-500/30 text-xs text-purple-200 leading-relaxed space-y-1">
                <p className="font-bold text-[var(--text-main)] flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  ميزات السحب الذكي والشامل:
                </p>
                <ul className="text-[11px] text-slate-300 list-disc list-inside space-y-0.5">
                  <li>استيراد جهات الاتصال والأسماء الحقيقية للمجموعات.</li>
                  <li>فك تشفير الحسابات المشفرة (<bdi dir="ltr">LID</bdi>) واستخلاص أرقامها الحقيقية من الشات تلقائياً.</li>
                  <li>إسناد أوسمة خاصة للحسابات المشفرة والقنوات لتسهيل الفرز.</li>
                  <li>كشف الدولة تلقائياً حسب مفتاح الخط الدولي.</li>
                </ul>
              </div>
            </div>
          )}

          {/* تنبيه الحالة */}
          {statusMessage && (
            <div
              className={`p-3 rounded-xl border flex items-center gap-2 text-xs font-semibold ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                  : statusMessage.type === 'error'
                  ? 'bg-rose-950/60 border-rose-500/50 text-rose-300'
                  : 'bg-purple-950/60 border-purple-500/50 text-purple-300'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              ) : statusMessage.type === 'error' ? (
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              ) : (
                <RefreshCw className="w-4 h-4 shrink-0 text-purple-400 animate-spin" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 font-semibold transition-all"
            >
              إلغاء
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleRunImport}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold transition-all shadow-lg disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>جاري المعالجة...</span>
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  <span>بدء الاستيراد الفوري</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
