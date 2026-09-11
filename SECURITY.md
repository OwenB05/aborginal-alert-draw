# Aboriginal Alert Events — security & data residency

What is in place, what is deliberately off, how to turn each layer on, and
how to roll it back. Follows the AA module Enhanced Security guide, adapted
to this module (single organizer role, client-side Supabase auth, no
`profiles` table).

**The rule that governs every change here: never make a change that can lock
every user out.** Each layer below ships inert and is enabled in a stated
order, and each has a rollback that needs no deploy.

---

## Layers

| Layer | State | Enforced where |
|---|---|---|
| RLS on every table | **On** | Postgres policies; the app ships only the publishable key |
| Organizer allowlist | **On** | `admin_users`; never writable through the public API |
| Two-step verification (TOTP) | **Code live, enrolment optional** | `middleware.ts` choke point + `/mfa*` |
| Sign-in CAPTCHA | **Code live, no keys set** | Supabase Attack Protection verifies the token |
| Canadian compute | **On** | `vercel.json` → `yul1` (Montréal) |
| AI egress gate | **Off by default** | `app_flags.ai_scanning` read inside `scan-sheet` |
| Email delivery | **On** — invite/reset links, entry confirmations | `send-invite` / `send-entry-confirmation` Edge Functions; key in Vault |

---

## 0. Secret hygiene — read this first

**Anything that has ever appeared in a chat transcript is burned and must be
rotated.** Two secrets were pasted into this project's conversation; one has
since been rotated, one has not:

| Secret | Status | Rotate via |
|---|---|---|
| Resend API key (`re_…`) | **Rotated 2026-09-11** — pasted key revoked in Resend (probe returns 400); new key exists only in Vault | Resend → API Keys → create new, `vault.update_secret`, delete old (§4) |
| Airtable PAT (`pat…`) | **BURNED — rotate; currently live in Vault** | airtable.com/create/tokens → delete + recreate |
| Initial organizer password | **Should be changed** | `/account` → Password |
| Supabase service-role key | Clean — never in chat | only if that changes |

The working pattern: paste the value into `.env.local` (gitignored) or hand
it to a Vault insert; never into chat, a commit, or a ticket.

Server-side secrets live in **Supabase Vault**, reachable only through
`SECURITY DEFINER` functions granted to `service_role`, so an Edge Function
can read them and the browser cannot:

- `airtable_pat` → `get_airtable_pat()` (migration 0006)
- `anthropic_api_key` → `get_anthropic_key()` (migration 0008) — not yet set
- `resend_api_key` → `get_resend_key()` (migration 0011)

To rotate a Vault secret without a deploy:
`select vault.update_secret(id, '<new value>')` on that row.

**Doctrine:** RLS is the boundary for the public; every privileged action runs
either in an Edge Function holding the service role or in a `SECURITY
DEFINER` function that checks `is_admin()` itself (`pick_winner`,
`list_organizers`, `reset_user_mfa`). No service-role key exists anywhere in
the Next.js app.

---

## 1. Two-step verification (TOTP)

**Code is live. Enrolment is optional.** Enforcement for anyone who *has*
enrolled is always on: `middleware.ts` redirects a verified-factor user whose
session is not `aal2` to `/mfa`, exempting only `/mfa*` and the login page.
It keys off the factor existing, so it cannot strand someone who never
enrolled.

Turn it on, in this order:

1. Supabase → Authentication → **Multi-Factor** → TOTP **Enabled**. (Until
   this is done, `/mfa/enroll` will say so rather than fail silently.)
2. Each organizer visits **Account → Set up two-step verification**, scans the
   QR (or types the setup key), enters one code. Verifying also steps the
   session up.
3. Only once everyone has enrolled: set `MFA_REQUIRED=on` in Vercel and
   redeploy. That makes enrolment mandatory for organizers who haven't.

**Rollback:** unset `MFA_REQUIRED` (removes the *must enrol* half). To drop
protection for one person, another organizer clicks **Reset 2-step** on the
Invitations page. To drop it entirely, clear the factors:
`delete from auth.mfa_factors;`

