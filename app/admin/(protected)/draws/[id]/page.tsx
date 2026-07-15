import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Draw, Entry, WinnerLogEntry } from "@/lib/types";
import { DrawDetail } from "./draw-detail";

export const dynamic = "force-dynamic";

export default async function DrawAdminPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: draw }, { data: entries }, { data: winnerLog }] =
    await Promise.all([
      supabase.from("draws").select("*").eq("id", id).maybeSingle<Draw>(),
      supabase
        .from("entries")
        .select("*")
        .eq("draw_id", id)
        .order("created_at", { ascending: true })
        .returns<Entry[]>(),
      // Full pick history (every draw + re-draw), newest first, with the
      // winning entrant's name embedded via the winner_log → entries FK.
      supabase
        .from("winner_log")
        .select("id, entry_id, drawn_at, entry:entries(full_name, email)")
        .eq("draw_id", id)
        .order("drawn_at", { ascending: false })
        .returns<WinnerLogEntry[]>(),
    ]);

  if (!draw) notFound();

  return (
    <DrawDetail
      initialDraw={draw}
      initialEntries={entries ?? []}
      initialWinnerLog={winnerLog ?? []}
    />
  );
}
