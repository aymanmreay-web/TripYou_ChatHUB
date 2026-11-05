/**
 * GET /api/evolution/instances/[name]/media/proxy?id=<messageId>&url=<optionalFallbackUrl>&fileName=<optionalFileName>
 *
 * وكيل وسائط متطور لفك تشفير وتدفق وسائط WhatsApp الرسمية (Evolution API v2).
 * يدعم:
 * 1. فك التشفير اللحظي لوسائط WhatsApp المشفرة (.enc).
 * 2. دعم Range Requests (HTTP 206 Partial Content) لتمكين التقديم والتأخير (Seeking) بسلاسة في الفيديو والصوت.
 * 3. الحفاظ على أسماء الملفات الأصلية ولاحقاتها (Content-Disposition: inline/attachment).
 * 4. السقوط التلقائي للخط البديل في حال وصول الرسالة على خط آخر.
 */

import { NextRequest, NextResponse } from 'next/server';

const EVOLUTION_URL = process.env.EVOLUTION_URL || 'https://evo.69.62.122.89.sslip.io';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || 'bc6075e9f95967407faae5d0fa9ac875a8d88a94782172db';

function deduceExtension(mime: string): string {
  if (mime.includes('jpeg') || mime.includes('jpg')) return '.jpg';
  if (mime.includes('png')) return '.png';
  if (mime.includes('webp')) return '.webp';
  if (mime.includes('mp4')) return '.mp4';
  if (mime.includes('ogg') || mime.includes('opus')) return '.ogg';
  if (mime.includes('pdf')) return '.pdf';
  if (mime.includes('spreadsheet') || mime.includes('excel') || mime.includes('xlsx')) return '.xlsx';
  if (mime.includes('word') || mime.includes('docx')) return '.docx';
  if (mime.includes('zip')) return '.zip';
  return '';
}

export async function GET(
  req: NextRequest,
  { params }: { params: { name: string } }
) {
  const { searchParams } = new URL(req.url);
  const messageId = searchParams.get('id');
  const mediaUrl = searchParams.get('url');
  const rawFileName = searchParams.get('fileName') || searchParams.get('filename') || '';
  const asAttachment = searchParams.get('download') === 'true';

  if (!messageId && !mediaUrl) {
    return NextResponse.json({ error: 'Missing id or url parameter' }, { status: 400 });
  }

  const { name } = params;
  let buffer: Buffer | null = null;
  let mime = 'application/octet-stream';
  let cleanFileName = rawFileName;

  // 1. الأولوية القصوى: فك التشفير عبر معرّف الرسالة
  if (messageId) {
    // قائمة الخطوط للمحاولة: الخط المطلوب أولاً ثم الخطوط البديلة الشائعة
    const candidateLines = [name, 'Sells_2', 'Master'].filter((v, idx, arr) => arr.indexOf(v) === idx);

    for (const inst of candidateLines) {
      try {
        const upstream = await fetch(`${EVOLUTION_URL}/chat/getBase64FromMediaMessage/${inst}`, {
          method: 'POST',
          headers: {
            apikey: EVOLUTION_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: { key: { id: messageId } },
            convertToMp4: false,
          }),
        });

        if (upstream.ok) {
          const data = await upstream.json();
          if (data && data.base64) {
            buffer = Buffer.from(data.base64, 'base64');
            mime = data.mimetype || 'application/octet-stream';
            if (!cleanFileName && data.fileName) {
              cleanFileName = data.fileName;
            }
            break; // تم النجاح
          }
        }
      } catch (err: any) {
        console.warn(`[MediaProxy] Decrypt via ${inst} failed:`, messageId, err?.message);
      }
    }
  }

  // 2. إذا لم ينجح فك التشفير وكان هناك رابط مباشر غير مشفر
  if (!buffer && mediaUrl) {
    try {
      const decodedUrl = decodeURIComponent(mediaUrl);
      if (decodedUrl.startsWith('http') && !decodedUrl.includes('.enc')) {
        const directRes = await fetch(decodedUrl, {
          headers: { apikey: EVOLUTION_API_KEY, Accept: '*/*' },
        });
        if (directRes.ok) {
          mime = directRes.headers.get('content-type') || 'application/octet-stream';
          const ab = await directRes.arrayBuffer();
          buffer = Buffer.from(ab);
        }
      }
    } catch (err: any) {
      console.warn('[MediaProxy] Direct fetch failed:', err?.message);
    }
  }

  if (!buffer) {
    return NextResponse.json({ error: 'Media could not be retrieved or decrypted' }, { status: 404 });
  }

  // تحديد اسم الملف الصحيح مع اللاحقة
  if (!cleanFileName) {
    const ext = deduceExtension(mime);
    cleanFileName = `media_${messageId || 'file'}${ext}`;
  } else if (!cleanFileName.includes('.')) {
    cleanFileName += deduceExtension(mime);
  }

  const encodedFileName = encodeURIComponent(cleanFileName);
  const dispositionType = asAttachment ? 'attachment' : 'inline';
  const contentDisposition = `${dispositionType}; filename="${encodedFileName}"; filename*=UTF-8''${encodedFileName}`;

  // 3. معالجة طلبات Range (HTTP 206 Partial Content) للتقديم والتأخير بسلاسة
  const rangeHeader = req.headers.get('range');
  const totalLength = buffer.length;

  if (rangeHeader && rangeHeader.startsWith('bytes=')) {
    const parts = rangeHeader.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : totalLength - 1;

    if (start >= totalLength || end >= totalLength || start > end) {
      return new NextResponse('Requested range not satisfiable', {
        status: 416,
        headers: {
          'Content-Range': `bytes */${totalLength}`,
        },
      });
    }

    const chunk = new Uint8Array(buffer.subarray(start, end + 1));
    return new NextResponse(chunk, {
      status: 206,
      headers: {
        'Content-Type': mime,
        'Content-Length': chunk.length.toString(),
        'Content-Range': `bytes ${start}-${end}/${totalLength}`,
        'Accept-Ranges': 'bytes',
        'Content-Disposition': contentDisposition,
        'Cache-Control': 'public, max-age=604800, immutable',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  // 4. استجابة كاملة عادية مع دعم Accept-Ranges
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': mime,
      'Content-Length': totalLength.toString(),
      'Accept-Ranges': 'bytes',
      'Content-Disposition': contentDisposition,
      'Cache-Control': 'public, max-age=604800, immutable',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
