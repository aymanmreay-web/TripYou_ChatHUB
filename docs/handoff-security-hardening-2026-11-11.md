# تقرير تسليم — إغلاق ثغرة الأمان في قاعدة البيانات (RLS Hardening)

> **التاريخ:** 2026-11-11 · **الحالة:** منفَّذ على الإنتاج ومتحقق منه ✓
> **الغرض من الملف:** توثيق كل ما حدث في جلسة إغلاق الثغرة (التحذيرات الحرجة من Supabase Advisor) بالتفصيل، ليعمل الجلسة/المطور الآخر على بقية التعديلات **دون تضارب** مع ما تم.
> **اقرأ القسم 7 (تحذيرات حرجة) قبل تعديل أي ملف في `db/` أو أي سياسة RLS.**

---

## 1) الخلاصة السريعة — ماذا تغير؟

| البند | قبل | بعد |
|---|---|---|
| نوافذ `public.*` (27 نافذة) | تعمل بصلاحية المالك وتتجاوز RLS | كلها `security_invoker = true` ✓ |
| سياسات جداول `hub.*` | **17 سياسة بدون تحديد أدوار = `TO public`** (تشمل المجهولين!) | كلها `TO authenticated, service_role` ✓ |
| جداول `hub.*` بدون RLS | 6 جداول مكشوفة تماماً | RLS مفعّل + سياسات ✓ |
| زائر مجهول يملك مفتاح anon العام | يقرأ **كل** البيانات (3176 جهة اتصال، 90 محادثة…) | **0 صفوف في كل شيء** ✓ |
| موظف مسجَّل | يرى البيانات | يرى البيانات **كما هو** (بدون أي تغيير) ✓ |
| السيرفر (DATABASE_URL بصفة postgres) | يتجاوز RLS | لم يتأثر إطلاقاً ✓ |
| تحذيرات Advisor الحرجة (Security Definer View) | ~10 عناصر CRITICAL | تختفي بعد تحديث اللوحة (تحتاج تحديثاً يدوياً) |

**جهد التطبيق:** صفر — التغيير على مستوى قاعدة البيانات فقط، لا حاجة لإعادة بناء أو إعادة تشغيل أي حاوية.

---

## 2) السياق — كيف بدأت المشكلة

- أظهرت لوحة **Advisors** في Supabase Studio نحو 10 تحذيرات **CRITICAL** من نوع `Security Definer View` على النوافذ: `public.contacts`, `public.conversations`, `public.contact_phones`, `public.contact_tags`, `public.whatsapp_groups`, `public.favorites`, `public.pinned_messages`, `public.interactive_polls` (+ غيرها تحت نصف القائمة).
- صاحب المشروع سبق وضغط على عنصر من Advisor ظنّه حماية — **لم يُطبَّق شيء فعلياً** (التحذيرات ظلت ظاهرة).
- **هل كانت سبب مشاكل التشغيل؟ لا.** التحذيرات لا تكسر أي وظيفة؛ هي ثغرة كشف بيانات. لكن نتيجتها العملية كانت: **نظام صلاحيات الموظفين غير مفعَّل في المتصفح** — أي شخص يملك الرابط والمفتاح العام (`sb_publishable_...` المنشور في `apps/hub-web/src/lib/supabase.ts`) يقرأ كل شيء بدون تسجيل دخول.

---

## 3) التشخيص الكامل — الثغرة كانت 3 طبقات فوق بعضها

### الطبقة 1: النوافذ تتجاوز RLS
ملفات الإعداد تنشئ نوافذ `public.*` على شكل `select * from hub.*` **بدون** `security_invoker = true`، فتعمل بصلاحية مالكها (postgres) وتتجاوز أي سياسة على جداول `hub`.

### الطبقة 2 (السبب الجذري الحقيقي): سياسات بدون تحديد أدوار
في قاعدة الإنتاج، السياسات الشاملة كانت منشأة هكذا (بدون شرط `TO`):

```sql
create policy "Allow all for authenticated and service_role" on hub.contacts for all using (true) with check (true);
```

