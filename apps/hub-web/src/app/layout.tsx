import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { AppProvider } from '../context/AppContext';

// Self-hosted (no Google Fonts fetch at build time) — package: @fontsource-variable/cairo
const cairo = localFont({
  src: [
    {
      path: '../../../../node_modules/@fontsource-variable/cairo/files/cairo-arabic-wght-normal.woff2',
      style: 'normal',
    },
    {
      path: '../../../../node_modules/@fontsource-variable/cairo/files/cairo-latin-wght-normal.woff2',
      style: 'normal',
    },
  ],
  weight: '200 1000',
  variable: '--font-cairo',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ResvBAR Hub | منصة إدارة المحادثات والعمليات',
  description: 'طبقة إدارة مركزية متطورة فوق Chatwoot و Evolution API لشركة ResvBAR',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/icon-192.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#0B0F17',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable} dark`}>
      <body className="bg-[#0B0F17] text-slate-100 min-h-screen antialiased">
        <AppProvider>
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
