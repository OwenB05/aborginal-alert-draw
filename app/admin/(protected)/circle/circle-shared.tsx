"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { btnPrimary, btnSecondary, card, metaText } from "@/lib/ui";

export const AIRTABLE_URL =
  "https://airtable.com/app706zGX0j3TMTVp/tblxohOAL5RQRmNaJ";

export type DrawRef = { id: string; title: string };

export type Person = {
  full_name: string;
  email: string;
  city: string | null;
  province: string | null;
  mailing_list_consent: boolean;
  source: "online" | "paper" | "scan";
  first_entered_at: string;
  draws: DrawRef[];
  entry_count: number;
  circle?: {
    first_name: string | null;
    city: string | null;
    province: string | null;
    signed_up_at: string | null;
  };
};

export type CompareResult = {
  fetched_at: string;
  draw_id: string | null;
  circle_total: number;
  entrant_total: number;
  matched: Person[];
  missing: Person[];
};

/** Runs the circle-compare Edge Function (all draws, or one) on mount and
 * on demand. */
export function useCircleCompare(drawId?: string) {
  const [data, setData] = useState<CompareResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data: result, error: fnError } = await supabase.functions.invoke(
      "circle-compare",
      { body: drawId ? { draw_id: drawId } : {} }
    );
    setLoading(false);
    if (fnError || !result || result.error) {
      setError(
        (result?.error as string) ??
          "Couldn't run the comparison. Try refreshing — if it keeps failing, the Airtable connection may need attention."
      );
      return;
    }
    setData(result as CompareResult);
  }, [drawId]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}

export function sourceLabel(source: Person["source"]): string {
  return source === "paper"
    ? "paper sheet"
    : source === "scan"
      ? "scanned sheet"
      : "online";
}

/** The block an organizer pastes/copies from when adding someone to the
 * Airtable — fields in the same shape as the Circle table. */
export function detailsBlock(p: Person): string {
  return [
    `First Name: ${p.full_name.split(/\s+/)[0]}`,
    `Full name: ${p.full_name}`,
    `Email: ${p.email}`,
    `City: ${p.city ?? ""}`,
    `Province: ${p.province ?? ""}`,
    `Signed up at event: ${p.draws.map((d) => d.title).join("; ")} (${new Date(p.first_entered_at).toLocaleDateString()})`,
    `Entry type: ${
      p.source === "online" ? "online form (e-signed)" : `${sourceLabel(p.source)} (signed on paper)`
    }`,
    `Mailing list opt-in: ${p.mailing_list_consent ? "yes" : "no"}`,
  ].join("\n");
}

/** CSV columns shared by both exports; Airtable's own field names first so
 * the file can be pasted/imported straight into the Circle table. */
export const EXPORT_HEADER = [
  "First Name",
  "Full name",
  "Email",
  "City",
  "Province",
  "Event(s)",
  "First entered",
  "Entry type",
  "Mailing list opt-in",
];

export function exportRow(p: Person): string[] {
  return [
    p.full_name.split(/\s+/)[0],
    p.full_name,
    p.email,
    p.city ?? "",
    p.province ?? "",
    p.draws.map((d) => d.title).join("; "),
    new Date(p.first_entered_at).toLocaleDateString(),
    sourceLabel(p.source),
    p.mailing_list_consent ? "yes" : "no",
  ];
}

export function StatTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className={`${card} p-4`}>
      <p
        className={`text-2xl font-bold ${
          accent
            ? "text-accent-text dark:text-red-400"
            : "text-maroon-900 dark:text-maroon-100"
        }`}
      >
        {value}
      </p>
      <p className={`mt-0.5 text-xs ${metaText}`}>{label}</p>
    </div>
  );
}

export function PersonCard({
  p,
  open,
  onToggle,
  copied,
  onCopy,
}: {
  p: Person;
  open: boolean;
  onToggle: () => void;
  copied: string | null;
  onCopy: (text: string, key: string) => void;
}) {
  return (
    <li className={`${card} overflow-hidden`}>
      <button
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full flex-wrap items-center justify-between gap-2 px-4 py-3 text-left hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-maroon-700 dark:hover:bg-stone-800"
      >
        <span className="min-w-0">
          <span className="font-semibold">{p.full_name}</span>
          <span className={`ml-2 text-sm ${metaText}`}>{p.email}</span>
        </span>
        <span className={`flex items-center gap-2 text-xs ${metaText}`}>
          {p.source !== "online" && (
            <span className="rounded border border-stone-300 px-1 py-0.5 font-semibold uppercase dark:border-stone-600">
              {p.source === "scan" ? "Scanned" : "Paper"}
            </span>
          )}
          {[p.city, p.province].filter(Boolean).join(", ")}
          <span aria-hidden="true">{open ? "▲" : "▼"}</span>
        </span>
      </button>

      {open && (
        <div className="border-t border-stone-200 px-4 py-4 dark:border-stone-700">
          <dl className="grid grid-cols-1 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
            {(
              [
                ["Full name", p.full_name],
                ["Email", p.email],
                ["City", p.city ?? "—"],
                ["Province", p.province ?? "—"],
                ["Event(s)", p.draws.map((d) => d.title).join("; ")],
                [
                  "Entered",
                  `${new Date(p.first_entered_at).toLocaleDateString()} · ${sourceLabel(p.source)}`,
                ],
                ["Mailing list", p.mailing_list_consent ? "Opted in" : "No"],
              ] as [string, string][]
            ).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 sm:justify-start">
                <dt className={`${metaText} sm:w-32`}>{k}</dt>
                <dd className="break-all font-medium">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => onCopy(detailsBlock(p), p.email)}
              className={btnPrimary}
            >
              {copied === p.email ? "Copied!" : "Copy details"}
            </button>
            <button
              onClick={() => onCopy(p.email, `${p.email}-mail`)}
              className={btnSecondary}
            >
              {copied === `${p.email}-mail` ? "Copied!" : "Copy email"}
            </button>
            <a
              href={AIRTABLE_URL}
              target="_blank"
              rel="noreferrer"
              className={`${btnSecondary} text-center`}
            >
              Add in Airtable ↗
            </a>
          </div>
        </div>
      )}
    </li>
  );
}
