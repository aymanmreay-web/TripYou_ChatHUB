import { NextRequest, NextResponse } from 'next/server';
import { q } from '../../../lib/pg';
import { notifyStaffIds, notifyRole, notifyAllActive } from '../../../lib/webhookHandlers/notify';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * بنية الإشعارات العامة (Generic Notifications Hub)
 *
 * GET /api/notifications?staff_id=|email= [&limit=30]
 *   → { notifications: [...], unread: n }
 *
 * POST /api/notifications
 *   action 'mark_read' (افتراضي): { staff_id|email, id? , all?: true }
 *   action 'create' (عام لأي ميزة مستقبلية أو n8n):
 *     {
 *       secret?: string,                    // مطلوب إن ضُبط WEBHOOK_SECRET (للمكالمات الخارجية)
 *       kind: string,                       // أي نص — الحقل حر بلا قيود
 *       title: string, body?, link?, chat_jid?, instance_name?,
 *       targets: { staff_id? | email? | staff_ids?: string[] | role?: string | all_active?: true }
 *     }
 *   أنواع مقترحة لا حاجة لتعديل مخطط: task_assigned, sla_warning, booking_created,
 *   payment_received, campaign_done, line_offline, system ...
 */

/** تعيين (email | staff_id) → معرف موظف من hub.staff */
async function resolveStaffId(body: { staff_id?: string; email?: string }): Promise<string | null> {
  if (body.staff_id) return body.staff_id;
  if (body.email) {
    const rows = await q<{ id: string }>(
      `select id from hub.staff where lower(email) = lower($1) limit 1`,
      [body.email.trim()]
    );
    return rows[0]?.id || null;
  }
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const staffIdParam = searchParams.get('staff_id');
    const email = searchParams.get('email');
    const limit = Math.min(parseInt(searchParams.get('limit') || '30', 10) || 30, 200);

    const staffId = await resolveStaffId({ staff_id: staffIdParam || undefined, email: email || undefined });
    if (!staffId) {
      return NextResponse.json({ notifications: [], unread: 0 });
    }

    const [list, unread] = await Promise.all([
      q(
        `select id, staff_id, kind, title, body, link, chat_jid, instance_name, read_at, created_at
         from public.notifications
         where staff_id = $1
         order by created_at desc
         limit $2`,
        [staffId, limit]
      ),
      q<{ c: number }>(
        `select count(*)::int c from public.notifications where staff_id = $1 and read_at is null`,
        [staffId]
      ),
    ]);

    return NextResponse.json({ notifications: list, unread: unread[0]?.c ?? 0 });
  } catch (err: any) {
    console.error('[notifications GET]', err?.message);
    return NextResponse.json({ error: err.message, notifications: [], unread: 0 }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // ─── الإنشاء (بنية عامة لأي مستقبل) ───
    if (body.action === 'create') {
      const secret = process.env.WEBHOOK_SECRET;
      if (secret && body.secret !== secret) {
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
      }
      if (!body.title || !body.kind) {
        return NextResponse.json({ error: 'kind and title are required' }, { status: 400 });
      }

      const t = body.targets || {};
      let delivered = 0;

      if (Array.isArray(t.staff_ids) && t.staff_ids.length > 0) {
        delivered = await notifyStaffIds(t.staff_ids, {
          kind: String(body.kind),
          title: String(body.title),
          body: body.body || undefined,
          link: body.link || undefined,
          chatJid: body.chat_jid || undefined,
          instanceName: body.instance_name || undefined,
        });
      } else if (t.role) {
        delivered = await notifyRole(String(t.role), {
          kind: String(body.kind),
          title: String(body.title),
          body: body.body || undefined,
          link: body.link || undefined,
          chatJid: body.chat_jid || undefined,
          instanceName: body.instance_name || undefined,
        });
      } else if (t.all_active) {
        delivered = await notifyAllActive({
          kind: String(body.kind),
          title: String(body.title),
          body: body.body || undefined,
          link: body.link || undefined,
          chatJid: body.chat_jid || undefined,
          instanceName: body.instance_name || undefined,
        });
      } else {
        const staffId = await resolveStaffId(t);
        if (!staffId) {
          return NextResponse.json({ error: 'targets required: staff_id | email | staff_ids[] | role | all_active' }, { status: 400 });
        }
        delivered = await notifyStaffIds([staffId], {
          kind: String(body.kind),
          title: String(body.title),
          body: body.body || undefined,
          link: body.link || undefined,
          chatJid: body.chat_jid || undefined,
          instanceName: body.instance_name || undefined,
        });
      }

      return NextResponse.json({ success: true, delivered });
    }

    // ─── التعليم كمقروء ───
    const staffId = await resolveStaffId(body);
    if (!staffId) {
      return NextResponse.json({ error: 'staff_id or email required' }, { status: 400 });
    }

    if (body.id && !body.all) {
      await q(`update public.notifications set read_at = now() where staff_id = $1 and id = $2 and read_at is null`, [staffId, body.id]);
    } else {
      await q(`update public.notifications set read_at = now() where staff_id = $1 and read_at is null`, [staffId]);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[notifications POST]', err?.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
