import { NextRequest, NextResponse } from 'next/server';
import { q } from '../../../../lib/pg';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/inboxes/read?inbox_id=...&user_id=...
 * جلب جميع المحادثات المقروءة لهذا المستخدم داخل هذا الصندوق.
 * تستخدم اتصال Postgres المباشر (q) بدل مفتاح الخدمة الميت.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const inboxId = searchParams.get('inbox_id') || 'all';
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json({ reads: [] });
    }

    let rows: { chat_jid: string; last_read_at: string }[];
    if (inboxId && inboxId !== 'all') {
      rows = await q(
        `select chat_jid, last_read_at from public.inbox_read_receipts
         where user_id = $1 and inbox_id = $2`,
        [userId, inboxId]
      );
    } else {
      rows = await q(
        `select chat_jid, last_read_at from public.inbox_read_receipts where user_id = $1`,
        [userId]
      );
    }

    return NextResponse.json(
      { reads: rows },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch (err: any) {
    console.error('[inboxes/read GET]', err?.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/inboxes/read
 * تسجيل محادثة كمقروءة للمستخدم داخل الصندوق الحالي
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user_id, inbox_id, chat_jid } = body;

    if (!user_id || !chat_jid) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const actualInboxId = inbox_id || 'all';

    await q(
      `insert into public.inbox_read_receipts (user_id, inbox_id, chat_jid, last_read_at)
       values ($1::uuid, $2, $3, now())
       on conflict (user_id, inbox_id, chat_jid)
       do update set last_read_at = now()`,
      [user_id, actualInboxId, chat_jid]
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[inboxes/read POST]', err?.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
