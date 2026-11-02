-- Do the public clouds have repeat answers from one IP anywhere else? Read-only.
select slug, left(ip_hash, 6) as ip, count(*) as answers,
       to_char(min(created_at) at time zone 'America/Los_Angeles', 'Mon DD HH12:MI am') as first_answer,
       to_char(max(created_at) at time zone 'America/Los_Angeles', 'Mon DD HH12:MI am') as last_answer,
       string_agg(array_to_string(words, ', '), ' | ' order by created_at) as word_sets
from topic_words
where ip_hash is not null
  and slug in (select slug from topics where owner_id is null)
group by slug, ip_hash
having count(*) > 1
order by answers desc, slug;
