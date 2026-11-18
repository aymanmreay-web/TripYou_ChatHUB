import { NextRequest, NextResponse } from 'next/server';
import { q } from '../../../lib/pg';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * دالة مساعدة لتوحيد تنسيق رقم الهاتف (E.164 Normalization)
 */
function normalizePhoneE164(phone: string): string {
  if (!phone) return '';
  if (phone.includes('@')) return phone.trim();
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (!cleaned) return '';

  if (cleaned.startsWith('00')) cleaned = cleaned.substring(2);
  if (cleaned.startsWith('05') && cleaned.length === 10) cleaned = '966' + cleaned.substring(1);
  else if (cleaned.startsWith('5') && cleaned.length === 9) cleaned = '966' + cleaned;

  return '+' + cleaned;
}

/**
 * تحديد رمز واسم الدولة من بادئة الهاتف الدولي
 */
function detectCountry(phone: string | null | undefined): { code: string; name: string } {
  if (!phone) return { code: 'XX', name: 'غير محدد' };
  const p = phone.startsWith('+') ? phone : '+' + phone;
  if (p.startsWith('+966')) return { code: 'SA', name: 'السعودية 🇸🇦' };
  if (p.startsWith('+971')) return { code: 'AE', name: 'الإمارات 🇦🇪' };
  if (p.startsWith('+965')) return { code: 'KW', name: 'الكويت 🇰🇼' };
  if (p.startsWith('+974')) return { code: 'QA', name: 'قطر 🇶🇦' };
  if (p.startsWith('+968')) return { code: 'OM', name: 'عمان 🇴🇲' };
  if (p.startsWith('+973')) return { code: 'BH', name: 'البحرين 🇧🇭' };
  if (p.startsWith('+20'))  return { code: 'EG', name: 'مصر 🇪🇬' };
  if (p.startsWith('+962')) return { code: 'JO', name: 'الأردن 🇯🇴' };
  if (p.startsWith('+964')) return { code: 'IQ', name: 'العراق 🇮🇶' };
  if (p.startsWith('+967')) return { code: 'YE', name: 'اليمن 🇾🇪' };
  if (p.startsWith('+963')) return { code: 'SY', name: 'سوريا 🇸🇾' };
  if (p.startsWith('+961')) return { code: 'LB', name: 'لبنان 🇱🇧' };
  if (p.startsWith('+212')) return { code: 'MA', name: 'المغرب 🇲🇦' };
  if (p.startsWith('+213')) return { code: 'DZ', name: 'الجزائر 🇩🇿' };
  if (p.startsWith('+216')) return { code: 'TN', name: 'تونس 🇹🇳' };
  if (p.startsWith('+249')) return { code: 'SD', name: 'السودان 🇸🇩' };
  if (p.startsWith('+90'))  return { code: 'TR', name: 'تركيا 🇹🇷' };
  if (p.startsWith('+1'))   return { code: 'US', name: 'أمريكا/كندا 🇺🇸' };
  if (p.startsWith('+44'))  return { code: 'GB', name: 'بريطانيا 🇬🇧' };
  return { code: 'INTL', name: 'دولي 🌍' };
}

