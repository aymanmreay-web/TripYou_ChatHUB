'use client';
/**
 * QCConversationList — قائمة المحادثات (العمود الأيسر)
 * ─────────────────────────────────────────────────────────────
 * ✅ محدد الصناديق للاستقبال (Box Selector)
 * ✅ فلاتر سريعة (الكل، غير مقروء، مباشر، مجموعات)
 * ✅ عرض اسم المحادثة وتوقيتها وحالة الموظف المسند
 */
import React, { useRef, useEffect } from 'react';
import {
  Search, X, MessageSquare, Users, Zap, Wifi, WifiOff, Loader2,
  RefreshCw, Bell, Inbox, ShieldCheck
} from 'lucide-react';
import type { QCConversation, QCFilterTab, QCInbox } from './useQuickChats';

interface Props {
  conversations: QCConversation[];
  allCount: number;
  activeId: string;
  filterTab: QCFilterTab;
  searchQuery: string;
  isLoading: boolean;
  connectionStatus: 'connected' | 'connecting' | 'offline';
  inboxes: QCInbox[];
  selectedInboxId: string;
  onSelectInbox: (id: string) => void;
  onSelect: (id: string) => void;
  onFilterChange: (tab: QCFilterTab) => void;
  onSearchChange: (q: string) => void;
  onLoadMore: () => void;
  onRefresh: () => void;
  getLineTitle: (name: string) => string;
}

const TABS: { key: QCFilterTab; label: string; icon: React.ReactNode }[] = [
  { key: 'all', label: 'الكل', icon: <MessageSquare className="w-3.5 h-3.5" /> },
  { key: 'unread', label: 'غير مقروء', icon: <Bell className="w-3.5 h-3.5" /> },
  { key: 'direct', label: 'مباشر', icon: <Zap className="w-3.5 h-3.5" /> },
  { key: 'groups', label: 'مجموعات', icon: <Users className="w-3.5 h-3.5" /> },
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.trim().slice(0, 2).toUpperCase();
}

