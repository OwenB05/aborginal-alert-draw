import Anthropic from "npm:@anthropic-ai/sdk";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Reads a photo of a paper sign-up sheet (or a stack of Compassion Circle
// cards) and returns the rows it can make out. Organizer-only: the caller's
// JWT is verified against admin_users. The Anthropic key comes from a
// Supabase secret or, failing that, Vault via the service-role-only
// get_anthropic_key() — it never reaches the browser.
//
// IMPORTANT: this endpoint only ever PROPOSES rows. Handwriting recognition
// is not reliable enough to trust blindly, so nothing is written to the
// entries table here — the organizer reviews and corrects every row in the
// portal, and the app inserts them. The model is asked to name the fields it
// was unsure about (`uncertain_fields`) so the UI can highlight them.

const MODEL = "claude-opus-5";
const MAX_IMAGES = 6;
/** ~8MB of base64 across the request keeps us inside edge limits. */
const MAX_TOTAL_BASE64 = 8_000_000;

const PROVINCES = [
  "Alberta",
  "British Columbia",
  "Manitoba",
  "New Brunswick",
  "Newfoundland and Labrador",
  "Northwest Territories",
  "Nova Scotia",
  "Nunavut",
  "Ontario",
  "Prince Edward Island",
  "Quebec",
  "Saskatchewan",
  "Yukon",
];

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

const ROW_SCHEMA = {
  type: "object",
  properties: {
    full_name: {
      type: "string",
      description: "Exactly as written. Empty string if not legible at all.",
    },
    email: {
      type: "string",
      description:
        "Exactly as written, lowercased. Empty string if not legible at all.",
    },
    city: { type: "string", description: "Empty string if not written." },
    province: {
      type: "string",
      description:
        "Full Canadian province/territory name from the allowed list, or empty string if not written or unclear. Never guess from the city.",
      enum: [...PROVINCES, ""],
    },
    mailing_list_consent: {
      type: "boolean",
      description:
        "True ONLY if the optional mailing-list box on this row is clearly ticked. False if blank, crossed out, or absent.",
    },
    signed: {
      type: "boolean",
      description:
        "True if this row has a handwritten signature (or clear mark) in the signature area.",
    },
    uncertain_fields: {
      type: "array",
      items: {
        type: "string",
        enum: ["full_name", "email", "city", "province", "mailing_list_consent"],
      },
      description:
        "Every field whose reading you are not confident about. Be generous: if a character could plausibly be read another way, list the field.",
    },
    notes: {
      type: "string",
      description:
        "Short note about anything ambiguous on this row, e.g. 'could be rn or m' or 'domain smudged'. Empty string if nothing to flag.",
    },
  },
  required: [
    "full_name",
    "email",
    "city",
    "province",
    "mailing_list_consent",
    "signed",
    "uncertain_fields",
    "notes",
  ],
  additionalProperties: false,
} as const;

const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    rows: { type: "array", items: ROW_SCHEMA },
    sheet_notes: {
      type: "string",
      description:
        "Short note about the image(s) as a whole — e.g. 'bottom of sheet cut off', 'photo blurry on the right'. Empty string if all fine.",
    },
  },
  required: ["rows", "sheet_notes"],
  additionalProperties: false,
} as const;

