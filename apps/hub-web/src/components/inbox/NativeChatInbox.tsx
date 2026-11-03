'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Send,
  Search,
  Paperclip,
  CheckCheck,
  Check,
  Radio,
  Phone,
  MoreVertical,
  Users,
  User,
  Sparkles,
  ArrowRight,
  Filter,
  RefreshCw,
  Clock,
  ShieldCheck,
  Smile
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { MOCK_CONVERSATIONS, MOCK_MESSAGES } from '../../lib/mock-data';
import { ConversationItem, ChatMessage } from '../../types';
import { Button, Badge, Input } from '@resvbar/ui';

export function NativeChatInbox() {
  const { user, selectedLine, lines, setSelectedLineId } = useApp();

  const [conversations, setConversations] = useState<ConversationItem[]>(MOCK_CONVERSATIONS);
  const [messagesMap, setMessagesMap] = useState<Record<string, ChatMessage[]>>(MOCK_MESSAGES);
  const [activeConvId, setActiveConvId] = useState<string>('conv-01');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterTab, setFilterTab] = useState<'all' | 'unread' | 'groups'>('all');
  const [inputText, setInputText] = useState<string>('');
  const [sendLineId, setSendLineId] = useState<string>(selectedLine?.id || 'line-01');
  const [includeSignature, setIncludeSignature] = useState<boolean>(true);
  const [showMobileChat, setShowMobileChat] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeConversation = useMemo(() => {
    return conversations.find((c) => c.id === activeConvId) || conversations[0];
  }, [conversations, activeConvId]);

  const activeMessages = useMemo(() => {
    return messagesMap[activeConvId] || [];
  }, [messagesMap, activeConvId]);

  const currentSendLine = useMemo(() => {
    return lines.find((l) => l.id === sendLineId) || selectedLine;
  }, [lines, sendLineId, selectedLine]);

  // Auto-scroll down when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages]);

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

    // mark as read
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, unread_count: 0 } : c))
    );
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed) return;

    const signature = includeSignature
      ? `*${user.full_name}* — ${currentSendLine.title_ar}`
      : undefined;

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      conversation_id: activeConvId,
      chat_jid: activeConversation.chat_jid,
      direction: 'out',
      body: trimmed,
      media_type: 'text',
      sender_name: user.full_name,
      signature,
      status: 'sent',
      line_id: currentSendLine.id,
      created_at: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
    };

    // Append to messages
    setMessagesMap((prev) => ({
      ...prev,
      [activeConvId]: [...(prev[activeConvId] || []), newMsg]
    }));

    // Update conversation last message
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConvId
          ? {
              ...c,
              last_message_text: trimmed,
              last_message_at: 'الآن'
            }
          : c
      )
    );

    setInputText('');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] rounded-2xl overflow-hidden border border-slate-800/80 bg-slate-950 shadow-2xl">
      {/* Top Main Toolbar */}
      <div className="bg-slate-900/95 border-b border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
        {/* Connection status with Evolution API */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Radio className="w-4 h-4 animate-pulse" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-white">منصة واتساب المباشرة (Evolution API)</span>
                <Badge variant="live" size="sm">
                  مباشر ومستقر
                </Badge>
              </div>
              <div className="text-xs text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                <span>الخط الافتراضي: {selectedLine.title_ar}</span>
                <span>•</span>
                <span className="text-emerald-400">زمن الاستجابة: 24ms</span>
              </div>
            </div>
          </div>
        </div>

        {/* Global Line Switcher */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1.5 rounded-lg border border-slate-700/60 text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-slate-300">بدون وسيط • مباشر مع السيرفر</span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-400 mr-2">
            <span>الخط النشط:</span>
            <select
              value={selectedLine.id}
              onChange={(e) => {
                setSelectedLineId(e.target.value);
                setSendLineId(e.target.value);
              }}
              className="bg-slate-800 text-xs text-slate-200 border border-slate-700 rounded-lg px-2.5 py-1.5 outline-none focus:border-emerald-500"
            >
              {lines.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title_ar} ({l.phone_masked})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Chat Workspace */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Right Pane: Conversations List */}
        <div
          className={`w-full md:w-80 lg:w-96 flex flex-col border-l border-slate-800 bg-slate-900/60 shrink-0 ${
            showMobileChat ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Search & Filters */}
          <div className="p-3 border-b border-slate-800/80 space-y-2.5">
            <div className="relative">
              <Search className="w-4 h-4 absolute right-3 top-3 text-slate-500" />
              <input
                type="text"
                placeholder="بحث في المحادثات أو الأرقام..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950/80 text-xs text-slate-200 pr-9 pl-3 py-2 rounded-xl border border-slate-800 focus:border-emerald-500/50 outline-none placeholder:text-slate-500"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 text-xs">
              <button
                onClick={() => setFilterTab('all')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  filterTab === 'all'
                    ? 'bg-emerald-500/20 text-emerald-400 font-medium border border-emerald-500/30'
                    : 'text-slate-400 hover:text-white bg-slate-800/40'
                }`}
              >
                الكل ({conversations.length})
              </button>
              <button
                onClick={() => setFilterTab('unread')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  filterTab === 'unread'
                    ? 'bg-emerald-500/20 text-emerald-400 font-medium border border-emerald-500/30'
                    : 'text-slate-400 hover:text-white bg-slate-800/40'
                }`}
              >
                غير مقروء ({conversations.filter((c) => c.unread_count > 0).length})
              </button>
              <button
                onClick={() => setFilterTab('groups')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  filterTab === 'groups'
                    ? 'bg-emerald-500/20 text-emerald-400 font-medium border border-emerald-500/30'
                    : 'text-slate-400 hover:text-white bg-slate-800/40'
                }`}
              >
                المجموعات
              </button>
            </div>
          </div>

          {/* Conversations Scroll Area */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/50">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                لا توجد محادثات مطابقة للبحث
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = conv.id === activeConvId;
                return (
                  <button
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv.id)}
                    className={`w-full text-right p-3.5 flex items-start gap-3 transition-colors ${
                      isSelected
                        ? 'bg-emerald-500/10 border-r-2 border-emerald-500'
                        : 'hover:bg-slate-800/40'
                    }`}
                  >
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      <div
                        className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm ${
                          conv.is_group
                            ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}
                      >
                        {conv.is_group ? <Users className="w-5 h-5" /> : conv.avatar_letter}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="font-semibold text-sm text-slate-200 truncate">
                          {conv.title}
                        </span>
                        <span className="text-[10px] text-slate-500 whitespace-nowrap">
                          {conv.last_message_at}
                        </span>
                      </div>

                      <p className="text-xs text-slate-400 truncate mb-1.5">
                        {conv.last_message_text}
                      </p>

                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/50">
                          {conv.line_title}
                        </span>

                        {conv.unread_count > 0 && (
                          <span className="bg-emerald-500 text-slate-950 font-bold text-[10px] px-1.5 py-0.5 rounded-full min-w-5 text-center">
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
          className={`flex-1 flex flex-col bg-slate-950 ${
            showMobileChat ? 'flex' : 'hidden md:flex'
          }`}
        >
          {activeConversation ? (
            <>
              {/* Chat Header */}
              <div className="bg-slate-900/80 border-b border-slate-800 px-4 py-3 flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-3">
                  {/* Mobile Back Button */}
                  <button
                    onClick={() => setShowMobileChat(false)}
                    className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                  >
                    <ArrowRight className="w-5 h-5" />
                  </button>

                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                      activeConversation.is_group
                        ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
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
                      {activeConversation.tags?.map((t, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-emerald-400 border border-slate-700"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                    <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                      <span>{activeConversation.phone_or_jid}</span>
                      <span>•</span>
                      <span className="text-slate-500">
                        مستقبل عبر: {activeConversation.line_title}
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
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-950/60">
                {activeMessages.map((msg) => {
                  const isOut = msg.direction === 'out';
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isOut ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[85%] sm:max-w-xl rounded-2xl px-4 py-2.5 text-sm shadow-md transition-all ${
                          isOut
                            ? 'bg-emerald-600/90 text-white rounded-br-none border border-emerald-500/40'
                            : 'bg-slate-900 text-slate-100 rounded-bl-none border border-slate-800'
                        }`}
                      >
                        {/* Group Sender Name */}
                        {!isOut && activeConversation.is_group && (
                          <div className="text-[11px] font-bold text-emerald-400 mb-1">
                            {msg.sender_name}
                          </div>
                        )}

                        {/* Body */}
                        <p className="whitespace-pre-wrap leading-relaxed">{msg.body}</p>

                        {/* Signature (if present) */}
                        {msg.signature && (
                          <div className="mt-2 pt-1.5 border-t border-emerald-500/30 text-[11px] text-emerald-100/90 flex items-center gap-1 font-mono">
                            <Sparkles className="w-3 h-3 text-emerald-300" />
                            <span>{msg.signature}</span>
                          </div>
                        )}

                        {/* Meta (Time & Status) */}
                        <div
                          className={`flex items-center justify-end gap-1.5 text-[10px] mt-1.5 ${
                            isOut ? 'text-emerald-100/70' : 'text-slate-400'
                          }`}
                        >
                          <span>{msg.created_at}</span>
                          {isOut && (
                            <span>
                              {msg.status === 'read' ? (
                                <CheckCheck className="w-3.5 h-3.5 text-cyan-200" />
                              ) : msg.status === 'delivered' ? (
                                <CheckCheck className="w-3.5 h-3.5 text-emerald-200" />
                              ) : (
                                <Check className="w-3.5 h-3.5" />
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input Bar */}
              <div className="bg-slate-900/95 border-t border-slate-800 p-3 shrink-0 space-y-2">
                {/* Send Controls: Line Selector + Signature Switch */}
                <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-300 font-medium">الإرسال عبر:</span>
                    <select
                      value={sendLineId}
                      onChange={(e) => setSendLineId(e.target.value)}
                      className="bg-slate-800 text-xs text-slate-200 border border-slate-700 rounded-lg px-2 py-1 outline-none focus:border-emerald-500"
                    >
                      {lines.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.title_ar} ({l.phone_masked})
                        </option>
                      ))}
                    </select>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={includeSignature}
                      onChange={(e) => setIncludeSignature(e.target.checked)}
                      className="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-0"
                    />
                    <span className="text-slate-300">
                      تضمين التوقيع الذكي ({user.full_name})
                    </span>
                  </label>
                </div>

                {/* Textbox & Send Button */}
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-10 w-10 p-0 text-slate-400 hover:text-white"
                      title="إرفاق ملف أو صورة"
                    >
                      <Paperclip className="w-5 h-5" />
                    </Button>
                  </div>

                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={`اكتب رسالتك عبر [${currentSendLine.title_ar}]... (اضغط Enter للإرسال)`}
                    className="flex-1 bg-slate-950 text-sm text-slate-100 px-4 py-2.5 rounded-xl border border-slate-800 focus:border-emerald-500 outline-none placeholder:text-slate-500"
                  />

                  <Button
                    type="submit"
                    variant="primary"
                    disabled={!inputText.trim()}
                    className="h-10 px-4 rounded-xl flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium disabled:opacity-40"
                  >
                    <span>إرسال</span>
                    <Send className="w-4 h-4 rotate-180" />
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
              <User className="w-12 h-12 mb-3 text-slate-600" />
              <p className="text-sm font-medium">اختر محادثة من القائمة للبدء في المراسلة</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

