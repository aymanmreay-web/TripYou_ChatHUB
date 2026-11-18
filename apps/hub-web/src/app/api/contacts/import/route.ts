import { NextRequest, NextResponse } from 'next/server';
import { q } from '../../../../lib/pg';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 300;

function normalizePhoneE164(phone: string): string {
  if (!phone) return '';
  let cleaned = String(phone).replace(/[^0-9]/g, '');
  if (!cleaned) return '';
  if (cleaned.startsWith('00')) cleaned = cleaned.substring(2);
  if (cleaned.startsWith('05') && cleaned.length === 10) cleaned = '966' + cleaned.substring(1);
  else if (cleaned.startsWith('5') && cleaned.length === 9) cleaned = '966' + cleaned;
  return '+' + cleaned;
}

function detectCountry(phone: string | null | undefined): string {
  if (!phone) return 'XX';
  const p = phone.startsWith('+') ? phone : '+' + phone;
  if (p.startsWith('+966')) return 'SA';
  if (p.startsWith('+971')) return 'AE';
  if (p.startsWith('+965')) return 'KW';
  if (p.startsWith('+974')) return 'QA';
  if (p.startsWith('+968')) return 'OM';
  if (p.startsWith('+973')) return 'BH';
  if (p.startsWith('+20'))  return 'EG';
  if (p.startsWith('+962')) return 'JO';
  if (p.startsWith('+964')) return 'IQ';
  if (p.startsWith('+967')) return 'YE';
  if (p.startsWith('+963')) return 'SY';
  if (p.startsWith('+961')) return 'LB';
  if (p.startsWith('+212')) return 'MA';
  if (p.startsWith('+213')) return 'DZ';
  if (p.startsWith('+216')) return 'TN';
  if (p.startsWith('+249')) return 'SD';
  if (p.startsWith('+90'))  return 'TR';
  if (p.startsWith('+1'))   return 'US';
  if (p.startsWith('+44'))  return 'GB';
  return 'INTL';
}

/**
 * محلل نصوص ملفات vCard (.vcf)
 */
