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
  dbTags: { id: string; name: string; hex_color: string }[];
  getLineDisplayTitle: (id: string) => string;
  /** هل نحن في وضع «كل الخطوط»؟ عندها تظهر شارة الخطوط المتعددة للمحادثات المشتركة */
  multiLine: boolean;
}

export function ConversationRow({ conv, isSelected, onSelect, dbTags, getLineDisplayTitle, multiLine }: ConversationRowProps) {
  return (
    <button
      key={conv.id}
      onClick={() => onSelect(conv.id)}
      className={`w-full p-3 text-right flex items-start gap-3 transition-colors ${
        isSelected
          ? 'bg-purple-950/40 border-r-4 border-purple-500'
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
          {/* حالة المحادثة في القائمة مع وسام الخط */}
          <div className="flex items-center gap-1.5">
            {conv.available_lines && conv.available_lines.length > 1 && multiLine ? (
              <span
                className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold bg-purple-950/70 text-purple-200 border border-purple-700/50 flex items-center gap-1"
                title={`محادثة مشتركة عبر الخطوط: ${conv.available_lines.map((l) => getLineDisplayTitle(l)).join(', ')}`}
              >
                <bdi dir="ltr">{conv.available_lines.map((l) => getLineDisplayTitle(l)).join(' • ')}</bdi>
              </span>
            ) : (
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold border ${
                  conv.line_id === 'Master'
                    ? 'bg-blue-950/60 text-blue-300 border-blue-800/50'
                    : 'bg-emerald-950/60 text-emerald-300 border-emerald-800/50'
                }`}
                title={`وارد عبر خط: ${getLineDisplayTitle(conv.line_id)}`}
              >
                <bdi dir="ltr">{getLineDisplayTitle(conv.line_id || 'Master')}</bdi>
              </span>
            )}

            <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${statusBadge(conv.status)}`}>
              {statusLabel(conv.status)}
            </span>

            {/* عدّاد الانتظار الحي (نمط v1) — للحالات النشطة فقط */}
            <SlaTimer since={conv.last_customer_message_timestamp} status={conv.status} />

            <span className="text-[10px] text-slate-400 truncate max-w-[80px]">
              {conv.assigned_staff_name || 'عام'}
            </span>

            {/* م3: شارات الوسوم من القاعدة (أول وسمين + عدّاد) */}
            {(conv.tags || []).length > 0 && (
              <span className="flex items-center gap-1">
                {(conv.tags || []).slice(0, 2).map((tagName) => {
                  const t = dbTags.find((x) => x.name === tagName);
                  return (
                    <span
                      key={tagName}
                      className="text-[9px] px-1.5 py-0.5 rounded font-semibold border"
                      style={{
                        background: `${t?.hex_color || '#8b5cf6'}22`,
                        color: t?.hex_color || '#8b5cf6',
                        borderColor: `${t?.hex_color || '#8b5cf6'}55`,
                      }}
                    >
                      🏷 {tagName}
                    </span>
                  );
                })}
                {(conv.tags || []).length > 2 && (
                  <span className="text-[9px] px-1 rounded bg-slate-800 text-slate-400 font-mono">
                    +{(conv.tags || []).length - 2}
                  </span>
                )}
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
