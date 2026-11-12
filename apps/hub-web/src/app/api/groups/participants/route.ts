import { NextRequest, NextResponse } from 'next/server';
import { q } from '../../../../lib/pg';
import { evoFetch } from '../../../../lib/evolution';
import { rebuildGroupMembers, extractParticipants } from '../../../../lib/groupsSync';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * المشاركون الحيّون لمجموعة — يُستخدم في درج التفاصيل:
 * يختار خطاً لدينا عضواً في المجموعة، يجلب القائمة من Evolution،
 * يحدّث سجل الأعضاء لهذا الخط، ثم يرجع القائمة مُثراة بالأسماء من hub.contacts
 * وشارات خطوطنا (مطابقة بأرقام الهواتف فقط). عند تعذر الجلب يرجع السجل المحلي.
 */
export async function GET(req: NextRequest) {
  const jid = new URL(req.url).searchParams.get('group_jid') || '';
  if (!jid) return NextResponse.json({ error: 'group_jid مطلوب' }, { status: 400 });

  try {
    // أي خط لدينا عضو في هذه المجموعة (كل صفوف السجل مصدرها خطوطنا أصلاً)
    const instRows = await q<{ instance_name: string }>(
      `select distinct instance_name from hub.whatsapp_group_members where group_jid = $1 limit 1`,
      [jid]
    );
    const instance = instRows[0]?.instance_name || null;

    let liveFetched = false;
    if (instance) {
      try {
        const meta = await evoFetch<any>(
          `/group/participants/${encodeURIComponent(instance)}?groupJid=${encodeURIComponent(jid)}`
        );
        const parts = extractParticipants(meta);
        if (parts.length > 0) {
          await rebuildGroupMembers(jid, instance, parts, meta?.owner);
          liveFetched = true;
        }
      } catch (e: any) {
        console.warn('[groups participants] live fetch failed, falling back to DB:', e?.message);
      }
    }

    const rows = await q<any>(
      `select m.participant_jid, m.phone_number, m.participant_name, m.is_admin, m.is_super_admin,
              m.instance_name,
              c.display_name, c.avatar_url,
              (l.id is not null) as is_our_line,
              coalesce(l.title_ar, l.instance_name) as our_line_title
       from hub.whatsapp_group_members m
       left join hub.contacts c on m.phone_number is not null
         and c.wa_jid = m.phone_number || '@s.whatsapp.net'
       left join hub.lines l on l.instance_name = m.instance_name
         and l.phone_e164 is not null
         and m.phone_number = regexp_replace(l.phone_e164, '[^0-9]', '', 'g')
       where m.group_jid = $1
       order by m.is_super_admin desc, m.is_admin desc,
                coalesce(c.display_name, m.participant_name, m.participant_jid)`,
      [jid]
    );

    return NextResponse.json({
      found: liveFetched || rows.length > 0,
      live: liveFetched,
      instance_used: instance,
      participants: rows,
    });
  } catch (err: any) {
    console.error('[groups participants]', err?.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
