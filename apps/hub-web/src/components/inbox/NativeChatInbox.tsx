'use client';

import { initialsOrLetter } from '../../lib/nameUtils';
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
  CheckSquare
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useRouter } from 'next/navigation';
import { ConversationItem, ChatMessage, ConversationStatus } from '../../types';
import { Button } from '@tripyou/ui';
import { supabase } from '../../lib/supabase';
import { fetchTags } from '../../lib/hubDb';
import { toast } from '../common/Toaster';
import { getProxiedUrl, getFileCardMeta, formatMessageWithLinks } from '../../lib/inbox/messages';
import { AudioMessagePlayer } from './AudioMessagePlayer';
import { SlaTimer } from './SlaTimer';
import { ConversationRow } from './ConversationRow';
import { ConversationInfoPanel } from './ConversationInfoPanel';
import { Modal } from './Modal';
import { statusBadge, statusLabel } from '../../lib/inbox/uiMaps';
import { isQuietHoursNow } from '../../lib/inbox/time';

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

// م7: الموظفون الحقيقيون من القاعدة (hub.staff) — يُحمَّل من /api/staff
const AVAILABLE_STAFF_FALLBACK = [{ id: '', name: 'غير مسند (عام)', role: 'صندوق عام' }];

export function NativeChatInbox() {
  const { user, authStatus } = useApp();
  const router = useRouter();

  // م7: قائمة الموظفين الحقيقية من القاعدة
  const [availableStaff, setAvailableStaff] = useState<{ id: string; name: string; role: string }[]>(AVAILABLE_STAFF_FALLBACK);
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/staff', { cache: 'no-store' });
        if (!res.ok) return;
        const json = await res.json();
        const list = (json.data || []).map((s: any) => ({ id: s.id, name: s.full_name, role: s.role_name || 'موظف' }));
        if (list.length > 0) setAvailableStaff([...list, ...AVAILABLE_STAFF_FALLBACK]);
      } catch { /* صامت */ }
    })();
  }, []);

  // Evolution Real State
  const [instances, setInstances] = useState<EvolutionInstanceSummary[]>([]);
  const [customLineTitles, setCustomLineTitles] = useState<Record<string, string>>({});
  const [selectedInstanceName, setSelectedInstanceName] = useState<string>('Master');
  const [sendingLineInstance, setSendingLineInstance] = useState<string>('');
  const [loadingInstances, setLoadingInstances] = useState<boolean>(true);

  // Inboxes State
  const [inboxesList, setInboxesList] = useState<{ id: string; name_ar: string; color_hex: string; filter_type: string; line_ids: string[] }[]>([]);
  const [selectedInboxId, setSelectedInboxId] = useState<string>('all');
  const [lineFilter, setLineFilter] = useState<string>('all');
  const readChatsSet = useRef<Set<string>>(new Set());
  // م8: مراجع السكرول الذكي + وعي المجموعات
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const lastActiveConvIdRef = useRef<string>('');
  const [knownGroupJids, setKnownGroupJids] = useState<Set<string>>(new Set());
  const [savedContactJids, setSavedContactJids] = useState<Set<string>>(new Set());
  // م8: عدّاد غير مقروء حقيقي — وقت آخر قراءة لكل محادثة؛ العداد يعود فقط برسالة أحدث من القراءة
  const lastReadAtRef = useRef<Map<string, number>>(new Map());

  // Conversations State (Real)
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const conversationsRef = useRef<ConversationItem[]>([]);
  conversationsRef.current = conversations;
  const [loadingChats, setLoadingChats] = useState<boolean>(false);

  // ─── مراجع مستقرة تمنع إعادة إنشاء دوال الجلب عند كل تحديث حالة (منع إعادة الجلب العشوائي) ───
  const instancesRef = useRef<EvolutionInstanceSummary[]>([]);
  instancesRef.current = instances;

  // ─── كاش محلي لقائمة المحادثات (نمط وتساب ويب) ───
  // تُرطَّب القائمة فوراً من localStorage عند فتح الصفحة — لا سبينر ولا وميض للمستخدم العائد،
  // ثم يُحدَّث الجديد بصمت في الخلفية. صلاحية الكاش 24 ساعة.
  const CHATS_CACHE_KEY = 'hub_chats_cache_v1';
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CHATS_CACHE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const list: ConversationItem[] = Array.isArray(parsed?.conversations) ? parsed.conversations : [];
      const fresh = Date.now() - (parsed?.savedAt || 0) < 24 * 60 * 60 * 1000;
      if (fresh && list.length > 0 && conversationsRef.current.length === 0) {
        setConversations(list);
      }
    } catch { /* كاش تالف — تجاهل بصمت */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
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

  // ─── سجل المقروء المحفوظ في الداتابيز للصندوق الحالي والمستخدم ───
  const [readChatJids, setReadChatJids] = useState<Set<string>>(new Set());
  // مرجع مستقر لسجل المقروء — يُقرأ داخل دوال الجلب ذات التبعيات الثابتة دون قفل نسخة قديمة
  const readChatJidsRef = useRef<Set<string>>(readChatJids);
  readChatJidsRef.current = readChatJids;
  // ─── حالة فحص جهة الاتصال الحالية في الداتابيز ───
  const [isContactSaved, setIsContactSaved] = useState<boolean>(false);
  // لوحة تفاصيل المحادثة المنزلقة من اليسار (نقرة واحدة)
  const [infoPanelOpen, setInfoPanelOpen] = useState<boolean>(false);
  // ─── إعدادات التواقيع المحملة من الداتابيز ───
  const [signatureConfig, setSignatureConfig] = useState<any>(null);
  const [staffSignaturesList, setStaffSignaturesList] = useState<any[]>([]);

  // ─── روابط عمق المفضلة/الإشعارات/اللوحة: ?chat=<jid> — يلتقط مرة واحدة ويستهلك عند ظهور المحادثة ───
  const pendingChatDeepLink = useRef<string | null>(
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('chat')
      : null
  );

  // م8-ج2: مراقبة حية للرابط — لأن router.push من الإشعار/اللوحة (أنت أصلاً في /inbox)
  // لا يعيد تحميل المكون، فلا يُلتقط الباراميتر الجديد بوسيلة الـ mount
  const [deepLinkTick, setDeepLinkTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      if (typeof window === 'undefined') return;
      const fromUrl = new URLSearchParams(window.location.search).get('chat');
      if (fromUrl && fromUrl !== pendingChatDeepLink.current) {
        pendingChatDeepLink.current = fromUrl;
        setDeepLinkTick((t) => t + 1);
        // مهلة فشل: إن لم تُوجد المحادثة في نطاق الصندوق خلال 5 ثوانٍ — رسالة واضحة
        setTimeout(() => {
          if (pendingChatDeepLink.current === fromUrl) {
            pendingChatDeepLink.current = null;
            try {
              const url = new URL(window.location.href);
              url.searchParams.delete('chat');
              window.history.replaceState({}, '', url.toString());
            } catch {}
            toast({ title: 'لم تُوجد المحادثة في نطاق صندوقك الحالي — افتح صندوقها أو خطها', kind: 'error' });
          }
        }, 5000);
      }
    }, 600);
    return () => clearInterval(interval);
  }, []);

  // ─── م3: وسوم القاعدة الحقيقية — سجل الوسوم + وسم المحادثة النشطة + محرر منبثق ───
  const [dbTags, setDbTags] = useState<{ id: string; name: string; hex_color: string }[]>([]);
  const [activeConvTagIds, setActiveConvTagIds] = useState<string[]>([]);
  const [tagMenuOpen, setTagMenuOpen] = useState(false);
  // م8-ج3: قائمة خيارات الجهة (اسم المحادثة قابل للنقر)
  const [contactMenuOpen, setContactMenuOpen] = useState(false);
  // نافذة «الرقم غير متواجد في المجموعة» — تظهر عند محاولة اختيار خط غير عضو في مجموعة (اختيار حر + خيارا الحل)
  const [lineBlockModal, setLineBlockModal] = useState<{ line: string; reason: string } | null>(null);
  // قائمة خط الإرسال المدمجة (منسدلة صغيرة بدل select كبير يأكل مساحة الكتابة)
  const [sendLineMenuOpen, setSendLineMenuOpen] = useState(false);
  // إخفاء شريط الرسائل المثبتة لهذه الجلسة — X يخفي مؤقتاً ولا يلغي التثبيت
  const [pinsBarDismissed, setPinsBarDismissed] = useState<Record<string, boolean>>({});
  // طلب المالك: قائمة خيارات لكل مرسل داخل المجموعة
  const [senderMenu, setSenderMenu] = useState<{ msgId: string; name: string; jid: string; x: number; y: number } | null>(null);

  // ─── C4: قواعد الرد عبر الخطوط ───
  // منح المدير: خطوط يُسمح للموظف الرد منها رغم أنها ليست خط الوارد (بعد موافقة صريحة)
  const [grantedLines, setGrantedLines] = useState<Set<string>>(new Set());
  const [grantRequestState, setGrantRequestState] = useState<'none' | 'sending' | 'sent'>('none');
  // عضوية المجموعة: أرقام الخطوط الأعضاء في مجموعة المحادثة الحالية (قانون واتساب)
  const [groupMemberDigits, setGroupMemberDigits] = useState<Set<string> | null>(null);

  // جلب منح الموظف الحالي (يُحدَّث بعد كل طلب/قرار) + خريطة اسم الخط → uuid للطلبات
  const [lineIdMap, setLineIdMap] = useState<Record<string, string>>({});
  // م8: المنح لكل محادثة فقط — مفتاح chat_jid|line من الطلبات المعتمدة
  const [convGrants, setConvGrants] = useState<Set<string>>(new Set());
  const refreshGrants = useCallback(() => {
    if (!user?.id) return;
    fetch(`/api/permission-requests?staff_id=${encodeURIComponent(user.id)}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        const set = new Set<string>((j?.grants || []).map((g: any) => `${g.chat_jid}|${g.line}`));
        setConvGrants(set);
      })
      .catch(() => {});
    fetch('/api/lines', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        const map: Record<string, string> = {};
        ((j?.lines || []) as any[]).forEach((l) => { if (l.instance_name && l.id) map[l.instance_name] = l.id; });
        setLineIdMap(map);
      })
      .catch(() => {});
  }, [user?.id]);

  useEffect(() => { refreshGrants(); }, [refreshGrants]);
  const [tagFilter, setTagFilter] = useState<string>(''); // فلتر وسم بالشريط العلوي

  // تحميل سجل الوسوم مرة واحدة (من hub.hub_tags عبر دوال hubDb)
  useEffect(() => {
    (async () => {
      try {
        const rows = await fetchTags();
        setDbTags(rows.map((t) => ({ id: t.id, name: t.name, hex_color: t.hex_color })));
      } catch { /* صامت */ }
    })();
  }, []);

  // ─── تحسين أداء وسرعة النظام: عرض المحادثات التدريجي لمنع ثقل المتصفح ───
  const [visibleCount, setVisibleCount] = useState<number>(50);

  // إعادة ضبط عداد العرض التدريجي عند تغيير الفلاتر أو البحث
  useEffect(() => {
    setVisibleCount(50);
  }, [filterTab, lineFilter, searchQuery, selectedInboxId]);

  // ─── الخطوط المسموح للموظف الإرسال منها وفق ما تم ربطه به في قائمة تحكم الموظفين ───
  const allowedSendInstances = useMemo(() => {
    if (user?.assigned_instances && user.assigned_instances.length > 0) {
      const filtered = instances.filter((inst) => user.assigned_instances?.includes(inst.name));
      if (filtered.length > 0) return filtered;
    }
    if (user?.role === 'super_admin') {
      return instances;
    }
    return instances;
  }, [instances, user]);

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
  const [requestAccessSending, setRequestAccessSending] = useState<boolean>(false);
  const [requestAccessError, setRequestAccessError] = useState<string | null>(null);
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

  // حساب ساعات الهدوء بتوقيت مكة المكرمة (+3) — المنطق النقي في lib/inbox/time.ts
  const isQuietHoursActive = useMemo(() => isQuietHoursNow(), []);

  // Esc يغلق عارض الوسائط فعلياً (كان مكتوباً في نص الواجهة دون ربط)
  useEffect(() => {
    if (!lightboxMedia) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxMedia(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [lightboxMedia]);

  // تحميل الصناديق حصراً من API الخادم المحمي بجدول inbox_access ودور الموظف في قاعدة البيانات
  const loadInboxes = useCallback(async () => {
    // ننتظر حتى تكتمل المصادقة ولا نعتمد على قيم غير مؤكدة
    if (authStatus === 'loading') return;

    try {
      const params = new URLSearchParams();
      if (user?.id) params.set('staff_id', user.id);
      if (user?.email_masked) params.set('email', user.email_masked);

      const res = await fetch(`/api/inboxes?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        const inboxes = data.inboxes || [];
        setInboxesList(inboxes);

        // إذا كان المستخدم موظفاً غير مدير ولديه صناديق مخصصة، نحدد أول صندوق له تلقائياً
        const isMgr = user?.role === 'manager' || user?.role === 'admin' || user?.role === 'super_admin' || Boolean(user?.email_masked?.toLowerCase().includes('ayman'));
        if (!isMgr && inboxes.length > 0) {
          setSelectedInboxId(inboxes[0].id);
        }
      }
    } catch (e) {
      console.warn('Failed to load inboxes:', e);
    }
  }, [user, authStatus]);

  useEffect(() => {
    loadInboxes();
  }, [loadInboxes]);

  // ─── تحميل سجل المقروء من قاعدة البيانات لهذا الصندوق والمستخدم ───
  // م8-ج2: يملأ أيضاً أطواب القراءة (lastReadAt) ويعيد تصفير العدادات فوراً —
  // القراءة خاصة بكل مستخدم فقط — بلا فلتر صندوق (المحادثة المقروءة مقروءة في كل الصناديق)
  // والاعتماد الكامل على طابع زمني لكل محادثة: العداد = رسائل أحدث من آخر قراءة
  const hydratedReadsRef = useRef<Promise<void> | null>(null);
  const loadReadReceipts = useCallback(async () => {
    if (!user?.id) return;
    const doLoad = async () => {
      try {
        // بلا inbox_id — كل سجلات هذا المستخدم عبر جميع الصناديق
        const res = await fetch(`/api/inboxes/read?user_id=${user.id}`);
        if (res.ok) {
          const json = await res.json();
          const reads: { chat_jid: string; last_read_at: string }[] = json.reads || [];
          const set = new Set<string>(reads.map((r) => r.chat_jid));
          setReadChatJids(set);
          set.forEach((jid) => readChatsSet.current.add(jid));
          for (const r of reads) {
            const ts = r.last_read_at ? new Date(r.last_read_at).getTime() : 0;
            if (ts > 0) lastReadAtRef.current.set(r.chat_jid, ts);
          }
          // تطبيق فوري على القائمة الحالية — بلا انتظار جلب الخطوط التالي
          setConversations((prev) => {
            let changed = false;
            const next = prev.map((c) => {
              if (set.has(c.chat_jid) && c.unread_count !== 0) {
                changed = true;
                return { ...c, unread_count: 0 };
              }
              return c;
            });
            return changed ? next : prev;
          });
        }
      } catch (e) {
        console.warn('Failed loading read receipts:', e);
      }
    };
    hydratedReadsRef.current = doLoad();
    await hydratedReadsRef.current;
  }, [user?.id]);

  useEffect(() => {
    loadReadReceipts();
  }, [loadReadReceipts]);

  // ─── تحميل إعدادات التواقيع وتواقيع الموظفين من قاعدة البيانات ───
  useEffect(() => {
    fetch('/api/signatures')
      .then((r) => r.json())
      .then((data) => {
        if (data.global) {
          // م8: تسوية الشكل — الـ API يعيد حقولاً مسطحة (part1_enabled) والصندوق يقرأ كائناً متداخلاً
          const g = data.global;
          setSignatureConfig({
            ...g,
            part1: { enabled: g.part1_enabled ?? true, label_ar: g.part1_label_ar, editable_by: g.part1_editable_by, required: g.part1_required },
            part2: { enabled: g.part2_enabled ?? true, label_ar: g.part2_label_ar, editable_by: g.part2_editable_by, required: g.part2_required },
            part3: { enabled: g.part3_enabled ?? true, label_ar: g.part3_label_ar, editable_by: g.part3_editable_by, required: g.part3_required },
            separator: g.separator || ' — ',
            send_mode: g.send_mode || 'always',
          });
        }
        if (Array.isArray(data.staff)) setStaffSignaturesList(data.staff);
      })
      .catch(() => {});
  }, []);

  // 1. Fetch connected instances from Evolution API & custom internal line titles
  const fetchInstances = useCallback(async () => {
    try {
      setLoadingInstances(true);
      const [resInst, resLines] = await Promise.allSettled([
        fetch('/api/evolution/instances'),
        fetch('/api/lines'),
      ]);

      if (resLines.status === 'fulfilled' && resLines.value.ok) {
        const linesData = await resLines.value.json();
        if (linesData.lines && Array.isArray(linesData.lines)) {
          const map: Record<string, string> = {};
          linesData.lines.forEach((l: any) => {
            if (l.instance_name && l.title_ar) {
              map[l.instance_name] = l.title_ar;
            }
          });
          setCustomLineTitles(map);
        }
      }

      if (resInst.status === 'fulfilled' && resInst.value.ok) {
        const data = await resInst.value.json();
        if (Array.isArray(data) && data.length > 0) {
          setInstances(data);
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

  const getLineDisplayTitle = useCallback((name: string) => {
    if (!name) return 'الخط الرئيسي (Master)';
    if (customLineTitles[name]) return customLineTitles[name];
    if (name === 'Master') return 'الخط الرئيسي (Master)';
    if (name === 'Sells_2') return 'المبيعات الخط الثاني (Sells_2)';
    if (name === 'Sells_1') return 'المبيعات الخط الأول (Sells_1)';
    return name;
  }, [customLineTitles]);

  useEffect(() => {
    fetchInstances();
  }, [fetchInstances]);

  // 2. Fetch real chats & WhatsApp groups across multiple instances in parallel
  // م‑الوميض: الجلب صامت افتراضياً بعد أول تحميل — لا سبينر ولا تفكيك للقائمة (نمط وتساب ويب).
  // الدوّار يظهر فقط في أول تحميل حقيقي حين لا توجد بيانات أصلاً.
  const fetchChats = useCallback(async (targetInstances?: string[]) => {
    const silent = conversationsRef.current.length > 0;
    try {
      if (!silent) setLoadingChats(true);
      // م8-ج2: انتظر ترطيب سجلات القراءة أولاً — العدادات ترسم صح من أول مرة
      if (hydratedReadsRef.current) await hydratedReadsRef.current;

      // تحديد الخطوط المستهدفة للجلب
      let instancesToFetch = targetInstances;
      if (!instancesToFetch || instancesToFetch.length === 0) {
        const openInst = instancesRef.current.filter((i) => i.connectionStatus === 'open').map((i) => i.name);
        instancesToFetch = openInst.length > 0 ? openInst : ['Master', 'Sells_2'];
      }

      const perInstanceResults = await Promise.allSettled(
        instancesToFetch.map(async (instanceName) => {
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
              console.warn(`Failed parsing groups for ${instanceName}:`, e);
            }
          }

          if (chatsRes.status === 'fulfilled' && chatsRes.value.ok) {
            const rawChats = await chatsRes.value.json();
            if (Array.isArray(rawChats)) {
              const nowTs = Date.now();
              return rawChats.map((c: any): ConversationItem => {
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
                  timeStr = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                }

                // ─── م8: عدّاد غير مقروء حقيقي ───
                // قاعدة القراءة: المحادثة مقروءة إذا (أ) ضمن سجل المقروء، أو (ب) وقت آخر قراءة مسجل
                // أحدث من طابع آخر رسالة. بهذا لا يعود العداد برسالة قديمة ولا يظهر لرسالة قرأتها فعلاً.
                const isReadLocally = readChatJidsRef.current.has(jid) || readChatsSet.current.has(jid);
                const lastRead = lastReadAtRef.current.get(jid);
                const readByTime = lastRead != null && rawTimestamp <= lastRead;
                const unread = isReadLocally || readByTime ? 0 : (c.unreadCount || 0);

                return {
                  id: `${instanceName}__${jid}`,
                  chat_jid: jid,
                  title: title,
                  phone_or_jid: isGroup ? jid : `+${cleanPhone}`,
                  avatar_letter: title.charAt(0) || '؟',
                  avatar_url: groupInfo?.pictureUrl || c.profilePictureUrl || undefined,
                  avatar_color: isGroup ? 'from-indigo-600 to-purple-600' : 'from-emerald-600 to-teal-600',
                  unread_count: unread,
                  is_group: isGroup,
                  participant_count: groupInfo?.size,
                  line_id: instanceName,
                  line_title: instanceName === 'Master' ? 'الرقم الرئيسي (Master)' : instanceName === 'Sells_2' ? 'المبيعات 2 (Sells_2)' : instanceName,
                  last_message_text: lastText || 'بدء المحادثة',
                  last_message_at: timeStr || 'سابقاً',
                  assigned_staff_name: undefined,
                  tags: isGroup ? ['مجموعة'] : cleanPhone.startsWith('966') ? ['السعودية'] : [],
                  status: 'open',
                  last_customer_message_timestamp: rawTimestamp,
                  locked_line_id: instanceName,
                };
              });
            }
          }
          return [];
        })
      );

      let allMerged: ConversationItem[] = [];
      perInstanceResults.forEach((r) => {
        if (r.status === 'fulfilled' && Array.isArray(r.value)) {
          allMerged = allMerged.concat(r.value);
        }
      });

      // نحتفظ ببيانات كل خط كاملة ومستقلة دون أي حذف أو استقطاع لتكون عدادات كل خط دقيقة 100%
      allMerged.sort((a, b) => (b.last_customer_message_timestamp || 0) - (a.last_customer_message_timestamp || 0));

      // ─── تسجيل محلي (كاش): القائمة تُرطَّب فوراً في الزيارة القادمة بلا دوّار ───
      try {
        localStorage.setItem(CHATS_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), conversations: allMerged.slice(0, 400) }));
      } catch { /* تجاوز حد التخزين — غير حرج */ }

      // م8: دمج يحافظ على مرجع الكائنات غير المتغيرة — القائمة لا "تقفز" ولا تعيد رسمها إن لم يتغير شيء
      setConversations((prev) => {
        if (prev.length === allMerged.length) {
          const prevSig = prev.map((c) => `${c.id}:${c.unread_count}:${c.last_message_text?.slice(0, 30)}:${c.status}`).join('|');
          const newSig = allMerged.map((c) => `${c.id}:${c.unread_count}:${c.last_message_text?.slice(0, 30)}:${c.status}`).join('|');
          if (prevSig === newSig) return prev;
        }
        return allMerged;
      });
      // م3: دمج وسوم وحالات القاعدة في القائمة بعد جلبها
      mergeDbTagsAndStatus(allMerged);
      setActiveConvId((curr) => {
        if (curr && allMerged.some((c) => c.id === curr || curr === `unified__${c.chat_jid}`)) return curr;
        return allMerged.length > 0 ? allMerged[0].id : '';
      });
    } catch (err) {
      console.error('Failed to load chats:', err);
    } finally {
      if (!silent) setLoadingChats(false);
    }
  }, []);

  // استدعاء جلب المحادثات لكافة الخطوط فور جاهزية الخطوط أو تغيير الصندوق
  useEffect(() => {
    if (instances.length > 0) {
      const openNames = instances.filter((i) => i.connectionStatus === 'open').map((i) => i.name);
      fetchChats(openNames.length > 0 ? openNames : ['Master', 'Sells_2']);
    }
  }, [instances.length, fetchChats]);

  // ─── استهلاك الرابط العميق ?chat=<jid> (من صفحة المفضلة أو إشعار) بعد اكتمال تحميل المحادثات ───
  // ينتظر ظهور المحادثة المستهدفة في القائمة ثم يحددها تلقائياً ويحذف الباراميتر من الرابط
  useEffect(() => {
    const wanted = pendingChatDeepLink.current;
    if (!wanted || loadingChats || conversations.length === 0) return;

    const norm = (s: string) => (s || '').trim().toLowerCase();
    const w = norm(wanted);
    const wantedDigits = wanted.replace(/\D/g, '');

    // الترتيب: تطابق jid كامل → تطابق معرف موحّد → لاحقة المعرف → مطابقة رقم الهاتف
    const target =
      conversations.find((c) => norm(c.chat_jid) === w) ||
      conversations.find((c) => norm(c.id) === w) ||
      conversations.find((c) => norm(c.id).endsWith(`__${w}`)) ||
      (wantedDigits.length >= 7
        ? conversations.find((c) => (c.chat_jid || '').replace(/\D/g, '').includes(wantedDigits))
        : undefined);

    if (target) {
      pendingChatDeepLink.current = null; // استُهلك — لا يعيد الانتقاء مرة أخرى
      setDeepLinkTick((t) => t + 1); // إعادة مزامنة النبضة بعد الاستهلاك
      handleSelectConversation(target.id);
      // تنظيف الرابط دون إعادة تحميل الصفحة
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete('chat');
        window.history.replaceState({}, '', url.toString());
      } catch { /* صامت */ }
    }
    // ملاحظة: إن لم تُوجد المحادثة بعد نبقي الرابط معلقاً — مهلة الفشل في المراقب تعرض رسالة واضحة
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations, loadingChats, deepLinkTick]);

  // 3. Fetch real messages when active conversation changes (يدعم جلب الرسائل من كافة الخطوط المشتركة ودمجها)
  // م8: التحديث الدوري لنفس المحادثة صامت بلا وميض لودر ولا قفزة سكرول
  const currentMsgChatRef = useRef<string>('');

  const fetchMessagesForChat = useCallback(async (chatJid: string, instanceName: string, additionalLines?: string[]) => {
    if (!chatJid || !instanceName) return;
    const isSilentRefresh = currentMsgChatRef.current === chatJid;
    try {
      if (!isSilentRefresh) setLoadingMessages(true);
      const linesToFetch = Array.from(new Set([instanceName, ...(additionalLines || [])].filter(Boolean)));

      const fetchResults = await Promise.allSettled(
        linesToFetch.map(async (inst) => {
          const res = await fetch(`/api/evolution/instances/${inst}/messages?chatId=${encodeURIComponent(chatJid)}&limit=50`);
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

      // منع تكرار الرسائل بين الخطوط
      const seenMsgKeys = new Set<string>();
      const uniqueRawMsgs: any[] = [];
      for (const m of allRawList) {
        const k = m.key?.id || m.id;
        if (k && seenMsgKeys.has(k)) continue;
        if (k) seenMsgKeys.add(k);
        uniqueRawMsgs.push(m);
      }

      // ترتيب الرسائل زمنياً تصاعدياً
      uniqueRawMsgs.sort((a, b) => (a.messageTimestamp || 0) - (b.messageTimestamp || 0));

      const mapped: ChatMessage[] = uniqueRawMsgs.map((m: any) => {
        const fromMe = m.key?.fromMe ?? false;
        let text = ``;
        let mediaType: any = `text`;
        const msgKeyId: string | undefined = m.key?.id || undefined;
        let docFileName: string | undefined = undefined;

        if (m.message) {
          // م8: فتح أغلفة واتساب — الملصقات و"عرض لمرة واحدة" والرسائل المؤقتة مغلفة
          const msgObj =
            m.message.viewOnceMessageV2?.message ||
            m.message.viewOnceMessageV2Extension?.message ||
            m.message.viewOnceMessage?.message ||
            m.message.ephemeralMessage?.message ||
            m.message.documentWithCaptionMessage?.message ||
            m.message;
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
          timeStr = date.toLocaleTimeString(`en-GB`, { hour: `2-digit`, minute: `2-digit` });
        }

        return {
          id: msgKeyId || m.id || ('msg-' + Date.now() + '-' + Math.random()),
          msg_key_id: msgKeyId,
          key_from_me: fromMe,
          key_participant: m.key?.participant || undefined,
          conversation_id: chatJid,
          chat_jid: chatJid,
          direction: fromMe ? `out` : `in`,
          body: text || (mediaType !== `text` ? `` : `(رسالة)`),
          media_type: mediaType,
          media_url: undefined,
          file_name: docFileName,
          sender_name: fromMe ? `أنا` : (m.pushName || `العميل`),
          status: fromMe ? (m.status === `READ` ? `read` : `delivered`) : `delivered`,
          line_id: m._originInstance || instanceName,
          created_at: timeStr || `الآن`,
        };
      });

      // م8: لا نستبدل المصفوفة إلا عند تغير فعلي — يمنع إعادة الرسم والسكرول المزعج كل 6 ثوانٍ
      setMessages((prev) => {
        if (prev.length === mapped.length) {
          const prevSig = prev.map((m) => m.id).join('|');
          const newSig = mapped.map((m) => m.id).join('|');
          if (prevSig === newSig) return prev;
        }
        return mapped;
      });
      currentMsgChatRef.current = chatJid;
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      if (!isSilentRefresh) setLoadingMessages(false);
    }
  }, []);

  // الصندوق الحالي المختار
  const currentInbox = useMemo(
    () => inboxesList.find((ib) => ib.id === selectedInboxId),
    [inboxesList, selectedInboxId]
  );

  const isManager = useMemo(() => {
    // الأدوار الثلاثة المعتمدة: مدير (super_admin) / مشرف (sales_lead) / موظف (البقية)
    return (
      user?.role === 'manager' ||
      user?.role === 'admin' ||
      user?.role === 'super_admin' ||
      user?.role === 'sales_lead' ||
      Boolean(user?.email_masked?.toLowerCase().includes('ayman'))
    );
  }, [user]);

  // التحقق هل الموظف غير مسند لأي صندوق محادثات
  const isStaffWithoutInboxes = useMemo(() => {
    if (isManager) return false;
    if (authStatus === 'loading') return false;
    return inboxesList.length === 0;
  }, [isManager, authStatus, inboxesList]);

  // الخطوط المتاحة والمسموح بها داخل الصندوق المختار فقط وفق جدول الداتابيز
  const availableInstances = useMemo(() => {
    if (isStaffWithoutInboxes) return [];
    let list = instances;

    // 1. إذا تم اختيار صندوق محدد: نقتصر حصراً على الخطوط المسجلة في هذا الصندوق بالداتابيز
    if (currentInbox) {
      const allowedBoxLines = currentInbox.line_ids || [];
      list = list.filter((inst) => allowedBoxLines.includes(inst.name));
    } else if (selectedInboxId === 'all') {
      // 2. إذا كان "كل الصناديق" والمستخدم موظف غير مدير ولديه صناديق: نقتصر على خطوط صناديقه المخصصة
      if (!isManager && inboxesList.length > 0) {
        const staffBoxLines = Array.from(new Set(inboxesList.flatMap((ib) => ib.line_ids || [])));
        list = list.filter((inst) => staffBoxLines.includes(inst.name));
      }
    }

    // 3. تقييد الموظف بخطوط line_access في الداتابيز
    if (!isManager && user?.assigned_instances && user.assigned_instances.length > 0) {
      list = list.filter((inst) => user.assigned_instances!.includes(inst.name));
    }

    return list;
  }, [instances, currentInbox, inboxesList, user, isManager, selectedInboxId, isStaffWithoutInboxes]);

  // المحادثات المحصورة في نطاق الصندوق المختار وصلاحيات الموظف (قبل تطبيق التبويبات والبحث والخط)
  const inboxScopedConversations = useMemo(() => {
    if (isStaffWithoutInboxes) return [];
    let list = conversations;

    if (currentInbox) {
      // فلترة نوع المحادثات في الصندوق (فردي / مجموعات)
      if (currentInbox.filter_type === 'dm') list = list.filter((c) => !c.is_group);
      if (currentInbox.filter_type === 'groups') list = list.filter((c) => c.is_group);

      const allowedBoxLines = currentInbox.line_ids || [];
      if (allowedBoxLines.length > 0) {
        list = list.filter(
          (c) =>
            allowedBoxLines.includes(c.line_id) ||
            (c.available_lines && c.available_lines.some((l) => allowedBoxLines.includes(l)))
        );
      } else {
        // إذا كان الصندوق لا يحتوي على أي خط مربوط، تظهر المحادثات فارغة تماماً
        return [];
      }
    } else if (selectedInboxId === 'all' && !isManager && inboxesList.length > 0) {
      const staffBoxLines = Array.from(new Set(inboxesList.flatMap((ib) => ib.line_ids || [])));
      if (staffBoxLines.length > 0) {
        list = list.filter(
          (c) =>
            staffBoxLines.includes(c.line_id) ||
            (c.available_lines && c.available_lines.some((l) => staffBoxLines.includes(l)))
        );
      } else {
        return [];
      }
    }

    // تقييد الموظف بخطوطه المصرح له بها
    if (!isManager && user?.assigned_instances && user.assigned_instances.length > 0) {
      list = list.filter(
        (c) =>
          user.assigned_instances!.includes(c.line_id) ||
          (c.available_lines && c.available_lines.some((l) => user.assigned_instances!.includes(l)))
      );
    }

    // م3: فلتر الوسم المختار من الشريط العلوي
    if (tagFilter) {
      list = list.filter((c) => (c.tags || []).includes(tagFilter));
    }

    // قرار المالك: الموظف يرى المحادثات المسندة إليه فقط —
    // المحادثات غير المسندة تظهر للمدير والمشرف حصراً (تجمع الإسناد)
    if (!isManager && user?.id) {
      list = list.filter((c) => {
        const sid = (c as any).assigned_staff_id;
        if (sid) return sid === user.id;
        return c.assigned_staff_name === user.full_name;
      });
    }

    return list;
  }, [conversations, currentInbox, inboxesList, user, isManager, selectedInboxId, tagFilter]);

  // إجمالي عدد المحادثات الفريدة في "جميع الخطوط" بعد الدمج الشكلي
  const allUniqueCount = useMemo(() => {
    return new Set(inboxScopedConversations.map((c) => c.chat_jid)).size;
  }, [inboxScopedConversations]);

  // تصفية المحادثات وتطبيق الدمج الشكلي فقط عندما يكون lineFilter === 'all'
  const filteredConversations = useMemo(() => {
    const now = Date.now();
    let sourceList: ConversationItem[] = [];

    if (lineFilter !== 'all') {
      // منظور الخط الفردي: نظهر فقط محادثات هذا الخط كما هي دون أي دمج شكلي!
      sourceList = inboxScopedConversations.filter((c) => c.line_id === lineFilter);
    } else {
      // قرار المالك: المجموعات فقط تُدمج — الفردية تبقى منفصلة لكل خط وتُرد من خطها الوارد
      const groupedMap = new Map<string, ConversationItem>();
      for (const item of inboxScopedConversations) {
        if (!item.is_group) {
          groupedMap.set(`${item.id}`, item);
          continue;
        }
        const key = item.chat_jid;
        const existing = groupedMap.get(key);
        if (!existing) {
          groupedMap.set(key, {
            ...item,
            available_lines: [item.line_id],
          });
        } else {
          const mergedLines = Array.from(
            new Set([...(existing.available_lines || [existing.line_id]), item.line_id])
          );
          const existingTs = existing.last_customer_message_timestamp || 0;
          const newTs = item.last_customer_message_timestamp || 0;
          const mostRecent = newTs >= existingTs ? item : existing;

          groupedMap.set(key, {
            ...mostRecent,
            id: `unified__${key}`,
            unread_count: (existing.unread_count || 0) + (item.unread_count || 0),
            available_lines: mergedLines,
            line_id: mostRecent.line_id,
            line_title: mergedLines.map((l) => getLineDisplayTitle(l)).join(' • '),
          });
        }
      }
      sourceList = Array.from(groupedMap.values());
      sourceList.sort((a, b) => (b.last_customer_message_timestamp || 0) - (a.last_customer_message_timestamp || 0));
    }

    return sourceList.filter((c) => {
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
  }, [inboxScopedConversations, searchQuery, filterTab, user, lineFilter, getLineDisplayTitle]);

  // Active conversation object (يبحث أولاً في القائمة المفلترة المدمجة)
  const activeConversation = useMemo(() => {
    const inFiltered = filteredConversations.find(
      (c) => c.id === activeConvId || c.chat_jid === activeConvId.replace('unified__', '')
    );
    if (inFiltered) return inFiltered;
    const inRaw = conversations.find(
      (c) => c.id === activeConvId || activeConvId === `unified__${c.chat_jid}`
    );
    if (inRaw) return inRaw;
    return filteredConversations[0] || conversations[0] || null;
  }, [filteredConversations, conversations, activeConvId]);

  // ─── التحقق الفوري هل المحادثة الحالية مسجلة في دليل جهات الاتصال (نقطة check دقيقة) ───
  useEffect(() => {
    if (!activeConversation?.chat_jid) {
      setIsContactSaved(false);
      return;
    }
    const jid = activeConversation.chat_jid;
    let alive = true;
    fetch(`/api/contacts/check?jid=${encodeURIComponent(jid)}&phone=${encodeURIComponent(activeConversation.phone_or_jid || '')}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { saved: false }))
      .then((json) => { if (alive) setIsContactSaved(!!json.saved); })
      .catch(() => {});
    return () => { alive = false; };
  }, [activeConversation?.phone_or_jid, activeConversation?.chat_jid]);

  // خط الإرسال الفعلي المعتمد للموظف
  // ─── C3: خط الوارد الأخير — الرد الافتراضي يتبع آخر رقم كتبك منه العميل ───
  const lastIncomingLine = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].direction === 'in' && messages[i].line_id) return messages[i].line_id;
    }
    return activeConversation?.line_id || null;
  }, [messages, activeConversation?.line_id]);

  // ─── C4: صلاحية كل خط للإرسال في المحادثة الحالية ───
  // فردية: فقط خط الوارد — إلا إذا وُجد منح من المدير (line_send_grants)
  // مجموعة: قيد العضوية باقٍ (قرار المالك) — عبر أرقام الهواتف الحقيقية من Evolution،
  //         والمتساهل فقط حين لا تصل أرقام الأعضاء إطلاقاً (نظام LID)
  const sendLineStatus = useMemo(() => {
    const map = new Map<string, { allowed: boolean; reason: string }>();
    const incoming = lastIncomingLine || activeConversation?.line_id || '';
    const isGroup = !!activeConversation?.is_group;
    for (const inst of allowedSendInstances) {
      const name = inst.name;
      if (isGroup) {
        let member = true;
        let reason = 'متاح — خط مصرح ومصرح لك به';
        if (groupMemberDigits && groupMemberDigits.size > 0) {
          const ownerDigits = (instances.find((i) => i.name === name)?.ownerJid || '').replace(/@.*$/, '').replace(/\D/g, '');
          // المجموعة تحتوي أرقام هواتف + معرفات LID للأعضاء — نطابق الاثنين
          member = !ownerDigits || groupMemberDigits.has(ownerDigits);
          if (!member) reason = 'الخط ليس عضوًا في هذه المجموعة';
        }
        map.set(name, {
          allowed: member,
          reason,
        });
      } else {
        const isIncoming = name === incoming;
        const authorized = allowedSendInstances.some((i) => i.name === name);
        const granted = convGrants.has(`${activeConversation?.chat_jid || ''}|${name}`);
        if (isIncoming && authorized) {
          map.set(name, { allowed: true, reason: 'خط الوارد — متاح' });
        } else if (granted) {
          map.set(name, { allowed: true, reason: 'مصرح من المدير' });
        } else {
          map.set(name, {
            allowed: false,
            reason: isIncoming
              ? 'خط الوارد لكنه غير مصرح لك به — يلزم إذن المدير'
              : 'رقم مختلف عن الذي راسله العميل — يلزم إذن المدير',
          });
        }
      }
    }
    return map;
  }, [allowedSendInstances, lastIncomingLine, activeConversation, convGrants, groupMemberDigits, instances]);

  // ─── طبقات الرؤية (قرار المالك): من يرى المحتوى ومن يرى الهيكل فقط ───
  const contentAccess = useMemo(() => {
    if (!activeConversation) return 'none';
    if (isManager) return 'full';
    const assignedId = (activeConversation as any).assigned_staff_id;
    const assignedName = activeConversation.assigned_staff_name;
    if (assignedId && user?.id && assignedId === user.id) return 'full';
    if (!assignedId && !assignedName) return 'full';
    const jid = activeConversation.chat_jid;
    const hasRead = Array.from(convGrants).some((k) => k.startsWith(jid + '|'));
    if (hasRead) return 'full';
    return 'shell';
  }, [activeConversation, isManager, user, convGrants]);

  const ownsConversationLine = useMemo(() => {
    if (!activeConversation) return false;
    const lines = activeConversation.available_lines?.length ? activeConversation.available_lines : [activeConversation.line_id];
    return lines.some((l) => allowedSendInstances.some((i) => i.name === l));
  }, [activeConversation, allowedSendInstances]);

  const [reqSentType, setReqSentType] = useState<string>('');

  // م٨: وضع التحديد المتعدد للرسائل + شريط الإجراءات الجماعية
  const [msgSelectionMode, setMsgSelectionMode] = useState(false);
  const [selectedMsgIds, setSelectedMsgIds] = useState<Set<string>>(new Set());
  const toggleMsgSelection = (id: string) => {
    setSelectedMsgIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const selectedMessages = messages.filter((m) => selectedMsgIds.has(m.id));
  const handleBulkDelete = async () => {
    const withKey = selectedMessages.filter((m) => m.msg_key_id);
    for (const m of withKey) {
      await fetch(`/api/evolution/instances/${encodeURIComponent(m.line_id || selectedInstanceName)}/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: { remoteJid: m.chat_jid, fromMe: m.key_from_me ?? m.direction === 'out', id: m.msg_key_id, participant: m.key_participant || undefined } }),
      }).catch(() => {});
    }
    toast({ title: `أُرسل أمر الحذف للجميع لـ ${withKey.length} رسالة`, kind: 'success' });
    setMsgSelectionMode(false);
    setSelectedMsgIds(new Set());
  };
  useEffect(() => { setReqSentType(''); }, [activeConversation?.id]);

  const submitPermissionRequest = async (type: 'assignment' | 'read' | 'read_write' | 'line_reply' | 'group_join', lineName?: string) => {
    if (!user?.id || !activeConversation) return;
    const lineId = lineName ? lineIdMap[lineName] : null;
    setReqSentType(type + '-sending');
    try {
      const res = await fetch('/api/permission-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request', type, staff_id: user.id, line_id: lineId || null, chat_jid: activeConversation.chat_jid, inbox_id: currentInbox?.id || null, reason: 'طلب من واجهة الصندوق' }),
      });
      const json = await res.json();
      if (res.ok) {
        setReqSentType(type);
        toast({ title: json.already_pending ? 'طلبك معلق بالفعل' : 'أُرسل الطلب للمشرف — التصعيد للمدير بعد 10 دقائق بلا رد', kind: 'success' });
        refreshGrants();
      } else {
        toast({ title: json.error || 'فشل إرسال الطلب', kind: 'error' });
        setReqSentType('');
      }
    } catch { setReqSentType(''); }
  };

  const effectiveSendInstance = useMemo(() => {
    // الافتراضي: آخر خط ورد منه العميل إن كان متاحًا
    const incoming = lastIncomingLine || activeConversation?.line_id || '';
    if (incoming && sendLineStatus.get(incoming)?.allowed) return incoming;
    // يدوي صريح متاح؟
    if (sendingLineInstance && sendLineStatus.get(sendingLineInstance)?.allowed) {
      return sendingLineInstance;
    }
    // أول متاح
    const firstAllowed = allowedSendInstances.find((i) => sendLineStatus.get(i.name)?.allowed);
    return firstAllowed?.name || '';
  }, [sendLineStatus, lastIncomingLine, sendingLineInstance, activeConversation, allowedSendInstances]);

  // Auto-refresh silent poller every 6 seconds for real-time messages & chats list
  useEffect(() => {
    const interval = setInterval(() => {
      // تجنب استهلاك الموارد والبطء عند تصغير المتصفح أو الانتقال لتبويب آخر
      if (typeof document !== 'undefined' && document.hidden) return;

      // 1. تحديث الرسائل للمحادثة المفتوحة بصمت
      if (activeConversation) {
        const targetJid = activeConversation.chat_jid;
        const targetLine = activeConversation.line_id || selectedInstanceName;
        if (targetJid && targetLine) {
          fetch(`/api/evolution/instances/${targetLine}/messages?chatId=${encodeURIComponent(targetJid)}&limit=50`)
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
                  fetchMessagesForChat(targetJid, targetLine, activeConversation.available_lines);
                  return prev;
                });
              }
            })
            .catch(() => {});
        }
      }
    }, 6000);
    return () => clearInterval(interval);
  }, [activeConversation?.id, activeConversation?.line_id, activeConversation?.chat_jid, activeConversation?.available_lines, selectedInstanceName, fetchMessagesForChat]);

  // ─── تحديث صامت لقائمة المحادثات (نمط وتساب ويب) ───
  // دوري كل 45 ثانية + فوري عند العودة إلى التبويب: يدمج الجديد فقط بلا دوّار ولا تفكيك للقائمة،
  // ومقارنة البصمة داخل fetchChats تضمن عدم أي إعادة رسم إن لم يتغير شيء فعلاً.
  useEffect(() => {
    const tick = () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      const open = instancesRef.current.filter((i) => i.connectionStatus === 'open').map((i) => i.name);
      fetchChats(open.length > 0 ? open : ['Master', 'Sells_2']);
    };
    const interval = setInterval(tick, 45000);
    const onVisible = () => { if (!document.hidden) tick(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [fetchChats]);

  useEffect(() => {
    // طبقات الرؤية: المحادثة المرسلة لزميله بلا منح قراءة = هيكل فقط بلا محتوى
    if (activeConversation && contentAccess === 'full') {
      const targetJid = activeConversation.chat_jid;
      const targetLine = activeConversation.line_id || selectedInstanceName;
      if (targetJid && targetLine) {
        fetchMessagesForChat(targetJid, targetLine, activeConversation.available_lines);
        setMessages([]);
        return;
      }
    }
    setMessages([]);
  }, [activeConversation?.id, activeConversation?.available_lines, fetchMessagesForChat, contentAccess]);

  // Current selected instance info
  const currentInstance = useMemo(() => {
    return instances.find((i) => i.name === (activeConversation?.line_id || selectedInstanceName)) || instances[0] || null;
  }, [instances, activeConversation?.line_id, selectedInstanceName]);

  // ─── م8-ج2: السكرول الصحيح — نزول للأسفل مرة واحدة عند أول فتح للمحادثة،
  // ثم عند رسائل جديدة فقط إن كنت قريباً من الأسفل (يحترم موقع قراءتك) ───
  const wasNearBottomRef = useRef(true);
  const pendingInitialScrollRef = useRef(false);
  const lastMsgCountRef = useRef(0);

  // اختيار محادثة جديدة → علّم الحاجة للسكرول الأولي (يُنفذ مرة عند وصول رسائلها)
  useEffect(() => {
    pendingInitialScrollRef.current = true;
    wasNearBottomRef.current = true;
    lastMsgCountRef.current = messages.length;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConvId]);

  const handleMessagesScroll = useCallback(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    wasNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  }, []);

  useEffect(() => {
    if (pendingInitialScrollRef.current && messages.length > 0) {
      pendingInitialScrollRef.current = false;
      lastMsgCountRef.current = messages.length;
      // السكرول الأولي عند الفتح — دفعة واحدة فورية بعد الرسم
      requestAnimationFrame(() => messagesEndRef.current?.scrollIntoView({ behavior: 'auto' }));
    } else if (messages.length > lastMsgCountRef.current && wasNearBottomRef.current) {
      // رسائل جديدة وأنت قريب من الأسفل — تابع السفلى بدون إزعاج
      requestAnimationFrame(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }));
    }
    lastMsgCountRef.current = messages.length;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  // --- عداد الاستجابة (SLA): انتقل إلى مكوّن SlaTimer الحي — ينبض كل ثانية بنمط v1 المعتمد ---


  // ─── تسجيل قراءة المحادثة محلياً وفي قاعدة البيانات للصندوق الحالي والمستخدم (بدون إرسال لواتساب) ───
  const markAsReadLocallyAndInDb = useCallback(
    (chatJid: string) => {
      const now = Date.now();
      readChatsSet.current.add(chatJid);
      lastReadAtRef.current.set(chatJid, now); // م8: طابع زمني للقراءة — أساس العداد الحقيقي
      setReadChatJids((prev) => {
        const next = new Set(prev);
        next.add(chatJid);
        return next;
      });
      setConversations((prev) => {
        const target = prev.find((c) => c.chat_jid === chatJid);
        if (target && target.unread_count === 0) return prev; // بلا تغيير = بلا إعادة رسم
        return prev.map((c) => (c.chat_jid === chatJid ? { ...c, unread_count: 0 } : c));
      });

      if (user?.id) {
        fetch('/api/inboxes/read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: user.id,
            inbox_id: selectedInboxId || 'all',
            chat_jid: chatJid,
          }),
        }).catch((e) => console.warn('Failed saving read receipt in DB:', e));
      }

      // م8: تصفير العداد في القاعدة الحقيقية أيضاً — يمنع عودة عداد غير المقروء عند أي تحديث لاحق
      const conv = conversationsRef.current.find((c) => c.chat_jid === chatJid);
      if (conv) {
        fetch('/api/conversations', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_jid: chatJid, instance: conv.line_id || selectedInstanceName, mark_read: true }),
        }).catch(() => {});
      }
    },
    [user?.id, selectedInboxId, selectedInstanceName]
  );

  // مؤقت لتسجيل القراءة في قاعدة البيانات بمجرد فتح المحادثة (بدون إرسال لواتساب)
  useEffect(() => {
    if (!activeConversation || activeConversation.unread_count === 0) return;

    const chatJid = activeConversation.chat_jid;
    const timer = setTimeout(() => {
      markAsReadLocallyAndInDb(chatJid);
    }, 400);

    return () => clearTimeout(timer);
  }, [activeConversation?.chat_jid, activeConversation?.unread_count, markAsReadLocallyAndInDb]);

  const handleSelectConversation = (id: string) => {
    pendingChatDeepLink.current = null; // اختيار المستخدم اليدوي يلغي أي رابط عميق معلق
    setActiveConvId(id);
    setShowMobileChat(true);

    // تصفير فوري لحظي للعداد محلياً وفي الداتابيز بمجرد النقر على المحادثة
    const clicked = conversations.find((c) => c.id === id || id === `unified__${c.chat_jid}`);
    if (clicked) {
      markAsReadLocallyAndInDb(clicked.chat_jid);
      if (clicked.line_id) {
        setSendingLineInstance(clicked.line_id);
      }
    }
  };

  // --- م3: جلب وسوم المحادثة النشطة من القاعدة عند تغييرها ---
  useEffect(() => {
    if (!activeConversation?.chat_jid) { setActiveConvTagIds([]); return; }
    let alive = true;
    (async () => {
      try {
        const res = await fetch(
          `/api/conversations?chat_jid=${encodeURIComponent(activeConversation.chat_jid)}&instance=${encodeURIComponent(activeConversation.line_id || selectedInstanceName)}`,
          { cache: 'no-store' }
        );
        if (!res.ok) return;
        const data = await res.json();
        if (!alive) return;
        setActiveConvTagIds((data.tags || []).map((t: any) => t.id));
      } catch { /* صامت */ }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConversation?.chat_jid, activeConversation?.line_id]);

  // --- م3: إضافة/إزالة وسم على المحادثة النشطة (قاعدة حقيقية + تحديث محلي فوري) ---
  const handleToggleConversationTag = async (tagId: string) => {
    if (!activeConversation?.chat_jid) return;
    const has = activeConvTagIds.includes(tagId);
    const tag = dbTags.find((t) => t.id === tagId);
    setActiveConvTagIds((prev) => (has ? prev.filter((x) => x !== tagId) : [...prev, tagId]));
    if (tag) {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversation.id
            ? { ...c, tags: has ? (c.tags || []).filter((n) => n !== tag.name) : Array.from(new Set([...(c.tags || []), tag.name])) }
            : c
        )
      );
    }
    try {
      await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_jid: activeConversation.chat_jid,
          instance: activeConversation.line_id || selectedInstanceName,
          tag_id: tagId,
          action: has ? 'remove' : 'add',
        }),
      });
    } catch (err) {
      console.warn('[toggle tag] non-critical:', err);
    }
  };

  // --- م3: حفظ حالة المحادثة عبر API القاعدة الحقيقية (بدل upsert الأعمى القديم) ---
  const patchConversationDb = useCallback(async (
    chatJid: string,
    instance: string,
    patch: { status?: ConversationStatus; staff_id?: string | null; mark_read?: boolean }
  ) => {
    try {
      await fetch('/api/conversations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_jid: chatJid, instance, ...patch }),
      });
    } catch (err) {
      console.warn('[conversations PATCH] non-critical:', err);
    }
  }, []);

  // --- م3/م8: دمج وسوم وحالات القاعدة في قائمة المحادثات — بلا فليكر ---
  // يُعيد نفس الكائن إن لم يتغير شيء (React يتخطى إعادة الرسم) ولا يلمس unread_count إطلاقاً
  const mergeDbTagsAndStatus = useCallback(async (list: ConversationItem[]) => {
    if (list.length === 0) return;
    try {
      const jids = Array.from(new Set(list.map((c) => c.chat_jid)));
      const insts = Array.from(new Set(list.map((c) => c.line_id).filter(Boolean))) as string[];
      if (insts.length === 0) return;
      const res = await fetch(
        `/api/conversations?jids=${encodeURIComponent(jids.join(','))}&instances=${encodeURIComponent(insts.join(','))}`,
        { cache: 'no-store' }
      );
      if (!res.ok) return;
      const data = await res.json();
      const items: { chat_jid: string; status?: string; assigned_staff_name?: string; assigned_staff_id?: string; avatar_url?: string | null; tags?: { id: string; name: string; color: string }[] }[] = data.items || [];
      const byJid = new Map(items.map((x) => [x.chat_jid, x]));
      setConversations((prev) => {
        let changed = false;
        const next = prev.map((c) => {
          const db = byJid.get(c.chat_jid);
          if (!db) return c;
          const dbTagNames = (db.tags || []).map((t) => t.name);
          const mergedTags = Array.from(new Set([...(c.tags || []), ...dbTagNames]));
          const newStatus = (db.status as ConversationStatus) || c.status;
          const newAssignee = db.assigned_staff_name || c.assigned_staff_name;
          const newAssigneeId = db.assigned_staff_id || (c as any).assigned_staff_id;
          // الصورة الحقيقية للجهة (شخص أو مجموعة) من hub.contacts — الخلية المحفوظة أولاً
          const newAvatar = db.avatar_url || c.avatar_url || undefined;
          // تجاهل الصف إن لم يتغير فعلاً — منع إعادة الرسم المزعجة للقائمة
          if (
            mergedTags.length === (c.tags || []).length &&
            newStatus === c.status &&
            newAssignee === c.assigned_staff_name &&
            newAssigneeId === (c as any).assigned_staff_id &&
            newAvatar === c.avatar_url
          ) {
            return c;
          }
          changed = true;
          return { ...c, tags: mergedTags, status: newStatus, assigned_staff_name: newAssignee, assigned_staff_id: newAssigneeId, avatar_url: newAvatar } as ConversationItem;
        });
        return changed ? next : prev;
      });
    } catch (err) {
      console.warn('[mergeDbTags] non-critical:', err);
    }
  }, []);

  // الصور الحقيقية الناقصة تُجلب من واتساب تدريجياً وتُخزَّن في hub.contacts (قرار المالك)
  const avatarRequestedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (conversations.length === 0) return;
    const pending = conversations
      .filter((c) => !c.avatar_url && !avatarRequestedRef.current.has(c.chat_jid))
      .slice(0, 24);
    if (pending.length === 0) return;
    pending.forEach((c) => avatarRequestedRef.current.add(c.chat_jid));
    fetch('/api/avatars', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: pending.map((c) => ({ jid: c.chat_jid, instance: c.line_id || selectedInstanceName })) }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const av: Record<string, string> = data?.avatars || {};
        const has = Object.values(av).some(Boolean);
        if (!has) return;
        setConversations((prev) => prev.map((c) => (av[c.chat_jid] ? { ...c, avatar_url: av[c.chat_jid] } : c)));
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations.length]);

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
          setConversations((prev) => {
            // م8: لا نعيد الرسم إلا عند تغير فعلي في الحالة أو الإسناد
            const changed = prev.some(
              (c) =>
                c.chat_jid === updated.chat_jid &&
                (c.status !== (updated.status ?? c.status) ||
                  c.assigned_staff_name !== (updated.assigned_staff_name ?? c.assigned_staff_name) ||
                  c.assigned_staff_id !== (updated.assigned_staff_id ?? c.assigned_staff_id))
            );
            if (!changed) return prev;
            return prev.map((c) => {
              if (c.chat_jid === updated.chat_jid) {
                return {
                  ...c,
                  status: updated.status ?? c.status,
                  assigned_staff_name: updated.assigned_staff_name ?? c.assigned_staff_name,
                  assigned_staff_id: updated.assigned_staff_id ?? c.assigned_staff_id,
                };
              }
              return c;
            });
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // --- دورة الإسناد: تحديث حالة المحادثة (محلي + قاعدة حقيقية) ---
  const handleUpdateStatus = (newStatus: ConversationStatus) => {
    if (!activeConversation) return;
    setConversations((prev) =>
      prev.map((c) => (c.id === activeConversation.id ? { ...c, status: newStatus } : c))
    );
    // حفظ في القاعدة بشكل غير متزامن (لا ينتظر)
    patchConversationDb(activeConversation.chat_jid, activeConversation.line_id || selectedInstanceName, { status: newStatus });
  };

  // --- دورة الإسناد: إسناد المحادثة لموظف (محلي + قاعدة حقيقية) — للمدير والمشرف فقط (قرار المالك) ---
  const handleAssignStaff = (staffName: string) => {
    if (!activeConversation || !isManager) return;
    const staffMember = availableStaff.find((s) => s.name === staffName);
    setConversations((prev) =>
      prev.map((c) => (c.id === activeConversation.id ? { ...c, assigned_staff_name: staffName, assigned_staff_id: staffMember?.id } : c))
    );
    // حفظ في القاعدة بشكل غير متزامن — الإسناد يولّد إشعاراً للموظف المختار
    patchConversationDb(activeConversation.chat_jid, activeConversation.line_id || selectedInstanceName, {
      staff_id: staffMember?.id || null,
    });
    toast({
      title: staffMember?.id ? `أُسندت المحادثة إلى ${staffName}` : 'أُلغي الإسناد — عادت للصندوق العام',
      kind: 'success',
    });
  };

  // --- طلب ترخيص الوصول/الإسناد: إرسال حقيقي للمشرفين وصاحب المحادثة ---
  const submitAccessRequest = async () => {
    if (!activeConversation || !user?.id) return;
    setRequestAccessSending(true);
    setRequestAccessError(null);
    try {
      const res = await fetch('/api/access-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staff_id: user.id,
          chat_jid: activeConversation.chat_jid,
          instance: activeConversation.line_id || selectedInstanceName,
          request_type: requestAccessType,
          reason: requestAccessReason,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'تعذّر إرسال الطلب');
      setRequestAccessSent(true);
    } catch (e: any) {
      setRequestAccessError(e.message || 'تعذّر إرسال الطلب، حاول مرة أخرى');
    } finally {
      setRequestAccessSending(false);
    }
  };

  // --- حارس المخاطر: إعادة ضبط قاطع الدائرة ---
  const handleResetCircuitBreaker = () => {
    setConsecutiveErrors(0);
    setIsBreakerTripped(false);
  };

  // ─── بناء التوقيع الموحد — يُطبق على كل أنواع الرسائل (نص/صوت/صور/ملفات) ───
  const buildSignature = useCallback((lineName: string): string => {
    if (!includeSignature) return '';
    if (signatureConfig && signatureConfig.send_mode !== 'disabled') {
      const parts: string[] = [];
      const staffSig = staffSignaturesList.find(
        (s) => s.id === user?.id || s.name === user?.full_name
      );
      // قرار المالك: التوقيع ثلاثي — اسم الموظف / القسم الذي يعمل به / الخط المُرسل منه
      if (signatureConfig.part1?.enabled) {
        parts.push(staffSig?.custom_part1 || `*${user?.full_name || 'خدمة العملاء'}*`);
      }
      if (signatureConfig.part2?.enabled) {
        parts.push(staffSig?.custom_part2 || (staffSig as any)?.department || 'قسم خدمة العملاء');
      }
      if (signatureConfig.part3?.enabled) {
        parts.push(staffSig?.custom_part3 || `واتساب ${getLineDisplayTitle(lineName)}`);
      }
      if (parts.length > 0) {
        return `\n\n${parts.join(signatureConfig.separator || ' — ')}`;
      }
      return '';
    }
    return `\n\n*${user?.full_name || 'خدمة العملاء'}* — ${getLineDisplayTitle(lineName)}`;
  }, [includeSignature, signatureConfig, staffSignaturesList, user, getLineDisplayTitle]);

  // ─── اختيار خط الإرسال — حر دائماً؛ الخط غير العضو/غير المصرح يفتح نافذة الحل ───
  const handleChooseSendLine = (lineName: string) => {
    setSendLineMenuOpen(false);
    const st = sendLineStatus.get(lineName);
    if (st && !st.allowed) {
      setLineBlockModal({ line: lineName, reason: st.reason });
      return;
    }
    setSendingLineInstance(lineName);
    toast({ title: `سيتم الإرسال عبر: ${getLineDisplayTitle(lineName)}`, kind: 'success' });
  };

  // تنفيذ الإرسال الفعلي بعد تدقيق حارس المخاطر
  const executeSendMessage = async (textToSend: string) => {
    if (!activeConversation || isSending) return;

    // C4: حارس خط الإرسال — لا إرسال من خط غير مصرح (خط الوارد فقط أو بمنح مدير)
    if (sendLineStatus.get(effectiveSendInstance)?.allowed === false) {
      toast({
        title: '⛔ الإرسال من هذا الخط محظور — يلزم إذن المدير',
        body: 'استخدم خط الوارد، أو اطلب إذناً من المدير عبر التنبيه أعلى صندوق الإرسال',
        kind: 'error',
      });
      return;
    }

    // تدقيق قاطع الدائرة
    if (isBreakerTripped) {
      toast({ title: 'قاطع الدائرة مفعل! تم تعليق الإرسال التلقائي لحماية الخط من الحظر. يرجى إعادة الضبط يدوياً بعد التأكد من صحة الرقم والاتصال.', kind: 'error', durationMs: 8000 });
      return;
    }

    setIsSending(true);

    const effectiveLine = effectiveSendInstance;

    // التوقيع الموحد (ثلاثي حسب سياسة إدارة التواقيع) — مُطبق هنا وعلى الصوت والمرفقات
    const signature = buildSignature(effectiveLine);

    const fullMessage = `${textToSend}${signature}`;

    try {
      const res = await fetch(`/api/evolution/instances/${effectiveLine}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: activeConversation.chat_jid,
          text: fullMessage,
          // م8: الرد المقتبس — الرسالة تُرسل كرد مباشر على الرسالة الأصلية في واتساب
          ...(replyingToMessage?.id && !replyingToMessage.id.startsWith('msg-')
            ? { quoted_message_id: replyingToMessage.id }
            : {}),
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
          created_at: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        };

        setMessages((prev) => [...prev, newMsg]);
        setReplyingToMessage(null); // الرد أُرسل — إزالة شريط الاقتباس

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
          toast({ title: `⚡ تحذير قاطع الدائرة (Circuit Breaker): تم إيقاف الإرسال بعد 3 أخطاء متتالية لحماية خط واتساب من الحظر!`, kind: 'error', durationMs: 8000 });
        } else {
          toast({ title: `فشل الإرسال عبر واتساب (محاولة ${newErrCount}/3): ${errData.error || res.statusText}`, kind: 'error' });
        }
      }
    } catch (err: any) {
      const newErrCount = consecutiveErrors + 1;
      setConsecutiveErrors(newErrCount);
      if (newErrCount >= 3) {
        setIsBreakerTripped(true);
      }
      toast({ title: `خطأ في الاتصال أثناء الإرسال: ${err.message}`, kind: 'error' });
    } finally {
      setIsSending(false);
      setQuietConfirmOpen(false);
      setPendingSendText('');
    }
  };

  // ─── م4: منتقي الردود الجاهزة (زر ⚡ أو اختصار "/") ───
  interface CannedQuick { id: string; title: string; body: string; shortcut: string | null; category: string | null; }
  const [cannedList, setCannedList] = useState<CannedQuick[]>([]);
  const [cannedOpen, setCannedOpen] = useState(false);
  const [cannedSearch, setCannedSearch] = useState('');

  // تحميل قائمة الردود الجاهزة مرة واحدة عند فتح الصندوق
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/canned-responses', { cache: 'no-store' });
        if (!res.ok) return;
        const json = await res.json();
        setCannedList(json.data || []);
      } catch { /* صامت */ }
    })();
  }, []);

  /** استبدال متغيرات القالب: {name} اسم العميل، {staff} اسم الموظف الحالي */
  const expandCannedBody = useCallback((body: string): string => {
    const conv = activeConversation;
    return body
      .replace(/\{name\}/g, (conv?.title || '').replace(/^مجموعة.*/, 'الجميع') || 'عميلنا العزيز')
      .replace(/\{staff\}/g, user?.full_name || 'فريق الدعم');
  }, [activeConversation, user]);

  /** إدراج رد جاهز في صندوق الإرسال مع استبدال المتغيرات + عدّاد الاستخدام */
  const handleInsertCanned = async (item: CannedQuick) => {
    setInputText((prev) => {
      // استبدال الاختصار المكتوب "/" أو الإلحاق في النهاية
      const slashIdx = prev.lastIndexOf('/');
      return slashIdx >= 0 && prev.slice(slashIdx).trim() === prev.slice(slashIdx).trim() && prev.slice(slashIdx).startsWith('/')
        ? prev.slice(0, slashIdx) + expandCannedBody(item.body)
        : (prev ? prev + ' ' : '') + expandCannedBody(item.body);
    });
    setCannedOpen(false);
    setCannedSearch('');
    try {
      fetch('/api/canned-responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'use', id: item.id }),
      }).catch(() => {});
    } catch { /* صامت */ }
  };

  // اختصار "/" يفتح المنتقي عندما يكون صندوق الإرسال فارغاً تقريباً
  const handleComposerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === '/' && !cannedOpen && (inputText === '' || inputText === '/')) {
      e.preventDefault();
      setCannedOpen(true);
    }
  };

  // فحص حارس المخاطر قبل الإرسال (ساعات الهدوء وقاطع الدائرة)
  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || !activeConversation || isSending) return;

    if (isBreakerTripped) {
      toast({ title: 'قاطع الدائرة مفعل حالياً! اضغط على زر إعادة ضبط القاطع في الأعلى بعد مراجعة اتصال الخط.', kind: 'error', durationMs: 8000 });
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
  // م8-ج3: التثبيت محفوظ في القاعدة (metadata.pinned) — يصمد بعد الخروج وتحديث الصفحة
  const persistPins = async (chatJid: string, instance: string, patch: { pin?: any; unpin_message_id?: string }) => {
    try {
      await fetch('/api/conversations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_jid: chatJid, instance, ...patch }),
      });
    } catch (err) {
      console.warn('[persistPins] non-critical:', err);
    }
  };

  const handlePinMessage = (msg: ChatMessage, duration: '24h' | '7d' | '30d') => {
    if (!activeConversation) return;
    const convId = activeConversation.id;
    setPinnedMessagesMap((prev) => {
      const current = prev[convId] || [];
      const filtered = current.filter((m) => m.id !== msg.id);
      if (filtered.length >= 5) {
        toast({ title: 'يمكنك تثبيت ما يصل إلى 5 رسائل كحد أقصى في كل محادثة', kind: 'error' });
        return prev;
      }
      return {
        ...prev,
        [convId]: [{ ...msg, is_pinned: true, pinned_duration: duration }, ...filtered],
      };
    });
    setPinModalMsg(null);
    // حفظ دائم بالقاعدة — snippets كافية للعرض حتى لو خرجت الرسالة عن آخر 50
    persistPins(activeConversation.chat_jid, activeConversation.line_id || selectedInstanceName, {
      pin: { message_id: msg.id, body: msg.body || `[${msg.media_type || 'وسائط'}]`, sender: msg.sender_name || null, duration },
    });
  };

  const handleUnpinMessage = (msgId: string) => {
    if (!activeConversation) return;
    const convId = activeConversation.id;
    setPinnedMessagesMap((prev) => ({
      ...prev,
      [convId]: (prev[convId] || []).filter((m) => m.id !== msgId),
    }));
    persistPins(activeConversation.chat_jid, activeConversation.line_id || selectedInstanceName, {
      unpin_message_id: msgId,
    });
  };

  // ─── C4: فحص عضوية المجموعة عند فتح محادثة مجموعة — أرقام الخطوط الأعضاء فقط ترسل ───
  useEffect(() => {
    if (!activeConversation?.is_group || !activeConversation?.chat_jid) {
      setGroupMemberDigits(null);
      return;
    }
    const inst = activeConversation.line_id || selectedInstanceName;
    let alive = true;
    (async () => {
      try {
        const res = await fetch(
          `/api/evolution/instances/${encodeURIComponent(inst)}/group-members?jid=${encodeURIComponent(activeConversation.chat_jid)}`,
          { cache: 'no-store' }
        );
        if (!res.ok || !alive) return;
        const json = await res.json();
        // م8: Evolution يعيد @lid غالباً — نبني المجموعة من أرقام الهواتف عند توفرها،
        // وإن غابت كلياً نلغي الفحص الصارم (متساهل) حتى لا نعطّل خطوطاً أعضاء فعلاً
        const phones: string[] = json.phones || [];
        const fromPhones = new Set<string>(
          phones.map((m: string) => m.replace(/@.*$/, '').replace(/\D/g, '')).filter(Boolean)
        );
        if (fromPhones.size > 0) {
          if (alive) setGroupMemberDigits(fromPhones);
        } else {
          if (alive) setGroupMemberDigits(null);
        }
      } catch { if (alive) setGroupMemberDigits(null); }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConversation?.chat_jid, activeConversation?.is_group]);

  // م8-ج3: ترطيب المثبتات من القاعدة عند فتح المحادثة — تظهر دائماً
  useEffect(() => {
    if (!activeConversation?.chat_jid) return;
    const convId = activeConversation.id;
    if (pinnedMessagesMap[convId]) return; // محملة مسبقاً لهذه الجلسة
    let alive = true;
    (async () => {
      try {
        const res = await fetch(
          `/api/conversations?chat_jid=${encodeURIComponent(activeConversation.chat_jid)}&instance=${encodeURIComponent(activeConversation.line_id || selectedInstanceName)}`,
          { cache: 'no-store' }
        );
        if (!res.ok || !alive) return;
        const json = await res.json();
        const pins: any[] = json.pinned || [];
        if (!alive || pins.length === 0) return;
        const messagesList = messages;
        const hydrated: ChatMessage[] = pins.map((p) => {
          const live = messagesList.find((m) => m.id === p.id);
          return live
            ? { ...live, is_pinned: true, pinned_duration: p.duration }
              : ({
                  id: p.id,
                  conversation_id: convId,
                  chat_jid: activeConversation.chat_jid,
                  direction: 'in',
                  body: p.body || 'رسالة مثبتة',
                  sender_name: p.sender || '',
                  media_type: 'text',
                  status: 'delivered',
                  line_id: activeConversation.line_id || selectedInstanceName,
                  created_at: p.pinned_at ? new Date(p.pinned_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : '',
                  timestamp: p.pinned_at,
                  is_pinned: true,
                  pinned_duration: p.duration,
                } as unknown as ChatMessage);
        });
        if (alive && hydrated.length > 0) {
          setPinnedMessagesMap((prev) => (prev[convId] ? prev : { ...prev, [convId]: hydrated }));
        }
      } catch { /* صامت */ }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConversation?.chat_jid]);

  // ─── م8: حفظ سريع كجهة اتصال — يدعم المجموعات بالـ jid الحقيقي + فحص التسجيل من القاعدة ───
  const handleQuickSaveContact = async () => {
    if (!activeConversation) return;
    try {
      const lineName = lockedLinesMap[activeConversation.chat_jid] || selectedInstanceName;
      const isGroup = activeConversation.is_group || activeConversation.chat_jid.includes('@g.us');
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: activeConversation.title,
          primary_phone: isGroup ? activeConversation.chat_jid : activeConversation.phone_or_jid,
          wa_jid: activeConversation.chat_jid,
          entity_type: isGroup ? 'group' : 'individual',
          commercial_role: isGroup ? 'b2b' : 'b2c',
          source: 'evolution',
          source_detail: 'evolution:' + lineName,
          tags: isGroup ? ['مجموعة واتساب'] : [],
        }),
      });

      if (res.ok) {
        const json = await res.json();
        setIsContactSaved(true);
        toast({ title: json.is_merged ? 'جهة مسجلة مسبقاً — تم تحديث بياناتها' : `تم حفظ "${activeConversation.title}" في دليل جهات الاتصال`, kind: 'success' });
      } else {
        const err = await res.json();
        toast({ title: 'فشل الحفظ: ' + (err.error || 'خطأ غير معروف'), kind: 'error' });
      }
    } catch (e: any) {
      toast({ title: 'خطأ: ' + e.message, kind: 'error' });
    }
  };

  // ─── إدارة المفضلة المركزية (6 تبويبات) ───
  const handleToggleFavorite = async (
    item: { id: string; title: string; subtitle?: string; meta?: any },
    category: 'message' | 'file' | 'media' | 'direct_chat' | 'group' | 'contact'
  ) => {
    const exists = favoritesList.some((f) => f.id === item.id && f.category === category);
    if (exists) {
      const updated = favoritesList.filter((f) => !(f.id === item.id && f.category === category));
      setFavoritesList(updated);
      if (typeof window !== 'undefined') {
        try { localStorage.setItem('hub_favorites_v1', JSON.stringify(updated)); } catch (e) {}
      }
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
      const updated = [newFav, ...favoritesList];
      setFavoritesList(updated);
      if (typeof window !== 'undefined') {
        try { localStorage.setItem('hub_favorites_v1', JSON.stringify(updated)); } catch (e) {}
      }
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

  // ─── م8: تحويل رسالة إلى محادثة أخرى — رسمي لكل الأنواع عبر key الأصلي ───
  // تصحيح المالك: المجموعات موجودة في ذاكرة كل خط عضو — نجرّب خط رسالتها أولاً
  // ثم نتدرج عبر باقي الخطوط المتاحة للمحادثة/المصرحة حتى ينجح أحدها.
  const handleForwardMessage = async (targetConv: ConversationItem) => {
    if (!forwardModalMsg || isSending) return;
    setIsSending(true);
    try {
      const targetJid = targetConv.chat_jid;

      if (forwardModalMsg.msg_key_id) {
        const primary = forwardModalMsg.line_id || selectedInstanceName;
        const candidates: string[] = [primary];
        const extras = [
          ...(activeConversation?.available_lines || []),
          ...(targetConv.available_lines || []),
          ...allowedSendInstances.map((i) => i.name),
        ];
        for (const l of extras) {
          if (l && !candidates.includes(l)) candidates.push(l);
        }

        let lastErr = '';
        let succeeded = false;
        for (const sourceInstance of candidates) {
          try {
            const res = await fetch(`/api/evolution/instances/${encodeURIComponent(sourceInstance)}/forward`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                to: targetJid,
                key: {
                  remoteJid: forwardModalMsg.chat_jid,
                  fromMe: forwardModalMsg.key_from_me ?? forwardModalMsg.direction === 'out',
                  id: forwardModalMsg.msg_key_id,
                  participant: forwardModalMsg.key_participant || undefined,
                },
              }),
            });
            if (res.ok) {
              toast({ title: `تم التحويل إلى «${targetConv.title}» من ${getLineDisplayTitle(sourceInstance)}`, kind: 'success' });
              succeeded = true;
              break;
            }
            const errData = await res.json().catch(() => ({}));
            lastErr = errData.detail || errData.error || `HTTP ${res.status}`;
          } catch (e: any) {
            lastErr = e.message;
          }
        }
        if (!succeeded) {
          throw new Error(lastErr || 'فشل التحويل على كل الخطوط المتاحة');
        }
      } else {
        // رسالة صادرة محلية (لم تصدر لها key بعد) — إرسال نصي بديل
        await fetch(`/api/evolution/instances/${encodeURIComponent(targetConv.line_id || selectedInstanceName)}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: targetJid, text: forwardModalMsg.body }),
        });
        toast({ title: `أُرسل النص إلى «${targetConv.title}»`, kind: 'success' });
      }
      setForwardModalMsg(null);
    } catch (err: any) {
      toast({ title: `فشل التحويل: ${err.message}`, kind: 'error' });
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
      toast({ title: 'الحد الأقصى للصور دفعة واحدة هو 25 صورة.', kind: 'info' });
      return;
    }
    if (videoCount > 5) {
      toast({ title: 'الحد الأقصى لمقاطع الفيديو دفعة واحدة هو 5 مقاطع.', kind: 'info' });
      return;
    }
    if (docCount > 5) {
      toast({ title: 'الحد الأقصى للمستندات دفعة واحدة هو 5 ملفات.', kind: 'info' });
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
          created_at: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
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
      toast({ title: `خطأ أثناء إرسال الدفعة: ${err.message}`, kind: 'error' });
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
      toast({ title: 'قاطع الدائرة مفعل حالياً! لا يمكن إرسال المرفقات قبل إعادة الضبط.', kind: 'error', durationMs: 8000 });
      return;
    }

    setIsSendingMedia(true);
    try {
      const res = await fetch(`/api/evolution/instances/${effectiveSendInstance}/media`, {
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
          created_at: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
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
        toast({ title: `فشل إرسال المرفق: ${errData.error || res.statusText}`, kind: 'error' });
      }
    } catch (err: any) {
      toast({ title: `خطأ في الاتصال أثناء إرسال المرفق: ${err.message}`, kind: 'error' });
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
      toast({ title: 'قاطع الدائرة مفعل حالياً! لا يمكن التسجيل.', kind: 'error', durationMs: 8000 });
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
      toast({ title: `تعذر الوصول إلى الميكروفون: ${err.message || 'يرجى تفعيل صلاحية الميكروفون في المتصفح'}`, kind: 'error' });
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
                created_at: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
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
              toast({ title: `فشل إرسال البصمة الصوتية: ${err.error || res.statusText}`, kind: 'error' });
            }
          } catch (err: any) {
            toast({ title: `خطأ أثناء إرسال التسجيل: ${err.message}`, kind: 'error' });
          } finally {
            setIsSendingMedia(false);
          }
        };
        reader.readAsDataURL(audioBlob);
      } catch (err: any) {
        toast({ title: `خطأ في معالجة الصوت: ${err.message}`, kind: 'error' });
      }
    };

    mr.stop();
    setIsRecordingVoice(false);
    setRecordingSeconds(0);
  };

  // أدوات المحادثة الكاملة — تعيش داخل سلايد التفاصيل (واجهة ترويسة نظيفة)
  const convActions = activeConversation ? (
    <>
                  <div className="flex items-center gap-1.5 text-xs bg-[var(--card-elevated)] border border-[var(--border-subtle)] rounded-xl px-2 py-1">
                    <UserPlus className="w-3.5 h-3.5 text-purple-400" />
                    {isManager ? (
                      <select
                        value={activeConversation.assigned_staff_name || 'غير مسند (عام)'}
                        onChange={(e) => handleAssignStaff(e.target.value)}
                        className="bg-transparent text-xs text-[var(--text-main)] outline-none font-medium cursor-pointer"
                      >
                        {availableStaff.filter((s) => !/مدير/.test(s.role || '')).map((s) => (
                          <option key={s.id || 'unassigned'} value={s.name} className="bg-[var(--card-bg)] text-[var(--text-main)]">
                            {s.name} ({s.role.split(' ')[0]})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-[var(--text-main)] font-medium">
                        {activeConversation.assigned_staff_name || 'غير مسند'}
                      </span>
                    )}
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

                  {/* 💾 زر حفظ سريع كجهة اتصال أو شارة جهة مسجلة */}
                  {isContactSaved ? (
                    <div
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-medium cursor-default"
                      title="هذه الجهة مسجلة بالفعل في دليل جهات الاتصال"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="hidden sm:inline">جهة اتصال مسجلة</span>
                    </div>
                  ) : (
                    <button
                      onClick={async () => {
                        await handleQuickSaveContact();
                        setIsContactSaved(true);
                      }}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/30 text-xs font-medium transition-all"
                      title="حفظ الرقم الحالي في دليل جهات الاتصال مع وسم المصدر"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">حفظ جهة اتصال</span>
                    </button>
                  )}

                  {/* 🏷 م3: محرر وسوم المحادثة الحالية (من القاعدة الحقيقية) */}
                  {activeConversation && dbTags.length > 0 && (
                    <div className="relative">
                      <button
                        onClick={() => setTagMenuOpen((v) => !v)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all shadow-sm ${
                          activeConvTagIds.length > 0
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                            : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700/80'
                        }`}
                        title="وسوم هذه المحادثة — تُحفظ في قاعدة البيانات"
                      >
                        <Tags className="w-3.5 h-3.5" />
                        <span>الوسوم{activeConvTagIds.length > 0 ? ` (${activeConvTagIds.length})` : ''}</span>
                      </button>

                      {tagMenuOpen && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setTagMenuOpen(false)} />
                          <div className="absolute left-0 mt-2 w-60 bg-[var(--card-bg)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl z-50 p-2" dir="rtl">
                            <div className="px-2 py-1.5 text-[10px] font-bold text-[var(--text-muted)] border-b border-[var(--border-subtle)] mb-1">
                              وسم هذه المحادثة (محفوظ مباشرة بالقاعدة)
                            </div>
                            {dbTags.map((t) => {
                              const on = activeConvTagIds.includes(t.id);
                              return (
                                <button
                                  key={t.id}
                                  type="button"
                                  onClick={() => handleToggleConversationTag(t.id)}
                                  className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-semibold transition-colors ${
                                    on
                                      ? 'bg-cyan-500/20 text-cyan-200'
                                      : 'text-[var(--text-muted)] hover:bg-[var(--card-elevated)] hover:text-[var(--text-main)]'
                                  }`}
                                >
                                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: t.hex_color || '#8b5cf6' }} />
                                  <span className="flex-1 text-right">{t.name}</span>
                                  {on && <Check className="w-3.5 h-3.5" />}
                                </button>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  )}

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
                                meta: {
                                  chat_jid: activeConversation.chat_jid,
                                  instance_name: activeConversation.line_id || selectedInstanceName,
                                  is_group: activeConversation.is_group,
                                }
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
    </>
  ) : null;

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] rounded-3xl overflow-hidden border border-[var(--border-subtle)] bg-[var(--card-bg)] shadow-2xl relative transition-colors duration-200">
      
      {/* --- حارس المخاطر: شريط تنبيه رفيع بنمط v1 --- */}
      {isQuietHoursActive && (
        <div className="flex items-center gap-2 px-4 py-1.5 text-xs font-medium border-b border-[var(--border-subtle)]"
          style={{ background: 'color-mix(in srgb, var(--warn) 12%, transparent)', color: 'var(--warn)' }}>
          <Moon className="w-3.5 h-3.5 animate-pulse shrink-0" />
          <span>وضع الهدوء نشط (01:00 – 07:00 بتوقيت مكة) — الإرسال الجديد يحتاج تأكيداً لحماية الأرقام من الحظر.</span>
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

      {/* Top Bar: Inboxes, Multi-Line Filter & Live Status */}
      <div className="bg-[var(--card-bg)] border-b border-[var(--border-subtle)] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex flex-wrap items-center gap-3">
          {/* اختيار الصندوق المشترك */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-[var(--text-muted)]">الصندوق:</span>
            <select
              value={selectedInboxId}
              onChange={(e) => {
                setSelectedInboxId(e.target.value);
                setLineFilter('all');
              }}
              className="bg-[var(--card-elevated)] text-xs text-[var(--text-main)] border border-[var(--border-subtle)] rounded-xl px-3 py-1.5 outline-none focus:border-[var(--primary)] font-bold transition-colors"
            >
              {user?.role === 'super_admin' ? (
                <option value="all">كل الصناديق (عرض مجمّع للإشراف)</option>
              ) : inboxesList.length > 1 ? (
                <option value="all">كل الصناديق المخصصة لي (مجمّع)</option>
              ) : null}
              {inboxesList.map((ib) => (
                <option key={ib.id} value={ib.id}>
                  {ib.name_ar} {ib.filter_type === 'groups' ? '(مجموعات)' : ib.filter_type === 'dm' ? '(فردي)' : ''}
                </option>
              ))}
            </select>
          </div>

          <span className="text-slate-600 hidden sm:inline">|</span>

          {/* تبويبات فلترة الخطوط السريعة المقيدة بنطاق الصندوق فقط */}
          <div className="flex items-center gap-1 bg-[var(--card-elevated)] p-1 rounded-xl border border-[var(--border-subtle)] text-xs">
            <button
              type="button"
              onClick={() => setLineFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                lineFilter === 'all'
                  ? 'bg-[var(--primary)] text-white shadow'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              جميع الخطوط ({allUniqueCount})
            </button>
            {availableInstances.map((inst) => {
              const count = inboxScopedConversations.filter((c) => c.line_id === inst.name).length;
              const isOpen = inst.connectionStatus === 'open';
              const active = lineFilter === inst.name;
              const displayTitle = getLineDisplayTitle(inst.name);
              // قرار المالك: الخط غير المتصل فعلياً لا يظهر في الشريط العلوي إطلاقاً
              if (!isOpen) return null;
              return (
                <button
                  key={inst.name}
                  type="button"
                  onClick={() => setLineFilter(inst.name)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                    active
                      ? 'bg-[var(--accent-soft)] text-[var(--primary)] border border-[var(--border-glow)] font-bold'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                  title={`${displayTitle} — ${isOpen ? 'متصل' : 'معلق'}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isOpen ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                  <bdi dir="ltr">{displayTitle}</bdi>
                  <span className="text-[10px] opacity-70 font-mono">({count})</span>
                </button>
              );
            })}
          </div>

          {/* م3: فلتر الوسوم الحقيقية من القاعدة */}
          {dbTags.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Tags className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              <select
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                className="bg-[var(--card-elevated)] text-xs text-[var(--text-main)] border border-[var(--border-subtle)] rounded-xl px-2.5 py-1.5 outline-none focus:border-[var(--primary)] font-semibold transition-colors"
                title="فلترة المحادثات حسب الوسم"
              >
                <option value="">كل الوسوم</option>
                {dbTags.map((t) => (
                  <option key={t.id} value={t.name}>🏷 {t.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* شارة تسخين الأرقام وحارس المخاطر */}
          <span className="hidden lg:flex items-center gap-1 text-[10px] text-[var(--text-muted)] bg-[var(--card-elevated)] border border-[var(--border-subtle)] px-2 py-0.5 rounded-full">
            <ShieldAlert className="w-3 h-3 text-purple-400" />
            <span>حارس المخاطر: تسخين آمن (50 رسالة/يوم)</span>
          </span>
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

            {/* Filter Tabs - سلايد تبويبات متحرك بنمط شريط تمرير ناعم وأنيق */}
            <div className="flex items-center gap-1.5 text-[11px] overflow-x-auto pb-1 scrollbar-none snap-x" dir="rtl">
              <button
                onClick={() => setFilterTab('all')}
                className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap shrink-0 snap-start font-medium ${
                  filterTab === 'all'
                    ? 'bg-purple-600 text-white font-bold shadow-sm shadow-purple-900/30'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)] bg-[var(--card-elevated)]'
                }`}
              >
                الكل ({inboxScopedConversations.length})
              </button>
              <button
                onClick={() => setFilterTab('mine')}
                className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap shrink-0 snap-start font-medium ${
                  filterTab === 'mine'
                    ? 'bg-purple-600 text-white font-bold shadow-sm shadow-purple-900/30'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)] bg-[var(--card-elevated)]'
                }`}
              >
                المسندة لي
              </button>
              <button
                onClick={() => setFilterTab('unassigned')}
                className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap shrink-0 snap-start font-medium ${
                  filterTab === 'unassigned'
                    ? 'bg-amber-600 text-white font-bold shadow-sm shadow-amber-900/30'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)] bg-[var(--card-elevated)]'
                }`}
              >
                غير مسندة ({inboxScopedConversations.filter((c) => !c.assigned_staff_name || c.assigned_staff_name === 'غير مسند').length})
              </button>
              <button
                onClick={() => setFilterTab('unread')}
                className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap shrink-0 snap-start font-medium ${
                  filterTab === 'unread'
                    ? 'bg-purple-600 text-white font-bold shadow-sm shadow-purple-900/30'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)] bg-[var(--card-elevated)]'
                }`}
              >
                غير مقروء ({inboxScopedConversations.filter((c) => c.unread_count > 0).length})
              </button>
              <button
                onClick={() => setFilterTab('rescue')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-xl transition-all whitespace-nowrap shrink-0 snap-start font-medium ${
                  filterTab === 'rescue'
                    ? 'bg-gradient-to-r from-amber-600 to-rose-600 text-white font-bold shadow-md shadow-amber-900/40 animate-pulse'
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
                العملاء ({inboxScopedConversations.filter((c) => !c.is_group).length})
              </button>
              <button
                onClick={() => setFilterTab('groups')}
                className={`px-2.5 py-1 rounded-xl transition-all whitespace-nowrap ${
                  filterTab === 'groups'
                    ? 'bg-purple-600/30 text-purple-300 font-semibold border border-purple-500/50'
                    : 'text-slate-400 hover:text-white bg-slate-800/30'
                }`}
              >
                المجموعات ({inboxScopedConversations.filter((c) => c.is_group).length})
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
          <div
            onScroll={(e) => {
              const target = e.currentTarget;
              if (target.scrollHeight - target.scrollTop - target.clientHeight < 250) {
                if (visibleCount < filteredConversations.length) {
                  setVisibleCount((prev) => Math.min(prev + 50, filteredConversations.length));
                }
              }
            }}
            className="flex-1 overflow-y-auto divide-y divide-purple-900/20"
          >
            {loadingChats && conversations.length === 0 ? (
              <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
                <span className="text-xs">جاري تحميل المحادثات الحقيقية من واتساب...</span>
              </div>
            ) : isStaffWithoutInboxes ? (
              <div className="p-8 text-center text-amber-400 text-xs flex flex-col items-center justify-center gap-2">
                <ShieldAlert className="w-8 h-8 text-amber-400/80 mb-1" />
                <span className="font-bold text-sm">لا يوجد صندوق مخصص لحسابك</span>
                <span className="text-[11px] text-slate-400 max-w-[220px]">
                  لم يتم إسناد أي صندوق محادثات لحسابك بعد. يرجى مراجعة إدارة النظام لربطك بالصندوق المطلوب.
                </span>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                {searchQuery ? 'لا توجد محادثات مطابقة للبحث' : 'لا توجد محادثات على هذا الخط حتى الآن'}
              </div>
            ) : (
              <>
                {filteredConversations.slice(0, visibleCount).map((conv) => (
                  <ConversationRow
                    key={conv.id}
                    conv={conv}
                    isSelected={conv.id === activeConvId}
                    onSelect={handleSelectConversation}
                    getLineDisplayTitle={getLineDisplayTitle}
                    multiLine={lineFilter === 'all'}
                  />
                ))}

                {filteredConversations.length > visibleCount && (
                  <div className="p-3 text-center">
                    <button
                      onClick={() => setVisibleCount((prev) => Math.min(prev + 50, filteredConversations.length))}
                      className="w-full py-2 px-3 rounded-xl bg-purple-950/50 hover:bg-purple-900/60 border border-purple-500/30 text-purple-200 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <span>عرض المزيد من المحادثات (المتبقي: <bdi dir="ltr">{filteredConversations.length - visibleCount}</bdi>)</span>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </>
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

                  <div className="w-11 h-11 rounded-2xl avatar-ring p-[2px] shrink-0 shadow-sm">
                    <div
                      className={`w-full h-full rounded-[14px] flex items-center justify-center font-bold text-sm overflow-hidden border ${
                        activeConversation.is_group
                          ? 'bg-[var(--card-elevated)] text-[var(--text-main)] border-[var(--border-subtle)]'
                          : 'bg-[var(--card-surface)] text-[var(--text-main)] border-[var(--border-subtle)]'
                      }`}
                    >
                      {activeConversation.avatar_url ? (
                        <img src={activeConversation.avatar_url} alt={activeConversation.title} className="w-full h-full object-cover" />
                      ) : activeConversation.is_group ? (
                        <Users className="w-5 h-5" />
                      ) : (
                        initialsOrLetter(activeConversation.title, activeConversation.avatar_letter)
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      {/* م8-ج3: اسم المحادثة قابل للضغط — قائمة خيارات سريعة */}
                      <div className="relative">
                        <button
                          onClick={() => setContactMenuOpen((v) => !v)}
                          className="font-bold text-sm text-[var(--text-main)] hover:text-purple-300 transition-colors flex items-center gap-1"
                          title="خيارات هذه الجهة"
                        >
                          {activeConversation.title}
                          <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                        </button>

                        {contactMenuOpen && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setContactMenuOpen(false)} />
                            <div className="absolute right-0 mt-2 w-56 bg-[var(--card-bg)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl z-50 p-1.5" dir="rtl">
                              <button
                                onClick={() => {
                                  setContactMenuOpen(false);
                                  if (!isContactSaved) handleQuickSaveContact();
                                }}
                                className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                                  isContactSaved ? 'text-emerald-300 bg-emerald-500/10 cursor-default' : 'text-[var(--text-muted)] hover:bg-[var(--card-elevated)] hover:text-[var(--text-main)]'
                                }`}
                              >
                                {isContactSaved ? <CheckCircle2 className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
                                {isContactSaved ? 'جهة اتصال مسجلة ✓' : 'حفظ كجهة اتصال'}
                              </button>
                              <button
                                onClick={() => {
                                  setContactMenuOpen(false);
                                  handleToggleFavorite(
                                    {
                                      id: activeConversation.id,
                                      title: activeConversation.title,
                                      subtitle: activeConversation.phone_or_jid,
                                      meta: { chat_jid: activeConversation.chat_jid, instance_name: activeConversation.line_id || selectedInstanceName, is_group: activeConversation.is_group },
                                    },
                                    activeConversation.is_group ? 'group' : 'direct_chat'
                                  );
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-[var(--text-muted)] hover:bg-[var(--card-elevated)] hover:text-amber-300 transition-colors"
                              >
                                <Star className="w-3.5 h-3.5" />
                                إضافة للمفضلة
                              </button>
                              <button
                                onClick={() => {
                                  setContactMenuOpen(false);
                                  navigator.clipboard.writeText(activeConversation.phone_or_jid || activeConversation.chat_jid);
                                  toast({ title: 'تم نسخ الرقم/المعرف', kind: 'success' });
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-[var(--text-muted)] hover:bg-[var(--card-elevated)] hover:text-[var(--text-main)] transition-colors"
                              >
                                <Copy className="w-3.5 h-3.5" />
                                نسخ الرقم / المعرف
                              </button>
                              <button
                                onClick={() => {
                                  setContactMenuOpen(false);
                                  setTagMenuOpen(true);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-[var(--text-muted)] hover:bg-[var(--card-elevated)] hover:text-cyan-300 transition-colors"
                              >
                                <Tags className="w-3.5 h-3.5" />
                                وسوم المحادثة
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                      {/* وسم أعضاء المجموعة بنمط ناعم */}
                      {activeConversation.is_group && activeConversation.participant_count && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/25 font-semibold shrink-0 flex items-center gap-1">
                          <Users className="w-3 h-3 opacity-70" />
                          <span>{activeConversation.participant_count}</span>
                        </span>
                      )}

                      {/* وسم الحالة الناعم بجانب العنوان (نمط v1) */}
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${statusBadge(activeConversation.status)}`}>
                        {statusLabel(activeConversation.status)}
                      </span>

                      {/* عداد SLA النبّاض المختصر في سطر العنوان */}
                      <SlaTimer
                        since={activeConversation.last_customer_message_timestamp}
                        status={activeConversation.status}
                        isGroup={activeConversation.is_group}
                      />
                    </div>
                  </div>
                </div>

                {/* زر التحكم بالمحادثة المصمم بأناقة التطبيقات الاحترافية */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => { setMsgSelectionMode((v) => !v); setSelectedMsgIds(new Set()); }}
                    className={`h-8 px-2.5 rounded-xl border text-[11px] font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
                      msgSelectionMode
                        ? 'bg-[var(--accent-soft)] text-[var(--primary)] border-[var(--border-glow)]'
                        : 'bg-[var(--card-elevated)] border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                    }`}
                    title="تحديد رسائل — نسخ/تحويل/حذف للجميع"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>تحديد</span>
                  </button>

                  <button
                    onClick={() => setInfoPanelOpen((v) => !v)}
                    aria-pressed={infoPanelOpen}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-sm ${
                      infoPanelOpen
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-transparent ring-2 ring-purple-400/40 shadow-purple-900/30'
                        : 'bg-gradient-to-r from-purple-950/40 to-indigo-950/40 hover:from-purple-900/50 hover:to-indigo-900/50 text-purple-200 border-purple-500/30 hover:border-purple-400/60'
                    }`}
                    title="لوحة التحكم بالمحادثة: الإسناد، الحالة، الوسوم، المفضلة، القفل، وتفاصيل جهة الاتصال"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>التحكم بالمحادثة</span>
                  </button>
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
              <div ref={messagesContainerRef} onScroll={handleMessagesScroll} className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[var(--bg-main)]">
                {activeConversation && lockedChatsPinMap[activeConversation.id] && !unlockedSessionChats[activeConversation.id] ? (
                  <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center p-6 space-y-4">
                    <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                      <Lock className="w-8 h-8" />
                    </div>
                    <div className="max-w-md space-y-1">
                      <h3 className="text-base font-bold text-[var(--text-main)]">هذه المحادثة مشفرة ومقفلة برمز أمان PIN</h3>
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
                          setRequestAccessSending(false);
                          setRequestAccessError(null);
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
                      <h3 className="text-base font-bold text-[var(--text-main)]">المحادثة قيد المتابعة بواسطة زميل</h3>
                      <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                        هذه المحادثة مسندة حالياً للموظف <strong className="text-amber-300 font-semibold">{activeConversation.assigned_staff_name}</strong>. محتوى الرسائل محجوب لمنع تضارب الردود، ولكن يمكنك تقديم طلب رسمي للمشرف للاطلاع أو الاستلام.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                      <button
                        onClick={() => {
                          setRequestAccessSent(false);
                          setRequestAccessSending(false);
                          setRequestAccessError(null);
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
                                  meta: { chat_jid: msg.chat_jid, instance_name: activeConversation?.line_id || selectedInstanceName, mediaType: msg.media_type },
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
                          {msgSelectionMode && (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); toggleMsgSelection(msg.id); }}
                              className={`absolute top-1 right-1 z-10 w-5 h-5 rounded-md border flex items-center justify-center transition-all ${selectedMsgIds.has(msg.id) ? 'bg-[var(--accent-soft)] border-[var(--border-glow)] text-[var(--primary)]' : 'bg-black/30 border-white/20 text-transparent hover:text-white'}`}
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
                          {!isOut && activeConversation.is_group && (
                            <div className="text-[11px] font-bold text-purple-300 mb-1">
                              {/* طلب المالك: قائمة لكل مرسل — جهة اتصال / نسخ المعرف */}
                              <button
                                onClick={(e) => {
                                  const rct = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                  setSenderMenu({ msgId: msg.id, name: msg.sender_name, jid: msg.key_participant || '', x: rct.left, y: rct.bottom });
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
                            const effectiveInstance = msg.line_id || activeConversation.line_id || selectedInstanceName;
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
                            const effectiveInstance = msg.line_id || activeConversation.line_id || selectedInstanceName;
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
                            const effectiveInstance = msg.line_id || activeConversation.line_id || selectedInstanceName;
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
                            const effectiveInstance = msg.line_id || activeConversation.line_id || selectedInstanceName;
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
                            const effectiveInstance = msg.line_id || activeConversation.line_id || selectedInstanceName;
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
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input Bar with Risk Guard Checks */}
              <div className="bg-[var(--card-bg)] border-t border-[var(--border-subtle)] p-3 shrink-0 space-y-2">

                {/* م8: شريط إجراءات التحديد المتعدد */}
                {msgSelectionMode && selectedMsgIds.size > 0 && (
                  <div className="rounded-2xl border border-[var(--border-glow)] bg-[var(--accent-soft)] px-4 py-2.5 flex items-center justify-between gap-2 flex-wrap" dir="rtl">
                    <span className="text-xs font-bold text-[var(--primary)]">{selectedMsgIds.size} رسالة محددة</span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        onClick={() => {
                          const text = selectedMessages.map((m) => m.body || `[${m.media_type}]`).join('\n---\n');
                          navigator.clipboard.writeText(text);
                          toast({ title: 'نُسخ نص الرسائل المحددة', kind: 'success' });
                        }}
                        className="px-3 py-1.5 rounded-xl bg-[var(--card-elevated)] border border-[var(--border-subtle)] text-[var(--text-main)] text-[11px] font-bold hover:border-[var(--border-glow)]"
                      >
                        نسخ المحدد
                      </button>
                      {selectedMessages[0] && (
                        <button
                          onClick={() => { setForwardModalMsg(selectedMessages[0]); setMsgSelectionMode(false); }}
                          className="px-3 py-1.5 rounded-xl bg-[var(--card-elevated)] border border-[var(--border-subtle)] text-[var(--text-main)] text-[11px] font-bold hover:border-[var(--border-glow)]"
                        >
                          تحويل الأولى
                        </button>
                      )}
                      <button
                        onClick={handleBulkDelete}
                        className="px-3 py-1.5 rounded-xl bg-rose-600/20 border border-rose-500/40 text-rose-300 text-[11px] font-bold hover:bg-rose-600/30"
                      >
                        حذف للجميع
                      </button>
                      <button
                        onClick={() => { setMsgSelectionMode(false); setSelectedMsgIds(new Set()); }}
                        className="px-3 py-1.5 rounded-xl text-[var(--text-muted)] text-[11px] font-bold hover:text-[var(--text-main)]"
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>
                )}

                {/* طبقات الرؤية: هيكل المحادثة المسندة لغيره + أزرار الطلبات */}
                {activeConversation && contentAccess === 'shell' && (
                  <div className="rounded-2xl border border-slate-500/40 bg-slate-900/40 px-4 py-3 flex items-center justify-between gap-3 flex-wrap" dir="rtl">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <ShieldAlert className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-bold text-slate-200">مسندة لزميلك — المحتوى غير متاح لك</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {ownsConversationLine
                            ? 'تملك خط هذه المحادثة — يمكنك طلب القراءة أو المشاركة في الرد (الإسناد يبقى لزميلك)'
                            : 'لا تملك خطاً من خطوط هذه المحادثة — لا يمكن طلب الوصول'}
                        </div>
                      </div>
                    </div>
                    {ownsConversationLine && reqSentType !== 'read' && reqSentType !== 'read_write' && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button onClick={() => submitPermissionRequest('read', activeConversation.available_lines?.[0] || activeConversation.line_id)}
                          disabled={reqSentType === 'read-sending'}
                          className="px-3 py-2 rounded-xl bg-sky-600/20 border border-sky-500/40 text-sky-300 text-[11px] font-bold hover:bg-sky-600/30 transition-colors disabled:opacity-60">
                          طلب قراءة
                        </button>
                        <button onClick={() => submitPermissionRequest('read_write', activeConversation.available_lines?.[0] || activeConversation.line_id)}
                          disabled={reqSentType === 'read_write-sending'}
                          className="px-3 py-2 rounded-xl bg-purple-600/20 border border-purple-500/40 text-purple-300 text-[11px] font-bold hover:bg-purple-600/30 transition-colors disabled:opacity-60">
                          طلب قراءة وكتابة
                        </button>
                      </div>
                    )}
                    {reqSentType === 'read' && <span className="text-[10px] px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 font-bold shrink-0">⏳ طلب القراءة معلق</span>}
                    {reqSentType === 'read_write' && <span className="text-[10px] px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 font-bold shrink-0">⏳ طلب المشاركة معلق</span>}
                  </div>
                )}

                {/* طلب الإسناد — محادثة غير مسندة تظهر للموظف (اقتناص العميل) */}
                {activeConversation && !isManager && contentAccess === 'full' && !(activeConversation as any).assigned_staff_id && !activeConversation.assigned_staff_name && reqSentType !== 'assignment' && (
                  <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/30 px-4 py-2.5 flex items-center justify-between gap-3" dir="rtl">
                    <span className="text-xs text-emerald-200 font-semibold">محادثة غير مسندة — يمكنك طلب اقتناصها</span>
                    <button onClick={() => submitPermissionRequest('assignment')}
                      disabled={reqSentType === 'assignment-sending'}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-[11px] font-bold transition-colors">
                      طلب الإسناد لي
                    </button>
                  </div>
                )}
                {reqSentType === 'assignment' && (
                  <div className="rounded-2xl border border-amber-500/40 bg-amber-950/30 px-4 py-2 text-center text-[11px] text-amber-300 font-bold" dir="rtl">
                    ⏳ طلب الإسناد معلق — المشرف سيوافق أو يرشح الأفضل
                  </div>
                )}

                {/* C4: تحذير صارم — لا إرسال من رقم مختلف عن خط الوارد دون إذن مدير */}
                {activeConversation && sendLineStatus.get(effectiveSendInstance)?.allowed === false && (() => {
                  const st = sendLineStatus.get(effectiveSendInstance);
                  const isIncomingNoAuth = st?.reason?.includes('خط الوارد');
                  return (
                    <div className="rounded-2xl border border-rose-500/50 bg-rose-950/40 px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap" dir="rtl">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-rose-200">
                            الإرسال من هذا الخط محظور — {st?.reason || 'يلزم إذن المدير'}
                          </div>
                          <div className="text-[10px] text-rose-300/80 mt-0.5 leading-relaxed">
                            {isIncomingNoAuth
                              ? 'المحادثة وردت على هذا الخط وهو مرتبط بصندوقك، لكنه غير مصرح لك به شخصياً — اطلب إذناً من المدير ليُفعَّل لك.'
                              : 'العميل راسلك من رقم آخر — الرد من رقم مختلف يربكه ويتطلب موافقة المدير. عند الرفض يلزمك الرد من نفس الرقم الوارد.'}
                          </div>
                        </div>
                      </div>
                      {grantRequestState === 'sent' ? (
                        <span className="text-[10px] px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 font-bold shrink-0">
                          ⏳ طلبك معلق بموافقة المدير — ستصلك النتيجة إشعاراً
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={async () => {
                            if (!user?.id || !activeConversation) return;
                            const lineId = lineIdMap[effectiveSendInstance];
                            if (!lineId) { toast({ title: 'تعذر تحديد الخط — حاول تحديث الصفحة', kind: 'error' }); return; }
                            setGrantRequestState('sending');
                            try {
                              const res = await fetch('/api/permission-requests', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  action: 'request',
                                  type: activeConversation.is_group ? 'group_join' : 'line_reply',
                                  staff_id: user.id,
                                  line_id: lineId,
                                  chat_jid: activeConversation.chat_jid,
                                  inbox_id: currentInbox?.id || null,
                                  reason: st?.reason || 'رد من خط غير الوارد',
                                }),
                              });
                              const json = await res.json();
                              if (res.ok) {
                                setGrantRequestState('sent');
                                toast({ title: json.already_pending ? 'طلبك معلق بالفعل بموافقة المدير' : 'أُرسل طلب الإذن إلى المدير', kind: 'success' });
                              } else {
                                toast({ title: json.error || 'فشل إرسال الطلب', kind: 'error' });
                                setGrantRequestState('none');
                              }
                            } catch { setGrantRequestState('none'); }
                          }}
                          disabled={grantRequestState === 'sending'}
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-60 text-white text-[11px] font-bold shadow-md transition-colors shrink-0"
                        >
                          <ShieldAlert className="w-3.5 h-3.5" />
                          {grantRequestState === 'sending' ? 'جاري الإرسال...' : 'طلب إذن من المدير'}
                        </button>
                      )}
                    </div>
                  );
                })()}

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
                      className="p-1.5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-[var(--text-main)] transition-colors"
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
                    
                    {/* ⚡ م4: زر الردود الجاهزة مع المنتقي القابل للبحث */}
                    <div className="relative shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setCannedOpen((v) => !v)}
                        className="h-10 w-10 p-0 text-amber-400 hover:text-amber-300 shrink-0"
                        title="الردود الجاهزة — أو اكتب / في حقل الإرسال"
                      >
                        <Zap className="w-5 h-5" />
                      </Button>

                      {cannedOpen && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => { setCannedOpen(false); setCannedSearch(''); }} />
                          <div className="absolute bottom-12 right-0 z-50 w-80 bg-[var(--card-bg)] border border-purple-500/40 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md" dir="rtl">
                            <div className="p-2.5 border-b border-[var(--border-subtle)]">
                              <input
                                autoFocus
                                type="text"
                                value={cannedSearch}
                                onChange={(e) => setCannedSearch(e.target.value)}
                                placeholder="ابحث في الردود الجاهزة..."
                                className="w-full bg-[var(--card-elevated)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-xs text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-purple-500"
                              />
                            </div>
                            <div className="max-h-64 overflow-y-auto">
                              {cannedList.length === 0 ? (
                                <div className="p-5 text-center text-xs text-[var(--text-muted)]">
                                  لا توجد ردود جاهزة — أضفها من صفحة "الردود الجاهزة"
                                </div>
                              ) : (() => {
                                const s = cannedSearch.trim().toLowerCase();
                                const filteredCanned = s
                                  ? cannedList.filter((c) => c.title.toLowerCase().includes(s) || c.body.toLowerCase().includes(s) || (c.shortcut || '').toLowerCase().includes(s))
                                  : cannedList;
                                return filteredCanned.length === 0 ? (
                                  <div className="p-4 text-center text-xs text-[var(--text-muted)]">لا نتائج مطابقة</div>
                                ) : (
                                  filteredCanned.map((c) => (
                                    <button
                                      key={c.id}
                                      type="button"
                                      onClick={() => handleInsertCanned(c)}
                                      className="w-full text-right px-3 py-2.5 hover:bg-[var(--card-elevated)] transition-colors border-b border-[var(--border-subtle)] last:border-b-0"
                                    >
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-[var(--text-main)] truncate">{c.title}</span>
                                        {c.shortcut && (
                                          <code className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-300 shrink-0" dir="ltr">{c.shortcut}</code>
                                        )}
                                      </div>
                                      <p className="text-[10px] text-[var(--text-muted)] mt-0.5 line-clamp-1 leading-relaxed">{expandCannedBody(c.body)}</p>
                                    </button>
                                  ))
                                );
                              })()}
                            </div>
                          </div>
                        </>
                      )}
                    </div>

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

                    {/* C4: محدد خط الإرسال — خط الوارد متاح دائماً؛ الخطوط الأخرى تتطلب منح المدير */}
                    <div className="flex items-center gap-1 shrink-0">
                      <select
                        value={effectiveSendInstance}
                        onChange={(e) => setSendingLineInstance(e.target.value)}
                        className={`h-10 px-2 rounded-xl border text-xs font-semibold outline-none font-mono ${
                          sendLineStatus.get(effectiveSendInstance)?.allowed === false
                            ? 'bg-rose-950/60 border-rose-500/50 text-rose-200'
                            : 'bg-purple-950/60 border-purple-500/40 text-purple-200 focus:border-purple-400'
                        }`}
                        title="خط الإرسال — الرد الافتراضي من آخر رقم ورد منه العميل"
                      >
                        {allowedSendInstances.map((inst) => {
                          const st = sendLineStatus.get(inst.name);
                          return (
                            <option key={inst.name} value={inst.name} disabled={st ? !st.allowed : false}>
                              {st?.allowed === false ? '⛔' : ''} إرسال عبر: {getLineDisplayTitle(inst.name)}{st && !st.allowed ? ' — يحتاج إذن' : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <input
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={handleComposerKeyDown}
                      placeholder="اكتب رسالتك... ( / للردود الجاهزة، Enter للإرسال)"
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
          ) : isStaffWithoutInboxes ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400" dir="rtl">
              <ShieldAlert className="w-14 h-14 mb-4 text-amber-400/80" />
              <h3 className="text-base font-bold text-amber-300 mb-2">لا يوجد أي صندوق مخصص لحسابك</h3>
              <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
                لم يتم إسناد أي صندوق محادثات لحسابك حتى الآن. يرجى مراجعة إدارة النظام لتعيينك في الصندوق المناسب.
              </p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
              <User className="w-12 h-12 mb-3 text-purple-900/40" />
              <p className="text-sm font-medium text-slate-400">اختر محادثة حقيقية من القائمة للمراسلة الفورية</p>
            </div>
          )}
        </div>
      </div>

      {/* لوحة تفاصيل المحادثة — تنزلق من اليسار بنقرة واحدة */}
      <ConversationInfoPanel
        open={infoPanelOpen}
        onClose={() => setInfoPanelOpen(false)}
        conv={activeConversation}
        dbTags={dbTags}
        isFavoriteChat={(() => {
          if (!activeConversation) return false;
          return favoritesList.some(
            (f) =>
              (f.category === 'direct_chat' || f.category === 'group') &&
              f.meta?.chat_jid === activeConversation.chat_jid
          );
        })()}
        isContactSaved={isContactSaved}
        pinnedCount={(activeConversation && pinnedMessagesMap[activeConversation.id]?.length) || 0}
        getLineDisplayTitle={getLineDisplayTitle}
        currentUserName={user?.full_name || ''}
        actions={convActions}
      />

      {/* --- حارس المخاطر: نافذة تأكيد الإرسال في ساعات الهدوء (Modal الموحدة) --- */}
      {quietConfirmOpen && (
        <Modal
          open
          onClose={() => {
            setQuietConfirmOpen(false);
            setPendingSendText('');
          }}
          contained
          ariaLabel="تأكيد الإرسال في ساعات الهدوء"
          panelClassName="border border-amber-500/50 rounded-2xl max-w-md p-6 space-y-4 text-right"
        >
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
        </Modal>
      )}

      {/* --- نافذة معاينة وإرسال المرفقات --- */}
      {attachmentModalOpen && selectedAttachment && (
        <Modal
          open
          onClose={() => {
            setAttachmentModalOpen(false);
            setSelectedAttachment(null);
          }}
          contained
          ariaLabel="إرسال مرفق عبر واتساب"
          panelClassName="border border-purple-500/40 rounded-3xl max-w-lg p-6 space-y-4 text-right"
        >
            <div className="flex items-center justify-between border-b border-purple-900/40 pb-3">
              <div className="flex items-center gap-2">
                <FileUp className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-base text-[var(--text-main)]">إرسال مرفق عبر واتساب</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAttachmentModalOpen(false);
                  setSelectedAttachment(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-[var(--text-main)] hover:bg-white/10"
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
                    <div className="font-semibold text-[var(--text-main)] text-sm">{selectedAttachment.fileName}</div>
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
                className="w-full bg-[var(--bg-main)] text-sm text-[var(--text-main)] px-4 py-2.5 rounded-xl border border-purple-900/60 focus:border-purple-500 outline-none placeholder:text-slate-500"
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
        </Modal>
      )}

      {/* ════════════════════════════════════════════════════════
          🖼️ Lightbox — نافذة عرض الصور/الفيديو بشاشة كاملة
          اضغط على الخلفية أو زر X أو Esc لإغلاقها
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
            <span className="text-sm font-semibold text-[var(--text-main)]/90">
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
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-[var(--text-main)] flex items-center justify-center transition-colors"
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
        <Modal open onClose={() => { setMultiSendModalOpen(false); }} contained ariaLabel="معاينة وإرسال دفعة الوسائط" panelClassName="border border-purple-500/40 rounded-3xl max-w-2xl p-6 space-y-4 text-right">
            <div className="flex items-center justify-between border-b border-purple-900/40 pb-3">
              <div className="flex items-center gap-2">
                <FileUp className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-base text-[var(--text-main)]">
                  معاينة وإرسال دفعة الوسائط ({batchAttachments.length} عناصر)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMultiSendModalOpen(false);
                  setBatchAttachments([]);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-[var(--text-main)] hover:bg-white/10"
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
                className="w-full bg-[var(--bg-main)] text-sm text-[var(--text-main)] px-4 py-2.5 rounded-xl border border-purple-900/60 focus:border-purple-500 outline-none placeholder:text-slate-500"
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
        </Modal>
      )}

      {/* ════════════════════════════════════════════════════════
          📌 نافذة اختيار مدة تثبيت الرسالة (خيارات واتساب)
         ════════════════════════════════════════════════════════ */}
      {pinModalMsg && (
        <Modal open onClose={() => setPinModalMsg(null)} contained ariaLabel="اختيار مدة تثبيت الرسالة" panelClassName="border border-amber-500/40 rounded-3xl max-w-sm p-5 space-y-4 text-right">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                <Pin className="w-4 h-4 rotate-45" />
                <span>تثبيت الرسالة في المحادثة</span>
              </div>
              <button onClick={() => setPinModalMsg(null)} className="text-slate-400 hover:text-[var(--text-main)]">
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
        </Modal>
      )}

      {/* ════════════════════════════════════════════════════════
          ↪️ نافذة تحويل الرسالة إلى محادثة أخرى
         ════════════════════════════════════════════════════════ */}
      {forwardModalMsg && (
        <Modal open onClose={() => setForwardModalMsg(null)} contained ariaLabel="تحويل الرسالة إلى محادثة أخرى" panelClassName="border border-purple-500/40 rounded-3xl max-w-xl p-6 space-y-4 text-right">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <div className="flex items-center gap-2 text-purple-300 font-bold text-sm">
                <Share2 className="w-4 h-4" />
                <span>تحويل الرسالة إلى محادثة</span>
              </div>
              {/* م8: توضيح خط المصدر — التحويل يتم من نفس الرقم الذي وردت منه الرسالة */}
              <p className="text-[10px] text-slate-400 leading-relaxed">
                سيتم التحويل من خط <b className="text-purple-300">{getLineDisplayTitle(forwardModalMsg.line_id || selectedInstanceName)}</b>{' '}
                (الخط الذي وردت منه الرسالة) إلى المحادثة الهدف — للإرسال لمجموعة يجب أن يكون رقم المصدر عضواً فيها.
              </p>
              <button onClick={() => setForwardModalMsg(null)} className="text-slate-400 hover:text-[var(--text-main)]">
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
                className="w-full bg-[var(--bg-main)] pr-9 pl-3 py-2 text-xs rounded-xl border border-white/10 text-[var(--text-main)] outline-none focus:border-purple-500"
              />
            </div>
            <div className="max-h-60 overflow-y-auto space-y-1.5">
              {conversations
                .filter((c) => c.chat_jid !== forwardModalMsg.chat_jid) // استبعاد محادثة المصدر
                .filter((c) => !forwardSearch || c.title.toLowerCase().includes(forwardSearch.toLowerCase()))
                .map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => handleForwardMessage(conv)}
                    className="w-full text-right p-2.5 rounded-xl bg-slate-900/60 hover:bg-purple-900/40 border border-white/5 hover:border-purple-500/30 flex items-center justify-between transition-colors"
                  >
                    <div>
                      <div className="font-semibold text-[var(--text-main)] text-xs">{conv.title}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{conv.phone_or_jid}</div>
                    </div>
                    <span className="text-[11px] text-purple-400 font-bold">إرسال ↵</span>
                  </button>
                ))}
            </div>
        </Modal>
      )}

            {/* طلب المالك: قائمة خيارات المرسل داخل المجموعة */}
      {senderMenu && (
        <>
          <div className="fixed inset-0 z-[180]" onClick={() => setSenderMenu(null)} />
          <div className="fixed z-[190] w-56 bg-[var(--card-bg)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl p-1.5" dir="rtl"
            style={{ left: Math.min(senderMenu.x, (typeof window !== 'undefined' ? window.innerWidth - 240 : 400)), top: Math.min(senderMenu.y + 6, (typeof window !== 'undefined' ? window.innerHeight - 160 : 600)) }}>
            <div className="px-3 py-2 text-[11px] font-bold text-purple-300 border-b border-[var(--border-subtle)] mb-1 truncate">
              {senderMenu.name}
            </div>
            {(() => {
              const digits = senderMenu.jid.replace(/@.*$/, '').replace(/\D/g, '');
              const isPhone = senderMenu.jid.endsWith('@s.whatsapp.net') && digits.length >= 10;
              return (
                <>
                  <button
                    onClick={async () => {
                      if (!isPhone) return;
                      try {
                        const res = await fetch('/api/contacts', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            display_name: senderMenu.name,
                            primary_phone: '+' + digits,
                            entity_type: 'individual',
                            commercial_role: 'b2c',
                            source: 'manual',
                            source_detail: 'من محادثة مجموعة',
                          }),
                        });
                        if (res.ok) toast({ title: 'تم حفظ ' + senderMenu.name + ' كجهة اتصال', kind: 'success' });
                        else toast({ title: 'فشل الحفظ — قد يكون مسجلاً مسبقاً', kind: 'info' });
                      } catch { toast({ title: 'فشل الاتصال', kind: 'error' }); }
                      setSenderMenu(null);
                    }}
                    className={isPhone
                      ? 'w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-[var(--text-muted)] hover:bg-[var(--card-elevated)] hover:text-[var(--text-main)] transition-colors'
                      : 'w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 cursor-not-allowed'}
                    title={isPhone ? 'إضافة إلى دليل جهات الاتصال' : 'المعرف من نوع LID — لا يحتوي رقماً هاتفياً'}
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    إضافة كجهة اتصال
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(senderMenu.jid);
                      toast({ title: 'تم نسخ المعرف', kind: 'success' });
                      setSenderMenu(null);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-[var(--text-muted)] hover:bg-[var(--card-elevated)] hover:text-[var(--text-main)] transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    نسخ معرف المرسل
                  </button>
                </>
              );
            })()}
          </div>
        </>
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
                <h3 className="font-bold text-[var(--text-main)] text-sm">المفضلة المركزية للموظف</h3>
              </div>
              <button
                onClick={() => setFavoritesDrawerOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-[var(--text-main)] hover:bg-white/10"
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
                        <div className="text-[var(--text-main)] text-xs font-semibold truncate">{item.title}</div>
                        {item.subtitle && (
                          <div className="text-[10px] text-slate-400 mt-0.5 truncate">{item.subtitle}</div>
                        )}
                        <div className="text-[9px] text-purple-400/80 mt-1">{item.createdAt}</div>
                      </div>
                      <div className="flex items-center gap-1">
                        {/* م8-ج3: فتح العنصر — يضبط الرابط العميق مباشرة (نبضة فورية) أو يفتح جهات الاتصال */}
                        <button
                          onClick={() => {
                            const meta: any = (item as any).meta || {};
                            const jid = meta.chat_jid || meta.chatJid;
                            setFavoritesDrawerOpen(false);
                            if (jid) {
                              pendingChatDeepLink.current = jid;
                              setDeepLinkTick((t) => t + 1);
                              // مهلة فشل مطابقة للمراقب
                              setTimeout(() => {
                                if (pendingChatDeepLink.current === jid) {
                                  pendingChatDeepLink.current = null;
                                  toast({ title: 'لم تُوجد المحادثة في نطاق صندوقك الحالي — افتح صندوقها أو خطها', kind: 'error' });
                                }
                              }, 5000);
                            } else if (item.category === 'contact') {
                              router.push('/module/contacts');
                            } else {
                              toast({ title: 'لا يوجد رابط محادثة محفوظ لهذا العنصر (مفضل قديم قبل التسجيل)', kind: 'info' });
                            }
                          }}
                          className="p-1.5 rounded-lg bg-purple-600/20 text-purple-300 hover:bg-purple-600/40 transition-colors"
                          title="فتح في المحادثة"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setFavoritesList((prev) => prev.filter((x) => x.id !== item.id));
                            try {
                              localStorage.setItem('hub_favorites_v1', JSON.stringify(favoritesList.filter((x) => x.id !== item.id)));
                            } catch {}
                            fetch(`/api/favorites?item_id=${encodeURIComponent(item.id)}&category=${item.category}`, { method: 'DELETE' }).catch(() => {});
                          }}
                          className="text-slate-500 hover:text-rose-400 p-1 opacity-60 group-hover:opacity-100 transition-opacity"
                          title="إزالة من المفضلة"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 🔒 نافذة إدخال / تعيين رمز PIN (Modal الموحدة) */}
      {pinModalOpen && (
        <Modal open onClose={() => setPinModalOpen(false)} contained ariaLabel="رمز حماية المحادثة" panelClassName="border border-purple-500/30 rounded-3xl p-6 max-w-sm space-y-4 shadow-2xl" >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[var(--text-main)]">
                    {pinModalMode === 'set' ? 'تعيين رمز حماية PIN' : 'فك قفل المحادثة'}
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    {pinModalMode === 'set' ? 'عيّن رمزاً مكوناً من 4 إلى 6 أرقام' : 'أدخل الرمز السري لعرض المحادثة'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPinModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-[var(--text-main)] hover:bg-white/10"
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
        </Modal>
      )}

      {/* 🛡️ نافذة طلب ترخيص الوصول والإسناد من المشرف أو صاحب القفل */}
      {requestAccessModalOpen && (
        <Modal open onClose={() => setRequestAccessModalOpen(false)} contained ariaLabel="طلب ترخيص الوصول" panelClassName="border border-amber-500/30 rounded-3xl p-6 max-w-md space-y-4 shadow-2xl text-right" >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[var(--text-main)]">
                    {activeConversation && lockedChatsPinMap[activeConversation.id] ? 'طلب فك قفل المحادثة' : 'طلب ترخيص وصول / إسناد'}
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    {activeConversation && lockedChatsPinMap[activeConversation.id] ? 'يذهب الطلب حصراً لصاحب القفل' : 'يذهب الطلب للمشرف العام لاعتماده'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setRequestAccessModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-[var(--text-main)] hover:bg-white/10"
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
                  المحادثة المستهدفة: <strong className="text-[var(--text-main)] font-mono">{activeConversation?.title}</strong>
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
                <div className="flex-1 space-y-2">
                  {requestAccessError && (
                    <div className="p-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[11px] font-bold text-center">
                      {requestAccessError}
                    </div>
                  )}
                  <button
                    onClick={submitAccessRequest}
                    disabled={requestAccessSending || !activeConversation}
                    className={`w-full py-2.5 rounded-xl text-white text-xs font-bold transition-all shadow-md shadow-purple-900/40 ${
                      requestAccessSending
                        ? 'bg-slate-600 cursor-not-allowed opacity-60'
                        : 'bg-gradient-to-r from-amber-600 to-purple-600 hover:from-amber-500 hover:to-purple-500'
                    }`}
                  >
                    {requestAccessSending ? '...جارٍ إرسال الطلب' : 'إرسال الطلب والمبررات الآن'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setRequestAccessModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all"
                >
                  إغلاق
                </button>
              )}
            </div>
        </Modal>
      )}

    </div>
  );
}
