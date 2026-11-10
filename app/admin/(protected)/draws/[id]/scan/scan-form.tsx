"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CANADIAN_PROVINCES } from "@/lib/types";
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

// Photograph a signed paper sheet / stack of cards, let /api/scan-sheet read
// it (Vercel AI Gateway), then review and correct every row before anything is
// written. Rows are inserted with source='scan' so AI-read entries stay
// distinguishable from hand-typed ones. Nothing is auto-saved: handwriting
// recognition is a first draft and the organizer is the check on it.

/** Long edge sent to the model. The model downscales past ~1568px anyway, so
 * anything larger is wasted upload on a phone tether. */
const MAX_EDGE = 1600;
const MAX_PHOTOS = 6;
/** Vercel caps a request at 4.5 MB. Stay under the route's own 4.2M-char
 * limit with room to spare; photos are re-encoded smaller until they fit. */
const UPLOAD_BUDGET = 3_900_000;
const ENCODINGS: { edge: number; quality: number }[] = [
  { edge: MAX_EDGE, quality: 0.85 },
  { edge: MAX_EDGE, quality: 0.72 },
  { edge: 1400, quality: 0.65 },
  { edge: 1200, quality: 0.6 },
];

type ScannedRow = {
  full_name: string;
  email: string;
  city: string;
  province: string;
  mailing_list_consent: boolean;
  signed: boolean;
  uncertain_fields: string[];
  notes: string;
};

type ReviewRow = ScannedRow & { include: boolean; key: number };

type Outcome = {
  added: number;
  duplicates: string[];
  failures: { name: string; reason: string }[];
};

async function fileToBase64Jpeg(
  file: File,
  maxEdge: number,
  quality: number
): Promise<{ media_type: string; data: string }> {
  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
  });
  const scale = Math.min(
    1,
    maxEdge / Math.max(bitmap.width, bitmap.height)
  );
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process that photo.");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  return { media_type: "image/jpeg", data: dataUrl.split(",")[1] ?? "" };
}

/** Encodes every photo, stepping down size/quality until the whole batch
 * fits one upload. Null if even the smallest setting is too big. */
async function encodeWithinBudget(
  files: File[]
): Promise<{ media_type: string; data: string }[] | null> {
  for (const { edge, quality } of ENCODINGS) {
    const images = await Promise.all(
      files.map((f) => fileToBase64Jpeg(f, edge, quality))
    );
    const total = images.reduce((n, img) => n + img.data.length, 0);
    if (total <= UPLOAD_BUDGET) return images;
  }
  return null;
}

function isFlagged(row: ReviewRow, field: string): boolean {
  return row.uncertain_fields.includes(field);
}

/** Amber ring on fields the model wasn't sure about, so the eye goes there. */
function fieldClass(row: ReviewRow, field: string): string {
  return isFlagged(row, field)
    ? `${input} ring-2 ring-amber-400 dark:ring-amber-500`
    : input;
}

