-- three·words — open the "how you feel after the midterms" cloud. Run once in Supabase → SQL Editor.
insert into topics (slug, title, prompt)
values ('midterms', 'how you feel after the midterms', 'Describe how you feel after the midterms in three words')
on conflict (slug) do nothing;