/**
 * GET /api/contacts
 * جلب قائمة جهات الاتصال مباشرة من hub.contacts مع دعم تصفية الدولة، الكيانات، والبحث الشامل
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('q') || searchParams.get('search') || '';
    const phone = searchParams.get('phone') || '';
    const entityType = searchParams.get('entity_type'); // individual | organization | group | lid | newsletter
    const role = searchParams.get('commercial_role');   // b2c | b2b | vendor | partner | staff
    const source = searchParams.get('source');           // evolution | excel_import | contacts_file | system | manual
    const countryCode = searchParams.get('country_code'); // SA, AE, EG, etc.
    const city = searchParams.get('city');
    const isFavorite = searchParams.get('favorite');
    const tagFilter = searchParams.get('tag') || '';
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 500);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const where: string[] = ['1=1'];
    const params: any[] = [];

    // استبعاد النشرات أو الـ LID افتراضياً أو الفرز بها
    if (entityType && entityType !== 'all') {
      if (entityType === 'lid') {
        where.push(`c.wa_jid like '%@lid%'`);
      } else if (entityType === 'newsletter') {
        where.push(`(c.wa_jid like '%@newsletter%' or c.wa_jid like '%@broadcast%')`);
      } else {
        params.push(entityType);
        where.push(`c.entity_type = $${params.length}`);
      }
    }

    if (countryCode && countryCode !== 'all') {
      params.push(countryCode);
      where.push(`c.country_code = $${params.length}`);
    }

    if (role && role !== 'all') {
      params.push(role);
      where.push(`c.commercial_role = $${params.length}`);
    }

    if (source && source !== 'all') {
      params.push(source);
      where.push(`c.source = $${params.length}`);
    }

    if (city && city !== 'all') {
      params.push(city);
      where.push(`c.city = $${params.length}`);
    }

    if (isFavorite === 'true') {
      where.push(`c.is_favorite = true`);
    }

    if (phone.trim()) {
      const p = phone.trim();
      params.push(`%${p}%`);
      where.push(`(c.primary_phone_e164 ilike $${params.length} or c.primary_phone ilike $${params.length} or c.wa_jid ilike $${params.length})`);
    }

    if (search.trim()) {
      const s = search.trim();
      params.push(`%${s}%`);
      const pIdx = params.length;
      where.push(`(
        c.display_name ilike $${pIdx} or 
        c.full_name ilike $${pIdx} or 
        c.company ilike $${pIdx} or 
        c.facility_name ilike $${pIdx} or 
        c.notes ilike $${pIdx} or 
        c.primary_phone_e164 ilike $${pIdx} or 
        c.primary_phone ilike $${pIdx} or 
        c.wa_jid ilike $${pIdx}
      )`);
    }

    if (tagFilter.trim()) {
      params.push(tagFilter.trim());
      where.push(`exists (
        select 1 from hub.contact_tags ct
        join hub.hub_tags t on t.id = ct.tag_id
        where ct.contact_id = c.id and (t.name_ar = $${params.length} or t.key = $${params.length})
      )`);
    }

    const whereClause = where.join(' and ');

    // جلب الإجمالي
    const countRes = await q<{ count: number }>(
      `select count(*)::int as count from hub.contacts c where ${whereClause}`,
      params
    );
    const total = countRes[0]?.count || 0;

    // جلب البيانات مع الترقيم
    params.push(limit);
    const limitIdx = params.length;
    params.push(offset);
    const offsetIdx = params.length;

    const contacts = await q(
      `select 
        c.id,
        c.display_name,
        c.full_name,
        c.company,
        c.entity_type,
        c.commercial_role,
        c.source,
        c.source_detail,
        c.primary_phone,
        c.primary_phone_e164,
        c.wa_jid,
        c.email,
        c.country_code,
        c.city,
        c.district,
        c.facility_name,
        c.avatar_url,
        c.is_favorite,
        c.notes,
        c.tags,
        c.created_at,
        c.updated_at,
        c.last_activity_at
      from hub.contacts c
      where ${whereClause}
      order by c.last_activity_at desc nulls last, c.created_at desc
      limit $${limitIdx} offset $${offsetIdx}`,
      params
    );

    return NextResponse.json({
      contacts: contacts || [],
      total,
      limit,
      offset,
    });
  } catch (err: any) {
    console.error('[API /api/contacts GET Error]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/contacts
 * إنشاء أو تحديث جهة اتصال مع فحص عدم التكرار وضبط الدولة والـ E.164
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      display_name,
      company,
      entity_type = 'individual',
      commercial_role = 'b2c',
      source = 'manual',
      source_detail,
      primary_phone,
      wa_jid,
      email,
      country_code,
      city,
      district,
      facility_name,
      avatar_url,
      notes,
      tags = [],
    } = body;

    const isWaJid = typeof wa_jid === 'string' && wa_jid.includes('@');
    if (!display_name && !primary_phone && !wa_jid) {
      return NextResponse.json({ error: 'الاسم أو رقم الهاتف أو معرف واتساب مطلوب على الأقل' }, { status: 400 });
    }

    const normalizedPhone = primary_phone ? normalizePhoneE164(primary_phone) : null;
    const detectedCountry = country_code || (normalizedPhone ? detectCountry(normalizedPhone).code : 'SA');

    // 1. فحص عبر wa_jid
    if (isWaJid) {
      const existingJid = await q<{ id: string; display_name: string }>(
        `select id, display_name from hub.contacts where wa_jid = $1 limit 1`,
        [wa_jid]
      );
      if (existingJid.length > 0) {
        const row = existingJid[0];
        const updated = await q(
          `update hub.contacts set
             display_name = coalesce($2, display_name),
             company = coalesce($3, company),
             city = coalesce($4, city),
             source_detail = coalesce($5, source_detail),
             updated_at = now()
           where id = $1
           returning *`,
          [row.id, display_name || null, company || null, city || null, source_detail || null]
        );
        return NextResponse.json({ contact: updated[0], is_merged: true });
      }
    }

    // 2. فحص عبر primary_phone_e164
    if (normalizedPhone && !normalizedPhone.includes('@')) {
      const existingPhone = await q<{ id: string; display_name: string }>(
        `select id, display_name from hub.contacts where primary_phone_e164 = $1 limit 1`,
        [normalizedPhone]
      );
      if (existingPhone.length > 0) {
        const row = existingPhone[0];
        const updated = await q(
          `update hub.contacts set
             display_name = coalesce($2, display_name),
             company = coalesce($3, company),
             commercial_role = coalesce($4, commercial_role),
             city = coalesce($5, city),
             district = coalesce($6, district),
             facility_name = coalesce($7, facility_name),
             notes = coalesce($8, notes),
             last_activity_at = now(),
             updated_at = now()
           where id = $1
           returning *`,
          [
            row.id,
            display_name || null,
            company || null,
            commercial_role || null,
            city || null,
            district || null,
            facility_name || null,
            notes || null,
          ]
        );
        return NextResponse.json({ contact: updated[0], is_merged: true });
      }
    }

    // 3. إنشاء جديد ذرياً في hub.contacts
    const kind = entity_type === 'group' ? 'group_entity' : entity_type === 'organization' ? 'business' : 'individual';
    const insertRes = await q(
      `insert into hub.contacts
         (display_name, full_name, company, entity_type, commercial_role, source, source_detail,
          primary_phone, primary_phone_e164, wa_jid, email, country_code, city, district,
          facility_name, avatar_url, notes, tags, kind, created_at, updated_at, last_activity_at)
       values ($1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, now(), now(), now())
       returning *`,
      [
        display_name || normalizedPhone || wa_jid || 'جهة اتصال جديدة',
        company || null,
        entity_type,
        commercial_role,
        source,
        source_detail || (source === 'manual' ? 'إدخال يدوي من لوحة التحكم' : null),
        normalizedPhone || primary_phone || null,
        normalizedPhone || null,
        isWaJid ? wa_jid : null,
        email || null,
        detectedCountry,
        city || null,
        district || null,
        facility_name || null,
        avatar_url || null,
        notes || null,
        Array.isArray(tags) ? tags : [],
        kind,
      ]
    );

    const newContact = insertRes[0];

    // حفظ في contact_phones أيضاً
    if (normalizedPhone && newContact?.id) {
      await q(
        `insert into hub.contact_phones (contact_id, phone_e164, is_primary, wa_status)
         values ($1, $2, true, $3)
         on conflict do nothing`,
        [newContact.id, normalizedPhone, source.startsWith('evolution') ? 'yes' : 'unknown']
      ).catch(() => {});
    }

    return NextResponse.json({ contact: newContact, is_merged: false }, { status: 201 });
  } catch (err: any) {
    console.error('[API /api/contacts POST Error]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * DELETE /api/contacts?all=true
 * مسح شامل فوري وذري لكافة جهات الاتصال المسجلة مع فك الارتباط التلقائي
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const deleteAll = searchParams.get('all') === 'true';

    if (!deleteAll) {
      return NextResponse.json({ error: 'مطلوب تأكيد الحذف الشامل all=true' }, { status: 400 });
    }

    // 1. تصفير المفاتيح الخارجية في المحادثات، المجموعات، وطابور الحملات
    await q(`update hub.conversations set contact_id = null where contact_id is not null`);
    await q(`update hub.whatsapp_groups set contact_id = null where contact_id is not null`);
    await q(`update public.campaign_recipients set contact_id = null where contact_id is not null`);

    // 2. تنظيف جداول التبعيات المباشرة
    await q(`delete from hub.contact_phones`);
    await q(`delete from hub.contact_tags`);
    await q(`delete from public.contact_list_members`);

    // 3. مسح كامل جهات الاتصال دفعة واحدة
    const delRes = await q(`delete from hub.contacts returning id`);
    const deletedCount = delRes.length;

    return NextResponse.json({
      success: true,
      message: 'تم مسح كافة جهات الاتصال بنجاح وتصفير الدليل بالكامل',
      deleted_count: deletedCount,
    });
  } catch (err: any) {
    console.error('[API /api/contacts DELETE Error]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
