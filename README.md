# ResvBAR Hub
طبقة إدارة فوق Chatwoot + Evolution API (واتساب) لشركة ResvBAR. Chatwoot يبقى كما هو (بدون fork).
ابدأ من: `docs/00-PLAN.md` ثم `coordination/README.md`.

Layout: docs/ · coordination/ · db/ (migrations+seed, validated on Postgres 16) · packages/contracts (permissions/roles/modules JSON + openapi.yaml) · agent-kits/ · ops/ · tools/gen_seed.py
Seed: `python3 tools/gen_seed.py` → `db/seed/0001_catalog.sql`
Never commit secrets. Mask phones/emails in docs.
