import { NextResponse } from 'next/server';

const EVOLUTION_URL = process.env.EVOLUTION_URL || 'https://evo.69.62.122.89.sslip.io';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || 'bc6075e9f95967407faae5d0fa9ac875a8d88a94782172db';

// GET: fetch messages for a chat
export async function GET(req: Request, { params }: { params: { name: string } }) {
  const { searchParams } = new URL(req.url);
  const chatId = searchParams.get('chatId');
  const limit = searchParams.get('limit') || '50';
  
  if (!chatId) {
    return NextResponse.json({ error: 'chatId is required' }, { status: 400 });
  }
  
  try {
    const { name } = params;
    const res = await fetch(`${EVOLUTION_URL}/chat/findMessages/${name}`, {
      method: 'POST',
      headers: { 'apikey': EVOLUTION_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        where: { key: { remoteJid: chatId } },
        limit: parseInt(limit)
      }),
      cache: 'no-store',
    });
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `Evolution API error: ${res.status}`, detail: text }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: send a message
export async function POST(req: Request, { params }: { params: { name: string } }) {
  try {
    const { name } = params;
    const body = await req.json();
    const { to, text, type = 'text', staff_id, signature, quoted_message_id } = body;

    if (!to || !text) {
      return NextResponse.json({ error: 'to and text are required' }, { status: 400 });
    }

    // م8: الرد المقتبس — الحقل في أعلى جسم الإرسال (SendTextDto في Evolution v2)
    const payload: Record<string, any> = { number: to, text };
    if (quoted_message_id) {
      payload.quotedMessageId = quoted_message_id;
    }

    const res = await fetch(`${EVOLUTION_URL}/message/sendText/${name}`, {
      method: 'POST',
      headers: { 'apikey': EVOLUTION_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text2 = await res.text();
      return NextResponse.json({ error: `Evolution API error: ${res.status}`, detail: text2 }, { status: res.status });
    }
    const data = await res.json();

    // تخزين الرسالة الصادرة في القاعدة (للمؤشرات والتاريخ) — لا يعطل الإرسال أبداً
    const waId = data?.key?.id;
    if (waId) {
      const { storeOutboundStaffMessage } = await import('../../../../../../lib/webhookHandlers/storeMessage');
      await storeOutboundStaffMessage({
        instance: name,
        chatJid: to,
        waMessageId: waId,
        staffId: staff_id || null,
        body: text,
        mediaType: 'text',
        signature: signature || null,
      });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
