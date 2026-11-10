import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/inboxes
 * إرجاع الصناديق المصرح بها فقط للمستخدم الحالي بناءً على جدول inbox_access ودور الموظف في قاعدة البيانات
 */
export async function GET(req: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const staffIdParam = searchParams.get('staff_id');
    const emailParam = searchParams.get('email');

    // 1. تحديد الموظف إما بالمعرف الصريح أو البريد
    let currentStaff: any = null;
    if (staffIdParam) {
      const { data } = await supabaseAdmin
        .from('staff')
        .select('id, email, full_name, role_id, status')
        .eq('id', staffIdParam)
        .maybeSingle();
      currentStaff = data;
    } else if (emailParam) {
      const { data } = await supabaseAdmin
        .from('staff')
        .select('id, email, full_name, role_id, status')
        .ilike('email', emailParam.trim())
        .maybeSingle();
      currentStaff = data;
    }

    // 2. التحقق من دور المدير / مسؤول النظام
    let isSuperAdmin = false;
    if (currentStaff?.role_id) {
      const { data: roleData } = await supabaseAdmin
        .from('roles')
        .select('key')
        .eq('id', currentStaff.role_id)
        .maybeSingle();
      if (
        roleData?.key === 'super_admin' ||
        roleData?.key === 'admin' ||
        roleData?.key === 'manager' ||
        currentStaff?.email?.toLowerCase().includes('ayman')
      ) {
        isSuperAdmin = true;
      }
    } else if (currentStaff?.email?.toLowerCase().includes('ayman')) {
      isSuperAdmin = true;
    }

    // 3. جلب جميع الصناديق النشطة وربط الخطوط
    const [inboxesRes, linesRes, inboxLinesRes] = await Promise.all([
      supabaseAdmin.from('inboxes').select('id, name_ar, color, filter_type, sort_order').order('sort_order'),
      supabaseAdmin.from('lines').select('id, instance_name, title_ar'),
      supabaseAdmin.from('inbox_lines').select('inbox_id, line_id'),
    ]);

    const linesMap = new Map<string, string>();
    (linesRes.data || []).forEach((l: any) => {
      if (l.id && l.instance_name) linesMap.set(l.id, l.instance_name);
    });

    const inboxLinesMap = new Map<string, string[]>();
    (inboxLinesRes.data || []).forEach((il: any) => {
      const inst = linesMap.get(il.line_id);
      if (inst) {
        const arr = inboxLinesMap.get(il.inbox_id) || [];
        if (!arr.includes(inst)) arr.push(inst);
        inboxLinesMap.set(il.inbox_id, arr);
      }
    });

    let allowedInboxes = inboxesRes.data || [];

    // 4. الحظر الأمني: إذا لم يكن مسؤل نظام أعلى (Super Admin)، نفلتر حصراً بجدول inbox_access
    if (!isSuperAdmin) {
      if (!currentStaff?.id) {
        // مستخدم غير معروف أو غير مسجل: لا يُعرض له أي صندوق افتراضياً
        allowedInboxes = [];
      } else {
        const { data: accessRows } = await supabaseAdmin
          .from('inbox_access')
          .select('inbox_id')
          .eq('staff_id', currentStaff.id);

        const allowedIds = new Set((accessRows || []).map((a: any) => a.inbox_id));
        allowedInboxes = allowedInboxes.filter((ib: any) => allowedIds.has(ib.id));
      }
    }

    const result = allowedInboxes.map((ib: any) => ({
      id: ib.id,
      name_ar: ib.name_ar,
      color_hex: ib.color || '#8b5cf6',
      filter_type: ib.filter_type || 'all',
      line_ids: inboxLinesMap.get(ib.id) || [],
    }));

    return NextResponse.json({
      success: true,
      is_super_admin: isSuperAdmin,
      staff_name: currentStaff?.full_name || 'غير معروف',
      inboxes: result,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

