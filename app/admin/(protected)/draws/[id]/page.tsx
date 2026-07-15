import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Draw, Entry } from "@/lib/types";
import { DrawDetail } from "./draw-detail";

export const dynamic = "force-dynamic";

export default async function DrawAdminPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: draw }, { data: entries }] = await Promise.all([
    supabase.from("draws").select("*").eq("id", id).maybeSingle<Draw>(),
    supabase
      .from("entries")
      .select("*")
      .eq("draw_id", id)
      .order("created_at", { ascending: true })
      .returns<Entry[]>(),
  ]);

  if (!draw) notFound();

  return <DrawDetail initialDraw={draw} initialEntries={entries ?? []} />;
}
