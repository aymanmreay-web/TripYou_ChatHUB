'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, ShieldCheck, Mail, LogOut, RefreshCw, CheckCircle2, UserCheck, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useApp } from '../../context/AppContext';

export default function PendingApprovalPage() {
  const router = useRouter();
  const { logout } = useApp();
  const [checking, setChecking] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('user@gmail.com');
  const [userName, setUserName] = useState<string>('موظف جديد');
  const [isApproved, setIsApproved] = useState(false);

  useEffect(() => {
    async function checkAuthStatus() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserEmail(user.email || '');
          setUserName(user.user_metadata?.full_name || user.email?.split('@')[0] || 'موظف مسجل');

          // Check if staff record is active
          const { data: staffMember } = await supabase
            .from('staff')
            .select('status, role_id, full_name')
            .eq('email', user.email)
            .maybeSingle();

          if (staffMember && staffMember.status === 'active') {
            setIsApproved(true);
            setTimeout(() => {
              router.push('/inbox');
            }, 1200);
          }
        }
      } catch (err) {
        console.warn('Status check notice:', err);
      }
    }
    checkAuthStatus();
  }, [router]);

  const handleRefreshCheck = async () => {
    setChecking(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.email) {
        const { data: staffMember } = await supabase
          .from('staff')
          .select('status')
          .eq('email', user.email)
          .maybeSingle();

        if (staffMember && staffMember.status === 'active') {
          setIsApproved(true);
          setTimeout(() => router.push('/inbox'), 1000);
          return;
        }
      }
    } catch (e) {
      console.warn(e);
    } finally {
      setTimeout(() => setChecking(false), 600);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {}
    logout();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-[#070314] text-white flex items-center justify-center p-4 relative overflow-hidden font-sans">
      
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-64 h-64 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="max-w-md w-full bg-[#120B24]/90 backdrop-blur-xl border border-purple-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-6 relative z-10">
        
        {/* Top Icon */}
        <div className="w-16 h-16 rounded-3xl bg-amber-500/15 border-2 border-amber-500/40 flex items-center justify-center mx-auto text-amber-400 shadow-lg shadow-amber-950/50">
          <Clock className="w-8 h-8 animate-pulse" />
        </div>

        <div className="space-y-2">
          <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
            بانتظار ترخيص المشرف
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-white">
            مرحباً بك، {userName}
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            تم تسجيل حسابك بنجاح عبر Google. للحفاظ على سرية محادثات وخطوط الشركة، يتطلب الحساب ترخيصاً وتعيين الصلاحيات من مدير النظام.
          </p>
        </div>

        {/* User Card */}
        <div className="bg-slate-900/80 border border-purple-900/50 rounded-2xl p-4 text-right space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>البريد المرتبط:</span>
            <span className="font-mono text-purple-300 font-semibold">{userEmail}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>مدير النظام المعتمد:</span>
            <span className="font-bold text-white">م. أيمن مريعي</span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>حالة الترخيص:</span>
            <span className="text-amber-400 font-semibold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              معلق (Pending)
            </span>
          </div>
        </div>

        {isApproved && (
          <div className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-center gap-2 animate-in zoom-in">
            <CheckCircle2 className="w-4 h-4" />
            تم ترخيص حسابك بنجاح! جاري تحويلك للمحادثات...
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3 pt-2">
          <button
            onClick={handleRefreshCheck}
            disabled={checking}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-purple-950/50 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
            <span>التحقق من موافقة المدير الآن</span>
          </button>

          <button
            onClick={handleSignOut}
            className="w-full py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs font-medium flex items-center justify-center gap-2 border border-white/5 transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>تسجيل الخروج والعودة لاحقاً</span>
          </button>
        </div>

      </div>
    </div>
  );
}
