import { NextRequest, NextResponse } from 'next/server';
import { q } from '../../../../lib/pg';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 300;

/**
 * استخراج اسم ملف الصورة النظيف للمقارنة
 * https://pps.whatsapp.net/v/t61.24694-24/322228492_925461026009767_...n.jpg?ccb=...
 * -> 322228492_925461026009767_...n.jpg
 */
function getAvatarFilename(url: string | null | undefined): string | null {
  if (!url || !url.includes('pps.whatsapp.net')) return null;
  try {
    const clean = url.split('?')[0];
    const filename = clean.split('/').pop();
    return filename && filename.length > 10 ? filename : null;
  } catch {
    return null;
  }
}

/**
 * تطبيع الاسم للمقارنة الذكية (إزالة التشكيل، المسافات الزائدة، الأحرف الخاصة)
 */
function normalizeName(name: string | null | undefined): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/[\u200e\u200f\u064b-\u0652]/g, '') // remove LTR/RTL marks & arabic diacritics
    .replace(/[._\-+/\\()~]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * دمج مصادر الخطوط وتحويلها للأسماء العربية المعتمدة
 */
function mergeSourceDetails(detailA: string | null, detailB: string | null): string {
  const combined = `${detailA || ''} ${detailB || ''}`;
  const lines: string[] = [];
  if (/sells_2|المبيعات 2/i.test(combined)) lines.push('المبيعات 2');
  if (/master|الرئيسي/i.test(combined)) lines.push('الرئيسي');
  if (/sells_1|المبيعات 1/i.test(combined)) lines.push('المبيعات 1');

  if (lines.length > 0) {
    return lines.join(' • ');
  }
  return detailA || detailB || 'خط واتساب';
}

/**
 * POST /api/contacts/merge
 * دمج حقيقي وذكي لجهات الاتصال المكررة:
 * 1. دمج جهات الاتصال المتطابقة في رقم الهاتف أو معرف المجموعة
 * 2. دمج الحسابات المشفرة (LID) مع جهات الاتصال الحقيقية التي تحمل نفس صورة الملف الشخصي أو نفس الاسم
 */
export async function POST(req: NextRequest) {
  try {
    const body = req.headers.get('content-type')?.includes('application/json')
      ? await req.json().catch(() => ({}))
      : {};
    const dryRun = body.dry_run === true;

    // 0) تطبيع صفوف المجموعات القديمة: jid رقمي خالص أو مسبوق بـ '+' -> أضف @g.us
    await q(
      `update hub.contacts
       set wa_jid = regexp_replace(primary_phone_e164, '^\\+', '') || '@g.us',
           updated_at = now()
       where entity_type = 'group'
         and wa_jid is null
         and primary_phone_e164 ~ '^\\+?[0-9]{15,}$'`
    );

    // 1) جلب كافة جهات الاتصال
    const contacts = await q<{
      id: string;
      display_name: string;
      full_name: string;
      entity_type: string;
      commercial_role: string | null;
      primary_phone_e164: string | null;
      wa_jid: string | null;
      tags: string[] | null;
      vip_level: number | null;
      source: string;
      source_detail: string | null;
      avatar_url: string | null;
      notes: string | null;
      email: string | null;
      created_at: string;
      opt_out: boolean | null;
    }>(`
      select id, display_name, full_name, entity_type, commercial_role, primary_phone_e164, wa_jid, tags,
             vip_level, source, source_detail, avatar_url, notes, email, created_at, opt_out
      from hub.contacts
    `);

    let mergedGroups = 0;
    let deletedRows = 0;
    let refUpdates = 0;
    const mergedSamples: { key: string; kept: string; removed: string[]; reason: string }[] = [];

    // --- المرحلة الأولى: التجميع حسب المعرف الحقيقي (الهاتف أو معرف المجموعة) ---
    const keyOf = (c: typeof contacts[number]): string | null => {
      if (c.entity_type === 'group') return c.wa_jid || null;
      const p = c.primary_phone_e164;
      return p && p !== '+' ? p : null;
    };

    const directGroups = new Map<string, typeof contacts>();
    for (const c of contacts) {
      const k = keyOf(c);
      if (!k) continue;
      const arr = directGroups.get(k) || [];
      arr.push(c);
      directGroups.set(k, arr);
    }

    const dupKeys = Array.from(directGroups.entries()).filter(([, arr]) => arr.length > 1);

    for (const [key, arr] of dupKeys) {
      if (dryRun) {
        mergedGroups++;
        continue;
      }

      // اختيار الرئيسي: الأقدم أو الذي يحمل اسماً حقيقياً أفضل
      const sorted = [...arr].sort((a, b) => {
        const aHasPhone = a.primary_phone_e164 ? 1 : 0;
        const bHasPhone = b.primary_phone_e164 ? 1 : 0;
        if (aHasPhone !== bHasPhone) return bHasPhone - aHasPhone;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });

      const master = sorted[0];
      const losers = sorted.slice(1);

      const bestName =
        sorted
          .map((c) => c.display_name || '')
          .filter((n) => n && !/^[0-9+\-@ ]+$/.test(n) && !n.startsWith('حساب مشفر'))
          .sort((a, b) => b.length - a.length)[0] || master.display_name;

      const allTags = Array.from(new Set(sorted.flatMap((c) => c.tags || [])));
      const maxVip = Math.max(0, ...sorted.map((c) => c.vip_level || 0));
      const email = sorted.find((c) => c.email)?.email || master.email;
      const notes = sorted.find((c) => c.notes)?.notes || master.notes;
      const avatar = sorted.find((c) => c.avatar_url)?.avatar_url || master.avatar_url;
      const anyOptOut = sorted.some((c) => c.opt_out === true);
      const combinedSourceDetail = sorted.reduce(
        (acc, cur) => mergeSourceDetails(acc, cur.source_detail),
        master.source_detail || ''
      );

      await q(
        `update hub.contacts set
           display_name = $2, full_name = $2,
           tags = $3::text[],
           vip_level = case when $4 > coalesce(vip_level, 0) then $4 else vip_level end,
           email = coalesce(email, $5),
           notes = coalesce(notes, $6),
           avatar_url = coalesce(avatar_url, $7),
           opt_out = case when $8 then true else opt_out end,
           source_detail = $9,
           updated_at = now()
         where id = $1`,
        [master.id, bestName, allTags, maxVip, email, notes, avatar, anyOptOut, combinedSourceDetail]
      );

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
        await q(
          `update hub.contact_phones set contact_id = $2 where contact_id = $1 on conflict do nothing`,
          [loser.id, master.id]
        ).catch(() => {});
        await q(
          `update hub.contact_tags set contact_id = $2 where contact_id = $1 on conflict do nothing`,
          [loser.id, master.id]
        ).catch(() => {});
        await q(
          `update hub.whatsapp_groups set contact_id = $2 where contact_id = $1`,
          [loser.id, master.id]
        ).catch(() => {});

        await q(`delete from hub.contacts where id = $1`, [loser.id]);
        deletedRows++;
      }

      mergedGroups++;
      if (mergedSamples.length < 10) {
        mergedSamples.push({
          key,
          kept: master.display_name,
          removed: losers.map((l) => l.display_name),
          reason: 'مطابقة الهاتف أو معرف المجموعة',
        });
      }
    }

    // --- المرحلة الثانية: دمج الحسابات المشفرة LID المتبقية مع جهات الاتصال الحقيقية ---
    // جلب القائمة المحدثة
    const freshContacts = await q<{
      id: string;
      display_name: string;
      primary_phone_e164: string | null;
      wa_jid: string | null;
      avatar_url: string | null;
      source_detail: string | null;
      tags: string[] | null;
    }>(`
      select id, display_name, primary_phone_e164, wa_jid, avatar_url, source_detail, tags
      from hub.contacts
    `);

    const phoneContacts = freshContacts.filter((c) => c.primary_phone_e164);
    const orphanLids = freshContacts.filter((c) => !c.primary_phone_e164 && c.wa_jid && c.wa_jid.includes('@lid'));

    // خرائط البحث السريع
    const phoneByAvatar = new Map<string, typeof phoneContacts[0]>();
    const phoneByName = new Map<string, typeof phoneContacts[0]>();

    for (const p of phoneContacts) {
      const avatarFn = getAvatarFilename(p.avatar_url);
      if (avatarFn) {
        phoneByAvatar.set(avatarFn, p);
      }
      const norm = normalizeName(p.display_name);
      if (norm && norm.length >= 4 && !/^[0-9+\-@ ]+$/.test(norm)) {
        phoneByName.set(norm, p);
      }
    }

    for (const lid of orphanLids) {
      const avatarFn = getAvatarFilename(lid.avatar_url);
      const norm = normalizeName(lid.display_name);

      let matchedPhoneContact: typeof phoneContacts[0] | null = null;
      let matchReason = '';

      // 1. فحص تطابق الصورة الرمزية في واتساب (دقيق 100%)
      if (avatarFn && phoneByAvatar.has(avatarFn)) {
        matchedPhoneContact = phoneByAvatar.get(avatarFn)!;
        matchReason = 'تطابق صورة الملف الشخصي لواتساب';
      }
      // 2. فحص تطابق الاسم بدقة
      else if (norm && phoneByName.has(norm)) {
        matchedPhoneContact = phoneByName.get(norm)!;
        matchReason = 'تطابق الاسم الدقيق مع رقم محفوظ';
      }
      // 3. فحص تطابق الاسم الجزئي القوي (إذا كان الاسم أطول من كلمتين أو 6 أحرف)
      else if (norm && norm.length >= 6 && !norm.startsWith('حساب مشفر')) {
        for (const [pNorm, pContact] of Array.from(phoneByName.entries())) {
          if (pNorm.length >= 6 && (pNorm.includes(norm) || norm.includes(pNorm))) {
            matchedPhoneContact = pContact;
            matchReason = 'تطابق اسم جزئي مع جهة اتصال برقم';
            break;
          }
        }
      }

      if (matchedPhoneContact && matchedPhoneContact.id !== lid.id) {
        if (dryRun) {
          mergedGroups++;
          continue;
        }

        const master = matchedPhoneContact;
        const loser = lid;

        const combinedDetail = mergeSourceDetails(master.source_detail, loser.source_detail);
        const combinedAvatar = master.avatar_url || loser.avatar_url;

        // تحديث السجل الرئيسي
        await q(
          `update hub.contacts set
             source_detail = $2,
             avatar_url = coalesce(avatar_url, $3),
             updated_at = now()
           where id = $1`,
          [master.id, combinedDetail, combinedAvatar]
        );

        // تحويل المراجع وحذف الحساب المشفر المكرر
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
        await q(
          `update hub.contact_phones set contact_id = $2 where contact_id = $1 on conflict do nothing`,
          [loser.id, master.id]
        ).catch(() => {});
        await q(
          `update hub.contact_tags set contact_id = $2 where contact_id = $1 on conflict do nothing`,
          [loser.id, master.id]
        ).catch(() => {});
        await q(
          `update hub.whatsapp_groups set contact_id = $2 where contact_id = $1`,
          [loser.id, master.id]
        ).catch(() => {});

        await q(`delete from hub.contacts where id = $1`, [loser.id]);
        deletedRows++;
        mergedGroups++;

        if (mergedSamples.length < 15) {
          mergedSamples.push({
            key: loser.wa_jid || loser.id,
            kept: `${master.display_name} (${master.primary_phone_e164})`,
            removed: [loser.display_name],
            reason: matchReason,
          });
        }
      }
    }

    // 4) إحصاءات ما بعد الدمج
    const stats = await q<{ total: number; groups: number; individuals: number }>(
      `select count(*)::int total,
              count(*) filter (where entity_type = 'group')::int groups,
              count(*) filter (where entity_type <> 'group')::int individuals
       from hub.contacts`
    );

    return NextResponse.json({
      success: true,
      dry_run: dryRun,
      merged_groups: mergedGroups,
      deleted_rows: deletedRows,
      reference_updates: refUpdates,
      remaining: stats[0],
      samples: mergedSamples,
      message:
        deletedRows === 0
          ? 'دليل جهات الاتصال نظيف ومدمج بالكامل ولا توجد حسابات مكررة'
          : `تم بنجاح دمج ${mergedGroups} جهة مكررة/مشفرة وحذف ${deletedRows} صف مكرر ونقل كافة المحادثات والمراجع إلى الأرقام الحقيقية.`,
    });
  } catch (err: any) {
    console.error('[contacts/merge]', err?.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
