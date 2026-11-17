'use client';
/**
 * QCChatWindow — نافذة الرسائل
 * ─────────────────────────────────────────────────────────────
 * ✅ قواعد رؤية المحتوى:
 *    - للمدير والمشرف: رؤية كاملة لكل المحادثات في الصندوق.
 *    - للموظف: تظهر شاشة حماية للمحادثات غير المسندة إليه مع زر طلب الإسناد أو القراءة.
 * ✅ معالجة الرد من رقم غير متواجد في المجموعة:
 *    - حظر الإرسال مؤقتاً وعرض خيارَي الحل (اختيار رقم متواجد / رفع طلب ضم الرقم للمجموعة).
 * ✅ خطوط الإرسال والتوقيع:
 *    - إمكانية الاختيار السلس بين كافة الخطوط المصرح للمستخدم الإرسال منها.
 *    - التوقيع المخصص بالاسم والخط أسفل كل رسالة صادرة.
 */
import React, {
  useRef, useEffect, useCallback, useState, useMemo
} from 'react';
import {
  Send, Paperclip, X, Reply, Check, CheckCheck,
  Clock, AlertCircle, Image as ImageIcon, FileText, Video,
  Download, ChevronDown, Loader2, Phone, MoreVertical,
  ArrowRight, Users, Sparkles, PhoneCall, ShieldAlert,
  Ban, Lock
} from 'lucide-react';
import type { ChatMessage } from '../../types';
import type { QCConversation } from './useQuickChats';
import { formatMessageWithLinks } from '../../lib/inbox/messages';
import { AudioMessagePlayer } from '../inbox/AudioMessagePlayer';
import { Modal } from '../inbox/Modal';

interface Props {
  conversation: QCConversation | null;
  inputText: string;
  isSending: boolean;
  replyTo: ChatMessage | null;
  userAllowedSendLines: string[];
  selectedSendLine?: string;
  contentAccess: 'full' | 'restricted';
  lineBlockModal: { line: string; reason: string } | null;
  onCloseLineBlockModal: () => void;
  onSubmitPermissionRequest: (type: 'group_join' | 'assignment' | 'read', line?: string) => void;
  onChooseSendLine: (line: string) => void;
  onSend: (text: string) => void;
  onSendMedia: (file: File, caption: string) => void;
  onInputChange: (v: string) => void;
  onReplyTo: (msg: ChatMessage | null) => void;
  onLoadMore: () => void;
  getLineTitle: (name: string) => string;
}

function StatusIcon({ status }: { status: ChatMessage['status'] }) {
  if (status === 'sending') return <Clock className="w-3 h-3 text-white/50" />;
  if (status === 'sent') return <Check className="w-3 h-3 text-white/70" />;
  if (status === 'delivered') return <CheckCheck className="w-3 h-3 text-white/70" />;
  if (status === 'read') return <CheckCheck className="w-3 h-3 text-blue-300" />;
  if (status === 'failed') return <AlertCircle className="w-3 h-3 text-red-400" />;
  return null;
}

function DateSeparator({ date }: { date: string }) {
  return (
    <div className="flex items-center gap-2 my-4 px-4">
      <div className="flex-1 h-px bg-[var(--border-subtle)]" />
      <span className="text-[10px] text-[var(--text-muted)] bg-[var(--card-elevated)] px-3 py-1 rounded-full border border-[var(--border-subtle)] font-medium">
        {date}
      </span>
      <div className="flex-1 h-px bg-[var(--border-subtle)]" />
    </div>
  );
}

function formatDateLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'اليوم';
  if (d.toDateString() === yesterday.toDateString()) return 'أمس';
  return d.toLocaleDateString('ar-SA', { weekday: 'long', day: 'numeric', month: 'long' });
}

function formatTimeFromIso(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}

