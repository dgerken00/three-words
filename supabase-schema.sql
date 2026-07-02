-- three·words — production schema (real auth + moderation)
-- Run in Supabase: SQL Editor → New query → paste → Run.
--
-- This REPLACES the old family-test schema (which had wide-open access and no auth).
-- The structure changed (profiles are now keyed to auth users), so the reset block
-- below drops the old tables first. The family-test data is disposable; if you have
-- real data to keep, migrate it before running this.

-- ─────────────────────────────────────────────────────────────
-- 0. Reset (drops old test tables — comment out if you must keep data)
-- ─────────────────────────────────────────────────────────────
drop table if exists reports cascade;
drop table if exists blocks cascade;
drop table if exists submissions cascade;
drop table if exists profiles cascade;

-- ─────────────────────────────────────────────────────────────
-- 1. Tables
-- ─────────────────────────────────────────────────────────────

-- One profile per authenticated user. id IS the auth user id.
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 40),
  invite_code text unique not null,
  created_at  timestamptz default now()
);

-- Three words from one user (author) about another (recipient).
-- display_name null = shown as "anonymous" to the recipient, but author_id is
-- always recorded so reporting and blocking can work.
create table submissions (
  id            uuid primary key default gen_random_uuid(),
  recipient_id  uuid not null references profiles(id) on delete cascade,
  author_id     uuid not null references profiles(id) on delete cascade,
  words         text[] not null check (array_length(words, 1) = 3),
  display_name  text,
  created_at    timestamptz default now(),
  constraint no_self_describe check (recipient_id <> author_id)
);
create index submissions_recipient_idx on submissions(recipient_id);
-- One set of words per author→recipient (re-submitting replaces via the app).
create unique index submissions_author_recipient_uidx on submissions(author_id, recipient_id);

-- A recipient reporting a submission they received.
create table reports (
  id            uuid primary key default gen_random_uuid(),
  submission_id uuid references submissions(id) on delete set null,
  reporter_id   uuid not null references profiles(id) on delete cascade,
  reason        text,
  created_at    timestamptz default now()
);

-- A user blocking another user. Blocked users can't submit to the blocker,
-- and their existing submissions are hidden from the blocker.
create table blocks (
  blocker_id  uuid not null references profiles(id) on delete cascade,
  blocked_id  uuid not null references profiles(id) on delete cascade,
  created_at  timestamptz default now(),
  primary key (blocker_id, blocked_id)
);

-- ─────────────────────────────────────────────────────────────
-- 2. Row Level Security
-- ─────────────────────────────────────────────────────────────
alter table profiles    enable row level security;
alter table submissions enable row level security;
alter table reports     enable row level security;
alter table blocks      enable row level security;

-- profiles: you can only see/change your OWN row. Looking up someone else's
-- profile (to describe them) goes through find_profile_by_code() below, which
-- returns only id + name — so the table is never publicly dumpable.
create policy "read own profile"   on profiles for select using (id = auth.uid());
create policy "insert own profile" on profiles for insert with check (id = auth.uid());
create policy "update own profile" on profiles for update using (id = auth.uid());
create policy "delete own profile" on profiles for delete using (id = auth.uid());

-- submissions:
--  • you read words addressed to you, excluding anyone you've blocked
--  • you insert words authored by you, to someone who hasn't blocked you
--  • you can delete words addressed to you (remove something unwanted)
create policy "read submissions to me" on submissions for select using (
  recipient_id = auth.uid()
  and author_id not in (select blocked_id from blocks where blocker_id = auth.uid())
);
create policy "insert my submissions" on submissions for insert with check (
  author_id = auth.uid()
  and author_id not in (select blocked_id from blocks where blocker_id = recipient_id)
);
create policy "delete submissions to me" on submissions for delete using (recipient_id = auth.uid());

-- reports: you can file a report; only backend (service role) reads them.
create policy "file my reports" on reports for insert with check (reporter_id = auth.uid());

-- blocks: you manage only your own blocks.
create policy "read own blocks"   on blocks for select using (blocker_id = auth.uid());
create policy "insert own blocks" on blocks for insert with check (blocker_id = auth.uid());
create policy "delete own blocks" on blocks for delete using (blocker_id = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- 3. RPCs (security definer — run with elevated rights, guarded internally)
-- ─────────────────────────────────────────────────────────────

-- Create the caller's profile with a server-generated unique invite code.
create or replace function create_my_profile(p_name text)
returns profiles
language plpgsql security definer set search_path = public
as $$
declare
  chars  text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  code   text;
  i      int;
  row    profiles;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    end loop;
    exit when not exists (select 1 from profiles where invite_code = code);
  end loop;
  insert into profiles (id, name, invite_code)
  values (auth.uid(), trim(p_name), code)
  returning * into row;
  return row;
end;
$$;

-- Look up a profile by invite code — returns ONLY id + name (safe to expose).
create or replace function find_profile_by_code(p_code text)
returns table (id uuid, name text)
language sql security definer set search_path = public
as $$
  select id, name from profiles where invite_code = upper(trim(p_code));
$$;

-- Delete the caller's account: removes the auth user, which cascades to their
-- profile, submissions, reports, and blocks. Required by both app stores.
create or replace function delete_my_account()
returns void
language plpgsql security definer set search_path = public, auth
as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  delete from auth.users where id = auth.uid();
end;
$$;

grant execute on function create_my_profile(text)   to authenticated;
grant execute on function find_profile_by_code(text) to authenticated;
grant execute on function delete_my_account()        to authenticated;

-- ─────────────────────────────────────────────────────────────
-- 4. Realtime: new submissions appear on the recipient's dashboard live
-- (RLS still applies — users only receive events for rows they may read)
-- ─────────────────────────────────────────────────────────────
alter publication supabase_realtime add table submissions;
