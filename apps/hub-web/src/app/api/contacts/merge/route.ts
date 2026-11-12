import { NextRequest, NextResponse } from 'next/server';
import { q } from '../../../../lib/pg';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 300;

/**
 * م8 — دمج حقيقي لجهات الاتصال المكررة بمقارنة المعرف الداخلي:
 *   • فرد   → الرقم المعياري (primary_phone_e164)
 *   • مجموعة → معرف واتساب الحقيقي (wa_jid)
 * الدمج يحدث كل الجداول المرجعية ثم يحذف المكرر:
 *   hub.conversations.contact_id • public.campaign_recipients.contact_id
 *   public.contact_list_members.contact_id • hub.contact_phones.contact_id
 *   hub.contact_tags.contact_id • hub.whatsapp_groups.contact_id
 * إضافة: تطبيع صفوف المجموعات القديمة (jid بلا @g.us مخزن كرقم) قبل المقارنة.
 */
export async function POST(req: NextRequest) {
  try {
    const body = req.headers.get('content-type')?.includes('application/json') ? await req.json().catch(() => ({})) : {};
    const dryRun = body.dry_run === true;

    // 0) تطبيع صفوف المجموعات القديمة: jid رقمي خالص أو مسبوق بـ '+' → أضف @g.us
    await q(
      `update hub.contacts
       set wa_jid = regexp_replace(primary_phone_e164, '^\+', '') || '@g.us',
           updated_at = now()
       where entity_type = 'group'
         and wa_jid is null
         and primary_phone_e164 ~ '^\+?[0-9]{15,}$'`
    );

    // 1) كل جهات الاتصال
    const contacts = await q<{
      id: string; display_name: string; full_name: string; entity_type: string;
      primary_phone_e164: string | null; wa_jid: string | null; tags: string[] | null;
      vip_level: number | null; source_detail: string | null; avatar_url: string | null;
      notes: string | null; email: string | null; created_at: string; opt_out: boolean | null;
    }>(`select id, display_name, full_name, entity_type, primary_phone_e164, wa_jid, tags,
               vip_level, source_detail, avatar_url, notes, email, created_at, opt_out
        from hub.contacts`);

    // 2) التجميع حسب المعرف الداخلي الحقيقي
    const keyOf = (c: typeof contacts[number]): string | null => {
      if (c.entity_type === 'group') return c.wa_jid || null;
      const p = c.primary_phone_e164;
      return p && p !== '+' ? p : null;
    };

    const groups = new Map<string, typeof contacts>();
    for (const c of contacts) {
      const k = keyOf(c);
      if (!k) continue; // جهة بلا معرف فريد — لا تُدمج
      const arr = groups.get(k) || [];
      arr.push(c);
      groups.set(k, arr);
    }

    const dupKeys = Array.from(groups.entries()).filter(([, arr]) => arr.length > 1);
    let mergedGroups = 0;
    let deletedRows = 0;
    let refUpdates = 0;
    const mergedSamples: { key: string; kept: string; removed: string[] }[] = [];

    for (const [key, arr] of dupKeys) {
      if (dryRun) { mergedGroups++; continue; }

      // اختيار الرئيسي: الأقدم إنشاءً (يحمل هوية الاستيراد الأول)
      const sorted = [...arr].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      const master = sorted[0];
      const losers = sorted.slice(1);

      // إثراء الرئيسي: أفضل اسم (أطول غير رقمي)، دمج الوسوم، أعلى VIP، إكمال الفراغات
      const bestName = sorted
        .map((c) => c.display_name || '')
        .filter((n) => n && !/^[0-9+\-@ ]+$/.test(n))
        .sort((a, b) => b.length - a.length)[0] || master.display_name;
      const allTags = Array.from(new Set(sorted.flatMap((c) => c.tags || [])));
      const maxVip = Math.max(0, ...sorted.map((c) => c.vip_level || 0));
      const email = sorted.find((c) => c.email)?.email || master.email;
      const notes = sorted.find((c) => c.notes)?.notes || master.notes;
      const avatar = sorted.find((c) => c.avatar_url)?.avatar_url || master.avatar_url;
      const anyOptOut = sorted.some((c) => c.opt_out === true);

      await q(
        `update hub.contacts set
           display_name = $2, full_name = $2,
           tags = $3::text[],
           vip_level = case when $4 > coalesce(vip_level, 0) then $4 else vip_level end,
           email = coalesce(email, $5),
           notes = coalesce(notes, $6),
           avatar_url = coalesce(avatar_url, $7),
           opt_out = case when $8 then true else opt_out end,
           updated_at = now()
         where id = $1`,
        [master.id, bestName, allTags, maxVip, email, notes, avatar, anyOptOut]
      );

      // 3) نقل كل المراجع إلى الرئيسي ثم حذف المكرر — لكل جدول مرجعي
      for (const loser of losers) {
        const r1 = await q(
          `update hub.conversations set contact_id = $2 where contact_id = $1 and contact_id <> $2`,
          [loser.id, master.id]
        );
        refUpdates += r1.length;
        const r2 = await q(
          `update public.campaign_recipients set contact_id = $2 where contact_id = $1`,
          [loser.id, master.id]
        );
        refUpdates += r2.length;
        const r3 = await q(
          `update public.contact_list_members set contact_id = $2 where contact_id = $1`,
          [loser.id, master.id]
        );
        refUpdates += r3.length;
        await q(`update hub.contact_phones set contact_id = $2 where contact_id = $1 on conflict do nothing`, [loser.id, master.id]).catch(() => {});
        await q(`update hub.contact_tags set contact_id = $2 where contact_id = $1 on conflict do nothing`, [loser.id, master.id]).catch(() => {});
        await q(`update hub.whatsapp_groups set contact_id = $2 where contact_id = $1`, [loser.id, master.id]).catch(() => {});

        await q(`delete from hub.contacts where id = $1`, [loser.id]);
        deletedRows++;
      }

      mergedGroups++;
      if (mergedSamples.length < 10) {
        mergedSamples.push({ key, kept: master.display_name, removed: losers.map((l) => l.display_name) });
      }
    }

    // 4) إحصاءات ما بعد الدمج (حقيقية من القاعدة)
    const stats = await q<{ total: number; groups: number; individuals: number }>(
      `select count(*)::int total,
              count(*) filter (where entity_type = 'group')::int groups,
              count(*) filter (where entity_type <> 'group')::int individuals
       from hub.contacts`
    );

    return NextResponse.json({
      success: true,
      dry_run: dryRun,
      duplicate_groups_found: dupKeys.length,
      merged_groups: mergedGroups,
      deleted_rows: deletedRows,
      reference_updates: refUpdates,
      remaining: stats[0],
      samples: mergedSamples,
      message: dupKeys.length === 0
        ? 'لا توجد جهات مكررة — الدليل نظيف بالفعل'
        : `تم دمج ${mergedGroups} مجموعة مكررة وحذف ${deletedRows} صف مع تحديث ${refUpdates} مرجع في المحادثات والحملات والقوائم`,
    });
  } catch (err: any) {
    console.error('[contacts/merge]', err?.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
