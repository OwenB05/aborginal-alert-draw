-- Organizer invitations. An admin creates a row (email + random token) and
-- shares /invite/<token>. Acceptance is handled by the accept-invite Edge
-- Function (service role), which creates the auth user, adds them to
-- admin_users, and marks the invite used. The table is admin-only via RLS;
-- anon has no access (tokens are validated inside the Edge Function).
create table public.invites (
  id               uuid primary key default gen_random_uuid(),
  email            text not null
                   check (char_length(email) <= 320
                          and email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  token            text not null unique check (char_length(token) between 20 and 200),
  created_by       uuid default auth.uid() references auth.users (id) on delete set null,
  created_at       timestamptz not null default now(),
  expires_at       timestamptz not null default (now() + interval '7 days'),
  accepted_at      timestamptz,
  accepted_user_id uuid references auth.users (id) on delete set null
);

alter table public.invites enable row level security;

revoke all on table public.invites from anon, authenticated;
grant select, insert, delete on public.invites to authenticated;

create policy "admins read invites"
  on public.invites for select
  to authenticated
  using (public.is_admin());

create policy "admins create invites"
  on public.invites for insert
  to authenticated
  with check (public.is_admin());

create policy "admins delete invites"
  on public.invites for delete
  to authenticated
  using (public.is_admin());
