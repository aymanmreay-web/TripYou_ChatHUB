import { NextResponse } from 'next/server';

const EVOLUTION_URL = process.env.EVOLUTION_URL || 'https://evo.69.62.122.89.sslip.io';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || 'bc6075e9f95967407faae5d0fa9ac875a8d88a94782172db';

// POST: Send media (image, document, audio, video) via Evolution API
export async function POST(req: Request, { params }: { params: { name: string } }) {
  try {
    const { name } = params;
    const body = await req.json();
    const { to, mediaType, mimeType, media, caption, fileName, signature, staff_id } = body;

    if (!to || !media) {
      return NextResponse.json({ error: 'to and media are required' }, { status: 400 });
    }

    const cleanNumber = String(to).trim();

    // إزالة بادئة data:...;base64, إذا كانت موجودة لأن Evolution API يتطلب Base64 خاماً فقط
    let cleanMedia = media;
    if (typeof cleanMedia === 'string' && cleanMedia.includes(';base64,')) {
      cleanMedia = cleanMedia.split(';base64,')[1];
    }

    // إذا كان المرفق تسجيلاً صوتياً (Voice Note): أرسله عبر sendWhatsAppAudio كبصمة صوتية رسمية
    if (mediaType === 'audio') {
      try {
        const audioRes = await fetch(`${EVOLUTION_URL}/message/sendWhatsAppAudio/${name}`, {
          method: 'POST',
          headers: {
            apikey: EVOLUTION_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            number: cleanNumber,
            audio: cleanMedia,
            delay: 1000,
          }),
        });

        if (audioRes.ok) {
          const audioData = await audioRes.json();
          // حفظ التوقيع مع الرسالة الصوتية — يظهر في الفقاعة حتى بعد إعادة تحميل المحادثة
          const waId = audioData?.key?.id;
          if (waId) {
            try {
              const { storeOutboundStaffMessage } = await import('../../../../../../lib/webhookHandlers/storeMessage');
              await storeOutboundStaffMessage({
                instance: name,
                chatJid: cleanNumber,
                waMessageId: waId,
                staffId: staff_id || null,
                body: '',
                mediaType: 'audio',
                signature: signature || null,
              });
            } catch (e: any) {
              console.warn('[media store] non-critical:', e?.message);
            }
          }
          return NextResponse.json(audioData);
        }
      } catch (err: any) {
        console.warn('[sendWhatsAppAudio] failed, falling back to sendMedia:', err?.message);
      }
    }

    // إرسال عبر sendMedia العام (صور، مقاطع فيديو، مستندات)
    // ✅ Evolution API v2 يستخدم camelCase: mediaType وليس mediatype
    const payload = {
      number: cleanNumber,
      mediaType: mediaType || 'document',   // ← camelCase إلزامي في Evolution API v2
      mimetype: mimeType || 'application/octet-stream',
      caption: caption || '',
      media: cleanMedia,
      fileName: fileName || (mediaType === 'image' ? 'image.jpg' : 'file'),
    };

    const res = await fetch(`${EVOLUTION_URL}/message/sendMedia/${name}`, {
      method: 'POST',
      headers: {
        apikey: EVOLUTION_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errDetail = await res.text();
      return NextResponse.json(
        { error: `Evolution sendMedia error: ${res.status}`, detail: errDetail },
        { status: res.status }
      );
    }

    const data = await res.json();

    // حفظ التوقيع مع الرسالة الوسائطية (صور/ملفات/فيديو) — يظهر في الفقاعة بعد إعادة التحميل
    const waId = data?.key?.id;
    if (waId) {
      try {
        const { storeOutboundStaffMessage } = await import('../../../../../../lib/webhookHandlers/storeMessage');
        await storeOutboundStaffMessage({
          instance: name,
          chatJid: cleanNumber,
          waMessageId: waId,
          staffId: staff_id || null,
          body: caption || '',
          mediaType: mediaType || 'document',
          signature: signature || null,
        });
      } catch (e: any) {
        console.warn('[media store] non-critical:', e?.message);
      }
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
