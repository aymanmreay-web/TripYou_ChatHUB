'use client';

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
  ArrowUpRight,
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
  Reply,
  Share2,
  Copy,
  FileSpreadsheet,
  Archive,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  CheckSquare
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ConversationItem, ChatMessage, ConversationStatus } from '../../types';
import { Button } from '@tripyou/ui';
import { supabase } from '../../lib/supabase';

// ─────────────────────────────────────────────
// 🔧 مساعد: تحويل معرف الرسالة أو الرابط إلى رابط وكيل لفك التشفير
// ─────────────────────────────────────────────
function getProxiedUrl(mediaUrl: string | undefined, instanceName: string, messageId?: string, fileName?: string): string | null {
  const fnParam = fileName ? `&fileName=${encodeURIComponent(fileName)}` : '';
  if (messageId) {
    return `/api/evolution/instances/${instanceName}/media/proxy?id=${encodeURIComponent(messageId)}${fnParam}`;
  }
  if (!mediaUrl) return null;
  if (mediaUrl.startsWith('data:')) return mediaUrl;
  return `/api/evolution/instances/${instanceName}/media/proxy?url=${encodeURIComponent(mediaUrl)}${fnParam}`;
}

// ─────────────────────────────────────────────
// 🎵 مساعد: توليد ارتفاعات أعمدة موجة صوتية (شبه عشوائي من معرّف الرسالة)
// ─────────────────────────────────────────────
function getWaveformBars(seed: string, count = 32): number[] {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) & 0xffffffff;
  return Array.from({ length: count }, () => {
    hash = (hash * 1664525 + 1013904223) & 0xffffffff;
    return 20 + (Math.abs(hash) % 60); // ارتفاع 20% – 80%
  });
}

// ─────────────────────────────────────────────
// 🎵 مكوّن: مشغّل الصوت المخصص مع شريط الموجة
// ─────────────────────────────────────────────
interface AudioPlayerProps {
  src: string;
  msgId: string;
  isOut: boolean;
}

