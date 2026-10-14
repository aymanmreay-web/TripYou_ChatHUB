'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Layers, Shield, Lock, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Button, Input, Card, Badge } from '@resvbar/ui';
import { MOCK_USERS } from '../../lib/mock-data';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useApp();
  const [selectedRole, setSelectedRole] = useState<string>('super_admin');
  const [password, setPassword] = useState('••••••••••••');
  const [isLoading, setIsLoading] = useState(false);

  const activeUser = MOCK_USERS[selectedRole];

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      login(selectedRole);
      router.push('/inbox');
    }, 400);
  };

  const handleQuickLogin = (roleKey: string) => {
    setSelectedRole(roleKey);
    setIsLoading(true);
    setTimeout(() => {
      login(roleKey);
      router.push('/inbox');
    }, 300);
  };

  return (
    <div className="min-h-screen bg-[#0B0F17] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background Ambient Glows */}
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-emerald-400 shadow-xl shadow-emerald-950/60 border border-emerald-400/30 mb-4">
            <Layers className="w-8 h-8 text-slate-950 stroke-[2.5]" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            منصة ResvBAR Hub
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            بوابة إدارة العمليات والمحادثات الموحدة لفريق العمل
          </p>
        </div>

        {/* Login Card */}
        <Card variant="glass" className="p-6 sm:p-8 border-slate-800">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                البريد الإلكتروني (مقنّع في بيئة العرض)
              </label>
              <Input
                type="text"
                readOnly
                value={activeUser.email_masked}
                icon={<Mail className="w-4 h-4 text-slate-400" />}
                className="bg-slate-950/70 cursor-default"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                كلمة المرور
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                icon={<Lock className="w-4 h-4 text-slate-400" />}
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              className="w-full mt-2 font-semibold"
            >
              <span>تسجيل الدخول إلى Hub</span>
              <ArrowLeft className="w-4 h-4 mr-2" />
            </Button>
          </form>

          {/* Quick Demo Roles Selector */}
          <div className="mt-8 pt-6 border-t border-slate-800/80">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400">
                تسجيل سريع بحساب تجريبي (HUB-004):
              </span>
              <Badge variant="beta" size="sm">
                اختبار الصلاحيات
              </Badge>
            </div>

            <div className="space-y-2">
              {Object.entries(MOCK_USERS).map(([key, u]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleQuickLogin(key)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-xs text-right transition-all ${
                    selectedRole === key
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                      : 'bg-slate-900/60 border-slate-800/60 text-slate-300 hover:border-slate-700 hover:bg-slate-850'
                  }`}
                >
                  <div>
                    <div className="font-semibold text-white">{u.full_name}</div>
                    <div className="text-[11px] text-slate-400">{u.role_title_ar}</div>
                  </div>
                  {selectedRole === key ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <span className="text-[10px] text-slate-500">دخول فوري ←</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* Security Footer Notice */}
        <div className="mt-6 text-center text-xs text-slate-500 flex items-center justify-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-emerald-500/60" />
          <span>جلسات مشفرة ومحمية بسياسات الأمان المتقدمة لشركة ResvBAR</span>
        </div>
      </div>
    </div>
  );
}
