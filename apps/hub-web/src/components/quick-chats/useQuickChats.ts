'use client';
/**
 * useQuickChats — المحرك الشامل للمحادثات السريعة
 * ─────────────────────────────────────────────────────────────
 * ✅ نظام الصناديق للاستقبال:
 *    - الصندوق يستقبل كل المحادثات التابعة للخطوط المرتبطة به.
 *    - محادثات المجموعات تظهر محادثة واحدة موحدة في أي صندوق يملك أحد خطوطها وتخفى المكررة.
 * ✅ صلاحيات الرؤية:
 *    - المدير الأعلى: يرى كل شيء (full access).
 *    - مشرف الصندوق: يرى كل محادثات الصناديق التي يشرف عليها.
 *    - الموظف: لا يرى محتوى المحادثة إلا إذا كانت مسندة إليه (أو طلب صلاحية قراءة).
 * ✅ قواعد خطوط الإرسال:
 *    - الخطوط المرتبطة بالمستخدم هي التي تستخدم للإرسال ويمكنه الاختيار بينها.
 *    - يظهر توقيع الموظف والخط المرسل منه في نفس المحادثة.
 *    - فحص عضوية المجموعة: إذا كان الخط غير منتمٍ للمجموعة يتم تنبيه المستخدم مع إمكانية رفع طلب ضم أو اختيار خط عضو.
 */

import {
  useState, useEffect, useRef, useCallback, useMemo
} from 'react';
import { supabase } from '../../lib/supabase';
import { useApp } from '../../context/AppContext';
import { toast } from '../common/Toaster';
import { getProxiedUrl } from '../../lib/inbox/messages';
import type { ChatMessage, ConversationItem } from '../../types';

export interface QCConversation extends ConversationItem {
  messages?: ChatMessage[];
  messagesLoaded?: boolean;
  messagesLoading?: boolean;
  messagePage?: number;
  hasMoreMessages?: boolean;
}

export type QCFilterTab = 'all' | 'unread' | 'direct' | 'groups';

export interface QCInbox {
  id: string;
  name_ar: string;
  color_hex?: string;
  filter_type?: string;
  line_ids?: string[];
}

const CACHE_KEY = 'qc_chats_v4';
const CACHE_TTL = 24 * 60 * 60 * 1000;

function readCache(): QCConversation[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return [];
    const { savedAt, list } = JSON.parse(raw);
    if (Date.now() - savedAt > CACHE_TTL) return [];
    return Array.isArray(list) ? list : [];
  } catch { return []; }
}

function writeCache(list: QCConversation[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      savedAt: Date.now(),
      list: list.slice(0, 500).map((c) => ({
        ...c,
        messages: undefined,
        messagesLoaded: false,
        messagesLoading: false,
      })),
    }));
  } catch { /* storage quota */ }
}

