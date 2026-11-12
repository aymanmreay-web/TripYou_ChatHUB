import { NextResponse } from 'next/server';
import { q } from '../../../lib/pg';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * عرض إدارة المجموعات — كله من القاعدة:
 * المجموعات (hub.whatsapp_groups) + خطوطنا العضو بشارة 👑 الأدمن
 * (مطابقة أعضاء whatsapp_group_members بأرقام الهواتف فقط — آمن ضد معرفات @lid)
 * + fallback عضوية من المحادثات إن غاب الرقم + عدد طلبات الانضمام المعلقة لكل مجموعة.
 */
export async function GET() {
  try {
    const groups = await q<any>(
      `select g.group_jid, g.subject, g.picture_url, g.description, g.announcement, g.restricted,
              g.participant_count, g.invite_code, g.invite_url, g.synced_at, g.line_instance,
              c.display_name, c.avatar_url
       from hub.whatsapp_groups g
       left join hub.contacts c on c.wa_jid = g.group_jid
       order by coalesce(c.display_name, g.subject)`
    );

    // خطوطنا العضو — من سجل الأعضاء المطابق بأرقام الهواتف (يمنح شارة الأدمن)
    const rosterRows = await q<any>(
      `select m.group_jid, m.instance_name, m.is_admin, m.is_super_admin,
              l.id as line_id, coalesce(l.title_ar, l.instance_name) as line_title,
              l.phone_e164, l.status
       from hub.whatsapp_group_members m
       join hub.lines l on l.instance_name = m.instance_name
         and l.phone_e164 is not null
         and m.phone_number = regexp_replace(l.phone_e164, '[^0-9]', '', 'g')
       order by m.is_super_admin desc, m.is_admin desc`
    );

    // fallback: عضوية من المحادثات (للخطوط التي لم يتوفر رقمها في سجل الأعضاء)
    const convRows = await q<any>(
      `select distinct cv.chat_jid, l.instance_name, l.id as line_id,
              coalesce(l.title_ar, l.instance_name) as line_title, l.phone_e164, l.status
       from hub.conversations cv
       join hub.lines l on l.id = cv.line_id
       where cv.is_group = true`
    );

    const pending = await q<any>(
      `select chat_jid, count(*)::int as cnt
       from hub.line_send_requests
       where type = 'group_join' and status = 'pending' and chat_jid is not null
       group by chat_jid`
    );

    const pendingMap = new Map<string, number>(pending.map((p: any) => [p.chat_jid, p.cnt]));
    const convMap = new Map<string, any[]>();
    for (const r of convRows) {
      if (!convMap.has(r.chat_jid)) convMap.set(r.chat_jid, []);
      convMap.get(r.chat_jid)!.push(r);
    }

    const data = groups.map((g: any) => {
      const roster = rosterRows.filter((r: any) => r.group_jid === g.group_jid);
      const rosterInstances = new Set(roster.map((r: any) => r.instance_name));
      const convMembers = (convMap.get(g.group_jid) || []).filter(
        (r: any) => !rosterInstances.has(r.instance_name)
      );
      return {
        ...g,
        our_lines: roster
          .map((r: any) => ({ ...r, source: 'roster' }))
          .concat(
            convMembers.map((r: any) => ({
              ...r,
              is_admin: false,
              is_super_admin: false,
              source: 'conversation',
            }))
          ),
        pending_join: pendingMap.get(g.group_jid) || 0,
      };
    });

    return NextResponse.json({ groups: data });
  } catch (err: any) {
    console.error('[groups GET]', err?.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
