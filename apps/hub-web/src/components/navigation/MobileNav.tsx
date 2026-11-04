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

  const hasAdmin = adminModules.some((m) => m.key === 'admin_dashboard');

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-[var(--card-bg)]/85 backdrop-blur-2xl border-t border-[var(--border-subtle)] px-4 flex items-center justify-around z-40 pb-[env(safe-area-inset-bottom)] transition-colors duration-200">
      
      {/* Conversations Tab */}
      <Link
        href="/inbox"
        className={`flex flex-col items-center justify-center w-14 h-full transition-all active:scale-90 ${
          pathname === '/inbox' || pathname === '/'
            ? 'text-[var(--text-secondary)] font-bold'
            : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
        }`}
      >
        <div className="relative">
          <MessageSquare className="w-5 h-5" />
          <span className="absolute -top-1 -right-1.5 w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
        </div>
        <span className="text-[10px] mt-1">المحادثات</span>
      </Link>

      {/* Admin Dashboard Tab (if authorized) */}
      {hasAdmin && (
        <Link
          href="/admin_dashboard"
          className={`flex flex-col items-center justify-center w-14 h-full transition-all active:scale-90 ${
            pathname === '/admin_dashboard'
              ? 'text-[var(--text-secondary)] font-bold'
              : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px] mt-1">الإدارة</span>
        </Link>
      )}

      {/* Profile Tab */}
      <Link
        href="/profile"
        className={`flex flex-col items-center justify-center w-14 h-full transition-all active:scale-90 ${
          pathname === '/profile'
            ? 'text-[var(--text-secondary)] font-bold'
            : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
        }`}
      >
        <UserCircle className="w-5 h-5" />
        <span className="text-[10px] mt-1">ملفي</span>
      </Link>

      {/* Full Sidebar Drawer Toggle */}
      <button
        onClick={onOpenSidebar}
        className="flex flex-col items-center justify-center w-14 h-full text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all active:scale-90"
      >
        <Menu className="w-5 h-5" />
        <span className="text-[10px] mt-1">المزيد</span>
      </button>

    </nav>
  );
}
