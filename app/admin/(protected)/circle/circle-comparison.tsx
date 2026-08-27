"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { btnPrimary, btnSecondary, card, errorText, heading, metaText } from "@/lib/ui";

const AIRTABLE_URL =
  "https://airtable.com/app706zGX0j3TMTVp/tblxohOAL5RQRmNaJ";

type Person = {
  full_name: string;
  email: string;
  city: string | null;
  province: string | null;
  mailing_list_consent: boolean;
  source: "online" | "paper";
  first_entered_at: string;
  draws: string[];
  entry_count: number;
  circle?: {
    first_name: string | null;
    city: string | null;
    province: string | null;
    signed_up_at: string | null;
  };
};

type CompareResult = {
  fetched_at: string;
  circle_total: number;
  entrant_total: number;
  matched: Person[];
  missing: Person[];
};

/** One section per draw; a person who entered several draws appears in each
 * (they're equally "not signed up" from every event's perspective). */
type DrawGroup = {
  title: string;
  missing: Person[];
  matched: Person[];
  latest: string;
};

function groupByDraw(data: CompareResult): DrawGroup[] {
  const titles = new Set<string>();
  for (const p of [...data.missing, ...data.matched])
    for (const t of p.draws) titles.add(t);

  const groups = [...titles].map((title) => {
    const missing = data.missing.filter((p) => p.draws.includes(title));
    const matched = data.matched.filter((p) => p.draws.includes(title));
    const latest = [...missing, ...matched]
      .map((p) => p.first_entered_at)
      .sort()
      .at(-1) as string;
    return { title, missing, matched, latest };
  });
  // Most recent event first.
  return groups.sort((a, b) => (a.latest < b.latest ? 1 : -1));
}

