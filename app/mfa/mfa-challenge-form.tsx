"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { verifiedFactorId, normalizeTotpCode } from "@/lib/mfa-policy";
import { SignOutButton } from "@/components/admin/sign-out-button";
import {
  btnPrimary,
  btnSecondary,
  card,
  errorText,
  heading,
  input,
  label,
  metaText,
} from "@/lib/ui";

export function MfaChallengeForm({
  next,
  email,
}: {
  next: string;
  email: string;
}) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const clean = normalizeTotpCode(code);
    if (!clean) {
      setError("Enter the 6-digit code from your authenticator app.");
      return;
    }

    setSubmitting(true);
    const supabase = createClient();

    // The factor is chosen from the account's own factor list, never from
    // anything the page submits.
    const { data: factors, error: listError } =
      await supabase.auth.mfa.listFactors();
    const factorId = verifiedFactorId(factors?.all);
    if (listError || !factorId) {
      setSubmitting(false);
      setError("Couldn't find your authenticator. Sign out and try again.");
      return;
    }

    const { data: challenge, error: challengeError } =
      await supabase.auth.mfa.challenge({ factorId });
    if (challengeError || !challenge) {
      setSubmitting(false);
      setError("Couldn't start the check. Please try again.");
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code: clean,
    });
    setSubmitting(false);

    if (verifyError) {
      // One generic message — never hint at how close the code was.
      setError("That code didn't work. Check the app and try the new code.");
      setCode("");
      return;
    }

    router.push(next);
    router.refresh();
  }

  return (
    <div className={`mx-auto mt-12 max-w-sm ${card} p-6`}>
      <h1 className={`text-2xl ${heading}`}>Two-step verification</h1>
      <p className={`mt-1 text-sm ${metaText}`}>
        Enter the current 6-digit code from your authenticator app to finish
        signing in as {email}.
      </p>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="totp" className={label}>
            6-digit code
          </label>
          <input
            id="totp"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            maxLength={7}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className={`${input} text-center text-2xl tracking-[0.4em]`}
            placeholder="000000"
          />
        </div>
        {error && (
          <p role="alert" className={errorText}>
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={submitting}
          className={`${btnPrimary} w-full py-2.5`}
        >
          {submitting ? "Checking…" : "Verify"}
        </button>
      </form>
      <div className="mt-4 border-t border-stone-200 pt-4 dark:border-stone-700">
        <p className={`text-xs ${metaText}`}>
          Lost your phone? There are no backup codes — ask another organizer
          to reset your two-step verification from the Invitations page.
        </p>
        <div className="mt-2">
          <SignOutButton className={btnSecondary} />
        </div>
      </div>
    </div>
  );
}