function MediaContent({ msg }: { msg: ChatMessage }) {
  const [imgError, setImgError] = useState(false);

  if (msg.media_type === 'image') {
    return (
      <div className="mb-1 rounded-xl overflow-hidden max-w-[260px]">
        {imgError ? (
          <div className="w-full h-32 flex items-center justify-center bg-black/20 rounded-xl gap-2">
            <ImageIcon className="w-5 h-5 text-white/50" />
            <span className="text-xs text-white/50">تعذّر تحميل الصورة</span>
          </div>
        ) : (
          <img
            src={msg.media_url}
            alt={msg.body || 'صورة'}
            className="w-full max-h-56 object-cover cursor-pointer hover:opacity-90 transition-opacity"
            onError={() => setImgError(true)}
          />
        )}
        {msg.body && <p className="text-xs text-white/90 px-1 pt-1">{msg.body}</p>}
      </div>
    );
  }

  if (msg.media_type === 'video') {
    return (
      <div className="mb-1 rounded-xl overflow-hidden max-w-[260px] relative">
        {msg.thumbnail_url ? (
          <div className="relative">
            <img src={msg.thumbnail_url} alt="فيديو" className="w-full max-h-48 object-cover" />
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                <Video className="w-5 h-5 text-black ml-0.5" />
              </div>
            </div>
            {msg.video_seconds && (
              <span className="absolute bottom-2 right-2 text-[10px] text-white bg-black/60 px-1.5 py-0.5 rounded">
                {Math.floor(msg.video_seconds / 60)}:{String(msg.video_seconds % 60).padStart(2, '0')}
              </span>
            )}
          </div>
        ) : (
          <div className="w-full h-32 flex items-center justify-center bg-black/20 rounded-xl gap-2">
            <Video className="w-6 h-6 text-white/70" />
            <span className="text-xs text-white/70">فيديو</span>
          </div>
        )}
      </div>
    );
  }

  if (msg.media_type === 'audio') {
    return (
      <div className="min-w-[180px] max-w-[260px]">
        <AudioMessagePlayer
          src={msg.media_url || ''}
          msgId={msg.id}
          isOut={msg.direction === 'out'}
        />
      </div>
    );
  }

  if (msg.media_type === 'document') {
    return (
      <a
        href={msg.media_url}
        target="_blank"
        rel="noopener noreferrer"
        download={msg.file_name}
        className="flex items-center gap-2 bg-white/10 hover:bg-white/20 transition-colors rounded-xl px-3 py-2.5 max-w-[240px] min-w-[180px]"
      >
        <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
          <FileText className="w-5 h-5 text-white/80" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-white truncate">{msg.file_name || 'مستند'}</p>
          {msg.file_size && <p className="text-[10px] text-white/60">{msg.file_size}</p>}
        </div>
        <Download className="w-4 h-4 text-white/60 shrink-0" />
      </a>
    );
  }

  return null;
}

interface BubbleProps {
  msg: ChatMessage;
  isOut: boolean;
  showSenderName: boolean;
  getLineTitle: (name: string) => string;
  onReply: (msg: ChatMessage) => void;
}

