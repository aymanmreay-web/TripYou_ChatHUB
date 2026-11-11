import { NextResponse } from 'next/server';
import { q } from '../../../lib/pg';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * م7 — الموظفون النشطون الحقيقيون من القاعدة (يستبدل AVAILABLE_STAFF الثابتة في الصندوق).
 * GET /api/staff → { data: [{ id, full_name, role_name, email }] }
 */
export async function GET() {
  try {
    const rows = await q(
      `select s.id, s.full_name, s.email, coalesce(r.title_ar, r.key) as role_name, r.key as role_key
       from hub.staff s
       left join hub.roles r on r.id = s.role_id
       where s.status = 'active'
       order by s.full_name
       limit 100`
    );
    return NextResponse.json({ data: rows });
  } catch (err: any) {
    console.error('[staff GET]', err?.message);
    return NextResponse.json({ error: err.message, data: [] }, { status: 500 });
  }
}
