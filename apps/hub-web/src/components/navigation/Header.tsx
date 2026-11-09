'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, Bell, LogOut, Check, ChevronDown, Sun, Moon } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Button, Avatar, Badge } from '@tripyou/ui';

interface HeaderProps {
  onOpenMobile: () => void;
}

export function Header({ onOpenMobile }: HeaderProps) {
  const pathname = usePathname();
  const isInboxPage = pathname === '/inbox' || pathname === '/' || pathname?.startsWith('/inbox');
  const {
    user,
    selectedLine,
    selectedLineId,
    setSelectedLineId,
    lines,
    logout,
    theme,
    setTheme,
    mode,
    toggleMode,
  } = useApp();

  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [lineDropdownOpen, setLineDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  return (
    <header className="h-16 bg-[var(--card-bg)]/85 backdrop-blur-xl border-b border-[var(--border-subtle)] px-3 sm:px-6 flex items-center justify-between sticky top-0 z-30 transition-colors duration-200">
      
      {/* Right side (RTL start): Mobile toggle + Active WhatsApp Line with Emerald Pulse */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        <button
          onClick={onOpenMobile}
          className="lg:hidden p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--card-elevated)] transition-colors"
          title="القائمة الرئيسية"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* إذا كان المستخدم في صفحة المحادثات: نعرض شارة توضيحية موحدة تمنع التشتت والازدواجية */}
        {isInboxPage ? (
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-2xl bg-[var(--card-elevated)] border border-[var(--border-subtle)] text-right shadow-sm">
            <div className="relative flex items-center justify-center w-2.5 h-2.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 animate-pulse"></span>
            </div>
            <div className="text-right">
              <div className="text-xs font-bold text-[var(--text-main)] leading-none">
                صناديق المحادثات المجمّعة
              </div>
              <div className="hidden sm:block text-[10px] text-emerald-400 font-mono mt-0.5">
                تصفية الخطوط من شريط المحادثة
              </div>
            </div>
          </div>
        ) : (
          /* WhatsApp Line Selector Dropdown في باقي الصفحات الإدارية */
          <div className="relative">
            <button
              onClick={() => {
                setLineDropdownOpen(!lineDropdownOpen);
                setRoleDropdownOpen(false);
                setNotificationsOpen(false);
              }}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-2xl bg-[var(--card-elevated)] border border-[var(--border-subtle)] hover:border-[var(--border-glow)] transition-all text-right shadow-sm"
            >
              {/* الشارة الزمردية الخضراء المستقلة بنبض دائم */}
              <div className="relative flex items-center justify-center w-2.5 h-2.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 animate-pulse"></span>
              </div>

              <div className="text-right">
                <div className="text-xs font-bold text-[var(--text-main)] leading-none flex items-center gap-1.5">
                  <span>{selectedLine.title_ar}</span>
                  <ChevronDown className="w-3 h-3 text-[var(--text-muted)]" />
                </div>
                <div className="hidden sm:block text-[10px] text-[var(--text-muted)] font-mono mt-0.5 tabular-nums">
                  {selectedLine.phone_masked}
                </div>
              </div>
            </button>

            {lineDropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-[var(--card-bg)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 glass-panel">
                <div className="text-xs font-bold text-[var(--text-muted)] px-3 py-1.5 mb-1 border-b border-[var(--border-subtle)]">
                  خطوط واتساب المعتمدة
                </div>
                {lines.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => {
                      setSelectedLineId(l.id);
                      setLineDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs transition-colors ${
                      l.id === selectedLineId
                        ? 'bg-purple-500/15 text-[var(--text-secondary)] font-bold border border-purple-500/30'
                        : 'text-[var(--text-muted)] hover:bg-[var(--card-elevated)] hover:text-[var(--text-main)]'
                    }`}
                  >
                    <div className="text-right flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <div>
                        <div className="font-semibold">{l.title_ar}</div>
                        <div className="text-[10px] text-[var(--text-muted)] font-mono tabular-nums">{l.phone_masked}</div>
                      </div>
                    </div>
                    {l.id === selectedLineId && <Check className="w-4 h-4 text-emerald-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Left side (RTL end): Theme Selector + Mode Toggle + Role Switcher + Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        
        {/* Dynamic Multi-Theming Engine: Royal Purple vs Deep Blue */}
        <div className="flex items-center bg-[var(--card-elevated)] p-1 rounded-2xl border border-[var(--border-subtle)]">
          <button
            onClick={() => setTheme('theme-purple')}
            title="السمة البنفسجية الملكية (Royal Purple & Neon Violet)"
            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center transition-all ${
              theme === 'theme-purple'
                ? 'bg-purple-500/20 ring-2 ring-purple-500'
                : 'opacity-60 hover:opacity-100 hover:bg-[var(--card-bg)]'
            }`}
          >
            <span className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-gradient-to-tr from-purple-600 to-fuchsia-400 shadow-sm" />
          </button>
          <button
            onClick={() => setTheme('theme-google')}
            title="سمة جوجل الزجاجية (Google Glass)"
            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center transition-all ${
              theme === 'theme-google'
                ? 'bg-blue-500/20 ring-2 ring-blue-500'
                : 'opacity-60 hover:opacity-100 hover:bg-[var(--card-bg)]'
            }`}
          >
            <span className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full shadow-sm" style={{ background: 'conic-gradient(#4285F4, #EA4335, #FBBC04, #34A853, #4285F4)' }} />
          </button>
          <button
            onClick={() => setTheme('theme-blue')}
            title="السمة الزرقاء العميقة (Prussian Blue & Electric Ocean)"
            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center transition-all ${
              theme === 'theme-blue'
                ? 'bg-sky-500/20 ring-2 ring-sky-500'
                : 'opacity-60 hover:opacity-100 hover:bg-[var(--card-bg)]'
            }`}
          >
            <span className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-gradient-to-tr from-sky-500 to-blue-700 shadow-sm" />
          </button>
        </div>

        {/* Mode Toggle: Dark / Light with Instant Sync */}
        <button
          onClick={toggleMode}
          title={mode === 'dark' ? 'التحويل للوضع الفاتح' : 'التحويل للوضع الداكن'}
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-[var(--card-elevated)] border border-[var(--border-subtle)] hover:border-[var(--border-glow)] flex items-center justify-center text-[var(--text-main)] active:scale-95 transition-all shadow-sm"
        >
          {mode === 'dark' ? (
            <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
          )}
        </button>

        {/* Notifications Icon with Popover */}
        <div className="relative">
          <button
            onClick={() => {
              setNotificationsOpen(!notificationsOpen);
              setRoleDropdownOpen(false);
              setLineDropdownOpen(false);
            }}
            className="p-2 sm:p-2.5 rounded-2xl text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--card-elevated)] border border-transparent hover:border-[var(--border-subtle)] transition-colors relative"
            title="التنبيهات"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-2 left-2 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </button>

          {notificationsOpen && (
            <div className="absolute left-0 mt-2 w-80 bg-[var(--card-bg)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95 glass-panel">
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-[var(--border-subtle)]">
                <span className="font-bold text-xs text-[var(--text-main)]">الإشعارات والتنبيهات</span>
                <span className="badge-glass px-2 py-0.5 rounded-lg text-[10px] text-emerald-400 font-bold">
                  مباشر
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded-xl bg-[var(--card-elevated)] border border-[var(--border-subtle)]">
                  <div className="font-bold text-emerald-400 mb-0.5">اتصال الخط الرئيسي مستقر</div>
                  <div className="text-[var(--text-muted)] text-[11px]">
                    خط الحجوزات (+966 50 *** 8811) يعمل بكفاءة كاملة.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Profile Link & Logout */}
        <div className="flex items-center gap-1.5 sm:gap-2 border-r border-[var(--border-subtle)] pr-2">
          <Link href="/profile" className="cursor-pointer">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
              {user.full_name.charAt(0)}
            </div>
          </Link>
          <Link href="/login">
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              title="تسجيل الخروج"
              className="text-[var(--text-muted)] hover:text-rose-400 p-2 h-8 w-8"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </Link>
        </div>

      </div>
    </header>
  );
}
