// Two-step verification policy. Pure functions with no Supabase imports, so
// the middleware, the protected layout, the /mfa pages and /account all make
// the same decision and cannot disagree with each other.
//
// This module has ONE role — organizer — so "who must enrol" is a
// deployment choice rather than a role lookup: MFA_REQUIRED=on makes
// enrolment mandatory for every organizer. It ships OFF, because turning
// mandatory enrolment on before TOTP is enabled in the Supabase dashboard
// would strand everyone on an enrolment page that cannot succeed.

export type MfaLevel = "aal1" | "aal2" | null | undefined;

/** "ok" = let them through · "challenge" = enrolled, session not yet
 * stepped up · "enroll" = not enrolled and enrolment is mandatory. */
export type MfaDecision = "ok" | "challenge" | "enroll";

export type MfaFactor = { id: string; status: string };

/** Only a verified factor counts. An abandoned enrolment sits in the factor
 * list as "unverified" and must never be treated as protection. */
export function hasVerifiedFactor(
  factors: MfaFactor[] | null | undefined
): boolean {
  return (factors ?? []).some((f) => f.status === "verified");
}

export function verifiedFactorId(
  factors: MfaFactor[] | null | undefined
): string | null {
  return (factors ?? []).find((f) => f.status === "verified")?.id ?? null;
}

export function mfaDecision({
  enrolled,
  currentLevel,
  enrolmentRequired,
}: {
  enrolled: boolean;
  currentLevel: MfaLevel;
  enrolmentRequired: boolean;
}): MfaDecision {
  if (enrolled) return currentLevel === "aal2" ? "ok" : "challenge";
  return enrolmentRequired ? "enroll" : "ok";
}

/** Same-origin path guard for ?next=. Anything else falls back to the
 * portal home, so a crafted link can't bounce a signed-in organizer to
 * another site after they pass the check. */
export function safeNext(raw: string | null | undefined): string {
  const fallback = "/admin";
  if (!raw) return fallback;
  // Reject absolute URLs, protocol-relative URLs and backslash tricks.
  if (!raw.startsWith("/")) return fallback;
  if (raw.startsWith("//")) return fallback;
  if (raw.includes("\\")) return fallback;
  if (raw.includes("://")) return fallback;
  // Never send someone back into the gate they just cleared.
  if (raw === "/mfa" || raw.startsWith("/mfa/")) return fallback;
  return raw;
}

/** Exactly six digits, spaces and dashes stripped. Empty string = invalid. */
export function normalizeTotpCode(raw: string | null | undefined): string {
  const digits = (raw ?? "").replace(/\D/g, "");
  return digits.length === 6 ? digits : "";
}
