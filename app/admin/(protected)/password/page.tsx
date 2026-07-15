"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ChangePasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<
    { kind: "success" | "error"; text: string } | null
  >(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (password.length < 8) {
      setMessage({
        kind: "error",
        text: "Password must be at least 8 characters.",
      });
      return;
    }
    if (password !== confirmPassword) {
      setMessage({ kind: "error", text: "Passwords don't match." });
      return;
    }

    setSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);

    if (error) {
      setMessage({
        kind: "error",
        text: error.message || "Could not update your password.",
      });
      return;
    }
    setPassword("");
    setConfirmPassword("");
    setMessage({ kind: "success", text: "Password updated." });
  }

  return (
    <div className="mx-auto max-w-sm">
      <Link href="/admin" className="text-sm text-muted hover:text-primary">
        ← All draws
      </Link>
      <div className="mt-2 rounded-lg border border-border bg-surface p-6 shadow-sm">
        <h1 className="text-xl font-bold">Change password</h1>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <label className="block text-sm font-medium">
            New password
            <input
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded border border-border bg-background px-3 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
            />
          </label>
          <label className="block text-sm font-medium">
            Confirm new password
            <input
              type="password"
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1 w-full rounded border border-border bg-background px-3 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
            />
          </label>
          {message && (
            <p
              role="alert"
              className={`rounded px-3 py-2 text-sm ${
                message.kind === "success"
                  ? "border border-success/40 bg-success/10 text-success"
                  : "border border-danger/40 bg-danger/10 text-danger"
              }`}
            >
              {message.text}
            </p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded bg-primary px-4 py-2.5 font-semibold text-primary-foreground hover:bg-primary-dark disabled:opacity-60"
          >
            {submitting ? "Saving…" : "Update password"}
          </button>
        </form>
      </div>
    </div>
  );
}
