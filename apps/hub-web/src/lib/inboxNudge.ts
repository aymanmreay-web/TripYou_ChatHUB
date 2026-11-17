/**
 * تنبيه لحظي خفيف (nudge) لواجهة الصندوق عبر Supabase Realtime Broadcast.
 *
 * الفكرة: عند وصول/تغيّر رسالة في الـ Webhook نرسل إشارة صغيرة جداً (بصمة قصيرة لـ chat_jid فقط،
 * بلا نص ولا أرقام)، فتقوم الواجهة المفتوحة على هذه المحادثة بجلب صامت فوري بدل انتظار الاستطلاع.
 * لا تُكشف أي بيانات رسائل ولا تحتاج الطريقة إلى تعديل قاعدة البيانات أو سياسات RLS.
 * فشل البث لا يؤثر أبداً على معالجة الـ Webhook (الاستطلاع الاحتياطي في الواجهة يغطي).
 */

export const INBOX_NUDGE_CHANNEL = 'inbox-nudges';
export const INBOX_NUDGE_EVENT = 'msg';

/** بصمة FNV-1a 32-بت (غير تشفيرية) — متطابقة في الخادم والمتصفح. */
export function jidKey(jid: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < jid.length; i++) {
    h ^= jid.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/** بث إشارة «تغيّرت هذه المحادثة» — للاستخدام من جهة الخادم فقط. لا يرمي أخطاء. */
export async function broadcastInboxNudge(chatJid: string): Promise<void> {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://aypnxljvudjtasofiuhp.supabase.co';
    const key =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      'sb_publishable_ngMlkZ_wEUDOMwN91L54hw_70Er1jdo';
    await fetch(`${url}/realtime/v1/api/broadcast`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { topic: INBOX_NUDGE_CHANNEL, event: INBOX_NUDGE_EVENT, payload: { k: jidKey(chatJid) }, private: false },
        ],
      }),
      signal: AbortSignal.timeout(2000),
    });
  } catch {
    /* غير حرج */
  }
}
