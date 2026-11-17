'use client';

/**
 * فقاعة رسالة واحدة — مستخلصة من NativeChatInbox ومغلّفة بـ React.memo.
 * لا تُعاد رسمها إلا إذا تغيّرت رسالتها أو حالتها (تحديد/مفضلة) — أي أن الكتابة والتحديثات
 * الدورية وتغيّر القوائم لا تلمس الرسائل القديمة. الدوال تأتي عبر كائن actions ثابت الهوية.
 */
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  Send,
  Search,
  Paperclip,
  CheckCheck,
  Check,
  Phone,
  MoreVertical,
  Users,
  User,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  ArrowLeftRight,
  UserPlus,
  RefreshCw,
  Loader2,
  Wifi,
  WifiOff,
  Clock,
  AlertTriangle,
  AlertCircle,
  Zap,
  ZapOff,
  CheckCircle2,
  Lock,
  Unlock,
  Moon,
  Info,
  FileText,
  Image as ImageIcon,
  Music,
  Video,
  X,
  Download,
  FileUp,
  Mic,
  Smile,
  Trash2,
  StopCircle,
  Pin,
  PinOff,
  Star,
  Tags,
  Reply,
  ExternalLink,
  Share2,
  Copy,
  FileSpreadsheet,
  Archive,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  SlidersHorizontal,
  CheckSquare,
  PhoneCall,
  Ban
} from 'lucide-react';
import { getProxiedUrl, getFileCardMeta, formatMessageWithLinks } from '../../lib/inbox/messages';
import { AudioMessagePlayer } from './AudioMessagePlayer';
import { ChatMessage } from '../../types';
import { initialsOrLetter } from '../../lib/nameUtils';
import { toast } from '../common/Toaster';

export interface MessageBubbleActions {
  setReplyingToMessage: (m: ChatMessage | null) => void;
  setForwardModalMsg: (m: ChatMessage | null) => void;
  setPinModalMsg: (m: ChatMessage | null) => void;
  setSenderMenu: (v: any) => void;
  setLightboxMedia: (v: any) => void;
  handleToggleFavorite: (...args: any[]) => any;
  toggleMsgSelection: (id: string) => void;
  handleVotePoll: (msgId: string, optionId: string) => void;
}

interface MessageBubbleProps {
  msg: ChatMessage;
  convTitle?: string;
  convLineId?: string;
  convIsGroup: boolean;
  fallbackInstance: string;
  isFavorite: boolean;
  selectionMode: boolean;
  isSelected: boolean;
  actions: MessageBubbleActions;
}

