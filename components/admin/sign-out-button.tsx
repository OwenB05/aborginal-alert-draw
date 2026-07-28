"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { navPill } from "@/components/layout/main-nav";

/** Sign out. Defaults to the header pill style; pass a className to override
 * (e.g. the secondary button on the "not an organizer" screen). */
export function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <button onClick={handleSignOut} className={className ?? navPill}>
      Sign out
    </button>
  );
}
