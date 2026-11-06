'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Loader2, AlertCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { signInWithPassword, signInWithGoogle } from '../../lib/authDb';
import { fetchCompany } from '../../lib/hubDb';

export default function LoginPage() {
  const router = useRouter();
  const { authStatus, refreshAuth } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [brand, setBrand] = useState<{ name: string; logo: string | null }>({ name: '', logo: null });

  useEffect(() => {
    try {
      const cached = JSON.parse(localStorage.getItem('hub_company_branding') || 'null');
      if (cached) setBrand({ name: cached.platform_title || '', logo: cached.logo_url || null });
    } catch {
      // ignore
    }
    fetchCompany()
      .then((c) => c && setBrand({ name: c.platform_title, logo: c.logo_url }))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (authStatus === 'active') router.replace('/inbox');
    else if (authStatus === 'pending' || authStatus === 'blocked') router.replace('/pending-approval');
  }, [authStatus, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await signInWithPassword(email, password);
      await refreshAuth();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(err.message);
      setGoogleLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#070314] text-white flex items-center justify-center p-4 relative">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-gradient-to-tr from-purple-700/20 via-indigo-600/15 to-transparent rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-sm w-full bg-[#120B24]/95 backdrop-blur-2xl border border-purple-500/30 rounded-3xl p-7 shadow-2xl relative z-10">
        <div className="text-center mb-6 space-y-3">
          {brand.logo ? (
            <img src={brand.logo} alt="" className="w-16 h-16 object-contain mx-auto" />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 mx-auto" />
          )}
          {brand.name && <h1 className="text-xl font-black tracking-tight">{brand.name}</h1>}
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-3">
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
            <input
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="البريد الإلكتروني"
              className="w-full bg-slate-900/90 border border-slate-700/80 rounded-2xl pr-10 pl-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
            />
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="كلمة المرور"
              className="w-full bg-slate-900/90 border border-slate-700/80 rounded-2xl pr-10 pl-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-purple-950/60 transition-all flex items-center justify-center disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'تسجيل دخول'}
          </button>
        </form>

        <div className="relative my-4 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-purple-900/40" />
          </div>
          <span className="relative bg-[#120B24] px-3 text-[10px] text-slate-500">أو</span>
        </div>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={googleLoading}
          className="w-full py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-2.5 disabled:opacity-50"
        >
          {googleLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
          )}
          <span>الدخول بحساب Google</span>
        </button>
      </div>
    </div>
  );
}
