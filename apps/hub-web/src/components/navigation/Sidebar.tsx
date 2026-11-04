'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  MessageSquare, Users, CheckSquare, Video, BarChart2, Send,
  Bell, UserCircle, LayoutDashboard, PhoneCall, Inbox,
  Users2, UserCheck, Shield, PenTool, Contact, Share2,
  FileSpreadsheet, History, Settings, Activity, Megaphone,
  Search, ChevronLeft, ChevronRight, Layers, Sparkles,
  Tags
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ModuleContract } from '../../types';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const MODULE_ICONS: Record<string, React.ElementType> = {
  inbox: MessageSquare,
  contacts: Users,
  tasks: CheckSquare,
  meetings: Video,
  my_reports: BarChart2,
  campaigns: Send,
  notifications: Bell,
  profile: UserCircle,
  admin_dashboard: LayoutDashboard,
  lines: PhoneCall,
  inboxes: Inbox,
  labels: Tags,
  groups_admin: Users2,
  staff: UserCheck,
  roles: Shield,
  signature: PenTool,
  contacts_admin: Contact,
  channels: Share2,
  reports: FileSpreadsheet,
  audit: History,
  settings: Settings,
  health: Activity,
  campaigns_admin: Megaphone,
};

export function Sidebar({ collapsed, onToggleCollapse, mobileOpen, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const { user, userModules, adminModules, selectedLine } = useApp();
  const [searchTerm, setSearchTerm] = useState('');

  const filterModules = (list: ModuleContract[]) => {
    if (!searchTerm.trim()) return list;
    return list.filter(m => m.title_ar.includes(searchTerm) || m.key.includes(searchTerm));
  };

  const filteredUserModules = filterModules(userModules);
  const filteredAdminModules = filterModules(adminModules);

  const getModuleHref = (m: ModuleContract) => {
    if (m.key === 'inbox') return '/inbox';
    if (m.key === 'profile') return '/profile';
    if (m.key === 'admin_dashboard') return '/admin_dashboard';
    return `/module/${m.key}`;
  };

  const isModuleActive = (m: ModuleContract) => {
    const href = getModuleHref(m);
    if (href === '/inbox' && (pathname === '/inbox' || pathname === '/')) return true;
    return pathname === href;
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar container with Glassmorphism */}
      <aside
        className={`fixed top-0 bottom-0 right-0 z-40 bg-[var(--card-bg)]/95 backdrop-blur-xl border-l border-[var(--border-subtle)] transition-all duration-300 flex flex-col ${
          collapsed ? 'w-20' : 'w-72'
        } ${
          mobileOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 border-b border-[var(--border-subtle)] px-4 flex items-center justify-between shrink-0">
          {!collapsed ? (
            <Link href="/inbox" className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center shadow-md text-white font-black text-lg">
                TY
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-sm tracking-tight text-[var(--text-main)]">TripYou_ChatHUB</span>
                <span className="text-[10px] text-[var(--text-muted)] font-medium">إدارة المحادثات 2026</span>
              </div>
            </Link>
          ) : (
            <Link href="/inbox" className="mx-auto">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white font-black text-base shadow-md">
                TY
              </div>
            </Link>
          )}

          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex p-1.5 rounded-xl hover:bg-[var(--card-elevated)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
            title={collapsed ? 'توسيع القائمة' : 'طي القائمة'}
          >
            {collapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

        {/* Quick Search */}
        {!collapsed && (
          <div className="p-3 border-b border-[var(--border-subtle)]">
            <div className="relative">
              <Search className="w-4 h-4 text-[var(--text-muted)] absolute right-3 top-2.5" />
              <input
                type="text"
                placeholder="بحث في الأقسام والصلاحيات..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[var(--card-elevated)] border border-[var(--border-subtle)] rounded-2xl pr-9 pl-3 py-1.5 text-xs text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>
          </div>
        )}

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto p-3 space-y-6">
          
          {/* User Workspace Section */}
          <div>
            {!collapsed && (
              <div className="px-3 pb-2 text-[10px] font-bold text-[var(--text-muted)] tracking-wider uppercase">
                مساحة الموظف
              </div>
            )}
            <nav className="space-y-1">
              {filteredUserModules.map((m) => {
                const IconComponent = MODULE_ICONS[m.key] || MessageSquare;
                const active = isModuleActive(m);

                return (
                  <Link
                    key={m.key}
                    href={getModuleHref(m)}
                    onClick={onCloseMobile}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                      active
                        ? 'bg-purple-500/15 text-[var(--text-secondary)] border border-purple-500/30 font-bold'
                        : 'text-[var(--text-muted)] hover:bg-[var(--card-elevated)] hover:text-[var(--text-main)]'
                    } ${collapsed ? 'justify-center px-2' : ''}`}
                    title={collapsed ? m.title_ar : undefined}
                  >
                    <div className="flex items-center gap-3">
                      <IconComponent className={`w-4 h-4 shrink-0 ${active ? 'text-purple-400' : 'text-[var(--text-muted)]'}`} />
                      {!collapsed && <span>{m.title_ar}</span>}
                    </div>

                    {!collapsed && (
                      <div>
                        {m.status === 'live' && (
                          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
                        )}
                        {m.status === 'coming_soon' && (
                          <span className="badge-glass px-2 py-0.5 rounded-lg text-[9px] text-[var(--text-muted)]">
                            قريباً
                          </span>
                        )}
                      </div>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Admin Section (Based on RBAC permissions) */}
          {filteredAdminModules.length > 0 && (
            <div>
              {!collapsed && (
                <div className="px-3 pb-2 text-[10px] font-bold text-[var(--text-muted)] tracking-wider uppercase">
                  لوحة الإدارة والإشراف
                </div>
              )}
              <nav className="space-y-1">
                {filteredAdminModules.map((m) => {
                  const IconComponent = MODULE_ICONS[m.key] || LayoutDashboard;
                  const active = isModuleActive(m);

                  return (
                    <Link
                      key={m.key}
                      href={getModuleHref(m)}
                      onClick={onCloseMobile}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                        active
                          ? 'bg-purple-500/15 text-[var(--text-secondary)] border border-purple-500/30 font-bold'
                          : 'text-[var(--text-muted)] hover:bg-[var(--card-elevated)] hover:text-[var(--text-main)]'
                      } ${collapsed ? 'justify-center px-2' : ''}`}
                      title={collapsed ? m.title_ar : undefined}
                    >
                      <div className="flex items-center gap-3">
                        <IconComponent className={`w-4 h-4 shrink-0 ${active ? 'text-purple-400' : 'text-[var(--text-muted)]'}`} />
                        {!collapsed && <span>{m.title_ar}</span>}
                      </div>

                      {!collapsed && (
                        <div>
                          {m.status === 'beta' && (
                            <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                              تجريبي
                            </span>
                          )}
                          {m.status === 'live' && (
                            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
                          )}
                          {m.status === 'coming_soon' && (
                            <span className="badge-glass px-2 py-0.5 rounded-lg text-[9px] text-[var(--text-muted)]">
                              قريباً
                            </span>
                          )}
                        </div>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>
          )}

        </div>

        {/* Footer info: Connected Line with Emerald status */}
        <div className="p-3 border-t border-[var(--border-subtle)] bg-[var(--card-elevated)]/40">
          {!collapsed ? (
            <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-semibold text-[var(--text-main)]">{selectedLine.title_ar}</span>
              </div>
              <span className="text-[10px] text-emerald-400 font-mono">نشط</span>
            </div>
          ) : (
            <div className="flex justify-center">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" title="الخط متصل" />
            </div>
          )}
        </div>

      </aside>
    </>
  );
}
