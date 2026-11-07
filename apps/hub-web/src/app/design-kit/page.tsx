'use client';

import React, { useState } from 'react';
import { AppShell } from '../../components/layout/AppShell';
import { Avatar, NameCapsule, Segmented, Switch } from '../../components/ui';
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
      </div>
    </AppShell>
  );
}
