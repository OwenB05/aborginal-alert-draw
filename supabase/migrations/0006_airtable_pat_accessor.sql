-- Accessor for the Airtable personal access token stored in Supabase Vault
-- (the secret itself is inserted out-of-band, never in a migration). Only
-- the service role — i.e. Edge Functions — may call it; the token never
-- reaches the browser or the anon/authenticated API surface.
create or replace function public.get_airtable_pat()
returns text
language sql
security definer
set search_path = ''
as $$
  select decrypted_secret
  from vault.decrypted_secrets
  where name = 'airtable_pat'
  limit 1;
$$;

revoke execute on function public.get_airtable_pat() from public;
revoke execute on function public.get_airtable_pat() from anon;
revoke execute on function public.get_airtable_pat() from authenticated;
grant  execute on function public.get_airtable_pat() to service_role;
