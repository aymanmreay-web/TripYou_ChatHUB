import { NextRequest, NextResponse } from 'next/server';
import { q, withClient } from '../../../lib/pg';
import { requirePermission, writeAudit } from '../../../lib/serverAuth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * قسم الأدوار والصلاحيات — كل المسارات محمية على الخادم:
 *
 * GET  /api/roles-matrix            (إدارة الأدوار أو إدارة الموظفين)
 * POST { role_id, permission_key, on }   (roles.manage) — تفعيل/إيقاف صلاحية لدور
 *   • دور مدير النظام الأعلى مقفل دائماً
 *   • الصلاحيات المحصورة (super_only) لا يمنحها إلا مدير النظام الأعلى
 *   • لا يمنح أحد صلاحية لا يملكها هو نفسه (منع تصعيد الصلاحيات)
 *   • كل تغيير يُسجَّل في سجل التدقيق
 * PUT  { action: dept_* }           (staff.manage) — إدارة الأقسام
 */

export async function GET(req: NextRequest) {
  // القراءة متاحة لمن يدير الأدوار أو يدير الموظفين (صفحة الموظفين تحتاج الأدوار والأقسام)
  let g = await requirePermission(req, 'roles.manage');
  if (g instanceof NextResponse && g.status === 403) g = await requirePermission(req, 'staff.manage');
  if (g instanceof NextResponse) return g;
  try {
    const [roles, permissions, matrix, departments] = await Promise.all([
      q(
        `select r.id, r.key, coalesce(r.title_ar, r.key) as title_ar,
                (select count(*)::int from hub.staff s where s.role_id = r.id and s.status = 'active') as staff_count
         from hub.roles r
         order by case r.key when 'super_admin' then 1 when 'sales_lead' then 2 else 3 end, r.key`
      ),
      q(
        `select p.key, p.grp, p.label_ar, coalesce(p.desc_ar, '') as desc_ar, p.super_only
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
    return NextResponse.json({ error: 'تعذر تحميل الأدوار والصلاحيات' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const g = await requirePermission(req, 'roles.manage');
  if (g instanceof NextResponse) return g;
  try {
    const body = await req.json();
    const { role_id, permission_key, on } = body;
    if (!role_id || !permission_key || typeof on !== 'boolean') {
      return NextResponse.json({ error: 'بيانات ناقصة: الدور والصلاحية والحالة مطلوبة' }, { status: 400 });
    }

    const role = await q<{ key: string; title_ar: string }>(
      `select key, coalesce(title_ar, key) as title_ar from hub.roles where id = $1`,
      [role_id]
    );
    if (!role[0]) return NextResponse.json({ error: 'الدور غير موجود' }, { status: 404 });

    // دور المدير الأعلى مقفل — يملك كل الصلاحيات بالبنية
    if (role[0].key === 'super_admin') {
      return NextResponse.json({ error: 'صلاحيات مدير النظام الأعلى كاملة دائماً ولا تُعدّل' }, { status: 400 });
    }

    const perm = await q<{ key: string; label_ar: string; super_only: boolean }>(
      `select key, label_ar, super_only from hub.permissions where key = $1`,
      [permission_key]
    );
    if (!perm[0]) return NextResponse.json({ error: 'الصلاحية غير موجودة' }, { status: 404 });

    // الصلاحيات المحصورة لا يتحكم بها إلا مدير النظام الأعلى
    if (perm[0].super_only && !g.isSuper) {
      return NextResponse.json({ error: 'هذه الصلاحية محصورة بمدير النظام الأعلى' }, { status: 403 });
    }
    // منع تصعيد الصلاحيات: لا تمنح ما لا تملكه
    if (on && !g.isSuper && !g.permissions.has(permission_key)) {
      return NextResponse.json({ error: 'لا يمكنك منح صلاحية لا تملكها أنت' }, { status: 403 });
    }

    if (on) {
      await q(
        `insert into hub.role_permissions (role_id, permission_key)
         values ($1, $2)
         on conflict (role_id, permission_key) do nothing`,
        [role_id, permission_key]
      );
    } else {
      await q(`delete from hub.role_permissions where role_id = $1 and permission_key = $2`, [role_id, permission_key]);
    }

    await writeAudit(g.staffId, on ? 'role_permission.grant' : 'role_permission.revoke', 'role', String(role_id), {
      role_key: role[0].key,
      role_title: role[0].title_ar,
      permission_key,
      permission_label: perm[0].label_ar,
      by: g.fullName,
    });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[roles-matrix POST]', err?.message);
    return NextResponse.json({ error: 'تعذر حفظ التغيير' }, { status: 500 });
  }
}

/**
 * إدارة الأقسام — تبويب «إدارة الشركة» (ربط الأقسام بالموظفين)
 */
export async function PUT(req: NextRequest) {
  const g = await requirePermission(req, 'staff.manage');
  if (g instanceof NextResponse) return g;
  try {
    const body = await req.json();
    const action = body.action;

    if (action === 'dept_create') {
      const title = String(body.title_ar || '').trim();
      if (!title) return NextResponse.json({ error: 'اسم القسم مطلوب' }, { status: 400 });
      const rows = await q<{ id: string }>(
        `insert into hub.departments (key, title_ar)
         values ($1, $2)
         on conflict (key) do update set title_ar = excluded.title_ar
         returning id`,
        [`dept_${Date.now().toString(36)}`, title]
      );
      await writeAudit(g.staffId, 'department.create', 'department', rows[0]?.id || '', { title_ar: title, by: g.fullName });
      return NextResponse.json({ success: true, id: rows[0]?.id });
    }

    if (action === 'dept_rename') {
      const title = String(body.title_ar || '').trim();
      if (!title) return NextResponse.json({ error: 'اسم القسم مطلوب' }, { status: 400 });
      const rows = await q(`update hub.departments set title_ar = $2 where id = $1 returning id`, [body.id, title]);
      if (!rows.length) return NextResponse.json({ error: 'القسم غير موجود' }, { status: 404 });
      await writeAudit(g.staffId, 'department.rename', 'department', String(body.id), { title_ar: title, by: g.fullName });
      return NextResponse.json({ success: true });
    }

    if (action === 'dept_delete') {
      // فك ارتباط الموظفين ثم الحذف داخل معاملة واحدة (إما الكل أو لا شيء)
      await withClient(async (client: any) => {
        await client.query('begin');
        try {
          await client.query(`update hub.staff set department_id = null where department_id = $1`, [body.id]);
          await client.query(`delete from hub.departments where id = $1`, [body.id]);
          await client.query('commit');
        } catch (e) {
          await client.query('rollback');
          throw e;
        }
      });
      await writeAudit(g.staffId, 'department.delete', 'department', String(body.id), { by: g.fullName });
      return NextResponse.json({ success: true });
    }

    if (action === 'dept_assign') {
      const ids: string[] = Array.isArray(body.staff_ids) ? body.staff_ids : [];
      if (!ids.length || !body.department_id) {
        return NextResponse.json({ error: 'اختر القسم والموظفين' }, { status: 400 });
      }
      await q(`update hub.staff set department_id = $2 where id = any($1::uuid[])`, [ids, body.department_id]);
      await writeAudit(g.staffId, 'department.assign', 'department', String(body.department_id), { staff_ids: ids, by: g.fullName });
      return NextResponse.json({ success: true });
    }

    if (action === 'dept_unassign') {
      await q(`update hub.staff set department_id = null where id = $1`, [body.staff_id]);
      await writeAudit(g.staffId, 'department.unassign', 'staff', String(body.staff_id), { by: g.fullName });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'إجراء غير معروف' }, { status: 400 });
  } catch (err: any) {
    console.error('[roles-matrix PUT]', err?.message);
    return NextResponse.json({ error: 'تعذر تنفيذ العملية' }, { status: 500 });
  }
}
