import { q } from '../pg';
import { insertNotification, getLineStaff } from './notify';
import { storeOutboundStaffMessage } from './storeMessage';

/**
 * الرد الآلي خارج دوام العمل + تمرير الرسائل إلى نظام الأتمتة n8n.
 * الإعدادات في app_settings/m.after_hours (تبويب "ساعات العمل" في الإعدادات).
 */

const EVOLUTION_URL = process.env.EVOLUTION_URL || 'https://evo.69.62.122.89.sslip.io';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || 'bc6075e9f95967407faae5d0fa9ac875a8d88a94782172db';

const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export interface AfterHoursSettings {
  enabled: boolean;
  timezone: string;
  weekly: Record<string, string[][]>;
  template_ar: string;
  send_to_n8n: boolean;
  n8n_webhook_url: string;
  apply_to_groups: boolean;
}

export async function getAfterHoursSettings(): Promise<AfterHoursSettings> {
  try {
    const rows = await q<{ value: AfterHoursSettings }>(
      `select value from public.app_settings where key = 'after_hours' limit 1`
    );
    return (
      rows[0]?.value || {
        enabled: false,
        timezone: 'Asia/Riyadh',
        weekly: {},
        template_ar: '',
        send_to_n8n: false,
        n8n_webhook_url: '',
        apply_to_groups: false,
      }
    );
  } catch {
    return {
      enabled: false,
      timezone: 'Asia/Riyadh',
      weekly: {},
      template_ar: '',
      send_to_n8n: false,
      n8n_webhook_url: '',
      apply_to_groups: false,
    };
  }
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map((x) => parseInt(x, 10));
  return (h || 0) * 60 + (m || 0);
}

/** هل الوقت الحالي داخل دوام العمل حسب الجدول الأسبوعي والمنطقة الزمنية؟ */
export function isWithinWorkingHours(settings: AfterHoursSettings, at: Date = new Date()): boolean {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: settings.timezone || 'Asia/Riyadh',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(at);
    const weekday = parts.find((p) => p.type === 'weekday')?.value.toLowerCase() || '';
    const hour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
    const minute = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);
    const nowMin = hour * 60 + minute;
    const dayKey = WEEKDAYS.includes(weekday) ? weekday : '';
    const ranges = (settings.weekly || {})[dayKey] || [];
    return ranges.some(([s, e]) => nowMin >= toMinutes(s) && nowMin < toMinutes(e));
  } catch {
    return true; // عند أي خطأ نعتبره داخل الدوام (لا رد آلي خاطئ)
  }
}

/** تمرير حدث إلى n8n — fire-and-forget بمهلة 8 ثوانٍ ولا يعطل المسار أبداً */
export async function forwardToN8n(url: string, payload: Record<string, any>): Promise<boolean> {
  if (!url) return false;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'tripyou-chathub', at: new Date().toISOString(), ...payload }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));
    return res.ok;
  } catch (err) {
    console.warn('[afterHours] n8n forward failed (non-critical):', (err as Error).message);
    return false;
  }
}

export interface AfterHoursOutcome {
  outside: boolean;
  replied: boolean;
  forwarded: boolean;
}

/** الفحص الرئيسي بعد تخزين رسالة واردة: رد آلي + إشعار + تمرير n8n */
export async function handleAfterHours(opts: {
  lineId: string | null;
  instanceName: string;
  chatJid: string;
  contactName: string;
  isGroup: boolean;
  originalEvent: any;
}): Promise<AfterHoursOutcome> {
  const outcome: AfterHoursOutcome = { outside: false, replied: false, forwarded: false };
  try {
    const settings = await getAfterHoursSettings();
    if (!settings.enabled) return outcome;

    if (opts.isGroup && !settings.apply_to_groups) return outcome;
    if (isWithinWorkingHours(settings)) return outcome;
    outcome.outside = true;

    // منع التكرار: لا رد آلي أكثر من مرة كل 4 ساعات لنفس المحادثة
    const recent = await q(
      `select 1 from public.messages
       where chat_jid = $1 and is_auto = true and created_at > now() - interval '4 hours'
       limit 1`,
      [opts.chatJid]
    );

    if (recent.length === 0 && settings.template_ar) {
      const number = opts.chatJid.split('@')[0];
      const text = settings.template_ar
        .replaceAll('{name}', opts.contactName || 'عميلنا العزيز')
        .replaceAll('{phone}', number);
      const res = await fetch(`${EVOLUTION_URL}/message/sendText/${encodeURIComponent(opts.instanceName)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: EVOLUTION_API_KEY },
        body: JSON.stringify({ number: opts.chatJid, text }),
      });
      if (res.ok) {
        const data: any = await res.json().catch(() => null);
        const waId = data?.key?.id;
        await storeOutboundStaffMessage({
          instance: opts.instanceName,
          chatJid: opts.chatJid,
          waMessageId: waId || `auto-${Date.now()}`,
          staffId: null,
          body: text,
          mediaType: 'text',
          isAuto: true,
        });
        outcome.replied = true;

        // إشعار الموظفين المخوّلين للخط بأن رداً آلياً أُرسل
        if (opts.lineId) {
          const staff = await getLineStaff(opts.lineId);
          for (const s of staff) {
            await insertNotification({
              staffId: s.id,
              kind: 'after_hours',
              title: '🌙 رد آلي خارج الدوام',
              body: `${opts.contactName} — ${text.slice(0, 60)}…`,
              link: `/inbox?chat=${encodeURIComponent(opts.chatJid)}`,
              chatJid: opts.chatJid,
              instanceName: opts.instanceName,
            });
          }
        }
      } else {
        console.warn('[afterHours] Evolution sendText failed:', res.status);
      }
    }

    // تمرير الحدث الكامل إلى n8n للمعالجة الذكية الإضافية
    if (settings.send_to_n8n && settings.n8n_webhook_url) {
      outcome.forwarded = await forwardToN8n(settings.n8n_webhook_url, {
        type: 'after_hours_message',
        instance: opts.instanceName,
        chat_jid: opts.chatJid,
        contact_name: opts.contactName,
        is_group: opts.isGroup,
        line_id: opts.lineId,
        auto_replied: outcome.replied,
        event: opts.originalEvent,
      });
    }

    return outcome;
  } catch (err) {
    console.warn('[afterHours] non-critical:', (err as Error).message);
    return outcome;
  }
}