**Recovery — there are no backup codes.** A lost phone is fixed by another
organizer on **Invitations → Organizers → Reset 2-step**. If the *last*
remaining organizer loses their phone, clear that row directly:
`delete from auth.mfa_factors where user_id = '<uuid>';`

---

## 2. Sign-in CAPTCHA

**Code is live; no site key is set, so no widget renders and sign-in is
unchanged.** A puzzle drawn in our own page would protect nothing — the login
endpoint is Supabase's, and a bot can post straight to `/auth/v1/token`.
Supabase verifies the token server-side instead.

Turn it on, in this order — **getting this backwards locks everyone out**:

1. Create a widget: Cloudflare **Turnstile** (a checkbox, no puzzles) or
   **hCaptcha** (can show picture puzzles; *Always Challenge* forces them).
   Add the production hostname to the widget's hostname list.
2. Set `NEXT_PUBLIC_TURNSTILE_SITE_KEY` **or** `NEXT_PUBLIC_HCAPTCHA_SITE_KEY`
   in Vercel and redeploy. Supabase still ignores the token, so sign-in keeps
   working either way.
3. A **human** loads `/admin/login` in a normal browser and sees the check
   pass. Automated browsers are refused by design (Turnstile `600010`), so a
   pass in an agent's browser proves nothing; a *wrong key fails within
   seconds* with a visible code, and that absence of a code is the signal.
4. Only then: Supabase → Authentication → **Attack Protection** → enable
   CAPTCHA → choose the provider → paste the **secret** → save. Sign in once
   to confirm.

**Rollback:** that same Supabase toggle, off. Plain sign-in returns instantly,
no deploy.

**Site key vs secret:** Turnstile site key is **24** characters, secret is
**35**, both start `0x4AAA` — count before pasting. The secret belongs in the
Supabase dashboard only.

**This module calls `signInWithPassword` in three places** — sign-in, invite
acceptance, and the current-password re-auth on `/account`. All three carry a
token and gate their submit button; missing any one would break that flow the
moment the toggle is enabled.

**Accessibility:** hCaptcha picture puzzles exclude some low-vision users;
hCaptcha's accessibility cookie exempts them
(`dashboard.hcaptcha.com/signup?type=accessibility`). Turnstile has no
puzzles and is the kinder default.

---

## 3. Canadian data residency

Supabase (Postgres, Auth, Storage) is already `ca-central-1`. Fixed here:

**Compute** — `vercel.json` pins functions, server actions and RSC rendering
to `yul1` (Montréal). No failover region on purpose: `yul1` is Vercel's only
Canadian region, and a US failover would defeat the point. *Prove it rather
than assume it:* fire a sign-in at production, then read where Supabase saw
it come from — `remote_addr` in `auth_logs` should resolve to
`ca-central-1`. The `x-vercel-id` header is not conclusive.

**AI extraction** — reading a sign-up sheet sends a photo containing names,
emails and signatures to Anthropic in the **United States**; Claude has no
Canadian-resident inference on any platform. This is the module's only
personal-data egress and it is **off by default**, gated on
`app_flags.ai_scanning` (migration 0009), which only Edge Functions can read.
An absent API key is deliberately *not* treated as "off" — the decision is
recorded, not incidental.

Turn on: `update public.app_flags set enabled = true where name =
'ai_scanning';` — **Rollback:** set it back to `false`. Instant, no deploy.
If in-Canada inference is ever required, Google Vertex
`northamerica-northeast1` or Azure Foundry `canadaeast` are the options, or
redact before egress.

### Residuals — document, don't claim "100% Canada"

- `middleware.ts` runs at Vercel's edge in every region (cookie check only,
  nothing stored).
- Vercel platform logs and its DPA make no residency commitment.
- If CAPTCHA is enabled, the vendor sees visitor IP and browser signals on
  the login page.
- Airtable (the Compassion Circle list) is US-hosted; the Circle comparison
  reads it and sends entrant emails for matching.
