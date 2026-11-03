'use client';

import React from 'react';
import { AppShell } from '../../components/layout/AppShell';
import { NativeChatInbox } from '../../components/inbox/NativeChatInbox';

export default function InboxPage() {
  return (
    <AppShell>
      <NativeChatInbox />
    </AppShell>
  );
}
