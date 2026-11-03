'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '../context/AppContext';
import { AppShell } from '../components/layout/AppShell';
import { NativeChatInbox } from '../components/inbox/NativeChatInbox';

export default function HomePage() {
  const router = useRouter();
  const { isLoggedIn } = useApp();

  useEffect(() => {
    if (!isLoggedIn) {
      router.push('/login');
    }
  }, [isLoggedIn, router]);

  return (
    <AppShell>
      <NativeChatInbox />
    </AppShell>
  );
}
