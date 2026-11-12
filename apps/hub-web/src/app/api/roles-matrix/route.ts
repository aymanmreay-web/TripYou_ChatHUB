import { NextRequest, NextResponse } from 'next/server';
import { q } from '../../../lib/pg';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * B4 — قسم الأدوار والصلاحيات (موسع ومربوط بالقاعدة):
 *
 * GET  /api/roles-matrix
 *   → { roles: [... مع عدد الموظفين], permissions: [... مصنفة بالمسارات],
 *       matrix: [{role_id, permission_key}], departments: [... مع عدد الموظفين] }
 *
 * POST { role_id, permission_key, on: boolean }
 *   → تشغيل/إيقاف صلاحية لدور (role_permissions) — دور المدير مقفل دائماً (يملك كل شيء)
 */

export async function GET() {
  try {
    const [roles, permissions, matrix, departments] = await Promise.all([
      q(
        `select r.id, r.key, coalesce(r.title_ar, r.key) as title_ar,
                (select count(*)::int from hub.staff s where s.role_id = r.id and s.status = 'active') as staff_count
         from hub.roles r
         order by case r.key when 'super_admin' then 1 when 'sales_lead' then 2 else 3 end, r.key`
      ),
      q(
        `select p.key, p.grp, p.label_ar, p.super_only
         from hub.permissions p
         order by p.grp, p.key`
      ),
      q(`select role_id, permission_key from hub.role_permissions`),
      q(
        `select d.id, d.key, d.title_ar,
                (select count(*)::int from hub.staff s where s.department_id = d.id) as staff_count
         from hub.departments d
         order by d.title_ar`
      ),
    ]);
    return NextResponse.json({ roles, permissions, matrix, departments });
  } catch (err: any) {
    console.error('[roles-matrix GET]', err?.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { role_id, permission_key, on } = body;
    if (!role_id || !permission_key || typeof on !== 'boolean') {
      return NextResponse.json({ error: 'role_id, permission_key, on required' }, { status: 400 });
    }

    // دور المدير مقفل — يملك كل الصلاحيات بالبنية
    const role = await q<{ key: string }>(`select key from hub.roles where id = $1`, [role_id]);
    if (role[0]?.key === 'super_admin') {
      return NextResponse.json({ error: 'صلاحيات المدير كاملة دائماً ولا تُعدل' }, { status: 400 });
    }

    if (on) {
      await q(
        `insert into hub.role_permissions (role_id, permission_key)
         values ($1, $2)
         on conflict (role_id, permission_key) do nothing`,
        [role_id, permission_key]
      );
    } else {
      await q(
        `delete from hub.role_permissions where role_id = $1 and permission_key = $2`,
        [role_id, permission_key]
      );
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[roles-matrix POST]', err?.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
