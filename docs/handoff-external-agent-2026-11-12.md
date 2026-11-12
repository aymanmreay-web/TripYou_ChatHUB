# 📋 تقرير تسليم للوكيل الخارجي — حالة TripYou ChatHUB (2026-11-12)

> **الهدف:** إنهاء العمل المتبقي. اقرأ هذا الملف كاملاً + `docs/handoff-security-hardening-2026-11-11.md` (القسم 7 حرج) قبل أي تعديل.
> **الفرع:** `feature/phase2-platform` · آخر commit: `4202323` · البناء: أخضر 27/27 · منشور على الإنتاج.

---

## 1) البنية والعمارة (لا تتجاوزها)

- **Next.js 14.2.35** (monorepo: `apps/hub-web` + `packages/ui` + `packages/contracts`) + **Supabase** + **Evolution API v2.3.7** (واتساب) — عربي RTL.
- **قاعدة البيانات**: الجداول الحقيقية في **`hub.*`** و`public.*` واجهات عرض **كلها `security_invoker=true`** (قفل أمني مُطبق — لا تعيد إنشاء نافذة بدون `with (security_invoker = true)` + RLS + سياسة `to authenticated, service_role`). المجهول يرى **صفر صفوف** — سلوك مقصود.
- **الوصول للقاعدة من الكود**: مسارات السيرفر تستخدم `lib/pg.ts` → `q()` (اتصال pg مباشر بصلاحية postgres — **يتجاوز RLS**). supabase-js يُستخدم من المتصفح (جلسة Supabase Auth تجعل الموظف `authenticated`) ومن `getSupabaseAdmin()` في بعض المسارات.
- **الأسرار**: في `/opt/resvbar-hub/.env` على السيرفر فقط (غير متتبع، chmod 600) — **GitHub يمنع دفع `sb_secret_`**؛ لا تكتب أسراراً في الملفات المتتبعة إطلاقاً.
- **RLS**: سياسات المحادثات مقيدة بالدور/الإسناد عبر `hub.current_staff_id()` / `hub.is_manager()` / `hub.has_permission(text)` (منشأة ✓). بقية جداول hub ما زالت blanket `to authenticated, service_role using(true)` — التبديل التدريجي فقط.

## 2) النشر والتحقق

```bash
ssh -i ~/.ssh/hostinger_deploy root@69.62.122.89   # أو srv1507912.hstgr.cloud
cd /opt/resvbar-hub && git pull origin feature/phase2-platform
docker compose -f docker-compose.hub.yml build hub-web   # 4-10 دقائق — شغّله background ولا تنتظر بصمت
docker compose -f docker-compose.hub.yml up -d --force-recreate hub-web
# تحقق:
IP=$(docker inspect tripyou-chathub-web --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}')
curl http://$IP:3000/api/roles-matrix ; docker logs tripyou-chathub-web --tail 30
```
- **psql للترحيلات**: منفذ الجلسات `:5432` (اقتَ DATABASE_URL من .env وبدّل `:6543`→`:5432` وأسقط `?pgbouncer=true`) — الـ pooler `:6543` يقطع (ECONNRESET) في DDL المتعدد. psql 16 مثبت.
- **السجل المرجعي لقاعدة البيانات**: `db/contacts_phase2_setup.sql` + `db/migrations/0011_*` — **لا تعيد تشغيل ملفات SQL أقدم من `c17ab50`**.

## 3) ما المنجز والمتحقق منه (لا تعيد بناءه)

