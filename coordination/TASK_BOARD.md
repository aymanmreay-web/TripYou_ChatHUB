| ID | Task | Owner | Status | Depends |
|---|---|---|---|---|
| HUB-001 | Provision Hostinger VPS, Traefik, DNS for resvbar.com subdomains | Main+user | todo | DNS access |
| HUB-002 | Supabase project + apply db/migrations + seed | Main | todo | HUB-001 |
| HUB-003 | hub-api: /me /modules /health with JWT+RLS | Claude2 | todo | HUB-002 |
| HUB-004 | hub-web shell: RTL, login, role-driven nav, "coming soon" pages, design tokens | Antigravity | done | openapi.yaml (mock) |
| HUB-005 | SPIKE: Chatwoot iframe + Platform API SSO behind Traefik | Claude2 | todo | HUB-001 |
| HUB-006 | Migrate existing Chatwoot/Evolution data to new VPS | Main+user | todo | HUB-001 |
| HUB-007 | Outbound router + signature (v0.2) | Claude2 | todo | HUB-003 |
| HUB-008 | Contacts master + CSV import (v0.3) | Claude2+Antigravity | todo | HUB-002 |
