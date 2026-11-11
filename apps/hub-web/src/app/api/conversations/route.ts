import { NextRequest, NextResponse } from 'next/server';
import { q } from '../../../lib/pg';
import { insertNotification } from '../../../lib/webhookHandlers/notify';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * م3 — وسيط المحادثات: الحالة والإسناد والوسوم من قاعدة البيانات الحقيقية.
 * (hub.* جداول حقيقية — public.* واجهات عرض)
 *
 * GET  /api/conversations?chat_jid=&instance=
 *        → { conversation, tags: [...] }
 *
 * PATCH /api/conversations
 *   { chat_jid, instance, status? }                    → تغيير الحالة (مع أوقات التصعيد/الحل)
 *   { chat_jid, instance, staff_id: uuid | null }      → إسناد / إلغاء إسناد (يفتح in_progress)
 *   { chat_jid, instance, mark_read: true }            → تصفير عدّاد غير المقروء
 *
 * POST /api/conversations
 *   { chat_jid, instance, tag_id, action: 'add' | 'remove' }  → وسم/إزالة وسم
 */

/** ضمان وجود صف المحادثة قبل أي كتابة (للمحادثات التي لم تُخزَّن رسائلها بعد) */
async function ensureConversation(chatJid: string, instance: string, title?: string): Promise<string | null> {
  const rows = await q<{ id: string }>(
    `with line as (
       select id from hub.lines where instance_name = $2 limit 1
     ), ins as (
       insert into hub.conversations (chat_jid, line_id, title, is_group)
       select $1, line.id, coalesce($3, split_part($1, '@', 1)), $1 like '%@g.us'
       from line
       on conflict (chat_jid, line_id) do nothing
       returning id
     )
     select id from ins
     union all
     select c.id from hub.conversations c
     join hub.lines l on l.id = c.line_id
     where c.chat_jid = $1 and l.instance_name = $2
     limit 1`,
    [chatJid, instance, title || null]
  );
  return rows[0]?.id ?? null;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const chatJid = searchParams.get('chat_jid') || '';
    const instance = searchParams.get('instance') || '';

    // وضع دفعات: ?jids=a,b,c&instances=Master,Sells_2 → وسوم وحالات عدة محادثات للقائمة
    const jidsParam = searchParams.get('jids');
    if (jidsParam) {
      const jids = jidsParam.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 300);
      const instances = (searchParams.get('instances') || '').split(',').map((s) => s.trim()).filter(Boolean);
      if (jids.length === 0 || instances.length === 0) {
        return NextResponse.json({ items: [] });
      }
      const items = await q(
        `select c.chat_jid, c.status, s.full_name as assigned_staff_name,
                coalesce(
                  json_agg(json_build_object('id', t.id, 'name', t.name_ar, 'color', t.color)
                    order by t.sort_order nulls last, t.name_ar)
                  filter (where t.id is not null), '[]'
                ) as tags
         from hub.conversations c
         join hub.lines l on l.id = c.line_id
         left join hub.staff s on s.id = c.assigned_staff_id
         left join hub.conversation_tags ct on ct.conversation_id = c.id
         left join hub.hub_tags t on t.id = ct.tag_id
         where c.chat_jid = any($1::text[]) and l.instance_name = any($2::text[])
         group by c.id, c.chat_jid, c.status, s.full_name`,
        [jids, instances]
      );
      return NextResponse.json({ items });
    }

    const convRows = await q<any>(
      `select c.id, c.chat_jid, c.status, c.assigned_staff_id, s.full_name as assigned_staff_name,
              c.unread_count, c.is_group, c.title, l.instance_name
       from hub.conversations c
       join hub.lines l on l.id = c.line_id
       left join hub.staff s on s.id = c.assigned_staff_id
       where c.chat_jid = $1 and l.instance_name = $2
       limit 1`,
      [chatJid, instance]
    );

    const conversation = convRows[0] || null;
    const tags = conversation
      ? await q(
          `select t.id, t.key, t.name_ar, t.color
           from hub.conversation_tags ct
           join hub.hub_tags t on t.id = ct.tag_id
           where ct.conversation_id = $1
           order by t.sort_order nulls last, t.name_ar`,
          [conversation.id]
        )
      : [];

    return NextResponse.json({ conversation, tags });
  } catch (err: any) {
    console.error('[conversations GET]', err?.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { chat_jid, instance, tag_id, action } = body;
    if (!chat_jid || !instance || !tag_id || !['add', 'remove'].includes(action)) {
      return NextResponse.json({ error: 'chat_jid, instance, tag_id, action(add|remove) required' }, { status: 400 });
    }

    const convId = await ensureConversation(chat_jid, instance);
    if (!convId) {
      return NextResponse.json({ error: 'line not found for instance' }, { status: 404 });
    }

    if (action === 'add') {
      await q(
        `insert into hub.conversation_tags (conversation_id, tag_id)
         values ($1, $2)
         on conflict (conversation_id, tag_id) do nothing`,
        [convId, tag_id]
      );
    } else {
      await q(
        `delete from hub.conversation_tags where conversation_id = $1 and tag_id = $2`,
        [convId, tag_id]
      );
    }

    const tags = await q(
      `select t.id, t.key, t.name_ar, t.color
       from hub.conversation_tags ct
       join hub.hub_tags t on t.id = ct.tag_id
       where ct.conversation_id = $1
       order by t.sort_order nulls last, t.name_ar`,
      [convId]
    );
    return NextResponse.json({ success: true, tags });
  } catch (err: any) {
    console.error('[conversations POST]', err?.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { chat_jid, instance } = body;
    if (!chat_jid || !instance) {
      return NextResponse.json({ error: 'chat_jid and instance required' }, { status: 400 });
    }

    const convId = await ensureConversation(chat_jid, instance);
    if (!convId) {
      return NextResponse.json({ error: 'line not found for instance' }, { status: 404 });
    }

    // ─── تصفير غير المقروء ───
    if (body.mark_read) {
      await q(`update hub.conversations set unread_count = 0 where id = $1`, [convId]);
    }

    // ─── الإسناد / إلغاء الإسناد ───
    if ('staff_id' in body) {
      const staffId = body.staff_id || null;
      await q(
        `update hub.conversations
         set assigned_staff_id = $2,
             status = case when $2::uuid is not null and status = 'open' then 'in_progress' else status end
         where id = $1`,
        [convId, staffId]
      );

      if (staffId) {
        // اسم المحادثة (جهة الاتصال) للإشعار — لا نذكر اسم الموظف المُسند إليه هنا (C11)
        const st = await q<{ full_name: string }>(`select full_name from hub.staff where id = $1`, [staffId]);
        const line = await q<{ title_ar: string }>(`select title_ar from hub.lines where instance_name = $1`, [instance]);
        const convName = await q<{ name: string | null }>(
          `select coalesce(nullif(c.display_name, ''), nullif(cv.title, '')) as name
           from hub.conversations cv
           left join hub.contacts c on c.id = cv.contact_id
           where cv.id = $1 limit 1`,
          [convId]
        );
        const who = convName[0]?.name || 'عميل';
        await insertNotification({
          staffId,
          kind: 'assignment',
          title: '📌 أُسندت إليك محادثة',
          body: `${who} — ${line[0]?.title_ar || instance}`,
          link: `/inbox?chat=${encodeURIComponent(chat_jid)}`,
          chatJid: chat_jid,
          instanceName: instance,
        });
      }
    }

    // ─── تغيير الحالة ───
    if (body.status) {
      const st = String(body.status);
      await q(
        `update hub.conversations
         set status = $2,
             escalated_at = case when $2 = 'escalated' then now() else escalated_at end,
             resolved_at  = case when $2 = 'resolved'  then now() else resolved_at  end,
             updated_at = now()
         where id = $1`,
        [convId, st]
      );

      // التصعيد يستدعي المشرفين — إشعار فوري عبر البنية العامة
      if (st === 'escalated') {
        await q(
          `insert into public.notifications (staff_id, kind, title, body, link, chat_jid, instance_name)
           select s.id, 'escalation', '🚨 محادثة مصعدة للإشراف', $2, $3, $4, $5
           from hub.staff s
           join hub.roles r on r.id = s.role_id
           where r.key in ('super_admin', 'supervisor') and s.status = 'active'`,
          [
            body.escalation_note || 'مصعدة يدوياً من صندوق المحادثات',
            `/inbox?chat=${encodeURIComponent(chat_jid)}`,
            chat_jid,
            instance,
          ]
        ).catch((e: Error) => console.warn('[escalation notify] non-critical:', e.message));
      }
    }

    // رد موحّد بالحالة النهائية
    const convRows = await q<any>(
      `select c.id, c.chat_jid, c.status, c.assigned_staff_id, s.full_name as assigned_staff_name,
              c.unread_count, l.instance_name
       from hub.conversations c
       join hub.lines l on l.id = c.line_id
       left join hub.staff s on s.id = c.assigned_staff_id
       where c.id = $1 limit 1`,
      [convId]
    );
    return NextResponse.json({ success: true, conversation: convRows[0] || null });
  } catch (err: any) {
    console.error('[conversations PATCH]', err?.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
