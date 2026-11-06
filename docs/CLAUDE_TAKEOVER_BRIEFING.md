# 🚀 الدليل التنفيذي الشامل للذكاء الاصطناعي الخارجي (Claude / LLM Takeover Master Briefing)
> **المشروع:** TripYou_ChatHUB — منصة إدارة محادثات واتساب متعددة الخطوط  
> **المالك والمشرف التقني:** المهندس أيمن مريعي (Eng. Ayman Mreay)  
> **تاريخ التحديث:** 2026-11-07  
> **آخر Commit مستقر:** `8b2b6ad` على فرعي `main` و `wip/antigravity-continue`  
> **حالة البناء:** ✅ `npm run build` ناجح 100% (21 صفحة مسارات كاملة بدون أي خطأ)  
> **حالة المنصة الحية:** ✅ [https://hub.69.62.122.89.sslip.io](https://hub.69.62.122.89.sslip.io)  

---

## 🎯 1. ملخص المشروع والهدف المعماري
نظام سحابي موحد ومستقل لإدارة المحادثات وخدمة عملاء واتساب لشركة السياحة والسفر (TripYou) مع دعم White-labeling لبيعه لاحقاً لأي شركة أخرى:
1. **محرك واتساب:** `Evolution API v2.3.7` يعمل على السيرفر المحلي بحاوية دوكر على البورت `8085`.
2. **قاعدة البيانات السحابية:** `Supabase Cloud PostgreSQL` في منطقة `eu-west-1`، تدير الموظفين، الأدوار، الصلاحيات، الصناديق، الوسوم، الحالات، وإعدادات الشركة.
3. **تطبيق الويب والواجهة:** `Next.js 14 (App Router)` بتصميم Dark Purple نخب أول، متوافق مع كافة أحجام الشاشات.

---

## 🔑 2. بيانات الاعتماد والاتصال المباشر (Credentials & Vault)

### أ) لوحة وسحابة Supabase
- **URL:** `https://aypnxljvudjtasofiuhp.supabase.co`
- **Anon Key:** `sb_publishable_Koc-CGSP-_RZQqSkTBiClA_Vgbm0n86`
- **Service Role Secret Key:** `sb_secret_ni5qHxMwbkRk_bJdu1Ds_Q_SjeO3WJN`
- **Postgres Database URL:**
  `postgresql://postgres.aypnxljvudjtasofiuhp:gkaYY9j%2B2M%25Z%26BD@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true`
- **المخطط الأساسي:** `hub` (الجداول: `staff`, `roles`, `permissions`, `role_permissions`, `inboxes`, `company_settings`, `tag_rules`, `conversations`, `messages`, `lines`).

### ب) محرك Evolution API
- **URL:** `https://evo.69.62.122.89.sslip.io`
- **API Key:** `bc6075e9f95967407faae5d0fa9ac875a8d88a94782172db`
- **Swagger Docs:** `https://evo.69.62.122.89.sslip.io/docs`
- **الخط الأساسي المتصل:** `Master` (`+963 962 128 616`)

### ج) خادم Hostinger VPS
- **IP:** `69.62.122.89` (Virtual Machine ID: `1507912`)
- **لوحة التحكم:** Hostinger hPanel
- **ملاحظة تشغيلية حاسمة بخصوص SSH:**
  > إذا كان اتصال SSH المباشر من جهاز محلي يعطي `Timed Out`، فالسبب هو تشغيل برامج VPN محلية مثل UrbanVPN التي تحجب بورت 22 الخارجي. الإدارة الدوكرية تتم عبر **Hostinger MCP** أو **Web Terminal** المدمج في لوحة Hostinger.

### د) مستودعات GitHub
- **المستودع الرئيسي (Origin):**
  `https://github.com/aymanmreay-web/TripYou_ChatHUB`
- **المستودع الرديف (resvbar-hub):**
  `https://github.com/aymanmreay-web/resvbar-hub`

---

## 🏛️ 3. ما تم إنجازه واكتماله بالكامل (Completed Features)

1. **المصادقة الواقعية والربط الصارم مع Supabase (`authDb.ts` + `hubDb.ts`):**
   - تم إلغاء أي بيانات تجريبية أو دخول افتراضي (super_admin).
   - الجلسة تقرأ من Supabase Auth، ويتم جلب سجل الموظف من جدول `hub.staff`.
   - يتم سحب الصلاحيات الـ 40 من جدول `hub.role_permissions` و `hub.roles`.
   - الموظف المعلق أو الموقوف يتم توجيهه تلقائياً إلى صفحة الانتظار `/pending-approval`.
2. **إدارة الموظفين الحقيقية (`/module/staff`):**
   - اعتماد/رفض الموظفين، تغيير الدور (Role)، الحالة (active, pending, suspended).
   - ربط الخطوط المسموحة والصناديق وتفعيل/إلغاء قفل المحادثات بحفظ حقيقي في قاعدة البيانات.
   - قراءة الأدوار والصناديق والخطوط مباشرة من سوبابيز بدون أي قيم ثابتة وهمية.
3. **الصناديق وهوية الشركة (`/module/inboxes` و `/module/settings`):**
   - جداول `public.inboxes` و `public.company_settings` مربوطة بالكامل مع Supabase.
   - دعم رفع شعار الشركة واسم المنصة (White-labeling)، ويظهر مباشرة في الهيدر وصفحة الدخول والسايدبار.
4. **الوسوم والحالات ومنتقي الألوان (`ModernColorPicker.tsx` و `/module/labels`):**
   - تطوير مكون منتقي ألوان احترافي يحتوي على مئات الدرجات اللونية مع Hex input.
   - ربط الوسوم والحالات الخمس وسجل الألوان مع قاعدة البيانات.
5. **تنظيف الواجهات من الكلمات التقنية المسربة:**
   - حذف عبارات "Evolution API" و "Baileys Engine" من كافة الأزرار والترويسات.
   - حذف عبارة "إدارة المحادثات 2026" من تحت الشعار.
   - حذف عبارة "ثلاثي الأبعاد (3D Contacts Hub)" من صفحة جهات الاتصال.
6. **إصلاح شاشة الدخول (`/login`):**
   - صفحة نظيفة خالية من السكرول المزعج، مع زر دخول موحد وزر Google Auth.

---

## 📋 4. المهام المتبقية بدقة وترتيبها التنفيذي (Remaining Action Plan)

| # | المهمة | الملف المعني | التفاصيل المطلوبة |
|---|---|---|---|
| **1** | **تفعيل Google OAuth** | Supabase Dashboard | إدخال Client ID و Secret في لوحة سوبابيز للموافقة على تسجيل دخول الموظفين عبر حساب غوغل، وتفعيل Trigger لإدراجهم في جدول `hub.staff` كـ `pending`. |
| **2** | **إصلاح المفضلة داخل المحادثات** | `NativeChatInbox.tsx` و `Sidebar.tsx` | جعل النقر على المفضلة في السايدبار يفلتر المحادثات المفضلة داخل `InboxPage` دون فتح صفحة مستقلة مشوهة. |
| **3** | **محرك ألبوم الصور والـ Lightbox** | `NativeChatInbox.tsx` | - تجميع الصور المرسلة دفعة واحدة كألبوم.<br>- إضافة أزرار التنقل (السابق/التالي) في عارض الصور Lightbox.<br>- تغيير زر التنزيل إلى "حفظ إلى الجهاز المحلي". |
| **4** | **قواعد الوسوم التلقائية** | `/module/labels` | إضافة تبويب "قواعد الإسناد الذكي" لجدول `hub.tag_rules` لإضافة وسوم تلقائية حسب كلمات مفتاحية. |
| **5** | **فحص الصلاحيات على مستوى الصفحات** | `AppShell.tsx` | حظر دخول الصفحات الإدارية إذا لم يمتلك الموظف الصلاحية المطلوبة في `userPermissions`. |

---

## 💡 5. تعليمات صارمة للمطور التالي
- **لا تعبث بملفات إعدادات النشر أو البورتات**، النظام يعمل عبر Traefik وموجه لـ `hub.69.62.122.89.sslip.io`.
- **حافظ على نظافة البناء:** شغّل دائماً `npm run build` وتأكد من عدم وجود أخطاء TypeScript قبل أي Commit.
- **التزم بالهوية العربية الاحترافية:** الواجهات موجهة لمدراء وموظفي شركات سفر راقية، لا تضع شروحات برمجية في واجهات المستخدم.
