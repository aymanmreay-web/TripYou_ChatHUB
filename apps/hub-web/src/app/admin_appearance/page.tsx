'use client';

import React, { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Lock, Palette, Check, Copy, Upload, RotateCcw, Building2 } from 'lucide-react';
import { useApp, THEMES } from '../../context/AppContext';
import { Segmented, Switch } from '../../components/ui';
import { Button, Card } from '@tripyou/ui';
import { FONT_OPTIONS } from '../../lib/fontOptions';
import {
  AppearanceConfig,
  DEFAULT_APPEARANCE,
  loadAppearance,
  saveAppearance,
  applyAppearance,
} from '../../lib/appearance';
import { toast } from '../../components/common/Toaster';

/* ───────────────────────── أدوات مساعدة ───────────────────────── */

const SWATCH = ['#1A73E8', '#EA4335', '#F9AB00', '#188038', '#7C3AED', '#0369A1', '#C2410C', '#334155'];
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

/** صف إعداد بنمط v1: عنوان + وصف + عنصر تحكم في الجهة الأخرى */
function Gr({ title, desc, children, col }: { title: string; desc?: string; children?: React.ReactNode; col?: boolean }) {
  return (
    <div className={`flex gap-3 px-4 py-3.5 border-t border-[var(--border-subtle)] first:border-t-0 ${col ? 'flex-col items-stretch' : 'items-center'}`}>
      <div className="min-w-0 flex-1">
        <b className="block text-[0.92em] font-semibold">{title}</b>
        {desc && <small className="block text-[0.82em] text-[var(--text-muted)] leading-relaxed mt-0.5">{desc}</small>}
      </div>
      {children && <div className={`flex items-center gap-2.5 shrink-0 ${col ? '' : 'max-w-[55%]'}`}>{children}</div>}
    </div>
  );
}

function Slider({ value, min, max, step, onChange, unit }: { value: number; min: number; max: number; step: number; onChange: (v: number) => void; unit: string }) {
  const p = ((value - min) / (max - min)) * 100;
  return (
    <div className="flex items-center gap-2.5">
      <input
        type="range"
        className="rng"
        min={min}
        max={max}
        step={step}
        value={value}
        style={{ '--p': `${p}%` } as React.CSSProperties}
        onChange={(e) => onChange(+e.target.value)}
        aria-label={`${unit}`}
      />
      <output className="tabular-nums text-[0.85em] text-[var(--text-muted)] min-w-[3.2em] text-end">{value}{unit}</output>
    </div>
  );
}

/* ───────────────────────── الصفحة ───────────────────────── */

type TabKey = 'themes' | 'colors' | 'fonts' | 'surfaces' | 'perm' | 'brand' | 'adv';