export function ScanSheetForm({ drawId }: { drawId: string }) {
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<ReviewRow[] | null>(null);
  const [sheetNotes, setSheetNotes] = useState("");
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  function pickPhotos(files: FileList | null) {
    if (!files) return;
    const chosen = Array.from(files).slice(0, MAX_PHOTOS);
    setPhotos(chosen);
    setPreviews(chosen.map((f) => URL.createObjectURL(f)));
    setRows(null);
    setOutcome(null);
    setError(null);
  }

  async function scan() {
    setError(null);
    setOutcome(null);
    setScanning(true);
    try {
      const images = await encodeWithinBudget(photos);
      if (!images) {
        setError(
          "Those photos are too large to send together. Scan fewer at a time."
        );
        return;
      }
      let res: Response;
      try {
        res = await fetch("/api/scan-sheet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ images }),
        });
      } catch {
        setError(
          "Couldn't reach the scanner. Check your connection and try again."
        );
        return;
      }
      // The route answers JSON; the platform's own errors (upload too big,
      // timeout) may not be, so fall back to a plain message.
      const data = await res.json().catch(() => null);
      if (!res.ok || !data || data.error) {
        setError(
          (typeof data?.error === "string" && data.error) ||
            (res.status === 413
              ? "Those photos are too large to send together. Scan fewer at a time."
              : res.status === 504
                ? "Reading the sheet took too long. Try fewer photos at a time."
                : "Couldn't read that photo. Try again with a clearer, straight-on shot.")
        );
        return;
      }
      const scanned = (data.rows ?? []) as ScannedRow[];
      setSheetNotes((data.sheet_notes as string) ?? "");
      setRows(
        scanned.map((r, i) => ({
          ...r,
          key: i,
          // An unsigned row has no consent record — make the organizer opt in
          // deliberately rather than adding it by default.
          include: r.signed,
        }))
      );
      if (scanned.length === 0)
        setError(
          "No sign-ups were found in that photo. Make sure the filled-in rows are visible and try again."
        );
    } catch {
      setError("Couldn't process that photo on this device.");
    } finally {
      setScanning(false);
    }
  }

  function update(key: number, patch: Partial<ReviewRow>) {
    setRows((list) =>
      list?.map((r) => (r.key === key ? { ...r, ...patch } : r)) ?? null
    );
  }

  const selected = rows?.filter((r) => r.include) ?? [];
  const incomplete = selected.filter(
    (r) => !r.full_name.trim() || !r.email.trim() || !r.city.trim() || !r.province
  );

  async function addEntries() {
    setError(null);
    if (incomplete.length > 0) {
      setError(
        `${incomplete.length} selected row${incomplete.length === 1 ? "" : "s"} still ${
          incomplete.length === 1 ? "needs" : "need"
        } a name, email, city, and province. Fill those in or untick the row.`
      );
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const result: Outcome = { added: 0, duplicates: [], failures: [] };

    for (const r of selected) {
      const name = r.full_name.trim();
      const { error: insertError } = await supabase.from("entries").insert({
        draw_id: drawId,
        full_name: name,
        email: r.email.trim(),
        province: r.province,
        city: r.city.trim(),
        // The signature lives on the kept paper sheet; we record the name it
        // was signed under, same as hand transcription.
        signature_name: name,
        consent: true,
        mailing_list_consent: r.mailing_list_consent,
        source: "scan",
      });

      if (!insertError) {
        result.added++;
      } else if (insertError.code === "23505") {
        result.duplicates.push(name);
      } else if (insertError.code === "23514") {
        result.failures.push({
          name,
          reason: "that email doesn't look valid — check the spelling",
        });
      } else {
        result.failures.push({ name, reason: "could not be saved" });
      }
    }

    setSaving(false);
    setOutcome(result);
    // Keep only rows that still need attention on screen.
    const handled = new Set(
      selected
        .filter(
          (r) => !result.failures.some((f) => f.name === r.full_name.trim())
        )
        .map((r) => r.key)
    );
    setRows((list) => list?.filter((r) => !handled.has(r.key)) ?? null);
  }

  return (
    <>
      <section className={`mt-5 ${card} p-5`}>
        <h2 className={`text-lg ${heading}`}>1. Take or choose photos</h2>
        <p className={`mt-1 text-sm ${metaText}`}>
          Lay the sheet flat, fill the frame, and avoid shadows. Up to{" "}
          {MAX_PHOTOS} photos at once — handy for a stack of cards.
        </p>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          onChange={(e) => pickPhotos(e.target.files)}
          className="mt-3 block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-maroon-700 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-maroon-600"
        />

        {previews.length > 0 && (
          <>
            <div className="mt-3 flex flex-wrap gap-2">
              {previews.map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={src}
                  src={src}
                  alt={`Photo ${i + 1}`}
                  className="h-24 w-auto rounded-lg border border-stone-200 object-cover dark:border-stone-700"
                />
              ))}
            </div>
            <button
              onClick={scan}
              disabled={scanning}
              className={`${btnPrimary} mt-4 w-full sm:w-auto`}
            >
              {scanning
                ? "Reading the sheet…"
                : `Read ${photos.length === 1 ? "photo" : `${photos.length} photos`} with AI`}
            </button>
            {scanning && (
              <p className={`mt-2 text-xs ${metaText}`}>
                This can take up to a minute for a full sheet.
              </p>
            )}
          </>
        )}

        {error && (
          <p role="alert" className={`mt-3 ${errorText}`}>
            {error}
          </p>
        )}
      </section>

      {outcome && (
        <section
          className={`mt-5 ${card} border-found/40 p-5`}
          role="status"
        >
          <h2 className={`text-lg ${heading}`}>
            Added {outcome.added} entr{outcome.added === 1 ? "y" : "ies"}
          </h2>
          {outcome.duplicates.length > 0 && (
            <p className={`mt-1 text-sm ${metaText}`}>
              Already entered, skipped: {outcome.duplicates.join(", ")}
            </p>
          )}
          {outcome.failures.length > 0 && (
            <ul className={`mt-1 list-none text-sm ${errorText}`}>
              {outcome.failures.map((f) => (
                <li key={f.name}>
                  {f.name}: {f.reason} — still listed below.
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {rows && rows.length > 0 && (
        <section className="mt-6">
          <h2 className={`text-lg ${heading}`}>
            2. Check every row ({rows.length} found)
          </h2>
          <p className={`mt-1 text-sm ${metaText}`}>
            Fields with an{" "}
            <span className="font-semibold text-amber-600 dark:text-amber-500">
              amber outline
            </span>{" "}
            are ones the AI wasn&apos;t confident about — read those against the
            paper. Correct anything wrong, then add the rows.
          </p>
          {sheetNotes && (
            <p className="mt-2 rounded-lg border border-amber-400/50 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-950 dark:text-amber-200">
              Note about the photo: {sheetNotes}
            </p>
          )}

          <ul className="mt-3 list-none space-y-3">
            {rows.map((r) => (
              <li
                key={r.key}
                className={`${card} p-4 ${r.include ? "" : "opacity-60"}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="flex items-center gap-2 text-sm font-semibold">
                    <input
                      type="checkbox"
                      checked={r.include}
                      onChange={(e) =>
                        update(r.key, { include: e.target.checked })
                      }
                      className="h-4 w-4 accent-[#631515] dark:accent-[#cf9b9a]"
                    />
                    Add this person
                  </label>
                  {!r.signed && (
                    <span className="rounded-full border border-accent-text/40 px-2.5 py-0.5 text-xs font-semibold text-accent-text dark:border-red-400/40 dark:text-red-400">
                      No signature seen — no consent record
                    </span>
                  )}
                </div>

                {r.notes && (
                  <p className={`mt-2 text-xs ${metaText}`}>
                    AI note: {r.notes}
                  </p>
                )}

                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor={`n-${r.key}`} className={label}>
                      Full name{isFlagged(r, "full_name") ? " · check" : ""}
                    </label>
                    <input
                      id={`n-${r.key}`}
                      type="text"
                      maxLength={200}
                      value={r.full_name}
                      onChange={(e) =>
                        update(r.key, { full_name: e.target.value })
                      }
                      className={fieldClass(r, "full_name")}
                    />
                  </div>
                  <div>
                    <label htmlFor={`e-${r.key}`} className={label}>
                      Email{isFlagged(r, "email") ? " · check" : ""}
                    </label>
                    <input
                      id={`e-${r.key}`}
                      type="email"
                      maxLength={320}
                      value={r.email}
                      onChange={(e) => update(r.key, { email: e.target.value })}
                      className={fieldClass(r, "email")}
                    />
                  </div>
                  <div>
                    <label htmlFor={`c-${r.key}`} className={label}>
                      City / Town{isFlagged(r, "city") ? " · check" : ""}
                    </label>
                    <input
                      id={`c-${r.key}`}
                      type="text"
                      maxLength={120}
                      value={r.city}
                      onChange={(e) => update(r.key, { city: e.target.value })}
                      className={fieldClass(r, "city")}
                    />
                  </div>
                  <div>
                    <label htmlFor={`p-${r.key}`} className={label}>
                      Province{isFlagged(r, "province") ? " · check" : ""}
                    </label>
                    <select
                      id={`p-${r.key}`}
                      value={r.province}
                      onChange={(e) =>
                        update(r.key, { province: e.target.value })
                      }
                      className={fieldClass(r, "province")}
                    >
                      <option value="">Select…</option>
                      {CANADIAN_PROVINCES.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <label
                  className={`mt-3 flex items-center gap-2 text-sm ${
                    isFlagged(r, "mailing_list_consent")
                      ? "rounded-lg ring-2 ring-amber-400 dark:ring-amber-500"
                      : ""
                  } px-1 py-0.5 text-stone-700 dark:text-stone-300`}
                >
                  <input
                    type="checkbox"
                    checked={r.mailing_list_consent}
                    onChange={(e) =>
                      update(r.key, { mailing_list_consent: e.target.checked })
                    }
                    className="h-4 w-4 accent-[#631515] dark:accent-[#cf9b9a]"
                  />
                  Mailing-list box ticked on the sheet
                  {isFlagged(r, "mailing_list_consent") ? " · check" : ""}
                </label>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              onClick={addEntries}
              disabled={saving || selected.length === 0}
              className={btnPrimary}
            >
              {saving
                ? "Adding…"
                : `Add ${selected.length} entr${selected.length === 1 ? "y" : "ies"}`}
            </button>
            <button
              onClick={() => {
                setRows(null);
                setPhotos([]);
                setPreviews([]);
                setSheetNotes("");
              }}
              className={btnSecondary}
            >
              Discard and start over
            </button>
          </div>
        </section>
      )}
    </>
  );
}
