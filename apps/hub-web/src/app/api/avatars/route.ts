import { NextRequest, NextResponse } from 'next/server';
import { q } from '../../../lib/pg';

/**
 * POST /api/avatars
 * جلب الصور الحقيقية (شخص/مجموعة) من واتساب عبر Evolution للجهات التي لا صورة لها
 * وتخزينها في hub.contacts.avatar_url — يدفع الواجهة دفعات صغيرة (≤25) بعد تحميل القائمة.
 * Body: { items: [{ jid, instance }] }  →  { avatars: { [jid]: url } }
 */
const EVOLUTION_URL = process.env.EVOLUTION_URL || 'https://evo.69.62.122.89.sslip.io';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const items: { jid: string; instance: string }[] = Array.isArray(body?.items) ? body.items : [];
    if (items.length === 0) return NextResponse.json({ avatars: {} });

    const wanted = items
      .filter((it) => it?.jid && it?.instance)
      .slice(0, 25);

    const avatars: Record<string, string> = {};
    const missingRows: { jid: string; instance: string }[] = [];

    // 1) جهات الاتصال الفردية المحفوظة في القاعدة — فورية بلا شبكة
    const storedContacts = await q<{ wa_jid: string; avatar_url: string | null }>(
      `select wa_jid, avatar_url from hub.contacts where wa_jid = any($1::text[]) and avatar_url is not null and avatar_url <> ''`,
      [wanted.map((w) => w.jid)]
    );
    for (const row of storedContacts) {
      if (row.avatar_url) avatars[row.wa_jid] = row.avatar_url;
    }

    // 2) المجموعات — صورها محفوظة في hub.whatsapp_groups.picture_url
    const groupJids = wanted.filter(w => w.jid.endsWith('@g.us') && !avatars[w.jid]).map(w => w.jid);
    if (groupJids.length > 0) {
      const storedGroups = await q<{ group_jid: string; picture_url: string | null }>(
        `select group_jid, picture_url from hub.whatsapp_groups where group_jid = any($1::text[]) and picture_url is not null and picture_url <> ''`,
        [groupJids]
      );
      for (const row of storedGroups) {
        if (row.picture_url) {
          avatars[row.group_jid] = row.picture_url;
          // مزامنة عكسية مع hub.contacts
          await q(
            `update hub.contacts set avatar_url = $2, updated_at = now() where wa_jid = $1`,
            [row.group_jid, row.picture_url]
          ).catch(() => {});
        }
      }
    }

    // 3) الناقص بعد الاستعلامين يُجلب من Evolution API
    for (const w of wanted) {
      if (avatars[w.jid]) continue;
      missingRows.push(w);
    }

    const evoHeaders = { apikey: EVOLUTION_API_KEY, 'Content-Type': 'application/json' };
    const updated: { jid: string; url: string; isGroup: boolean }[] = [];

    for (const w of missingRows) {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 6000);
        // Evolution v2 endpoint: POST /chat/fetchProfilePictureUrl/{instance}
        const res = await fetch(`${EVOLUTION_URL}/chat/fetchProfilePictureUrl/${w.instance}`, {
          method: 'POST',
          headers: evoHeaders,
          body: JSON.stringify({ number: w.jid }),
          signal: ctrl.signal,
        });
        clearTimeout(timer);
        if (!res.ok) continue;
        const data = await res.json().catch(() => null);
        const url: string | null =
          data?.profilePictureUrl || data?.profilePicUrl || data?.wapi?.profilePicUrl || data?.data?.profilePicUrl || null;
        if (url) {
          avatars[w.jid] = url;
          updated.push({ jid: w.jid, url, isGroup: w.jid.endsWith('@g.us') });
        }
      } catch {
        // تجاهل — المحاولة القادمة بعد تحديث
      }
    }

    // 4) تخزين ما جُلب
    for (const u of updated) {
      try {
        if (u.isGroup) {
          await q(`update hub.whatsapp_groups set picture_url = $2, updated_at = now() where group_jid = $1`, [u.jid, u.url]);
        }
        await q(`update hub.contacts set avatar_url = $2, updated_at = now() where wa_jid = $1`, [u.jid, u.url]);
      } catch {
        // تجاهل
      }
    }

    return NextResponse.json({ avatars });
  } catch (err: any) {
    console.error('[avatars POST]', err?.message);
    return NextResponse.json({ avatars: {}, error: err?.message }, { status: 500 });
  }
}
