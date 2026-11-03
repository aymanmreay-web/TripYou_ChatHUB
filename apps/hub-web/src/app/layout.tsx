import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AppProvider } from '../context/AppContext';

export const metadata: Metadata = {
  title: 'YouTrip ChatHUB | منصة إدارة المحادثات',
  description: 'منصة YouTrip ChatHUB لإدارة محادثات واتساب - © م. أيمن مريعي — By Eng. Ayman Mreay. جميع الحقوق محفوظة',
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
    <html lang="ar" dir="rtl" className="dark">
      <body className="bg-[#0B0F17] text-slate-100 min-h-screen antialiased">
        <AppProvider>
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
