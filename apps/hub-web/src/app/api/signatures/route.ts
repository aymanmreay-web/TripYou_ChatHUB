import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/signatures
 * استرجاع إعدادات التوقيع العامة وتواقيع الموظفين من قاعدة البيانات
 */
export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    // 1. جلب إعدادات التوقيع العامة
    const { data: globalConfig } = await supabase
      .from('signature_settings')
      .select('*')
      .eq('scope_type', 'system')
      .maybeSingle();

    // 2. جلب الموظفين الفعليين
    const { data: staffList } = await supabase
      .from('staff')
      .select('id, full_name, email, role_id, status, default_line_id');

    // 3. جلب التواقيع المخصصة للموظفين
    const { data: staffSignatures } = await supabase
      .from('staff_signatures')
      .select('*');

    // دمج الأدوار
    const { data: roles } = await supabase.from('roles').select('id, name_ar, key');
    const roleMap = new Map((roles || []).map((r: any) => [r.id, r.name_ar || r.key]));
    const sigMap = new Map((staffSignatures || []).map((s: any) => [s.staff_id, s]));

    // القسم الذي يعمل به الموظف (لتوقيع القسم — قرار المالك)
    const { data: deptRows } = await supabase
      .from('staff')
      .select('id, department_id, departments(title_ar)')
      .not('department_id', 'is', null);
    const deptMap = new Map((deptRows || []).map((d: any) => [d.id, d.departments?.title_ar || null]));

    const formattedStaff = (staffList || []).map((st: any) => {
        const department = deptMap.get(st.id) || null;
      const sig = sigMap.get(st.id);
      return {
        id: st.id,
        name: st.full_name || st.email,
        email: st.email,
        role: roleMap.get(st.role_id) || 'موظف',
        default_line: st.default_line_id || 'الرئيسي (Master)',
        department,
        allow_custom_edit: sig?.allow_custom_edit ?? true,
        can_disable_signature: sig?.can_disable_signature ?? false,
        custom_part1: sig?.custom_part1 || `*${st.full_name || 'الموظف'}* (${roleMap.get(st.role_id) || 'فريق العمل'})`,
        custom_part2: sig?.custom_part2 || 'قسم خدمة العملاء',
        custom_part3: sig?.custom_part3 || 'TripYou للسياحة والسفر ✈️',
        is_active: sig?.is_active ?? true,
      };
    });

    return NextResponse.json(
      {
        global: globalConfig || null,
        staff: formattedStaff,
      },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/signatures
 * حفظ إعدادات التوقيع العامة وتواقيع الموظفين في قاعدة البيانات
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await req.json();
    const { global, staff } = body;

    // 1. حفظ الإعدادات العامة
    if (global) {
      await supabase
        .from('signature_settings')
        .upsert(
          {
            scope_type: 'system',
            scope_id: 'default',
            part1_enabled: global.part1?.enabled ?? true,
            part1_label_ar: global.part1?.label_ar,
            part1_template: global.part1?.template,
            part1_editable_by: global.part1?.editable_by,
            part1_required: global.part1?.required ?? true,
            part2_enabled: global.part2?.enabled ?? true,
            part2_label_ar: global.part2?.label_ar,
            part2_template: global.part2?.template,
            part2_editable_by: global.part2?.editable_by,
            part2_required: global.part2?.required ?? false,
            part3_enabled: global.part3?.enabled ?? true,
            part3_label_ar: global.part3?.label_ar,
            part3_template: global.part3?.template,
            part3_editable_by: global.part3?.editable_by,
            part3_required: global.part3?.required ?? false,
            separator: global.separator || ' — ',
            send_mode: global.send_mode || 'always',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'scope_type,scope_id' }
        );
    }

    // 2. حفظ تواقيع الموظفين الفردية
    if (Array.isArray(staff)) {
      for (const st of staff) {
        if (!st.id) continue;
        await supabase
          .from('staff_signatures')
          .upsert(
            {
              staff_id: st.id,
              custom_part1: st.custom_part1,
              custom_part2: st.custom_part2,
              custom_part3: st.custom_part3,
              is_active: st.is_active ?? true,
              allow_custom_edit: st.allow_custom_edit ?? true,
              can_disable_signature: st.can_disable_signature ?? false,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'staff_id' }
          );
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

