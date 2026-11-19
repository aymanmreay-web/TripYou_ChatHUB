import { NextRequest, NextResponse } from 'next/server';
import { supabase } from './supabase';
import { q } from './pg';

/**
 * التحقق من هوية المستدعي وصلاحياته على الخادم (لا يُعتمد على الواجهة وحدها).
 * الواجهة ترسل: Authorization: Bearer <access_token> (انظر lib/apiFetch.ts)
 */
export interface Caller {
  staffId: string;
  fullName: string;
  roleKey: string;
  isSuper: boolean;
  permissions: Set<string>;
}

export async function getCaller(req: NextRequest): Promise<Caller | null> {
  const header = req.headers.get('authorization') || '';
  const token = header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';
  if (!token) return null;

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;

  const rows = await q<{ id: string; full_name: string; role_key: string | null }>(
    `select s.id, s.full_name, r.key as role_key
       from hub.staff s
       left join hub.roles r on r.id = s.role_id
      where s.auth_user_id = $1 and s.status = 'active'
      limit 1`,
    [data.user.id]
  );
  const me = rows[0];
  if (!me) return null;

  const isSuper = me.role_key === 'super_admin';
  const perms = new Set<string>();

  if (isSuper) {
    (await q<{ key: string }>(`select key from hub.permissions`)).forEach((p) => perms.add(p.key));
  } else {
    (
      await q<{ permission_key: string }>(
        `select rp.permission_key from hub.staff s
           join hub.role_permissions rp on rp.role_id = s.role_id
          where s.id = $1`,
        [me.id]
      )
    ).forEach((p) => perms.add(p.permission_key));
    // الاستثناءات الفردية: المنع يغلب السماح
    const ovr = await q<{ permission_key: string; effect: string }>(
      `select permission_key, effect from hub.staff_permission_overrides where staff_id = $1`,
      [me.id]
    );
    ovr.filter((o) => o.effect === 'allow').forEach((o) => perms.add(o.permission_key));
    ovr.filter((o) => o.effect === 'deny').forEach((o) => perms.delete(o.permission_key));
  }

  return { staffId: me.id, fullName: me.full_name, roleKey: me.role_key || '', isSuper, permissions: perms };
}

/**
 * يُستخدم في بداية كل مسار:
 *   const g = await requirePermission(req, 'roles.manage');
 *   if (g instanceof NextResponse) return g;
 */
export async function requirePermission(
  req: NextRequest,
  permission: string
): Promise<Caller | NextResponse> {
  const caller = await getCaller(req);
  if (!caller) {
    return NextResponse.json({ error: 'يجب تسجيل الدخول أولاً' }, { status: 401 });
  }
  if (!caller.permissions.has(permission)) {
    return NextResponse.json({ error: 'لا تملك صلاحية تنفيذ هذا الإجراء' }, { status: 403 });
  }
  return caller;
}

/** تسجيل عملية في سجل التدقيق (لا يُفشل العملية الأصلية إذا تعذّر التسجيل) */
export async function writeAudit(
  actorId: string,
  action: string,
  targetType: string,
  targetId: string,
  detail: Record<string, unknown>
): Promise<void> {
  try {
    await q(
      `insert into hub.audit_log (actor_id, action, target_type, target_id, detail)
       values ($1, $2, $3, $4, $5::jsonb)`,
      [actorId, action, targetType, targetId, JSON.stringify(detail)]
    );
  } catch (e: any) {
    console.error('[audit]', e?.message);
  }
}