**في Postgres، حذف `TO` يعني `TO public` = تطبق على كل الأدوار بما فيها anon.** الاسم يقول "للمسجَّلين" لكن التنفيذ للجميع. لذلك بعد تفعيل `security_invoker` على النوافذ ظل المجهول يرى كل شيء (تم التحقق بفعل: `anon → 3176 صف`).

### الطبقة 3: 6 جداول بدون RLS أصلاً + نظام الصلاحيات التفصيلي غير منشور
- جداول بدون RLS في الإنتاج: `hub.contact_phones`, `hub.contact_tags`, `hub.favorites`, `hub.interactive_poll_votes`, `hub.interactive_polls`, `hub.pinned_messages`.
- **اكتشاف مهم:** ترحيل `0008_integrations_settings_rls.sql` (السياسات المبنية على الصلاحيات: `hub.has_permission()` / `hub.current_staff_id()`) **لم يُنشر على الإنتاج أبداً** — الدالتان **غير موجودتين** في قاعدة الإنتاج (`pg_proc` فارغة منهما في كل المخططات). السياسات المرجعية لهما موجودة كنصوص (مثل `hub_write_staff`) لكنها "ميتة": تعمل دون خطأ فقط لأن السماح الشامل الحرفي `(true)` يختصر تقييم `OR` قبل الوصول إليها.
- **النتيجة الحالية بعد الإصلاح:** الثغرة الخارجية (المجهولون) أُغلقت، لكن **كل موظف مسجَّل لا يزال يرى كل البيانات** — فرض الصلاحيات لكل موظف عمل متبقٍ (انظر القسم 8).

---

## 4) كل التعديلات التي أُجريت — بالتفصيل

### 4.1 ملفات المستودع المحلية (4 ملفات — كلها في `db/` فقط)

> ⚠️ **هذه ملفات جلسة الأمان. اقرأها قبل تعديلها ولا تعيد إنشاء تعريفات النوافذ القديمة فيها.**

1. **`db/migrations/0011_security_invoker_views.sql` — ملف جديد كلياً**
   ترحيل الإصلاح: كتلة `DO` تفعّل `security_invoker = true` على **كل** نوافذ `public` عبر `pg_views` (يشمل أي نافذة ينشئها ملف آخر مستقبلاً عند إعادة التشغيل) + استعلام تحقق معلّق.

2. **`db/contacts_phase2_setup.sql`** (حول السطر 105–120)
   تعريفات النوافذ الأربع أصبحت مع الحماية:
   ```sql
   create or replace view public.whatsapp_groups with (security_invoker = true) as select * from hub.whatsapp_groups;
   create or replace view public.contact_phones with (security_invoker = true) as select * from hub.contact_phones;
   create or replace view public.contact_tags with (security_invoker = true) as select * from hub.contact_tags;
   create or replace view public.contacts with (security_invoker = true) as ...;
   ```

3. **`db/public_features_setup.sql`** (حول السطر 20)
   `create or replace view public.conversations with (security_invoker = true) as ...`

4. **`db/migrations/0010_contacts_extended.sql`** (السطر ~57)
   `create or replace view public.contacts with (security_invoker = true) as select * from hub.contacts;`

### 4.2 Git
- الإرسال `c17ab50` (feat: M-batch — من الجلسة الموازية) حمل ملفاتي الأربعة ضمنه و**دُفع إلى GitHub** (`origin/feature/phase2-platform`).
- لم أُجري أي commit بنفسي؛ شجرة العمل نظيفة لحظة كتابة هذا التقرير.

### 4.3 قاعدة البيانات الإنتاجية (النشر الفعلي — معاملة واحدة نجحت بالكامل)

**طريقة التنفيذ:** عبر الـ VPS بـ psql على منفذ الجلسات `:5432` (وليس `:6543` المخصص لـ pgbouncer)، بقراءة `DATABASE_URL` من `/opt/resvbar-hub/.env` دون طباعتها.

