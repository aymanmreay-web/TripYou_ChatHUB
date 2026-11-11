import { NextRequest, NextResponse } from 'next/server';
import { q } from '../../../../lib/pg';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * م8 — فحص تسجيل جهة اتصال عبر معرف واتساب الحقيقي (jid) أو رقم الهاتف.
 * GET /api/contacts/check?jid=<chat_jid> [&phone=]
 * → { saved: boolean, contact?: { id, display_name, entity_type } }
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const jid = (searchParams.get('jid') || '').trim();
    const phone = (searchParams.get('phone') || '').trim();

    if (!jid && !phone) {
      return NextResponse.json({ saved: false });
    }

    const digits = phone.replace(/\D/g, '');
    const conditions: string[] = [];
    const params: any[] = [];
    if (jid) {
      params.push(jid);
      conditions.push(`wa_jid = $${params.length}`);
      // المجموعات القديمة مخزنة بجور jid داخل primary_phone_e164
      conditions.push(`(entity_type = 'group' and (primary_phone_e164 = $${params.length} or replace(replace(primary_phone_e164, '+', ''), '@g.us', '') = split_part($${params.length}, '@', 1)))`);
    }
    if (digits.length >= 7) {
      params.push('+' + digits);
      conditions.push(`primary_phone_e164 = $${params.length}`);
    }

    const rows = await q(
      `select id, display_name, entity_type from hub.contacts
       where ${conditions.join(' or ')}
       limit 1`,
      params
    );

    return NextResponse.json({
      saved: rows.length > 0,
      contact: rows[0] || null,
    });
  } catch (err: any) {
    console.error('[contacts/check GET]', err?.message);
    return NextResponse.json({ saved: false });
  }
}
