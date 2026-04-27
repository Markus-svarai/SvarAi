-- Samtalelogg per klinikk
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  clinic_id text not null,
  session_id text not null unique,
  messages jsonb not null default '[]',
  ended_in_booking boolean not null default false,
  has_unanswered boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table conversations disable row level security;

create index if not exists conversations_clinic_idx on conversations(clinic_id);
create index if not exists conversations_created_idx on conversations(created_at desc);
