-- Compassion Circle is now an in-form consent (not an external link).
-- Add location fields + a separate, optional mailing-list consent.
-- CASL: consents are captured as booleans; the UI must present them
-- unchecked (enforced client-side). `consent` remains the required
-- permission to be added to the Compassionate Circle.
alter table public.entries
  add column province             text,
  add column city                 text,
  add column mailing_list_consent boolean not null default false;

-- Anon submits these columns from the public entry form.
grant insert (province, city, mailing_list_consent)
  on public.entries to anon, authenticated;

-- NOTE: province/city are intentionally left nullable and are NOT enforced
-- by a DB CHECK. The public entry form requires them (client-side); a
-- blocking DB constraint would reject submissions from any older deployed
-- form that predates these fields while a rollout is in progress.