1. **بنية إشعارات عامة**: `public.notifications` + `/api/notifications` (GET/mark/create بأي kind حر) + جرس حي + صفحة إشعارات — أي ميزة مستقبلية ترسل إشعاراً بدون تعديل مخطط.
2. **الصندوق (الجوهر — مطابق لمواصفة المالك النهائية)**:
   - **فردية لا تُدمج أبداً** (كل خط = محادثة مستقلة تُرد من خطها الوارد حصراً)؛ **المجموعات تُدمج** (صف واحد عبر الخطوط).
   - **جهة عرض واحدة**: كل ردود الفريق في جهة المرسل، والتوقيع الثلاثي (اسم الموظف — القسم — الخط المُرسل منه) هو المميّز في واتساب الحقيقي. لا شارات خطوط على الرسائل.
   - سكرول أول فتح فقط؛ غير مقروء **لكل مستخدم** بطابع زمني (سجل `inbox_read_receipts` بلا فلتر صندوق + انتظار الترطيب قبل رسم العدادات).
   - تثبيت الرسائل **بالقاعدة** (`hub.conversations.metadata.pinned` حتى 5) يصمد بعد الخروج.
   - رد مقتبس فعلي (`quotedMessageId` **في جذر** sendText — Evolution v2)، تحويل رسمي **لكل الأنواع** (`message/forward` بالـ key + سلسلة محاولة عبر الخطوط)، ملصقات/عرض-لمرة-واحدة (فك أغلفة viewOnce/ephemeral).
   - **تحديد متعدد**: وضع تحديد + نسخ + تحويل + حذف للجميع (`/revoke`).
   - **قائمة المرسل** في المجموعات (زر الاسم): إضافة كجهة اتصال (إن كان الرقم حقيقياً لا LID) + نسخ المعرف.
   - **أذونات لكل محادثة**: `hub.line_send_requests` (type: line_reply|group_join|assignment|read|read_write + inbox_id + escalated) — توجيه لمشرف الصندوق (`hub.inboxes.supervisor_id`)، **تصعيد للمدير بعد 10 دقائق** (في tick محرك الحملات)، الموافقة على الإسناد = إسناد فوري، **المنح لهذه المحادثة فقط**.
   - **طبقات الرؤية**: مدير/مشرف = كل شيء • موظف: غير مسندة في صندوقه = محتوى + طلب إسناد (اقتناص) • مسندة لزميله = **هيكل بلا محتوى** (+ طلب قراءة/قراءة-وكتابة إن يملك خطاً منها) • خارج صناديقه = مخفية. جلب الرسائل محجوب فعلاً عن الهيكل.
   - إخفاء الخط المقطوع من الشريط العلوي؛ الحصة اليومية قابلة للتعديل بواجهة الخطوط.
3. **الأدوار والصلاحيات**: `/module/roles` + `/api/roles-matrix` (5 أدوار × 40 صلاحية **بأسماء عربية**، بحث عربي، المدير مقفل دائماً) + الأقسام بأعداد الموظفين + دالتي/ثلاث RLS. الأدوار الحقيقية: `super_admin`=مدير، `sales_lead`=مشرف، `support_agent`=موظف — **لا يوجد دور supervisor ولا عمود name_ar**.
4. **جهات الاتصال**: عمود `wa_jid` فريد + `hub.whatsapp_groups`/`contact_phones`/`contact_tags` + استيراد pg ذري بلا حدود من كل الخطوط المتصلة بأسماء المجموعات الحقيقية + فرز تلقائي بالوسوم المركزية + دمج بالمعرف الداخلي (رقم/`wa_jid`) يحدّث المراجع (conversations/campaigns/lists) + `/api/contacts/check`.
5. **الحملات (الأساس)**: محرك `lib/campaignRunner.ts` (نبضة 10 ثوانٍ: throttle، daily_cap، opt_out، **نافذة إرسال**، **نصوص عشوائية لكل مستلم**، **وسم تلقائي للمستلمين** عبر `auto_tag_id`) + API إنشاء/تفاصيل/إيقاف + صفحة بشريط تقدم حي + `instrumentation.ts` (**يتطلب** `experimental.instrumentationHook` + webpack fallbacks fs/path/stream… وإلا فشل البناء).
6. **مؤشرات الإدارة**: `/api/admin/kpis` حقيقية (أول رد لكل موظف، المتروكة، خرق SLA، سلسلة 14 يوم، حصص الخطوط) + لوحة أعمدة SVG + بطاقة طلبات الأذونات الموحدة بأسماء عربية وشارة تصعيد.
7. **تصحيحات المالك المطبقة حرفياً**: "شخص واحد/خط واحد"، عضوية المجموعات باقية (مطابقة عبر `phones` لأن المشاركون `@lid`)، تحويل المجموعات بسلسلة خطوط، إشعارات للأدوار الحقيقية (`super_admin`+`sales_lead` — **لا يوجد supervisor**)، التوقيع بترتيب الاسم/القسم/الخط.

