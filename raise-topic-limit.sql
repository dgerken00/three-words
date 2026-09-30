-- three·words — raise the free limit to three open clouds per account
-- Non-destructive. Run once, AFTER add-user-topics.sql:
-- Supabase → SQL Editor → New query → paste → Run.
--
-- Decided 2026-09-30: clouds are the app's main way of reaching new people, so
-- the count stays generous and permanent. A paid tier, if it ever comes, sells
-- better clouds (custom wording, poster export), not more of them.

-- Start a cloud. Free limit: three open clouds per account.
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
  if (select count(*) from topics where owner_id = uid and is_open) >= 3 then raise exception 'limit_reached'; end if;
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
     and (select count(*) from topics where owner_id = auth.uid() and is_open) >= 3 then
    raise exception 'limit_reached';
  end if;
  update topics set is_open = p_open where slug = s;
end; $$;

