import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AppProvider } from '../context/AppContext';

export const metadata: Metadata = {
  title: 'TripYou_ChatHUB | منصة إدارة المحادثات',
  description: 'TripYou_ChatHUB — منصة إدارة محادثات واتساب الموحدة لشركة سياحة وسفر - © م. أيمن مريعي — By Eng. Ayman Mreay. جميع الحقوق محفوظة',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/icon-192.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#080512',
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
      <body className="bg-[#080512] text-slate-100 min-h-screen antialiased selection:bg-purple-600 selection:text-white">
        <AppProvider>
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
