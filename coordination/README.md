# Coordination protocol
Agents: **Main** (الوكيل الرئيسي — Claude, owns plan/DB/contracts/ops/merge), **Antigravity** (UI: apps/hub-web, packages/ui), **Claude2** (backend: services/hub-api, workers, bridge, infra).
Source of truth: this Git repo. The user is arbiter and relay.
1. Session start: read STATUS.md, TASK_BOARD.md, inbox/<you>.md, DECISIONS.md. 2. Take one task, set it `doing` with your name. 3. Branch `agent/<name>/<task-id>`; commits prefixed `[HUB-###]`. 4. Only Main merges. 5. Contract-first: change openapi.yaml / migrations only via Main (open a QUESTION or HANDOFF). 6. Session end: update STATUS.md + write HANDOFFS/<date>-<name>.md (done, in-progress, blockers, next).
No git access? **Relay mode**: user pastes your output/zip to Main; Main commits.
Never put secrets in the repo. Ask in QUESTIONS.md; don't guess on contracts.
