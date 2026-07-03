-- Viral features: push notifications + no-install web describing.
-- Non-destructive — safe to run on live data. Run once in the SQL Editor.

-- ─────────────────────────────────────────────────────────────
-- 1. Push notifications ("Someone just described you")
-- ─────────────────────────────────────────────────────────────
alter table profiles add column if not exists push_token text;

create extension if not exists pg_net;

-- After every new submission, ping the recipient's phone via Expo's push API.
-- SECURITY DEFINER so it can read the recipient's token; the exception handler
-- guarantees a notification hiccup can never block the submission itself.
create or replace function notify_recipient()
returns trigger language plpgsql security definer set search_path = public as $$
declare tok text;
begin
  select push_token into tok from profiles where id = new.recipient_id;
  if tok is not null and tok like 'ExponentPushToken%' then
    perform net.http_post(
      url := 'https://exp.host/--/api/v2/push/send',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := jsonb_build_object(
        'to', tok,
        'title', 'three·words',
        'body', 'Someone just described you 👀',
        'sound', 'default'
      )
    );
  end if;
  return new;
exception when others then
  return new;
end; $$;

drop trigger if exists submissions_notify on submissions;
create trigger submissions_notify after insert on submissions
for each row execute function notify_recipient();

-- ─────────────────────────────────────────────────────────────
-- 2. No-install web describing (invite landing page form)
-- ─────────────────────────────────────────────────────────────
-- Web submissions have no account, so author_id becomes nullable. The unique
-- (author_id, recipient_id) index treats NULLs as distinct, so many web
-- submissions per recipient are allowed. In-app authors are unchanged.
alter table submissions alter column author_id drop not null;

-- Anonymous, rate-limited, filtered submission endpoint for the invite page.
create or replace function submit_words_web(p_code text, p_words text[], p_display_name text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  rid uuid;
  w text;
  clean text[] := '{}';
begin
  select id into rid from profiles where invite_code = upper(trim(p_code));
  if rid is null then raise exception 'invalid_code'; end if;
  if array_length(p_words, 1) is distinct from 3 then raise exception 'need_three_words'; end if;
  foreach w in array p_words loop
    w := lower(regexp_replace(trim(w), '[^a-zA-Z''-]', '', 'g'));
    if length(w) < 1 or length(w) > 20 then raise exception 'bad_word_length'; end if;
    if w ~ '(fuck|nigg|cunt|faggot|bitch|whore|slut|retard)' then raise exception 'blocked_word'; end if;
    clean := clean || w;
  end loop;
  if (select count(distinct x) from unnest(clean) x) < 3 then raise exception 'need_three_different_words'; end if;
  -- rate limit: max 20 web submissions per recipient per hour
  if (select count(*) from submissions
      where recipient_id = rid and author_id is null
        and created_at > now() - interval '1 hour') >= 20 then
    raise exception 'rate_limited';
  end if;
  insert into submissions (recipient_id, author_id, words, display_name)
  values (rid, null, clean, nullif(trim(coalesce(p_display_name, '')), ''));
end; $$;

grant execute on function submit_words_web(text, text[], text) to anon;
grant execute on function find_profile_by_code(text) to anon; -- landing page shows "Describe {name}"
