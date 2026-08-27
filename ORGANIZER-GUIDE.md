# Aboriginal Alert Events — Organizer's Guide

How to run a community draw from start to finish. Written for the person
setting up and running events — no technical background needed.

**The portal:** https://aborginal-alert-draw.vercel.app/admin
Sign in with your organizer email and password. Entrants never need an
account — they just scan a QR code.

---

## 1. Set up a draw (before the event)

1. Sign in and click **New draw** on the dashboard.
2. Give it a **title** (this is what entrants see — e.g. *K Days Compassion
   Circle Sign Up*), an optional **description**, and an optional **prize**.
3. The draw is created **open**, with its own entry link and QR code.

From the draw's page you can then print what you need:

- **Print poster** — a letter-size poster with the draw title, prize, and a
  big QR code. Put it on your table; people scan it with their phone camera
  (no app needed).
- **Sign-up sheet** — a paper sheet for events **without cell service**
  (see section 3). Print a few copies if you're headed somewhere remote.
- **Copy link** — the same entry link as the QR, for sharing by text,
  email, or social media.

Each draw's link contains a random code, so it can't be guessed — people
find it through your QR or shared link only.

## 2. What entrants do (online)

Scanning the QR opens the entry form. They fill in:

- Full name and email (one entry per email per draw — duplicates are
  politely rejected)
- Province/Territory and City/Town
- A typed **electronic signature** (must match their name)
- **Required consent** — permission to join the Compassionate Circle and to
  have their name announced if they win. The Enter button stays greyed out
  until they tick it.
- **Optional** mailing-list opt-in (never pre-checked)

They get a confirmation screen, and their entry appears on your draw page
immediately.

## 3. Events without cell service (paper sheets)

1. Before you go: open the draw → **Sign-up sheet** → print a few copies
   (it prints in landscape, 12 rows per sheet).
2. At the event: people write their name, email, city, province, tick the
   optional **Mail list** box if they want news, and **sign the row**. The
   consent statement is printed on the sheet, so their signature on paper
   carries the same permission as the online checkbox.
3. Back online: open the draw → **Enter paper sheet** and type the rows in.
   It's built to be fast — press Enter after each row, and the city and
   province stay filled in between rows. Duplicates are flagged and
   skipped automatically; just keep typing.
4. **Keep the signed paper sheets on file.** They are the consent record
   for those entries.

Paper entries are tagged **Paper** everywhere in the portal, so you can
always tell them apart from QR entries. If the draw was already closed
before you got back, reopen it, type the rows in, and close it again.

## 4. Watching entries come in

The draw page lists every entry (name, email, location, when they entered,
paper/online). From there you can:

- **Export CSV** — the full entrant list for spreadsheets or records.
- **Remove** an entry (e.g. an obvious test or a duplicate person under a
  second email) — only while the draw is open.

## 5. Drawing the winner

1. When entries should stop, click **Close draw** (you can also draw the
   winner and close in one step). A closed draw stops accepting entries and
   locks the entry list so records stay tamper-proof.
2. Click **Draw winner**. The winner is picked uniformly at random on the
   server and recorded in a permanent audit log.
3. The winner is highlighted in the list with their contact email. If they
   can't be reached or decline, use **Draw again** — every pick (including
   superseded ones) stays in the visible draw history with timestamps.

Finished draws move to the **Past draws** archive on the dashboard, showing
the winner, date, and entry count. They stay read-only unless you
explicitly reopen them, and you can delete a past draw entirely if it was a
test.

## 6. Compassion Circle Comparison

Everyone who enters a draw consents to joining the Compassionate Circle —
but that doesn't mean they're in the official Airtable list yet. The
**Circle** page in the header checks, live:

- Overall tiles: unique entrants, how many are already in the Airtable, how
  many are **not signed up yet**, and the sign-up percentage.
- One section **per event**, newest first, each with its own counts — so
  you can see how K Days did versus a conference.
- Click any not-signed-up person to see their full record. **Copy
  details** puts an Airtable-ready block on your clipboard (First Name,
  Email, City, Province…); **Add in Airtable ↗** opens the Circle table so
  you can paste them in. Paper entrants are included automatically.

Use it after every event: open Circle, work through the red list, done.

## 7. Adding organizers & password resets

On the **Invitations** page:

- **Invite an organizer:** enter their email → **Create invite link** →
  copy the one-time link and send it to them. They open it, set a
  password, and land in the portal with full organizer access. Links
  expire after 7 days and can be revoked while pending.
- **Password reset:** if an organizer is locked out, enter their email →
  **Send password reset link** → copy and send it. Opening it lets them
  set a new password (old one stops working). Reset links are also
  one-time and 7-day.

Only existing organizers can create these links, and having a portal
account alone grants nothing — access comes from the invite.

## 8. Your account & display settings

- **Account** (click your email in the header): change your password.
- **Gear icon** (any page): theme (light/dark/system), text size, font,
  reduce motion, high contrast, underlined links. These apply instantly
  and are saved per device — handy for reading the portal in bright
  sunlight at an outdoor event (try text size A++ and high contrast).

## 9. Privacy promises baked in

Worth knowing so you can answer questions at the table:

- Entrant information is used only to run the draw it was submitted to and
  to honour the consents they gave (Compassionate Circle, and mailing list
  if opted in).
- The public can never see who entered — names, emails, and signatures are
  not readable from outside the portal, even with the site's public link.
- Consents are never pre-checked, and the two consents (Circle vs mailing
  list) are separate choices.
- Every winner pick is audit-logged; closed draws are locked.

## Quick reference

| I want to… | Where |
|---|---|
| Create an event/draw | Dashboard → **New draw** |
| Print the QR poster | Draw page → **Print poster** |
| Take paper sign-ups (no service) | Draw page → **Sign-up sheet** |
| Type in paper sign-ups | Draw page → **Enter paper sheet** |
| See/export entrants | Draw page → list / **Export CSV** |
| Pick a winner | Draw page → **Close draw** / **Draw winner** |
| See who's not in the Circle yet | Header → **Circle** |
| Add an organizer | Header → **Invitations** → **Create invite link** |
| Reset someone's password | Header → **Invitations** → **Send password reset link** |
| Change my password | Header → your email → **Account** |
| Dark mode / bigger text | Header → gear icon |