function StatTile({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
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

/** The block an organizer pastes/copies from when adding someone to the
 * Airtable — fields in the same shape as the Circle table. */
function detailsBlock(p: Person): string {
  return [
    `First Name: ${p.full_name.split(/\s+/)[0]}`,
    `Full name: ${p.full_name}`,
    `Email: ${p.email}`,
    `City: ${p.city ?? ""}`,
    `Province: ${p.province ?? ""}`,
    `Signed up at event: ${p.draws.join("; ")} (${new Date(p.first_entered_at).toLocaleDateString()})`,
    `Entry type: ${p.source === "paper" ? "paper sheet (signed on paper)" : "online form (e-signed)"}`,
    `Mailing list opt-in: ${p.mailing_list_consent ? "yes" : "no"}`,
  ].join("\n");
}

function PersonCard({
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
          {p.source === "paper" && (
            <span className="rounded border border-stone-300 px-1 py-0.5 font-semibold uppercase dark:border-stone-600">
              Paper
            </span>
          )}
          {[p.city, p.province].filter(Boolean).join(", ")}
          <span aria-hidden="true">{open ? "▲" : "▼"}</span>
        </span>
      </button>

      {open && (
        <div className="border-t border-stone-200 px-4 py-4 dark:border-stone-700">
          <dl className="grid grid-cols-1 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
            <div className="flex justify-between gap-3 sm:justify-start">
              <dt className={`${metaText} sm:w-32`}>Full name</dt>
              <dd className="font-medium">{p.full_name}</dd>
            </div>
            <div className="flex justify-between gap-3 sm:justify-start">
              <dt className={`${metaText} sm:w-32`}>Email</dt>
              <dd className="break-all font-medium">{p.email}</dd>
            </div>
            <div className="flex justify-between gap-3 sm:justify-start">
              <dt className={`${metaText} sm:w-32`}>City</dt>
              <dd className="font-medium">{p.city ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-3 sm:justify-start">
              <dt className={`${metaText} sm:w-32`}>Province</dt>
              <dd className="font-medium">{p.province ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-3 sm:justify-start">
              <dt className={`${metaText} sm:w-32`}>Event(s)</dt>
              <dd className="font-medium">{p.draws.join("; ")}</dd>
            </div>
            <div className="flex justify-between gap-3 sm:justify-start">
              <dt className={`${metaText} sm:w-32`}>Entered</dt>
              <dd className="font-medium">
                {new Date(p.first_entered_at).toLocaleDateString()}
                {p.source === "paper" ? " · paper sheet" : " · online"}
              </dd>
            </div>
            <div className="flex justify-between gap-3 sm:justify-start">
              <dt className={`${metaText} sm:w-32`}>Mailing list</dt>
              <dd className="font-medium">
                {p.mailing_list_consent ? "Opted in" : "No"}
              </dd>
            </div>
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

export function CircleComparison() {
  const [data, setData] = useState<CompareResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Key is `${draw title}:${email}` — the same person can appear under
  // several draws, and only the clicked card should open.
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data: result, error: fnError } = await supabase.functions.invoke(
      "circle-compare",
      { body: {} }
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
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function copy(text: string, key: string) {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  const pct =
    data && data.entrant_total > 0
      ? Math.round((data.matched.length / data.entrant_total) * 100)
      : 0;
  const groups = data ? groupByDraw(data) : [];

  return (
    <div className="mt-5">
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={load} disabled={loading} className={btnSecondary}>
          {loading ? "Comparing…" : "Refresh"}
        </button>
        {data && (
          <span className={`text-xs ${metaText}`}>
            Compared live with Airtable at{" "}
            {new Date(data.fetched_at).toLocaleString()}
          </span>
        )}
        <a
          href={AIRTABLE_URL}
          target="_blank"
          rel="noreferrer"
          className={`text-sm font-semibold text-maroon-700 underline underline-offset-2 dark:text-maroon-300`}
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
            <StatTile label="Event entrants (unique people)" value={String(data.entrant_total)} />
            <StatTile label="Already in the Circle (Airtable)" value={String(data.matched.length)} />
            <StatTile label="Not signed up yet" value={String(data.missing.length)} accent={data.missing.length > 0} />
            <StatTile label={`Signed up · Airtable holds ${data.circle_total.toLocaleString()} total`} value={`${pct}%`} />
          </div>

          {groups.length === 0 && (
            <p className="mt-8 rounded-xl border border-dashed border-stone-300 p-6 text-center text-sm text-stone-500 dark:border-stone-600 dark:text-stone-400">
              No event entries yet.
            </p>
          )}

          {groups.map((g) => (
            <section key={g.title} className="mt-8">
              <h2 className={`text-lg ${heading}`}>{g.title}</h2>
              <p className={`mt-0.5 text-sm ${metaText}`}>
                {g.missing.length + g.matched.length} entrant
                {g.missing.length + g.matched.length === 1 ? "" : "s"} ·{" "}
                {g.matched.length} in the Circle ·{" "}
                <span
                  className={
                    g.missing.length > 0
                      ? "font-semibold text-accent-text dark:text-red-400"
                      : "font-semibold text-found dark:text-green-300"
                  }
                >
                  {g.missing.length} not signed up
                </span>
              </p>

              {g.missing.length === 0 ? (
                <p className="mt-3 rounded-xl border border-dashed border-stone-300 p-4 text-center text-sm text-stone-500 dark:border-stone-600 dark:text-stone-400">
                  Everyone from this event is in the Circle. 🎉
                </p>
              ) : (
                <ul className="mt-3 list-none space-y-2">
                  {g.missing.map((p) => {
                    const key = `${g.title}:${p.email}`;
                    return (
                      <PersonCard
                        key={key}
                        p={p}
                        open={openKey === key}
                        onToggle={() => setOpenKey(openKey === key ? null : key)}
                        copied={copied}
                        onCopy={copy}
                      />
                    );
                  })}
                </ul>
              )}

              {g.matched.length > 0 && (
                <details className="mt-3">
                  <summary
                    className={`cursor-pointer text-sm font-semibold ${metaText}`}
                  >
                    Already in the Circle from this event ({g.matched.length})
                  </summary>
                  <ul className="mt-2 list-none space-y-1.5">
                    {g.matched.map((p) => (
                      <li
                        key={`${g.title}:${p.email}`}
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
              )}
            </section>
          ))}
        </>
      )}
    </div>
  );
}
