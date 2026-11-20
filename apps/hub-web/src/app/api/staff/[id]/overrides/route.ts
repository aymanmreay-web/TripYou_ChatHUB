import { NextResponse } from 'next/server';
import { q } from '../../../../../lib/pg';
import { requireAny, writeAudit, type Caller } from '../../../../../lib/serverAuth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * إدارة استثناءات الصلاحيات الفردية للموظف (سماح / منع خاص).
 * GET  /api/staff/[id]/overrides → جلب استثناءات الموظف وصلاحيات دوره وقائمة الصلاحيات
 * POST /api/staff/[id]/overrides → تعيين استثناء (allow / deny / default)
 */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const caller = await requireAny(req, ['staff.manage', 'roles.manage']);
  if (caller instanceof NextResponse) return caller;

  const staffId = params?.id;
  if (!staffId) {
    return NextResponse.json({ error: 'معرّف الموظف مطلوب' }, { status: 400 });
  }

  try {
    const staffRows = await q<{ id: string; full_name: string; email: string; role_id: string; role_key: string; role_title: string }>(
      `select s.id, s.full_name, s.email, s.role_id, coalesce(r.key, '') as role_key, coalesce(r.title_ar, r.key, '') as role_title
       from hub.staff s
       left join hub.roles r on r.id = s.role_id
       where s.id = $1 limit 1`,
      [staffId]
    );

    if (staffRows.length === 0) {
      return NextResponse.json({ error: 'الموظف غير موجود' }, { status: 404 });
    }

    const staffMember = staffRows[0];

    // صلاحيات الدور الأساسي
    const rolePermRows = await q<{ permission_key: string }>(
      `select permission_key from hub.role_permissions where role_id = $1`,
      [staffMember.role_id]
    );
    const rolePermissions = rolePermRows.map((r) => r.permission_key);

    // الاستثناءات الفردية المحفوظة
    const overrideRows = await q<{ permission_key: string; effect: 'allow' | 'deny'; reason: string | null }>(
      `select permission_key, effect, reason from hub.staff_permission_overrides where staff_id = $1 order by permission_key`,
      [staffId]
    );

    // قائمة كل الصلاحيات المتاحة في النظام مع أسمائها وأوصافها
    const allPerms = await q<{ key: string; grp: string; label_ar: string; desc_ar: string | null; super_only: boolean }>(
      `select key, grp, label_ar, desc_ar, super_only from hub.permissions order by grp, key`
    );

    return NextResponse.json({
      staff: staffMember,
      role_permissions: rolePermissions,
      overrides: overrideRows,
      all_permissions: allPerms,
    });
  } catch (err: any) {
    console.error('[staff overrides GET]', err?.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const caller = await requireAny(req, ['staff.manage', 'roles.manage']);
  if (caller instanceof NextResponse) return caller;

  const staffId = params?.id;
  if (!staffId) {
    return NextResponse.json({ error: 'معرّف الموظف مطلوب' }, { status: 400 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'صيغة البيانات غير صحيحة' }, { status: 400 });
  }

  // يمكن تمرير استثناء واحد أو مصفوفة استثناءات
  const items: Array<{ permission_key: string; effect: 'allow' | 'deny' | 'default'; reason?: string }> = Array.isArray(body?.overrides)
    ? body.overrides
    : body?.permission_key && body?.effect
    ? [{ permission_key: body.permission_key, effect: body.effect, reason: body.reason }]
    : [];

  if (items.length === 0) {
    return NextResponse.json({ error: 'لم يتم تحديد أي استثناءات للحفظ' }, { status: 400 });
  }

  try {
    // التحقق من صلاحيات super_only: لا يمنحها إلا super_admin
    const superPerms = new Set(
      (await q<{ key: string }>(`select key from hub.permissions where super_only = true`)).map((p) => p.key)
    );

    for (const item of items) {
      if (superPerms.has(item.permission_key) && !caller.isSuper) {
        return NextResponse.json(
          { error: `الصلاحية ${item.permission_key} محصورة بمدير النظام الأعلى فقط ولا يمكن استثناؤها` },
          { status: 403 }
        );
      }

      if (item.effect === 'default') {
        // حذف الاستثناء والعودة للوضع الافتراضي للدور
        await q(
          `delete from hub.staff_permission_overrides where staff_id = $1 and permission_key = $2`,
          [staffId, item.permission_key]
        );
      } else if (item.effect === 'allow' || item.effect === 'deny') {
        await q(
          `insert into hub.staff_permission_overrides (staff_id, permission_key, effect, reason, set_by, created_at)
           values ($1, $2, $3, $4, $5, now())
           on conflict (staff_id, permission_key) do update
           set effect = excluded.effect,
               reason = excluded.reason,
               set_by = excluded.set_by,
               created_at = now()`,
          [staffId, item.permission_key, item.effect, item.reason || null, caller.staffId]
        );
      }
    }

    await writeAudit(caller.staffId, 'staff.overrides.update', 'staff', staffId, { items });

    // إعادة الاستثناءات المحدثة
    const updated = await q<{ permission_key: string; effect: 'allow' | 'deny'; reason: string | null }>(
      `select permission_key, effect, reason from hub.staff_permission_overrides where staff_id = $1 order by permission_key`,
      [staffId]
    );

    return NextResponse.json({ ok: true, overrides: updated });
  } catch (err: any) {
    console.error('[staff overrides POST]', err?.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
