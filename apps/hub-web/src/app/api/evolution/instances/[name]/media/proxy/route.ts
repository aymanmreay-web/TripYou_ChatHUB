/**
 * GET /api/evolution/instances/[name]/media/proxy?url=<encoded_url>
 *
 * وكيل وسائط Evolution API — يُضيف رأس apikey المطلوب ويُعيد البث للمتصفح.
 * المتصفح لا يمكنه حقن رؤوس HTTP في وسوم <img>/<video>/<audio>،
 * لذلك نمرر الطلب عبر هذا المسار الذي يملك المفتاح.
 */

import { NextRequest, NextResponse } from 'next/server';

const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || 'bc6075e9f95967407faae5d0fa9ac875a8d88a94782172db';

export async function GET(
  req: NextRequest,
  { params }: { params: { name: string } }
) {
  const { searchParams } = new URL(req.url);
  const mediaUrl = searchParams.get('url');

  if (!mediaUrl) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  let decodedUrl: string;
  try {
    decodedUrl = decodeURIComponent(mediaUrl);
  } catch {
    return NextResponse.json({ error: 'Invalid url encoding' }, { status: 400 });
  }

  if (!decodedUrl.startsWith('http')) {
    return NextResponse.json({ error: 'Invalid media URL' }, { status: 400 });
  }

  try {
    const upstream = await fetch(decodedUrl, {
      headers: {
        apikey: EVOLUTION_API_KEY,
        Accept: '*/*',
      },
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Upstream error: ${upstream.status}` },
        { status: upstream.status }
      );
    }

    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
    const body = await upstream.arrayBuffer();

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=7200, stale-while-revalidate=86400',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err: any) {
    console.error('[MediaProxy] fetch error:', err?.message);
    return NextResponse.json(
      { error: 'Failed to fetch media from upstream' },
      { status: 502 }
    );
  }
}
