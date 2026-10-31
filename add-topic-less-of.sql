-- three·words — open the "what you want less of" cloud. Run once in Supabase → SQL Editor.
insert into topics (slug, title, prompt)
values ('less-of', 'what you want less of', 'Describe what you want less of in three words')
on conflict (slug) do nothing;
