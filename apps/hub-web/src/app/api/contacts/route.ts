import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../lib/supabase';

/**
 * دالة مساعدة لتوحيد تنسيق رقم الهاتف (E.164 Normalization)
 * تدعم الأرقام السعودية والخليجية والدولية
 */
function normalizePhoneE164(phone: string): string {
  // م8: معرفات المجموعات وغيرها من jids تُمرر كما هي دون تخريب
  if (phone.includes('@')) return phone.trim();
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (!cleaned) return '';

  // إذا بدأ بـ 00 نحذفها
  if (cleaned.startsWith('00')) {
    cleaned = cleaned.substring(2);
  }

  // إذا بدأ برقم محلي سعودي 05xxxxxxxx -> 9665xxxxxxxx
  if (cleaned.startsWith('05') && cleaned.length === 10) {
    cleaned = '966' + cleaned.substring(1);
  } else if (cleaned.startsWith('5') && cleaned.length === 9) {
    cleaned = '966' + cleaned;
  }

  return '+' + cleaned;
}

/**
 * GET /api/contacts
 * جلب قائمة جهات الاتصال مع الفلاتر ثلاثية الأبعاد (نوع الكيان، الدور، المصدر، المدينة، البحث)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('q') || searchParams.get('search') || '';
    const phone = searchParams.get('phone') || '';
    const entityType = searchParams.get('entity_type'); // individual | organization | group
    const role = searchParams.get('commercial_role');   // b2c | b2b | vendor | partner | staff
    const source = searchParams.get('source');           // evolution | excel_import | contacts_file | system | manual
    const city = searchParams.get('city');
    const isFavorite = searchParams.get('favorite');
    const tagFilter = searchParams.get('tag') || ''; // م8: فلتر وسم مركزي (بالاسم من قسم الوسوم)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 500);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // م8: فلترة بالوسم المركزي — نحصل على معرفات الجهات من hub.contact_tags مباشرة
    let filteredByTagIds: string[] | null = null;
    if (tagFilter.trim()) {
      const { q: pgQ } = await import('../../../lib/pg');
      const rows = await pgQ<{ contact_id: string }>(
        `select ct.contact_id from hub.contact_tags ct
         join hub.hub_tags t on t.id = ct.tag_id
         where t.name_ar = $1 limit 5000`,
        [tagFilter.trim()]
      );
      filteredByTagIds = rows.map((r) => r.contact_id);
      if (filteredByTagIds.length === 0) {
        return NextResponse.json({ contacts: [], total: 0, limit, offset });
      }
    }

    const supabase = getSupabaseAdmin();
    let query = supabase
      .from('contacts')
      .select(`
        id,
        display_name,
        company,
        entity_type,
        commercial_role,
        source,
        source_detail,
        primary_phone,
        email,
        country_code,
        city,
        district,
        facility_name,
        avatar_url,
        is_favorite,
        notes,
        tags,
        created_at,
        updated_at,
        last_activity_at
      `, { count: 'exact' });

    if (phone.trim()) {
      const p = phone.trim();
      query = query.or(`primary_phone.eq.${p},primary_phone_e164.eq.${p},primary_phone.ilike.%${p}%`);
    }

    if (entityType && entityType !== 'all') {
      query = query.eq('entity_type', entityType);
    }
    // م8: تطبيق فلتر الوسم المركزي على معرفات الجهات
    if (filteredByTagIds) {
      query = query.in('id', filteredByTagIds);
    }
    if (role && role !== 'all') {
      query = query.eq('commercial_role', role);
    }
    if (source && source !== 'all') {
      query = query.eq('source', source);
    }
    if (city && city !== 'all') {
      query = query.eq('city', city);
    }
    if (isFavorite === 'true') {
      query = query.eq('is_favorite', true);
    }

    if (search.trim()) {
      const s = search.trim();
      query = query.or(`display_name.ilike.%${s}%,company.ilike.%${s}%,primary_phone.ilike.%${s}%,facility_name.ilike.%${s}%,notes.ilike.%${s}%`);
    }

    query = query.order('last_activity_at', { ascending: false, nullsFirst: false })
                 .order('created_at', { ascending: false })
                 .range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) {
      console.error('[API /api/contacts GET Error]:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      contacts: data || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/contacts
 * إنشاء جهة اتصال جديدة مع التحقق من عدم التكرار (Deduplication) وتتبع المصدر بدقة
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
      wa_jid, // م8: معرف واتساب حقيقي (للمجموعات وأفراد LID) — يُخزن في العمود المخصص
      email,
      country_code = 'SA',
      city,
      district,
      facility_name,
      avatar_url,
      notes,
      tags = [],
    } = body;

    const isWaJid = typeof wa_jid === 'string' && wa_jid.includes('@');

    if (!display_name && !primary_phone && !wa_jid) {
      return NextResponse.json({ error: 'الاسم أو رقم الهاتف مطلوب على الأقل' }, { status: 400 });
    }

    const normalizedPhone = primary_phone ? normalizePhoneE164(primary_phone) : null;
    const supabase = getSupabaseAdmin();

    // ── م8: فحص عدم التكرار أولاً عبر معرف واتساب (للمجموعات) ──
    if (isWaJid) {
      const { data: byJid } = await supabase
        .from('contacts')
        .select('id, display_name')
        .eq('wa_jid', wa_jid)
        .maybeSingle();

      if (byJid) {
        const { data: updated, error: updateErr } = await supabase
          .from('contacts')
          .update({
            display_name: display_name || byJid.display_name,
            source_detail: source_detail || undefined,
            updated_at: new Date().toISOString(),
          })
          .eq('id', byJid.id)
          .select()
          .single();
        if (updateErr) {
          return NextResponse.json({ error: updateErr.message }, { status: 500 });
        }
        return NextResponse.json({ contact: updated, is_merged: true });
      }
    }

    // ── فحص عدم التكرار (Deduplication) عبر رقم الهاتف ──
    if (normalizedPhone && !normalizedPhone.includes('@')) {
      const { data: existing } = await supabase
        .from('contacts')
        .select('id, display_name, source, source_detail')
        .eq('primary_phone', normalizedPhone)
        .maybeSingle();

      if (existing) {
        // تحديث البيانات بدلاً من إنشاء مكرر
        const { data: updated, error: updateErr } = await supabase
          .from('contacts')
          .update({
            display_name: display_name || existing.display_name,
            company: company || undefined,
            entity_type,
            commercial_role,
            // نحافظ على المصدر الأصلي إذا كان موجوداً، أو نحدّث المصدر التفصيلي
            source_detail: source_detail || existing.source_detail,
            city: city || undefined,
            district: district || undefined,
            facility_name: facility_name || undefined,
            notes: notes || undefined,
            last_activity_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (updateErr) {
          return NextResponse.json({ error: updateErr.message }, { status: 500 });
        }

        return NextResponse.json({ contact: updated, is_merged: true });
      }
    }

    // ── إنشاء جهة اتصال جديدة بالكامل ──
    const insertPayload: Record<string, any> = {
      display_name: display_name || normalizedPhone || wa_jid || 'جهة اتصال جديدة',
      company: company || null,
      entity_type,
      commercial_role,
      source,
      source_detail: source_detail || (source === 'manual' ? 'إدخال يدوي من لوحة التحكم' : null),
      primary_phone: normalizedPhone && !normalizedPhone.includes('@') ? normalizedPhone : null,
      // م8: معرف واتساب في عموده المخصص — المجموعات لا تُخزن jid في حقل الهاتف
      wa_jid: isWaJid ? wa_jid : null,
      email: email || null,
      country_code,
      city: city || null,
      district: district || null,
      facility_name: facility_name || null,
      avatar_url: avatar_url || null,
      notes: notes || null,
      tags: Array.isArray(tags) ? tags : [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_activity_at: new Date().toISOString(),
    };
    // kind مطلوب بقيد القاعدة
    if (entity_type === 'group') insertPayload.kind = 'group_entity';
    else if (entity_type === 'organization') insertPayload.kind = 'business';
    else insertPayload.kind = 'individual';

    const { data: newContact, error: insertErr } = await supabase
      .from('contacts')
      .insert(insertPayload)
      .select()
      .single();

    if (insertErr) {
      console.error('[API /api/contacts POST Error]:', insertErr);
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    // حفظ في جدول contact_phones أيضاً للتوافق المعماري
    if (normalizedPhone && newContact) {
      try {
        await supabase
          .from('contact_phones')
          .insert({
            contact_id: newContact.id,
            phone_e164: normalizedPhone,
            is_primary: true,
            wa_status: source.startsWith('evolution') ? 'yes' : 'unknown',
          });
      } catch {
        // ignore duplicate phone error
      }
    }

    return NextResponse.json({ contact: newContact, is_merged: false }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * DELETE /api/contacts?all=true
 * مسح شامل لكافة جهات الاتصال المسجلة لإعادة ضبط الدليل والاستيراد المنظم لكل خط
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const deleteAll = searchParams.get('all') === 'true';

    if (!deleteAll) {
      return NextResponse.json({ error: 'مطلوب تأكيد الحذف الشامل all=true' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // 1. مسح جدول هواتف جهات الاتصال أولاً منعاً لتعارض المفاتيح الخارجية
    try {
      await supabase.from('contact_phones').delete().not('id', 'is', null);
    } catch (e) {
      console.warn('contact_phones cleanup notice:', e);
    }

    // 2. مسح كافة جهات الاتصال
    const { error, count } = await supabase
      .from('contacts')
      .delete({ count: 'exact' })
      .not('id', 'is', null);

    if (error) {
      console.error('[API /api/contacts DELETE Error]:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'تم مسح كافة جهات الاتصال بنجاح',
      deleted_count: count || 0,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
