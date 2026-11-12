import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const EVOLUTION_URL = process.env.EVOLUTION_URL || 'https://evo.69.62.122.89.sslip.io';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '';

/**
 * م8 — تحويل رسمي لواتساب (كل الأنواع: نص/صورة/فيديو/مستند/ملصق/صوت) عبر key الأصلي.
 * POST /api/evolution/instances/[name]/forward
 * body: { to: <target chat jid>, key: { remoteJid, fromMe, id, participant? } }
 * ⚠️ يجب التنفيذ على خط المصدر نفسه (النسخة الأصلية في ذاكرته) — الاسم في المسار.
 */
export async function POST(req: Request, { params }: { params: { name: string } }) {
  try {
    const instanceName: string = params.name;
    const body = await req.json();
    const { to, key } = body;

    if (!to || !key?.id || !key?.remoteJid) {
      return NextResponse.json({ error: 'to and key(remoteJid,id) required' }, { status: 400 });
    }

    const payload: Record<string, any> = {
      number: to,
      key: {
        remoteJid: key.remoteJid,
        fromMe: !!key.fromMe,
        id: key.id,
        ...(key.participant ? { participant: key.participant } : {}),
      },
    };

    const res = await fetch(`${EVOLUTION_URL}/message/forward/${encodeURIComponent(instanceName)}`, {
      method: 'POST',
      headers: { apikey: EVOLUTION_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      return NextResponse.json(
        { error: `Evolution API error: ${res.status}`, detail: detail.slice(0, 300) },
        { status: res.status }
      );
    }
    const data = await res.json().catch(() => ({}));
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
