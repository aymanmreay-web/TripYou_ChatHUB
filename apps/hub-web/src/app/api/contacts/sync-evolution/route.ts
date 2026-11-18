import { NextRequest, NextResponse } from 'next/server';
import { q, withClient } from '../../../../lib/pg';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 300;

const EVOLUTION_URL = process.env.EVOLUTION_URL || 'https://evo.69.62.122.89.sslip.io';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '';

function normalizePhone(phone: string): string {
  let cleaned = (phone || '').replace(/[^0-9]/g, '');
  if (!cleaned) return '';
  if (cleaned.startsWith('00')) cleaned = cleaned.substring(2);
  if (cleaned.startsWith('05') && cleaned.length === 10) cleaned = '966' + cleaned.substring(1);
  else if (cleaned.startsWith('5') && cleaned.length === 9) cleaned = '966' + cleaned;
  if (cleaned.length < 7 || cleaned.length > 15) return '';
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

    // التحقق من حالة الخطوط المفتوحة في سيرفر Evolution
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
          { error: `خط واتساب "${onlyInstance}" غير متصل حالياً (حالته: ${status}) — يرجى فتح الخط من قسم الخطوط أولاً.` },
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
        total_items: number;
        individuals: number;
        groups: number;
        lids: number;
        newsletters: number;
        saved_phone_contacts: number;
        extracted_phones_from_lids: number;
        updated: number;
        inserted: number;
      }[],
      total_individuals: 0,
      total_groups: 0,
      total_lids: 0,
      total_newsletters: 0,
      total_saved_phone_contacts: 0,
      total_extracted_from_lids: 0,
      total_updated: 0,
      total_inserted: 0,
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
          summary.errors.push(`${instance}: لم يتمكن من جلب جهات الاتصال`);
          continue;
        }

        // 1. خريطة الأسماء والأرقام المستخلصة من الشات (LID -> Phone, JID -> Name)
        const lidToPhone = new Map<string, string>();
        const chatNames = new Map<string, string>();

        for (const ch of Array.isArray(rawChats) ? rawChats : []) {
          const remoteJid = ch.remoteJid || ch.id || '';
          if (!remoteJid) continue;

          // استخلاص الاسم من الشات
          const chatName = (ch.pushName || ch.name || '').trim();
          if (chatName && isMeaningfulName(chatName)) {
            chatNames.set(remoteJid, chatName);
          }

          // استخلاص رقم الهاتف للحسابات المشفرة LID
          const alt = ch.lastMessage?.key?.remoteJidAlt || ch.lastMessage?.key?.participantAlt || ch.lastMessage?.participant;
          if (alt && typeof alt === 'string' && alt.includes('@s.whatsapp.net')) {
            const digits = alt.replace('@s.whatsapp.net', '').replace(/\D/g, '');
            if (digits.length >= 7) {
              lidToPhone.set(remoteJid, digits);
            }
          }
        }

        // 2. خريطة المجموعات وأسمائها الحقيقية
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

        // 3. تحليل وتصنيف كل جهة اتصال مستوردة
        interface StagedContact {
          jid: string;
          phone: string | null;
          name: string;
          dispName: string;
          avatar: string | null;
          country: string;
          entity_type: 'individual' | 'group';
          commercial_role: 'b2c' | 'b2b';
          kind: 'individual' | 'business' | 'group_entity';
          is_lid: boolean;
          is_newsletter: boolean;
          is_group: boolean;
          is_saved: boolean;
        }

        const stagedList: StagedContact[] = [];
        const seenJids = new Set<string>();
        const seenPhones = new Set<string>();

        let countIndividuals = 0;
        let countGroups = 0;
        let countLids = 0;
        let countNewsletters = 0;
        let countSavedPhone = 0;
        let countExtractedLids = 0;

        // معالجة جهات الاتصال من findContacts
        for (const c of rawContacts) {
          const jid = c.remoteJid || c.id || '';
          if (!jid || seenJids.has(jid)) continue;

          // التحقق هل هي جهة اتصال مخزنة في دفتر عناوين الجوال
          const isSavedInPhone = c.isSaved === true;

          // 1. القنوات والنشرات الإخبارية
          if (jid.includes('@newsletter') || jid.includes('@broadcast')) {
            seenJids.add(jid);
            const name = c.name || c.pushName || chatNames.get(jid) || (jid.includes('@newsletter') ? 'قناة واتساب إخبارية' : 'بث جماعي');
            stagedList.push({
              jid,
              phone: null,
              name,
              dispName: name,
              avatar: c.profilePicUrl || null,
              country: 'XX',
              entity_type: 'group',
              commercial_role: 'b2b',
              kind: 'group_entity',
              is_lid: false,
              is_newsletter: true,
              is_group: false,
              is_saved: false,
            });
            countNewsletters++;
            continue;
          }

          // 2. المجموعات (@g.us)
          if (jid.includes('@g.us')) {
            seenJids.add(jid);
            const meta = groupMeta.get(jid);
            const name = meta?.subject || c.name || c.pushName || chatNames.get(jid) || `مجموعة (${jid.replace('@g.us', '').slice(-5)})`;
            stagedList.push({
              jid,
              phone: null,
              name,
              dispName: name,
              avatar: meta?.pic || c.profilePicUrl || null,
              country: 'SA',
              entity_type: 'group',
              commercial_role: 'b2b',
              kind: 'group_entity',
              is_lid: false,
              is_newsletter: false,
              is_group: true,
              is_saved: false,
            });
            countGroups++;
            continue;
          }

          // 3. الأفراد والحسابات المشفرة LID
          const isLid = jid.includes('@lid');
          let rawPhone = '';

          if (jid.includes('@s.whatsapp.net')) {
            rawPhone = jid.replace('@s.whatsapp.net', '');
          } else if (isLid) {
            // محاولة استخلاص الهاتف من خريطة الشات
            if (lidToPhone.has(jid)) {
              rawPhone = lidToPhone.get(jid)!;
              countExtractedLids++;
            } else if (c.pushName && /^[0-9+ ]+$/.test(c.pushName) && c.pushName.replace(/\D/g, '').length >= 7) {
              rawPhone = c.pushName;
              countExtractedLids++;
            }
          }

          const phone = rawPhone ? normalizePhone(rawPhone) : null;
          if (phone && seenPhones.has(phone)) {
            // هاتف تم تسجيله مسبقاً في نفس الدفعة
            continue;
          }
          if (phone) seenPhones.add(phone);
          seenJids.add(jid);

          // استخراج الاسم الحقيقي المخزن في الجوال أو اسم الملف الشخصي
          const realNameCandidate = (
            (isMeaningfulName(c.name) ? c.name : null) ||
            (isMeaningfulName(c.pushName) ? c.pushName : null) ||
            (chatNames.has(jid) ? chatNames.get(jid) : null) ||
            ''
          ).trim();

          const hasRealName = Boolean(realNameCandidate);
          if (isSavedInPhone || hasRealName) {
            countSavedPhone++;
          }

          const name = hasRealName ? realNameCandidate : (phone || (isLid ? `حساب مشفر (${jid.replace('@lid', '').slice(-5)})` : 'جهة اتصال'));
          const dispName = name;
          const country = phone ? detectCountry(phone) : 'XX';

          if (isLid && !phone) {
            countLids++;
          } else {
            countIndividuals++;
          }

          stagedList.push({
            jid,
            phone,
            name,
            dispName,
            avatar: c.profilePicUrl || null,
            country,
            entity_type: 'individual',
            commercial_role: 'b2c',
            kind: 'individual',
            is_lid: isLid && !phone,
            is_newsletter: false,
            is_group: false,
            is_saved: isSavedInPhone,
          });
        }

        // إضافة مجموعات إضافية ظهرت في rawGroups أو rawChats ولم تكن في findContacts
        for (const [gid, meta] of Array.from(groupMeta.entries())) {
          if (!seenJids.has(gid)) {
            seenJids.add(gid);
            stagedList.push({
              jid: gid,
              phone: null,
              name: meta.subject,
              dispName: meta.subject,
              avatar: meta.pic || null,
              country: 'SA',
              entity_type: 'group',
              commercial_role: 'b2b',
              kind: 'group_entity',
              is_lid: false,
              is_newsletter: false,
              is_group: true,
              is_saved: false,
            });
            countGroups++;
          }
        }

        // 4. الحفظ في قاعدة البيانات عبر Staging Table آمن 100% يمنع أي تعارض قيود
        let updatedCount = 0;
        let insertedCount = 0;

        if (stagedList.length > 0) {
          await withClient(async (client) => {
            await client.query('BEGIN');

            await client.query(`
              CREATE TEMP TABLE IF NOT EXISTS staging_evo (
                wa_jid text,
                phone text,
                name text,
                disp_name text,
                avatar text,
                country text,
                entity_type text,
                commercial_role text,
                kind text,
                instance text
              ) ON COMMIT DROP;
            `);
            await client.query('TRUNCATE staging_evo;');

            // إدراج الدفعة في الجدول المؤقت
            await client.query(`
              INSERT INTO staging_evo (wa_jid, phone, name, disp_name, avatar, country, entity_type, commercial_role, kind, instance)
              SELECT * FROM unnest(
                $1::text[], $2::text[], $3::text[], $4::text[], $5::text[],
                $6::text[], $7::text[], $8::text[], $9::text[], $10::text[]
              )
            `, [
              stagedList.map((s) => s.jid),
              stagedList.map((s) => s.phone),
              stagedList.map((s) => s.name),
              stagedList.map((s) => s.dispName),
              stagedList.map((s) => s.avatar),
              stagedList.map((s) => s.country),
              stagedList.map((s) => s.entity_type),
              stagedList.map((s) => s.commercial_role),
              stagedList.map((s) => s.kind),
              stagedList.map(() => instance),
            ]);

            // تحديث السجلات الموجودة مسبقاً (مطابقة بـ wa_jid أو primary_phone_e164)
            const updRes = await client.query(`
              UPDATE hub.contacts c
              SET
                display_name = CASE
                  WHEN c.display_name IS NULL OR c.display_name = '' OR c.display_name ~ '^[0-9+\\-@ ]+$' OR c.display_name LIKE 'حساب مشفر%'
                    THEN COALESCE(NULLIF(s.disp_name, ''), c.display_name)
                  ELSE c.display_name
                END,
                full_name = CASE
                  WHEN c.full_name IS NULL OR c.full_name = '' OR c.full_name ~ '^[0-9+\\-@ ]+$'
                    THEN COALESCE(NULLIF(s.name, ''), c.full_name)
                  ELSE c.full_name
                END,
                primary_phone_e164 = CASE
                  WHEN c.primary_phone_e164 IS NOT NULL THEN c.primary_phone_e164
                  WHEN s.phone IS NOT NULL AND NOT EXISTS (
                    SELECT 1 FROM hub.contacts ex WHERE ex.primary_phone_e164 = s.phone AND ex.id <> c.id
                  ) THEN s.phone
                  ELSE c.primary_phone_e164
                END,
                primary_phone = CASE
                  WHEN c.primary_phone IS NOT NULL THEN c.primary_phone
                  WHEN s.phone IS NOT NULL AND NOT EXISTS (
                    SELECT 1 FROM hub.contacts ex WHERE ex.primary_phone_e164 = s.phone AND ex.id <> c.id
                  ) THEN s.phone
                  ELSE c.primary_phone
                END,
                wa_jid = CASE
                  WHEN c.wa_jid IS NOT NULL THEN c.wa_jid
                  WHEN s.wa_jid IS NOT NULL AND NOT EXISTS (
                    SELECT 1 FROM hub.contacts ex WHERE ex.wa_jid = s.wa_jid AND ex.id <> c.id
                  ) THEN s.wa_jid
                  ELSE c.wa_jid
                END,
                avatar_url = COALESCE(s.avatar, c.avatar_url),
                country_code = CASE WHEN c.country_code IS NULL OR c.country_code = 'XX' THEN s.country ELSE c.country_code END,
                source_detail = CASE
                  WHEN c.source_detail IS NULL THEN 'evolution:' || s.instance
                  WHEN c.source_detail NOT LIKE '%' || s.instance || '%' THEN c.source_detail || ' • evolution:' || s.instance
                  ELSE c.source_detail
                END,
                last_activity_at = now(),
                updated_at = now()
              FROM staging_evo s
              WHERE (s.wa_jid IS NOT NULL AND c.wa_jid = s.wa_jid)
                 OR (s.phone IS NOT NULL AND c.primary_phone_e164 = s.phone);
            `);
            updatedCount = updRes.rowCount || 0;

            // إدراج السجلات الجديدة بالكامل
            const insRes = await client.query(`
              INSERT INTO hub.contacts (
                display_name, full_name, primary_phone, primary_phone_e164, wa_jid, entity_type,
                commercial_role, source, source_detail, avatar_url, country_code, kind, created_at, updated_at, last_activity_at
              )
              SELECT
                s.disp_name, s.name, s.phone, s.phone, s.wa_jid, s.entity_type,
                s.commercial_role, 'evolution', 'evolution:' || s.instance, s.avatar, s.country, s.kind, now(), now(), now()
              FROM staging_evo s
              WHERE NOT EXISTS (
                SELECT 1 FROM hub.contacts c
                WHERE (s.wa_jid IS NOT NULL AND c.wa_jid = s.wa_jid)
                   OR (s.phone IS NOT NULL AND c.primary_phone_e164 = s.phone)
              )
              ON CONFLICT (primary_phone_e164) DO NOTHING;
            `);
            insertedCount = insRes.rowCount || 0;

            // حفظ المجموعات في whatsapp_groups أيضاً
            const groupsToSave = stagedList.filter((s) => s.is_group);
            if (groupsToSave.length > 0) {
              await client.query(`
                INSERT INTO hub.whatsapp_groups (group_jid, subject, picture_url, participant_count, line_instance, updated_at)
                SELECT x.jid, x.name, x.pic, x.pcount, $1, now()
                FROM unnest($2::text[], $3::text[], $4::text[], $5::int[]) as x(jid, name, pic, pcount)
                ON CONFLICT (group_jid) DO UPDATE SET
                  subject = excluded.subject,
                  picture_url = COALESCE(excluded.picture_url, hub.whatsapp_groups.picture_url),
                  participant_count = excluded.participant_count,
                  updated_at = now()
              `, [
                instance,
                groupsToSave.map((g) => g.jid),
                groupsToSave.map((g) => g.name),
                groupsToSave.map((g) => g.avatar),
                groupsToSave.map((g) => groupMeta.get(g.jid)?.participants || 0),
              ]);
            }

            // إسناد الأوسمة التلقائية
            if (lidTagId) {
              const lidJids = stagedList.filter((s) => s.is_lid).map((s) => s.jid);
              if (lidJids.length > 0) {
                await client.query(`
                  INSERT INTO hub.contact_tags (contact_id, tag_id)
                  SELECT c.id, $1::uuid
                  FROM hub.contacts c
                  WHERE c.wa_jid = ANY($2::text[])
                  ON CONFLICT DO NOTHING
                `, [lidTagId, lidJids]);
              }
            }

            if (newsTagId) {
              const newsJids = stagedList.filter((s) => s.is_newsletter).map((s) => s.jid);
              if (newsJids.length > 0) {
                await client.query(`
                  INSERT INTO hub.contact_tags (contact_id, tag_id)
                  SELECT c.id, $1::uuid
                  FROM hub.contacts c
                  WHERE c.wa_jid = ANY($2::text[])
                  ON CONFLICT DO NOTHING
                `, [newsTagId, newsJids]);
              }
            }

            if (groupTagId) {
              const grpJids = stagedList.filter((s) => s.is_group).map((s) => s.jid);
              if (grpJids.length > 0) {
                await client.query(`
                  INSERT INTO hub.contact_tags (contact_id, tag_id)
                  SELECT c.id, $1::uuid
                  FROM hub.contacts c
                  WHERE c.wa_jid = ANY($2::text[])
                  ON CONFLICT DO NOTHING
                `, [groupTagId, grpJids]);
              }
            }

            if (indTagId) {
              const indPhones = stagedList.filter((s) => s.phone).map((s) => s.phone!);
              if (indPhones.length > 0) {
                await client.query(`
                  INSERT INTO hub.contact_tags (contact_id, tag_id)
                  SELECT c.id, $1::uuid
                  FROM hub.contacts c
                  WHERE c.primary_phone_e164 = ANY($2::text[])
                  ON CONFLICT DO NOTHING
                `, [indTagId, indPhones]);
              }
            }

            // ربط المحادثات بجهات الاتصال فوراً
            await client.query(`
              UPDATE hub.conversations cv
              SET contact_id = c.id
              FROM hub.contacts c
              WHERE (c.wa_jid = cv.chat_jid OR c.primary_phone_e164 = split_part(cv.chat_jid, '@', 1))
                AND cv.contact_id IS NULL;
            `);

            await client.query('COMMIT');
          });
        }

        summary.lines_processed.push({
          instance,
          total_items: stagedList.length,
          individuals: countIndividuals,
          groups: countGroups,
          lids: countLids,
          newsletters: countNewsletters,
          saved_phone_contacts: countSavedPhone,
          extracted_phones_from_lids: countExtractedLids,
          updated: updatedCount,
          inserted: insertedCount,
        });

        summary.total_individuals += countIndividuals;
        summary.total_groups += countGroups;
        summary.total_lids += countLids;
        summary.total_newsletters += countNewsletters;
        summary.total_saved_phone_contacts += countSavedPhone;
        summary.total_extracted_from_lids += countExtractedLids;
        summary.total_updated += updatedCount;
        summary.total_inserted += insertedCount;
      } catch (lineErr: any) {
        console.error(`[contacts/sync-evolution error on ${instance}]`, lineErr.message);
        summary.errors.push(`${instance}: ${lineErr.message}`);
      }
    }

    const hasAnySuccess = summary.lines_processed.length > 0;
    return NextResponse.json({
      success: hasAnySuccess,
      ...summary,
    }, { status: hasAnySuccess ? 200 : 500 });
  } catch (err: any) {
    console.error('[contacts/sync-evolution]', err?.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
