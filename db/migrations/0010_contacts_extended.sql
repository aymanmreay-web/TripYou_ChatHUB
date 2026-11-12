-- 0010 Extended 3D Contacts System & Source Provenance Tracking
-- Entity Type: Individual (فرد) / Organization (منشأة) / Group (مجموعة)
-- Commercial Role: B2C (عميل مباشر) / B2B (شركة) / Vendor (مورد) / Partner (شريك) / Staff (موظف)
-- Source: evolution (رقم واتساب) / excel_import (استيراد إكسل) / contacts_file (ملف جهات اتصال) / system (النظام الداخلي) / manual (يدوي)

alter table hub.contacts add column if not exists display_name text;
alter table hub.contacts add column if not exists company text;
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

alter table hub.contacts alter column full_name drop not null;

-- مشغل المزامنة الآلي بين display_name و full_name و company
create or replace function hub.sync_contact_names()
returns trigger as $$
begin
  if new.display_name is null and new.full_name is not null then
    new.display_name := new.full_name;
  end if;
  if new.full_name is null and new.display_name is not null then
    new.full_name := new.display_name;
  end if;
  if new.company is null and new.organization is not null then
    new.company := new.organization;
  end if;
  if new.organization is null and new.company is not null then
    new.organization := new.company;
  end if;
  if new.primary_phone is null and new.primary_phone_e164 is not null then
    new.primary_phone := new.primary_phone_e164;
  end if;
  if new.primary_phone_e164 is null and new.primary_phone is not null then
    new.primary_phone_e164 := new.primary_phone;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_sync_contact_names on hub.contacts;
create trigger trg_sync_contact_names
before insert or update on hub.contacts
for each row execute function hub.sync_contact_names();

-- تحديث عرض public.contacts للتكامل المباشر مع PostgREST
drop view if exists public.contacts cascade;
create or replace view public.contacts with (security_invoker = true) as select * from hub.contacts;
grant all on public.contacts to anon, authenticated, service_role;

-- فهرس لتسريع البحث بالأرقام والمصادر والكيان
create index if not exists idx_contacts_entity_type on hub.contacts(entity_type);
create index if not exists idx_contacts_commercial_role on hub.contacts(commercial_role);
create index if not exists idx_contacts_source on hub.contacts(source);
create index if not exists idx_contacts_primary_phone on hub.contacts(primary_phone);
create index if not exists idx_contacts_city on hub.contacts(city);
