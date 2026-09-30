-- three·words — topic clouds started by app users (v1.3.0)
-- Non-destructive. Run once, AFTER add-topic-clouds.sql:
-- Supabase → SQL Editor → New query → paste → Run.
--
-- An app user can start a cloud about any subject. It gets a random link
-- (threewordsapp.com/describe/?t=k7m2qxwp), anyone with the link answers on the
-- web with no account, and the owner moderates it from the app.
--
-- Official clouds (like '2026') have owner_id null and behave exactly as before.
--
-- Weekly review cheat-sheet (run in the SQL Editor):
--   open reports, newest first:
--     select r.created_at, r.slug, t.title, t.paused, r.reason
--     from topic_reports r join topics t on t.slug = r.slug order by r.created_at desc;
--   clouds paused by reports:     select slug, title, owner_id, created_at from topics where paused;
--   release a paused cloud:       update topics set paused = false, is_open = true where slug = 'k7m2qxwp';
--                                 delete from topic_reports where slug = 'k7m2qxwp';
--   remove a cloud for good:      delete from topics where slug = 'k7m2qxwp';
--   all user clouds:              select slug, title, is_open, paused, created_at from topics where owner_id is not null order by created_at desc;

-- ─────────────────────────────────────────────────────────────
-- 1. Tables
-- ─────────────────────────────────────────────────────────────
alter table topics add column if not exists owner_id uuid references profiles(id) on delete cascade;
alter table topics add column if not exists paused   boolean not null default false;  -- set by reports; only David clears it
create index if not exists topics_owner_idx on topics(owner_id);

-- One report per browser per cloud. No account, no identifiers beyond the two hashes.
create table if not exists topic_reports (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null references topics(slug) on delete cascade,
  reporter_hash text not null,
  ip_hash       text,
  reason        text check (char_length(reason) <= 300),
  created_at    timestamptz default now(),
  unique (slug, reporter_hash)
);
alter table topic_reports enable row level security;   -- no policies: RPC access only

-- ─────────────────────────────────────────────────────────────
-- 2. Helpers
-- ─────────────────────────────────────────────────────────────

-- True when any word in the text is on the blocklist (same list and same
-- leetspeak / repeated-letter handling as submit_topic_words).
create or replace function tw_text_is_blocked(p_text text)
returns boolean
language plpgsql immutable set search_path = public as $$
declare
  w         text;
  leet      text;
  collapsed text;
  blocked   text[] := array[
    'fuck','fucking','fucker','shit','shitty','bitch','bitchy','asshole','arsehole',
    'bastard','cunt','dick','dickhead','prick','pussy','slut','slutty','whore','hoe',
    'douche','douchey','wanker','twat','retard','retarded','fag','faggot','dyke',
    'nigger','nigga','spic','chink','kike','tranny','crap','crappy','damn','piss',
    'cock','tits','boobs','penis','vagina','rapist','nazi','skank','hooker'];
  substrs   text[] := array['fuck','nigg','cunt','faggot'];
begin
  foreach w in array regexp_split_to_array(lower(coalesce(p_text, '')), '[\s,./_-]+') loop
    leet      := regexp_replace(translate(w, '01345$@7!', 'oieassati'), '[^a-z]', '', 'g');
    collapsed := regexp_replace(leet, '(.)\1+', '\1', 'g');
    if leet = '' then continue; end if;
    if leet = any(blocked) or collapsed = any(blocked)
       or exists (select 1 from unnest(substrs) s
                  where leet like '%' || s || '%' or collapsed like '%' || s || '%') then
      return true;
    end if;
  end loop;
  return false;
end; $$;

-- Salted hash of the caller's IP, or null when it can't be read.
create or replace function tw_request_ip_hash()
returns text
language plpgsql security definer set search_path = public, extensions as $$
declare
  hdrs jsonb;
  ip   text := '';
  salt text;
begin
  begin
    hdrs := current_setting('request.headers', true)::jsonb;
    ip := trim(split_part(coalesce(hdrs->>'cf-connecting-ip', hdrs->>'x-forwarded-for', ''), ',', 1));
  exception when others then
    ip := '';
  end;
  if ip = '' then return null; end if;
  select v into salt from topic_secrets where k = 'ip_salt';
  return encode(digest(coalesce(salt, '') || '|' || ip, 'sha256'), 'hex');
end; $$;
revoke execute on function tw_request_ip_hash() from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- 3. Owner RPCs (signed-in app users)
-- ─────────────────────────────────────────────────────────────

