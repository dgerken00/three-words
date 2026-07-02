-- Non-destructive fix for the submissions INSERT policy.
-- Safe to run on live data — it only replaces a function + one policy, no drops of tables.
-- Root cause: the old INSERT policy checked blocks via an inline subquery on other
-- users' block rows, which RLS makes invisible, so the WITH CHECK never evaluated
-- correctly and rejected legitimate sends. This uses a SECURITY DEFINER helper instead.

create or replace function is_blocked(p_blocker uuid, p_blocked uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from blocks where blocker_id = p_blocker and blocked_id = p_blocked);
$$;
grant execute on function is_blocked(uuid, uuid) to authenticated;

drop policy if exists "insert my submissions" on submissions;
create policy "insert my submissions" on submissions for insert to authenticated with check (
  author_id = auth.uid()
  and not is_blocked(recipient_id, author_id)
);
