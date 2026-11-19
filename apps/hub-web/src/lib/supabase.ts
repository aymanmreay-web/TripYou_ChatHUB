import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://aypnxljvudjtasofiuhp.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_ngMlkZ_wEUDOMwN91L54hw_70Er1jdo';

/**
 * Public client for client-side queries and Realtime subscriptions
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

/**
 * Admin client for server-side trusted operations (bypassing RLS)
 * الأسرار لا تُكتب في الكود أبداً — تُوفر عبر env الحاوية:
 * الإنتاج: SUPABASE_SERVICE_ROLE_KEY في /opt/resvbar-hub/.env (غير متتبع في git)
 * التطوير المحلي: apps/hub-web/.env.local
 */
export const getSupabaseAdmin = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};


/**
 * الخادم يقرأ رمز الجلسة من كوكي sb-access-token (أو Authorization) ليعمل fetch العادي وصور <img>.
 * يُحدَّث عند كل تغيير في الجلسة (دخول، تجديد الرمز، خروج).
 */
function writeCookie(token: string | null, expiresAt?: number | null) {
  if (typeof document === 'undefined') return;
  const secure = typeof location !== 'undefined' && location.protocol === 'https:' ? '; Secure' : '';
  if (!token) {
    document.cookie = `sb-access-token=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
    return;
  }
  const maxAge = expiresAt ? Math.max(60, expiresAt - Math.floor(Date.now() / 1000)) : 3600;
  document.cookie = `sb-access-token=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

if (typeof window !== 'undefined') {
  try {
    // قراءة فورية من التخزين المحلي قبل اكتمال getSession حتى لا يسبق أول طلب كتابة الكوكي
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i) || '';
      if (/^sb-.+-auth-token$/.test(k)) {
        const v = JSON.parse(window.localStorage.getItem(k) || 'null');
        if (v?.access_token) writeCookie(v.access_token, v.expires_at);
      }
    }
  } catch {
    /* تجاهل */
  }
  supabase.auth.getSession().then(({ data }) => writeCookie(data.session?.access_token ?? null, data.session?.expires_at));
  supabase.auth.onAuthStateChange((_e, session) => writeCookie(session?.access_token ?? null, session?.expires_at));
}