export default function AdminAppearancePage() {
  const { user, adminModules, theme, setTheme, mode, setMode } = useApp();

  const canAccess = useMemo(() => {
    if (!user) return false;
    if (user.role === 'super_admin' || user.role === 'sales_lead') return true;
    return adminModules.some((m) => m.key === 'appearance' || m.key === 'settings');
  }, [user, adminModules]);

  const [cfg, setCfg] = useState<AppearanceConfig>(() =>
    typeof window === 'undefined' ? DEFAULT_APPEARANCE : loadAppearance()
  );
  const [tab, setTab] = useState<TabKey>('themes');
  const [pvDev, setPvDev] = useState<'desktop' | 'tablet' | 'phone'>('desktop');
  const [importText, setImportText] = useState('');
  const logoInputRef = useRef<HTMLInputElement>(null);

  /** تعديل + حفظ + تطبيق حي في خطوة واحدة */
  const patch = (p: Partial<AppearanceConfig>) => {
    setCfg((prev) => {
      const next = { ...prev, ...p };
      saveAppearance(next);
      applyAppearance(next);
      return next;
    });
  };

  /* ── الهوية: قراءة/كتابة branding + بث حدث حي للشريط الجانبي ── */
  const [brand, setBrand] = useState<{ company_name: string; platform_title: string; logo_url: string | null }>(() => {
    if (typeof window === 'undefined') return { company_name: '', platform_title: 'TripYou_ChatHUB', logo_url: null };
    try {
      const raw = localStorage.getItem('hub_company_branding');
      if (raw) return { platform_title: 'TripYou_ChatHUB', company_name: '', logo_url: null, ...JSON.parse(raw) };
    } catch { /* تجاهل */ }
    return { company_name: '', platform_title: 'TripYou_ChatHUB', logo_url: null };
  });

  const saveBrand = (next: typeof brand) => {
    setBrand(next);
    try {
      localStorage.setItem('hub_company_branding', JSON.stringify(next));
      window.dispatchEvent(new CustomEvent('branding-updated'));
      toast({ title: 'تم تحديث الهوية', kind: 'success' });
    } catch {
      toast({ title: 'تعذر الحفظ محلياً', kind: 'error' });
    }
  };

  const pickLogo = (f: File | undefined) => {
    if (!f) return;
    if (!/^image\//.test(f.type)) { toast({ title: 'اختر ملف صورة (PNG أو SVG)', kind: 'error' }); return; }
    const r = new FileReader();
    r.onload = () => saveBrand({ ...brand, logo_url: String(r.result) });
    r.readAsDataURL(f);
  };

  if (!canAccess) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <Card className="max-w-sm text-center p-8 flex flex-col items-center gap-3">
          <span className="w-14 h-14 rounded-2xl bg-[var(--card-elevated)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-muted)]">
            <Lock className="w-6 h-6" />
          </span>
          <h1 className="text-lg font-bold">قسم المدير فقط</h1>
          <p className="text-sm text-[var(--text-muted)] leading-relaxed">
            التحكم بالمظهر والثيمات والخطوط والهوية متاح للمدير والمشرفين. إن كنت تحتاج صلاحية، تواصل مع مدير النظام.
          </p>
          <Link href="/inbox" className="text-sm font-semibold text-[var(--primary)] hover:underline">العودة إلى المحادثات</Link>
        </Card>
      </div>
    );
  }

  const pvWidth = pvDev === 'phone' ? '372px' : pvDev === 'tablet' ? '600px' : '100%';

  return (
    <div className="p-2 sm:p-5 pb-20 lg:pb-6 max-w-5xl mx-auto" dir="rtl">
      {/* ترويسة الصفحة */}
      <header className="flex items-end justify-between gap-3 flex-wrap mb-4 mt-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ fontFamily: 'var(--font-head)' }}>
            المظهر والتخصيص
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1 max-w-xl leading-relaxed">
            تحكّم كامل بهوية المنصة: الثيمات، الخطوط، الأسطح، الحركة، والشعار. كل تغيير يظهر فوراً.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 text-[0.78em] font-semibold text-[var(--text-muted)] bg-[var(--card-elevated)] border border-[var(--border-subtle)] rounded-full px-3.5 py-1.5">
          <Palette className="w-3.5 h-3.5" />
          التطبيق فوري على هذا الجهاز · المزامنة المركزية تُربط بإعدادات الشركة قريباً
        </span>
      </header>

      {/* المعاينة الحية بأجهزة */}
      <Card variant="glass" className="p-4 mb-5 sticky top-20 z-20">
        <div className="flex items-center gap-2.5 flex-wrap mb-3">
          <span className="text-[0.85em] font-bold">معاينة حيّة</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="flex-1" />
          <Segmented
            ariaLabel="جهاز المعاينة"
            size="sm"
            options={[{ value: 'desktop', label: 'حاسوب' }, { value: 'tablet', label: 'تابلت' }, { value: 'phone', label: 'جوال' }]}
            value={pvDev}
            onChange={(v) => setPvDev(v)}
          />
        </div>
        <div className="transition-[max-width] duration-500 ease-out mx-auto" style={{ maxWidth: pvWidth }}>
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--card-bg)] p-3.5 flex flex-col gap-2.5" style={{ fontFamily: 'var(--font-ui)' }}>
            <div className="flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-full avatar-ring p-[2px] shrink-0"><span className="w-full h-full rounded-full bg-[var(--card-elevated)] flex items-center justify-center text-xs font-bold">خ</span></span>
              <div className="min-w-0 flex-1">
                <b className="block text-[0.92em]" style={{ fontFamily: 'var(--font-head)' }}>خالد العتيبي</b>
                <small className="text-[0.75em] text-[var(--text-muted)]">Sales-1 · مفتوحة · 03:12</small>
              </div>
              <span className="text-[0.72em] font-bold rounded-full px-2 py-0.5" style={{ background: 'color-mix(in srgb, var(--ok) 15%, transparent)', color: 'var(--ok)' }}>03:12</span>
            </div>
            <div className="bubble-peer px-3.5 py-2 text-[0.9em] leading-relaxed self-start max-w-[80%]">السلام عليكم، أبغى عرض لرحلة إسطنبول 5 أيام لـ 4 أشخاص.</div>
            <div className="bubble-user px-3.5 py-2 text-[0.9em] leading-relaxed self-end max-w-[80%]">وعليكم السلام، أبشر. جهزت لك عرضين: 4 نجوم في السلطان أحمد و5 نجوم على البسفور.</div>
            <div className="flex gap-2 flex-wrap pt-1">
              <button className="text-[0.78em] font-semibold rounded-full px-3 py-1.5" style={{ background: 'var(--primary)', color: '#fff' }}>إرسال</button>
              <button className="text-[0.78em] font-semibold rounded-full px-3 py-1.5" style={{ background: 'color-mix(in srgb, var(--primary) 12%, transparent)', color: 'var(--primary)' }}>قالب رد</button>
              <button className="text-[0.78em] font-semibold rounded-full px-3 py-1.5 bg-[var(--card-elevated)] text-[var(--text-muted)]">إلغاء</button>
            </div>
          </div>
        </div>
      </Card>

      {/* التبويبات */}
      <div className="mb-4">
        <Segmented
          ariaLabel="أقسام المظهر"
          block
          options={[
            { value: 'themes', label: 'الثيمات' },
            { value: 'colors', label: 'الألوان والوضع' },
            { value: 'fonts', label: 'الخطوط' },
            { value: 'surfaces', label: 'الأسطح والحركة' },
            { value: 'perm', label: 'الصلاحيات' },
            { value: 'brand', label: 'الهوية' },
            { value: 'adv', label: 'متقدم' },
          ]}
          value={tab}
          onChange={(v) => setTab(v)}
        />
      </div>

      {/* ── الثيمات ── */}
      {tab === 'themes' && (
        <Card className="p-4">
          <p className="text-[0.85em] text-[var(--text-muted)] mb-3">اختر الثيم — هوية جوجل المتحركة (الشريط، الحلقات، الهالات) تعمل في كل الثيمات بألوانه.</p>
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
            {THEMES.map((t) => {
              const active = theme === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setTheme(t.key)}
                  aria-pressed={active}
                  className={`text-start p-3 rounded-2xl border-[1.5px] bg-[var(--card-bg)] transition-all hover:-translate-y-0.5 ${active ? 'border-[var(--primary)] shadow-[0_0_0_3px_var(--accent-soft)]' : 'border-[var(--border-subtle)]'}`}
                >
                  <span className="flex h-8 rounded-xl overflow-hidden mb-2.5">
                    {t.colors.map((c, i) => <i key={i} className="flex-1" style={{ background: c }} />)}
                  </span>
                  <b className="text-[0.9em] font-bold flex items-center gap-1.5">{t.label}{active && <Check className="w-3.5 h-3.5 text-[var(--ok)]" />}</b>
                  <small className="text-[0.75em] text-[var(--text-muted)] block mt-0.5">{t.key === 'theme-google' ? 'الافتراضي — هوية v1' : 'ثيم إضافي'}</small>
                </button>
              );
            })}
          </div>
        </Card>
      )}

      {/* ── الألوان والوضع ── */}
      {tab === 'colors' && (
        <Card>
          <Gr title="وضع العرض" desc="الفاتح للنهار، الداكن للمناوبات الليلية — يتبعه الزجاج والهالات">
            <Segmented ariaLabel="وضع العرض" size="sm" options={[{ value: 'light', label: 'فاتح' }, { value: 'dark', label: 'داكن' }]} value={mode} onChange={(v) => setMode(v)} />
          </Gr>
          <Gr title="اللون الرئيسي المخصص" desc="يتجاوز لون الثيم للأزرار والعناصر النشطة. اتركه فارغاً لاعتماد لون الثيم." col>
            <div className="flex items-center gap-2.5 flex-wrap pt-1">
              {SWATCH.map((c) => (
                <button
                  key={c}
                  aria-label={c}
                  onClick={() => patch({ primaryCustom: c })}
                  className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${cfg.primaryCustom?.toLowerCase() === c.toLowerCase() ? 'border-[var(--primary)] scale-110' : 'border-[var(--card-bg)] shadow-[0_0_0_1.5px_var(--border-subtle)]'}`}
                  style={{ background: c }}
                />
              ))}
              <label className="relative w-8 h-8 rounded-full overflow-hidden cursor-pointer border-2 border-[var(--card-bg)] shadow-[0_0_0_1.5px_var(--border-subtle)]" style={{ background: 'conic-gradient(#EA4335,#FBBC04,#34A853,#4285F4,#EA4335)' }} title="لون مخصص">
                <input type="color" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" value={cfg.primaryCustom || '#1A73E8'} onChange={(e) => patch({ primaryCustom: e.target.value })} />
              </label>
              <input
                className="w-24 text-center tabular-nums rounded-xl bg-[var(--card-elevated)] border-[1.5px] border-transparent focus:border-[var(--primary)] outline-none py-1.5 text-[0.85em] direction-ltr"
                style={{ direction: 'ltr' }}
                maxLength={7}
                value={cfg.primaryCustom || ''}
                placeholder="#1A73E8"
                onChange={(e) => { const v = e.target.value; patch({ primaryCustom: HEX_RE.test(v) ? v : (v === '' ? null : cfg.primaryCustom) }); }}
              />
              <Button variant="ghost" size="sm" onClick={() => patch({ primaryCustom: null })}><RotateCcw className="w-3.5 h-3.5" /> إعادة</Button>
            </div>
          </Gr>
          <Gr title="تباين أعلى للنص" desc="يزيد وضوح النصوص الثانوية للموظفين الذين يحتاجونها">
            <Switch checked={cfg.contrast} onChange={(v) => patch({ contrast: v })} ariaLabel="تباين أعلى" />
          </Gr>
        </Card>
      )}

      {/* ── الخطوط ── */}
      {tab === 'fonts' && (
        <div className="flex flex-col gap-4">
          {([['fontUI', 'خط النص', 'للرسائل والواجهة — واضح بأحجام صغيرة'], ['fontHead', 'خط العناوين والأرقام', 'للأسماء والعناوين والعدادات الجدولية']] as const).map(([key, title, desc]) => (
            <Card key={key} className="p-4">
              <b className="text-[0.95em] font-bold">{title}</b>
              <small className="block text-[0.78em] text-[var(--text-muted)] mb-3">{desc} · كل الخطوط مستضافة محلياً (woff2) ولا يُستدعى ملف من الخارج</small>
              <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(215px, 1fr))' }}>
                {FONT_OPTIONS.map((f) => {
                  const active = cfg[key] === f.family;
                  return (
                    <button
                      key={f.id}
                      onClick={() => patch({ [key]: f.family } as Partial<AppearanceConfig>)}
                      aria-pressed={active}
                      className={`text-start p-3 rounded-2xl border-[1.5px] bg-[var(--card-bg)] transition-colors ${active ? 'border-[var(--primary)] shadow-[0_0_0_3px_var(--accent-soft)]' : 'border-[var(--border-subtle)]'}`}
                    >
                      <span className="flex justify-between items-center text-[0.72em] text-[var(--text-muted)]" style={{ direction: 'ltr' }}>
                        <span>{f.label}</span>{active && <Check className="w-3.5 h-3.5 text-[var(--ok)]" />}
                      </span>
                      <span className="block text-[1.05em] my-1.5 leading-relaxed" style={{ fontFamily: f.family }}>أهلاً بك في TripYou، لديك رسالة جديدة</span>
                      <small className="text-[0.72em] text-[var(--text-muted)]">{f.note}</small>
                    </button>
                  );
                })}
              </div>
            </Card>
          ))}
          <Card className="p-4">
            <Gr title="حجم الخط الأساسي" desc="يتدرج معه كل شيء في الواجهة" >
              <Slider value={cfg.size} min={13} max={19} step={1} unit="px" onChange={(v) => patch({ size: v })} />
            </Gr>
          </Card>
        </div>
      )}

      {/* ── الأسطح والحركة ── */}
      {tab === 'surfaces' && (
        <div className="flex flex-col gap-4">
          <Card>
            <Gr title="استدارة الزوايا" desc="من حادة إلى ناعمة جداً"><Slider value={cfg.radius} min={10} max={34} step={1} unit="px" onChange={(v) => patch({ radius: v })} /></Gr>
            <Gr title="شدة الزجاج" desc="الشفافية والضبابية خلف الأسطح"><Slider value={cfg.glass} min={0} max={100} step={5} unit="%" onChange={(v) => patch({ glass: v })} /></Gr>
            <Gr title="كثافة العرض" desc="مضغوطة تزيد المحتوى في الشاشة">
              <Segmented ariaLabel="الكثافة" size="sm" options={[{ value: 'comfortable', label: 'مريحة' }, { value: 'compact', label: 'مضغوطة' }]} value={cfg.density} onChange={(v) => patch({ density: v })} />
            </Gr>
          </Card>
          <Card>
            <Gr title="مستوى الحركة" desc="خفيفة توقف الحلقات والهالات، بدون تُطفئ كل التأثيرات">
              <Segmented ariaLabel="مستوى الحركة" size="sm" options={[{ value: 'full', label: 'كاملة' }, { value: 'subtle', label: 'خفيفة' }, { value: 'off', label: 'بدون' }]} value={cfg.motion} onChange={(v) => patch({ motion: v })} />
            </Gr>
            <Gr title="سرعة الحركات المحيطة" desc="الشريط الملون والحلقات الدوّارة">
              <Segmented ariaLabel="سرعة الحركة" size="sm" options={[{ value: 'normal', label: 'عادية' }, { value: 'slow', label: 'هادئة' }]} value={cfg.speed} onChange={(v) => patch({ speed: v })} />
            </Gr>
            <Gr title="الخلفية" desc="هالات متحركة، نقاط هادئة، أو سادة">
              <Segmented ariaLabel="الخلفية" size="sm" options={[{ value: 'aurora', label: 'هالات' }, { value: 'dots', label: 'نقاط' }, { value: 'flat', label: 'سادة' }]} value={cfg.bg} onChange={(v) => patch({ bg: v })} />
            </Gr>
          </Card>
          <Card>
            <Gr title="شكل الفقاعات" desc="تُطبَّق على محادثات واتساب فوراً">
              <Segmented ariaLabel="شكل الفقاعات" size="sm" options={[{ value: 'tail', label: 'بذيل' }, { value: 'round', label: 'مستديرة' }, { value: 'soft', label: 'ناعمة' }]} value={cfg.bubble} onChange={(v) => patch({ bubble: v })} />
            </Gr>
            <Gr title="صور المستخدمين" desc="حلقة جوجل الدوّارة للمحادثات غير المقروءة، سادة، أو كبسولة الاسم (تُبنى مع الصندوق الجديد)">
              <Segmented ariaLabel="صور المستخدمين" size="sm" options={[{ value: 'ring', label: 'حلقة' }, { value: 'solid', label: 'سادة' }, { value: 'name', label: 'كبسولة' }]} value={cfg.avatar} onChange={(v) => patch({ avatar: v })} />
            </Gr>
            <Gr title="القائمة الجانبية" desc="كاملة بالأسماء أو أيقونات فقط (تُطبَّق مع إعادة بناء القائمة)">
              <Segmented ariaLabel="القائمة الجانبية" size="sm" options={[{ value: 'full', label: 'كاملة' }, { value: 'rail', label: 'أيقونات' }]} value={cfg.nav} onChange={(v) => patch({ nav: v })} />
            </Gr>
          </Card>
        </div>
      )}

      {/* ── صلاحيات الموظفين ── */}
      {tab === 'perm' && (
        <div className="flex flex-col gap-4">
          <Card>
            {([
              ['mode', 'الوضع الفاتح والداكن'],
              ['preset', 'اختيار الثيم'],
              ['size', 'حجم الخط'],
              ['density', 'كثافة العرض'],
              ['motion', 'مستوى الحركة'],
              ['bubble', 'شكل الفقاعات'],
            ] as const).map(([k, label]) => (
              <Gr key={k} title={label} desc="">
                <Switch checked={cfg.staffCan[k]} onChange={(v) => patch({ staffCan: { ...cfg.staffCan, [k]: v } })} ariaLabel={label} />
              </Gr>
            ))}
          </Card>
          <p className="text-[0.82em] text-[var(--text-muted)] leading-relaxed px-1">
            الخطوط والألوان المخصصة والزجاج تبقى للإدارة فقط ليبقى الشكل موحداً. تُطبَّق هذه الصلاحيات على صفحة «ملفي» عند إعادة بنائها على نظام v1.
          </p>
        </div>
      )}

      {/* ── الهوية ── */}
      {tab === 'brand' && (
        <div className="flex flex-col gap-4">
          <Card>
            <Gr title="اسم المنصة" desc="يظهر في الشريط الجانبي — يتحدث لحظياً" col>
              <input
                className="w-full max-w-xs rounded-xl bg-[var(--card-elevated)] border-[1.5px] border-transparent focus:border-[var(--primary)] outline-none px-3.5 py-2.5 text-sm"
                value={brand.platform_title}
                onChange={(e) => setBrand({ ...brand, platform_title: e.target.value })}
                onBlur={() => saveBrand(brand)}
                placeholder="TripYou_ChatHUB"
              />
            </Gr>
            <Gr title="اسم الشركة" desc="يظهر تحت اسم المنصة في الشريط الجانبي" col>
              <input
                className="w-full max-w-xs rounded-xl bg-[var(--card-elevated)] border-[1.5px] border-transparent focus:border-[var(--primary)] outline-none px-3.5 py-2.5 text-sm"
                value={brand.company_name}
                onChange={(e) => setBrand({ ...brand, company_name: e.target.value })}
                onBlur={() => saveBrand(brand)}
                placeholder="TripYou للسفر والسياحة"
              />
            </Gr>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="w-14 h-14 rounded-2xl avatar-ring p-[2px] shrink-0 flex items-center justify-center">
                <span className="w-full h-full rounded-[12px] bg-[var(--card-bg)] flex items-center justify-center overflow-hidden">
                  {brand.logo_url
                    ? <img src={brand.logo_url} alt="الشعار" className="w-full h-full object-contain" />
                    : <span className="font-black text-[var(--text-main)]" style={{ fontFamily: 'var(--font-head)' }}>{brand.platform_title.slice(0, 2).toUpperCase()}</span>}
                </span>
              </span>
              <div className="flex-1 min-w-[220px]">
                <b className="text-[0.92em] font-bold flex items-center gap-1.5"><Building2 className="w-4 h-4 text-[var(--text-muted)]" /> شعار الشركة</b>
                <small className="block text-[0.78em] text-[var(--text-muted)] mt-0.5">PNG أو SVG — يظهر في الشريط الجانبي لحظياً</small>
              </div>
              <input ref={logoInputRef} type="file" accept="image/*" hidden onChange={(e) => pickLogo(e.target.files?.[0])} />
              <Button variant="secondary" size="sm" onClick={() => logoInputRef.current?.click()}><Upload className="w-3.5 h-3.5" /> رفع شعار</Button>
              {brand.logo_url && (
                <Button variant="ghost" size="sm" onClick={() => saveBrand({ ...brand, logo_url: null })}>إزالة</Button>
              )}
            </div>
          </Card>
          <p className="text-[0.82em] text-[var(--text-muted)] leading-relaxed px-1">
            الهوية تُحفظ محلياً وتُبَث حياً للشريط الجانبي. عند ربط إعدادات الشركة بقاعدة البيانات سينتشر تلقائياً لكل الموظفين.
          </p>
        </div>
      )}

      {/* ── متقدم ── */}
      {tab === 'adv' && (
        <div className="flex flex-col gap-4">
          <Card className="p-4">
            <b className="text-[0.95em] font-bold">تصدير الإعدادات</b>
            <pre className="mt-2.5 p-3.5 rounded-xl bg-[var(--card-elevated)] text-[0.75em] leading-relaxed overflow-auto max-h-56 direction-ltr text-start" style={{ direction: 'ltr' }}>{JSON.stringify(cfg, null, 2)}</pre>
            <div className="mt-2.5">
              <Button variant="secondary" size="sm" onClick={() => {
                try { navigator.clipboard.writeText(JSON.stringify(cfg, null, 2)); toast({ title: 'تم النسخ', kind: 'success' }); }
                catch { toast({ title: 'تعذر النسخ', kind: 'error' }); }
              }}><Copy className="w-3.5 h-3.5" /> نسخ</Button>
            </div>
          </Card>
          <Card className="p-4">
            <b className="text-[0.95em] font-bold">استيراد إعدادات</b>
            <textarea
              className="mt-2.5 w-full min-h-24 rounded-xl bg-[var(--card-elevated)] border-[1.5px] border-transparent focus:border-[var(--primary)] outline-none p-3 text-[0.8em]"
              style={{ direction: 'ltr' }}
              placeholder='الصق JSON هنا'
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
            />
            <div className="mt-2.5">
              <Button variant="primary" size="sm" onClick={() => {
                try {
                  const j = JSON.parse(importText);
                  const next = { ...DEFAULT_APPEARANCE, ...cfg, ...j, staffCan: { ...cfg.staffCan, ...(j.staffCan || {}) } };
                  saveAppearance(next); applyAppearance(next); setCfg(next);
                  toast({ title: 'تم تطبيق الإعدادات', kind: 'success' });
                } catch { toast({ title: 'صيغة JSON غير صحيحة', kind: 'error' }); }
              }}>تطبيق</Button>
            </div>
          </Card>
          <Card className="p-4">
            <b className="text-[0.95em] font-bold">إعادة الضبط</b>
            <p className="text-[0.82em] text-[var(--text-muted)] mt-1 mb-2.5">يعود حجم الخط والاستدارة والزجاج والحركة والخلفية إلى قيم v1 الافتراضية (الثيم نفسه لا يتغير).</p>
            <Button variant="danger" size="sm" onClick={() => {
              saveAppearance(DEFAULT_APPEARANCE); applyAppearance(DEFAULT_APPEARANCE); setCfg({ ...DEFAULT_APPEARANCE, staffCan: { ...DEFAULT_APPEARANCE.staffCan } });
              toast({ title: 'تمت إعادة الضبط', kind: 'success' });
            }}><RotateCcw className="w-3.5 h-3.5" /> إعادة ضبط</Button>
          </Card>
        </div>
      )}
    </div>
  );
}
