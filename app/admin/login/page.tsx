"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { createClient } from "@/lib/supabase/client";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setSubmitting(false);

    if (signInError) {
      setError("Sign in failed. Check your email and password.");
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-sm flex-1 px-4 py-16">
        <div className="rounded-lg border border-border bg-surface p-6 shadow-sm">
          <h1 className="text-2xl font-bold">Organizer sign in</h1>
          <p className="mt-1 text-sm text-muted">
            For draw organizers only. Entrants don&apos;t need an account —
            just scan the draw&apos;s QR code.
          </p>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block text-sm font-medium">
              Email
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded border border-border bg-background px-3 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
              />
            </label>
            <label className="block text-sm font-medium">
              Password
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded border border-border bg-background px-3 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
              />
            </label>
            {error && (
              <p
                role="alert"
                className="rounded border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger"
              >
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded bg-primary px-4 py-2.5 font-semibold text-primary-foreground hover:bg-primary-dark disabled:opacity-60"
            >
              {submitting ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
