/**
 * مساعدات مزامنة المجموعات مع القاعدة — مشتركة بين:
 * /api/groups/sync و /api/groups/participants و /api/groups/manage
 * المصدر: Evolution v2.3.7 — fetchAllGroups يمنح المشاركين بأدوار الأدمن مباشرة
 * (admin: 'admin' | 'superadmin'، وowner = المالك). الأرقام من phoneNumber عند توفرها.
 */
import { q } from './pg';
import { digitsOnly } from './evolution';

export function extractParticipants(meta: any): any[] {
  if (Array.isArray(meta)) return meta;
  if (Array.isArray(meta?.participants)) return meta.participants;
  return [];
}

/** upsert صف المجموعة في hub.whatsapp_groups من كائن مجموعة Baileys/Evolution */
export async function upsertGroupMeta(g: any, instance: string): Promise<string> {
  const jid = String(g?.id || '');
  if (!jid.endsWith('@g.us')) return '';
  const participants = extractParticipants(g);
  await q(
    `insert into hub.whatsapp_groups
       (group_jid, subject, picture_url, description, announcement, restricted, participant_count, line_instance, synced_at)
     values ($1,$2,$3,$4,$5,$6,$7,$8, now())
     on conflict (group_jid) do update set
       subject = excluded.subject,
       picture_url = coalesce(excluded.picture_url, hub.whatsapp_groups.picture_url),
       description = excluded.description,
       announcement = excluded.announcement,
       restricted = excluded.restricted,
       participant_count = excluded.participant_count,
       line_instance = excluded.line_instance,
       synced_at = now()`,
    [
      jid,
      String(g?.subject || 'مجموعة'),
      g?.pictureUrl || null,
      g?.desc || null,
      g?.announce === true,
      g?.restrict === true,
      Number(g?.size || participants.length) || participants.length || 0,
      instance,
    ]
  );
  return jid;
}

/** إعادة بناء أعضاء مجموعة لخط واحد (حذف ثم إدراج على دفعات آمنة الحجم) */
export async function rebuildGroupMembers(
  jid: string,
  instance: string,
  participants: any[],
  owner?: string | null
): Promise<number> {
  await q(`delete from hub.whatsapp_group_members where group_jid = $1 and instance_name = $2`, [jid, instance]);
  const rows: any[][] = [];
  for (const p of participants || []) {
    const pj = String(p?.id || '');
    if (!pj) continue;
    const isSuper = p?.admin === 'superadmin' || (!!owner && pj === String(owner));
    const isAdmin = p?.admin === 'admin' || isSuper;
    rows.push([
      jid,
      instance,
      pj,
      digitsOnly(p?.phoneNumber || p?.phone || '') || null,
      p?.notify || p?.name || null,
      isAdmin,
      isSuper,
    ]);
  }
  const CHUNK = 300; // 7 باراميترات × 300 = 2100 باراميتر — ضمن حدود pg
  let inserted = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const vals = chunk.map((_, r) => `($${r * 7 + 1},$${r * 7 + 2},$${r * 7 + 3},$${r * 7 + 4},$${r * 7 + 5},$${r * 7 + 6},$${r * 7 + 7})`);
    const params = chunk.flat();
    await q(
      `insert into hub.whatsapp_group_members
         (group_jid, instance_name, participant_jid, phone_number, participant_name, is_admin, is_super_admin)
       values ${vals.join(',')}
       on conflict (group_jid, instance_name, participant_jid) do update set
         phone_number = excluded.phone_number,
         participant_name = excluded.participant_name,
         is_admin = excluded.is_admin,
         is_super_admin = excluded.is_super_admin,
         updated_at = now()`,
      params
    );
    inserted += chunk.length;
  }
  return inserted;
}

/** سجل تدقيق موحد لكل عمليات المجموعات */
export async function auditGroup(
  action: string,
  groupJid: string | null,
  staffId: string | null,
  detail?: Record<string, unknown>
): Promise<void> {
  await q(
    `insert into hub.audit_log (actor_id, action, target_type, target_id, detail)
     values ($1, $2, 'whatsapp_group', $3, $4::jsonb)`,
    [staffId || null, action, groupJid, JSON.stringify(detail || {})]
  ).catch((e: Error) => console.warn('[auditGroup] non-critical:', e.message));
}
