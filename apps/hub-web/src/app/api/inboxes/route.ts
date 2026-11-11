import { NextRequest, NextResponse } from 'next/server';
import { q } from '../../../lib/pg';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/inboxes
 * إرجاع الصناديق المصرح بها فقط للمستخدم الحالي بناءً على جدول inbox_access ودور الموظف في قاعدة البيانات.
 * تستخدم اتصال Postgres المباشر (q) — نفس نمط conversations/notifications —
 * لأن مفتاح الخدمة (getSupabaseAdmin) كان ميتاً ويُفشل الطلب بصمت فلا يرى الموظف صناديقه.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const staffIdParam = searchParams.get('staff_id');
    const emailParam = searchParams.get('email');

    // 1. تحديد الموظف إما بالمعرف الصريح أو البريد
    let currentStaff: {
      id: string;
      email: string | null;
      full_name: string;
      status: string;
      role_key: string | null;
    } | null = null;
    if (staffIdParam) {
      const rows = await q<any>(
        `select s.id, s.email, s.full_name, s.status, r.key as role_key
         from hub.staff s
         left join hub.roles r on r.id = s.role_id
         where s.id = $1::uuid limit 1`,
        [staffIdParam]
      );
      currentStaff = rows[0] || null;
    } else if (emailParam) {
      const rows = await q<any>(
        `select s.id, s.email, s.full_name, s.status, r.key as role_key
         from hub.staff s
         left join hub.roles r on r.id = s.role_id
         where lower(s.email) = lower($1) limit 1`,
        [emailParam.trim()]
      );
      currentStaff = rows[0] || null;
    }

    // 2. التحقق من دور المدير / مسؤول النظام
    const isSuperAdmin =
      currentStaff?.role_key === 'super_admin' ||
      currentStaff?.role_key === 'admin' ||
      currentStaff?.role_key === 'manager' ||
      !!currentStaff?.email?.toLowerCase().includes('ayman');

    // 3. جلب جميع الصناديق النشطة وربط خطوطها (أسماء النسخ كما في الواجهة)
    const allRows = await q<any>(
      `select i.id, i.name_ar, i.color, i.filter_type, i.sort_order,
              coalesce(array_agg(distinct l.instance_name) filter (where l.instance_name is not null), '{}') as line_instances
       from hub.inboxes i
       left join hub.inbox_lines il on il.inbox_id = i.id
       left join hub.lines l on l.id = il.line_id
       where coalesce(i.is_active, true)
       group by i.id
       order by i.sort_order nulls last, i.created_at`
    );

    // 4. الحظر الأمني: إذا لم يكن مسؤل نظام أعلى (Super Admin)، نفلتر حصراً بجدول inbox_access
    let allowed = allRows;
    if (!isSuperAdmin) {
      if (!currentStaff?.id) {
        // مستخدم غير معروف أو غير مسجل: لا يُعرض له أي صندوق افتراضياً
        allowed = [];
      } else {
        const accessRows = await q<{ inbox_id: string }>(
          `select inbox_id from hub.inbox_access where staff_id = $1::uuid`,
          [currentStaff.id]
        );
        const allowedIds = new Set(accessRows.map((a) => a.inbox_id));
        allowed = allRows.filter((ib: any) => allowedIds.has(ib.id));
      }
    }

    const result = allowed.map((ib: any) => ({
      id: ib.id,
      name_ar: ib.name_ar,
      color_hex: ib.color || '#8b5cf6',
      filter_type: ib.filter_type || 'all',
      line_ids: ib.line_instances || [],
    }));

    return NextResponse.json({
      success: true,
      is_super_admin: isSuperAdmin,
      staff_name: currentStaff?.full_name || 'غير معروف',
      inboxes: result,
    });
  } catch (err: any) {
    console.error('[inboxes GET]', err?.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
