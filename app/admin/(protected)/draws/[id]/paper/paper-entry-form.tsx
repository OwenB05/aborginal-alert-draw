"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CANADIAN_PROVINCES } from "@/lib/types";
import { btnPrimary, card, errorText, input, label } from "@/lib/ui";

// Rapid transcription of a signed paper sign-up sheet. Optimized for working
// straight down the page: city/province are sticky between rows, Enter
// submits, and focus snaps back to the name field after every add. Rows are
// inserted with source='paper'; signature_name mirrors full_name because the
// real signature lives on the kept paper sheet.

type LoggedRow = {
  key: number;
  name: string;
  email: string;
  ok: boolean;
  note?: string;
};

export function PaperEntryForm({ drawId }: { drawId: string }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [mailingList, setMailingList] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [log, setLog] = useState<LoggedRow[]>([]);
  const nameRef = useRef<HTMLInputElement>(null);

  const added = log.filter((r) => r.ok).length;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!province) {
      setError("Pick the province from the sheet.");
      return;
    }

    setSubmitting(true);
    const supabase = createClient();
    const name = fullName.trim();
    const mail = email.trim();
    const { error: insertError } = await supabase.from("entries").insert({
      draw_id: drawId,
      full_name: name,
      email: mail,
      province,
      city: city.trim(),
      signature_name: name,
      consent: true,
      mailing_list_consent: mailingList,
      source: "paper",
    });
    setSubmitting(false);

    if (insertError) {
      if (insertError.code === "23505") {
        // Duplicate email for this draw — log it and move on to the next row.
        setLog((l) => [
          { key: Date.now(), name, email: mail, ok: false, note: "already entered — skipped" },
          ...l,
        ]);
      } else if (insertError.code === "23514") {
        setError("That email doesn't look valid — check the handwriting.");
        return;
      } else {
        setError("Couldn't add that row. Check the fields and try again.");
        return;
      }
    } else {
      setLog((l) => [{ key: Date.now(), name, email: mail, ok: true }, ...l]);
    }

    // Next row: clear per-person fields, keep city/province (same event,
    // most entrants are local), return focus to the name field.
    setFullName("");
    setEmail("");
    setMailingList(false);
    nameRef.current?.focus();
  }

  return (
    <>
      <form onSubmit={handleSubmit} className={`mt-5 ${card} space-y-4 p-5`}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="p-name" className={label}>
              Full name
            </label>
            <input
              id="p-name"
              ref={nameRef}
              type="text"
              required
              maxLength={200}
              autoComplete="off"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={input}
              autoFocus
            />
          </div>
          <div>
            <label htmlFor="p-email" className={label}>
              Email
            </label>
            <input
              id="p-email"
              type="email"
              required
              maxLength={320}
              autoComplete="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={input}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="p-city" className={label}>
              City / Town
            </label>
            <input
              id="p-city"
              type="text"
              required
              maxLength={120}
              autoComplete="off"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className={input}
            />
          </div>
          <div>
            <label htmlFor="p-province" className={label}>
              Province / Territory
            </label>
            <select
              id="p-province"
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
        </div>

        <label className="flex items-center gap-2 text-sm text-stone-700 dark:text-stone-300">
          <input
            type="checkbox"
            checked={mailingList}
            onChange={(e) => setMailingList(e.target.checked)}
            className="h-4 w-4 accent-[#7a1a1a] dark:accent-[#d09c9c]"
          />
          &ldquo;Mail list&rdquo; box is checked on the sheet
        </label>

        {error && (
          <p role="alert" className={errorText}>
            {error}
          </p>
        )}

        <button type="submit" disabled={submitting} className={`${btnPrimary} w-full`}>
          {submitting ? "Adding…" : "Add row (Enter)"}
        </button>
      </form>

      {log.length > 0 && (
        <div className="mt-5">
          <h2 className="text-sm font-bold text-maroon-900 dark:text-maroon-100">
            This session: {added} added
          </h2>
          <ul className="mt-2 list-none space-y-1.5">
            {log.map((r) => (
              <li
                key={r.key}
                className="flex flex-wrap items-baseline gap-x-2 text-sm"
              >
                <span aria-hidden="true">{r.ok ? "✓" : "✗"}</span>
                <span className="font-semibold">{r.name}</span>
                <span className="text-stone-500 dark:text-stone-400">
                  {r.email}
                </span>
                {r.note && (
                  <span className="text-accent-text dark:text-red-400">
                    {r.note}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