-- Start a cloud. Free limit: one open cloud per account.
create or replace function create_my_topic(p_title text)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  uid      uuid := auth.uid();
  ttl      text := regexp_replace(trim(coalesce(p_title, '')), '\s+', ' ', 'g');
  alphabet text := 'abcdefghjkmnpqrstuvwxyz23456789';
  s        text;
  tries    int := 0;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  if not exists (select 1 from profiles where id = uid) then raise exception 'no_profile'; end if;
  if char_length(ttl) < 2 or char_length(ttl) > 60 then raise exception 'bad_title_length'; end if;
  if ttl ~ '[<>]' or ttl ~* '(https?:|www\.)' then raise exception 'bad_title'; end if;
  if tw_text_is_blocked(ttl) then raise exception 'blocked_title'; end if;
  if exists (select 1 from topics where owner_id = uid and paused) then raise exception 'under_review'; end if;
  if (select count(*) from topics where owner_id = uid and is_open) >= 1 then raise exception 'limit_reached'; end if;
  -- stops create/delete churn
  if (select count(*) from topics where owner_id = uid and created_at > now() - interval '1 day') >= 5 then
    raise exception 'rate_limited';
  end if;

  loop
    s := (select string_agg(substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1), '')
          from generate_series(1, 8));
    exit when not exists (select 1 from topics where slug = s);
    tries := tries + 1;
    if tries > 20 then raise exception 'try_again'; end if;
  end loop;

  insert into topics (slug, title, prompt, owner_id)
  values (s, ttl, 'Describe ' || ttl || ' in three words', uid);
  return jsonb_build_object('slug', s, 'title', ttl);
end; $$;

-- The caller's clouds, newest first, with what the owner needs to moderate them.
create or replace function list_my_topics()
returns jsonb
language sql security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'slug',         t.slug,
    'title',        t.title,
    'is_open',      t.is_open,
    'paused',       t.paused,
    'hidden_words', to_jsonb(t.hidden_words),
    'total',        (select count(*) from topic_words w where w.slug = t.slug),
    'created_at',   t.created_at
  ) order by t.created_at desc), '[]'::jsonb)
  from topics t
  where t.owner_id = auth.uid();
$$;

-- Hide a word from the owner's cloud, or bring it back.
create or replace function set_my_topic_word_hidden(p_slug text, p_word text, p_hidden boolean)
returns void
language plpgsql security definer set search_path = public as $$
declare
  s text := lower(trim(coalesce(p_slug, '')));
  w text := lower(regexp_replace(trim(coalesce(p_word, '')), '[^a-zA-Z''-]', '', 'g'));
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if length(w) < 1 or length(w) > 20 then raise exception 'bad_word_length'; end if;
  if not exists (select 1 from topics where slug = s and owner_id = auth.uid()) then raise exception 'not_found'; end if;
  if p_hidden then
    update topics set hidden_words = hidden_words || w
    where slug = s and not (w = any(hidden_words)) and coalesce(array_length(hidden_words, 1), 0) < 500;
  else
    update topics set hidden_words = array_remove(hidden_words, w) where slug = s;
  end if;
end; $$;

-- Close the owner's cloud to new words, or reopen it.
create or replace function set_my_topic_open(p_slug text, p_open boolean)
returns void
language plpgsql security definer set search_path = public as $$
declare
  s text := lower(trim(coalesce(p_slug, '')));
  t topics;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select * into t from topics where slug = s and owner_id = auth.uid();
  if t.slug is null then raise exception 'not_found'; end if;
  if t.paused then raise exception 'under_review'; end if;
  if p_open and not t.is_open
     and (select count(*) from topics where owner_id = auth.uid() and is_open) >= 1 then
    raise exception 'limit_reached';
  end if;
  update topics set is_open = p_open where slug = s;
end; $$;

