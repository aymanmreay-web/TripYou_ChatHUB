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
 * تحديث التسمية الداخلية للخط (title_ar) والحصة اليومية (daily_cap) بواسطة المدير
 * Body: { instance_name: string, title_ar: string, daily_cap?: number }
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, instance_name, title_ar, daily_cap } = body;

    if (!id && !instance_name) {
      return NextResponse.json({ error: 'مطلوب تحديد معرف الخط أو اسمه التقني' }, { status: 400 });
    }

    const updatePayload: Record<string, any> = {};

    // الحصة اليومية: تعديل مستقل مسموح بدون تغيير التسمية
    if (daily_cap !== undefined && daily_cap !== null) {
      const cap = Number(daily_cap);
      if (!Number.isFinite(cap) || cap < 0 || cap > 100000) {
        return NextResponse.json({ error: 'الحصة اليومية يجب أن تكون رقماً بين 0 و100000' }, { status: 400 });
      }
      updatePayload.daily_cap = Math.round(cap);
    }

    if (title_ar !== undefined) {
      if (!title_ar || !String(title_ar).trim()) {
        return NextResponse.json({ error: 'يرجى إدخال اسم الخط الداخلي' }, { status: 400 });
      }
      updatePayload.title_ar = String(title_ar).trim();
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: 'لا يوجد شيء لتحديثه' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    let query = supabase.from('lines').update(updatePayload);

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
            title_ar: updatePayload.title_ar || instance_name,
            daily_cap: updatePayload.daily_cap ?? 200,
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
      message: updatePayload.daily_cap !== undefined && !updatePayload.title_ar
        ? `تم تحديث الحصة اليومية إلى ${updatePayload.daily_cap} رسالة/يوم`
        : 'تم تحديث بيانات الخط بنجاح',
      line: data?.[0],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

