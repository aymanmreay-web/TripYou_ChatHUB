import { NextResponse } from 'next/server';
import { q } from '../../../../lib/pg';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * م6 — مؤشرات أداء الإدارة من الرسائل المخزنة حقيقةً في القاعدة.
 * تعمل منذ تفعيل ويب هوك التخزين (م0) — لا بيانات تاريخية قبله.
 *
 * GET /api/admin/kpis → {
 *   totals, staff_perf[], abandoned[], sla_breaches[], daily[14], lines[]
 * }
 */
export async function GET() {
  try {
    // ─── 1) إجماليات عامة ───
    const [totals] = await q<any>(
      `select
         (select count(*)::int from hub.conversations where created_at >= now() - interval '24 hours') as conversations_24h,
         (select count(*)::int from hub.conversations) as conversations_total,
         (select count(*)::int from hub.messages where direction = 'in' and created_at >= now() - interval '24 hours') as msgs_in_24h,
         (select count(*)::int from hub.messages where direction = 'out' and created_at >= now() - interval '24 hours') as msgs_out_24h,
         (select count(*)::int from hub.conversations where status = 'escalated') as escalated,
         (select count(*)::int from hub.conversations where status = 'resolved' and resolved_at >= now() - interval '24 hours') as resolved_24h,
         (select count(*)::int from hub.messages where is_auto = true and created_at >= now() - interval '24 hours') as auto_replies_24h`
    );

    // ─── 2) أداء الموظفين: متوسط زمن أول رد + نشاط آخر 7 أيام ───
    // أول رسالة صادرة بعد أول واردة لكل محادثة مسندة للموظف
    const staffPerf = await q<any>(
      `with first_in as (
         select m.conversation_id, m.sent_by, min(m.created_at) as at
         from hub.messages m
         where m.direction = 'in'
         group by m.conversation_id, m.sent_by
       ),
       first_out as (
         select m.conversation_id, m.sent_by, min(m.created_at) as at
         from hub.messages m
         where m.direction = 'out' and m.sent_by is not null
         group by m.conversation_id, m.sent_by
       ),
       fr as (
         select fo.sent_by as staff_id, fo.conversation_id,
                extract(epoch from (fo.at - fi.at)) as seconds
         from first_out fo
         join first_in fi on fi.conversation_id = fo.conversation_id and fi.sent_by = fo.sent_by and fi.at <= fo.at
       )
       select s.id, s.full_name, r.name_ar as role_name,
              count(distinct c.id) filter (where c.assigned_staff_id = s.id) as assigned_conversations,
              count(distinct c.id) filter (where c.assigned_staff_id = s.id and c.status = 'resolved') as resolved,
              count(distinct c.id) filter (where c.assigned_staff_id = s.id and c.status = 'escalated') as escalated,
              round(avg(fr.seconds) filter (where fr.seconds < 86400) / 60.0, 1) as avg_first_reply_min,
              count(m.id) filter (where m.direction = 'out' and m.created_at >= now() - interval '7 days') as msgs_out_7d
       from hub.staff s
       left join hub.roles r on r.id = s.role_id
       left join hub.conversations c on c.assigned_staff_id = s.id
       left join fr on fr.staff_id = s.id
       left join hub.messages m on m.sent_by = s.id
       where s.status = 'active'
       group by s.id, s.full_name, r.name_ar
       order by assigned_conversations desc
       limit 30`
    );

    // ─── 3) المحادثات المتروكة: آخر رسالة واردة بلا رد صادر لأكثر من ساعتين ───
    const abandoned = await q<any>(
      `select c.id, c.chat_jid, c.title, c.assigned_staff_id, s.full_name as assigned_staff_name,
              l.instance_name, c.last_message_text, c.last_customer_message_at
       from hub.conversations c
       join hub.lines l on l.id = c.line_id
       left join hub.staff s on s.id = c.assigned_staff_id
       where c.status not in ('resolved', 'cancelled')
         and c.last_customer_message_at is not null
         and c.last_customer_message_at < now() - interval '2 hours'
         and (
           c.last_message_at is null
           or c.last_message_at <= c.last_customer_message_at
           or not exists (
             select 1 from hub.messages m2
             where m2.conversation_id = c.id and m2.direction = 'out'
               and m2.created_at > c.last_customer_message_at
           )
         )
       order by c.last_customer_message_at asc
       limit 30`
    );

    // ─── 4) خرق SLA من تعريفات الحالات (وقت أطول من sla_minutes) ───
    const slaBreaches = await q<any>(
      `select c.id, c.chat_jid, c.title, c.status, l.instance_name,
              sd.sla_minutes, c.created_at,
              round(extract(epoch from (now() - c.created_at)) / 60.0)::int as waiting_min
       from hub.conversations c
       join hub.lines l on l.id = c.line_id
       join hub.status_definitions sd on lower(sd.code) = c.status and sd.sla_minutes > 0
       where c.status not in ('resolved')
         and c.created_at < now() - (sd.sla_minutes || ' minutes')::interval
       order by waiting_min desc
       limit 20`
    );

    // ─── 5) سلسلة 14 يوماً: وارد/صادر يومياً ───
    const daily = await q<any>(
      `select to_char(d.day, 'MM-DD') as day,
              coalesce(sum(case when m.direction = 'in' then 1 else 0 end), 0)::int as msgs_in,
              coalesce(sum(case when m.direction = 'out' then 1 else 0 end), 0)::int as msgs_out
       from generate_series(current_date - interval '13 days', current_date, interval '1 day') as d(day)
       left join hub.messages m on date_trunc('day', m.created_at) = d.day
       group by d.day order by d.day`
    );

    // ─── 6) حالة الخطوط الفعلية ───
    const lines = await q(
      `select l.instance_name, l.title_ar, l.status, l.daily_cap,
              (select count(*)::int from hub.messages m
                where m.line_id = l.id and m.direction = 'out'
                  and m.created_at >= date_trunc('day', now())) as sent_today
       from hub.lines l
       order by l.instance_name`
    );

    return NextResponse.json({
      totals,
      staff_perf: staffPerf,
      abandoned,
      sla_breaches: slaBreaches,
      daily,
      lines,
      generated_at: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[admin/kpis GET]', err?.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
