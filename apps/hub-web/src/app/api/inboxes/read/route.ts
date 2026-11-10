import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/inboxes/read?inbox_id=...&user_id=...
 * جلب جميع المحادثات المقروءة لهذا المستخدم داخل هذا الصندوق
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const inboxId = searchParams.get('inbox_id') || 'all';
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json({ reads: [] });
    }

    let query = supabase
      .from('inbox_read_receipts')
      .select('chat_jid, last_read_at')
      .eq('user_id', userId);

    if (inboxId && inboxId !== 'all') {
      query = query.eq('inbox_id', inboxId);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { reads: data || [] },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/inboxes/read
 * تسجيل محادثة كمقروءة للمستخدم داخل الصندوق الحالي
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await req.json();
    const { user_id, inbox_id, chat_jid } = body;

    if (!user_id || !chat_jid) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const actualInboxId = inbox_id || 'all';

    const { error } = await supabase
      .from('inbox_read_receipts')
      .upsert(
        {
          user_id,
          inbox_id: actualInboxId,
          chat_jid,
          last_read_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,inbox_id,chat_jid' }
      );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

