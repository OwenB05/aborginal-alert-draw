"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { COMPASSIONATE_CIRCLE_URL } from "@/lib/types";
import { btnPrimary, errorText, input, label } from "@/lib/ui";

export function EntryForm({ drawId, slug }: { drawId: string; slug: string }) {
  const router = useRouter();
  const [signedUp, setSignedUp] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [signatureName, setSignatureName] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (signatureName.trim().toLowerCase() !== fullName.trim().toLowerCase()) {
      setError(
        "Your signature must match your full name exactly — please type your full legal name in both fields."
      );
      return;
    }
    if (!consent) {
      setError("Please check the consent box to enter the draw.");
      return;
    }

    setSubmitting(true);
    const supabase = createClient();
    // Insert WITHOUT .select(): the anon role intentionally has no read
    // access to entries, so asking for the row back would be rejected.
    const { error: insertError } = await supabase.from("entries").insert({
      draw_id: drawId,
      full_name: fullName.trim(),
      email: email.trim(),
      signature_name: signatureName.trim(),
      consent,
    });
    setSubmitting(false);

    if (insertError) {
      if (insertError.code === "23505") {
        setError(
          "You've already entered this draw with that email address. Good luck!"
        );
      } else if (insertError.code === "42501") {
        setError(
          "This draw is no longer accepting entries — it may have just closed."
        );
      } else {
        setError(
          "Something went wrong submitting your entry. Please try again."
        );
      }
      return;
    }

    router.push(`/draw/${slug}/entered`);
  }

  return (
    <div className="mt-6 border-t border-stone-200 pt-5 dark:border-stone-700">
      <h2 className="text-lg font-bold text-maroon-900 dark:text-maroon-100">
        Enter this draw
      </h2>

      {/* Step 1 — required Compassionate Circle sign-up gate. The form stays
          locked until the entrant clicks through (opens in a new tab so they
          don't lose this page); honor system after that. */}
      {!signedUp ? (
        <div className="mt-4 rounded-lg border border-maroon-200 bg-maroon-50 p-5 text-center dark:border-maroon-800 dark:bg-maroon-950">
          <p className="text-sm font-semibold text-maroon-900 dark:text-maroon-100">
            First, join the Compassionate Circle
          </p>
          <p className="mt-2 text-sm text-stone-700 dark:text-stone-300">
            Everyone entering must sign up for Aboriginal Alert&apos;s
            Compassionate Circle. It opens in a new tab — sign up there, then
            come back to this page to finish your entry.
          </p>
          <a
            href={COMPASSIONATE_CIRCLE_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setSignedUp(true)}
            className={`${btnPrimary} mt-4 block w-full py-4 text-base`}
          >
            Sign up for the Compassionate Circle ↗
          </a>
          <p className="mt-3 text-xs text-stone-500 dark:text-stone-400">
            Already a member? Tapping the button unlocks your entry form.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <p className="rounded-lg border border-found/40 bg-found-bg px-3 py-2 text-sm text-found dark:border-green-400/40 dark:bg-green-400/20 dark:text-green-300">
            Thanks for joining the Compassionate Circle! Complete the form below
            to enter.{" "}
            <a
              href={COMPASSIONATE_CIRCLE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Open sign-up again ↗
            </a>
          </p>

          <div>
            <label htmlFor="full-name" className={label}>
              Full name
            </label>
            <input
              id="full-name"
              type="text"
              required
              maxLength={200}
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={input}
              placeholder="Jane Cardinal"
            />
          </div>

          <div>
            <label htmlFor="email" className={label}>
              Email address
            </label>
            <input
              id="email"
              type="email"
              required
              maxLength={320}
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={input}
              placeholder="jane@example.com"
            />
            <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
              One entry per person. We&apos;ll use this to contact you if you
              win.
            </p>
          </div>

          <div className="rounded-lg border border-stone-200 bg-stone-50 p-4 dark:border-stone-700 dark:bg-stone-800">
            <label htmlFor="signature" className={label}>
              Electronic signature
            </label>
            <input
              id="signature"
              type="text"
              required
              maxLength={200}
              value={signatureName}
              onChange={(e) => setSignatureName(e.target.value)}
              className={`${input} font-serif italic`}
              placeholder="Type your full legal name to sign"
            />
            <label className="mt-3 flex items-start gap-2.5 text-xs text-stone-600 dark:text-stone-300">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-[#7a1a1a] dark:accent-[#d09c9c]"
              />
              <span>
                By typing my name above and checking this box, I am signing
                electronically. I confirm the information I provided is
                accurate, I have joined the Compassionate Circle, I agree to be
                contacted about this draw, and I consent to my name being
                announced if I win.
              </span>
            </label>
          </div>

          {error && (
            <p role="alert" className={errorText}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className={`${btnPrimary} w-full py-3 text-base`}
          >
            {submitting ? "Submitting…" : "Enter the draw"}
          </button>
        </form>
      )}
    </div>
  );
}