const SYSTEM = `You transcribe handwritten sign-up sheets collected at Aboriginal Alert community events, where people enter a draw and give permission to join the Compassionate Circle.

The image may be either:
- a printed sheet with a table of numbered rows (columns: name, email, city/town, province, an optional "mail list" tick box, and a signature), or
- one or more individual hand-filled sign-up cards, one person each.

Handle whichever you are given, and combine multiple images into one list of people.

Rules:
1. TRANSCRIBE, DO NOT INTERPRET. Copy what is actually written. Never invent, complete, or "correct" a value. If a name looks like an unusual spelling, keep the unusual spelling.
2. Never repair email addresses by guessing a plausible domain. Write the characters you see. If part is illegible, transcribe what you can and flag the field.
3. Skip rows that are entirely blank. Do not emit placeholder rows.
4. mailing_list_consent is true ONLY when that row's optional box is clearly ticked.
5. Report signed honestly — an unsigned row means we have no consent record for that person.
6. Be generous with uncertain_fields. Handwriting is often ambiguous (a/o, u/v, rn/m, 1/7, i/l/1, capital I vs l, .com vs .con). A human will check every flagged field, so over-flagging is cheap and a silent misreading is expensive.
7. Never include commentary outside the requested fields.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json(405, { error: "Method not allowed." });

  let images: { media_type: string; data: string }[] = [];
  try {
    const body = await req.json();
    images = Array.isArray(body?.images) ? body.images : [];
  } catch {
    return json(400, { error: "Invalid request." });
  }
  if (images.length === 0)
    return json(400, { error: "No photo was supplied." });
  if (images.length > MAX_IMAGES)
    return json(400, {
      error: `Please scan at most ${MAX_IMAGES} photos at a time.`,
    });

  let total = 0;
  for (const img of images) {
    if (
      typeof img?.data !== "string" ||
      !["image/jpeg", "image/png", "image/webp"].includes(img?.media_type)
    )
      return json(400, { error: "Photos must be JPEG, PNG, or WebP." });
    total += img.data.length;
  }
  if (total > MAX_TOTAL_BASE64)
    return json(413, {
      error: "Those photos are too large. Try fewer photos at a time.",
    });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

  // Verify the caller is a signed-in organizer.
  const caller = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: {
      headers: { Authorization: req.headers.get("Authorization") ?? "" },
    },
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

  // Key: Supabase secret first, then Vault.
  let apiKey = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
  if (!apiKey) {
    const { data: vaultKey } = await admin.rpc("get_anthropic_key");
    apiKey = (vaultKey as string | null) ?? "";
  }
  if (!apiKey)
    return json(503, {
      error:
        "AI scanning isn't configured yet — an Anthropic API key needs to be added before sheets can be read.",
    });

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      // Opus 5 thinks by default; adaptive is stated for clarity. Note there
      // is no temperature/budget_tokens on this model.
      thinking: { type: "adaptive" },
      output_config: {
        effort: "high",
        format: { type: "json_schema", schema: OUTPUT_SCHEMA },
      },
      // If a safety classifier ever declines, retry the same request on
      // another model inside the same call rather than failing the scan.
      betas: ["server-side-fallback-2026-06-01"],
      fallbacks: [{ model: "claude-opus-4-8" }],
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            ...images.map((img) => ({
              type: "image" as const,
              source: {
                type: "base64" as const,
                media_type: img.media_type as
                  | "image/jpeg"
                  | "image/png"
                  | "image/webp",
                data: img.data,
              },
            })),
            {
              type: "text" as const,
              text: `Transcribe every person who signed up in ${
                images.length === 1 ? "this photo" : "these photos"
              }. Follow the rules exactly, and flag every field you are not fully confident about.`,
            },
          ],
        },
      ],
    });

    if (response.stop_reason === "refusal")
      return json(422, {
        error:
          "The model declined to read this image. Try a clearer photo of just the sign-up sheet.",
      });

    const text = response.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
    if (!text)
      return json(502, { error: "The model returned nothing to review." });

    // Structured outputs give us bare JSON; tolerate a fenced block anyway.
    let parsed: { rows?: unknown[]; sheet_notes?: string };
    try {
      parsed = JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, ""));
    } catch {
      return json(502, {
        error: "Couldn't read the model's response. Please try again.",
      });
    }

    // Normalize defensively — everything here is shown for review, never
    // trusted straight into the database.
    const rows = (Array.isArray(parsed.rows) ? parsed.rows : [])
      .map((r) => {
        const row = r as Record<string, unknown>;
        const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
        const province = str(row.province);
        return {
          full_name: str(row.full_name),
          email: str(row.email).toLowerCase(),
          city: str(row.city),
          province: PROVINCES.includes(province) ? province : "",
          mailing_list_consent: row.mailing_list_consent === true,
          signed: row.signed === true,
          uncertain_fields: Array.isArray(row.uncertain_fields)
            ? row.uncertain_fields.filter((f): f is string => typeof f === "string")
            : [],
          notes: str(row.notes),
        };
      })
      .filter((r) => r.full_name || r.email);

    return json(200, {
      rows,
      sheet_notes:
        typeof parsed.sheet_notes === "string" ? parsed.sheet_notes : "",
      model: response.model ?? MODEL,
    });
  } catch (err) {
    // Surface the real API message so a misconfiguration is diagnosable.
    const message =
      err instanceof Anthropic.APIError
        ? `${err.status ?? ""} ${err.message}`.trim()
        : err instanceof Error
          ? err.message
          : "Unknown error";
    return json(502, { error: `Could not read the sheet: ${message}` });
  }
});
