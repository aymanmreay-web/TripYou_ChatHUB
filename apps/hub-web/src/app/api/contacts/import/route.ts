import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase';

function normalizePhoneE164(phone: string): string {
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
 * POST /api/contacts/import
 * استيراد جماعي لجهات الاتصال مع تتبع دقيق للمصدر
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      contacts = [],
      source = 'excel_import', // 'excel_import' | 'contacts_file' | 'evolution'
      source_detail = 'استيراد جماعي',
      default_entity_type = 'individual',
      default_commercial_role = 'b2c',
    } = body;

    if (!Array.isArray(contacts) || contacts.length === 0) {
      return NextResponse.json({ error: 'مصفوفة جهات الاتصال فارغة' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    let importedCount = 0;
    let mergedCount = 0;
    let failedCount = 0;

    for (const item of contacts) {
      try {
        const rawPhone = item.phone || item.primary_phone || item.mobile || '';
        const phone = rawPhone ? normalizePhoneE164(String(rawPhone)) : null;
        const displayName = item.name || item.display_name || item.title || phone || 'جهة اتصال مستوردة';

        if (phone) {
          // فحص التكرار
          const { data: existing } = await supabase
            .schema('hub')
            .from('contacts')
            .select('id')
            .eq('primary_phone', phone)
            .maybeSingle();

          if (existing) {
            await supabase
              .schema('hub')
              .from('contacts')
              .update({
                display_name: displayName,
                company: item.company || undefined,
                city: item.city || undefined,
                district: item.district || undefined,
                facility_name: item.facility_name || undefined,
                source_detail: `${source_detail} (تحديث)`,
                updated_at: new Date().toISOString(),
              })
              .eq('id', existing.id);
            mergedCount++;
            continue;
          }
        }

        const insertPayload = {
          display_name: displayName,
          company: item.company || null,
          entity_type: item.entity_type || default_entity_type,
          commercial_role: item.commercial_role || default_commercial_role,
          source,
          source_detail,
          primary_phone: phone,
          email: item.email || null,
          country_code: item.country_code || 'SA',
          city: item.city || null,
          district: item.district || null,
          facility_name: item.facility_name || null,
          notes: item.notes || null,
          tags: Array.isArray(item.tags) ? item.tags : [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_activity_at: new Date().toISOString(),
        };

        const { data: created, error } = await supabase
          .schema('hub')
          .from('contacts')
          .insert(insertPayload)
          .select('id')
          .single();

        if (error) {
          failedCount++;
        } else {
          importedCount++;
          if (phone && created) {
            try {
              await supabase
                .schema('hub')
                .from('contact_phones')
                .insert({
                  contact_id: created.id,
                  phone_e164: phone,
                  is_primary: true,
                  wa_status: source.startsWith('evolution') ? 'yes' : 'unknown',
                });
            } catch {
              // ignore duplicate phone error
            }
          }
        }
      } catch {
        failedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      total_processed: contacts.length,
      imported_count: importedCount,
      merged_count: mergedCount,
      failed_count: failedCount,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
