import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

import { requireStaff } from '../../../lib/serverAuth';
export const dynamic = 'force-dynamic';


// GET /api/favorites?category=<cat>&search=<query>
export async function GET(req: NextRequest) {
  const auth = await requireStaff(req);
  if (auth instanceof NextResponse) return auth;
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const staffId = auth.staffId;

    const supabase = getSupabaseAdmin();
    let query = supabase
      .from('favorites')
      .select('*')
      .eq('staff_id', staffId)
      .order('created_at', { ascending: false });

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,subtitle.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/favorites - إضافة عنصر إلى المفضلة
export async function POST(req: NextRequest) {
  const auth = await requireStaff(req);
  if (auth instanceof NextResponse) return auth;
  try {
    const body = await req.json();
    const {
      category,
      item_id,
      title,
      subtitle = '',
      meta = {},
    } = body;
    const staff_id = auth.staffId;

    if (!category || !item_id || !title) {
      return NextResponse.json(
        { error: 'category, item_id, and title are required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('favorites')
      .upsert(
        {
          staff_id,
          category,
          item_id,
          title,
          subtitle,
          meta,
          created_at: new Date().toISOString(),
        },
        { onConflict: 'staff_id,category,item_id' }
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

// DELETE /api/favorites?id=<id> or ?category=<cat>&item_id=<id>
export async function DELETE(req: NextRequest) {
  const auth = await requireStaff(req);
  if (auth instanceof NextResponse) return auth;
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const category = searchParams.get('category');
    const itemId = searchParams.get('item_id');
    const staffId = auth.staffId;

    const supabase = getSupabaseAdmin();
    let query = supabase.from('favorites').delete();

    if (id) {
      query = query.eq('id', id);
    } else if (category && itemId) {
      query = query.eq('staff_id', staffId).eq('category', category).eq('item_id', itemId);
    } else {
      return NextResponse.json({ error: 'Missing id or category+item_id' }, { status: 400 });
    }

    const { error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

