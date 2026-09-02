"use client";

import Link from "next/link";
import { downloadCsv } from "@/lib/csv";
import { btnPrimary, btnSecondary, card, errorText, heading, metaText } from "@/lib/ui";
import {
  AIRTABLE_URL,
  EXPORT_HEADER,
  StatTile,
  exportRow,
  useCircleCompare,
  type Person,
} from "./circle-shared";

export type DrawSummary = {
  id: string;
  title: string;
  slug: string;
  status: "open" | "closed";
  created_at: string;
};

type EventReport = {
  draw: DrawSummary;
  /** Unique people who entered this draw ("signed up for the draw"). */
  entrants: number;
  /** …of whom are in the Airtable Compassion Circle list. */
  inCircle: number;
  /** …and who are not. */
  notSignedUp: number;
  pct: number | null;
};

function inDraw(p: Person, drawId: string) {
  return p.draws.some((d) => d.id === drawId);
}

export function CircleIndex({ draws }: { draws: DrawSummary[] }) {
  const { data, loading, error, reload } = useCircleCompare();

  // Per-event report: draw sign-ups / in Circle / not signed up. Counts are
  // unique people per event, matching the event pages exactly.
  const report: EventReport[] = draws.map((draw) => {
    if (!data) return { draw, entrants: 0, inCircle: 0, notSignedUp: 0, pct: null };
    const inCircle = data.matched.filter((p) => inDraw(p, draw.id)).length;
    const notSignedUp = data.missing.filter((p) => inDraw(p, draw.id)).length;
    const entrants = inCircle + notSignedUp;
    return {
      draw,
      entrants,
      inCircle,
      notSignedUp,
      pct: entrants > 0 ? Math.round((inCircle / entrants) * 100) : null,
    };
  });

  const overallPct =
    data && data.entrant_total > 0
      ? Math.round((data.matched.length / data.entrant_total) * 100)
      : 0;

  function exportReport() {
    if (!data) return;
    const rows = report.map((r) => [
      r.draw.title,
      new Date(r.draw.created_at).toLocaleDateString(),
      r.draw.status,
      r.entrants,
      r.inCircle,
      r.notSignedUp,
      r.pct === null ? "" : `${r.pct}%`,
    ]);
    // Totals are unique people across all events (someone who entered two
    // draws counts once), so they can be less than the column sums.
    rows.push([
      "All events (unique people)",
      "",
      "",
      data.entrant_total,
      data.matched.length,
      data.missing.length,
      `${overallPct}%`,
    ]);
    downloadCsv(
      `compassion-circle-report-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        "Event",
        "Created",
        "Status",
        "Signed up for the draw",
        "Signed up for Compassion Circle",
        "Did not sign up",
        "Signed-up %",
      ],
      rows
    );
  }

  function exportAllMissing() {
    if (!data) return;
    downloadCsv(
      `compassion-circle-not-signed-up-all-events.csv`,
      EXPORT_HEADER,
      data.missing.map(exportRow)
    );
  }

  const th = `px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide ${metaText}`;
  const thNum = `${th} text-right`;
  const td = "px-3 py-2.5 align-middle";
  const tdNum = `${td} text-right tabular-nums`;

  return (
    <div className="mt-5">
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={reload} disabled={loading} className={btnSecondary}>
          {loading ? "Comparing…" : "Refresh"}
        </button>
        {data && (
          <>
            <button onClick={exportReport} className={btnPrimary}>
              Export report (CSV)
            </button>
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
          <StatTile label="Signed up for a draw (unique people)" value={String(data.entrant_total)} />
          <StatTile label="Signed up for Compassion Circle" value={String(data.matched.length)} />
          <StatTile
            label="Did not sign up"
            value={String(data.missing.length)}
            accent={data.missing.length > 0}
          />
          <StatTile
            label={`Signed up · Airtable holds ${data.circle_total.toLocaleString()} total`}
            value={`${overallPct}%`}
          />
        </div>
      )}

      <h2 className={`mt-8 text-lg ${heading}`}>Report by event</h2>
      <p className={`mt-1 text-sm ${metaText}`}>
        Click an event for the names behind its numbers and per-event exports.
      </p>

      {draws.length === 0 ? (
        <p className="mt-3 rounded-xl border border-dashed border-stone-300 p-6 text-center text-sm text-stone-500 dark:border-stone-600 dark:text-stone-400">
          No draws yet.
        </p>
      ) : (
        <div className={`mt-3 overflow-x-auto ${card}`}>
          <table className="w-full min-w-[560px] text-sm">
            <thead className="border-b border-stone-200 dark:border-stone-700">
              <tr>
                <th className={th}>Event</th>
                <th className={thNum}>
                  <span className="sm:hidden">Draw</span>
                  <span className="hidden sm:inline">Signed up for the draw</span>
                </th>
                <th className={thNum}>
                  <span className="sm:hidden">Circle</span>
                  <span className="hidden sm:inline">Signed up for Compassion Circle</span>
                </th>
                <th className={thNum}>
                  <span className="sm:hidden">Not</span>
                  <span className="hidden sm:inline">Did not sign up</span>
                </th>
                <th className={thNum}>%</th>
              </tr>
            </thead>
            <tbody>
              {report.map((r) => (
                <tr
                  key={r.draw.id}
                  className="border-b border-stone-100 last:border-0 dark:border-stone-800"
                >
                  <td className={td}>
                    <Link
                      href={`/admin/circle/${r.draw.id}`}
                      className="font-semibold text-maroon-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon-700 dark:text-maroon-300"
                    >
                      {r.draw.title}
                    </Link>
                    <span className={`block text-xs ${metaText}`}>
                      {new Date(r.draw.created_at).toLocaleDateString()} ·{" "}
                      {r.draw.status}
                    </span>
                  </td>
                  {!data ? (
                    <td colSpan={4} className={`${td} text-right ${metaText}`}>
                      {loading ? "…" : "—"}
                    </td>
                  ) : (
                    <>
                      <td className={tdNum}>{r.entrants}</td>
                      <td className={`${tdNum} text-found dark:text-green-300`}>
                        {r.inCircle}
                      </td>
                      <td
                        className={`${tdNum} font-semibold ${
                          r.notSignedUp > 0
                            ? "text-accent-text dark:text-red-400"
                            : metaText
                        }`}
                      >
                        {r.notSignedUp}
                      </td>
                      <td className={`${tdNum} ${metaText}`}>
                        {r.pct === null ? "—" : `${r.pct}%`}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
            {data && (
              <tfoot className="border-t-2 border-stone-200 font-semibold dark:border-stone-700">
                <tr>
                  <td className={td}>
                    All events
                    <span className={`block text-xs font-normal ${metaText}`}>
                      unique people — someone at two events counts once
                    </span>
                  </td>
                  <td className={tdNum}>{data.entrant_total}</td>
                  <td className={`${tdNum} text-found dark:text-green-300`}>
                    {data.matched.length}
                  </td>
                  <td
                    className={`${tdNum} ${
                      data.missing.length > 0
                        ? "text-accent-text dark:text-red-400"
                        : metaText
                    }`}
                  >
                    {data.missing.length}
                  </td>
                  <td className={`${tdNum} ${metaText}`}>{overallPct}%</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  );
}
