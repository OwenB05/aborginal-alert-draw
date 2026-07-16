# Aboriginal Alert — Community Draws

A paperless replacement for in-person paper draws, styled after
[aboriginalalert.ca](https://www.aboriginalalert.ca). Organizers create a
draw, print its QR poster, and post it at the event. People scan the QR with
their phone camera, sign electronically (typed name + consent), and are
entered. When it's time, the organizer clicks **Draw winner** and a random
entry is picked.

Built with **Next.js (App Router) + Tailwind** on **Vercel**, with
**Supabase** for the database and organizer sign-in.

## How it works

### Organizers
1. Sign in at `/admin` (organizer accounts only — there is no public signup).
2. Create a draw with a title, prize, and description/rules.
3. On the draw page: copy the entry link, or **Print poster** for a
   print-ready sheet with a large QR code.
4. Watch entries arrive live on the draw page (auto-refreshes while open).
5. Click **Draw winner** — a uniformly random entry is selected atomically
   in the database, the draw is closed, and every pick is recorded in an
   audit log (`winner_log`). **Re-draw winner** picks again; prior picks stay
   in the log. Export the full entry list as CSV anytime.

### Entrants
1. Scan the QR code (or open the link) → `/draw/<slug>`.
2. Enter full name + email, type their name as an electronic signature, and
   check the consent box.
3. One entry per email per draw (case-insensitive) — enforced by the
   database, with a friendly "already entered" message.

## Security model

- All tables use Postgres **row-level security**; the app ships only the
  public (anon) key. There is no service-role key anywhere in the app.
- The public role can read only a draw's public fields (title, description,
  prize, status) and can only *insert* entries into open draws — it can
  never read entries back, so entrant names/emails/signatures are not
  exposed even though the API key is public.
- Organizer = row in `admin_users` (keyed by auth user id). Signing up a
  Supabase account does **not** grant access; the allowlist is never writable
  through the public API.
- **Inviting organizers (normal path):** an organizer opens **Invite** in the
  portal, enters an email, and gets a one-time `/invite/<token>` link. The
  invitee opens it, sets a password, and is granted access. Acceptance runs
  in the `accept-invite` Edge Function with the service role (server-side): it
  validates the token, creates the auth user, adds them to `admin_users`, and
  marks the invite used. Invites live in the admin-only `invites` table and
  expire after 7 days.
- **Manual fallback (SQL):** have the person sign in once (or create the user
  in the Supabase dashboard), then run:

  ```sql
  insert into public.admin_users (user_id, note)
  select id, 'Their name' from auth.users where email = 'them@example.com';
  ```

- Winner selection runs inside the `pick_winner` Postgres function:
  admin-checked, row-locked against double-clicks, uniformly random, and
  audit-logged.

## Development

```bash
npm install
npm run dev
```

Set the Supabase connection in `.env.local` (also committed as
`.env.production` for the Vercel deploy — these are public-by-design
values; row-level security is what protects the data):

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon/publishable key>
```

The database schema lives in `supabase/migrations/0001_init.sql`.

## Theming

The design tokens follow the Aboriginal Alert design reference (maroon
scale anchored to `#7a1a1a`, red-dress accent `#e02020` for the feather
glyph and count badges only, warm `stone` neutrals, Open Sans) and live in
the `@theme` block of `app/globals.css`. Dark mode is class-based
(`aau-theme` in localStorage) with a no-flash script in `app/layout.tsx`
and a toggle in the header.
