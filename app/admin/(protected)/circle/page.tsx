import { createClient } from "@/lib/supabase/server";
import { heading, metaText } from "@/lib/ui";
import { CircleIndex, type DrawSummary } from "./circle-index";

// Compassion Circle Comparison — index. One card per event, linking to that
// event's own comparison page (/admin/circle/[id]). Draws come from the DB
// (so events with no entrants still appear); counts come from the
// circle-compare Edge Function.
export const dynamic = "force-dynamic";

export default async function CirclePage() {
  const supabase = await createClient();
  const { data: draws } = await supabase
    .from("draws")
    .select("id, title, slug, status, created_at")
    .order("created_at", { ascending: false })
    .returns<DrawSummary[]>();

  return (
    <div className="mt-6">
      <h1 className={`text-2xl ${heading}`}>Compassion Circle Comparison</h1>
      <p className={`mt-1 max-w-2xl text-sm ${metaText}`}>
        Everyone who enters a draw consents to joining the Compassionate
        Circle. Pick an event to see who from it still isn&apos;t in the
        Airtable sign-up list (matched by email), grab their details, and
        export the list.
      </p>
      <CircleIndex draws={draws ?? []} />
    </div>
  );
}
