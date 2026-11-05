-- three-words: the admin desk at threewordsapp.com/admin. Run once in Supabase, SQL Editor.
-- Non-destructive. Run after add-web-clouds.sql.
--
-- The page itself is public, but every function here first checks that the signed-in account is
-- in the admins table, and refuses everyone else with 'not_admin'. This makes David's account
-- (invite code AJ4NEV) the only admin. Every action taken from the desk is written to admin_log,
-- a record of what was removed, paused or released, and when.

-- 1. Who is an admin, and what they did
create table if not exists admins (
  user_id    uuid primary key references profiles(id) on delete cascade,
  created_at timestamptz default now()
);
alter table admins enable row level security;      -- no policies: RPC access only
insert into admins (user_id) select id from profiles where invite_code = 'AJ4NEV' on conflict do nothing;

create table if not exists admin_log (
  id       bigserial primary key,
  at       timestamptz default now(),
  admin_id uuid,
  action   text not null,
  slug     text,
  detail   text
);
alter table admin_log enable row level security;   -- no policies: RPC access only

create or replace function tw_require_admin()
returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null or not exists (select 1 from admins where user_id = auth.uid()) then
    raise exception 'not_admin';
  end if;
end; $$;
revoke execute on function tw_require_admin() from public, anon, authenticated;

-- 2. The daily table: one row per measure, one column per day (Pacific time), oldest first
create or replace function admin_daily(p_days int default 14)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  n     int  := least(greatest(coalesce(p_days, 14), 1), 90);
  today date := (now() at time zone 'America/Los_Angeles')::date;
  res   jsonb;
begin
  perform tw_require_admin();
  with days as (
    select (today - g)::date as d from generate_series(n - 1, 0, -1) g
  ), kinds as (
    select slug, created_at,
           case when owner_key_hash is not null then 'web' when owner_id is not null then 'app' else 'public' end as kind
    from topics
  ), ev as (
    select 'answers_public' as k, w.created_at as at from topic_words w join kinds c on c.slug = w.slug where c.kind = 'public'
    union all select 'answers_user', w.created_at from topic_words w join kinds c on c.slug = w.slug where c.kind <> 'public'
    union all select 'clouds_web', created_at from kinds where kind = 'web'
    union all select 'clouds_app', created_at from kinds where kind = 'app'
    union all select 'taps_' || target, created_at from topic_clicks
    union all select 'signups', created_at from profiles
    union all select 'personal_words', created_at from submissions
    union all select 'cloud_reports', created_at from topic_reports
    union all select 'word_reports', created_at from reports
    union all select 'video_plays', created_at from promo_events where event = 'video_play'
  ), counts as (
    select k, (at at time zone 'America/Los_Angeles')::date as d, count(*)::int as c
    from ev where at > now() - make_interval(days => n + 1)
    group by 1, 2
  ), keys as (
    select k from (values ('clouds_web'), ('clouds_app'), ('signups'), ('answers_user'), ('answers_public'),
                          ('taps_start'), ('taps_ios'), ('taps_android'), ('taps_share'), ('taps_keepsake'),
                          ('personal_words'), ('cloud_reports'), ('word_reports'), ('video_plays')) v(k)
  )
  select jsonb_build_object(
    'days', (select jsonb_agg(to_char(d, 'YYYY-MM-DD') order by d) from days),
    'rows', (select jsonb_object_agg(keys.k,
               (select jsonb_agg(coalesce((select c from counts where counts.k = keys.k and counts.d = days.d), 0) order by days.d)
                from days))
             from keys)
  ) into res;
  return res;
end; $$;

