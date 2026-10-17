-- three·words — count plays of the promo video, per page. Counts only: nothing about the
-- viewer is stored (no IP, no token, no account). Run once in Supabase → SQL Editor.
--
-- What it answers: which placements get the video watched (landing page, cloud pages, /video/),
-- and how many plays run to the end.
--   select get_promo_stats();

create table if not exists promo_events (
  id         bigserial primary key,
  event      text not null check (event in ('video_play', 'video_end')),
  page       text not null check (page ~ '^[a-z0-9/_-]{1,60}$'),
  created_at timestamptz default now()
);
create index if not exists promo_events_page_idx on promo_events(page, event, created_at);
alter table promo_events enable row level security;   -- no policies: RPC access only

-- One call per play and per finished play, from docs/video/plays.js. Capped so it can't be
-- spammed into a bill.
create or replace function track_promo_event(p_event text, p_page text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  pg text := left(lower(regexp_replace(coalesce(p_page, ''), '[^a-zA-Z0-9/_-]', '', 'g')), 60);
begin
  if p_event is null or p_event not in ('video_play', 'video_end') then return; end if;
  if pg = '' then pg := 'unknown'; end if;
  if (select count(*) from promo_events where created_at > now() - interval '1 hour') >= 5000 then return; end if;
  insert into promo_events (event, page) values (p_event, pg);
end; $$;

-- Plays and finished plays per page, all time and last 7 days.
create or replace function get_promo_stats()
returns jsonb
language sql security definer set search_path = public as $$
  select coalesce(jsonb_object_agg(page, jsonb_build_object(
           'plays', plays, 'plays_7d', plays_7d, 'finished', finished)), '{}'::jsonb)
  from (
    select page,
           count(*) filter (where event = 'video_play')                                             as plays,
           count(*) filter (where event = 'video_play' and created_at > now() - interval '7 days') as plays_7d,
           count(*) filter (where event = 'video_end')                                              as finished
    from promo_events group by page
  ) s;
$$;

grant execute on function track_promo_event(text, text) to anon, authenticated;
grant execute on function get_promo_stats()             to anon, authenticated;
