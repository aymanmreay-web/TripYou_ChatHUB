import { supabase } from './supabase';
import type { StaffMe } from '../types';

export type AuthStatus = 'loading' | 'anonymous' | 'pending' | 'blocked' | 'active';

export interface AuthState {
  status: AuthStatus;
  me: StaffMe | null;
}

/** يقرأ الجلسة الحالية ثم صف الموظف + دوره + صلاحياته من قاعدة البيانات. */
export async function loadAuthState(): Promise<AuthState> {
  const { data: sess } = await supabase.auth.getSession();
  const authUser = sess.session?.user;
  if (!authUser) return { status: 'anonymous', me: null };

  const email = authUser.email || '';
  let { data: staff, error } = await supabase
    .from('staff')
    .select('id, email, full_name, phone, status, role_id, default_line_id')
    .eq('auth_user_id', authUser.id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!staff && email) {
    const r = await supabase
      .from('staff')
      .select('id, email, full_name, phone, status, role_id, default_line_id')
      .ilike('email', email)
      .maybeSingle();
    if (r.error) throw new Error(r.error.message);
    staff = r.data;
  }
  if (!staff) return { status: 'pending', me: null };

  let roleKey = 'observer';
  let roleTitle = '';
  let permissions: string[] = [];
  if (staff.role_id) {
    const [role, perms] = await Promise.all([
      supabase.from('roles').select('key, title_ar').eq('id', staff.role_id).maybeSingle(),
      supabase.from('role_permissions').select('permission_key').eq('role_id', staff.role_id),
    ]);
    if (role.data) {
      roleKey = role.data.key;
      roleTitle = role.data.title_ar;
    }
    permissions = (perms.data ?? []).map((p: any) => p.permission_key);
  }

  const status: AuthStatus =
    staff.status === 'active' ? 'active' : staff.status === 'pending' ? 'pending' : 'blocked';

  // جلب الخطوط المربوطة بالموظف من جدول line_access
  let assignedLineIds: string[] = [];
  let assignedInstances: string[] = [];
  try {
    const { data: lineAcc } = await supabase
      .from('line_access')
      .select('line_id, lines(id, instance_name, title_ar)')
      .eq('staff_id', staff.id);
    if (lineAcc && Array.isArray(lineAcc)) {
      assignedLineIds = lineAcc.map((x: any) => x.line_id);
      assignedInstances = lineAcc
        .map((x: any) => x.lines?.instance_name)
        .filter(Boolean);
    }
  } catch (err) {
    console.warn('Failed to load line_access for staff:', err);
  }

  return {
    status,
    me: {
      id: staff.id,
      full_name: staff.full_name || authUser.user_metadata?.full_name || email.split('@')[0],
      role: roleKey,
      role_title_ar: roleTitle,
      email_masked: staff.email || email,
      phone_masked: staff.phone || '',
      permissions: status === 'active' ? permissions : [],
      default_line_id: staff.default_line_id,
      avatar_url: authUser.user_metadata?.avatar_url,
      assigned_line_ids: assignedLineIds,
      assigned_instances: assignedInstances,
    },
  };
}

export async function signInWithPassword(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw new Error('البريد أو كلمة المرور غير صحيحة');
}

export async function signInWithGoogle(): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/` },
  });
  if (error) throw new Error(error.message);
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}
