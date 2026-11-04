import { NextResponse } from 'next/server';

const EVOLUTION_URL = process.env.EVOLUTION_URL || 'https://evo.69.62.122.89.sslip.io';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || 'bc6075e9f95967407faae5d0fa9ac875a8d88a94782172db';

// POST: Send media (image, document, audio, video) via Evolution API
export async function POST(req: Request, { params }: { params: { name: string } }) {
  try {
    const { name } = params;
    const body = await req.json();
    const { to, mediaType, mimeType, media, caption, fileName } = body;

    if (!to || !media) {
      return NextResponse.json({ error: 'to and media (base64 or URL) are required' }, { status: 400 });
    }

    const payload = {
      number: to,
      mediatype: mediaType || 'document',
      mimetype: mimeType || 'application/octet-stream',
      caption: caption || '',
      media: media,
      fileName: fileName || 'file',
    };

    const res = await fetch(`${EVOLUTION_URL}/message/sendMedia/${name}`, {
      method: 'POST',
      headers: {
        'apikey': EVOLUTION_API_KEY,
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
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

