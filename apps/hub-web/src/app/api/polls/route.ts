import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const EVOLUTION_URL = process.env.EVOLUTION_URL || 'https://evo.69.62.122.89.sslip.io';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || 'bc6075e9f95967407faae5d0fa9ac875a8d88a94782172db';

// GET /api/polls?poll_id=<id>&chat_jid=<jid>
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const pollId = searchParams.get('poll_id');
    const chatJid = searchParams.get('chat_jid');

    const supabase = getSupabaseAdmin();

    if (pollId) {
      const { data: poll, error } = await supabase
        .from('interactive_polls')
        .select('*')
        .eq('poll_id', pollId)
        .single();

      if (error && error.code !== 'PGRST116') {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // جلب الأصوات
      const { data: votes } = await supabase
        .from('interactive_poll_votes')
        .select('*')
        .eq('poll_id', pollId);

      return NextResponse.json({ poll: poll || null, votes: votes || [] });
    }

    if (chatJid) {
      const { data, error } = await supabase
        .from('interactive_polls')
        .select('*')
        .eq('chat_jid', chatJid)
        .order('created_at', { ascending: false });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ polls: data || [] });
    }

    return NextResponse.json({ error: 'poll_id or chat_jid required' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/polls - التصويت على خيار في الاستطلاع أو إنشاء استطلاع جديد
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;
    const supabase = getSupabaseAdmin();

    // 1. تسجيل تصويت
    if (action === 'vote') {
      const { poll_id, voter_jid = 'user_me', selected_options = [] } = body;
      if (!poll_id || !Array.isArray(selected_options)) {
        return NextResponse.json({ error: 'poll_id and selected_options array required' }, { status: 400 });
      }

      const { data, error } = await supabase
        .from('interactive_poll_votes')
        .upsert(
          {
            poll_id,
            voter_jid,
            selected_options,
            voted_at: new Date().toISOString(),
          },
          { onConflict: 'poll_id,voter_jid' }
        )
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // جلب كافة الأصوات لحساب التوزيع المحدّث
      const { data: allVotes } = await supabase
        .from('interactive_poll_votes')
        .select('selected_options')
        .eq('poll_id', poll_id);

      const optionCounts: Record<string, number> = {};
      (allVotes || []).forEach((v: any) => {
        (v.selected_options || []).forEach((opt: string) => {
          optionCounts[opt] = (optionCounts[opt] || 0) + 1;
        });
      });

      return NextResponse.json({
        success: true,
        vote: data,
        optionCounts,
        totalVotes: allVotes?.length || 0,
      });
    }

    // 2. إنشاء استطلاع وإرساله إلى واتساب عبر Evolution API
    if (action === 'create') {
      const {
        instanceName = 'Sells_2',
        chat_jid,
        question,
        options, // Array of strings: ['نعم', 'لا']
        selectableCount = 1,
      } = body;

      if (!chat_jid || !question || !options || options.length < 2) {
        return NextResponse.json(
          { error: 'chat_jid, question, and at least 2 options are required' },
          { status: 400 }
        );
      }

      // إرسال عبر Evolution API
      let evoMsgId = 'poll-' + Date.now();
      try {
        const evoRes = await fetch(`${EVOLUTION_URL}/message/sendPoll/${instanceName}`, {
          method: 'POST',
          headers: {
            apikey: EVOLUTION_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            number: chat_jid,
            name: question,
            values: options,
            selectableCount,
          }),
        });

        if (evoRes.ok) {
          const evoData = await evoRes.json();
          if (evoData?.key?.id) {
            evoMsgId = evoData.key.id;
          }
        }
      } catch (err: any) {
        console.warn('sendPoll evolution failed:', err?.message);
      }

      // حفظ في جدول interactive_polls
      const pollOptions = options.map((opt: string, i: number) => ({
        id: String(i + 1),
        text: opt,
        votes: 0,
      }));

      const { data: pollRecord, error: dbErr } = await supabase
        .from('interactive_polls')
        .upsert(
          {
            chat_jid,
            poll_id: evoMsgId,
            question,
            options: pollOptions,
            selectable_count: selectableCount,
            created_at: new Date().toISOString(),
          },
          { onConflict: 'poll_id' }
        )
        .select()
        .single();

      if (dbErr) {
        return NextResponse.json({ error: dbErr.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, poll: pollRecord });
    }

    return NextResponse.json({ error: 'Invalid action. Use vote or create' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

