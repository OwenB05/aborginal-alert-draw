import { createClient } from "@/lib/supabase/server";
import { getMfaStatus, mfaEnrolmentRequired } from "@/lib/mfa";
import { mfaDecision } from "@/lib/mfa-policy";
import { CANADIAN_PROVINCES } from "@/lib/types";

// Reads a photo of a paper sign-up sheet (or a stack of Compassion Circle
// cards) and returns the rows it can make out, for an organizer to review.
//
// The model is reached through Vercel AI Gateway, billed to the team's
// gateway credits. On Vercel the deployment authenticates with its own
// short-lived OIDC token (the x-vercel-oidc-token request header), so there
// is no AI provider key anywhere — not in Vault, not in env vars, not in the
// browser. AI_GATEWAY_API_KEY, if set, takes precedence (local development).
//
// IMPORTANT: this endpoint only ever PROPOSES rows. Handwriting recognition
// is not reliable enough to trust blindly, so nothing is written to the
// entries table here — the organizer reviews and corrects every row, and the
// page inserts them. The model names the fields it was unsure about
// (`uncertain_fields`) so the UI can highlight them.
//
// Residency: the photo (names, emails, signatures) goes to Anthropic in the
// United States. Gated on app_flags.ai_scanning, read through the
// organizer-only ai_scanning_enabled() (migration 0013). See SECURITY.md.

export const runtime = "nodejs";
// Reading a stack of handwritten cards with careful reasoning can take a
// while; stay inside Vercel's Fluid compute ceiling.
export const maxDuration = 300;

const GATEWAY_URL = "https://ai-gateway.vercel.sh/v1/messages";
const MODEL = "anthropic/claude-opus-5";
/** Tried by the gateway if the primary model is unavailable. */
const FALLBACK_MODELS = ["anthropic/claude-opus-4.8"];
const MAX_IMAGES = 6;
/** Vercel caps a function request body at 4.5 MB; leave room for JSON. */
const MAX_TOTAL_BASE64 = 4_200_000;
const GATEWAY_TIMEOUT_MS = 280_000;

const PROVINCES: readonly string[] = CANADIAN_PROVINCES;

function json(status: number, body: unknown) {
  return Response.json(body, { status });
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
};

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
};

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

type ImageIn = { media_type: string; data: string };

/** Pulls a human-readable message out of a gateway or Anthropic error body. */
function gatewayErrorMessage(status: number, body: unknown): string {
  const b = body as {
    error?: { message?: unknown } | string;
    message?: unknown;
  } | null;
  if (b && typeof b.error === "object" && typeof b.error?.message === "string")
    return b.error.message;
  if (b && typeof b.error === "string") return b.error;
  if (b && typeof b.message === "string") return b.message;
  return `the AI Gateway returned ${status}`;
}

