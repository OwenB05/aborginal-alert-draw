import { createClient } from "jsr:@supabase/supabase-js@2";
import { renderHtml, sendEmail } from "./email.ts";

// Emails a one-time invite or password-reset link to the address on an
// invite row. Organizer-only: the caller's JWT is verified and checked
// against admin_users. The Resend key lives in Supabase Vault and is read via
// the service-role-only get_resend_key() — it never reaches the browser.
//
// Body: { id: string, origin?: string }
//   id      invites.id — the row just created, or one being re-sent
//   origin  where the portal is running, so the link points at the same
//           deployment the organizer is using. Only our own https hosts (or
//           localhost in development) are honoured; anything else falls back
//           to production, so a forged origin can't point the link elsewhere.
const PRODUCTION_ORIGIN = "https://aborginal-alert-draw.vercel.app";

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

function portalOrigin(raw: unknown): string {
  if (typeof raw !== "string") return PRODUCTION_ORIGIN;
  try {
    const u = new URL(raw);
    const local = u.protocol === "http:" && u.hostname === "localhost";
    const ours = u.protocol === "https:" &&
      (u.host === "aborginal-alert-draw.vercel.app" ||
        (u.hostname.startsWith("aborginal-alert-draw") &&
          u.hostname.endsWith(".vercel.app")) ||
        u.hostname === "aboriginalalert.ca" ||
        u.hostname.endsWith(".aboriginalalert.ca"));
    if (local || ours) return u.origin;
  } catch {
    // not a URL at all
  }
  return PRODUCTION_ORIGIN;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json(405, { error: "Method not allowed." });

  let id = "";
  let origin = PRODUCTION_ORIGIN;
  try {
    const body = await req.json();
    id = (body?.id ?? "").toString();
    origin = portalOrigin(body?.origin);
  } catch {
    return json(400, { error: "Invalid request." });
  }
  if (!id) return json(400, { error: "Missing invite id." });

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

  const { data: invite, error: invErr } = await admin
    .from("invites")
    .select("id, email, token, purpose, expires_at, accepted_at")
    .eq("id", id)
    .maybeSingle();
  if (invErr) return json(500, { error: "Could not load that invite." });
  if (!invite) return json(404, { error: "That invite no longer exists." });
  if (invite.accepted_at) {
    return json(409, { error: "That link has already been used." });
  }
  if (new Date(invite.expires_at).getTime() < Date.now()) {
    return json(410, { error: "That link has expired. Create a new one." });
  }

  const { data: apiKey, error: keyErr } = await admin.rpc("get_resend_key");
  if (keyErr || !apiKey) {
    return json(503, {
      error: "email isn't set up yet (no Resend key in Vault)",
    });
  }

  const to = String(invite.email);
  const link = `${origin}/invite/${invite.token}`;
  const expires = new Date(invite.expires_at).toLocaleDateString("en-CA", {
    dateStyle: "long",
    timeZone: "America/Edmonton",
  });
  const reset = invite.purpose === "reset";

  const subject = reset
    ? "Reset your Aboriginal Alert Events password"
    : "You're invited to organize Aboriginal Alert events";
  const intro = reset
    ? "An organizer requested a password reset for your Aboriginal Alert Events account. Open the link below to choose a new password."
    : "You've been invited to help run community draws for Aboriginal Alert. Open the link below to set your password and get organizer access.";
  const scope = `This link is for ${to} only, works once, and expires on ${expires}.`;
  const caveat = reset
    ? "If you didn't ask for this, you can ignore this email and your password will stay as it is."
    : "If you weren't expecting this, you can ignore this email.";

  const text = [intro, "", link, "", scope, caveat].join("\n");
  const html = renderHtml({
    heading: reset ? "Reset your password" : "You're invited",
    paragraphs: [intro],
    cta: {
      label: reset ? "Choose a new password" : "Accept the invitation",
      url: link,
    },
    small: [scope, caveat],
  });

  const sent = await sendEmail(String(apiKey), { to, subject, text, html });
  if (!sent.ok) return json(502, { error: sent.reason });

  const emailedAt = new Date().toISOString();
  await admin
    .from("invites")
    .update({ emailed_at: emailedAt })
    .eq("id", invite.id);

  return json(200, { ok: true, emailed_at: emailedAt });
});
