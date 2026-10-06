-- three·words — open the "year ahead" cloud (feelings, not predictions).
-- Run once in Supabase → SQL Editor. The title completes "Describe ___ in three words"
-- in share text and on the generic /describe/ page.
insert into topics (slug, title, prompt)
values ('year-ahead', 'how you feel about the year ahead', 'Describe how you feel about the year ahead in three words')
on conflict (slug) do nothing;
