'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '../context/AppContext';
import { AppShell } from '../components/layout/AppShell';
import { ChatwootIframe } from '../components/inbox/ChatwootIframe';

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
      <ChatwootIframe />
    </AppShell>
  );
}