function parseVCF(text: string): { name: string; phone: string; email?: string; company?: string; notes?: string }[] {
  const contacts: { name: string; phone: string; email?: string; company?: string; notes?: string }[] = [];
  const cards = text.split(/END:VCARD/i);

  for (const card of cards) {
    if (!card.includes('BEGIN:VCARD')) continue;
    let name = '';
    let phone = '';
    let email = '';
    let company = '';
    let notes = '';

    const lines = card.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (/^FN[;: ]/i.test(trimmed)) {
        name = trimmed.replace(/^FN[;: ]/i, '').replace(/^[;: ]+/, '').trim();
      } else if (!name && /^N[;: ]/i.test(trimmed)) {
        const parts = trimmed.replace(/^N[;: ]/i, '').split(';').map(p => p.trim()).filter(Boolean);
        name = parts.reverse().join(' ');
      } else if (/^TEL[;: ]/i.test(trimmed)) {
        const raw = trimmed.replace(/^TEL[^:]*:/i, '').trim();
        if (!phone) phone = raw;
      } else if (/^EMAIL[;: ]/i.test(trimmed)) {
        email = trimmed.replace(/^EMAIL[^:]*:/i, '').trim();
      } else if (/^ORG[;: ]/i.test(trimmed)) {
        company = trimmed.replace(/^ORG[^:]*:/i, '').replace(/;/g, ' ').trim();
      } else if (/^NOTE[;: ]/i.test(trimmed)) {
        notes = trimmed.replace(/^NOTE[^:]*:/i, '').trim();
      }
    }

    if (name || phone) {
      contacts.push({ name: name || phone, phone, email, company, notes });
    }
  }

  return contacts;
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    let contactsToImport: {
      name: string;
      phone: string;
      company?: string;
      city?: string;
      email?: string;
      notes?: string;
      country?: string;
    }[] = [];

    let source = 'excel_import';
    let sourceDetail = 'استيراد ملف';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      source = (formData.get('source') as string) || 'excel_import';
      sourceDetail = (formData.get('source_detail') as string) || (file ? file.name : 'ملف مستورد');

      if (!file) {
        return NextResponse.json({ error: 'لم يتم إرسال أي ملف' }, { status: 400 });
      }

      const fileName = file.name.toLowerCase();
      const bytes = await file.arrayBuffer();

      if (fileName.endsWith('.vcf')) {
        const text = new TextDecoder('utf-8').decode(bytes);
        const parsed = parseVCF(text);
        contactsToImport = parsed.map(c => ({
          name: c.name,
          phone: c.phone,
          company: c.company,
          email: c.email,
          notes: c.notes,
        }));
      } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv')) {
        const workbook = XLSX.read(bytes, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheetName];
        const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        for (const row of rows) {
          // محاولة استنتاج حقول الاسم والهاتف والشركة
          const keys = Object.keys(row);
          let name = '';
          let phone = '';
          let company = '';
          let city = '';
          let email = '';
          let notes = '';

          for (const k of keys) {
            const val = String(row[k]).trim();
            if (!val) continue;
            const lk = k.toLowerCase();

            if (!name && (lk.includes('name') || lk.includes('اسم') || lk.includes('العميل') || lk.includes('الجهة'))) {
              name = val;
            } else if (!phone && (lk.includes('phone') || lk.includes('mobile') || lk.includes('جوال') || lk.includes('هاتف') || lk.includes('رقم') || lk.includes('tel'))) {
              phone = val;
            } else if (!company && (lk.includes('company') || lk.includes('شركة') || lk.includes('منشأة') || lk.includes('مؤسسة') || lk.includes('فندق'))) {
              company = val;
            } else if (!city && (lk.includes('city') || lk.includes('مدينة') || lk.includes('منطقة'))) {
              city = val;
            } else if (!email && (lk.includes('email') || lk.includes('بريد') || lk.includes('mail'))) {
              email = val;
            } else if (!notes && (lk.includes('note') || lk.includes('ملاحظ') || lk.includes('وصف'))) {
              notes = val;
            }
          }

          // إذا لم نجد أعمدة مطابقة، نأخذ أول عمود كالاسم وثاني عمود كهاتف
          if (!phone && keys.length >= 2) {
            name = name || String(row[keys[0]]).trim();
            phone = String(row[keys[1]]).trim();
          }

          if (name || phone) {
            contactsToImport.push({ name: name || phone, phone, company, city, email, notes });
          }
        }
      } else {
        return NextResponse.json({ error: 'صيغة الملف غير مدعومة. يرجى اختيار ملف .xlsx أو .csv أو .vcf' }, { status: 400 });
      }
    } else {
      // JSON body (نسخ ولصق قديم)
      const body = await req.json();
      const rawContacts = body.contacts || [];
      source = body.source || 'excel_import';
      sourceDetail = body.source_detail || 'استيراد مجمع';

      for (const item of rawContacts) {
        const rawPhone = item.phone || item.primary_phone || item.mobile || '';
        const name = item.name || item.display_name || item.title || rawPhone;
        if (name || rawPhone) {
          contactsToImport.push({
            name,
            phone: rawPhone,
            company: item.company,
            city: item.city,
            email: item.email,
            notes: item.notes,
          });
        }
      }
    }

    if (contactsToImport.length === 0) {
      return NextResponse.json({ error: 'لم يتم العثور على أي بيانات صالحة للاستيراد في الملف' }, { status: 400 });
    }

    let importedCount = 0;
    let mergedCount = 0;
    let failedCount = 0;

    for (const item of contactsToImport) {
      try {
        const normalizedPhone = item.phone ? normalizePhoneE164(item.phone) : null;
        const displayName = item.name || normalizedPhone || 'جهة اتصال مستوردة';
        const country = item.country || (normalizedPhone ? detectCountry(normalizedPhone) : 'SA');

        if (normalizedPhone) {
          // فحص التكرار برقم الهاتف في hub.contacts
          const existing = await q<{ id: string; display_name: string }>(
            `select id, display_name from hub.contacts where primary_phone_e164 = $1 limit 1`,
            [normalizedPhone]
          );

          if (existing.length > 0) {
            await q(
              `update hub.contacts set
                 display_name = coalesce(nullif($2, ''), display_name),
                 company = coalesce(nullif($3, ''), company),
                 city = coalesce(nullif($4, ''), city),
                 notes = coalesce(nullif($5, ''), notes),
                 source_detail = coalesce(source_detail || ' • ' || $6, source_detail),
                 country_code = coalesce(nullif($7, 'XX'), country_code),
                 updated_at = now()
               where id = $1`,
              [existing[0].id, displayName, item.company || null, item.city || null, item.notes || null, sourceDetail, country]
            );
            mergedCount++;
            continue;
          }
        }

        // إنشاء جهة اتصال جديدة
        const ins = await q<{ id: string }>(
          `insert into hub.contacts
             (display_name, full_name, company, entity_type, commercial_role, source, source_detail,
              primary_phone, primary_phone_e164, email, country_code, city, notes, kind,
              created_at, updated_at, last_activity_at)
           values ($1, $1, $2, 'individual', 'b2c', $3, $4, $5, $5, $6, $7, $8, $9, 'individual', now(), now(), now())
           returning id`,
          [
            displayName,
            item.company || null,
            source,
            sourceDetail,
            normalizedPhone || null,
            item.email || null,
            country,
            item.city || null,
            item.notes || null,
          ]
        );

        if (ins.length > 0) {
          importedCount++;
          if (normalizedPhone) {
            await q(
              `insert into hub.contact_phones (contact_id, phone_e164, is_primary, wa_status)
               values ($1, $2, true, 'unknown')
               on conflict do nothing`,
              [ins[0].id, normalizedPhone]
            ).catch(() => {});
          }
        } else {
          failedCount++;
        }
      } catch (rowErr) {
        failedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      total_processed: contactsToImport.length,
      imported_count: importedCount,
      merged_count: mergedCount,
      failed_count: failedCount,
    });
  } catch (err: any) {
    console.error('[API /api/contacts/import Error]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
