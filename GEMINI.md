# قواعد المشروع الصارمة — TripYou ChatHUB

## 🚨 قاعدة صارمة ودائمة: إدارة Hostinger VPS والنشر التلقائي (DO NOT VIOLATE)

1. **Hostinger MCP مفعّلة وجاهزة بالكامل:**
   - السيرفرات المتاحة: `hostinger-vps` (execute, search, multi-execute), `hostinger-hosting`, `hostinger-billing`, `hostinger-dns`.
   - معرف السيرفر (Virtual Machine ID): `1507912`
   - عنوان السيرفر (IP): `69.62.122.89`

2. **قناة النشر المعتمدة:**
   - GitHub Actions → يبني ويرفع الصورة إلى `ttl.sh/tripyou-chathub-web-prod:24h`.
   - Hostinger MCP `vps_docker_create` → يسحب ويشغّل الحاوية على السيرفر.
   - **يُمنع منعاً باتاً** طلب فتح `hPanel Terminal` أو إعطاء أوامر Docker يدوية للمهندس أيمن مريعي.

3. **القاعدة الذهبية الصارمة:**
   - أنت المسؤول المباشر عن تنفيذ الـ Pull، والبناء، وإعادة التشغيل، ومراقبة الذاكرة وإيقاف الخدمات الزائدة.
   - تعامل مع السيرفر بنفسك دائماً وفوراً باستخدام Hostinger MCP.

---

## 1. قاعدة اتجاه النص العربي وضبط النصوص ثنائية اللغة (RTL + Bidirectional) — صارمة وإلزامية

### 1-أ. كل عنصر يحتوي نصاً عربياً يجب أن يحمل ما يلي:
```
dir="rtl"           ← في HTML / JSX
className="... text-right"   ← في Tailwind
```

### 1-ب. الحاوية الرئيسية للتطبيق يجب أن تحتوي دائماً:
```html
<html lang="ar" dir="rtl">
```

### 1-ج. ضبط الكلمات الإنجليزية داخل الجملة العربية (Inline Latin Words):
- أي كلمة أو مصطلح إنجليزي داخل نص عربي **يجب إحاطتها** بعنصر يحدد اتجاهها بشكل صريح:
```tsx
// ✅ صحيح — الكلمة الإنجليزية محاطة بـ span مع dir="ltr" وunicode-bidi
<span dir="ltr" className="inline-block unicode-bidi-isolate">Evolution API</span>

// ❌ خاطئ — الكلمة الإنجليزية مكتوبة عارية داخل نص عربي
<div dir="rtl">خطوط Evolution API المتصلة</div>
```

### 1-د. استخدام `bdi` أو `isolate` لعزل النص ثنائي الاتجاه:
```tsx
// للأرقام والأكواد والأسماء الإنجليزية داخل النص العربي:
<bdi className="font-mono text-purple-400">+966554125782</bdi>
<bdi className="font-semibold">Master</bdi>
<bdi className="font-mono">bc6075e9...</bdi>
```

### 1-هـ. ضبط Tailwind CSS للنصوص ثنائية الاتجاه:
```tsx
// ✅ نص عربي صحيح
<div className="text-right font-arabic" dir="rtl">نص عربي</div>

// ✅ حقل إدخال باتجاه RTL
<input dir="rtl" className="text-right placeholder:text-right" />

// ✅ قائمة عناصر RTL
<ul className="space-y-2 text-right" dir="rtl">
  <li>عنصر</li>
</ul>

// ✅ حاوية flex داخل RTL (العناصر تُرتب من اليمين)
<div className="flex items-center gap-3 flex-row-reverse" dir="rtl">
  ...
</div>
```

---

## 2. قواعد مكونات JSX / TSX العامة للمشروع

### 2-أ. كل Component يعرض نصاً عربياً:
- يجب إضافة `dir="rtl"` على العنصر الجذري له أو على الحاوية المباشرة.
- يجب استخدام `text-right` كإعداد افتراضي لمحاذاة النص.

### 2-ب. النماذج (Forms) والحقول:
```tsx
// ✅ حقل إدخال باللغة العربية
<input
  dir="rtl"
  className="w-full text-right placeholder:text-right"
  placeholder="اكتب هنا..."
/>

// ✅ قائمة منسدلة عربية
<select dir="rtl" className="text-right">
  <option>اختر</option>
</select>
```

### 2-ج. الرسائل والإشعارات:
```tsx
// ✅ Toast أو Alert عربي
<div role="alert" dir="rtl" className="text-right">
  تم حفظ البيانات بنجاح
</div>
```

---

## 3. قواعد CSS و Tailwind

### 3-أ. إضافة `dir-rtl` كـ Utility Class:
في الملفات العامة (`globals.css`):
```css
.dir-rtl {
  direction: rtl;
  text-align: right;
  unicode-bidi: embed;
}
.isolate-latin {
  display: inline-block;
  direction: ltr;
  unicode-bidi: isolate;
}
```

### 3-ب. ضبط flexbox مع RTL:
- **لا تستخدم** `ml-*` و`mr-*` مع النصوص العربية — استخدم `gap-*` بدلاً منها.
- إذا كانت الحاوية RTL، الاتجاهات تنعكس تلقائياً، لكن **تحقق دائماً** من مواضع الأيقونات والأسهم.

---

## 4. أولويات التنفيذ ومتطلبات المراجعة

- **عند كتابة أي Component جديد** يعرض نصاً عربياً → يجب مراجعة قواعد هذا القسم قبل إتمام الكود.
- **عند مراجعة أي Pull Request** → ابحث عن أي نص عربي في JSX بدون `dir="rtl"` وأضفه.
- **الكلمات الإنجليزية التقنية** (أسماء الوظائف، الأكواد، الأرقام، الـ IDs) داخل الجمل العربية يجب دائماً إحاطتها بـ `<bdi>` أو `<span dir="ltr">`.

---

## 5. أمثلة مقارنة: خطأ شائع مقابل الصواب

| الحالة | ❌ خطأ | ✅ صحيح |
|--------|--------|---------|
| عنوان صفحة عربي | `<h1>قائمة المفضلات (Favorites)</h1>` | `<h1 dir="rtl">قائمة المفضلات <bdi>Favorites</bdi></h1>` |
| رقم هاتف في نص | `<p>الرقم: +966554125782</p>` | `<p dir="rtl">الرقم: <bdi dir="ltr">+966554125782</bdi></p>` |
| حقل إدخال | `<input placeholder="الاسم" />` | `<input dir="rtl" className="text-right" placeholder="الاسم" />` |
| زر يحتوي أيقونة + نص | `<button><Icon/> نص عربي</button>` | `<button dir="rtl" className="flex items-center gap-2 flex-row-reverse"><span>نص عربي</span><Icon/></button>` |
| اسم قسم + قيمة انجليزية | `<div>الحالة: connected</div>` | `<div dir="rtl">الحالة: <bdi dir="ltr" className="font-mono text-emerald-400">connected</bdi></div>` |

