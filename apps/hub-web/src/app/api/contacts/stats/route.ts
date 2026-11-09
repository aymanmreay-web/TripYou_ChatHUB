import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * GET /api/contacts/stats
 * إحصائيات شاملة ثلاثية الأبعاد لجهات الاتصال للمدير
 */
export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    // جلب كامل السجلات (حتى مع حد PostgREST البالغ 1000 صف لكل استعلام)
    const [batch1, batch2] = await Promise.all([
      supabase.from('contacts').select('id, entity_type, commercial_role, source, source_detail, city, created_at').range(0, 999),
      supabase.from('contacts').select('id, entity_type, commercial_role, source, source_detail, city, created_at').range(1000, 2999)
    ]);

    if (batch1.error) {
      return NextResponse.json({ error: batch1.error.message }, { status: 500 });
    }

    const list = [...(batch1.data || []), ...(batch2.data || [])];
    const total = list.length;

    // توزيع الكيان (Entity Type)
    const byEntityType = {
      individual: list.filter((c) => c.entity_type === 'individual').length,
      organization: list.filter((c) => c.entity_type === 'organization').length,
      group: list.filter((c) => c.entity_type === 'group').length,
    };

    // توزيع الدور التجاري (Commercial Role)
    const byRole = {
      b2c: list.filter((c) => c.commercial_role === 'b2c').length,
      b2b: list.filter((c) => c.commercial_role === 'b2b').length,
      vendor: list.filter((c) => c.commercial_role === 'vendor').length,
      partner: list.filter((c) => c.commercial_role === 'partner').length,
      staff: list.filter((c) => c.commercial_role === 'staff').length,
    };

    // توزيع المصدر (Source Provenance)
    const bySource = {
      evolution: list.filter((c) => c.source === 'evolution').length,
      excel_import: list.filter((c) => c.source === 'excel_import').length,
      contacts_file: list.filter((c) => c.source === 'contacts_file').length,
      system: list.filter((c) => c.source === 'system').length,
      manual: list.filter((c) => c.source === 'manual').length,
    };

    // تفصيل مصادر خطوط Evolution (من أي خط جاءت جهة الاتصال)
    const evolutionLinesBreakdown: Record<string, number> = {};
    list.filter((c) => c.source === 'evolution' && c.source_detail).forEach((c) => {
      const lineName = c.source_detail!.replace('evolution:', '');
      evolutionLinesBreakdown[lineName] = (evolutionLinesBreakdown[lineName] || 0) + 1;
    });

    return NextResponse.json({
      total,
      by_entity_type: byEntityType,
      by_role: byRole,
      by_source: bySource,
      evolution_lines: evolutionLinesBreakdown,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

