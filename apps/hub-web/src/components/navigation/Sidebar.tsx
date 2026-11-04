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
import { Badge, Avatar } from '@tripyou/ui';
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
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 right-0 z-40 bg-[#0B0716]/95 backdrop-blur-xl border-l border-purple-900/30 transition-all duration-300 flex flex-col ${
          collapsed ? 'w-20' : 'w-72'
        } ${
          mobileOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 border-b border-purple-900/30 px-4 flex items-center justify-between shrink-0">
          {!collapsed ? (
            <Link href="/inbox" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-700 via-violet-600 to-purple-400 flex items-center justify-center shadow-lg shadow-emerald-950/50 border border-emerald-400/30">
                <Layers className="w-5 h-5 text-slate-950 stroke-[2.5]" />
              </div>
              <div>
                <span className="font-bold text-base text-white tracking-wide">TripYou</span>
                <span className="text-purple-300 font-semibold text-xs mr-1 px-1.5 py-0.5 rounded bg-purple-500/15 border border-purple-500/30">
                  ChatHUB
                </span>
              </div>
            </Link>
          ) : (
            <div className="mx-auto">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-700 via-violet-600 to-purple-400 flex items-center justify-center shadow-lg shadow-emerald-950/50 border border-emerald-400/30">
                <Layers className="w-5 h-5 text-slate-950 stroke-[2.5]" />
              </div>
            </div>
          )}

          {/* Desktop Collapse Toggle */}
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-slate-850 transition-colors"
            title={collapsed ? 'توسيع القائمة' : 'تصغير القائمة'}
          >
            {collapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

        {/* Search Bar (When Expanded) */}
        {!collapsed && (
          <div className="p-3 border-b border-purple-900/20">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
              <input
                type="text"
                placeholder="بحث في الأقسام..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900/90 text-xs text-slate-200 placeholder:text-slate-500 rounded-xl pr-8 pl-3 py-2 border border-slate-800 outline-none focus:border-purple-500 transition-colors"
              />
            </div>
          </div>
        )}

        {/* Modules Nav List */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-5 scrollbar-thin scrollbar-thumb-slate-800">
          {/* User Modules Section */}
          <div>
            {!collapsed && (
              <div className="text-[11px] font-semibold text-slate-400 px-3 mb-2 uppercase tracking-wider">
                مساحة العمل
              </div>
            )}
            <div className="space-y-1">
              {filteredUserModules.map((m) => {
                const Icon = MODULE_ICONS[m.key] || Sparkles;
                const active = isModuleActive(m);

                return (
                  <Link
                    key={m.key}
                    href={getModuleHref(m)}
                    onClick={onCloseMobile}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all duration-200 group relative ${
                      active
                        ? 'bg-gradient-to-l from-purple-500/20 via-purple-500/10 to-transparent text-purple-300 font-semibold border-r-2 border-purple-400'
                        : 'text-slate-300 hover:text-white hover:bg-slate-900/60'
                    }`}
                    title={collapsed ? m.title_ar : undefined}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        active ? 'text-purple-300' : 'text-slate-400 group-hover:text-slate-200'
                      }`}
                    />

                    {!collapsed && (
                      <div className="flex-1 flex items-center justify-between min-w-0">
                        <span className="truncate">{m.title_ar}</span>
                        {m.status === 'live' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                        )}
                        {m.status === 'beta' && (
                          <Badge variant="beta" size="sm">
                            تجريبي
                          </Badge>
                        )}
                        {m.status === 'coming_soon' && (
                          <span className="text-[10px] text-purple-400 bg-purple-500/10 border border-purple-500/20 px-1.5 py-0.2 rounded font-normal shrink-0">
                            قريباً
                          </span>
                        )}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Admin Modules Section */}
          {filteredAdminModules.length > 0 && (
            <div className="pt-2 border-t border-purple-900/20">
              {!collapsed && (
                <div className="text-[11px] font-semibold text-slate-400 px-3 mb-2 uppercase tracking-wider flex items-center justify-between">
                  <span>إدارة النظام</span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {filteredAdminModules.length}
                  </span>
                </div>
              )}
              <div className="space-y-1">
                {filteredAdminModules.map((m) => {
                  const Icon = MODULE_ICONS[m.key] || Settings;
                  const active = isModuleActive(m);

                  return (
                    <Link
                      key={m.key}
                      href={getModuleHref(m)}
                      onClick={onCloseMobile}
                      className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all duration-200 group relative ${
                        active
                          ? 'bg-gradient-to-l from-purple-500/20 via-purple-500/10 to-transparent text-purple-300 font-semibold border-r-2 border-purple-400'
                          : 'text-slate-300 hover:text-white hover:bg-slate-900/60'
                      }`}
                      title={collapsed ? m.title_ar : undefined}
                    >
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-colors ${
                          active ? 'text-purple-300' : 'text-slate-400 group-hover:text-slate-200'
                        }`}
                      />

                      {!collapsed && (
                        <div className="flex-1 flex items-center justify-between min-w-0">
                          <span className="truncate">{m.title_ar}</span>
                          {m.status === 'beta' && (
                            <Badge variant="beta" size="sm">
                              تجريبي
                            </Badge>
                          )}
                          {m.status === 'coming_soon' && (
                            <span className="text-[10px] text-purple-400 bg-purple-500/10 border border-purple-500/20 px-1.5 py-0.2 rounded font-normal shrink-0">
                              قريباً
                            </span>
                          )}
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* User Footer Pill */}
        <div className="p-3 border-t border-purple-900/30 bg-[#07040E]/90 shrink-0">
          <Link
            href="/profile"
            className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-900 transition-colors"
          >
            <Avatar name={user.full_name} size="sm" status="online" />
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-white truncate">{user.full_name}</div>
                <div className="text-[11px] text-slate-400 truncate">{user.role_title_ar}</div>
              </div>
            )}
          </Link>
        </div>

        {/* Copyright Footer */}
        <div className="px-3 py-2 border-t border-purple-900/20">
          <p className="text-[10px] text-slate-600 text-center leading-tight">
            © م. أيمن مريعي — By Eng. Ayman Mreay<br />
            جميع الحقوق محفوظة
          </p>
        </div>
      </aside>
    </>
  );
}
