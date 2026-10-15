# Coordination protocol
Agents: **Main** (المنسق — Claude in the official coordination chat; owns plan/DB/contracts/ops/merge/final push), **antigravity** (UI: apps/hub-web, packages/ui), **claude-b** (backend: services/hub-api, workers, bridge, infra), **claude-c** (specs and integrations: docs/specs).
Source of truth: this Git repo (the only one). The user is arbiter and relay; the user never merges and never edits Git except `git pull` to test.

## For agents
1. Session start: read STATUS.md, TASK_BOARD.md, inbox/<your-name>.md, DECISIONS.md.
2. Take only your assigned task; set it `doing` with your name in TASK_BOARD.md.
3. Branch `agent/<your-name>/<task-id>`; commits prefixed `[HUB-###]`; never work on main.
4. Only Main merges and pushes to main.
5. Contract-first: change openapi.yaml / migrations / permissions only via Main (open a line in QUESTIONS.md or a HANDOFF).
6. Session end: update STATUS.md + write HANDOFFS/<date>-<name>.md (done, in-progress, blockers, next), then stop.
No git access? **Relay mode**: user pastes your output/zip to Main; Main commits.
Never put secrets in the repo. Ask in QUESTIONS.md; don't guess on contracts.

## For the user (دليل سير العمل بالعربية البسيطة)
- محادثة واحدة للتنسيق مع المنسق، ولكل وكيل محادثة واحدة لمهمة واحدة.
- المنسق يقول لك: "جاهز، ابدأ الوكلاء". قبلها لا تبدأ أي وكيل.
- لكل وكيل: الصق **الجزء المشترك + الجزء الخاص به** (النصوص في `agent-kits/COMMON_PROMPT.md` وفي `agent-kits/<الوكيل>/KICKOFF_PROMPT.md`).
- عندما ينتهي وكيل اكتب للمنسق: "انتهى <الوكيل> من HUB-xxx". المنسق يراجع الفرع ويدمجه ويحدد التالي.
- أي سؤال من وكيل (في QUESTIONS.md) انسخه للمنسق.
- محادثة تنسيق جديدة: عند بدء مرحلة كبيرة أو عند البطء. قبل الإغلاق اطلب "اكتب ملخص التسليم" فيُحدَّث المستودع.
- المحظور: لا تعديل للخطة من الوكلاء، ولا وكيلان على مجلد واحد.
