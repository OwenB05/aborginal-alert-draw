-- Two-step verification recovery. Supabase has no backup codes, so a lost
-- phone needs another organizer to clear the factor. Same shape as
-- pick_winner: SECURITY DEFINER with the admin check inside, so the
-- privileged work is server-side and the browser only calls an RPC.

-- Who the organizers are, and whether each has an authenticator. Emails
-- live in auth.users, which RLS deliberately doesn't expose.
create or replace function public.list_organizers()
returns table (user_id uuid, email text, added_at timestamptz, mfa_factors integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Organizer access required' using errcode = '42501';
  end if;

  return query
    select au.user_id,
           u.email::text,
           au.created_at,
           (select count(*)::int
              from auth.mfa_factors f
             where f.user_id = au.user_id and f.status = 'verified')
    from public.admin_users au
    join auth.users u on u.id = au.user_id
    order by u.email;
end;
$$;

-- Clear another organizer's authenticators. Cannot target yourself: use
-- /account to remove your own, so a self-reset can never be a misclick that
-- silently drops your own protection.
create or replace function public.reset_user_mfa(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_removed integer;
begin
  if not public.is_admin() then
    raise exception 'Organizer access required' using errcode = '42501';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'Use your own account page to change your two-step verification'
      using errcode = '22023';
  end if;
  if not exists (select 1 from public.admin_users where user_id = p_user_id) then
    raise exception 'Not an organizer' using errcode = '22023';
  end if;

  delete from auth.mfa_factors where user_id = p_user_id;
  get diagnostics v_removed = row_count;
  return v_removed;
end;
$$;

revoke execute on function public.list_organizers() from public;
revoke execute on function public.list_organizers() from anon;
grant  execute on function public.list_organizers() to authenticated;

revoke execute on function public.reset_user_mfa(uuid) from public;
revoke execute on function public.reset_user_mfa(uuid) from anon;
grant  execute on function public.reset_user_mfa(uuid) to authenticated;
