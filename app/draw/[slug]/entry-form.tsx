"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CANADIAN_PROVINCES } from "@/lib/types";
import { btnPrimary, errorText, input, label } from "@/lib/ui";

export function EntryForm({ drawId, slug }: { drawId: string; slug: string }) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [signatureName, setSignatureName] = useState("");
  // CASL: both consents start unchecked; the entrant must tick them.
  const [circleConsent, setCircleConsent] = useState(false);
  const [mailingConsent, setMailingConsent] = useState(false);
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
    if (!circleConsent) {
      setError(
        "Please give permission to be added to the Compassionate Circle to enter the draw."
      );
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
      province,
      city: city.trim(),
      signature_name: signatureName.trim(),
      consent: circleConsent,
      mailing_list_consent: mailingConsent,
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="province" className={label}>
            Province / Territory
          </label>
          <select
            id="province"
            required
            value={province}
            onChange={(e) => setProvince(e.target.value)}
            className={input}
          >
            <option value="" disabled>
              Select…
            </option>
            {CANADIAN_PROVINCES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="city" className={label}>
            City / Town
          </label>
          <input
            id="city"
            type="text"
            required
            maxLength={120}
            autoComplete="address-level2"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className={input}
            placeholder="Edmonton"
          />
        </div>
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
        <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">
          By typing my name above I am signing electronically and confirm the
          information I provided is accurate.
        </p>
      </div>

      {/* Required consent — gates the Enter button. Not pre-checked (CASL). */}
      <label className="flex items-start gap-2.5 rounded-lg border border-maroon-200 bg-maroon-50 p-4 text-sm text-stone-700 dark:border-maroon-800 dark:bg-maroon-950 dark:text-stone-200">
        <input
          type="checkbox"
          checked={circleConsent}
          onChange={(e) => setCircleConsent(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-[#7a1a1a] dark:accent-[#d09c9c]"
        />
        <span>
          <span className="font-semibold">Required:</span> I give Aboriginal
          Alert permission to add me to the Compassionate Circle using the name,
          email, and location I&apos;ve provided, and I consent to my name being
          announced if I win.
        </span>
      </label>

      {/* Optional, separate opt-in. Not pre-checked (CASL). */}
      <label className="flex items-start gap-2.5 text-sm text-stone-600 dark:text-stone-300">
        <input
          type="checkbox"
          checked={mailingConsent}
          onChange={(e) => setMailingConsent(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-[#7a1a1a] dark:accent-[#d09c9c]"
        />
        <span>
          Optional: add me to the Aboriginal Alert mailing list for news and
          updates. You can unsubscribe at any time.
        </span>
      </label>

      {error && (
        <p role="alert" className={errorText}>
          {error}
        </p>
      )}

      {/* Enter stays greyed out until the required consent is given. */}
      <button
        type="submit"
        disabled={submitting || !circleConsent}
        className={`${btnPrimary} w-full py-3 text-base`}
      >
        {submitting ? "Submitting…" : "Enter the draw"}
      </button>
      {!circleConsent && (
        <p className="text-center text-xs text-stone-500 dark:text-stone-400">
          Check the required permission box above to enter.
        </p>
      )}
    </form>
  );
}
