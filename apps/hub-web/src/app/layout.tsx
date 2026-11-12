import type { Metadata, Viewport } from 'next';
import './fonts';
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
  themeColor: '#0A0C13',
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
    <html lang="ar" dir="rtl" className="dark theme-google" suppressHydrationWarning>
      <head>
        {/* منع الوميض FOUC Prevention Script في قمة الـ Head — مع ترحيل مفاتيح الثيمات القديمة إلى أسماء v1 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var map = { 'theme-purple': 'theme-violet', 'theme-blue': 'theme-ocean' };
                  var keys = ['theme-google','theme-violet','theme-ocean','theme-emerald','theme-sunset','theme-graphite'];
                  var saved = localStorage.getItem('tripyou_theme');
                  saved = saved ? (map[saved] || saved) : 'theme-google';
                  if (keys.indexOf(saved) === -1) saved = 'theme-google';
                  var savedMode = localStorage.getItem('tripyou_mode') || 'dark';
                  var root = document.documentElement;
                  root.classList.remove.apply(root.classList, keys.concat(['theme-purple','theme-blue','dark','light']));
                  root.classList.add(saved, savedMode);
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="bg-[var(--bg-main)] text-[var(--text-main)] min-h-screen antialiased selection:bg-purple-600 selection:text-white transition-colors duration-200">
        <div className="aurora" aria-hidden="true"><i /><i /><i /><i /></div>
        <AppProvider>
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
