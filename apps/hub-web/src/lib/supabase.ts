import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://aypnxljvudjtasofiuhp.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_Koc-CGSP-_RZQqSkTBiClA_Vgbm0n86';

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
 *
 * ⚠️ مؤقت (2026-11-11): مفتاح sb_secret القديم أصبح "Unregistered API key" (دُوّر في Supabase)
 * فتعطلت كل مسارات supabase-js السيرفرية (جهات الاتصال، الخطوط، التواقيع…).
 * الحل المؤقت: استخدام المفتاح العام العامل — سياسة RLS في هذا المشروع
 * "Allow all for anon and authenticated" على كل الجداول فالسلوك مطابق للسابق.
 * المطلوب من المالك: تزويدنا بمفتاح service_role الجديد ووضعه في env الحاوية.
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
