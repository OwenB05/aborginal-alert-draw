-- Entry confirmation emails. send-entry-confirmation is callable by anyone
-- (the entrant has no account), so the database — not the caller — decides
-- whether an email goes out: exactly one per entry, and only if the entry
-- exists. The UPDATE is the lock: whoever flips confirmation_sent_at from
-- null wins and gets the row back; every later call gets nothing.
create or replace function public.claim_entry_confirmation(p_draw_id uuid, p_email text)
returns table (
  entry_id             uuid,
  email                text,
  mailing_list_consent boolean,
  draw_title           text,
  draw_prize           text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
    with claimed as (
      update public.entries e
         set confirmation_sent_at = now()
       where e.draw_id = p_draw_id
         and lower(e.email) = lower(btrim(p_email))
         and e.confirmation_sent_at is null
      returning e.id, e.email, e.mailing_list_consent, e.draw_id
    )
    select c.id, c.email, c.mailing_list_consent, d.title, d.prize
      from claimed c
      join public.draws d on d.id = c.draw_id;
end;
$$;

revoke execute on function public.claim_entry_confirmation(uuid, text) from public;
revoke execute on function public.claim_entry_confirmation(uuid, text) from anon;
revoke execute on function public.claim_entry_confirmation(uuid, text) from authenticated;
grant  execute on function public.claim_entry_confirmation(uuid, text) to service_role;
