import { createClient } from "jsr:@supabase/supabase-js@2";

// Called by an unauthenticated invitee, so JWT verification is off; the
// invite token is the credential and is validated below. Runs with the
// service role (server-side secret) to create the account + grant access.
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json(405, { error: "Method not allowed." });

  let token = "";
  let password = "";
  try {
    const body = await req.json();
    token = (body?.token ?? "").toString();
    password = (body?.password ?? "").toString();
  } catch {
    return json(400, { error: "Invalid request." });
  }
  if (!token) return json(400, { error: "Missing invite token." });
  if (password.length < 8)
    return json(400, { error: "Password must be at least 8 characters." });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data: invite, error: invErr } = await admin
    .from("invites")
    .select("*")
    .eq("token", token)
    .maybeSingle();
  if (invErr) return json(500, { error: "Could not validate the invite." });
  if (!invite) return json(404, { error: "This invite link is invalid." });
  if (invite.accepted_at)
    return json(409, { error: "This invite has already been used." });
  if (new Date(invite.expires_at).getTime() < Date.now())
    return json(410, { error: "This invite has expired." });

  const email = String(invite.email);

  // Create the account, or set the password if the email already exists.
  let userId: string | null = null;
  const { data: created } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (created?.user) {
    userId = created.user.id;
  } else {
    const { data: list } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    const existing = list?.users.find(
      (u) => (u.email ?? "").toLowerCase() === email.toLowerCase(),
    );
    if (!existing)
      return json(400, { error: "Could not create the account." });
    await admin.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
    });
    userId = existing.id;
  }

  const { error: grantErr } = await admin
    .from("admin_users")
    .upsert({ user_id: userId, note: `Invited: ${email}` }, {
      onConflict: "user_id",
    });
  if (grantErr) return json(500, { error: "Could not grant organizer access." });

  await admin
    .from("invites")
    .update({ accepted_at: new Date().toISOString(), accepted_user_id: userId })
    .eq("id", invite.id);

  return json(200, { ok: true, email });
});
