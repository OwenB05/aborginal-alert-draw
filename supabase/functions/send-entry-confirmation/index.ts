import { createClient } from "jsr:@supabase/supabase-js@2";
import { renderHtml, sendEmail } from "./email.ts";

// Emails an entrant a short "your entry was recorded" note right after the
// public form submits. The entrant has no account, so JWT verification is
// off and this function trusts nothing in the request: the database decides
// whether anything goes out. claim_entry_confirmation() flips
// entries.confirmation_sent_at from null atomically and returns the row only
// to the first caller — one email per entry, ever, and only for entries that
// exist. The answer is { ok: true } whether or not anything matched, so the
// endpoint can't be used to learn which addresses have entered.
//
// The message carries the draw title, prize and the permissions given — no
// name, no link — so what transits the email provider (US) stays minimal.
//
// Body: { draw_id: string, email: string }

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

type Claimed = {
  entry_id: string;
  email: string;
  mailing_list_consent: boolean;
  draw_title: string;
  draw_prize: string | null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json(405, { error: "Method not allowed." });

  let drawId = "";
  let email = "";
  try {
    const body = await req.json();
    drawId = (body?.draw_id ?? "").toString().trim();
    email = (body?.email ?? "").toString().trim();
  } catch {
    return json(400, { error: "Invalid request." });
  }
  if (!UUID.test(drawId) || !email || email.length > 320) {
    return json(400, { error: "Invalid request." });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // Claim before sending. "Nothing matched" (no such entry, or already
  // confirmed) looks exactly like success from the outside.
  const { data: claimed, error: claimErr } = await admin.rpc(
    "claim_entry_confirmation",
    { p_draw_id: drawId, p_email: email },
  );
  if (claimErr) {
    console.error("claim_entry_confirmation failed:", claimErr.message);
    return json(500, { error: "Could not check the entry." });
  }
  const row = (Array.isArray(claimed) ? claimed[0] : null) as Claimed | null;
  if (!row) return json(200, { ok: true });

  // Give the claim back if the email can't go out, so a later attempt can.
  const release = () =>
    admin
      .from("entries")
      .update({ confirmation_sent_at: null })
      .eq("id", row.entry_id);

  const { data: apiKey } = await admin.rpc("get_resend_key");
  if (!apiKey) {
    await release();
    return json(200, { ok: true });
  }

  const title = String(row.draw_title);
  const prize = row.draw_prize ? String(row.draw_prize) : null;
  const main = [
    `Your entry for “${title}” has been recorded.`,
    ...(prize ? [`Prize: ${prize}`] : []),
    "If you win, we'll contact you at this email address. Good luck!",
  ];
  const fine = [
    "By entering you gave Aboriginal Alert permission to add you to the Compassionate Circle using the details you provided.",
    ...(row.mailing_list_consent
      ? ["You also asked to receive Aboriginal Alert news and updates by email."]
      : []),
    "If this wasn't you, you can ignore this message.",
  ];

  const sent = await sendEmail(String(apiKey), {
    to: String(row.email),
    subject: `You're entered: ${title}`,
    text: [...main, ...fine].join("\n\n"),
    html: renderHtml({ heading: "You're in!", paragraphs: main, small: fine }),
  });
  if (!sent.ok) {
    console.error("confirmation email failed:", sent.reason);
    await release();
  }
  return json(200, { ok: true });
});
