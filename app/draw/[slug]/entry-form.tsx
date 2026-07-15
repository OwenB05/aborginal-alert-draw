"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const inputClass =
  "mt-1 w-full rounded border border-border bg-background px-3 py-2.5 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/30";

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

    if (
      signatureName.trim().toLowerCase() !== fullName.trim().toLowerCase()
    ) {
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
        setError("Something went wrong submitting your entry. Please try again.");
      }
      return;
    }

    router.push(`/draw/${slug}/entered`);
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      <h2 className="border-t border-border pt-4 text-lg font-semibold">
        Enter this draw
      </h2>

      <label className="block text-sm font-medium">
        Full name
        <input
          type="text"
          required
          maxLength={200}
          autoComplete="name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className={inputClass}
          placeholder="Jane Cardinal"
        />
      </label>

      <label className="block text-sm font-medium">
        Email address
        <input
          type="email"
          required
          maxLength={320}
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
          placeholder="jane@example.com"
        />
        <span className="mt-1 block text-xs font-normal text-muted">
          One entry per person. We&apos;ll use this to contact you if you win.
        </span>
      </label>

      <div className="rounded border border-border bg-background p-4">
        <label className="block text-sm font-medium">
          Electronic signature
          <input
            type="text"
            required
            maxLength={200}
            value={signatureName}
            onChange={(e) => setSignatureName(e.target.value)}
            className={`${inputClass} font-serif italic`}
            placeholder="Type your full legal name to sign"
          />
        </label>
        <label className="mt-3 flex items-start gap-2 text-xs text-muted">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-[var(--primary)]"
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
        <p
          role="alert"
          className="rounded border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded bg-primary px-4 py-3 text-base font-semibold text-primary-foreground hover:bg-primary-dark disabled:opacity-60"
      >
        {submitting ? "Submitting…" : "Enter the draw"}
      </button>
    </form>
  );
}
