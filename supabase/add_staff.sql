-- SvarAI – Ansatte og tilgjengelighet
-- Kjør i Supabase SQL Editor: https://app.supabase.com → SQL Editor

-- ── Ansatte ────────────────────────────────────────────────────────────────
create table if not exists clinic_staff (
  id         uuid primary key default gen_random_uuid(),
  clinic_id  text not null references clinics(id) on delete cascade,
  name       text not null,
  title      text,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

-- ── Koble bookinger til ansatt ─────────────────────────────────────────────
alter table bookings add column if not exists staff_id   uuid references clinic_staff(id);
alter table bookings add column if not exists staff_name text;

-- ── Demo-ansatte ───────────────────────────────────────────────────────────
insert into clinic_staff (clinic_id, name, title) values
  ('demo', 'Dr. Hansen',  'Tannlege'),
  ('demo', 'Dr. Olsen',   'Tannlege'),
  ('demo', 'Dr. Eriksen', 'Tannlege')
on conflict do nothing;

-- ── Ingen RLS (bruker service role) ───────────────────────────────────────
alter table clinic_staff disable row level security;
