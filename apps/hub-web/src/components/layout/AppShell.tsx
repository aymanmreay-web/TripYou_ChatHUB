'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '../../context/AppContext';
import { Sidebar } from '../navigation/Sidebar';
import { Header } from '../navigation/Header';
import { MobileNav } from '../navigation/MobileNav';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();
  const { authStatus } = useApp();

  useEffect(() => {
    if (authStatus === 'anonymous') router.replace('/login');
    else if (authStatus === 'pending' || authStatus === 'blocked') router.replace('/pending-approval');
  }, [authStatus, router]);

  if (authStatus !== 'active') {
    return <div className="min-h-screen bg-[var(--bg-main)]" />;
  }

  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-main)] flex flex-col font-sans transition-colors duration-200">
      {/* Sidebar (Desktop & Mobile Drawer) */}
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ${
          collapsed ? 'lg:mr-20' : 'lg:mr-72'
        }`}
      >
        {/* Header */}
        <Header onOpenMobile={() => setMobileOpen(true)} />

        {/* Page Body */}
        <main className="flex-1 p-2 sm:p-5 pb-20 lg:pb-6 overflow-x-hidden">
          {children}
        </main>
      </div>

      {/* Mobile Floating Bottom Navigation Bar */}
      <MobileNav onOpenSidebar={() => setMobileOpen(true)} />
    </div>
  );
}