-- Delete the owner's cloud and every word in it. A cloud under review can't be
-- deleted by its owner, so reports are still there to be looked at.
create or replace function delete_my_topic(p_slug text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  s text := lower(trim(coalesce(p_slug, '')));
  t topics;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select * into t from topics where slug = s and owner_id = auth.uid();
  if t.slug is null then raise exception 'not_found'; end if;
  if t.paused then raise exception 'under_review'; end if;
  delete from topics where slug = s;
end; $$;

-- ─────────────────────────────────────────────────────────────
-- 4. Reporting (anyone with the link)
-- ─────────────────────────────────────────────────────────────

-- Three reports from different browsers (and, where it can be told, different
-- networks) pause a user cloud until David reviews it. Official clouds record
-- the report but never pause automatically.
create or replace function report_topic(p_slug text, p_token text, p_reason text default null)
returns void
language plpgsql security definer set search_path = public, extensions as $$
declare
  s  text := lower(trim(coalesce(p_slug, '')));
  t  topics;
  ih text;
  n  int;
begin
  select * into t from topics where slug = s;
  if t.slug is null then return; end if;
  if p_token is null or length(p_token) < 16 or length(p_token) > 128 then raise exception 'bad_token'; end if;
  ih := tw_request_ip_hash();
  if ih is not null and (select count(*) from topic_reports
                         where ip_hash = ih and created_at > now() - interval '1 day') >= 10 then
    raise exception 'rate_limited';
  end if;

  insert into topic_reports (slug, reporter_hash, ip_hash, reason)
  values (s, encode(digest(p_token, 'sha256'), 'hex'), ih, left(trim(coalesce(p_reason, '')), 300))
  on conflict (slug, reporter_hash) do nothing;

  if t.owner_id is not null and not t.paused then
    -- reports without a readable IP each count as their own network
    select count(distinct coalesce(ip_hash, reporter_hash)) into n from topic_reports where slug = s;
    if n >= 3 then
      update topics set paused = true, is_open = false where slug = s;
    end if;
  end if;
end; $$;

-- ─────────────────────────────────────────────────────────────
-- 5. Existing public RPCs, updated for user clouds
-- ─────────────────────────────────────────────────────────────

-- The hub lists official clouds only; user clouds are reachable by link alone.
create or replace function list_topics()
returns table (slug text, title text, prompt text, total bigint)
language sql security definer set search_path = public as $$
  select t.slug, t.title, t.prompt,
         (select count(*) from topic_words w where w.slug = t.slug)
  from topics t
  where t.is_open and t.owner_id is null
  order by t.created_at desc;
$$;

-- Adds is_user and paused. A paused cloud shows no words and no title.
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
    where not (x.w = any(t.hidden_words)) and not t.paused
    group by x.w
  ), top as (
    select w, c from agg
    order by c desc, md5(w)
    limit greatest(1, least(coalesce(p_limit, 120), 300))
  )
  select case when not exists (select 1 from t) then null else jsonb_build_object(
    'slug',           (select slug from t),
    'title',          (select case when paused then 'this cloud' else title end from t),
    'prompt',         (select case when paused then '' else prompt end from t),
    'is_open',        (select is_open and not paused from t),
    'is_user',        (select owner_id is not null from t),
    'paused',         (select paused from t),
    'total',          (select case when (select paused from t) then 0
                              else (select count(*) from topic_words tw join t on t.slug = tw.slug) end),
    'distinct_words', (select count(*) from agg),
    'words',          coalesce((select jsonb_agg(jsonb_build_object('w', w, 'c', c)) from top), '[]'::jsonb)
  ) end;
$$;

-- Per-topic numbers stay official-only, so the list doesn't expose user clouds.
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
  from topics t
  where t.owner_id is null;
$$;

-- Totals across all user clouds, for judging the feature. Counts only.
create or replace function get_user_topic_stats()
returns jsonb
language sql security definer set search_path = public as $$
  with u as (select slug, created_at, is_open, paused from topics where owner_id is not null)
  select jsonb_build_object(
    'clouds_total',   (select count(*) from u),
    'clouds_7d',      (select count(*) from u where created_at > now() - interval '7 days'),
    'clouds_open',    (select count(*) from u where is_open),
    'clouds_paused',  (select count(*) from u where paused),
    'answers_total',  (select count(*) from topic_words w join u on u.slug = w.slug),
    'answers_7d',     (select count(*) from topic_words w join u on u.slug = w.slug where w.created_at > now() - interval '7 days'),
    'store_clicks',   (select count(*) from topic_clicks c join u on u.slug = c.slug where c.target in ('ios', 'android')),
    'reports_total',  (select count(*) from topic_reports r join u on u.slug = r.slug)
  );
$$;

-- ─────────────────────────────────────────────────────────────
-- 6. Grants
-- ─────────────────────────────────────────────────────────────
revoke execute on function create_my_topic(text)                         from public, anon;
revoke execute on function list_my_topics()                              from public, anon;
revoke execute on function set_my_topic_word_hidden(text, text, boolean) from public, anon;
revoke execute on function set_my_topic_open(text, boolean)              from public, anon;
revoke execute on function delete_my_topic(text)                         from public, anon;

grant execute on function create_my_topic(text)                         to authenticated;
grant execute on function list_my_topics()                              to authenticated;
grant execute on function set_my_topic_word_hidden(text, text, boolean) to authenticated;
grant execute on function set_my_topic_open(text, boolean)              to authenticated;
grant execute on function delete_my_topic(text)                         to authenticated;
grant execute on function report_topic(text, text, text)                to anon, authenticated;
grant execute on function get_user_topic_stats()                        to anon, authenticated;