## 4) 🔴 المتبقي — المهام بالتفصيل (نفّذها بالترتيب، كل بند مستقل)

### م1 — واجهة معالج الحملات (⚠️ نصفه API جاهز فقط)
`src/app/module/campaigns/page.tsx` — معالج الإنشاء يحتاج 4 حقول وترحيلها في POST `/api/campaigns` (**الـ API يستقبلها فعلاً** — انظر destructure: `extra_texts`, `send_window`, `auto_tag_id`):
- **وسوم من القاعدة**: select من `hub_tags` (استخدم `fetchTags()` من `lib/hubDb`) بدل الحقل النصي في فلتر الجمهور.
- **نصوص متعددة**: textarea «نصوص إضافية (اختيار عشوائي)» سطر/نص → `extra_texts: string[]`.
- **نافذة الإرسال**: حقلان من/إلى (ساعات 0-24، مكة) → `send_window: { from, to }`.
- **وسم تلقائي للمستلمين**: select وسوم → `auto_tag_id` (الربط لكل جهات الجمهور **جاهز في الـ API**).
- تحقق: `npx tsc --noEmit` → إنشاء حملة تجريبية على رقم المالك بمعدل 5/دقيقة → مراقبة `/api/campaigns/[id]`.

### م2 — قسم إدارة الشركة (بند 48)
قسم جديد يجمع الإعدادات (`/module/settings` → company_settings) + الموظفون (`/module/staff`) + الأقسام. صفحة `/module/company` بتبويبات، **وأضف حقل «مشرف الصندوق»** (`hub.inboxes.supervisor_id` — العمود موجود!) في تبويب الصناديق مع قيد: المشرف يجب أن يكون مرتبطاً بالصندوق (`inbox_access`).

### م3 — ربط الموظفين بالأقسام (يغلق توقيع القسم)
- **الجاهز**: `saveStaffMember` يرسل `department_id` ✓، `fetchStaffAll` يجلبه ✓، صفحة الموظفين تجلب `departmentsList` من `/api/roles-matrix` ✓.
- **الناقص**: عنصر `<select>` «القسم» داخل مودال تحرير الموظف يربط `editingStaff.department_id` → الحفظ الحالي يكتبه تلقائياً. بعد الربط يظهر القسم في توقيع الرسائل (`/api/signatures` يرجع `department`).

### م4 — تحديد متقدم (بند 17 المتبقي)
الموجود: نسخ + تحويل الأولى + حذف للجميع. أضف: مشاركة لكل رسالة محددة لمحادثة هدف، إضافة المحدد للمفضلة دفعة واحدة.

### م5 — تبويبا مراقبة باللوحة (بند 33)
- **مراقبة الموظفين**: لكل موظف — المسند الحي، آخر نشاط، متوسط أول رد (الموجود في kpis)، طلباته المعلقة.
- **مراقبة الصناديق**: لكل صندوق — عدد المحادثات، غير المقروء الكلي، حمل الخطوط المربوطة، مشرفه.
- وسّع `/api/admin/kpis` بفقرة per-inbox + per-staff-live.

### م6 — التقارير / التدقيق / صحة النظام (بنود 53-55)
- `/api/reports` (تجميعات زمنية: نمو يومي/أسبوعي، أداء خطوط، مصادر العملاء) + `/module/reports`.
- **التدقيق**: أنشئ `hub.audit_log (id uuid, staff_id, action text, entity text, entity_id text, meta jsonb, created_at)` + RLS + سجّل من المسارات الحرجة (إسناد، حذف جهة، قرار أذونات، تعديل أدوار، حملة) + `/api/audit` + `/module/audit`.
- `/api/system-health` (حالة Evolution `/instance/connectionStatus`، استجابة القاعدة، نبض محرك الحملات، آخر ويب هوك) + `/module/health`.
- فعّل الموديولات الثلاثة في `packages/contracts/modules.json` + `lib/mock-data.ts` (status: live).

