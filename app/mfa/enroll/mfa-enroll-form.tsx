"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { normalizeTotpCode } from "@/lib/mfa-policy";
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

type Enrolment = { factorId: string; qr: string; secret: string };

export function MfaEnrollForm() {
  const router = useRouter();
  const [enrolment, setEnrolment] = useState<Enrolment | null>(null);
  const [code, setCode] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  // React StrictMode double-fires effects in dev; without this guard two
  // concurrent enrolments collide on the friendly name.
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    (async () => {
      const supabase = createClient();

      // listFactors().totp holds only VERIFIED factors — an abandoned
      // enrolment shows up in .all, so clean up from there or every retry
      // collides on the friendly name.
      const { data: existing } = await supabase.auth.mfa.listFactors();
      for (const f of existing?.all ?? []) {
        if (f.status !== "verified") {
          await supabase.auth.mfa.unenroll({ factorId: f.id });
        }
      }

      const enroll = () =>
        supabase.auth.mfa.enroll({
          factorType: "totp",
          friendlyName: "Authenticator app",
        });

      let { data, error: enrollError } = await enroll();
      if (enrollError && /already exists/i.test(enrollError.message)) {
        // Lost a race with a duplicate mount — clean once more and retry.
        const { data: again } = await supabase.auth.mfa.listFactors();
        for (const f of again?.all ?? []) {
          if (f.status !== "verified")
            await supabase.auth.mfa.unenroll({ factorId: f.id });
        }
        ({ data, error: enrollError } = await enroll());
      }

      if (enrollError || !data) {
        setError(
          /not enabled|disabled/i.test(enrollError?.message ?? "")
            ? "Two-step verification isn't switched on for this site yet. Ask Owen to enable TOTP in Supabase."
            : "Couldn't start setup. Reload the page to try again."
        );
        return;
      }
      setEnrolment({
        factorId: data.id,
        qr: data.totp.qr_code,
        secret: data.totp.secret,
      });
    })();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!enrolment) return;

    const clean = normalizeTotpCode(code);
    if (!clean) {
      setError("Enter the 6-digit code shown in your app.");
      return;
    }

    setSubmitting(true);
    const supabase = createClient();
    const { data: challenge, error: challengeError } =
      await supabase.auth.mfa.challenge({ factorId: enrolment.factorId });
    if (challengeError || !challenge) {
      setSubmitting(false);
      setError("Couldn't confirm the code. Please try again.");
      return;
    }
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: enrolment.factorId,
      challengeId: challenge.id,
      code: clean,
    });
    setSubmitting(false);

    if (verifyError) {
      setError("That code didn't work. Wait for the next one and try again.");
      setCode("");
      return;
    }

    // Verifying also steps this session up to aal2.
    router.push("/admin");
    router.refresh();
  }

  async function copySecret() {
    if (!enrolment) return;
    await navigator.clipboard.writeText(enrolment.secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className={`mx-auto mt-12 max-w-md ${card} p-6`}>
      <h1 className={`text-2xl ${heading}`}>Set up two-step verification</h1>
      <p className={`mt-1 text-sm ${metaText}`}>
        Two-step verification means a stolen password isn&apos;t enough to
        reach entrant information. You&apos;ll need a free authenticator app
        (Google Authenticator, Microsoft Authenticator, 1Password, Authy…).
      </p>

      {!enrolment && !error && (
        <p className={`mt-6 text-sm ${metaText}`}>Preparing your setup code…</p>
      )}

      {error && (
        <p role="alert" className={`mt-4 ${errorText}`}>
          {error}
        </p>
      )}

      {enrolment && (
        <>
          <ol className={`mt-5 list-decimal space-y-1 pl-5 text-sm ${metaText}`}>
            <li>Open your authenticator app and add a new account.</li>
            <li>Scan this code (or type the setup key instead).</li>
            <li>Enter the 6-digit code it shows.</li>
          </ol>

          <div className="mt-4 flex justify-center rounded-lg border border-stone-200 bg-white p-3 dark:border-stone-700">
            {/* Supabase returns the QR as an SVG data URI. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={enrolment.qr}
              alt="QR code for your authenticator app"
              width={200}
              height={200}
            />
          </div>

          <div className="mt-3">
            <button
              type="button"
              onClick={() => setShowSecret((v) => !v)}
              className="text-xs font-semibold text-maroon-700 underline underline-offset-2 dark:text-maroon-300"
            >
              {showSecret
                ? "Hide the setup key"
                : "Can't scan? Type the setup key instead"}
            </button>
            {showSecret && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <code className="min-w-0 flex-1 break-all rounded-lg bg-stone-50 px-2 py-1.5 text-xs dark:bg-stone-800">
                  {enrolment.secret}
                </code>
                <button
                  type="button"
                  onClick={copySecret}
                  className={`${btnSecondary} px-3 py-1.5`}
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label htmlFor="totp" className={label}>
                6-digit code from the app
              </label>
              <input
                id="totp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={7}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className={`${input} text-center text-2xl tracking-[0.4em]`}
                placeholder="000000"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className={`${btnPrimary} w-full py-2.5`}
            >
              {submitting ? "Confirming…" : "Turn on two-step verification"}
            </button>
          </form>
        </>
      )}

      <div className="mt-4 border-t border-stone-200 pt-4 dark:border-stone-700">
        <p className={`text-xs ${metaText}`}>
          Keep the app on a phone you&apos;ll have with you — there are no
          backup codes. If you lose it, another organizer can reset your
          two-step verification.
        </p>
        <div className="mt-2">
          <SignOutButton className={btnSecondary} />
        </div>
      </div>
    </div>
  );
}