```sql
begin;

-- (1) تفعيل RLS على الجداول الستة المكشوفة
alter table hub.contact_phones        enable row level security;
alter table hub.contact_tags          enable row level security;
alter table hub.favorites             enable row level security;
alter table hub.interactive_poll_votes enable row level security;
alter table hub.interactive_polls     enable row level security;
alter table hub.pinned_messages       enable row level security;

-- (2) سياسات للجداول الستة: للمسجَّلين + الخادم فقط
create policy "Allow all for authenticated and service_role" on hub.contact_phones         for all to authenticated, service_role using (true) with check (true);
create policy "Allow all for authenticated and service_role" on hub.contact_tags           for all to authenticated, service_role using (true) with check (true);
create policy "Allow all for authenticated and service_role" on hub.favorites              for all to authenticated, service_role using (true) with check (true);
create policy "Allow all for authenticated and service_role" on hub.interactive_poll_votes for all to authenticated, service_role using (true) with check (true);
create policy "Allow all for authenticated and service_role" on hub.interactive_polls      for all to authenticated, service_role using (true) with check (true);
create policy "Allow all for authenticated and service_role" on hub.pinned_messages        for all to authenticated, service_role using (true) with check (true);

-- (3) إعادة إنشاء كل سياسة كانت roles = {public} مع تقييد الأدوار
--     (حافظت على نفس الاسم/النوع/الشروط: qual و with_check كما هي)
do $$
declare r record;
begin
  for r in
    select * from pg_policies
    where schemaname = 'hub' and roles::text = '{public}'
  loop
    execute format('drop policy %I on hub.%I', r.policyname, r.tablename);
    if r.cmd = 'ALL' then
      execute format('create policy %I on hub.%I for all to authenticated, service_role using (%s) with check (%s)',
        r.policyname, r.tablename, coalesce(r.qual,'true'), coalesce(r.with_check,'true'));
    elsif r.cmd = 'INSERT' then
      execute format('create policy %I on hub.%I for insert to authenticated, service_role with check (%s)',
        r.policyname, r.tablename, coalesce(r.with_check,'true'));
    elsif r.cmd = 'UPDATE' then
      execute format('create policy %I on hub.%I for update to authenticated, service_role using (%s) with check (%s)',
        r.policyname, r.tablename, coalesce(r.qual,'true'), coalesce(r.with_check,'true'));
    else  -- SELECT / DELETE
      execute format('create policy %I on hub.%I for %s to authenticated, service_role using (%s)',
        r.policyname, r.tablename, lower(r.cmd), coalesce(r.qual,'true'));
    end if;
  end loop;
end $$;

commit;
```

**السياسات الـ17 التي أُعيد بناؤها** (نفس الأسماء، صارت `TO authenticated, service_role`):
`company_settings, contacts, conversation_tags, conversations, departments (SELECT فقط), hub_tags, inbox_access, inbox_lines, inboxes, line_access, lines, messages, risk_events, roles (SELECT فقط), staff (SELECT فقط), status_definitions, tag_rules, whatsapp_groups (سياسة wa_groups_all)`.

**قبل التنفيذ — قائمة النوافذ الـ27 التي عولجت بالطبقة 1:**
`contact_phones, contact_tags, whatsapp_groups, conversations, company_settings, contacts, conversation_tags, departments, favorites, line_access, line_circuit_breakers, lines, messages, permissions, pinned_messages, hub_tags, inbox_access, inbox_lines, inboxes, interactive_poll_votes, interactive_polls, risk_events, role_permissions, roles, staff, status_definitions, tag_rules`

### 4.4 الـ VPS
- SSH يعمل بالمفتاح: `ssh -i ~/.ssh/hostinger_deploy root@srv1507912.hstgr.cloud`
- **تغيير نظام واحد:** تثبيت `postgresql-client` (psql 16.15) عبر apt — أداة عميل فقط، لم تمس أي خدمة عاملة.
- `/opt/resvbar-hub` متزامن مع `origin/feature/phase2-platform` (يتضمن ملفات 0011).
- لم تُعاد بناء/تشغيل أي حاوية — غير لازم.

---

## 5) التحقق النهائي (فعلي على الإنتاج)

- النوافذ المحمية: **27 / 27** (تحقق عبر `pg_class.reloptions`).
- القياسات قبل/بعد:

| الاستعلام | قبل | بعد |
|---|---|---|
| anon → public.contacts | 3176 | **0** |
| anon → public.conversations | 90 | **0** |
| anon → public.messages | مكشوف | **0** |
| anon → favorites / pinned / polls | مكشوف | **0** |
| authenticated → contacts | 3176 | 3176 ✓ |
| authenticated → conversations / messages | تعمل | تعمل ✓ |

