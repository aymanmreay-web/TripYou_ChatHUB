// اختبار الصلاحيات على الخادم لكل دور (وليس المدير فقط). التشغيل: npm run test:permissions
import fs from 'fs';
import path from 'path';
import { pathToFileURL, fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const keys = JSON.parse(fs.readFileSync(path.join(ROOT, 'packages/contracts/permissions.json'), 'utf8')).permissions.map((p) => p.key);
const roles = JSON.parse(fs.readFileSync(path.join(ROOT, 'packages/contracts/roles.json'), 'utf8')).roles;
const rolePerms = {};
for (const r of roles) rolePerms[r.key] = r.all ? keys : r.perms || [];
rolePerms.trainee = ['inbox.view']; // متدرب: مشاهدة فقط

const mk = (id, role, status = 'active') => ({ id, full_name: id, auth_user_id: 'au_' + id, role, status });
const names = ['super', 'lead', 'agent', 'obs', 'trainee', 'pending', 'ovr', 'ghost'];
globalThis.__DB = {
  allKeys: keys, rolePerms, assignee: null, grants: [],
  staff: [mk('super', 'super_admin'), mk('lead', 'dept_manager'), mk('agent', 'support_agent'), mk('obs', 'viewer'), mk('trainee', 'trainee'), mk('pending', 'viewer', 'pending'), mk('ovr', 'support_agent')],
  tokens: Object.fromEntries(names.map((n) => ['t_' + n, { id: 'au_' + n, email: n + '@x.com' }])),
  // ovr: دعم فني مع منع الرد واستثناء تصدير جهات الاتصال
  overrides: { ovr: [{ permission_key: 'inbox.reply', effect: 'deny' }, { permission_key: 'contacts.export', effect: 'allow' }] },
  lineAccess: [
    { staff_id: 'agent', instance: 'Sells_2', can_read: true, can_send: true },
    { staff_id: 'obs', instance: 'Sells_2', can_read: true, can_send: false },
    { staff_id: 'lead', instance: 'Master', can_read: true, can_send: true },
    { staff_id: 'lead', instance: 'Sells_2', can_read: true, can_send: true },
    { staff_id: 'ovr', instance: 'Sells_2', can_read: true, can_send: true },
  ],
};
globalThis.fetch = async () => new Response(JSON.stringify({}), { status: 200, headers: { 'content-type': 'application/json' } });
process.env.LINE_ACCESS_MODE = 'enforce';

const { NextRequest } = await import(pathToFileURL(path.join(HERE, 'shim-next.mjs')).href);
const cache = {};
const load = async (name) => (cache[name] ||= await import(pathToFileURL(path.join(HERE, 'out', name.replace(/[\/\[\]]/g, '_') + '.mjs')).href));

let pass = 0, fail = 0;
const failures = [];
async function C(who, method, route, expect, { qs = '', body, params = {}, label } = {}) {
  const m = await load(route);
  const headers = who ? { authorization: 'Bearer t_' + who, 'content-type': 'application/json' } : { 'content-type': 'application/json' };
  const init = { method, headers };
  if (body !== undefined && method !== 'GET') init.body = JSON.stringify(body);
  const req = new NextRequest('http://localhost/api/' + route + qs, init);
  let status;
  try { const r = await m[method](req, { params }); status = r.status; } catch (e) { status = 'ERR:' + e.message.slice(0, 40); }
  const ok = expect === 'ALLOW' ? typeof status === 'number' && status !== 401 && status !== 403 : status === expect;
  if (ok) pass++; else { fail++; failures.push(`✗ ${who || 'anon'} ${method} ${route} ${label || ''} → ${status} (المتوقع ${expect})`); }
}

// ── بلا جلسة / جلسة غير صالحة / حساب معلّق = 401
for (const r of ['contacts', 'conversations', 'roles-matrix', 'staff', 'lines', 'tags', 'favorites'])
  await C(null, 'GET', r, 401);
await C('ghost', 'GET', 'contacts', 401, { label: '(رمز غير صالح)' });
await C('pending', 'GET', 'contacts', 401, { label: '(حساب معلّق)' });

// ── جهات الاتصال
const E = 'evolution/instances/[name]';
await C('super', 'GET', 'contacts', 'ALLOW'); await C('super', 'DELETE', 'contacts', 'ALLOW'); await C('super', 'GET', 'contacts/export', 'ALLOW');
await C('lead', 'GET', 'contacts', 'ALLOW'); await C('lead', 'POST', 'contacts', 403); await C('lead', 'DELETE', 'contacts', 403);
await C('lead', 'GET', 'contacts/export', 403); await C('lead', 'POST', 'contacts/merge', 403); await C('lead', 'POST', 'contacts/import', 403);
await C('agent', 'GET', 'contacts', 'ALLOW'); await C('agent', 'PUT', 'contacts/[id]', 403, { params: { id: '1' } });
await C('agent', 'DELETE', 'contacts/[id]', 403, { params: { id: '1' } }); await C('agent', 'GET', 'contacts/export', 403);
await C('obs', 'GET', 'contacts', 'ALLOW'); await C('obs', 'POST', 'contacts/bulk-tag', 403); await C('obs', 'DELETE', 'contacts', 403);
await C('trainee', 'GET', 'contacts', 403); await C('trainee', 'GET', 'contacts/stats', 403);
await C('ovr', 'GET', 'contacts/export', 'ALLOW', { label: '(استثناء سماح فردي)' });

// ── الإدارة: الأدوار والموظفون والتقارير
await C('super', 'GET', 'roles-matrix', 'ALLOW'); await C('super', 'POST', 'roles-matrix', 'ALLOW', { body: { role_id: 'r', permission_key: 'x', on: true } });
for (const w of ['lead', 'agent', 'obs', 'trainee']) {
  await C(w, 'GET', 'roles-matrix', 403); await C(w, 'POST', 'roles-matrix', 403, { body: { role_id: 'r', permission_key: 'x', on: true } });
  await C(w, 'PUT', 'roles-matrix', 403, { body: { action: 'dept_delete' } });
}
await C('lead', 'GET', 'staff', 'ALLOW'); await C('agent', 'GET', 'staff', 403); await C('obs', 'GET', 'staff', 403);
await C('lead', 'GET', 'admin/kpis', 'ALLOW'); await C('agent', 'GET', 'admin/kpis', 403); await C('obs', 'GET', 'admin/kpis', 403);
await C('lead', 'PATCH', 'lines', 403, { body: { id: '1', title_ar: 'x' } }); await C('super', 'PATCH', 'lines', 'ALLOW', { body: { id: '1', title_ar: 'x' } });
await C('agent', 'GET', 'lines', 'ALLOW'); await C('trainee', 'GET', 'lines', 'ALLOW');
await C('agent', 'GET', E + '/connect', 403, { params: { name: 'Sells_2' } });

// ── الحملات والوسوم والردود الجاهزة
await C('lead', 'GET', 'campaigns', 403, { label: '(مشرف بلا campaigns.view)' }); await C('super', 'POST', 'campaigns', 'ALLOW', { body: {} });
await C('agent', 'POST', 'campaigns', 403, { body: {} }); await C('obs', 'GET', 'campaigns', 403);
await C('agent', 'GET', 'tags', 'ALLOW'); await C('agent', 'POST', 'tags', 403, { body: {} }); await C('lead', 'POST', 'tags', 403, { body: {} });
await C('agent', 'GET', 'canned-responses', 'ALLOW'); await C('agent', 'POST', 'canned-responses', 'ALLOW', { body: { action: 'use', id: '1' } });
await C('agent', 'POST', 'canned-responses', 403, { body: { title: 'a', body: 'b' } }); await C('lead', 'POST', 'canned-responses', 'ALLOW', { body: { title: 'a', body: 'b' } });
await C('obs', 'GET', 'canned-responses', 403); await C('agent', 'DELETE', 'canned-responses', 403);

// ── صندوق الوارد: الخطوط والإرسال
await C('agent', 'GET', E + '/messages', 'ALLOW', { params: { name: 'Sells_2' }, qs: '?jid=a@s.whatsapp.net' });
await C('agent', 'GET', E + '/messages', 403, { params: { name: 'Master' }, label: '(خط غير مصرّح)' });
await C('agent', 'POST', E + '/messages', 'ALLOW', { params: { name: 'Sells_2' }, body: {} });
await C('agent', 'POST', E + '/messages', 403, { params: { name: 'Master' }, body: {}, label: '(إرسال من خط غير مصرّح)' });
await C('obs', 'GET', E + '/messages', 'ALLOW', { params: { name: 'Sells_2' } });
await C('obs', 'POST', E + '/messages', 403, { params: { name: 'Sells_2' }, body: {}, label: '(مراقب لا يردّ)' });
await C('obs', 'POST', E + '/media', 403, { params: { name: 'Sells_2' }, body: {} });
await C('trainee', 'GET', E + '/messages', 403, { params: { name: 'Sells_2' }, label: '(لا تصريح خط)' });
await C('trainee', 'POST', E + '/messages', 403, { params: { name: 'Sells_2' }, body: {} });
await C('agent', 'POST', E + '/media', 'ALLOW', { params: { name: 'Sells_2' }, body: {} });
await C('agent', 'POST', E + '/revoke', 403, { params: { name: 'Sells_2' }, body: {}, label: '(حذف للجميع محجوب)' });
await C('lead', 'POST', E + '/revoke', 403, { params: { name: 'Master' }, body: {} });
await C('super', 'POST', E + '/revoke', 'ALLOW', { params: { name: 'Anything' }, body: {} });
await C('agent', 'POST', E + '/forward', 'ALLOW', { params: { name: 'Sells_2' }, body: {} });
await C('obs', 'POST', E + '/forward', 403, { params: { name: 'Sells_2' }, body: {} });
await C('ovr', 'POST', E + '/messages', 403, { params: { name: 'Sells_2' }, body: {}, label: '(استثناء منع الرد)' });
await C('super', 'POST', E + '/messages', 'ALLOW', { params: { name: 'Anything' }, body: {} });
await C('agent', 'GET', E + '/groups', 403, { params: { name: 'Sells_2' }, label: '(بلا groups.view)' });
await C('lead', 'GET', E + '/groups', 'ALLOW', { params: { name: 'Sells_2' } });

// ── المحادثات: الملكية والإسناد والحالة
const conv = { chat_jid: 'a@s.whatsapp.net', instance: 'Sells_2' };
globalThis.__DB.assignee = null;
await C('agent', 'PATCH', 'conversations', 'ALLOW', { body: { ...conv, mark_read: true }, label: '(غير مسندة)' });
await C('agent', 'PATCH', 'conversations', 'ALLOW', { body: { ...conv, staff_id: 'agent' }, label: '(اقتناص لنفسه)' });
await C('agent', 'PATCH', 'conversations', 403, { body: { ...conv, staff_id: 'lead' }, label: '(إسناد لغيره بلا inbox.assign)' });
await C('lead', 'PATCH', 'conversations', 'ALLOW', { body: { ...conv, staff_id: 'agent' }, label: '(المشرف يسند)' });
await C('obs', 'PATCH', 'conversations', 403, { body: { ...conv, status: 'resolved' }, label: '(مراقب لا يغيّر الحالة)' });
await C('trainee', 'PATCH', 'conversations', 403, { body: { ...conv, mark_read: true }, label: '(لا تصريح خط)' });
await C('obs', 'PATCH', 'conversations', 403, { body: { chat_jid: 'a@s.whatsapp.net', instance: 'Master', mark_read: true } });
globalThis.__DB.assignee = 'lead'; // مسندة لزميل
await C('agent', 'GET', 'conversations', 403, { qs: '?chat_jid=a@s.whatsapp.net&instance=Sells_2', label: '(محادثة زميل)' });
await C('agent', 'PATCH', 'conversations', 403, { body: { ...conv, mark_read: true }, label: '(محادثة زميل)' });
await C('lead', 'GET', 'conversations', 'ALLOW', { qs: '?chat_jid=a@s.whatsapp.net&instance=Sells_2', label: '(inbox.view_all)' });
globalThis.__DB.grants = [{ staff_id: 'agent', chat_jid: 'a@s.whatsapp.net' }];
await C('agent', 'GET', 'conversations', 'ALLOW', { qs: '?chat_jid=a@s.whatsapp.net&instance=Sells_2', label: '(بعد منح الطلب)' });
globalThis.__DB.grants = []; globalThis.__DB.assignee = 'agent';
await C('agent', 'PATCH', 'conversations', 'ALLOW', { body: { ...conv, status: 'resolved' }, label: '(صاحب المحادثة يغيّر حالتها)' });
await C('obs', 'GET', 'conversations', 'ALLOW', { qs: '?jids=a@s.whatsapp.net&instances=Sells_2' });
globalThis.__DB.assignee = null;

// ── الطلبات والموافقات
await C('agent', 'POST', 'permission-requests', 'ALLOW', { body: { action: 'request', type: 'read', chat_jid: 'x@s.whatsapp.net', staff_id: 'lead' }, label: '(الطالب من الجلسة لا من الجسم)' });
await C('agent', 'POST', 'permission-requests', 403, { body: { action: 'decide', request_id: '1', decision: 'approved' }, label: '(لا يوافق على طلبه)' });
await C('agent', 'GET', 'permission-requests', 403, { qs: '?pending=1' });
await C('lead', 'POST', 'permission-requests', 'ALLOW', { body: { action: 'decide', request_id: '1', decision: 'approved' } });
await C('lead', 'GET', 'permission-requests', 'ALLOW', { qs: '?pending=1' });
await C('obs', 'POST', 'permission-requests', 403, { body: { action: 'request', type: 'read', chat_jid: 'x' }, label: '(مراقب بلا request_access)' });
await C('agent', 'POST', 'line-grants', 403, { body: { action: 'decide', request_id: '1', decision: 'approved' } });
await C('lead', 'POST', 'line-grants', 'ALLOW', { body: { action: 'decide', request_id: '1', decision: 'approved' } });
await C('agent', 'POST', 'groups/join-decide', 403, { body: { request_id: '1', decision: 'approved' } });
await C('agent', 'POST', 'groups/manage', 403, { body: {} }); await C('agent', 'POST', 'groups/sync', 403);
await C('agent', 'POST', 'access-requests', 'ALLOW', { body: { chat_jid: 'x', instance: 'Sells_2', request_type: 'read' } });
await C('obs', 'POST', 'access-requests', 403, { body: { chat_jid: 'x', instance: 'Sells_2', request_type: 'read' } });

// ── الاستطلاعات والإشعارات والتواقيع والبيانات الشخصية
await C('agent', 'POST', 'polls', 403, { body: { action: 'create', instanceName: 'Sells_2', chat_jid: 'x', question: 'q', options: ['a', 'b'] }, label: '(بلا inbox.polls)' });
await C('lead', 'POST', 'polls', 'ALLOW', { body: { action: 'create', instanceName: 'Sells_2', chat_jid: 'x', question: 'q', options: ['a', 'b'] } });
await C('lead', 'POST', 'polls', 403, { body: { action: 'create', instanceName: 'Other', chat_jid: 'x', question: 'q', options: ['a', 'b'] }, label: '(خط غير مصرّح)' });
await C('agent', 'POST', 'polls', 'ALLOW', { body: { action: 'vote', poll_id: '1', selected_options: [] } });
await C('agent', 'POST', 'notifications', 403, { body: { action: 'create', kind: 'k', title: 't', targets: { all_active: true } }, label: '(إشعار عام بلا صلاحية)' });
await C('agent', 'GET', 'notifications', 'ALLOW'); await C('obs', 'POST', 'notifications', 'ALLOW', { body: { all: true } });
await C('agent', 'POST', 'signatures', 403, { body: { global: { part1: {} } }, label: '(توقيع عام)' });
await C('agent', 'POST', 'signatures', 403, { body: { staff: [{ id: 'lead', custom_part1: 'x' }] }, label: '(توقيع غيره)' });
await C('agent', 'POST', 'signatures', 'ALLOW', { body: { staff: [{ id: 'agent', custom_part1: 'x' }] } });
await C('agent', 'GET', 'signatures', 'ALLOW');
await C('agent', 'GET', 'favorites', 'ALLOW'); await C('obs', 'POST', 'favorites', 'ALLOW', { body: { category: 'c', item_id: '1', title: 't' } });
await C('agent', 'GET', 'inboxes', 'ALLOW'); await C('trainee', 'GET', 'inboxes', 'ALLOW');
await C('agent', 'POST', 'pins', 'ALLOW', { body: { chat_jid: 'x', message_id: '1' } });

console.log(`\nنجح ${pass} / فشل ${fail}`);
if (fail) { console.log(failures.join('\n')); process.exit(1); }
