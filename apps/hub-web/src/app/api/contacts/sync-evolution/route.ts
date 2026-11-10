import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase';

const EVOLUTION_URL = process.env.EVOLUTION_URL || 'https://evo.69.62.122.89.sslip.io';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || 'bc6075e9f95967407faae5d0fa9ac875a8d88a94782172db';

function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (!cleaned) return '';
  if (cleaned.startsWith('00')) cleaned = cleaned.substring(2);
  if (cleaned.startsWith('05') && cleaned.length === 10) {
    cleaned = '966' + cleaned.substring(1);
  } else if (cleaned.startsWith('5') && cleaned.length === 9) {
    cleaned = '966' + cleaned;
  }
  return '+' + cleaned;
}

// POST /api/contacts/sync-evolution?instance=Master
export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const instance = searchParams.get('instance') || 'Master';

    // 1. جلب جهات الاتصال، المحادثات، وكافة المجموعات بأسمائها الحقيقية بالتوازي
    const [contactsRes, chatsRes, allGroupsRes] = await Promise.allSettled([
      fetch(`${EVOLUTION_URL}/chat/findContacts/${instance}`, {
        method: 'POST',
        headers: { apikey: EVOLUTION_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }),
      fetch(`${EVOLUTION_URL}/chat/findChats/${instance}`, {
        method: 'POST',
        headers: { apikey: EVOLUTION_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }),
      fetch(`${EVOLUTION_URL}/group/fetchAllGroups/${instance}?getParticipants=false`, {
        method: 'GET',
        headers: { apikey: EVOLUTION_API_KEY },
      }),
    ]);

    if (contactsRes.status !== 'fulfilled' || !contactsRes.value.ok) {
      return NextResponse.json({ error: 'Failed to fetch contacts from Evolution API' }, { status: 502 });
    }

    const rawContacts = await contactsRes.value.json();
    const rawChats = chatsRes.status === 'fulfilled' && chatsRes.value.ok ? await chatsRes.value.json() : [];
    const rawAllGroups = allGroupsRes.status === 'fulfilled' && allGroupsRes.value.ok ? await allGroupsRes.value.json() : [];

    // خريطة استخراج أرقام هواتف LID
    const lidToPhone = new Map<string, string>();
    if (Array.isArray(rawChats)) {
      rawChats.forEach((c: any) => {
        const alt = c.lastMessage?.key?.remoteJidAlt || c.lastMessage?.key?.participantAlt;
        if (c.remoteJid && alt) {
          lidToPhone.set(c.remoteJid, alt);
        }
      });
    }

    // خريطة عناوين المجموعات الحقيقية (subject)
    const groupMap = new Map<string, { subject: string; pictureUrl?: string }>();
    if (Array.isArray(rawAllGroups)) {
      rawAllGroups.forEach((g: any) => {
        const gid = g.id || g.jid;
        if (gid) {
          const subject = (g.subject || g.name || '').trim();
          if (subject && subject !== 'Você') {
            groupMap.set(gid, {
              subject,
              pictureUrl: g.pictureUrl,
            });
          }
        }
      });
    }

    const supabase = getSupabaseAdmin();
    let importedCount = 0;
    let mergedCount = 0;
    let skippedCount = 0;

    const list = Array.isArray(rawContacts) ? rawContacts : [];

    for (const c of list) {
      const jid = c.remoteJid || c.id || '';
      if (!jid || jid.includes('@g.us')) continue; // معالجة المجموعات تالياً

      let rawPhone = '';
      if (jid.includes('@s.whatsapp.net')) {
        rawPhone = jid.replace('@s.whatsapp.net', '');
      } else if (lidToPhone.has(jid)) {
        rawPhone = (lidToPhone.get(jid) || '').replace('@s.whatsapp.net', '');
      } else if (c.pushName && /^[0-9+ ]+$/.test(c.pushName)) {
        rawPhone = c.pushName;
      }

      const phone = rawPhone ? normalizePhone(rawPhone) : null;
      if (!phone) {
        skippedCount++;
        continue;
      }

      // تحديد الاسم الحقيقي واستبعاد كلمة Você
      let displayName = '';
      if (c.name && c.name.trim() && c.name !== 'Você') {
        displayName = c.name.trim();
      } else if (c.pushName && c.pushName.trim() && c.pushName !== 'Você') {
        displayName = c.pushName.trim();
      } else {
        displayName = phone;
      }

      // فحص وسوم وتحليل ذكي تلقائي حسب الدولة والاسم
      const tags: string[] = [];
      let countryCode = 'SA';
      if (phone.startsWith('+966')) { tags.push('السعودية'); countryCode = 'SA'; }
      else if (phone.startsWith('+971')) { tags.push('الإمارات'); countryCode = 'AE'; }
      else if (phone.startsWith('+962')) { tags.push('الأردن'); countryCode = 'JO'; }
      else if (phone.startsWith('+20')) { tags.push('مصر'); countryCode = 'EG'; }
      else if (phone.startsWith('+965')) { tags.push('الكويت'); countryCode = 'KW'; }
      else if (phone.startsWith('+974')) { tags.push('قطر'); countryCode = 'QA'; }
      else if (phone.startsWith('+968')) { tags.push('عمان'); countryCode = 'OM'; }
      else if (phone.startsWith('+973')) { tags.push('البحرين'); countryCode = 'BH'; }
      else if (phone.startsWith('+90')) { tags.push('تركيا'); countryCode = 'TR'; }

      if (c.isSaved) tags.push('مسجل في الهاتف');
      tags.push(`خط: ${instance}`);

      // تحليل ذكي لاسم المنشأة والدور التجاري
      let entityType: 'individual' | 'organization' | 'group' = 'individual';
      let commercialRole: 'b2c' | 'b2b' | 'vendor' | 'partner' | 'staff' = 'b2c';
      if (/(فندق|سياح|عمر|حج|رحل|طيران|شرك|مؤسس|وكال|travel|hotel|tours|agency|resv)/i.test(displayName)) {
        entityType = 'organization';
        commercialRole = 'b2b';
        tags.push('قطاع سياحي وفندقي');
      }

      // فحص في Supabase (public.contacts)
      const { data: existing } = await supabase
        .from('contacts')
        .select('id, tags, commercial_role, entity_type')
        .eq('primary_phone', phone)
        .maybeSingle();

      if (existing) {
        const mergedTags = Array.from(new Set([...(existing.tags || []), ...tags]));
        await supabase
          .from('contacts')
          .update({
            display_name: displayName,
            source_detail: `evolution:${instance} (محدث)`,
            tags: mergedTags,
            avatar_url: c.profilePicUrl || undefined,
            country_code: countryCode,
            entity_type: existing.entity_type || entityType,
            commercial_role: existing.commercial_role || commercialRole,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
        mergedCount++;
      } else {
        await supabase
          .from('contacts')
          .insert({
            display_name: displayName,
            primary_phone: phone,
            entity_type: entityType,
            commercial_role: commercialRole,
            source: 'evolution',
            source_detail: `evolution:${instance}`,
            avatar_url: c.profilePicUrl || null,
            tags: tags,
            country_code: countryCode,
          });
        importedCount++;
      }
    }

    // 2. استيراد وتصنيف المجموعات الصريحة بأسمائها الحقيقية من fetchAllGroups و rawChats
    const seenGroups = new Set<string>();

    // أولاً: تجميع كافة المجموعات من fetchAllGroups
    const allGroupEntries: Array<{ jid: string; subject: string; pic?: string }> = [];
    if (Array.isArray(rawAllGroups)) {
      rawAllGroups.forEach((g: any) => {
        const jid = g.id || g.jid;
        if (jid && jid.includes('@g.us') && !seenGroups.has(jid)) {
          seenGroups.add(jid);
          allGroupEntries.push({
            jid,
            subject: (g.subject || g.name || '').trim(),
            pic: g.pictureUrl,
          });
        }
      });
    }

    // ثانياً: استكمال أي مجموعات موجودة في rawChats ولم تكن في fetchAllGroups
    if (Array.isArray(rawChats)) {
      rawChats.forEach((ch: any) => {
        const jid = ch.remoteJid || ch.id;
        if (jid && jid.includes('@g.us') && !seenGroups.has(jid)) {
          seenGroups.add(jid);
          const mapped = groupMap.get(jid);
          const sub = mapped?.subject || ch.subject || ch.name || '';
          allGroupEntries.push({
            jid,
            subject: (sub || '').trim(),
            pic: mapped?.pictureUrl,
          });
        }
      });
    }

    let groupsImported = 0;
    for (const grp of allGroupEntries) {
      const groupJid = grp.jid;
      let groupName = grp.subject;
      if (!groupName || groupName === 'Você' || groupName === 'مجموعة واتساب') {
        const fromMap = groupMap.get(groupJid);
        if (fromMap && fromMap.subject && fromMap.subject !== 'Você') {
          groupName = fromMap.subject;
        } else {
          // استخراج رقم تقريبي من المعرف إذا تعذر الاسم
          const cleanNum = groupJid.replace('@g.us', '').replace(/\D/g, '');
          groupName = cleanNum ? `مجموعة (${cleanNum.slice(-6)})` : 'مجموعة واتساب';
        }
      }

      const groupTags = ['مجموعة واتساب', `خط: ${instance}`];
      let commRole: 'b2b' | 'b2c' | 'partner' = 'b2b';
      if (/(فندق|سياح|عمر|حج|رحل|طيران|شرك|مؤسس|وكال|travel|hotel|tours|agency|resv)/i.test(groupName)) {
        commRole = 'b2b';
        groupTags.push('قطاع سياحي وفندقي');
      }

      const { data: existingGroup } = await supabase
        .from('contacts')
        .select('id, tags, display_name')
        .eq('primary_phone', groupJid)
        .maybeSingle();

      if (existingGroup) {
        const mergedTags = Array.from(new Set([...(existingGroup.tags || []), ...groupTags]));
        // إذا كان الاسم القديم "مجموعة واتساب" ووجدنا اسماً حقيقياً، نقوم بتحديثه فورياً!
        const finalName = (existingGroup.display_name && existingGroup.display_name !== 'مجموعة واتساب')
          ? existingGroup.display_name
          : groupName;

        await supabase
          .from('contacts')
          .update({
            display_name: finalName,
            entity_type: 'group',
            commercial_role: commRole,
            source_detail: `evolution:${instance} (محدث)`,
            tags: mergedTags,
            avatar_url: grp.pic || undefined,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingGroup.id);
        mergedCount++;
      } else {
        await supabase
          .from('contacts')
          .insert({
            display_name: groupName,
            primary_phone: groupJid,
            entity_type: 'group',
            commercial_role: commRole,
            source: 'evolution',
            source_detail: `evolution:${instance}`,
            tags: groupTags,
            avatar_url: grp.pic || null,
            country_code: 'SA',
          });
        importedCount++;
        groupsImported++;
      }
    }

    return NextResponse.json({
      success: true,
      instance,
      total_found: list.length,
      imported_count: importedCount,
      merged_count: mergedCount,
      skipped_count: skippedCount,
      groups_imported: groupsImported,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
