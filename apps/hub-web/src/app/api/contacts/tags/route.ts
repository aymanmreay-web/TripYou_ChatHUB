import { NextResponse } from 'next/server';
import { q } from '../../../../lib/pg';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/contacts/tags
 * إرجاع قائمة الوسوم المتاحة لجهات الاتصال مع إحصاءات الاستخدام
 */
export async function GET() {
  try {
    // وسوم قاعدة البيانات (scope: contact | both | all) مع عداد الاستخدام
    const tags = await q<{
      id: string;
      key: string;
      name_ar: string;
      color: string;
      kind: string;
      scope: string;
      usage_count: number;
    }>(`
      SELECT
        t.id,
        t.key,
        t.name_ar,
        t.color,
        t.kind,
        t.scope,
        COUNT(DISTINCT ct.contact_id)::int AS usage_count
      FROM hub.hub_tags t
      LEFT JOIN hub.contact_tags ct ON ct.tag_id = t.id
      WHERE t.kind != 'whatsapp'
        AND (t.scope IN ('contact', 'both', 'all') OR t.scope IS NULL)
      GROUP BY t.id, t.key, t.name_ar, t.color, t.kind, t.scope
      ORDER BY t.sort_order ASC NULLS LAST, t.name_ar ASC
    `);

    // استخراج الوسوم النصية الفريدة من العمود القديم hub.contacts.tags (للتوافق العكسي)
    let custom_tags: string[] = [];
    try {
      const distinctTags = await q<{ tag: string }>(`
        SELECT DISTINCT unnest(tags) as tag
        FROM hub.contacts
        WHERE tags IS NOT NULL AND cardinality(tags) > 0
        LIMIT 100
      `);
      custom_tags = distinctTags.map((r) => r.tag).filter(Boolean);
    } catch {
      // العمود tags قد لا يكون موجوداً — صامت
    }

    return NextResponse.json({
      tags: tags || [],
      custom_tags,
    });
  } catch (err: any) {
    console.error('[contacts/tags]', err.message);
    return NextResponse.json({ tags: [], custom_tags: [] });
  }
}
