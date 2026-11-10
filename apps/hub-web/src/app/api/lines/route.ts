import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/lines
 * جلب كافة خطوط النظام مع أسمائها المعربة والمخصصة داخلياً (title_ar)
 */
export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('lines')
      .select('id, instance_name, title_ar, phone_e164, kind, status, daily_cap, is_locked')
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      lines: data || [],
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * PATCH /api/lines
 * تحديث التسمية الداخلية للخط (title_ar) بواسطة المدير
 * Body: { instance_name: string, title_ar: string } أو { id: string, title_ar: string }
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, instance_name, title_ar } = body;

    if (!title_ar || !title_ar.trim()) {
      return NextResponse.json({ error: 'يرجى إدخال اسم الخط الداخلي' }, { status: 400 });
    }

    if (!id && !instance_name) {
      return NextResponse.json({ error: 'مطلوب تحديد معرف الخط أو اسمه التقني' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const trimmedTitle = title_ar.trim();

    let query = supabase.from('lines').update({
      title_ar: trimmedTitle,
    });

    if (id) {
      query = query.eq('id', id);
    } else if (instance_name) {
      query = query.eq('instance_name', instance_name);
    }

    const { data, error } = await query.select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // إذا لم يكن الخط مسجلاً بعد في جدول lines، نقوم بإضافته فورياً (upsert)
    if (!data || data.length === 0) {
      if (instance_name) {
        const { data: inserted, error: insertErr } = await supabase
          .from('lines')
          .insert({
            instance_name,
            title_ar: trimmedTitle,
            status: 'connected',
            kind: 'sales',
          })
          .select();

        if (insertErr) {
          return NextResponse.json({ error: insertErr.message }, { status: 500 });
        }
        return NextResponse.json({ success: true, line: inserted?.[0] });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'تم تحديث اسم الخط الداخلي بنجاح',
      line: data?.[0],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

