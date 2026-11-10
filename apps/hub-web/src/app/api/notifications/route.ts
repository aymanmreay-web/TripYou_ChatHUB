import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/notifications?staff_id= | ?email= [&limit=30]
 * قائمة إشعارات الموظف + عدّاد غير المقروء (للجرس).
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const staffId = searchParams.get('staff_id');
    const email = searchParams.get('email');
    const limit = Math.min(parseInt(searchParams.get('limit') || '30', 10) || 30, 100);

    const db = getSupabaseAdmin();
    let resolvedId = staffId;

    if (!resolvedId && email) {
      const { data: staff } = await db
        .from('staff')
        .select('id')
        .ilike('email', email)
        .maybeSingle();
      resolvedId = staff?.id || null;
    }
    if (!resolvedId) {
      return NextResponse.json({ notifications: [], unread: 0 });
    }

    const [listRes, countRes] = await Promise.all([
      db
        .from('notifications')
        .select('*')
        .eq('staff_id', resolvedId)
        .order('created_at', { ascending: false })
        .limit(limit),
      db
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('staff_id', resolvedId)
        .is('read_at', null),
    ]);

    return NextResponse.json({
      notifications: listRes.data || [],
      unread: countRes.count || 0,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, notifications: [], unread: 0 }, { status: 500 });
  }
}

/**
 * POST /api/notifications
 * body: { staff_id | email, id? , all?: true } — تعليم إشعار أو الكل كمقروء.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const db = getSupabaseAdmin();

    let staffId = body.staff_id;
    if (!staffId && body.email) {
      const { data: staff } = await db.from('staff').select('id').ilike('email', body.email).maybeSingle();
      staffId = staff?.id || null;
    }
    if (!staffId) {
      return NextResponse.json({ error: 'staff_id or email required' }, { status: 400 });
    }

    const now = new Date().toISOString();
    let query = db.from('notifications').update({ read_at: now }).eq('staff_id', staffId).is('read_at', null);
    if (body.id && !body.all) {
      query = db.from('notifications').update({ read_at: now }).eq('staff_id', staffId).eq('id', body.id);
    }
    const { error } = await query;
    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
