'use client';

import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Upload, 
  Save, 
  CheckCircle2, 
  Image as ImageIcon, 
  Sparkles, 
  ShieldCheck, 
  Globe, 
  Mail, 
  PhoneCall, 
  RefreshCw 
} from 'lucide-react';
import { AppShell } from '../../../components/layout/AppShell';
import { fetchCompany, saveCompany, uploadLogo } from '../../../lib/hubDb';

interface CompanySettings {
  company_name: string;
  platform_title: string;
  logo_url: string | null;
  support_email: string;
  support_phone: string;
}

const DEFAULT_SETTINGS: CompanySettings = {
  company_name: '',
  platform_title: 'TripYou_ChatHUB',
  logo_url: null,
  support_email: '',
  support_phone: '',
};

export default function CompanySettingsPage() {
  const [settings, setSettings] = useState<CompanySettings>(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchCompany();
        if (data) {
          setSettings(data);
          setLogoPreview(data.logo_url);
        }
      } catch (e: any) {
        setSaveError(`تعذّر تحميل البيانات: ${e.message}`);
      }
    })();
  }, []);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      let logoUrl = settings.logo_url;
      if (logoFile) logoUrl = await uploadLogo(logoFile);
      const next: CompanySettings = { ...settings, logo_url: logoUrl };
      await saveCompany(next);
      setSettings(next);
      setLogoFile(null);
      setLogoPreview(logoUrl);
      try {
        localStorage.setItem('hub_company_branding', JSON.stringify(next));
      } catch {
        // ignore
      }
      window.dispatchEvent(new Event('branding-updated'));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e: any) {
      setSaveError(`تعذّر الحفظ: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell>
      <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border-subtle)]">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-main)] flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg">
                <Building2 className="w-5 h-5" />
              </div>
              هوية ومعلومات الشركة
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {saveSuccess && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/30 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4" />
                تم حفظ هوية الشركة بنجاح!
              </span>
            )}
            {saveError && (
              <span className="flex items-center gap-1.5 text-xs text-rose-300 font-bold bg-rose-500/10 px-3 py-1.5 rounded-xl border border-rose-500/30 max-w-md">
                {saveError}
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-purple-950/40 transition-all disabled:opacity-50"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              حفظ التعديلات
            </button>
          </div>
        </div>

        {/* كرت تخصيص الشعار واسم الشركة */}
        <div className="p-6 rounded-3xl bg-[var(--card-elevated)] border border-[var(--border-subtle)] space-y-6 shadow-xl">
          
          {/* Logo Upload Section */}
          <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-purple-900/30">
            <div className="relative group">
              <div className="w-24 h-24 rounded-3xl bg-slate-900 border-2 border-dashed border-purple-500/50 flex items-center justify-center overflow-hidden shadow-2xl">
                {logoPreview ? (
                  <img src={logoPreview} alt="Company Logo" className="w-full h-full object-contain p-2" />
                ) : (
                  <div className="text-center p-2 text-slate-500">
                    <ImageIcon className="w-8 h-8 mx-auto mb-1 text-purple-400 opacity-60" />
                    <span className="text-[10px] block font-semibold">شعار الشركة</span>
                  </div>
                )}
              </div>
              <label
                htmlFor="logo-upload"
                className="absolute inset-0 bg-black/60 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer text-white text-xs gap-1"
              >
                <Upload className="w-5 h-5 text-purple-300" />
                <span>تغيير الصورة</span>
              </label>
              <input
                id="logo-upload"
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
            </div>

            <div className="space-y-1 text-center sm:text-right">
              <h3 className="font-bold text-sm text-[var(--text-main)]">شعار الشركة</h3>
              {logoPreview && (
                <button
                  type="button"
                  onClick={() => {
                    setLogoPreview(null);
                    setLogoFile(null);
                    setSettings((prev) => ({ ...prev, logo_url: null }));
                  }}
                  className="text-[11px] text-rose-400 hover:underline pt-1 block"
                >
                  إزالة الشعار والعودة للافتراضي
                </button>
              )}
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">اسم الشركة:</label>
              <input
                type="text"
                value={settings.company_name}
                onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                placeholder="مثال: شركة المسافر العربي للسياحة"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-purple-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">اسم المنصة:</label>
              <input
                type="text"
                value={settings.platform_title}
                onChange={(e) => setSettings({ ...settings, platform_title: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:border-purple-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">بريد الدعم:</label>
              <input
                type="email"
                value={settings.support_email}
                onChange={(e) => setSettings({ ...settings, support_email: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:border-purple-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">هاتف الدعم:</label>
              <input
                type="text"
                value={settings.support_phone}
                onChange={(e) => setSettings({ ...settings, support_phone: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:border-purple-500 focus:outline-none"
              />
            </div>
          </div>

        </div>

      </div>
    </AppShell>
  );
}

