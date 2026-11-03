| ID | Task | Owner | Status | Depends |
|---|---|---|---|---|
| HUB-001 | Provision Hostinger VPS, Traefik, DNS for resvbar.com subdomains | Main+user | todo | DNS access |
| HUB-002 | Supabase / Postgres DB + apply db/migrations + seed | Main | in_progress | HUB-001 |
| HUB-003 | hub-api: Evolution Webhooks, /conversations, /messages, /lines with JWT | Claude2+Antigravity | in_progress | HUB-002 |
| HUB-004 | hub-web shell: RTL, login, role-driven nav, "coming soon" pages, design tokens | Antigravity | done | openapi.yaml |
| HUB-005 | Native Chat UI: direct WhatsApp multi-line inbox, signature engine (No Chatwoot) | Antigravity | done | HUB-004 |
| HUB-006 | Evolution API Direct Integration & Webhook Handler | Claude2+Antigravity | in_progress | HUB-003 |
| HUB-007 | Outbound router + dynamic line switcher + smart signature | Antigravity | done | HUB-005 |
| HUB-008 | Contacts master + CSV import (v0.3) | Claude2+Antigravity | todo | HUB-002 |
| HUB-009 | Decommission Chatwoot from Hostinger VPS & reclaim server memory | Main+user | pending_readiness | HUB-006 |