export async function POST(req: Request) {
  // Same-origin JSON only: a cross-site form post can't reach this.
  if (!(req.headers.get("content-type") ?? "").includes("application/json"))
    return json(415, { error: "Invalid request." });
  const origin = req.headers.get("origin");
  if (origin && new URL(origin).host !== new URL(req.url).host)
    return json(403, { error: "Invalid request." });

  let images: ImageIn[] = [];
  try {
    const body = await req.json();
    images = Array.isArray(body?.images) ? body.images : [];
  } catch {
    return json(400, { error: "Invalid request." });
  }
  if (images.length === 0) return json(400, { error: "No photo was supplied." });
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
      error: "Those photos are too large together. Try fewer at a time.",
    });

  // Signed-in organizer, with two-step verification satisfied — the same
  // bar the portal pages apply (middleware does not cover /api).
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return json(401, { error: "Sign in required." });

  const { data: adminRow } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!adminRow) return json(403, { error: "Organizer access required." });

  const mfa = await getMfaStatus();
  if (
    mfaDecision({
      enrolled: mfa.enrolled,
      currentLevel: mfa.currentLevel,
      enrolmentRequired: mfaEnrolmentRequired(),
    }) !== "ok"
  )
    return json(403, {
      error: "Finish two-step verification, then try the scan again.",
    });

  // DATA RESIDENCY GATE — the recorded decision, not an incidental missing key.
  const { data: aiEnabled, error: flagError } = await supabase.rpc(
    "ai_scanning_enabled"
  );
  if (flagError)
    return json(500, { error: "Could not check the AI scanning setting." });
  if (aiEnabled !== true)
    return json(403, {
      error:
        "AI scanning is turned off. Reading a sheet sends the photo (names, emails, signatures) to a service in the United States, so it stays off until it is explicitly enabled. Type the sheet in under 'Enter paper sheet' instead.",
    });

  const token =
    process.env.AI_GATEWAY_API_KEY ||
    req.headers.get("x-vercel-oidc-token") ||
    process.env.VERCEL_OIDC_TOKEN ||
    "";
  if (!token)
    return json(503, {
      error:
        "AI scanning can't reach Vercel's AI Gateway from this deployment (no OIDC token). Check Project Settings → Security → OIDC Federation in Vercel.",
    });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GATEWAY_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 16000,
        // Opus 5 thinks adaptively; stated for clarity. No temperature or
        // budget_tokens on this model.
        thinking: { type: "adaptive" },
        output_config: {
          effort: "high",
          format: { type: "json_schema", schema: OUTPUT_SCHEMA },
        },
        providerOptions: { gateway: { models: FALLBACK_MODELS } },
        system: SYSTEM,
        messages: [
          {
            role: "user",
            content: [
              ...images.map((img) => ({
                type: "image",
                source: {
                  type: "base64",
                  media_type: img.media_type,
                  data: img.data,
                },
              })),
              {
                type: "text",
                text: `Transcribe every person who signed up in ${
                  images.length === 1 ? "this photo" : "these photos"
                }. Follow the rules exactly, and flag every field you are not fully confident about.`,
              },
            ],
          },
        ],
      }),
      signal: controller.signal,
    });
  } catch (err) {
    const timedOut = err instanceof Error && err.name === "AbortError";
    return json(504, {
      error: timedOut
        ? "Reading the sheet took too long. Try fewer photos at a time."
        : "Couldn't reach the AI service. Please try again.",
    });
  } finally {
    clearTimeout(timer);
  }

  const body = await res.json().catch(() => null);
  if (!res.ok)
    return json(502, {
      error: `Could not read the sheet: ${gatewayErrorMessage(res.status, body)}`,
    });

  const response = body as {
    model?: string;
    stop_reason?: string;
    content?: { type: string; text?: string }[];
  } | null;
  if (response?.stop_reason === "refusal")
    return json(422, {
      error:
        "The model declined to read this image. Try a clearer photo of just the sign-up sheet.",
    });

  const text = (response?.content ?? [])
    .filter((b) => b.type === "text" && typeof b.text === "string")
    .map((b) => b.text)
    .join("")
    .trim();
  if (!text) return json(502, { error: "The model returned nothing to review." });

  // Structured outputs give bare JSON; tolerate a fenced block anyway.
  let parsed: { rows?: unknown[]; sheet_notes?: unknown };
  try {
    parsed = JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, ""));
  } catch {
    return json(502, {
      error: "Couldn't read the model's response. Please try again.",
    });
  }

  // Normalize defensively — everything here is shown for review, never
  // trusted straight into the database.
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const rows = (Array.isArray(parsed.rows) ? parsed.rows : [])
    .map((r) => {
      const row = (r ?? {}) as Record<string, unknown>;
      const province = str(row.province);
      return {
        full_name: str(row.full_name),
        email: str(row.email).toLowerCase(),
        city: str(row.city),
        province: PROVINCES.includes(province) ? province : "",
        mailing_list_consent: row.mailing_list_consent === true,
        signed: row.signed === true,
        uncertain_fields: Array.isArray(row.uncertain_fields)
          ? row.uncertain_fields.filter(
              (f): f is string => typeof f === "string"
            )
          : [],
        notes: str(row.notes),
      };
    })
    .filter((r) => r.full_name || r.email);

  return json(200, {
    rows,
    sheet_notes: str(parsed.sheet_notes),
    model: response?.model ?? MODEL,
  });
}
