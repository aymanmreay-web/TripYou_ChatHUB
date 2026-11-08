import { NextResponse } from 'next/server';

const EVOLUTION_URL = process.env.EVOLUTION_URL || 'https://evo.69.62.122.89.sslip.io';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || 'bc6075e9f95967407faae5d0fa9ac875a8d88a94782172db';

// POST: تصفير وتحديد المحادثة كمقروءة على واتساب (Evolution API markMessageAsRead)
export async function POST(req: Request, { params }: { params: { name: string } }) {
  try {
    const { name } = params;
    const body = await req.json();
    const { chatJid, messageId, fromMe = false } = body;

    if (!chatJid) {
      return NextResponse.json({ error: 'chatJid is required' }, { status: 400 });
    }

    let targetMsgId = messageId;

    // إذا لم يُرسل messageId، نجلب آخر رسالة واردة تلقائياً لقراءتها وتصفير العداد
    if (!targetMsgId) {
      try {
        const findRes = await fetch(`${EVOLUTION_URL}/chat/findMessages/${name}`, {
          method: 'POST',
          headers: { apikey: EVOLUTION_API_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            where: { key: { remoteJid: chatJid } },
            limit: 5,
          }),
        });
        if (findRes.ok) {
          const msgsData = await findRes.json();
          const list = Array.isArray(msgsData)
            ? msgsData
            : Array.isArray(msgsData?.messages?.records)
            ? msgsData.messages.records
            : Array.isArray(msgsData?.records)
            ? msgsData.records
            : [];
          const lastIn = list.find((m: any) => !m.key?.fromMe);
          targetMsgId = lastIn?.key?.id || list[0]?.key?.id || list[0]?.id;
        }
      } catch (e) {}
    }

    const payload = {
      readMessages: [
        {
          remoteJid: chatJid,
          id: targetMsgId || 'latest',
          fromMe: !!fromMe,
        },
      ],
    };

    const res = await fetch(`${EVOLUTION_URL}/chat/markMessageAsRead/${name}`, {
      method: 'POST',
      headers: {
        apikey: EVOLUTION_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
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
