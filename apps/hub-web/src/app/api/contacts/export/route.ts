import { NextRequest, NextResponse } from 'next/server';
import { q } from '../../../../lib/pg';

import { requirePermission } from '../../../../lib/serverAuth';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 120;

/**
 * GET /api/contacts/export
 * تصدير جهات الاتصال بالكامل (مع دعم التصفية) كـ CSV أو JSON
 *
 * Query params:
 *   format    = csv | json (default: csv)
 *   entity_type, source, country_code, city, role, q (نفس route.ts الرئيسي)
 *   limit     = عدد السجلات (default: 10000)
 */
export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, 'contacts.export');
  if (auth instanceof NextResponse) return auth;
  try {
    const { searchParams } = new URL(req.url);
    const format = (searchParams.get('format') || 'csv').toLowerCase();
    const search = searchParams.get('q') || '';
    const entityType = searchParams.get('entity_type');
    const role = searchParams.get('commercial_role');
    const source = searchParams.get('source');
    const line = searchParams.get('line');
    const origin = searchParams.get('origin');
    const showLids = searchParams.get('show_lids') === 'true';
    const tagFilter = searchParams.get('tag') || '';
    const countryCode = searchParams.get('country_code');
    const city = searchParams.get('city');
    const isFavorite = searchParams.get('favorite');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10000', 10), 50000);

    const where: string[] = ['1=1'];
    const params: any[] = [];

    // استبعاد المشفرين تلقائياً إلا إذا تم تفعيل خيار إظهارهم
    if (!showLids && origin !== 'group_member' && entityType !== 'lid') {
      where.push(`NOT (c.primary_phone_e164 IS NULL AND c.wa_jid LIKE '%@lid')`);
    }

    // تصفية الخط
    if (line && line !== 'all') {
      if (line === 'Master') {
        where.push(`(c.source_detail ilike '%Master%' or c.source_detail like '%الرئيسي%')`);
      } else if (line === 'Sells_2') {
        where.push(`(c.source_detail ilike '%Sells_2%' or c.source_detail like '%المبيعات 2%')`);
      } else if (line === 'Sells_1') {
        where.push(`(c.source_detail ilike '%Sells_1%' or c.source_detail like '%المبيعات 1%')`);
      } else if (line === 'shared') {
        where.push(`(c.source_detail like '%•%' or (c.source_detail ilike '%Master%' and c.source_detail ilike '%Sells%') or (c.source_detail like '%الرئيسي%' and c.source_detail like '%المبيعات%'))`);
      }
    }

    // تصفية أصل جهة الاتصال
    if (origin && origin !== 'all') {
      if (origin === 'saved_phone') {
        where.push(`(c.primary_phone_e164 is not null and c.entity_type = 'individual')`);
      } else if (origin === 'group_member') {
        where.push(`((c.primary_phone_e164 is null or c.wa_jid like '%@lid') and c.entity_type = 'individual')`);
      } else if (origin === 'groups') {
        where.push(`(c.entity_type = 'group' and c.wa_jid like '%@g.us')`);
      } else if (origin === 'newsletters') {
        where.push(`(c.entity_type = 'group' and (c.wa_jid like '%@newsletter%' or c.wa_jid like '%@broadcast%'))`);
      }
    }

    if (tagFilter.trim() && tagFilter !== 'all') {
      params.push(tagFilter.trim());
      const pIdx = params.length;
      where.push(`(
        exists (
          select 1 from hub.contact_tags ct
          join hub.hub_tags t on t.id = ct.tag_id
          where ct.contact_id = c.id and (t.name_ar = $${pIdx} or t.key = $${pIdx} or t.id::text = $${pIdx})
        )
        or ($${pIdx} = any(c.tags))
      )`);
    }

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
      if (role === 'b2c') {
        where.push(`(
          (c.display_name ilike '%عميل%' or c.display_name ilike '%زبون%' or c.display_name ilike '%عميلة%')
          or (c.commercial_role = 'b2c' and c.primary_phone_e164 is not null and not (c.display_name like 'حساب مشفر%'))
        )`);
      } else {
        params.push(role);
        where.push(`c.commercial_role = $${params.length}`);
      }
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

    if (search.trim()) {
      const s = `%${search.trim()}%`;
      params.push(s);
      const pIdx = params.length;
      where.push(`(
        c.display_name ilike $${pIdx} or
        c.full_name ilike $${pIdx} or
        c.company ilike $${pIdx} or
        c.primary_phone_e164 ilike $${pIdx} or
        c.primary_phone ilike $${pIdx} or
        c.wa_jid ilike $${pIdx}
      )`);
    }

    params.push(limit);
    const contacts = await q(
      `select
         c.id, c.display_name, c.full_name, c.company, c.facility_name,
         c.entity_type, c.commercial_role, c.source, c.source_detail,
         c.primary_phone, c.primary_phone_e164, c.wa_jid,
         c.email, c.country_code, c.city, c.district, c.notes,
         c.is_favorite, c.created_at, c.last_activity_at
       from hub.contacts c
       where ${where.join(' and ')}
       order by 
         case when c.primary_phone_e164 is not null then 0 else 1 end asc,
         c.last_activity_at desc nulls last,
         c.created_at desc
       limit $${params.length}`,
      params
    );

    if (format === 'json') {
      return NextResponse.json({ contacts, total: contacts.length });
    }

    // CSV export مع BOM للعربية
    const BOM = '\uFEFF';
    const headers = [
      'الاسم', 'الاسم الكامل', 'الشركة', 'المنشأة', 'نوع الكيان',
      'الدور التجاري', 'المصدر', 'تفاصيل المصدر',
      'رقم الهاتف', 'رقم E.164', 'معرف واتساب',
      'البريد الإلكتروني', 'الدولة', 'المدينة', 'الحي',
      'ملاحظات', 'مفضلة', 'تاريخ الإنشاء', 'آخر نشاط',
    ];

    const escCsv = (v: any): string => {
      const s = v == null ? '' : String(v);
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const rows = contacts.map((c: any) => [
      c.display_name,
      c.full_name || '',
      c.company || '',
      c.facility_name || '',
      c.entity_type || '',
      c.commercial_role || '',
      c.source || '',
      c.source_detail || '',
      c.primary_phone || '',
      c.primary_phone_e164 || '',
      c.wa_jid || '',
      c.email || '',
      c.country_code || '',
      c.city || '',
      c.district || '',
      c.notes || '',
      c.is_favorite ? 'نعم' : 'لا',
      c.created_at ? new Date(c.created_at).toLocaleDateString('ar-SA') : '',
      c.last_activity_at ? new Date(c.last_activity_at).toLocaleDateString('ar-SA') : '',
    ].map(escCsv).join(','));

    const csvContent = BOM + [headers.join(','), ...rows].join('\n');
    const fileName = `contacts_export_${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err: any) {
    console.error('[contacts/export]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