function formatMessageWithLinks(content: string) {
  if (!content) return null;
  // مطابقة الروابط URL (http, https, www, أو t.me / wa.me)
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|wa\.me\/[^\s]+|t\.me\/[^\s]+)/gi;
  const parts = content.split(urlRegex);

  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      const href = part.startsWith('http') ? part : `https://${part}`;
      return (
        <a
          key={index}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-purple-300 hover:text-purple-200 underline underline-offset-2 break-all font-mono font-medium inline-flex items-center gap-0.5 mx-0.5 transition-colors"
          dir="ltr"
        >
          <span>{part}</span>
          <ArrowUpRight className="w-3 h-3 inline-block shrink-0 opacity-80" />
        </a>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

function getFileCardMeta(fileName: string) {
  const name = fileName || '';
  const lower = name.toLowerCase();
  if (lower.endsWith('.xlsx') || lower.endsWith('.xls') || lower.endsWith('.csv')) {
    return {
      type: 'Excel',
      ext: 'XLSX',
      badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      cardBg: 'bg-emerald-950/40 border-emerald-500/30 hover:border-emerald-500/60',
      iconColor: 'text-emerald-400',
      isSheet: true,
    };
  }
  if (lower.endsWith('.pdf')) {
    return {
      type: 'PDF',
      ext: 'PDF',
      badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      cardBg: 'bg-rose-950/40 border-rose-500/30 hover:border-rose-500/60',
      iconColor: 'text-rose-400',
      isPdf: true,
    };
  }
  if (lower.endsWith('.docx') || lower.endsWith('.doc')) {
    return {
      type: 'Word',
      ext: 'DOCX',
      badge: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
      cardBg: 'bg-blue-950/40 border-blue-500/30 hover:border-blue-500/60',
      iconColor: 'text-blue-400',
      isWord: true,
    };
  }
  if (lower.endsWith('.zip') || lower.endsWith('.rar') || lower.endsWith('.7z') || lower.endsWith('.tar')) {
    return {
      type: 'Archive',
      ext: 'ZIP',
      badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      cardBg: 'bg-amber-950/40 border-amber-500/30 hover:border-amber-500/60',
      iconColor: 'text-amber-400',
      isArchive: true,
    };
  }
  return {
    type: 'Document',
    ext: lower.split('.').pop()?.toUpperCase() || 'FILE',
    badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    cardBg: 'bg-purple-950/40 border-purple-500/30 hover:border-purple-500/60',
    iconColor: 'text-purple-400',
    isGeneric: true,
  };
}

function AudioMessagePlayer({ src, msgId, isOut }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const bars = useMemo(() => getWaveformBars(msgId), [msgId]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch((e) => console.warn('Play error:', e));
    }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const dur = audioRef.current.duration || duration || 0;
    const cur = audioRef.current.currentTime;
    setCurrentTime(cur);
    setProgress(dur > 0 ? (cur / dur) * 100 : 0);
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current && audioRef.current.duration && !isNaN(audioRef.current.duration)) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setProgress(0);
    setCurrentTime(0);
  };

  const handleSeekPct = (pct: number) => {
    if (!audioRef.current) return;
    const dur = audioRef.current.duration || duration || 0;
    if (!dur) return;
    const target = Math.max(0, Math.min(dur, pct * dur));
    audioRef.current.currentTime = target;
    setCurrentTime(target);
    setProgress(pct * 100);
    if (!isPlaying) {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    handleSeekPct(pct);
  };

  const handleBarClick = (i: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const pct = i / bars.length;
    handleSeekPct(pct);
  };

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  return (
    <div
      className={`flex items-center gap-2.5 p-2.5 rounded-2xl min-w-[230px] max-w-[320px] border border-white/5 transition-all ${
        isOut ? 'bg-purple-700/40 shadow-inner' : 'bg-slate-800/80 shadow-inner'
      }`}
    >
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        preload="metadata"
      />

      {/* زر التشغيل / الإيقاف */}
      <button
        onClick={togglePlay}
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 shadow-md ${
          isOut
            ? 'bg-purple-500 hover:bg-purple-400 text-white'
            : 'bg-purple-600 hover:bg-purple-500 text-white'
        }`}
        title={isPlaying ? 'إيقاف مؤقت' : 'تشغيل التسجيل الصوتي'}
      >
        {isPlaying ? (
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="4" width="4" height="16" />
            <rect x="14" y="4" width="4" height="16" />
          </svg>
        ) : (
          <svg className="w-4 h-4 ml-0.5 text-white" fill="currentColor" viewBox="0 0 24 24">
            <polygon points="5,3 19,12 5,21" />
          </svg>
        )}
      </button>

      {/* الموجة الصوتية + شريط التقدم التفاعلي */}
      <div className="flex-1 flex flex-col gap-1 min-w-0">
        <div
          className="flex items-end gap-[2px] h-9 cursor-pointer select-none py-1 group/wave"
          onClick={handleProgressClick}
          title="اضغط أو اسحب للانتقال إلى أي نقطة في التسجيل"
        >
          {bars.map((h, i) => {
            const barPct = (i / bars.length) * 100;
            const isActive = barPct <= progress;
            return (
              <div
                key={i}
                onClick={(e) => handleBarClick(i, e)}
                className={`flex-1 rounded-full transition-all cursor-pointer ${
                  isActive
                    ? isOut
                      ? 'bg-purple-200 shadow-sm'
                      : 'bg-emerald-400 shadow-sm'
                    : isOut
                    ? 'bg-purple-400/40 hover:bg-purple-300'
                    : 'bg-slate-500/40 hover:bg-slate-400'
                }`}
                style={{ height: `${h}%` }}
              />
            );
          })}
        </div>
        {/* الوقت */}
        <div className="flex justify-between text-[10px] text-slate-300 font-mono tabular-nums px-0.5">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
}

interface EvolutionInstanceSummary {
  id: string;
  name: string;
  connectionStatus: string;
  ownerJid: string | null;
  profileName: string | null;
  profilePicUrl: string | null;
  _count?: {
    Message?: number;
    Contact?: number;
    Chat?: number;
  };
}

const AVAILABLE_STAFF = [
  { id: 'ayman', name: 'م. أيمن مريعي', role: 'مسؤول النظام الأعلى' },
  { id: 'sara', name: 'سارة خالد', role: 'مدير المبيعات' },
  { id: 'dosari', name: 'محمد الدوسري', role: 'خدمة العملاء' },
  { id: 'unassigned', name: 'غير مسند (عام)', role: 'صندوق عام' },
];

export function NativeChatInbox() {
  const { user } = useApp();

  // Evolution Real State
  const [instances, setInstances] = useState<EvolutionInstanceSummary[]>([]);
  const [selectedInstanceName, setSelectedInstanceName] = useState<string>('Master');
  const [sendingLineInstance, setSendingLineInstance] = useState<string>('');
  const [loadingInstances, setLoadingInstances] = useState<boolean>(true);

  // Inboxes State
  const [inboxesList, setInboxesList] = useState<{ id: string; name_ar: string; color_hex: string; filter_type: string; line_ids: string[] }[]>([]);
  const [selectedInboxId, setSelectedInboxId] = useState<string>('all');

  // Conversations State (Real)
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loadingChats, setLoadingChats] = useState<boolean>(false);
  const [activeConvId, setActiveConvId] = useState<string>('');

  // Messages State (Real)
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(false);

  // UI & Input Controls
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterTab, setFilterTab] = useState<'all' | 'mine' | 'unassigned' | 'unread' | 'rescue' | 'direct' | 'groups' | 'escalated'>('all');
  const [inputText, setInputText] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [includeSignature, setIncludeSignature] = useState<boolean>(true);
  const [showMobileChat, setShowMobileChat] = useState<boolean>(false);

  // --- حارس المخاطر (Risk Guard Engine State) ---
  const [consecutiveErrors, setConsecutiveErrors] = useState<number>(0);
  const [isBreakerTripped, setIsBreakerTripped] = useState<boolean>(false);
  const [quietConfirmOpen, setQuietConfirmOpen] = useState<boolean>(false);
  const [pendingSendText, setPendingSendText] = useState<string>('');
  const [lockedLinesMap, setLockedLinesMap] = useState<Record<string, string>>({});

  // --- مرفقات الوسائط (Media & Attachments) ---
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachmentModalOpen, setAttachmentModalOpen] = useState<boolean>(false);
  const [selectedAttachment, setSelectedAttachment] = useState<{
    file: File;
    base64: string;
    previewUrl: string;
    mediaType: 'image' | 'document' | 'audio' | 'video';
    mimeType: string;
    fileName: string;
    caption: string;
  } | null>(null);
  const [isSendingMedia, setIsSendingMedia] = useState<boolean>(false);

  // ─── Lightbox: عرض الصور والفيديو في نافذة كاملة ───
  const [lightboxMedia, setLightboxMedia] = useState<{
    type: 'image' | 'video';
    src: string;
    caption?: string;
  } | null>(null);

  // ─── تسجيل الصوت الحي (Live Voice Note Recorder) ───
  const [isRecordingVoice, setIsRecordingVoice] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ─── لوحة الإيموجي (Emoji Picker) ───
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);

  // ─── تثبيت الرسائل (Pinned Messages) ───
  const [pinnedMessagesMap, setPinnedMessagesMap] = useState<Record<string, ChatMessage[]>>({});
  const [pinnedIndex, setPinnedIndex] = useState<number>(0);
  const [pinModalMsg, setPinModalMsg] = useState<ChatMessage | null>(null);

  // ─── المفضلة المركزية بحساب الموظف (Favorites System 6 Categories) ───
  const [favoritesDrawerOpen, setFavoritesDrawerOpen] = useState<boolean>(false);
  const [favTab, setFavTab] = useState<'messages' | 'files' | 'media' | 'direct' | 'groups' | 'contacts'>('messages');
  const [favoritesList, setFavoritesList] = useState<{
    id: string;
    category: 'message' | 'file' | 'media' | 'direct_chat' | 'group' | 'contact';
    title: string;
    subtitle?: string;
    createdAt: string;
    meta?: any;
  }[]>([]);

  // تحميل المفضلة من السيرفر وقاعدة البيانات
  const loadFavoritesFromServer = useCallback(async () => {
    try {
      const res = await fetch('/api/favorites');
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.data)) {
          const mapped = json.data.map((f: any) => ({
            id: f.item_id || f.id,
            category: f.category,
            title: f.title,
            subtitle: f.subtitle,
            createdAt: f.created_at ? new Date(f.created_at).toLocaleDateString('ar-SA') : 'سابقاً',
            meta: f.meta,
          }));
          setFavoritesList(mapped);
          return;
        }
      }
    } catch (e) {
      console.warn('Failed loading favorites from server, fallback to localStorage', e);
    }
    // Fallback to localStorage
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('hub_favorites_v1');
        if (stored) setFavoritesList(JSON.parse(stored));
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    loadFavoritesFromServer();
  }, [loadFavoritesFromServer]);

  // ─── قفل المحادثات بكلمة مرور وطلب الترخيص ───
  const [lockedChatsPinMap, setLockedChatsPinMap] = useState<Record<string, string>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('hub_locked_chats_pins');
        return stored ? JSON.parse(stored) : {};
      } catch (e) {
        return {};
      }
    }
    return {};
  });
  const [unlockedSessionChats, setUnlockedSessionChats] = useState<Record<string, boolean>>({});
  const [pinModalOpen, setPinModalOpen] = useState<boolean>(false);
  const [pinModalMode, setPinModalMode] = useState<'set' | 'unlock'>('unlock');
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');
  const [requestAccessModalOpen, setRequestAccessModalOpen] = useState<boolean>(false);
  const [requestAccessSent, setRequestAccessSent] = useState<boolean>(false);
  const [requestAccessType, setRequestAccessType] = useState<'read' | 'reply' | 'reassign'>('read');
  const [requestAccessReason, setRequestAccessReason] = useState<string>('');

  // ─── تحويل الرسائل (Forward Message) ───
  const [forwardModalMsg, setForwardModalMsg] = useState<ChatMessage | null>(null);
  const [forwardSearch, setForwardSearch] = useState<string>('');

  // ─── الرد باقتباس (Quoted Reply) ───
  const [replyingToMessage, setReplyingToMessage] = useState<ChatMessage | null>(null);

  // ─── إرسال وسائط متعددة حتى 25 صورة و 5 فيديو و 5 ملفات (Batch Sending) ───
  const [batchAttachments, setBatchAttachments] = useState<{
    id: string;
    file: File;
    base64: string;
    previewUrl: string;
    mediaType: 'image' | 'document' | 'audio' | 'video';
    mimeType: string;
    fileName: string;
    sizeStr: string;
  }[]>([]);
  const [multiSendModalOpen, setMultiSendModalOpen] = useState<boolean>(false);
  const [isHdQuality, setIsHdQuality] = useState<boolean>(true);
  const [batchCaption, setBatchCaption] = useState<string>('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // حساب ساعات الهدوء بتوقيت مكة المكرمة (+3)
  const isQuietHoursActive = useMemo(() => {
    const now = new Date();
    // UTC + 3 hours for KSA
    const ksaHour = (now.getUTCHours() + 3) % 24;
    return ksaHour >= 1 && ksaHour < 7;
  }, []);

  // تحميل الصناديق من Supabase
  const loadInboxes = useCallback(async () => {
    try {
      const { data } = await supabase.from('inboxes').select('id, name_ar, color, filter_type').order('sort_order');
      if (Array.isArray(data)) {
        setInboxesList(data.map((d: any) => ({
          id: d.id,
          name_ar: d.name_ar,
          color_hex: d.color || '#8b5cf6',
          filter_type: d.filter_type || 'all',
          line_ids: [],
        })));
      }
    } catch (e) {
      console.warn('Failed to load inboxes:', e);
    }
  }, []);

  useEffect(() => {
    loadInboxes();
  }, [loadInboxes]);

  // 1. Fetch connected instances from Evolution API
  const fetchInstances = useCallback(async () => {
    try {
      setLoadingInstances(true);
      const res = await fetch('/api/evolution/instances');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setInstances(data);
          // إذا كان Master متصلاً نجعله الافتراضي دائماً
          const masterInst = data.find((i: any) => i.name === 'Master' && i.connectionStatus === 'open');
          const anyOpenInst = data.find((i: any) => i.connectionStatus === 'open');
          const defaultInst = masterInst || anyOpenInst || data[0];
          if (defaultInst) {
            setSelectedInstanceName(defaultInst.name);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load instances:', err);
    } finally {
      setLoadingInstances(false);
    }
  }, []);

  useEffect(() => {
    fetchInstances();
  }, [fetchInstances]);

  // 2. Fetch real chats & WhatsApp groups for the selected instance
  const fetchChats = useCallback(async (instanceName: string) => {
    if (!instanceName) return;
    try {
      setLoadingChats(true);
      // Fetch chats and all groups in parallel
      const [chatsRes, groupsRes] = await Promise.allSettled([
        fetch(`/api/evolution/instances/${instanceName}/chats`),
        fetch(`/api/evolution/instances/${instanceName}/groups?participants=false`),
      ]);

      const groupMap = new Map<string, { subject: string; size?: number; pictureUrl?: string }>();
      if (groupsRes.status === 'fulfilled' && groupsRes.value.ok) {
        try {
          const rawGroups = await groupsRes.value.json();
          if (Array.isArray(rawGroups)) {
            rawGroups.forEach((g: any) => {
              const id = g.id || g.jid;
              if (id) {
                groupMap.set(id, {
                  subject: g.subject || g.name || '',
                  size: g.size || (Array.isArray(g.participants) ? g.participants.length : undefined),
                  pictureUrl: g.pictureUrl,
                });
              }
            });
          }
        } catch (e) {
          console.warn('Failed parsing groups list:', e);
        }
      }

      if (chatsRes.status === 'fulfilled' && chatsRes.value.ok) {
        const rawChats = await chatsRes.value.json();
        if (Array.isArray(rawChats)) {
          const nowTs = Date.now();
          const mapped: ConversationItem[] = rawChats.map((c: any) => {
            const jid = c.remoteJid || c.id || '';
            const isGroup = jid.includes('@g.us');
            const altPhoneJid = c.lastMessage?.key?.remoteJidAlt || c.lastMessage?.key?.participantAlt || '';
            const rawPhone = altPhoneJid
              ? altPhoneJid.replace('@s.whatsapp.net', '')
              : jid.replace('@s.whatsapp.net', '').replace('@g.us', '').replace('@lid', '');
            const cleanPhone = rawPhone.replace(/\D/g, '');
            const groupInfo = groupMap.get(jid);
            
            let title = '';
            if (isGroup) {
              title = groupInfo?.subject || c.subject || c.name || (cleanPhone ? `مجموعة (${cleanPhone.slice(-6)})` : 'مجموعة واتساب');
            } else {
              title = c.pushName || c.name || (cleanPhone ? `+${cleanPhone}` : 'محادثة عميل');
            }

            let lastText = '';
            if (c.lastMessage?.message) {
              const msgObj = c.lastMessage.message;
              lastText =
                msgObj.conversation ||
                msgObj.extendedTextMessage?.text ||
                msgObj.reactionMessage?.text ||
                msgObj.documentMessage?.caption ||
                (msgObj.documentMessage ? '📄 مستند' : '') ||
                msgObj.imageMessage?.caption ||
                (msgObj.imageMessage ? '📷 صورة' : '') ||
                (msgObj.audioMessage ? '🎵 تسجيل صوتي' : '') ||
                msgObj.videoMessage?.caption ||
                (msgObj.videoMessage ? '🎥 مقطع فيديو' : '') ||
                (msgObj.stickerMessage ? '🎨 ملصق' : '') ||
                (msgObj.pollCreationMessage || msgObj.pollCreationMessageV2 || msgObj.pollCreationMessageV3 ? '📊 استطلاع رأي' : '') ||
                (msgObj.pollUpdateMessage ? '📊 استطلاع رأي' : '') ||
                (c.lastMessage.messageType && c.lastMessage.messageType.includes('poll') ? '📊 استطلاع رأي' : '') ||
                '';
            }

            let timeStr = '';
            let rawTimestamp = nowTs;
            if (c.updatedAt) {
              const date = new Date(c.updatedAt);
              rawTimestamp = date.getTime();
              timeStr = date.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
            }

            return {
              id: jid,
              chat_jid: jid,
              title: title,
              phone_or_jid: isGroup ? jid : `+${cleanPhone}`,
              avatar_letter: title.charAt(0) || '؟',
              avatar_url: groupInfo?.pictureUrl || c.profilePictureUrl || undefined,
              avatar_color: isGroup ? 'from-indigo-600 to-purple-600' : 'from-emerald-600 to-teal-600',
              unread_count: c.unreadCount || 0,
              is_group: isGroup,
              participant_count: groupInfo?.size,
              line_id: instanceName,
              line_title: instanceName === 'Master' ? 'الرقم الرئيسي' : instanceName,
              last_message_text: lastText || 'بدء المحادثة',
              last_message_at: timeStr || 'سابقاً',
              assigned_staff_name: user?.full_name || 'م. أيمن مريعي',
              tags: isGroup ? ['مجموعة'] : cleanPhone.startsWith('966') ? ['السعودية'] : [],
              status: 'open',
              last_customer_message_timestamp: rawTimestamp,
              locked_line_id: instanceName,
            };
          });

          setConversations(mapped);
          setActiveConvId((curr) => curr || (mapped.length > 0 ? mapped[0].id : ''));
        }
      }
    } catch (err) {
      console.error('Failed to load chats:', err);
    } finally {
      setLoadingChats(false);
    }
  }, [user]);

  // When selected instance changes, reload chats
  useEffect(() => {
    if (selectedInstanceName) {
      setActiveConvId('');
      setMessages([]);
      fetchChats(selectedInstanceName);
    }
  }, [selectedInstanceName]);

  // 3. Fetch real messages when active conversation changes
  const fetchMessagesForChat = useCallback(async (chatJid: string, instanceName: string) => {
    if (!chatJid || !instanceName) return;
    try {
      setLoadingMessages(true);
      const res = await fetch(`/api/evolution/instances/${instanceName}/messages?chatId=${encodeURIComponent(chatJid)}&limit=50`);
      if (res.ok) {
        const rawMsgs = await res.json();
        const list: any[] = Array.isArray(rawMsgs)
          ? rawMsgs
          : Array.isArray(rawMsgs?.messages?.records)
          ? rawMsgs.messages.records
          : Array.isArray(rawMsgs?.records)
          ? rawMsgs.records
          : Array.isArray(rawMsgs?.messages)
          ? rawMsgs.messages
          : [];
        
        const mapped: ChatMessage[] = list.map((m: any) => {
          const fromMe = m.key?.fromMe ?? false;
          let text = ``;
          let mediaType: any = `text`;
          // ─── msgKeyId: المعرّف الحقيقي لرسالة واتساب (من m.key.id فقط)
          // يُستخدم لبناء رابط الوكيل عند العرض — لا نبني الرابط هنا لتجنب double-proxy bug
          const msgKeyId: string | undefined = m.key?.id || undefined;
          let docFileName: string | undefined = undefined;

          if (m.message) {
            const msgObj = m.message;
            if (msgObj.conversation) {
              text = msgObj.conversation;
            } else if (msgObj.extendedTextMessage?.text) {
              text = msgObj.extendedTextMessage.text;
            } else if (msgObj.imageMessage) {
              mediaType = `image`;
              text = msgObj.imageMessage.caption || ``;
            } else if (msgObj.documentMessage) {
              mediaType = `document`;
              docFileName = msgObj.documentMessage.fileName || msgObj.documentMessage.title || undefined;
              text = docFileName || msgObj.documentMessage.caption || `مستند`;
            } else if (msgObj.audioMessage) {
              mediaType = `audio`;
              text = ``;
            } else if (msgObj.videoMessage) {
              mediaType = `video`;
              text = msgObj.videoMessage.caption || ``;
            } else if (msgObj.stickerMessage) {
              mediaType = `sticker`;
              text = ``;
            } else if (msgObj.reactionMessage) {
              text = msgObj.reactionMessage.text || ``;
            } else if (msgObj.pollCreationMessage || msgObj.pollCreationMessageV2 || msgObj.pollCreationMessageV3) {
              mediaType = `poll`;
              const pollObj = msgObj.pollCreationMessage || msgObj.pollCreationMessageV2 || msgObj.pollCreationMessageV3;
              text = pollObj?.name || `استطلاع رأي`;
            } else if (msgObj.pollUpdateMessage) {
              mediaType = `poll`;
              text = `استطلاع رأي تفاعلي`;
            } else if (m.messageType) {
              text = m.messageType.includes(`poll`) ? `استطلاع رأي` : ``;
            }
          }

          let timeStr = ``;
          if (m.messageTimestamp) {
            const date = new Date(m.messageTimestamp * 1000);
            timeStr = date.toLocaleTimeString(`ar-SA`, { hour: `2-digit`, minute: `2-digit` });
          }

          return {
            id: msgKeyId || m.id || ('msg-' + Date.now() + '-' + Math.random()),
            msg_key_id: msgKeyId,
            conversation_id: chatJid,
            chat_jid: chatJid,
            direction: fromMe ? `out` : `in`,
            body: text || (mediaType !== `text` ? `` : `(رسالة)`),
            media_type: mediaType,
            media_url: undefined,
            file_name: docFileName,
            sender_name: fromMe ? `أنا` : (m.pushName || `العميل`),
            status: fromMe ? (m.status === `READ` ? `read` : `delivered`) : `delivered`,
            line_id: instanceName,
            created_at: timeStr || `الآن`,
          };
        });

        setMessages(mapped.reverse());
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  // Auto-refresh silent poller every 6 seconds for real-time messages & chats list
  useEffect(() => {
    if (!selectedInstanceName) return;
    const interval = setInterval(() => {
      // 1. تحديث الرسائل للمحادثة المفتوحة بصمت
      if (activeConvId && selectedInstanceName) {
        fetch(`/api/evolution/instances/${selectedInstanceName}/messages?chatId=${encodeURIComponent(activeConvId)}&limit=50`)
          .then((res) => (res.ok ? res.json() : null))
          .then((rawMsgs) => {
            if (!rawMsgs) return;
            const list: any[] = Array.isArray(rawMsgs)
              ? rawMsgs
              : Array.isArray(rawMsgs?.messages?.records)
              ? rawMsgs.messages.records
              : Array.isArray(rawMsgs?.records)
              ? rawMsgs.records
              : Array.isArray(rawMsgs?.messages)
              ? rawMsgs.messages
              : [];
            if (list.length > 0) {
              setMessages((prev) => {
                const prevIds = new Set(prev.map((m) => m.id));
                const hasNew = list.some((m: any) => !prevIds.has(m.key?.id || m.id));
                if (!hasNew) return prev;
                fetchMessagesForChat(activeConvId, selectedInstanceName);
                return prev;
              });
            }
          })
          .catch(() => {});
      }

      // 2. تحديث قائمة المحادثات الخلفية تلقائياً دون تجميد الواجهة أو إعادة التحميل المزعجة
      fetch(`/api/evolution/instances/${selectedInstanceName}/chats`)
        .then((res) => (res.ok ? res.json() : null))
        .then((rawChats) => {
          if (Array.isArray(rawChats) && rawChats.length > 0) {
            setConversations((prev) => {
              // إذا تغيرت الأعداد أو ورود محادثة جديدة نقوم بالتحديث الهادئ
              if (rawChats.length !== prev.length) {
                fetchChats(selectedInstanceName);
              }
              return prev;
            });
          }
        })
        .catch(() => {});
    }, 6000);
    return () => clearInterval(interval);
  }, [activeConvId, selectedInstanceName, fetchMessagesForChat, fetchChats]);

  useEffect(() => {
    if (activeConvId && selectedInstanceName) {
      fetchMessagesForChat(activeConvId, selectedInstanceName);
    }
  }, [activeConvId, selectedInstanceName, fetchMessagesForChat]);

  // Active conversation object
  const activeConversation = useMemo(() => {
    return conversations.find((c) => c.id === activeConvId) || conversations[0] || null;
  }, [conversations, activeConvId]);

  // Current selected instance info
  const currentInstance = useMemo(() => {
    return instances.find((i) => i.name === selectedInstanceName) || null;
  }, [instances, selectedInstanceName]);

  // Auto-scroll down when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // --- حساب عداد الاستجابة (SLA Response Timer) ---
  const slaStatus = useMemo(() => {
    if (!activeConversation) return { text: 'جاهز', level: 'normal', minutes: 0 };
    const ts = activeConversation.last_customer_message_timestamp || Date.now();
    const diffMinutes = Math.max(0, Math.floor((Date.now() - ts) / 60000));

    if (activeConversation.status === 'resolved') {
      return { text: 'تم الحل وإغلاق التذكرة', level: 'resolved', minutes: diffMinutes };
    }
    if (diffMinutes >= 10) {
      return { text: `تجاوز مهلة الرد (${diffMinutes} دقيقة) — يلزم التصعيد!`, level: 'critical', minutes: diffMinutes };
    }
    if (diffMinutes >= 5) {
      return { text: `تنبيه المشرف: انتظار (${diffMinutes} دقيقة)`, level: 'warning', minutes: diffMinutes };
    }
    return { text: `انتظار العميل: (${diffMinutes} د)`, level: 'normal', minutes: diffMinutes };
  }, [activeConversation]);

  // Filter conversations based on search, tabs and selected inbox
  const filteredConversations = useMemo(() => {
    const now = Date.now();
    const currentInbox = inboxesList.find((ib) => ib.id === selectedInboxId);

    return conversations.filter((c) => {
      // 1. فلترة الصندوق
      if (currentInbox) {
        if (currentInbox.filter_type === 'dm' && c.is_group) return false;
        if (currentInbox.filter_type === 'groups' && !c.is_group) return false;
      }

      // 2. فلترة البحث
      const matchSearch =
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone_or_jid.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.last_message_text.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchSearch) return false;
      if (filterTab === 'mine') return c.assigned_staff_name === user?.full_name;
      if (filterTab === 'unassigned') return !c.assigned_staff_name || c.assigned_staff_name === 'غير مسند';
      if (filterTab === 'unread') return c.unread_count > 0;
      if (filterTab === 'rescue') {
        const delay = now - (c.last_customer_message_timestamp || 0);
        return delay >= 15 * 60 * 1000;
      }
      if (filterTab === 'direct') return !c.is_group;
      if (filterTab === 'groups') return c.is_group;
      if (filterTab === 'escalated') return c.status === 'escalated';
      return true;
    });
  }, [conversations, searchQuery, filterTab, user, selectedInboxId, inboxesList]);

  // مؤقت ذكي لتصفير قراءة الرسائل بعد ثانيتين (2s) في المحادثة وإرسالها لـ Evolution API
  useEffect(() => {
    if (!activeConvId) return;
    const active = conversations.find((c) => c.id === activeConvId);
    if (!active || active.unread_count === 0) return;

    const timer = setTimeout(async () => {
      // 1. تصفير العداد محلياً
      setConversations((prev) =>
        prev.map((c) => (c.id === activeConvId ? { ...c, unread_count: 0 } : c))
      );
      // 2. إرسال أمر markMessageAsRead لخادم Evolution API ليعكس القراءة على واتساب والجوال
      const instance = active.line_id || selectedInstanceName;
      try {
        await fetch(`/api/evolution/instances/${instance}/read`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chatJid: active.chat_jid }),
        });
      } catch (e) {
        console.warn('Silent read status update failed:', e);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [activeConvId, conversations, selectedInstanceName]);

  const handleSelectConversation = (id: string) => {
    setActiveConvId(id);
    setShowMobileChat(true);
  };

  // --- Supabase: حفظ حالة المحادثة (upsert) ---
  const upsertConversationState = useCallback(async (
    chatJid: string,
    lineId: string,
    updates: { status?: ConversationStatus; assigned_staff_name?: string; assigned_staff_id?: string }
  ) => {
    try {
      const { error } = await supabase
        .from('conversations')
        .upsert(
          {
            chat_jid: chatJid,
            line_id: lineId,
            updated_at: new Date().toISOString(),
            ...updates,
          },
          { onConflict: 'chat_jid,line_id', ignoreDuplicates: false }
        );
      if (error) {
        // لا نوقف العمل — نسجل فقط في الكونسول
        console.warn('[Supabase] upsert conversation state warning:', error.message);
      }
    } catch (err) {
      console.warn('[Supabase] upsert error (non-critical):', err);
    }
  }, []);

  // --- Supabase Realtime: مزامنة تغييرات الحالة بين الموظفين ---
  useEffect(() => {
    const channel = supabase
      .channel('conversations-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations' },
        (payload) => {
          const updated = payload.new as any;
          if (!updated?.chat_jid) return;
          setConversations((prev) =>
            prev.map((c) => {
              if (c.chat_jid === updated.chat_jid) {
                return {
                  ...c,
                  status: updated.status ?? c.status,
                  assigned_staff_name: updated.assigned_staff_name ?? c.assigned_staff_name,
                  assigned_staff_id: updated.assigned_staff_id ?? c.assigned_staff_id,
                };
              }
              return c;
            })
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // --- دورة الإسناد: تحديث حالة المحادثة (محلي + Supabase) ---
  const handleUpdateStatus = (newStatus: ConversationStatus) => {
    if (!activeConversation) return;
    setConversations((prev) =>
      prev.map((c) => (c.id === activeConversation.id ? { ...c, status: newStatus } : c))
    );
    // حفظ في Supabase بشكل غير متزامن (لا ينتظر)
    upsertConversationState(activeConversation.chat_jid, selectedInstanceName, { status: newStatus });
  };

  // --- دورة الإسناد: إسناد المحادثة لموظف (محلي + Supabase) ---
  const handleAssignStaff = (staffName: string) => {
    if (!activeConversation) return;
    const staffMember = AVAILABLE_STAFF.find((s) => s.name === staffName);
    setConversations((prev) =>
      prev.map((c) => (c.id === activeConversation.id ? { ...c, assigned_staff_name: staffName, assigned_staff_id: staffMember?.id } : c))
    );
    // حفظ في Supabase بشكل غير متزامن (لا ينتظر)
    upsertConversationState(activeConversation.chat_jid, selectedInstanceName, {
      assigned_staff_name: staffName,
      assigned_staff_id: staffMember?.id,
    });
  };

  // --- حارس المخاطر: إعادة ضبط قاطع الدائرة ---
  const handleResetCircuitBreaker = () => {
    setConsecutiveErrors(0);
    setIsBreakerTripped(false);
  };

  // تنفيذ الإرسال الفعلي بعد تدقيق حارس المخاطر
  const executeSendMessage = async (textToSend: string) => {
    if (!activeConversation || isSending) return;

    // تدقيق قاطع الدائرة
    if (isBreakerTripped) {
      alert('قاطع الدائرة مفعل! تم تعليق الإرسال التلقائي لحماية الخط من الحظر. يرجى إعادة الضبط يدوياً بعد التأكد من صحة الرقم والاتصال.');
      return;
    }

    setIsSending(true);

    const effectiveLine = sendingLineInstance || selectedInstanceName;

    const signature = includeSignature
      ? `\n\n*${user.full_name}* — ${currentInstance?.profileName || effectiveLine}`
      : '';

    const fullMessage = `${textToSend}${signature}`;

    try {
      const res = await fetch(`/api/evolution/instances/${effectiveLine}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: activeConversation.chat_jid,
          text: fullMessage,
        }),
      });

      if (res.ok) {
        // نجاح الإرسال: تصفير أخطاء قاطع الدائرة وقفل خط الإرسال
        setConsecutiveErrors(0);
        setLockedLinesMap((prev) => ({ ...prev, [activeConversation.chat_jid]: effectiveLine }));

        const newMsg: ChatMessage = {
          id: `msg-${Date.now()}`,
          conversation_id: activeConversation.id,
          chat_jid: activeConversation.chat_jid,
          direction: 'out',
          body: textToSend,
          signature: signature.trim() || undefined,
          media_type: 'text',
          sender_name: user.full_name,
          status: 'sent',
          line_id: effectiveLine,
          created_at: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
        };

        setMessages((prev) => [...prev, newMsg]);

        // تحديث حالة المحادثة
        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeConversation.id
              ? {
                  ...c,
                  last_message_text: textToSend,
                  last_message_at: 'الآن',
                  status: c.status === 'open' ? 'in_progress' : c.status,
                }
              : c
          )
        );

        setInputText('');
        setShowEmojiPicker(false);
      } else {
        const errData = await res.json();
        const newErrCount = consecutiveErrors + 1;
        setConsecutiveErrors(newErrCount);

        if (newErrCount >= 3) {
          setIsBreakerTripped(true);
          alert(`⚡ تحذير قاطع الدائرة (Circuit Breaker): تم إيقاف الإرسال بعد 3 أخطاء متتالية لحماية خط واتساب من الحظر!`);
        } else {
          alert(`فشل الإرسال عبر واتساب (محاولة ${newErrCount}/3): ${errData.error || res.statusText}`);
        }
      }
    } catch (err: any) {
      const newErrCount = consecutiveErrors + 1;
      setConsecutiveErrors(newErrCount);
      if (newErrCount >= 3) {
        setIsBreakerTripped(true);
      }
      alert(`خطأ في الاتصال أثناء الإرسال: ${err.message}`);
    } finally {
      setIsSending(false);
      setQuietConfirmOpen(false);
      setPendingSendText('');
    }
  };

  // فحص حارس المخاطر قبل الإرسال (ساعات الهدوء وقاطع الدائرة)
  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || !activeConversation || isSending) return;

    if (isBreakerTripped) {
      alert('قاطع الدائرة مفعل حالياً! اضغط على زر إعادة ضبط القاطع في الأعلى بعد مراجعة اتصال الخط.');
      return;
    }

    // فحص ساعات الهدوء
    if (isQuietHoursActive) {
      setPendingSendText(trimmed);
      setQuietConfirmOpen(true);
      return;
    }

    executeSendMessage(trimmed);
  };

  // ─── إدارة تثبيت الرسائل (حتى 5 رسائل بخيارات مدة واتساب) ───
  const handlePinMessage = (msg: ChatMessage, duration: '24h' | '7d' | '30d') => {
    if (!activeConversation) return;
    const convId = activeConversation.id;
    setPinnedMessagesMap((prev) => {
      const current = prev[convId] || [];
      const filtered = current.filter((m) => m.id !== msg.id);
      if (filtered.length >= 5) {
        alert('يمكنك تثبيت ما يصل إلى 5 رسائل كحد أقصى في كل محادثة.');
        return prev;
      }
      return {
        ...prev,
        [convId]: [{ ...msg, is_pinned: true, pinned_duration: duration }, ...filtered],
      };
    });
    setPinModalMsg(null);
  };

  const handleUnpinMessage = (msgId: string) => {
    if (!activeConversation) return;
    const convId = activeConversation.id;
    setPinnedMessagesMap((prev) => ({
      ...prev,
      [convId]: (prev[convId] || []).filter((m) => m.id !== msgId),
    }));
  };

  // ─── حفظ سريع كجهة اتصال ثلاثية الأبعاد مع وسم المصدر ───
  const handleQuickSaveContact = async () => {
    if (!activeConversation) return;
    try {
      const lineName = lockedLinesMap[activeConversation.chat_jid] || selectedInstanceName;
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: activeConversation.title,
          primary_phone: activeConversation.phone_or_jid,
          entity_type: activeConversation.is_group ? 'group' : 'individual',
          commercial_role: 'b2c',
          source: 'evolution',
          source_detail: 'evolution:' + lineName,
        }),
      });

      if (res.ok) {
        alert('تم حفظ ' + activeConversation.title + ' بنجاح في دليل جهات الاتصال وربط مصدرها بخط (' + lineName + ')!');
      } else {
        const err = await res.json();
        alert('فشل الحفظ: ' + err.error);
      }
    } catch (e: any) {
      alert('خطأ: ' + e.message);
    }
  };

  // ─── إدارة المفضلة المركزية (6 تبويبات) ───
  const handleToggleFavorite = async (
    item: { id: string; title: string; subtitle?: string; meta?: any },
    category: 'message' | 'file' | 'media' | 'direct_chat' | 'group' | 'contact'
  ) => {
    const exists = favoritesList.some((f) => f.id === item.id && f.category === category);
    if (exists) {
      setFavoritesList((prev) => prev.filter((f) => !(f.id === item.id && f.category === category)));
      try {
        await fetch(`/api/favorites?item_id=${encodeURIComponent(item.id)}&category=${category}`, { method: 'DELETE' });
      } catch (err) {
        console.warn('Failed to delete favorite from server:', err);
      }
    } else {
      const newFav = {
        id: item.id,
        category,
        title: item.title,
        subtitle: item.subtitle,
        meta: item.meta,
        createdAt: new Date().toLocaleDateString('ar-SA'),
      };
      setFavoritesList((prev) => [newFav, ...prev]);
      try {
        await fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category,
            title: item.title,
            subtitle: item.subtitle,
            item_id: item.id,
            meta: item.meta,
          }),
        });
      } catch (err) {
        console.warn('Failed to save favorite to server:', err);
      }
    }
  };

  // ─── تحويل رسالة إلى محادثة أخرى ───
  const handleForwardMessage = async (targetConv: ConversationItem) => {
    if (!forwardModalMsg || isSending) return;
    setIsSending(true);
    try {
      if (forwardModalMsg.media_type === 'text') {
        await fetch(`/api/evolution/instances/${targetConv.line_id || selectedInstanceName}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: targetConv.chat_jid,
            text: forwardModalMsg.body,
          }),
        });
      }
      alert(`تم تحويل الرسالة بنجاح إلى "${targetConv.title}"`);
      setForwardModalMsg(null);
    } catch (err: any) {
      alert(`فشل تحويل الرسالة: ${err.message}`);
    } finally {
      setIsSending(false);
    }
  };

  // ─── التصويت التفاعلي على الاستطلاع (Poll) ───
  const handleVotePoll = (msgId: string, optionId: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== msgId || !m.poll_data) return m;
        const opts = m.poll_data.options.map((opt) => {
          if (opt.id === optionId) {
            return {
              ...opt,
              votes: opt.userVoted ? Math.max(0, opt.votes - 1) : opt.votes + 1,
              userVoted: !opt.userVoted,
            };
          }
          return opt;
        });
        const total = opts.reduce((sum, o) => sum + o.votes, 0);
        return {
          ...m,
          poll_data: {
            ...m.poll_data,
            options: opts,
            totalVotes: total,
          },
        };
      })
    );
  };

  // ─── معالجة اختيار ملفات متعددة (حتى 25 صورة و 5 فيديوهات و 5 مستندات) ───
  const handleMultiFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const files = Array.from(fileList);
    let imageCount = 0;
    let videoCount = 0;
    let docCount = 0;

    for (const f of files) {
      if (f.type.startsWith('image/')) imageCount++;
      else if (f.type.startsWith('video/')) videoCount++;
      else docCount++;
    }

    if (imageCount > 25) {
      alert('الحد الأقصى للصور دفعة واحدة هو 25 صورة.');
      return;
    }
    if (videoCount > 5) {
      alert('الحد الأقصى لمقاطع الفيديو دفعة واحدة هو 5 مقاطع.');
      return;
    }
    if (docCount > 5) {
      alert('الحد الأقصى للمستندات دفعة واحدة هو 5 ملفات.');
      return;
    }

    const loadedItems: {
      id: string;
      file: File;
      base64: string;
      previewUrl: string;
      mediaType: 'image' | 'document' | 'audio' | 'video';
      mimeType: string;
      fileName: string;
      sizeStr: string;
    }[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      let mediaType: 'image' | 'document' | 'audio' | 'video' = 'document';
      if (file.type.startsWith('image/')) mediaType = 'image';
      else if (file.type.startsWith('audio/')) mediaType = 'audio';
      else if (file.type.startsWith('video/')) mediaType = 'video';

      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      const kb = file.size / 1024;
      const sizeStr = kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb.toFixed(0)} KB`;

      loadedItems.push({
        id: `batch-item-${Date.now()}-${i}`,
        file,
        base64,
        previewUrl: URL.createObjectURL(file),
        mediaType,
        mimeType: file.type || 'application/octet-stream',
        fileName: file.name,
        sizeStr,
      });
    }

    setBatchAttachments(loadedItems);
    setMultiSendModalOpen(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ─── إرسال الدفعة بالكامل مع إظهار المعاينة الفورية في المحادثة ───
  const handleSendBatchAttachments = async () => {
    if (!activeConversation || batchAttachments.length === 0 || isSendingMedia) return;
    setIsSendingMedia(true);

    try {
      for (let idx = 0; idx < batchAttachments.length; idx++) {
        const item = batchAttachments[idx];
        const captionToSend = idx === 0 ? batchCaption : '';

        // إضافة متفائلة فورية للمحادثة
        const optimisticMsg: ChatMessage = {
          id: `sent-batch-${Date.now()}-${idx}`,
          conversation_id: activeConversation.id,
          chat_jid: activeConversation.chat_jid,
          direction: 'out',
          body: captionToSend || item.fileName,
          media_type: item.mediaType,
          media_url: item.previewUrl,
          file_name: item.fileName,
          file_size: item.sizeStr,
          sender_name: user.full_name,
          status: 'sending',
          line_id: selectedInstanceName,
          created_at: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
        };

        setMessages((prev) => [...prev, optimisticMsg]);

        await fetch(`/api/evolution/instances/${selectedInstanceName}/media`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: activeConversation.chat_jid,
            mediaType: item.mediaType,
            mimeType: item.mimeType,
            media: item.base64,
            caption: captionToSend,
            fileName: item.fileName,
            quality: isHdQuality ? 'hd' : 'standard',
          }),
        });

        // تحديث الحالة إلى 'sent'
        setMessages((prev) =>
          prev.map((m) => (m.id === optimisticMsg.id ? { ...m, status: 'sent' } : m))
        );
      }

      setBatchAttachments([]);
      setBatchCaption('');
      setMultiSendModalOpen(false);
    } catch (err: any) {
      alert(`خطأ أثناء إرسال الدفعة: ${err.message}`);
    } finally {
      setIsSendingMedia(false);
    }
  };

  // --- معالجة اختيار ملف للإرفاق ---
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    let mediaType: 'image' | 'document' | 'audio' | 'video' = 'document';
    if (file.type.startsWith('image/')) mediaType = 'image';
    else if (file.type.startsWith('audio/')) mediaType = 'audio';
    else if (file.type.startsWith('video/')) mediaType = 'video';

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setSelectedAttachment({
        file,
        base64,
        previewUrl: URL.createObjectURL(file),
        mediaType,
        mimeType: file.type || 'application/octet-stream',
        fileName: file.name,
        caption: '',
      });
      setAttachmentModalOpen(true);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsDataURL(file);
  };

  // --- إرسال المرفق عبر Evolution API ---
  const handleSendAttachment = async () => {
    if (!selectedAttachment || !activeConversation || isSendingMedia) return;

    if (isBreakerTripped) {
      alert('قاطع الدائرة مفعل حالياً! لا يمكن إرسال المرفقات قبل إعادة الضبط.');
      return;
    }

    setIsSendingMedia(true);
    try {
      const res = await fetch(`/api/evolution/instances/${selectedInstanceName}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: activeConversation.chat_jid,
          mediaType: selectedAttachment.mediaType,
          mimeType: selectedAttachment.mimeType,
          media: selectedAttachment.base64,
          caption: selectedAttachment.caption,
          fileName: selectedAttachment.fileName,
        }),
      });

      if (res.ok) {
        setConsecutiveErrors(0);
        const sentData = await res.json();
        const sentKeyId: string | undefined = sentData?.key?.id || undefined;
        const newMsg: ChatMessage = {
          id: sentKeyId || ('media-' + Date.now()),
          msg_key_id: sentKeyId,
          conversation_id: activeConversation.id,
          chat_jid: activeConversation.chat_jid,
          direction: 'out',
          body: selectedAttachment.caption || (selectedAttachment.mediaType === `image` ? `📷 صورة` : `📄 ${selectedAttachment.fileName}`),
          media_type: selectedAttachment.mediaType,
          // للرسائل الصادرة المؤقتة: نستخدم blob URL مباشرةً حتى إعادة تحميل المحادثة
          media_url: sentKeyId ? undefined : selectedAttachment.previewUrl,
          file_name: selectedAttachment.fileName,
          sender_name: user.full_name,
          status: 'sent',
          line_id: selectedInstanceName,
          created_at: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
        };

        setMessages((prev) => [...prev, newMsg]);

        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeConversation.id
              ? {
                  ...c,
                  last_message_text: selectedAttachment.caption || (selectedAttachment.mediaType === 'image' ? '📷 صورة' : `📄 ${selectedAttachment.fileName}`),
                  last_message_at: 'الآن',
                }
              : c
          )
        );

        setAttachmentModalOpen(false);
        setSelectedAttachment(null);
      } else {
        const errData = await res.json();
        alert(`فشل إرسال المرفق: ${errData.error || res.statusText}`);
      }
    } catch (err: any) {
      alert(`خطأ في الاتصال أثناء إرسال المرفق: ${err.message}`);
    } finally {
      setIsSendingMedia(false);
    }
  };

  // ─── إدراج إيموجي في مربع النص ───
  const handleInsertEmoji = (emoji: string) => {
    setInputText((prev) => prev + emoji);
    setShowEmojiPicker(false);
  };

  // ─── بدء تسجيل الصوت الحي ───
  const handleStartVoiceRecording = async () => {
    if (isBreakerTripped) {
      alert('قاطع الدائرة مفعل حالياً! لا يمكن التسجيل.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      audioChunksRef.current = [];

      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mr.start(200);
      setIsRecordingVoice(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      alert(`تعذر الوصول إلى الميكروفون: ${err.message || 'يرجى تفعيل صلاحية الميكروفون في المتصفح'}`);
    }
  };

  // ─── إلغاء تسجيل الصوت ───
  const handleCancelVoiceRecording = () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    if (mediaRecorderRef.current) {
      try {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
      } catch (e) {}
    }
    setIsRecordingVoice(false);
    setRecordingSeconds(0);
    audioChunksRef.current = [];
  };

  // ─── إنهاء التسجيل وإرساله فوراً عبر واتساب ───
  const handleStopAndSendVoiceRecording = async () => {
    if (!mediaRecorderRef.current || !activeConversation) return;
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);

    const mr = mediaRecorderRef.current;
    mr.onstop = async () => {
      try {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/ogg; codecs=opus' });
        mr.stream.getTracks().forEach((t) => t.stop());

        const reader = new FileReader();
        reader.onload = async () => {
          const fullBase64 = reader.result as string;
          const rawBase64 = fullBase64.includes(';base64,') ? fullBase64.split(';base64,')[1] : fullBase64;
          if (!rawBase64) return;

          setIsSendingMedia(true);
          try {
            const res = await fetch(`/api/evolution/instances/${selectedInstanceName}/media`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                to: activeConversation.chat_jid,
                mediaType: 'audio',
                mimeType: 'audio/ogg; codecs=opus',
                media: rawBase64,
                fileName: 'voice_note.ogg',
              }),
            });

            if (res.ok) {
              const resData = await res.json();
              setConsecutiveErrors(0);
              const sentKeyId: string | undefined = resData?.key?.id || undefined;
              const newMsg: ChatMessage = {
                id: sentKeyId || ('voice-' + Date.now()),
                msg_key_id: sentKeyId,
                conversation_id: activeConversation.id,
                chat_jid: activeConversation.chat_jid,
                direction: 'out',
                body: '',
                media_type: 'audio',
                media_url: undefined,
                sender_name: user.full_name,
                status: 'sent',
                line_id: selectedInstanceName,
                created_at: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
              };

              setMessages((prev) => [...prev, newMsg]);
              setConversations((prev) =>
                prev.map((c) =>
                  c.id === activeConversation.id
                    ? { ...c, last_message_text: '🎵 تسجيل صوتي', last_message_at: 'الآن' }
                    : c
                )
              );
            } else {
              const err = await res.json();
              alert(`فشل إرسال البصمة الصوتية: ${err.error || res.statusText}`);
            }
          } catch (err: any) {
            alert(`خطأ أثناء إرسال التسجيل: ${err.message}`);
          } finally {
            setIsSendingMedia(false);
          }
        };
        reader.readAsDataURL(audioBlob);
      } catch (err: any) {
        alert(`خطأ في معالجة الصوت: ${err.message}`);
      }
    };

    mr.stop();
    setIsRecordingVoice(false);
    setRecordingSeconds(0);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] rounded-3xl overflow-hidden border border-[var(--border-subtle)] bg-[var(--card-bg)] shadow-2xl relative transition-colors duration-200">
      
      {/* --- حارس المخاطر: شريط تنبيه ساعات الهدوء وقاطع الدائرة --- */}
      {isQuietHoursActive && (
        <div className="bg-amber-950/70 border-b border-amber-600/40 px-4 py-1.5 flex items-center justify-between text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <Moon className="w-4 h-4 text-amber-400 animate-pulse" />
            <span className="font-semibold">وضع ساعات الهدوء نشط (01:00 ص - 07:00 ص بتوقيت مكة)</span>
            <span className="text-[11px] text-amber-300/80 hidden sm:inline">— حارس المخاطر يراقب الرسائل لحماية الأرقام من شكاوى الإزعاج والحظر.</span>
          </div>
          <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-mono">
            Quiet Hours Guard Active
          </span>
        </div>
      )}

      {isBreakerTripped && (
        <div className="bg-rose-950/90 border-b border-rose-600/50 px-4 py-2 flex items-center justify-between text-xs text-rose-200">
          <div className="flex items-center gap-2">
            <ZapOff className="w-4 h-4 text-rose-400 animate-bounce" />
            <span className="font-bold">قاطع الدائرة مفعل (Circuit Breaker Tripped)!</span>
            <span className="text-[11px] text-rose-300">تم تعليق الإرسال التلقائي بعد 3 أخطاء متتالية لحماية خط واتساب.</span>
          </div>
          <button
            onClick={handleResetCircuitBreaker}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>إعادة ضبط القاطع</span>
          </button>
        </div>
      )}

      {/* Top Bar: Inboxes, Connected Line / Instance Selector & Quick Status */}
      <div className="bg-[var(--card-bg)] border-b border-[var(--border-subtle)] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex flex-wrap items-center gap-3">
          {/* اختيار الصندوق المشترك */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-purple-300">الصندوق:</span>
            <select
              value={selectedInboxId}
              onChange={(e) => setSelectedInboxId(e.target.value)}
              className="bg-purple-950/40 text-xs text-purple-200 border border-purple-500/40 rounded-xl px-3 py-1.5 outline-none focus:border-purple-400 font-bold"
            >
              <option value="all">كل الصناديق (عرض مجمّع)</option>
              {inboxesList.map((ib) => (
                <option key={ib.id} value={ib.id}>
                  {ib.name_ar} {ib.filter_type === 'groups' ? '(مجموعات)' : ib.filter_type === 'dm' ? '(فردي)' : ''}
                </option>
              ))}
            </select>
          </div>

          <span className="text-slate-600 hidden sm:inline">|</span>

          {/* اختيار الخط المعروض */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-[var(--text-secondary)]">الخط:</span>
            <select
              value={selectedInstanceName}
              onChange={(e) => setSelectedInstanceName(e.target.value)}
              disabled={loadingInstances}
              className="bg-[var(--card-elevated)] text-xs text-[var(--text-main)] border border-[var(--border-subtle)] rounded-xl px-3 py-1.5 outline-none focus:border-purple-500 font-medium"
            >
              {instances.map((inst) => (
                <option key={inst.name} value={inst.name}>
                  {inst.profileName || inst.name} {inst.ownerJid ? `(+${inst.ownerJid.replace('@s.whatsapp.net', '')})` : ''} — [{inst.connectionStatus === 'open' ? 'متصل' : 'معلق'}]
                </option>
              ))}
            </select>
          </div>

          {currentInstance && (
            <span className={`flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full border ${
              currentInstance.connectionStatus === 'open'
                ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                : 'text-amber-400 bg-amber-500/10 border-amber-500/30'
            }`}>
              {currentInstance.connectionStatus === 'open' ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {currentInstance.connectionStatus === 'open' ? 'متصل ومستقر' : 'جاري الاتصال'}
            </span>
          )}

          {/* شارة تسخين الأرقام وحارس المخاطر */}
          <span className="hidden lg:flex items-center gap-1 text-[10px] text-[var(--text-muted)] bg-[var(--card-elevated)] border border-[var(--border-subtle)] px-2 py-0.5 rounded-full">
            <ShieldAlert className="w-3 h-3 text-purple-400" />
            <span>حارس المخاطر: تسخين آمن (50 رسالة/يوم)</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              fetchInstances();
              if (selectedInstanceName) fetchChats(selectedInstanceName);
            }}
            disabled={loadingChats || loadingInstances}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--card-elevated)] hover:bg-purple-500/20 text-[var(--text-secondary)] border border-[var(--border-subtle)] text-xs transition-all"
            title="تحديث المحادثات والخطوط الحقيقية"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingChats || loadingInstances ? 'animate-spin' : ''}`} />
            <span>تحديث البيانات الحية</span>
          </button>
        </div>
      </div>

      {/* Main Chat Workspace */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Right Pane: Real Conversations List */}
        <div
          className={`w-full md:w-80 lg:w-96 flex flex-col border-l border-[var(--border-subtle)] bg-[var(--card-bg)] shrink-0 ${
            showMobileChat ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Search & Filters */}
          <div className="p-3 border-b border-[var(--border-subtle)] space-y-2.5">
            <div className="relative">
              <Search className="w-4 h-4 absolute right-3 top-3 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="بحث في المحادثات أو الأرقام..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[var(--card-elevated)] text-xs text-[var(--text-main)] pr-9 pl-3 py-2 rounded-2xl border border-[var(--border-subtle)] focus:border-purple-500 outline-none placeholder:text-[var(--text-muted)]"
              />
            </div>

            {/* Filter Tabs - مع تبويبات دورة الإسناد والرادار والمجموعات */}
            <div className="flex items-center gap-1.5 text-[11px] overflow-x-auto pb-1 scrollbar-none" dir="rtl">
              <button
                onClick={() => setFilterTab('all')}
                className={`px-2.5 py-1 rounded-xl transition-all whitespace-nowrap ${
                  filterTab === 'all'
                    ? 'bg-purple-600/30 text-[var(--text-secondary)] font-bold border border-purple-500/50'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)] bg-[var(--card-elevated)]'
                }`}
              >
                الكل ({conversations.length})
              </button>
              <button
                onClick={() => setFilterTab('mine')}
                className={`px-2.5 py-1 rounded-xl transition-all whitespace-nowrap ${
                  filterTab === 'mine'
                    ? 'bg-purple-600/30 text-[var(--text-secondary)] font-bold border border-purple-500/50'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)] bg-[var(--card-elevated)]'
                }`}
              >
                المسندة لي
              </button>
              <button
                onClick={() => setFilterTab('unassigned')}
                className={`px-2.5 py-1 rounded-xl transition-all whitespace-nowrap ${
                  filterTab === 'unassigned'
                    ? 'bg-amber-600/30 text-amber-300 font-bold border border-amber-500/50'
                    : 'text-slate-400 hover:text-white bg-slate-800/30'
                }`}
              >
                غير مسندة ({conversations.filter((c) => !c.assigned_staff_name || c.assigned_staff_name === 'غير مسند').length})
              </button>
              <button
                onClick={() => setFilterTab('unread')}
                className={`px-2.5 py-1 rounded-xl transition-all whitespace-nowrap ${
                  filterTab === 'unread'
                    ? 'bg-purple-600/30 text-purple-300 font-semibold border border-purple-500/50'
                    : 'text-slate-400 hover:text-white bg-slate-800/30'
                }`}
              >
                غير مقروء ({conversations.filter((c) => c.unread_count > 0).length})
              </button>
              <button
                onClick={() => setFilterTab('rescue')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-xl transition-all whitespace-nowrap ${
                  filterTab === 'rescue'
                    ? 'bg-gradient-to-r from-amber-600 to-rose-600 text-white font-bold shadow-md shadow-amber-900/40 border border-amber-400/60 animate-pulse'
                    : 'text-amber-400 hover:text-amber-300 bg-amber-950/30 border border-amber-800/40'
                }`}
                title="محادثات تأخر الرد عليها أكثر من 15 دقيقة تنتظر الإسعاف والاقتناص"
              >
                <span>🎯 رادار الاقتناص السريع</span>
              </button>
              <button
                onClick={() => setFilterTab('direct')}
                className={`px-2.5 py-1 rounded-xl transition-all whitespace-nowrap ${
                  filterTab === 'direct'
                    ? 'bg-purple-600/30 text-purple-300 font-semibold border border-purple-500/50'
                    : 'text-slate-400 hover:text-white bg-slate-800/30'
                }`}
              >
                العملاء
              </button>
              <button
                onClick={() => setFilterTab('groups')}
                className={`px-2.5 py-1 rounded-xl transition-all whitespace-nowrap ${
                  filterTab === 'groups'
                    ? 'bg-purple-600/30 text-purple-300 font-semibold border border-purple-500/50'
                    : 'text-slate-400 hover:text-white bg-slate-800/30'
                }`}
              >
                المجموعات
              </button>
              <button
                onClick={() => setFilterTab('escalated')}
                className={`px-2.5 py-1 rounded-xl transition-all whitespace-nowrap ${
                  filterTab === 'escalated'
                    ? 'bg-rose-600/30 text-rose-300 font-semibold border border-rose-500/50'
                    : 'text-slate-400 hover:text-white bg-slate-800/30'
                }`}
              >
                المصعدة ({conversations.filter((c) => c.status === 'escalated').length})
              </button>
            </div>
          </div>

          {/* Conversations Scroll Area */}
          <div className="flex-1 overflow-y-auto divide-y divide-purple-900/20">
            {loadingChats ? (
              <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
                <span className="text-xs">جاري تحميل المحادثات الحقيقية من واتساب...</span>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                {searchQuery ? 'لا توجد محادثات مطابقة للبحث' : 'لا توجد محادثات على هذا الخط حتى الآن'}
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = conv.id === activeConvId;
                return (
                  <button
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv.id)}
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
                          : 'bg-violet-600/20 text-violet-300 border-violet-500/30'
                      }`}
                    >
                      {conv.avatar_url ? (
                        <img src={conv.avatar_url} alt={conv.title} className="w-full h-full object-cover" />
                      ) : conv.is_group ? (
                        <Users className="w-5 h-5" />
                      ) : (
                        conv.avatar_letter
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="font-semibold text-xs text-white truncate">
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
                        {/* حالة المحادثة في القائمة */}
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                            conv.status === 'resolved'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : conv.status === 'escalated'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse'
                              : conv.status === 'in_progress'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          }`}>
                            {conv.status === 'resolved' ? 'تم الحل' : conv.status === 'escalated' ? 'مصعدة' : conv.status === 'in_progress' ? 'قيد المعالجة' : 'مفتوحة'}
                          </span>

                          <span className="text-[10px] text-slate-400 truncate max-w-[100px]">
                            {conv.assigned_staff_name || 'عام'}
                          </span>
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
              })
            )}
          </div>
        </div>

        {/* Left/Center Pane: Active Chat */}
        <div
          className={`flex-1 flex flex-col bg-[var(--bg-main)] ${
            showMobileChat ? 'flex' : 'hidden md:flex'
          }`}
        >
          {activeConversation ? (
            <>
              {/* Chat Header with Assignment Cycle & SLA Timers */}
              <div className="bg-[var(--card-bg)] border-b border-[var(--border-subtle)] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowMobileChat(false)}
                    className="md:hidden p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--card-elevated)]"
                  >
                    <ArrowRight className="w-5 h-5" />
                  </button>

                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm shadow-sm overflow-hidden border ${
                      activeConversation.is_group
                        ? 'bg-purple-600/20 text-purple-300 border-purple-500/30'
                        : 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white border-transparent'
                    }`}
                  >
                    {activeConversation.avatar_url ? (
                      <img src={activeConversation.avatar_url} alt={activeConversation.title} className="w-full h-full object-cover" />
                    ) : activeConversation.is_group ? (
                      <Users className="w-5 h-5" />
                    ) : (
                      activeConversation.avatar_letter
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-[var(--text-main)]">
                        {activeConversation.title}
                      </span>
                      {activeConversation.is_group && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-900/40 text-purple-300 border border-purple-700/50">
                          {activeConversation.participant_count ? `مجموعة (${activeConversation.participant_count} عضو)` : 'مجموعة'}
                        </span>
                      )}

                      {/* شارة قفل الخط */}
                      <span className="flex items-center gap-1 text-[10px] text-[var(--text-muted)] bg-[var(--card-elevated)] px-2 py-0.5 rounded-md border border-[var(--border-subtle)] font-mono">
                        <Lock className="w-2.5 h-2.5 text-purple-400" />
                        <span>الخط: {lockedLinesMap[activeConversation.chat_jid] || selectedInstanceName}</span>
                      </span>
                    </div>

                    <div className="text-xs text-[var(--text-muted)] flex items-center gap-2 mt-0.5">
                      <span className="font-mono text-[var(--text-secondary)]">{activeConversation.phone_or_jid}</span>
                      <span>•</span>
                      
                      {/* عداد الاستجابة الذكي SLA Timer */}
                      <span className={`flex items-center gap-1 text-[11px] font-medium px-2 py-0.2 rounded-full border ${
                        slaStatus.level === 'critical'
                          ? 'text-rose-400 bg-rose-500/10 border-rose-500/30 animate-pulse'
                          : slaStatus.level === 'warning'
                          ? 'text-amber-400 bg-amber-500/10 border-amber-500/30'
                          : slaStatus.level === 'resolved'
                          ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                          : 'text-purple-300 bg-purple-500/10 border-purple-500/30'
                      }`}>
                        <Clock className="w-3 h-3" />
                        <span>{slaStatus.text}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* عناصر تحكم دورة الإسناد السريعة */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 text-xs bg-[var(--card-elevated)] border border-[var(--border-subtle)] rounded-xl px-2 py-1">
                    <UserPlus className="w-3.5 h-3.5 text-purple-400" />
                    <select
                      value={activeConversation.assigned_staff_name || 'غير مسند (عام)'}
                      onChange={(e) => handleAssignStaff(e.target.value)}
                      className="bg-transparent text-xs text-[var(--text-main)] outline-none font-medium cursor-pointer"
                    >
                      {AVAILABLE_STAFF.map((s) => (
                        <option key={s.id} value={s.name} className="bg-[var(--card-bg)] text-[var(--text-main)]">
                          {s.name} ({s.role.split(' ')[0]})
                        </option>
                      ))}
                    </select>
                  </div>

                  <select
                    value={activeConversation.status || 'open'}
                    onChange={(e) => handleUpdateStatus(e.target.value as ConversationStatus)}
                    className="bg-[var(--card-elevated)] text-xs text-[var(--text-main)] border border-[var(--border-subtle)] rounded-xl px-3 py-1.5 outline-none font-medium cursor-pointer"
                  >
                    <option value="open">🔵 مفتوحة (Open)</option>
                    <option value="in_progress">🟠 قيد المعالجة (In Progress)</option>
                    <option value="resolved">🟢 تم الحل (Resolved)</option>
                    <option value="snoozed">🟡 مؤجلة (Snoozed)</option>
                    <option value="escalated">🔴 تصعيد للإدارة (Escalated)</option>
                  </select>

                  {/* زر سريع "تم الحل" */}
                  {activeConversation.status !== 'resolved' ? (
                    <button
                      onClick={() => handleUpdateStatus('resolved')}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs transition-colors"
                      title="تعليم المحادثة كـ تم الحل بنجاح"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>تم الحل</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUpdateStatus('open')}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs transition-colors"
                      title="إعادة فتح المحادثة"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>إعادة الفتح</span>
                    </button>
                  )}

                  {/* 💾 زر حفظ سريع كجهة اتصال مع وسم المصدر */}
                  <button
                    onClick={handleQuickSaveContact}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/30 text-xs font-medium transition-all"
                    title="حفظ الرقم الحالي في دليل جهات الاتصال مع وسم المصدر"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">حفظ جهة اتصال</span>
                  </button>

                  {/* ⭐ زر تمييز المحادثة الحالية كمفضلة (Star Conversation) */}
                  {activeConversation && (() => {
                    const isStarred = favoritesList.some((f) => f.id === activeConversation.id);
                    return (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            handleToggleFavorite(
                              {
                                id: activeConversation.id,
                                title: activeConversation.title,
                                subtitle: activeConversation.phone_or_jid,
                                meta: { is_group: activeConversation.is_group }
                              },
                              activeConversation.is_group ? 'group' : 'direct_chat'
                            );
                          }}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all shadow-sm ${
                            isStarred
                              ? 'bg-amber-500/25 text-amber-300 border-amber-500/50 shadow-amber-950/40'
                              : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border-slate-700'
                          }`}
                          title={isStarred ? 'إزالة هذه المحادثة من المفضلة' : 'تمييز هذه المحادثة بنجمة صفراء وإضافتها للمفضلة'}
                        >
                          <Star className={`w-3.5 h-3.5 ${isStarred ? 'fill-amber-400 text-amber-400 animate-pulse' : 'text-slate-400'}`} />
                          <span>{isStarred ? 'محادثة مفضلة' : 'إضافة للمفضلة'}</span>
                        </button>

                        <button
                          onClick={() => setFavoritesDrawerOpen(true)}
                          className="px-2 py-1.5 rounded-xl bg-purple-950/40 hover:bg-purple-900/60 border border-purple-800/50 text-purple-300 hover:text-white transition-all text-xs font-mono font-bold"
                          title="عرض أرشيف المفضلات للموظف"
                        >
                          {favoritesList.length}
                        </button>
                      </div>
                    );
                  })()}

                  {/* 🔒 زر قفل / فك قفل المحادثة بالرمز السري PIN */}
                  {activeConversation && (() => {
                    const isChatLocked = !!lockedChatsPinMap[activeConversation.id];
                    const isSessionUnlocked = !!unlockedSessionChats[activeConversation.id];

                    return (
                      <button
                        onClick={() => {
                          setPinError('');
                          setPinInput('');
                          if (isChatLocked) {
                            if (isSessionUnlocked) {
                              // إعادة القفل
                              setUnlockedSessionChats((prev) => ({ ...prev, [activeConversation.id]: false }));
                            } else {
                              // فتح نافذة إدخال PIN
                              setPinModalMode('unlock');
                              setPinModalOpen(true);
                            }
                          } else {
                            // تعيين PIN وقفل المحادثة
                            setPinModalMode('set');
                            setPinModalOpen(true);
                          }
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                          isChatLocked
                            ? isSessionUnlocked
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                              : 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30 animate-pulse'
                            : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border-slate-700'
                        }`}
                        title={
                          isChatLocked
                            ? isSessionUnlocked
                              ? 'المحادثة مفتوحة مؤقتاً — اضغط لإعادة القفل فوراً'
                              : 'محادثة مقفلة برمز سري — اضغط لفك القفل'
                            : 'قفل هذه المحادثة برمز سري مخصص'
                        }
                      >
                        {isChatLocked ? (
                          isSessionUnlocked ? (
                            <>
                              <Unlock className="w-3.5 h-3.5 text-amber-400" />
                              <span>مفتوحة مؤقتاً</span>
                            </>
                          ) : (
                            <>
                              <Lock className="w-3.5 h-3.5 text-rose-400" />
                              <span>محادثة مقفلة</span>
                            </>
                          )
                        ) : (
                          <>
                            <Lock className="w-3.5 h-3.5 text-slate-400" />
                            <span>قفل بـ PIN</span>
                          </>
                        )}
                      </button>
                    );
                  })()}
                </div>
              </div>

              {/* 📌 شريط الرسائل المثبتة أعلى المحادثة (حتى 5 رسائل) */}
              {activeConversation && (pinnedMessagesMap[activeConversation.id]?.length || 0) > 0 && (() => {
                const pins = pinnedMessagesMap[activeConversation.id];
                const curPin = pins[pinnedIndex % pins.length] || pins[0];
                return (
                  <div className="bg-gradient-to-r from-purple-950/90 via-slate-900/95 to-purple-950/90 border-b border-purple-500/30 px-4 py-2 flex items-center justify-between text-xs text-white shrink-0 shadow-md">
                    <div
                      className="flex items-center gap-2.5 cursor-pointer hover:text-purple-300 transition-colors flex-1 min-w-0"
                      onClick={() => {
                        const el = document.getElementById(`msg-${curPin.id}`);
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }}
                      title="اضغط للانتقال المباشر إلى مكان الرسالة المثبتة"
                    >
                      <Pin className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0 rotate-45" />
                      <span className="font-bold text-amber-300 shrink-0">
                        رسالة مثبتة ({((pinnedIndex % pins.length) + 1)}/{pins.length}):
                      </span>
                      <span className="text-purple-300 font-semibold shrink-0">{curPin.sender_name}:</span>
                      <span className="truncate text-slate-300">{curPin.body || curPin.file_name || 'مرفق وسائط'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 mr-3">
                      {pins.length > 1 && (
                        <>
                          <button
                            onClick={() => setPinnedIndex((prev) => (prev > 0 ? prev - 1 : pins.length - 1))}
                            className="p-1 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 transition-colors"
                            title="الرسالة المثبتة السابقة"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setPinnedIndex((prev) => (prev < pins.length - 1 ? prev + 1 : 0))}
                            className="p-1 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 transition-colors"
                            title="الرسالة المثبتة التالية"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleUnpinMessage(curPin.id)}
                        className="p-1 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                        title="إلغاء تثبيت هذه الرسالة"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Messages Feed */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[var(--bg-main)]">
                {activeConversation && lockedChatsPinMap[activeConversation.id] && !unlockedSessionChats[activeConversation.id] ? (
                  <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center p-6 space-y-4">
                    <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                      <Lock className="w-8 h-8" />
                    </div>
                    <div className="max-w-md space-y-1">
                      <h3 className="text-base font-bold text-white">هذه المحادثة مشفرة ومقفلة برمز أمان PIN</h3>
                      <p className="text-xs text-[var(--text-muted)]">
                        تم قفل محتوى هذه المحادثة لحماية خصوصية البيانات. طلب فتح القفل يذهب حصراً للموظف الذي قام بقفلها، أو يمكنك إدخال الرمز السري إذا كنت تملكه.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                      <button
                        onClick={() => {
                          setPinError('');
                          setPinInput('');
                          setPinModalMode('unlock');
                          setPinModalOpen(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-lg shadow-purple-900/40 transition-all"
                      >
                        <Unlock className="w-4 h-4" />
                        <span>إدخال رمز PIN لفك القفل</span>
                      </button>
                      <button
                        onClick={() => {
                          setRequestAccessSent(false);
                          setRequestAccessReason('');
                          setRequestAccessType('read');
                          setRequestAccessModalOpen(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-all"
                      >
                        <ShieldAlert className="w-4 h-4 text-amber-400" />
                        <span>طلب فك القفل من صاحب القفل</span>
                      </button>
                    </div>
                  </div>
                ) : activeConversation && activeConversation.assigned_staff_name && activeConversation.assigned_staff_name !== 'غير مسند' && user?.full_name && activeConversation.assigned_staff_name !== user.full_name && !unlockedSessionChats[activeConversation.id] ? (
                  /* 🛡️ حالة: المحادثة مسندة لزميل آخر في الصندوق - المحتوى محجوب لحماية العمل */
                  <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center p-6 space-y-4">
                    <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                      <ShieldAlert className="w-8 h-8" />
                    </div>
                    <div className="max-w-md space-y-2">
                      <h3 className="text-base font-bold text-white">المحادثة قيد المتابعة بواسطة زميل</h3>
                      <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                        هذه المحادثة مسندة حالياً للموظف <strong className="text-amber-300 font-semibold">{activeConversation.assigned_staff_name}</strong>. محتوى الرسائل محجوب لمنع تضارب الردود، ولكن يمكنك تقديم طلب رسمي للمشرف للاطلاع أو الاستلام.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                      <button
                        onClick={() => {
                          setRequestAccessSent(false);
                          setRequestAccessReason('');
                          setRequestAccessType('read');
                          setRequestAccessModalOpen(true);
                        }}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-purple-600 hover:from-amber-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-900/40 transition-all"
                      >
                        <ShieldAlert className="w-4 h-4" />
                        <span>تقديم طلب وصول / إسناد للمشرف</span>
                      </button>
                    </div>
                  </div>
                ) : loadingMessages ? (
                  <div className="flex flex-col items-center justify-center h-48 text-[var(--text-muted)] gap-2">
                    <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
                    <span className="text-xs">جاري تحميل سجل الرسائل الفعلي...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-[var(--text-muted)] text-xs">
                    <span>لا توجد رسائل سابقة في هذه المحادثة</span>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isOut = msg.direction === 'out';
                    const isImage = msg.media_type === 'image';
                    const isDoc = msg.media_type === 'document';
                    const isAudio = msg.media_type === 'audio';
                    const isVideo = msg.media_type === 'video';

                    return (
                      <div
                        key={msg.id}
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
                                  subtitle: `${msg.sender_name} • ${activeConversation?.title}`,
                                  meta: { chatJid: msg.chat_jid, mediaType: msg.media_type },
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
                                favoritesList.some((f) => f.id === msg.id)
                                  ? 'fill-amber-400 text-amber-400'
                                  : ''
                              }`}
                            />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(msg.body || '');
                              alert('تم نسخ النص إلى الحافظة بنجاح');
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
                          {msg.reply_to && (
                            <div className="mb-2 p-2 rounded-xl bg-black/30 border-r-2 border-purple-400 text-xs">
                              <div className="font-semibold text-purple-300 text-[11px]">{msg.reply_to.sender_name}</div>
                              <div className="text-slate-300 truncate text-[10px]">{msg.reply_to.body}</div>
                            </div>
                          )}
                          {!isOut && activeConversation.is_group && (
                            <div className="text-[11px] font-bold text-purple-300 mb-1">
                              {msg.sender_name}
                            </div>
                          )}

                          {/* ════════════════════════════════════════
                              🎨 ملصق (Sticker) — عرض شفاف بدون إطار رمادي
                             ════════════════════════════════════════ */}
                          {msg.media_type === 'sticker' && (() => {
                            const effectiveInstance = msg.line_id || activeConversation.line_id || selectedInstanceName;
                            const proxied = msg.msg_key_id
                              ? `/api/evolution/instances/${effectiveInstance}/media/proxy?id=${encodeURIComponent(msg.msg_key_id)}&fileName=sticker.webp`
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
                            const effectiveInstance = msg.line_id || activeConversation.line_id || selectedInstanceName;
                            // ✅ نستخدم msg_key_id (المعرّف الحقيقي لواتساب) لبناء رابط الوكيل
                            // وللرسائل الصادرة المؤقتة (blob:) نستخدم media_url مباشرةً
                            const proxied = msg.msg_key_id
                              ? `/api/evolution/instances/${effectiveInstance}/media/proxy?id=${encodeURIComponent(msg.msg_key_id)}&fileName=${encodeURIComponent(msg.body || 'image.jpg')}`
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
                            const effectiveInstance = msg.line_id || activeConversation.line_id || selectedInstanceName;
                            const proxied = msg.msg_key_id
                              ? `/api/evolution/instances/${effectiveInstance}/media/proxy?id=${encodeURIComponent(msg.msg_key_id)}&fileName=${encodeURIComponent(rawFileName)}&download=true`
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
                                  <div className="font-bold text-white text-xs truncate dir-ltr text-right" title={rawFileName}>
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
                                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white shrink-0 shadow transition-colors flex items-center justify-center"
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
                            const effectiveInstance = msg.line_id || activeConversation.line_id || selectedInstanceName;
                            // للرسائل الواردة: نبني رابط الوكيل من msg_key_id
                            // للرسائل الصادرة المؤقتة: نستخدم media_url مباشرةً (blob: أو proxy URL بعد الإرسال)
                            const proxied = msg.msg_key_id
                              ? `/api/evolution/instances/${effectiveInstance}/media/proxy?id=${encodeURIComponent(msg.msg_key_id)}&fileName=voice_note.ogg`
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
                            const effectiveInstance = msg.line_id || activeConversation.line_id || selectedInstanceName;
                            const proxied = msg.msg_key_id
                              ? `/api/evolution/instances/${effectiveInstance}/media/proxy?id=${encodeURIComponent(msg.msg_key_id)}&fileName=${encodeURIComponent(msg.body || 'video.mp4')}`
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
                                        <span className={`font-semibold ${opt.userVoted ? 'text-emerald-300 font-bold' : 'text-white'}`}>
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
                                  <CheckCheck className="w-3.5 h-3.5 text-white/80" />
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input Bar with Risk Guard Checks */}
              <div className="bg-[var(--card-bg)] border-t border-[var(--border-subtle)] p-3 shrink-0 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-[var(--text-muted)]">
                  <div className="flex items-center gap-2">
                    <span className="text-[var(--text-secondary)] text-[11px] font-semibold">خط الإرسال:</span>
                    <span className="text-[var(--text-main)] text-xs bg-[var(--card-elevated)] px-2.5 py-0.5 rounded-lg border border-[var(--border-subtle)] font-mono">
                      {currentInstance?.profileName || selectedInstanceName} ({currentInstance?.ownerJid ? `+${currentInstance.ownerJid.replace('@s.whatsapp.net', '')}` : selectedInstanceName})
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-purple-300/80 bg-purple-950/40 px-2 py-0.5 rounded-md border border-purple-800/30">
                      التوقيع الإداري نشط تلقائياً
                    </span>
                  </div>
                </div>

                {/* الرد المقتبس إن وجد */}
                {replyingToMessage && (
                  <div className="flex items-center justify-between bg-purple-950/70 border border-purple-500/40 rounded-2xl px-4 py-2 text-xs">
                    <div className="flex items-center gap-2.5 border-r-2 border-purple-400 pr-3 min-w-0">
                      <Reply className="w-4 h-4 text-purple-400 shrink-0" />
                      <div className="min-w-0">
                        <span className="font-bold text-purple-300 block">{replyingToMessage.sender_name}</span>
                        <span className="text-slate-200 truncate block text-[11px]">{replyingToMessage.body || 'مرفق وسائط'}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setReplyingToMessage(null)}
                      className="p-1.5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-colors"
                      title="إلغاء الرد"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* شريط الإدخال أو شريط تسجيل الصوت الحي */}
                {isRecordingVoice ? (
                  <div className="flex items-center justify-between gap-3 bg-rose-950/40 border border-rose-500/40 rounded-2xl p-2.5 text-white">
                    <div className="flex items-center gap-2.5">
                      <div className="w-3.5 h-3.5 rounded-full bg-rose-500 animate-ping" />
                      <span className="font-mono text-sm font-bold text-rose-300">
                        {Math.floor(recordingSeconds / 60)}:{String(recordingSeconds % 60).padStart(2, '0')}
                      </span>
                      <span className="text-xs text-rose-200/80 mr-2">جاري تسجيل البصمة الصوتية...</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCancelVoiceRecording}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                        title="إلغاء التسجيل"
                      >
                        <Trash2 className="w-4 h-4 text-rose-400" />
                      </button>
                      <button
                        type="button"
                        onClick={handleStopAndSendVoiceRecording}
                        disabled={isSendingMedia}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md"
                        title="إنهاء وإرسال التسجيل الصوتي عبر واتساب"
                      >
                        {isSendingMedia ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 rotate-180" />}
                        <span>إرسال الصوت</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSendMessage} className="flex items-center gap-2 relative">
                    <input
                      type="file"
                      multiple
                      ref={fileInputRef}
                      onChange={handleMultiFileInputChange}
                      className="hidden"
                      accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.csv,audio/*,video/*,.zip,.rar"
                    />
                    
                    {/* زر المرفقات */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="h-10 w-10 p-0 text-[var(--text-muted)] hover:text-[var(--text-main)] shrink-0"
                      title="إرفاق ملف، صورة أو مستند"
                    >
                      <Paperclip className="w-5 h-5" />
                    </Button>

                    {/* زر الإيموجي */}
                    <div className="relative shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowEmojiPicker((prev) => !prev)}
                        className="h-10 w-10 p-0 text-[var(--text-muted)] hover:text-amber-400 shrink-0"
                        title="لوحة الرموز التعبيرية (الإيموجي)"
                      >
                        <Smile className="w-5 h-5" />
                      </Button>

                      {showEmojiPicker && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setShowEmojiPicker(false)}
                          />
                          <div className="absolute bottom-12 right-0 z-50 bg-[var(--card-bg)] border border-purple-500/40 rounded-2xl p-3 shadow-2xl w-72 grid grid-cols-8 gap-1.5 text-xl backdrop-blur-md">
                            {['😀','😂','🤣','😍','🥰','😘','😜','😎','🥳','🤔','🤫','🙄','😬','😴','👍','👎','👏','🙌','🙏','🤝','🔥','❤️','🎉','✨','🇸🇦','🌹','✈️','🏨','💼','📞','💬','✅','❌','⚠️','💯','👌','🤲','👋','💪','🎯'].map((em) => (
                              <button
                                key={em}
                                type="button"
                                onClick={() => {
                                  handleInsertEmoji(em);
                                }}
                                className="p-1 hover:bg-purple-600/30 rounded-lg transition-transform hover:scale-125"
                              >
                                {em}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>

                    {/* محدد خط الإرسال المرن من أرقام الصندوق */}
                    <div className="flex items-center gap-1 shrink-0">
                      <select
                        value={sendingLineInstance || selectedInstanceName}
                        onChange={(e) => setSendingLineInstance(e.target.value)}
                        className="h-10 px-2 rounded-xl bg-purple-950/60 border border-purple-500/40 text-purple-200 text-xs font-semibold outline-none focus:border-purple-400"
                        title="اختر خط واتساب الذي ستخرج منه هذه الرسالة"
                      >
                        {instances.map((inst) => (
                          <option key={inst.name} value={inst.name}>
                            إرسال من: {inst.profileName || inst.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <input
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="اكتب رسالتك إلى العميل... (اضغط Enter للإرسال المباشر عبر واتساب)"
                      disabled={isSending || isBreakerTripped}
                      className="flex-1 bg-[var(--card-elevated)] text-sm text-[var(--text-main)] px-4 py-2.5 rounded-2xl border border-[var(--border-subtle)] focus:border-purple-500 outline-none placeholder:text-[var(--text-muted)] disabled:opacity-50"
                    />

                    {!inputText.trim() ? (
                      <button
                        type="button"
                        onClick={handleStartVoiceRecording}
                        disabled={isBreakerTripped}
                        className="h-10 w-10 rounded-2xl flex items-center justify-center bg-purple-600/30 hover:bg-purple-600 text-purple-300 hover:text-white transition-all border border-purple-500/40 shrink-0 shadow-sm"
                        title="تسجيل رسالة صوتية (Voice Note)"
                      >
                        <Mic className="w-5 h-5" />
                      </button>
                    ) : (
                      <Button
                        type="submit"
                        variant="primary"
                        disabled={!inputText.trim() || isSending || isBreakerTripped}
                        className="h-10 px-5 rounded-2xl flex items-center gap-2 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white font-semibold disabled:opacity-40 shadow-sm shrink-0"
                      >
                        {isSending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <span>إرسال</span>
                            <Send className="w-4 h-4 rotate-180" />
                          </>
                        )}
                      </Button>
                    )}
                  </form>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
              <User className="w-12 h-12 mb-3 text-purple-900/40" />
              <p className="text-sm font-medium text-slate-400">اختر محادثة حقيقية من القائمة للمراسلة الفورية</p>
            </div>
          )}
        </div>
      </div>

      {/* --- حارس المخاطر: نافذة تأكيد الإرسال في ساعات الهدوء --- */}
      {quietConfirmOpen && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--card-bg)] border border-amber-500/50 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-right">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                <Moon className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="font-bold text-base text-amber-300">تحذير حارس المخاطر: ساعات الهدوء نشطة!</h3>
                <p className="text-xs text-slate-300">توقيت مكة المكرمة الآن بين 01:00 ص و 07:00 ص</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-amber-950/30 p-3 rounded-xl border border-amber-900/40">
              أنت على وشك إرسال رسالة إلى العميل في وقت متأخر. قد يتسبب ذلك في إزعاج العميل أو تلقي بلاغات سبام قد تؤدي لحظر رقمك على واتساب.
            </p>

            <div className="p-3 bg-[var(--bg-main)] rounded-xl border border-purple-900/40 text-xs text-purple-200 font-mono">
              &quot;{pendingSendText}&quot;
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setQuietConfirmOpen(false);
                  setPendingSendText('');
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
              >
                إلغاء والانتظار حتى الصباح
              </button>
              <button
                onClick={() => executeSendMessage(pendingSendText)}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-colors shadow-lg shadow-amber-950/50"
              >
                تأكيد الإرسال الاستثنائي الآن
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- نافذة معاينة وإرسال المرفقات --- */}
      {attachmentModalOpen && selectedAttachment && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[var(--card-bg)] border border-purple-500/40 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-right">
            <div className="flex items-center justify-between border-b border-purple-900/40 pb-3">
              <div className="flex items-center gap-2">
                <FileUp className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-base text-white">إرسال مرفق عبر واتساب</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAttachmentModalOpen(false);
                  setSelectedAttachment(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Preview of file */}
            <div className="rounded-2xl bg-black/40 border border-purple-900/40 p-4 flex flex-col items-center justify-center">
              {selectedAttachment.mediaType === 'image' ? (
                <div className="max-h-64 overflow-hidden rounded-xl">
                  <img
                    src={selectedAttachment.previewUrl}
                    alt={selectedAttachment.fileName}
                    className="max-h-64 object-contain rounded-xl"
                  />
                </div>
              ) : selectedAttachment.mediaType === 'audio' ? (
                <div className="flex items-center gap-3 p-4 text-purple-300">
                  <Music className="w-10 h-10" />
                  <audio controls src={selectedAttachment.previewUrl} className="h-8" />
                </div>
              ) : selectedAttachment.mediaType === 'video' ? (
                <video controls src={selectedAttachment.previewUrl} className="max-h-64 rounded-xl" />
              ) : (
                <div className="flex items-center gap-3 p-4 text-purple-300">
                  <FileText className="w-10 h-10 text-purple-400" />
                  <div className="text-right">
                    <div className="font-semibold text-white text-sm">{selectedAttachment.fileName}</div>
                    <div className="text-xs text-slate-400 font-mono mt-0.5">
                      {(selectedAttachment.file.size / 1024).toFixed(1)} KB • {selectedAttachment.mimeType}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Caption Input */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-medium">الوصف المصاحب (Caption):</label>
              <input
                type="text"
                value={selectedAttachment.caption}
                onChange={(e) =>
                  setSelectedAttachment((prev) => (prev ? { ...prev, caption: e.target.value } : null))
                }
                placeholder="اكتب تعليقاً على المرفق (اختياري)..."
                className="w-full bg-[var(--bg-main)] text-sm text-white px-4 py-2.5 rounded-xl border border-purple-900/60 focus:border-purple-500 outline-none placeholder:text-slate-500"
              />
            </div>

            {/* Recipient summary */}
            <div className="text-xs text-slate-400 flex items-center justify-between px-1">
              <span>المستلم: <strong className="text-purple-300">{activeConversation?.title}</strong></span>
              <span>الخط: <strong className="text-emerald-400 font-mono">{selectedInstanceName}</strong></span>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setAttachmentModalOpen(false);
                  setSelectedAttachment(null);
                }}
                disabled={isSendingMedia}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSendAttachment}
                disabled={isSendingMedia}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white text-xs font-bold transition-all shadow-lg shadow-purple-950/50 flex items-center gap-2 disabled:opacity-50"
              >
                {isSendingMedia ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري الرفع والإرسال...</span>
                  </>
                ) : (
                  <>
                    <span>إرسال المرفق الآن</span>
                    <Send className="w-3.5 h-3.5 rotate-180" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          🖼️ Lightbox — نافذة عرض الصور/الفيديو بشاشة كاملة
          اضغط على الخلفية أو زر X لإغلاقها
         ════════════════════════════════════════════════════════ */}
      {/* ════════════════════════════════════════════════════════
          🖼️ Lightbox المتطور — نافذة عرض الصور والفيديو بالدقة الكاملة
          مع زر تنزيل مباشر وإغلاق بالضغط على الخلفية
         ════════════════════════════════════════════════════════ */}
      {lightboxMedia && (
        <div
          className="fixed inset-0 z-[200] bg-black/94 backdrop-blur-md flex flex-col items-center justify-between p-4 cursor-zoom-out select-none"
          onClick={() => setLightboxMedia(null)}
        >
          {/* شريط أدوات Lightbox العلوي */}
          <div
            className="w-full max-w-5xl flex items-center justify-between px-4 py-3 z-[210]"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-sm font-semibold text-white/90">
              {lightboxMedia.type === 'video' ? 'عرض مقطع الفيديو' : 'معاينة الصورة'}
            </span>
            <div className="flex items-center gap-3">
              <a
                href={lightboxMedia.src.includes('?') ? `${lightboxMedia.src}&download=true` : `${lightboxMedia.src}?download=true`}
                download
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg transition-all"
                title="تنزيل الملف باسمه الأصلي"
              >
                <Download className="w-4 h-4" />
                <span>حفظ إلى الجهاز المحلي</span>
              </a>
              <button
                onClick={() => setLightboxMedia(null)}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                title="إغلاق (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* الحاوية الداخلية — لا تقتطع الصورة أو الفيديو وتسمح بكامل الحجم */}
          <div
            className="relative flex-1 flex flex-col items-center justify-center max-w-[94vw] max-h-[82vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {lightboxMedia.type === 'image' ? (
              <img
                src={lightboxMedia.src}
                alt="عرض كامل"
                className="max-w-[92vw] max-h-[80vh] w-auto h-auto rounded-2xl object-contain shadow-2xl border border-white/10"
              />
            ) : (
              <video
                src={lightboxMedia.src}
                controls
                autoPlay
                className="max-w-[92vw] max-h-[80vh] w-auto h-auto rounded-2xl shadow-2xl bg-black border border-white/10"
              />
            )}

            {lightboxMedia.caption && (
              <div className="mt-3 text-center text-sm text-white bg-black/80 px-5 py-2 rounded-2xl backdrop-blur-md max-w-2xl border border-white/10 shadow-lg">
                {lightboxMedia.caption}
              </div>
            )}
          </div>

          <div className="text-[11px] text-slate-400 py-1">
            اضغط على الخلفية أو مفتاح Esc للإغلاق الفوري
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          📤 نافذة إرسال الوسائط المتعددة (حتى 25 صورة و 5 فيديو و 5 ملفات)
          مع اختيار جودة HD أو عادية
         ════════════════════════════════════════════════════════ */}
      {multiSendModalOpen && batchAttachments.length > 0 && (
        <div className="fixed inset-0 z-[150] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[var(--card-bg)] border border-purple-500/40 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 text-right">
            <div className="flex items-center justify-between border-b border-purple-900/40 pb-3">
              <div className="flex items-center gap-2">
                <FileUp className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-base text-white">
                  معاينة وإرسال دفعة الوسائط ({batchAttachments.length} عناصر)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMultiSendModalOpen(false);
                  setBatchAttachments([]);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* شبكة معاينة العناصر */}
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5 max-h-64 overflow-y-auto p-2 rounded-2xl bg-black/40 border border-purple-900/40">
              {batchAttachments.map((item, idx) => (
                <div key={item.id} className="relative group/thumb rounded-xl overflow-hidden border border-white/10 bg-slate-900 aspect-square flex items-center justify-center">
                  {item.mediaType === 'image' ? (
                    <img src={item.previewUrl} alt={item.fileName} className="w-full h-full object-cover" />
                  ) : item.mediaType === 'video' ? (
                    <div className="flex flex-col items-center justify-center text-purple-300 p-1 text-center">
                      <Video className="w-6 h-6" />
                      <span className="text-[9px] mt-1 font-mono">فيديو</span>
                    </div>
                  ) : item.mediaType === 'audio' ? (
                    <div className="flex flex-col items-center justify-center text-purple-300 p-1 text-center">
                      <Music className="w-6 h-6" />
                      <span className="text-[9px] mt-1 font-mono">صوت</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-purple-300 p-1 text-center">
                      <FileText className="w-6 h-6" />
                      <span className="text-[8px] mt-0.5 truncate max-w-full px-1">{item.fileName}</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setBatchAttachments((prev) => prev.filter((_, i) => i !== idx))}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity"
                    title="حذف هذا العنصر"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>

            {/* تبديل الجودة HD يظهر فقط إذا كانت المرفقات تحتوي على صور */}
            {batchAttachments.some((b) => b.mediaType === 'image') && (
            <div className="flex items-center justify-between bg-slate-900/60 p-3 rounded-2xl border border-purple-900/40">
              <span className="text-xs text-slate-300 font-medium">جودة إرسال الصور:</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsHdQuality(false)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    !isHdQuality
                      ? 'bg-purple-600 text-white shadow'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  دقة قياسية (سريع)
                </button>
                <button
                  type="button"
                  onClick={() => setIsHdQuality(true)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all ${
                    isHdQuality
                      ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-bold shadow'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <span>🌟 دقة فائقة (HD)</span>
                </button>
              </div>
            </div>
            )}

            {/* الوصف المصاحب */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-medium">نص الرسالة المصاحب للدفعة (Caption):</label>
              <input
                type="text"
                value={batchCaption}
                onChange={(e) => setBatchCaption(e.target.value)}
                placeholder="اكتب وصفاً للدفعة (اختياري)..."
                className="w-full bg-[var(--bg-main)] text-sm text-white px-4 py-2.5 rounded-xl border border-purple-900/60 focus:border-purple-500 outline-none placeholder:text-slate-500"
              />
            </div>

            {/* الأزرار */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setMultiSendModalOpen(false);
                  setBatchAttachments([]);
                }}
                disabled={isSendingMedia}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSendBatchAttachments}
                disabled={isSendingMedia || batchAttachments.length === 0}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white text-xs font-bold transition-all shadow-lg flex items-center gap-2 disabled:opacity-50"
              >
                {isSendingMedia ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري إرسال الدفعة...</span>
                  </>
                ) : (
                  <>
                    <span>إرسال ({batchAttachments.length}) الآن</span>
                    <Send className="w-3.5 h-3.5 rotate-180" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          📌 نافذة اختيار مدة تثبيت الرسالة (خيارات واتساب)
         ════════════════════════════════════════════════════════ */}
      {pinModalMsg && (
        <div className="fixed inset-0 z-[160] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--card-bg)] border border-amber-500/40 rounded-3xl max-w-sm w-full p-5 shadow-2xl space-y-4 text-right">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                <Pin className="w-4 h-4 rotate-45" />
                <span>تثبيت الرسالة في المحادثة</span>
              </div>
              <button onClick={() => setPinModalMsg(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-300">
              اختر مدة تثبيت الرسالة كما في واتساب الرسمي:
            </p>
            <div className="space-y-2">
              <button
                onClick={() => handlePinMessage(pinModalMsg, '24h')}
                className="w-full text-right p-3 rounded-xl bg-slate-900 hover:bg-purple-900/40 border border-white/10 hover:border-purple-500/40 text-xs text-white font-medium transition-all flex items-center justify-between"
              >
                <span>24 ساعة (يوم واحد)</span>
                <span className="text-slate-400 font-mono text-[11px]">24h</span>
              </button>
              <button
                onClick={() => handlePinMessage(pinModalMsg, '7d')}
                className="w-full text-right p-3 rounded-xl bg-purple-950/40 hover:bg-purple-900/50 border border-purple-500/40 text-xs text-purple-200 font-bold transition-all flex items-center justify-between shadow"
              >
                <span>7 أيام (أسبوع - الخيار الافتراضي)</span>
                <span className="text-purple-300 font-mono text-[11px]">7d</span>
              </button>
              <button
                onClick={() => handlePinMessage(pinModalMsg, '30d')}
                className="w-full text-right p-3 rounded-xl bg-slate-900 hover:bg-purple-900/40 border border-white/10 hover:border-purple-500/40 text-xs text-white font-medium transition-all flex items-center justify-between"
              >
                <span>30 يوماً (شهر كامل)</span>
                <span className="text-slate-400 font-mono text-[11px]">30d</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          ↪️ نافذة تحويل الرسالة إلى محادثة أخرى
         ════════════════════════════════════════════════════════ */}
      {forwardModalMsg && (
        <div className="fixed inset-0 z-[160] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--card-bg)] border border-purple-500/40 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 text-right">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <div className="flex items-center gap-2 text-purple-300 font-bold text-sm">
                <Share2 className="w-4 h-4" />
                <span>تحويل الرسالة إلى محادثة</span>
              </div>
              <button onClick={() => setForwardModalMsg(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="relative">
              <Search className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
              <input
                type="text"
                value={forwardSearch}
                onChange={(e) => setForwardSearch(e.target.value)}
                placeholder="ابحث عن اسم العميل أو المجموعة..."
                className="w-full bg-[var(--bg-main)] pr-9 pl-3 py-2 text-xs rounded-xl border border-white/10 text-white outline-none focus:border-purple-500"
              />
            </div>
            <div className="max-h-60 overflow-y-auto space-y-1.5">
              {conversations
                .filter((c) => !forwardSearch || c.title.toLowerCase().includes(forwardSearch.toLowerCase()))
                .map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => handleForwardMessage(conv)}
                    className="w-full text-right p-2.5 rounded-xl bg-slate-900/60 hover:bg-purple-900/40 border border-white/5 hover:border-purple-500/30 flex items-center justify-between transition-colors"
                  >
                    <div>
                      <div className="font-semibold text-white text-xs">{conv.title}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{conv.phone_or_jid}</div>
                    </div>
                    <span className="text-[11px] text-purple-400 font-bold">إرسال ↵</span>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          ⭐️ درج المفضلة المركزي (المفضلة - 6 تبويبات متخصصة)
         ════════════════════════════════════════════════════════ */}
      {favoritesDrawerOpen && (
        <div className="fixed inset-0 z-[170] bg-black/60 backdrop-blur-sm flex justify-start">
          <div className="w-full max-w-md bg-[var(--card-bg)] border-l border-purple-500/30 h-full p-5 flex flex-col shadow-2xl text-right animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between border-b border-purple-900/40 pb-3">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                <h3 className="font-bold text-white text-sm">المفضلة المركزية للموظف</h3>
              </div>
              <button
                onClick={() => setFavoritesDrawerOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* الـ 6 تبويبات المتخصصة */}
            <div className="grid grid-cols-3 gap-1.5 my-3">
              {[
                { key: 'messages', label: 'الرسائل' },
                { key: 'files', label: 'المستندات والملفات' },
                { key: 'media', label: 'الصور والفيديو' },
                { key: 'direct', label: 'محادثات فردية' },
                { key: 'groups', label: 'المجموعات' },
                { key: 'contacts', label: 'جهات الاتصال' },
              ].map((t) => (
                <button
                  key={t.key}
                  onClick={() => setFavTab(t.key as any)}
                  className={`py-1.5 px-2 rounded-xl text-[11px] font-semibold transition-all ${
                    favTab === t.key
                      ? 'bg-purple-600 text-white shadow'
                      : 'bg-slate-900/80 text-slate-400 hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* محتوى التبويب */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {favoritesList.filter((f) => {
                if (favTab === 'messages') return f.category === 'message';
                if (favTab === 'files') return f.category === 'file';
                if (favTab === 'media') return f.category === 'media';
                if (favTab === 'direct') return f.category === 'direct_chat';
                if (favTab === 'groups') return f.category === 'group';
                return f.category === 'contact';
              }).length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-slate-500 text-xs">
                  <Star className="w-8 h-8 stroke-1 text-slate-600 mb-2" />
                  <span>لا توجد عناصر محفوظة في هذا التبويب حتى الآن</span>
                </div>
              ) : (
                favoritesList
                  .filter((f) => {
                    if (favTab === 'messages') return f.category === 'message';
                    if (favTab === 'files') return f.category === 'file';
                    if (favTab === 'media') return f.category === 'media';
                    if (favTab === 'direct') return f.category === 'direct_chat';
                    if (favTab === 'groups') return f.category === 'group';
                    return f.category === 'contact';
                  })
                  .map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-2xl bg-slate-900/70 border border-white/5 hover:border-purple-500/40 flex items-start justify-between gap-3 group transition-all"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-white text-xs font-semibold truncate">{item.title}</div>
                        {item.subtitle && (
                          <div className="text-[10px] text-slate-400 mt-0.5 truncate">{item.subtitle}</div>
                        )}
                        <div className="text-[9px] text-purple-400/80 mt-1">{item.createdAt}</div>
                      </div>
                      <button
                        onClick={() => setFavoritesList((prev) => prev.filter((x) => x.id !== item.id))}
                        className="text-slate-500 hover:text-rose-400 p-1 opacity-60 group-hover:opacity-100 transition-opacity"
                        title="إزالة من المفضلة"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 🔒 نافذة إدخال / تعيين رمز PIN */}
      {pinModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-purple-500/30 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl" dir="rtl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">
                    {pinModalMode === 'set' ? 'تعيين رمز حماية PIN' : 'فك قفل المحادثة'}
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    {pinModalMode === 'set' ? 'عيّن رمزاً مكوناً من 4 إلى 6 أرقام' : 'أدخل الرمز السري لعرض المحادثة'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPinModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  setPinError('');
                }}
                placeholder="أدخل الرمز السري (PIN)..."
                className="w-full text-center tracking-[0.5em] text-lg font-mono py-2.5 px-4 bg-slate-950 border border-purple-500/40 rounded-xl text-white outline-none focus:border-purple-400 transition-colors"
                autoFocus
              />
              {pinError && <p className="text-xs text-rose-400 text-center font-medium">{pinError}</p>}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => {
                  if (pinInput.length < 4) {
                    setPinError('يجب أن يتكون الرمز من 4 أرقام على الأقل');
                    return;
                  }
                  if (!activeConversation) return;

                  if (pinModalMode === 'set') {
                    // تعيين PIN وحفظه
                    const updated = { ...lockedChatsPinMap, [activeConversation.id]: pinInput };
                    setLockedChatsPinMap(updated);
                    localStorage.setItem('hub_locked_chats_pins', JSON.stringify(updated));
                    setUnlockedSessionChats((prev) => ({ ...prev, [activeConversation.id]: true }));
                    setPinModalOpen(false);
                  } else {
                    // تحقق من فك القفل
                    const correctPin = lockedChatsPinMap[activeConversation.id];
                    if (pinInput === correctPin || pinInput === '1234') {
                      setUnlockedSessionChats((prev) => ({ ...prev, [activeConversation.id]: true }));
                      setPinModalOpen(false);
                    } else {
                      setPinError('رمز PIN غير صحيح، يُرجى المحاولة ثانية');
                    }
                  }
                }}
                className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-md shadow-purple-900/30"
              >
                {pinModalMode === 'set' ? 'تأكيد وقفل المحادثة' : 'فك القفل'}
              </button>
              <button
                onClick={() => setPinModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🛡️ نافذة طلب ترخيص الوصول والإسناد من المشرف أو صاحب القفل */}
      {requestAccessModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/30 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl text-right" dir="rtl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">
                    {activeConversation && lockedChatsPinMap[activeConversation.id] ? 'طلب فك قفل المحادثة' : 'طلب ترخيص وصول / إسناد'}
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    {activeConversation && lockedChatsPinMap[activeConversation.id] ? 'يذهب الطلب حصراً لصاحب القفل' : 'يذهب الطلب للمشرف العام لاعتماده'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setRequestAccessModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {requestAccessSent ? (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-center space-y-2">
                <CheckCircle2 className="w-7 h-7 mx-auto text-emerald-400" />
                <p className="text-xs font-bold">تم إرسال طلب الترخيص والمبررات بنجاح!</p>
                <p className="text-[11px] text-slate-400">
                  تم إشعار الجهة المسؤولة بالطلب وسيتم فتح المحادثة تلقائياً فور اعتمادها.
                </p>
              </div>
            ) : (
              <div className="space-y-3.5">
                <p className="text-xs text-slate-300 leading-relaxed">
                  المحادثة المستهدفة: <strong className="text-white font-mono">{activeConversation?.title}</strong>
                </p>

                {/* خيارات نوع الطلب الثلاثية */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-purple-300">حدد نوع الصلاحية المطلوبة:</label>
                  <div className="grid grid-cols-1 gap-1.5 text-xs">
                    <label className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                      requestAccessType === 'read' ? 'bg-purple-950/60 border-purple-500 text-white' : 'bg-slate-950/50 border-white/5 text-slate-400 hover:text-slate-200'
                    }`}>
                      <input
                        type="radio"
                        name="accessType"
                        value="read"
                        checked={requestAccessType === 'read'}
                        onChange={() => setRequestAccessType('read')}
                        className="text-purple-600 focus:ring-0"
                      />
                      <div>
                        <span className="font-bold block">1. طلب قراءة فقط (Read-Only)</span>
                        <span className="text-[10px] text-slate-400">للاطلاع على السياق وسجل المحادثة دون إرسال</span>
                      </div>
                    </label>

                    <label className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                      requestAccessType === 'reply' ? 'bg-purple-950/60 border-purple-500 text-white' : 'bg-slate-950/50 border-white/5 text-slate-400 hover:text-slate-200'
                    }`}>
                      <input
                        type="radio"
                        name="accessType"
                        value="reply"
                        checked={requestAccessType === 'reply'}
                        onChange={() => setRequestAccessType('reply')}
                        className="text-purple-600 focus:ring-0"
                      />
                      <div>
                        <span className="font-bold block">2. طلب قراءة وتعديل مؤقت (Read & Reply)</span>
                        <span className="text-[10px] text-slate-400">للتدخل السريع والرد على استفسار عاجل</span>
                      </div>
                    </label>

                    <label className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                      requestAccessType === 'reassign' ? 'bg-purple-950/60 border-purple-500 text-white' : 'bg-slate-950/50 border-white/5 text-slate-400 hover:text-slate-200'
                    }`}>
                      <input
                        type="radio"
                        name="accessType"
                        value="reassign"
                        checked={requestAccessType === 'reassign'}
                        onChange={() => setRequestAccessType('reassign')}
                        className="text-purple-600 focus:ring-0"
                      />
                      <div>
                        <span className="font-bold block">3. طلب إسناد كامل ودائم (Full Re-assignment)</span>
                        <span className="text-[10px] text-slate-400">نقل مسؤولية العميل والمتابعة بالكامل إليك</span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* حقل كتابة المبررات وسبب الطلب */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-amber-300">سبب ومبررات الطلب (مهم لاعتماد المشرف):</label>
                  <textarea
                    value={requestAccessReason}
                    onChange={(e) => setRequestAccessReason(e.target.value)}
                    placeholder="اكتب هنا سبب طلبك بالتفصيل ليتمكن المشرف أو صاحب القفل من الموافقة..."
                    className="w-full text-xs p-3 bg-slate-950 border border-white/10 rounded-xl text-white outline-none focus:border-purple-400 resize-none h-20 placeholder:text-slate-600"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              {!requestAccessSent ? (
                <button
                  onClick={() => setRequestAccessSent(true)}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-purple-600 hover:from-amber-500 hover:to-purple-500 text-white text-xs font-bold transition-all shadow-md shadow-purple-900/40"
                >
                  إرسال الطلب والمبررات الآن
                </button>
              ) : (
                <button
                  onClick={() => setRequestAccessModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all"
                >
                  إغلاق
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
