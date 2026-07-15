"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { btnPrimary, card, errorText, heading, input, label, link } from "@/lib/ui";

export default function ChangePasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);

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
    <div className="mx-auto mt-6 max-w-sm">
      <Link href="/admin" className={`text-sm ${link}`}>
        ← All draws
      </Link>
      <div className={`mt-3 ${card} p-6`}>
        <h1 className={`text-xl ${heading}`}>Change password</h1>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="new-password" className={label}>
              New password
            </label>
            <input
              id="new-password"
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={input}
            />
          </div>
          <div>
            <label htmlFor="confirm-password" className={label}>
              Confirm new password
            </label>
            <input
              id="confirm-password"
              type="password"
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={input}
            />
          </div>
          {message && (
            <p
              role={message.kind === "error" ? "alert" : "status"}
              className={
                message.kind === "success"
                  ? "text-sm font-semibold text-found dark:text-green-300"
                  : errorText
              }
            >
              {message.text}
            </p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className={`${btnPrimary} w-full py-2.5`}
          >
            {submitting ? "Saving…" : "Update password"}
          </button>
        </form>
      </div>
    </div>
  );
}
