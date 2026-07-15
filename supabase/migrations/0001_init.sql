-- =========================================================================
-- 0001_init.sql — Aboriginal Alert QR Draw schema
-- Tables: admin_users, draws, entries, winner_log (all RLS-enabled).
-- The app runs entirely on the anon key + admin JWTs; no service role.
-- =========================================================================

-- ---------- admin allowlist ----------------------------------------------
create table public.admin_users (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  note       text,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

-- is_admin(): SECURITY DEFINER so policies can consult admin_users without
-- granting anyone direct read access, and without policy recursion.
-- search_path pinned (advisor: function_search_path_mutable).
-- auth.uid() wrapped in a scalar subquery (advisor: auth_rls_initplan).
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_users a
    where a.user_id = (select auth.uid())
  );
$$;

-- ---------- draws ---------------------------------------------------------
create table public.draws (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique
              check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 60),
  title       text not null check (char_length(title) between 1 and 200),
  description text check (char_length(description) <= 2000),
  prize       text check (char_length(prize) <= 500),
  status      text not null default 'open' check (status in ('open','closed')),
  -- winner columns added below (circular FK with entries)
  created_by  uuid default auth.uid() references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);

alter table public.draws enable row level security;

-- ---------- entries -------------------------------------------------------
create table public.entries (
  id             uuid primary key default gen_random_uuid(),
  draw_id        uuid not null references public.draws (id) on delete cascade,
  full_name      text not null check (char_length(btrim(full_name)) between 1 and 200),
  email          text not null
                 check (char_length(email) <= 320
                        and email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  -- Typed e-signature: the entrant types their full legal name to sign.
  signature_name text not null check (char_length(btrim(signature_name)) between 1 and 200),
  consent        boolean not null check (consent),
  created_at     timestamptz not null default now()
);

alter table public.entries enable row level security;

-- One entry per email per draw, case-insensitive. Must be a unique INDEX
-- (unique constraints cannot contain expressions). Its leading column also
-- serves as the draw_id lookup index.
create unique index entries_draw_email_uniq
  on public.entries (draw_id, lower(email));

-- ---------- winner columns (added after entries exists: circular FK) ------
alter table public.draws
  add column winner_entry_id uuid references public.entries (id) on delete set null,
  add column drawn_at        timestamptz;

-- ---------- winner audit log ----------------------------------------------
create table public.winner_log (
  id       bigint generated always as identity primary key,
  draw_id  uuid not null references public.draws (id) on delete cascade,
  entry_id uuid not null references public.entries (id) on delete cascade,
  drawn_by uuid,
  drawn_at timestamptz not null default now()
);

alter table public.winner_log enable row level security;
create index winner_log_draw_id_idx on public.winner_log (draw_id);

-- =========================================================================
-- GRANTS — revoke Supabase's permissive defaults, grant back the minimum.
-- Column-level grants on draws are what hide internal fields from anon.
-- =========================================================================
revoke all on table public.admin_users from anon, authenticated;
revoke all on table public.draws       from anon, authenticated;
revoke all on table public.entries     from anon, authenticated;
revoke all on table public.winner_log  from anon, authenticated;

-- anon: read ONLY the public-safe draw columns, insert ONLY entry payload
-- columns (cannot set id/created_at).
grant select (id, slug, title, description, prize, status)
  on public.draws to anon;
grant insert (draw_id, full_name, email, signature_name, consent)
  on public.entries to anon, authenticated;

-- authenticated (admins, enforced by RLS below): full table access.
grant select, insert, update, delete on public.draws   to authenticated;
grant select, delete                 on public.entries to authenticated;
grant select                         on public.admin_users to authenticated;
grant select                         on public.winner_log  to authenticated;

-- =========================================================================
-- RLS POLICIES
-- =========================================================================

-- admin_users: users may see only their own row ("am I an admin?"); no
-- write policies at all — the allowlist is managed exclusively via SQL.
create policy "read own admin row"
  on public.admin_users for select
  to authenticated
  using (user_id = (select auth.uid()));

-- draws: public read (column grant limits WHICH fields anon sees).
create policy "public read draws"
  on public.draws for select
  to anon, authenticated
  using (status in ('open','closed'));

create policy "admins manage draws"
  on public.draws for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- entries: public may insert only into OPEN draws. No select/update for
-- anon: entrant PII is write-only from the public side.
create policy "public enter open draws"
  on public.entries for insert
  to anon, authenticated
  with check (
    exists (
      select 1 from public.draws d
      where d.id = draw_id and d.status = 'open'
    )
  );

create policy "admins read entries"
  on public.entries for select
  to authenticated
  using (public.is_admin());

create policy "admins delete entries"
  on public.entries for delete
  to authenticated
  using (public.is_admin());
-- (no UPDATE policy for anyone: entries are immutable once submitted)

-- winner_log: admins read; rows are written only by pick_winner
-- (SECURITY DEFINER, owner bypasses RLS), so no insert policy exists.
create policy "admins read winner log"
  on public.winner_log for select
  to authenticated
  using (public.is_admin());

-- =========================================================================
-- pick_winner RPC — atomic, audited, admin-only random winner selection.
-- =========================================================================
create or replace function public.pick_winner(
  p_draw_id uuid,
  p_close   boolean default false
)
returns table (entry_id uuid, full_name text, email text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_entry public.entries%rowtype;
begin
  -- Re-check admin inside the function: SECURITY DEFINER bypasses RLS and
  -- any self-signed-up user can hold an `authenticated` JWT.
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  -- Serialize concurrent picks on the same draw.
  perform 1 from public.draws where id = p_draw_id for update;
  if not found then
    raise exception 'draw not found';
  end if;

  select * into v_entry
  from public.entries e
  where e.draw_id = p_draw_id
  order by random()
  limit 1;

  if not found then
    raise exception 'draw has no entries';
  end if;

  update public.draws
     set winner_entry_id = v_entry.id,
         drawn_at        = now(),
         status          = case when p_close then 'closed' else status end
   where id = p_draw_id;

  insert into public.winner_log (draw_id, entry_id, drawn_by)
  values (p_draw_id, v_entry.id, (select auth.uid()));

  return query select v_entry.id, v_entry.full_name, v_entry.email;
end;
$$;

revoke execute on function public.pick_winner(uuid, boolean) from public, anon;
grant  execute on function public.pick_winner(uuid, boolean) to authenticated;
