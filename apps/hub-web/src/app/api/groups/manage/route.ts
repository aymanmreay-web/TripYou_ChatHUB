import { NextRequest, NextResponse } from 'next/server';
import { q } from '../../../../lib/pg';
import { evoFetch, digitsOnly, EvolutionError } from '../../../../lib/evolution';
import {
  upsertGroupMeta,
  rebuildGroupMembers,
  extractParticipants,
  auditGroup,
} from '../../../../lib/groupsSync';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * مفتاح واحد لكل تحويلات المجموعات عبر Evolution API v2.3.7:
 * create | participants (add/remove/promote/demote) | subject | description | picture
 * | setting (announcement/locked) | invite_code | invite_revoke | invite_send | leave
 * ملاحظات النسخة الحية (من شيفرة v2.3.7 الرسمية):
 * - الصورة: POST updateGroupPicture بصورة نصية (رابط أو base64)
 * - الإعدادات: announcement/not_announcement و locked/unlocked (لا يوجد memberAddMode)
 * - المغادرة: DELETE leaveGroup — ولا يوجد deleteGroup في هذه النسخة (واتساب لا يسمح)
 * كل نجاح: تحديث القاعدة + سجل hub.audit_log. كل فشل: رسالة عربية واضحة + detail.
 */

type ManageBody = {
  action?: string;
  staff_id?: string;
  instance?: string;
  group_jid?: string;
  subject?: string;
  description?: string;
  numbers?: string[];
  promote?: boolean;
  op?: 'add' | 'remove' | 'promote' | 'demote';
  setting?: 'announcement' | 'locked';
  on?: boolean;
  image?: string;
  invite_description?: string;
};

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function POST(req: NextRequest) {
  let body: ManageBody;
  try {
    body = await req.json();
  } catch {
    return bad('جسم الطلب غير صالح');
  }

  const { action, staff_id, instance, group_jid } = body;
  if (!action) return bad('action مطلوب');
  if (!instance) return bad('مطلوب تحديد الخط (instance)');
  const enc = encodeURIComponent;

  try {
    switch (action) {
      case 'create': {
        const subject = String(body.subject || '').trim();
        const numbers = (Array.isArray(body.numbers) ? body.numbers : []).map(digitsOnly).filter(Boolean);
        if (!subject) return bad('اسم المجموعة مطلوب');
        if (numbers.length === 0) return bad('مطلوب رقم مشارك واحد على الأقل');
        const created = await evoFetch<any>(`/group/create/${enc(instance)}`, {
          method: 'POST',
          body: {
            subject,
            participants: numbers,
            ...(body.description ? { description: body.description } : {}),
            ...(body.promote ? { promoteParticipants: true } : {}),
          },
        });
        const jid = created?.id ? String(created.id) : '';
        if (jid.endsWith('@g.us')) {
          await upsertGroupMeta({ ...created, id: jid, size: created?.participants?.length || numbers.length }, instance);
          await rebuildGroupMembers(jid, instance, extractParticipants(created), created?.owner);
        }
        await auditGroup('group.create', jid || null, staff_id || null, { instance, subject });
        return NextResponse.json({ success: true, group_jid: jid, group: created });
      }

      case 'participants': {
        if (!group_jid) return bad('group_jid مطلوب');
        const op = body.op;
        if (!op || !['add', 'remove', 'promote', 'demote'].includes(op)) {
          return bad('op يجب أن يكون add|remove|promote|demote');
        }
        const numbers = (Array.isArray(body.numbers) ? body.numbers : []).map(digitsOnly).filter(Boolean);
        if (numbers.length === 0) return bad('مطلوب رقم واحد على الأقل');
        await evoFetch(`/group/updateParticipant/${enc(instance)}`, {
          method: 'POST',
          body: { groupJid: group_jid, action: op, participants: numbers },
        });
        // تحديث السجل من الحالة الحية
        let refreshed = 0;
        try {
          const meta = await evoFetch<any>(`/group/participants/${enc(instance)}?groupJid=${enc(group_jid)}`);
          const parts = extractParticipants(meta);
          if (parts.length > 0) refreshed = await rebuildGroupMembers(group_jid, instance, parts, meta?.owner);
        } catch (e: any) {
          console.warn('[groups manage participants] refresh non-critical:', e?.message);
        }
        await auditGroup(`group.participants.${op}`, group_jid, staff_id || null, { instance, numbers });
        return NextResponse.json({ success: true, participants: refreshed || undefined });
      }

      case 'subject': {
        if (!group_jid) return bad('group_jid مطلوب');
        const subject = String(body.subject || '').trim();
        if (!subject) return bad('اسم المجموعة مطلوب');
        await evoFetch(`/group/updateGroupSubject/${enc(instance)}`, {
          method: 'POST',
          body: { groupJid: group_jid, subject },
        });
        await q(`update hub.whatsapp_groups set subject = $2, synced_at = now() where group_jid = $1`, [
          group_jid,
          subject,
        ]);
        await auditGroup('group.subject', group_jid, staff_id || null, { instance, subject });
        return NextResponse.json({ success: true, subject });
      }

      case 'description': {
        if (!group_jid) return bad('group_jid مطلوب');
        const description = String(body.description ?? '');
        await evoFetch(`/group/updateGroupDescription/${enc(instance)}`, {
          method: 'POST',
          body: { groupJid: group_jid, description },
        });
        await q(`update hub.whatsapp_groups set description = $2, synced_at = now() where group_jid = $1`, [
          group_jid,
          description,
        ]);
        await auditGroup('group.description', group_jid, staff_id || null, { instance });
        return NextResponse.json({ success: true, description });
      }

      case 'picture': {
        if (!group_jid) return bad('group_jid مطلوب');
        const image = String(body.image || '').trim();
        if (!image) return bad('الصورة مطلوبة (رابط أو base64)');
        await evoFetch(`/group/updateGroupPicture/${enc(instance)}`, {
          method: 'POST',
          body: { groupJid: group_jid, image },
        });
        // جلب رابط الصورة الجديدة وتخزينه
        let pictureUrl: string | null = null;
        try {
          const pic = await evoFetch<any>(`/chat/fetchProfilePictureUrl/${enc(instance)}`, {
            method: 'POST',
            body: { number: group_jid },
          });
          pictureUrl = pic?.profilePictureUrl || pic?.profilePicUrl || null;
        } catch (e: any) {
          console.warn('[groups manage picture] fetch url non-critical:', e?.message);
        }
        await q(`update hub.whatsapp_groups set picture_url = $2, synced_at = now() where group_jid = $1`, [
          group_jid,
          pictureUrl,
        ]);
        await auditGroup('group.picture', group_jid, staff_id || null, { instance });
        return NextResponse.json({ success: true, picture_url: pictureUrl });
      }

      case 'setting': {
        if (!group_jid) return bad('group_jid مطلوب');
        const setting = body.setting;
        if (!setting || !['announcement', 'locked'].includes(setting)) {
          return bad('setting يجب أن يكون announcement|locked');
        }
        const on = body.on === true;
        // أسماء الأفعال في Evolution v2.3.7: announcement/not_announcement و locked/unlocked
        const evoAction =
          setting === 'announcement' ? (on ? 'announcement' : 'not_announcement') : on ? 'locked' : 'unlocked';
        await evoFetch(`/group/updateSetting/${enc(instance)}`, {
          method: 'POST',
          body: { groupJid: group_jid, action: evoAction },
        });
        if (setting === 'announcement') {
          await q(`update hub.whatsapp_groups set announcement = $2, synced_at = now() where group_jid = $1`, [
            group_jid,
            on,
          ]);
        } else {
          await q(`update hub.whatsapp_groups set restricted = $2, synced_at = now() where group_jid = $1`, [
            group_jid,
            on,
          ]);
        }
        await auditGroup(`group.setting.${evoAction}`, group_jid, staff_id || null, { instance, on });
        return NextResponse.json({ success: true, setting, on });
      }

      case 'invite_code': {
        if (!group_jid) return bad('group_jid مطلوب');
        const res = await evoFetch<any>(`/group/inviteCode/${enc(instance)}?groupJid=${enc(group_jid)}`);
        const code = res?.inviteCode || null;
        const url = res?.inviteUrl || (code ? `https://chat.whatsapp.com/${code}` : null);
        await q(
          `update hub.whatsapp_groups set invite_code = $2, invite_url = $3, synced_at = now() where group_jid = $1`,
          [group_jid, code, url]
        );
        return NextResponse.json({ success: true, invite_code: code, invite_url: url });
      }

      case 'invite_revoke': {
        if (!group_jid) return bad('group_jid مطلوب');
        const res = await evoFetch<any>(`/group/revokeInviteCode/${enc(instance)}`, {
          method: 'POST',
          body: { groupJid: group_jid },
        });
        await q(`update hub.whatsapp_groups set invite_code = null, invite_url = null where group_jid = $1`, [
          group_jid,
        ]);
        await auditGroup('group.invite_revoke', group_jid, staff_id || null, { instance });
        return NextResponse.json({ success: true, revoked: res?.revoked ?? true });
      }

      case 'invite_send': {
        if (!group_jid) return bad('group_jid مطلوب');
        const numbers = (Array.isArray(body.numbers) ? body.numbers : []).map(digitsOnly).filter(Boolean);
        if (numbers.length === 0) return bad('مطلوب رقم واحد على الأقل لإرسال الدعوة');
        await evoFetch(`/group/sendInvite/${enc(instance)}`, {
          method: 'POST',
          body: { groupJid: group_jid, description: String(body.invite_description || ''), numbers },
        });
        await auditGroup('group.invite_send', group_jid, staff_id || null, { instance, count: numbers.length });
        return NextResponse.json({ success: true, sent: numbers.length });
      }

      case 'leave': {
        if (!group_jid) return bad('group_jid مطلوب');
        await evoFetch(`/group/leaveGroup/${enc(instance)}`, {
          method: 'DELETE',
          body: { groupJid: group_jid },
        });
        await q(`delete from hub.whatsapp_group_members where group_jid = $1 and instance_name = $2`, [
          group_jid,
          instance,
        ]);
        // إن لم يعد لهذا المجموعة أي عضوية أو محادثة عندنا → حذف صف المجموعة
        const remain = await q<{ cnt: number; convs: number }>(
          `select (select count(*) from hub.whatsapp_group_members where group_jid = $1)::int as cnt,
                  (select count(*) from hub.conversations where chat_jid = $1)::int as convs`,
          [group_jid]
        );
        if ((remain[0]?.cnt || 0) === 0 && (remain[0]?.convs || 0) === 0) {
          await q(`delete from hub.whatsapp_groups where group_jid = $1`, [group_jid]);
        }
        await auditGroup('group.leave', group_jid, staff_id || null, { instance });
        return NextResponse.json({ success: true, left: true });
      }

      default:
        return bad(`action غير معروف: ${action}`);
    }
  } catch (err: any) {
    const status = err instanceof EvolutionError ? err.status || 502 : 500;
    console.error(`[groups manage ${action}]`, err?.message, err?.detail || '');
    return NextResponse.json(
      { error: err?.message || 'فشل تنفيذ العملية', detail: err?.detail },
      { status }
    );
  }
}
