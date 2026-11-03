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
  WifiOff
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ConversationItem, ChatMessage } from '../../types';
import { Button } from '@tripyou/ui';

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
  const [filterTab, setFilterTab] = useState<'all' | 'unread' | 'groups'>('all');
  const [inputText, setInputText] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [includeSignature, setIncludeSignature] = useState<boolean>(true);
  const [showMobileChat, setShowMobileChat] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Fetch connected instances from Evolution API
  const fetchInstances = useCallback(async () => {
    try {
      setLoadingInstances(true);
      const res = await fetch('/api/evolution/instances');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setInstances(data);
          // If current selected not in list or not connected, pick the first open one or first available
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
          const mapped: ConversationItem[] = rawChats.map((c: any) => {
            const jid = c.remoteJid || c.id || '';
            const isGroup = jid.includes('@g.us');
            const cleanPhone = jid.replace('@s.whatsapp.net', '').replace('@g.us', '');
            
            // Format phone or title
            let title = c.pushName || '';
            if (!title) {
              title = isGroup ? 'مجموعة واتساب' : cleanPhone ? `+${cleanPhone}` : 'محادثة جديدة';
            }

            // Extract last message text
            let lastText = '';
            if (c.lastMessage?.message) {
              const msgObj = c.lastMessage.message;
              lastText =
                msgObj.conversation ||
                msgObj.extendedTextMessage?.text ||
                msgObj.documentMessage?.caption ||
                msgObj.imageMessage?.caption ||
                (c.lastMessage.messageType ? `[${c.lastMessage.messageType}]` : '');
            }

            // Format timestamp
            let timeStr = '';
            if (c.updatedAt) {
              const date = new Date(c.updatedAt);
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
            };
          });

          setConversations(mapped);
          if (mapped.length > 0 && !activeConvId) {
            setActiveConvId(mapped[0].id);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load chats:', err);
    } finally {
      setLoadingChats(false);
    }
  }, [user, activeConvId]);

  // When selected instance changes, reload chats
  useEffect(() => {
    if (selectedInstanceName) {
      setActiveConvId('');
      setMessages([]);
      fetchChats(selectedInstanceName);
    }
  }, [selectedInstanceName, fetchChats]);

  // 3. Fetch real messages when active conversation changes
  const fetchMessagesForChat = useCallback(async (chatJid: string, instanceName: string) => {
    if (!chatJid || !instanceName) return;
    try {
      setLoadingMessages(true);
      const res = await fetch(`/api/evolution/instances/${instanceName}/messages?chatId=${encodeURIComponent(chatJid)}&limit=50`);
      if (res.ok) {
        const rawMsgs = await res.json();
        // Evolution returns array or { messages: [] } or { records: [] }
        const list = Array.isArray(rawMsgs) ? rawMsgs : rawMsgs.messages || rawMsgs.records || [];
        
        const mapped: ChatMessage[] = list.map((m: any) => {
          const fromMe = m.key?.fromMe ?? false;
          let text = '';
          if (m.message) {
            text =
              m.message.conversation ||
              m.message.extendedTextMessage?.text ||
              m.message.documentMessage?.caption ||
              m.message.imageMessage?.caption ||
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
            body: text || '(رسالة وسائط أو بدون نص)',
            media_type: m.messageType || 'text',
            sender_name: fromMe ? 'أنا' : (m.pushName || 'العميل'),
            status: fromMe ? (m.status === 'READ' ? 'read' : 'delivered') : undefined,
            line_id: instanceName,
            created_at: timeStr || 'الآن',
          };
        });

        // Evolution usually returns newest first or oldest first. Let's ensure chronological order:
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

  // Filter conversations
  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => {
      const matchSearch =
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone_or_jid.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.last_message_text.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchSearch) return false;
      if (filterTab === 'unread') return c.unread_count > 0;
      if (filterTab === 'groups') return c.is_group;
      return true;
    });
  }, [conversations, searchQuery, filterTab]);

  const handleSelectConversation = (id: string) => {
    setActiveConvId(id);
    setShowMobileChat(true);

    // mark as read in local state
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, unread_count: 0 } : c))
    );
  };

  // Real Send Message via Evolution API
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || !activeConversation || isSending) return;

    setIsSending(true);

    const signature = includeSignature
      ? `\n\n*${user.full_name}* — ${currentInstance?.profileName || selectedInstanceName}`
      : '';

    const fullMessage = `${trimmed}${signature}`;

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
        // Optimistic append
        const newMsg: ChatMessage = {
          id: `msg-${Date.now()}`,
          conversation_id: activeConversation.id,
          chat_jid: activeConversation.chat_jid,
          direction: 'out',
          body: trimmed,
          signature: signature.trim() || undefined,
          media_type: 'text',
          sender_name: user.full_name,
          status: 'sent',
          line_id: selectedInstanceName,
          created_at: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
        };

        setMessages((prev) => [...prev, newMsg]);

        // Update conversation last message in sidebar
        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeConversation.id
              ? {
                  ...c,
                  last_message_text: trimmed,
                  last_message_at: 'الآن',
                }
              : c
          )
        );

        setInputText('');
      } else {
        const errData = await res.json();
        alert(`فشل الإرسال عبر خادم واتساب: ${errData.error || res.statusText}`);
      }
    } catch (err: any) {
      alert(`خطأ في الاتصال أثناء الإرسال: ${err.message}`);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] rounded-2xl overflow-hidden border border-purple-900/40 bg-[#080512] shadow-2xl">
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

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 text-xs">
              <button
                onClick={() => setFilterTab('all')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  filterTab === 'all'
                    ? 'bg-purple-600/30 text-purple-300 font-medium border border-purple-500/50'
                    : 'text-slate-400 hover:text-white bg-slate-800/30'
                }`}
              >
                الكل ({conversations.length})
              </button>
              <button
                onClick={() => setFilterTab('unread')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  filterTab === 'unread'
                    ? 'bg-purple-600/30 text-purple-300 font-medium border border-purple-500/50'
                    : 'text-slate-400 hover:text-white bg-slate-800/30'
                }`}
              >
                غير مقروء ({conversations.filter((c) => c.unread_count > 0).length})
              </button>
              <button
                onClick={() => setFilterTab('groups')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  filterTab === 'groups'
                    ? 'bg-purple-600/30 text-purple-300 font-medium border border-purple-500/50'
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

                      <p className="text-[11px] text-slate-300 truncate mb-1 leading-snug">
                        {conv.last_message_text}
                      </p>

                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] text-purple-400/80 font-mono truncate">
                          {conv.phone_or_jid}
                        </span>
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
              {/* Chat Header */}
              <div className="bg-[#0B0716] border-b border-purple-900/30 px-4 py-3 flex items-center justify-between gap-3 shrink-0">
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
                    </div>
                    <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                      <span className="font-mono text-purple-300/80">{activeConversation.phone_or_jid}</span>
                      <span>•</span>
                      <span className="text-slate-400">
                        مستقبل عبر: {selectedInstanceName}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                  >
                    <Phone className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </Button>
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
                          {/* Sender name for group inbound */}
                          {!isOut && activeConversation.is_group && (
                            <div className="text-[11px] font-bold text-purple-300 mb-1">
                              {msg.sender_name}
                            </div>
                          )}

                          {/* Body */}
                          <p className="whitespace-pre-wrap leading-relaxed">{msg.body}</p>

                          {/* Signature (if present) */}
                          {msg.signature && (
                            <div className="mt-2 pt-1.5 border-t border-purple-500/30 text-[11px] text-purple-200 flex items-center gap-1 font-mono">
                              <Sparkles className="w-3 h-3 text-purple-300" />
                              <span>{msg.signature}</span>
                            </div>
                          )}

                          {/* Meta (Time & Status) */}
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

              {/* Chat Input Bar */}
              <div className="bg-[#0B0716] border-t border-purple-900/30 p-3 shrink-0 space-y-2">
                {/* Signature Switch & Line Tag */}
                <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="text-purple-300 text-[11px] font-medium">الإرسال من خط:</span>
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

                {/* Textbox & Send Button */}
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-10 w-10 p-0 text-slate-400 hover:text-white"
                    title="إرفاق ملف أو صورة"
                  >
                    <Paperclip className="w-5 h-5" />
                  </Button>

                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="اكتب رسالتك إلى العميل... (اضغط Enter للإرسال المباشر عبر واتساب)"
                    disabled={isSending}
                    className="flex-1 bg-[#120B24] text-sm text-slate-100 px-4 py-2.5 rounded-xl border border-purple-900/50 focus:border-purple-500 outline-none placeholder:text-slate-500 disabled:opacity-50"
                  />

                  <Button
                    type="submit"
                    variant="primary"
                    disabled={!inputText.trim() || isSending}
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
    </div>
  );
}
