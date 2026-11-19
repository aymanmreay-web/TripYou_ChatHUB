import { NextRequest, NextResponse } from 'next/server';
import { q } from '../../../../lib/pg';
import * as XLSX from 'xlsx';

import { requirePermission } from '../../../../lib/serverAuth';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 300;

// ── تطبيع رقم الهاتف إلى E.164 ──────────────────────────────────────────────
function normalizePhoneE164(phone: string): string {
  if (!phone) return '';
  const raw = String(phone).trim();

  // أرقام Excel العلمية مثل 5.0554e+12
  const sci = /^[0-9.]+e[+\-]?[0-9]+$/i.test(raw);
  let cleaned = sci
    ? String(Math.round(parseFloat(raw))).replace(/\D/g, '')
    : raw.replace(/[^0-9]/g, '');

  if (!cleaned || cleaned.length < 7) return '';
  if (cleaned.startsWith('00')) cleaned = cleaned.substring(2);

  // القواعد السعودية المحلية
  if (cleaned.startsWith('05') && cleaned.length === 10) cleaned = '966' + cleaned.substring(1);
  else if (cleaned.startsWith('5') && cleaned.length === 9) cleaned = '966' + cleaned;

  // لا نطبّق قواعد سعودية على أرقام دولية أخرى
  if (cleaned.length < 7 || cleaned.length > 15) return '';
  return '+' + cleaned;
}

// ── كشف الدولة ──────────────────────────────────────────────────────────────
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
  if (p.startsWith('+44'))  return 'GB';
  if (p.startsWith('+1'))   return 'US';
  return 'INTL';
}

// ── تحليل VCF (vCard) مع معالجة line folding والترميز ────────────────────────
function parseVCF(text: string): {
  name: string; phone: string; email?: string; company?: string; notes?: string;
}[] {
  const contacts: { name: string; phone: string; email?: string; company?: string; notes?: string }[] = [];

  // فك line folding (السطر يبدأ بمسافة أو TAB)
  const unfolded = text.replace(/\r?\n[ \t]/g, '');
  const cards = unfolded.split(/END:VCARD/i);

  for (const card of cards) {
    if (!card.toUpperCase().includes('BEGIN:VCARD')) continue;
    let name = '';
    let phone = '';
    let email = '';
    let company = '';
    let notes = '';

    const lines = card.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // FN (Full Name) — أعلى أولوية
      if (/^FN[:;]/i.test(trimmed)) {
        const v = trimmed.replace(/^FN[^:]*:/i, '').trim();
        // فك QUOTED-PRINTABLE إن وجد
        if (/ENCODING=QUOTED-PRINTABLE/i.test(trimmed)) {
          name = decodeQP(v);
        } else {
          name = v;
        }
      }
      // N (Name parts) — احتياطي
      else if (!name && /^N[:;]/i.test(trimmed)) {
        const v = trimmed.replace(/^N[^:]*:/i, '');
        const parts = v.split(';').map((p) => p.trim()).filter(Boolean);
        // ترتيب vCard: Last;First;Middle;Prefix;Suffix
        const ordered = [parts[1], parts[0], parts[2]].filter(Boolean);
        name = ordered.join(' ');
      }
      // TEL — أول رقم هاتف
      else if (!phone && /^TEL[:;]/i.test(trimmed)) {
        phone = trimmed.replace(/^TEL[^:]*:/i, '').replace(/[^0-9+]/g, '').trim();
      }
      // EMAIL
      else if (!email && /^EMAIL[:;]/i.test(trimmed)) {
        email = trimmed.replace(/^EMAIL[^:]*:/i, '').trim();
      }
      // ORG
      else if (!company && /^ORG[:;]/i.test(trimmed)) {
        company = trimmed.replace(/^ORG[^:]*:/i, '').replace(/;/g, ' ').trim();
      }
      // NOTE
      else if (!notes && /^NOTE[:;]/i.test(trimmed)) {
        notes = trimmed.replace(/^NOTE[^:]*:/i, '').trim();
      }
    }

    if (name || phone) {
      contacts.push({ name: name || phone, phone, email, company, notes });
    }
  }
  return contacts;
}

