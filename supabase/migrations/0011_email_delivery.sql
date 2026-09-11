-- Email delivery (Resend). The API key lives in Supabase Vault — inserted
-- out-of-band, never in a migration — and is readable only by the service
-- role, i.e. the send-invite and send-entry-confirmation Edge Functions.
-- Same shape as get_airtable_pat() / get_anthropic_key().
create or replace function public.get_resend_key()
returns text
language sql
security definer
set search_path = ''
as $$
  select decrypted_secret
  from vault.decrypted_secrets
  where name = 'resend_api_key'
  limit 1;
$$;

revoke execute on function public.get_resend_key() from public;
revoke execute on function public.get_resend_key() from anon;
revoke execute on function public.get_resend_key() from authenticated;
grant  execute on function public.get_resend_key() to service_role;

-- When the entrant's confirmation went out (null = not yet). Doubles as the
-- idempotency lock: the confirmation function claims the row before sending
-- (see 0012), so an entry is confirmed at most once.
alter table public.entries add column confirmation_sent_at timestamptz;

-- When the invite / reset link was last emailed (null = copied and sent by
-- hand, or the email failed and the organizer used the link directly).
alter table public.invites add column emailed_at timestamptz;