function MessageBubble({ msg, isOut, showSenderName, getLineTitle, onReply }: BubbleProps) {
  const [hover, setHover] = useState(false);
  const lineLabel = msg.line_id ? getLineTitle(msg.line_id) : '';

  return (
    <div
      className={`flex mb-1.5 group ${isOut ? 'justify-start' : 'justify-end'}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      dir="rtl"
    >
      <div className={`max-w-[78%] flex flex-col ${isOut ? 'items-start' : 'items-end'}`}>
        {msg.reply_to && (
          <div
            className={`mb-1 px-3 py-1.5 rounded-t-xl border-r-2 border-purple-400 bg-black/20 max-w-full ${
              isOut ? 'self-start' : 'self-end'
            }`}
          >
            <p className="text-[10px] font-semibold text-purple-300">{msg.reply_to.sender_name}</p>
            <p className="text-[11px] text-white/70 truncate">{msg.reply_to.body}</p>
          </div>
        )}

        <div
          className={`relative px-3.5 py-2.5 rounded-2xl shadow-sm ${
            isOut
              ? 'bg-gradient-to-br from-purple-700 via-purple-600 to-purple-500 text-white rounded-tl-sm'
              : 'bg-[var(--bubble-peer-bg)] text-[var(--bubble-peer-text)] border border-[var(--bubble-peer-border)] rounded-tr-sm'
          }`}
        >
          {showSenderName && !isOut && (
            <p className="text-[10px] font-bold text-purple-300 mb-0.5">{msg.sender_name}</p>
          )}

          <MediaContent msg={msg} />

          {msg.body && msg.media_type === 'text' && (
            <div className="text-sm leading-relaxed break-words whitespace-pre-wrap" dir="rtl">
              {formatMessageWithLinks(msg.body)}
            </div>
          )}
          {msg.body && msg.media_type !== 'text' && msg.media_type !== 'image' && (
            <p className="text-xs text-white/80 mt-1" dir="rtl">{msg.body}</p>
          )}

          {isOut && (
            <div className="mt-2 pt-1.5 border-t border-white/20 text-[10px] text-purple-100 flex flex-wrap items-center gap-1.5">
              <div className="flex items-center gap-1 font-medium bg-black/20 px-2 py-0.5 rounded-md">
                <Sparkles className="w-3 h-3 text-purple-300 shrink-0" />
                <span>{msg.sender_name}</span>
              </div>
              {lineLabel && (
                <div className="flex items-center gap-1 text-[9px] bg-white/15 px-2 py-0.5 rounded-md font-mono">
                  <PhoneCall className="w-2.5 h-2.5 text-cyan-200 shrink-0" />
                  <span>{lineLabel}</span>
                </div>
              )}
            </div>
          )}

          <div className={`flex items-center gap-1 mt-1.5 ${isOut ? 'justify-start' : 'justify-end'}`}>
            <span className="text-[10px] text-white/60 font-mono">
              {formatTimeFromIso(msg.created_at)}
            </span>
            {isOut && <StatusIcon status={msg.status} />}
          </div>
        </div>

        {hover && (
          <button
            onClick={() => onReply(msg)}
            className={`mt-0.5 flex items-center gap-1 text-[10px] text-[var(--text-muted)] hover:text-purple-400 transition-colors ${
              isOut ? 'self-start' : 'self-end'
            }`}
          >
            <Reply className="w-3 h-3" />
            رد
          </button>
        )}
      </div>
    </div>
  );
}

export function QCChatWindow({
  conversation,
  inputText,
  isSending,
  replyTo,
  userAllowedSendLines,
  selectedSendLine,
  contentAccess,
  lineBlockModal,
  onCloseLineBlockModal,
  onSubmitPermissionRequest,
  onChooseSendLine,
  onSend,
  onSendMedia,
  onInputChange,
  onReplyTo,
  onLoadMore,
  getLineTitle,
}: Props) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesTopRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [userScrolledUp, setUserScrolledUp] = useState(false);
  const prevScrollHeight = useRef(0);

  const messages = conversation?.messages || [];
  const isLoading = conversation?.messagesLoading || false;
  const hasMore = conversation?.hasMoreMessages || false;

  const scrollToBottom = useCallback((smooth = false) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  useEffect(() => {
    if (conversation?.id) {
      setUserScrolledUp(false);
      setTimeout(() => scrollToBottom(false), 50);
    }
  }, [conversation?.id]);

  const prevMsgCount = useRef(0);
  useEffect(() => {
    const count = messages.length;
    if (count > prevMsgCount.current) {
      const lastMsg = messages[messages.length - 1];
      const isOutgoing = lastMsg?.direction === 'out';
      if (!userScrolledUp || isOutgoing) {
        setTimeout(() => scrollToBottom(true), 50);
      }
    }
    prevMsgCount.current = count;
  }, [messages.length, userScrolledUp]);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const fromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollBtn(fromBottom > 150);
    setUserScrolledUp(fromBottom > 150);
  }, []);

  useEffect(() => {
    if (!messagesTopRef.current || !hasMore) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          const el = containerRef.current;
          if (el) prevScrollHeight.current = el.scrollHeight;
          onLoadMore();
        }
      },
      { threshold: 0.5 }
    );
    obs.observe(messagesTopRef.current);
    return () => obs.disconnect();
  }, [hasMore, isLoading, onLoadMore]);

  useEffect(() => {
    const el = containerRef.current;
    if (el && prevScrollHeight.current > 0) {
      el.scrollTop = el.scrollHeight - prevScrollHeight.current;
      prevScrollHeight.current = 0;
    }
  }, [messages.length]);

  const grouped = useMemo(() => {
    type GroupItem =
      | { type: 'date'; label: string }
      | { type: 'msg'; msg: ChatMessage; isOut: boolean; showSender: boolean };

    const result: GroupItem[] = [];
    let lastDate = '';
    let lastSender = '';
    messages.forEach((msg) => {
      const dateLabel = formatDateLabel(msg.created_at);
      if (dateLabel !== lastDate) {
        result.push({ type: 'date', label: dateLabel });
        lastDate = dateLabel;
      }
      const isOut = msg.direction === 'out';
      const showSender = conversation?.is_group && !isOut && msg.sender_name !== lastSender;
      result.push({ type: 'msg', msg, isOut, showSender: !!showSender });
      lastSender = msg.sender_name;
    });
    return result;
  }, [messages, conversation?.is_group]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (inputText.trim()) onSend(inputText);
    }
  }, [inputText, onSend]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onSendMedia(file, '');
    e.target.value = '';
  }, [onSendMedia]);

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[var(--bg-main)]" dir="rtl">
        <div className="text-center space-y-3">
          <div className="w-20 h-20 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto border border-purple-500/20">
            <ArrowRight className="w-9 h-9 text-purple-400/50" />
          </div>
          <p className="text-[var(--text-muted)] text-sm">اختر محادثة من القائمة للبدء</p>
        </div>
      </div>
    );
  }

  const availableLines = conversation.available_lines?.length
    ? conversation.available_lines
    : [conversation.line_id];

  // الخطوط المتاحة للمستخدم للإرسال منها
  const allowedLinesToDisplay = availableLines.filter((l) => userAllowedSendLines.includes(l));
  const finalDisplayLines = allowedLinesToDisplay.length > 0 ? allowedLinesToDisplay : userAllowedSendLines;

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--bg-main)]" dir="rtl">
      {/* ── Chat Header ── */}
      <div className="px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--card-bg)] flex items-center gap-3 shrink-0">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white shrink-0 ${
            conversation.is_group
              ? 'bg-gradient-to-br from-indigo-500 to-purple-600'
              : 'bg-gradient-to-br from-emerald-500 to-teal-600'
          }`}
        >
          {conversation.avatar_url ? (
            <img src={conversation.avatar_url} alt={conversation.title} className="w-full h-full rounded-full object-cover" />
          ) : conversation.is_group ? (
            <Users className="w-5 h-5" />
          ) : (
            (conversation.title.slice(0, 2).toUpperCase())
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-bold text-sm text-[var(--text-main)] truncate">{conversation.title}</p>
            {conversation.assigned_staff_name && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-semibold border border-purple-500/40">
                المسند: {conversation.assigned_staff_name}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-xs text-[var(--text-muted)] truncate">{conversation.phone_or_jid}</p>
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
              {availableLines.map((line) => (
                <span
                  key={line}
                  className="text-[9px] px-1.5 py-0.5 rounded-full bg-[var(--card-elevated)] text-[var(--text-muted)] border border-[var(--border-subtle)] shrink-0"
                >
                  {getLineTitle(line)}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button className="p-2 rounded-xl hover:bg-[var(--card-elevated)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors">
            <Phone className="w-4 h-4" />
          </button>
          <button className="p-2 rounded-xl hover:bg-[var(--card-elevated)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors">
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── حالة حظر الرؤية للموظف غير المسند ── */}
      {contentAccess === 'restricted' ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Lock className="w-8 h-8" />
          </div>
          <div>
            <h3 className="font-bold text-base text-[var(--text-main)] mb-1">
              محتوى هذه المحادثة غير مسند إليك
            </h3>
            <p className="text-xs text-[var(--text-muted)] max-w-sm leading-relaxed">
              وفقاً لقواعد أمان المنصة، لا يمكن للموظف الاطلاع على الرسائل إلا بعد إسناد المحادثة إليه أو الحصول على إذن من مشرف الصندوق.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onSubmitPermissionRequest('assignment')}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" />
              طلب إسناد المحادثة لي
            </button>
            <button
              onClick={() => onSubmitPermissionRequest('read')}
              className="px-4 py-2 rounded-xl bg-[var(--card-elevated)] border border-[var(--border-subtle)] hover:text-[var(--text-main)] text-[var(--text-muted)] text-xs font-medium transition-all"
            >
              طلب إذن قراءة فقط
            </button>
          </div>
        </div>
      ) : (
        /* ── Messages Area ── */
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-4 py-2 space-y-0.5 relative"
          style={{
            backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(147,51,234,0.03) 0%, transparent 70%)',
          }}
        >
          <div ref={messagesTopRef} className="h-1" />

          {isLoading && (
            <div className="flex justify-center py-3">
              <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
            </div>
          )}

          {!isLoading && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-3 py-16">
              <div className="w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                <ArrowRight className="w-7 h-7 text-purple-400/50 rotate-180" />
              </div>
              <p className="text-xs text-[var(--text-muted)]">لا توجد رسائل سابقة في هذا المسار</p>
            </div>
          )}

          {grouped.map((item, i) => {
            if (item.type === 'date') {
              return <DateSeparator key={`date-${i}`} date={item.label} />;
            }
            return (
              <MessageBubble
                key={item.msg.id}
                msg={item.msg}
                isOut={item.isOut}
                showSenderName={item.showSender}
                getLineTitle={getLineTitle}
                onReply={onReplyTo}
              />
            );
          })}

          <div ref={messagesEndRef} />
        </div>
      )}

      {showScrollBtn && contentAccess === 'full' && (
        <button
          onClick={() => { setUserScrolledUp(false); scrollToBottom(true); }}
          className="absolute bottom-28 left-1/2 -translate-x-1/2 bg-purple-600 hover:bg-purple-700 text-white p-2 rounded-full shadow-lg transition-all z-10 flex items-center justify-center"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      )}

      {/* ── Input Area (للصلاحيات الكاملة فقط) ── */}
      {contentAccess === 'full' && (
        <div className="px-4 py-3 border-t border-[var(--border-subtle)] bg-[var(--card-bg)] shrink-0">
          {/* محدد خط الإرسال المرن من خطوط المستخدم */}
          <div className="mb-2 flex items-center gap-2 text-xs">
            <span className="text-[10px] text-[var(--text-muted)] font-medium">الإرسال عبر:</span>
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
              {finalDisplayLines.map((line) => (
                <button
                  key={line}
                  onClick={() => onChooseSendLine(line)}
                  className={`text-[10px] px-2.5 py-1 rounded-xl border transition-all ${
                    selectedSendLine === line
                      ? 'bg-purple-600 text-white border-purple-500 shadow-sm font-bold'
                      : 'bg-[var(--card-elevated)] text-[var(--text-muted)] border-[var(--border-subtle)] hover:text-[var(--text-main)]'
                  }`}
                >
                  {getLineTitle(line)}
                </button>
              ))}
            </div>
          </div>

          {replyTo && (
            <div className="mb-2 flex items-center gap-2 bg-[var(--card-elevated)] rounded-xl px-3 py-2 border border-[var(--border-subtle)]">
              <div className="flex-1 min-w-0 border-r-2 border-purple-400 pr-2">
                <p className="text-[10px] font-bold text-purple-300">{replyTo.sender_name}</p>
                <p className="text-xs text-[var(--text-muted)] truncate">{replyTo.body}</p>
              </div>
              <button onClick={() => onReplyTo(null)} className="text-[var(--text-muted)] hover:text-[var(--text-main)] p-1">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="flex items-end gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 rounded-2xl bg-[var(--card-elevated)] hover:bg-[var(--card-surface)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors shrink-0"
              title="إرفاق ملف"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />

            <div className="flex-1 relative">
              <textarea
                value={inputText}
                onChange={(e) => onInputChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="اكتب رسالتك هنا..."
                dir="rtl"
                rows={1}
                className="w-full bg-[var(--card-elevated)] border border-[var(--border-subtle)] rounded-2xl px-4 py-2.5 text-sm text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-purple-500 transition-colors resize-none max-h-32 text-right leading-relaxed"
                style={{ minHeight: '44px' }}
                onInput={(e) => {
                  const t = e.target as HTMLTextAreaElement;
                  t.style.height = 'auto';
                  t.style.height = Math.min(t.scrollHeight, 128) + 'px';
                }}
              />
            </div>

            <button
              onClick={() => { if (inputText.trim()) onSend(inputText); }}
              disabled={!inputText.trim() || isSending}
              className="p-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-all shrink-0 shadow-md"
              title="إرسال"
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>

          <p className="text-[9px] text-[var(--text-muted)] mt-1 text-center">
            Enter للإرسال · Shift+Enter لسطر جديد
          </p>
        </div>
      )}

      {/* ── نافذة «الرقم غير متواجد في المجموعة» مع خياري الحل ── */}
      {lineBlockModal && (
        <Modal
          open
          onClose={onCloseLineBlockModal}
          contained
          ariaLabel="تنبيه عضوية المجموعة"
          panelClassName="border border-amber-500/50 rounded-2xl max-w-md p-6 space-y-4 text-right"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <Ban className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-amber-300">
                هذا الرقم غير متواجد في المجموعة
              </h3>
              <p className="text-xs text-slate-300 font-mono">{getLineTitle(lineBlockModal.line)}</p>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed bg-amber-950/30 p-3 rounded-xl border border-amber-900/40">
            الخط «{getLineTitle(lineBlockModal.line)}» ليس عضواً في مجموعة «{conversation.title}». منصة واتساب ترفض الإرسال إلى أي مجموعة إلا من رقم متواجد فيها مسبقاً.
          </p>

          <div className="flex flex-col gap-2 pt-1">
            {/* الحل 1: اختيار خط متواجد فعلاً */}
            {availableLines.length > 1 && (
              <button
                onClick={() => {
                  const otherLine = availableLines.find((l) => l !== lineBlockModal.line);
                  if (otherLine) onChooseSendLine(otherLine);
                  onCloseLineBlockModal();
                }}
                className="w-full px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-colors flex items-center justify-center gap-2"
              >
                <PhoneCall className="w-4 h-4" />
                اختيار رقم آخر متواجد في المجموعة
              </button>
            )}

            {/* الحل 2: رفع طلب للمشرف لضم هذا الرقم */}
            <button
              onClick={() => {
                onSubmitPermissionRequest('group_join', lineBlockModal.line);
                onCloseLineBlockModal();
              }}
              className="w-full px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-colors flex items-center justify-center gap-2"
            >
              <ShieldAlert className="w-4 h-4" />
              رفع طلب للمشرف لضم هذا الرقم إلى المجموعة
            </button>

            <button
              onClick={onCloseLineBlockModal}
              className="w-full px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
            >
              إلغاء
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
