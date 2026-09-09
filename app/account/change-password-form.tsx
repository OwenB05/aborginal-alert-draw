"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Captcha } from "@/components/auth/captcha";
import {
  CAPTCHA_FAILED_MESSAGE,
  captchaEnabled,
  isCaptchaError,
} from "@/lib/captcha";
import { btnPrimary, errorText, input, label } from "@/lib/ui";

export function ChangePasswordForm({ email }: { email: string }) {
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<
    { kind: "success" | "error"; text: string } | null
  >(null);
  // Verifying the current password is a Supabase sign-in, so it needs a
  // CAPTCHA token once protection is enabled.
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (password.length < 8) {
      setMessage({ kind: "error", text: "Password must be at least 8 characters." });
      return;
    }
    if (password !== confirm) {
      setMessage({ kind: "error", text: "New passwords don't match." });
      return;
    }

    setSubmitting(true);
    const supabase = createClient();

    // Re-authenticate with the current password before changing it — same
    // non-disclosure stance as login (one generic failure message).
    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email,
      password: current,
      options: { captchaToken: captchaToken ?? undefined },
    });
    if (reauthError) {
      setSubmitting(false);
      setAttempt((n) => n + 1);
      setMessage({
        kind: "error",
        text: isCaptchaError(reauthError.message)
          ? CAPTCHA_FAILED_MESSAGE
          : "Current password is incorrect.",
      });
      return;
    }
    setAttempt((n) => n + 1);

    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSubmitting(false);

    if (updateError) {
      setMessage({
        kind: "error",
        text: updateError.message || "Could not update your password.",
      });
      return;
    }
    setCurrent("");
    setPassword("");
    setConfirm("");
    setMessage({ kind: "success", text: "Password updated." });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4">
      <div>
        <label htmlFor="current-password" className={label}>
          Current password
        </label>
        <input
          id="current-password"
          type="password"
          required
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          className={input}
        />
      </div>
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
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className={input}
        />
      </div>
      <Captcha onToken={setCaptchaToken} resetKey={attempt} />
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
        disabled={submitting || (captchaEnabled() && !captchaToken)}
        className={`${btnPrimary} w-full sm:w-auto`}
      >
        {submitting ? "Saving…" : "Update password"}
      </button>
    </form>
  );
}
