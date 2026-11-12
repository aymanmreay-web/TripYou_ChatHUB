# تقرير تسليم — توحيد واجهة TripYou ChatHUB (للوكيل المنفِّذ)

> التاريخ: 2026-11-12 · الفرع: `feature/phase2-platform` · آخر التزام منشور: `942e9a4` (محلول على الإنتاج)
> اقرأ هذا الملف كاملاً قبل لمس أي شيء. الوثائق المرجعية: `docs/unified-ui-blueprint.md` (الحاكم)، `docs/handoff-security-hardening-2026-11-11.md` (الأمان)، `docs/feedback-round1-2026-11-11.md` (ملاحظات المالك).

---

## 1) بطاقة المشروع

| البند | القيمة |
|---|---|
| المشروع | TripYou_ChatHUB — صندوق محادثات واتساب متعدد الخطوط لشركة سياحة (عربي RTL أولاً) |
| التقنيات | Next.js 14 (App Router) + React 18 + Tailwind + Supabase (قراءات) + `pg` مباشر (كتابات، `lib/pg.ts` `q()`) + Evolution API |
| المستودع | github.com/aymanmreay-web/TripYou_ChatHUB — فرع العمل `feature/phase2-platform` |
| النسخة المحلية | `D:\LastResvBAR\resvbar-hub` (مونوريبو: `apps/hub-web`، `packages/ui`، `db/`، `docs/`) |
| الإنتاج | VPS `69.62.122.89` — الموقع `hub.69.62.122.89.slip.io` — الحاوية `tripyou-chathub-web` |
| النشر | `ssh -i ~/.ssh/hostinger_deploy root@69.62.122.89` ثم في `/opt/resvbar-hub`: `git pull origin feature/phase2-platform && docker compose -f docker-compose.hub.yml build hub-web && docker compose -f docker-compose.hub.yml up -d --force-recreate hub-web` |
| قاعدة البيانات | جداول حقيقية في `hub.*` والقراءات عبر `public.*` views. `DATABASE_URL` في `/opt/resvbar-hub/.env` (غير المتتبَّع) — **يزيل `?pgbouncer=true` قبل استخدامه مع psql** |

## 2) قرار التصميم الحاكم (لا تناقشه، نفّذه)

- **نظام `TripYou ChatHUB.html` (النموذج التفاعلي v1) هو مصدر الحقيقة البصري** — اعتمده المالك رسمياً: خفته، عداداته الحية، ألوان جوجل المتحركة.
- `TripYou ChatHUB v2.html` = 7 لوحات من أداة تصميم **بلا أي كود** — مصدر تفاصيل فقط.
- الهوية المتحركة إلزامية في كل ثيم: شريط `gbar` المنزلق، حلقات `avatar-ring` الدوّارة، هالات `aurora`، الحبيبات، زر إرسال متدرج متحرك، نبض الطوارئ.
- الخطوط: `Readex Pro` عناوين/أرقام + `IBM Plex Sans Arabic` نص — مثبتة محلياً `@fontsource`.
- **قاعدة المالك الفولاذية: لا مكوّن في `packages/ui` = لا شاشة تُبنى.** ومعيار القبول = المعاينة المعتمدة.
- قواعد التفاعل: ممنوع `alert()` / `<select>` خام / لون `hex` أو `bg-purple-*` مثبت في ملفات واجهة جديدة. خرائط الحالات من `lib/inbox/uiMaps.ts` حصراً. سلم النوافذ: `Modal` (درج 40 / نافذة 60 / عارض 80) و`Esc` يعمل فعلاً.

## 3) ما أُنجز (مُنشر على الإنتاج ومُتحقق منه)

### أ. الأساس (محلول)
- **طبقة رموز v1** في `apps/hub-web/src/app/globals.css` (نهاية الملف): `--g1..--g4`، `--accent(--accent-l/--accent-d)`، `--surface`، `--ok/--warn/--bad`، `--ease/--spring/--spd/--amb/--r/--blur/--d` لكل ثيم + خطوط v1 لكل الثيمات.
- **6 ثيمات كاملة**: `theme-google` (الافتراضي)، `theme-violet`، `theme-ocean`، `theme-emerald`، `theme-sunset`، `theme-graphite` (الأخيرة الثلاث جديدة بحزم كاملة فاتح+داكن). ترحيل تلقائي: `theme-purple→violet`، `theme-blue→ocean` (في `AppContext.migrateTheme` وسكربت FOUC في `layout.tsx`).
- **الهوية المتحركة في كل الثيمات** (كانت حصراً في الجوجلي): `gbar` أعلى الترويسة، `avatar-ring`، الهالات + رفع المحتوى `body > *:not(.aurora){z-index:1}` + زجاج `aside/header`. مفتاح إطفاء مستقبلي: `html:not(.theme-plain)`.
- **استوديو المدير** `/admin_appearance` (مسجّل في `mock-data.ts` بمفتاح `appearance`): 7 تبويبات (ثيمات/ألوان+لون مخصص/خطوط 13/أسطح وحركة/صلاحيات/هوية اسم+شعار/متقدم تصدير-استيراد) + معاينة حية بأجهزة. المحرك: `lib/appearance.ts` (يحفظ `localStorage['tripyou_appearance']` ويطبق على `<html>` عند الإقلاع عبر `AppContext`). الهوية تبث `branding-updated` والشريط الجانبي يلتقطها حياً.

