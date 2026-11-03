# ResvBAR Hub
منصة إدارة ومحادثات واتساب موحدة لعدة خطوط وأرقام متصلة مباشرة بـ Evolution API لشركة ResvBAR (بدون Chatwoot نهائياً وبدون أي وسيط ثقيل).

ابدأ من: `docs/00-PLAN.md` ثم `coordination/README.md`.

Layout: docs/ · coordination/ · db/ (migrations+seed, PostgreSQL 16) · packages/contracts · apps/hub-web · ops/ · tools/gen_seed.py
Seed: `python tools/gen_seed.py` → `db/seed/0001_catalog.sql`
Never commit secrets. Mask phones/emails in docs.
