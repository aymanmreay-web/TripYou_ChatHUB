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

    // 1. جلب جهات الاتصال والمحادثات بالتوازي لاستخراج أرقام الهواتف الصريحة
    const [contactsRes, chatsRes] = await Promise.allSettled([
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
    ]);

    if (contactsRes.status !== 'fulfilled' || !contactsRes.value.ok) {
      return NextResponse.json({ error: 'Failed to fetch contacts from Evolution API' }, { status: 502 });
    }

    const rawContacts = await contactsRes.value.json();
    const rawChats = chatsRes.status === 'fulfilled' && chatsRes.value.ok ? await chatsRes.value.json() : [];

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

    const supabase = getSupabaseAdmin();
    let importedCount = 0;
    let mergedCount = 0;
    let skippedCount = 0;

    const list = Array.isArray(rawContacts) ? rawContacts : [];

    for (const c of list) {
      const jid = c.remoteJid || c.id || '';
      if (!jid || jid.includes('@g.us')) continue; // استبعاد المجموعات

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

      const displayName = c.pushName || c.name || phone;
      const isGroup = false;

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
      const lowerName = displayName.toLowerCase();
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

    return NextResponse.json({
      success: true,
      instance,
      total_found: list.length,
      imported_count: importedCount,
      merged_count: mergedCount,
      skipped_count: skippedCount,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

