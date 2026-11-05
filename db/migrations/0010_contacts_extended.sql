-- 0010 Extended 3D Contacts System & Source Provenance Tracking
-- Entity Type: Individual (فرد) / Organization (منشأة) / Group (مجموعة)
-- Commercial Role: B2C (عميل مباشر) / B2B (شركة) / Vendor (مورد) / Partner (شريك) / Staff (موظف)
-- Source: evolution (رقم واتساب) / excel_import (استيراد إكسل) / contacts_file (ملف جهات اتصال) / system (النظام الداخلي) / manual (يدوي)

alter table hub.contacts add column if not exists entity_type text not null default 'individual' check (entity_type in ('individual', 'organization', 'group'));
alter table hub.contacts add column if not exists commercial_role text not null default 'b2c' check (commercial_role in ('b2c', 'b2b', 'vendor', 'partner', 'staff'));
alter table hub.contacts add column if not exists source text not null default 'manual' check (source in ('manual', 'evolution', 'excel_import', 'contacts_file', 'system'));
alter table hub.contacts add column if not exists source_detail text; -- e.g. 'evolution:Sells_2' or 'excel:حجاج_1446.xlsx' or 'contacts_file:backup.vcf'
alter table hub.contacts add column if not exists primary_phone text;
alter table hub.contacts add column if not exists email text;
alter table hub.contacts add column if not exists country_code text default 'SA';
alter table hub.contacts add column if not exists city text;
alter table hub.contacts add column if not exists district text;
alter table hub.contacts add column if not exists facility_name text;
alter table hub.contacts add column if not exists avatar_url text;
alter table hub.contacts add column if not exists is_favorite boolean not null default false;
alter table hub.contacts add column if not exists last_activity_at timestamptz default now();

-- فهرس لتسريع البحث بالأرقام والمصادر والكيان
create index if not exists idx_contacts_entity_type on hub.contacts(entity_type);
create index if not exists idx_contacts_commercial_role on hub.contacts(commercial_role);
create index if not exists idx_contacts_source on hub.contacts(source);
create index if not exists idx_contacts_primary_phone on hub.contacts(primary_phone);
create index if not exists idx_contacts_city on hub.contacts(city);
