'use client';

/**
 * لوحة تفاصيل المحادثة — تنزلق من اليسار بنقرة واحدة (التصميم المعتمد).
 * تجمع كل ما يخص المحادثة: الجهة، الحالة، الخط، الإسناد، عدّاد الانتظار الحي،
 * الوسوم الملونة، المفضلة، جهة الاتصال، وإحصاءات سريعة.
 * عرض فقط — كل الإجراءات تبقى في مكانها (ترويسة المحادثة وقوائمها).
 */
import React from 'react';
import {
  X, Star, Lock, Users, Phone, Tag, UserPlus, ShieldCheck,
  MessageSquare, Clock, Save,
} from 'lucide-react';
import { ConversationItem } from '../../types';
import { initialsOrLetter } from '../../lib/nameUtils';
import { statusBadge, statusLabel } from '../../lib/inbox/uiMaps';
import { SlaTimer } from './SlaTimer';

interface ConversationInfoPanelProps {
  open: boolean;
  onClose: () => void;
  conv: ConversationItem | null;
  dbTags: { id: string; name: string; hex_color: string }[];
  isFavoriteChat: boolean;
  isContactSaved: boolean;
  pinnedCount: number;
  getLineDisplayTitle: (id: string) => string;
  currentUserName: string;
  /** أدوات التحكم الكاملة (إسناد، حالة، حل، وسوم، مفضلة، قفل) — الترويسة نظيفة وكل شيء هنا */
  actions?: React.ReactNode;
}

function InfoRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 border-t border-[var(--border-subtle)] first:border-t-0">
      <span className="flex items-center gap-2 text-[0.78em] font-semibold text-[var(--text-muted)] shrink-0">
        {icon}
        {label}
      </span>
      <span className="text-[0.8em] text-[var(--text-main)] font-medium truncate">{children}</span>
    </div>
  );
}

