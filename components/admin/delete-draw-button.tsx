"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/** Permanently deletes a draw (entries + winner history cascade in the DB).
 * `afterDelete: "home"` navigates back to the dashboard; otherwise the
 * current route is just refreshed (used from the archive list). */
export function DeleteDrawButton({
  drawId,
  title,
  afterDelete,
  className,
  children,
}: {
  drawId: string;
  title: string;
  afterDelete?: "home" | "refresh";
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (
      !confirm(
        `Permanently delete "${title}"?\n\nThis removes the draw, all of its entries, and its winner history. This cannot be undone.`
      )
    )
      return;

    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from("draws").delete().eq("id", drawId);
    setBusy(false);

    if (error) {
      alert("Could not delete this draw. Please try again.");
      return;
    }
    if (afterDelete === "home") {
      router.push("/admin");
    }
    router.refresh();
  }

  return (
    <button onClick={handleDelete} disabled={busy} className={className}>
      {busy ? "Deleting…" : children}
    </button>
  );
}