- `aboriginalalert.ca` itself is hosted outside Four Winds' control.
- Email transits Resend (US): the recipient address, the draw title and
  prize, and — for invites — the one-time link itself.

---

## 4. Email delivery (Resend)

**Built and on.** Two kinds of message, nothing else:

- **Invite and password-reset links** — `send-invite` Edge Function.
  Organizer-only (JWT verified, then `admin_users`). Emails the one-time link
  on an existing `invites` row and stamps `emailed_at`. The link's origin is
  taken from the portal the organizer is using, but only our own https hosts
  (or localhost) are honoured — anything else falls back to production, so
  the request body cannot point the link at another site. The Invitations
  page still shows and copies the link, so a bounced or missing email is
  never a dead end.
- **Entry confirmations** — `send-entry-confirmation` Edge Function, called
  by the public form right after a successful insert. It is anonymous, so it
  trusts nothing in the request: `claim_entry_confirmation()` (migration
  0012) atomically flips `entries.confirmation_sent_at` from null, and only
  the caller that wins the flip sends — one message per entry, ever. The
  response is `{ ok: true }` whether or not anything matched, so it cannot
  be used to learn which addresses have entered. The message carries the
  draw title, prize and the permissions given; no name, no link.

**Not sent:** winner notifications. The organizer contacts the winner (their
email is on the draw page) — an automated message that bounces or lands in
junk is the worst place for that conversation to fail.

The API key lives in Vault (`resend_api_key` → `get_resend_key()`, migration
0011), read only by those two functions. The first key was pasted in chat and
has since been **rotated (2026-09-11)**: the new key exists only in Vault and
the pasted one is revoked in Resend. To rotate again: Resend → API Keys →
create the new key; in the Supabase SQL Editor run
`select vault.update_secret(id, '<new key>')` on that row; then delete the
old key in Resend and confirm it is refused. No deploy — the functions read
Vault on every send.

The sender is `Aboriginal Alert Events <noreply@aboriginalalert.ca>`, which
needs `aboriginalalert.ca` verified in Resend (resend.com/domains → add the
DNS records it gives you). Until then Resend refuses every send: the
Invitations page shows the refusal word for word under the link, and
entrants simply get no email. To send from a different address without a
deploy, set an `EMAIL_FROM` secret on the Edge Functions.

**Rollback:** `delete from vault.secrets where name = 'resend_api_key';` —
`send-invite` then answers "email isn't set up" and the page falls back to
copy-and-send; confirmations stop quietly. Instant, no deploy.

---

## 5. Supabase dashboard checklist

- Authentication → **Sign In / Providers** → *Allow new users to sign up*
  **OFF** (this module is invite-only; a self-signup grants nothing, but
  there is no reason to allow the account).
- Authentication → **URL Configuration** → Site URL = the production URL;
  redirect list includes it.
- Authentication → **Multi-Factor** → TOTP enabled (§1).
- Authentication → **Attack Protection** → CAPTCHA (§2, human check first) and
  **Leaked password protection ON** *(currently OFF — flagged by the
  advisors)*.
- Project Settings → **API keys** → delete rotated keys once the new ones are
  proven.

---

## 6. Deviations from the shared guide

Recorded so nobody assumes parity with the Uploader:

- **Email is narrower than the guide's.** Invite/reset links and entry
  confirmations only — no winner notifications, no notification queue, no
  templates table.
- **No general audit table.** This module logs winner picks (`winner_log`)
  and nothing else; there is no `AUDIT_ACTIONS` map. MFA enrol/unenrol and
  resets are not audited.
- **No test runner**, so the guide's unit tests for the policy helpers are
  absent. `lib/mfa-policy.ts` and `lib/captcha.ts` are kept pure and small
  enough to review by eye instead.
- **Client-side auth.** Sign-in runs in the browser rather than a server
  action, which is why the CAPTCHA token is threaded through three client
  forms and why the MFA challenge picks the factor from the account's own
  factor list (returned by Supabase, never from a form field).
- **Single role.** There is no staff/client split, so "who must enrol" is the
  `MFA_REQUIRED` deployment flag rather than a role set.
