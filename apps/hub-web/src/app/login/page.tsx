'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Layers, Shield, Lock, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Button, Input, Card, Badge } from '@tripyou/ui';
import { MOCK_USERS } from '../../lib/mock-data';
import { supabase } from '../../lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useApp();
  const [selectedRole, setSelectedRole] = useState<string>('super_admin');
  const [password, setPassword] = useState('••••••••••••');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const activeUser = MOCK_USERS[selectedRole];

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      login(selectedRole);
      router.push('/inbox');
    }, 400);
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/inbox` : undefined,
        },
      });
      if (error) {
        console.warn('Google OAuth notice:', error);
        // Fallback smooth demo login if redirect domain is still being provisioned
        login('super_admin');
        router.push('/inbox');
      }
    } catch (err: any) {
      console.warn('Google sign in error:', err?.message);
      login('super_admin');
      router.push('/inbox');
    } finally {
      setIsGoogleLoading(false);
    }
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
            منصة YouTrip ChatHUB
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            بوابة إدارة محادثات واتساب الموحدة — YouTrip ChatHUB
          </p>
        </div>

        {/* Login Card */}
        <Card variant="glass" className="p-6 sm:p-8 border-slate-800">
          {/* Google Single Sign-On Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading}
            className="w-full mb-5 flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-semibold text-sm transition-all shadow-md active:scale-[0.99] border border-slate-200"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.64v3.02h3.88c2.27-2.09 3.665-5.17 3.665-9.1z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.02c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.12C3.26 21.36 7.33 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.3c-.24-.72-.38-1.49-.38-2.3s.14-1.58.38-2.3V6.58H1.26C.46 8.17 0 9.99 0 12s.46 3.83 1.26 5.42l4.02-3.12z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.26 6.58l4.02 3.12c.95-2.83 3.6-4.95 6.72-4.95z"
              />
            </svg>
            <span>{isGoogleLoading ? 'جاري الاتصال بـ Google...' : 'تسجيل الدخول السريع عبر Google'}</span>
          </button>

          <div className="relative flex items-center justify-center my-4">
            <div className="border-t border-slate-800 w-full" />
            <span className="bg-[#0f172a] px-3 text-[11px] text-slate-500 font-medium">أو عبر بيانات الموظف</span>
            <div className="border-t border-slate-800 w-full" />
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                البريد الإلكتروني للموظف
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
          <span>© م. أيمن مريعي — By Eng. Ayman Mreay. جميع الحقوق محفوظة</span>
        </div>
      </div>
    </div>
  );
}