- ملاحظة: عدد المحادثات ارتفع 89→90 أثناء الاختبار — استخدام حقيقي متزامن، البيانات سليمة.

---

## 6) ما لم يتغير (لتجنب سوء الفهم)

- **لا تغيير في أي كود تطبيق** — لا استيراد، لا routes، لا restart.
- **لا تغيير في محتوى السياسات** (الشروط `using(true)/with check(true)` باقية) — التغيير الوحيد: **تحديد الأدوار**.
- **لا تغيير في grants** — صلاحيات anon/authenticated على جداول hub كما هي (لا تضر مع RLS مفعّل).
- **لا حذف أو تعديل بيانات** إطلاقاً.
- السياسات المرجعية للدوال المفقودة (`hub_write_staff`, `hub_write_permissions`, `hub_write_role_permissions`, `hub_write_roles`) **تُركت كما هي عمداً** (انظر التحذير 7.4).

---

## 7) تحذيرات حرجة للجلسة الأخرى

1. **لا تعيد تشغيل نسخ قديمة من ملفات الإعداد** (أي نسخة من `contacts_phase2_setup.sql` / `public_features_setup.sql` / `0010` أقدم من `c17ab50`، مثل الملفات في `D:\LastResvBAR\resvbar-hub.tar.gz`) — ستعيد إنشاء النوافذ بدون `security_invoker` وتُرجع التحذيرات الحرجة. النسخ الموجودة في المستودع الآن مُصلَّحة.
2. **أي نافذة `public.*` جديدة مستقبلاً:** يجب `with (security_invoker = true)` + جدول `hub` الأساسي له RLS مفعّل + سياسة `to authenticated, service_role`. خذ `0011` كنموذج. النافذة الجديدة بدون هذا = تحذير CRITICAL جديد + كشف بيانات.
3. **"المجهول يرى صفر" سلوك مقصود — لا تعالجه كخلل.** إذا ظهرت قائمة فارغة **لموظف مسجَّل** فالسبب سياسة ناقصة على جدول `hub` المعني: أضف سياسة، ولا تُلغِ RLS ولا تُرجع `TO public`.
4. **لا تحذف السياسات الشاملة `(true)` ولا تعتمد على سياسات الصلاحيات الحالية:** دوال `hub.has_permission()` و `hub.current_staff_id()` **غير موجودة في الإنتاج** — أي استعلام يجري تقييم سياسة تشير إليها فعلياً (بعد إزالة السماح الشامل الذي يختصر `OR`) سينهار بخطأ function does not exist. نشر نظام الصلاحيات = إنشاء الدالتين أولاً ثم اختبار ثم التبديل (القسم 8).
5. **لا تلمس ملفات `db/` الأربعة في 4.1** بدون قراءة هذا التقرير — هي مرجع النافذ المُصلَّحة.
6. **صفحة/ميزة تقرأ قبل تسجيل الدخول:** أصبحت سترى صفر صفوف من نوافذ hub (مقصود). أي حاجة حقيقية للقراءة العامة = جدول/نافذة مخصصة بسياسة anon قراءة صريحة بعد مراجعة محتواها — لا تفتح النوافذ الحالية.
7. تذكير سابق ما زال قائماً: `getSupabaseAdmin()` في `apps/hub-web/src/lib/supabase.ts` يرتد لمفتاح anon إذا غاب `SUPABASE_SERVICE_ROLE_KEY` — مسارات admin-client ما زالت معطلة حتى يوفر المالك المفتاح الجديد.
8. `docs/CREDENTIALS_AND_ACCESS.md` يحتوي كلمة مرور قاعدة البيانات الحية (السطران 76–77) — **لا تنقلها إلى ملفات جديدة**؛ إزالة الأسرار من المستودع عمل متبقٍ مسجل.

---

## 8) الأعمال المتبقية المرتبطة (بالترتيب المقترح)

