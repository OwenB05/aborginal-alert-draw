"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/** Nav-style sign-out for the maroon header (white focus ring). */
export function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleSignOut}
      className={
        className ??
        "rounded px-2 py-1 text-sm font-semibold hover:bg-maroon-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      }
    >
      Sign out
    </button>
  );
}
