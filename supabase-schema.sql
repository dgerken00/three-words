-- three·words — family test schema
-- Run this once in Supabase: SQL Editor → New query → paste → Run

create table if not exists profiles (
  code text primary key,
  name text not null,
  created_at timestamptz default now()
);

create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  code text not null references profiles(code) on delete cascade,
  words text[] not null,
  from_name text,
  created_at timestamptz default now()
);

create index if not exists submissions_code_idx on submissions(code);

-- Row Level Security: open policies for the family test.
-- (Production would add real auth: only invited users insert, only the owner reads their full list.)
alter table profiles enable row level security;
alter table submissions enable row level security;

create policy "read profiles" on profiles for select using (true);
create policy "create profiles" on profiles for insert with check (true);
create policy "read submissions" on submissions for select using (true);
create policy "create submissions" on submissions for insert with check (true);

-- Live updates: new submissions appear on the dashboard instantly
alter publication supabase_realtime add table submissions;
