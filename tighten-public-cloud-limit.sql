-- three-words: tighter limit on public clouds. Run once in Supabase, SQL Editor.
-- Public clouds: at most 3 new answers per connection, per cloud, per day (was 30 an hour).
-- Clouds started in the app keep 30 an hour. Changing your own words is never limited.
-- Why: on 1 Nov one IP gave 10 of the 49 answers on the less-of cloud by using new browser
-- sessions. Before this change no other IP had given more than 2 on any public cloud.

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
    -- Only new answers are limited: a browser changing its own words always gets through.
    if not exists (select 1 from topic_words where slug = t.slug and voter_hash = vh) then
      if t.owner_id is null then
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

grant execute on function submit_topic_words(text, text[], text) to anon, authenticated;

-- Shows true in the results if the new limit is in place.
select position('rate_limited_connection' in pg_get_functiondef('submit_topic_words(text,text[],text)'::regprocedure)) > 0 as tighter_limit_on;