### م7 — الحملات متعددة القنوات (بند 59)
بنية `hub.channels` (whatsapp|telegram|email + اتصال) + مرسل مجرد في المحرك. **واسع — ناقش مع المالك قبل البناء** (تيلغرام/إيميل غير مفعلين).

### م8 — تنظيف قسم التواقيع (بنود 35+42)
`/module/signature`: استبدل القوالب `{{staff_name}}` المربكة بمعاينة نصية حية + 3 أجزاء واضحة (الاسم/القسم/الخط) + `editable_by` لكل جزء (موجود بالبنية) + بطاقة توقيعي في `/profile` تظهر للموظف المخول فقط (البطاقة موجودة — أضف فحص الصلاحية).

### م9 — تبويب ساعات العمل (مؤجل بقرار المالك — نفّذه أخيراً)
إعدادات بعد-الدوام في `app_settings/after_hours` + hook جاهز (`lib/webhookHandlers/afterHours.ts`) — يتبقى تبويب الواجهة في الإعدادات (محرر أسبوعي بصري).

### م10 — طلب المالك الجديد المعلق جزئياً
- **قائمة المرسل**: منفذة (جهة اتصال/نسخ معرف). الناقص: جلب **أسماء حقيقية** للمشاركين بدل pushName عندما تكون LID (عبر `lidToPhone` الموجود في sync-evolution — وسّعه ليخزن خريطة LID→اسم في `hub.whatsapp_groups` أو جدول mapping).

## 5) ⚠️ عوامل فخخة (اقرأها قبل أول تعديل)

1. **الملفات CRLF**: أي regex متعدد الأسطر يحتاج `\r?\n` — وإلا يفشل **بصمت** (replace لا يطابق ولا يخطئ).
2. **جلسة موازية نشطة** تعمل على نفس الشجرة (فك الصندوق: `lib/inbox/*`, `components/inbox/{ConversationRow,Modal,SlaTimer,AudioMessagePlayer,ConversationInfoPanel}`) — اقرأ الملف قبل كل Edit وتوقع "File modified since read"، وأعد القراءة فوراً.
3. **node -e مع backticks** ينفجر في Git Bash — اكتب سكربتات `.cjs` مؤقتة ونفذها.
4. **GitHub secret scanning** يحجب أي `sb_secret_` — الأسرار في `/opt/resvbar-hub/.env` فقط (compose يقرأ `${VAR}`).
5. **Evolution v2**: الاقتباس `quotedMessageId` **في الجذر**؛ التحويل `message/forward` بالـ key؛ المشاركون يعودون **`@lid`** — الأرقام فقط عبر `phoneNumber` إن وُجد.
6. **`hub.roles`**: أعمدته `key/title_ar` — لا `name_ar`؛ ولا يوجد دور `supervisor` (استخدم `sales_lead`).
7. **لغة المالك**: يختبر بنفسه ويرسل ملاحظات مختلطة — لا تفترض "صحيح" دون تأكيده؛ عندما يرفض افتراضاً أعد بناء القاعدة من ملاحظته.
8. **اختبار الإرسال الحقيقي** يرسل واتساب فعلياً — على محادثة اختبارية فقط، ونظّف بيانات الاختبار بعد كل تجربة.

## 6) قائمة التحقق قبل كل تسليم
`npx tsc --noEmit` ✓ → `npm run build` (يجب أن يكتمل "Generating static pages (27/27)") → commit+push → نشر → `docker logs` صفر أخطاء → اختبار حي على مسار واحد → حدّث هذا الملف بقسم "ما أُنجز".

---

*أُعد بواسطة جلسة الصندوق 2026-11-12 — الأسئلة عن أي بند: راجع `docs/feedback-round1-2026-11-11.md` (تنظيم ملاحظات المالك الأصلية 44 بنداً) و`docs/handoff-security-hardening-2026-11-11.md`.*
