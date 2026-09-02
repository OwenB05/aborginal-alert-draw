"use client";

import Link from "next/link";
import { downloadCsv } from "@/lib/csv";
import { btnSecondary, card, errorText, heading, metaText } from "@/lib/ui";
import {
  AIRTABLE_URL,
  EXPORT_HEADER,
  StatTile,
  exportRow,
  useCircleCompare,
} from "./circle-shared";

export type DrawSummary = {
  id: string;
  title: string;
  slug: string;
  status: "open" | "closed";
  created_at: string;
};

export function CircleIndex({ draws }: { draws: DrawSummary[] }) {
  const { data, loading, error, reload } = useCircleCompare();

  const pct =
    data && data.entrant_total > 0
      ? Math.round((data.matched.length / data.entrant_total) * 100)
      : 0;

  function countsFor(drawId: string) {
    if (!data) return null;
    const inDraw = (p: { draws: { id: string }[] }) =>
      p.draws.some((d) => d.id === drawId);
    const missing = data.missing.filter(inDraw).length;
    const matched = data.matched.filter(inDraw).length;
    return { missing, matched, total: missing + matched };
  }

  function exportAllMissing() {
    if (!data) return;
    downloadCsv(
      `compassion-circle-not-signed-up-all-events.csv`,
      EXPORT_HEADER,
      data.missing.map(exportRow)
    );
  }

  return (
    <div className="mt-5">
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={reload} disabled={loading} className={btnSecondary}>
          {loading ? "Comparing…" : "Refresh"}
        </button>
        {data && (
          <>
            <button
              onClick={exportAllMissing}
              disabled={data.missing.length === 0}
              className={btnSecondary}
            >
              Export all not signed up (CSV)
            </button>
            <span className={`text-xs ${metaText}`}>
              Compared live with Airtable at{" "}
              {new Date(data.fetched_at).toLocaleString()}
            </span>
          </>
        )}
        <a
          href={AIRTABLE_URL}
          target="_blank"
          rel="noreferrer"
          className="text-sm font-semibold text-maroon-700 underline underline-offset-2 dark:text-maroon-300"
        >
          Open the Airtable ↗
        </a>
      </div>

      {error && (
        <p role="alert" className={`mt-4 ${errorText}`}>
          {error}
        </p>
      )}

      {data && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Event entrants (unique people)" value={String(data.entrant_total)} />
          <StatTile label="Already in the Circle (Airtable)" value={String(data.matched.length)} />
          <StatTile
            label="Not signed up yet"
            value={String(data.missing.length)}
            accent={data.missing.length > 0}
          />
          <StatTile
            label={`Signed up · Airtable holds ${data.circle_total.toLocaleString()} total`}
            value={`${pct}%`}
          />
        </div>
      )}

      <h2 className={`mt-8 text-lg ${heading}`}>Events</h2>
      {draws.length === 0 ? (
        <p className="mt-3 rounded-xl border border-dashed border-stone-300 p-6 text-center text-sm text-stone-500 dark:border-stone-600 dark:text-stone-400">
          No draws yet.
        </p>
      ) : (
        <ul className="mt-3 list-none space-y-2">
          {draws.map((d) => {
            const c = countsFor(d.id);
            return (
              <li key={d.id}>
                <Link
                  href={`/admin/circle/${d.id}`}
                  className={`${card} flex flex-wrap items-center justify-between gap-3 px-4 py-3 hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon-700 dark:hover:bg-stone-800`}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{d.title}</span>
                    <span className={`text-xs ${metaText}`}>
                      {new Date(d.created_at).toLocaleDateString()} ·{" "}
                      {d.status === "open" ? "open" : "closed"}
                    </span>
                  </span>
                  <span className="flex items-center gap-3 text-sm">
                    {loading && !data ? (
                      <span className={metaText}>…</span>
                    ) : c && c.total > 0 ? (
                      <>
                        <span className={metaText}>{c.total} entrant{c.total === 1 ? "" : "s"}</span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            c.missing > 0
                              ? "bg-accent/10 text-accent-text dark:bg-red-400/20 dark:text-red-300"
                              : "bg-found-bg text-found dark:bg-green-400/20 dark:text-green-300"
                          }`}
                        >
                          {c.missing > 0 ? `${c.missing} not signed up` : "All signed up"}
                        </span>
                      </>
                    ) : (
                      <span className={metaText}>No entrants yet</span>
                    )}
                    <span aria-hidden="true" className={metaText}>→</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
