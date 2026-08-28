-- AI-scanned sign-up sheets/cards get their own provenance value, so an
-- entry read by the model is distinguishable from one typed by hand.
alter table public.entries drop constraint entries_source_check;
alter table public.entries
  add constraint entries_source_check
  check (source in ('online', 'paper', 'scan'));

-- Organizers may insert either offline kind; anon still cannot set source
-- at all (no column grant), so the public form can never claim either.
drop policy "admins transcribe paper entries" on public.entries;
create policy "admins transcribe offline entries"
  on public.entries for insert
  to authenticated
  with check (
    public.is_admin()
    and source in ('paper', 'scan')
    and exists (
      select 1 from public.draws d
      where d.id = draw_id and d.status = 'open'
    )
  );

-- Accessor for the Anthropic API key in Vault (secret inserted
-- out-of-band, never in a migration). Service role only — the key is
-- used exclusively by the scan-sheet Edge Function, never in a browser.
create or replace function public.get_anthropic_key()
returns text
language sql
security definer
set search_path = ''
as $$
  select decrypted_secret
  from vault.decrypted_secrets
  where name = 'anthropic_api_key'
  limit 1;
$$;

revoke execute on function public.get_anthropic_key() from public;
revoke execute on function public.get_anthropic_key() from anon;
revoke execute on function public.get_anthropic_key() from authenticated;
grant  execute on function public.get_anthropic_key() to service_role;
