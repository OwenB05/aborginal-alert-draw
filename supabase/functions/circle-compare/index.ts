import { createClient } from "jsr:@supabase/supabase-js@2";

// Compares event entrants (entries table) against the Compassion Circle
// sign-ups in Airtable ("Individuals - Compassion Circle" table), matched by
// email, case-insensitive. Organizer-only: the caller's JWT is verified and
// checked against admin_users. The Airtable token lives in Supabase Vault and
// is fetched via the service-role-only get_airtable_pat() function — it never
// reaches the browser.
//
// Body: { draw_id?: string } — when given, only that draw's entrants are
// compared (the per-event page); otherwise every entrant (the index page).
const AIRTABLE_BASE = "app706zGX0j3TMTVp";
const AIRTABLE_TABLE = "tblxohOAL5RQRmNaJ"; // Individuals - Compassion Circle

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

type DrawRef = { id: string; title: string };

type Person = {
  full_name: string;
  email: string;
  city: string | null;
  province: string | null;
  mailing_list_consent: boolean;
  source: string;
  first_entered_at: string;
  draws: DrawRef[];
  entry_count: number;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json(405, { error: "Method not allowed." });

  let drawId: string | null = null;
  try {
    const body = await req.json();
    if (typeof body?.draw_id === "string" && body.draw_id) drawId = body.draw_id;
  } catch {
    // empty body is fine — means "all draws"
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

  // Who is calling? (their own JWT, via the anon-key client)
  const caller = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const {
    data: { user },
  } = await caller.auth.getUser();
  if (!user) return json(401, { error: "Sign in required." });

  const admin = createClient(
    supabaseUrl,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { data: adminRow } = await admin
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!adminRow) return json(403, { error: "Organizer access required." });

  const { data: pat, error: patError } = await admin.rpc("get_airtable_pat");
  if (patError || !pat)
    return json(500, { error: "Airtable connection is not configured." });

  // Pull the whole Circle table (only the fields we need), page by page.
  const circle = new Map<
    string,
    {
      first_name: string | null;
      city: string | null;
      province: string | null;
      signed_up_at: string | null;
    }
  >();
  let circleTotal = 0;
  let offset = "";
  do {
    const params = new URLSearchParams({ pageSize: "100" });
    for (const f of ["Email", "First Name", "City", "Province", "Created Date"])
      params.append("fields[]", f);
    if (offset) params.set("offset", offset);
    const res = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE}/${AIRTABLE_TABLE}?${params}`,
      { headers: { Authorization: `Bearer ${pat}` } },
    );
    if (!res.ok)
      return json(502, { error: `Airtable request failed (${res.status}).` });
    const page = await res.json();
    for (const r of page.records ?? []) {
      circleTotal++;
      const email = String(r.fields?.["Email"] ?? "")
        .trim()
        .toLowerCase();
      if (!email) continue;
      if (!circle.has(email)) {
        circle.set(email, {
          first_name: r.fields?.["First Name"] ?? null,
          city: r.fields?.["City"] ?? null,
          province: r.fields?.["Province"] ?? null,
          signed_up_at: r.fields?.["Created Date"] ?? r.createdTime ?? null,
        });
      }
    }
    offset = page.offset ?? "";
  } while (offset);

  // Event entries joined to their draw (id + title). The draws<->entries
  // embed is disambiguated: entries.draw_id, not the winner FK.
  let query = admin
    .from("entries")
    .select(
      "full_name, email, city, province, mailing_list_consent, source, created_at, draw:draws!entries_draw_id_fkey(id,title)",
    )
    .order("created_at", { ascending: true });
  if (drawId) query = query.eq("draw_id", drawId);
  const { data: entries, error: entriesError } = await query;
  if (entriesError || !entries)
    return json(500, { error: "Could not load event entries." });

  // Collapse to one row per person (email), collecting all their draws.
  const people = new Map<string, Person>();
  for (const e of entries) {
    const key = String(e.email).trim().toLowerCase();
    const d = e.draw as DrawRef | null;
    const ref: DrawRef = d
      ? { id: d.id, title: d.title }
      : { id: "", title: "Unknown draw" };
    const existing = people.get(key);
    if (existing) {
      if (!existing.draws.some((x) => x.id === ref.id)) existing.draws.push(ref);
      existing.entry_count++;
      existing.mailing_list_consent ||= e.mailing_list_consent;
      existing.city ||= e.city;
      existing.province ||= e.province;
    } else {
      people.set(key, {
        full_name: e.full_name,
        email: String(e.email).trim(),
        city: e.city,
        province: e.province,
        mailing_list_consent: e.mailing_list_consent,
        source: e.source,
        first_entered_at: e.created_at,
        draws: [ref],
        entry_count: 1,
      });
    }
  }

  const matched: unknown[] = [];
  const missing: Person[] = [];
  for (const p of people.values()) {
    const c = circle.get(p.email.toLowerCase());
    if (c) matched.push({ ...p, circle: c });
    else missing.push(p);
  }
  // Newest first for the action list; matched alphabetical.
  missing.sort((a, b) => (a.first_entered_at < b.first_entered_at ? 1 : -1));
  (matched as Person[]).sort((a, b) => a.full_name.localeCompare(b.full_name));

  return json(200, {
    fetched_at: new Date().toISOString(),
    draw_id: drawId,
    circle_total: circleTotal,
    entrant_total: people.size,
    matched,
    missing,
  });
});
