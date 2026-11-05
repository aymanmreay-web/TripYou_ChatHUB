import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const DEFAULT_STAFF_ID = '51afa607-9cca-4fe0-98f8-76dd0217b137';

// GET /api/pins?chat_jid=<jid>
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const chatJid = searchParams.get('chat_jid');

    if (!chatJid) {
      return NextResponse.json({ error: 'chat_jid is required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('pinned_messages')
      .select('*')
      .eq('chat_jid', chatJid)
      .order('pinned_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/pins - تثبيت رسالة
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      chat_jid,
      message_id,
      body: msgBody = '',
      media_type = 'text',
      media_url = null,
      sender_name = '',
      duration_type = '7d', // '24h' | '7d' | '30d'
      pinned_by = DEFAULT_STAFF_ID,
    } = body;

    if (!chat_jid || !message_id) {
      return NextResponse.json({ error: 'chat_jid and message_id are required' }, { status: 400 });
    }

    // حساب تاريخ الانتهاء
    let intervalDays = 7;
    if (duration_type === '24h') intervalDays = 1;
    if (duration_type === '30d') intervalDays = 30;
    const expiresAt = new Date(Date.now() + intervalDays * 24 * 60 * 60 * 1000).toISOString();

    const supabase = getSupabaseAdmin();

    // نتحقق من الحد الأقصى (حتى 5 رسائل مثبتة لكل محادثة)
    const { count } = await supabase
      .from('pinned_messages')
      .select('*', { count: 'exact', head: true })
      .eq('chat_jid', chat_jid);

    if (count && count >= 5) {
      // إزالة أقدم رسالة مثبتة لإفساح المجال للجديدة
      const { data: oldest } = await supabase
        .from('pinned_messages')
        .select('id')
        .eq('chat_jid', chat_jid)
        .order('pinned_at', { ascending: true })
        .limit(1)
        .single();
      if (oldest) {
        await supabase.from('pinned_messages').delete().eq('id', oldest.id);
      }
    }

    const { data, error } = await supabase
      .from('pinned_messages')
      .upsert(
        {
          chat_jid,
          message_id,
          body: msgBody,
          media_type,
          media_url,
          sender_name,
          pinned_by,
          duration_type,
          pinned_at: new Date().toISOString(),
          expires_at: expiresAt,
        },
        { onConflict: 'chat_jid,message_id' }
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/pins?chat_jid=<jid>&message_id=<msgId>
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const chatJid = searchParams.get('chat_jid');
    const messageId = searchParams.get('message_id');

    if (!chatJid || !messageId) {
      return NextResponse.json({ error: 'chat_jid and message_id are required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from('pinned_messages')
      .delete()
      .eq('chat_jid', chatJid)
      .eq('message_id', messageId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

