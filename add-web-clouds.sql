-- three-words: start a cloud on the website, with no app and no account. Run once in Supabase, SQL Editor.
-- Non-destructive. Run after add-user-topics.sql, add-topic-signals.sql, raise-topic-limit.sql and
-- tighten-public-cloud-limit.sql.
--
-- How it works: the page at /start/ makes a random private key in the browser and sends it with the
-- cloud's name. Only a hash of the key is stored. Whoever holds the key (that browser, or the private
-- "manage" link it shows) can hide words, close, reopen or delete the cloud. In every other way a web
-- cloud is a user cloud: unlisted, left out of the public lists and stats, reportable, paused
-- automatically after three reports, and on the looser answer limit for user clouds.
--
-- Extra safeguards, because a web cloud has no account behind it:
--   two reports from different people pause it (three for other clouds);
--   it closes to new words 30 days after it starts;
--   an on/off switch for new web clouds, which starts OFF and leaves existing clouds alone:
--     update topic_secrets set v = 'on' where k = 'web_clouds';    -- and 'off' to stop new ones
--
-- Weekly review (SQL Editor), every cloud someone else started, newest first:
--   select slug, title, is_open, paused, case when owner_id is null then 'web' else 'app' end as started_in,
--          (select count(*) from topic_words w where w.slug = t.slug) as answers, created_at
--   from topics t where owner_id is not null or owner_key_hash is not null order by created_at desc;

-- 1. Columns
alter table topics add column if not exists owner_key_hash  text;  -- sha256 of the web owner's private key
alter table topics add column if not exists creator_ip_hash text;  -- only for the clouds-per-day limit
create index if not exists topics_creator_ip_idx on topics(creator_ip_hash, created_at);
-- starts OFF: running this changes nothing anyone can see until the switch is turned on
insert into topic_secrets (k, v) values ('web_clouds', 'off') on conflict (k) do nothing;
-- taps on "Start a cloud" and "I'd want a keepsake" are counted alongside store taps
alter table topic_clicks drop constraint if exists topic_clicks_target_check;
alter table topic_clicks add constraint topic_clicks_target_check
  check (target in ('ios', 'android', 'share', 'start', 'keepsake'));

-- 2. Start a cloud from the website
create or replace function create_web_topic(p_title text, p_key text)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  ttl      text := regexp_replace(trim(coalesce(p_title, '')), '\s+', ' ', 'g');
  alphabet text := 'abcdefghjkmnpqrstuvwxyz23456789';
  s        text;
  tries    int := 0;
  ih       text := tw_request_ip_hash();
begin
  if coalesce((select v from topic_secrets where k = 'web_clouds'), 'on') <> 'on' then raise exception 'web_clouds_off'; end if;
  if p_key is null or length(p_key) < 32 or length(p_key) > 128 then raise exception 'bad_key'; end if;
  if char_length(ttl) < 2 or char_length(ttl) > 60 then raise exception 'bad_title_length'; end if;
  if ttl ~ '[<>]' or ttl ~* '(https?:|www\.)' then raise exception 'bad_title'; end if;
  if tw_text_is_blocked(ttl) then raise exception 'blocked_title'; end if;
  -- a few clouds a day from one connection (a family can share one), and a ceiling for the whole site
  if ih is not null and (select count(*) from topics
                         where creator_ip_hash = ih and created_at > now() - interval '1 day') >= 5 then
    raise exception 'rate_limited';
  end if;
  if (select count(*) from topics where owner_key_hash is not null and created_at > now() - interval '1 hour') >= 200 then
    raise exception 'rate_limited';
  end if;

  loop
    s := (select string_agg(substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1), '')
          from generate_series(1, 8));
    exit when not exists (select 1 from topics where slug = s);
    tries := tries + 1;
    if tries > 20 then raise exception 'try_again'; end if;
  end loop;

  insert into topics (slug, title, prompt, owner_key_hash, creator_ip_hash)
  values (s, ttl, 'Describe ' || ttl || ' in three words', encode(digest(p_key, 'sha256'), 'hex'), ih);
  return jsonb_build_object('slug', s, 'title', ttl);
end; $$;

-- 3. Manage a web cloud with its private key
create or replace function get_web_topic_owner(p_slug text, p_key text)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  t topics;
begin
  select * into t from topics
  where slug = lower(trim(coalesce(p_slug, ''))) and owner_key_hash is not null
    and owner_key_hash = encode(digest(coalesce(p_key, ''), 'sha256'), 'hex');
  if t.slug is null then return null; end if;
  return jsonb_build_object('slug', t.slug, 'title', t.title, 'paused', t.paused,
    'is_open', t.is_open and t.created_at > now() - interval '30 days',
    'expired', t.created_at <= now() - interval '30 days',
    'closes_at', t.created_at + interval '30 days',
    'hidden_words', to_jsonb(t.hidden_words),
    'total', (select count(*) from topic_words w where w.slug = t.slug));
