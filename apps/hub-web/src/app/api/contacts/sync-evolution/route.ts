import { NextRequest, NextResponse } from 'next/server';
import { q } from '../../../../lib/pg';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 300;

/**
 * م8 — استيراد حقيقي 100% من Evolution API لكل الخطوط المتصلة:
 * - لا حدود على عدد الجهات (دفعات ذرية عبر pg/unnest — يتحمل عشرات الآلاف)
 * - أسماء المجموعات الحقيقية (subject) من group/fetchAllGroups — لا معرفات عشوائية
 * - تخزين wa_jid لكل جهة (حجر أساس الدمج والفهرسة)
 * - فرز تلقائي مربوط بقسم الوسوم المركزي (hub_tags + contact_tags):
 *   شخصي / مجموعة واتساب / شركة-مؤسسة / قطاع سياحي / دولة / خط المصدر
 *
 * POST /api/contacts/sync-evolution?instance=Master (اختياري — الافتراضي كل الخطوط المتصلة)
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

function isMeaningfulName(name: string | undefined | null): boolean {
  if (!name) return false;
  const n = name.trim();
  if (!n || n === 'Você' || n === 'voce') return false;
  if (/^[0-9+\-@ ]+$/.test(n)) return false; // أرقام/معرفات خام ليست أسماء
  return true;
}

/** أوسمة النظام المركزية: name → id (ينشئ الناقص — مربوطة بقسم الوسوم) */
async function ensureTags(names: { key: string; name: string; color: string }[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  for (const t of names) {
    const rows = await q<{ id: string }>(
      `insert into hub.hub_tags (key, name_ar, color, kind, scope)
       values ($1, $2, $3, 'custom', 'contact')
       on conflict (key) do update set updated_at = now()
       returning id`,
      [t.key, t.name, t.color]
    );
    if (rows[0]?.id) map.set(t.key, rows[0].id);
  }
  return map;
}

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const onlyInstance = searchParams.get('instance');

    // 1) كل الخطوط المتصلة من القاعدة — الاستيراد الحقيقي لكل خط مفتوح
    // احتياطي: إن كانت حالة الخطوط في القاعدة قديمة (لا connected) نأخذ الخطوط المفتوحة فعلياً من Evolution
    let lines = onlyInstance
      ? [{ instance_name: onlyInstance }]
      : await q<{ instance_name: string }>(`select instance_name from hub.lines where status = 'connected' order by instance_name`);

    if (!onlyInstance && lines.length === 0) {
      try {
        const instRes = await fetch(`${EVOLUTION_URL}/instance/fetchInstances`, { headers: { apikey: EVOLUTION_API_KEY }, cache: 'no-store' });
        if (instRes.ok) {
          const instList = await instRes.json();
          const openNames = (Array.isArray(instList) ? instList : [])
            .filter((i: any) => i.connectionStatus === 'open' && i.name)
            .map((i: any) => ({ instance_name: i.name as string }));
          if (openNames.length > 0) {
            lines = openNames;
            // مزامنة حالة الخطوط في القاعدة كي يستقر الفحص مستقبلاً
            for (const l of openNames) {
              await q(`update hub.lines set status = 'connected', updated_at = now() where instance_name = $1 and status <> 'connected'`, [l.instance_name]).catch(() => {});
            }
          }
        }
      } catch { /* نُبقي القائمة فارغة → رسالة الخطأ الأصلية */ }
    }

    if (lines.length === 0) {
      return NextResponse.json({ error: 'لا يوجد خطوط متصلة حالياً — افتح خطاً واحداً على الأقل' }, { status: 400 });
    }

    // 2) أوسمة الفرز التلقائي (مربوطة بقسم الوسوم المركزي)
    const tagMap = await ensureTags([
      { key: 'auto_individual', name: 'شخصي (فردي)', color: 'blue' },
      { key: 'auto_group', name: 'مجموعة واتساب', color: 'purple' },
      { key: 'auto_organization', name: 'شركة / مؤسسة', color: 'amber' },
      { key: 'auto_tourism', name: 'قطاع سياحي وفندقي', color: 'emerald' },
    ]);

    const evoHeaders = { apikey: EVOLUTION_API_KEY, 'Content-Type': 'application/json' };
    const summary = {
      lines_processed: [] as { instance: string; individuals: number; groups: number; skipped: number }[],
      total_individuals: 0,
      total_groups: 0,
      total_skipped: 0,
      total_tag_links: 0,
      errors: [] as string[],
    };

    // فهرس الوسوم الجاهز للربط الجماعي
    const tagIdFor = (key: string) => tagMap.get(key) || null;

    for (const line of lines) {
      const instance = line.instance_name;
      try {
        // 3) جلب كل مصادر الحقيقة بالتوازي: جهات + محادثات + مجموعات بالمشاركين
        const [contactsRes, chatsRes, groupsRes] = await Promise.allSettled([
          fetch(`${EVOLUTION_URL}/chat/findContacts/${instance}`, { method: 'POST', headers: evoHeaders, body: JSON.stringify({}) }),
          fetch(`${EVOLUTION_URL}/chat/findChats/${instance}`, { method: 'POST', headers: evoHeaders, body: JSON.stringify({}) }),
          fetch(`${EVOLUTION_URL}/group/fetchAllGroups/${instance}?getParticipants=true`, { method: 'GET', headers: evoHeaders }),
        ]);

        const rawContacts = contactsRes.status === 'fulfilled' && contactsRes.value.ok ? await contactsRes.value.json() : [];
        const rawChats = chatsRes.status === 'fulfilled' && chatsRes.value.ok ? await chatsRes.value.json() : [];
        const rawGroups = groupsRes.status === 'fulfilled' && groupsRes.value.ok ? await groupsRes.value.json() : [];
        if (!Array.isArray(rawContacts)) { summary.errors.push(`${instance}: findContacts رد غير مصفوفة`); continue; }

        // خريطة LID → رقم حقيقي (من آخر رسائل المحادثات ومشاركي المجموعات)
        const lidToPhone = new Map<string, string>();
        for (const c of Array.isArray(rawChats) ? rawChats : []) {
          const alt = c.lastMessage?.key?.remoteJidAlt || c.lastMessage?.key?.participantAlt;
          if (c.remoteJid && alt) lidToPhone.set(c.remoteJid, alt);
        }
        // أسماء المجموعات الحقيقية + مشاركون
        const groupMeta = new Map<string, { subject: string; pic?: string; participants: number; description?: string }>();
        for (const g of Array.isArray(rawGroups) ? rawGroups : []) {
          const gid = g.id || g.jid;
          if (!gid) continue;
          const subject = (g.subject || g.name || '').trim();
          if (subject && isMeaningfulName(subject)) {
            groupMeta.set(gid, {
              subject,
              pic: g.pictureUrl,
              participants: Array.isArray(g.participants) ? g.participants.length : (g.participantCount || 0),
              description: g.desc || g.description || undefined,
            });
          }
        }

        // ─── الأفراد: تجميع مع تخطي المكرر في نفس الدفعة ───
        const individuals: { phone: string; name: string; jid: string; avatar: string | null; isSaved: boolean }[] = [];
        const seenPhones = new Set<string>();
        let skipped = 0;

        for (const c of rawContacts) {
          const jid = c.remoteJid || c.id || '';
          if (!jid || jid.includes('@g.us') || jid.includes('@newsletter') || jid.includes('@broadcast')) { skipped++; continue; }

          let rawPhone = '';
          if (jid.includes('@s.whatsapp.net')) rawPhone = jid.replace('@s.whatsapp.net', '');
          else if (lidToPhone.has(jid)) rawPhone = (lidToPhone.get(jid) || '').replace('@s.whatsapp.net', '').replace(/\D/g, '');
          else if (isMeaningfulName(c.pushName) === false && c.pushName && /^[0-9+ ]+$/.test(c.pushName)) rawPhone = c.pushName;

          const phone = rawPhone ? normalizePhone(rawPhone) : '';
          if (!phone || phone === '+' || seenPhones.has(phone)) { skipped++; continue; }
          seenPhones.add(phone);

          const name = isMeaningfulName(c.name) ? c.name!.trim() : isMeaningfulName(c.pushName) ? c.pushName.trim() : phone;
          individuals.push({ phone, name, jid, avatar: c.profilePicUrl || null, isSaved: !!c.isSaved });
        }

        // ─── الأفراد: upsert ذري واحد (no limit — unnest) ───
        if (individuals.length > 0) {
          await q(
            `insert into hub.contacts
               (display_name, full_name, primary_phone_e164, wa_jid, entity_type, commercial_role,
                source, source_detail, avatar_url, country_code, kind, updated_at, last_activity_at)
             select x.phone, x.name, x.phone, x.jid, 'individual', 'b2c',
                    'evolution', 'evolution:' || $1, x.avatar,
                    case when x.phone like '+966%' then 'SA' when x.phone like '+971%' then 'AE'
                         when x.phone like '+962%' then 'JO' when x.phone like '+20%'  then 'EG'
                         when x.phone like '+965%' then 'KW' when x.phone like '+974%' then 'QA'
                         when x.phone like '+968%' then 'OM' when x.phone like '+973%' then 'BH'
                         when x.phone like '+90%'  then 'TR' else 'XX' end,
                    'individual', now(), now()
             from unnest($2::text[], $3::text[], $4::text[], $5::text[], $6::boolean[]) as x(phone, name, jid, avatar, issaved)
             on conflict (primary_phone_e164) do update set
               display_name = case when excluded.full_name <> '+' || replace(hub.contacts.primary_phone_e164, '+', '') then excluded.full_name else hub.contacts.display_name end,
               full_name = case when excluded.full_name <> '+' || replace(hub.contacts.primary_phone_e164, '+', '') then excluded.full_name else hub.contacts.full_name end,
               wa_jid = coalesce(hub.contacts.wa_jid, excluded.wa_jid),
               avatar_url = coalesce(excluded.avatar_url, hub.contacts.avatar_url),
               last_activity_at = now(),
               updated_at = now()`,
            [
              instance,
              individuals.map((i) => i.phone),
              individuals.map((i) => i.name),
              individuals.map((i) => i.jid),
              individuals.map((i) => i.avatar),
              individuals.map((i) => i.isSaved),
            ]
          );

          // أرقام هواتف الأفراد في جدول contact_phones (عدة أرقام لكل جهة)
          await q(
            `insert into hub.contact_phones (contact_id, phone_e164, is_primary, wa_status)
             select ct.id, x.phone, true, 'yes'
             from unnest($1::text[], $2::text[]) as x(phone, jid)
             join hub.contacts ct on ct.primary_phone_e164 = x.phone
             on conflict (contact_id, phone_e164) do nothing`,
            [individuals.map((i) => i.phone), individuals.map((i) => i.jid)]
          );
        }

        // ─── المجموعات: الاسم الحقيقي من groupMeta، لا معرفات عشوائية أبداً ───
        const groupJids = new Set<string>();
        for (const g of Array.isArray(rawGroups) ? rawGroups : []) {
          const gid = g.id || g.jid;
          if (gid && gid.includes('@g.us')) groupJids.add(gid);
        }
        for (const ch of Array.isArray(rawChats) ? rawChats : []) {
          const jid = ch.remoteJid || ch.id;
          if (jid && jid.includes('@g.us') && !groupJids.has(jid)) groupJids.add(jid);
        }

        const groupRows: { jid: string; name: string; pic: string | null; participants: number; description?: string }[] = [];
        for (const gid of Array.from(groupJids)) {
          const meta = groupMeta.get(gid);
          // الاسم الحقيقي فقط — إن غاب نستخدم القسمة الأخيرة من الـ jid كرقم مرجعي صريح وليس تسمية
          const name = meta?.subject || `مجموعة بدون اسم (${gid.replace('@g.us', '').slice(-4)})`;
          groupRows.push({ jid: gid, name, pic: meta?.pic || null, participants: meta?.participants || 0, description: meta?.description });
        }

        if (groupRows.length > 0) {
          // جدول whatsapp_groups المركزي
          await q(
            `insert into hub.whatsapp_groups (group_jid, subject, picture_url, participant_count, line_instance, updated_at)
             select x.jid, x.name, x.pic, x.pcount, $1, now()
             from unnest($2::text[], $3::text[], $4::text[], $5::int[]) as x(jid, name, pic, pcount)
             on conflict (group_jid) do update set
               subject = excluded.subject,
               picture_url = coalesce(excluded.picture_url, hub.whatsapp_groups.picture_url),
               participant_count = excluded.participant_count,
               line_instance = excluded.line_instance,
               updated_at = now()`,
            [
              instance,
              groupRows.map((g) => g.jid),
              groupRows.map((g) => g.name),
              groupRows.map((g) => g.pic),
              groupRows.map((g) => g.participants),
            ]
          );

          // جهات المجموعات: upsert على wa_jid (لا يصطدم بفهرس الهاتف الفريد)
          const gIns = await q<{ id: string }>(
            `insert into hub.contacts
               (display_name, full_name, entity_type, commercial_role, source, source_detail,
                kind, wa_jid, avatar_url, country_code, updated_at, last_activity_at)
             select x.name, x.name, 'group', 'b2b', 'evolution', 'evolution:' || $1,
                    'group_entity', x.jid, x.pic, 'SA', now(), now()
             from unnest($2::text[], $3::text[], $4::text[]) as x(jid, name, pic)
             where not exists (select 1 from hub.contacts c where c.wa_jid = x.jid)
             returning id`,
            [instance, groupRows.map((g) => g.jid), groupRows.map((g) => g.name), groupRows.map((g) => g.pic)]
          );

          // تحديث أسماء/صور المجموعات الموجودة
          await q(
            `update hub.contacts c set
               display_name = x.name, full_name = x.name,
               avatar_url = coalesce(x.pic, c.avatar_url),
               updated_at = now()
             from unnest($1::text[], $2::text[], $3::text[]) as x(jid, name, pic)
             where c.wa_jid = x.jid`,
            [groupRows.map((g) => g.jid), groupRows.map((g) => g.name), groupRows.map((g) => g.pic)]
          );

          // ربط whatsapp_groups.contact_id بالمجموعات الجديدة
          await q(
            `update hub.whatsapp_groups wg set contact_id = c.id
             from hub.contacts c
             where c.wa_jid = wg.group_jid and wg.contact_id is null`
          );
        }

        // ─── الفرز التلقائي: ربط الوسوم المركزية بكل جهة مستوردة (دفعة واحدة) ───
        const tagLinks = await q(
          `insert into hub.contact_tags (contact_id, tag_id)
           select c.id, tt.tid
           from hub.contacts c
           join (values
             ('individual', $2::uuid),
             ('group', $3::uuid),
             ('organization', $4::uuid)
           ) as tt(etype, tid) on tt.tid is not null and c.entity_type = tt.etype
           where c.source = 'evolution'
           on conflict (contact_id, tag_id) do nothing
           returning 1`,
          [instance, tagIdFor('auto_individual'), tagIdFor('auto_group'), tagIdFor('auto_organization')]
        );

        // وسم القطاع السياحي حسب الاسم
        await q(
          `insert into hub.contact_tags (contact_id, tag_id)
           select c.id, $1
           from hub.contacts c
           where $1 is not null
             and (c.display_name ~* '(فندق|سياح|حج|عمرة|رحل|طيران|شرك|مؤسس|وكال|travel|hotel|tours|agency)')
             and c.source = 'evolution'
           on conflict (contact_id, tag_id) do nothing`,
          [tagIdFor('auto_tourism')]
        );

        summary.lines_processed.push({ instance, individuals: individuals.length, groups: groupRows.length, skipped });
        summary.total_individuals += individuals.length;
        summary.total_groups += groupRows.length;
        summary.total_skipped += skipped;
        summary.total_tag_links += tagLinks.length;
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
