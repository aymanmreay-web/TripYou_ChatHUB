import { NextResponse } from 'next/server';
import { q } from '../../../../lib/pg';
import { evoFetch, EvolutionError } from '../../../../lib/evolution';
import { upsertGroupMeta, rebuildGroupMembers, extractParticipants } from '../../../../lib/groupsSync';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 300;

/**
 * مزامنة المجموعات من Evolution لكل الخطوط المفتوحة:
 * fetchAllGroups?getParticipants=true — metadata كاملة + المشاركون بأدوار الأدمن مباشرة
 * → upsert hub.whatsapp_groups + إعادة بناء hub.whatsapp_group_members لكل (مجموعة، خط).
 */
export async function POST() {
  try {
    const instances = await evoFetch<any[]>('/instance/fetchInstances');
    const open = (Array.isArray(instances) ? instances : []).filter(
      (i: any) => i?.connectionStatus === 'open' && i?.name
    );

    const results: any[] = [];
    let totalGroups = 0;
    let totalMembers = 0;

    for (const inst of open) {
      const name = String(inst.name);
      try {
        const groups = await evoFetch<any[]>(
          `/group/fetchAllGroups/${encodeURIComponent(name)}?getParticipants=true`
        );
        if (!Array.isArray(groups)) throw new EvolutionError('استجابة غير متوقعة من fetchAllGroups');
        let instMembers = 0;
        for (const g of groups) {
          const jid = await upsertGroupMeta(g, name);
          if (!jid) continue;
          const count = await rebuildGroupMembers(jid, name, extractParticipants(g), g?.owner);
          instMembers += count;
          totalGroups++;
        }
        totalMembers += instMembers;
        results.push({ instance: name, groups: groups.length, members: instMembers, ok: true });
      } catch (e: any) {
        results.push({ instance: name, ok: false, error: e?.message || 'فشل التزامن' });
      }
    }

    return NextResponse.json({ ok: true, groups: totalGroups, members: totalMembers, instances: results });
  } catch (err: any) {
    console.error('[groups sync]', err?.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
