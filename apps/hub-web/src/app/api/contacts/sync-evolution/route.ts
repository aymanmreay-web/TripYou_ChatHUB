import { NextRequest, NextResponse } from 'next/server';
import { q } from '../../../../lib/pg';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 300;

/**
 * م8 مُطور — استيراد شامل وذكي 100% من Evolution API لكل الخطوط المتصلة:
 * - يدعم جلب أفراد الهواتف الحقيقية E.164
 * - يدعم جلب الحسابات المشفرة (@lid) مع محاولة استخلاص أرقامها من الرسائل والمشاركين، ووسمها بوسم خاص (tag_lid)
 * - يدعم جلب القنوات والنشرات الإخبارية (@newsletter / @broadcast) مع وسمها بوسم خاص (tag_newsletter)
 * - يفرز الدولة بدقة حسب رمز الهاتف (+966 SA, +971 AE, ...)
 * - يرجع إحصائيات شفافة ومفصلة بكل صنف
 */
const EVOLUTION_URL = process.env.EVOLUTION_URL || 'https://evo.69.62.122.89.sslip.io';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '';

function normalizePhone(phone: string): string {
  let cleaned = (phone || '').replace(/[^0-9]/g, '');
  if (!cleaned) return '';
  if (cleaned.startsWith('00')) cleaned = cleaned.substring(2);
  if (cleaned.startsWith('05') && cleaned.length === 10) cleaned = '966' + cleaned.substring(1);
  else if (cleaned.startsWith('5') && cleaned.length === 9) cleaned = '966' + cleaned;
  return '+' + cleaned;
}

function detectCountry(phone: string | null | undefined): string {
  if (!phone) return 'XX';
  const p = phone.startsWith('+') ? phone : '+' + phone;
  if (p.startsWith('+966')) return 'SA';
  if (p.startsWith('+971')) return 'AE';
  if (p.startsWith('+965')) return 'KW';
  if (p.startsWith('+974')) return 'QA';
  if (p.startsWith('+968')) return 'OM';
  if (p.startsWith('+973')) return 'BH';
  if (p.startsWith('+20'))  return 'EG';
  if (p.startsWith('+962')) return 'JO';
  if (p.startsWith('+964')) return 'IQ';
  if (p.startsWith('+967')) return 'YE';
  if (p.startsWith('+963')) return 'SY';
  if (p.startsWith('+961')) return 'LB';
  if (p.startsWith('+212')) return 'MA';
  if (p.startsWith('+213')) return 'DZ';
  if (p.startsWith('+216')) return 'TN';
  if (p.startsWith('+249')) return 'SD';
  if (p.startsWith('+90'))  return 'TR';
  if (p.startsWith('+1'))   return 'US';
  if (p.startsWith('+44'))  return 'GB';
  return 'INTL';
}

function isMeaningfulName(name: string | undefined | null): boolean {
  if (!name) return false;
  const n = name.trim();
  if (!n || n === 'Você' || n === 'voce') return false;
  if (/^[0-9+\-@ ]+$/.test(n)) return false;
  return true;
}

