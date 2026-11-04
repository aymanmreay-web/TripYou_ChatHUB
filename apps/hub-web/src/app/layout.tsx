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
  themeColor: '#07040E',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className="dark theme-purple" suppressHydrationWarning>
      <head>
        {/* منع الوميض FOUC Prevention Script في قمة الـ Head */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var savedTheme = localStorage.getItem('tripyou_theme') || 'theme-purple';
                  var savedMode = localStorage.getItem('tripyou_mode') || 'dark';
                  var root = document.documentElement;
                  root.classList.remove('theme-purple', 'theme-blue', 'dark', 'light');
                  root.classList.add(savedTheme, savedMode);
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="bg-[var(--bg-main)] text-[var(--text-main)] min-h-screen antialiased selection:bg-purple-600 selection:text-white transition-colors duration-200">
        <AppProvider>
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
