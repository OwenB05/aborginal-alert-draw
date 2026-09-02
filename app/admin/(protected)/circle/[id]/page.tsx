import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Draw } from "@/lib/types";
import { heading, link, metaText } from "@/lib/ui";
import { CircleEvent } from "./circle-event";

export const dynamic = "force-dynamic";

export default async function CircleEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: draw } = await supabase
    .from("draws")
    .select("*")
    .eq("id", id)
    .maybeSingle<Draw>();

  if (!draw) notFound();

  return (
    <div className="mt-6">
      <Link href="/admin/circle" className={`text-sm ${link}`}>
        ← All events
      </Link>
      <p className={`mt-3 text-xs font-semibold uppercase tracking-wide ${metaText}`}>
        Compassion Circle Comparison
      </p>
      <h1 className={`mt-0.5 text-2xl ${heading}`}>{draw.title}</h1>
      <CircleEvent draw={{ id: draw.id, title: draw.title, slug: draw.slug }} />
    </div>
  );
}
