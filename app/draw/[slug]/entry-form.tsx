"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { btnPrimary, errorText, input, label } from "@/lib/ui";

export function EntryForm({ drawId, slug }: { drawId: string; slug: string }) {
  const router = useRouter();
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
    <form
      onSubmit={handleSubmit}
      className="mt-6 space-y-4 border-t border-stone-200 pt-5 dark:border-stone-700"
    >
      <h2 className="text-lg font-bold text-maroon-900 dark:text-maroon-100">
        Enter this draw
      </h2>

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
          One entry per person. We&apos;ll use this to contact you if you win.
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
            electronically. I confirm the information I provided is accurate,
            I agree to be contacted about this draw, and I consent to my name
            being announced if I win.
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
  );
}