1. **تحقق المالك:** دخول الموظفين يعمل + خروج يخفي كل شيء + تحديث لوحة Advisors (تختفي CRITICAL).
2. **نشر نظام الصلاحيات التفصيلي** (من `0008`): إنشاء `hub.current_staff_id()` و `hub.has_permission()` في الإنتاج → اختبار كل دور → استبدال السياسات الشامل بالسياسات المبنية على الصلاحيات **تدريجياً** (جدولاً). هذا يجعل "كل موظف يرى حسب صلاحياته" حقيقة في المتصفح.
3. مفتاح service جديد من المالك لإصلاح مسارات `getSupabaseAdmin` المتبقية (contacts, favorites, pins, polls, signatures).
4. إزالة الأسرار من المستودع (الأولوية من 2026-11-10، أُضيف إليها كلمة مرور DB في `CREDENTIALS_AND_ACCESS.md`).
5. عند نشر سياسات الصلاحيات: مراجعة `service_role` في مسارات السيرفر غير متأثرة (postgres عبر `DATABASE_URL` يتجاوز RLS أصلاً).

---

## 9) أوامر مرجعية سريعة (للتحقق/إعادة الفحص)

```bash
# اتصال
ssh -i ~/.ssh/hostinger_deploy root@srv1507912.hstgr.cloud

# على الـ VPS: اشتقاق رابط الجلسات من .env دون طباعة الأسرار
DBURL=$(grep -E '^DATABASE_URL=' /opt/resvbar-hub/.env | head -1 | sed 's/^DATABASE_URL=//' | tr -d '\r' | sed 's/^"//; s/"$//')
SESSION_URL=$(echo "$DBURL" | sed 's/:6543/:5432/; s/?pgbouncer=true//')
```

```sql
-- النوافذ غير المحمية (يجب أن تكون فارغة)
select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind='v'
  and (c.reloptions is null or c.reloptions::text not like '%security_invoker=true%');

-- السياسات المفتوحة على المجهول (يجب أن تكون فارغة)
select tablename, policyname from pg_policies
where schemaname='hub' and roles::text like '%public%';

-- جداول hub بدون RLS (يجب أن تكون فارغة)
select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='hub' and c.relkind='r' and c.relrowsecurity=false;

-- اختبار عين المجهول
set role anon;
select count(*) from public.contacts;  -- المتوقع 0
reset role;
```

---

*أُعد هذا التقرير آلياً في جلسة إغلاق الثغرة بتاريخ 2026-11-11 — أي سؤال عن أي بند فوق، الرجوع إلى هذه الجلسة أو تنفيذ استعلامات القسم 9 مباشرة.*

---

## 10) إضافة لاحقة من جلسة الصندوق (2026-11-11 مساءً) — تكامل مع تقريرك

1. **بند 7.7 أصبح قديماً:** المالك زوّد مفتاح `service_role` الجديد وهو منشور في `/opt/resvbar-hub/.env` (نمط أسرار غير متتبعة: compose يقرأ `${SUPABASE_SERVICE_ROLE_KEY}` من `.env`؛ الملفات المتتبعة بلا أسرار بعد إصلاح حجب GitHub Secret Scanning). مسارات `getSupabaseAdmin` تعمل ✓.
2. **تنفيذ التحذير 7.6 فعلياً:** أُضيفت سياسة قراءة عامة واحدة مدروسة — `create policy "Public read branding" on hub.company_settings for select to anon using (true);` (الجدول براندينغ فقط: اسم الشركة/الشعار/تواصل). سببها: صفحة الدخول والشعار الجانبي يقرأانها قبل تسجيل الدخول (`fetchCompany`). تحقق بعين المجهول: `company_settings = 1` و `contacts = 0` ✓ — أي أن الإغلاق سليم 100% والبراندينغ قبل الدخول يعمل.
3. **تأكيد الدخول:** تسجيل الدخول عبر `supabase.auth.signInWithPassword` (authDb) → الجلسة في المتصفح تصبح `authenticated` → الموظفون يرون بياناتهم كما كان. لا كسر متوقع لصفحات الإدارية.
4. **التزام دائم من جلسة الصندوق:** أي نافذة `public.*` جديدة ستُنشأ `with (security_invoker = true)` + RLS على الجدول الأساسي + سياسة `to authenticated, service_role` (نموذج 0011)، ولن تُعاد تشغيل نسخ قديمة من ملفات `db/` أقدم من `c17ab50`.

