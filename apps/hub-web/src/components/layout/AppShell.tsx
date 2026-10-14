'use client';

import React, { useState } from 'react';
import { Sidebar } from '../navigation/Sidebar';
import { Header } from '../navigation/Header';
import { MobileNav } from '../navigation/MobileNav';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-300">
      {/* Sidebar */}
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
        <main className="flex-1 p-3 sm:p-6 pb-20 lg:pb-6 overflow-x-hidden">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <MobileNav onOpenSidebar={() => setMobileOpen(true)} />
    </div>
  );
}
