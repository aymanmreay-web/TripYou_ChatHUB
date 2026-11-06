import { supabase } from './supabase';

/**
 * طبقة الوصول لبيانات الإدارة (الصناديق، هوية الشركة، الوسوم، الحالات).
 * كل دالة ترمي Error برسالة واضحة عند أي فشل — لا يُبتلع أي خطأ.
 */

const errMsg = (e: any): string => (e?.message as string) || 'تعذّر الاتصال بقاعدة البيانات';

function check<T>(res: { data: T | null; error: any }): T {
  if (res.error) throw new Error(errMsg(res.error));
  return res.data as T;
}

/* ───────────────────────── الخطوط ───────────────────────── */

export interface LineOption {
  id: string;
  name: string;
}

export async function fetchLines(): Promise<LineOption[]> {
  const rows = check(
    await supabase.from('lines').select('id, instance_name, title_ar').order('created_at')
  ) as any[];
  return (rows ?? []).map((l) => ({ id: l.id, name: l.title_ar || l.instance_name }));
}

/* ───────────────────────── الصناديق ───────────────────────── */

export interface InboxRow {
  id: string;
  name_ar: string;
  description: string;
  color_hex: string;
  filter_type: 'all' | 'dm' | 'groups';
  line_ids: string[];
  staff_count: number;
}

export async function fetchInboxes(): Promise<InboxRow[]> {
  const [ib, il, ia] = await Promise.all([
    supabase.from('inboxes').select('*').order('sort_order').order('created_at'),
    supabase.from('inbox_lines').select('inbox_id, line_id'),
    supabase.from('inbox_access').select('inbox_id'),
  ]);
  const inboxes = check(ib) as any[];
  const links = check(il) as any[];
  const access = check(ia) as any[];

  return (inboxes ?? []).map((r) => ({
    id: r.id,
    name_ar: r.name_ar,
    description: r.description || '',
    color_hex: r.color || '#8b5cf6',
    filter_type: (r.filter_type || 'all') as InboxRow['filter_type'],
    line_ids: (links ?? []).filter((x) => x.inbox_id === r.id).map((x) => x.line_id),
    staff_count: (access ?? []).filter((x) => x.inbox_id === r.id).length,
  }));
}

export async function saveInbox(inbox: InboxRow, isNew: boolean, nextSortOrder = 0): Promise<void> {
  const payload = {
    name_ar: inbox.name_ar.trim(),
    description: inbox.description,
    color: inbox.color_hex,
    filter_type: inbox.filter_type,
  };

  let inboxId = inbox.id;
  if (isNew) {
    const row = check(
      await supabase
        .from('inboxes')
        .insert({ ...payload, key: `inbox_${Date.now().toString(36)}`, sort_order: nextSortOrder })
        .select('id')
        .single()
    ) as any;
    inboxId = row.id;
  } else {
    const rows = check(
      await supabase.from('inboxes').update(payload).eq('id', inbox.id).select('id')
    ) as any[];
    if (!rows || rows.length === 0) throw new Error('لم يتم العثور على الصندوق أو لا تملك صلاحية تعديله');
  }

  // مزامنة الخطوط التابعة
  check(await supabase.from('inbox_lines').delete().eq('inbox_id', inboxId).select('inbox_id'));
  if (inbox.line_ids.length > 0) {
    check(
      await supabase
        .from('inbox_lines')
        .insert(inbox.line_ids.map((line_id) => ({ inbox_id: inboxId, line_id })))
        .select('inbox_id')
    );
  }
}

export async function deleteInbox(id: string): Promise<void> {
  check(await supabase.from('inboxes').delete().eq('id', id).select('id'));
}

/* ───────────────────────── هوية الشركة ───────────────────────── */

export interface CompanyRow {
  company_name: string;
  platform_title: string;
  logo_url: string | null;
  support_email: string;
  support_phone: string;
}

export async function fetchCompany(): Promise<CompanyRow | null> {
  const r = check(await supabase.from('company_settings').select('*').eq('id', 1).maybeSingle()) as any;
  if (!r) return null;
  return {
    company_name: r.company_name || '',
    platform_title: r.platform_name || '',
    logo_url: r.logo_url || null,
    support_email: r.contact_email || '',
    support_phone: r.contact_phone || '',
  };
}

