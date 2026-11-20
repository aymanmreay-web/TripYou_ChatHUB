import { supabase } from './supabase';

/** fetch يرسل رمز الجلسة تلقائياً ليتحقق الخادم من هوية المستخدم وصلاحياته. */
export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(input, { cache: 'no-store', ...init, headers });
}
