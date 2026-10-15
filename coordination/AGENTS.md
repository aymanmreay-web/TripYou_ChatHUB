| Agent | Owns | Must not touch |
|---|---|---|
| Main (coordinator) | docs (except docs/specs), coordination (except STATUS.md and HANDOFFS/ which every agent updates), db, packages/contracts, ops, agent-kits, tools | app code |
| antigravity | apps/hub-web, packages/ui, E2E tests | db, contracts, services |
| claude-b | services/hub-api, services/workers, services/bridge, infra | db migrations, contracts (request changes) |
| claude-c | docs/specs (specs and integrations notes; later services/integrations when Main assigns it) | everything else |

Rules: one agent per folder; branch `agent/<agent>/<task-id>`; never work on main; only Main merges and pushes to main; changes to db, contracts, docs/00-PLAN.md, DECISIONS.md go through a line in coordination/QUESTIONS.md.
