import { NextRequest, NextResponse } from 'next/server';

import { requirePermission } from '../../../../../../lib/serverAuth';
import { denyLine } from '../../../../../../lib/access';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const EVOLUTION_URL = process.env.EVOLUTION_URL || 'https://evo.69.62.122.89.sslip.io';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '';

/**
 * C4 — أعضاء مجموعة واتساب مع فك تشفير أرقام هواتف حسابات LID
 * GET /api/evolution/instances/[name]/group-members?jid=<group_jid>
 */
export async function GET(req: NextRequest, { params }: { params: { name: string } }) {
  const auth = await requirePermission(req, 'groups.view');
  if (auth instanceof NextResponse) return auth;
  { const d = await denyLine(auth, params.name, 'read'); if (d) return d; }
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
      return NextResponse.json({ members: [], phones: [], mapping: {}, found: false });
    }
    const data = await res.json().catch(() => null);
    const list: any[] = Array.isArray(data) ? data : Array.isArray(data?.participants) ? data.participants : [];
    
    const members: string[] = [];
    const phones: string[] = [];
    const mapping: Record<string, { phone: string; imgUrl?: string; name?: string }> = {};

    list.forEach((p: any) => {
      const mid = String(p?.id || p?.jid || p?.participant || '');
      const rawPhone = String(p?.phoneNumber || p?.phone || '').replace('@s.whatsapp.net', '').replace(/\D/g, '');
      const phone = rawPhone ? '+' + rawPhone : '';

      if (mid) {
        members.push(mid);
        mapping[mid] = {
          phone,
          imgUrl: p?.imgUrl || p?.profilePicUrl || undefined,
          name: p?.name || undefined,
        };
      }
      if (phone) {
        phones.push(phone);
      }
    });

    const effectivePhones = phones.length > 0
      ? phones
      : members.map((m: string) => m.replace(/@.*$/, '').replace(/\D/g, '')).filter((m: string) => m.length >= 10);

    return NextResponse.json({ members, phones: effectivePhones, mapping, found: true });
  } catch (err: any) {
    console.error('[group-members]', err?.message);
    return NextResponse.json({ members: [], phones: [], mapping: {}, found: false, error: err.message }, { status: 500 });
  }
}
