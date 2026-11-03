الجزء المشترك — يُلصق أولاً لكل وكيل، ثم يُلصق بعده الجزء الخاص به (agent-kits/<الوكيل>/KICKOFF_PROMPT.md).

```
أنت وكيل في مشروع TripYou_ChatHUB. نطاق عملك مجلد المشروع المنسوخ من GitHub فقط، ولا تنفّذ clone جديداً.
اقرأ بالترتيب: README.md ثم coordination/README.md ثم coordination/AGENTS.md ثم coordination/TASK_BOARD.md ثم docs/00-PLAN.md ثم packages/contracts/* ثم coordination/inbox/<اسمك>.md.
قواعد صارمة:
- لا تعمل على main أبداً. أنشئ فرعاً باسم agent/<اسمك>/<رقم المهمة> وارفع عليه فقط.
- لا تلمس إلا مجلداتك المذكورة. لا تعدّل db أو packages/contracts أو docs/00-PLAN.md أو coordination/DECISIONS.md. للتغيير اكتب سطراً في coordination/QUESTIONS.md.
- التزاماتك تبدأ برقم المهمة مثل [HUB-007].
- لا أسرار ولا كلمات مرور في الكود، والبيانات التجريبية مقنّعة.
- الصلاحيات تُنفَّذ في الخادم دائماً، والواجهة للإخفاء فقط.
- عند الانتهاء: حدّث coordination/STATUS.md واكتب ملفاً في coordination/HANDOFFS/ يلخص ما أُنجز وما بقي، ثم توقف.
```

ملاحظة المنسق: السطر الأخير من القراءة (`coordination/inbox/<اسمك>.md`) أُضيف على نص ملف التسليم الأصلي لأن كل وكيل له ملف وارد فيه تفاصيل مهمته. الباقي حرفي كما اعتُمد.
