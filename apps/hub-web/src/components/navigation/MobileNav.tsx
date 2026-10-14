'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessageSquare, LayoutDashboard, UserCircle, Menu } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface MobileNavProps {
  onOpenSidebar: () => void;
}

export function MobileNav({ onOpenSidebar }: MobileNavProps) {
  const pathname = usePathname();
  const { adminModules } = useApp();

  const hasAdmin = adminModules.some(m => m.key === 'admin_dashboard');

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/80 px-4 flex items-center justify-around z-30">
      <Link
        href="/inbox"
        className={`flex flex-col items-center gap-1 text-[11px] font-medium transition-colors ${
          pathname === '/inbox' || pathname === '/' ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <MessageSquare className="w-5 h-5" />
        <span>المحادثات</span>
      </Link>

      {hasAdmin && (
        <Link
          href="/admin_dashboard"
          className={`flex flex-col items-center gap-1 text-[11px] font-medium transition-colors ${
            pathname === '/admin_dashboard' ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span>لوحة الإدارة</span>
        </Link>
      )}

      <Link
        href="/profile"
        className={`flex flex-col items-center gap-1 text-[11px] font-medium transition-colors ${
          pathname === '/profile' ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <UserCircle className="w-5 h-5" />
        <span>ملفي</span>
      </Link>

      <button
        onClick={onOpenSidebar}
        className="flex flex-col items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-slate-200 transition-colors"
      >
        <Menu className="w-5 h-5" />
        <span>الأقسام</span>
      </button>
    </nav>
  );
}
