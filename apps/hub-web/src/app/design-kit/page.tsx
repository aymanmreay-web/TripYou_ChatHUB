'use client';

import React, { useState } from 'react';
import { AppShell } from '../../components/layout/AppShell';
import { Monitor, Palette, Zap } from 'lucide-react';
import { Avatar, NameCapsule, Segmented, Switch, FeatureCard } from '../../components/ui';
import { FONT_OPTIONS } from '../../lib/fontOptions';
import { useApp } from '../../context/AppContext';

/**
 * صفحة مرجعية للمراجعة (design kit): تعرض المكونات الجديدة بالثيم النشط.
 * جرّب تبديل الثيم والوضع من الهيدر، والخط من القائمة أدناه (معاينة فقط، لا يُحفظ).
 */
export default function DesignKitPage() {
  const { theme } = useApp();
  const [seg, setSeg] = useState<'a' | 'b' | 'c'>('a');
  const [on, setOn] = useState(true);
  const [font, setFont] = useState(FONT_OPTIONS[0].id);
  const fam = FONT_OPTIONS.find((f) => f.id === font)!.family;

  return (
    <AppShell>
      <div dir="rtl" className="mx-auto max-w-3xl space-y-6 px-2 py-6 text-right sm:px-4" style={{ ['--font-ui' as string]: fam, ['--font-head' as string]: fam }}>
        <header>
          <h1 className="text-2xl font-bold text-[var(--text-main)]" style={{ fontFamily: 'var(--font-head)' }}>
            نظام التصميم
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            الثيم النشط: <bdi className="isolate-latin font-mono">{theme}</bdi>
          </p>
        </header>

        <section className="space-y-3 rounded-3xl border border-[var(--border-subtle)] bg-[var(--card-bg)] p-5">
          <h2 className="font-semibold text-[var(--text-main)]">الخطوط</h2>
          <div className="flex flex-wrap gap-2">
            {FONT_OPTIONS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFont(f.id)}
                className={`rounded-full px-3 py-1.5 text-sm transition-colors ${font === f.id ? 'bg-[var(--primary)] text-white' : 'bg-[var(--card-surface)] text-[var(--text-main)]'}`}
                style={{ fontFamily: f.family }}
              >
                {f.label}
              </button>
            ))}
          </div>
          <p className="text-lg text-[var(--text-main)]">أهلاً بك في TripYou، لديك رسالة جديدة من أبو فهد.</p>
        </section>

        <section className="space-y-4 rounded-3xl border border-[var(--border-subtle)] bg-[var(--card-bg)] p-5">
          <h2 className="font-semibold text-[var(--text-main)]">الأفاتار</h2>
          <div className="flex flex-wrap items-center gap-4">
            <Avatar name="ليلى الغامدي" />
            <Avatar name="أبو فهد العنزي" ring />
            <Avatar name="م. أيمن مريعي" presenceColor="#34A853" size={56} />
            <NameCapsule name="سارة العتيبي" />
            <NameCapsule name="م. أيمن مريعي" large />
          </div>
        </section>

        <section className="space-y-4 rounded-3xl border border-[var(--border-subtle)] bg-[var(--card-bg)] p-5">
          <h2 className="font-semibold text-[var(--text-main)]">التبويب والمفتاح</h2>
          <Segmented
            value={seg}
            onChange={setSeg}
            options={[
              { value: 'a', label: 'الكل', count: 7 },
              { value: 'b', label: 'لي', count: 3 },
              { value: 'c', label: 'رادار', count: 1 },
            ]}
          />
          <label className="flex items-center justify-between gap-3 text-[var(--text-main)]">
            <span>ألوان جوجل المتحركة</span>
            <Switch checked={on} onChange={setOn} ariaLabel="ألوان جوجل المتحركة" />
          </label>
          <div className="gbar rounded-full" />
        </section>
        <section className="rounded-3xl bg-[#0A0A0B] px-4 py-10" aria-label="بطاقات الميزات المتوهجة">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-3 mx-auto w-full max-w-[936px]" dir="ltr">
            <FeatureCard title="Hardware" description="My entire desktop setup is built for power. It is silent, durable, and holds my focus." icon={<Monitor size={32} strokeWidth={2.5} />} gradient="linear-gradient(137deg, #FF3D77 0%, #FFB1CE 45%, #FF9D3C 100%)" delay={0.1} />
            <FeatureCard title="Studio" description="Studio is where I define every single pixel. It is the hub for each canvas I deliver." icon={<Palette size={32} strokeWidth={2.5} />} gradient="linear-gradient(137deg, #FFFFFF 0%, #7DD3FC 45%, #06B6D4 100%)" delay={0.2} />
            <FeatureCard title="Motion" description="I use Motion to build lively prototypes, bridging the gap between views and code." icon={<Zap size={32} strokeWidth={2.5} />} gradient="linear-gradient(137deg, #4361EE 0%, #E0AEFF 45%, #F72585 100%)" delay={0.3} />
          </div>
        </section>
      </div>
    </AppShell>
  );
}
