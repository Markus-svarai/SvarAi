-- SvarAI – Supabase schema
-- Kjør dette i Supabase SQL Editor (https://app.supabase.com → SQL Editor)

-- ── Klinikker ──────────────────────────────────────────────────────────────
create table if not exists clinics (
  id                   text primary key,          -- eks "demo", "tannklinikken-oslo"
  name                 text not null,
  type                 text not null default 'generell',
  tagline              text,
  address_street       text,
  address_postal       text,
  address_city         text,
  contact_phone        text,
  contact_email        text,
  contact_website      text,
  cancellation_policy  text,
  booking_lead_hours   int  not null default 2,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- ── Tjenester ──────────────────────────────────────────────────────────────
create table if not exists clinic_services (
  id               uuid primary key default gen_random_uuid(),
  clinic_id        text not null references clinics(id) on delete cascade,
  name             text not null,
  description      text,
  duration_minutes int  not null default 30,
  price_nok        int  not null default 0,
  active           boolean not null default true,
  created_at       timestamptz not null default now()
);

-- ── Åpningstider ──────────────────────────────────────────────────────────
create table if not exists clinic_hours (
  id         uuid primary key default gen_random_uuid(),
  clinic_id  text not null references clinics(id) on delete cascade,
  day        text not null,  -- "Mandag", "Tirsdag", ...
  sort_order int  not null default 0,
  open       text,           -- "08:00" eller null (stengt)
  close      text,
  unique (clinic_id, day)
);

-- ── Bookinger ─────────────────────────────────────────────────────────────
create table if not exists bookings (
  id           text primary key,
  clinic_id    text not null,
  service_id   text,
  service_name text,
  date         text not null,
  time         text not null,
  name         text not null,
  phone        text not null,
  email        text not null,
  status       text not null default 'pending',
  created_at   timestamptz not null default now()
);

-- ── Demodataer (kjør én gang) ──────────────────────────────────────────────
insert into clinics (id, name, type, tagline, address_street, address_postal, address_city, contact_phone, contact_email, cancellation_policy, booking_lead_hours)
values (
  'demo',
  'Din Klinikk AS',
  'tannlege',
  'Trygg tannbehandling for hele familien',
  'Eksempelgaten 1',
  '0001',
  'Oslo',
  '+47 22 00 11 22',
  'post@dinklinikk.no',
  'Avbestilling må gjøres senest 24 timer før timen. Ved senere avbestilling eller uteblivelse belastes et gebyr på 490 kr.',
  2
) on conflict (id) do nothing;

insert into clinic_services (clinic_id, name, description, duration_minutes, price_nok)
values
  ('demo', 'Akuttkonsultasjon',       'Rask hjelp ved tannpine, hevelse eller brukket tann.',        30, 890),
  ('demo', 'Undersøkelse og røntgen', 'Full undersøkelse av tenner og tannkjøtt.',                    45, 790),
  ('demo', 'Fyllning (hull i tann)',   'Hvit komposittfyllning som matcher tannfargen.',               45, 1290),
  ('demo', 'Tannrens og puss',         'Profesjonell rens. Anbefales hvert halvår.',                   60, 990),
  ('demo', 'Rotfylling',               'Behandling av infisert tannrot. 1–2 besøk.',                   90, 4500),
  ('demo', 'Tannuttrekking',           'Uttrekking under lokalbedøvelse. Inkl. visdomstann.',           45, 1490)
on conflict do nothing;

insert into clinic_hours (clinic_id, day, sort_order, open, close)
values
  ('demo', 'Mandag',   0, '08:00', '17:00'),
  ('demo', 'Tirsdag',  1, '08:00', '17:00'),
  ('demo', 'Onsdag',   2, '08:00', '17:00'),
  ('demo', 'Torsdag',  3, '08:00', '19:00'),
  ('demo', 'Fredag',   4, '08:00', '15:00'),
  ('demo', 'Lørdag',   5, null,    null),
  ('demo', 'Søndag',   6, null,    null)
on conflict (clinic_id, day) do nothing;

-- ── Row Level Security (deaktiver for enkelhets skyld med service role) ────
alter table clinics        disable row level security;
alter table clinic_services disable row level security;
alter table clinic_hours   disable row level security;
alter table bookings       disable row level security;