### ب. تفكيك صندوق المحادثات (3 دفعات، البناء أخضر)
من `NativeChatInbox.tsx` (كان 5095 → ~4850 سطراً) استُخلص:
- `lib/inbox/messages.tsx` — `getProxiedUrl` (مع `download` + **قاعدة: روابط `blob:` المؤقتة لا تُغلَّف بالوكيل أبداً**)، `getWaveformBars`، `formatMessageWithLinks`، `getFileCardMeta`.
- `components/inbox/AudioMessagePlayer.tsx` — مشغل الصوت كما هو حرفياً.
- `lib/inbox/time.ts` — `getKsaHour/isQuietHoursNow` (الهدوء 01:00–07:00 مكة).
- `lib/inbox/uiMaps.ts` — `STATUS_META` (6 حالات بينها `pending`)، `statusBadge/statusLabel`، عتبات SLA (5/10 د)، `SLA_PILL_CLASS`، `slaAppliesTo`.
- `components/inbox/SlaTimer.tsx` — عدّاد حي ينبض كل ثانية `mm:ss` في **صفوف القائمة والترويسة**؛ الرموز المختصرة: عادي `mm:ss`، تحذير `تنبيه mm:ss`، حرج `⛔ mm:ss` نابض، محلول `تم الحل`.
- `components/inbox/ConversationRow.tsx` — صف القائمة (بلا وسوم؛ وسم الإسناد **فقط عند إسناد فعلي**).
- `components/inbox/Modal.tsx` — النوافذ الموحدة (7 من 9 مهاجرة: الهدوء، تثبيت، تحويل، مرفقات، PIN، طلب وصول، دفعة وسائط). `alert()` منقرضة (18→toast).
- طبقة إصلاح الألوان عمّمت على كل الثيمات: `html.theme-google.light/dark [class…]` → `html.light/dark [class…]` (172 محدداً).

### ج. لوحة التفاصيل + الترويسة النظيفة (آخر موجة)
- `components/inbox/ConversationInfoPanel.tsx` — سلايد يساري (نقرة زر «التفاصيل» في الترويسة): هوية الجهة بحلقة دوّارة + عدّاد حي، قسم **«التحكم بالمحادثة»** يستقبل `convActions` (نقل الإسناد/الحالة/الحل/الوسوم/المفضلة/القفل من الترويسة **حرفياً بلا تغيير منطق**)، ثم بطاقات: الخط، الإسناد (يظهر فقط عند إسناد فعلي)، صلاحية الرد، الوسوم الملونة، الرقم/المعرّف، المحفوظة؟، المفضلة؟، المثبّتة n/5، آخر رسالة، غير المقروء.
- **الترويسة صارت**: رجوع + أفاتار بحلقة + الاسم + شارة `مجموعة · N` مصغرة + وسم حالة ناعم بجانب العنوان + عدّاد مختصر + زر «التفاصيل». حُذف منها: معرّف المجموعة، شارة الخط، كل الأدوات.
- **الصور الحقيقية**: `/api/avatars` (جديد) يجلب من Evolution `POST /chat/findProfilePicture/{instance}` ويخزن في `hub.contacts.avatar_url` (25 لكل دفعة، مهلة 8 ث/طلب). العميل يطلب تدريجياً للصفوف الناقصة بعد تحميل القائمة (`avatarRequestedRef` جلسي). كما أن `GET /api/conversations?jids=` صار يربط `hub.contacts k on k.wa_jid=c.chat_jid` ويعيد `avatar_url` ويُدمج في `mergeDbTagsAndStatus`.
- **سياسة الإسناد (قرار المالك)**: المدير يتحكم بكل شيء دون أن يكون مُسنداً — استُبعد من خيارات الإسناد (`filter(s => !/مدير/.test(s.role))`)، ووسم الإسناد يظهر فقط عند إسناد لموظف.

