/**
 * GET /api/evolution/instances/[name]/media/proxy?id=<messageId>&url=<optionalFallbackUrl>&fileName=<optionalFileName>
 *
 * وكيل وسائط متطور لفك تشفير وتدفق وسائط WhatsApp الرسمية (Evolution API v2).
 * يدعم:
 * 1. فك التشفير اللحظي مع تخزين مؤقت محلي (Disk/Memory Cache) لدعم Range Requests للتقديم والتأخير (Seeking) الفوري في الفيديو والصوت.
 * 2. الحفاظ الكامل على اسم الملف وامتداده الأصليين (RFC 5987 / RFC 6266).
 * 3. المحاولة التلقائية على الخطوط المتاحة (Sells_2, Master...) في حال كان الخط المحدد غير متصل.
 */

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';

const EVOLUTION_URL = process.env.EVOLUTION_URL || 'https://evo.69.62.122.89.sslip.io';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || 'bc6075e9f95967407faae5d0fa9ac875a8d88a94782172db';

const CACHE_DIR = path.join(os.tmpdir(), 'evo_media_cache');
try {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
} catch (_) {}

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

  const binPath = messageId ? path.join(CACHE_DIR, `${messageId}.bin`) : null;
  const metaPath = messageId ? path.join(CACHE_DIR, `${messageId}.json`) : null;

  // 1. فحص التخزين المؤقت أولاً لتسريع طلبات Range والتحميل المباشر
  if (binPath && metaPath && fs.existsSync(binPath) && fs.existsSync(metaPath)) {
    try {
      buffer = fs.readFileSync(binPath);
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      if (meta.mime) mime = meta.mime;
      if (!cleanFileName && meta.fileName) cleanFileName = meta.fileName;
    } catch (e) {
      buffer = null;
    }
  }

  // 2. إذا لم يكن مخزناً مؤقتاً: فك التشفير عبر معرّف الرسالة
  if (!buffer && messageId) {
    // نبدأ بالخطوط المتصلة النشطة المعروفة لتجنب التأخير
    const candidateLines = [name, 'Sells_2', 'Master', 'Sells_1'].filter((v, idx, arr) => arr.indexOf(v) === idx);

    for (const inst of candidateLines) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 12000);

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
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (upstream.ok) {
          const data = await upstream.json();
          if (data && data.base64) {
            buffer = Buffer.from(data.base64, 'base64');
            mime = data.mimetype || 'application/octet-stream';
            if (!cleanFileName && data.fileName) {
              cleanFileName = data.fileName;
            }

            // حفظ في التخزين المؤقت للاستخدام اللاحق
            if (binPath && metaPath) {
              try {
                fs.writeFileSync(binPath, buffer);
                fs.writeFileSync(metaPath, JSON.stringify({ mime, fileName: cleanFileName }));
              } catch (_) {}
            }
            break;
          }
        }
      } catch (err: any) {
        console.warn(`[MediaProxy] Decrypt via ${inst} failed:`, messageId, err?.message);
      }
    }
  }

  // 3. إذا لم ينجح فك التشفير وكان هناك رابط مباشر غير مشفر
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

  // تحديد اسم الملف الصحيح واللاحقة
  if (!cleanFileName) {
    const ext = deduceExtension(mime);
    cleanFileName = `media_${messageId || 'file'}${ext}`;
  } else if (!cleanFileName.includes('.')) {
    cleanFileName += deduceExtension(mime);
  }

  const safeAscii = cleanFileName.replace(/[^\x20-\x7E]/g, '_');
  const encodedFileName = encodeURIComponent(cleanFileName);
  const dispositionType = asAttachment ? 'attachment' : 'inline';
  const contentDisposition = `${dispositionType}; filename="${safeAscii}"; filename*=UTF-8''${encodedFileName}`;

  // 4. معالجة طلبات Range (HTTP 206 Partial Content) للتقديم والتأخير بسلاسة
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

  // 5. استجابة كاملة عادية مع دعم Accept-Ranges
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
