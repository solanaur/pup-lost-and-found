-- Run in Supabase SQL Editor (Dashboard → SQL → New query)

create table if not exists public.ibalik_store (
  id integer primary key default 1 check (id = 1),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.ibalik_store (id, data)
values (1, '{}'::jsonb)
on conflict (id) do nothing;

alter table public.ibalik_store enable row level security;

-- API uses the service role key server-side only (bypasses RLS).
-- No public policies needed.
