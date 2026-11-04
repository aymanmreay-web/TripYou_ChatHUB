# 🚀 دليل إعداد وربط قاعدة بيانات Supabase خطوة بخطوة
> **مشروع:** TripYou_ChatHUB  
> **الملف التنفيذي:** [`db/supabase_master_setup.sql`](file:///d:/LastResvBAR/resvbar-hub/db/supabase_master_setup.sql)  
> **الهدف:** تجهيز قاعدة بيانات سحابية فائقة السرعة تدعم Realtime بدون استهلاك أي ميجابايت من خادم السيرفر.

---

## الخطوة 1: إنشاء مشروع جديد في Supabase (دقيقة واحدة)
1. افتح موقع سوبابيز: [https://supabase.com](https://supabase.com) وسجل الدخول بحسابك.
2. اضغط على **"New Project"**.
3. اختر اسم المشروع، مثلاً: `tripyou-chathub`.
4. أدخل كلمة مرور قوية لقاعدة البيانات **Database Password** (واحفظها جيداً!).
5. اختر أقرب منطقة جغرافية للمستخدمين (مثلاً: `Frankfurt` أو `Bahrain` إذا توفرت).
6. اختر الخطة المجانية **Free Plan** ثم اضغط **"Create new project"**.

---

## الخطوة 2: تطبيق ملف المخطط والجداول (30 ثانية)
1. من القائمة الجانبية اليسرى في لوحة Supabase، اضغط على **SQL Editor** (أيقونة `>_`).
2. اضغط على زر **"New query"**.
3. افتح ملف [`db/supabase_master_setup.sql`](file:///d:/LastResvBAR/resvbar-hub/db/supabase_master_setup.sql) وانسخ محتواه بالكامل.
4. الصق الكود في المحرر واضغط على الزر الأخضر **"Run"** أسفل الشاشة.
5. ستظهر لك عبارة **"Success. No rows returned"** — هذا يعني أنه تم بناء كافة الجداول والمخطط `hub` والأدوار وقاطع الدائرة والصلاحيات بنجاح تام!

---

## الخطوة 3: نسخ المفاتيح والروابط (Copy API Keys)
من القائمة الجانبية اليسرى:
1. اذهب إلى **Project Settings** (أيقونة الترس ⚙️) ثم اختر **API**:
   - انسخ **Project URL** (مثل: `https://xyzcompany.supabase.co`).
   - انسخ **anon public key** (المفتاح العام).
   - انسخ **service_role secret key** (المفتاح السري للخلفية).

2. اذهب إلى **Project Settings** -> **Database**:
   - انزل إلى قسم **Connection String**.
   - اختر تبويب **URI** أو **Session / Transaction Pooler**.
   - انسخ الرابط واستبدل `[YOUR-PASSWORD]` بكلمة المرور التي اخترتها في الخطوة 1.

---

## الخطوة 4: وضع المفاتيح في ملف البيئة `.env.local`
افتح الملف `apps/hub-web/.env.local` وأضف الأسطر التالية:

```env
# رابط محرك Evolution API الحي على السيرفر
EVOLUTION_URL=https://evo.69.62.122.89.sslip.io
EVOLUTION_API_KEY=bc6075e9f95967407faae5d0fa9ac875a8d88a94782172db

# مفاتيح سوبابيز السحابية الجديدة
NEXT_PUBLIC_SUPABASE_URL=https://[معرف_مشروعك].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...[المفتاح_العام]
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...[مفتاح_service_role]

# رابط اتصال PostgreSQL المباشر
DATABASE_URL=postgresql://postgres:[كلمة_المرور]@db.[معرف_مشروعك].supabase.co:5432/postgres
```

---

## ماذا تقدم لنا هذه القاعدة؟
1. **فصل معماري كامل:** محادثات واتساب الكثيفة والوسائط تدار مباشرة عبر Evolution API، بينما سوبابيز يدير:
   - سجل وحالات المحادثات (مفتوحة، قيد المعالجة، تم الحل، مؤجلة، مصعدة).
   - إسناد الموظفين وأوقات استجابتهم (SLA Timers).
   - حارس المخاطر (ساعات الهدوء، قاطع الدائرة).
   - التوقيع الذكي وسجل التدقيق الأمني.
2. **استهلاك رام سيرفر Hostinger:** صفر ميجابايت إضافية!