export function ConversationInfoPanel({
  open, onClose, conv, dbTags, isFavoriteChat, isContactSaved, pinnedCount, getLineDisplayTitle, currentUserName, actions,
}: ConversationInfoPanelProps) {
  return (
    <>
      {/* حجاب النقر للإغلاق */}
      {open && <div className="absolute inset-0 z-30" onClick={onClose} aria-hidden="true" />}

      <aside
        aria-label="تفاصيل المحادثة"
        aria-hidden={!open}
        className={`absolute inset-y-0 left-0 z-40 w-[300px] max-w-[85%] bg-[var(--card-bg)] border-e border-[var(--border-subtle)] shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {!conv ? (
          <div className="flex-1 flex items-center justify-center text-xs text-[var(--text-muted)] p-6 text-center">
            اختر محادثة لعرض تفاصيلها
          </div>
        ) : (
          <>
            {/* الترويسة: الجهة */}
            <div className="relative px-4 pt-4 pb-3.5 border-b border-[var(--border-subtle)] text-center">
              <button
                onClick={onClose}
                aria-label="إغلاق التفاصيل"
                className="absolute top-3 left-3 p-1.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--card-elevated)] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="w-16 h-16 mx-auto rounded-full avatar-ring p-[2.5px]">
                <div className={`w-full h-full rounded-full flex items-center justify-center font-bold overflow-hidden border ${
                  conv.is_group
                    ? 'bg-purple-600/20 text-purple-300 border-purple-500/30'
                    : 'bg-[var(--card-surface)] text-[var(--text-main)] border-[var(--border-subtle)]'
                } text-xl`}>
                  {conv.avatar_url ? (
                    <img src={conv.avatar_url} alt={conv.title} className="w-full h-full object-cover" />
                  ) : conv.is_group ? (
                    <Users className="w-7 h-7" />
                  ) : (
                    initialsOrLetter(conv.title, conv.avatar_letter)
                  )}
                </div>
              </div>
              <b className="block mt-2 text-[0.95em] text-[var(--text-main)] truncate" style={{ fontFamily: 'var(--font-head)' }}>
                {conv.title}
              </b>
              <small className="text-[0.75em] text-[var(--text-muted)]">
                {conv.is_group ? `مجموعة واتساب${conv.participant_count ? ` · ${conv.participant_count} عضو` : ''}` : 'محادثة فردية'}
              </small>
              <div className="flex items-center justify-center gap-1.5 mt-2 flex-wrap">
                <span className={`text-[0.7em] px-2 py-0.5 rounded-full font-semibold ${statusBadge(conv.status)}`}>
                  {statusLabel(conv.status)}
                </span>
                <SlaTimer since={conv.last_customer_message_timestamp} status={conv.status} showLabel />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {/* أدوات التحكم الكاملة — نُقلت هنا لتبقى ترويسة المحادثة نظيفة */}
              {actions && (
                <div className="px-3.5 pt-3.5">
                  <span className="text-[0.75em] font-bold text-[var(--text-muted)]">التحكم بالمحادثة</span>
                  <div className="mt-2 rounded-2xl border border-[var(--border-subtle)] bg-[var(--card-elevated)] p-2.5 flex flex-col items-stretch gap-2 [&_>*]:min-w-0">
                    {actions}
                  </div>
                </div>
              )}

              {/* بطاقة الخط والإسناد */}
              <div className="p-3.5">
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--card-elevated)] overflow-hidden">
                  <InfoRow icon={<MessageSquare className="w-3.5 h-3.5" />} label="الخط">
                    <bdi dir="ltr">{getLineDisplayTitle(conv.line_id || 'Master')}</bdi>
                  </InfoRow>
                  <InfoRow icon={<UserPlus className="w-3.5 h-3.5" />} label="المسندة إلى">
                    {conv.assigned_staff_name || 'عام'}
                  </InfoRow>
                  <InfoRow icon={<ShieldCheck className="w-3.5 h-3.5" />} label="صلاحية ردّك">
                    {conv.assigned_staff_name && conv.assigned_staff_name !== currentUserName
                      ? 'اقتراح فقط — المحادثة لزميلك'
                      : 'رد وإدارة كاملة'}
                  </InfoRow>
                  {conv.available_lines && conv.available_lines.length > 1 && (
                    <InfoRow icon={<MessageSquare className="w-3.5 h-3.5" />} label="خطوط مشتركة">
                      <bdi dir="ltr">{conv.available_lines.map((l) => getLineDisplayTitle(l)).join(' • ')}</bdi>
                    </InfoRow>
                  )}
                </div>
              </div>

              {/* الوسوم */}
              <div className="px-3.5 pb-3.5">
                <span className="flex items-center gap-1.5 text-[0.75em] font-bold text-[var(--text-muted)] mb-2">
                  <Tag className="w-3.5 h-3.5" /> الوسوم
                </span>
                <div className="flex gap-1.5 flex-wrap">
                  {(conv.tags || []).length > 0 ? (
                    (conv.tags || []).map((tagName) => {
                      const t = dbTags.find((x) => x.name === tagName);
                      return (
                        <span
                          key={tagName}
                          className="text-[0.72em] px-2.5 py-1 rounded-full font-semibold border"
                          style={{
                            background: `${t?.hex_color || '#8b5cf6'}22`,
                            color: t?.hex_color || '#8b5cf6',
                            borderColor: `${t?.hex_color || '#8b5cf6'}55`,
                          }}
                        >
                          {tagName}
                        </span>
                      );
                    })
                  ) : (
                    <span className="text-[0.75em] text-[var(--text-muted)]">لا وسوم — أضفها من ترويسة المحادثة</span>
                  )}
                </div>
              </div>

              {/* بيانات الجهة */}
              <div className="px-3.5 pb-3.5">
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--card-elevated)] overflow-hidden">
                  <InfoRow icon={<Phone className="w-3.5 h-3.5" />} label={conv.is_group ? 'معرّف المجموعة' : 'الرقم'}>
                    <bdi dir="ltr" className="font-mono">{conv.phone_or_jid}</bdi>
                  </InfoRow>
                  <InfoRow icon={<Save className="w-3.5 h-3.5" />} label="جهة الاتصال">
                    {isContactSaved ? 'محفوظة ✓' : 'غير محفوظة'}
                  </InfoRow>
                  <InfoRow
                    icon={<Star className={`w-3.5 h-3.5 ${isFavoriteChat ? 'text-amber-400' : ''}`} />}
                    label="المفضلة"
                  >
                    {isFavoriteChat ? (
                      <span className="text-amber-400">★ في المفضلة</span>
                    ) : (
                      'ليست في المفضلة'
                    )}
                  </InfoRow>
                  <InfoRow icon={<Lock className="w-3.5 h-3.5" />} label="رسائل مثبّتة">
                    {pinnedCount > 0 ? `${pinnedCount} / 5` : 'لا شيء'}
                  </InfoRow>
                  <InfoRow icon={<Clock className="w-3.5 h-3.5" />} label="آخر رسالة">
                    {conv.last_message_at}
                  </InfoRow>
                  <InfoRow icon={<MessageSquare className="w-3.5 h-3.5" />} label="غير المقروء">
                    {conv.unread_count > 0 ? `${conv.unread_count} رسالة` : 'لا شيء — كل شيء مقروء'}
                  </InfoRow>
                </div>
              </div>

              <p className="text-[0.7em] text-[var(--text-muted)] text-center pb-4 px-4 leading-relaxed">
                كل ما يخص هذه المحادثة في مكان واحد — والإجراءات (إسناد، وسوم، تثبيت، مفضلة) من ترويسة المحادثة.
              </p>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
