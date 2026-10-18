-- three·words — open the "what you want more of" cloud. Run once in Supabase → SQL Editor.
insert into topics (slug, title, prompt)
values ('more-of', 'what you want more of', 'Describe what you want more of in three words')
on conflict (slug) do nothing;
