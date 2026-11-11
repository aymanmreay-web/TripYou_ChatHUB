import { NextRequest, NextResponse } from 'next/server';
import { q } from '../../../lib/pg';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/lines
 * جلب كافة خطوط النظام مع أسمائها المعربة والمخصصة داخلياً (title_ar).
 * تستخدم اتصال Postgres المباشر (q) بدل مفتاح الخدمة الميت.
 */
export async function GET() {
  try {
    const rows = await q<any>(
      `select id, instance_name, title_ar, phone_e164, kind, status, daily_cap, is_locked
       from hub.lines
       order by created_at asc`
    );

    return NextResponse.json(
      { success: true, lines: rows },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    );
  } catch (err: any) {
    console.error('[lines GET]', err?.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * PATCH /api/lines
 * تحديث التسمية الداخلية للخط (title_ar) والحصة اليومية (daily_cap) بواسطة المدير
 * Body: { id?: string, instance_name?: string, title_ar?: string, daily_cap?: number }
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, instance_name, title_ar, daily_cap } = body;

    if (!id && !instance_name) {
      return NextResponse.json({ error: 'مطلوب تحديد معرف الخط أو اسمه التقني' }, { status: 400 });
    }

    const sets: string[] = [];
    const params: any[] = [];
    let p = 0;
    const add = (fragment: string, value: any) => {
      p += 1;
      sets.push(fragment.replace('$#', `$${p}`));
      params.push(value);
    };

    // الحصة اليومية: تعديل مستقل مسموح بدون تغيير التسمية
    if (daily_cap !== undefined && daily_cap !== null) {
      const cap = Number(daily_cap);
      if (!Number.isFinite(cap) || cap < 0 || cap > 100000) {
        return NextResponse.json({ error: 'الحصة اليومية يجب أن تكون رقماً بين 0 و100000' }, { status: 400 });
      }
      add('daily_cap = $#', Math.round(cap));
    }

    if (title_ar !== undefined) {
      if (!title_ar || !String(title_ar).trim()) {
        return NextResponse.json({ error: 'يرجى إدخال اسم الخط الداخلي' }, { status: 400 });
      }
      add('title_ar = $#', String(title_ar).trim());
    }

    if (sets.length === 0) {
      return NextResponse.json({ error: 'لا يوجد شيء لتحديثه' }, { status: 400 });
    }

    let updated: any[];
    if (id) {
      p += 1;
      updated = await q<any>(
        `update hub.lines set ${sets.join(', ')} where id = $${p}::uuid returning *`,
        [...params, id]
      );
    } else {
      p += 1;
      updated = await q<any>(
        `update hub.lines set ${sets.join(', ')} where instance_name = $${p} returning *`,
        [...params, instance_name]
      );
    }

    // إذا لم يكن الخط مسجلاً بعد في جدول lines، نقوم بإضافته فورياً
    if (!updated || updated.length === 0) {
      if (instance_name) {
        const inserted = await q<any>(
          `insert into hub.lines (instance_name, title_ar, daily_cap, status, kind)
           values ($1, $2, $3, 'connected', 'sales') returning *`,
          [instance_name, title_ar || instance_name, daily_cap ?? 200]
        );
        return NextResponse.json({ success: true, line: inserted[0] });
      }
    }

    return NextResponse.json({
      success: true,
      message:
        daily_cap !== undefined && title_ar === undefined
          ? `تم تحديث الحصة اليومية إلى ${daily_cap} رسالة/يوم`
          : 'تم تحديث بيانات الخط بنجاح',
      line: updated?.[0],
    });
  } catch (err: any) {
    console.error('[lines PATCH]', err?.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
