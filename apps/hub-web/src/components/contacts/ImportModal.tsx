'use client';

import React, { useRef, useState, useEffect } from 'react';
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
  Wifi,
  WifiOff,
} from 'lucide-react';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface WaLine {
  name: string;
  status: string;
  connected: boolean;
}

export const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [sourceType, setSourceType] = useState<'excel_file' | 'contacts_file' | 'evolution'>('excel_file');
  const [sourceDetail, setSourceDetail] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'info' | 'success' | 'error'; text: string } | null>(null);

  // جلب الخطوط ديناميكياً
  const [waLines, setWaLines] = useState<WaLine[]>([]);
  const [linesLoading, setLinesLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // جلب الخطوط عند فتح النافذة أو عند اختيار Evolution
  useEffect(() => {
    if (!isOpen) return;
    if (sourceType === 'evolution') {
      loadLines();
    }
  }, [isOpen, sourceType]);

  const loadLines = async () => {
    setLinesLoading(true);
    try {
      const res = await fetch('/api/evolution/lines');
      if (res.ok) {
        const data = await res.json();
        setWaLines(data.lines || []);
      }
    } catch {
      setWaLines([]);
    } finally {
      setLinesLoading(false);
    }
  };

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

  const handleClose = () => {
    setStatusMessage(null);
    setSelectedFile(null);
    setSourceDetail('');
    onClose();
  };

  const handleRunImport = async () => {
    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      // 1. استيراد خطوط واتساب Evolution
      if (sourceType === 'evolution') {
        setStatusMessage({
          type: 'info',
          text: 'جاري السحب الذكي والشامل من واتساب… قد يستغرق دقيقة أو أكثر حسب حجم جهات الاتصال.',
        });

        const suffix = sourceDetail.trim() ? `?instance=${encodeURIComponent(sourceDetail.trim())}` : '';
        const res = await fetch(`/api/contacts/sync-evolution${suffix}`, { method: 'POST' });
        const data = await res.json();

        if (res.ok && data.success) {
          const parts: string[] = [];
          if (data.total_saved_phone_contacts > 0) {
            parts.push(`${data.total_saved_phone_contacts} اسم جهة مخزنة بالجوال`);
          }
          parts.push(`${data.total_individuals} فرد`);
          parts.push(`${data.total_groups} مجموعة`);
          if (data.total_lids > 0) {
            parts.push(`${data.total_lids} حساب مشفر (استخلص ${data.total_extracted_from_lids} رقم منهم)`);
          }
          if (data.total_newsletters > 0) {
            parts.push(`${data.total_newsletters} قناة`);
          }
          const changeDetail = `(أضيف ${data.total_inserted || 0} جديد، ودُمج ${data.total_updated || 0} قائم)`;
          setStatusMessage({
            type: 'success',
            text: `✅ اكتمل السحب بنجاح: تم سحب ${parts.join('، ')}. ${changeDetail}`,
          });
          onSuccess();
          setTimeout(() => { handleClose(); }, 4000);
        } else {
          const errorMsg = data.errors?.length ? data.errors.join(' | ') : data.error || 'تعذر الاتصال بالخطوط';
          setStatusMessage({ type: 'error', text: `❌ فشل السحب: ${errorMsg}` });
        }
        return;
      }

      // 2. استيراد ملف (Excel أو VCF)
      if (!selectedFile) {
        setStatusMessage({ type: 'error', text: 'يرجى اختيار ملف أولاً' });
        setIsSubmitting(false);
        return;
      }

      setStatusMessage({ type: 'info', text: 'جاري رفع وتحليل الملف وحفظ الجهات في قاعدة البيانات…' });

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('source', sourceType === 'excel_file' ? 'excel_import' : 'contacts_file');
      formData.append('source_detail', sourceDetail.trim() || selectedFile.name);

      const res = await fetch('/api/contacts/import', { method: 'POST', body: formData });
      const data = await res.json();

      if (res.ok && data.success) {
        setStatusMessage({
          type: 'success',
          text: `✅ تمت المعالجة: ${data.imported_count} جهة جديدة، دُمج ${data.merged_count}، ${data.failed_count} أخطاء (من أصل ${data.total_processed}).`,
        });
        onSuccess();
        setTimeout(() => { handleClose(); }, 2500);
      } else {
        setStatusMessage({ type: 'error', text: `❌ خطأ: ${data.error || 'الملف غير صالح أو لا يحتوي بيانات'}` });
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
        {/* الرأس */}
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-purple-400" />
            <h3 className="font-bold text-base text-[var(--text-main)]">استيراد جهات الاتصال</h3>
          </div>
          <button onClick={handleClose} className="text-slate-400 hover:text-white transition-colors">
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
                onClick={() => { setSourceType('excel_file'); setSelectedFile(null); setSourceDetail(''); }}
                className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition-all ${
                  sourceType === 'excel_file'
                    ? 'bg-emerald-950/60 border-emerald-500/70 text-emerald-300 font-bold shadow-md'
                    : 'bg-[var(--card-elevated)] border-[var(--border-subtle)] text-slate-400 hover:border-slate-500'
                }`}
              >
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                <span>إكسل / CSV</span>
              </button>

              <button
                type="button"
                onClick={() => { setSourceType('contacts_file'); setSelectedFile(null); setSourceDetail(''); }}
                className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition-all ${
                  sourceType === 'contacts_file'
                    ? 'bg-sky-950/60 border-sky-500/70 text-sky-300 font-bold shadow-md'
                    : 'bg-[var(--card-elevated)] border-[var(--border-subtle)] text-slate-400 hover:border-slate-500'
                }`}
              >
                <FileText className="w-5 h-5 text-sky-400" />
                <span>ملف VCF</span>
              </button>

              <button
                type="button"
                onClick={() => { setSourceType('evolution'); setSelectedFile(null); setSourceDetail(''); }}
                className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition-all ${
                  sourceType === 'evolution'
                    ? 'bg-purple-950/60 border-purple-500/70 text-purple-300 font-bold shadow-md'
                    : 'bg-[var(--card-elevated)] border-[var(--border-subtle)] text-slate-400 hover:border-slate-500'
                }`}
              >
                <Smartphone className="w-5 h-5 text-purple-400" />
                <span>واتساب</span>
              </button>
            </div>
          </div>

          {/* محتوى حسب النوع */}
          {sourceType !== 'evolution' ? (
            <div className="space-y-3">
              {/* رفع الملف */}
              <div>
                <label className="block text-[11px] text-slate-300 font-medium mb-1">
                  {sourceType === 'excel_file' ? 'ملف Excel أو CSV:' : 'ملف جهات الاتصال (VCF):'}
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept={sourceType === 'excel_file' ? '.xlsx,.xls,.csv' : '.vcf'}
                  className="hidden"
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-purple-500/40 hover:border-purple-400 rounded-2xl p-4 text-center cursor-pointer bg-[var(--card-elevated)]/50 hover:bg-white/5 transition-all space-y-1.5"
                >
                  <FolderOpen className="w-8 h-8 mx-auto text-purple-400" />
                  <p className="font-semibold text-[var(--text-main)] text-xs">
                    {selectedFile ? selectedFile.name : 'اضغط هنا لاختيار الملف'}
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)]">
                    {sourceType === 'excel_file'
                      ? 'يدعم .xlsx, .xls, .csv — يتعرف تلقائياً على أعمدة الاسم والهاتف'
                      : 'يدعم .vcf المصدّرة من آيفون وأندرويد مع فك الترميز الصحيح'}
                  </p>
                </div>
              </div>

              {/* اسم المصدر */}
              <div>
                <label className="block text-[11px] text-slate-300 font-medium mb-1">
                  اسم المصدر (وسم تتبع دائم):
                </label>
                <input
                  type="text"
                  value={sourceDetail}
                  onChange={(e) => setSourceDetail(e.target.value)}
                  dir="rtl"
                  placeholder="مثال: حجاج_1446 أو عملاء_معرض_الرياض"
                  className="w-full bg-[var(--card-elevated)] text-[var(--text-main)] px-3 py-2 rounded-xl border border-[var(--border-subtle)] focus:border-purple-500 outline-none text-right placeholder:text-right"
                />
              </div>
            </div>
          ) : (
            /* واتساب Evolution */
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] text-slate-300 font-medium">خط الواتساب المستهدف:</label>
                  <button
                    type="button"
                    onClick={loadLines}
                    disabled={linesLoading}
                    className="text-[10px] text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
                  >
                    <RefreshCw className={`w-3 h-3 ${linesLoading ? 'animate-spin' : ''}`} />
                    تحديث
                  </button>
                </div>

                <select
                  value={sourceDetail}
                  onChange={(e) => setSourceDetail(e.target.value)}
                  dir="rtl"
                  className="w-full bg-[var(--card-elevated)] text-[var(--text-main)] px-3 py-2 rounded-xl border border-[var(--border-subtle)] focus:border-purple-500 outline-none text-xs font-semibold text-right"
                >
                  <option value="">🌐 كافة الخطوط المتصلة (سحب شامل موصى به)</option>
                  {linesLoading ? (
                    <option disabled>جاري تحميل الخطوط…</option>
                  ) : waLines.length > 0 ? (
                    waLines.map((line) => (
                      <option key={line.name} value={line.name}>
                        {line.connected ? '🟢' : '🔴'} {line.name}
                        {line.connected ? ' — متصل' : ` — ${line.status}`}
                      </option>
                    ))
                  ) : (
                    <option disabled>لا توجد خطوط متاحة</option>
                  )}
                </select>

                {/* عرض حالة الخطوط */}
                {waLines.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {waLines.map((line) => (
                      <span
                        key={line.name}
                        className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium ${
                          line.connected
                            ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                            : 'bg-slate-800/60 border-slate-600/40 text-slate-400'
                        }`}
                      >
                        {line.connected
                          ? <Wifi className="w-2.5 h-2.5 text-emerald-400" />
                          : <WifiOff className="w-2.5 h-2.5 text-slate-500" />
                        }
                        <bdi dir="ltr">{line.name}</bdi>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* معلومات الميزات */}
              <div className="p-3.5 rounded-2xl bg-purple-950/40 border border-purple-500/30 text-xs text-purple-200 leading-relaxed space-y-1">
                <p className="font-bold text-[var(--text-main)] flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  السحب الذكي والشامل من خطوط واتساب:
                </p>
                <ul className="text-[11px] text-slate-300 list-disc list-inside space-y-1">
                  <li className="text-emerald-300 font-semibold">
                    استيراد وحفظ الأسماء المرتبطة بكل رقم كجهات اتصال مخزنة في دفتر عناوين الجوال.
                  </li>
                  <li>استيراد جهات الاتصال والأفراد والمجموعات بالأسماء الحقيقية.</li>
                  <li>فك تشفير الحسابات المشفرة (<bdi dir="ltr">LID</bdi>) واستخلاص أرقامها الحقيقية من الشات.</li>
                  <li>إسناد أوسمة تلقائية للحسابات المشفرة والقنوات والمجموعات لتسهيل الفرز.</li>
                  <li>كشف الدولة وتحديث جهات الاتصال المشتركة تلقائياً بين كافة الخطوط دون أي تعارض.</li>
                </ul>
              </div>
            </div>
          )}

          {/* رسالة الحالة */}
          {statusMessage && (
            <div
              className={`p-3 rounded-xl border flex items-start gap-2 text-xs font-semibold ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                  : statusMessage.type === 'error'
                  ? 'bg-rose-950/60 border-rose-500/50 text-rose-300'
                  : 'bg-purple-950/60 border-purple-500/50 text-purple-300'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
              ) : statusMessage.type === 'error' ? (
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              ) : (
                <RefreshCw className="w-4 h-4 shrink-0 text-purple-400 animate-spin mt-0.5" />
              )}
              <span className="leading-relaxed">{statusMessage.text}</span>
            </div>
          )}

          {/* أزرار الإجراءات */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 font-semibold transition-all disabled:opacity-50"
            >
              إلغاء
            </button>
            <button
              type="button"
              disabled={isSubmitting || (sourceType !== 'evolution' && !selectedFile)}
              onClick={handleRunImport}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold transition-all shadow-lg disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>جاري المعالجة…</span>
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  <span>بدء الاستيراد</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