end; $$;

-- p_action: hide or unhide (with p_word), close, open, delete
create or replace function manage_web_topic(p_slug text, p_key text, p_action text, p_word text default null)
returns void
language plpgsql security definer set search_path = public, extensions as $$
declare
  s text := lower(trim(coalesce(p_slug, '')));
  w text := lower(regexp_replace(trim(coalesce(p_word, '')), '[^a-zA-Z''-]', '', 'g'));
  t topics;
begin
  select * into t from topics
  where slug = s and owner_key_hash is not null
    and owner_key_hash = encode(digest(coalesce(p_key, ''), 'sha256'), 'hex');
  if t.slug is null then raise exception 'not_found'; end if;
  if p_action in ('hide', 'unhide') then
    if length(w) < 1 or length(w) > 20 then raise exception 'bad_word_length'; end if;
    if p_action = 'hide' then
      update topics set hidden_words = hidden_words || w
      where slug = s and not (w = any(hidden_words)) and coalesce(array_length(hidden_words, 1), 0) < 500;
    else
      update topics set hidden_words = array_remove(hidden_words, w) where slug = s;
    end if;
  elsif p_action in ('close', 'open', 'delete') then
    -- a cloud under review stays as it is until David has looked at it
    if t.paused then raise exception 'under_review'; end if;
    if p_action = 'open' and t.created_at <= now() - interval '30 days' then raise exception 'expired'; end if;
    if p_action = 'delete' then
      delete from topics where slug = s;
    else
      update topics set is_open = (p_action = 'open') where slug = s;
    end if;
  else
    raise exception 'bad_action';
  end if;
end; $$;

-- 4. Existing functions, updated so web clouds count as user clouds
-- The hub lists official clouds only.
create or replace function list_topics()
returns table (slug text, title text, prompt text, total bigint)
language sql security definer set search_path = public as $$
  select t.slug, t.title, t.prompt,
         (select count(*) from topic_words w where w.slug = t.slug)
  from topics t
  where t.is_open and t.owner_id is null and t.owner_key_hash is null
  order by t.created_at desc;
$$;

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
    'is_open',        (select is_open and not paused
                                  and not (owner_key_hash is not null and created_at <= now() - interval '30 days') from t),
    'is_user',        (select owner_id is not null or owner_key_hash is not null from t),
    'paused',         (select paused from t),
    'total',          (select case when (select paused from t) then 0
                              else (select count(*) from topic_words tw join t on t.slug = tw.slug) end),
    'distinct_words', (select count(*) from agg),
    'words',          coalesce((select jsonb_agg(jsonb_build_object('w', w, 'c', c)) from top), '[]'::jsonb)
  ) end;
$$;

-- Per-cloud numbers stay official-only; adds taps on "Start a cloud".
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
    'clicks_share',   (select count(*) from topic_clicks c where c.slug = t.slug and c.target = 'share'),
    'clicks_start',   (select count(*) from topic_clicks c where c.slug = t.slug and c.target = 'start')
  ) order by t.created_at), '[]'::jsonb)
  from topics t
  where t.owner_id is null and t.owner_key_hash is null;
$$;

-- Totals across user clouds, now including web clouds, the "Start a cloud" taps and keepsake interest.
create or replace function get_user_topic_stats()
returns jsonb
language sql security definer set search_path = public as $$
  with u as (select slug, owner_id, owner_key_hash, created_at, is_open, paused from topics
             where owner_id is not null or owner_key_hash is not null)
  select jsonb_build_object(
    'clouds_total',   (select count(*) from u),
    'clouds_7d',      (select count(*) from u where created_at > now() - interval '7 days'),
    'clouds_web',     (select count(*) from u where owner_key_hash is not null),
    'clouds_web_7d',  (select count(*) from u where owner_key_hash is not null and created_at > now() - interval '7 days'),
    'clouds_open',    (select count(*) from u where is_open),
    'clouds_paused',  (select count(*) from u where paused),
    'owners',         (select count(distinct owner_id) from u),
    'owners_with_2plus_clouds',
                      (select count(*) from (select owner_id from u group by owner_id having count(*) >= 2) x),
    'clouds_30plus_answers',
                      (select count(*) from u where (select count(*) from topic_words w where w.slug = u.slug) >= 30),
    'answers_total',  (select count(*) from topic_words w join u on u.slug = w.slug),
    'answers_7d',     (select count(*) from topic_words w join u on u.slug = w.slug where w.created_at > now() - interval '7 days'),
    'store_clicks',   (select count(*) from topic_clicks c join u on u.slug = c.slug where c.target in ('ios', 'android')),
    'reports_total',  (select count(*) from topic_reports r join u on u.slug = r.slug),
    'start_taps',     (select count(*) from topic_clicks c where c.target = 'start'),
    'keepsake_taps',  (select count(*) from topic_clicks c where c.target = 'keepsake'),
    'signals',        (select coalesce(jsonb_object_agg(kind, n), '{}'::jsonb)
                       from (select kind, count(*) as n from topic_signals group by kind) s),
    'signals_people', (select count(distinct owner_id) from topic_signals)
  );
