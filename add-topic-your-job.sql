-- three·words — open the "your job" cloud. Run once in Supabase → SQL Editor.
insert into topics (slug, title, prompt)
values ('your-job', 'your job', 'Describe your job in three words')
on conflict (slug) do nothing;