function AvatarCircle({ conv }: { conv: QCConversation }) {
  const letter = getInitials(conv.title) || conv.avatar_letter || '؟';
  if (conv.avatar_url) {
    return (
      <div className="relative shrink-0">
        <img
          src={conv.avatar_url}
          alt={conv.title}
          className="w-12 h-12 rounded-full object-cover"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
        {conv.unread_count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-[var(--card-bg)]" />
        )}
      </div>
    );
  }
  return (
    <div className="relative shrink-0">
      <div
        className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm text-white ${
          conv.is_group
            ? 'bg-gradient-to-br from-indigo-500 to-purple-600'
            : 'bg-gradient-to-br from-emerald-500 to-teal-600'
        }`}
      >
        {conv.is_group ? <Users className="w-5 h-5" /> : letter}
      </div>
      {conv.unread_count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-[var(--card-bg)]" />
      )}
    </div>
  );
}

export function QCConversationList({
  conversations,
  allCount,
  activeId,
  filterTab,
  searchQuery,
  isLoading,
  connectionStatus,
  inboxes,
  selectedInboxId,
  onSelectInbox,
  onSelect,
  onFilterChange,
  onSearchChange,
  onLoadMore,
  onRefresh,
  getLineTitle,
}: Props) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sentinelRef.current) return;
    const obs = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) onLoadMore(); },
      { threshold: 0.5 }
    );
    obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, [onLoadMore]);

  const totalUnread = conversations.reduce((s, c) => s + (c.unread_count || 0), 0);

  return (
    <div className="flex flex-col h-full bg-[var(--card-bg)] border-l border-[var(--border-subtle)]" dir="rtl">
      {/* ── Header ── */}
      <div className="px-4 pt-4 pb-2 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-purple-400" />
            <h2 className="font-bold text-base text-[var(--text-main)]">المحادثات السريعة</h2>
            {totalUnread > 0 && (
              <span className="bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                {totalUnread > 99 ? '99+' : totalUnread}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1">
              {connectionStatus === 'connected' && (
                <span title="متصل"><Wifi className="w-3.5 h-3.5 text-emerald-400" /></span>
              )}
              {connectionStatus === 'connecting' && (
                <span title="جارٍ الاتصال"><Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" /></span>
              )}
              {connectionStatus === 'offline' && (
                <span title="غير متصل"><WifiOff className="w-3.5 h-3.5 text-red-400" /></span>
              )}
            </div>
            <button
              onClick={onRefresh}
              className="p-1.5 rounded-xl hover:bg-[var(--card-elevated)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
              title="تحديث"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* ── محدد الصناديق للاستقبال (Inbox Scope Selector) ── */}
        {inboxes.length > 0 && (
          <div className="mb-3">
            <div className="flex items-center gap-1 text-[11px] text-[var(--text-muted)] mb-1">
              <Inbox className="w-3.5 h-3.5 text-purple-400" />
              <span>صندوق الاستقبال:</span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-0.5">
              <button
                onClick={() => onSelectInbox('all')}
                className={`text-xs px-2.5 py-1 rounded-xl whitespace-nowrap transition-all font-medium ${
                  selectedInboxId === 'all'
                    ? 'bg-purple-600 text-white shadow-sm font-bold'
                    : 'bg-[var(--card-elevated)] text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--border-subtle)]'
                }`}
              >
                جميع الصناديق
              </button>
              {inboxes.map((ib) => (
                <button
                  key={ib.id}
                  onClick={() => onSelectInbox(ib.id)}
                  className={`text-xs px-2.5 py-1 rounded-xl whitespace-nowrap transition-all font-medium ${
                    selectedInboxId === ib.id
                      ? 'bg-purple-600 text-white shadow-sm font-bold'
                      : 'bg-[var(--card-elevated)] text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--border-subtle)]'
                  }`}
                >
                  {ib.name_ar}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Search ── */}
        <div className="relative mb-3">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input
            type="text"
            dir="rtl"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="بحث في المحادثات..."
            className="w-full bg-[var(--card-elevated)] border border-[var(--border-subtle)] rounded-2xl pr-9 pl-8 py-2 text-sm text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-purple-500 transition-colors text-right"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-main)]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* ── Filter Tabs ── */}
        <div className="flex gap-1 overflow-x-auto scrollbar-hide">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => onFilterChange(tab.key)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                filterTab === tab.key
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--card-elevated)]'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── List ── */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2">
            <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
            <p className="text-xs text-[var(--text-muted)]">جارٍ تحميل المحادثات...</p>
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2 p-4">
            <MessageSquare className="w-8 h-8 text-[var(--text-muted)]/40" />
            <p className="text-xs text-[var(--text-muted)] text-center">
              {searchQuery ? 'لا توجد نتائج للبحث' : 'لا توجد محادثات في هذا الصندوق'}
            </p>
          </div>
        ) : (
          <>
            {conversations.map((conv) => (
              <QCConvRow
                key={conv.id}
                conv={conv}
                isActive={conv.id === activeId}
                onSelect={onSelect}
                getLineTitle={getLineTitle}
              />
            ))}
            <div ref={sentinelRef} className="h-4" />
          </>
        )}
      </div>

      {/* ── Footer Counter ── */}
      {allCount > 0 && (
        <div className="px-4 py-2 border-t border-[var(--border-subtle)] shrink-0">
          <p className="text-[10px] text-[var(--text-muted)] text-center">
            {conversations.length === allCount
              ? `${allCount} محادثة`
              : `${conversations.length} من ${allCount} محادثة`}
          </p>
        </div>
      )}
    </div>
  );
}

interface RowProps {
  conv: QCConversation;
  isActive: boolean;
  onSelect: (id: string) => void;
  getLineTitle: (name: string) => string;
}

function QCConvRow({ conv, isActive, onSelect, getLineTitle }: RowProps) {
  const lineTitle = getLineTitle(conv.line_id);
  const hasUnread = (conv.unread_count || 0) > 0;
  const availableLines = conv.available_lines || [conv.line_id];

  return (
    <button
      onClick={() => onSelect(conv.id)}
      className={`w-full px-4 py-3 flex items-start gap-3 text-right transition-all border-b border-[var(--border-subtle)]/30 ${
        isActive
          ? 'bg-purple-500/10 border-r-2 border-r-purple-500'
          : 'hover:bg-[var(--card-elevated)]/60'
      }`}
      dir="rtl"
    >
      <AvatarCircle conv={conv} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span
            className={`text-sm truncate ${
              hasUnread ? 'font-bold text-[var(--text-main)]' : 'font-semibold text-[var(--text-main)]'
            }`}
          >
            {conv.title}
          </span>
          <span className="text-[10px] text-[var(--text-muted)] shrink-0 font-mono">
            {conv.last_message_at}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <p
            className={`text-xs truncate ${
              hasUnread ? 'text-[var(--text-main)]/80' : 'text-[var(--text-muted)]'
            }`}
          >
            {conv.last_message_text}
          </p>
          {hasUnread && (
            <span className="shrink-0 min-w-[18px] h-[18px] rounded-full bg-green-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
              {conv.unread_count > 99 ? '99+' : conv.unread_count}
            </span>
          )}
        </div>

        {/* عرض الموظف المسند والخطوط المرتبطة */}
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {conv.assigned_staff_name && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-purple-500/15 text-purple-300 border border-purple-500/30 font-medium">
              مسند لـ: {conv.assigned_staff_name}
            </span>
          )}
          {availableLines.length > 1 ? (
            <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-[var(--card-surface)] text-cyan-300 border border-cyan-500/30 font-medium">
              {availableLines.length} خطوط مشتركة
            </span>
          ) : (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[var(--card-surface)] text-[var(--text-muted)] border border-[var(--border-subtle)] font-medium">
              {lineTitle}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
