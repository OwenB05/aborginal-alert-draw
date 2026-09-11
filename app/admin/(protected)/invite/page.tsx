"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { generateToken } from "@/lib/slug";
import type { Invite } from "@/lib/types";
import { Organizers } from "./organizers";
import {
  btnPrimary,
  btnSecondary,
  card,
  errorText,
  heading,
  input,
  label,
  link,
  metaText,
} from "@/lib/ui";

function inviteUrl(token: string) {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/invite/${token}`;
}

function statusOf(inv: Invite): "accepted" | "expired" | "pending" {
  if (inv.accepted_at) return "accepted";
  if (new Date(inv.expires_at).getTime() < Date.now()) return "expired";
  return "pending";
}

type Notice = { kind: "ok" | "warn"; text: string };

/** Asks the send-invite Edge Function to email the link on an invite row.
 * Resolves to null when it went out, otherwise to the reason it didn't. */
async function emailInvite(id: string): Promise<string | null> {
  const supabase = createClient();
  const { data, error: fnError } = await supabase.functions.invoke(
    "send-invite",
    { body: { id, origin: window.location.origin } }
  );
  if (!fnError && data?.ok) return null;

  let reason = "the email service didn't respond";
  try {
    const ctx = (fnError as { context?: Response } | null)?.context;
    if (ctx) {
      const body = await ctx.json();
      if (body?.error) reason = body.error;
    } else if (data?.error) {
      reason = data.error as string;
    }
  } catch {
    // keep the generic reason
  }
  return reason;
}

export default function InvitePage() {
  const [email, setEmail] = useState("");
  const [invites, setInvites] = useState<Invite[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [emailingId, setEmailingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("invites")
      .select(
        "id, email, token, purpose, created_at, expires_at, accepted_at, emailed_at"
      )
      .order("created_at", { ascending: false })
      .returns<Invite[]>();
    if (data) setInvites(data);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // One mechanic, two labels: an "invite" grants access to someone new; a
  // "reset" lets an existing organizer choose a new password via the same
  // one-time link. The row is created first and the email is a convenience
  // on top of it — a delivery problem is reported, not treated as failure,
  // because the link is still right there to copy.
  async function createLink(purpose: "invite" | "reset") {
    setError(null);
    setNotice(null);
    setSubmitting(true);

    const to = email.trim().toLowerCase();
    const supabase = createClient();
    const { data: created, error: insertError } = await supabase
      .from("invites")
      .insert({ email: to, token: generateToken(), purpose })
      .select("id")
      .single();

    if (insertError || !created) {
      setSubmitting(false);
      setError("Could not create the link. Please try again.");
      return;
    }
    setEmail("");
    await load();

    const failure = await emailInvite(created.id);
    setSubmitting(false);
    if (failure) {
      setNotice({
        kind: "warn",
        text: `Link created for ${to}, but the email couldn't be sent (${failure}). Copy the link from the list and send it yourself.`,
      });
      return;
    }
    setNotice({
      kind: "ok",
      text:
        purpose === "reset"
          ? `Password reset link emailed to ${to}.`
          : `Invitation emailed to ${to}.`,
    });
    load();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createLink("invite");
  }

  async function resendEmail(inv: Invite) {
    setNotice(null);
    setEmailingId(inv.id);
    const failure = await emailInvite(inv.id);
    setEmailingId(null);
    if (failure) {
      setNotice({
        kind: "warn",
        text: `The email to ${inv.email} couldn't be sent (${failure}).`,
      });
      return;
    }
    setNotice({ kind: "ok", text: `Emailed ${inv.email}.` });
    load();
  }

  async function copyLink(inv: Invite) {
    await navigator.clipboard.writeText(inviteUrl(inv.token));
    setCopiedId(inv.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function revoke(inv: Invite) {
    if (!confirm(`Revoke the invite for ${inv.email}?`)) return;
    const supabase = createClient();
    const { error: delError } = await supabase
      .from("invites")
      .delete()
      .eq("id", inv.id);
    if (delError) {
      setError("Could not revoke that invite.");
      return;
    }
    setInvites((list) => list.filter((i) => i.id !== inv.id));
  }

  return (
    <div className="mt-6">
      <Link href="/admin" className={`text-sm ${link}`}>
        ← All draws
      </Link>

      <div className="mt-3 grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]">
        <section className={`${card} p-5`}>
          <h1 className={`text-xl ${heading}`}>Invite an organizer</h1>
          <p className={`mt-1 text-sm ${metaText}`}>
            Enter someone&apos;s email and they&apos;ll be sent a one-time link
            to set their password and get organizer access. The link also
            appears in the list, so you can copy and send it yourself.
          </p>
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label htmlFor="invite-email" className={label}>
                Their email
              </label>
              <input
                id="invite-email"
                type="email"
                required
                maxLength={320}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={input}
                placeholder="organizer@example.com"
              />
            </div>
            {error && (
              <p role="alert" className={errorText}>
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={submitting}
              className={`${btnPrimary} w-full`}
            >
              {submitting ? "Sending…" : "Create and email invite"}
            </button>
            <button
              type="button"
              disabled={submitting || !email.trim()}
              onClick={() => createLink("reset")}
              className={`${btnSecondary} w-full`}
            >
              Send password reset link
            </button>
            <p className={`text-xs ${metaText}`}>
              Password reset: for an existing organizer who&apos;s locked out.
              It emails them a one-time link (also listed on the right);
              opening it lets them set a new password.
            </p>
          </form>
        </section>

        <section>
          <h2 className={`text-lg ${heading}`}>Invitations</h2>
          {notice && (
            <p
              role="status"
              className={`mt-3 rounded-lg border px-3 py-2 text-sm ${
                notice.kind === "ok"
                  ? "border-found/40 bg-found-bg text-found dark:border-green-400/40 dark:bg-green-400/20 dark:text-green-300"
                  : "border-amber-400/60 bg-amber-50 text-amber-900 dark:border-amber-400/40 dark:bg-amber-400/15 dark:text-amber-200"
              }`}
            >
              {notice.text}
            </p>
          )}
          {!invites.length ? (
            <p className="mt-3 rounded-xl border border-dashed border-stone-300 p-6 text-center text-sm text-stone-500 dark:border-stone-600 dark:text-stone-400">
              No invitations yet.
            </p>
          ) : (
            <ul className="mt-3 list-none space-y-3">
              {invites.map((inv) => {
                const status = statusOf(inv);
                return (
                  <li key={inv.id} className={`${card} p-4`}>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">
                          {inv.email}
                          {inv.purpose === "reset" && (
                            <span className="ml-1.5 rounded border border-stone-300 px-1 py-0.5 align-middle text-[10px] font-semibold uppercase text-stone-500 dark:border-stone-600 dark:text-stone-400">
                              Password reset
                            </span>
                          )}
                        </p>
                        <p className={`text-xs ${metaText}`}>
                          {status === "accepted"
                            ? inv.purpose === "reset"
                              ? `Password reset ${new Date(inv.accepted_at!).toLocaleString()}`
                              : `Joined ${new Date(inv.accepted_at!).toLocaleString()}`
                            : status === "expired"
                              ? `Expired ${new Date(inv.expires_at).toLocaleDateString()}`
                              : `Expires ${new Date(inv.expires_at).toLocaleDateString()}`}
                          {status === "pending" &&
                            (inv.emailed_at
                              ? ` · Emailed ${new Date(inv.emailed_at).toLocaleString()}`
                              : " · Not emailed yet")}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                          status === "accepted"
                            ? "border-found/40 bg-found-bg text-found dark:border-green-400/40 dark:bg-green-400/20 dark:text-green-300"
                            : status === "expired"
                              ? "border-noupdate/40 bg-noupdate-bg text-noupdate dark:border-stone-500/40 dark:bg-stone-500/20 dark:text-stone-300"
                              : "border-maroon-300 bg-maroon-50 text-maroon-700 dark:border-maroon-700 dark:bg-maroon-950 dark:text-maroon-200"
                        }`}
                      >
                        {status === "accepted"
                          ? "Accepted"
                          : status === "expired"
                            ? "Expired"
                            : "Pending"}
                      </span>
                    </div>

                    {status === "pending" && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <code className="min-w-0 flex-1 truncate rounded-lg bg-stone-50 px-2 py-1.5 text-xs text-stone-500 dark:bg-stone-800 dark:text-stone-400">
                          {inviteUrl(inv.token)}
                        </code>
                        <button
                          onClick={() => resendEmail(inv)}
                          disabled={emailingId === inv.id}
                          className={`${btnSecondary} px-3 py-1.5`}
                        >
                          {emailingId === inv.id
                            ? "Sending…"
                            : inv.emailed_at
                              ? "Resend email"
                              : "Email link"}
                        </button>
                        <button
                          onClick={() => copyLink(inv)}
                          className={`${btnSecondary} px-3 py-1.5`}
                        >
                          {copiedId === inv.id ? "Copied!" : "Copy link"}
                        </button>
                        <button
                          onClick={() => revoke(inv)}
                          className="rounded-lg border border-accent-text/40 px-3 py-1.5 text-sm font-semibold text-accent-text hover:bg-accent/10 dark:border-red-400/40 dark:text-red-400 dark:hover:bg-red-400/10"
                        >
                          Revoke
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <Organizers />
    </div>
  );
}
