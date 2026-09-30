-- three·words — buying signals for topic clouds
-- Non-destructive. Run once, AFTER add-user-topics.sql:
-- Supabase → SQL Editor → New query → paste → Run.
--
-- Two questions this answers, both from get_user_topic_stats():
--   owners_with_2plus_clouds  how many accounts have worked around the one-cloud limit
--                             by closing or deleting a cloud and starting another
--   signals                   counts of explicit taps such as "I'd like another cloud"
--                             (the app records these from v1.3.1 on; zero until then)
--
-- Weekly check:  select get_user_topic_stats();

-- One row per tap. Owner is kept so repeat taps by one person can be told apart
-- from many people; nothing here is ever shown publicly.
create table if not exists topic_signals (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null check (kind in ('wants_second_cloud', 'wants_custom_prompt', 'wants_poster')),
  owner_id   uuid references profiles(id) on delete cascade,
  created_at timestamptz default now()
);
create index if not exists topic_signals_kind_idx on topic_signals(kind, created_at);
alter table topic_signals enable row level security;   -- no policies: RPC access only

-- Record a tap. Signed-in users only, at most 20 a day each.
create or replace function note_topic_signal(p_kind text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if p_kind not in ('wants_second_cloud', 'wants_custom_prompt', 'wants_poster') then return; end if;
  if (select count(*) from topic_signals
      where owner_id = auth.uid() and created_at > now() - interval '1 day') >= 20 then return; end if;
  insert into topic_signals (kind, owner_id) values (p_kind, auth.uid());
end; $$;
revoke execute on function note_topic_signal(text) from public, anon;
grant  execute on function note_topic_signal(text) to authenticated;

-- Same totals as before, plus the two buying signals.
create or replace function get_user_topic_stats()
returns jsonb
language sql security definer set search_path = public as $$
  with u as (select slug, owner_id, created_at, is_open, paused from topics where owner_id is not null)
  select jsonb_build_object(
    'clouds_total',   (select count(*) from u),
    'clouds_7d',      (select count(*) from u where created_at > now() - interval '7 days'),
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
    'signals',        (select coalesce(jsonb_object_agg(kind, n), '{}'::jsonb)
                       from (select kind, count(*) as n from topic_signals group by kind) s),
    'signals_people', (select count(distinct owner_id) from topic_signals)
  );
$$;
grant execute on function get_user_topic_stats() to anon, authenticated;
