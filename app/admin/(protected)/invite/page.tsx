"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { generateToken } from "@/lib/slug";
import type { Invite } from "@/lib/types";
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

export default function InvitePage() {
  const [email, setEmail] = useState("");
  const [invites, setInvites] = useState<Invite[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("invites")
      .select("id, email, token, purpose, created_at, expires_at, accepted_at")
      .order("created_at", { ascending: false })
      .returns<Invite[]>();
    if (data) setInvites(data);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // One mechanic, two labels: an "invite" grants access to someone new; a
  // "reset" lets an existing organizer choose a new password via the same
  // one-time link.
  async function createLink(purpose: "invite" | "reset") {
    setError(null);
    setSubmitting(true);

    const supabase = createClient();
    const { error: insertError } = await supabase.from("invites").insert({
      email: email.trim().toLowerCase(),
      token: generateToken(),
      purpose,
    });
    setSubmitting(false);

    if (insertError) {
      setError("Could not create the link. Please try again.");
      return;
    }
    setEmail("");
    load();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createLink("invite");
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
            Create a one-time link for someone to set their password and get
            organizer access. Send it to the email you enter below.
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
              {submitting ? "Creating…" : "Create invite link"}
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
              It creates a one-time link (listed on the right) — copy it and
              send it to them; opening it lets them set a new password.
            </p>
          </form>
        </section>

        <section>
          <h2 className={`text-lg ${heading}`}>Invitations</h2>
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
    </div>
  );
}
