import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase';

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

/**
 * POST /api/contacts/merge
 * معالجة ودمج شامل لكافة جهات الاتصال المكررة أو المشتركة عبر خطوط مختلفة
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();

    // 1. جلب كافة جهات الاتصال في قاعدة البيانات
    const allContacts: any[] = [];
    let offset = 0;
    const batchSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .range(offset, offset + batchSize - 1);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      if (data && data.length > 0) {
        allContacts.push(...data);
        offset += data.length;
        if (data.length < batchSize) hasMore = false;
      } else {
        hasMore = false;
      }
    }

    if (allContacts.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'لا توجد جهات اتصال مسجلة للمعالجة',
        total_processed: 0,
        duplicate_groups: 0,
        merged_count: 0,
      });
    }

    // 2. تجميع جهات الاتصال حسب رقم الهاتف المعياري E.164
    const phoneMap = new Map<string, any[]>();

    for (const c of allContacts) {
      let rawPhone = c.primary_phone || '';
      if (!rawPhone && c.display_name && /^[0-9+ \-]+$/.test(c.display_name.trim())) {
        rawPhone = c.display_name.trim();
      }

      const phone = rawPhone ? normalizePhone(rawPhone) : null;
      if (!phone) continue;

      const group = phoneMap.get(phone) || [];
      group.push(c);
      phoneMap.set(phone, group);
    }

    let duplicateGroupsCount = 0;
    let totalMergedAndDeleted = 0;
    const idsToDelete: string[] = [];

    // 3. معالجة ودمج كل مجموعة مكررة
    const entries: [string, any[]][] = Array.from(phoneMap.entries());
    for (const [phone, group] of entries) {
      if (group.length <= 1) continue;

      duplicateGroupsCount++;

      // اختيار السجل الأساسي (Keeper) بناءً على اكتمال البيانات والأقدمية
      group.sort((a: any, b: any) => {
        const aScore = (a.display_name && !a.display_name.includes(phone) ? 10 : 0) +
                       (a.company ? 5 : 0) +
                       (a.email ? 3 : 0) +
                       (a.notes ? 2 : 0) +
                       (a.facility_name ? 4 : 0);
        const bScore = (b.display_name && !b.display_name.includes(phone) ? 10 : 0) +
                       (b.company ? 5 : 0) +
                       (b.email ? 3 : 0) +
                       (b.notes ? 2 : 0) +
                       (b.facility_name ? 4 : 0);
        if (bScore !== aScore) return bScore - aScore;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });

      const keeper = group[0];
      const duplicates: any[] = group.slice(1);

      // دمج المصادر والخطوط
      const allSourceDetails = Array.from(
        new Set(
          [keeper.source_detail, ...duplicates.map((d: any) => d.source_detail)]
            .filter(Boolean)
            .flatMap((s: any) => String(s).split(',').map((x: string) => x.trim()))
        )
      ).filter(Boolean);

      // دمج الوسوم
      const allTags = Array.from(
        new Set([...(keeper.tags || []), ...duplicates.flatMap((d: any) => d.tags || [])])
      ).filter(Boolean);

      // دمج الملاحظات
      const combinedNotes = [
        keeper.notes,
        ...duplicates.map((d: any) => d.notes).filter(Boolean),
      ]
        .filter(Boolean)
        .join(' | ');

      // اختيار أفضل الحقول
      const updatedCompany = keeper.company || duplicates.find((d: any) => d.company)?.company || null;
      const updatedEmail = keeper.email || duplicates.find((d: any) => d.email)?.email || null;
      const updatedFacility = keeper.facility_name || duplicates.find((d: any) => d.facility_name)?.facility_name || null;
      const updatedCity = keeper.city || duplicates.find((d: any) => d.city)?.city || null;
      const updatedDistrict = keeper.district || duplicates.find((d: any) => d.district)?.district || null;

      // تحديث السجل الأساسي
      await supabase
        .from('contacts')
        .update({
          primary_phone: phone,
          company: updatedCompany,
          email: updatedEmail,
          facility_name: updatedFacility,
          city: updatedCity,
          district: updatedDistrict,
          source_detail: allSourceDetails.join(', ') || keeper.source_detail,
          tags: allTags,
          notes: combinedNotes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', keeper.id);

      // جمع معرفات السجلات المكررة للحذف
      for (const dup of duplicates) {
        idsToDelete.push(dup.id);
      }
    }

    // 4. حذف السجلات المكررة دفعة واحدة
    if (idsToDelete.length > 0) {
      // حذف هواتف السجلات المكررة أولاً
      try {
        await supabase.from('contact_phones').delete().in('contact_id', idsToDelete);
      } catch (err) {
        console.warn('contact_phones delete in merge warning:', err);
      }

      // حذف السجلات المكررة من جدول contacts على دفعات
      const chunkSize = 200;
      for (let i = 0; i < idsToDelete.length; i += chunkSize) {
        const chunk = idsToDelete.slice(i, i + chunkSize);
        const { error: delErr } = await supabase.from('contacts').delete().in('id', chunk);
        if (delErr) {
          console.error('Error deleting duplicate contacts batch:', delErr);
        } else {
          totalMergedAndDeleted += chunk.length;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `تمت معالجة ودمج جهات الاتصال بنجاح. تم العثور على ${duplicateGroupsCount} مجموعة مكررة ودمج وحذف ${totalMergedAndDeleted} سجلاً مكرراً.`,
      total_processed: allContacts.length,
      duplicate_groups: duplicateGroupsCount,
      merged_count: totalMergedAndDeleted,
    });
  } catch (err: any) {
    console.error('[API /api/contacts/merge Error]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
