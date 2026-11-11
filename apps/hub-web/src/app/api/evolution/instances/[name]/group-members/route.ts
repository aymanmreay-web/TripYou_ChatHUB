import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const EVOLUTION_URL = process.env.EVOLUTION_URL || 'https://evo.69.62.122.89.sslip.io';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '';

/**
 * C4 — هل رقم الخط عضو في مجموعة واتساب؟
 * GET /api/evolution/instances/[name]/group-members?jid=<group_jid>
 * → { members: ["9665xxx@s.whatsapp.net", "9665yyy@lid", ...] }
 * (يُستخدم لتعطيل الخطوط غير الأعضاء في منتقي الإرسال — قانون واتساب: لا إرسال لمجموعة إلا لعضو)
 */
export async function GET(req: NextRequest, { params }: { params: { name: string } }) {
  try {
    const instanceName: string = params.name;
    const { searchParams } = new URL(req.url);
    const jid: string = searchParams.get('jid') || '';
    if (!jid) {
      return NextResponse.json({ error: 'jid required' }, { status: 400 });
    }

    const res = await fetch(
      `${EVOLUTION_URL}/group/participants/${encodeURIComponent(instanceName)}?groupJid=${encodeURIComponent(jid)}`,
      { headers: { apikey: EVOLUTION_API_KEY }, cache: 'no-store' }
    );
    if (!res.ok) {
      // المجموعة غير موجودة على هذا الخط إطلاقاً = غير عضو
      return NextResponse.json({ members: [], found: false });
    }
    const data = await res.json().catch(() => null);
    const list: any[] = Array.isArray(data) ? data : Array.isArray(data?.participants) ? data.participants : [];
    const members = list
      .map((p: any) => String(p?.id || p?.jid || p?.participant || ''))
      .filter(Boolean);
    return NextResponse.json({ members, found: true });
  } catch (err: any) {
    console.error('[group-members]', err?.message);
    return NextResponse.json({ members: [], found: false, error: err.message }, { status: 500 });
  }
}
