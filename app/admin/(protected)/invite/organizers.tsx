"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { card, errorText, heading, metaText } from "@/lib/ui";

// Who currently has organizer access, and the recovery path for two-step
// verification: Supabase issues no backup codes, so a lost phone is fixed by
// another organizer clearing the factor here. The privilege check lives in
// the reset_user_mfa/list_organizers functions, not in this component.

type Organizer = {
  user_id: string;
  email: string;
  added_at: string;
  mfa_factors: number;
};

export function Organizers() {
  const [rows, setRows] = useState<Organizer[] | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setCurrentUserId(user?.id ?? null);
    const { data, error: rpcError } = await supabase.rpc("list_organizers");
    if (rpcError) {
      setError("Couldn't load the organizer list.");
      return;
    }
    setRows((data as Organizer[] | null) ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function resetMfa(o: Organizer) {
    if (
      !confirm(
        `Reset two-step verification for ${o.email}? They'll sign in with just their password and can set up a new authenticator afterwards.`
      )
    )
      return;
    setError(null);
    setDone(null);
    setBusy(o.user_id);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("reset_user_mfa", {
      p_user_id: o.user_id,
    });
    setBusy(null);
    if (rpcError) {
      setError(rpcError.message || "Couldn't reset that organizer.");
      return;
    }
    setDone(`Two-step verification cleared for ${o.email}.`);
    load();
  }

  return (
    <section className="mt-8">
      <h2 className={`text-lg ${heading}`}>Organizers</h2>
      <p className={`mt-1 text-sm ${metaText}`}>
        Everyone with portal access. If someone loses the phone holding their
        authenticator, reset it here — there are no backup codes.
      </p>

      {error && (
        <p role="alert" className={`mt-2 ${errorText}`}>
          {error}
        </p>
      )}
      {done && (
        <p role="status" className="mt-2 text-sm font-semibold text-found dark:text-green-300">
          {done}
        </p>
      )}

      {!rows ? (
        <p className={`mt-3 text-sm ${metaText}`}>Loading…</p>
      ) : (
        <ul className="mt-3 list-none space-y-2">
          {rows.map((o) => {
            const isSelf = o.user_id === currentUserId;
            return (
              <li
                key={o.user_id}
                className={`${card} flex flex-wrap items-center justify-between gap-3 px-4 py-3`}
              >
                <span className="min-w-0">
                  <span className="block truncate font-semibold">
                    {o.email}
                    {isSelf && (
                      <span className={`ml-2 text-xs font-normal ${metaText}`}>
                        (you)
                      </span>
                    )}
                  </span>
                  <span className={`text-xs ${metaText}`}>
                    Added {new Date(o.added_at).toLocaleDateString()}
                  </span>
                </span>
                <span className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      o.mfa_factors > 0
                        ? "bg-found-bg text-found dark:bg-green-400/20 dark:text-green-300"
                        : "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300"
                    }`}
                  >
                    2-step {o.mfa_factors > 0 ? "on" : "off"}
                  </span>
                  {o.mfa_factors > 0 &&
                    (isSelf ? (
                      <span className={`text-xs ${metaText}`}>
                        Manage yours on Account
                      </span>
                    ) : (
                      <button
                        onClick={() => resetMfa(o)}
                        disabled={busy === o.user_id}
                        className="rounded-lg border border-accent-text/40 px-3 py-1.5 text-sm font-semibold text-accent-text hover:bg-accent/10 dark:border-red-400/40 dark:text-red-400 dark:hover:bg-red-400/10"
                      >
                        {busy === o.user_id ? "Resetting…" : "Reset 2-step"}
                      </button>
                    ))}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