### د. سجل النشر
`44ce312` (موجة الواجهة الأولى) → `749d7ca` (الترويسة النظيفة + الصور) → `73f2821` (**إصلاح انهيار**: `convActions` كان يُقيَّم مع `activeConversation=null`؛ **الدرس: عند نقل JSX من فرع شرطي احتفظ بحارسه**) → `942e9a4` (الموجة المصقولة الحالية). الحاوية مبنية وتخدم البناء الجديد (تحقق: `theme-google` في HTML المُخدَم).

## 4) المتبقي — قائمة التنفيذ بالترتيب

### ① عاجل: تصفير إسنادات المدير في القاعدة (أُمر به المالك ولم يُنفَّذ بعد)
المحاولات السابقة فشلت لسببين: `?pgbouncer=true` في `DATABASE_URL` يرفضه psql، ومشاكل تمرير علامات الاقتباس عبر SSH. نفّذ:

```bash
# على الجهاز المحلي (Git Bash) — يرفع السكربت ويشغله داخل حاوية postgres مؤقتة على شبكة الـ host
scp -i ~/.ssh/hostinger_deploy <path>/clear_manager_assignments.sql root@69.62.122.89:/tmp/cma.sql
ssh -i ~/.ssh/hostinger_deploy root@69.62.122.89 '
  DB=$(grep "^DATABASE_URL=" /opt/resvbar-hub/.env | cut -d= -f2- | tr -d "\"" | sed "s/?pgbouncer=true//;s/&pgbouncer=true//")
  docker run --rm --network host -v /tmp/cma.sql:/cma.sql -e PGURL="$DB" postgres:16-alpine \
    sh -c "psql \"\$PGURL\" -f /cma.sql"
'
```
ومحتوى السكربت:
```sql
update hub.conversations c
set assigned_staff_id = null
where exists (
  select 1 from hub.staff s
  join hub.roles r on r.id = s.role_id
  where s.id = c.assigned_staff_id and r.key = 'super_admin'
);
```
- إن أراد المالك تصفير **كل** الإسنادات (لا مديرين فقط): احذف شرط `exists`.
- تحقق بعد التنفيذ: `select count(*) from hub.conversations where assigned_staff_id is not null;`

### ② عاجل: التحقق من الصور الحقيقية
المستخدم يرى الأحرف الأولى بعد النشر. خطوات التشخيص بالترتيب:
1. افتح `POST /api/avatars` بمجموعة jids حقيقية من القائمة — افحص الاستجابة.
2. إن كانت `avatars` فارغة: جرب نداء Evolution مباشرة من الحاوية: `curl -X POST "$EVOLUTION_URL/chat/findProfilePicture/<instance>" -H "apikey: $EVOLUTION_API_KEY" -H "Content-Type: application/json" -d '{"number":"<jid>"}'` — راجع شكل الاستجابة (`wapi.profilePicUrl` أم غيره) وعدّل التحليل في `route.ts` إن لزم.
3. **انتبه لـ jids بصيغة `@lid`** (أرقام واتساب الجديدة المجهولة): قد لا توجد في `hub.contacts` — إن كان المزامن يخزن jids مختلفة عن `chat_jid` قد تحتاج ربطاً عبر الأرقام (`hub.contact_phones`) أو مطابقة الطرف `@s.whatsapp.net`.
4. المجموعات: تأكد أن `fetchAllGroups` يخزن صور المجموعات في `avatar_url` (sync-evolution يفعل ذلك نظرياً — تحقق من صف مجموعة في `hub.contacts`).
5. مؤشر النجاح: بعد تحميل القائمة ثوانٍ، تظهر صور تدريجياً بدل الأحرف (أو على الأقل للجهات الموجودة في جهات الاتصال).

