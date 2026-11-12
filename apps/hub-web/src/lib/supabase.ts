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
