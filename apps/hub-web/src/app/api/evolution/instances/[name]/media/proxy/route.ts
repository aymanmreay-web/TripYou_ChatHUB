/**
 * GET /api/evolution/instances/[name]/media/proxy?id=<messageId>&url=<optionalFallbackUrl>
 *
 * وكيل وسائط متطور لفك تشفير وتدفق وسائط WhatsApp الرسمية (Evolution API v2).
 * وسائط WhatsApp مُشفرة بتشفير AES طرف إلى طرف (.enc)،
 * يقوم هذا المسار باستدعاء getBase64FromMediaMessage لفك تشفيرها في الذاكرة
 * وبثها للمتصفح بترميزها الأصلي (MP4, JPEG, OGG/Opus, PDF) مع كاش سريع.
 */

import { NextRequest, NextResponse } from 'next/server';

const EVOLUTION_URL = process.env.EVOLUTION_URL || 'https://evo.69.62.122.89.sslip.io';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || 'bc6075e9f95967407faae5d0fa9ac875a8d88a94782172db';

export async function GET(
  req: NextRequest,
  { params }: { params: { name: string } }
) {
  const { searchParams } = new URL(req.url);
  const messageId = searchParams.get('id');
  const mediaUrl = searchParams.get('url');

  if (!messageId && !mediaUrl) {
    return NextResponse.json({ error: 'Missing id or url parameter' }, { status: 400 });
  }

  const { name } = params;

  // 1. الأولوية القصوى: فك التشفير عبر معرّف الرسالة (للحصول على الصورة الأصلية أو الفيديو بدون تشويش)
  if (messageId) {
    try {
      const upstream = await fetch(`${EVOLUTION_URL}/chat/getBase64FromMediaMessage/${name}`, {
        method: 'POST',
        headers: {
          apikey: EVOLUTION_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: {
            key: { id: messageId },
          },
          convertToMp4: false,
        }),
      });

      if (upstream.ok) {
        const data = await upstream.json();
        if (data && data.base64) {
          const buffer = Buffer.from(data.base64, 'base64');
          const mime = data.mimetype || 'application/octet-stream';
          return new NextResponse(buffer, {
            status: 200,
            headers: {
              'Content-Type': mime,
              'Content-Length': buffer.length.toString(),
              'Cache-Control': 'public, max-age=604800, immutable',
              'Access-Control-Allow-Origin': '*',
            },
          });
        }
      }
    } catch (err: any) {
      console.warn('[MediaProxy] Decrypt via id failed:', messageId, err?.message);
    }
  }

  // 2. إذا تم تمرير رابط بديل وكان رابطاً مباشراً غير مشفر
  if (mediaUrl) {
    try {
      const decodedUrl = decodeURIComponent(mediaUrl);
      if (decodedUrl.startsWith('http') && !decodedUrl.includes('.enc')) {
        const directRes = await fetch(decodedUrl, {
          headers: { apikey: EVOLUTION_API_KEY, Accept: '*/*' },
        });
        if (directRes.ok) {
          const contentType = directRes.headers.get('content-type') || 'application/octet-stream';
          const body = await directRes.arrayBuffer();
          return new NextResponse(body, {
            status: 200,
            headers: {
              'Content-Type': contentType,
              'Cache-Control': 'public, max-age=86400',
              'Access-Control-Allow-Origin': '*',
            },
          });
        }
      }
    } catch (err: any) {
      console.warn('[MediaProxy] Direct fetch failed:', err?.message);
    }
  }

  return NextResponse.json({ error: 'Media could not be retrieved or decrypted' }, { status: 404 });
}
