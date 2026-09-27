-- three·words — public topic clouds ("Describe 2026 so far in three words")
-- Non-destructive. Run once: Supabase → SQL Editor → New query → paste → Run.
--
-- This is a WEBSITE-ONLY feature. It adds its own tables and RPCs and never
-- touches profiles / submissions or anything the app reads, so the app and the
-- store listings are unaffected. Pages live at threewordsapp.com/describe/.
--
-- Moderation cheat-sheet (run in the SQL Editor):
--   hide a word from one cloud:  update topics set hidden_words = hidden_words || '{word}' where slug = '2026';
--   close a topic to new words:  update topics set is_open = false where slug = '2026';
--   open a new topic:            insert into topics (slug, title, prompt) values ('hometown', 'your hometown', 'Describe your hometown in three words');
--                                (then share https://threewordsapp.com/describe/?t=hometown — no page needed)
--   see the raw rows:            select * from topic_words where slug = '2026' order by created_at desc;

create extension if not exists pgcrypto with schema extensions;

-- ─────────────────────────────────────────────────────────────
-- 1. Tables
-- ─────────────────────────────────────────────────────────────
create table if not exists topics (
  slug         text primary key check (slug ~ '^[a-z0-9-]{2,40}$'),
  title        text not null check (char_length(title) between 1 and 60),
  prompt       text not null check (char_length(prompt) between 1 and 120),
  is_open      boolean not null default true,
  hidden_words text[] not null default '{}',   -- post-hoc moderation: excluded from the cloud
  created_at   timestamptz default now()
);

-- One row per person per topic. voter_hash is sha256 of a random token the
-- browser keeps in localStorage — it identifies a browser, not a person, and
-- re-submitting replaces the row (so people can change their words).
create table if not exists topic_words (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null references topics(slug) on delete cascade,
  words      text[] not null check (array_length(words, 1) = 3),
  voter_hash text not null,
  ip_hash    text,                             -- salted sha256 of the client IP, abuse limiting only
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (slug, voter_hash)
);
create index if not exists topic_words_slug_created_idx on topic_words(slug, created_at);
create index if not exists topic_words_ip_idx           on topic_words(slug, ip_hash, created_at);

-- Bare counters for the only number that matters: taps on the store buttons.
create table if not exists topic_clicks (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null references topics(slug) on delete cascade,
  target     text not null check (target in ('ios', 'android', 'share')),
  created_at timestamptz default now()
);
create index if not exists topic_clicks_slug_idx on topic_clicks(slug, created_at);

-- Salt for IP hashing, generated once at install. The repo is public, so the
-- salt must never live in a file — and RLS with no policies keeps it off the API.
create table if not exists topic_secrets (k text primary key, v text not null);
insert into topic_secrets (k, v) values ('ip_salt', gen_random_uuid()::text)
on conflict (k) do nothing;

-- ─────────────────────────────────────────────────────────────
-- 2. Row Level Security — no policies at all: clients can't read or write
--    these tables directly. Every access path is one of the RPCs below.
-- ─────────────────────────────────────────────────────────────
alter table topics        enable row level security;
alter table topic_words   enable row level security;
alter table topic_clicks  enable row level security;
alter table topic_secrets enable row level security;

-- ─────────────────────────────────────────────────────────────
-- 3. RPCs (security definer, validated internally — callers are untrusted)
-- ─────────────────────────────────────────────────────────────

-- Open topics for the hub page.
create or replace function list_topics()
returns table (slug text, title text, prompt text, total bigint)
language sql security definer set search_path = public as $$
  select t.slug, t.title, t.prompt,
         (select count(*) from topic_words w where w.slug = t.slug)
  from topics t
  where t.is_open
  order by t.created_at desc;
$$;

-- The cloud itself: aggregated word counts only — individual rows are never exposed.
-- Ties are broken by md5(word) so the set of shown words is stable between polls.
create or replace function get_topic_cloud(p_slug text, p_limit int default 120)
returns jsonb
language sql security definer set search_path = public as $$
  with t as (
    select * from topics where slug = lower(trim(p_slug))
  ), agg as (
    select x.w, count(*)::int as c
    from topic_words tw
    join t on t.slug = tw.slug
    cross join lateral unnest(tw.words) as x(w)
    where not (x.w = any(t.hidden_words))
    group by x.w
  ), top as (
    select w, c from agg
    order by c desc, md5(w)
    limit greatest(1, least(coalesce(p_limit, 120), 300))
  )
  select case when not exists (select 1 from t) then null else jsonb_build_object(
    'slug',           (select slug    from t),
    'title',          (select title   from t),
    'prompt',         (select prompt  from t),
    'is_open',        (select is_open from t),
    'total',          (select count(*) from topic_words tw join t on t.slug = tw.slug),
    'distinct_words', (select count(*) from agg),
    'words',          coalesce((select jsonb_agg(jsonb_build_object('w', w, 'c', c)) from top), '[]'::jsonb)
  ) end;
$$;

-- Add (or replace) one person's three words. Same cleaning rules as the app's
-- in-app filter: letters only, leetspeak-normalised and repeat-collapsed before
-- the blocklist check, so "sh1t" and "fuuuck" are caught.
create or replace function submit_topic_words(p_slug text, p_words text[], p_token text)
returns void
language plpgsql security definer set search_path = public, extensions as $$
declare
  t         topics;
  w         text;
  c         text;
  leet      text;
  collapsed text;
  clean     text[] := '{}';
  blocked   text[] := array[
    'fuck','fucking','fucker','shit','shitty','bitch','bitchy','asshole','arsehole',
    'bastard','cunt','dick','dickhead','prick','pussy','slut','slutty','whore','hoe',
    'douche','douchey','wanker','twat','retard','retarded','fag','faggot','dyke',
    'nigger','nigga','spic','chink','kike','tranny','crap','crappy','damn','piss',
    'cock','tits','boobs','penis','vagina','rapist','nazi','skank','hooker'];
  substrs   text[] := array['fuck','nigg','cunt','faggot'];
  vh        text;
  ih        text;
  salt      text;
  ip        text := '';
  hdrs      jsonb;
begin
  select * into t from topics where slug = lower(trim(coalesce(p_slug, '')));
  if t.slug is null or not t.is_open then raise exception 'topic_closed'; end if;
  if p_token is null or length(p_token) < 16 or length(p_token) > 128 then raise exception 'bad_token'; end if;
  if array_length(p_words, 1) is distinct from 3 then raise exception 'need_three_words'; end if;

  foreach w in array p_words loop
    c := lower(regexp_replace(trim(coalesce(w, '')), '[^a-zA-Z''-]', '', 'g'));
    if length(c) < 1 or length(c) > 20 or c !~ '[a-z]' then raise exception 'bad_word_length'; end if;
    leet      := regexp_replace(translate(lower(trim(w)), '01345$@7!', 'oieassati'), '[^a-z''-]', '', 'g');
    collapsed := regexp_replace(leet, '(.)\1+', '\1', 'g');
    if c = any(blocked) or leet = any(blocked) or collapsed = any(blocked)
       or exists (select 1 from unnest(substrs) s
                  where leet like '%' || s || '%' or collapsed like '%' || s || '%') then
      raise exception 'blocked_word';
    end if;
    clean := clean || c;
  end loop;
  if (select count(distinct x) from unnest(clean) x) < 3 then raise exception 'need_three_different_words'; end if;

  vh := encode(digest(p_token, 'sha256'), 'hex');

  -- Client IP, best effort (PostgREST exposes request headers as a GUC).
  begin
    hdrs := current_setting('request.headers', true)::jsonb;
    ip := trim(split_part(coalesce(hdrs->>'cf-connecting-ip', hdrs->>'x-forwarded-for', ''), ',', 1));
  exception when others then
    ip := '';
  end;
  if ip <> '' then
    select v into salt from topic_secrets where k = 'ip_salt';
    ih := encode(digest(coalesce(salt, '') || '|' || ip, 'sha256'), 'hex');
    -- one household/office NAT can legitimately produce a few; bots produce hundreds
    if (select count(*) from topic_words
        where slug = t.slug and ip_hash = ih and created_at > now() - interval '1 hour') >= 30 then
      raise exception 'rate_limited';
    end if;
  end if;
  -- circuit breaker: a single topic can't take more than 3000 new answers an hour
  if (select count(*) from topic_words
      where slug = t.slug and created_at > now() - interval '1 hour') >= 3000 then
    raise exception 'rate_limited';
  end if;

  insert into topic_words (slug, words, voter_hash, ip_hash)
  values (t.slug, clean, vh, ih)
  on conflict (slug, voter_hash) do update
    set words = excluded.words, updated_at = now();
end; $$;

-- Count a tap on a store button (or share). No identifiers stored, capped so it can't be spammed into a bill.
create or replace function track_topic_click(p_slug text, p_target text)
returns void
language plpgsql security definer set search_path = public as $$
declare s text := lower(trim(coalesce(p_slug, '')));
begin
  if p_target not in ('ios', 'android', 'share') then return; end if;
  if not exists (select 1 from topics where slug = s) then return; end if;
  if (select count(*) from topic_clicks where slug = s and created_at > now() - interval '1 hour') >= 5000 then return; end if;
  insert into topic_clicks (slug, target) values (s, p_target);
end; $$;

-- Per-topic numbers for the traction loop: answers, and — the one that matters — store taps.
create or replace function get_topic_stats()
returns jsonb
language sql security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'slug',           t.slug,
    'is_open',        t.is_open,
    'answers_total',  (select count(*) from topic_words w where w.slug = t.slug),
    'answers_24h',    (select count(*) from topic_words w where w.slug = t.slug and w.created_at > now() - interval '24 hours'),
    'answers_7d',     (select count(*) from topic_words w where w.slug = t.slug and w.created_at > now() - interval '7 days'),
    'clicks_ios',     (select count(*) from topic_clicks c where c.slug = t.slug and c.target = 'ios'),
    'clicks_android', (select count(*) from topic_clicks c where c.slug = t.slug and c.target = 'android'),
    'clicks_share',   (select count(*) from topic_clicks c where c.slug = t.slug and c.target = 'share')
  ) order by t.created_at), '[]'::jsonb)
  from topics t;
$$;

grant execute on function list_topics()                          to anon, authenticated;
grant execute on function get_topic_cloud(text, int)             to anon, authenticated;
grant execute on function submit_topic_words(text, text[], text) to anon, authenticated;
grant execute on function track_topic_click(text, text)          to anon, authenticated;
grant execute on function get_topic_stats()                      to anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- 4. First topic
-- ─────────────────────────────────────────────────────────────
insert into topics (slug, title, prompt)
values ('2026', '2026 so far', 'Describe 2026 so far in three words')
on conflict (slug) do nothing;
