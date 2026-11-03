'use client';

import React from 'react';
import { notFound } from 'next/navigation';
import { ShieldX, ArrowRight, Lock } from 'lucide-react';
import Link from 'next/link';
import { useApp } from '../../../context/AppContext';
import { AppShell } from '../../../components/layout/AppShell';
import { ComingSoonView } from '../../../components/common/ComingSoonView';
import { RAW_MODULES } from '../../../lib/mock-data';
import { Card, Button, Badge } from '@tripyou/ui';

interface ModulePageProps {
  params: {
    key: string;
  };
}

export default function DynamicModulePage({ params }: ModulePageProps) {
  const { user } = useApp();
  const moduleKey = params.key;

  const targetModule = RAW_MODULES.find((m) => m.key === moduleKey);

  if (!targetModule) {
    notFound();
  }

  // Permission check
  const hasPermission = !targetModule.required_permission || user.permissions.includes(targetModule.required_permission);

  return (
    <AppShell>
      {!hasPermission ? (
        <div className="max-w-xl mx-auto py-16 px-4 text-center">
          <Card variant="glass" className="p-8 border-slate-800">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 mx-auto flex items-center justify-center mb-4">
              <ShieldX className="w-8 h-8" />
            </div>

            <h1 className="text-xl font-bold text-white mb-2">
              صلاحية غير متوفرة لهذا الحساب
            </h1>

            <p className="text-sm text-slate-300 mb-6 leading-relaxed">
              يتطلب قسم <strong className="text-white">{targetModule.title_ar}</strong> الحصول على صلاحية:{' '}
              <code className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-amber-300 font-mono text-xs">
                {targetModule.required_permission}
              </code>
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/inbox">
                <Button variant="primary" size="md">
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                  <span>العودة للمحادثات</span>
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      ) : (
        <ComingSoonView module={targetModule} />
      )}
    </AppShell>
  );
}
