"use client";

import { useState } from "react";
import { downloadCsv } from "@/lib/csv";
import { btnPrimary, btnSecondary, errorText, heading, metaText } from "@/lib/ui";
import {
  AIRTABLE_URL,
  EXPORT_HEADER,
  PersonCard,
  StatTile,
  exportRow,
  useCircleCompare,
} from "../circle-shared";

export function CircleEvent({
  draw,
}: {
  draw: { id: string; title: string; slug: string };
}) {
  const { data, loading, error, reload } = useCircleCompare(draw.id);
  const [openEmail, setOpenEmail] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(text: string, key: string) {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  const pct =
    data && data.entrant_total > 0
      ? Math.round((data.matched.length / data.entrant_total) * 100)
      : 0;

  function exportMissing() {
    if (!data) return;
    downloadCsv(
      `${draw.slug}-not-signed-up.csv`,
      EXPORT_HEADER,
      data.missing.map(exportRow)
    );
  }

  function exportEveryone() {
    if (!data) return;
    downloadCsv(
      `${draw.slug}-circle-comparison.csv`,
      [...EXPORT_HEADER, "In Compassion Circle", "Circle sign-up date"],
      [
        ...data.missing.map((p) => [...exportRow(p), "no", ""]),
        ...data.matched.map((p) => [
          ...exportRow(p),
          "yes",
          p.circle?.signed_up_at
            ? new Date(p.circle.signed_up_at).toLocaleDateString()
            : "",
        ]),
      ]
    );
  }

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={reload} disabled={loading} className={btnSecondary}>
          {loading ? "Comparing…" : "Refresh"}
        </button>
        {data && (
          <>
            <button
              onClick={exportMissing}
              disabled={data.missing.length === 0}
              className={btnPrimary}
            >
              Export not signed up (CSV)
            </button>
            <button onClick={exportEveryone} className={btnSecondary}>
              Export everyone with Circle status (CSV)
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

      {loading && !data && (
        <p className={`mt-6 text-sm ${metaText}`}>
          Pulling the Circle list from Airtable and comparing…
        </p>
      )}

      {data && (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="Entrants at this event" value={String(data.entrant_total)} />
            <StatTile label="Already in the Circle" value={String(data.matched.length)} />
            <StatTile
              label="Not signed up yet"
              value={String(data.missing.length)}
              accent={data.missing.length > 0}
            />
            <StatTile label="Signed up" value={`${pct}%`} />
          </div>

          <section className="mt-8">
            <h2 className={`text-lg ${heading}`}>
              Not signed up yet ({data.missing.length})
            </h2>
            <p className={`mt-1 text-sm ${metaText}`}>
              These people consented at this event but aren&apos;t in the
              Airtable. Click a person for their details, or export the whole
              list above.
            </p>
            {data.missing.length === 0 ? (
              <p className="mt-3 rounded-xl border border-dashed border-stone-300 p-6 text-center text-sm text-stone-500 dark:border-stone-600 dark:text-stone-400">
                {data.entrant_total === 0
                  ? "No entrants at this event yet."
                  : "Everyone from this event is in the Circle. 🎉"}
              </p>
            ) : (
              <ul className="mt-3 list-none space-y-2">
                {data.missing.map((p) => (
                  <PersonCard
                    key={p.email}
                    p={p}
                    open={openEmail === p.email}
                    onToggle={() =>
                      setOpenEmail(openEmail === p.email ? null : p.email)
                    }
                    copied={copied}
                    onCopy={copy}
                  />
                ))}
              </ul>
            )}
          </section>

          {data.matched.length > 0 && (
            <section className="mt-8">
              <details>
                <summary className={`cursor-pointer text-lg ${heading}`}>
                  Already in the Circle ({data.matched.length})
                </summary>
                <ul className="mt-3 list-none space-y-1.5">
                  {data.matched.map((p) => (
                    <li
                      key={p.email}
                      className="flex flex-wrap items-baseline gap-x-2 text-sm"
                    >
                      <span aria-hidden="true" className="text-found dark:text-green-300">✓</span>
                      <span className="font-semibold">{p.full_name}</span>
                      <span className={metaText}>{p.email}</span>
                      {p.circle?.signed_up_at && (
                        <span className={`text-xs ${metaText}`}>
                          in Circle since{" "}
                          {new Date(p.circle.signed_up_at).toLocaleDateString()}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </details>
            </section>
          )}
        </>
      )}
    </div>
  );
}
