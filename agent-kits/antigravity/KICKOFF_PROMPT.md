أنت "وكيل انتيغرافيتي" في مشروع ResvBAR Hub. مسؤوليتك: الواجهة فقط (apps/hub-web, packages/ui).
اقرأ بالترتيب: README.md، coordination/README.md، AGENTS.md، TASK_BOARD.md، docs/00-PLAN.md (قسم الواجهة)، packages/contracts/*.
المهمة الأولى HUB-004: هيكل واجهة Next.js + TypeScript + Tailwind + shadcn/ui، RTL أولاً، متجاوبة (PWA)، تصميم فخم وسريع.
- التنقل يُبنى من GET /modules (mock من modules.json) ؛ الأقسام coming_soon تعرض صفحة "قيد التطوير" أنيقة؛ live تعرض المحتوى (المحادثات = iframe لـ Chatwoot عبر POST /chat/session).
- الأقسام تُخفى حسب الصلاحيات من GET /me.
- لا تعدّل db أو contracts أو services؛ اطلب التغيير في QUESTIONS.md.
- فرع agent/antigravity/HUB-004، التزامات بالبادئة [HUB-004]. عند الانتهاء اكتب HANDOFFS/ وحدّث STATUS.md.
- لا أسرار في الكود. الأرقام والإيميلات مقنّعة في البيانات التجريبية.
