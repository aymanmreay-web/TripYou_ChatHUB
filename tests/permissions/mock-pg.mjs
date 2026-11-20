// قاعدة وهمية: تجيب فقط عن استعلامات الهوية والصلاحيات والنطاق، وما عداها يعيد صفوفاً فارغة.
export async function q(sql, p = []) {
  const D = globalThis.__DB; const s = sql.replace(/\s+/g, ' ');
  if (s.includes('where s.auth_user_id = $1')) {
    return D.staff.filter((x) => x.status === 'active' && x.auth_user_id === p[0]).map((x) => ({ id: x.id, full_name: x.full_name, role_key: x.role }));
  }
  if (s.startsWith('select id, full_name from hub.staff where id = $1::uuid')) {
    const st = D.staff.find((x) => x.id === p[0] && x.status === 'active'); return st ? [{ id: st.id, full_name: st.full_name }] : [];
  }
  if (s.includes('from hub.staff s') && s.includes('where s.id = $1') && !s.includes('role_permissions')) {
    const st = D.staff.find((x) => x.id === p[0]); return st ? [{ id: st.id, full_name: st.full_name, email: st.full_name + '@x.com', role_id: 'r_' + st.role, role_key: st.role, role_title: st.role }] : [];
  }
  if (s.startsWith('select key, grp, label_ar') || s.startsWith('select key from hub.permissions where super_only = true')) {
    return [];
  }
  if (s.startsWith('select key from hub.permissions')) return D.allKeys.map((key) => ({ key }));
  if (s.includes('join hub.role_permissions rp on rp.role_id = s.role_id') && s.includes('select rp.permission_key')) {
    const st = D.staff.find((x) => x.id === p[0]); return (D.rolePerms[st?.role] || []).map((permission_key) => ({ permission_key }));
  }
  if (s.includes('from hub.staff_permission_overrides')) return D.overrides[p[0]] || [];
  if (s.includes('from hub.line_access la')) {
    return D.lineAccess.filter((r) => r.staff_id === p[0] && r.instance === p[1]).map((r) => ({ can_read: r.can_read, can_send: r.can_send }));
  }
  if (s.includes('c.assigned_staff_id from hub.conversations')) return [{ assigned_staff_id: D.assignee ?? null }];
  if (s.includes('from hub.line_send_requests') && s.startsWith('select 1')) return D.grants.filter((g) => g.staff_id === p[0] && g.chat_jid === p[1]).map(() => ({ '?column?': 1 }));
  return [];
}
export async function getPool() { return { query: async () => ({ rows: [] }), connect: async () => ({ query: async () => ({ rows: [] }), release() {} }) }; }
export async function withClient(fn) { return fn({ query: async () => ({ rows: [] }) }); }
export default { q, getPool, withClient };