$$;

-- Reports pause any user cloud: three for clouds started in the app, two for web clouds.
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

  if (t.owner_id is not null or t.owner_key_hash is not null) and not t.paused then
    -- reports without a readable IP each count as their own network
    select count(distinct coalesce(ip_hash, reporter_hash)) into n from topic_reports where slug = s;
    if n >= (case when t.owner_key_hash is not null then 2 else 3 end) then
      update topics set paused = true, is_open = false where slug = s;
    end if;
  end if;
end; $$;

-- Web clouds get the user-cloud answer limit, like clouds started in the app.
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
  if t.owner_key_hash is not null and t.created_at <= now() - interval '30 days' then raise exception 'topic_closed'; end if;
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
    -- Only new answers are limited: a browser changing its own words always gets through.
    if not exists (select 1 from topic_words where slug = t.slug and voter_hash = vh) then
      if t.owner_id is null and t.owner_key_hash is null then
        -- Public clouds promise one set of words per person. A household can share a
        -- connection, but a private window is not a new person.
        if (select count(*) from topic_words
            where slug = t.slug and ip_hash = ih and created_at > now() - interval '1 day') >= 3 then
          raise exception 'rate_limited_connection';
        end if;
      else
        -- Clouds started in the app: a whole wedding or office can be on one Wi-Fi.
        if (select count(*) from topic_words
            where slug = t.slug and ip_hash = ih and created_at > now() - interval '1 hour') >= 30 then
          raise exception 'rate_limited';
        end if;
      end if;
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

-- Also counts taps on "Start a cloud" and "I'd want a keepsake".
create or replace function track_topic_click(p_slug text, p_target text)
returns void
language plpgsql security definer set search_path = public as $$
declare s text := lower(trim(coalesce(p_slug, '')));
begin
  if p_target not in ('ios', 'android', 'share', 'start', 'keepsake') then return; end if;
  if not exists (select 1 from topics where slug = s) then return; end if;
  if (select count(*) from topic_clicks where slug = s and created_at > now() - interval '1 hour') >= 5000 then return; end if;
  insert into topic_clicks (slug, target) values (s, p_target);
end; $$;

-- 5. Health numbers for the automatic daily check: counts only, nothing that identifies anyone
create or replace function get_answer_health()
returns jsonb
language sql security definer set search_path = public as $$
  select jsonb_build_object(
    'reports_total',      (select count(*) from topic_reports),
    'reports_24h',        (select count(*) from topic_reports where created_at > now() - interval '24 hours'),
    'paused_clouds',      (select count(*) from topics where paused),
    'web_clouds_on',      coalesce((select v from topic_secrets where k = 'web_clouds'), 'on') = 'on',
    'web_clouds_24h',     (select count(*) from topics where owner_key_hash is not null and created_at > now() - interval '24 hours'),
    'web_clouds_total',   (select count(*) from topics where owner_key_hash is not null),
    -- the most answers one connection gave to one cloud in the last day (stuffing shows up here)
    'max_from_one_ip_24h', (select coalesce(max(n), 0) from (
                              select count(*) as n from topic_words
                              where ip_hash is not null and created_at > now() - interval '24 hours'
                              group by slug, ip_hash) x)
  );
$$;

-- 6. Grants
grant execute on function get_answer_health()                          to anon, authenticated;
grant execute on function create_web_topic(text, text)                 to anon, authenticated;
grant execute on function get_web_topic_owner(text, text)              to anon, authenticated;
grant execute on function manage_web_topic(text, text, text, text)     to anon, authenticated;
grant execute on function list_topics()                                to anon, authenticated;
grant execute on function get_topic_cloud(text, int)                   to anon, authenticated;
grant execute on function get_topic_stats()                            to anon, authenticated;
grant execute on function get_user_topic_stats()                       to anon, authenticated;
grant execute on function report_topic(text, text, text)               to anon, authenticated;
grant execute on function submit_topic_words(text, text[], text)       to anon, authenticated;
grant execute on function track_topic_click(text, text)                to anon, authenticated;

-- The results should read: installed true, website_clouds off.
select to_regprocedure('manage_web_topic(text,text,text,text)') is not null as installed,
       (select v from topic_secrets where k = 'web_clouds') as website_clouds;
