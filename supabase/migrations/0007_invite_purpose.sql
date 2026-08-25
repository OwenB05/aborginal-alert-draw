-- Invites double as password resets (accept-invite already sets a new
-- password when the email belongs to an existing account). Tag each link so
-- the portal can label them apart. Table-level grants already cover the new
-- column for authenticated (admin-gated by RLS).
alter table public.invites
  add column purpose text not null default 'invite'
  check (purpose in ('invite', 'reset'));