### ③ واجهة: المتبقي القريب
1. **درج المفضلة** (`favoritesDrawerOpen`) — آخر نافذة يدوية (z-[170] جانبية): اعتمدها على `Modal` بمستوى `drawer` (أضف خاصية `align="start"` للمكوّن: `justify-start` + لوح بارتفاع كامل). العارض الكامل `lightbox` يبقى مخصصاً (Esc مربوط).
2. **الخطافات**: استخلاص منطق الوحش إلى `useConversations/useMessages/useSla/useBreaker/useCannedResponses/useFavorites` — **حافظ حرفياً**: عدّاد SLA، الهدوء، القاطع (3 أخطاء)، الماسح 6 ثوانٍ مع تخطي الخفاء، دمج `unified__{jid}`، القراءة بعد 400ms، الروابط `?chat=`، الإرسال المتفائل، التواقيع، الردود الجاهزة `/`، الأقفال، التزامن اللحظي، صلاحيات الخطوط، C3/C4 (العرض الموحد متعدد الخطوط + ردود المدير عبر الخطوط)، فحص عضوية المجموعة، قاعدة الإرسال المملوكة.
3. **مسح الألوان المثبتة** المتبقي في `NativeChatInbox.tsx` (بقيت مئات: slate/amber/rose/emerald/cyan...) — استبدلها بمتغيرات الثيم وخرائط `uiMaps`. ثم صفحات الوحدات والملف والدخول.
4. **المرحلة 5 (الختامية)**: حذف جسر `purple-*` من `tailwind.config.ts`، حذف طبقة إصلاح إعادة التلوين (`globals.css` قواعد `html.light/dark [class…]`)، حذف بلوكات `theme-purple/blue` القديمة، حذف `@tripyou/ui` hexes القديمة (`#110A22` إلخ) والإشارات المعلقة `--font-alexandria/--font-cairo` من `packages/ui/src/tokens`.
5. **توسيع `/design-kit`** ليصبح فهرس النظام الرسمي (كل مكوّن × 6 ثيمات × فاتح/داكن) — صفحة قبول قبل أي دمج.

### ④ مسارات عمل أخرى قائمة (من جلسات سابقة — راجع الوثائق)
- **أمان**: نشر RLS المبني على الصلاحيات من `db/migrations/0008` (دوال `hub.has_permission/current_staff_id` غير موجودة في الإنتاج!) — اقرأ `docs/handoff-security-hardening-2026-11-11.md` قسم 7 قبل لمس `db/`.
- ملاحظات المالك الـ44: `docs/feedback-round1-2026-11-11.md` (عناصر F/C/M/B — بعضها أُنجز: C3/C4، التحويل الشامل، التثبيت بالقاعدة، المفضلة…، والبقية موثقة هناك).
- تسريب الأسرار التاريخي في المستودع العام + `CREDENTIALS_AND_ACCESS.md` ما زال موجوداً (كلمة مرور قاعدة حية سطوره 76-77) — التدوير تم سابقاً لكن الملف لم يُحذف.
- مفاتيح `getSupabaseAdmin()` بعض المسارات ما زالت بلا مفتاح خدمة صالح (contacts/favorites/pins/polls/signatures) — تحتاج مفتاح خدمة جديد من المالك أو التحويل إلى `q()`.

## 5) أخطاء يجب ألا تقعها (دروس موثقة)

1. **الجلسات المتوازية تعدّل نفس الملفات** — أعد قراءة أي ملف قبل كل تعديل (حدث 3 مرات اليوم). قبل الرفع: `next build` كامل (حدث كسر عابر من ملف غير مكتمل لجلسة أخرى — أصلحته هي).
2. **عند نقل JSX من فرع شرطي احتفظ بحارسه** — سبب انهيار `/inbox` الأسود (`73f2821` أصلحه).
3. **روابط `blob:` المتفائلة لا تُغلَّف بوكيل الوسائط**.
4. بناء ويندوز أحياناً يفشل في خطوة `standalone` بنسخ (`ENOENT prerender-manifest.json`) — **أعد المحاولة**، ليس خطأ كود.
5. Supabase pooler `:6543` يقطع الاتصال على DDL متعدد — استخدم `:5432` أو بياناً بياناً.
6. كل شيء من القاعدة حقيقي — **ممنوع الأرقام الوهمية**، والمستخدم يتحقق بنفسه على السيرفر الحي، ويرسل «أكمل» كثيراً أثناء الانتظار — واصل دون إعادة سؤال.

## 6) تعريف المنجز النهائي

- [ ] صفر ألوان مثبتة في `TSX` (لا `purple-*`/`slate-*`/`hex`) خارج الخرائط
- [ ] صفر `alert()` · صفر `<select>` خام في الشاشات الجديدة · `Esc` يعمل في كل نافذة
- [ ] كل نوافذ الصندوق على `Modal` الموحدة (المتبقي: درج المفضلة)
- [ ] الوحش مقسوم لخطافات + مكوّنات (كل ملف ≤ ~800 سطر) والمنطق محفوظ 100%
- [ ] الصور الحقيقية تظهر للجهات التي لها صور في واتساب
- [ ] سياسة الإسناد مطبقة (المدير فوق الإسناد؛ الوسم يظهر فقط للموظفين)
- [ ] حذف جسر `purple-*` وطبقة الإصلاح وبلوكات الثيمات القديمة
- [ ] `design-kit` فهرس رسمي يُعتمد قبل الدمج
- [ ] كل مرحلة: `next build` أخضر → رفع → نشر → تحقق حي من المالك
