// م5/م8: استيراد ديناميكي — instrumentation يُبنى أيضاً لحزمة edge
// والأستيراد الثابت لـ pg (يتطلب fs) يكسر بناء الـ edge، فنجلب المسارات وقت التشغيل فقط
let _q: typeof import('./pg')['q'] | null = null;
async function q<T = any>(sql: string, params?: any[]): Promise<T[]> {
  if (!_q) {
    const mod = await import('./pg');
    _q = mod.q;
  }
  return _q<T>(sql, params);
}
async function storeOutboundStaffMessage(opts: Parameters<typeof import('./webhookHandlers/storeMessage')['storeOutboundStaffMessage']>[0]): Promise<void> {
  const mod = await import('./webhookHandlers/storeMessage');
  return mod.storeOutboundStaffMessage(opts);
}

/**
 * م5 — محرك الحملات (Campaign Runner)
 * يعمل دورياً مع إقلاع السيرفر عبر instrumentation.ts:
 * - يلتقط الحملات المجدولة المستحقة ويحوّلها إلى running
 * - يرسل دفعات محترمة لـ throttle.per_minute وحد الخط اليومي daily_cap
 * - يتخطى من opting-out (hub.contacts.opt_out) ويسجل سبب التخطي
 * - يحدّث campaign_recipients و campaigns.stats في القاعدة — الحالة كاملة فيها
 *   فلا يُفقد أي تقدم عند إعادة تشغيل السيرفر
 */

const EVOLUTION_URL = process.env.EVOLUTION_URL || 'https://evo.69.62.122.89.sslip.io';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '';
const TICK_MS = 10_000;
let timer: ReturnType<typeof setInterval> | null = null;
let ticking = false; // منع التداخل إذا تأخرت دورة سابقة

interface CampaignRow {
  id: string;
  title: string;
  line_instance: string;
  audience: any;
  text: string;
  media: any;
  throttle: any;
  stats: any;
}

interface RecipientRow {
  id: string;
  contact_id: string | null;
  phone_e164: string;
  display_name: string | null;
}

