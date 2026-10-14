'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Menu, Bell, Smartphone, UserCheck, LogOut, Check, ChevronDown } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Button, Avatar, Badge } from '@resvbar/ui';
import { MOCK_USERS } from '../../lib/mock-data';

interface HeaderProps {
  onOpenMobile: () => void;
}

export function Header({ onOpenMobile }: HeaderProps) {
  const { user, userKey, setUserKey, selectedLine, selectedLineId, setSelectedLineId, lines, logout } = useApp();
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [lineDropdownOpen, setLineDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  return (
    <header className="h-16 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Right side (RTL start): Mobile toggle + Line Badge */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobile}
          className="lg:hidden p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-900 transition-colors"
          title="القائمة الرئيسية"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* WhatsApp Line Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setLineDropdownOpen(!lineDropdownOpen);
              setRoleDropdownOpen(false);
              setNotificationsOpen(false);
            }}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-emerald-500/40 transition-colors text-right"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <div className="hidden sm:block">
              <div className="text-xs font-semibold text-white leading-none">{selectedLine.title_ar}</div>
              <div className="text-[11px] text-slate-400 font-mono mt-0.5">{selectedLine.phone_masked}</div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {lineDropdownOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95">
              <div className="text-xs font-semibold text-slate-400 px-3 py-1.5 mb-1">
                الخطوط المرتبطة (Baileys)
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
                      ? 'bg-emerald-500/10 text-emerald-300 font-semibold border border-emerald-500/20'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="text-right">
                    <div>{l.title_ar}</div>
                    <div className="text-slate-500 font-mono text-[10px]">{l.phone_masked}</div>
                  </div>
                  {l.id === selectedLineId && <Check className="w-4 h-4 text-emerald-400" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Left side (RTL end): Role switcher + Notifications + Profile */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Dynamic Role Switcher for HUB-004 Testing */}
        <div className="relative">
          <button
            onClick={() => {
              setRoleDropdownOpen(!roleDropdownOpen);
              setLineDropdownOpen(false);
              setNotificationsOpen(false);
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 transition-all text-xs font-medium"
            title="تبديل الصلاحية لمعاينة ديناميكية الأقسام"
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span className="hidden md:inline">الدور: {user.role_title_ar.split(' ')[0]}</span>
            <ChevronDown className="w-3 h-3" />
          </button>

          {roleDropdownOpen && (
            <div className="absolute left-0 mt-2 w-80 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95">
              <div className="text-xs font-semibold text-slate-400 px-3 py-1.5 mb-1">
                تبديل الدور التجريبي (لاختبار إخفاء/إظهار الأقسام)
              </div>
              {Object.entries(MOCK_USERS).map(([key, u]) => (
                <button
                  key={key}
                  onClick={() => {
                    setUserKey(key);
                    setRoleDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs transition-colors mb-1 ${
                    key === userKey
                      ? 'bg-amber-500/15 text-amber-300 font-semibold border border-amber-500/30'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="text-right">
                    <div className="font-medium text-white">{u.full_name}</div>
                    <div className="text-[11px] text-slate-400">{u.role_title_ar}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {u.permissions.length} صلاحية مفعلة
                    </div>
                  </div>
                  {key === userKey && <Check className="w-4 h-4 text-amber-400" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notifications Icon with simulated popover */}
        <div className="relative">
          <button
            onClick={() => {
              setNotificationsOpen(!notificationsOpen);
              setRoleDropdownOpen(false);
              setLineDropdownOpen(false);
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition-colors relative"
            title="التنبيهات"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 left-1.5 w-2 h-2 rounded-full bg-emerald-500" />
          </button>

          {notificationsOpen && (
            <div className="absolute left-0 mt-2 w-80 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800">
                <span className="font-semibold text-xs text-white">الإشعارات والتنبيهات</span>
                <Badge variant="live" size="sm">
                  لحظي
                </Badge>
              </div>
              <div className="space-y-2 text-xs text-slate-300">
                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60">
                  <div className="font-medium text-emerald-400 mb-0.5">اتصال الخط الرئيسي مستقر</div>
                  <div className="text-slate-400 text-[11px]">
                    خط الحجوزات (+966 50 *** 8811) يعمل بكفاءة كاملة.
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60">
                  <div className="font-medium text-amber-400 mb-0.5">تحديث صلاحيات الواجهة</div>
                  <div className="text-slate-400 text-[11px]">
                    تم تحديث شجرة التنقل بناءً على عقد <code>modules.json</code>.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Profile Link & Logout */}
        <div className="flex items-center gap-2 border-r border-slate-800 pr-2">
          <Link href="/profile">
            <Avatar name={user.full_name} size="sm" status="online" />
          </Link>
          <Link href="/login">
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              title="تسجيل الخروج"
              className="text-slate-400 hover:text-rose-400 p-2 h-8 w-8"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
