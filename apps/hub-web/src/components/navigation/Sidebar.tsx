'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  MessageSquare, Users, CheckSquare, Video, BarChart2, Send,
  Bell, UserCircle, LayoutDashboard, PhoneCall, Inbox,
  Users2, UserCheck, Shield, PenTool, Contact, Share2,
  FileSpreadsheet, History, Settings, Activity, Megaphone,
  Search, ChevronLeft, ChevronRight, Layers, Sparkles,
  Tags, Star, Building2, MessageSquareQuote, Palette, Sun, Moon
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ModuleContract } from '../../types';
import { fetchCompany } from '../../lib/hubDb';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const MODULE_ICONS: Record<string, React.ElementType> = {
  inbox: MessageSquare,
  contacts: Users,
  favorites: Star,
  tasks: CheckSquare,
  meetings: Video,
  my_reports: BarChart2,
  campaigns: Send,
  canned: MessageSquareQuote,
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
  settings: Building2,
  health: Activity,
  campaigns_admin: Megaphone,
  appearance: Palette,
};

export function Sidebar({ collapsed, onToggleCollapse, mobileOpen, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const { user, userModules, adminModules, selectedLine, mode, toggleMode } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // صلاحية ظهور لوحة الإدارة والإشراف: للمدير والمشرف حصراً (قرار المالك)
  // حتى لو مُنحت صلاحية وحدة إدارية للموظف — القائمة لا تظهر له أساساً
  const canAccessAdmin = useMemo(() => {
    if (!user) return false;
    return ['super_admin', 'sales_lead', 'admin'].includes(user.role);
  }, [user]);

  // التبويب النشط في القائمة الجانبية: مساحة الموظف أم لوحة الإدارة
  const [activeTab, setActiveTab] = useState<'user' | 'admin'>('user');

  // مزامنة التبويب تلقائياً مع المسار الحالي
  useEffect(() => {
    const isAdminPath =
      pathname.startsWith('/admin_dashboard') ||
      pathname.startsWith('/admin_appearance') ||
      pathname.startsWith('/module/lines') ||
      pathname.startsWith('/module/inboxes') ||
      pathname.startsWith('/module/labels') ||
      pathname.startsWith('/module/staff') ||
      pathname.startsWith('/module/settings') ||
      pathname.startsWith('/module/signature') ||
      pathname.startsWith('/module/groups_admin') ||
      pathname.startsWith('/module/roles');

    if (isAdminPath && canAccessAdmin) {
      setActiveTab('admin');
    } else if (!isAdminPath) {
      setActiveTab('user');
    }
  }, [pathname, canAccessAdmin]);

  // Company branding dynamic state
  const [companyBranding, setCompanyBranding] = useState<{
    company_name: string;
    platform_title: string;
    logo_url: string | null;
  }>({
    company_name: '',
    platform_title: 'TripYou_ChatHUB',
    logo_url: null,
  });

  // Load dynamic branding
  useEffect(() => {
    function applyBranding(parsed: any) {
      setCompanyBranding({
        company_name: parsed.company_name || '',
        platform_title: parsed.platform_title || 'TripYou_ChatHUB',
        logo_url: parsed.logo_url || null,
      });
    }
    async function loadBranding() {
      try {
        const cached = localStorage.getItem('hub_company_branding');
        if (cached) applyBranding(JSON.parse(cached));
      } catch (e) {}
      try {
        const fresh = await fetchCompany();
        if (fresh) {
          applyBranding(fresh);
          try {
            localStorage.setItem('hub_company_branding', JSON.stringify(fresh));
          } catch (e) {}
        }
      } catch (e) {}
    }
    loadBranding();
    window.addEventListener('branding-updated', loadBranding);
    return () => window.removeEventListener('branding-updated', loadBranding);
  }, []);

  // Preserve scroll position
  useEffect(() => {
    const savedPos = sessionStorage.getItem('sidebar_scroll_top');
    if (savedPos && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = parseInt(savedPos, 10);
    }
  }, [pathname]);

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      sessionStorage.setItem('sidebar_scroll_top', scrollContainerRef.current.scrollTop.toString());
    }
  };

  const filterModules = (list: ModuleContract[]) => {
    if (!searchTerm.trim()) return list;
    return list.filter((m) => m.title_ar.includes(searchTerm) || m.key.includes(searchTerm));
  };

  const filteredUserModules = filterModules(userModules);
  const filteredAdminModules = filterModules(adminModules);

  const getModuleHref = (m: ModuleContract) => {
    if (m.key === 'inbox') return '/inbox';
    if (m.key === 'favorites') return '/module/favorites';
    if (m.key === 'profile') return '/profile';
    if (m.key === 'admin_dashboard') return '/admin_dashboard';
    if (m.key === 'appearance') return '/admin_appearance';
    if (m.key === 'contacts_admin') return '/module/contacts';
    return `/module/${m.key}`;
  };

  const isModuleActive = (m: ModuleContract) => {
    const href = getModuleHref(m);
    if (href === '/inbox' && (pathname === '/inbox' || pathname === '/')) return true;
    return pathname === href;
  };

  // قائمة العناصر الحالية بحسب التبويب النشط
  const currentModules = activeTab === 'admin' ? filteredAdminModules : filteredUserModules;

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

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
            <Link href="/inbox" className="flex items-center gap-2.5 overflow-hidden">
              {companyBranding.logo_url ? (
                <div className="w-10 h-10 rounded-2xl bg-[var(--card-elevated)] border border-[var(--border-subtle)] flex items-center justify-center p-1 shrink-0 overflow-hidden shadow-md">
                  <img src={companyBranding.logo_url} alt="Logo" className="w-full h-full object-contain" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-2xl avatar-ring p-[2px] shrink-0 shadow-md">
                  <div className="w-full h-full rounded-[14px] bg-[var(--card-bg)] flex items-center justify-center text-[var(--text-main)] font-black text-lg">
                    {companyBranding.platform_title.slice(0, 2).toUpperCase()}
                  </div>
                </div>
              )}
              <div className="flex flex-col min-w-0">
                <span className="font-extrabold text-sm tracking-tight text-[var(--text-main)] truncate">
                  {companyBranding.platform_title}
                </span>
                <span className="text-[10px] text-purple-300/80 font-semibold truncate">
                  {companyBranding.company_name}
                </span>
              </div>
            </Link>
          ) : (
            <Link href="/inbox" className="mx-auto">
              {companyBranding.logo_url ? (
                <div className="w-10 h-10 rounded-2xl bg-[var(--card-elevated)] border border-[var(--border-subtle)] flex items-center justify-center p-1 overflow-hidden shadow-md">
                  <img src={companyBranding.logo_url} alt="Logo" className="w-full h-full object-contain" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-2xl avatar-ring p-[2px] shadow-md">
                  <div className="w-full h-full rounded-[14px] bg-[var(--card-bg)] flex items-center justify-center text-[var(--text-main)] font-black text-base">
                    {companyBranding.platform_title.slice(0, 2).toUpperCase()}
                  </div>
                </div>
              )}
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

        {/* ════════════════════════════════════════════════════════
            تبويبان رئيسيان: مساحة الموظف / لوحة الإدارة والإشراف
            يظهر تبويب الإدارة فقط للمستخدمين المصرح لهم (Admin / Lead)
           ════════════════════════════════════════════════════════ */}
        {!collapsed && canAccessAdmin && (
          <div className="p-3 pb-0">
            <div className="grid grid-cols-2 gap-1 p-1 bg-[var(--card-elevated)]/80 rounded-2xl border border-[var(--border-subtle)] shadow-inner">
              <button
                type="button"
                onClick={() => setActiveTab('user')}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 ${
                  activeTab === 'user'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-950/40'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-white/5'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>مساحة الموظف</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('admin')}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 ${
                  activeTab === 'admin'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-950/40'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-white/5'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>الإدارة والإشراف</span>
              </button>
            </div>
          </div>
        )}

        {/* Quick Search */}
        {!collapsed && (
          <div className="p-3 border-b border-[var(--border-subtle)]">
            <div className="relative">
              <Search className="w-4 h-4 text-[var(--text-muted)] absolute right-3 top-2.5" />
              <input
                type="text"
                placeholder={activeTab === 'admin' ? 'بحث في أدوات الإدارة...' : 'بحث في مساحة الموظف...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[var(--card-elevated)] border border-[var(--border-subtle)] rounded-2xl pr-9 pl-3 py-1.5 text-xs text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>
          </div>
        )}

        {/* Navigation Section with Scroll Preservation */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-3 space-y-1"
        >
          {/* Header عنوان القسم الحالي عند الفتح */}
          {!collapsed && (
            <div className="px-3 pb-2 text-[10px] font-bold text-[var(--text-muted)] tracking-wider uppercase flex items-center justify-between">
              <span>{activeTab === 'admin' ? 'لوحة الإدارة والإشراف' : 'مساحة الموظف'}</span>
              <span className="text-[10px] font-mono text-purple-400">
                {currentModules.length} أقسام
              </span>
            </div>
          )}

          <nav className="space-y-1">
            {currentModules.map((m) => {
              const IconComponent = MODULE_ICONS[m.key] || MessageSquare;
              const active = isModuleActive(m);

              return (
                <Link
                  key={m.key}
                  href={getModuleHref(m)}
                  onClick={onCloseMobile}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                    active
                      ? 'bg-purple-500/15 text-[var(--text-secondary)] border border-purple-500/30 font-bold shadow-sm'
                      : 'text-[var(--text-muted)] hover:bg-[var(--card-elevated)] hover:text-[var(--text-main)]'
                  } ${collapsed ? 'justify-center px-2' : ''}`}
                  title={collapsed ? m.title_ar : undefined}
                >
                  <div className="flex items-center gap-3">
                    <IconComponent
                      className={`w-4 h-4 shrink-0 ${active ? 'text-purple-400' : 'text-[var(--text-muted)]'}`}
                    />
                    {!collapsed && <span>{m.title_ar}</span>}
                  </div>

                  {!collapsed && (
                    <div>
                      {m.status === 'live' && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
                      )}
                    </div>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* بطاقة المستخدم + تبديل الوضع (نمط v1: شمس/قمر أسفل الشريط) */}
        <div className={`mt-auto shrink-0 border-t border-[var(--border-subtle)] bg-[var(--card-bg)]/60 p-3 flex items-center gap-2.5 ${collapsed ? 'justify-center' : ''}`}>
          <div
            className="w-9 h-9 rounded-full avatar-ring p-[2px] shrink-0"
            title={user?.full_name || 'موظف'}
          >
            <div className="w-full h-full rounded-full bg-[var(--card-elevated)] flex items-center justify-center text-[var(--text-main)] font-bold text-sm">
              {(user?.full_name || 'م').trim().charAt(0) || 'م'}
            </div>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-[var(--text-main)] truncate">
                {user?.full_name || 'موظف'}
              </div>
              <div className="text-[10px] text-[var(--text-muted)] truncate">
                {user?.role_title_ar || user?.role || ''}
              </div>
            </div>
          )}
          <button
            onClick={toggleMode}
            title={mode === 'dark' ? 'التحويل للوضع الفاتح' : 'التحويل للوضع الداكن'}
            aria-label="تبديل الوضع"
            className="w-9 h-9 rounded-full bg-[var(--card-elevated)] border border-[var(--border-subtle)] hover:border-[var(--border-glow)] flex items-center justify-center text-[var(--text-main)] active:scale-90 transition-all shrink-0"
          >
            {mode === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-[var(--text-secondary)]" />
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
