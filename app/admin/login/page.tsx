"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TopNav } from "@/components/layout/top-nav";
import { Footer } from "@/components/layout/footer";
import { createClient } from "@/lib/supabase/client";
import { btnPrimary, card, errorText, heading, input, label } from "@/lib/ui";

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
      <TopNav subtitle="Draw Organizer" />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-10 sm:px-6">
        <div className={`mx-auto mt-12 max-w-sm ${card} p-6`}>
          <h1 className={`text-2xl ${heading}`}>Organizer sign in</h1>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            For draw organizers only. Entrants don&apos;t need an account —
            just scan the draw&apos;s QR code.
          </p>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="email" className={label}>
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={input}
              />
            </div>
            <div>
              <label htmlFor="password" className={label}>
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
              {submitting ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
      </main>
      <Footer />
    </>
  );
}
