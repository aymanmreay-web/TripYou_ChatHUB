import { NextResponse } from 'next/server';

import { requireAny } from '../../../../lib/serverAuth';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const EVOLUTION_URL = process.env.EVOLUTION_URL || 'https://evo.69.62.122.89.sslip.io';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '';

/**
 * GET /api/evolution/lines
 * جلب قائمة خطوط واتساب المتاحة من Evolution API مع حالة الاتصال
 * يُستخدم في ImportModal لملء dropdown الخطوط ديناميكياً
 */
export async function GET(req: Request) {
  const auth = await requireAny(req, ['lines.view', 'inbox.view']);
  if (auth instanceof NextResponse) return auth;
  try {
    const res = await fetch(`${EVOLUTION_URL}/instance/fetchInstances`, {
      headers: { apikey: EVOLUTION_API_KEY },
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return NextResponse.json({ lines: [], error: 'تعذر الاتصال بـ Evolution API' });
    }

    const data = await res.json();
    const instances = Array.isArray(data) ? data : [];

    const lines = instances.map((i: any) => ({
      name: i.name || i.instanceName || '',
      status: i.connectionStatus || i.state || 'unknown',
      connected: (i.connectionStatus || i.state || '') === 'open',
    })).filter((l: any) => l.name);

    return NextResponse.json({ lines });
  } catch (err: any) {
    console.error('[evolution/lines]', err.message);
    return NextResponse.json({ lines: [], error: err.message });
  }
}