function MessageBubbleImpl({
  msg, convTitle, convLineId, convIsGroup, fallbackInstance, isFavorite, selectionMode, isSelected, actions,
}: MessageBubbleProps) {
  const {
    setReplyingToMessage, setForwardModalMsg, setPinModalMsg, setSenderMenu,
    setLightboxMedia, handleToggleFavorite, toggleMsgSelection, handleVotePoll,
  } = actions;
  const isOut = msg.direction === 'out';
  const isImage = msg.media_type === 'image';
  const isDoc = msg.media_type === 'document';
  const isAudio = msg.media_type === 'audio';
  const isVideo = msg.media_type === 'video';

  return (
                      <div
                                                id={`msg-${msg.id}`}
                        className={`flex flex-col ${isOut ? 'items-end' : 'items-start'} group/msg relative`}
                      >
                        {/* ⚡ شريط إجراءات الرسالة عند التمرير: تحويل - تثبيت - مفضلة - رد - نسخ */}
                        <div
                          className={`absolute -top-3 ${
                            isOut ? 'left-2' : 'right-2'
                          } hidden group-hover/msg:flex items-center gap-1 bg-[var(--card-bg)] border border-purple-500/40 rounded-xl px-2 py-0.5 shadow-2xl z-30 backdrop-blur-md transition-all`}
                        >
                          <button
                            type="button"
                            onClick={() => setReplyingToMessage(msg)}
                            className="p-1 rounded-lg hover:bg-purple-600/30 text-slate-300 hover:text-white transition-colors"
                            title="رد باقتباس (Reply)"
                          >
                            <Reply className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setForwardModalMsg(msg)}
                            className="p-1 rounded-lg hover:bg-purple-600/30 text-slate-300 hover:text-white transition-colors"
                            title="تحويل الرسالة إلى محادثة أخرى (Forward)"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setPinModalMsg(msg)}
                            className="p-1 rounded-lg hover:bg-amber-600/30 text-slate-300 hover:text-amber-300 transition-colors"
                            title="تثبيت الرسالة (Pin حتى 5 رسائل)"
                          >
                            <Pin className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleToggleFavorite(
                                {
                                  id: msg.id,
                                  title: msg.body || msg.file_name || 'رسالة وسائط',
                                  subtitle: `${msg.sender_name} • ${convTitle}`,
                                  meta: { chat_jid: msg.chat_jid, instance_name: convLineId || fallbackInstance, mediaType: msg.media_type },
                                },
                                msg.media_type === 'image' || msg.media_type === 'video'
                                  ? 'media'
                                  : msg.media_type === 'document'
                                  ? 'file'
                                  : 'message'
                              )
                            }
                            className="p-1 rounded-lg hover:bg-amber-600/30 text-slate-300 hover:text-amber-400 transition-colors"
                            title="إضافة للمفضلة"
                          >
                            <Star
                              className={`w-3.5 h-3.5 ${
                                isFavorite
                                  ? 'fill-amber-400 text-amber-400'
                                  : ''
                              }`}
                            />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(msg.body || '');
                              toast({ title: 'تم نسخ النص إلى الحافظة بنجاح', kind: 'success' });
                            }}
                            className="p-1 rounded-lg hover:bg-purple-600/30 text-slate-300 hover:text-white transition-colors"
                            title="نسخ النص"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div
                          className={`max-w-[85%] sm:max-w-xl px-4 py-2.5 text-sm transition-all ${
                            isOut
                              ? 'bubble-user'
                              : 'bubble-peer'
                          }`}
                        >
                          {selectionMode && (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); toggleMsgSelection(msg.id); }}
                              className={`absolute top-1 right-1 z-10 w-5 h-5 rounded-md border flex items-center justify-center transition-all ${isSelected ? 'bg-[var(--accent-soft)] border-[var(--border-glow)] text-[var(--primary)]' : 'bg-black/30 border-white/20 text-transparent hover:text-white'}`}
                              title="تحديد الرسالة"
                            >
                              <CheckSquare className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {msg.reply_to && (
                            <div className="mb-2 p-2 rounded-xl bg-black/30 border-r-2 border-purple-400 text-xs">
                              <div className="font-semibold text-purple-300 text-[11px]">{msg.reply_to.sender_name}</div>
                              <div className="text-slate-300 truncate text-[10px]">{msg.reply_to.body}</div>
                            </div>
                          )}
                          {!isOut && convIsGroup && (
                            <div className="text-[11px] font-bold text-purple-300 mb-1">
                              {/* طلب المالك: قائمة لكل مرسل — جهة اتصال / نسخ المعرف */}
                              <button
                                onClick={(e) => {
                                  const rct = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                  setSenderMenu({ msgId: msg.id, name: msg.sender_name, jid: msg.key_participant || msg.key_participant_alt || '', x: rct.left, y: rct.bottom });
                                }}
                                className="hover:underline flex items-center gap-1"
                                title="خيارات المرسل"
                              >
                                {msg.sender_name}
                                <ChevronDown className="w-3 h-3 inline" />
                              </button>
                            </div>
                          )}

                          {/* ════════════════════════════════════════
                              🎨 ملصق (Sticker) — عرض شفاف بدون إطار رمادي
                             ════════════════════════════════════════ */}
                          {msg.media_type === 'sticker' && (() => {
                            const effectiveInstance = msg.line_id || convLineId || fallbackInstance;
                            const proxied = msg.msg_key_id
                              ? (getProxiedUrl(undefined, effectiveInstance, msg.msg_key_id, 'sticker.webp') ?? null)
                              : (msg.media_url || null);
                            return (
                              <div className="my-1 flex items-center justify-center">
                                {proxied ? (
                                  <img
                                    src={proxied}
                                    alt="ملصق واتساب"
                                    className="w-36 h-36 object-contain hover:scale-105 transition-transform drop-shadow-md"
                                    loading="lazy"
                                  />
                                ) : (
                                  <div className="flex items-center gap-2 p-2 bg-purple-900/20 rounded-xl text-xs text-purple-200">
                                    <Smile className="w-5 h-5 text-amber-400" />
                                    <span>ملصق واتساب</span>
                                  </div>
                                )}
                              </div>
                            );
                          })()}

                          {/* ════════════════════════════════════════
                              📷 صورة — ثابتة الحجم + lightbox عند الضغط
                             ════════════════════════════════════════ */}
                          {isImage && (() => {
                            const effectiveInstance = msg.line_id || convLineId || fallbackInstance;
                            // ✅ نستخدم msg_key_id (المعرّف الحقيقي لواتساب) لبناء رابط الوكيل
                            // وللرسائل الصادرة المؤقتة (blob:) نستخدم media_url مباشرةً
                            const proxied = msg.msg_key_id
                              ? (getProxiedUrl(undefined, effectiveInstance, msg.msg_key_id, msg.body || 'image.jpg') ?? null)
                              : (msg.media_url || null);
                            return (
                              <div className="mb-1">
                                {proxied ? (
                                  <div
                                    className="rounded-2xl overflow-hidden cursor-pointer border border-white/10 hover:opacity-95 transition-opacity w-72 h-48 bg-black/30"
                                    onClick={() => setLightboxMedia({ type: 'image', src: proxied, caption: msg.body })}
                                    title="اضغط لتكبير الصورة بكامل دقتها"
                                  >
                                    <img
                                      src={proxied}
                                      alt="صورة"
                                      className="w-full h-full object-cover rounded-2xl"
                                      loading="lazy"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                      }}
                                    />
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 p-3 bg-purple-900/30 rounded-xl text-xs text-purple-200">
                                    <ImageIcon className="w-5 h-5" />
                                    <span>صورة</span>
                                  </div>
                                )}
                              </div>
                            );
                          })()}

                          {/* ════════════════════════════════════════
                              📄 مستند — بطاقات احترافية مميزة للأكسل والـ PDF والوورد والضغط
                             ════════════════════════════════════════ */}
                          {isDoc && (() => {
                            const rawFileName = msg.file_name || msg.body || 'document.pdf';
                            const meta = getFileCardMeta(rawFileName);
                            const effectiveInstance = msg.line_id || convLineId || fallbackInstance;
                            const proxied = msg.msg_key_id
                              ? (getProxiedUrl(undefined, effectiveInstance, msg.msg_key_id, rawFileName, true) ?? null)
                              : (msg.media_url || null);

                            return (
                              <div className={`flex items-center gap-3 mb-2 p-3 rounded-2xl border transition-all ${meta.cardBg}`}>
                                <div className={`p-2.5 rounded-xl bg-white/5 border border-white/10 shrink-0 ${meta.iconColor}`}>
                                  {meta.isSheet ? (
                                    <FileSpreadsheet className="w-6 h-6" />
                                  ) : meta.isArchive ? (
                                    <Archive className="w-6 h-6" />
                                  ) : (
                                    <FileText className="w-6 h-6" />
                                  )}
                                </div>

                                <div className="flex-1 min-w-0 text-right">
                                  <div className="font-bold text-[var(--text-main)] text-xs truncate dir-ltr text-right" title={rawFileName}>
                                    {rawFileName}
                                  </div>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className={`text-[10px] px-2 py-0.2 rounded-full border font-bold uppercase ${meta.badge}`}>
                                      {meta.ext}
                                    </span>
                                    {msg.file_size && (
                                      <span className="text-[10px] text-slate-400 font-mono">{msg.file_size}</span>
                                    )}
                                  </div>
                                </div>

                                <a
                                  href={proxied || '#'}
                                  download={rawFileName}
                                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-[var(--text-main)] shrink-0 shadow transition-colors flex items-center justify-center"
                                  title={`تحميل الملف باسمه الأصلي: ${rawFileName}`}
                                >
                                  <Download className="w-4 h-4" />
                                </a>
                              </div>
                            );
                          })()}

                          {/* ════════════════════════════════════════
                              🎵 صوت — مشغّل صوتي مخصص مع شريط الترددات القابل للضغط
                             ════════════════════════════════════════ */}
                          {isAudio && (() => {
                            const effectiveInstance = msg.line_id || convLineId || fallbackInstance;
                            // للرسائل الواردة: نبني رابط الوكيل من msg_key_id
                            // للرسائل الصادرة المؤقتة: نستخدم media_url مباشرةً (blob: أو proxy URL بعد الإرسال)
                            const proxied = msg.msg_key_id
                              ? (getProxiedUrl(undefined, effectiveInstance, msg.msg_key_id, 'voice_note.ogg') ?? null)
                              : (msg.media_url || null);
                            return (
                              <div className="mb-1">
                                {proxied ? (
                                  <AudioMessagePlayer
                                    src={proxied}
                                    msgId={msg.id}
                                    isOut={isOut}
                                  />
                                ) : (
                                  <div className="flex items-center gap-2 p-3 bg-purple-900/30 rounded-xl text-xs text-purple-200">
                                    <Music className="w-5 h-5" />
                                    <span>تسجيل صوتي</span>
                                  </div>
                                )}
                              </div>
                            );
                          })()}

                          {/* ════════════════════════════════════════
                              🎥 فيديو — صورة مصغّرة + lightbox للتشغيل الكامل
                             ════════════════════════════════════════ */}
                          {isVideo && (() => {
                            const effectiveInstance = msg.line_id || convLineId || fallbackInstance;
                            const proxied = msg.msg_key_id
                              ? (getProxiedUrl(undefined, effectiveInstance, msg.msg_key_id, msg.body || 'video.mp4') ?? null)
                              : (msg.media_url || null);
                            return (
                              <div className="mb-1">
                                {proxied ? (
                                  <div
                                    className="relative rounded-2xl overflow-hidden cursor-pointer bg-black border border-white/10 hover:opacity-95 transition-opacity w-72 h-48 flex items-center justify-center group"
                                    onClick={() => setLightboxMedia({ type: 'video', src: proxied, caption: msg.body })}
                                    title="اضغط لتشغيل مقطع الفيديو بشاشة كاملة"
                                  >
                                    {/* صورة مصغّرة: نستخدم #t=0.001 لإجبار المتصفح على تحميل الإطار الأول */}
                                    <video
                                      src={`${proxied}#t=0.001`}
                                      className="w-full h-full object-cover rounded-2xl bg-black"
                                      preload="metadata"
                                      muted
                                    />
                                    {/* زر تشغيل أنيق فوق الفيديو */}
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/20 transition-colors">
                                      <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                                        <svg
                                          className="w-6 h-6 text-purple-700 ml-1"
                                          fill="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <polygon points="5,3 19,12 5,21" />
                                        </svg>
                                      </div>
                                    </div>
                                    {/* مدة الفيديو */}
                                    <span className="absolute bottom-2 right-2 text-[10px] text-white bg-black/60 px-1.5 py-0.5 rounded-md font-mono">
                                      🎥 فيديو
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 p-3 bg-purple-900/30 rounded-xl text-xs text-purple-200">
                                    <Video className="w-5 h-5" />
                                    <span>مقطع فيديو</span>
                                  </div>
                                )}
                              </div>
                            );
                          })()}

                          {/* ════════════════════════════════════════
                              📊 استطلاع رأي تفاعلي حي (Interactive Poll)
                             ════════════════════════════════════════ */}
                          {msg.media_type === 'poll' && (() => {
                            const poll = msg.poll_data || {
                              question: msg.body || 'استطلاع رأي تفاعلي',
                              options: [
                                { id: '1', text: '🤩 نعم، حاضر وجاهز!', votes: 5 },
                                { id: '2', text: 'أحتاج مراجعة المواد أولاً', votes: 2 },
                                { id: '3', text: 'سأنضم لاحقاً اليوم', votes: 1 }
                              ],
                              totalVotes: 8
                            };
                            const total = poll.options.reduce((sum, o) => sum + o.votes, 0) || 1;

                            return (
                              <div className="p-3.5 rounded-2xl bg-purple-950/50 border border-purple-500/40 text-xs space-y-3 min-w-[260px] max-w-sm shadow-xl">
                                <div className="flex items-center gap-2 text-purple-200 font-bold text-sm">
                                  <span className="p-1 rounded-lg bg-purple-500/20 text-purple-300">📊</span>
                                  <span>{poll.question}</span>
                                </div>
                                <div className="space-y-2 pt-1">
                                  {poll.options.map((opt) => (
                                    <button
                                      key={opt.id}
                                      type="button"
                                      onClick={() => handleVotePoll(msg.id, opt.id)}
                                      className="w-full text-right p-2.5 rounded-xl border border-white/10 hover:border-purple-500/50 bg-black/30 hover:bg-purple-900/30 transition-all flex flex-col gap-1.5"
                                    >
                                      <div className="flex items-center justify-between text-xs">
                                        <span className={`font-semibold ${opt.userVoted ? 'text-emerald-300 font-bold' : 'text-[var(--text-main)]'}`}>
                                          {opt.userVoted ? '✓ ' : ''}{opt.text}
                                        </span>
                                        <span className="text-purple-300 font-mono text-[11px]">{opt.votes} صوت</span>
                                      </div>
                                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                        <div
                                          className="bg-gradient-to-r from-purple-500 to-emerald-400 h-full rounded-full transition-all duration-300"
                                          style={{ width: `${(opt.votes / total) * 100}%` }}
                                        />
                                      </div>
                                    </button>
                                  ))}
                                </div>
                                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-white/5">
                                  <span>إجمالي الأصوات: {poll.totalVotes || total}</span>
                                  <span className="text-emerald-400 font-medium">تصويت فوري مباشر</span>
                                </div>
                              </div>
                            );
                          })()}

                          {/* النص الفعلي للرسالة — يظهر فقط إذا كان هناك نص حقيقي ولم يكن تسجيلاً صوتياً أو تصويتاً أو ملصقاً مع دعم فتح الروابط */}
                          {msg.body && !isDoc && !isAudio && msg.media_type !== 'poll' && msg.media_type !== 'sticker' && (
                            <p className="whitespace-pre-wrap leading-relaxed mt-1">{formatMessageWithLinks(msg.body)}</p>
                          )}

                          {msg.signature && (
                            <div className="mt-2 pt-1.5 border-t border-white/20 text-[11px] opacity-90 flex items-center gap-1 font-mono">
                              <Sparkles className="w-3 h-3 text-purple-300" />
                              <span>{msg.signature}</span>
                            </div>
                          )}

                          <div
                            className="flex items-center justify-end gap-1.5 text-[10px] mt-1.5 opacity-75 tabular-nums"
                          >
                            <span>{msg.created_at}</span>
                            {isOut && (
                              <span>
                                {msg.status === 'read' ? (
                                  <CheckCheck className="w-3.5 h-3.5 text-cyan-200" />
                                ) : (
                                  <CheckCheck className="w-3.5 h-3.5 text-[var(--text-main)]/80" />
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
  );
}

export const MessageBubble = React.memo(MessageBubbleImpl);
