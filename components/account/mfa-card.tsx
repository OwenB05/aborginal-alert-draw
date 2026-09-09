"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { btnPrimary, btnSecondary, errorText, heading, metaText } from "@/lib/ui";

/** The Two-step verification card on /account. Status is read on the server
 * and passed in; removal happens client-side against the caller's own
 * factor (Supabase requires a stepped-up session to unenroll). */
export function MfaCard({
  enrolled,
  factorId,
  required,
}: {
  enrolled: boolean;
  factorId: string | null;
  required: boolean;
}) {
  const router = useRouter();
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    if (!factorId) return;
    if (
      !confirm(
        "Turn off two-step verification for your account? You'll only need your password to sign in."
      )
    )
      return;
    setError(null);
    setWorking(true);
    const supabase = createClient();
    const { error: unenrollError } = await supabase.auth.mfa.unenroll({
      factorId,
    });
    setWorking(false);
    if (unenrollError) {
      setError("Couldn't turn it off. Please try again.");
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className={`text-lg ${heading}`}>Two-step verification</h2>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            enrolled
              ? "bg-found-bg text-found dark:bg-green-400/20 dark:text-green-300"
              : "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300"
          }`}
        >
          {enrolled ? "On" : "Off"}
        </span>
      </div>

      <p className={`mt-1 text-sm ${metaText}`}>
        {enrolled
          ? "You enter a 6-digit code from your authenticator app once per sign-in. There are no backup codes — if you lose your phone, another organizer can reset this for you from the Invitations page."
          : "Add a 6-digit code from an authenticator app to your sign-in, so a stolen password isn't enough to reach entrant information."}
      </p>

      {error && (
        <p role="alert" className={`mt-2 ${errorText}`}>
          {error}
        </p>
      )}

      <div className="mt-3">
        {enrolled ? (
          required ? (
            <p className={`text-xs ${metaText}`}>
              Two-step verification is required for organizers, so it can&apos;t
              be turned off.
            </p>
          ) : (
            <button
              onClick={remove}
              disabled={working}
              className={btnSecondary}
            >
              {working ? "Removing…" : "Remove authenticator"}
            </button>
          )
        ) : (
          <Link href="/mfa/enroll" className={btnPrimary}>
            Set up two-step verification
          </Link>
        )}
      </div>
    </div>
  );
}
