'use client';

import React from 'react';
import { AppShell } from '../../components/layout/AppShell';
import { QuickChatsInbox } from '../../components/quick-chats/QuickChatsInbox';

export default function QuickChatsPage() {
  return (
    <AppShell>
      <QuickChatsInbox />
    </AppShell>
  );
}
