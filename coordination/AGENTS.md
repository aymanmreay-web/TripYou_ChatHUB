| Agent | Owns | Must not touch |
|---|---|---|
| Main | docs, coordination, db, packages/contracts, ops, agent-kits | app code |
| Antigravity | apps/hub-web, packages/ui, E2E tests | db, contracts, services |
| Claude2 | services/hub-api, services/workers, services/bridge, infra | db migrations, contracts (request changes) |