export async function saveCompany(c: CompanyRow): Promise<void> {
  const rows = check(
    await supabase
      .from('company_settings')
      .update({
        company_name: c.company_name,
        platform_name: c.platform_title,
        logo_url: c.logo_url,
        contact_email: c.support_email,
        contact_phone: c.support_phone,
      })
      .eq('id', 1)
      .select('id')
  ) as any[];
  if (!rows || rows.length === 0) throw new Error('تعذّر حفظ إعدادات الشركة');
}

export async function uploadLogo(file: File): Promise<string> {
  const ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '');
  const path = `logo-${Date.now()}.${ext || 'png'}`;
  const { error } = await supabase.storage
    .from('branding')
    .upload(path, file, { upsert: true, contentType: file.type || undefined });
  if (error) throw new Error(errMsg(error));
  return supabase.storage.from('branding').getPublicUrl(path).data.publicUrl;
}

/* ───────────────────────── الوسوم ───────────────────────── */

export interface TagRow {
  id: string;
  name: string;
  hex_color: string;
  count: number;
}

export async function fetchTags(): Promise<TagRow[]> {
  const [tg, ct] = await Promise.all([
    supabase.from('hub_tags').select('*').neq('kind', 'whatsapp').order('sort_order').order('created_at'),
    supabase.from('conversation_tags').select('tag_id'),
  ]);
  const tags = check(tg) as any[];
  const used = check(ct) as any[];
  return (tags ?? []).map((t) => ({
    id: t.id,
    name: t.name_ar,
    hex_color: t.color || '#8b5cf6',
    count: (used ?? []).filter((u) => u.tag_id === t.id).length,
  }));
}

export async function createTag(name: string, hex: string, sortOrder = 0): Promise<void> {
  check(
    await supabase
      .from('hub_tags')
      .insert({ key: `tag_${Date.now().toString(36)}`, name_ar: name.trim(), color: hex, kind: 'custom', sort_order: sortOrder })
      .select('id')
  );
}

export async function updateTag(id: string, name: string, hex: string): Promise<void> {
  const rows = check(
    await supabase.from('hub_tags').update({ name_ar: name.trim(), color: hex }).eq('id', id).select('id')
  ) as any[];
  if (!rows || rows.length === 0) throw new Error('الوسم غير موجود');
}

export async function deleteTag(id: string): Promise<void> {
  check(await supabase.from('hub_tags').delete().eq('id', id).select('id'));
}

/* ───────────────────────── الحالات ───────────────────────── */

export interface StatusRow {
  key: string; // code بحروف صغيرة
  title_ar: string;
  title_en: string; // code
  description_ar: string;
  hex_color: string;
  sla_max_minutes: number;
  ordinal: number;
  is_custom: boolean;
}

export async function fetchStatuses(): Promise<StatusRow[]> {
  const rows = check(await supabase.from('status_definitions').select('*').order('sort_order')) as any[];
  return (rows ?? []).map((s) => ({
    key: String(s.code).toLowerCase(),
    title_ar: s.title_ar,
    title_en: s.code,
    description_ar: s.description || '',
    hex_color: s.color || '#64748b',
    sla_max_minutes: s.sla_minutes ?? 0,
    ordinal: s.sort_order,
    is_custom: !s.is_system,
  }));
}

export async function saveStatus(s: StatusRow, isNew: boolean): Promise<void> {
  const code = s.key.toUpperCase();
  const payload = {
    title_ar: s.title_ar.trim(),
    description: s.description_ar,
    color: s.hex_color,
    sla_minutes: s.sla_max_minutes > 0 ? s.sla_max_minutes : null,
    sort_order: s.ordinal,
  };
  if (isNew) {
    check(await supabase.from('status_definitions').insert({ ...payload, code, is_system: false }).select('id'));
  } else {
    const rows = check(
      await supabase.from('status_definitions').update(payload).eq('code', code).select('id')
    ) as any[];
    if (!rows || rows.length === 0) throw new Error('الحالة غير موجودة');
  }
}

export async function deleteStatus(key: string): Promise<void> {
  check(
    await supabase.from('status_definitions').delete().eq('code', key.toUpperCase()).eq('is_system', false).select('id')
  );
}

export async function reorderStatuses(list: StatusRow[]): Promise<void> {
  const results = await Promise.all(
    list.map((s) =>
      supabase.from('status_definitions').update({ sort_order: s.ordinal }).eq('code', s.key.toUpperCase())
    )
  );
  const failed = results.find((r) => r.error);
  if (failed) throw new Error(errMsg(failed.error));
}
