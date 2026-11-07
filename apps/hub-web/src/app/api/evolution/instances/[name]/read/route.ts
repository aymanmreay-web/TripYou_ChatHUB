import { NextResponse } from 'next/server';

const EVOLUTION_URL = process.env.EVOLUTION_URL || 'https://evo.69.62.122.89.sslip.io';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || 'bc6075e9f95967407faae5d0fa9ac875a8d88a94782172db';

// POST: تصفير وتحديد المحادثة كمقروءة على واتساب (Evolution API markMessageAsRead)
export async function POST(req: Request, { params }: { params: { name: string } }) {
  try {
    const { name } = params;
    const body = await req.json();
    const { chatJid } = body;

    if (!chatJid) {
      return NextResponse.json({ error: 'chatJid is required' }, { status: 400 });
    }

    const res = await fetch(`${EVOLUTION_URL}/chat/markMessageAsRead/${name}`, {
      method: 'POST',
      headers: {
        apikey: EVOLUTION_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        readMessages: [{ remoteJid: chatJid }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ ok: false, error: errText }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

