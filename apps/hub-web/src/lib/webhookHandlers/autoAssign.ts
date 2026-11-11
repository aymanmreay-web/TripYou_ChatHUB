import { q } from '../pg';
import { insertNotification, getLineStaff } from './notify';

/**
 * التوزيع التلقائي للمحادثات الجديدة — سياسة مدمجة:
 * تجمع الموظفين محدد بتخصص الخط (line_access) والدوران دائري بالتساوي
 * عبر عدّاد لكل خط في app_settings.
 */
export interface AssignResult {
  assigned: boolean;
  staffId: string | null;
  staffName: string | null;
}

export async function tryAutoAssign(opts: {
  conversationId: string;
  lineId: string;
  instanceName: string;
  chatJid: string;
  contactName: string;
  isGroup: boolean;
}): Promise<AssignResult> {
  const notAssigned: AssignResult = { assigned: false, staffId: null, staffName: null };
  try {
    const settingsRows = await q<{ value: any }>(
      `select value from public.app_settings where key = 'auto_assignment' limit 1`
    );
    const settings = settingsRows[0]?.value || {};
    if (!settings.enabled) return notAssigned;
    if (opts.isGroup && settings.skip_groups !== false) return notAssigned;

    // المحادثة مسندة مسبقاً؟ لا نلمسها
    const conv = await q<{ assigned_staff_id: string | null }>(
      `select assigned_staff_id from hub.conversations where id = $1 limit 1`,
      [opts.conversationId]
    );
    if (conv[0]?.assigned_staff_id) return notAssigned;

    const pool = await getLineStaff(opts.lineId);
    if (pool.length === 0) return notAssigned;

    // العدّاد الدائري لكل خط (ضمن كائن واحد للتقليل من الاصطدامات)
    const stateRows = await q<{ value: any }>(
      `select value from public.app_settings where key = 'auto_assignment_state' limit 1`
    );
    const state = stateRows[0]?.value || { counters: {} };
    const counters = state.counters || {};
    const prev = Number(counters[opts.lineId] ?? -1);
    const next = (prev + 1) % pool.length;
    const chosen = pool[next];

    counters[opts.lineId] = next;
    await q(
      `insert into public.app_settings (key, value) values ('auto_assignment_state', $1::jsonb)
       on conflict (key) do update set value = $1::jsonb, updated_at = now()`,
      [JSON.stringify({ counters })]
    );

    await q(
      `update hub.conversations
       set assigned_staff_id = $2, status = 'in_progress'
       where id = $1 and assigned_staff_id is null`,
      [opts.conversationId, chosen.id]
    );

    await insertNotification({
      staffId: chosen.id,
      kind: 'assignment',
      title: '📌 أُسندت إليك محادثة جديدة',
      body: `${opts.contactName} — خط ${opts.instanceName}`,
      link: `/inbox?chat=${encodeURIComponent(opts.chatJid)}`,
      chatJid: opts.chatJid,
      instanceName: opts.instanceName,
    });

    return { assigned: true, staffId: chosen.id, staffName: chosen.full_name };
  } catch (err) {
    console.warn('[autoAssign] non-critical:', (err as Error).message);
    return notAssigned;
  }
}
