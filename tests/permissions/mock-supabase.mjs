const chain = () => new Proxy(function () {}, {
  get: (_, k) => (k === 'then' ? (res) => res({ data: [], error: null, count: 0 }) : chain()),
  apply: () => chain(),
});
export const supabase = {
  auth: {
    getUser: async (token) => {
      const u = globalThis.__DB.tokens[token];
      return u ? { data: { user: u }, error: null } : { data: { user: null }, error: { message: 'invalid' } };
    },
  },
  from: () => chain(),
};
export const getSupabaseAdmin = () => ({ from: () => chain(), auth: supabase.auth, storage: { from: () => chain() }, rpc: () => chain() });
export const createClient = () => supabase;
