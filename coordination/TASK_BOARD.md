| ID | Task | Owner | Status | Depends |
|---|---|---|---|---|
| HUB-001 | Provision Hostinger VPS, Traefik, DNS (sslip.io active) | Main+user | done | DNS access |
| HUB-002 | Supabase / Postgres DB + apply db/migrations + master setup | Main | done | HUB-001 |
| HUB-003 | hub-api & Evolution Webhooks direct REST bridge | Main+Eng | done | HUB-002 |
| HUB-004 | hub-web shell: RTL, login, role-driven nav, design tokens | Main | done | openapi.yaml |
| HUB-005 | Native Chat UI: direct WhatsApp multi-line inbox, waveform, polls | Main | done | HUB-004 |
| HUB-006 | Evolution API Direct Integration & QR connection | Main | done | HUB-003 |
| HUB-007 | Outbound router + dynamic line switcher + 3-part signature engine | Main | done | HUB-005 |
| HUB-008 | Labels, real colors, 5-status machine, SLA editor | Main | done | HUB-002 |
| HUB-009 | Decommission Chatwoot from Hostinger VPS & reclaim server memory | Main+user | pending_readiness | HUB-006 |
| HUB-010 | Staff licensing queue, Google OAuth flow, line access & conv lock | Main | done | HUB-002 |
