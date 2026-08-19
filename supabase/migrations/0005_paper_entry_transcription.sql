-- Paper sign-up sheets for events without cell service: Bonnie collects
-- entries on a printed sheet, then an organizer transcribes them in the
-- portal. Transcribed rows are marked source='paper' for auditability
-- (the signed paper sheet is the consent record; the organizer keeps it).
alter table public.entries
  add column source text not null default 'online'
  check (source in ('online', 'paper'));

-- Organizers may INSERT transcribed entries. anon's column grant does NOT
-- include source, so public submissions can never claim to be paper.
grant insert (draw_id, full_name, email, province, city, signature_name,
              consent, mailing_list_consent, source)
  on public.entries to authenticated;

-- Only allowlisted admins, only marked as paper, and only into open draws
-- (same open-draw rule as the public form; reopen a closed draw to
-- transcribe late sheets, then close it again).
create policy "admins transcribe paper entries"
  on public.entries for insert
  to authenticated
  with check (
    public.is_admin()
    and source = 'paper'
    and exists (
      select 1 from public.draws d
      where d.id = draw_id and d.status = 'open'
    )
  );
