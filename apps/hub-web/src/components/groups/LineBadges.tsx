import React from 'react';
import { Crown } from 'lucide-react';
import { OurLineBadge, fmtDigits } from './groupsApi';

/**
 * شارات خطوطنا العضو في مجموعة — مواصفة المالك:
 * كل خط يظهر بخط عضويته وشارة 👑 أدمن / 👑👑 مالك (من أدوار المشاركين في Evolution).
 */
export function LineBadges({ lines, compact = false }: { lines: OurLineBadge[]; compact?: boolean }) {
  if (!lines || lines.length === 0) {
    return <span className="text-[10px] text-[var(--text-muted)]">لا خطوطنا عضو في هذه المجموعة</span>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {lines.map((l) => {
        const owner = l.is_super_admin;
        const admin = l.is_admin;
        return (
          <span
            key={l.instance_name}
            title={`${l.line_title} • ${fmtDigits(l.phone_e164) || 'رقم غير معروف'}${
              l.source === 'conversation' ? ' • العضوية من المحادثات — نفّذ مزامنة لتظهر الأدوار' : ''
            }`}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-bold ${
              owner
                ? 'bg-rose-500/15 text-rose-300 border-rose-500/40'
                : admin
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                  : 'bg-[var(--card-elevated)] text-[var(--text-muted)] border-[var(--border-subtle)]'
            }`}
          >
            {owner ? <Crown className="w-3 h-3" /> : admin ? <Crown className="w-3 h-3" /> : null}
            <span>{owner ? '👑👑 مالك' : admin ? '👑 أدمن' : 'عضو'}</span>
            <span className="opacity-80">{l.line_title}</span>
            {!compact && fmtDigits(l.phone_e164) ? (
              <span className="font-mono opacity-60">{fmtDigits(l.phone_e164)}</span>
            ) : null}
            {l.source === 'conversation' ? <span className="opacity-60" title="من المحادثات — مزامنة مطلوبة">؟</span> : null}
          </span>
        );
      })}
    </div>
  );
}