-- 3. Everything that might need a decision, plus the record of past actions
create or replace function admin_lists()
returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform tw_require_admin();
  return jsonb_build_object(
    'cloud_reports', (select coalesce(jsonb_agg(x order by x->>'last_at' desc), '[]'::jsonb) from (
        select jsonb_build_object(
          'slug', t.slug, 'title', t.title, 'paused', t.paused, 'is_open', t.is_open,
          'kind', case when t.owner_key_hash is not null then 'web' when t.owner_id is not null then 'app' else 'public' end,
          'reporters', count(distinct coalesce(r.ip_hash, r.reporter_hash)),
          'reasons', coalesce(jsonb_agg(r.reason order by r.created_at desc) filter (where coalesce(r.reason, '') <> ''), '[]'::jsonb),
          'last_at', max(r.created_at)) as x
        from topic_reports r join topics t on t.slug = r.slug
        group by t.slug) q),
    -- reports on words sent in the app: the words and the reason only, no names
    'word_reports', (select coalesce(jsonb_agg(jsonb_build_object(
          'id', r.id, 'at', r.created_at, 'reason', r.reason,
          'submission_id', s.id, 'words', s.words) order by r.created_at desc), '[]'::jsonb)
        from reports r left join submissions s on s.id = r.submission_id),
    'user_clouds', (select coalesce(jsonb_agg(jsonb_build_object(
          'slug', t.slug, 'title', t.title, 'created_at', t.created_at, 'is_open', t.is_open, 'paused', t.paused,
          'kind', case when t.owner_key_hash is not null then 'web' else 'app' end,
          'expired', t.owner_key_hash is not null and t.created_at <= now() - interval '30 days',
          'answers', (select count(*) from topic_words w where w.slug = t.slug),
          'hidden', coalesce(array_length(t.hidden_words, 1), 0),
          'store_taps', (select count(*) from topic_clicks c where c.slug = t.slug and c.target in ('ios', 'android')),
          'start_taps', (select count(*) from topic_clicks c where c.slug = t.slug and c.target = 'start'),
          'reports', (select count(*) from topic_reports r where r.slug = t.slug)) order by t.created_at desc), '[]'::jsonb)
        from (select * from topics where owner_id is not null or owner_key_hash is not null
              order by created_at desc limit 300) t),
    'public_clouds', (select coalesce(jsonb_agg(jsonb_build_object(
          'slug', t.slug, 'title', t.title, 'is_open', t.is_open, 'paused', t.paused,
          'answers', (select count(*) from topic_words w where w.slug = t.slug),
          'answers_7d', (select count(*) from topic_words w where w.slug = t.slug and w.created_at > now() - interval '7 days'),
          'store_taps', (select count(*) from topic_clicks c where c.slug = t.slug and c.target in ('ios', 'android')),
          'start_taps', (select count(*) from topic_clicks c where c.slug = t.slug and c.target = 'start'),
          'hidden_words', to_jsonb(t.hidden_words)) order by t.created_at desc), '[]'::jsonb)
        from topics t where t.owner_id is null and t.owner_key_hash is null),
    -- more than one answer from one connection on a public cloud (only the first 6 characters of the scrambled IP)
    'repeats', (select coalesce(jsonb_agg(jsonb_build_object(
          'slug', slug, 'ip', ip, 'answers', n, 'first_at', first_at, 'last_at', last_at, 'word_sets', sets)
          order by n desc, last_at desc), '[]'::jsonb)
        from (select w.slug, left(w.ip_hash, 6) as ip, count(*) as n, min(w.created_at) as first_at,
                     max(w.created_at) as last_at,
                     string_agg(array_to_string(w.words, ', '), ' | ' order by w.created_at) as sets
              from topic_words w join topics t on t.slug = w.slug
              where w.ip_hash is not null and t.owner_id is null and t.owner_key_hash is null
              group by w.slug, w.ip_hash having count(*) > 1) z),
    'web_clouds_on', coalesce((select v from topic_secrets where k = 'web_clouds'), 'on') = 'on',
    'totals', jsonb_build_object(
        'signups',        (select count(*) from profiles),
        'personal_words', (select count(*) from submissions),
        'push_enabled',   (select count(*) from profiles where push_token is not null)),
    'log', (select coalesce(jsonb_agg(jsonb_build_object('at', l.at, 'action', l.action, 'slug', l.slug, 'title', t.title, 'detail', l.detail)
               order by l.at desc), '[]'::jsonb)
            from (select * from admin_log order by at desc limit 40) l left join topics t on t.slug = l.slug)
  );
end; $$;

