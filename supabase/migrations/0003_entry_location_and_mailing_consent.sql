-- Compassion Circle is now an in-form consent (not an external link).
-- Add location fields + a separate, optional mailing-list consent.
-- CASL: consents are captured as booleans; the UI must present them
-- unchecked (enforced client-side). `consent` remains the required
-- permission to be added to the Compassionate Circle.
alter table public.entries
  add column province             text,
  add column city                 text,
  add column mailing_list_consent boolean not null default false;

-- Require province/city for NEW entries without failing pre-existing rows.
alter table public.entries
  add constraint entries_location_present
  check (
    province is not null and char_length(btrim(province)) between 1 and 100
    and city is not null and char_length(btrim(city)) between 1 and 120
  ) not valid;

-- Anon submits these columns from the public entry form.
grant insert (province, city, mailing_list_consent)
  on public.entries to anon, authenticated;
