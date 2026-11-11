import { NextRequest, NextResponse } from 'next/server';
import { q } from '../../../lib/pg';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * م4 — الردود الجاهزة (Canned Responses) — CRUD كامل من القاعدة الحقيقية.
 *
 * GET    /api/canned-responses            → قائمة القوالب النشطة (+?all=1 لكل الحالات)
 * POST   /api/canned-responses            → { title, body, shortcut?, category? }
 * PATCH  /api/canned-responses            → { id, title?, body?, shortcut?, category?, is_active? }
 * DELETE /api/canned-responses?id=        → حذف نهائي
 * POST   { id, action: 'use' }            → زيادة عدّاد الاستخدام (عند إدراج قالب في محادثة)
 */

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const all = searchParams.get('all') === '1';
    const rows = await q(
      `select id, title, body, shortcut, category, usage_count, is_active, sort, created_at
       from public.canned_responses
       ${all ? '' : 'where is_active = true'}
       order by sort nulls last, created_at desc`,
      []
    );
    return NextResponse.json({ data: rows });
  } catch (err: any) {
    console.error('[canned-responses GET]', err?.message);
    return NextResponse.json({ error: err.message, data: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // زيادة عدّاد الاستخدام — عند إدراج الرد في محادثة
    if (body.action === 'use' && body.id) {
      await q(`update public.canned_responses set usage_count = usage_count + 1 where id = $1`, [body.id]);
      return NextResponse.json({ success: true });
    }

    const { title, body: text } = body;
    if (!title || !text) {
      return NextResponse.json({ error: 'title and body required' }, { status: 400 });
    }
    const rows = await q(
      `insert into public.canned_responses (title, body, shortcut, category, sort)
       values ($1, $2, $3, $4, $5)
       returning id, title, body, shortcut, category, usage_count, is_active, sort, created_at`,
      [
        String(title).trim(),
        String(text),
        body.shortcut ? String(body.shortcut).trim() : null,
        body.category ? String(body.category).trim() : 'general',
        Number(body.sort) || 0,
      ]
    );
    return NextResponse.json({ success: true, data: rows[0] });
  } catch (err: any) {
    console.error('[canned-responses POST]', err?.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }
    const rows = await q(
      `update public.canned_responses set
         title = coalesce($2, title),
         body = coalesce($3, body),
         shortcut = coalesce($4, shortcut),
         category = coalesce($5, category),
         is_active = coalesce($6, is_active),
         sort = coalesce($7, sort),
         updated_at = now()
       where id = $1
       returning id, title, body, shortcut, category, usage_count, is_active, sort`,
      [
        body.id,
        body.title ?? null,
        body.body ?? null,
        body.shortcut ?? null,
        body.category ?? null,
        body.is_active ?? null,
        body.sort ?? null,
      ]
    );
    if (rows.length === 0) {
      return NextResponse.json({ error: 'not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: rows[0] });
  } catch (err: any) {
    console.error('[canned-responses PATCH]', err?.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }
    await q(`delete from public.canned_responses where id = $1`, [id]);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[canned-responses DELETE]', err?.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