-- 4. Actions. Each one is logged.
--   release           unpause, reopen, and clear its reports (so one new report can't re-pause it at once)
--   pause, close, open, dismiss_reports, hide_word / unhide_word (p_arg = word)
--   delete_cloud      clouds people started only; the public clouds can't be deleted from here
--   remove_repeats    p_arg = the 6-character IP shown: keeps that connection's first answer, removes the rest
--   delete_words      p_arg = submission id of a reported set of words sent in the app (clears its reports too)
--   dismiss_word_report  p_arg = report id
--   web_clouds        p_arg = 'on' or 'off'
create or replace function admin_act(p_action text, p_slug text default null, p_arg text default null)
returns void
language plpgsql security definer set search_path = public as $$
declare
  s text := lower(trim(coalesce(p_slug, '')));
  a text := trim(coalesce(p_arg, ''));
  t topics;
  n int := 0;
begin
  perform tw_require_admin();
  if p_action in ('release', 'pause', 'close', 'open', 'dismiss_reports', 'hide_word', 'unhide_word',
                  'delete_cloud', 'remove_repeats') then
    select * into t from topics where slug = s;
    if t.slug is null then raise exception 'not_found'; end if;
  end if;

  if p_action = 'release' then
    update topics set paused = false, is_open = true where slug = s;
    delete from topic_reports where slug = s; get diagnostics n = row_count;
  elsif p_action = 'pause' then
    update topics set paused = true, is_open = false where slug = s;
  elsif p_action = 'close' then
    update topics set is_open = false where slug = s;
  elsif p_action = 'open' then
    update topics set is_open = true where slug = s and not paused;
  elsif p_action = 'dismiss_reports' then
    delete from topic_reports where slug = s; get diagnostics n = row_count;
  elsif p_action in ('hide_word', 'unhide_word') then
    a := lower(regexp_replace(a, '[^a-zA-Z''-]', '', 'g'));
    if length(a) < 1 or length(a) > 20 then raise exception 'bad_word'; end if;
    if p_action = 'hide_word' then
      update topics set hidden_words = hidden_words || a where slug = s and not (a = any(hidden_words));
    else
      update topics set hidden_words = array_remove(hidden_words, a) where slug = s;
    end if;
  elsif p_action = 'delete_cloud' then
    if t.owner_id is null and t.owner_key_hash is null then raise exception 'public_cloud'; end if;
    a := t.title;                                   -- the log keeps the name of what was deleted
    delete from topics where slug = s;
  elsif p_action = 'remove_repeats' then
    if length(a) < 6 then raise exception 'bad_arg'; end if;
    delete from topic_words
    where slug = s and left(ip_hash, 6) = left(a, 6)
      and id <> (select id from topic_words where slug = s and left(ip_hash, 6) = left(a, 6) order by created_at limit 1);
    get diagnostics n = row_count;
  elsif p_action = 'delete_words' then
    delete from reports where submission_id = a::uuid;   -- handled; the log is the record
    delete from submissions where id = a::uuid;
    a := '';                                        -- the log doesn't keep the words or their id
  elsif p_action = 'dismiss_word_report' then
    delete from reports where id = a::uuid;
    a := '';
  elsif p_action = 'web_clouds' then
    if a not in ('on', 'off') then raise exception 'bad_arg'; end if;
    update topic_secrets set v = a where k = 'web_clouds';
  else
    raise exception 'bad_action';
  end if;

  insert into admin_log (admin_id, action, slug, detail)
  values (auth.uid(), p_action, nullif(s, ''), nullif(concat_ws(' · ', nullif(a, ''),
    case when n > 0 and p_action in ('release', 'dismiss_reports') then n || case when n = 1 then ' report' else ' reports' end || ' cleared'
         when n > 0 and p_action = 'remove_repeats' then n || case when n = 1 then ' extra answer' else ' extra answers' end || ' removed' end), ''));
end; $$;

-- 5. The daily check also watches reports on words sent in the app
create or replace function get_answer_health()
returns jsonb
language sql security definer set search_path = public as $$
  select jsonb_build_object(
    'reports_total',      (select count(*) from topic_reports),
    'reports_24h',        (select count(*) from topic_reports where created_at > now() - interval '24 hours'),
    'word_reports_total', (select count(*) from reports),
    'word_reports_24h',   (select count(*) from reports where created_at > now() - interval '24 hours'),
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

-- 6. Grants: the admin functions are for signed-in accounts only (and then only admins get past the check)
revoke execute on function admin_daily(int)              from public, anon;
revoke execute on function admin_lists()                 from public, anon;
revoke execute on function admin_act(text, text, text)   from public, anon;
grant  execute on function admin_daily(int)              to authenticated;
grant  execute on function admin_lists()                 to authenticated;
grant  execute on function admin_act(text, text, text)   to authenticated;
grant  execute on function get_answer_health()           to anon, authenticated;

-- Shows the admin account's display name. If this comes back empty, the invite code didn't match.
select p.name as admin from admins a join profiles p on p.id = a.user_id;
