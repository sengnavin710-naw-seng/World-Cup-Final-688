create extension if not exists pgcrypto;

create table if not exists participant_selections (
  id uuid primary key default gen_random_uuid(),
  device_id text not null unique,
  display_name text not null,
  team_code text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists participant_selections_team_code_idx
  on participant_selections (team_code);
