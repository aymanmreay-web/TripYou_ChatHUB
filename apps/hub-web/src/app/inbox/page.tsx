'use client';

import React from 'react';
import { AppShell } from '../../components/layout/AppShell';
import { ChatwootIframe } from '../../components/inbox/ChatwootIframe';

export default function InboxPage() {
  return (
    <AppShell>
      <ChatwootIframe />
    </AppShell>
  );
}
