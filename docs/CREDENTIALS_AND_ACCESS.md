# 🔐 الدليل الشامل لبيانات الاعتماد والروابط والمفاتيح (Master Credentials & Access Vault)
> **مشروع:** TripYou_ChatHUB  
> **إشراف:** م. أيمن مريعي — Eng. Ayman Mreay  
> **تاريخ التوثيق:** 2026-11-04  
> **سرّي ومحمي — لمالك النظام وفريق العمل المعتمد فقط**

---

## 1. بيانات خادم Hostinger VPS الرئيسي
| البيان | القيمة / الرابط | ملاحظات |
|---|---|---|
| **عنوان IP السيرفر (IPv4)** | `69.62.122.89` | السيرفر المباشر والحي لجميع الحاويات |
| **عنوان IPv6** | `2a02:4780:f:9f34::1` | |
| **معرّف الخادم (VPS ID)** | `1507912` | في لوحة Hostinger hPanel |
| **اسم المضيف (Hostname)** | `srv1507912.hstgr.cloud` (allinhub.com) | |
| **المعالج والرام** | 2 vCPU / 8192 MB RAM / 100 GB NVMe | خطة KVM 2 |
| **نظام التشغيل (OS Template)** | Ubuntu 24.04 with n8n (Template 1153) | |
| **مركز البيانات (Data Center)** | ID 18 (Hostinger Global DC) | |
| **منفذ SSH** | `22` (المستخدم: `root`) | يتم الدخول عبر مفتاح SSH أو كلمة مرور hPanel |

---

## 2. النطاقات والروابط العامة (Live URLs & Subdomains)
| الخدمة | الرابط الحي | المنفذ الداخلي | آلية التوجيه (SSL) |
|---|---|---|---|
| **منصة الشات والمزامنة (Hub Web App)** | [https://hub.69.62.122.89.sslip.io](https://hub.69.62.122.89.sslip.io) | `3000` | Traefik Auto Let's Encrypt SSL |
| **محرك واتساب (Evolution API)** | [https://evo.69.62.122.89.sslip.io](https://evo.69.62.122.89.sslip.io) | `8085` | Traefik Auto Let's Encrypt SSL |
| **واجهة Evolution Swagger API Docs** | [https://evo.69.62.122.89.sslip.io/docs](https://evo.69.62.122.89.sslip.io/docs) | `8085` | لاختبار استدعاءات API |
| **خادم n8n للأتمتة** | [https://69.62.122.89.sslip.io](https://69.62.122.89.sslip.io) | `5678` | Traefik SSL |

---

## 3. مفاتيح الـ API والرموز السرية (API Keys & Secrets)

### أ) مفتاح محرك Evolution API الرسمي:
```env
EVOLUTION_URL=https://evo.69.62.122.89.sslip.io
EVOLUTION_API_KEY=bc6075e9f95967407faae5d0fa9ac875a8d88a94782172db
```
> **الهيدر المطلوب عند أي استدعاء:** `apikey: bc6075e9f95967407faae5d0fa9ac875a8d88a94782172db`

### ب) خطوط وأرقام واتساب الحالية داخل Evolution API:
- **الخط الرئيسي (Master):** `Master` — متصل ومستقر `open` (الرقم: `+963 962 128 616`).
- **المثيلات الإضافية الجاهزة:** يمكن إضافة `Sales-1` و `Support-1` عبر رمز QR من واجهة المنصة بنقرة واحدة.

### ج) أسرار المنصة والويب هوك (Hub Platform Secrets):
```env
BASE_DOMAIN=69.62.122.89.sslip.io
WEBHOOK_SECRET=c64b63ff-b70d-4537-b873-1f19fae155e8
JWT_SECRET=f8a42e5d9c7b1a3e8f2d4c6b0a8e1f3d5c7b9a2e4f6d8c0b2a4e6f8d0c2b4a6e
NEXT_PUBLIC_APP_URL=https://hub.69.62.122.89.sslip.io
```

---

## 4. مستودع الكود البرمجي (GitHub Repository)
| البيان | القيمة |
|---|---|
| **رابط المستودع** | [https://github.com/aymanmreay-web/TripYou_ChatHUB](https://github.com/aymanmreay-web/TripYou_ChatHUB) |
| **المالك / الحساب** | `aymanmreay-web` |
| **البريد الإلكتروني للـ Commit** | `aymanmreay@gmail.com` |
| **الفرع النشط الافتراضي** | `main` |

---

## 5. قواعد بيانات سوبابيز (Supabase Cloud Database Config)
عند فتح مشروعك المجاني في Supabase، ستقوم بنسخ القيم التالية ووضعها في ملف البيئة `.env.local` على جهازك وعلى السيرفر:

```env
# رابط مشروع سوبابيز
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT_ID].supabase.co

# المفتاح العام الآمن للمتصفح (Anon Public Key)
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# المفتاح السري للسيرفر والخلفية (Service Role Key - سرّي جداً)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# سلسلة الاتصال المباشرة لقاعدة بيانات PostgreSQL
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT_ID].supabase.co:5432/postgres

# أو عبر معالج التجميع Connection Pooler (الموصى به لـ Next.js serverless):
# DATABASE_URL=postgresql://postgres.[PROJECT_ID]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
```

---

## 6. حسابات المستخدمين والموظفين التجريبية (Staff Directory)
| المستخدم | الدور (Role) | البريد الإلكتروني | الصلاحيات الافتراضية |
|---|---|---|---|
| **م. أيمن مريعي** | **Super Admin (مسؤول أعلى)** | `AymanMreay@gmail.com` | وصول كامل مطلق لكافة الصناديق، الخطوط، والتدقيق |
| **سارة خالد** | **Sales Lead (مدير مبيعات)** | `sara.khalid@youtrip.com` | إدارة محادثات المبيعات، الإسناد، والتقارير |
| **محمد الدوسري** | **Support Agent (خدمة عملاء)** | `m.dosari@youtrip.com` | الرد على المحادثات المسندة، قراءة جهات الاتصال |

---

## 7. الحاويات ومنافذ السيرفر الداخلي (`69.62.122.89`)
- `tripyou-chathub-web`: المنصة الحديثة (Next.js 14) على المنفذ الداخلي `3000`.
- `evolution-api`: محرك واتساب Baileys v2.3.7-e على المنفذ `8085`.
- `traefik`: موازن الحمل وموزع الشهادات على المنافذ `80` و `443`.
- `chatwoot-rails-1` & `sidekiq-1`: الحاويات القديمة الجاري إيقافها لتحرير موارد الرام.