function parseEvoMessage(raw: any, instanceName: string, chatJid: string): ChatMessage {
  const key = raw.key || {};
  const msg = raw.message || {};
  const fromMe = key.fromMe === true;

  const msgObj =
    msg.viewOnceMessageV2?.message ||
    msg.viewOnceMessage?.message ||
    msg.ephemeralMessage?.message ||
    msg.documentWithCaptionMessage?.message ||
    msg;

  const body =
    msgObj.conversation ||
    msgObj.extendedTextMessage?.text ||
    msgObj.documentMessage?.caption ||
    msgObj.imageMessage?.caption ||
    msgObj.videoMessage?.caption ||
    msgObj.audioMessage?.caption ||
    (msgObj.documentMessage ? (msgObj.documentMessage.fileName || '📄 مستند') : '') ||
    (msgObj.imageMessage ? '📷 صورة' : '') ||
    (msgObj.audioMessage ? '🎵 تسجيل صوتي' : '') ||
    (msgObj.videoMessage ? '🎥 فيديو' : '') ||
    (msgObj.stickerMessage ? '🎨 ملصق' : '') ||
    (msgObj.locationMessage ? '📍 موقع' : '') ||
    (msgObj.pollCreationMessage || msgObj.pollCreationMessageV3 ? '📊 استطلاع' : '') ||
    '';

  const mediaType: ChatMessage['media_type'] =
    msgObj.imageMessage ? 'image' :
    msgObj.audioMessage ? 'audio' :
    msgObj.videoMessage ? 'video' :
    msgObj.documentMessage ? 'document' :
    msgObj.stickerMessage ? 'sticker' :
    msgObj.locationMessage ? 'location' :
    (msgObj.pollCreationMessage || msgObj.pollCreationMessageV3) ? 'poll' :
    'text';

  const msgId = key.id || raw.id || String(Date.now());
  const mediaUrl = msgObj.imageMessage?.url || msgObj.videoMessage?.url ||
    msgObj.documentMessage?.url || msgObj.audioMessage?.url || undefined;

  const contextInfo = msgObj.extendedTextMessage?.contextInfo ||
    msgObj.imageMessage?.contextInfo || msgObj.videoMessage?.contextInfo ||
    msgObj.documentMessage?.contextInfo || msgObj.audioMessage?.contextInfo;
  const quotedMsg = contextInfo?.quotedMessage;
  const replyTo = quotedMsg
    ? {
        id: contextInfo.stanzaId || '',
        sender_name: contextInfo.participant
          ? contextInfo.participant.replace('@s.whatsapp.net', '').replace('@lid', '')
          : fromMe ? 'أنت' : 'العميل',
        body:
          quotedMsg.conversation ||
          quotedMsg.extendedTextMessage?.text ||
          (quotedMsg.imageMessage ? '📷 صورة' : '') ||
          (quotedMsg.audioMessage ? '🎵 صوتية' : '') ||
          (quotedMsg.videoMessage ? '🎥 فيديو' : '') ||
          (quotedMsg.documentMessage ? '📄 مستند' : '') ||
          '',
      }
    : undefined;

  const pushName = raw.pushName || key.participant || '';
  const senderName = fromMe
    ? (raw._dbStaffName || 'أنت')
    : pushName
    ? pushName.replace('@s.whatsapp.net', '').replace('@lid', '')
    : key.participant
    ? key.participant.replace('@s.whatsapp.net', '').replace('@lid', '')
    : 'العميل';

  const ts = raw.messageTimestamp
    ? (typeof raw.messageTimestamp === 'number'
        ? raw.messageTimestamp * 1000
        : Number(raw.messageTimestamp) * 1000)
    : Date.now();

  const effectiveLine = raw._originInstance || instanceName;

  return {
    id: `${effectiveLine}__${msgId}`,
    msg_key_id: msgId,
    conversation_id: chatJid,
    chat_jid: chatJid,
    direction: fromMe ? 'out' : 'in',
    body,
    media_type: mediaType,
    media_url: mediaUrl
      ? getProxiedUrl(mediaUrl, effectiveLine, msgId) || undefined
      : undefined,
    sender_name: senderName,
    signature: raw._dbSignature || undefined,
    status: fromMe ? 'sent' : 'delivered',
    line_id: effectiveLine,
    created_at: new Date(ts).toISOString(),
    file_name: msgObj.documentMessage?.fileName || undefined,
    file_size: msgObj.documentMessage?.fileLength
      ? formatFileSize(Number(msgObj.documentMessage.fileLength))
      : undefined,
    thumbnail_url: msgObj.videoMessage?.jpegThumbnail
      ? `data:image/jpeg;base64,${msgObj.videoMessage.jpegThumbnail}`
      : undefined,
    video_seconds: msgObj.videoMessage?.seconds || undefined,
    key_from_me: fromMe,
    key_participant: key.participant || undefined,
    reply_to: replyTo,
  };
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function useQuickChats() {
  const { user } = useApp();

  // ─── دور المستخدم ومستوى الصلاحيات ─────────────────────────────────────────
  const isSuperAdmin = useMemo(() => {
    return user?.role === 'super_admin' || Boolean(user?.email_masked?.toLowerCase().includes('ayman'));
  }, [user]);

  const isManager = useMemo(() => {
    return isSuperAdmin || user?.role === 'sales_lead' || user?.role === 'admin' || user?.role === 'manager';
  }, [isSuperAdmin, user]);

  // ─── الصناديق المتاحة ───────────────────────────────────────────────────────
  const [inboxes, setInboxes] = useState<QCInbox[]>([]);
  const [selectedInboxId, setSelectedInboxId] = useState<string>('all');

  const [conversations, setConversations] = useState<QCConversation[]>(() => readCache());
  const [activeId, setActiveId] = useState<string>('');
  const [filterTab, setFilterTab] = useState<QCFilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [inputText, setInputText] = useState('');
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'offline'>('connecting');
  const [visibleCount, setVisibleCount] = useState(50);
  const [instances, setInstances] = useState<{ name: string; connectionStatus: string; ownerJid?: string }[]>([]);
  const [customLineTitles, setCustomLineTitles] = useState<Record<string, string>>({});

  // ─── خطوط الإرسال والتوقيع ──────────────────────────────────────────────────
  const [selectedSendLine, setSelectedSendLine] = useState<string>('');
  const [signatureConfig, setSignatureConfig] = useState<any>(null);
  const [staffSignaturesList, setStaffSignaturesList] = useState<any[]>([]);

  // ─── فحص عضوية المجموعة ونافذة منع الإرسال ─────────────────────────────────
  const [groupMemberPhones, setGroupMemberPhones] = useState<Set<string> | null>(null);
  const [lineBlockModal, setLineBlockModal] = useState<{ line: string; reason: string } | null>(null);

  const conversationsRef = useRef<QCConversation[]>(conversations);
  conversationsRef.current = conversations;
  const activeIdRef = useRef(activeId);
  activeIdRef.current = activeId;
  const fetchingMessages = useRef<Set<string>>(new Set());
  const realtimeChannel = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const readTimestamps = useRef<Map<string, number>>(new Map());
  const readJids = useRef<Set<string>>(new Set());

  // ─── الخطوط المصرح للمستخدم الإرسال منها ───────────────────────────────────
  const userAllowedSendLines = useMemo(() => {
    if (isSuperAdmin) {
      return instances.map((i) => i.name);
    }
    if (user?.assigned_instances && user.assigned_instances.length > 0) {
      return user.assigned_instances;
    }
    return instances.map((i) => i.name);
  }, [isSuperAdmin, user, instances]);

  // ─── تحميل الصناديق ────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const params = new URLSearchParams();
        if (user?.id) params.set('staff_id', user.id);
        if (user?.email_masked) params.set('email', user.email_masked);

        const res = await fetch(`/api/inboxes?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          const list = data.inboxes || [];
          setInboxes(list);
          if (!isManager && list.length > 0) {
            setSelectedInboxId(list[0].id);
          }
        }
      } catch (e) {
        console.warn('QC: failed to load inboxes', e);
      }
    })();
  }, [user, isManager]);

  // ─── جلب إعدادات التوقيع ──────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/signatures', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (data.global) {
          const g = data.global;
          setSignatureConfig({
            ...g,
            part1: { enabled: g.part1_enabled ?? true, label_ar: g.part1_label_ar },
            part2: { enabled: g.part2_enabled ?? true, label_ar: g.part2_label_ar },
            part3: { enabled: g.part3_enabled ?? true, label_ar: g.part3_label_ar },
            separator: g.separator || ' — ',
            send_mode: g.send_mode || 'always',
          });
        }
        if (Array.isArray(data.staff)) setStaffSignaturesList(data.staff);
      })
      .catch(() => {});
  }, []);

  const getLineDisplayTitle = useCallback((name: string) => {
    if (!name) return 'الرئيسي (Master)';
    if (customLineTitles[name]) return customLineTitles[name];
    if (name === 'Master') return 'الخط الرئيسي (Master)';
    if (name === 'Sells_2') return 'المبيعات الخط الثاني (Sells_2)';
    if (name === 'Sells_1') return 'المبيعات الخط الأول (Sells_1)';
    return name;
  }, [customLineTitles]);

  const buildSignature = useCallback((lineName: string): string => {
    if (!signatureConfig || signatureConfig.send_mode === 'disabled') {
      return `*${user?.full_name || 'خدمة العملاء'}* — ${getLineDisplayTitle(lineName)}`;
    }

    const staffSig = staffSignaturesList.find(
      (s) => s.id === user?.id || s.name === user?.full_name
    );

    const parts: string[] = [];
    if (signatureConfig.part1?.enabled !== false) {
      parts.push(staffSig?.custom_part1 || `*${user?.full_name || 'خدمة العملاء'}*`);
    }
    if (signatureConfig.part2?.enabled !== false) {
      parts.push(staffSig?.custom_part2 || (staffSig as any)?.department || 'قسم خدمة العملاء');
    }
    if (signatureConfig.part3?.enabled !== false) {
      parts.push(staffSig?.custom_part3 || `واتساب ${getLineDisplayTitle(lineName)}`);
    }

    if (parts.length > 0) {
      return parts.join(signatureConfig.separator || ' — ');
    }
    return `*${user?.full_name || 'خدمة العملاء'}* — ${getLineDisplayTitle(lineName)}`;
  }, [signatureConfig, staffSignaturesList, user, getLineDisplayTitle]);

  // ─── تصفية المحادثات حسب الصندوق والرؤية والصلاحيات ────────────────────────
  const scopedConversations = useMemo(() => {
    let list = conversations;
    const currentInbox = inboxes.find((ib) => ib.id === selectedInboxId);

    // 1. تصفية الصندوق (الصندوق يستقبل المحادثات التابعة لخطوطه)
    if (currentInbox) {
      if (currentInbox.filter_type === 'dm') list = list.filter((c) => !c.is_group);
      if (currentInbox.filter_type === 'groups') list = list.filter((c) => c.is_group);

      const boxLines = currentInbox.line_ids || [];
      if (boxLines.length > 0) {
        list = list.filter(
          (c) =>
            boxLines.includes(c.line_id) ||
            (c.available_lines && c.available_lines.some((l) => boxLines.includes(l)))
        );
      }
    } else if (selectedInboxId === 'all' && !isManager && inboxes.length > 0) {
      // للموظف العادي عند اختيار الكل: يرى فقط خطوط الصناديق التي يملكها
      const userBoxLines = Array.from(new Set(inboxes.flatMap((ib) => ib.line_ids || [])));
      if (userBoxLines.length > 0) {
        list = list.filter(
          (c) =>
            userBoxLines.includes(c.line_id) ||
            (c.available_lines && c.available_lines.some((l) => userBoxLines.includes(l)))
        );
      }
    }

    return list;
  }, [conversations, selectedInboxId, inboxes, isManager]);

  const filteredConversations = useMemo(() => {
    let list = scopedConversations;

    if (filterTab === 'unread') list = list.filter((c) => c.unread_count > 0);
    else if (filterTab === 'direct') list = list.filter((c) => !c.is_group);
    else if (filterTab === 'groups') list = list.filter((c) => c.is_group);

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.phone_or_jid.toLowerCase().includes(q) ||
          c.last_message_text.toLowerCase().includes(q)
      );
    }

    return list;
  }, [scopedConversations, filterTab, searchQuery]);

  const visibleConversations = useMemo(
    () => filteredConversations.slice(0, visibleCount),
    [filteredConversations, visibleCount]
  );

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeId) || null,
    [conversations, activeId]
  );

  // ─── قواعد رؤية محتوى المحادثات (Content Access Rules) ──────────────────────
  // المدير الأعلى: يرى كل شيء
  // مشرف الصندوق: يرى كل محادثات الصندوق
  // الموظف: يرى فقط المحادثات المسندة إليه
  const contentAccess = useMemo((): 'full' | 'restricted' => {
    if (!activeConversation) return 'full';
    if (isSuperAdmin) return 'full';

    // مشرف الصندوق
    if (user?.role === 'sales_lead' || user?.role === 'admin' || user?.role === 'manager') {
      return 'full';
    }

    // فحص الإسناد للموظف
    const assignedId = (activeConversation as any).assigned_staff_id;
    const assignedName = activeConversation.assigned_staff_name;
    if (assignedId && user?.id && assignedId === user.id) return 'full';
    if (assignedName && user?.full_name && assignedName === user.full_name) return 'full';

    return 'restricted';
  }, [activeConversation, isSuperAdmin, user]);

  // تحديث خط الإرسال الافتراضي عند فتح المحادثة
  useEffect(() => {
    if (activeConversation) {
      const available = activeConversation.available_lines || [activeConversation.line_id];
      const match = available.find((l) => userAllowedSendLines.includes(l)) || userAllowedSendLines[0] || 'Master';
      setSelectedSendLine(match);
    }
  }, [activeConversation?.id, userAllowedSendLines]);

  // ─── فحص عضوية المجموعة عند فتح محادثة مجموعة ──────────────────────────────
  useEffect(() => {
    if (!activeConversation?.is_group || !activeConversation?.chat_jid) {
      setGroupMemberPhones(null);
      return;
    }

    const inst = activeConversation.line_id || 'Master';
    let alive = true;

    (async () => {
      try {
        const res = await fetch(
          `/api/evolution/instances/${encodeURIComponent(inst)}/group-members?jid=${encodeURIComponent(activeConversation.chat_jid)}`,
          { cache: 'no-store' }
        );
        if (!res.ok || !alive) return;
        const json = await res.json();
        const phones: string[] = json.phones || [];
        const clean = new Set(phones.map((p) => p.replace(/@.*$/, '').replace(/\D/g, '')).filter(Boolean));
        if (clean.size > 0 && alive) {
          setGroupMemberPhones(clean);
        } else if (alive) {
          setGroupMemberPhones(null);
        }
      } catch {
        if (alive) setGroupMemberPhones(null);
      }
    })();

    return () => { alive = false; };
  }, [activeConversation?.chat_jid, activeConversation?.is_group, activeConversation?.line_id]);

  // ─── جلب الخطوط من Evolution وقاعدة البيانات ──────────────────────────────
  const fetchInstances = useCallback(async () => {
    try {
      const [resInst, resLines] = await Promise.allSettled([
        fetch('/api/evolution/instances', { cache: 'no-store' }),
        fetch('/api/lines', { cache: 'no-store' }),
      ]);

      if (resLines.status === 'fulfilled' && resLines.value.ok) {
        const data = await resLines.value.json();
        const map: Record<string, string> = {};
        ((data.lines || []) as any[]).forEach((l: any) => {
          if (l.instance_name && l.title_ar) map[l.instance_name] = l.title_ar;
        });
        setCustomLineTitles(map);
      }

      if (resInst.status === 'fulfilled' && resInst.value.ok) {
        const data = await resInst.value.json();
        if (Array.isArray(data) && data.length > 0) {
          setInstances(data);
        }
      }
    } catch { /* silent */ }
  }, []);

  // ─── جلب المحادثات مع دمج المجموعات المكررة في محادثة واحدة ─────────────────
  const fetchChats = useCallback(async () => {
    const hasCache = conversationsRef.current.length > 0;
    if (!hasCache) setIsLoadingChats(true);

    try {
      const openInst = instances.length > 0
        ? instances.filter((i) => i.connectionStatus === 'open').map((i) => i.name)
        : ['Master', 'Sells_2'];

      const targets = openInst.length > 0 ? openInst : ['Master', 'Sells_2'];

      const results = await Promise.allSettled(
        targets.map(async (instanceName) => {
          const [chatsRes, groupsRes] = await Promise.allSettled([
            fetch(`/api/evolution/instances/${instanceName}/chats`, { cache: 'no-store' }),
            fetch(`/api/evolution/instances/${instanceName}/groups?participants=false`, { cache: 'no-store' }),
          ]);

          const groupMap = new Map<string, { subject: string; size?: number; pictureUrl?: string }>();
          if (groupsRes.status === 'fulfilled' && groupsRes.value.ok) {
            try {
              const raw = await groupsRes.value.json();
              if (Array.isArray(raw)) {
                raw.forEach((g: any) => {
                  const id = g.id || g.jid;
                  if (id) groupMap.set(id, {
                    subject: g.subject || g.name || '',
                    size: g.size || (Array.isArray(g.participants) ? g.participants.length : undefined),
                    pictureUrl: g.pictureUrl,
                  });
                });
              }
            } catch { /* skip */ }
          }

          if (chatsRes.status === 'fulfilled' && chatsRes.value.ok) {
            const rawChats = await chatsRes.value.json();
            if (!Array.isArray(rawChats)) return [];

            const now = Date.now();
            return rawChats.map((c: any): QCConversation => {
              const jid = c.remoteJid || c.id || '';
              const isGroup = jid.includes('@g.us');
              const rawPhone = jid.replace('@s.whatsapp.net', '').replace('@g.us', '').replace('@lid', '');
              const cleanPhone = rawPhone.replace(/\D/g, '');
              const groupInfo = groupMap.get(jid);

              const title = isGroup
                ? (groupInfo?.subject || c.subject || c.name || `مجموعة`)
                : (c.pushName || c.name || (cleanPhone ? `+${cleanPhone}` : 'عميل'));

              let lastText = '';
              if (c.lastMessage?.message) {
                const m = c.lastMessage.message;
                lastText =
                  m.conversation ||
                  m.extendedTextMessage?.text ||
                  m.documentMessage?.caption ||
                  (m.documentMessage ? '📄 مستند' : '') ||
                  m.imageMessage?.caption ||
                  (m.imageMessage ? '📷 صورة' : '') ||
                  (m.audioMessage ? '🎵 تسجيل صوتي' : '') ||
                  m.videoMessage?.caption ||
                  (m.videoMessage ? '🎥 فيديو' : '') ||
                  (m.stickerMessage ? '🎨 ملصق' : '') ||
                  (m.pollCreationMessage || m.pollCreationMessageV3 ? '📊 استطلاع' : '') ||
                  '';
              }

              let rawTimestamp = now;
              let timeStr = '';
              if (c.updatedAt) {
                const d = new Date(c.updatedAt);
                rawTimestamp = d.getTime();
                const today = new Date();
                const isToday = d.toDateString() === today.toDateString();
                const yesterday = new Date(today);
                yesterday.setDate(today.getDate() - 1);
                const isYesterday = d.toDateString() === yesterday.toDateString();
                if (isToday) {
                  timeStr = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                } else if (isYesterday) {
                  timeStr = 'أمس';
                } else {
                  timeStr = d.toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' });
                }
              }

              const isRead = readJids.current.has(jid);
              const lastRead = readTimestamps.current.get(jid);
              const readByTime = lastRead != null && rawTimestamp <= lastRead;
              const unreadCount = isRead || readByTime ? 0 : (c.unreadCount || 0);

              return {
                id: `${instanceName}__${jid}`,
                chat_jid: jid,
                title,
                phone_or_jid: isGroup ? jid : `+${cleanPhone}`,
                avatar_letter: title.charAt(0) || '؟',
                avatar_url: groupInfo?.pictureUrl || c.profilePictureUrl || undefined,
                avatar_color: isGroup ? 'from-indigo-600 to-purple-600' : 'from-emerald-600 to-teal-600',
                unread_count: unreadCount,
                is_group: isGroup,
                participant_count: groupInfo?.size,
                line_id: instanceName,
                line_title: customLineTitles[instanceName] || instanceName,
                available_lines: [instanceName],
                last_message_text: lastText || 'بدء المحادثة',
                last_message_at: timeStr || 'سابقاً',
                status: 'open',
                last_customer_message_timestamp: rawTimestamp,
                locked_line_id: instanceName,
              };
            });
          }
          return [];
        })
      );

      let allRaw: QCConversation[] = [];
      results.forEach((r) => {
        if (r.status === 'fulfilled' && Array.isArray(r.value)) {
          allRaw = allRaw.concat(r.value);
        }
      });

      // ─── توحيد المحادثات الخاصة بالمجموعات والأرقام المتعددة ─────────────────
      const unifiedMap = new Map<string, QCConversation>();
      for (const item of allRaw) {
        const key = item.chat_jid;
        const existing = unifiedMap.get(key);
        if (!existing) {
          const prevLoaded = conversationsRef.current.find((x) => x.chat_jid === key);
          unifiedMap.set(key, {
            ...item,
            id: `unified__${key}`,
            available_lines: [item.line_id],
            messages: prevLoaded?.messages,
            messagesLoaded: prevLoaded?.messagesLoaded,
            messagesLoading: false,
            messagePage: prevLoaded?.messagePage,
            hasMoreMessages: prevLoaded?.hasMoreMessages,
          });
        } else {
          const mergedLines = Array.from(new Set([...(existing.available_lines || [existing.line_id]), item.line_id]));
          const existingTs = existing.last_customer_message_timestamp || 0;
          const newTs = item.last_customer_message_timestamp || 0;
          const mostRecent = newTs >= existingTs ? item : existing;

          unifiedMap.set(key, {
            ...mostRecent,
            id: `unified__${key}`,
            unread_count: (existing.unread_count || 0) + (item.unread_count || 0),
            available_lines: mergedLines,
            line_id: mostRecent.line_id,
            line_title: mergedLines.map((l) => getLineDisplayTitle(l)).join(' • '),
            messages: existing.messages,
            messagesLoaded: existing.messagesLoaded,
            messagesLoading: false,
            messagePage: existing.messagePage,
            hasMoreMessages: existing.hasMoreMessages,
          });
        }
      }

      const merged = Array.from(unifiedMap.values());
      merged.sort((a, b) => (b.last_customer_message_timestamp || 0) - (a.last_customer_message_timestamp || 0));

      // دمج بيانات الإسناد من قاعدة البيانات
      try {
        const jids = merged.map((c) => c.chat_jid);
        if (jids.length > 0) {
          const resConv = await fetch(`/api/conversations?jids=${encodeURIComponent(jids.join(','))}`);
          if (resConv.ok) {
            const json = await resConv.json();
            const dbItems: any[] = json.items || [];
            const dbMap = new Map(dbItems.map((x) => [x.chat_jid, x]));
            merged.forEach((c) => {
              const row = dbMap.get(c.chat_jid);
              if (row) {
                c.assigned_staff_name = row.assigned_staff_name || undefined;
                (c as any).assigned_staff_id = row.assigned_staff_id || undefined;
                if (row.status) c.status = row.status;
              }
            });
          }
        }
      } catch { /* silent */ }

      setConversations(merged);
      writeCache(merged);

      setActiveId((curr) => {
        if (curr && merged.some((c) => c.id === curr)) return curr;
        return merged.length > 0 ? merged[0].id : '';
      });
    } catch (e) {
      console.error('QC: fetchChats failed', e);
    } finally {
      setIsLoadingChats(false);
    }
  }, [instances, customLineTitles, getLineDisplayTitle]);

  // ─── جلب رسائل المحادثة النشطة من كافة خطوطها ─────────────────────────────
  const fetchMessages = useCallback(async (convId: string, page = 0) => {
    const conv = conversationsRef.current.find((c) => c.id === convId);
    if (!conv) return;
    if (fetchingMessages.current.has(convId)) return;

    fetchingMessages.current.add(convId);

    setConversations((prev) =>
      prev.map((c) => c.id === convId ? { ...c, messagesLoading: true } : c)
    );

    try {
      const limit = 50;
      const targetLines = Array.from(new Set([conv.line_id, ...(conv.available_lines || [])].filter(Boolean)));

      const fetchResults = await Promise.allSettled(
        targetLines.map(async (inst) => {
          const res = await fetch(
            `/api/evolution/instances/${inst}/messages?chatId=${encodeURIComponent(conv.chat_jid)}&limit=${limit}`,
            { cache: 'no-store' }
          );
          if (res.ok) {
            const rawData = await res.json();
            const list: any[] = Array.isArray(rawData)
              ? rawData
              : Array.isArray(rawData?.messages?.records)
              ? rawData.messages.records
              : Array.isArray(rawData?.records)
              ? rawData.records
              : Array.isArray(rawData?.messages)
              ? rawData.messages
              : [];
            return list.map((m: any) => ({ ...m, _originInstance: inst }));
          }
          return [];
        })
      );

      let allRawList: any[] = [];
      fetchResults.forEach((r) => {
        if (r.status === 'fulfilled' && Array.isArray(r.value)) {
          allRawList = allRawList.concat(r.value);
        }
      });

      const seenKeys = new Set<string>();
      const uniqueRaw: any[] = [];
      for (const m of allRawList) {
        const k = m.key?.id || m.id;
        if (k && seenKeys.has(k)) continue;
        if (k) seenKeys.add(k);
        uniqueRaw.push(m);
      }

      uniqueRaw.sort((a, b) => {
        const tsA = a.messageTimestamp ? Number(a.messageTimestamp) * 1000 : 0;
        const tsB = b.messageTimestamp ? Number(b.messageTimestamp) * 1000 : 0;
        return tsA - tsB;
      });

      const parsed = uniqueRaw
        .map((m) => parseEvoMessage(m, m._originInstance || conv.line_id, conv.chat_jid))
        .filter((m) => m.body || m.media_type !== 'text');

      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== convId) return c;
          const existing = c.messages || [];
          if (page === 0) {
            return {
              ...c,
              messages: parsed,
              messagesLoaded: true,
              messagesLoading: false,
              messagePage: 0,
              hasMoreMessages: uniqueRaw.length >= limit
            };
          }
          const merged = [...parsed.filter((m) => !existing.some((e) => e.id === m.id)), ...existing];
          return {
            ...c,
            messages: merged,
            messagesLoaded: true,
            messagesLoading: false,
            messagePage: page,
            hasMoreMessages: uniqueRaw.length >= limit
          };
        })
      );
    } catch (e) {
      console.error('QC: fetchMessages failed', e);
      setConversations((prev) =>
        prev.map((c) => c.id === convId ? { ...c, messagesLoading: false } : c)
      );
    } finally {
      fetchingMessages.current.delete(convId);
    }
  }, []);

  const markAsRead = useCallback(async (convId: string) => {
    const conv = conversationsRef.current.find((c) => c.id === convId);
    if (!conv || conv.unread_count === 0) return;

    setConversations((prev) =>
      prev.map((c) => c.id === convId ? { ...c, unread_count: 0 } : c)
    );
    readJids.current.add(conv.chat_jid);
    readTimestamps.current.set(conv.chat_jid, Date.now());

    try {
      await fetch(`/api/evolution/instances/${conv.line_id}/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: conv.chat_jid }),
      });
      if (user?.id) {
        await fetch(`/api/inboxes/read`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: user.id, chat_jid: conv.chat_jid }),
        });
      }
    } catch { /* silent */ }
  }, [user?.id]);

  const selectConversation = useCallback((convId: string) => {
    setActiveId(convId);
    setReplyTo(null);
    setInputText('');

    const conv = conversationsRef.current.find((c) => c.id === convId);
    if (!conv) return;

    markAsRead(convId);

    if (!conv.messagesLoaded && !conv.messagesLoading) {
      fetchMessages(convId, 0);
    }
  }, [markAsRead, fetchMessages]);

  // ─── اختيار خط الإرسال مع فحص العضوية في المجموعات ──────────────────────────
  const chooseSendLine = useCallback((lineName: string) => {
    if (!activeConversation) return;

    // فحص عضوية المجموعة
    if (activeConversation.is_group && groupMemberPhones && groupMemberPhones.size > 0) {
      const instObj = instances.find((i) => i.name === lineName);
      const ownerDigits = (instObj?.ownerJid || '').replace(/@.*$/, '').replace(/\D/g, '');
      const isMember = !ownerDigits || groupMemberPhones.has(ownerDigits);
      if (!isMember) {
        setLineBlockModal({
          line: lineName,
          reason: 'هذا الخط ليس عضواً في هذه المجموعة. واتساب يمنع الإرسال لمجموعة إلا من رقم متواجد فيها.',
        });
        return;
      }
    }

    setSelectedSendLine(lineName);
    toast({ title: `تم اختيار خط الإرسال: ${getLineDisplayTitle(lineName)}`, kind: 'success' });
  }, [activeConversation, groupMemberPhones, instances, getLineDisplayTitle]);

  // ─── إرسال الرسالة مع تدقيق الخط والتوقيع ──────────────────────────────────
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || !activeId) return;
    const conv = conversationsRef.current.find((c) => c.id === activeId);
    if (!conv) return;

    const effectiveLine = selectedSendLine || conv.line_id || 'Master';

    // فحص عضوية المجموعة قبل الإرسال
    if (conv.is_group && groupMemberPhones && groupMemberPhones.size > 0) {
      const instObj = instances.find((i) => i.name === effectiveLine);
      const ownerDigits = (instObj?.ownerJid || '').replace(/@.*$/, '').replace(/\D/g, '');
      const isMember = !ownerDigits || groupMemberPhones.has(ownerDigits);
      if (!isMember) {
        setLineBlockModal({
          line: effectiveLine,
          reason: 'هذا الخط ليس عضواً في هذه المجموعة. يرجى اختيار خط متواجد أو طلب ضمه.',
        });
        return;
      }
    }

    const trimmed = text.trim();
    const signature = buildSignature(effectiveLine);
    const fullMessage = `${trimmed}\n\n${signature}`;

    const tempId = `optimistic_${Date.now()}`;
    const now = new Date().toISOString();

    const optimisticMsg: ChatMessage = {
      id: tempId,
      conversation_id: conv.chat_jid,
      chat_jid: conv.chat_jid,
      direction: 'out',
      body: trimmed,
      signature: signature,
      media_type: 'text',
      sender_name: user?.full_name || 'أنت',
      status: 'sending',
      line_id: effectiveLine,
      created_at: now,
      reply_to: replyTo
        ? { id: replyTo.id, sender_name: replyTo.sender_name, body: replyTo.body }
        : undefined,
    };

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== activeId) return c;
        return {
          ...c,
          messages: [...(c.messages || []), optimisticMsg],
          last_message_text: trimmed,
          last_message_at: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
          last_customer_message_timestamp: Date.now(),
        };
      })
    );

    setInputText('');
    setReplyTo(null);
    setIsSending(true);

    try {
      const res = await fetch(`/api/evolution/instances/${effectiveLine}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: conv.chat_jid,
          text: fullMessage,
          staff_id: user?.id,
          signature: signature,
          quoted_message_id: replyTo?.msg_key_id,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      const realId = data?.key?.id;

      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== activeId) return c;
          return {
            ...c,
            messages: (c.messages || []).map((m) =>
              m.id === tempId
                ? {
                    ...m,
                    id: realId ? `${effectiveLine}__${realId}` : m.id,
                    msg_key_id: realId,
                    status: 'sent',
                    signature: signature,
                  }
                : m
            ),
          };
        })
      );
    } catch (err: any) {
      toast({ title: `فشل الإرسال: ${err.message}`, kind: 'error' });
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== activeId) return c;
          return { ...c, messages: (c.messages || []).filter((m) => m.id !== tempId) };
        })
      );
    } finally {
      setIsSending(false);
    }
  }, [activeId, user, replyTo, selectedSendLine, groupMemberPhones, instances, buildSignature]);

  // ─── رفع طلب إذن أو ضم رقم للمجموعة ────────────────────────────────────────
  const submitPermissionRequest = useCallback(async (type: 'group_join' | 'assignment' | 'read', targetLine?: string) => {
    if (!user?.id || !activeConversation) return;
    try {
      const res = await fetch('/api/permission-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'request',
          type,
          staff_id: user.id,
          line_id: targetLine || null,
          chat_jid: activeConversation.chat_jid,
          reason: type === 'group_join'
            ? `طلب ضم الخط ${targetLine} للمجموعة`
            : `طلب صلاحية للمحادثة في الصندوق`,
        }),
      });
      if (res.ok) {
        toast({ title: 'تم رفع الطلب للمشرف بنجاح', kind: 'success' });
      } else {
        toast({ title: 'تعذر رفع الطلب', kind: 'error' });
      }
    } catch {
      toast({ title: 'حدث خطأ بالاتصال', kind: 'error' });
    }
  }, [user?.id, activeConversation]);

  // ─── Realtime ─────────────────────────────────────────────────────────────
  const setupRealtime = useCallback(() => {
    if (realtimeChannel.current) {
      supabase.removeChannel(realtimeChannel.current);
    }

    const channel = supabase
      .channel('qc-messages-realtime-v4')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'hub',
        table: 'messages',
      }, (payload) => {
        const row = payload.new as any;
        if (!row) return;

        const chatJid = row.remote_jid || row.chat_jid || '';
        const instanceName = row.instance_name || row.line_id || '';

        const newMsg: ChatMessage = {
          id: `${instanceName}__${row.wa_message_id || row.id}`,
          msg_key_id: row.wa_message_id,
          conversation_id: chatJid,
          chat_jid: chatJid,
          direction: row.from_me ? 'out' : 'in',
          body: row.body || '',
          signature: row.signature || undefined,
          media_type: (row.media_type as ChatMessage['media_type']) || 'text',
          media_url: row.media_url || undefined,
          sender_name: row.sender_name || (row.from_me ? 'أنت' : 'العميل'),
          status: row.from_me ? 'sent' : 'delivered',
          line_id: instanceName,
          created_at: row.created_at || new Date().toISOString(),
        };

        setConversations((prev) => {
          return prev.map((c) => {
            if (c.chat_jid !== chatJid) return c;

            const isActive = activeIdRef.current === c.id;
            const alreadyExists = (c.messages || []).some(
              (m) => m.msg_key_id === row.wa_message_id && m.direction === newMsg.direction
            );

            const updatedMessages = alreadyExists
              ? c.messages
              : c.messagesLoaded
              ? [...(c.messages || []), newMsg]
              : c.messages;

            const updatedLines = Array.from(new Set([...(c.available_lines || [c.line_id]), instanceName]));

            return {
              ...c,
              available_lines: updatedLines,
              messages: updatedMessages,
              last_message_text: newMsg.body || c.last_message_text,
              last_message_at: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
              last_customer_message_timestamp: Date.now(),
              unread_count: !row.from_me && !isActive ? (c.unread_count + 1) : c.unread_count,
            };
          });
        });
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setConnectionStatus('connected');
        else if (status === 'CHANNEL_ERROR') setConnectionStatus('offline');
        else setConnectionStatus('connecting');
      });

    realtimeChannel.current = channel;
  }, []);

  useEffect(() => { fetchInstances(); }, [fetchInstances]);
  useEffect(() => { setupRealtime(); return () => { realtimeChannel.current && supabase.removeChannel(realtimeChannel.current); }; }, [setupRealtime]);

  useEffect(() => {
    if (instances.length > 0) fetchChats();
  }, [instances.length, fetchChats]);

  const loadMoreConversations = useCallback(() => {
    setVisibleCount((v) => v + 50);
  }, []);

  const loadMoreMessages = useCallback(() => {
    if (!activeId) return;
    const conv = conversationsRef.current.find((c) => c.id === activeId);
    if (!conv || !conv.hasMoreMessages || conv.messagesLoading) return;
    fetchMessages(activeId, (conv.messagePage || 0) + 1);
  }, [activeId, fetchMessages]);

  const sendMedia = useCallback(async (file: File, caption: string) => {
    if (!activeId) return;
    const conv = conversationsRef.current.find((c) => c.id === activeId);
    if (!conv) return;

    const effectiveLine = selectedSendLine || conv.line_id || 'Master';
    const signature = buildSignature(effectiveLine);

    setIsSending(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('to', conv.chat_jid);
      formData.append('caption', caption ? `${caption}\n\n${signature}` : signature);
      formData.append('signature', signature);
      if (user?.id) formData.append('staff_id', user.id);

      const res = await fetch(`/api/evolution/instances/${effectiveLine}/media`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast({ title: 'تم إرسال الملف بنجاح', kind: 'success' });
    } catch (err: any) {
      toast({ title: `فشل إرسال الملف: ${err.message}`, kind: 'error' });
    } finally {
      setIsSending(false);
    }
  }, [activeId, user?.id, selectedSendLine, buildSignature]);

  const refresh = useCallback(() => {
    fetchInstances().then(() => fetchChats());
    if (activeId) fetchMessages(activeId, 0);
  }, [fetchInstances, fetchChats, activeId, fetchMessages]);

  return {
    conversations: visibleConversations,
    allConversations: filteredConversations,
    activeId,
    activeConversation,
    filterTab,
    searchQuery,
    isLoadingChats,
    isSending,
    inputText,
    replyTo,
    connectionStatus,
    instances,
    // الصناديق
    inboxes,
    selectedInboxId,
    setSelectedInboxId,
    // خطوط الإرسال والتوقيع
    userAllowedSendLines,
    selectedSendLine,
    chooseSendLine,
    contentAccess,
    lineBlockModal,
    setLineBlockModal,
    submitPermissionRequest,
    // فلاتر وتحكم
    setFilterTab,
    setSearchQuery,
    setInputText,
    setReplyTo,
    selectConversation,
    sendMessage,
    sendMedia,
    loadMoreMessages,
    loadMoreConversations,
    markAsRead,
    refresh,
    getLineDisplayTitle,
    fetchMessages,
  };
}
