import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase';

/**
 * GET /api/contacts/[id]
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const supabase = getSupabaseAdmin();

    const { data: contact, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !contact) {
      return NextResponse.json({ error: 'جهة الاتصال غير موجودة' }, { status: 404 });
    }

    return NextResponse.json({ contact });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * PUT /api/contacts/[id]
 * تعديل بيانات جهة الاتصال
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();
    const supabase = getSupabaseAdmin();

    const updatePayload = {
      ...body,
      updated_at: new Date().toISOString(),
    };

    // لا نسمح بتعديل الـ id أو created_at
    delete updatePayload.id;
    delete updatePayload.created_at;

    const { data: updated, error } = await supabase
      .from('contacts')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ contact: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * DELETE /api/contacts/[id]
 * حذف جهة اتصال
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const supabase = getSupabaseAdmin();

    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, deleted_id: id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
