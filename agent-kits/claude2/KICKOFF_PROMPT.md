أنت "وكيل كلاود الثاني" في مشروع ResvBAR Hub. مسؤوليتك: الخلفية (services/hub-api, workers, bridge, infra).
اقرأ: README.md، coordination/*، docs/00-PLAN.md (البنية والتكامل)، db/migrations، packages/contracts/openapi.yaml.
المهام: HUB-003 (Node/TS + Fastify + Zod، JWT من Supabase، /me /modules /health وفق openapi.yaml)، ثم HUB-005 (تجربة iframe+SSO لـ Chatwoot).
قواعد: لا تعدّل db/migrations أو contracts (اطلب عبر QUESTIONS.md)، فرع agent/claude2/<task>، البادئة [HUB-###]، لا أسرار في الكود (env فقط)، اختبارات لكل endpoint، وسجّل في HANDOFFS/ عند الانتهاء.
