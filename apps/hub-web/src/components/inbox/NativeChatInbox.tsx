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
  StopCircle
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ConversationItem, ChatMessage, ConversationStatus } from '../../types';
import { Button } from '@tripyou/ui';
import { supabase } from '../../lib/supabase';

// ─────────────────────────────────────────────
// 🔧 مساعد: تحويل معرف الرسالة أو الرابط إلى رابط وكيل لفك التشفير
// ─────────────────────────────────────────────
function getProxiedUrl(mediaUrl: string | undefined, instanceName: string, messageId?: string): string | null {
  if (messageId) {
    return `/api/evolution/instances/${instanceName}/media/proxy?id=${encodeURIComponent(messageId)}`;
  }
  if (!mediaUrl) return null;
  if (mediaUrl.startsWith('data:')) return mediaUrl;
  return `/api/evolution/instances/${instanceName}/media/proxy?url=${encodeURIComponent(mediaUrl)}`;
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
    } else {
      audioRef.current.play().catch(() => {});
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const dur = audioRef.current.duration || 0;
    const cur = audioRef.current.currentTime;
    setCurrentTime(cur);
    setProgress(dur ? (cur / dur) * 100 : 0);
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) setDuration(audioRef.current.duration);
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setProgress(0);
    setCurrentTime(0);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    audioRef.current.currentTime = pct * (audioRef.current.duration || 0);
  };

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  return (
    <div
      className={`flex items-center gap-2.5 p-2.5 rounded-2xl min-w-[220px] max-w-[300px] ${
        isOut ? 'bg-purple-700/40' : 'bg-slate-800/60'
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
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors shadow ${
          isOut
            ? 'bg-purple-500 hover:bg-purple-400'
            : 'bg-purple-600 hover:bg-purple-500'
        }`}
      >
        {isPlaying ? (
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="4" width="4" height="16" />
            <rect x="14" y="4" width="4" height="16" />
          </svg>
        ) : (
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
            <polygon points="5,3 19,12 5,21" />
          </svg>
        )}
      </button>

      {/* الموجة الصوتية + شريط التقدم */}
      <div className="flex-1 flex flex-col gap-1 min-w-0">
        <div
          className="flex items-end gap-[2px] h-9 cursor-pointer"
          onClick={handleProgressClick}
          title="اضغط للانتقال"
        >
          {bars.map((h, i) => {
            const barPct = (i / bars.length) * 100;
            const isActive = barPct <= progress;
            return (
              <div
                key={i}
                className={`flex-1 rounded-full transition-colors ${
                  isActive
                    ? isOut
                      ? 'bg-purple-200'
                      : 'bg-purple-400'
                    : isOut
                    ? 'bg-purple-500/40'
                    : 'bg-slate-500/50'
                }`}
                style={{ height: `${h}%` }}
              />
            );
          })}
        </div>
        {/* الوقت */}
        <div className="flex justify-between text-[10px] text-slate-400 tabular-nums px-0.5">
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
  const [loadingInstances, setLoadingInstances] = useState<boolean>(true);

  // Conversations State (Real)
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loadingChats, setLoadingChats] = useState<boolean>(false);
  const [activeConvId, setActiveConvId] = useState<string>('');

  // Messages State (Real)
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(false);

  // UI & Input Controls
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterTab, setFilterTab] = useState<'all' | 'mine' | 'unread' | 'groups' | 'escalated'>('all');
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

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // حساب ساعات الهدوء بتوقيت مكة المكرمة (+3)
  const isQuietHoursActive = useMemo(() => {
    const now = new Date();
    // UTC + 3 hours for KSA
    const ksaHour = (now.getUTCHours() + 3) % 24;
    return ksaHour >= 1 && ksaHour < 7;
  }, []);

  // 1. Fetch connected instances from Evolution API
  const fetchInstances = useCallback(async () => {
    try {
      setLoadingInstances(true);
      const res = await fetch('/api/evolution/instances');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setInstances(data);
          const openInst = data.find((i: any) => i.connectionStatus === 'open');
          if (openInst) {
            setSelectedInstanceName(openInst.name);
          } else {
            setSelectedInstanceName(data[0].name);
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
            const cleanPhone = jid.replace('@s.whatsapp.net', '').replace('@g.us', '');
            const groupInfo = groupMap.get(jid);
            
            let title = '';
            if (isGroup) {
              title = groupInfo?.subject || c.subject || c.name || (cleanPhone ? `مجموعة (${cleanPhone.slice(-6)})` : 'مجموعة واتساب');
            } else {
              title = c.pushName || c.name || (cleanPhone ? `+${cleanPhone}` : 'محادثة جديدة');
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
          let text = '';
          let mediaType: any = 'text';
          let mediaUrl: string | undefined = undefined;

          if (m.message) {
            const msgObj = m.message;
            if (msgObj.conversation) {
              text = msgObj.conversation;
            } else if (msgObj.extendedTextMessage?.text) {
              text = msgObj.extendedTextMessage.text;
            } else if (msgObj.imageMessage) {
              mediaType = 'image';
              text = msgObj.imageMessage.caption || '';
              mediaUrl = `/api/evolution/instances/${instanceName}/media/proxy?id=${m.key?.id || m.id}`;
            } else if (msgObj.documentMessage) {
              mediaType = 'document';
              text = msgObj.documentMessage.fileName || msgObj.documentMessage.title || msgObj.documentMessage.caption || 'مستند';
              mediaUrl = `/api/evolution/instances/${instanceName}/media/proxy?id=${m.key?.id || m.id}`;
            } else if (msgObj.audioMessage) {
              mediaType = 'audio';
              text = '';
              mediaUrl = `/api/evolution/instances/${instanceName}/media/proxy?id=${m.key?.id || m.id}`;
            } else if (msgObj.videoMessage) {
              mediaType = 'video';
              text = msgObj.videoMessage.caption || '';
              mediaUrl = `/api/evolution/instances/${instanceName}/media/proxy?id=${m.key?.id || m.id}`;
            } else if (msgObj.reactionMessage) {
              text = msgObj.reactionMessage.text || '';
            } else if (msgObj.pollCreationMessage || msgObj.pollCreationMessageV2 || msgObj.pollCreationMessageV3) {
              mediaType = 'poll';
              const pollObj = msgObj.pollCreationMessage || msgObj.pollCreationMessageV2 || msgObj.pollCreationMessageV3;
              text = pollObj?.name || 'استطلاع رأي';
            } else if (msgObj.pollUpdateMessage) {
              mediaType = 'poll';
              text = 'استطلاع رأي تفاعلي';
            } else if (m.messageType) {
              text = m.messageType.includes('poll') ? 'استطلاع رأي' : '';
            }
          }

          let timeStr = '';
          if (m.messageTimestamp) {
            const date = new Date(m.messageTimestamp * 1000);
            timeStr = date.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
          }

          return {
            id: m.key?.id || m.id || `msg-${Math.random()}`,
            conversation_id: chatJid,
            chat_jid: chatJid,
            direction: fromMe ? 'out' : 'in',
            body: text || (mediaType !== 'text' ? '' : '(رسالة)'),
            media_type: mediaType,
            media_url: mediaUrl,
            sender_name: fromMe ? 'أنا' : (m.pushName || 'العميل'),
            status: fromMe ? (m.status === 'READ' ? 'read' : 'delivered') : 'delivered',
            line_id: instanceName,
            created_at: timeStr || 'الآن',
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

  // Filter conversations based on search and tabs
  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => {
      const matchSearch =
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone_or_jid.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.last_message_text.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchSearch) return false;
      if (filterTab === 'mine') return c.assigned_staff_name === user?.full_name;
      if (filterTab === 'unread') return c.unread_count > 0;
      if (filterTab === 'groups') return c.is_group;
      if (filterTab === 'escalated') return c.status === 'escalated';
      return true;
    });
  }, [conversations, searchQuery, filterTab, user]);

  const handleSelectConversation = (id: string) => {
    setActiveConvId(id);
    setShowMobileChat(true);

    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, unread_count: 0 } : c))
    );
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

    const signature = includeSignature
      ? `\n\n*${user.full_name}* — ${currentInstance?.profileName || selectedInstanceName}`
      : '';

    const fullMessage = `${textToSend}${signature}`;

    try {
      const res = await fetch(`/api/evolution/instances/${selectedInstanceName}/messages`, {
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
        setLockedLinesMap((prev) => ({ ...prev, [activeConversation.chat_jid]: selectedInstanceName }));

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
          line_id: selectedInstanceName,
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
        const newMsg: ChatMessage = {
          id: `media-${Date.now()}`,
          conversation_id: activeConversation.id,
          chat_jid: activeConversation.chat_jid,
          direction: 'out',
          body: selectedAttachment.caption || (selectedAttachment.mediaType === 'image' ? '📷 صورة' : `📄 ${selectedAttachment.fileName}`),
          media_type: selectedAttachment.mediaType,
          media_url: selectedAttachment.previewUrl,
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
              const newMsg: ChatMessage = {
                id: resData?.key?.id || `voice-${Date.now()}`,
                conversation_id: activeConversation.id,
                chat_jid: activeConversation.chat_jid,
                direction: 'out',
                body: '',
                media_type: 'audio',
                media_url: `/api/evolution/instances/${selectedInstanceName}/media/proxy?id=${resData?.key?.id || ''}`,
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

      {/* Top Bar: Connected Line / Instance Selector & Quick Status */}
      <div className="bg-[var(--card-bg)] border-b border-[var(--border-subtle)] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-[var(--text-secondary)]">خط واتساب النشط:</span>
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

            {/* Filter Tabs - مع تبويبات دورة الإسناد */}
            <div className="flex items-center gap-1 text-[11px] overflow-x-auto pb-1 scrollbar-none">
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
                onClick={() => setFilterTab('unread')}
                className={`px-2.5 py-1 rounded-lg transition-all whitespace-nowrap ${
                  filterTab === 'unread'
                    ? 'bg-purple-600/30 text-purple-300 font-semibold border border-purple-500/50'
                    : 'text-slate-400 hover:text-white bg-slate-800/30'
                }`}
              >
                غير مقروء ({conversations.filter((c) => c.unread_count > 0).length})
              </button>
              <button
                onClick={() => setFilterTab('escalated')}
                className={`px-2.5 py-1 rounded-lg transition-all whitespace-nowrap ${
                  filterTab === 'escalated'
                    ? 'bg-rose-600/30 text-rose-300 font-semibold border border-rose-500/50'
                    : 'text-slate-400 hover:text-white bg-slate-800/30'
                }`}
              >
                المصعدة ({conversations.filter((c) => c.status === 'escalated').length})
              </button>
              <button
                onClick={() => setFilterTab('groups')}
                className={`px-2.5 py-1 rounded-lg transition-all whitespace-nowrap ${
                  filterTab === 'groups'
                    ? 'bg-purple-600/30 text-purple-300 font-semibold border border-purple-500/50'
                    : 'text-slate-400 hover:text-white bg-slate-800/30'
                }`}
              >
                المجموعات
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
                </div>
              </div>

              {/* Messages Feed */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[var(--bg-main)]">
                {loadingMessages ? (
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
                        className={`flex flex-col ${isOut ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[85%] sm:max-w-xl px-4 py-2.5 text-sm transition-all ${
                            isOut
                              ? 'bubble-user'
                              : 'bubble-peer'
                          }`}
                        >
                          {!isOut && activeConversation.is_group && (
                            <div className="text-[11px] font-bold text-purple-300 mb-1">
                              {msg.sender_name}
                            </div>
                          )}

                          {/* ════════════════════════════════════════
                              📷 صورة — دقة كاملة + lightbox عند الضغط
                             ════════════════════════════════════════ */}
                          {isImage && (() => {
                            const proxied = getProxiedUrl(msg.media_url, selectedInstanceName, msg.id);
                            return (
                              <div className="mb-1">
                                {proxied ? (
                                  <div
                                    className="rounded-2xl overflow-hidden cursor-pointer bg-black/20 border border-white/10 hover:opacity-95 transition-opacity max-w-sm max-h-80 flex items-center justify-center"
                                    onClick={() => setLightboxMedia({ type: 'image', src: proxied, caption: msg.body })}
                                    title="اضغط لتكبير الصورة بكامل دقتها"
                                  >
                                    <img
                                      src={proxied}
                                      alt="صورة"
                                      className="w-full max-h-80 object-cover rounded-2xl"
                                      loading="lazy"
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
                              📄 مستند
                             ════════════════════════════════════════ */}
                          {isDoc && (
                            <div className="flex items-center gap-2.5 mb-1.5 p-2.5 rounded-xl bg-purple-950/40 border border-purple-500/30 text-xs">
                              <div className="p-2 rounded-lg bg-purple-500/20 text-purple-300 shrink-0">
                                <FileText className="w-4 h-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-white truncate">{msg.body || 'مستند مرفق'}</div>
                                <div className="text-[10px] text-slate-400">مستند (PDF / Doc)</div>
                              </div>
                              {msg.media_url && (() => {
                                const proxied = getProxiedUrl(msg.media_url, selectedInstanceName, msg.id);
                                return (
                                  <a
                                    href={proxied || msg.media_url}
                                    download
                                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white shrink-0"
                                    title="تنزيل المستند"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </a>
                                );
                              })()}
                            </div>
                          )}

                          {/* ════════════════════════════════════════
                              🎵 صوت — مشغّل صوتي مخصص مع شريط الترددات
                             ════════════════════════════════════════ */}
                          {isAudio && (() => {
                            const proxied = getProxiedUrl(msg.media_url, selectedInstanceName, msg.id);
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
                              🎥 فيديو — مشغّل فيديو مع شاشة كاملة
                             ════════════════════════════════════════ */}
                          {isVideo && (() => {
                            const proxied = getProxiedUrl(msg.media_url, selectedInstanceName, msg.id);
                            return (
                              <div className="mb-1">
                                {proxied ? (
                                  <div
                                    className="relative rounded-2xl overflow-hidden cursor-pointer bg-black border border-white/10 hover:opacity-95 transition-opacity max-w-sm max-h-80 flex items-center justify-center group"
                                    onClick={() => setLightboxMedia({ type: 'video', src: proxied, caption: msg.body })}
                                    title="اضغط لتشغيل مقطع الفيديو بشاشة كاملة"
                                  >
                                    <video
                                      src={proxied}
                                      className="w-full max-h-80 object-cover rounded-2xl bg-black"
                                      preload="metadata"
                                    />
                                    {/* زر تشغيل أنيق فوق الفيديو */}
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/20 transition-colors">
                                      <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                                        <svg
                                          className="w-5 h-5 text-purple-700 ml-1"
                                          fill="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <polygon points="5,3 19,12 5,21" />
                                        </svg>
                                      </div>
                                    </div>
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
                              📊 استطلاع رأي (Poll) بطاقة أنيقة
                             ════════════════════════════════════════ */}
                          {msg.media_type === 'poll' && (
                            <div className="p-3 rounded-2xl bg-purple-950/40 border border-purple-500/30 text-xs space-y-1.5 min-w-[220px]">
                              <div className="flex items-center gap-2 text-purple-300 font-bold text-sm">
                                <span>📊</span>
                                <span>{msg.body || 'استطلاع رأي / تصويت'}</span>
                              </div>
                              <div className="text-[10px] text-purple-300/70">
                                استطلاع تفاعلي عبر واتساب
                              </div>
                            </div>
                          )}

                          {/* النص الفعلي للرسالة — يظهر فقط إذا كان هناك نص حقيقي ولم يكن تسجيلاً صوتياً أو تصويتاً */}
                          {msg.body && !isDoc && !isAudio && msg.media_type !== 'poll' && (
                            <p className="whitespace-pre-wrap leading-relaxed mt-1">{msg.body}</p>
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

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={includeSignature}
                      onChange={(e) => setIncludeSignature(e.target.checked)}
                      className="rounded bg-slate-900 border-purple-700 text-purple-600 focus:ring-0"
                    />
                    <span className="text-[var(--text-muted)] text-[11px]">
                      تضمين التوقيع الذكي ({user.full_name})
                    </span>
                  </label>
                </div>

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
                      ref={fileInputRef}
                      onChange={handleFileInputChange}
                      className="hidden"
                      accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.csv,audio/*,video/*"
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
                        <div className="absolute bottom-12 right-0 z-50 bg-[#120B24] border border-purple-500/40 rounded-2xl p-3 shadow-2xl w-72 grid grid-cols-8 gap-1.5 text-xl backdrop-blur-md">
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
                      )}
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
          <div className="bg-[#120B24] border border-amber-500/50 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-right">
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

            <div className="p-3 bg-[#080512] rounded-xl border border-purple-900/40 text-xs text-purple-200 font-mono">
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
          <div className="bg-[#120B24] border border-purple-500/40 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-right">
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
                className="w-full bg-[#080512] text-sm text-white px-4 py-2.5 rounded-xl border border-purple-900/60 focus:border-purple-500 outline-none placeholder:text-slate-500"
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
      {lightboxMedia && (
        <div
          className="fixed inset-0 z-[200] bg-black/92 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setLightboxMedia(null)}
        >
          {/* زر الإغلاق الدائم في الزاوية */}
          <button
            onClick={() => setLightboxMedia(null)}
            className="fixed top-5 right-5 z-[210] w-11 h-11 rounded-full bg-black/70 hover:bg-black/90 text-white flex items-center justify-center transition-colors shadow-2xl border border-white/20"
            title="إغلاق (Esc)"
          >
            <X className="w-6 h-6" />
          </button>

          {/* الحاوية الداخلية — الضغط عليها لا يغلق النافذة */}
          <div
            className="relative flex flex-col items-center justify-center max-w-[92vw] max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {lightboxMedia.type === 'image' ? (
              <img
                src={lightboxMedia.src}
                alt="عرض كامل"
                className="max-w-[92vw] max-h-[82vh] rounded-2xl object-contain shadow-2xl"
              />
            ) : (
              <video
                src={lightboxMedia.src}
                controls
                autoPlay
                className="max-w-[92vw] max-h-[82vh] rounded-2xl shadow-2xl bg-black"
              />
            )}

            {lightboxMedia.caption && (
              <div className="mt-3 text-center text-sm text-white bg-black/80 px-5 py-2.5 rounded-2xl backdrop-blur-md max-w-2xl border border-white/10 shadow-lg">
                {lightboxMedia.caption}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
