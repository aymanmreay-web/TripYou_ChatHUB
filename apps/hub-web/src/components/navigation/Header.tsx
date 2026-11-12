'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Menu, Bell, LogOut, Check, ChevronDown, CheckCheck, Moon } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../lib/supabase';
import { isQuietHoursNow } from '../../lib/inbox/time';
import { toast } from '../common/Toaster';
import { NotificationItem, kindIcon, timeAgo } from '../../lib/notificationsUi';
import { Button, Avatar, Badge } from '@tripyou/ui';

interface HeaderProps {
  onOpenMobile: () => void;
}

export function Header({ onOpenMobile }: HeaderProps) {
  const {
    user,
    logout,
  } = useApp();
  const router = useRouter();

  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const staffId = user?.id || null;
  const notificationsRef = useRef(notificationsOpen);
  notificationsRef.current = notificationsOpen;

  const loadNotifications = useCallback(async () => {
    if (!staffId) return;
    try {
      const res = await fetch(`/api/notifications?staff_id=${encodeURIComponent(staffId)}`, { cache: 'no-store' });
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread || 0);
    } catch { /* صامت */ }
  }, [staffId]);

  // تحميل أولي + تحديث دوري
  useEffect(() => {
    if (!staffId) return;
    loadNotifications();
    const interval = setInterval(loadNotifications, 45000);
    return () => clearInterval(interval);
  }, [staffId, loadNotifications]);

  // Realtime: إشعار جديد يصل فوراً (الجرس + توست)
  useEffect(() => {
    if (!staffId) return;
    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          const n = payload.new as NotificationItem;
          if (!n || n.staff_id !== staffId) return;
          setNotifications((prev) => [n, ...prev].slice(0, 30));
          setUnreadCount((c) => c + 1);
          if (!notificationsRef.current) {
            toast({ title: n.title, body: n.body || undefined, kind: 'notification' });
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [staffId]);

  const markRead = useCallback(async (id?: string) => {
    if (!staffId) return;
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staff_id: staffId, id, all: !id }),
      });
    } catch { /* صامت */ }
  }, [staffId]);

  const handleNotificationClick = async (n: NotificationItem) => {
    if (!n.read_at) {
      setUnreadCount((c) => Math.max(0, c - 1));
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)));
      await markRead(n.id);
    }
    setNotificationsOpen(false);
    if (n.link) router.push(n.link);
  };

  const handleMarkAll = async () => {
    setUnreadCount(0);
    setNotifications((prev) => prev.map((x) => ({ ...x, read_at: x.read_at || new Date().toISOString() })));
    await markRead();
  };

  return (
    <header className="h-16 bg-[var(--card-bg)]/85 backdrop-blur-xl border-b border-[var(--border-subtle)] px-3 sm:px-6 flex items-center justify-between sticky top-0 z-30 transition-colors duration-200" dir="rtl">
      
      {/* Right side (RTL start): Mobile toggle + Live System Pulse */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        <button
          onClick={onOpenMobile}
          className="lg:hidden p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--card-elevated)] transition-colors"
          title="القائمة الرئيسية"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* نبض الاتصال الحي المباشر للنظام */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-[var(--card-elevated)] border border-[var(--border-subtle)] text-right shadow-sm">
          <div className="relative flex items-center justify-center w-2 h-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 animate-pulse"></span>
          </div>
          <span className="text-xs font-bold text-[var(--text-main)]">النظام متصل ونشط</span>
        </div>

        {/* حارس المخاطر — شريحة ساعات الهدوء في الشريط العلوي (قرار المالك: مكانها هنا لا فوق المحادثات) */}
        {isQuietHoursNow() && (
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-right shadow-sm border"
            style={{ background: 'color-mix(in srgb, var(--warn) 14%, transparent)', borderColor: 'color-mix(in srgb, var(--warn) 40%, transparent)', color: 'var(--warn)' }}
            title="حارس المخاطر: الإرسال الجديد في ساعات الهدوء (01:00–07:00 بتوقيت مكة) يحتاج تأكيداً لحماية الأرقام من الحظر"
          >
            <Moon className="w-3.5 h-3.5 animate-pulse" />
            <span className="text-xs font-bold hidden sm:inline">حارس المخاطر: ساعات الهدوء نشطة</span>
            <span className="text-xs font-bold sm:hidden">هدوء</span>
          </div>
        )}
      </div>

      {/* Left side (RTL end): Theme Selector + Mode Toggle + Role Switcher + Profile */}
      <div className="flex items-center gap-2 sm:gap-3">

        {/* ملاحظة: التحكم بالمظهر والثيمات والخطوط انتقل إلى «المظهر والتخصيص» في لوحة الإدارة — الترويسة نظيفة */}

        {/* Notifications Icon with Live Popover */}
        <div className="relative">
          <button
            onClick={() => {
              setNotificationsOpen(!notificationsOpen);
              setRoleDropdownOpen(false);
              if (!notificationsOpen) loadNotifications();
            }}
            className="p-2 sm:p-2.5 rounded-2xl text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--card-elevated)] border border-transparent hover:border-[var(--border-subtle)] transition-colors relative"
            title="التنبيهات"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -left-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center shadow-lg">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {notificationsOpen && (
            <div className="absolute left-0 mt-2 w-80 sm:w-96 bg-[var(--card-bg)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl z-50 animate-in fade-in zoom-in-95 glass-panel overflow-hidden" dir="rtl">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]">
                <span className="font-bold text-xs text-[var(--text-main)]">الإشعارات والتنبيهات</span>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAll}
                    className="flex items-center gap-1 text-[10px] text-purple-400 hover:text-purple-300 font-bold transition-colors"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    تعليم الكل كمقروء
                  </button>
                )}
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-[var(--text-muted)]">
                    لا توجد إشعارات بعد — ستصلك تنبيهات الرسائل الجديدة هنا فوراً
                  </div>
                ) : (
                  notifications.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className={`w-full text-right flex items-start gap-2.5 px-4 py-3 border-b border-[var(--border-subtle)] last:border-b-0 hover:bg-[var(--card-elevated)] transition-colors ${
                        !n.read_at ? 'bg-purple-500/5' : ''
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {kindIcon(n.kind)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-xs leading-relaxed ${!n.read_at ? 'font-bold text-[var(--text-main)]' : 'text-[var(--text-main)]'}`}>
                          {n.title}
                        </div>
                        {n.body && (
                          <div className="text-[11px] text-[var(--text-muted)] line-clamp-2 mt-0.5 leading-relaxed">{n.body}</div>
                        )}
                        <div className="text-[10px] text-[var(--text-muted)] mt-1">{timeAgo(n.created_at)}</div>
                      </div>
                      {!n.read_at && <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0 mt-1" />}
                    </button>
                  ))
                )}
              </div>
              <Link
                href="/module/notifications"
                onClick={() => setNotificationsOpen(false)}
                className="block text-center text-[11px] font-bold text-purple-400 hover:text-purple-300 py-2.5 border-t border-[var(--border-subtle)] transition-colors"
              >
                عرض كل الإشعارات
              </Link>
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
