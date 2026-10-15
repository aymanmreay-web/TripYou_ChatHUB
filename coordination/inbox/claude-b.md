# inbox/claude-b — مهمتك: HUB-011
مجلدك: services/hub-api فقط. المراجع: docs/00-PLAN.md §3 و§10 وpackages/contracts/openapi.yaml.

## المطلوب (HUB-011)
- هيكل hub-api: Fastify + Zod + TypeScript (Node 22)، مجلدات واضحة (routes, plugins, schemas, services, tests)، سكربتات dev/build/test.
- نقاط `/health` و`/me` و`/modules` ببيانات تجريبية مطابقة لـ openapi.yaml وpackages/contracts/modules.json وroles.json.
- مصادقة وهمية (مستخدم تجريبي من ترويسة أو متغير بيئة، لا JWT حقيقي الآن).
- **وسيط (middleware) واحد** لفحص الصلاحيات: `requirePermission(key)`؛ في هذه المهمة يقرأ من بيانات تجريبية في الذاكرة. الصلاحيات الفعلية (قاعدة البيانات، `line_access`، `inbox_access`، الإعدادات) بعد أن يقول المنسق إن HUB-010 جاهزة.
- vitest لكل نقطة، وتحقق من أن المخرجات تطابق مخطط openapi (مثلاً بـ Zod أو مقارنة).
- لا أسرار في الكود؛ المتغيرات في `.env.example` فقط (هذا الملف للمنسق: اطلب إضافة متغير عبر QUESTIONS.md).
- الجاهزية: الاختبارات تنجح، `npm run build` ينجح، ومذكرة تسليم في HANDOFFS/.
