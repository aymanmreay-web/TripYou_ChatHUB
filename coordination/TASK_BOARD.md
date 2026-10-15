| ID | Task | Owner | Status | Depends |
|---|---|---|---|---|
| HUB-001 | Provision Hostinger VPS, Traefik, DNS for resvbar.com subdomains | Main+user | postponed (DNS request refused; revisit later) | DNS access |
| HUB-002 | Supabase project + apply db/migrations + seed | Main | todo | HUB-010 (schema final); user creates Supabase account |
| HUB-003 | hub-api real auth: JWT from Supabase + RLS on /me /modules /health | claude-b | todo | HUB-002, HUB-011 |
| HUB-004 | hub-web shell: RTL, login, role-driven nav, "coming soon" pages, design tokens | antigravity | done | openapi.yaml (mock) |
| HUB-005 | SPIKE: Chatwoot iframe + Platform API SSO (try on the old server first; check X-Frame-Options/CSP in Apache; also verify whether per-inbox "assigned only" visibility can be enforced inside the iframe) | claude-b | postponed | Chatwoot reachable (HUB-001 or old server) |
| HUB-006 | Migrate existing Chatwoot/Evolution data to new VPS | Main+user | postponed | HUB-001 |
| HUB-007 | hub-web: light/dark toggle (saved) + mobile-first review of all screens (PWA) | antigravity | todo | none |
| HUB-008 | hub-web (mock data): line badge + picker, assignment badge, "your number is not in this group" bar, authorization-request dialog with countdowns/stages/notifications | antigravity | todo | none (reads §10-§12 of docs/00-PLAN.md) |
| HUB-009 | Merge 2026-10-15 handoff into docs/00-PLAN.md, register HUB-007..014 here, push to main | Main | done | none |
| HUB-010 | Permission contracts + DB: inbox/line access, authorization requests, group membership + templates, user settings, attendance sessions, audit (migration 0009, permissions/roles/settings/openapi) | Main | doing | HUB-009 |
| HUB-011 | hub-api skeleton: Fastify+Zod+TS, mock /me and /modules, fake auth, vitest, ONE permission middleware (real permissions only after Main says HUB-010 is ready) | claude-b | todo | HUB-010 for real permissions only |
| HUB-012 | Spec (no code): docs/specs/outbound-router.md — line check, signature, owner policy, group de-dup, Evolution 2.3.7 + Chatwoot 4.16 integration, post-authorization conversation, risks | claude-c | todo | none |
| HUB-013 | Outbound router + signature (v0.2) — was HUB-007 | claude-b | todo | HUB-003, HUB-011, HUB-012 |
| HUB-014 | Contacts master + CSV import (v0.3) — was HUB-008 | claude-b+antigravity | todo | HUB-002 |
