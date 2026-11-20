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

/** اسم كوكي رمز الجلسة (تكتبه الواجهة في lib/supabase.ts) — ليعمل fetch العادي وصور <img> دون Header */
export const AUTH_COOKIE = 'sb-access-token';

function readToken(req: Request): string {
  const header = req.headers.get('authorization') || '';
  if (header.toLowerCase().startsWith('bearer ')) return header.slice(7).trim();
  const cookie = req.headers.get('cookie') || '';
  const m = cookie.match(new RegExp('(?:^|;\\s*)' + AUTH_COOKIE + '=([^;]+)'));
  return m ? decodeURIComponent(m[1]) : '';
}

// ذاكرة قصيرة (20 ثانية) لتخفيف الاستعلامات عند توالي الطلبات؛ تغيّر الصلاحيات يسري خلال 20 ثانية كحد أقصى
const CACHE_MS = 20_000;
const cache = new Map<string, { at: number; caller: Caller | null }>();

export async function getCaller(req: Request): Promise<Caller | null> {
  const token = readToken(req);
  if (!token) return null;

  const hit = cache.get(token);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.caller;

  const caller = await loadCaller(token);
  cache.set(token, { at: Date.now(), caller });
  if (cache.size > 500) {
    Array.from(cache.entries()).forEach(([k, v]) => { if (Date.now() - v.at > CACHE_MS) cache.delete(k); });
  }
  return caller;
}

async function loadCaller(token: string): Promise<Caller | null> {
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

  // مدير النظام الأعلى يتجاوز الفحص دائماً (يشمل أي صلاحية تُضاف مستقبلاً)
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

export const can = (c: Caller, permission: string) => c.isSuper || c.permissions.has(permission);

const UNAUTH = () => NextResponse.json({ error: 'يجب تسجيل الدخول أولاً' }, { status: 401 });
const FORBID = (msg = 'لا تملك صلاحية تنفيذ هذا الإجراء') => NextResponse.json({ error: msg }, { status: 403 });

/** أي موظف نشط مسجَّل الدخول (للبيانات الشخصية: المفضلة، الإشعارات، التثبيت...) */
export async function requireStaff(req: Request): Promise<Caller | NextResponse> {
  const caller = await getCaller(req);
  return caller || UNAUTH();
}

/**
 * يُستخدم في بداية كل مسار:
 *   const g = await requirePermission(req, 'roles.manage');
 *   if (g instanceof NextResponse) return g;
 */
export async function requirePermission(req: Request, permission: string): Promise<Caller | NextResponse> {
  const caller = await getCaller(req);
  if (!caller) return UNAUTH();
  return can(caller, permission) ? caller : FORBID();
}

/** يكفي امتلاك واحدة من الصلاحيات */
export async function requireAny(req: Request, permissions: string[]): Promise<Caller | NextResponse> {
  const caller = await getCaller(req);
  if (!caller) return UNAUTH();
  return permissions.some((p) => can(caller, p)) ? caller : FORBID();
}

/** فحص صلاحية إضافية داخل المسار (حسب نوع الإجراء) — يعيد null إذا مسموح */
export function denyUnless(caller: Caller, permission: string): NextResponse | null {
  return can(caller, permission) ? null : FORBID();
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
