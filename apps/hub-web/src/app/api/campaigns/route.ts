import { NextRequest, NextResponse } from 'next/server';
import { q } from '../../../lib/pg';
import { insertNotification } from '../../../lib/webhookHandlers/notify';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * م5 — مسار الحملات: إنشاء بجمهور من القاعدة + قائمة + إيقاف/استئناف.
 *
 * GET  /api/campaigns                 → قائمة الحملات بإحصائياتها
 * POST /api/campaigns                 → إنشاء حملة:
 *   { title, description?, line_instance, text, media?, throttle?: {per_minute},
 *     scheduled_at?, audience: { list_id? } | { filter: { tag?, city?, source?, country_code? } } }
 *   ينشئ المستلمين من جهات الاتصال المطابقة (مع تخطي opt_out عند الإرسال) ويعرض العدد.
 * PATCH /api/campaigns                → { id, action: 'pause'|'resume'|'cancel' }
 */

export async function GET(req: NextRequest) {
  try {
    const rows = await q(
      `select c.id, c.title, c.description, c.status, c.line_instance, c.audience,
              c.text, c.media, c.throttle, c.scheduled_at, c.started_at, c.finished_at,
              c.stats, c.created_at,
              (select count(*)::int from public.campaign_recipients r where r.campaign_id = c.id) as recipients_count
       from public.campaigns c
       order by c.created_at desc
       limit 100`
    );
    return NextResponse.json({ data: rows });
  } catch (err: any) {
    console.error('[campaigns GET]', err?.message);
    return NextResponse.json({ error: err.message, data: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, line_instance, text, audience, extra_texts, send_window, auto_tag_id } = body;
    // م8-دفعة2: نصوص إضافية للاختيار العشوائي + نافذة إرسال مفصلة (ساعات محددة) + وسم تلقائي للمستلمين
    if (!title || !line_instance || !text || !audience) {
      return NextResponse.json({ error: 'title, line_instance, text, audience required' }, { status: 400 });
    }

    // التحقق من وجود الخط
    const line = await q<{ id: string; title_ar: string }>(
      `select id, title_ar from hub.lines where instance_name = $1 limit 1`,
      [line_instance]
    );
    if (line.length === 0) {
      return NextResponse.json({ error: 'الخط غير موجود' }, { status: 404 });
    }

    // بناء استعلام الجمهور من القاعدة (قائمة محفوظة أو فلاتر جهات الاتصال)
    let contacts: { id: string; phone: string; name: string }[] = [];
    if (audience.list_id) {
      contacts = await q(
        `select ct.id, ct.primary_phone_e164 as phone, ct.full_name as name
         from public.contact_list_members m
         join hub.contacts ct on ct.id = m.contact_id
         where m.list_id = $1 and ct.primary_phone_e164 is not null and (ct.opt_out is null or ct.opt_out = false)`,
        [audience.list_id]
      );
    } else if (audience.filter) {
      const f = audience.filter;
      const where: string[] = ['ct.primary_phone_e164 is not null', '(ct.opt_out is null or ct.opt_out = false)'];
      const params: any[] = [];
      if (f.tag) { params.push(f.tag); where.push(`ct.tags @> array[$${params.length}]`); }
      if (f.city) { params.push(f.city); where.push(`ct.city = $${params.length}`); }
      if (f.source) { params.push(f.source); where.push(`ct.source = $${params.length}`); }
      if (f.country_code) { params.push(f.country_code); where.push(`ct.country_code = $${params.length}`); }
      contacts = await q(
        `select ct.id, ct.primary_phone_e164 as phone, ct.full_name as name
         from hub.contacts ct
         where ${where.join(' and ')}
         order by ct.created_at desc
         limit 5000`,
        params
      );
    } else {
      return NextResponse.json({ error: 'audience requires list_id or filter' }, { status: 400 });
    }

    if (contacts.length === 0) {
      return NextResponse.json({ error: 'لا يوجد مستلمون مطابقون للجمهور المحدد' }, { status: 400 });
    }

    // إنشاء الحملة + المستلمين ذرياً
    const scheduledAt = body.scheduled_at ? new Date(body.scheduled_at) : null;
    const isScheduled = scheduledAt && scheduledAt.getTime() > Date.now();
    const campRows = await q<{ id: string }>(
      `insert into public.campaigns
         (title, description, status, line_instance, audience, text, media, throttle, scheduled_at, stats, created_by)
       values ($1, $2, $3, $4, $5::jsonb, $6, $7::jsonb, $8::jsonb, $9, $10::jsonb, $11)
       returning id`,
      [
        String(title).trim(),
        body.description || null,
        isScheduled ? 'scheduled' : 'draft',
        line_instance,
        JSON.stringify(audience),
        String(text),
        JSON.stringify(body.media || null),
        JSON.stringify({
          ...(body.throttle || { per_minute: 20 }),
          ...(Array.isArray(extra_texts) && extra_texts.length > 0 ? { extra_texts } : {}),
          ...(send_window && (send_window.from || send_window.to) ? { send_window } : {}),
          ...(auto_tag_id ? { auto_tag_id } : {}),
        }),
        scheduledAt,
        JSON.stringify({ pending: contacts.length }),
        body.created_by || null,
      ]
    );
    const campId = campRows[0].id;

    await q(
      `insert into public.campaign_recipients (campaign_id, contact_id, phone_e164, display_name, status)
       select $1, x.cid, x.phone, x.name, 'pending'
       from unnest($2::uuid[], $3::text[], $4::text[]) as x(cid, phone, name)`,
      [campId, contacts.map((c) => c.id), contacts.map((c) => c.phone), contacts.map((c) => c.name)]
    );

    // م8-دفعة2: وسم تلقائي لكل جهات المستلمين — فلترة فورية بصندوق المحادثات
    if (auto_tag_id) {
      await q(
        `insert into hub.contact_tags (contact_id, tag_id)
         select x.cid, $2::uuid
         from unnest($1::uuid[]) as x(cid)
         on conflict (contact_id, tag_id) do nothing`,
        [contacts.map((c) => c.id), auto_tag_id]
      ).catch((e: Error) => console.warn('[campaign auto-tag] non-critical:', e.message));
    }

    // إشعار عام عبر البنية الموحدة — الحملة جاهزة
    await insertNotification({
      staffId: body.created_by || '',
      kind: 'campaign',
      title: '📣 تم إنشاء حملة جديدة',
      body: `${title} — ${contacts.length} مستفماً على خط ${line_instance}`,
      link: '/module/campaigns',
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      id: campId,
      recipients: contacts.length,
      status: isScheduled ? 'scheduled' : 'draft',
      message: isScheduled
        ? `حملة مجدولة — سيبدأ الإرسال تلقائياً في الموعد (${contacts.length} مستلم)`
        : `حملة مسودة — ${contacts.length} مستفماً جاهزاً، أرسلها من صفحة الحملات`,
    });
  } catch (err: any) {
    console.error('[campaigns POST]', err?.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, action } = body;
    if (!id || !['pause', 'resume', 'cancel', 'send_now'].includes(action)) {
      return NextResponse.json({ error: 'id and action(pause|resume|cancel|send_now) required' }, { status: 400 });
    }

    let newStatus: string;
    switch (action) {
      case 'pause': newStatus = 'paused'; break;
      case 'cancel': newStatus = 'cancelled'; break;
      case 'resume':
      case 'send_now': newStatus = 'running'; break;
      default: newStatus = 'draft';
    }

    const rows = await q(
      `update public.campaigns
       set status = $2,
           started_at = case when $2 = 'running' and started_at is null then now() else started_at end,
           finished_at = case when $2 = 'cancelled' then now() else finished_at end,
           updated_at = now()
       where id = $1 and status not in ('done', 'cancelled')
       returning id, status`,
      [id, newStatus]
    );
    if (rows.length === 0) {
      return NextResponse.json({ error: 'الحملة غير موجودة أو منتهية' }, { status: 404 });
    }
    return NextResponse.json({ success: true, status: newStatus });
  } catch (err: any) {
    console.error('[campaigns PATCH]', err?.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
