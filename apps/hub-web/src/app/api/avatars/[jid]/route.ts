import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { q } from '../../../../lib/pg';

const EVOLUTION_URL = process.env.EVOLUTION_URL || 'https://evo.69.62.122.89.sslip.io';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '';

// مجلد التخزين المحلي الدائم
const PUBLIC_AVATARS_DIR = path.join(process.cwd(), 'public', 'avatars');
try {
  if (!fs.existsSync(PUBLIC_AVATARS_DIR)) {
    fs.mkdirSync(PUBLIC_AVATARS_DIR, { recursive: true });
  }
} catch (_) {}

/**
 * تنزيل الصورة من الرابط وحفظها كملف محلي دائم
 */
async function downloadAndSaveAvatar(url: string, jid: string): Promise<string | null> {
  try {
    const cleanJid = jid.replace(/[^a-zA-Z0-9_-]/g, '_');
    const localFilePath = path.join(PUBLIC_AVATARS_DIR, `${cleanJid}.jpg`);
    const publicUrl = `/avatars/${cleanJid}.jpg`;

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);

    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await fs.promises.writeFile(localFilePath, buffer);
    return publicUrl;
  } catch (err) {
    return null;
  }
}

/**
 * GET /api/avatars/[jid]?instance=Master
 * يعيد الصورة محلياً فوراً، وإن لم توجد أو انتهت صلاحيتها، يجلبها من واتساب ويخزنها محلياً للأبد
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { jid: string } }
) {
  const jid = decodeURIComponent(params.jid || '');
  if (!jid) {
    return NextResponse.json({ error: 'JID required' }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const instance = searchParams.get('instance') || 'Master';
  const cleanJid = jid.replace(/[^a-zA-Z0-9_-]/g, '_');
  const localFilePath = path.join(PUBLIC_AVATARS_DIR, `${cleanJid}.jpg`);

  // 1. هل الملف موجود محلياً على القرص؟
  if (fs.existsSync(localFilePath)) {
    try {
      const stat = await fs.promises.stat(localFilePath);
      // إذا كان الملف أكبر من 0 بايت ولم يمر عليه أكثر من 30 يوماً
      if (stat.size > 0 && Date.now() - stat.mtimeMs < 30 * 24 * 60 * 60 * 1000) {
        const fileBuffer = await fs.promises.readFile(localFilePath);
        return new NextResponse(fileBuffer, {
          headers: {
            'Content-Type': 'image/jpeg',
            'Cache-Control': 'public, max-age=604800, immutable',
          },
        });
      }
    } catch (_) {}
  }

  // 2. فحص الرابط المخزن في قاعدة البيانات
  let dbUrl: string | null = null;
  const isGroup = jid.endsWith('@g.us');

  try {
    if (isGroup) {
      const gRow = await q<{ picture_url: string | null }>(
        `select picture_url from hub.whatsapp_groups where group_jid = $1 limit 1`,
        [jid]
      );
      dbUrl = gRow[0]?.picture_url || null;
    } else {
      const cRow = await q<{ avatar_url: string | null }>(
        `select avatar_url from hub.contacts where wa_jid = $1 limit 1`,
        [jid]
      );
      dbUrl = cRow[0]?.avatar_url || null;
    }
  } catch (_) {}

  // 3. إن كان هناك رابط واتساب، نحاول تحميله وحفظه محلياً
  if (dbUrl && dbUrl.startsWith('http')) {
    const savedLocal = await downloadAndSaveAvatar(dbUrl, jid);
    if (savedLocal && fs.existsSync(localFilePath)) {
      const fileBuffer = await fs.promises.readFile(localFilePath);
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': 'image/jpeg',
          'Cache-Control': 'public, max-age=604800, immutable',
        },
      });
    }
  }

  // 4. الرابط قديم أو منتهي أو مفقود → نسحب صورة متجددة طازجة من Evolution
  try {
    const evoHeaders = { apikey: EVOLUTION_API_KEY, 'Content-Type': 'application/json' };
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);

    const res = await fetch(`${EVOLUTION_URL}/chat/fetchProfilePictureUrl/${instance}`, {
      method: 'POST',
      headers: evoHeaders,
      body: JSON.stringify({ number: jid }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);

    if (res.ok) {
      const data = await res.json().catch(() => null);
      const freshUrl: string | null =
        data?.profilePictureUrl || data?.profilePicUrl || data?.wapi?.profilePicUrl || data?.data?.profilePicUrl || null;

      if (freshUrl) {
        // تحديث قاعدة البيانات
        if (isGroup) {
          await q(`update hub.whatsapp_groups set picture_url = $2, updated_at = now() where group_jid = $1`, [jid, freshUrl]).catch(() => {});
        }
        await q(`update hub.contacts set avatar_url = $2, updated_at = now() where wa_jid = $1`, [jid, freshUrl]).catch(() => {});

        // تحميل وحفظ محلي
        const saved = await downloadAndSaveAvatar(freshUrl, jid);
        if (saved && fs.existsSync(localFilePath)) {
          const fileBuffer = await fs.promises.readFile(localFilePath);
          return new NextResponse(fileBuffer, {
            headers: {
              'Content-Type': 'image/jpeg',
              'Cache-Control': 'public, max-age=604800, immutable',
            },
          });
        }

        // تحويل فوري للرابط إن تعذر الحفظ على القرص
        return NextResponse.redirect(freshUrl, 302);
      }
    }
  } catch (err: any) {
    console.error(`[Avatar Route] Error fetching avatar for ${jid}:`, err?.message);
  }

  return NextResponse.json({ error: 'Avatar not found' }, { status: 404 });
}
