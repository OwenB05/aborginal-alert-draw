import { createClient } from "@/lib/supabase/server";
import {
  hasVerifiedFactor,
  verifiedFactorId,
  type MfaLevel,
} from "@/lib/mfa-policy";

/** Mandatory enrolment switch. Off unless MFA_REQUIRED=on, so enabling it is
 * a deliberate step taken AFTER TOTP is enabled in the Supabase dashboard.
 * Server-only (not NEXT_PUBLIC) — every consumer is a server component or
 * the middleware. */
export function mfaEnrolmentRequired(): boolean {
  return (process.env.MFA_REQUIRED ?? "").trim().toLowerCase() === "on";
}

export type MfaStatus = {
  enrolled: boolean;
  currentLevel: MfaLevel;
  verifiedFactorId: string | null;
};

/** Reads the caller's own factor list and assurance level. */
export async function getMfaStatus(): Promise<MfaStatus> {
  const supabase = await createClient();
  const [{ data: factors }, { data: aal }] = await Promise.all([
    supabase.auth.mfa.listFactors(),
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
  ]);
  const all = factors?.all ?? [];
  return {
    enrolled: hasVerifiedFactor(all),
    currentLevel: (aal?.currentLevel as MfaLevel) ?? null,
    verifiedFactorId: verifiedFactorId(all),
  };
}