// فك ترميز Quoted-Printable
function decodeQP(str: string): string {
  try {
    return str
      .replace(/=([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
      .replace(/=\r?\n/g, '');
  } catch {
    return str;
  }
}

// ── تحليل Excel / CSV مع كشف أعمدة ذكي ─────────────────────────────────────
function parseSpreadsheet(bytes: ArrayBuffer): {
  name: string; phone: string; email?: string; company?: string; city?: string; notes?: string;
}[] {
  const workbook = XLSX.read(bytes, { type: 'array', cellText: true, cellDates: true });
  const firstSheet = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheet];

  // نحوّل إلى JSON بـ defval='' و header للحصول على headers
  const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
  if (rows.length === 0) return [];

  const result: { name: string; phone: string; email?: string; company?: string; city?: string; notes?: string }[] = [];

  // patterns للكشف عن الأعمدة
  const matchCol = (key: string, patterns: string[]): boolean => {
    const lk = key.toLowerCase().trim();
    return patterns.some((p) => lk.includes(p));
  };

  for (const row of rows) {
    const keys = Object.keys(row);
    let name = '';
    let phone = '';
    let email = '';
    let company = '';
    let city = '';
    let notes = '';
    const usedKeys = new Set<string>();

    // 1. بحث ذكي عبر أسماء الأعمدة
    for (const k of keys) {
      const val = String(row[k] ?? '').trim();
      if (!val || usedKeys.has(k)) continue;

      if (!name && matchCol(k, ['name', 'اسم', 'عميل', 'الجهة', 'full_name', 'fullname', 'display'])) {
        name = val; usedKeys.add(k);
      } else if (!phone && matchCol(k, ['phone', 'mobile', 'جوال', 'هاتف', 'رقم', 'tel', 'whatsapp', 'واتس', 'موبايل', 'cell'])) {
        phone = val; usedKeys.add(k);
      } else if (!company && matchCol(k, ['company', 'شركة', 'منشأة', 'مؤسسة', 'فندق', 'org', 'organization'])) {
        company = val; usedKeys.add(k);
      } else if (!city && matchCol(k, ['city', 'مدينة', 'منطقة', 'المدينة', 'location'])) {
        city = val; usedKeys.add(k);
      } else if (!email && matchCol(k, ['email', 'بريد', 'ايميل', 'mail', 'e-mail'])) {
        email = val; usedKeys.add(k);
      } else if (!notes && matchCol(k, ['note', 'ملاحظ', 'وصف', 'تفاصيل', 'comment', 'remark'])) {
        notes = val; usedKeys.add(k);
      }
    }

    // 2. fallback: أول عمود = اسم، ثاني = هاتف
    if (!phone && !name) {
      const remaining = keys.filter((k) => !usedKeys.has(k));
      if (remaining.length >= 2) {
        name = String(row[remaining[0]] ?? '').trim();
        phone = String(row[remaining[1]] ?? '').trim();
      } else if (remaining.length === 1) {
        const v = String(row[remaining[0]] ?? '').trim();
        if (/^[0-9+\s\-()]{7,}$/.test(v)) phone = v;
        else name = v;
      }
    } else if (!phone && keys.length > 0) {
      // جرب أول عمود غير مستخدم قد يكون هاتفاً
      for (const k of keys) {
        if (usedKeys.has(k)) continue;
        const v = String(row[k] ?? '').trim();
        if (/^[0-9e+\-. ]{5,}$/i.test(v) || /^\+?[0-9]{7,}$/.test(v.replace(/[\s\-()]/g, ''))) {
          phone = v; usedKeys.add(k); break;
        }
      }
    }

    if (name || phone) {
      result.push({ name: name || phone, phone, email, company, city, notes });
    }
  }
  return result;
}

// ── Handler الرئيسي POST ─────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, 'contacts.import');
  if (auth instanceof NextResponse) return auth;
  try {
    const contentType = req.headers.get('content-type') || '';
    let contactsToImport: {
      name: string;
      phone: string;
      company?: string;
      city?: string;
      email?: string;
      notes?: string;
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
        // محاولة ترميزات مختلفة
        let text = '';
        try { text = new TextDecoder('utf-8').decode(bytes); } catch { text = new TextDecoder('windows-1256').decode(bytes); }
        const parsed = parseVCF(text);
        contactsToImport = parsed.map((c) => ({
          name: c.name,
          phone: c.phone,
          company: c.company,
          email: c.email,
          notes: c.notes,
        }));
      } else if (
        fileName.endsWith('.xlsx') ||
        fileName.endsWith('.xls') ||
        fileName.endsWith('.csv')
      ) {
        contactsToImport = parseSpreadsheet(bytes);
      } else {
        return NextResponse.json(
          { error: 'صيغة الملف غير مدعومة. يرجى اختيار .xlsx أو .csv أو .vcf' },
          { status: 400 }
        );
      }
    } else {
      // JSON body (استيراد برمجي)
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
      return NextResponse.json(
        { error: 'لم يتم العثور على بيانات صالحة في الملف — تأكد من وجود أعمدة الاسم والهاتف' },
        { status: 400 }
      );
    }

    let importedCount = 0;
    let mergedCount = 0;
    let failedCount = 0;

    // معالجة على دفعات لتجنب timeout
    const BATCH = 50;
    for (let i = 0; i < contactsToImport.length; i += BATCH) {
      const batch = contactsToImport.slice(i, i + BATCH);
      for (const item of batch) {
        try {
          const normalizedPhone = item.phone ? normalizePhoneE164(item.phone) : null;
          const displayName = item.name || normalizedPhone || 'جهة اتصال مستوردة';
          const country = normalizedPhone ? detectCountry(normalizedPhone) : 'SA';

          if (normalizedPhone) {
            // فحص التكرار برقم الهاتف
            const existing = await q<{ id: string }>(
              `select id from hub.contacts where primary_phone_e164 = $1 limit 1`,
              [normalizedPhone]
            );

            if (existing.length > 0) {
              await q(
                `update hub.contacts set
                   display_name = case when nullif(display_name,'') is null then $2 else display_name end,
                   full_name    = case when nullif(full_name,'') is null then $2 else full_name end,
                   company      = coalesce(nullif($3,''), company),
                   city         = coalesce(nullif($4,''), city),
                   notes        = coalesce(nullif($5,''), notes),
                   source_detail = case
                     when source_detail is null then $6
                     when source_detail not like '%' || $6 || '%' then source_detail || ' • ' || $6
                     else source_detail
                   end,
                   country_code = coalesce(nullif($7,'XX'), country_code),
                   updated_at   = now()
                 where id = $1`,
                [existing[0].id, displayName, item.company || null, item.city || null, item.notes || null, sourceDetail, country]
              );
              mergedCount++;
              continue;
            }
          } else {
            // بدون هاتف — تحقق بالاسم فقط
            if (displayName && displayName !== 'جهة اتصال مستوردة') {
              const existByName = await q<{ id: string }>(
                `select id from hub.contacts where display_name = $1 and primary_phone_e164 is null limit 1`,
                [displayName]
              );
              if (existByName.length > 0) {
                mergedCount++;
                continue;
              }
            }
          }

          // إنشاء جديد (مع تعامل آمن مع أي unique constraint conflict)
          let newId: string | null = null;
          try {
            const ins = await q<{ id: string }>(
              `insert into hub.contacts
                 (display_name, full_name, company, entity_type, commercial_role, source, source_detail,
                  primary_phone, primary_phone_e164, email, country_code, city, notes, kind,
                  created_at, updated_at, last_activity_at)
               values ($1,$1,$2,'individual','b2c',$3,$4,$5,$5,$6,$7,$8,$9,'individual',now(),now(),now())
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
            newId = ins[0]?.id || null;
          } catch (insertErr: any) {
            if (insertErr.code === '23505') {
              // unique constraint violation — نعامله كـ merge
              mergedCount++;
              continue;
            }
            throw insertErr;
          }

          if (newId) {
            importedCount++;
            if (normalizedPhone) {
              await q(
                `insert into hub.contact_phones (contact_id, phone_e164, is_primary, wa_status)
                 values ($1, $2, true, 'unknown')
                 on conflict do nothing`,
                [newId, normalizedPhone]
              ).catch(() => {});
            }
          } else {
            failedCount++;
          }
        } catch (rowErr: any) {
          console.error('[import row error]', rowErr.message);
          failedCount++;
        }
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
