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
  ArrowUpRight
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ConversationItem, ChatMessage, ConversationStatus } from '../../types';
import { Button } from '@tripyou/ui';
import { supabase } from '../../lib/supabase';

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

  // 2. Fetch real chats for the selected instance
  const fetchChats = useCallback(async (instanceName: string) => {
    if (!instanceName) return;
    try {
      setLoadingChats(true);
      const res = await fetch(`/api/evolution/instances/${instanceName}/chats`);
      if (res.ok) {
        const rawChats = await res.json();
        if (Array.isArray(rawChats)) {
          const nowTs = Date.now();
          const mapped: ConversationItem[] = rawChats.map((c: any) => {
            const jid = c.remoteJid || c.id || '';
            const isGroup = jid.includes('@g.us');
            const cleanPhone = jid.replace('@s.whatsapp.net', '').replace('@g.us', '');
            
            let title = c.pushName || '';
            if (!title) {
              title = isGroup ? 'مجموعة واتساب' : cleanPhone ? `+${cleanPhone}` : 'محادثة جديدة';
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
                (c.lastMessage.messageType ? `[${c.lastMessage.messageType}]` : '');
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
              avatar_color: isGroup ? 'from-indigo-600 to-purple-600' : 'from-emerald-600 to-teal-600',
              unread_count: c.unreadCount || 0,
              is_group: isGroup,
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
          if (m.message) {
            const msgObj = m.message;
            text =
              msgObj.conversation ||
              msgObj.extendedTextMessage?.text ||
              msgObj.reactionMessage?.text ||
              msgObj.documentMessage?.caption ||
              (msgObj.documentMessage ? '📄 مستند' : '') ||
              msgObj.imageMessage?.caption ||
              (msgObj.imageMessage ? '📷 صورة' : '') ||
              (msgObj.audioMessage ? '🎵 تسجيل صوتي' : '') ||
              (msgObj.videoMessage ? '🎥 مقطع فيديو' : '') ||
              (msgObj.pollUpdateMessage ? '📊 استطلاع تصويت' : '') ||
              (m.messageType ? `[${m.messageType}]` : '');
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
            body: text || '(رسالة وسائط)',
            media_type: m.messageType || 'text',
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

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] rounded-2xl overflow-hidden border border-purple-900/40 bg-[#080512] shadow-2xl relative">
      
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
      <div className="bg-[#0B0716] border-b border-purple-900/30 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-purple-300">خط واتساب النشط:</span>
          <select
            value={selectedInstanceName}
            onChange={(e) => setSelectedInstanceName(e.target.value)}
            disabled={loadingInstances}
            className="bg-[#120B24] text-xs text-white border border-purple-800/60 rounded-xl px-3 py-1.5 outline-none focus:border-purple-500 font-medium"
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
          <span className="hidden lg:flex items-center gap-1 text-[10px] text-purple-400 bg-purple-950/50 border border-purple-800/40 px-2 py-0.5 rounded-full">
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
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-purple-900/30 hover:bg-purple-900/50 text-purple-200 border border-purple-700/40 text-xs transition-all"
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
          className={`w-full md:w-80 lg:w-96 flex flex-col border-l border-purple-900/30 bg-[#0B0716]/80 shrink-0 ${
            showMobileChat ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Search & Filters */}
          <div className="p-3 border-b border-purple-900/30 space-y-2.5">
            <div className="relative">
              <Search className="w-4 h-4 absolute right-3 top-3 text-slate-500" />
              <input
                type="text"
                placeholder="بحث في المحادثات أو الأرقام..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#120B24] text-xs text-slate-200 pr-9 pl-3 py-2 rounded-xl border border-purple-900/50 focus:border-purple-500 outline-none placeholder:text-slate-500"
              />
            </div>

            {/* Filter Tabs - مع تبويبات دورة الإسناد */}
            <div className="flex items-center gap-1 text-[11px] overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setFilterTab('all')}
                className={`px-2.5 py-1 rounded-lg transition-all whitespace-nowrap ${
                  filterTab === 'all'
                    ? 'bg-purple-600/30 text-purple-300 font-semibold border border-purple-500/50'
                    : 'text-slate-400 hover:text-white bg-slate-800/30'
                }`}
              >
                الكل ({conversations.length})
              </button>
              <button
                onClick={() => setFilterTab('mine')}
                className={`px-2.5 py-1 rounded-lg transition-all whitespace-nowrap ${
                  filterTab === 'mine'
                    ? 'bg-purple-600/30 text-purple-300 font-semibold border border-purple-500/50'
                    : 'text-slate-400 hover:text-white bg-slate-800/30'
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
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 mt-0.5 overflow-hidden ${
                        conv.is_group
                          ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                          : 'bg-violet-600/20 text-violet-300 border border-violet-500/30'
                      }`}
                    >
                      {conv.is_group ? <Users className="w-5 h-5" /> : conv.avatar_letter}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="font-medium text-xs text-white truncate">
                          {conv.title}
                        </span>
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
          className={`flex-1 flex flex-col bg-[#080512] ${
            showMobileChat ? 'flex' : 'hidden md:flex'
          }`}
        >
          {activeConversation ? (
            <>
              {/* Chat Header with Assignment Cycle & SLA Timers */}
              <div className="bg-[#0B0716] border-b border-purple-900/30 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowMobileChat(false)}
                    className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                  >
                    <ArrowRight className="w-5 h-5" />
                  </button>

                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                      activeConversation.is_group
                        ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                        : 'bg-violet-600/20 text-violet-300 border border-violet-500/30'
                    }`}
                  >
                    {activeConversation.is_group ? (
                      <Users className="w-5 h-5" />
                    ) : (
                      activeConversation.avatar_letter
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-white">
                        {activeConversation.title}
                      </span>
                      {activeConversation.is_group && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-900/40 text-purple-300 border border-purple-700/50">
                          مجموعة
                        </span>
                      )}

                      {/* شارة قفل الخط */}
                      <span className="flex items-center gap-1 text-[10px] text-slate-300 bg-[#160E30] px-2 py-0.5 rounded-md border border-purple-800/40 font-mono">
                        <Lock className="w-2.5 h-2.5 text-purple-400" />
                        <span>الخط: {lockedLinesMap[activeConversation.chat_jid] || selectedInstanceName}</span>
                      </span>
                    </div>

                    <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                      <span className="font-mono text-purple-300/80">{activeConversation.phone_or_jid}</span>
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
                  {/* قائمة تغيير الموظف المسند */}
                  <div className="flex items-center gap-1.5 text-xs bg-[#120B24] border border-purple-800/50 rounded-xl px-2 py-1">
                    <UserPlus className="w-3.5 h-3.5 text-purple-400" />
                    <select
                      value={activeConversation.assigned_staff_name || ''}
                      onChange={(e) => handleAssignStaff(e.target.value)}
                      className="bg-transparent text-white text-xs outline-none cursor-pointer"
                    >
                      {AVAILABLE_STAFF.map((s) => (
                        <option key={s.id} value={s.name} className="bg-[#120B24] text-white">
                          {s.name} ({s.role})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* قائمة تغيير حالة المحادثة */}
                  <select
                    value={activeConversation.status}
                    onChange={(e) => handleUpdateStatus(e.target.value as ConversationStatus)}
                    className="bg-[#120B24] text-xs text-white border border-purple-800/50 rounded-xl px-3 py-1.5 outline-none font-medium cursor-pointer"
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
                      className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs transition-colors"
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

                  {/* زر تصعيد للإشراف */}
                  {activeConversation.status !== 'escalated' && (
                    <button
                      onClick={() => handleUpdateStatus('escalated')}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs transition-colors"
                      title="تصعيد المحادثة إلى الإشراف والإدارة فوراً"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      <span>تصعيد</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Messages Feed */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#080512]">
                {loadingMessages ? (
                  <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-2">
                    <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
                    <span className="text-xs">جاري تحميل سجل الرسائل الفعلي...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-slate-500 text-xs">
                    <span>لا توجد رسائل سابقة في هذه المحادثة</span>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isOut = msg.direction === 'out';
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isOut ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[85%] sm:max-w-xl rounded-2xl px-4 py-2.5 text-sm shadow-md transition-all ${
                            isOut
                              ? 'bg-purple-700 text-white rounded-br-none border border-purple-500/50 shadow-purple-950/50'
                              : 'bg-[#150F28] text-slate-100 rounded-bl-none border border-purple-900/40'
                          }`}
                        >
                          {!isOut && activeConversation.is_group && (
                            <div className="text-[11px] font-bold text-purple-300 mb-1">
                              {msg.sender_name}
                            </div>
                          )}

                          <p className="whitespace-pre-wrap leading-relaxed">{msg.body}</p>

                          {msg.signature && (
                            <div className="mt-2 pt-1.5 border-t border-purple-500/30 text-[11px] text-purple-200 flex items-center gap-1 font-mono">
                              <Sparkles className="w-3 h-3 text-purple-300" />
                              <span>{msg.signature}</span>
                            </div>
                          )}

                          <div
                            className={`flex items-center justify-end gap-1.5 text-[10px] mt-1.5 ${
                              isOut ? 'text-purple-200/80' : 'text-slate-400'
                            }`}
                          >
                            <span>{msg.created_at}</span>
                            {isOut && (
                              <span>
                                {msg.status === 'read' ? (
                                  <CheckCheck className="w-3.5 h-3.5 text-cyan-300" />
                                ) : (
                                  <CheckCheck className="w-3.5 h-3.5 text-purple-300" />
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
              <div className="bg-[#0B0716] border-t border-purple-900/30 p-3 shrink-0 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="text-purple-300 text-[11px] font-medium">خط الإرسال المخصص:</span>
                    <span className="text-white text-xs bg-[#160E30] px-2.5 py-0.5 rounded-lg border border-purple-800/40 font-mono">
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
                    <span className="text-slate-300 text-[11px]">
                      تضمين التوقيع الذكي ({user.full_name})
                    </span>
                  </label>
                </div>

                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-10 w-10 p-0 text-slate-400 hover:text-white"
                    title="إرفاق ملف أو مستند"
                  >
                    <Paperclip className="w-5 h-5" />
                  </Button>

                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="اكتب رسالتك إلى العميل... (اضغط Enter للإرسال المباشر عبر واتساب)"
                    disabled={isSending || isBreakerTripped}
                    className="flex-1 bg-[#120B24] text-sm text-slate-100 px-4 py-2.5 rounded-xl border border-purple-900/50 focus:border-purple-500 outline-none placeholder:text-slate-500 disabled:opacity-50"
                  />

                  <Button
                    type="submit"
                    variant="primary"
                    disabled={!inputText.trim() || isSending || isBreakerTripped}
                    className="h-10 px-4 rounded-xl flex items-center gap-2 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white font-medium disabled:opacity-40"
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
                </form>
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

    </div>
  );
}