async function sendWhatsAppText(instance: string, number: string, text: string): Promise<{ ok: boolean; waId?: string; error?: string }> {
  try {
    const res = await fetch(`${EVOLUTION_URL}/message/sendText/${instance}`, {
      method: 'POST',
      headers: { apikey: EVOLUTION_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ number, text }),
      cache: 'no-store',
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      return { ok: false, error: `HTTP ${res.status}: ${detail.slice(0, 200)}` };
    }
    const data = await res.json().catch(() => ({}));
    const waId = data?.key?.id || data?.messageId || null;
    return { ok: true, waId: waId || undefined };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

/** عدد الرسائل الصادرة اليوم على الخط (من سجل الرسائل المخزن) */
async function sentTodayOnLine(instance: string): Promise<number> {
  const rows = await q<{ c: string }>(
    `select count(*)::text c
     from hub.messages m
     join hub.lines l on l.id = m.line_id
     where l.instance_name = $1 and m.direction = 'out' and m.created_at >= date_trunc('day', now())`,
    [instance]
  );
  return Number(rows[0]?.c || 0);
}

/** استبدال متغيرات نص الحملة */
function expandCampaignText(text: string, name: string | null): string {
  return (text || '')
    .replace(/\{name\}/g, name || 'عميلنا العزيز')
    .replace(/\{staff\}/g, 'فريق TripYou');
}

async function processCampaign(camp: CampaignRow): Promise<void> {
  const perMinute = Math.max(1, Number(camp.throttle?.per_minute ?? 20));
  const batchSize = Math.min(20, Math.max(1, Math.round(perMinute / 6))); // كل 10 ثوانٍ → سدس الدقيقة

  // حد الخط اليومي: ما تبقى من daily_cap اليوم
  let batchSize2 = batchSize;
  const lineRow = await q<{ daily_cap: number }>(`select daily_cap from hub.lines where instance_name = $1 limit 1`, [camp.line_instance]);
  const dailyCap = Number(lineRow[0]?.daily_cap ?? 0);
  if (dailyCap > 0) {
    const sentToday = await sentTodayOnLine(camp.line_instance);
    if (sentToday >= dailyCap) {
      await q(`update public.campaigns set updated_at = now() where id = $1`, [camp.id]);
      return; // استنفد الخط حصته اليومية — تتم المتابعة غداً
    }
    const room = dailyCap - sentToday;
    if (room < batchSize2) batchSize2 = Math.max(1, room);
  }

  // المستلمون المعلقون (الدفعات من القاعدة — لا شيء بالذاكرة)
  const pending: RecipientRow[] = await q(
    `select id, contact_id, phone_e164, display_name
     from public.campaign_recipients
     where campaign_id = $1 and status = 'pending'
     order by created_at
     limit $2`,
    [camp.id, batchSize2]
  );
  if (pending.length === 0) {
    // لا معلقون — فحص الإنجاز
    const left = await q<{ c: string }>(
      `select count(*)::text c from public.campaign_recipients where campaign_id = $1 and status = 'pending'`,
      [camp.id]
    );
    if (Number(left[0]?.c || 0) === 0) {
      await q(
        `update public.campaigns set status = 'done', finished_at = now(), updated_at = now() where id = $1 and status = 'running'`,
        [camp.id]
      );
    }
    return;
  }

  // جهات الرفض (opt_out) لهذه الدفعة
  const contactIds = pending.map((r) => r.contact_id).filter(Boolean) as string[];
  let optOutSet = new Set<string>();
  if (contactIds.length > 0) {
    const optRows = await q<{ id: string }>(
      `select id from hub.contacts where opt_out = true and id = any($1::uuid[])`,
      [contactIds]
    );
    optOutSet = new Set(optRows.map((r) => r.id));
  }

  let sent = 0, failed = 0, skipped = 0;

  for (const r of pending) {
    if (r.contact_id && optOutSet.has(r.contact_id)) {
      await q(
        `update public.campaign_recipients set status = 'skipped', skip_reason = 'opt_out' where id = $1`,
        [r.id]
      );
      skipped++;
      continue;
    }

    const result = await sendWhatsAppText(camp.line_instance, r.phone_e164, expandCampaignText(camp.text, r.display_name));
    if (result.ok) {
      await q(
        `update public.campaign_recipients set status = 'sent', wa_message_id = $2, sent_at = now() where id = $1`,
        [r.id, result.waId || null]
      );
      sent++;
      // أرشفة الرسالة في سجل الرسائل (للمؤشرات) — غير حرج
      storeOutboundStaffMessage({
        instance: camp.line_instance,
        chatJid: `${r.phone_e164.replace(/\D/g, '')}@s.whatsapp.net`,
        waMessageId: result.waId || `camp_${camp.id}_${r.id}`,
        staffId: null,
        body: expandCampaignText(camp.text, r.display_name),
        isAuto: true,
      }).catch(() => {});
    } else {
      await q(
        `update public.campaign_recipients set status = 'failed', error = $2 where id = $1`,
        [r.id, (result.error || 'unknown').slice(0, 500)]
      );
      failed++;
    }

    // فاصل صغير بين الرسائل داخل الدفعة لطابع الإرسال البشري
    await new Promise((res) => setTimeout(res, 350));
  }

  // تحديث إحصائيات الحملة
  const totals = await q<{ status: string; c: string }>(
    `select status, count(*)::text c from public.campaign_recipients where campaign_id = $1 group by status`,
    [camp.id]
  );
  const stats: Record<string, number> = {};
  totals.forEach((t) => { stats[t.status] = Number(t.c); });
  await q(
    `update public.campaigns set stats = $2::jsonb, updated_at = now() where id = $1`,
    [camp.id, JSON.stringify(stats)]
  );
}

async function tick(): Promise<void> {
  if (ticking) return;
  ticking = true;
  try {
    // ─── C4/م8: تصعيد الطلبات المعلقة — المشرف لم يرد خلال 10 دقائق → المدير ───
    const escalated = await q<{ id: string; staff_name: string; type: string }>(
      `update hub.line_send_requests
       set escalated = true
       where status = 'pending' and escalated = false
         and created_at < now() - interval '10 minutes'
       returning id,
                (select full_name from hub.staff s where s.id = staff_id) as staff_name,
                type`
    );
    if (escalated.length > 0) {
      for (const r of escalated) {
        await q(
          `insert into public.notifications (staff_id, kind, title, body, link)
           select s.id, 'permission_escalation', $2, $3, '/admin_dashboard?approvals=1'
           from hub.staff s join hub.roles ro on ro.id = s.role_id
           where ro.key = 'super_admin' and s.status = 'active'`,
          [
            `⏰ طلب متأخر أكثر من 10 دقائق — صعد للمدير`,
            `طلب ${r.staff_name} (${r.type}) لم يُقرر خلال المهلة — يحتاج قرارك`,
          ]
        ).catch(() => {});
      }
    }

    // 1) الحملات المجدولة المستحقة → running
    await q(
      `update public.campaigns
       set status = 'running', started_at = now(), updated_at = now()
       where status = 'scheduled' and scheduled_at is not null and scheduled_at <= now()`
    );

    // 2) معالجة كل حملة running (بالتوازي المحدود)
    const running: CampaignRow[] = await q(
      `select id, title, line_instance, audience, text, media, throttle, stats
       from public.campaigns
       where status = 'running'
       order by created_at
       limit 5`
    );
    await Promise.allSettled(running.map((c) => processCampaign(c)));
  } catch (err) {
    console.warn('[campaignRunner] tick error:', (err as Error).message);
  } finally {
    ticking = false;
  }
}

/** يُستدعى مرة واحدة من instrumentation.ts عند إقلاع السيرفر */
export function startCampaignRunner(): void {
  if (timer) return;
  console.log('[campaignRunner] started — tick every 10s');
  timer = setInterval(tick, TICK_MS);
  // دورة أولى بعد 5 ثوانٍ من الإقلاع
  setTimeout(tick, 5000);
}
