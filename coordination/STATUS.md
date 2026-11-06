Date: 2026-11-06 · Phase: Enterprise White-label Branding & Modern UX Overhaul
- Inboxes (/module/inboxes): Full CRUD table created in DB & UI (create, edit, delete, assigned lines, filter types, modern color picker).
- Modern Color Picker: Created reusable ModernColorPicker component with modern swatches, hex input, and color-wheel.
- Labels & Statuses (/module/labels): Added custom status creator (seasonal, custom contracts), real color integration, cleaned button titles.
- White-label Branding (/module/settings & Sidebar): Company profile page, logo upload replacing static TY icon, removed '2026' text, preserved scroll position on sidebar navigation.
- Chat UI Cleanups & Media: Removed verbose technical phrases (Evolution/3D/Baileys), fixed multi-file upload HD toggle (images only), Lightbox gallery navigation with direct download label.
- Login (/login): Redesigned to sleek full-screen no-scroll layout, removed mock cards, direct login + Google OAuth flow with error diagnostics.
- DB: Updated supabase_master_setup.sql with public.inboxes and public.company_settings.
