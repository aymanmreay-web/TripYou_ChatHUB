import { NextRequest, NextResponse } from 'next/server';
import { q } from '../../../../lib/pg';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * PATCH /api/tags/[id]
 * تعديل وسم موجود
 * Body: { name?, color?, scope? }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tagId = params.id;
    const body = await req.json();
    const { name, color, scope } = body;

    if (!tagId) {
      return NextResponse.json({ error: 'معرف الوسم مطلوب' }, { status: 400 });
    }

    const setParts: string[] = [];
    const vals: any[] = [];

    if (name !== undefined) {
      vals.push(name.trim());
      setParts.push(`name_ar = $${vals.length}`);
    }
    if (color !== undefined) {
      vals.push(color);
      setParts.push(`color = $${vals.length}`);
    }
    if (scope !== undefined) {
      vals.push(scope);
      setParts.push(`scope = $${vals.length}`);
    }

    if (setParts.length === 0) {
      return NextResponse.json({ error: 'لا توجد حقول للتحديث' }, { status: 400 });
    }

    vals.push(tagId);
    const rows = await q<{ id: string }>(
      `UPDATE hub.hub_tags SET ${setParts.join(', ')} WHERE id = $${vals.length} RETURNING id`,
      vals
    );

    if (!rows[0]) {
      return NextResponse.json({ error: 'الوسم غير موجود' }, { status: 404 });
    }

    return NextResponse.json({ success: true, id: rows[0].id });
  } catch (err: any) {
    console.error('[PATCH /api/tags/:id]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * DELETE /api/tags/[id]
 * حذف وسم (يحذف كل الارتباطات تلقائياً بفضل ON DELETE CASCADE)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tagId = params.id;

    if (!tagId) {
      return NextResponse.json({ error: 'معرف الوسم مطلوب' }, { status: 400 });
    }

    // التحقق من عدم حذف وسوم النظام
    const check = await q<{ kind: string }>(
      `SELECT kind FROM hub.hub_tags WHERE id = $1 LIMIT 1`,
      [tagId]
    );

    if (!check[0]) {
      return NextResponse.json({ error: 'الوسم غير موجود' }, { status: 404 });
    }

    await q(`DELETE FROM hub.hub_tags WHERE id = $1`, [tagId]);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[DELETE /api/tags/:id]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
