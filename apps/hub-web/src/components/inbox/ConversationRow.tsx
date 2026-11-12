'use client';

/**
 * صف قائمة المحادثات الموحد — مستخلص من NativeChatInbox ضمن خطة التوحيد.
 * يعرض: الصورة، الاسم، المعاينة، وسام الخط، شارة الحالة (من الخريطة الموحدة)،
 * عدّاد الانتظار الحي (SlaTimer)، المُسند، الوسوم، وعدّاد غير المقروء.
 */
import React from 'react';
import { Users } from 'lucide-react';
import { ConversationItem } from '../../types';
import { initialsOrLetter } from '../../lib/nameUtils';
import { statusBadge, statusLabel } from '../../lib/inbox/uiMaps';
import { SlaTimer } from './SlaTimer';

interface ConversationRowProps {
  conv: ConversationItem;
  isSelected: boolean;
  onSelect: (id: string) => void;
  getLineDisplayTitle: (id: string) => string;
  /** هل نحن في وضع «كل الخطوط»؟ عندها تظهر شارة الخطوط المتعددة للمحادثات المشتركة */
  multiLine: boolean;
}

export function ConversationRow({ conv, isSelected, onSelect, getLineDisplayTitle, multiLine }: ConversationRowProps) {
  return (
    <button
      key={conv.id}
      onClick={() => onSelect(conv.id)}
      className={`w-full p-3 text-right flex items-start gap-3 transition-all ${
        isSelected
          ? 'bg-[var(--card-elevated)] shadow-[0_10px_28px_-16px_rgba(20,30,70,0.55)] ring-1 ring-[var(--border-glow)]'
          : 'hover:bg-purple-950/20'
      }`}
    >
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 mt-0.5 overflow-hidden border ${
          conv.is_group
            ? 'bg-purple-600/20 text-purple-300 border-purple-500/30'
            : 'bg-[var(--card-surface)] text-[var(--text-main)] border-[var(--border-subtle)]'
        }`}
      >
        {conv.avatar_url ? (
          <img src={conv.avatar_url} alt={conv.title} className="w-full h-full object-cover" />
        ) : conv.is_group ? (
          <Users className="w-5 h-5" />
        ) : (
          initialsOrLetter(conv.title, conv.avatar_letter)
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1 mb-1">
          <div className="flex items-center gap-1.5 truncate">
            <span className="font-semibold text-xs text-[var(--text-main)] truncate">
              {conv.title}
            </span>
            {conv.participant_count && (
              <span className="text-[10px] text-purple-300/80 shrink-0 font-normal">
                ({conv.participant_count})
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-400 shrink-0 font-mono">
            {conv.last_message_at}
          </span>
        </div>

        <p className="text-[11px] text-slate-300 truncate mb-1.5 leading-snug">
          {conv.last_message_text}
        </p>

        <div className="flex items-center justify-between gap-1">
          {/* حالة المحادثة + SLA فقط — الخطوط مُزالة من القائمة (تظهر في التفاصيل) */}
          <div className="flex items-center gap-1.5">
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${statusBadge(conv.status)}`}>
              {statusLabel(conv.status)}
            </span>

            {/* عدّاد الانتظار الحي (نمط v1) */}
            <SlaTimer since={conv.last_customer_message_timestamp} status={conv.status} />

            {/* وسم الإسناد يظهر فقط عند إسناد فعلي لموظف */}
            {conv.assigned_staff_name && (
              <span className="text-[9px] text-slate-400 truncate max-w-[70px] bg-slate-800/50 px-1.5 py-0.5 rounded-full border border-slate-700/40">
                {conv.assigned_staff_name}
              </span>
            )}
          </div>

          {conv.unread_count > 0 && (
            <span className="w-4 h-4 rounded-full bg-purple-500 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
              {conv.unread_count}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
