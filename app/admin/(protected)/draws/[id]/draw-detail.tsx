"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { QrCode } from "@/components/admin/qr-code";
import { DeleteDrawButton } from "@/components/admin/delete-draw-button";
import { StatusBadge } from "@/components/status-badge";
import type { Draw, Entry, WinnerLogEntry, WinnerResult } from "@/lib/types";
import {
  btnPrimary,
  btnSecondary,
  card,
  errorText,
  heading,
  link,
  metaText,
} from "@/lib/ui";

export function DrawDetail({
  initialDraw,
  initialEntries,
  initialWinnerLog,
}: {
  initialDraw: Draw;
  initialEntries: Entry[];
  initialWinnerLog: WinnerLogEntry[];
}) {
  const [draw, setDraw] = useState(initialDraw);
  const [entries, setEntries] = useState(initialEntries);
  const [winnerLog, setWinnerLog] = useState(initialWinnerLog);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [entryUrl, setEntryUrl] = useState("");

  const drawPath = `/draw/${draw.slug}`;

  // A closed draw is a finalized historical record: read-only until an
  // organizer explicitly reopens it to make corrections or re-draw.
  const locked = draw.status === "closed";

  useEffect(() => {
    setEntryUrl(`${window.location.origin}${drawPath}`);
  }, [drawPath]);

  const refreshEntries = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("entries")
      .select("*")
      .eq("draw_id", draw.id)
      .order("created_at", { ascending: true })
      .returns<Entry[]>();
    if (data) setEntries(data);
  }, [draw.id]);

  // Keep the entry list fresh while the draw is open (people are scanning
  // the QR at the event in real time). Closed draws are static history.
  useEffect(() => {
    if (draw.status !== "open") return;
    const interval = setInterval(refreshEntries, 10000);
    return () => clearInterval(interval);
  }, [draw.status, refreshEntries]);

  async function copyLink() {
    await navigator.clipboard.writeText(entryUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function toggleStatus() {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const nextStatus = draw.status === "open" ? "closed" : "open";
    const { error: updateError } = await supabase
      .from("draws")
      .update({ status: nextStatus })
      .eq("id", draw.id);
    setBusy(false);
    if (updateError) {
      setError("Could not update the draw status.");
      return;
    }
    setDraw({ ...draw, status: nextStatus });
  }

  async function pickWinner() {
    if (
      !confirm(
        draw.winner_entry_id
          ? "Re-draw a new winner? The previous winner stays recorded in this draw's history."
          : "Randomly draw a winner from the current entries?"
      )
    )
      return;

    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc("pick_winner", {
      p_draw_id: draw.id,
      p_close: true,
    });
    setBusy(false);

    const rows = (data ?? []) as WinnerResult[];
    if (rpcError || !rows.length) {
      setError(
        rpcError?.message.includes("no entries")
          ? "This draw has no entries yet."
          : "Could not draw a winner. Please try again."
      );
      return;
    }
    const picked = rows[0];
    const now = new Date().toISOString();
    // Prepend to the local history so the record updates without a refetch.
    setWinnerLog((log) => [
      {
        id: -Date.now(),
        entry_id: picked.entry_id,
        drawn_at: now,
        entry: { full_name: picked.full_name, email: picked.email },
      },
      ...log,
    ]);
    setDraw({
      ...draw,
      status: "closed",
      winner_entry_id: picked.entry_id,
      drawn_at: now,
    });
  }

  async function deleteEntry(entry: Entry) {
    if (!confirm(`Remove the entry for ${entry.full_name}?`)) return;
    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("entries")
      .delete()
      .eq("id", entry.id);
    if (deleteError) {
      setError("Could not remove that entry.");
      return;
    }
    setEntries(entries.filter((e) => e.id !== entry.id));
  }

  function exportCsv() {
    const header = ["Full name", "Email", "Signature", "Consent", "Entered at"];
    const rows = entries.map((e) => [
      e.full_name,
      e.email,
      e.signature_name,
      e.consent ? "yes" : "no",
      e.created_at,
    ]);
    const csv = [header, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      )
      .join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${draw.slug}-entries.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const currentWinnerEntry =
    entries.find((e) => e.id === draw.winner_entry_id) ?? null;
  const displayedWinner =
    winnerLog[0]?.entry ??
    (currentWinnerEntry
      ? {
          full_name: currentWinnerEntry.full_name,
          email: currentWinnerEntry.email,
        }
      : null);

  const smallBtn = `${btnSecondary} px-3 py-1.5`;

  return (
    <div className="mt-6">
      <Link href="/admin" className={`text-sm ${link}`}>
        ← All draws
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className={`text-2xl ${heading}`}>{draw.title}</h1>
          {draw.prize && (
            <p className={`mt-0.5 text-sm ${metaText}`}>Prize: {draw.prize}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={draw.status} />
          <button onClick={toggleStatus} disabled={busy} className={smallBtn}>
            {locked ? "Reopen draw" : "Close draw"}
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className={`mt-4 ${errorText}`}>
          {error}
        </p>
      )}

      {locked && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 dark:border-stone-700 dark:bg-stone-800">
          <p className="text-sm text-stone-600 dark:text-stone-300">
            This draw is finalized and preserved as a historical record.
            Reopen it to accept entries, remove an entry, or re-draw.
          </p>
          <DeleteDrawButton
            drawId={draw.id}
            title={draw.title}
            afterDelete="home"
            className="shrink-0 rounded-lg border border-accent-text/40 px-3 py-1.5 text-sm font-semibold text-accent-text hover:bg-accent/10 dark:border-red-400/40 dark:text-red-400 dark:hover:bg-red-400/10"
          >
            Delete draw
          </DeleteDrawButton>
        </div>
      )}

      {displayedWinner && (
        <div className="mt-6 rounded-xl border-2 border-maroon-700 bg-maroon-50 p-6 text-center dark:border-maroon-400 dark:bg-maroon-950">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500 dark:text-stone-400">
            Winner
            {draw.drawn_at
              ? ` · drawn ${new Date(draw.drawn_at).toLocaleString()}`
              : ""}
          </p>
          <p className="mt-2 text-2xl font-bold text-maroon-900 sm:text-3xl dark:text-maroon-100">
            {displayedWinner.full_name}
          </p>
          <p className={`mt-1 text-sm ${metaText}`}>{displayedWinner.email}</p>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[320px_1fr]">
        <section className={`${card} p-5`}>
          <h2 className={`text-lg ${heading}`}>Share this draw</h2>
          <div className="mt-3 flex justify-center rounded-lg border border-stone-200 bg-white p-3 dark:border-stone-700">
            <QrCode path={drawPath} size={220} />
          </div>
          <p className="mt-3 break-all rounded-lg bg-stone-50 px-2 py-1.5 text-center text-xs text-stone-500 dark:bg-stone-800 dark:text-stone-400">
            {entryUrl || drawPath}
          </p>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button onClick={copyLink} className={`${btnSecondary} text-center`}>
              {copied ? "Copied!" : "Copy link"}
            </button>
            <Link
              href={`/admin/draws/${draw.id}/print`}
              className={`${btnPrimary} text-center`}
            >
              Print poster
            </Link>
          </div>

          {/* Draw history — every winner ever picked, including re-draws. */}
          {winnerLog.length > 0 && (
            <div className="mt-5 border-t border-stone-200 pt-4 dark:border-stone-700">
              <h3 className={`text-sm ${heading}`}>Draw history</h3>
              <ul className="mt-2 list-none space-y-2">
                {winnerLog.map((w, i) => (
                  <li key={w.id} className="text-sm">
                    <span className="font-semibold">
                      {w.entry?.full_name ?? "Entry removed"}
                    </span>
                    {i === 0 ? (
                      <span className="ml-2 rounded bg-maroon-700 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                        Current
                      </span>
                    ) : (
                      <span className="ml-2 text-[11px] uppercase tracking-wide text-stone-400">
                        Superseded
                      </span>
                    )}
                    <span className={`block text-xs ${metaText}`}>
                      {new Date(w.drawn_at).toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section className={`${card} p-5`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className={`text-lg ${heading}`}>
              Entries{" "}
              <span className="ml-1 rounded-full bg-accent px-1.5 py-0.5 text-[11px] font-bold text-white">
                {entries.length > 99 ? "99+" : entries.length}
              </span>
            </h2>
            <div className="hidden gap-2 sm:flex">
              {!locked && (
                <button onClick={refreshEntries} className={smallBtn}>
                  Refresh
                </button>
              )}
              <button
                onClick={exportCsv}
                disabled={!entries.length}
                className={`${smallBtn} disabled:opacity-50`}
              >
                Export CSV
              </button>
            </div>
          </div>

          {/* Drawing is only available while the draw is open; a closed draw
              is a locked record (reopen to re-draw). */}
          {!locked && (
            <button
              onClick={pickWinner}
              disabled={busy || !entries.length}
              className={`mt-4 w-full py-3 text-base sm:w-auto sm:py-2 sm:text-sm ${btnPrimary}`}
            >
              {busy
                ? "Working…"
                : draw.winner_entry_id
                  ? "Re-draw winner"
                  : "Draw winner"}
            </button>
          )}

          {!entries.length ? (
            <p className="mt-5 rounded-lg border border-dashed border-stone-300 p-6 text-center text-sm text-stone-500 dark:border-stone-600 dark:text-stone-400">
              No entries recorded{locked ? " for this draw." : " yet. Entries appear here as people scan the QR code — this list refreshes automatically while the draw is open."}
            </p>
          ) : (
            <>
              {/* Mobile: stacked entry cards */}
              <ul className="mt-5 list-none space-y-3 sm:hidden">
                {entries.map((entry, i) => (
                  <li
                    key={entry.id}
                    className={`rounded-lg border p-3 ${
                      entry.id === draw.winner_entry_id
                        ? "border-maroon-700 bg-maroon-50 dark:border-maroon-400 dark:bg-maroon-950"
                        : "border-stone-200 dark:border-stone-700"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">
                          <span className={`mr-1.5 ${metaText}`}>{i + 1}.</span>
                          {entry.full_name}
                        </p>
                        <p className={`truncate text-sm ${metaText}`}>
                          {entry.email}
                        </p>
                        <p className={`mt-1 text-xs ${metaText}`}>
                          {new Date(entry.created_at).toLocaleString()}
                        </p>
                      </div>
                      {entry.id === draw.winner_entry_id && (
                        <span className="shrink-0 rounded bg-maroon-700 px-2 py-0.5 text-xs font-semibold text-white">
                          Winner
                        </span>
                      )}
                    </div>
                    {!locked && (
                      <div className="mt-2 flex justify-end">
                        <button
                          onClick={() => deleteEntry(entry)}
                          className="rounded px-2 py-1 text-xs font-semibold text-stone-500 hover:text-accent-text dark:text-stone-400"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
              {!locked && (
                <div className="mt-3 flex gap-2 sm:hidden">
                  <button
                    onClick={refreshEntries}
                    className={`flex-1 ${smallBtn}`}
                  >
                    Refresh
                  </button>
                  <button
                    onClick={exportCsv}
                    className={`flex-1 ${smallBtn} disabled:opacity-50`}
                  >
                    Export CSV
                  </button>
                </div>
              )}
              {locked && (
                <div className="mt-3 sm:hidden">
                  <button onClick={exportCsv} className={`w-full ${smallBtn}`}>
                    Export CSV
                  </button>
                </div>
              )}

              {/* Desktop: table */}
              <div className="mt-5 hidden overflow-x-auto sm:block">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-stone-200 text-xs uppercase tracking-wide text-stone-500 dark:border-stone-700 dark:text-stone-400">
                      <th className="py-2 pr-3 font-semibold">#</th>
                      <th className="py-2 pr-3 font-semibold">Name</th>
                      <th className="py-2 pr-3 font-semibold">Email</th>
                      <th className="py-2 pr-3 font-semibold">Entered</th>
                      <th className="py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry, i) => (
                      <tr
                        key={entry.id}
                        className={`border-b border-stone-100 dark:border-stone-800 ${
                          entry.id === draw.winner_entry_id
                            ? "bg-maroon-50 font-semibold dark:bg-maroon-950"
                            : ""
                        }`}
                      >
                        <td className={`py-2 pr-3 ${metaText}`}>{i + 1}</td>
                        <td className="py-2 pr-3">
                          {entry.full_name}
                          {entry.id === draw.winner_entry_id && (
                            <span className="ml-2 rounded bg-maroon-700 px-2 py-0.5 text-xs font-semibold text-white">
                              Winner
                            </span>
                          )}
                        </td>
                        <td className="py-2 pr-3">{entry.email}</td>
                        <td className={`py-2 pr-3 ${metaText}`}>
                          {new Date(entry.created_at).toLocaleString()}
                        </td>
                        <td className="py-2 text-right">
                          {!locked && (
                            <button
                              onClick={() => deleteEntry(entry)}
                              className="rounded px-2 py-1 text-xs font-semibold text-stone-500 hover:text-accent-text dark:text-stone-400"
                              title="Remove entry"
                            >
                              Remove
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
