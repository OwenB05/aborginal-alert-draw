"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { QrCode } from "@/components/admin/qr-code";
import type { Draw, Entry, WinnerResult } from "@/lib/types";

export function DrawDetail({
  initialDraw,
  initialEntries,
}: {
  initialDraw: Draw;
  initialEntries: Entry[];
}) {
  const [draw, setDraw] = useState(initialDraw);
  const [entries, setEntries] = useState(initialEntries);
  const [winner, setWinner] = useState<WinnerResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [entryUrl, setEntryUrl] = useState("");

  const drawPath = `/draw/${draw.slug}`;

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
  // the QR at the event in real time).
  useEffect(() => {
    if (draw.status !== "open") return;
    const interval = setInterval(refreshEntries, 10000);
    return () => clearInterval(interval);
  }, [draw.status, refreshEntries]);

  const currentWinnerEntry =
    entries.find((e) => e.id === draw.winner_entry_id) ?? null;

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
          ? "Re-draw a new winner? The previous pick stays in the audit log."
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
    setWinner(picked);
    setDraw({
      ...draw,
      status: "closed",
      winner_entry_id: picked.entry_id,
      drawn_at: new Date().toISOString(),
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

  const displayedWinner =
    winner ??
    (currentWinnerEntry
      ? {
          entry_id: currentWinnerEntry.id,
          full_name: currentWinnerEntry.full_name,
          email: currentWinnerEntry.email,
        }
      : null);

  return (
    <div>
      <Link href="/admin" className="text-sm text-muted hover:text-primary">
        ← All draws
      </Link>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{draw.title}</h1>
          {draw.prize && (
            <p className="text-sm text-muted">Prize: {draw.prize}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              draw.status === "open"
                ? "bg-success/15 text-success"
                : "bg-border text-muted"
            }`}
          >
            {draw.status === "open" ? "Open for entries" : "Closed"}
          </span>
          <button
            onClick={toggleStatus}
            disabled={busy}
            className="rounded border border-border bg-surface px-3 py-1 text-xs font-medium hover:border-primary disabled:opacity-60"
          >
            {draw.status === "open" ? "Close draw" : "Reopen draw"}
          </button>
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger"
        >
          {error}
        </p>
      )}

      {displayedWinner && (
        <div className="mt-6 rounded-lg border-2 border-accent bg-accent/10 p-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">
            Winner{draw.drawn_at ? ` · drawn ${new Date(draw.drawn_at).toLocaleString()}` : ""}
          </p>
          <p className="mt-2 text-3xl font-bold text-primary">
            🎉 {displayedWinner.full_name}
          </p>
          <p className="mt-1 text-sm text-muted">{displayedWinner.email}</p>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[320px_1fr]">
        <section className="rounded-lg border border-border bg-surface p-5 shadow-sm">
          <h2 className="font-semibold">Share this draw</h2>
          <div className="mt-3 flex justify-center rounded border border-border bg-white p-3">
            <QrCode path={drawPath} size={220} />
          </div>
          <p className="mt-3 break-all rounded bg-background px-2 py-1.5 text-center text-xs text-muted">
            {entryUrl || drawPath}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <button
              onClick={copyLink}
              className="rounded border border-border px-3 py-2 font-medium hover:border-primary"
            >
              {copied ? "Copied!" : "Copy link"}
            </button>
            <Link
              href={`/admin/draws/${draw.id}/print`}
              className="rounded bg-primary px-3 py-2 text-center font-medium text-primary-foreground hover:bg-primary-dark"
            >
              Print poster
            </Link>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-surface p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">
              Entries{" "}
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-sm text-primary">
                {entries.length}
              </span>
            </h2>
            <div className="flex gap-2 text-sm">
              <button
                onClick={refreshEntries}
                className="rounded border border-border px-3 py-1.5 hover:border-primary"
              >
                Refresh
              </button>
              <button
                onClick={exportCsv}
                disabled={!entries.length}
                className="rounded border border-border px-3 py-1.5 hover:border-primary disabled:opacity-50"
              >
                Export CSV
              </button>
              <button
                onClick={pickWinner}
                disabled={busy || !entries.length}
                className="rounded bg-primary px-4 py-1.5 font-semibold text-primary-foreground hover:bg-primary-dark disabled:opacity-60"
              >
                {busy
                  ? "Working…"
                  : draw.winner_entry_id
                    ? "Re-draw winner"
                    : "Draw winner"}
              </button>
            </div>
          </div>

          {!entries.length ? (
            <p className="mt-6 rounded border border-dashed border-border p-6 text-center text-sm text-muted">
              No entries yet. Entries appear here as people scan the QR code
              — this list refreshes automatically while the draw is open.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                    <th className="py-2 pr-3">#</th>
                    <th className="py-2 pr-3">Name</th>
                    <th className="py-2 pr-3">Email</th>
                    <th className="py-2 pr-3">Entered</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry, i) => (
                    <tr
                      key={entry.id}
                      className={`border-b border-border/60 ${
                        entry.id === draw.winner_entry_id
                          ? "bg-accent/10 font-semibold"
                          : ""
                      }`}
                    >
                      <td className="py-2 pr-3 text-muted">{i + 1}</td>
                      <td className="py-2 pr-3">
                        {entry.full_name}
                        {entry.id === draw.winner_entry_id && (
                          <span className="ml-2 rounded-full bg-accent/30 px-2 py-0.5 text-xs">
                            Winner
                          </span>
                        )}
                      </td>
                      <td className="py-2 pr-3">{entry.email}</td>
                      <td className="py-2 pr-3 text-muted">
                        {new Date(entry.created_at).toLocaleString()}
                      </td>
                      <td className="py-2 text-right">
                        <button
                          onClick={() => deleteEntry(entry)}
                          className="text-xs text-muted hover:text-danger"
                          title="Remove entry"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
