-- Explicit, server-side feature gates. Used for data-residency decisions
-- that must be provably OFF by default rather than "off because a key
-- happens to be missing".
--
-- ai_scanning: the scan-sheet Edge Function sends photos of signed paper
-- sign-up sheets — which carry names, emails and signatures — to Anthropic
-- in the United States. Claude has no Canadian-resident inference, so this
-- egress is a deliberate choice and stays off until someone turns it on.
create table public.app_flags (
  name       text primary key,
  enabled    boolean not null default false,
  note       text,
  updated_at timestamptz not null default now()
);

alter table public.app_flags enable row level security;
-- No policies at all: RLS denies anon/authenticated outright, and the
-- grants are revoked as well. Only the service role (Edge Functions) reads.
revoke all on table public.app_flags from anon, authenticated;

insert into public.app_flags (name, enabled, note) values
  ('ai_scanning', false,
   'Sends photos of signed sign-up sheets (names, emails, signatures) to Anthropic in the US. Off by default for Canadian data residency.');

create or replace function public.get_app_flag(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select enabled from public.app_flags where name = p_name), false);
$$;

revoke execute on function public.get_app_flag(text) from public;
revoke execute on function public.get_app_flag(text) from anon;
revoke execute on function public.get_app_flag(text) from authenticated;
grant  execute on function public.get_app_flag(text) to service_role;
