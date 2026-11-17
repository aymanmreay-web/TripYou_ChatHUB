'use client';
/**
 * QuickChatsInbox — الواجهة الشاملة للمحادثات السريعة
 * ─────────────────────────────────────────────────────────────
 * ✅ الصناديق للاستقبال (Box-Scoped Inbound)
 * ✅ دمج المجموعات المشتركة وتوحيدها في مسار واحد
 * ✅ قواعد رؤية المحتوى (المدير يرى كل شيء / المشرف يرى صناديقه / الموظف يرى مسوداته)
 * ✅ خطوط الإرسال التابعة للمستخدم مع التوقيع الذكي
 * ✅ معالجة أرقام المجموعات غير المنتمية
 */
import React, { useState, useCallback, useEffect } from 'react';
import { useQuickChats } from './useQuickChats';
import { QCConversationList } from './QCConversationList';
import { QCChatWindow } from './QCChatWindow';
import { ChevronRight } from 'lucide-react';

export function QuickChatsInbox() {
  const qc = useQuickChats();
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');

  const handleSelect = useCallback((id: string) => {
    qc.selectConversation(id);
    setMobileView('chat');
  }, [qc.selectConversation]);

  const handleBack = useCallback(() => {
    setMobileView('list');
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileView === 'chat') setMobileView('list');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileView]);

  return (
    <div
      className="flex h-[calc(100vh-5.5rem)] overflow-hidden rounded-2xl border border-[var(--border-subtle)] shadow-2xl bg-[var(--card-bg)]"
      dir="rtl"
    >
      {/* ════ Conversation List Panel ════ */}
      <div
        className={`
          w-full md:w-80 lg:w-80 xl:w-96 shrink-0 flex flex-col
          ${mobileView === 'chat' ? 'hidden md:flex' : 'flex'}
        `}
      >
        <QCConversationList
          conversations={qc.conversations}
          allCount={qc.allConversations.length}
          activeId={qc.activeId}
          filterTab={qc.filterTab}
          searchQuery={qc.searchQuery}
          isLoading={qc.isLoadingChats}
          connectionStatus={qc.connectionStatus}
          inboxes={qc.inboxes}
          selectedInboxId={qc.selectedInboxId}
          onSelectInbox={qc.setSelectedInboxId}
          onSelect={handleSelect}
          onFilterChange={qc.setFilterTab}
          onSearchChange={qc.setSearchQuery}
          onLoadMore={qc.loadMoreConversations}
          onRefresh={qc.refresh}
          getLineTitle={qc.getLineDisplayTitle}
        />
      </div>

      {/* ════ Chat Window Panel ════ */}
      <div
        className={`
          flex-1 flex flex-col relative overflow-hidden
          ${mobileView === 'list' ? 'hidden md:flex' : 'flex'}
        `}
      >
        {mobileView === 'chat' && (
          <button
            onClick={handleBack}
            className="md:hidden absolute top-3 right-4 z-20 flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
            العودة
          </button>
        )}

        <QCChatWindow
          conversation={qc.activeConversation}
          inputText={qc.inputText}
          isSending={qc.isSending}
          replyTo={qc.replyTo}
          userAllowedSendLines={qc.userAllowedSendLines}
          selectedSendLine={qc.selectedSendLine}
          contentAccess={qc.contentAccess}
          lineBlockModal={qc.lineBlockModal}
          onCloseLineBlockModal={() => qc.setLineBlockModal(null)}
          onSubmitPermissionRequest={qc.submitPermissionRequest}
          onChooseSendLine={qc.chooseSendLine}
          onSend={qc.sendMessage}
          onSendMedia={qc.sendMedia}
          onInputChange={qc.setInputText}
          onReplyTo={qc.setReplyTo}
          onLoadMore={qc.loadMoreMessages}
          getLineTitle={qc.getLineDisplayTitle}
        />
      </div>
    </div>
  );
}
