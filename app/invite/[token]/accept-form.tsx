"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { btnPrimary, card, errorText, heading, input, label } from "@/lib/ui";

export function AcceptInviteForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    setSubmitting(true);
    const supabase = createClient();

    // The Edge Function validates the token and creates the account
    // (service role, server-side).
    const { data, error: fnError } = await supabase.functions.invoke(
      "accept-invite",
      { body: { token, password } }
    );

    if (fnError || !data?.ok) {
      setSubmitting(false);
      // Surface the function's specific message when available.
      let message = "This invite link is invalid or has already been used.";
      try {
        const ctx = (fnError as { context?: Response } | null)?.context;
        if (ctx) {
          const body = await ctx.json();
          if (body?.error) message = body.error;
        } else if (data?.error) {
          message = data.error as string;
        }
      } catch {
        // keep default message
      }
      setError(message);
      return;
    }

    // Account created — sign in and go to the portal.
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: data.email as string,
      password,
    });
    setSubmitting(false);

    if (signInError) {
      setError(
        "Your account was created, but sign-in failed. Try signing in from the login page."
      );
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  return (
    <div className={`mx-auto mt-12 max-w-sm ${card} p-6`}>
      <h1 className={`text-2xl ${heading}`}>Accept your invitation</h1>
      <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
        You&apos;ve been invited to be a draw organizer. Set a password to
        create your account.
      </p>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="password" className={label}>
            New password
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={input}
          />
        </div>
        <div>
          <label htmlFor="confirm" className={label}>
            Confirm password
          </label>
          <input
            id="confirm"
            type="password"
            required
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={input}
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
          className={`${btnPrimary} w-full py-2.5`}
        >
          {submitting ? "Setting up…" : "Create account & sign in"}
        </button>
      </form>
    </div>
  );
}