async function ensureTagId(key: string, name: string, color: string): Promise<string | null> {
  const rows = await q<{ id: string }>(
    `insert into hub.hub_tags (key, name_ar, color, kind, scope)
     values ($1, $2, $3, 'system', 'contact')
     on conflict (key) do update set updated_at = now()
     returning id`,
    [key, name, color]
  );
  return rows[0]?.id || null;
}

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const onlyInstance = searchParams.get('instance');

    // التحقق من حالة الخطوط المفتوحة فعلياً في سيرفر Evolution
    let openInstanceMap = new Map<string, string>();
    try {
      const instRes = await fetch(`${EVOLUTION_URL}/instance/fetchInstances`, {
        headers: { apikey: EVOLUTION_API_KEY },
        cache: 'no-store',
      });
      if (instRes.ok) {
        const instList = await instRes.json();
        (Array.isArray(instList) ? instList : []).forEach((i: any) => {
          if (i.name) openInstanceMap.set(i.name, i.connectionStatus);
        });
      }
    } catch {}

    if (onlyInstance) {
      const status = openInstanceMap.get(onlyInstance);
      if (status && status !== 'open') {
        return NextResponse.json(
          { error: `خط واتساب "${onlyInstance}" غير متصل حالياً (حالته: ${status}) — يرجى فتح الخط ومسح رمز الـ QR من قسم الخطوط أولاً.` },
          { status: 400 }
        );
      }
    }

    let lines = onlyInstance
      ? [{ instance_name: onlyInstance }]
      : Array.from(openInstanceMap.entries())
          .filter(([, st]) => st === 'open')
          .map(([name]) => ({ instance_name: name }));

    if (lines.length === 0) {
      lines = await q<{ instance_name: string }>(`select instance_name from hub.lines where status = 'connected' order by instance_name`);
    }

    if (lines.length === 0) {
      return NextResponse.json({ error: 'لا يوجد خطوط واتساب متصلة حالياً — تأكد من ربط خط واحد على الأقل في قسم الخطوط' }, { status: 400 });
    }

    // الأوسمة المطلوبة
    const [lidTagId, newsTagId, groupTagId, indTagId] = await Promise.all([
      ensureTagId('tag_lid', 'حساب مشفر (LID)', 'gray'),
      ensureTagId('tag_newsletter', 'قناة / نشرة إخبارية', 'indigo'),
      ensureTagId('auto_group', 'مجموعة واتساب', 'purple'),
      ensureTagId('auto_individual', 'شخصي (فردي)', 'blue'),
    ]);

    const evoHeaders = { apikey: EVOLUTION_API_KEY, 'Content-Type': 'application/json' };
    const summary = {
      lines_processed: [] as {
        instance: string;
        individuals: number;
        groups: number;
        lids: number;
        newsletters: number;
        extracted_phones_from_lids: number;
      }[],
      total_individuals: 0,
      total_groups: 0,
      total_lids: 0,
      total_newsletters: 0,
      total_extracted_from_lids: 0,
      errors: [] as string[],
    };

    for (const line of lines) {
      const instance = line.instance_name;
      try {
        const [contactsRes, chatsRes, groupsRes] = await Promise.allSettled([
          fetch(`${EVOLUTION_URL}/chat/findContacts/${instance}`, { method: 'POST', headers: evoHeaders, body: JSON.stringify({}) }),
          fetch(`${EVOLUTION_URL}/chat/findChats/${instance}`, { method: 'POST', headers: evoHeaders, body: JSON.stringify({}) }),
          fetch(`${EVOLUTION_URL}/group/fetchAllGroups/${instance}?getParticipants=true`, { method: 'GET', headers: evoHeaders }),
        ]);

        const rawContacts = contactsRes.status === 'fulfilled' && contactsRes.value.ok ? await contactsRes.value.json() : [];
        const rawChats = chatsRes.status === 'fulfilled' && chatsRes.value.ok ? await chatsRes.value.json() : [];
        const rawGroups = groupsRes.status === 'fulfilled' && groupsRes.value.ok ? await groupsRes.value.json() : [];

        if (!Array.isArray(rawContacts)) {
          summary.errors.push(`${instance}: findContacts لم يرجع بيانات صالحة`);
          continue;
        }

        // خريطة LID -> رقم هاتف حقيقي مستخلص من آخر الرسائل أو الشات
        const lidToPhone = new Map<string, string>();
        for (const c of Array.isArray(rawChats) ? rawChats : []) {
          const remoteJid = c.remoteJid || c.id || '';
          const alt = c.lastMessage?.key?.remoteJidAlt || c.lastMessage?.key?.participantAlt || c.lastMessage?.participant;
          if (remoteJid && alt && typeof alt === 'string' && alt.includes('@s.whatsapp.net')) {
            lidToPhone.set(remoteJid, alt.replace('@s.whatsapp.net', '').replace(/\D/g, ''));
          }
        }

        // استخلاص أسماء المجموعات الحقيقية
        const groupMeta = new Map<string, { subject: string; pic?: string; participants: number }>();
        for (const g of Array.isArray(rawGroups) ? rawGroups : []) {
          const gid = g.id || g.jid;
          if (!gid) continue;
          const subject = (g.subject || g.name || '').trim();
          if (subject && isMeaningfulName(subject)) {
            groupMeta.set(gid, {
              subject,
              pic: g.pictureUrl,
              participants: Array.isArray(g.participants) ? g.participants.length : (g.participantCount || 0),
            });
          }
        }

        const individuals: { phone: string; name: string; dispName: string | null; jid: string; avatar: string | null; country: string }[] = [];
        const lidContacts: { jid: string; phone: string | null; name: string; avatar: string | null; country: string }[] = [];
        const newsletterContacts: { jid: string; name: string; avatar: string | null }[] = [];
        const seenPhones = new Set<string>();
        let extractedFromLids = 0;

        for (const c of rawContacts) {
          const jid = c.remoteJid || c.id || '';
          if (!jid) continue;

          // 1. القنوات والنشرات الإخبارية
          if (jid.includes('@newsletter') || jid.includes('@broadcast')) {
            const name = c.name || c.pushName || (jid.includes('@newsletter') ? 'قناة واتساب إخبارية' : 'بث جماعي');
            newsletterContacts.push({ jid, name, avatar: c.profilePicUrl || null });
            continue;
          }

          // 2. المجموعات
          if (jid.includes('@g.us')) {
            continue;
          }

          // 3. فحص هل هو LID مشفر
          const isLid = jid.includes('@lid');
          let rawPhone = '';

          if (jid.includes('@s.whatsapp.net')) {
            rawPhone = jid.replace('@s.whatsapp.net', '');
          } else if (isLid) {
            // محاولة استخلاص الرقم من خريطة الشات
            if (lidToPhone.has(jid)) {
              rawPhone = lidToPhone.get(jid)!;
              extractedFromLids++;
            } else if (isMeaningfulName(c.pushName) === false && c.pushName && /^[0-9+ ]+$/.test(c.pushName)) {
              rawPhone = c.pushName;
              extractedFromLids++;
            }
          }

          const phone = rawPhone ? normalizePhone(rawPhone) : '';
          const hasRealName = isMeaningfulName(c.name);
          const hasPushName = isMeaningfulName(c.pushName);
          const name = hasRealName ? c.name!.trim() : hasPushName ? c.pushName!.trim() : '';
          const dispName = hasRealName ? c.name!.trim() : hasPushName ? c.pushName!.trim() : null;

          if (isLid && !phone) {
            // حساب LID مشفر لم نتمكن من استخلاص رقمه — نجلبه كجهة اتصال مشفرة مع وسم خاص
            lidContacts.push({
              jid,
              phone: null,
              name: name || `حساب مشفر (${jid.replace('@lid', '').slice(-5)})`,
              avatar: c.profilePicUrl || null,
              country: 'XX',
            });
            continue;
          }

          if (phone && phone !== '+') {
            if (seenPhones.has(phone)) continue;
            seenPhones.add(phone);
            const country = detectCountry(phone);
            individuals.push({
              phone,
              name: name || phone,
              dispName: dispName || phone,
              jid,
              avatar: c.profilePicUrl || null,
              country,
            });
          }
        }

        // حفظ الأفراد العاديين (Upsert على primary_phone_e164)
        if (individuals.length > 0) {
          await q(
            `insert into hub.contacts
               (display_name, full_name, primary_phone, primary_phone_e164, wa_jid, entity_type,
                commercial_role, source, source_detail, avatar_url, country_code, kind, updated_at, last_activity_at)
             select x.dispname, x.name, x.phone, x.phone, x.jid, 'individual',
                    'b2c', 'evolution', 'evolution:' || $1::text, x.avatar, x.country,
                    'individual', now(), now()
             from unnest($2::text[], $3::text[], $4::text[], $5::text[], $6::text[], $7::text[]) as x(phone, name, dispname, jid, avatar, country)
             on conflict (primary_phone_e164) do update set
               display_name = coalesce(nullif(hub.contacts.display_name, ''), excluded.display_name),
               full_name = coalesce(nullif(hub.contacts.full_name, ''), excluded.full_name),
               wa_jid = coalesce(hub.contacts.wa_jid, excluded.wa_jid),
               avatar_url = coalesce(excluded.avatar_url, hub.contacts.avatar_url),
               source_detail = case 
                 when hub.contacts.source_detail is null then excluded.source_detail
                 when hub.contacts.source_detail not like '%' || excluded.source_detail || '%' then hub.contacts.source_detail || ' • ' || excluded.source_detail
                 else hub.contacts.source_detail
               end,
               country_code = coalesce(excluded.country_code, hub.contacts.country_code),
               last_activity_at = now(),
               updated_at = now()`,
            [
              instance,
              individuals.map((i) => i.phone),
              individuals.map((i) => i.name),
              individuals.map((i) => i.dispName),
              individuals.map((i) => i.jid),
              individuals.map((i) => i.avatar),
              individuals.map((i) => i.country),
            ]
          );

          // إسناد وسم شخصي
          if (indTagId) {
            await q(
              `insert into hub.contact_tags (contact_id, tag_id)
               select c.id, $1::uuid
               from hub.contacts c
               where c.primary_phone_e164 = any($2::text[])
               on conflict do nothing`,
              [indTagId, individuals.map((i) => i.phone)]
            );
          }
        }

        // حفظ الحسابات المشفرة LID مع وسمها الخاص
        if (lidContacts.length > 0) {
          await q(
            `insert into hub.contacts
               (display_name, full_name, wa_jid, entity_type, commercial_role,
                source, source_detail, avatar_url, country_code, kind, updated_at, last_activity_at)
             select x.name, x.name, x.jid, 'individual', 'b2c',
                    'evolution', 'evolution:' || $1::text, x.avatar, 'XX',
                    'individual', now(), now()
             from unnest($2::text[], $3::text[], $4::text[]) as x(jid, name, avatar)
             where not exists (select 1 from hub.contacts c where c.wa_jid = x.jid)
             on conflict do nothing`,
            [
              instance,
              lidContacts.map((l) => l.jid),
              lidContacts.map((l) => l.name),
              lidContacts.map((l) => l.avatar),
            ]
          );

          if (lidTagId) {
            await q(
              `insert into hub.contact_tags (contact_id, tag_id)
               select c.id, $1::uuid
               from hub.contacts c
               where c.wa_jid = any($2::text[])
               on conflict do nothing`,
              [lidTagId, lidContacts.map((l) => l.jid)]
            );
          }
        }

        // حفظ القنوات والنشرات الإخبارية مع وسمها الخاص
        if (newsletterContacts.length > 0) {
          await q(
            `insert into hub.contacts
               (display_name, full_name, wa_jid, entity_type, commercial_role,
                source, source_detail, avatar_url, country_code, kind, updated_at, last_activity_at)
             select x.name, x.name, x.jid, 'group', 'b2b',
                    'evolution', 'evolution:' || $1::text, x.avatar, 'XX',
                    'group_entity', now(), now()
             from unnest($2::text[], $3::text[], $4::text[]) as x(jid, name, avatar)
             where not exists (select 1 from hub.contacts c where c.wa_jid = x.jid)
             on conflict do nothing`,
            [
              instance,
              newsletterContacts.map((n) => n.jid),
              newsletterContacts.map((n) => n.name),
              newsletterContacts.map((n) => n.avatar),
            ]
          );

          if (newsTagId) {
            await q(
              `insert into hub.contact_tags (contact_id, tag_id)
               select c.id, $1::uuid
               from hub.contacts c
               where c.wa_jid = any($2::text[])
               on conflict do nothing`,
              [newsTagId, newsletterContacts.map((n) => n.jid)]
            );
          }
        }

        // المجموعات: جلب الأسماء الحقيقية
        const groupJids = new Set<string>();
        for (const g of Array.isArray(rawGroups) ? rawGroups : []) {
          const gid = g.id || g.jid;
          if (gid && gid.includes('@g.us')) groupJids.add(gid);
        }
        for (const ch of Array.isArray(rawChats) ? rawChats : []) {
          const jid = ch.remoteJid || ch.id;
          if (jid && jid.includes('@g.us') && !groupJids.has(jid)) groupJids.add(jid);
        }

        const groupRows: { jid: string; name: string; pic: string | null; participants: number }[] = [];
        for (const gid of Array.from(groupJids)) {
          const meta = groupMeta.get(gid);
          const name = meta?.subject || `مجموعة (${gid.replace('@g.us', '').slice(-5)})`;
          groupRows.push({ jid: gid, name, pic: meta?.pic || null, participants: meta?.participants || 0 });
        }

        if (groupRows.length > 0) {
          await q(
            `insert into hub.whatsapp_groups (group_jid, subject, picture_url, participant_count, line_instance, updated_at)
             select x.jid, x.name, x.pic, x.pcount, $1, now()
             from unnest($2::text[], $3::text[], $4::text[], $5::int[]) as x(jid, name, pic, pcount)
             on conflict (group_jid) do update set
               subject = excluded.subject,
               picture_url = coalesce(excluded.picture_url, hub.whatsapp_groups.picture_url),
               participant_count = excluded.participant_count,
               updated_at = now()`,
            [
              instance,
              groupRows.map((g) => g.jid),
              groupRows.map((g) => g.name),
              groupRows.map((g) => g.pic),
              groupRows.map((g) => g.participants),
            ]
          );

          await q(
            `insert into hub.contacts
               (display_name, full_name, entity_type, commercial_role, source, source_detail,
                kind, wa_jid, avatar_url, country_code, updated_at, last_activity_at)
             select x.name, x.name, 'group', 'b2b', 'evolution', 'evolution:' || $1::text,
                    'group_entity', x.jid, x.pic, 'SA', now(), now()
             from unnest($2::text[], $3::text[], $4::text[]) as x(jid, name, pic)
             where not exists (select 1 from hub.contacts c where c.wa_jid = x.jid)
             on conflict do nothing`,
            [instance, groupRows.map((g) => g.jid), groupRows.map((g) => g.name), groupRows.map((g) => g.pic)]
          );

          if (groupTagId) {
            await q(
              `insert into hub.contact_tags (contact_id, tag_id)
               select c.id, $1::uuid
               from hub.contacts c
               where c.wa_jid = any($2::text[])
               on conflict do nothing`,
              [groupTagId, groupRows.map((g) => g.jid)]
            );
          }
        }

        // ربط المحادثات بجهات الاتصال المستوردة فوراً
        await q(
          `update hub.conversations cv
           set contact_id = c.id
           from hub.contacts c
           where (c.wa_jid = cv.chat_jid or c.primary_phone_e164 = split_part(cv.chat_jid, '@', 1))
             and cv.contact_id is null`
        );

        summary.lines_processed.push({
          instance,
          individuals: individuals.length,
          groups: groupRows.length,
          lids: lidContacts.length,
          newsletters: newsletterContacts.length,
          extracted_phones_from_lids: extractedFromLids,
        });

        summary.total_individuals += individuals.length;
        summary.total_groups += groupRows.length;
        summary.total_lids += lidContacts.length;
        summary.total_newsletters += newsletterContacts.length;
        summary.total_extracted_from_lids += extractedFromLids;
      } catch (lineErr: any) {
        summary.errors.push(`${instance}: ${lineErr.message}`);
      }
    }

    return NextResponse.json({ success: true, ...summary });
  } catch (err: any) {
    console.error('[contacts/sync-evolution]', err?.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
