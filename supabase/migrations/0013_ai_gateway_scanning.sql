-- AI sheet scanning moved off the scan-sheet Edge Function (which needed an
-- Anthropic API key in Vault) onto a Next.js route on Vercel that calls
-- Vercel AI Gateway, authenticated by the deployment's own OIDC token. No AI
-- provider key exists anywhere any more.
--
-- That route runs as the signed-in organizer (the app holds no service-role
-- key), so it needs an organizer-only way to read the residency gate, which
-- is otherwise service-role-only (migration 0009). Same shape as
-- list_organizers: SECURITY DEFINER with the admin check inside.
create or replace function public.ai_scanning_enabled()
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Organizer access required' using errcode = '42501';
  end if;
  return public.get_app_flag('ai_scanning');
end;
$$;

revoke execute on function public.ai_scanning_enabled() from public;
revoke execute on function public.ai_scanning_enabled() from anon;
grant  execute on function public.ai_scanning_enabled() to authenticated;

-- Nothing reads an Anthropic key any more.
drop function if exists public.get_anthropic_key();
