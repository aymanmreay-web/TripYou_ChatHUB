'use client';

/**
 * مساعدات رسائل الصندوق النقية (مستخلصة من NativeChatInbox ضمن خطة التوحيد).
 * لا حالة ولا شبكة هنا — دوال عرض فقط، قابلة للاختبار وحرية الاستخدام من أي مكوّن.
 */
import React from 'react';
import { ArrowUpRight } from 'lucide-react';

// ─────────────────────────────────────────────
// 🔧 تحويل معرف الرسالة أو الرابط إلى رابط وكيل لفك التشفير
// ⚠️ روابط blob:/data: المؤقتة يجب ألا تُغلَّف بالوكيل — استخدم الدالة لفرع المعرّف فقط
// ─────────────────────────────────────────────
export function getProxiedUrl(
  mediaUrl: string | undefined,
  instanceName: string,
  messageId?: string,
  fileName?: string,
  download?: boolean
): string | null {
  const fnParam = fileName ? `&fileName=${encodeURIComponent(fileName)}` : '';
  const dlParam = download ? '&download=true' : '';
  if (messageId) {
    return `/api/evolution/instances/${instanceName}/media/proxy?id=${encodeURIComponent(messageId)}${fnParam}${dlParam}`;
  }
  if (!mediaUrl) return null;
  if (mediaUrl.startsWith('data:')) return mediaUrl;
  return `/api/evolution/instances/${instanceName}/media/proxy?url=${encodeURIComponent(mediaUrl)}${fnParam}${dlParam}`;
}

// ─────────────────────────────────────────────
// 🎵 توليد ارتفاعات أعمدة موجة صوتية (شبه عشوائي ثابت من معرّف الرسالة)
// ─────────────────────────────────────────────
export function getWaveformBars(seed: string, count = 32): number[] {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) & 0xffffffff;
  return Array.from({ length: count }, () => {
    hash = (hash * 1664525 + 1013904223) & 0xffffffff;
    return 20 + (Math.abs(hash) % 60); // ارتفاع 20% – 80%
  });
}

// ─────────────────────────────────────────────
// 🔗 تلوين الروابط داخل نص الرسالة (http, https, www, wa.me, t.me)
// ─────────────────────────────────────────────
export function formatMessageWithLinks(content: string) {
  if (!content) return null;
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|wa\.me\/[^\s]+|t\.me\/[^\s]+)/gi;
  const parts = content.split(urlRegex);

  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      const href = part.startsWith('http') ? part : `https://${part}`;
      return (
        <a
          key={index}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-purple-300 hover:text-purple-200 underline underline-offset-2 break-all font-mono font-medium inline-flex items-center gap-0.5 mx-0.5 transition-colors"
          dir="ltr"
        >
          <span>{part}</span>
          <ArrowUpRight className="w-3 h-3 inline-block shrink-0 opacity-80" />
        </a>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

// ─────────────────────────────────────────────
// 📎 بيانات بطاقة المستند حسب الامتداد
// ─────────────────────────────────────────────
export function getFileCardMeta(fileName: string) {
  const name = fileName || '';
  const lower = name.toLowerCase();
  if (lower.endsWith('.xlsx') || lower.endsWith('.xls') || lower.endsWith('.csv')) {
    return {
      type: 'Excel',
      ext: 'XLSX',
      badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      cardBg: 'bg-emerald-950/40 border-emerald-500/30 hover:border-emerald-500/60',
      iconColor: 'text-emerald-400',
      isSheet: true,
    };
  }
  if (lower.endsWith('.pdf')) {
    return {
      type: 'PDF',
      ext: 'PDF',
      badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      cardBg: 'bg-rose-950/40 border-rose-500/30 hover:border-rose-500/60',
      iconColor: 'text-rose-400',
      isPdf: true,
    };
  }
  if (lower.endsWith('.docx') || lower.endsWith('.doc')) {
    return {
      type: 'Word',
      ext: 'DOCX',
      badge: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
      cardBg: 'bg-blue-950/40 border-blue-500/30 hover:border-blue-500/60',
      iconColor: 'text-blue-400',
      isWord: true,
    };
  }
  if (lower.endsWith('.zip') || lower.endsWith('.rar') || lower.endsWith('.7z') || lower.endsWith('.tar')) {
    return {
      type: 'Archive',
      ext: 'ZIP',
      badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      cardBg: 'bg-amber-950/40 border-amber-500/30 hover:border-amber-500/60',
      iconColor: 'text-amber-400',
      isArchive: true,
    };
  }
  return {
    type: 'Document',
    ext: lower.split('.').pop()?.toUpperCase() || 'FILE',
    badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    cardBg: 'bg-purple-950/40 border-purple-500/30 hover:border-purple-500/60',
    iconColor: 'text-purple-400',
    isGeneric: true,
  };
}
